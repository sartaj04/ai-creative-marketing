"""
BrandScale AI - Asset Schemas
Pydantic models for generated assets.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.config import Platform


class CopyTextSchema(BaseModel):
    """Generated copy text schema."""
    
    headline: str
    subheadline: Optional[str] = None
    body: Optional[str] = None
    cta: str
    hashtags: List[str] = Field(default_factory=list)
    language: str = "en"


class AssetMetadataSchema(BaseModel):
    """Asset metadata schema."""
    
    product_id: Optional[str] = None
    campaign_type: Optional[str] = None  # sale, launch, awareness
    ai_model: Optional[str] = None
    temperature: Optional[float] = None
    render_time_ms: Optional[int] = None
    file_size_bytes: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None


class AssetCreate(BaseModel):
    """Schema for creating an asset (used internally)."""
    
    profile_id: int
    template_id: int
    platform: Platform
    aspect_ratio: str = "1:1"
    copy_text: CopyTextSchema
    metadata: Optional[Dict[str, Any]] = None


class AssetUpdate(BaseModel):
    """Schema for updating an asset (quick edit)."""
    
    headline: Optional[str] = None
    subheadline: Optional[str] = None
    body: Optional[str] = None
    cta: Optional[str] = None
    hashtags: Optional[List[str]] = None


class AssetResponse(BaseModel):
    """Schema for asset response."""
    
    id: int
    user_id: int
    profile_id: int
    template_id: Optional[int] = None
    platform: Platform
    aspect_ratio: str
    image_url: Optional[str] = None
    copy_text: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AssetListResponse(BaseModel):
    """Schema for list of assets."""
    
    assets: List[AssetResponse]
    total: int
    page: int
    page_size: int


class AssetFilterParams(BaseModel):
    """Query parameters for filtering assets."""
    
    platform: Optional[Platform] = None
    profile_id: Optional[int] = None
    status: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class DownloadRequest(BaseModel):
    """Schema for bulk download request."""
    
    asset_ids: List[int] = Field(..., min_length=1, max_length=100)
    format: str = Field(default="zip")  # zip, individual
