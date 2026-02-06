"""LinkedIn post scraping and identity extraction tasks.

Scrapes a user's LinkedIn posts and extracts deep identity material:
stories, opinion statements, interest details, recurring tensions,
and signature perspectives. Also runs writing sample analysis for
voice/style patterns.
"""

import asyncio
import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.celery_app import celery_app
from app.core.database import celery_session_maker
from app.models.document import ExtractedDocument, SourceType
from app.models.identity import IdentityGraph, StyleProfile
from app.models.profile import Profile
from app.services.extraction_service import ExtractionService
from app.services.writing_sample_analyzer import WritingSampleAnalyzer
from app.services.timeline_service import TimelineService
from app.models.identity import TimelineEventType

logger = logging.getLogger(__name__)

MIN_POSTS_FOR_IDENTITY = 10


async def _scrape_and_extract_identity(profile_id: str, linkedin_url: str) -> dict:
    """Async implementation: scrape LinkedIn posts, extract identity + writing patterns."""
    async with celery_session_maker() as db:
        extraction = ExtractionService()
        analyzer = WritingSampleAnalyzer()
        timeline_service = TimelineService(db)

        try:
            profile_uuid = UUID(profile_id)

            # Load profile with identity graph and style profile
            result = await db.execute(
                select(Profile)
                .options(
                    selectinload(Profile.identity_graph),
                    selectinload(Profile.style_profile),
                )
                .where(Profile.id == profile_uuid)
            )
            profile = result.scalar_one_or_none()

            if not profile:
                logger.error(f"Profile {profile_id} not found")
                return {"status": "error", "message": "Profile not found"}

            # Step 1: Scrape LinkedIn posts
            logger.info(f"Scraping LinkedIn posts for profile {profile_id}: {linkedin_url}")
            try:
                posts = await extraction.extract_linkedin_posts(linkedin_url)
            except ValueError as e:
                logger.warning(f"LinkedIn post scraping failed for {profile_id}: {e}")
                return {
                    "status": "scrape_failed",
                    "profile_id": profile_id,
                    "error": str(e),
                    "posts_count": 0,
                }

            if not posts:
                logger.info(f"No posts found for LinkedIn profile: {linkedin_url}")
                return {
                    "status": "no_posts",
                    "profile_id": profile_id,
                    "posts_count": 0,
                }

            # Step 2: Store posts as ExtractedDocuments for future reference
            post_texts = []
            for post in posts:
                text = post.get("text", "")
                if not text or len(text.strip()) < 20:
                    continue
                post_texts.append(text)

                doc = ExtractedDocument(
                    profile_id=profile_uuid,
                    source_type=SourceType.USER_POST,
                    content=text,
                    metadata={
                        "source": "linkedin_scrape",
                        "date": post.get("date", ""),
                        "reactions": post.get("reactions", 0),
                        "comments": post.get("comments", 0),
                        "url": post.get("url", ""),
                    },
                )
                db.add(doc)

            await db.flush()
            logger.info(f"Stored {len(post_texts)} posts for profile {profile_id}")

            # Step 3: Run writing sample analysis (voice/style patterns)
            style_profile = profile.style_profile
            if not style_profile:
                style_profile = StyleProfile(profile_id=profile_uuid)
                db.add(style_profile)
                await db.flush()

            if len(post_texts) >= 3:
                logger.info(f"Running writing sample analysis on {len(post_texts)} posts")
                style_analysis = await analyzer.analyze_samples(post_texts)
                if style_analysis:
                    style_profile.writing_samples_count = len(post_texts)
                    style_profile.writing_sample_insights = style_analysis.get("summary", "")
                    style_profile.detected_patterns = style_analysis

            # Step 4: Run identity extraction (stories, opinions, interests)
            identity_graph = profile.identity_graph
            if not identity_graph:
                identity_graph = IdentityGraph(profile_id=profile_uuid)
                db.add(identity_graph)
                await db.flush()

            identity_result = None
            if len(post_texts) >= MIN_POSTS_FOR_IDENTITY:
                logger.info(f"Running identity extraction on {len(post_texts)} posts")
                identity_result = await analyzer.extract_identity_from_posts(post_texts)

                if identity_result:
                    # Merge extracted stories (append, don't replace existing)
                    existing_stories = identity_graph.stories or []
                    new_stories = identity_result.get("stories", [])
                    identity_graph.stories = existing_stories + new_stories

                    # [NEW] Populate Timeline from extracted stories
                    if new_stories:
                        # Ensure timeline exists
                        timeline = await timeline_service.get_or_create_timeline(identity_graph.id)
                        
                        for story in new_stories:
                            # Story format expected: {title, narrative, tags, emotional_core, source_post_excerpt}
                            # Map to TimelineEvent
                            await timeline_service.add_event(
                                timeline_id=timeline.id,
                                title=story.get("title", "Extracted Story"),
                                event_type=TimelineEventType.LIFE_EVENT,
                                description=story.get("narrative", ""),
                                tags=story.get("tags", []),
                            )
                        logger.info(f"Added {len(new_stories)} events to timeline for {profile_id}")

                    # Merge opinion statements
                    existing_opinions = identity_graph.opinion_statements or []
                    new_opinions = identity_result.get("opinion_statements", [])
                    identity_graph.opinion_statements = existing_opinions + new_opinions

                    # Merge interest details (update, don't replace)
                    existing_details = identity_graph.interest_details or {}
                    new_details = identity_result.get("interest_details", {})
                    existing_details.update(new_details)
                    identity_graph.interest_details = existing_details

            # Step 4b: Fallback career timeline extraction from profile data
            # If Timeline has no WORK/EDUCATION events, try to extract from onboarding_context
            timeline = await timeline_service.get_or_create_timeline(identity_graph.id)

            # Check if we already have career events
            has_career_events = any(
                e.event_type in (TimelineEventType.WORK, TimelineEventType.EDUCATION)
                for e in (timeline.events or [])
            )

            if not has_career_events:
                # Try to extract from onboarding_context (stored raw LinkedIn profile data)
                onboarding_ctx = identity_graph.onboarding_context or {}
                extracted_data = onboarding_ctx.get("extracted_data", {})

                # Check if there's profile data with experience/education
                if extracted_data and (extracted_data.get("experience") or extracted_data.get("education")):
                    logger.info(f"Extracting career timeline from profile data for {profile_id}")
                    try:
                        from app.llm.gemini import GeminiProvider
                        gemini = GeminiProvider()

                        career_result = await gemini.extract_career_timeline(extracted_data)

                        if career_result and career_result.get("events"):
                            from datetime import datetime

                            for event in career_result["events"]:
                                event_type = (
                                    TimelineEventType.EDUCATION if event.get("type") == "education"
                                    else TimelineEventType.WORK
                                )

                                # Parse dates
                                start_date = None
                                end_date = None
                                if event.get("start_date"):
                                    try:
                                        start_date = datetime.strptime(event["start_date"], "%Y-%m")
                                    except ValueError as e:
                                        logger.debug(f"Could not parse start_date '{event.get('start_date')}': {e}")
                                if event.get("end_date"):
                                    try:
                                        end_date = datetime.strptime(event["end_date"], "%Y-%m")
                                    except ValueError as e:
                                        logger.debug(f"Could not parse end_date '{event.get('end_date')}': {e}")

                                await timeline_service.add_event(
                                    timeline_id=timeline.id,
                                    title=event.get("title", ""),
                                    event_type=event_type,
                                    description=event.get("description", ""),
                                    start_date=start_date,
                                    end_date=end_date,
                                    is_current=event.get("is_current", False),
                                    emotional_core=event.get("emotional_core"),
                                    lessons_learned=event.get("key_achievements", []),
                                    tags=event.get("skills_used", []),
                                    source="linkedin_profile",
                                )

                            # Save narrative arc
                            if career_result.get("narrative_arc"):
                                timeline.narrative_arc = career_result["narrative_arc"]

                            logger.info(
                                f"Added {len(career_result['events'])} career events to timeline for {profile_id}"
                            )
                    except Exception as e:
                        logger.warning(f"Failed to extract career timeline for {profile_id}: {e}")

            await db.commit()

            # Step 5: Regenerate persona prompt with enriched identity
            from app.services.persona_synthesizer import PersonaSynthesizerService
            synthesizer = PersonaSynthesizerService()
            logger.info(f"Regenerating persona prompt for profile {profile_id} after identity extraction")
            await synthesizer.synthesize_persona_prompt(db, profile_uuid)

            stories_count = len(identity_result.get("stories", [])) if identity_result else 0
            opinions_count = len(identity_result.get("opinion_statements", [])) if identity_result else 0

            logger.info(
                f"Identity extraction complete for profile {profile_id}: "
                f"{len(post_texts)} posts, {stories_count} stories, {opinions_count} opinions"
            )

            return {
                "status": "success",
                "profile_id": profile_id,
                "posts_scraped": len(posts),
                "posts_analyzed": len(post_texts),
                "stories_extracted": stories_count,
                "opinions_extracted": opinions_count,
                "identity_extracted": identity_result is not None,
                "writing_analyzed": len(post_texts) >= 3,
            }

        except Exception as e:
            logger.error(
                f"Error in LinkedIn identity extraction for profile {profile_id}: {e}",
                exc_info=True,
            )
            return {"status": "error", "error": str(e)}


@celery_app.task(name="app.tasks.linkedin_identity_extraction.scrape_and_extract_identity_task")
def scrape_and_extract_identity_task(profile_id: str, linkedin_url: str) -> dict:
    """Scrape LinkedIn posts and extract deep identity material.

    This task:
    1. Scrapes 30-50 recent posts from the user's LinkedIn profile
    2. Stores posts as ExtractedDocuments
    3. Runs writing sample analysis for voice/style patterns
    4. Runs identity extraction for stories, opinions, interest details
    5. Merges extracted data into the identity graph
    6. Regenerates the persona prompt

    Args:
        profile_id: UUID string of the profile.
        linkedin_url: LinkedIn profile URL to scrape posts from.

    Returns:
        Dict with status and extraction results.
    """
    logger.info(f"Starting LinkedIn identity extraction for profile {profile_id}")
    return asyncio.run(_scrape_and_extract_identity(profile_id, linkedin_url))
