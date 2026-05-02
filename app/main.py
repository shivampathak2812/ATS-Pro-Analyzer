from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
from app.database import engine, Base
import app.models

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ATS Resume Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, allows all domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

from fastapi.staticfiles import StaticFiles
import os

# Mount the frontend directory to serve the HTML/CSS/JS files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
