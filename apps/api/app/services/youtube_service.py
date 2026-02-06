"""YouTube transcript extraction service with Cloudflare Worker fallback."""
import logging
import re
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def extract_video_id(url: str) -> Optional[str]:
    """Extract video ID from various YouTube URL formats."""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})',
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def _clean_transcript(text: str) -> str:
    """Clean and truncate transcript text."""
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) > 15000:
        text = text[:15000] + "..."
    return text


async def _fetch_via_library(video_id: str) -> Optional[str]:
    """Try fetching transcript using youtube_transcript_api library."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import (
            NoTranscriptFound,
            TranscriptsDisabled,
            VideoUnavailable,
        )
    except ImportError:
        logger.warning("youtube_transcript_api not installed, skipping library method")
        return None

    try:
        ytt_api = YouTubeTranscriptApi()
        fetched_transcript = ytt_api.fetch(video_id)
        full_text = " ".join([snippet.text for snippet in fetched_transcript.snippets])
        full_text = _clean_transcript(full_text)
        if full_text:
            logger.info(f"Transcript fetched via library for {video_id}: {len(full_text)} chars")
            return full_text
        return None
    except (NoTranscriptFound, TranscriptsDisabled, VideoUnavailable) as e:
        # These are definitive failures - video genuinely has no transcript
        logger.warning(f"Library: transcript not available for {video_id}: {e}")
        raise ValueError(str(e))
    except Exception as e:
        error_str = str(e).lower()
        # IP blocking errors - fall through to next provider
        if any(kw in error_str for kw in ["blocked", "ip", "request", "403", "too many"]):
            logger.warning(f"Library: IP blocked for {video_id}, will try fallback: {e}")
            return None
        # Other unexpected errors - also fall through
        logger.warning(f"Library: unexpected error for {video_id}, will try fallback: {e}")
        return None


async def _fetch_via_worker_proxy(video_id: str) -> Optional[str]:
    """Try fetching transcript via our Cloudflare Worker proxy.

    The Worker fetches the YouTube page from Cloudflare CDN IPs
    (which YouTube does not block), extracts captions, and returns
    plain text.
    """
    proxy_url = getattr(settings, "YOUTUBE_PROXY_URL", None)
    if not proxy_url:
        logger.info("YOUTUBE_PROXY_URL not configured, skipping worker proxy")
        return None

    proxy_api_key = getattr(settings, "YOUTUBE_PROXY_API_KEY", None)
    headers = {}
    if proxy_api_key:
        headers["x-api-key"] = proxy_api_key

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                proxy_url,
                params={"v": video_id},
                headers=headers,
            )
            if response.status_code == 200:
                data = response.json()
                transcript = data.get("transcript", "")
                if transcript:
                    full_text = _clean_transcript(transcript)
                    logger.info(f"Transcript fetched via worker proxy for {video_id}: {len(full_text)} chars")
                    return full_text
            else:
                error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                error_msg = error_data.get("error", response.text[:200])
                logger.warning(f"Worker proxy returned {response.status_code} for {video_id}: {error_msg}")
                return None
    except Exception as e:
        logger.warning(f"Worker proxy error for {video_id}: {e}")
        return None


async def get_youtube_transcript(url: str) -> str:
    """Fetch transcript from a YouTube video using multiple providers.

    Strategy:
    1. Try youtube_transcript_api library (direct, no API key needed)
    2. If IP-blocked, try Cloudflare Worker proxy (free, unlimited)
    3. If all fail, raise a helpful error

    Args:
        url: YouTube video URL

    Returns:
        Transcript text

    Raises:
        ValueError: If video ID cannot be extracted or transcript unavailable
    """
    video_id = extract_video_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube URL. Could not extract video ID.")

    # 1. Try the direct library approach
    transcript = await _fetch_via_library(video_id)
    if transcript:
        return transcript

    # 2. Try Cloudflare Worker proxy fallback
    transcript = await _fetch_via_worker_proxy(video_id)
    if transcript:
        return transcript

    # 3. All providers failed
    raise ValueError(
        "Could not fetch the transcript for this video. "
        "YouTube is blocking requests from our server. "
        "Please try again later or use a different video."
    )
