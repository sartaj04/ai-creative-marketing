"""
Generation-related Pydantic schemas.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field

from app.models.generated_asset import Platform


class CampaignType(str, Enum):
    """Campaign types for e-commerce."""
    SALE = "sale"
    NEW_ARRIVAL = "new_arrival"
    FESTIVAL = "festival"
    CLEARANCE = "clearance"
    LAUNCH = "launch"
    SEASONAL = "seasonal"


class Festival(str, Enum):
    """Indian festivals for themed campaigns."""
    DIWALI = "diwali"
    EID = "eid"
    HOLI = "holi"
    PONGAL = "pongal"
    ONAM = "onam"
    DUSSEHRA = "dussehra"
    CHRISTMAS = "christmas"
    NEW_YEAR = "new_year"
    INDEPENDENCE_DAY = "independence_day"
    REPUBLIC_DAY = "republic_day"


class PostType(str, Enum):
    """Post types for SaaS and personal brands."""
    FEATURE_ANNOUNCEMENT = "feature_announcement"
    TIP = "tip"
    INSIGHT = "insight"
    TESTIMONIAL = "testimonial"
    COMPARISON = "comparison"
    STORY = "story"
    OPINION = "opinion"
    QUESTION = "question"
    CAROUSEL = "carousel"


class AspectRatio(str, Enum):
    """Supported aspect ratios."""
    SQUARE = "1:1"
    STORY = "9:16"
    LANDSCAPE = "1.91:1"
    PORTRAIT = "4:5"
    WIDESCREEN = "16:9"


class CopyVariant(BaseModel):
    """A single copy variant."""
    headline: str
    subheadline: Optional[str] = None
    body: Optional[str] = None
    cta: str
    hashtags: List[str] = Field(default_factory=list)


class CopyGenerationRequest(BaseModel):
    """Request for generating marketing copy."""
    profile_id: UUID
    language: str = "en"  # en, hi, ta, ar
    num_variants: int = Field(default=10, ge=1, le=20)
    
    # E-commerce specific
    product_id: Optional[str] = None
    campaign_type: Optional[CampaignType] = None
    festival: Optional[Festival] = None
    discount_percentage: Optional[int] = None
    
    # SaaS specific
    post_type: Optional[PostType] = None
    target_audience: Optional[str] = None  # developers, marketers, founders
    
    # Personal brand specific
    topics: Optional[List[str]] = None
    
    # Custom instructions
    custom_prompt: Optional[str] = None


class AssetGenerationRequest(BaseModel):
    """Request for generating visual assets."""
    profile_id: UUID
    template_id: UUID
    platform: Platform
    aspect_ratio: AspectRatio = AspectRatio.SQUARE
    language: str = "en"
    
    # Copy to use
    copy: CopyVariant
    
    # Custom overrides
    custom_data: Optional[Dict[str, Any]] = None
    
    # Campaign metadata
    campaign_name: Optional[str] = None
    campaign_type: Optional[CampaignType] = None
    festival: Optional[Festival] = None


class AssetGenerationResponse(BaseModel):
    """Response from asset generation."""
    id: UUID
    profile_id: UUID
    template_id: Optional[UUID] = None
    platform: Platform
    aspect_ratio: str
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    copy_text: Dict[str, Any]
    language: str
    metadata: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True


class BatchGenerationRequest(BaseModel):
    """Request for batch generating assets."""
    profile_id: UUID
    template_ids: List[UUID]
    platforms: List[Platform]
    aspect_ratios: List[AspectRatio]
    copies: List[CopyVariant]
    language: str = "en"
    
    # Metadata
    campaign_name: Optional[str] = None
    campaign_type: Optional[CampaignType] = None


class BatchGenerationResponse(BaseModel):
    """Response from batch generation."""
    job_id: UUID
    total_assets: int
    message: str = "Batch generation started"
