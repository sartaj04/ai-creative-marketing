"""
BrandScale AI - Job Schemas
Pydantic models for background jobs.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.config import JobStatus, Platform, ProfileType


class ScrapeJobCreate(BaseModel):
    """Schema for creating a scrape job."""
    
    url: str = Field(..., min_length=1)
    profile_type: ProfileType
    name: Optional[str] = None  # Brand name, auto-detected if not provided


class ScrapeJobResponse(BaseModel):
    """Schema for scrape job response."""
    
    job_id: str
    profile_id: int
    status: JobStatus
    message: str


class GenerateJobConfig(BaseModel):
    """Configuration for generation job."""
    
    campaign_type: str = Field(default="general")  # sale, launch, awareness, general
    language: str = Field(default="en")
    platforms: List[Platform] = Field(default=[Platform.INSTAGRAM_FEED])
    aspect_ratios: List[str] = Field(default=["1:1"])
    template_ids: Optional[List[int]] = None  # Specific templates, or auto-select
    num_variants: int = Field(default=5, ge=1, le=20)
    product_ids: Optional[List[str]] = None  # Specific products for e-commerce
    topics: Optional[List[str]] = None  # Topics for content
    festival: Optional[str] = None  # Festival for themed content
    custom_instructions: Optional[str] = None  # Additional AI instructions


class GenerateJobCreate(BaseModel):
    """Schema for creating a generation job."""
    
    profile_id: int
    config: GenerateJobConfig


class GenerateJobResponse(BaseModel):
    """Schema for generation job response."""
    
    job_id: str
    profile_id: int
    status: JobStatus
    message: str
    estimated_assets: int


class RenderJobCreate(BaseModel):
    """Schema for creating a render job."""
    
    template_id: int
    data: Dict[str, Any]
    aspect_ratios: List[str] = Field(default=["1:1"])
    profile_id: Optional[int] = None


class RenderJobResponse(BaseModel):
    """Schema for render job response."""
    
    job_id: str
    status: JobStatus
    message: str


class JobStatusResponse(BaseModel):
    """Schema for job status check response."""
    
    job_id: str
    status: JobStatus
    progress: int = Field(default=0, ge=0, le=100)
    message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class JobProgressUpdate(BaseModel):
    """Internal schema for job progress updates."""
    
    job_id: str
    status: JobStatus
    progress: int
    message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
