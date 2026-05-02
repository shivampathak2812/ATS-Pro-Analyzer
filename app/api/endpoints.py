from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, Dict
import uuid
import io
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.services.file_parser import extract_text_from_file
from app.services.llm_service import analyze_resume_with_llm
from app.services.resume_pdf_generator import generate_resume_pdf
from app.database import get_db
from app.models import User, Document
from app.services.auth_service import get_password_hash, verify_password, create_access_token, get_optional_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from app.services.email_service import generate_otp, send_otp_email
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()

class UserCreate(BaseModel):
    email: str
    password: str

class OTPVerify(BaseModel):
    email: str
    otp: str

class Token(BaseModel):
    access_token: str
    token_type: str

class AnalyzeRequest(BaseModel):
    resume_id: str
    jd_id: Optional[str] = None

class SaveDocumentRequest(BaseModel):
    text: str

class DownloadResumeRequest(BaseModel):
    resume_text: str
    template: str = "modern"

@router.post("/auth/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    otp = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=10)
    
    new_user = User(
        email=user.email, 
        hashed_password=hashed_password,
        is_verified=False,
        otp_code=otp,
        otp_expiry=expiry
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    send_otp_email(new_user.email, otp)
    
    return {"message": "Registration successful. Please check your email for the OTP.", "email": new_user.email}

@router.post("/auth/verify-otp", response_model=Token)
def verify_otp(payload: OTPVerify, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User is already verified")
        
    if user.otp_code != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if user.otp_expiry and datetime.utcnow() > user.otp_expiry:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        
    user.is_verified = True
    user.otp_code = None
    user.otp_expiry = None
    db.commit()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your OTP first."
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...), current_user: Optional[User] = Depends(get_optional_current_user), db: Session = Depends(get_db)):
    text = await extract_text_from_file(file)
    resume_id = str(uuid.uuid4())
    owner_id = current_user.id if current_user else None
    doc = Document(id=resume_id, title=file.filename, content=text, doc_type="resume", owner_id=owner_id)
    db.add(doc)
    db.commit()
    return {"resume_id": resume_id, "text": text}

@router.post("/upload-jd")
async def upload_jd(file: UploadFile = File(...), current_user: Optional[User] = Depends(get_optional_current_user), db: Session = Depends(get_db)):
    text = await extract_text_from_file(file)
    jd_id = str(uuid.uuid4())
    owner_id = current_user.id if current_user else None
    doc = Document(id=jd_id, title=file.filename, content=text, doc_type="jd", owner_id=owner_id)
    db.add(doc)
    db.commit()
    return {"jd_id": jd_id, "text": text}

@router.post("/save-document")
async def save_document(request: SaveDocumentRequest, current_user: Optional[User] = Depends(get_optional_current_user), db: Session = Depends(get_db)):
    doc_id = str(uuid.uuid4())
    owner_id = current_user.id if current_user else None
    doc = Document(id=doc_id, title="Pasted Document", content=request.text, doc_type="pasted", owner_id=owner_id)
    db.add(doc)
    db.commit()
    return {"id": doc_id}

@router.post("/analyze")
async def analyze_documents(request: AnalyzeRequest, current_user: Optional[User] = Depends(get_optional_current_user), db: Session = Depends(get_db)):
    resume_doc = db.query(Document).filter(Document.id == request.resume_id).first()
    if not resume_doc:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume_text = resume_doc.content
    
    jd_text = ""
    if request.jd_id:
        jd_doc = db.query(Document).filter(Document.id == request.jd_id).first()
        if not jd_doc:
            raise HTTPException(status_code=404, detail="Job Description not found")
        jd_text = jd_doc.content

    # Auto-detect if it's already an optimized/rewritten resume
    is_rewritten = "# PROFESSIONAL SUMMARY" in resume_text.upper() or "# EXPERIENCE" in resume_text.upper()

    # Call LLM
    result = await analyze_resume_with_llm(resume_text, jd_text, is_rewritten=is_rewritten)
    return result

@router.post("/download-resume")
async def download_resume(request: DownloadResumeRequest, current_user: Optional[User] = Depends(get_optional_current_user)):
    try:
        pdf_bytes = generate_resume_pdf(request.resume_text, request.template)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=resume_{request.template}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
