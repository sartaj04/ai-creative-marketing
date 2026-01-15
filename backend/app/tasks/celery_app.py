"""
Celery application configuration.
"""
from celery import Celery

from app.config import settings


def get_redis_url_with_ssl(url: str) -> str:
    """Add SSL parameters for rediss:// URLs (Upstash requires this)."""
    if url.startswith("rediss://"):
        # Add ssl_cert_reqs parameter for TLS connections
        separator = "&" if "?" in url else "?"
        return f"{url}{separator}ssl_cert_reqs=CERT_NONE"
    return url


# Create Celery app with SSL-enabled Redis URLs
broker_url = get_redis_url_with_ssl(settings.redis_url)
backend_url = get_redis_url_with_ssl(settings.redis_url)

celery_app = Celery(
    "pixo",
    broker=broker_url,
    backend=backend_url,
    include=[
        "app.tasks.scraping_tasks",
        "app.tasks.generation_tasks",
        "app.tasks.rendering_tasks",
    ]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,  # Soft limit at 4 minutes
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    result_expires=3600,  # Results expire after 1 hour
)

# Celery beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    "reset-monthly-usage": {
        "task": "app.tasks.user_tasks.reset_monthly_usage",
        "schedule": 86400.0,  # Daily check
    },
}
