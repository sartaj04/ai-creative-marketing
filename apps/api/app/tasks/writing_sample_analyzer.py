"""Writing sample analyzer tasks."""

import asyncio
import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.celery_app import celery_app
from app.core.database import celery_session_maker
from app.models.document import ExtractedDocument, SourceType
from app.models.identity import StyleProfile
from app.models.profile import Profile
from app.services.writing_sample_analyzer import WritingSampleAnalyzer

logger = logging.getLogger(__name__)


async def _analyze_writing_samples(profile_id: str) -> dict:
    """Async implementation of writing sample analysis."""
    # Use NullPool session for Celery to avoid event loop issues
    async with celery_session_maker() as db:
        analyzer = WritingSampleAnalyzer()
        
        try:
            profile_uuid = UUID(profile_id)
            
            # Verify profile exists and load style profile
            result = await db.execute(
                select(Profile)
                .options(selectinload(Profile.style_profile))
                .where(Profile.id == profile_uuid)
            )
            profile = result.scalar_one_or_none()
            
            if not profile:
                logger.error(f"Profile {profile_id} not found")
                return {"status": "error", "message": "Profile not found"}
                
            # Fetch writing samples
            result = await db.execute(
                select(ExtractedDocument)
                .where(
                    ExtractedDocument.profile_id == profile_uuid,
                    ExtractedDocument.source_type == SourceType.USER_POST,
                )
            )
            samples = result.scalars().all()
            
            if not samples:
                logger.info(f"No writing samples found for profile {profile_id}")
                return {
                    "status": "skipped",
                    "profile_id": profile_id,
                    "reason": "No writing samples found"
                }

            sample_texts = [s.content for s in samples]
            
            # Analyze
            logger.info(f"Analyzing {len(sample_texts)} writing samples for profile {profile_id}")
            analysis = await analyzer.analyze_samples(sample_texts)
            
            if not analysis:
                logger.warning(f"Analysis returned empty result for profile {profile_id}")
                return {
                    "status": "failed",
                    "profile_id": profile_id,
                    "reason": "Analysis failed"
                }
            
            # Update/Create StyleProfile
            style_profile = profile.style_profile
            if not style_profile:
                style_profile = StyleProfile(profile_id=profile_uuid)
                db.add(style_profile)
            
            style_profile.writing_samples_count = len(sample_texts)
            style_profile.writing_sample_insights = analysis.get("summary", "")
            style_profile.detected_patterns = analysis
            
            await db.commit()
            
            logger.info(f"Successfully analyzed writing samples for profile {profile_id}")
            return {
                "status": "success",
                "profile_id": profile_id,
                "analysis_id": str(style_profile.id),
                "samples_count": len(sample_texts)
            }
                
        except Exception as e:
            logger.error(f"Error analyzing writing samples for profile {profile_id}: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}


@celery_app.task(name="app.tasks.writing_sample_analyzer.analyze_writing_samples_task")
def analyze_writing_samples_task(profile_id: str) -> dict:
    """Analyze uploaded writing samples to extract style.
    
    Args:
        profile_id: The UUID string of the profile
        
    Returns:
        Dict with status and result details
    """
    logger.info(f"Starting writing sample analysis for profile {profile_id}")
    return asyncio.run(_analyze_writing_samples(profile_id))
