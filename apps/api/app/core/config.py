"""Application configuration loaded from environment variables."""
from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # App
    APP_NAME: str = "Pixo"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: Optional[str] = None
    AWS_S3_REGION: str = "ap-south-1"

    # AWS Bedrock (Claude)
    AWS_BEDROCK_ACCESS_KEY_ID: Optional[str] = None
    AWS_BEDROCK_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_BEDROCK_REGION: str = "us-east-1"
    BEDROCK_MODEL_ID: str = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"

    # Google Gemini
    AI_PROVIDER: str = "gemini"
    GCP_PROJECT_ID: Optional[str] = None
    GCP_LOCATION: str = "us-central1"
    GCP_CLIENT_EMAIL: Optional[str] = None
    GCP_PRIVATE_KEY: Optional[str] = None

    # LLM Settings
    LLM_PRIMARY_PROVIDER: str = "gemini"  # gemini or bedrock
    LLM_COMPLEX_PROVIDER: str = "bedrock"  # For complex tasks like style analysis

    class Config:

        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"
    


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
