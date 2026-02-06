from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.identity import Timeline, TimelineEvent, TimelineEventType, IdentityGraph
from app.models.profile import Profile

class TimelineService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_timeline(self, identity_graph_id: UUID) -> Timeline:
        """Get existing timeline or create a new one for the identity graph."""
        stmt = select(Timeline).where(Timeline.identity_graph_id == identity_graph_id)
        result = await self.db.execute(stmt)
        timeline = result.scalar_one_or_none()

        if not timeline:
            timeline = Timeline(identity_graph_id=identity_graph_id)
            self.db.add(timeline)
            await self.db.flush()
        
        return timeline

    async def add_event(
        self, 
        timeline_id: UUID, 
        title: str, 
        event_type: TimelineEventType,
        start_date=None,
        end_date=None,
        description=None,
        tags=None
    ) -> TimelineEvent:
        """Add a new event to the timeline."""
        event = TimelineEvent(
            timeline_id=timeline_id,
            title=title,
            event_type=event_type,
            start_date=start_date,
            end_date=end_date,
            description=description,
            tags=tags or []
        )
        self.db.add(event)
        await self.db.flush()
        return event

    async def get_full_timeline(self, profile_id: UUID) -> Timeline | None:
        """Get the full timeline with all events for a profile."""
        stmt = (
            select(Timeline)
            .join(IdentityGraph, IdentityGraph.id == Timeline.identity_graph_id)
            .where(IdentityGraph.profile_id == profile_id)
            .options(selectinload(Timeline.events))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
