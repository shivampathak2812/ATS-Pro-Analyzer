from sqlalchemy import Boolean, Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_verified = Column(Boolean, default=False)
    otp_code = Column(String, nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="owner")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    doc_type = Column(String) # "resume" or "jd"
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="documents")
