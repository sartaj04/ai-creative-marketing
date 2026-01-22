"""
Admin Dashboard API endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.template import Template, TemplateStatus
from app.core.admin_auth import get_admin_user
from app.schemas.admin_dashboard import AdminStatsResponse


router = APIRouter()


@router.get("/stats/", response_model=AdminStatsResponse)
async def get_dashboard_stats(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get aggregated statistics for the admin dashboard.
    """
    # Total Templates
    total_templates_result = await db.execute(select(func.count(Template.id)))
    total_templates = total_templates_result.scalar() or 0
    
    # Approved Templates
    approved_templates_result = await db.execute(
        select(func.count(Template.id)).where(Template.status == TemplateStatus.APPROVED)
    )
    approved_templates = approved_templates_result.scalar() or 0
    
    # Pending Approval (Drafts)
    pending_approval_result = await db.execute(
        select(func.count(Template.id)).where(Template.status == TemplateStatus.DRAFT)
    )
    pending_approval = pending_approval_result.scalar() or 0
    
    # Total Users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0
    
    return AdminStatsResponse(
        total_templates=total_templates,
        pending_approval=pending_approval,
        approved_templates=approved_templates,
        total_users=total_users
    )
