"""
Application configuration settings using Pydantic Settings.
"""
from functools import lru_cache
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


# Find .env file (check current dir, then parent dir)
def get_env_file() -> str:
    if Path(".env").exists():
        return ".env"
    if Path("../.env").exists():
        return "../.env"
    return ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=get_env_file(),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # App
    app_name: str = "Pixo"
    app_env: str = "development"
    debug: bool = True
    allowed_origins: str = "http://localhost:3000"
    
    # Database
    database_url: str = "postgresql+asyncpg://pixo:pixo_pass@localhost:5432/pixo_db"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # JWT
    jwt_secret_key: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 1440  # 24 hours
    
    # OpenAI
    openai_api_key: str = ""
    
    # Google Gemini / Vertex AI
    gemini_api_key: str = ""  # Optional: for simple API key auth
    
    # Google Cloud Service Account (inline credentials for Vertex AI)
    gcp_project_id: str = ""
    gcp_location: str = "us-central1"  # Vertex AI region
    gcp_client_email: str = ""  # service account email
    gcp_private_key: str = ""  # service account private key (with \n)
    
    # AI Provider: "gemini" or "openai"
    ai_provider: str = "gemini"
    
    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = "pixo-assets"
    aws_s3_region: str = "ap-south-1"
    aws_cloudfront_domain: str = ""
    
    # Razorpay
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.app_env.lower() == "production"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
