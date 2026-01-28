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
        "app.tasks.style_learner",
        "app.tasks.opportunity_scout",
        "app.tasks.draft_generator",
        "app.tasks.feedback_loop",
        "app.tasks.analytics_digest",
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
)

# Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    # Run opportunity scout every 4 hours
    "opportunity-scout-every-4h": {
        "task": "app.tasks.opportunity_scout.opportunity_scout_task",
        "schedule": crontab(hour="*/4"),
    },
    # Run draft generator daily at 6 AM UTC
    "draft-generator-daily-6am": {
        "task": "app.tasks.draft_generator.draft_generator_task",
        "schedule": crontab(hour=6, minute=0),
    },
    # Run feedback loop every 15 minutes
    "feedback-loop-every-15m": {
        "task": "app.tasks.feedback_loop.feedback_loop_task",
        "schedule": crontab(minute="*/15"),
    },
    # Run analytics digest weekly on Monday at 9 AM UTC
    "analytics-digest-weekly-monday": {
        "task": "app.tasks.analytics_digest.analytics_digest_task",
        "schedule": crontab(hour=9, minute=0, day_of_week=1),
    },
    # Run style learner daily at midnight for refresh
    "style-learner-daily-refresh": {
        "task": "app.tasks.style_learner.style_learner_task",
        "schedule": crontab(hour=0, minute=0),
    },
}
