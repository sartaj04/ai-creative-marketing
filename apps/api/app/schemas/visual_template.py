"""Visual template schemas."""
from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Variable field schema ──────────────────────────────────────────────

class VariableFieldSchema(BaseModel):
    """Schema definition for a single editable template variable."""

    type: Literal["text", "textarea", "color", "image", "number", "select"]
    label: str = ""                       # Human-readable display name e.g. "Heading Font Size"
    section: str = "Content"             # "Typography" | "Colors" | "Content" | "Layout" | "Images"
    description: str = ""
    required: bool = True
    maxLength: Optional[int] = None
    # Number-specific
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = None
    unit: Optional[str] = None            # "px" | "%" | "em" | "ratio"
    # Select-specific
    options: Optional[list[str]] = None
    # General
    placeholder: Optional[str] = None

    class Config:
        extra = "allow"  # Backwards compat: old schemas without new fields still parse


# ── Slide schemas ─────────────────────────────────────────────────────

class SlideTemplateCreate(BaseModel):
    """Data for creating one slide within a carousel template."""

    html_structure: str = Field(
        ...,
        min_length=10,
        description="Full HTML/CSS with {{variable}} slots for this slide",
    )
    variable_schema: dict[str, Any] = Field(
        default_factory=dict,
        description="Variable definitions for this slide: {name: {type, maxLength, required, description}}",
    )
    default_values: dict[str, Any] = Field(
        default_factory=dict,
        description="Example/default variable values for preview",
    )


class SlideTemplateResponse(BaseModel):
    """Response schema for a saved SlideTemplate."""

    id: UUID
    visual_template_id: UUID
    html_structure: str
    variable_schema: dict[str, Any] = Field(default_factory=dict)
    default_values: dict[str, Any] = Field(default_factory=dict)
    order: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Visual Template schemas ───────────────────────────────────────────

class VisualTemplateResponse(BaseModel):
    """Schema for visual template response."""

    id: UUID
    name: str
    type: str
    category: str
    preview_url: Optional[str] = None
    html_template: Optional[str] = None
    variables_schema: dict[str, Any] = Field(default_factory=dict)
    slide_count: Optional[int] = None
    slides_schema: Optional[dict[str, Any]] = None  # legacy field, kept for compat
    slides: list[SlideTemplateResponse] = Field(default_factory=list)
    default_values: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    platform: str = "both"
    dimensions: dict[str, Any] = Field(default_factory=lambda: {"width": 1080, "height": 1080})
    is_system: bool = False
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VisualTemplateListResponse(BaseModel):
    """Schema for paginated visual template list."""

    templates: list[VisualTemplateResponse]
    total: int


class VisualTemplateDraft(BaseModel):
    """Schema for a generated but unsaved visual template (pipeline output)."""

    name: str = "Generated Template"
    type: str
    category: str = "quote"
    html_template: str
    variables_schema: dict[str, Any] = Field(default_factory=dict)
    slide_count: Optional[int] = None
    default_values: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=lambda: ["ai-generated"])
    dimensions: dict[str, Any] = Field(default_factory=lambda: {"width": 1080, "height": 1080})
    slides: list[SlideTemplateCreate] = Field(
        default_factory=list,
        description="Per-slide HTML structures for carousel templates (from pipeline)",
    )


class VisualTemplateCreateRequest(BaseModel):
    """Request to create a custom visual template."""

    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., description="image or carousel")
    category: str = Field(..., min_length=1, max_length=50)
    html_template: Optional[str] = Field(
        default=None,
        description="HTML/CSS template with {{variable}} slots",
    )
    canvas_json: Optional[dict[str, Any]] = Field(
        default=None,
        description="Fabric.js canvas JSON for builder-created templates",
    )
    variables_schema: dict[str, Any] = Field(
        default_factory=dict,
        description="Schema defining editable template variables",
    )
    slide_count: Optional[int] = Field(default=None, ge=1, le=20)
    slides_schema: Optional[dict[str, Any]] = None  # legacy, kept for compat
    slides: list[SlideTemplateCreate] = Field(
        default_factory=list,
        description="Per-slide HTML and variable schemas for carousel templates",
    )
    default_values: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    platform: str = Field(default="both")
    dimensions: dict[str, Any] = Field(
        default_factory=lambda: {"width": 1080, "height": 1080}
    )


class VisualTemplateUpdateRequest(BaseModel):
    """Request to update a custom visual template."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category: Optional[str] = None
    html_template: Optional[str] = None
    canvas_json: Optional[dict[str, Any]] = None
    variables_schema: Optional[dict[str, Any]] = None
    slide_count: Optional[int] = None
    slides_schema: Optional[dict[str, Any]] = None
    default_values: Optional[dict[str, Any]] = None
    tags: Optional[list[str]] = None
    platform: Optional[str] = None
    dimensions: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None


class VisualTemplatePreviewRequest(BaseModel):
    """Request to render a preview of a template with custom variables."""

    variables: dict[str, Any] = Field(..., description="Variable values for preview rendering")
    brand_overrides: Optional[dict[str, str]] = None
