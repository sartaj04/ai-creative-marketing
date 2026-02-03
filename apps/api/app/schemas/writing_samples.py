"""Writing sample schemas."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class WritingSampleImport(BaseModel):
    """Schema for importing writing samples."""
    
    posts: List[str] = Field(
        ...,
        min_length=1,
        description="List of user's actual posts (text content)",
    )
    platform: str = Field(
        default="manual",
        description="Platform source: linkedin, twitter, or manual",
    )


class WritingSampleResponse(BaseModel):
    """Response schema for a single writing sample."""
    
    id: UUID
    content: str
    platform: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class WritingSamplesListResponse(BaseModel):
    """Response schema for list of writing samples."""
    
    samples: List[WritingSampleResponse]
    total: int
    analysis_status: str  # "none", "pending", "completed"
    writing_samples_count: int


class WritingSampleAnalysisResponse(BaseModel):
    """Response schema for writing sample analysis."""
    
    summary: str
    length_distribution: dict
    opening_styles: dict
    structure: dict
    vocabulary: dict
    tone_examples: List[dict]
    closing_patterns: dict
    visual_elements: dict
    content_patterns: dict
    analyzed_at: datetime


class WritingSampleAnalysisTrigger(BaseModel):
    """Schema for triggering analysis."""
    
    regenerate_persona: bool = Field(
        default=True,
        description="Whether to regenerate persona prompt after analysis",
    )
