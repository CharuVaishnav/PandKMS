from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./pkms.db"
    SECRET_KEY: str = "super-secret-jwt-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    FRONTEND_URL: str = "http://localhost:5173"

    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "PKMS <onboarding@resend.dev>"

    class Config:
        env_file = ".env"


settings = Settings()
