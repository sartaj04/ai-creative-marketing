"""
Pydantic schemas for admin template API.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field


class TemplateStatusEnum(str, Enum):
    """Template lifecycle status."""
    DRAFT = "draft"
    APPROVED = "approved"
    DEPRECATED = "deprecated"


class FormatTypeEnum(str, Enum):
    """Template format types."""
    STATIC = "static"
    MOTION = "motion"
    VIDEO = "video"


class TemplateIndustryEnum(str, Enum):
    """Industry categories for templates."""
    ECOMMERCE = "ecommerce"
    SAAS = "saas"
    LOCAL = "local"
    PERSONAL = "personal"
    HEALTHCARE = "healthcare"
    FINANCE = "finance"
    REALESTATE = "realestate"
    FOOD = "food"
    GENERAL = "general"


class TemplatePlatformEnum(str, Enum):
    """Target platforms for templates."""
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    META_ADS = "meta_ads"
    GOOGLE_ADS = "google_ads"
    GENERAL = "general"


class TemplateObjectiveEnum(str, Enum):
    """Marketing objectives for templates."""
    CONVERSION = "conversion"
    AWARENESS = "awareness"
    TESTIMONIAL = "testimonial"
    PROMOTION = "promotion"
    ENGAGEMENT = "engagement"
    ANNOUNCEMENT = "announcement"
    GENERAL = "general"


# === CREATE SCHEMAS ===

class AdminTemplateCreate(BaseModel):
    """Schema for creating a new template."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: str = Field(default="general", max_length=100)
    segment: Optional[str] = None
    
    # Classification
    industry: TemplateIndustryEnum = TemplateIndustryEnum.GENERAL
    platform: TemplatePlatformEnum = TemplatePlatformEnum.GENERAL
    objective: TemplateObjectiveEnum = TemplateObjectiveEnum.GENERAL
    format_type: FormatTypeEnum = FormatTypeEnum.STATIC
    
    # Template code
    html_code: str = Field(..., min_length=1)
    css_code: str = Field(default="")
    
    # Schemas (optional, can be auto-generated)
    layout_schema: Optional[Dict[str, Any]] = None
    motion_schema: Optional[Dict[str, Any]] = None
    
    # Configuration
    aspect_ratios: List[str] = Field(default=["1:1"])
    variables: List[Dict[str, Any]] = Field(default=[])
    
    # Flags
    is_premium: bool = False


class AdminTemplateUpdate(BaseModel):
    """Schema for updating a template."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    segment: Optional[str] = None
    
    # Classification
    industry: Optional[TemplateIndustryEnum] = None
    platform: Optional[TemplatePlatformEnum] = None
    objective: Optional[TemplateObjectiveEnum] = None
    format_type: Optional[FormatTypeEnum] = None
    
    # Template code
    html_code: Optional[str] = None
    css_code: Optional[str] = None
    
    # Schemas
    layout_schema: Optional[Dict[str, Any]] = None
    motion_schema: Optional[Dict[str, Any]] = None
    
    # Configuration
    aspect_ratios: Optional[List[str]] = None
    variables: Optional[List[Dict[str, Any]]] = None
    
    # Flags
    is_premium: Optional[bool] = None
    is_active: Optional[bool] = None
    
    # Change notes (for version history)
    change_notes: Optional[str] = None


# === RESPONSE SCHEMAS ===

class AdminTemplateResponse(BaseModel):
    """Full template response for admin view."""
    id: UUID
    name: str
    description: Optional[str]
    category: str
    segment: Optional[str]
    
    # Status
    status: str
    
    # Classification
    industry: str
    platform: str
    objective: str
    format_type: str
    
    # Template code
    html_code: str
    css_code: str
    
    # Schemas
    layout_schema: Optional[Dict[str, Any]]
    motion_schema: Optional[Dict[str, Any]]
    
    # Configuration
    thumbnail_url: Optional[str]
    aspect_ratios: List[str]
    variables: List[Dict[str, Any]]
    
    # Version
    version: int
    
    # Admin tracking
    created_by: Optional[UUID]
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    
    # QA
    dummy_render_passed: bool
    dummy_render_url: Optional[str]
    
    # Flags
    is_active: bool
    is_premium: bool
    
    # Stats
    usage_count: int
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AdminTemplateListResponse(BaseModel):
    """Simplified template response for list view."""
    id: UUID
    name: str
    description: Optional[str]
    category: str
    status: str
    industry: str
    platform: str
    format_type: str
    version: int
    thumbnail_url: Optional[str]
    dummy_render_passed: bool
    is_active: bool
    is_premium: bool
    usage_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TemplateVersionResponse(BaseModel):
    """Template version history item."""
    id: UUID
    template_id: UUID
    version: int
    change_notes: Optional[str]
    created_by: Optional[UUID]
    created_at: datetime
    
    class Config:
        from_attributes = True


class TemplateApprovalLogResponse(BaseModel):
    """Approval log entry."""
    id: UUID
    template_id: UUID
    action: str
    from_status: Optional[str]
    to_status: str
    template_version: Optional[int]
    admin_id: Optional[UUID]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# === ACTION SCHEMAS ===

class DummyRenderRequest(BaseModel):
    """Request parameters for dummy render."""
    aspect_ratio: str = Field(default="1:1")
    force_rerender: bool = Field(default=False, description="Re-render even if already passed")


class DummyRenderResponse(BaseModel):
    """Dummy render QA results."""
    template_id: UUID
    passed: bool
    render_url: Optional[str]
    issues: List[Dict[str, Any]] = Field(default=[])
    rendered_at: datetime


class ApproveTemplateRequest(BaseModel):
    """Request for approving a template."""
    notes: Optional[str] = Field(None, description="Optional approval notes")


class DeprecateTemplateRequest(BaseModel):
    """Request for deprecating a template."""
    notes: Optional[str] = Field(None, description="Reason for deprecation")


class RevertTemplateRequest(BaseModel):
    """Request for reverting to a previous version."""
    notes: Optional[str] = Field(None, description="Reason for revert")


class TemplateNormalizationResult(BaseModel):
    """Result of template normalization analysis."""
    zones: List[Dict[str, Any]] = Field(default=[], description="Detected layout zones")
    variables: List[Dict[str, Any]] = Field(default=[], description="Extracted template variables")
    hierarchy: Dict[str, Any] = Field(default={}, description="Inferred structure")
    layout_schema: Dict[str, Any] = Field(default={}, description="Generated layout schema")
    warnings: List[str] = Field(default=[], description="Any warnings during analysis")
