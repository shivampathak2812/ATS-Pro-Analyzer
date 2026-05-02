from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GROQ_API_KEY: str
    JWT_SECRET_KEY: str = "fallback-key-only-for-local-dev-12345"
    SMTP_EMAIL: str = "your_email@gmail.com"
    SMTP_PASSWORD: str = "your_app_password"
    
    class Config:
        env_file = ".env"

settings = Settings()
