"""
Web scraping API endpoints.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserSegment
from app.models.brand_profile import BrandProfile
from app.models.job_status import JobStatus, JobType, JobStatusEnum
from app.schemas.brand_profile import ScrapeRequest, BrandProfileResponse
from app.schemas.job import JobStatusResponse
from app.core.auth import get_current_user


router = APIRouter()


@router.post("/scrape", response_model=JobStatusResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_scraping(
    scrape_request: ScrapeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Start scraping a website for brand assets.
    
    This is an async operation. Returns a job ID to track progress.
    """
    # Create job status
    job = JobStatus(
        user_id=current_user.id,
        job_type=JobType.SCRAPE,
        status=JobStatusEnum.PENDING,
        input_data={
            "url": scrape_request.url,
            "profile_type": scrape_request.profile_type.value
        }
    )
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # TODO: Add Celery task for actual scraping
    # background_tasks.add_task(scrape_website_task, str(job.id), scrape_request.url, scrape_request.profile_type)
    
    return JobStatusResponse(
        id=job.id,
        user_id=job.user_id,
        job_type=job.job_type,
        celery_task_id=job.celery_task_id,
        status=job.status,
        progress=job.progress,
        input_data=job.input_data,
        result=job.result,
        error_message=job.error_message,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at,
        is_complete=job.is_complete,
        duration_seconds=job.duration_seconds
    )


@router.get("/job/{job_id}", response_model=JobStatusResponse)
async def get_scraping_job_status(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the status of a scraping job.
    """
    result = await db.execute(
        select(JobStatus)
        .where(
            JobStatus.id == job_id,
            JobStatus.user_id == current_user.id,
            JobStatus.job_type == JobType.SCRAPE
        )
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return JobStatusResponse(
        id=job.id,
        user_id=job.user_id,
        job_type=job.job_type,
        celery_task_id=job.celery_task_id,
        status=job.status,
        progress=job.progress,
        input_data=job.input_data,
        result=job.result,
        error_message=job.error_message,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at,
        is_complete=job.is_complete,
        duration_seconds=job.duration_seconds
    )


@router.post("/{profile_id}/rescrape", response_model=JobStatusResponse, status_code=status.HTTP_202_ACCEPTED)
async def rescrape_brand_profile(
    profile_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Re-scrape an existing brand profile.
    """
    result = await db.execute(
        select(BrandProfile)
        .where(
            BrandProfile.id == profile_id,
            BrandProfile.user_id == current_user.id
        )
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand profile not found"
        )
    
    if not profile.website_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brand profile has no website URL"
        )
    
    # Create job status
    job = JobStatus(
        user_id=current_user.id,
        job_type=JobType.SCRAPE,
        status=JobStatusEnum.PENDING,
        input_data={
            "url": profile.website_url,
            "profile_type": profile.profile_type.value,
            "profile_id": str(profile.id)
        }
    )
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    return JobStatusResponse(
        id=job.id,
        user_id=job.user_id,
        job_type=job.job_type,
        celery_task_id=job.celery_task_id,
        status=job.status,
        progress=job.progress,
        input_data=job.input_data,
        result=job.result,
        error_message=job.error_message,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at,
        is_complete=job.is_complete,
        duration_seconds=job.duration_seconds
    )
