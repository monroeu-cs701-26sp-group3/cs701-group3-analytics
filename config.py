"""
App configuration loaded from environment variables (.env file).
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/analytics_db"

    # JWT
    SECRET_KEY: str = "change-this-in-production-to-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Encryption (AES-256 key — 32 bytes base64-encoded)
    ENCRYPTION_KEY: str = "placeholder-32-byte-encryption-key-here!!"

    class Config:
        env_file = ".env"


settings = Settings()
