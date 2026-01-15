"""
Scraping background tasks.
"""
from datetime import datetime, timezone
import asyncio
from typing import Dict, Any

from celery import states

from app.tasks.celery_app import celery_app
from app.database import async_session_maker
from app.models.job_status import JobStatus, JobStatusEnum
from app.models.brand_profile import BrandProfile


async def _update_job_status(
    job_id: str,
    status: JobStatusEnum,
    progress: int = 0,
    result: Dict[str, Any] = None,
    error_message: str = None
):
    """Update job status in database."""
    async with async_session_maker() as session:
        from sqlalchemy import select
        result_query = await session.execute(
            select(JobStatus).where(JobStatus.id == job_id)
        )
        job = result_query.scalar_one_or_none()
        if job:
            job.status = status
            job.progress = progress
            if result:
                job.result = result
            if error_message:
                job.error_message = error_message
            if status == JobStatusEnum.PROCESSING and not job.started_at:
                job.started_at = datetime.now(timezone.utc)
            if status in (JobStatusEnum.COMPLETED, JobStatusEnum.FAILED):
                job.completed_at = datetime.now(timezone.utc)
            await session.commit()


@celery_app.task(bind=True, max_retries=3)
def scrape_website_task(self, job_id: str, url: str, segment: str, profile_id: str = None):
    """
    Background task for scraping a website.
    
    Args:
        job_id: The JobStatus UUID
        url: Website URL to scrape
        segment: User segment (ecommerce, saas, personal)
        profile_id: Optional existing profile to update
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        # Update status to processing
        loop.run_until_complete(
            _update_job_status(job_id, JobStatusEnum.PROCESSING, progress=10)
        )
        
        # Import scraper based on segment
        if segment == "ecommerce":
            from app.services.scraper.ecommerce import scrape_ecommerce
            scrape_func = scrape_ecommerce
        elif segment == "saas":
            from app.services.scraper.saas import scrape_saas
            scrape_func = scrape_saas
        elif segment == "personal":
            from app.services.scraper.personal import scrape_personal
            scrape_func = scrape_personal
        else:
            raise ValueError(f"Unknown segment: {segment}")
        
        # Update progress
        loop.run_until_complete(
            _update_job_status(job_id, JobStatusEnum.PROCESSING, progress=30)
        )
        
        # Run scraping
        result = loop.run_until_complete(scrape_func(url))
        
        # Update progress
        loop.run_until_complete(
            _update_job_status(job_id, JobStatusEnum.PROCESSING, progress=80)
        )
        
        # If profile_id provided, update the profile
        if profile_id:
            loop.run_until_complete(_update_brand_profile(profile_id, result))
        
        # Mark as completed
        loop.run_until_complete(
            _update_job_status(job_id, JobStatusEnum.COMPLETED, progress=100, result=result)
        )
        
        return result
        
    except Exception as exc:
        # Update job with error
        loop.run_until_complete(
            _update_job_status(job_id, JobStatusEnum.FAILED, error_message=str(exc))
        )
        
        # Retry if attempts remaining
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))
        
        raise
    finally:
        loop.close()


async def _update_brand_profile(profile_id: str, scraped_data: Dict[str, Any]):
    """Update brand profile with scraped data."""
    async with async_session_maker() as session:
        from sqlalchemy import select
        result = await session.execute(
            select(BrandProfile).where(BrandProfile.id == profile_id)
        )
        profile = result.scalar_one_or_none()
        if profile:
            profile.brand_assets = {
                **profile.brand_assets,
                **scraped_data
            }
            profile.is_scraped = True
            profile.last_scraped_at = datetime.now(timezone.utc)
            if scraped_data.get("logo_url"):
                profile.logo_url = scraped_data["logo_url"]
            await session.commit()
