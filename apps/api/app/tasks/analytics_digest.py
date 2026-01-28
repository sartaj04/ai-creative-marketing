"""Analytics digest task - generates weekly tuning suggestions."""
import asyncio
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.orm import selectinload

from app.core.celery_app import celery_app
from app.core.database import async_session_maker
from app.llm.provider import get_primary_provider
from app.models.agent import AgentRun
from app.models.draft import AgentType, Draft, DraftStatus
from app.models.profile import Profile


DIGEST_PROMPT = """Based on the following analytics data from a user's content performance, provide actionable tuning suggestions.

Weekly Stats:
- Total drafts generated: {total}
- Approved: {approved}
- Rejected: {rejected}
- Approval rate: {approval_rate:.1%}

Top Performing Topics (by approval rate):
{top_topics}

Worst Performing Topics:
{worst_topics}

Format Performance:
{format_stats}

Generate 3-5 specific suggestions to improve the AI's content generation for this user.

Respond in JSON format:
{{
    "suggestions": [
        {{
            "type": "topic|format|style|timing",
            "description": "Clear suggestion description",
            "impact": "high|medium|low",
            "action": "Specific action to take"
        }}
    ],
    "summary": "One paragraph summary of the week's performance"
}}
"""


async def _run_analytics_digest(profile_id: str = None) -> dict:
    """Async implementation of analytics digest."""
    async with async_session_maker() as db:
        # Get profiles to process
        if profile_id:
            result = await db.execute(
                select(Profile)
                .where(Profile.id == UUID(profile_id), Profile.is_active == True)
            )
            profiles = [result.scalar_one_or_none()]
            profiles = [p for p in profiles if p]
        else:
            result = await db.execute(
                select(Profile).where(Profile.is_active == True)
            )
            profiles = result.scalars().all()

        if not profiles:
            return {"message": "No profiles to process"}

        llm = get_primary_provider()
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)

        for profile in profiles:
            # Create agent run
            agent_run = AgentRun(
                profile_id=profile.id,
                agent_type=AgentType.ANALYTICS_DIGEST,
                status="running",
            )
            db.add(agent_run)
            await db.flush()

            try:
                # Get weekly stats
                stats_result = await db.execute(
                    select(
                        func.count(Draft.id).label("total"),
                        func.sum(case((Draft.status == DraftStatus.APPROVED, 1), else_=0)).label("approved"),
                        func.sum(case((Draft.status == DraftStatus.REJECTED, 1), else_=0)).label("rejected"),
                    ).where(
                        Draft.profile_id == profile.id,
                        Draft.created_at >= week_ago,
                    )
                )
                stats = stats_result.first()

                total = stats.total or 0
                approved = stats.approved or 0
                rejected = stats.rejected or 0

                if total == 0:
                    agent_run.status = "completed"
                    agent_run.result_summary = "No data for the week"
                    continue

                approval_rate = approved / (approved + rejected) if (approved + rejected) > 0 else 0

                # Get topic stats
                topic_result = await db.execute(
                    select(
                        Draft.topic,
                        func.count(Draft.id).label("count"),
                        func.sum(case((Draft.status == DraftStatus.APPROVED, 1), else_=0)).label("approved"),
                    )
                    .where(
                        Draft.profile_id == profile.id,
                        Draft.created_at >= week_ago,
                        Draft.topic.isnot(None),
                    )
                    .group_by(Draft.topic)
                )
                topic_stats = list(topic_result)

                # Sort by approval rate
                topic_rates = []
                for row in topic_stats:
                    rate = (row.approved or 0) / row.count if row.count > 0 else 0
                    topic_rates.append((row.topic, row.count, rate))

                topic_rates.sort(key=lambda x: x[2], reverse=True)
                top_topics = "\n".join([f"- {t[0]}: {t[2]:.0%} approval ({t[1]} drafts)" for t in topic_rates[:3]])
                worst_topics = "\n".join([f"- {t[0]}: {t[2]:.0%} approval ({t[1]} drafts)" for t in topic_rates[-3:]])

                # Get format stats
                format_result = await db.execute(
                    select(
                        Draft.format,
                        func.count(Draft.id).label("count"),
                        func.sum(case((Draft.status == DraftStatus.APPROVED, 1), else_=0)).label("approved"),
                    )
                    .where(
                        Draft.profile_id == profile.id,
                        Draft.created_at >= week_ago,
                    )
                    .group_by(Draft.format)
                )
                format_stats = []
                for row in format_result:
                    rate = (row.approved or 0) / row.count if row.count > 0 else 0
                    format_stats.append(f"- {row.format.value}: {rate:.0%} approval ({row.count} drafts)")

                # Generate suggestions with LLM
                prompt = DIGEST_PROMPT.format(
                    total=total,
                    approved=approved,
                    rejected=rejected,
                    approval_rate=approval_rate,
                    top_topics=top_topics or "No data",
                    worst_topics=worst_topics or "No data",
                    format_stats="\n".join(format_stats) or "No data",
                )

                digest = await llm.generate_json(
                    prompt=prompt,
                    system_prompt="You are an analytics expert providing actionable content strategy suggestions.",
                )

                # Store digest in agent run logs
                agent_run.status = "completed"
                agent_run.completed_at = datetime.now(timezone.utc)
                agent_run.items_processed = total
                agent_run.result_summary = digest.get("summary", "Digest generated")
                agent_run.logs_json = [
                    {
                        "type": "weekly_digest",
                        "generated_at": datetime.now(timezone.utc).isoformat(),
                        "stats": {
                            "total": total,
                            "approved": approved,
                            "rejected": rejected,
                            "approval_rate": approval_rate,
                        },
                        "suggestions": digest.get("suggestions", []),
                    }
                ]

            except Exception as e:
                agent_run.status = "failed"
                agent_run.completed_at = datetime.now(timezone.utc)
                agent_run.error_message = str(e)

        await db.commit()

        return {"message": f"Generated digests for {len(profiles)} profiles"}


@celery_app.task(name="app.tasks.analytics_digest.analytics_digest_task")
def analytics_digest_task(profile_id: str = None) -> dict:
    """Analytics digest Celery task.

    Args:
        profile_id: Specific profile to process, or None for all active profiles
    """
    return asyncio.run(_run_analytics_digest(profile_id))
