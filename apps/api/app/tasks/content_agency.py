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
from sqlalchemy import select, func
from app.models.profile import Profile
from app.models.draft import Draft, DraftStatus

logger = logging.getLogger(__name__)


async def _check_and_fill_empty_inboxes() -> dict:
    """Check all active profiles and generate content for empty inboxes.
    
    Returns:
        Dict with summary of profiles checked and content generated
    """
    async with async_session_maker() as db:
        service = ContentAgencyService(db)
        
        # Get all active profiles
        result = await db.execute(
            select(Profile).where(Profile.is_active == True)
        )
        profiles = result.scalars().all()
        
        results = {
            "total_profiles": len(profiles),
            "empty_inboxes": 0,
            "content_generated": 0,
            "failed": 0,
        }
        
        for profile in profiles:
            try:
                # Check if inbox is empty
                inbox_count_result = await db.execute(
                    select(func.count(Draft.id))
                    .where(
                        Draft.profile_id == profile.id,
                        Draft.status == DraftStatus.INBOX,
                    )
                )
                inbox_count = inbox_count_result.scalar() or 0
                
                # If inbox is empty, generate content
                if inbox_count == 0:
                    results["empty_inboxes"] += 1
                    logger.info(f"Profile {profile.id} has empty inbox, generating content")
                    
                    drafts = await service.run_for_profile(
                        profile_id=profile.id,
                        max_drafts=3,
                    )
                    
                    if drafts:
                        results["content_generated"] += len(drafts)
                        logger.info(f"Generated {len(drafts)} drafts for profile {profile.id}")
                    else:
                        results["failed"] += 1
                        logger.warning(f"Failed to generate content for profile {profile.id}")
                        
            except Exception as e:
                logger.error(f"Error checking/filling inbox for profile {profile.id}: {e}", exc_info=True)
                results["failed"] += 1
        
        logger.info(f"Empty inbox check completed: {results}")
        return results


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
            # Run for all active profiles with inbox limit
            results = await service.run_for_all_active_profiles(
                max_drafts_per_profile=3,
                max_inbox_threshold=10,  # Skip if already have 10+ drafts
            )
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


@celery_app.task(
    name="app.tasks.content_agency.check_and_fill_empty_inboxes_task",
    bind=True,
    max_retries=2,
    default_retry_delay=300,  # 5 minutes
)
def check_and_fill_empty_inboxes_task(self) -> dict:
    """Background task to check for empty inboxes and generate content.
    
    This task runs periodically to ensure users always have content in their inbox.
    For each active profile with an empty inbox, it triggers the Content Agency
    to generate 3 new draft posts.
    
    Returns:
        Dict with summary: {
            "total_profiles": int,
            "empty_inboxes": int,
            "content_generated": int,
            "failed": int
        }
    """
    try:
        logger.info("Starting empty inbox check and fill task")
        return asyncio.run(_check_and_fill_empty_inboxes())
        
    except Exception as e:
        logger.error(f"Empty inbox check task failed: {e}", exc_info=True)
        raise self.retry(exc=e)
