"""Persona synthesizer Celery task - runs persona synthesis in background."""
import asyncio
import logging
from uuid import UUID

from app.core.celery_app import celery_app
from app.core.database import async_session_maker
from app.services.persona_synthesizer import PersonaSynthesizerService

logger = logging.getLogger(__name__)


async def _run_persona_synthesis(profile_id: str) -> dict:
    """Async implementation of persona synthesis."""
    profile_uuid = UUID(profile_id)

    async with async_session_maker() as db:
        try:
            synthesizer = PersonaSynthesizerService()
            persona_prompt = await synthesizer.synthesize_persona_prompt(db, profile_uuid)

            if persona_prompt:
                return {
                    "status": "success",
                    "profile_id": profile_id,
                    "prompt_length": len(persona_prompt),
                }
            else:
                return {
                    "status": "failed",
                    "profile_id": profile_id,
                    "error": "Synthesis returned empty result",
                }

        except Exception as e:
            logger.error(f"Persona synthesis failed for profile {profile_id}: {e}", exc_info=True)
            return {
                "status": "failed",
                "profile_id": profile_id,
                "error": str(e),
            }


async def _run_feedback_learning(profile_id: str) -> dict:
    """Async implementation of feedback-based persona learning."""
    profile_uuid = UUID(profile_id)

    async with async_session_maker() as db:
        try:
            synthesizer = PersonaSynthesizerService()
            learned_preferences = await synthesizer.learn_from_feedback(db, profile_uuid)

            if learned_preferences:
                return {
                    "status": "success",
                    "profile_id": profile_id,
                    "preferences_length": len(learned_preferences),
                }
            else:
                return {
                    "status": "skipped",
                    "profile_id": profile_id,
                    "reason": "Not enough feedback data or learning returned empty result",
                }

        except Exception as e:
            logger.error(f"Feedback learning failed for profile {profile_id}: {e}", exc_info=True)
            return {
                "status": "failed",
                "profile_id": profile_id,
                "error": str(e),
            }


@celery_app.task(name="app.tasks.persona_synthesizer.synthesize_persona_task")
def synthesize_persona_task(profile_id: str) -> dict:
    """Background task to synthesize persona prompt.

    Args:
        profile_id: UUID string of the profile to synthesize persona for

    Returns:
        Dict with status, profile_id, and either prompt_length or error
    """
    logger.info(f"Starting persona synthesis task for profile {profile_id}")
    return asyncio.run(_run_persona_synthesis(profile_id))


@celery_app.task(name="app.tasks.persona_synthesizer.synthesize_persona_with_feedback_task")
def synthesize_persona_with_feedback_task(profile_id: str) -> dict:
    """Background task to learn preferences from feedback and update persona.
    
    Triggered when a user reaches the feedback threshold (10 interactions).
    Uses hybrid approach: current summary + recent 20 raw interactions.

    Args:
        profile_id: UUID string of the profile

    Returns:
        Dict with status, profile_id, and either preferences_length or error
    """
    logger.info(f"Starting feedback learning task for profile {profile_id}")
    return asyncio.run(_run_feedback_learning(profile_id))

