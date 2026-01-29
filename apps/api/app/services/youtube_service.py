"""YouTube transcript extraction service."""
import logging
import re
from typing import Optional

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


async def get_youtube_transcript(url: str) -> str:
    """Fetch transcript from a YouTube video.
    
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
    
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import (
            NoTranscriptFound,
            TranscriptsDisabled,
            VideoUnavailable,
        )
    except ImportError:
        raise ValueError("YouTube transcript API not installed. Run: pip install youtube-transcript-api")
    
    try:
        # Use the new API format
        ytt_api = YouTubeTranscriptApi()
        fetched_transcript = ytt_api.fetch(video_id)
        
        # Combine all transcript segments from snippets
        full_text = " ".join([snippet.text for snippet in fetched_transcript.snippets])
        
        # Clean up the text
        full_text = re.sub(r'\s+', ' ', full_text).strip()
        
        if not full_text:
            raise ValueError("Transcript is empty.")
            
        # Limit to reasonable length for LLM processing
        if len(full_text) > 15000:
            full_text = full_text[:15000] + "..."
            
        logger.info(f"Extracted transcript for video {video_id}: {len(full_text)} chars")
        return full_text
        
    except NoTranscriptFound:
        raise ValueError("No transcript available for this video. Try a video with captions enabled.")
    except TranscriptsDisabled:
        raise ValueError("Transcripts are disabled for this video.")
    except VideoUnavailable:
        raise ValueError("This video is unavailable or private.")
    except Exception as e:
        logger.error(f"Error fetching YouTube transcript: {e}")
        raise ValueError(f"Failed to fetch transcript: {str(e)}")
