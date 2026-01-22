"""
Template Approval Log model for audit trail.
"""
import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, DateTime, Text, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.template import Template
    from app.models.user import User


class TemplateApprovalAction(str):
    """Types of approval actions."""
    APPROVE = "approve"
    DEPRECATE = "deprecate"
    REVERT = "revert"
    REJECT = "reject"
    REACTIVATE = "reactivate"


class TemplateApprovalLog(Base):
    """
    Audit trail for template approval actions.
    
    Records all status changes and administrative actions
    performed on templates for compliance and debugging.
    """
    
    __tablename__ = "template_approval_logs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    # Reference to the template
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Action performed
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    
    # Status transition
    from_status: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    to_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    
    # Version at time of action
    template_version: Mapped[Optional[int]] = mapped_column(
        nullable=True
    )
    
    # Admin who performed the action
    admin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Optional notes/reason for the action
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    
    # Metadata about the action (e.g., dummy render results)
    action_metadata: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    # Relationships
    template: Mapped["Template"] = relationship(
        "Template",
        backref="approval_logs",
        lazy="selectin"
    )
    
    admin: Mapped[Optional["User"]] = relationship(
        "User",
        lazy="selectin"
    )
    
    def __repr__(self) -> str:
        return f"<TemplateApprovalLog template_id={self.template_id} action={self.action}>"
