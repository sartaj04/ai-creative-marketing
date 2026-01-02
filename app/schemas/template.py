"""
BrandScale AI - Template Schemas
Pydantic models for templates.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.config import ProfileType


class TemplateData(BaseModel):
    """Data to inject into a template."""
    
    headline: Optional[str] = None
    subheadline: Optional[str] = None
    body: Optional[str] = None
    cta: Optional[str] = None
    logo: Optional[str] = None
    product_image: Optional[str] = None
    brand_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    background_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    accent_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    price: Optional[str] = None
    discount: Optional[str] = None
    
    # Additional custom data
    custom: Dict[str, Any] = Field(default_factory=dict)
    
    def to_render_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for template rendering."""
        data = self.model_dump(exclude_none=True, exclude={"custom"})
        data.update(self.custom)
        return data


class TemplateResponse(BaseModel):
    """Schema for template response."""
    
    id: int
    name: str
    segment: ProfileType
    description: Optional[str] = None
    category: str
    thumbnail_url: Optional[str] = None
    aspect_ratios: List[str]
    platforms: List[str]
    variables: List[str]
    is_active: bool
    is_premium: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TemplateDetailResponse(TemplateResponse):
    """Detailed template response including HTML/CSS."""
    
    html_code: str
    css_code: str
    default_values: Optional[Dict[str, Any]] = None


class TemplateListResponse(BaseModel):
    """Schema for list of templates."""
    
    templates: List[TemplateResponse]
    total: int
    
    
class TemplateCreate(BaseModel):
    """Schema for creating a template (admin only)."""
    
    name: str = Field(..., min_length=1, max_length=255)
    segment: ProfileType
    description: Optional[str] = None
    category: str = "general"
    html_code: str
    css_code: str
    thumbnail_url: Optional[str] = None
    aspect_ratios: List[str] = Field(default=["1:1", "9:16", "1.91:1"])
    platforms: List[str] = Field(default=["instagram_feed", "facebook", "linkedin"])
    variables: List[str] = Field(default=["headline", "cta", "product_image", "logo", "brand_color"])
    default_values: Optional[Dict[str, Any]] = None
    is_active: bool = True
    is_premium: bool = False
