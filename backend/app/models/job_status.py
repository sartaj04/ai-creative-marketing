"""
JobStatus model for tracking async background jobs.
"""
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, Text, Integer, Enum as SQLEnum, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class JobType(str, Enum):
    """Types of background jobs."""
    SCRAPE = "scrape"
    GENERATE_COPY = "generate_copy"
    RENDER_TEMPLATE = "render_template"
    BATCH_RENDER = "batch_render"
    EXPORT_ZIP = "export_zip"


class JobStatusEnum(str, Enum):
    """Job execution status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobStatus(Base):
    """Track status of async background jobs."""
    
    __tablename__ = "job_statuses"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Job identification
    job_type: Mapped[JobType] = mapped_column(
        SQLEnum(JobType),
        nullable=False
    )
    celery_task_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )
    
    # Status tracking
    status: Mapped[JobStatusEnum] = mapped_column(
        SQLEnum(JobStatusEnum),
        default=JobStatusEnum.PENDING,
        nullable=False
    )
    progress: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Input/Output data
    input_data: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        nullable=False
    )
    result: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True
    )
    
    # Error handling
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Timing
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="jobs"
    )
    
    @property
    def is_complete(self) -> bool:
        """Check if job has finished."""
        return self.status in (JobStatusEnum.COMPLETED, JobStatusEnum.FAILED, JobStatusEnum.CANCELLED)
    
    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate job duration in seconds."""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
