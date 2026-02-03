"""Celery application configuration."""
from celery import Celery
from celery.schedules import crontab


from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "pixo",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.analytics_digest",
        "app.tasks.persona_synthesizer",
        "app.tasks.content_agency",
        "app.tasks.writing_sample_analyzer",
    ],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes max per task
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    broker_use_ssl={"ssl_cert_reqs": "none"} if settings.REDIS_URL.startswith("rediss://") else None,
    redis_backend_use_ssl={"ssl_cert_reqs": "none"} if settings.REDIS_URL.startswith("rediss://") else None,
    # Use PostgreSQL for Celery Beat schedule (instead of SQLite file)
    beat_scheduler="sqlalchemy_celery_beat.schedulers:DatabaseScheduler",
    beat_dburi=settings.DATABASE_URL.replace("+asyncpg", ""),  # Needs sync driver
)

# Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    # Run analytics digest weekly on Monday at 9 AM UTC
    "analytics-digest-weekly-monday": {
        "task": "app.tasks.analytics_digest.analytics_digest_task",
        "schedule": crontab(hour="9", minute="0", day_of_week="1"),
    },
    # Run content agency daily at 6 AM UTC
    "content-agency-daily": {
        "task": "app.tasks.content_agency.run_content_agency_task",
        "schedule": crontab(hour="6", minute="0"),
    },
    # Check and fill empty inboxes every 6 hours
    "check-empty-inboxes": {
        "task": "app.tasks.content_agency.check_and_fill_empty_inboxes_task",
        "schedule": crontab(hour="*/6", minute="0"),
    },
}


