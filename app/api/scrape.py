"""
BrandScale AI - Scrape Routes
Website scraping endpoints for brand asset extraction.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.brand_profile import BrandProfile
from app.models.user import User
from app.schemas.brand_profile import BrandProfileCreate, BrandProfileResponse
from app.schemas.job import JobStatusResponse, ScrapeJobCreate, ScrapeJobResponse
from app.utils.auth import get_current_active_user
from app.workers.celery_app import get_task_status
from app.workers.tasks import scrape_job


router = APIRouter(prefix="/api/scrape", tags=["Scraping"])


@router.post("", response_model=ScrapeJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_scrape_job(
    request: ScrapeJobCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Queue a website scraping job.
    
    Creates a brand profile and starts background scraping.
    Returns job ID for status tracking.
    """
    # Create brand profile record
    profile = BrandProfile(
        user_id=current_user.id,
        profile_type=request.profile_type,
        name=request.name or f"Profile for {request.url}",
        website_url=request.url,
        brand_assets={},
        scrape_status="pending"
    )
    
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    
    # Queue scraping job
    task = scrape_job.delay(
        url=request.url,
        profile_type=request.profile_type.value,
        user_id=current_user.id,
        profile_id=profile.id
    )
    
    # Update profile with job ID
    profile.scrape_job_id = task.id
    profile.scrape_status = "processing"
    await db.commit()
    
    return ScrapeJobResponse(
        job_id=task.id,
        profile_id=profile.id,
        status="pending",
        message="Scraping job queued successfully"
    )


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_scrape_status(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check the status of a scraping job.
    """
    # Verify job belongs to user
    stmt = select(BrandProfile).where(
        BrandProfile.scrape_job_id == job_id,
        BrandProfile.user_id == current_user.id
    )
    profile = (await db.execute(stmt)).scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Get task status from Celery
    status_info = get_task_status(job_id)
    
    # Enrich with profile info
    if status_info["status"] == "completed":
        status_info["result"] = {
            "profile_id": profile.id,
            "brand_assets": profile.brand_assets,
            "voice_profile": profile.voice_profile,
        }
    
    return JobStatusResponse(**status_info)


@router.post("/{profile_id}/rescrape", response_model=ScrapeJobResponse)
async def rescrape_profile(
    profile_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Re-scrape an existing brand profile to update assets.
    """
    # Get profile
    stmt = select(BrandProfile).where(
        BrandProfile.id == profile_id,
        BrandProfile.user_id == current_user.id
    )
    profile = (await db.execute(stmt)).scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Queue new scraping job
    task = scrape_job.delay(
        url=profile.website_url,
        profile_type=profile.profile_type.value,
        user_id=current_user.id,
        profile_id=profile.id
    )
    
    # Update profile
    profile.scrape_job_id = task.id
    profile.scrape_status = "processing"
    profile.scrape_error = None
    await db.commit()
    
    return ScrapeJobResponse(
        job_id=task.id,
        profile_id=profile.id,
        status="pending",
        message="Re-scraping job queued"
    )
