"""Content Agency Celery task - runs autonomous content creation in background.

This task triggers the Content Agency multi-agent workflow to automatically
discover opportunities and create LinkedIn post drafts for each profile.
"""

import asyncio
import logging
from typing import Optional

from app.core.celery_app import celery_app
from app.core.database import async_session_maker
from app.services.content_agency_service import ContentAgencyService

logger = logging.getLogger(__name__)


async def _run_content_agency(profile_id: Optional[str] = None) -> dict:
    """Async implementation of content agency task.
    
    Args:
        profile_id: Optional specific profile ID. If None, runs for all active profiles.
        
    Returns:
        Dict with results summary
    """
    async with async_session_maker() as db:
        service = ContentAgencyService(db)
        
        if profile_id:
            # Run for specific profile
            from uuid import UUID
            drafts = await service.run_for_profile(UUID(profile_id), max_drafts=3)
            return {
                "status": "success" if drafts else "no_drafts",
                "profile_id": profile_id,
                "drafts_created": len(drafts),
            }
        else:
            # Run for all active profiles
            results = await service.run_for_all_active_profiles(max_drafts_per_profile=3)
            return {
                "status": "success",
                **results,
            }


@celery_app.task(
    name="app.tasks.content_agency.run_content_agency_task",
    bind=True,
    max_retries=2,
    default_retry_delay=300,  # 5 minutes
)
def run_content_agency_task(self, profile_id: Optional[str] = None) -> dict:
    """Background task to run the Content Agency.
    
    The Content Agency is a multi-agent system that autonomously:
    1. Discovers content opportunities (Scout Agent)
    2. Selects best topics and creates briefs (Strategist Agent)
    3. Writes initial drafts (Writer Agent)
    4. Refines and polishes content (Editor Agent)
    5. Validates brand voice and quality (QA Agent)
    
    Args:
        profile_id: Optional profile ID string. If None, runs for all active profiles.
        
    Returns:
        Dict with summary of results:
        - For single profile: {"status", "profile_id", "drafts_created"}
        - For all profiles: {"status", "total_profiles", "successful", "failed", "total_drafts"}
    """
    try:
        if profile_id:
            logger.info(f"Starting Content Agency for profile {profile_id}")
        else:
            logger.info("Starting Content Agency for all active profiles")
        
        return asyncio.run(_run_content_agency(profile_id))
        
    except Exception as e:
        logger.error(f"Content Agency task failed: {e}", exc_info=True)
        
        # Retry on failure
        raise self.retry(exc=e)
