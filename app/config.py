"""
BrandScale AI - Configuration Management
Centralized configuration using Pydantic Settings with environment variable support.
"""
from datetime import date
from enum import Enum
from functools import lru_cache
from typing import Dict, List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class UserTier(str, Enum):
    """User subscription tiers with usage limits."""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"


class UserSegment(str, Enum):
    """Target user segments for the platform."""
    ECOMMERCE = "ecommerce"
    SAAS = "saas"
    PERSONAL = "personal"


class ProfileType(str, Enum):
    """Brand profile types."""
    ECOMMERCE = "ecommerce"
    SAAS = "saas"
    PERSONAL = "personal"


class Platform(str, Enum):
    """Supported social media and ad platforms."""
    INSTAGRAM_FEED = "instagram_feed"
    INSTAGRAM_STORY = "instagram_story"
    INSTAGRAM_REEL = "instagram_reel"
    FACEBOOK = "facebook"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    GOOGLE_DISPLAY = "google_display"


class ContentStatus(str, Enum):
    """Content calendar item status."""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"


class JobStatus(str, Enum):
    """Background job status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AspectRatio(str, Enum):
    """Supported image aspect ratios."""
    SQUARE = "1:1"  # 1080x1080 - Instagram feed, Facebook
    VERTICAL = "9:16"  # 1080x1920 - Stories, Reels
    LANDSCAPE = "1.91:1"  # 1200x628 - Facebook/LinkedIn link
    PORTRAIT = "4:5"  # 1080x1350 - Instagram portrait
    WIDE = "16:9"  # 1200x675 - Twitter, YouTube


# Aspect ratio dimensions mapping
ASPECT_RATIO_DIMENSIONS: Dict[AspectRatio, tuple] = {
    AspectRatio.SQUARE: (1080, 1080),
    AspectRatio.VERTICAL: (1080, 1920),
    AspectRatio.LANDSCAPE: (1200, 628),
    AspectRatio.PORTRAIT: (1080, 1350),
    AspectRatio.WIDE: (1200, 675),
}


# Rate limits per tier (generations per month)
TIER_LIMITS: Dict[UserTier, int] = {
    UserTier.FREE: 5,
    UserTier.STARTER: 200,
    UserTier.PRO: -1,  # Unlimited
}


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    
    # Application
    app_name: str = "BrandScale AI"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/brandscale",
        description="PostgreSQL connection URL"
    )
    database_pool_size: int = 20
    database_max_overflow: int = 10
    
    # Redis
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
    )
    redis_cache_ttl: int = 86400  # 24 hours in seconds
    
    # Celery
    celery_broker_url: str = Field(
        default="redis://localhost:6379/1",
        description="Celery broker URL"
    )
    celery_result_backend: str = Field(
        default="redis://localhost:6379/2",
        description="Celery result backend URL"
    )
    
    # JWT Authentication
    jwt_secret: str = Field(
        default="your-super-secret-jwt-key-change-in-production",
        description="Secret key for JWT token signing"
    )
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    # OpenAI
    openai_api_key: str = Field(
        default="",
        description="OpenAI API key for GPT-4"
    )
    openai_model: str = "gpt-4-turbo-preview"
    openai_vision_model: str = "gpt-4-vision-preview"
    openai_temperature: float = 0.8
    openai_max_tokens: int = 2000
    
    # AWS S3
    aws_access_key_id: str = Field(default="", description="AWS access key")
    aws_secret_access_key: str = Field(default="", description="AWS secret key")
    aws_region: str = "ap-south-1"  # Mumbai region for India
    aws_s3_bucket: str = Field(default="brandscale-assets", description="S3 bucket name")
    aws_cloudfront_domain: Optional[str] = None
    
    # Playwright
    playwright_headless: bool = True
    playwright_timeout: int = 30000  # 30 seconds
    browser_pool_size: int = 3
    
    # Image Processing
    max_image_size_mb: int = 10
    image_quality: int = 90
    
    # Rate Limiting
    rate_limit_enabled: bool = True
    
    # Logging
    log_level: str = "INFO"
    
    # Sentry (optional error tracking)
    sentry_dsn: Optional[str] = None
    
    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Ensure database URL uses asyncpg driver."""
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v
    
    @property
    def sync_database_url(self) -> str:
        """Get synchronous database URL for Alembic migrations."""
        return self.database_url.replace("+asyncpg", "")


class FestivalCalendar:
    """
    Festival calendar for India and Middle East markets.
    Used for festival-aware marketing copy generation.
    """
    
    # 2024-2026 festival dates (sample - would be updated annually)
    FESTIVALS: Dict[str, List[Dict]] = {
        "diwali": [
            {"date": date(2024, 11, 1), "region": "india"},
            {"date": date(2025, 10, 20), "region": "india"},
            {"date": date(2026, 11, 8), "region": "india"},
        ],
        "eid_al_fitr": [
            {"date": date(2024, 4, 10), "region": "middle_east"},
            {"date": date(2025, 3, 30), "region": "middle_east"},
            {"date": date(2026, 3, 20), "region": "middle_east"},
        ],
        "eid_al_adha": [
            {"date": date(2024, 6, 17), "region": "middle_east"},
            {"date": date(2025, 6, 7), "region": "middle_east"},
            {"date": date(2026, 5, 27), "region": "middle_east"},
        ],
        "holi": [
            {"date": date(2024, 3, 25), "region": "india"},
            {"date": date(2025, 3, 14), "region": "india"},
            {"date": date(2026, 3, 4), "region": "india"},
        ],
        "pongal": [
            {"date": date(2024, 1, 15), "region": "south_india"},
            {"date": date(2025, 1, 15), "region": "south_india"},
            {"date": date(2026, 1, 15), "region": "south_india"},
        ],
        "onam": [
            {"date": date(2024, 9, 15), "region": "kerala"},
            {"date": date(2025, 9, 5), "region": "kerala"},
            {"date": date(2026, 8, 25), "region": "kerala"},
        ],
        "navratri": [
            {"date": date(2024, 10, 3), "region": "india"},
            {"date": date(2025, 9, 22), "region": "india"},
            {"date": date(2026, 10, 11), "region": "india"},
        ],
        "christmas": [
            {"date": date(2024, 12, 25), "region": "global"},
            {"date": date(2025, 12, 25), "region": "global"},
            {"date": date(2026, 12, 25), "region": "global"},
        ],
        "new_year": [
            {"date": date(2024, 1, 1), "region": "global"},
            {"date": date(2025, 1, 1), "region": "global"},
            {"date": date(2026, 1, 1), "region": "global"},
        ],
    }
    
    @classmethod
    def get_upcoming_festivals(
        cls, 
        days_ahead: int = 30, 
        region: Optional[str] = None
    ) -> List[Dict]:
        """Get festivals coming up in the next N days."""
        from datetime import timedelta
        today = date.today()
        end_date = today + timedelta(days=days_ahead)
        
        upcoming = []
        for festival_name, dates in cls.FESTIVALS.items():
            for fest in dates:
                if today <= fest["date"] <= end_date:
                    if region is None or fest["region"] in [region, "global"]:
                        upcoming.append({
                            "name": festival_name,
                            "date": fest["date"],
                            "region": fest["region"],
                            "days_until": (fest["date"] - today).days,
                        })
        
        return sorted(upcoming, key=lambda x: x["date"])
    
    @classmethod
    def get_festival_context(cls, festival_name: str) -> Dict:
        """Get marketing context for a specific festival."""
        contexts = {
            "diwali": {
                "theme": "Festival of Lights",
                "colors": ["gold", "red", "orange", "purple"],
                "keywords": ["celebration", "prosperity", "family", "gifts", "lights"],
                "languages": ["hindi", "english", "tamil", "bengali", "marathi"],
                "cta_suggestions": ["Shop Diwali Collection", "Light Up Your Savings", "Festive Offers Inside"],
            },
            "eid_al_fitr": {
                "theme": "End of Ramadan",
                "colors": ["green", "gold", "white", "silver"],
                "keywords": ["blessings", "family", "celebration", "joy", "togetherness"],
                "languages": ["arabic", "urdu", "english"],
                "cta_suggestions": ["Eid Mubarak Deals", "Celebrate with Savings", "Festive Collection"],
            },
            "holi": {
                "theme": "Festival of Colors",
                "colors": ["pink", "yellow", "blue", "green", "purple"],
                "keywords": ["colors", "celebration", "fun", "joy", "spring"],
                "languages": ["hindi", "english"],
                "cta_suggestions": ["Color Your World", "Holi Special Offers", "Splash into Savings"],
            },
            "pongal": {
                "theme": "Harvest Festival",
                "colors": ["orange", "yellow", "green"],
                "keywords": ["harvest", "gratitude", "prosperity", "tradition"],
                "languages": ["tamil", "english"],
                "cta_suggestions": ["Pongal Valthukal", "Harvest Special", "Traditional Offers"],
            },
        }
        return contexts.get(festival_name.lower(), {})


# Supported languages for copy generation
SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi (हिन्दी)",
    "ta": "Tamil (தமிழ்)",
    "bn": "Bengali (বাংলা)",
    "mr": "Marathi (मराठी)",
    "ar": "Arabic (العربية)",
    "te": "Telugu (తెలుగు)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "ml": "Malayalam (മലയാളം)",
    "gu": "Gujarati (ગુજરાતી)",
}


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()
