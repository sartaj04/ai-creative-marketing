"""
Copy generation background tasks.
"""
import asyncio
from typing import Dict, Any, List
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app
from app.database import async_session_maker
from app.models.job_status import JobStatus, JobStatusEnum


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


@celery_app.task(bind=True, max_retries=2)
def generate_copy_task(
    self,
    job_id: str,
    profile_id: str,
    generation_config: Dict[str, Any]
):
    """
    Background task for generating marketing copy using GPT-4.
    
    Args:
        job_id: The JobStatus UUID
        profile_id: Brand profile UUID
        generation_config: Configuration for copy generation
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        # Update status to processing
        loop.run_until_complete(
            _update_job_status(job_id, JobStatusEnum.PROCESSING, progress=10)
        )
        
        # Get brand profile
        from app.services.generator import generate_copy
        
        # Generate copy
        copies = loop.run_until_complete(
            generate_copy(profile_id, generation_config)
        )
        
        # Mark as completed
        loop.run_until_complete(
            _update_job_status(
                job_id, 
                JobStatusEnum.COMPLETED, 
                progress=100, 
                result={"copies": copies}
            )
        )
        
        return copies
        
    except Exception as exc:
        loop.run_until_complete(
            _update_job_status(job_id, JobStatusEnum.FAILED, error_message=str(exc))
        )
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30)
        
        raise
    finally:
        loop.close()
