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

# Browser pool for reuse - now tracks both browser and playwright instances
_browser_pool: List[tuple] = []  # List of (playwright, browser) tuples
_pool_semaphore = asyncio.Semaphore(3)
_pool_lock = asyncio.Lock()


async def get_browser():
    """Get a browser from the pool or create a new one."""
    async with _pool_lock:
        # Try to get a working browser from pool
        while _browser_pool:
            pw, browser = _browser_pool.pop()
            try:
                # Check if browser is still connected
                if browser.is_connected():
                    return (pw, browser)
                else:
                    # Browser disconnected, close and try next
                    try:
                        await browser.close()
                        await pw.stop()
                    except Exception:
                        pass
            except Exception:
                # Browser crashed, try next
                try:
                    await pw.stop()
                except Exception:
                    pass
        
        # Create new playwright and browser instance
        try:
            playwright = await async_playwright().start()
            browser = await playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                ]
            )
            return (playwright, browser)
        except Exception as e:
            raise RuntimeError(f"Failed to launch browser: {e}")


async def release_browser(browser_tuple):
    """Return a browser to the pool or close it."""
    if not browser_tuple:
        return
        
    pw, browser = browser_tuple
    
    async with _pool_lock:
        try:
            # Only pool if browser is still healthy
            if browser.is_connected() and len(_browser_pool) < 2:
                _browser_pool.append((pw, browser))
            else:
                # Close browser and playwright
                try:
                    await browser.close()
                except Exception:
                    pass
                try:
                    await pw.stop()
                except Exception:
                    pass
        except Exception:
            # On any error, try to cleanup
            try:
                await browser.close()
            except Exception:
                pass
            try:
                await pw.stop()
            except Exception:
                pass


async def render_template(
    template_id: str,
    data: Dict[str, Any],
    aspect_ratio: str,
    render_mode: str = "production"
) -> bytes:
    """
    Render an HTML template to a PNG image.
    
    Args:
        template_id: UUID of the template to render
        data: Variables to inject into the template
        aspect_ratio: Output aspect ratio
        render_mode: "production" (default) or "admin"
            - production: Only renders approved templates
            - admin: Renders any template (for preview/QA)
        
    Returns:
        PNG image as bytes
        
    Raises:
        ValueError: If template not found or not approved (in production mode)
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
        
        # Production mode: only render approved templates
        if render_mode == "production":
            from app.models.template import TemplateStatus
            if template.status != TemplateStatus.APPROVED:
                raise ValueError(
                    f"Template {template_id} is not approved for production use. "
                    f"Current status: {template.status.value}"
                )
    
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
    browser_tuple = await get_browser()
    _, browser = browser_tuple  # Unpack the (playwright, browser) tuple
    
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
        await release_browser(browser_tuple)


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
