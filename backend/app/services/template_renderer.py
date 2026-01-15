"""
Template renderer using Playwright.
"""
from typing import Dict, Any, List
import asyncio

from playwright.async_api import async_playwright, Browser
from jinja2 import Template as Jinja2Template

from app.database import async_session_maker
from app.models.template import Template


# Aspect ratio to dimensions mapping
ASPECT_RATIO_DIMENSIONS = {
    "1:1": (1080, 1080),
    "9:16": (1080, 1920),
    "1.91:1": (1200, 628),
    "4:5": (1080, 1350),
    "16:9": (1200, 675),
}

# Browser pool for reuse
_browser_pool: List[Browser] = []
_pool_semaphore = asyncio.Semaphore(3)


async def get_browser():
    """Get a browser from the pool or create a new one."""
    async with _pool_semaphore:
        if _browser_pool:
            return _browser_pool.pop()
        
        playwright = await async_playwright().start()
        browser = await playwright.chromium.launch(headless=True)
        return browser


async def release_browser(browser: Browser):
    """Return a browser to the pool."""
    async with _pool_semaphore:
        if len(_browser_pool) < 3:
            _browser_pool.append(browser)
        else:
            await browser.close()


async def render_template(
    template_id: str,
    data: Dict[str, Any],
    aspect_ratio: str
) -> bytes:
    """
    Render an HTML template to a PNG image.
    
    Args:
        template_id: UUID of the template to render
        data: Variables to inject into the template
        aspect_ratio: Output aspect ratio
        
    Returns:
        PNG image as bytes
    """
    # Get template from database
    async with async_session_maker() as session:
        from sqlalchemy import select
        result = await session.execute(
            select(Template).where(Template.id == template_id)
        )
        template = result.scalar_one_or_none()
        
        if not template:
            raise ValueError(f"Template {template_id} not found")
    
    # Get dimensions
    width, height = ASPECT_RATIO_DIMENSIONS.get(aspect_ratio, (1080, 1080))
    
    # Render HTML with Jinja2
    jinja_template = Jinja2Template(template.html_code)
    rendered_html = jinja_template.render(**data)
    
    # Add CSS
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ width: {width}px; height: {height}px; overflow: hidden; }}
            {template.css_code}
        </style>
    </head>
    <body>
        {rendered_html}
    </body>
    </html>
    """
    
    # Render with Playwright
    browser = await get_browser()
    
    try:
        page = await browser.new_page(viewport={"width": width, "height": height})
        
        await page.set_content(full_html, wait_until="networkidle")
        
        # Wait for images to load
        await page.wait_for_timeout(1000)
        
        # Take screenshot
        screenshot = await page.screenshot(type="png", full_page=False)
        
        await page.close()
        
        return screenshot
        
    finally:
        await release_browser(browser)


async def batch_render(
    template_id: str,
    data: Dict[str, Any],
    aspect_ratio: str,
    user_id: str,
    profile_id: str
) -> Dict[str, Any]:
    """
    Render a template and upload to S3.
    
    Args:
        template_id: Template UUID
        data: Template variables
        aspect_ratio: Output aspect ratio
        user_id: User UUID for S3 path
        profile_id: Profile UUID
        
    Returns:
        Dictionary with image_url
    """
    from app.services.s3_storage import upload_image
    import uuid
    
    # Render template
    image_buffer = await render_template(template_id, data, aspect_ratio)
    
    # Upload to S3
    filename = f"{uuid.uuid4()}.png"
    image_url = await upload_image(image_buffer, user_id, filename)
    
    return {
        "image_url": image_url,
        "template_id": template_id,
        "aspect_ratio": aspect_ratio
    }
