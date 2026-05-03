from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GROQ_API_KEY: str
    JWT_SECRET_KEY: str = "fallback-key-only-for-local-dev-12345"
    SMTP_EMAIL: str = "[EMAIL_ADDRESS]"
    SMTP_PASSWORD: str = "[PASSWORD]"
    APP_URL: str = "http://127.0.0.1:8000"
    class Config:
        env_file = ".env"

settings = Settings()
