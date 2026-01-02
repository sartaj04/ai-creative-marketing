"""
BrandScale AI - Brand Profile Schemas
Pydantic models for brand profiles and assets.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, HttpUrl

from app.config import ProfileType


class ColorSchema(BaseModel):
    """Brand colors schema."""
    
    primary: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    accent: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    dominant: List[str] = Field(default_factory=list)


class ProductSchema(BaseModel):
    """Product information schema."""
    
    name: str
    description: Optional[str] = None
    price: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None


class ImageSchema(BaseModel):
    """Scraped image schema."""
    
    url: str
    type: str = Field(default="product")  # product, lifestyle, banner, logo
    alt: Optional[str] = None


class BrandAssetsSchema(BaseModel):
    """Complete brand assets schema."""
    
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    colors: ColorSchema = Field(default_factory=ColorSchema)
    fonts: Dict[str, str] = Field(default_factory=dict)
    products: List[ProductSchema] = Field(default_factory=list)
    images: List[ImageSchema] = Field(default_factory=list)
    tagline: Optional[str] = None
    description: Optional[str] = None


class VoiceProfileSchema(BaseModel):
    """Brand voice profile schema."""
    
    tone: str = Field(default="professional")
    style: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    topics: List[str] = Field(default_factory=list)
    sample_content: List[str] = Field(default_factory=list)
    language_preferences: List[str] = Field(default=["en"])
    emoji_usage: str = Field(default="minimal")  # minimal, moderate, frequent
    cta_style: str = Field(default="direct")  # direct, soft, question


class BrandProfileCreate(BaseModel):
    """Schema for creating a brand profile."""
    
    profile_type: ProfileType
    name: str = Field(..., min_length=1, max_length=255)
    website_url: str = Field(..., min_length=1)


class BrandProfileUpdate(BaseModel):
    """Schema for updating a brand profile."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    brand_assets: Optional[Dict[str, Any]] = None
    voice_profile: Optional[Dict[str, Any]] = None


class BrandProfileResponse(BaseModel):
    """Schema for brand profile response."""
    
    id: int
    user_id: int
    profile_type: ProfileType
    name: str
    website_url: str
    brand_assets: Dict[str, Any]
    voice_profile: Optional[Dict[str, Any]] = None
    scrape_status: str
    scrape_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class BrandProfileListResponse(BaseModel):
    """Schema for list of brand profiles."""
    
    profiles: List[BrandProfileResponse]
    total: int
