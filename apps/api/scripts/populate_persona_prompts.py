#!/usr/bin/env python3
"""One-time migration script to pre-populate persona prompts for existing profiles.

Usage:
    cd apps/api
    python scripts/populate_persona_prompts.py

This script will:
1. Find all profiles without a persona_prompt
2. Generate a persona prompt for each using the PersonaSynthesizerService
3. Update the profile with the synthesized prompt
"""
import asyncio
import logging
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, func

from app.core.database import async_session_maker
from app.models.profile import Profile
from app.services.persona_synthesizer import PersonaSynthesizerService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def populate_all_personas():
    """Iterate through all profiles and generate persona prompts."""
    synthesizer = PersonaSynthesizerService()
    
    async with async_session_maker() as db:
        # Count profiles without persona prompts
        count_result = await db.execute(
            select(func.count(Profile.id)).where(Profile.persona_prompt.is_(None))
        )
        total_count = count_result.scalar_one()
        
        if total_count == 0:
            logger.info("All profiles already have persona prompts. Nothing to do.")
            return
        
        logger.info(f"Found {total_count} profiles without persona prompts. Starting migration...")
        
        # Get profiles without persona prompts
        result = await db.execute(
            select(Profile).where(Profile.persona_prompt.is_(None))
        )
        profiles = result.scalars().all()
        
        success_count = 0
        error_count = 0
        
        for i, profile in enumerate(profiles, 1):
            try:
                logger.info(f"[{i}/{total_count}] Processing profile {profile.id} ({profile.name})...")
                
                # Synthesize persona prompt
                persona_prompt = await synthesizer.synthesize_persona_prompt(db, profile.id)
                
                if persona_prompt:
                    success_count += 1
                    logger.info(f"  ✓ Successfully synthesized ({len(persona_prompt)} chars)")
                else:
                    error_count += 1
                    logger.warning(f"  ✗ Synthesis returned empty result (may be missing identity graph)")
                    
            except Exception as e:
                error_count += 1
                logger.error(f"  ✗ Error processing profile {profile.id}: {e}")
        
        logger.info(f"\n{'='*50}")
        logger.info(f"Migration complete!")
        logger.info(f"  Success: {success_count}")
        logger.info(f"  Errors:  {error_count}")
        logger.info(f"  Total:   {total_count}")


if __name__ == "__main__":
    logger.info("Starting persona prompt migration...")
    asyncio.run(populate_all_personas())
    logger.info("Done.")
