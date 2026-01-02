"""
BrandScale AI - Templates Routes
Template listing and preview endpoints.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import ProfileType
from app.database import get_db
from app.models.template import Template
from app.models.user import User
from app.schemas.template import (
    TemplateData,
    TemplateDetailResponse,
    TemplateListResponse,
    TemplateResponse,
)
from app.utils.auth import get_current_active_user


router = APIRouter(prefix="/api/templates", tags=["Templates"])


@router.get("", response_model=TemplateListResponse)
async def list_templates(
    segment: Optional[ProfileType] = None,
    category: Optional[str] = None,
    is_premium: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List available templates with filters.
    """
    conditions = [Template.is_active == True]
    
    if segment:
        conditions.append(Template.segment == segment)
    if category:
        conditions.append(Template.category == category)
    if is_premium is not None:
        conditions.append(Template.is_premium == is_premium)
    
    # Count total
    count_stmt = select(func.count(Template.id)).where(and_(*conditions))
    total = (await db.execute(count_stmt)).scalar() or 0
    
    # Fetch page
    offset = (page - 1) * page_size
    stmt = (
        select(Template)
        .where(and_(*conditions))
        .order_by(Template.name)
        .offset(offset)
        .limit(page_size)
    )
    
    templates = (await db.execute(stmt)).scalars().all()
    
    return TemplateListResponse(
        templates=[TemplateResponse.model_validate(t) for t in templates],
        total=total
    )


@router.get("/categories")
async def list_categories(
    segment: Optional[ProfileType] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List available template categories.
    """
    conditions = [Template.is_active == True]
    if segment:
        conditions.append(Template.segment == segment)
    
    stmt = (
        select(Template.category, func.count(Template.id))
        .where(and_(*conditions))
        .group_by(Template.category)
        .order_by(Template.category)
    )
    
    results = (await db.execute(stmt)).all()
    
    return {
        "categories": [
            {"name": cat, "count": count}
            for cat, count in results
        ]
    }


@router.get("/{template_id}", response_model=TemplateDetailResponse)
async def get_template(
    template_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get template details including HTML/CSS.
    """
    stmt = select(Template).where(
        Template.id == template_id,
        Template.is_active == True
    )
    template = (await db.execute(stmt)).scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Check premium access
    from app.config import UserTier
    if template.is_premium and current_user.tier == UserTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium template requires Starter or Pro subscription"
        )
    
    return TemplateDetailResponse.model_validate(template)


@router.post("/{template_id}/preview")
async def preview_template(
    template_id: int,
    data: TemplateData,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a small preview of the template with given data.
    Returns base64 encoded image.
    """
    import base64
    from app.services.renderer import template_renderer
    
    stmt = select(Template).where(
        Template.id == template_id,
        Template.is_active == True
    )
    template = (await db.execute(stmt)).scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    try:
        # Generate small preview
        preview_bytes = await template_renderer.preview_render(
            template_html=template.html_code,
            template_css=template.css_code,
            data=data.to_render_dict(),
            width=400,
            height=400
        )
        
        # Convert to base64
        preview_base64 = base64.b64encode(preview_bytes).decode('utf-8')
        
        return {
            "preview": f"data:image/png;base64,{preview_base64}",
            "template_id": template_id,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Preview generation failed: {str(e)}"
        )


@router.get("/{template_id}/variables")
async def get_template_variables(
    template_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of variables required by a template.
    """
    stmt = select(Template).where(
        Template.id == template_id,
        Template.is_active == True
    )
    template = (await db.execute(stmt)).scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    return {
        "template_id": template_id,
        "variables": template.variables,
        "default_values": template.default_values or {},
        "aspect_ratios": template.aspect_ratios,
        "platforms": template.platforms,
    }
