"""Persona prompt synthesizer tasks."""

import asyncio
import logging
from uuid import UUID

from app.core.celery_app import celery_app
from app.core.database import celery_session_maker
from app.services.persona_synthesizer import PersonaSynthesizerService

logger = logging.getLogger(__name__)


async def _synthesize_persona(profile_id: str) -> dict:
    """Async implementation of persona prompt synthesis."""
    # Use NullPool session for Celery to avoid event loop issues
    async with celery_session_maker() as db:
        synthesizer = PersonaSynthesizerService()
        
        try:
            persona_prompt = await synthesizer.synthesize_persona_prompt(
                db, UUID(profile_id)
            )
            
            if persona_prompt:
                logger.info(f"Successfully synthesized persona prompt for profile {profile_id} ({len(persona_prompt)} chars)")
                return {
                    "status": "success",
                    "profile_id": profile_id,
                    "prompt_length": len(persona_prompt)
                }
            else:
                logger.warning(f"Failed to synthesize persona prompt for profile {profile_id}")
                return {
                    "status": "failed",
                    "profile_id": profile_id,
                    "reason": "Unknown"
                }
                
        except Exception as e:
            logger.error(f"Error synthesizing persona for profile {profile_id}: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}


async def _synthesize_persona_with_feedback(profile_id: str) -> dict:
    """Async implementation of persona refinement with feedback."""
    # Use NullPool session for Celery to avoid event loop issues
    async with celery_session_maker() as db:
        synthesizer = PersonaSynthesizerService()
        
        try:
            new_preferences = await synthesizer.learn_from_feedback(
                db, UUID(profile_id)
            )
            
            if new_preferences:
                logger.info(f"Successfully refined persona preferences for profile {profile_id}")
                return {
                    "status": "success",
                    "profile_id": profile_id,
                    "preferences_length": len(new_preferences)
                }
            else:
                logger.warning(f"Failed to refine persona for profile {profile_id}")
                return {
                    "status": "failed",
                    "profile_id": profile_id,
                    "reason": "Not enough data or learning failed"
                }

        except Exception as e:
            logger.error(f"Error refining persona for profile {profile_id}: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}


@celery_app.task(name="app.tasks.persona_synthesizer.synthesize_persona_task")
def synthesize_persona_task(profile_id: str) -> dict:
    """Generate the initial system prompt (persona) from scraped data.
    
    Args:
        profile_id: The UUID string of the profile
        
    Returns:
        Dict with status and result details
    """
    logger.info(f"Starting persona synthesis for profile {profile_id}")
    return asyncio.run(_synthesize_persona(profile_id))


@celery_app.task(name="app.tasks.persona_synthesizer.synthesize_persona_with_feedback_task")
def synthesize_persona_with_feedback_task(profile_id: str) -> dict:
    """Refine user preferences based on feedback.
    
    Args:
        profile_id: The UUID string of the profile
        
    Returns:
        Dict with status and result details
    """
    logger.info(f"Starting persona refinement for profile {profile_id}")
    return asyncio.run(_synthesize_persona_with_feedback(profile_id))
