"""
Render Service Client.

HTTP client for calling the Node.js render service.
"""
from typing import Optional
import httpx
from app.config import settings


# Render service URL (defaults to localhost for development)
RENDER_SERVICE_URL = getattr(settings, 'render_service_url', 'http://localhost:3001')


async def render_template(
    template_json: dict,
    width: int,
    height: int,
    format: str = "png",
    upload_path: Optional[str] = None
) -> dict:
    """
    Call Node.js render service to generate PNG from template JSON.
    
    Args:
        template_json: Satori-compatible template structure
        width: Output width in pixels
        height: Output height in pixels
        format: Output format ("png" or "svg")
        upload_path: Optional S3 key prefix for upload
        
    Returns:
        Dict with success, url, format, width, height
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{RENDER_SERVICE_URL}/render",
            json={
                "template": template_json,
                "width": width,
                "height": height,
                "format": format,
                "uploadPath": upload_path,
            }
        )
        response.raise_for_status()
        return response.json()


async def render_preview(
    template_json: dict,
    width: int,
    height: int,
    format: str = "png"
) -> dict:
    """
    Render template and return base64 (no S3 upload).
    
    Returns:
        Dict with success, data (base64), format, width, height
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{RENDER_SERVICE_URL}/render/preview",
            json={
                "template": template_json,
                "width": width,
                "height": height,
                "format": format,
            }
        )
        response.raise_for_status()
        return response.json()


async def analyze_image(
    image_bytes: bytes,
    width: int = 1080,
    height: int = 1080,
    mime_type: str = "image/png"
) -> dict:
    """
    Upload image to Claude for template generation.
    
    Args:
        image_bytes: Raw image bytes
        width: Target template width
        height: Target template height
        mime_type: Image MIME type
        
    Returns:
        Dict with success, template, analysis
    """
    async with httpx.AsyncClient(timeout=120.0) as client:
        files = {
            "image": ("image.png", image_bytes, mime_type)
        }
        data = {
            "width": str(width),
            "height": str(height),
        }
        response = await client.post(
            f"{RENDER_SERVICE_URL}/analyze",
            files=files,
            data=data
        )
        response.raise_for_status()
        return response.json()


async def search_backgrounds(
    query: str,
    page: int = 1,
    per_page: int = 10,
    orientation: Optional[str] = None
) -> dict:
    """
    Search Unsplash for background images.
    
    Args:
        query: Search query
        page: Page number
        per_page: Results per page
        orientation: "landscape", "portrait", or "squarish"
        
    Returns:
        Dict with success, results, total, totalPages
    """
    params = {
        "query": query,
        "page": page,
        "perPage": per_page,
    }
    if orientation:
        params["orientation"] = orientation
        
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{RENDER_SERVICE_URL}/unsplash/search",
            params=params
        )
        response.raise_for_status()
        return response.json()


async def check_health() -> bool:
    """
    Check if render service is healthy.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{RENDER_SERVICE_URL}/health")
            return response.status_code == 200
    except Exception:
        return False
