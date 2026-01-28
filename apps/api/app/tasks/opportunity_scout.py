"""Opportunity scout task - identifies content opportunities from RSS feeds."""
import asyncio
from datetime import datetime, timedelta, timezone
from uuid import UUID

import feedparser
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.celery_app import celery_app
from app.core.database import async_session_maker
from app.llm.provider import get_primary_provider
from app.models.agent import AgentRun
from app.models.document import SourceType
from app.models.draft import AgentType
from app.models.identity import IdentityGraph
from app.models.opportunity import Opportunity, OpportunityStatus
from app.models.profile import Profile


OPPORTUNITY_PROMPT = """Given the following article/news item and the user's expertise areas, determine if this is a good content opportunity.

Article Title: {title}
Article Summary: {summary}

User's Themes: {themes}
User's Expertise: {expertise}

Rate the relevance (0.0 to 1.0) and suggest an angle for the user to write about this topic from their perspective.

Respond in JSON format:
{{
    "relevance_score": 0.0-1.0,
    "is_relevant": true/false,
    "suggested_angle": "how the user could approach this topic",
    "topic": "short topic name"
}}
"""


async def _fetch_rss_feed(url: str) -> list[dict]:
    """Fetch and parse RSS feed."""
    try:
        feed = feedparser.parse(url)
        items = []
        for entry in feed.entries[:10]:  # Limit to 10 most recent
            items.append({
                "title": entry.get("title", ""),
                "summary": entry.get("summary", entry.get("description", ""))[:500],
                "link": entry.get("link", ""),
                "published": entry.get("published", ""),
            })
        return items
    except Exception as e:
        print(f"Error fetching RSS feed {url}: {e}")
        return []


async def _run_opportunity_scout(profile_id: str = None) -> dict:
    """Async implementation of opportunity scout."""
    async with async_session_maker() as db:
        # Get profiles to process
        if profile_id:
            result = await db.execute(
                select(Profile)
                .options(
                    selectinload(Profile.sources),
                    selectinload(Profile.identity_graph),
                )
                .where(Profile.id == UUID(profile_id), Profile.is_active == True)
            )
            profiles = [result.scalar_one_or_none()]
            profiles = [p for p in profiles if p]
        else:
            result = await db.execute(
                select(Profile)
                .options(
                    selectinload(Profile.sources),
                    selectinload(Profile.identity_graph),
                )
                .where(Profile.is_active == True)
            )
            profiles = result.scalars().all()

        if not profiles:
            return {"message": "No profiles to process"}

        total_opportunities = 0
        llm = get_primary_provider()

        for profile in profiles:
            if not profile.sources or not profile.sources.rss_urls:
                continue

            # Create agent run
            agent_run = AgentRun(
                profile_id=profile.id,
                agent_type=AgentType.OPPORTUNITY_SCOUT,
                status="running",
            )
            db.add(agent_run)
            await db.flush()

            try:
                # Get user's identity for relevance matching
                themes = profile.identity_graph.themes if profile.identity_graph else []
                expertise = profile.identity_graph.expertise_keywords if profile.identity_graph else []

                items_processed = 0
                opportunities_created = 0

                for rss_url in profile.sources.rss_urls:
                    items = await _fetch_rss_feed(rss_url)

                    for item in items:
                        items_processed += 1

                        # Check relevance with LLM
                        prompt = OPPORTUNITY_PROMPT.format(
                            title=item["title"],
                            summary=item["summary"],
                            themes=", ".join(themes),
                            expertise=", ".join(expertise),
                        )

                        analysis = await llm.generate_json(prompt=prompt)

                        if analysis.get("is_relevant") and analysis.get("relevance_score", 0) > 0.5:
                            # Create opportunity
                            opportunity = Opportunity(
                                profile_id=profile.id,
                                topic=analysis.get("topic", item["title"][:100]),
                                angle=analysis.get("suggested_angle"),
                                source_url=item["link"],
                                source_type=SourceType.RSS,
                                relevance_score=analysis.get("relevance_score", 0.5),
                                status=OpportunityStatus.NEW,
                                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
                            )
                            db.add(opportunity)
                            opportunities_created += 1
                            total_opportunities += 1

                # Update agent run
                agent_run.status = "completed"
                agent_run.completed_at = datetime.now(timezone.utc)
                agent_run.items_processed = items_processed
                agent_run.items_generated = opportunities_created
                agent_run.result_summary = f"Processed {items_processed} items, created {opportunities_created} opportunities"

            except Exception as e:
                agent_run.status = "failed"
                agent_run.completed_at = datetime.now(timezone.utc)
                agent_run.error_message = str(e)

        await db.commit()

        return {
            "message": f"Scout completed for {len(profiles)} profiles",
            "total_opportunities": total_opportunities,
        }


@celery_app.task(name="app.tasks.opportunity_scout.opportunity_scout_task")
def opportunity_scout_task(profile_id: str = None) -> dict:
    """Opportunity scout Celery task.

    Args:
        profile_id: Specific profile to process, or None for all active profiles
    """
    return asyncio.run(_run_opportunity_scout(profile_id))
