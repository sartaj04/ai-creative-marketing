"""
BrandScale AI - Brand Profile Model
Stores scraped brand assets, colors, fonts, and voice profile.
"""
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import ProfileType
from app.database import Base

if TYPE_CHECKING:
    from app.models.generated_asset import GeneratedAsset
    from app.models.user import User


class BrandProfile(Base):
    """
    Brand profile containing scraped brand assets and AI-analyzed voice profile.
    
    Attributes:
        id: Primary key
        user_id: Foreign key to User
        profile_type: Type of brand (ecommerce/saas/personal)
        name: Brand name
        website_url: Source URL for scraping
        brand_assets: JSON with logo, colors, fonts, products, images
        voice_profile: JSON with tone, style, keywords, topics
        scrape_status: Status of scraping job
        created_at: Creation timestamp
        updated_at: Last update timestamp
    
    brand_assets JSON structure:
        {
            "logo_url": "https://...",
            "favicon_url": "https://...",
            "colors": {
                "primary": "#FF5722",
                "secondary": "#2196F3",
                "accent": "#4CAF50",
                "dominant": ["#FF5722", "#FFFFFF", "#333333"]
            },
            "fonts": {
                "heading": "Montserrat",
                "body": "Open Sans"
            },
            "products": [
                {
                    "name": "Product Name",
                    "description": "...",
                    "price": "₹999",
                    "image_url": "https://...",
                    "category": "Category"
                }
            ],
            "images": [
                {
                    "url": "https://...",
                    "type": "product|lifestyle|banner|logo",
                    "alt": "Description"
                }
            ],
            "tagline": "Brand tagline",
            "description": "Company description"
        }
    
    voice_profile JSON structure:
        {
            "tone": "professional|casual|playful|bold|inspiring",
            "style": ["concise", "storytelling", "data-driven"],
            "keywords": ["innovation", "quality", "trust"],
            "topics": ["technology", "sustainability"],
            "sample_content": ["Sample text 1", "Sample text 2"],
            "language_preferences": ["en", "hi"],
            "emoji_usage": "minimal|moderate|frequent",
            "cta_style": "direct|soft|question"
        }
    """
    
    __tablename__ = "brand_profiles"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Profile info
    profile_type: Mapped[ProfileType] = mapped_column(
        Enum(ProfileType, name="profile_type"),
        nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    website_url: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Brand assets - stored as JSON
    brand_assets: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict
    )
    
    # Voice profile - stored as JSON
    voice_profile: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=True,
        default=dict
    )
    
    # Scraping status
    scrape_status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False
    )
    scrape_job_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    scrape_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="brand_profiles")
    generated_assets: Mapped[List["GeneratedAsset"]] = relationship(
        "GeneratedAsset",
        back_populates="brand_profile",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    
    def __repr__(self) -> str:
        return f"<BrandProfile(id={self.id}, name='{self.name}', type={self.profile_type.value})>"
    
    @property
    def logo_url(self) -> Optional[str]:
        """Get the logo URL from brand assets."""
        return self.brand_assets.get("logo_url")
    
    @property
    def primary_color(self) -> Optional[str]:
        """Get the primary brand color."""
        colors = self.brand_assets.get("colors", {})
        return colors.get("primary")
    
    @property
    def products(self) -> List[Dict[str, Any]]:
        """Get list of products for e-commerce profiles."""
        return self.brand_assets.get("products", [])
    
    @property
    def tone(self) -> str:
        """Get the brand voice tone."""
        return self.voice_profile.get("tone", "professional") if self.voice_profile else "professional"
    
    def get_brand_context(self) -> Dict[str, Any]:
        """Get a summary of brand context for AI prompts."""
        return {
            "name": self.name,
            "type": self.profile_type.value,
            "logo": self.logo_url,
            "colors": self.brand_assets.get("colors", {}),
            "tagline": self.brand_assets.get("tagline"),
            "description": self.brand_assets.get("description"),
            "tone": self.tone,
            "style": self.voice_profile.get("style", []) if self.voice_profile else [],
            "keywords": self.voice_profile.get("keywords", []) if self.voice_profile else [],
        }
