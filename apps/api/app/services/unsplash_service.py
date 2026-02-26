"""Unsplash API service — search and download stock photos for template placeholders."""
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

UNSPLASH_API = "https://api.unsplash.com"


class UnsplashService:
    """Search Unsplash for stock photos to use as template placeholders."""

    def __init__(self):
        self._access_key = settings.UNSPLASH_ACCESS_KEY

    async def search_photos(
        self,
        query: str,
        per_page: int = 3,
        orientation: str = "squarish",
    ) -> list[dict]:
        """Search Unsplash for photos matching a query.

        Args:
            query: Search query (e.g. "professional workspace", "abstract gradient")
            per_page: Number of results (1-30)
            orientation: "landscape", "portrait", or "squarish"

        Returns:
            List of photo dicts with {id, url_regular, url_small, alt, photographer}
        """
        if not self._access_key:
            logger.warning("Unsplash access key not configured")
            return []

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{UNSPLASH_API}/search/photos",
                    params={
                        "query": query,
                        "per_page": per_page,
                        "orientation": orientation,
                    },
                    headers={
                        "Authorization": f"Client-ID {self._access_key}",
                        "Accept-Version": "v1",
                    },
                )
                resp.raise_for_status()
                data = resp.json()

            results = []
            for photo in data.get("results", []):
                results.append({
                    "id": photo["id"],
                    "url_regular": photo["urls"]["regular"],
                    "url_small": photo["urls"]["small"],
                    "url_thumb": photo["urls"]["thumb"],
                    "alt": photo.get("alt_description", ""),
                    "photographer": photo["user"]["name"],
                    "photographer_url": photo["user"]["links"]["html"],
                    # Unsplash requires attribution via download tracking
                    "download_url": photo["links"]["download_location"],
                })
            return results

        except Exception as e:
            logger.error(f"Unsplash search failed for '{query}': {e}")
            return []

    async def get_photo_url(
        self,
        query: str,
        orientation: str = "squarish",
    ) -> Optional[str]:
        """Get a single photo URL for a query (convenience method).

        Returns the regular-size URL of the first matching photo, or None.
        """
        photos = await self.search_photos(query, per_page=1, orientation=orientation)
        if photos:
            # Track download for Unsplash guidelines
            await self._track_download(photos[0]["download_url"])
            return photos[0]["url_regular"]
        return None

    async def _track_download(self, download_location: str):
        """Track download per Unsplash API guidelines."""
        if not self._access_key or not download_location:
            return
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                await client.get(
                    download_location,
                    headers={"Authorization": f"Client-ID {self._access_key}"},
                )
        except Exception:
            pass  # Non-critical, best-effort tracking


# Singleton
_unsplash_service: Optional[UnsplashService] = None


def get_unsplash_service() -> UnsplashService:
    """Get or create the Unsplash service singleton."""
    global _unsplash_service
    if _unsplash_service is None:
        _unsplash_service = UnsplashService()
    return _unsplash_service
