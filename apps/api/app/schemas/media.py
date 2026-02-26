"""Media asset schemas."""
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MediaAssetResponse(BaseModel):
    """Schema for media asset response."""

    id: UUID
    draft_id: UUID
    type: str
    storage_url: str
    alt_text: Optional[str] = None
    slide_index: Optional[int] = None
    visual_template_id: Optional[UUID] = None
    generation_prompt: Optional[str] = None
    metadata_json: dict = Field(default_factory=dict)
    created_at: datetime

    class Config:
        from_attributes = True


class ImageRenderRequest(BaseModel):
    """Request to render an image from a visual template."""

    draft_id: UUID
    template_id: UUID
    variables: dict = Field(..., description="Template variable values")
    brand_overrides: Optional[dict] = Field(
        default=None,
        description="Optional brand customization: {primary_color, font_family, ...}",
    )


class ImageGenerateRequest(BaseModel):
    """Request to generate an AI image."""

    draft_id: UUID
    prompt: Optional[str] = Field(
        default=None,
        description="Image prompt. Auto-generated from draft content if blank.",
    )
    style: str = Field(
        default="professional",
        description="Style preset: professional, creative, minimal, bold, abstract",
    )
    width: int = Field(default=1080, ge=256, le=2048)
    height: int = Field(default=1080, ge=256, le=2048)


class ImageUploadResponse(BaseModel):
    """Response after uploading/generating an image."""

    media_asset: MediaAssetResponse
    message: str = "Image created successfully"
