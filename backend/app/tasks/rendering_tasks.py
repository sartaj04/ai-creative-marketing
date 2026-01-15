"""
Template rendering background tasks.
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
    
    Args:
        job_id: The JobStatus UUID
        template_id: Template UUID to render
        data: Template variables (headline, cta, product_image, etc.)
        aspect_ratio: Output aspect ratio ("1:1", "9:16", etc.)
        user_id: User UUID (for S3 path)
        profile_id: Brand profile UUID
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        loop.run_until_complete(
            _update_job_status(job_id, JobStatusEnum.PROCESSING, progress=10)
        )
        
        from app.services.template_renderer import render_template
        from app.services.s3_storage import upload_image
        
        # Render template
        image_buffer = loop.run_until_complete(
            render_template(template_id, data, aspect_ratio)
        )
        
        loop.run_until_complete(
            _update_job_status(job_id, JobStatusEnum.PROCESSING, progress=70)
        )
        
        # Upload to S3
        image_url = loop.run_until_complete(
            upload_image(image_buffer, user_id, f"{job_id}.png")
        )
        
        # Mark as completed
        loop.run_until_complete(
            _update_job_status(
                job_id,
                JobStatusEnum.COMPLETED,
                progress=100,
                result={"image_url": image_url}
            )
        )
        
        return {"image_url": image_url}
        
    except Exception as exc:
        loop.run_until_complete(
            _update_job_status(job_id, JobStatusEnum.FAILED, error_message=str(exc))
        )
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30)
        
        raise
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
    
    Args:
        job_id: The JobStatus UUID
        render_configs: List of render configurations
        user_id: User UUID
        profile_id: Brand profile UUID
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        loop.run_until_complete(
            _update_job_status(job_id, JobStatusEnum.PROCESSING, progress=5)
        )
        
        from app.services.template_renderer import batch_render
        
        results = []
        total = len(render_configs)
        
        for i, config in enumerate(render_configs):
            try:
                result = loop.run_until_complete(
                    batch_render(
                        config["template_id"],
                        config["data"],
                        config["aspect_ratio"],
                        user_id,
                        profile_id
                    )
                )
                results.append(result)
            except Exception as e:
                results.append({"error": str(e)})
            
            # Update progress
            progress = int(((i + 1) / total) * 95) + 5
            loop.run_until_complete(
                _update_job_status(job_id, JobStatusEnum.PROCESSING, progress=progress)
            )
        
        # Mark as completed
        loop.run_until_complete(
            _update_job_status(
                job_id,
                JobStatusEnum.COMPLETED,
                progress=100,
                result={"assets": results, "total": total}
            )
        )
        
        return results
        
    except Exception as exc:
        loop.run_until_complete(
            _update_job_status(job_id, JobStatusEnum.FAILED, error_message=str(exc))
        )
        raise
    finally:
        loop.close()
