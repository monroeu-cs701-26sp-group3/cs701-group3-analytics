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

    # CORS — comma-separated list of allowed front-end origins
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
