"""
Pydantic schemas for AI template processing.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field


class AIProcessingStatus(str, Enum):
    """Status of AI processing job."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class SourceType(str, Enum):
    """Type of uploaded source."""
    IMAGE = "image"
    HTML = "html"


# === REQUEST SCHEMAS ===

class FeedbackRequest(BaseModel):
    """Request to submit feedback for AI refinement."""
    feedback: str = Field(..., min_length=1, max_length=2000, description="Natural language feedback")


class AcceptAIResultRequest(BaseModel):
    """Request to accept AI-processed result."""
    # Optional overrides before saving
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    industry: Optional[str] = None
    platform: Optional[str] = None
    objective: Optional[str] = None


# === RESPONSE SCHEMAS ===

class AIUploadResponse(BaseModel):
    """Response after initiating template upload for AI processing."""
    template_id: UUID
    job_id: str
    status: AIProcessingStatus
    message: str
    source_url: Optional[str] = None


class DetectedZone(BaseModel):
    """A detected layout zone in the template."""
    id: str
    type: str  # headline, image, cta, logo, badge, background, text
    position: Optional[str] = None
    size: Optional[str] = None  # large, medium, small
    content_description: Optional[str] = None


class DetectedVariable(BaseModel):
    """A detected template variable."""
    name: str
    type: str  # text, image, color, url, boolean
    required: bool = True
    default_value: Optional[str] = ""
    max_length: Optional[int] = None
    description: Optional[str] = None


class TemplateAIResultResponse(BaseModel):
    """Complete result of AI template processing."""
    template_id: UUID
    
    # Generated/extracted content
    html_code: str
    css_code: str
    
    # Suggested metadata
    suggested_name: str
    suggested_description: str
    suggested_industry: str
    suggested_platform: str
    suggested_objective: str
    suggested_aspect_ratios: List[str]
    
    # Extracted structure
    detected_zones: List[Dict[str, Any]]
    detected_variables: List[Dict[str, Any]]
    layout_schema: Dict[str, Any]
    
    # Original upload info
    source_type: SourceType
    source_url: Optional[str] = None
    
    # AI reasoning
    analysis_notes: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)


class AIProcessingStatusResponse(BaseModel):
    """Status of AI processing job."""
    template_id: UUID
    job_id: str
    status: AIProcessingStatus
    progress: int = Field(..., ge=0, le=100)
    current_step: str
    result: Optional[TemplateAIResultResponse] = None
    error: Optional[str] = None


class BrandPreviewResult(BaseModel):
    """Preview of template with a specific brand."""
    brand_id: str
    brand_name: str
    rendered_html: str  # Complete HTML document ready for iframe rendering
    colors_used: Dict[str, str]
    font_family: str
    sample_content: Dict[str, str]  # Sample text content used


class BrandPreviewsResponse(BaseModel):
    """Response containing all brand previews."""
    template_id: UUID
    previews: List[BrandPreviewResult]
    total_brands: int


class BrandProfileInfo(BaseModel):
    """Information about an available brand profile."""
    id: str
    name: str
    primary_color: str
    secondary_color: str
    background_color: str
    description: Optional[str] = None


class AvailableBrandsResponse(BaseModel):
    """List of available brand profiles for preview."""
    brands: List[BrandProfileInfo]


# === STATE TRACKING ===

class AIProcessingState(BaseModel):
    """
    Internal state for tracking AI processing.
    Stored in a temporary table or cache.
    """
    template_id: UUID
    job_id: str
    status: AIProcessingStatus
    source_type: SourceType
    source_url: Optional[str] = None
    source_bytes_b64: Optional[str] = None  # Base64 encoded original upload
    source_mime_type: Optional[str] = None
    
    # Processing progress
    progress: int = 0
    current_step: str = "Initializing"
    
    # Current state (latest AI result)
    current_html: Optional[str] = None
    current_css: Optional[str] = None
    current_metadata: Optional[Dict[str, Any]] = None
    current_variables: Optional[List[Dict[str, Any]]] = None
    current_zones: Optional[List[Dict[str, Any]]] = None
    
    # Feedback history
    feedback_history: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Error tracking
    error: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }
