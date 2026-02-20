"""Content Agency Service - Orchestrates multi-agent content creation.

This service coordinates the Content Agency workflow, handling:
- Loading profile context (persona, preferences, style)
- Extracting raw identity graph for facet sampling
- Running the LangGraph agency workflow
- Saving generated drafts to database with diversity metadata
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


def _identity_to_dict(identity) -> dict:
    """Convert an IdentityGraph model instance to a plain dict for facet sampling.

    Includes Timeline relationship data (narrative_arc, primary_focus,
    timeline_events) which lives in separate tables but is needed by
    the facet sampler and identity depth calculator.
    """
    if not identity:
        return {}
    data = {}
    for col in identity.__table__.columns:
        val = getattr(identity, col.name)
        if isinstance(val, UUID):
            val = str(val)
        elif isinstance(val, datetime):
            val = val.isoformat()
        data[col.name] = val

    # Include Timeline data if the relationship was loaded
    if hasattr(identity, "timeline") and identity.timeline:
        timeline = identity.timeline
        data["narrative_arc"] = timeline.narrative_arc
        data["primary_focus"] = timeline.primary_focus
        data["timeline_events"] = [
            {
                "title": e.title,
                "description": e.description,
                "event_type": e.event_type.value if e.event_type else None,
                "start_date": e.start_date.isoformat() if e.start_date else None,
                "end_date": e.end_date.isoformat() if e.end_date else None,
                "is_current": e.is_current,
                "emotional_core": e.emotional_core,
                "lessons_learned": e.lessons_learned or [],
                "tags": e.tags or [],
            }
            for e in (timeline.events or [])
        ]
    return data


class ContentAgencyService:
    """Service for running the Content Agency multi-agent workflow."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.agency = get_agency_graph()

    async def run_for_profile(
        self,
        profile_id: UUID,
        max_drafts: int = 3,
        skip_if_has_content: bool = False,
        max_inbox_threshold: int = 10,
        platform_intent: str = "generic",
    ) -> list[Draft]:
        """Run the Content Agency for a profile and create drafts.

        Args:
            profile_id: Profile UUID
            max_drafts: Maximum number of drafts to generate (default 3)
            skip_if_has_content: If True, skip generation if inbox already has drafts (default False)
            max_inbox_threshold: Skip generation if inbox has >= this many drafts (default 10)
            platform_intent: Target platform (linkedin, x, ig, newsletter, generic)

        Returns:
            List of created Draft objects
        """
        # Check current inbox count first
        from sqlalchemy import func
        inbox_count_result = await self.db.execute(
            select(func.count(Draft.id))
            .where(
                Draft.profile_id == profile_id,
                Draft.status == DraftStatus.INBOX,
            )
        )
        inbox_count = inbox_count_result.scalar() or 0

        # Skip if inbox already has enough content
        if inbox_count >= max_inbox_threshold:
            logger.info(f"Profile {profile_id} has {inbox_count} drafts in inbox (>= {max_inbox_threshold}), skipping generation")
            return []

        # Load profile with all related data (including timeline for facet sampling)
        from app.models.identity import IdentityGraph as IG, Timeline as TL
        result = await self.db.execute(
            select(Profile)
            .options(
                selectinload(Profile.identity_graph)
                    .selectinload(IG.timeline)
                    .selectinload(TL.events),
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

        # Extract raw identity graph dict for facet sampling
        identity_dict = _identity_to_dict(profile.identity_graph)
        
        # [NEW] Fetch Trending Signals
        from app.services.trending_service import TrendingSignalsService
        trending_signals = None
        try:
            # Extract personalization signals from identity/timeline
            industry = identity_dict.get("industry", "General")
            primary_focus = identity_dict.get("primary_focus", "")

            # Extract richer identity data for deeper news personalization
            expertise_areas = identity_dict.get("expertise_areas", [])
            interests = identity_dict.get("interests", [])
            content_pillars = identity_dict.get("content_pillars", [])

            # Fetch signals with full identity context
            trending_service = TrendingSignalsService()
            trending_signals = await trending_service.get_trending_signals(
                industry=industry,
                primary_focus=primary_focus,
                expertise_areas=expertise_areas,
                interests=interests,
                content_pillars=content_pillars,
            )
            logger.info(f"Injected trending signals for profile {profile_id}")
        except Exception as e:
            logger.warning(f"Failed to inject trending signals: {e}")
            trending_signals = "No trending signals available this time."

        # Get existing topics to avoid duplicates (last 30 days)
        existing_topics = []
        historical_uniqueness = {
            "used_hook_styles": [],
            "used_format_archetypes": [],
            "used_cta_styles": [],
            "used_content_modes": [],
            "used_authority_postures": [],
            "used_emotional_tones": [],
            "used_topic_domains": [],
            "used_identity_categories": [],
            "used_length_categories": [],
        }
        if profile.drafts:
            for draft in profile.drafts:
                if draft.topic:
                    existing_topics.append(draft.topic)
                # Collect style metadata for cross-session uniqueness
                if draft.hook_style:
                    historical_uniqueness["used_hook_styles"].append(draft.hook_style)
                if draft.format_archetype:
                    historical_uniqueness["used_format_archetypes"].append(draft.format_archetype)
                if draft.cta_style:
                    historical_uniqueness["used_cta_styles"].append(draft.cta_style)
                # Collect diversity metadata
                if draft.content_mode:
                    historical_uniqueness["used_content_modes"].append(draft.content_mode)
                if draft.authority_posture:
                    historical_uniqueness["used_authority_postures"].append(draft.authority_posture)
                if draft.emotional_tone:
                    historical_uniqueness["used_emotional_tones"].append(draft.emotional_tone)
                if draft.topic_domain:
                    historical_uniqueness["used_topic_domains"].append(draft.topic_domain)
                if draft.identity_facets_used:
                    for cat in draft.identity_facets_used.get("primary_facets", {}).keys():
                        historical_uniqueness["used_identity_categories"].append(cat)
                # Classify historical draft lengths for cross-session length diversity
                if hasattr(draft, 'body') and draft.body:
                    wc = len(draft.body.split())
                    if wc <= 50:
                        historical_uniqueness["used_length_categories"].append("very_short")
                    elif wc <= 120:
                        historical_uniqueness["used_length_categories"].append("short")
                    elif wc <= 300:
                        historical_uniqueness["used_length_categories"].append("medium")
                    else:
                        historical_uniqueness["used_length_categories"].append("long")

        existing_topics = existing_topics[-20:]  # Keep recent 20
        # Keep recent 30 of each style for diversity without over-constraining.
        # The Strategist prompt splits these into HARD avoid (recent 5) and
        # SOFT avoid (older 6-30), so a longer window doesn't over-constrain.
        for key in historical_uniqueness:
            historical_uniqueness[key] = historical_uniqueness[key][-30:]

        # Get style data
        style = profile.style_profile
        tone_sliders = style.tone_sliders if style else {}
        preferred_hooks = style.preferred_hooks if style else []
        taboo_list = style.taboo_list if style else []
        writing_sample_insights = style.writing_sample_insights if style else None

        # Get location
        location = profile.location

        logger.info(f"Running Content Agency for profile {profile_id} (platform: {platform_intent}, location: {location})")

        # Fetch a template for content structure guidance
        template_content = None
        template_meta = None
        try:
            from app.models.template import Template, ContributionStatus
            from sqlalchemy import or_

            # Query for active templates accessible to this user
            tmpl_query = select(Template).where(
                Template.is_active == True,
                or_(
                    Template.is_system == True,
                    Template.created_by == profile.user_id,
                    Template.contribution_status == ContributionStatus.APPROVED,
                ),
            )

            # Filter by platform if specific
            if platform_intent and platform_intent != "generic":
                platform_map = {"linkedin": "linkedin", "x": "twitter", "twitter": "twitter"}
                mapped = platform_map.get(platform_intent)
                if mapped:
                    tmpl_query = tmpl_query.where(
                        or_(Template.platform == mapped, Template.platform == "both")
                    )

            # Get a random template to add variety
            from sqlalchemy.sql.expression import func as sql_func
            tmpl_query = tmpl_query.order_by(sql_func.random()).limit(1)
            tmpl_result = await self.db.execute(tmpl_query)
            selected_template = tmpl_result.scalar_one_or_none()

            if selected_template:
                template_content = selected_template.content
                template_meta = {
                    "category": selected_template.category.value if selected_template.category else None,
                    "length_flexibility": selected_template.length_flexibility or "flexible",
                    "min_length": selected_template.min_length,
                    "max_length": selected_template.max_length,
                }
                logger.info(
                    f"Selected template '{selected_template.name}' "
                    f"(category: {template_meta['category']}) for profile {profile_id}"
                )
        except Exception as e:
            logger.warning(f"Failed to fetch template for profile {profile_id}: {e}")

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
                template=template_content,
                template_meta=template_meta,
                platform_intent=platform_intent,
                historical_uniqueness=historical_uniqueness,
                writing_sample_insights=writing_sample_insights,
                location=location,
                identity_facets=identity_dict,
                trending_signals=trending_signals,
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
                    # Style metadata for cross-session uniqueness
                    hook_style=data.get("hook_style"),
                    format_archetype=data.get("format_archetype"),
                    cta_style=data.get("cta_style"),
                    hashtags=data.get("hashtags", []),
                    # Diversity metadata
                    content_mode=data.get("content_mode"),
                    authority_posture=data.get("authority_posture"),
                    emotional_tone=data.get("emotional_tone"),
                    identity_facets_used=data.get("identity_facets_used"),
                    topic_domain=data.get("topic_domain"),
                    # News metadata
                    is_news_driven=data.get("is_news_driven", False),
                    news_source=data.get("news_source"),
                )
                self.db.add(draft)
                created_drafts.append(draft)
                logger.info(
                    f"Created draft: {draft.topic[:50] if draft.topic else 'Untitled'} "
                    f"(mode: {draft.content_mode}, posture: {draft.authority_posture}, "
                    f"tone: {draft.emotional_tone}, domain: {draft.topic_domain})"
                )
            except Exception as e:
                logger.error(f"Failed to create draft: {e}")

        await self.db.commit()

        # Refresh all drafts to get IDs
        for draft in created_drafts:
            await self.db.refresh(draft)

        logger.info(f"Content Agency completed: {len(created_drafts)} drafts saved for profile {profile_id}")
        return created_drafts

    async def run_for_all_active_profiles(
        self,
        max_drafts_per_profile: int = 3,
        max_inbox_threshold: int = 10,
    ) -> dict:
        """Run the Content Agency for all active profiles.

        Args:
            max_drafts_per_profile: Max drafts to generate per profile
            max_inbox_threshold: Skip profiles with >= this many drafts in inbox (default 10)

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
            "skipped": 0,
            "failed": 0,
            "total_drafts": 0,
        }

        for profile in profiles:
            try:
                drafts = await self.run_for_profile(
                    profile_id=profile.id,
                    max_drafts=max_drafts_per_profile,
                    max_inbox_threshold=max_inbox_threshold,
                )
                if drafts:
                    results["successful"] += 1
                    results["total_drafts"] += len(drafts)
                else:
                    # Could be skipped or failed, but no error thrown
                    results["skipped"] += 1
            except Exception as e:
                logger.error(f"Failed to run agency for profile {profile.id}: {e}")
                results["failed"] += 1

        logger.info(f"Content Agency batch completed: {results}")
        return results
