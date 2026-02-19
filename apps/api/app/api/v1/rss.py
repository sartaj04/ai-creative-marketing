"""RSS feed endpoints."""
from typing import Optional
from urllib.parse import quote, unquote
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession, get_profile_with_access
from app.models.profile import Profile, ProfileSource

router = APIRouter()


class RSSConnectRequest(BaseModel):
    """Schema for connecting RSS feed."""

    rss_url: str
    name: Optional[str] = None


class RSSFeed(BaseModel):
    """Schema for RSS feed."""

    url: str
    name: Optional[str] = None
    last_fetched: Optional[str] = None


class RSSFeedListResponse(BaseModel):
    """Schema for RSS feed list response."""

    feeds: list[RSSFeed]


@router.post("/profiles/{profile_id}/rss-connect", status_code=status.HTTP_201_CREATED)
async def connect_rss_feed(
    profile_id: UUID,
    rss_data: RSSConnectRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    """Connect an RSS feed to a profile."""
    profile, _ = await get_profile_with_access(profile_id, current_user, db)

    # Get or create sources
    if not profile.sources:
        sources = ProfileSource(profile_id=profile.id, rss_urls=[])
        db.add(sources)
        await db.flush()
        profile.sources = sources

    # Add RSS URL if not already present
    rss_urls = profile.sources.rss_urls or []
    if rss_data.rss_url not in rss_urls:
        rss_urls.append(rss_data.rss_url)
        profile.sources.rss_urls = rss_urls

    await db.commit()

    return {
        "message": "RSS feed connected",
        "feed": {
            "url": rss_data.rss_url,
            "name": rss_data.name,
        },
    }


@router.get("/profiles/{profile_id}/rss-feeds", response_model=RSSFeedListResponse)
async def list_rss_feeds(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> RSSFeedListResponse:
    """List RSS feeds for a profile."""
    profile, _ = await get_profile_with_access(profile_id, current_user, db)

    feeds = []
    if profile.sources and profile.sources.rss_urls:
        for url in profile.sources.rss_urls:
            feeds.append(RSSFeed(url=url))

    return RSSFeedListResponse(feeds=feeds)


@router.delete("/profiles/{profile_id}/rss-feeds/{feed_url}")
async def remove_rss_feed(
    profile_id: UUID,
    feed_url: str,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    """Remove an RSS feed from a profile."""
    # Decode URL
    decoded_url = unquote(feed_url)

    profile, _ = await get_profile_with_access(profile_id, current_user, db)

    if not profile.sources or not profile.sources.rss_urls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RSS feed not found",
        )

    rss_urls = profile.sources.rss_urls
    if decoded_url not in rss_urls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RSS feed not found",
        )

    rss_urls.remove(decoded_url)
    profile.sources.rss_urls = rss_urls

    await db.commit()

    return {"message": "RSS feed removed"}
