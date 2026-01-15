"""
Job status Pydantic schemas.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel

from app.models.job_status import JobType, JobStatusEnum


class JobCreate(BaseModel):
    """Schema for creating a job."""
    job_type: JobType
    input_data: Dict[str, Any] = {}


class JobStatusResponse(BaseModel):
    """Schema for job status response."""
    id: UUID
    user_id: UUID
    job_type: JobType
    celery_task_id: Optional[str] = None
    status: JobStatusEnum
    progress: int
    input_data: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    
    # Computed
    is_complete: bool
    duration_seconds: Optional[float] = None
    
    class Config:
        from_attributes = True


class JobProgressUpdate(BaseModel):
    """Schema for updating job progress."""
    status: Optional[JobStatusEnum] = None
    progress: Optional[int] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
