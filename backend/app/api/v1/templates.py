"""
Template API endpoints.
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserSegment
from app.models.template import Template
from app.core.auth import get_current_user


router = APIRouter()


class TemplateResponse(BaseModel):
    """Template response schema."""
    id: UUID
    name: str
    description: Optional[str] = None
    category: str
    segment: Optional[str] = None
    thumbnail_url: Optional[str] = None
    aspect_ratios: List[str]
    is_premium: bool
    usage_count: int
    
    class Config:
        from_attributes = True


class TemplateDetailResponse(TemplateResponse):
    """Template detail response with code."""
    html_code: str
    css_code: str
    variables: List[dict]


@router.get("/", response_model=List[TemplateResponse])
async def list_templates(
    segment: Optional[UserSegment] = None,
    category: Optional[str] = None,
    aspect_ratio: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List available templates with optional filters.
    """
    query = select(Template).where(Template.is_active == True)
    
    if segment:
        query = query.where(Template.segment == segment.value)
    if category:
        query = query.where(Template.category == category)
    
    # Filter by aspect ratio if provided (check if it's in the array)
    # Note: This is a simplified version; for production, use proper JSON query
    
    # Filter premium templates based on user tier
    if current_user.tier.value == "free":
        query = query.where(Template.is_premium == False)
    
    query = query.order_by(Template.usage_count.desc())
    
    result = await db.execute(query)
    templates = result.scalars().all()
    
    # Filter by aspect ratio in-memory (for simplicity)
    if aspect_ratio:
        templates = [t for t in templates if aspect_ratio in t.aspect_ratios]
    
    return templates


@router.get("/categories")
async def list_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of unique template categories.
    """
    result = await db.execute(
        select(Template.category)
        .where(Template.is_active == True)
        .distinct()
    )
    categories = result.scalars().all()
    
    return {"categories": categories}


@router.get("/{template_id}", response_model=TemplateDetailResponse)
async def get_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific template with full details.
    """
    result = await db.execute(
        select(Template)
        .where(
            Template.id == template_id,
            Template.is_active == True
        )
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Check if premium template and user has access
    if template.is_premium and current_user.tier.value == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium template requires Starter or Pro tier"
        )
    
    return template


@router.get("/{template_id}/preview")
async def preview_template(
    template_id: UUID,
    aspect_ratio: str = "1:1",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a preview render of a template with sample data.
    """
    result = await db.execute(
        select(Template)
        .where(
            Template.id == template_id,
            Template.is_active == True
        )
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    if aspect_ratio not in template.aspect_ratios:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template doesn't support aspect ratio {aspect_ratio}"
        )
    
    # TODO: Render preview with sample data
    return {
        "template_id": template_id,
        "aspect_ratio": aspect_ratio,
        "preview_url": template.thumbnail_url
    }
