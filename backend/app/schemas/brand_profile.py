"""
Brand profile Pydantic schemas.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from app.models.user import UserSegment


class ProductInfo(BaseModel):
    """Product information for e-commerce brands."""
    image_url: str
    title: str
    price: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class BrandAssets(BaseModel):
    """Brand assets structure."""
    logo_url: Optional[str] = None
    colors: List[str] = Field(default_factory=list)
    fonts: List[str] = Field(default_factory=list)
    
    # E-commerce specific
    products: List[ProductInfo] = Field(default_factory=list)
    
    # SaaS specific
    features: List[str] = Field(default_factory=list)
    screenshots: List[str] = Field(default_factory=list)
    testimonials: List[Dict[str, str]] = Field(default_factory=list)
    value_props: List[str] = Field(default_factory=list)
    
    # Personal brand specific
    themes: List[str] = Field(default_factory=list)
    sample_posts: List[str] = Field(default_factory=list)


class VoiceProfile(BaseModel):
    """Voice profile for content generation."""
    tone: str = "professional"  # professional, casual, playful, motivational, etc.
    style: str = "informative"  # informative, persuasive, storytelling, etc.
    keywords: List[str] = Field(default_factory=list)
    sample_texts: List[str] = Field(default_factory=list)
    avoid_words: List[str] = Field(default_factory=list)


class BrandProfileCreate(BaseModel):
    """Schema for creating a brand profile."""
    name: str = Field(..., min_length=1, max_length=255)
    profile_type: UserSegment
    description: Optional[str] = None
    website_url: Optional[str] = None
    industry: Optional[str] = None
    target_audience: Optional[str] = None
    
    # Optional initial data
    brand_assets: Optional[Dict[str, Any]] = None
    voice_profile: Optional[Dict[str, Any]] = None


class BrandProfileUpdate(BaseModel):
    """Schema for updating a brand profile."""
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    website_url: Optional[str] = None
    industry: Optional[str] = None
    target_audience: Optional[str] = None
    brand_assets: Optional[Dict[str, Any]] = None
    voice_profile: Optional[Dict[str, Any]] = None


class BrandProfileResponse(BaseModel):
    """Schema for brand profile response."""
    id: UUID
    user_id: UUID
    profile_type: UserSegment
    name: str
    description: Optional[str] = None
    website_url: Optional[str] = None
    logo_url: Optional[str] = None
    brand_assets: Dict[str, Any]
    voice_profile: Dict[str, Any]
    industry: Optional[str] = None
    target_audience: Optional[str] = None
    is_scraped: bool
    last_scraped_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ScrapeRequest(BaseModel):
    """Schema for scraping request."""
    url: str
    profile_type: UserSegment
