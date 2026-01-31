"""Content Agency Service - Orchestrates multi-agent content creation.

This service coordinates the Content Agency workflow, handling:
- Loading profile context (persona, preferences, style)
- Running the LangGraph agency workflow
- Saving generated drafts to database
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.draft import AgentType, Draft, DraftFormat, DraftStatus
from app.models.profile import Profile
from app.services.agency_graph import ContentAgencyGraph

logger = logging.getLogger(__name__)

# Singleton instance
_agency_graph: Optional[ContentAgencyGraph] = None


def get_agency_graph() -> ContentAgencyGraph:
    """Get or create the agency graph singleton."""
    global _agency_graph
    if _agency_graph is None:
        _agency_graph = ContentAgencyGraph()
    return _agency_graph


class ContentAgencyService:
    """Service for running the Content Agency multi-agent workflow."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.agency = get_agency_graph()
    
    async def run_for_profile(
        self,
        profile_id: UUID,
        max_drafts: int = 3,
    ) -> list[Draft]:
        """Run the Content Agency for a profile and create drafts.
        
        Args:
            profile_id: Profile UUID
            max_drafts: Maximum number of drafts to generate (default 3)
            
        Returns:
            List of created Draft objects
        """
        # Load profile with all related data
        result = await self.db.execute(
            select(Profile)
            .options(
                selectinload(Profile.identity_graph),
                selectinload(Profile.style_profile),
                selectinload(Profile.drafts),
            )
            .where(Profile.id == profile_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            logger.error(f"Profile not found: {profile_id}")
            return []
        
        # If no persona_prompt, trigger synthesis first
        if not profile.persona_prompt:
            logger.info(f"Profile {profile_id} has no persona_prompt, triggering synthesis")
            from app.services.persona_synthesizer import PersonaSynthesizerService
            
            try:
                synthesizer = PersonaSynthesizerService()
                persona_prompt = await synthesizer.synthesize_persona_prompt(self.db, profile_id)
                
                if not persona_prompt:
                    logger.error(f"Failed to synthesize persona for profile {profile_id}")
                    return []
                
                # Refresh profile to get the updated persona_prompt
                await self.db.refresh(profile)
                logger.info(f"Successfully synthesized persona for profile {profile_id}")
                
            except Exception as e:
                logger.error(f"Persona synthesis failed for profile {profile_id}: {e}", exc_info=True)
                return []
        
        # Gather context
        persona_prompt = profile.persona_prompt
        learned_preferences = profile.learned_preferences or "No preferences learned yet."
        
        # Get existing topics to avoid duplicates (last 30 days)
        existing_topics = []
        if profile.drafts:
            for draft in profile.drafts:
                if draft.topic:
                    existing_topics.append(draft.topic)
        existing_topics = existing_topics[-20:]  # Keep recent 20
        
        # Get style data
        style = profile.style_profile
        tone_sliders = style.tone_sliders if style else {}
        preferred_hooks = style.preferred_hooks if style else []
        taboo_list = style.taboo_list if style else []
        
        logger.info(f"Running Content Agency for profile {profile_id}")
        
        # Run the agency workflow
        try:
            draft_data = await self.agency.run(
                profile_id=profile_id,
                persona_prompt=persona_prompt,
                learned_preferences=learned_preferences,
                existing_topics=existing_topics,
                taboo_list=taboo_list,
                tone_sliders=tone_sliders,
                preferred_hooks=preferred_hooks,
            )
        except Exception as e:
            logger.error(f"Agency workflow failed: {e}", exc_info=True)
            return []
        
        if not draft_data:
            logger.warning(f"No drafts generated for profile {profile_id}")
            return []
        
        # Create Draft objects and save to database
        created_drafts = []
        for data in draft_data[:max_drafts]:
            try:
                draft = Draft(
                    profile_id=profile_id,
                    status=DraftStatus.INBOX,
                    format=DraftFormat.POST,
                    hook=data.get("hook", ""),
                    body=data.get("body", ""),
                    topic=data.get("topic", "Generated Content"),
                    confidence=data.get("qa_score", 0.7),
                    sources_json=[],
                    generated_by=AgentType.CONTENT_AGENCY,
                )
                self.db.add(draft)
                created_drafts.append(draft)
                logger.info(f"Created draft: {draft.topic[:50] if draft.topic else 'Untitled'}")
            except Exception as e:
                logger.error(f"Failed to create draft: {e}")
        
        await self.db.commit()
        
        # Refresh all drafts to get IDs
        for draft in created_drafts:
            await self.db.refresh(draft)
        
        logger.info(f"Content Agency completed: {len(created_drafts)} drafts saved for profile {profile_id}")
        return created_drafts
    
    async def run_for_all_active_profiles(self, max_drafts_per_profile: int = 3) -> dict:
        """Run the Content Agency for all active profiles.
        
        Args:
            max_drafts_per_profile: Max drafts to generate per profile
            
        Returns:
            Dict with summary of results
        """
        # Get all active profiles with persona prompts
        result = await self.db.execute(
            select(Profile)
            .where(
                Profile.is_active == True,
                Profile.persona_prompt.isnot(None),
            )
        )
        profiles = result.scalars().all()
        
        logger.info(f"Running Content Agency for {len(profiles)} active profiles")
        
        results = {
            "total_profiles": len(profiles),
            "successful": 0,
            "failed": 0,
            "total_drafts": 0,
        }
        
        for profile in profiles:
            try:
                drafts = await self.run_for_profile(
                    profile_id=profile.id,
                    max_drafts=max_drafts_per_profile,
                )
                if drafts:
                    results["successful"] += 1
                    results["total_drafts"] += len(drafts)
                else:
                    results["failed"] += 1
            except Exception as e:
                logger.error(f"Failed to run agency for profile {profile.id}: {e}")
                results["failed"] += 1
        
        logger.info(f"Content Agency batch completed: {results}")
        return results
