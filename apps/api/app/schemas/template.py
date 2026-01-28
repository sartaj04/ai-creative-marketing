"""Template schemas."""
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.draft import DraftFormat
from app.models.template import TemplateCategory, ContributionStatus


class TemplateCreate(BaseModel):
    """Schema for creating a user template."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    content: str = Field(..., min_length=1)
    format: DraftFormat = DraftFormat.POST
    category: TemplateCategory
    tags: list[str] = Field(default_factory=list)
    use_cases: list[str] = Field(default_factory=list)
    tone_fit: list[str] = Field(default_factory=list)
    platform: str = "both"
    # Future fields
    image_template: Optional[str] = None
    carousel_slides: Optional[list[dict[str, Any]]] = None
    media_placeholders: Optional[dict[str, Any]] = None


class TemplateUpdate(BaseModel):
    """Schema for updating a template."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    content: Optional[str] = None
    format: Optional[DraftFormat] = None
    category: Optional[TemplateCategory] = None
    tags: Optional[list[str]] = None
    use_cases: Optional[list[str]] = None
    tone_fit: Optional[list[str]] = None
    platform: Optional[str] = None
    is_active: Optional[bool] = None


# ============ Admin System Template Schemas ============

class SystemTemplateCreate(BaseModel):
    """
    Schema for admin to create a system template.
    Only content is required - metadata is auto-extracted via LLM.
    Admins can optionally override any extracted values.
    """

    content: str = Field(..., min_length=1, description="Template content with {placeholders}")
    # Optional overrides - if not provided, LLM will extract
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    format: Optional[DraftFormat] = None
    category: Optional[TemplateCategory] = None
    tags: Optional[list[str]] = None
    use_cases: Optional[list[str]] = None
    tone_fit: Optional[list[str]] = None
    platform: Optional[str] = None


class SystemTemplateAnalyzeRequest(BaseModel):
    """Request to analyze template content without saving."""

    content: str = Field(..., min_length=1, description="Template content to analyze")
    name: Optional[str] = None
    description: Optional[str] = None


class SystemTemplateAnalyzeResponse(BaseModel):
    """Response from template analysis with LLM-extracted metadata."""

    variables: dict[str, Any] = Field(default_factory=dict)
    category: TemplateCategory
    tags: list[str] = Field(default_factory=list)
    use_cases: list[str] = Field(default_factory=list)
    tone_fit: list[str] = Field(default_factory=list)
    format: DraftFormat
    platform: str
    suggested_name: Optional[str] = None
    suggested_description: Optional[str] = None


# ============ Template Contribution Schemas ============

class TemplateContributeRequest(BaseModel):
    """Request for a user to contribute their template to the platform."""

    template_id: UUID


class TemplateContributeResponse(BaseModel):
    """Response after submitting template for contribution."""

    template_id: UUID
    contribution_status: ContributionStatus
    message: str


class ContributionReviewRequest(BaseModel):
    """Admin request to approve or reject a contributed template."""

    approved: bool
    rejection_reason: Optional[str] = None


class VariableMetadata(BaseModel):
    """Schema for extracted variable metadata."""

    name: str
    is_primary: bool = False
    description: Optional[str] = None


class TemplateResponse(BaseModel):
    """Schema for template response."""

    id: UUID
    name: str
    description: Optional[str] = None
    content: str
    format: DraftFormat
    category: TemplateCategory
    tags: list[str] = Field(default_factory=list)
    variables: dict[str, Any] = Field(default_factory=dict)
    use_cases: list[str] = Field(default_factory=list)
    tone_fit: list[str] = Field(default_factory=list)
    platform: str
    image_template: Optional[str] = None
    carousel_slides: Optional[list[dict[str, Any]]] = None
    media_placeholders: Optional[dict[str, Any]] = None
    # Ownership and contribution
    is_system: bool = False
    is_contributed: bool = False
    contribution_status: ContributionStatus = ContributionStatus.NONE
    is_active: bool
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    # Stats
    usage_count: int = 0
    approval_rate: float = 0.0

    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    """Schema for template list response."""

    templates: list[TemplateResponse]
    total: int


class TemplateMatchRequest(BaseModel):
    """Schema for finding matching templates."""

    profile_id: UUID
    topic: Optional[str] = None
    format: Optional[DraftFormat] = None
    category: Optional[TemplateCategory] = None
    tone_preferences: Optional[dict[str, float]] = None
    limit: int = Field(5, ge=1, le=20)


class TemplateMatchResponse(BaseModel):
    """Schema for template match response."""

    templates: list[TemplateResponse]
    match_scores: dict[str, float] = Field(default_factory=dict)
