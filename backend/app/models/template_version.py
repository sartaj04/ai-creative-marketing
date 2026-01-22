"""
Template Version model for immutable version history.
"""
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, TYPE_CHECKING

from sqlalchemy import String, DateTime, Text, Integer, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.template import Template
    from app.models.user import User


class TemplateVersion(Base):
    """
    Immutable version history for templates.
    
    Each time a template is modified, a new version is created.
    Versions are never deleted — only new ones are added.
    """
    
    __tablename__ = "template_versions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    # Reference to the parent template
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Version number (incrementing)
    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    
    # Snapshot of template code at this version
    html_code: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    css_code: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default=""
    )
    
    # Snapshot of schema definitions
    layout_schema: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True
    )
    motion_schema: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True
    )
    
    # Snapshot of variables
    variables: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True
    )
    
    # Change description / notes
    change_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    
    # Admin who created this version
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
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
        backref="versions",
        lazy="selectin"
    )
    
    creator: Mapped[Optional["User"]] = relationship(
        "User",
        lazy="selectin"
    )
    
    def __repr__(self) -> str:
        return f"<TemplateVersion template_id={self.template_id} version={self.version}>"
