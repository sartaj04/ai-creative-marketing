"""Draft generator task - generates content drafts using templates and identity."""
import asyncio
import random
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.celery_app import celery_app
from app.core.database import async_session_maker
from app.llm.provider import get_primary_provider
from app.models.agent import AgentRun
from app.models.draft import AgentType, Draft, DraftFormat, DraftStatus
from app.models.identity import IdentityGraph, StyleProfile
from app.models.opportunity import Opportunity, OpportunityStatus
from app.models.profile import Profile
from app.models.template import Template, TemplateUsage


DRAFT_GENERATION_PROMPT = """You are a personal branding content writer. Generate a LinkedIn post based on the following context.

User Identity:
- Themes: {themes}
- Expertise: {expertise}
- Authority: {authority}
- Audience: {audience}

Style Preferences:
- Tone: {tone_description}
- Avoid these topics: {taboo_list}

{template_section}

Topic/Opportunity: {topic}
Angle: {angle}

Generate a compelling LinkedIn post with:
1. A strong hook (first line that grabs attention)
2. Body content that provides value
3. A call to engagement or thought-provoking ending

Respond in JSON format:
{{
    "hook": "The attention-grabbing first line",
    "body": "The full post body including the hook",
    "topic": "Short topic label",
    "confidence": 0.0-1.0 (how well this matches the user's style)
}}
"""

TEMPLATE_SECTION = """
Use this template structure as guidance:
{template_content}

Fill in the placeholders with relevant content based on the topic.
"""


def get_tone_description(sliders: dict) -> str:
    """Convert tone sliders to natural language description."""
    descriptions = []

    fc = sliders.get("formal_casual", 0.5)
    if fc < 0.3:
        descriptions.append("formal and professional")
    elif fc > 0.7:
        descriptions.append("casual and conversational")

    ts = sliders.get("technical_simple", 0.5)
    if ts > 0.7:
        descriptions.append("technical and detailed")
    elif ts < 0.3:
        descriptions.append("simple and accessible")

    sp = sliders.get("serious_playful", 0.5)
    if sp > 0.7:
        descriptions.append("engaging and playful")
    elif sp < 0.3:
        descriptions.append("serious and authoritative")

    hc = sliders.get("humble_confident", 0.5)
    if hc > 0.7:
        descriptions.append("confident and bold")
    elif hc < 0.3:
        descriptions.append("humble and relatable")

    return ", ".join(descriptions) if descriptions else "balanced and professional"


async def _select_template(db, profile_id: UUID, format_pref: dict) -> Template | None:
    """Select best template based on preferences and history."""
    # Get format with highest preference
    preferred_format = max(format_pref.items(), key=lambda x: x[1])[0] if format_pref else "post"

    # Map to DraftFormat enum
    format_map = {
        "post": DraftFormat.POST,
        "thread": DraftFormat.THREAD,
        "carousel": DraftFormat.CAROUSEL,
    }
    target_format = format_map.get(preferred_format, DraftFormat.POST)

    # Get templates with usage stats
    result = await db.execute(
        select(Template)
        .where(Template.is_active == True, Template.format == target_format)
        .order_by(func.random())
        .limit(5)
    )
    templates = result.scalars().all()

    if not templates:
        # Fallback to any active template
        result = await db.execute(
            select(Template)
            .where(Template.is_active == True)
            .order_by(func.random())
            .limit(1)
        )
        templates = result.scalars().all()

    return templates[0] if templates else None


async def _run_draft_generator(profile_id: str = None, count: int = 3) -> dict:
    """Async implementation of draft generator."""
    async with async_session_maker() as db:
        # Get profiles to process
        if profile_id:
            result = await db.execute(
                select(Profile)
                .options(
                    selectinload(Profile.identity_graph),
                    selectinload(Profile.style_profile),
                )
                .where(Profile.id == UUID(profile_id), Profile.is_active == True)
            )
            profiles = [result.scalar_one_or_none()]
            profiles = [p for p in profiles if p]
        else:
            result = await db.execute(
                select(Profile)
                .options(
                    selectinload(Profile.identity_graph),
                    selectinload(Profile.style_profile),
                )
                .where(Profile.is_active == True)
            )
            profiles = result.scalars().all()

        if not profiles:
            return {"message": "No profiles to process"}

        total_drafts = 0
        llm = get_primary_provider()

        for profile in profiles:
            # Create agent run
            agent_run = AgentRun(
                profile_id=profile.id,
                agent_type=AgentType.DRAFT_GENERATOR,
                status="running",
            )
            db.add(agent_run)
            await db.flush()

            try:
                # Get identity and style
                identity = profile.identity_graph
                style = profile.style_profile

                if not identity:
                    agent_run.status = "completed"
                    agent_run.result_summary = "No identity graph - skipping"
                    continue

                # Get unused opportunities
                opp_result = await db.execute(
                    select(Opportunity)
                    .where(
                        Opportunity.profile_id == profile.id,
                        Opportunity.status == OpportunityStatus.NEW,
                    )
                    .order_by(Opportunity.relevance_score.desc())
                    .limit(count)
                )
                opportunities = list(opp_result.scalars().all())

                # If not enough opportunities, generate from themes
                while len(opportunities) < count and identity.themes:
                    theme = random.choice(identity.themes)
                    opportunities.append(
                        type("FakeOpp", (), {"topic": theme, "angle": None, "id": None})()
                    )

                drafts_created = 0

                for opp in opportunities[:count]:
                    # Select template
                    template = await _select_template(
                        db,
                        profile.id,
                        style.format_preferences if style else {},
                    )

                    # Build prompt
                    template_section = ""
                    if template:
                        template_section = TEMPLATE_SECTION.format(
                            template_content=template.content
                        )

                    prompt = DRAFT_GENERATION_PROMPT.format(
                        themes=", ".join(identity.themes or []),
                        expertise=", ".join(identity.expertise_keywords or []),
                        authority=", ".join(identity.authority_angles or []),
                        audience=str(identity.audience_notes or {}),
                        tone_description=get_tone_description(
                            style.tone_sliders if style else {}
                        ),
                        taboo_list=", ".join(style.taboo_list if style else []),
                        template_section=template_section,
                        topic=opp.topic,
                        angle=opp.angle or "Share your unique perspective",
                    )

                    # Generate draft
                    result = await llm.generate_json(
                        prompt=prompt,
                        system_prompt="You are a personal branding expert creating engaging LinkedIn content.",
                    )

                    if result.get("hook") and result.get("body"):
                        draft = Draft(
                            profile_id=profile.id,
                            opportunity_id=opp.id if hasattr(opp, "id") and opp.id else None,
                            template_id=template.id if template else None,
                            status=DraftStatus.INBOX,
                            format=template.format if template else DraftFormat.POST,
                            hook=result["hook"],
                            body=result["body"],
                            topic=result.get("topic", opp.topic),
                            confidence=result.get("confidence", 0.7),
                            sources_json=[{"type": "opportunity", "topic": opp.topic}],
                            generated_by=AgentType.DRAFT_GENERATOR,
                        )
                        db.add(draft)
                        drafts_created += 1
                        total_drafts += 1

                        # Track template usage
                        if template:
                            usage = TemplateUsage(
                                template_id=template.id,
                                draft_id=draft.id,
                                profile_id=profile.id,
                            )
                            db.add(usage)

                        # Mark opportunity as used
                        if hasattr(opp, "id") and opp.id:
                            opp.status = OpportunityStatus.USED

                # Update agent run
                agent_run.status = "completed"
                agent_run.completed_at = datetime.now(timezone.utc)
                agent_run.items_processed = len(opportunities)
                agent_run.items_generated = drafts_created
                agent_run.result_summary = f"Generated {drafts_created} drafts"

            except Exception as e:
                agent_run.status = "failed"
                agent_run.completed_at = datetime.now(timezone.utc)
                agent_run.error_message = str(e)

        await db.commit()

        return {
            "message": f"Generated drafts for {len(profiles)} profiles",
            "total_drafts": total_drafts,
        }


@celery_app.task(name="app.tasks.draft_generator.draft_generator_task")
def draft_generator_task(profile_id: str = None, count: int = 3) -> dict:
    """Draft generator Celery task.

    Args:
        profile_id: Specific profile to generate for, or None for all active profiles
        count: Number of drafts to generate per profile (1-3)
    """
    count = min(max(count, 1), 3)  # Clamp to 1-3
    return asyncio.run(_run_draft_generator(profile_id, count))
