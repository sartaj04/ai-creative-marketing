"""Style learner task - extracts style from profile sources."""
import asyncio
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.celery_app import celery_app
from app.core.database import async_session_maker
from app.llm.provider import get_complex_provider
from app.models.agent import AgentRun
from app.models.document import ExtractedDocument, SourceType
from app.models.draft import AgentType
from app.models.identity import IdentityGraph, StyleProfile
from app.models.profile import Profile


STYLE_ANALYSIS_PROMPT = """Analyze the following content from a person's online presence and extract their personal brand identity.

Content:
{content}

Extract the following in JSON format:
{{
    "themes": ["list of 3-5 main topics/themes they discuss"],
    "expertise_keywords": ["list of 5-10 areas of expertise"],
    "tone_markers": {{
        "professional": 0.0-1.0,
        "casual": 0.0-1.0,
        "technical": 0.0-1.0,
        "storytelling": 0.0-1.0
    }},
    "audience_notes": {{
        "primary": "description of primary audience",
        "secondary": "description of secondary audience"
    }},
    "authority_angles": ["list of credibility markers, achievements, unique experiences"],
    "narrative_themes": ["list of recurring story patterns or themes"]
}}

Be specific and extract actual themes and keywords from the content.
"""


async def _run_style_learner(profile_id: str) -> dict:
    """Async implementation of style learner."""
    profile_uuid = UUID(profile_id)

    async with async_session_maker() as db:
        # Get profile with sources
        result = await db.execute(
            select(Profile)
            .options(
                selectinload(Profile.sources),
                selectinload(Profile.identity_graph),
                selectinload(Profile.style_profile),
            )
            .where(Profile.id == profile_uuid)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            return {"error": "Profile not found"}

        # Create agent run
        agent_run = AgentRun(
            profile_id=profile_uuid,
            agent_type=AgentType.STYLE_LEARNER,
            status="running",
        )
        db.add(agent_run)
        await db.flush()

        try:
            # Gather content from sources
            content_parts = []

            if profile.sources:
                if profile.sources.manual_text:
                    content_parts.append(f"Manual Description:\n{profile.sources.manual_text}")

                if profile.sources.linkedin_url:
                    # In production, would scrape LinkedIn
                    content_parts.append(f"LinkedIn Profile: {profile.sources.linkedin_url}")

                if profile.sources.website_url:
                    # In production, would scrape website
                    content_parts.append(f"Website: {profile.sources.website_url}")

            if not content_parts:
                agent_run.status = "completed"
                agent_run.completed_at = datetime.now(timezone.utc)
                agent_run.result_summary = "No sources to analyze"
                await db.commit()
                return {"message": "No sources to analyze"}

            combined_content = "\n\n".join(content_parts)

            # Store extracted document
            doc = ExtractedDocument(
                profile_id=profile_uuid,
                source_type=SourceType.MANUAL,
                content=combined_content,
                metadata_json={"sources": len(content_parts)},
            )
            db.add(doc)

            # Call LLM for analysis (use Claude for complex analysis)
            llm = get_complex_provider()
            prompt = STYLE_ANALYSIS_PROMPT.format(content=combined_content[:4000])

            analysis = await llm.generate_json(
                prompt=prompt,
                system_prompt="You are a personal branding expert analyzing someone's online presence.",
            )

            # Update identity graph
            if not profile.identity_graph:
                profile.identity_graph = IdentityGraph(profile_id=profile_uuid)
                db.add(profile.identity_graph)

            profile.identity_graph.themes = analysis.get("themes", [])
            profile.identity_graph.expertise_keywords = analysis.get("expertise_keywords", [])
            profile.identity_graph.tone_markers = analysis.get("tone_markers", {})
            profile.identity_graph.audience_notes = analysis.get("audience_notes", {})
            profile.identity_graph.authority_angles = analysis.get("authority_angles", [])
            profile.identity_graph.narrative_themes = analysis.get("narrative_themes", [])
            profile.identity_graph.version += 1

            # Initialize style profile based on analysis
            if not profile.style_profile:
                profile.style_profile = StyleProfile(profile_id=profile_uuid)
                db.add(profile.style_profile)

            # Map tone markers to style sliders
            tone = analysis.get("tone_markers", {})
            profile.style_profile.tone_sliders = {
                "formal_casual": 1 - tone.get("professional", 0.5),
                "technical_simple": tone.get("technical", 0.5),
                "serious_playful": tone.get("storytelling", 0.5),
                "humble_confident": 0.5,
            }

            # Update agent run
            agent_run.status = "completed"
            agent_run.completed_at = datetime.now(timezone.utc)
            agent_run.items_processed = len(content_parts)
            agent_run.result_summary = f"Analyzed {len(content_parts)} sources, extracted {len(analysis.get('themes', []))} themes"

            # Update last synced
            if profile.sources:
                profile.sources.last_synced_at = datetime.now(timezone.utc)

            await db.commit()

            return {
                "message": "Style analysis completed",
                "themes": analysis.get("themes", []),
                "expertise": analysis.get("expertise_keywords", []),
            }

        except Exception as e:
            agent_run.status = "failed"
            agent_run.completed_at = datetime.now(timezone.utc)
            agent_run.error_message = str(e)
            await db.commit()
            raise


@celery_app.task(name="app.tasks.style_learner.style_learner_task")
def style_learner_task(profile_id: str = None) -> dict:
    """Style learner Celery task.

    Args:
        profile_id: Specific profile to analyze, or None for all active profiles
    """
    if profile_id:
        return asyncio.run(_run_style_learner(profile_id))
    else:
        # Batch mode for daily refresh - would iterate all active profiles
        return {"message": "Batch style learning not implemented yet"}
