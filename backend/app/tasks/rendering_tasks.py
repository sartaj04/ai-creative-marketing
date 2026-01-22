"""
Template rendering background tasks.

DEPRECATED: These tasks previously used Playwright-based HTML rendering.
The render pipeline is being migrated to a new Node.js Satori/Resvg service.
These task stubs remain for backwards compatibility during transition.
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


@celery_app.task(bind=True, max_retries=1)
def render_template_task(
    self,
    job_id: str,
    template_id: str,
    data: Dict[str, Any],
    aspect_ratio: str,
    user_id: str,
    profile_id: str
):
    """
    Background task for rendering a template to an image.
    
    DEPRECATED: This task is being migrated to a new Node.js render service.
    Currently raises NotImplementedError.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        error_msg = (
            "Rendering pipeline deprecated. "
            "New Satori/Resvg render service coming soon."
        )
        loop.run_until_complete(
            _update_job_status(job_id, JobStatusEnum.FAILED, error_message=error_msg)
        )
        raise NotImplementedError(error_msg)
    finally:
        loop.close()


@celery_app.task(bind=True)
def batch_render_task(
    self,
    job_id: str,
    render_configs: List[Dict[str, Any]],
    user_id: str,
    profile_id: str
):
    """
    Background task for batch rendering multiple templates.
    
    DEPRECATED: This task is being migrated to a new Node.js render service.
    Currently raises NotImplementedError.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        error_msg = (
            "Rendering pipeline deprecated. "
            "New Satori/Resvg render service coming soon."
        )
        loop.run_until_complete(
            _update_job_status(job_id, JobStatusEnum.FAILED, error_message=error_msg)
        )
        raise NotImplementedError(error_msg)
    finally:
        loop.close()

