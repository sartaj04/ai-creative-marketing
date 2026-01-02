"""
BrandScale AI - Celery Configuration
Background task processing with Redis broker.
"""
from celery import Celery

from app.config import settings


# Create Celery app
celery_app = Celery(
    "brandscale",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.tasks"],
)

# Configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task execution
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_time_limit=1800,  # 30 minutes max
    task_soft_time_limit=1500,  # 25 minutes soft limit
    
    # Retry settings
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    
    # Worker settings
    worker_prefetch_multiplier=1,  # Disable prefetching for fair distribution
    worker_concurrency=4,
    worker_max_tasks_per_child=100,  # Restart worker after 100 tasks
    
    # Result backend
    result_expires=3600,  # 1 hour
    result_extended=True,
    
    # Task routing
    task_routes={
        "app.workers.tasks.scrape_job": {"queue": "scraping"},
        "app.workers.tasks.generate_job": {"queue": "generation"},
        "app.workers.tasks.render_job": {"queue": "rendering"},
    },
    
    # Default queue
    task_default_queue="default",
    
    # Rate limiting
    task_annotations={
        "app.workers.tasks.generate_job": {
            "rate_limit": "10/m",  # Max 10 per minute for OpenAI
        },
    },
    
    # Beat scheduler (optional, for scheduled tasks)
    beat_schedule={},
)


# Task state tracking
class TaskStatus:
    """Task status constants."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


def get_task_status(task_id: str) -> dict:
    """
    Get the status of a Celery task.
    
    Args:
        task_id: Celery task ID
    
    Returns:
        Dict with status, progress, result, and error
    """
    from celery.result import AsyncResult
    
    result = AsyncResult(task_id, app=celery_app)
    
    response = {
        "job_id": task_id,
        "status": TaskStatus.PENDING,
        "progress": 0,
        "message": None,
        "result": None,
        "error": None,
    }
    
    if result.state == "PENDING":
        response["status"] = TaskStatus.PENDING
        response["message"] = "Task is queued"
    elif result.state == "STARTED" or result.state == "PROGRESS":
        response["status"] = TaskStatus.PROCESSING
        if result.info:
            response["progress"] = result.info.get("progress", 0)
            response["message"] = result.info.get("message", "Processing...")
    elif result.state == "SUCCESS":
        response["status"] = TaskStatus.COMPLETED
        response["progress"] = 100
        response["result"] = result.result
        response["message"] = "Completed successfully"
    elif result.state == "FAILURE":
        response["status"] = TaskStatus.FAILED
        response["error"] = str(result.result) if result.result else "Unknown error"
        response["message"] = "Task failed"
    elif result.state == "REVOKED":
        response["status"] = TaskStatus.FAILED
        response["error"] = "Task was cancelled"
        response["message"] = "Cancelled"
    
    return response
