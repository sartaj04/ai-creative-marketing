"""Feedback loop task - updates style weights based on swipe events."""
import asyncio
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.celery_app import celery_app
from app.core.database import async_session_maker
from app.models.agent import AgentRun
from app.models.draft import AgentType, Draft, DraftAction, DraftEvent
from app.models.identity import StyleProfile
from app.models.profile import Profile


async def _run_feedback_loop(profile_id: str = None) -> dict:
    """Async implementation of feedback loop."""
    async with async_session_maker() as db:
        # Get profiles to process
        if profile_id:
            result = await db.execute(
                select(Profile)
                .options(selectinload(Profile.style_profile))
                .where(Profile.id == UUID(profile_id), Profile.is_active == True)
            )
            profiles = [result.scalar_one_or_none()]
            profiles = [p for p in profiles if p]
        else:
            result = await db.execute(
                select(Profile)
                .options(selectinload(Profile.style_profile))
                .where(Profile.is_active == True)
            )
            profiles = result.scalars().all()

        if not profiles:
            return {"message": "No profiles to process"}

        total_events_processed = 0
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=15)

        for profile in profiles:
            if not profile.style_profile:
                continue

            # Create agent run
            agent_run = AgentRun(
                profile_id=profile.id,
                agent_type=AgentType.FEEDBACK_LOOP,
                status="running",
            )
            db.add(agent_run)
            await db.flush()

            try:
                # Get recent events
                result = await db.execute(
                    select(DraftEvent)
                    .join(Draft)
                    .where(
                        Draft.profile_id == profile.id,
                        DraftEvent.created_at >= cutoff_time,
                        DraftEvent.action.in_([DraftAction.APPROVE, DraftAction.REJECT, DraftAction.EDIT]),
                    )
                    .options(selectinload(DraftEvent.draft))
                )
                events = result.scalars().all()

                if not events:
                    agent_run.status = "completed"
                    agent_run.completed_at = datetime.now(timezone.utc)
                    agent_run.result_summary = "No new events to process"
                    continue

                # Aggregate feedback by topic and format
                topic_feedback = defaultdict(lambda: {"approve": 0, "reject": 0})
                format_feedback = defaultdict(lambda: {"approve": 0, "reject": 0})
                hook_feedback = defaultdict(lambda: {"approve": 0, "reject": 0})

                for event in events:
                    draft = event.draft
                    is_positive = event.action in [DraftAction.APPROVE, DraftAction.EDIT]

                    if draft.topic:
                        key = "approve" if is_positive else "reject"
                        topic_feedback[draft.topic][key] += 1

                    if draft.format:
                        key = "approve" if is_positive else "reject"
                        format_feedback[draft.format.value][key] += 1

                    # Extract hook style (first word or pattern)
                    if draft.hook:
                        first_word = draft.hook.split()[0] if draft.hook.split() else "Unknown"
                        key = "approve" if is_positive else "reject"
                        hook_feedback[first_word][key] += 1

                    total_events_processed += 1

                # Update weights
                current_weights = profile.style_profile.weights or {
                    "topic_weight": {},
                    "format_weight": {},
                    "hook_weight": {},
                }

                # Update topic weights
                for topic, counts in topic_feedback.items():
                    total = counts["approve"] + counts["reject"]
                    if total > 0:
                        approval_rate = counts["approve"] / total
                        # Blend with existing weight
                        current = current_weights["topic_weight"].get(topic, 0.5)
                        current_weights["topic_weight"][topic] = (current + approval_rate) / 2

                # Update format weights
                for fmt, counts in format_feedback.items():
                    total = counts["approve"] + counts["reject"]
                    if total > 0:
                        approval_rate = counts["approve"] / total
                        current = current_weights["format_weight"].get(fmt, 0.5)
                        current_weights["format_weight"][fmt] = (current + approval_rate) / 2

                # Update hook weights
                for hook, counts in hook_feedback.items():
                    total = counts["approve"] + counts["reject"]
                    if total > 0:
                        approval_rate = counts["approve"] / total
                        current = current_weights["hook_weight"].get(hook, 0.5)
                        current_weights["hook_weight"][hook] = (current + approval_rate) / 2

                profile.style_profile.weights = current_weights
                profile.style_profile.version += 1

                # Update agent run
                agent_run.status = "completed"
                agent_run.completed_at = datetime.now(timezone.utc)
                agent_run.items_processed = len(events)
                agent_run.result_summary = f"Processed {len(events)} events, updated weights"

            except Exception as e:
                agent_run.status = "failed"
                agent_run.completed_at = datetime.now(timezone.utc)
                agent_run.error_message = str(e)

        await db.commit()

        return {
            "message": f"Processed feedback for {len(profiles)} profiles",
            "total_events": total_events_processed,
        }


@celery_app.task(name="app.tasks.feedback_loop.feedback_loop_task")
def feedback_loop_task(profile_id: str = None) -> dict:
    """Feedback loop Celery task.

    Args:
        profile_id: Specific profile to process, or None for all active profiles
    """
    return asyncio.run(_run_feedback_loop(profile_id))
