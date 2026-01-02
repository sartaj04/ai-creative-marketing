"""
BrandScale AI - Template Rendering Service
HTML to image rendering using Playwright.
"""
import asyncio
from typing import Any, Dict, List, Optional

from jinja2 import Environment, BaseLoader, TemplateError
from loguru import logger
from playwright.async_api import Browser, async_playwright

from app.config import ASPECT_RATIO_DIMENSIONS, AspectRatio, settings
from app.utils.s3 import s3_client


class TemplateRenderer:
    """
    HTML template to image renderer using Playwright.
    
    Features:
    - Jinja2 template variable injection
    - Multi-aspect ratio rendering
    - Browser instance pooling
    - S3 upload integration
    - Batch rendering
    """
    
    def __init__(self):
        """Initialize renderer configuration."""
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._browser_lock = asyncio.Lock()
        self._jinja_env = Environment(loader=BaseLoader())
    
    async def _get_browser(self) -> Browser:
        """Get or create browser instance with pooling."""
        async with self._browser_lock:
            if self._browser is None or not self._browser.is_connected():
                if self._playwright:
                    try:
                        await self._playwright.stop()
                    except:
                        pass
                
                self._playwright = await async_playwright().start()
                self._browser = await self._playwright.chromium.launch(
                    headless=True,
                    args=[
                        "--disable-gpu",
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-setuid-sandbox",
                    ]
                )
                logger.info("Browser instance created for rendering")
            
            return self._browser
    
    async def close(self):
        """Close browser and cleanup."""
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
    
    def render_template(
        self,
        html_template: str,
        css_code: str,
        data: Dict[str, Any]
    ) -> str:
        """
        Inject data into HTML template using Jinja2.
        
        Args:
            html_template: Jinja2 HTML template
            css_code: CSS styles
            data: Template data dictionary
        
        Returns:
            Complete HTML document
        """
        # Create full HTML document
        full_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        html, body {{
            width: 100%;
            height: 100%;
            overflow: hidden;
        }}
        {css_code}
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    {html_template}
</body>
</html>
"""
        
        try:
            # Compile and render template
            template = self._jinja_env.from_string(full_html)
            rendered = template.render(**data)
            return rendered
        except TemplateError as e:
            logger.error(f"Template rendering error: {e}")
            raise
    
    async def render_to_image(
        self,
        html_content: str,
        width: int,
        height: int,
        quality: int = 90
    ) -> bytes:
        """
        Render HTML to image using Playwright.
        
        Args:
            html_content: Complete HTML document
            width: Image width in pixels
            height: Image height in pixels
            quality: PNG quality (not used for PNG, kept for API consistency)
        
        Returns:
            PNG image bytes
        """
        browser = await self._get_browser()
        context = await browser.new_context(
            viewport={"width": width, "height": height},
            device_scale_factor=2  # For retina-quality images
        )
        page = await context.new_page()
        
        try:
            # Set content and wait for fonts/images
            await page.set_content(
                html_content,
                wait_until="networkidle",
                timeout=settings.playwright_timeout
            )
            
            # Additional wait for dynamic content
            await asyncio.sleep(0.5)
            
            # Take screenshot
            screenshot = await page.screenshot(
                type="png",
                full_page=False,
                animations="disabled",
            )
            
            logger.debug(f"Rendered image: {width}x{height}, {len(screenshot)} bytes")
            return screenshot
            
        except Exception as e:
            logger.error(f"Screenshot capture failed: {e}")
            raise
        finally:
            await page.close()
            await context.close()
    
    async def render_asset(
        self,
        template_html: str,
        template_css: str,
        data: Dict[str, Any],
        aspect_ratio: AspectRatio
    ) -> bytes:
        """
        Render a single asset for a specific aspect ratio.
        
        Args:
            template_html: Jinja2 HTML template
            template_css: CSS styles
            data: Template data
            aspect_ratio: Target aspect ratio
        
        Returns:
            PNG image bytes
        """
        dimensions = ASPECT_RATIO_DIMENSIONS.get(aspect_ratio, (1080, 1080))
        
        # Inject aspect ratio into data for responsive templates
        data_with_meta = {
            **data,
            "_width": dimensions[0],
            "_height": dimensions[1],
            "_aspect_ratio": aspect_ratio.value,
        }
        
        html_content = self.render_template(template_html, template_css, data_with_meta)
        image_bytes = await self.render_to_image(html_content, dimensions[0], dimensions[1])
        
        return image_bytes
    
    async def render_multiple_ratios(
        self,
        template_html: str,
        template_css: str,
        data: Dict[str, Any],
        aspect_ratios: List[AspectRatio]
    ) -> Dict[AspectRatio, bytes]:
        """
        Render template for multiple aspect ratios.
        
        Args:
            template_html: Jinja2 HTML template
            template_css: CSS styles
            data: Template data
            aspect_ratios: List of aspect ratios to render
        
        Returns:
            Dict mapping aspect ratio to image bytes
        """
        results = {}
        
        for ratio in aspect_ratios:
            try:
                image_bytes = await self.render_asset(
                    template_html,
                    template_css,
                    data,
                    ratio
                )
                results[ratio] = image_bytes
                logger.info(f"Rendered {ratio.value}: {len(image_bytes)} bytes")
            except Exception as e:
                logger.error(f"Failed to render {ratio.value}: {e}")
                results[ratio] = None
        
        return results
    
    async def render_and_upload(
        self,
        template_html: str,
        template_css: str,
        data: Dict[str, Any],
        aspect_ratio: AspectRatio,
        user_id: int,
        profile_id: int,
        asset_id: int
    ) -> Optional[str]:
        """
        Render template and upload to S3.
        
        Args:
            template_html: Jinja2 HTML template
            template_css: CSS styles
            data: Template data
            aspect_ratio: Target aspect ratio
            user_id: User ID for S3 path
            profile_id: Profile ID for S3 path
            asset_id: Asset ID for S3 path
        
        Returns:
            S3 URL of uploaded image, or None if failed
        """
        try:
            # Render image
            image_bytes = await self.render_asset(
                template_html,
                template_css,
                data,
                aspect_ratio
            )
            
            # Upload to S3
            url = await s3_client.upload_image(
                user_id=user_id,
                profile_id=profile_id,
                asset_id=asset_id,
                image_data=image_bytes,
                extension="png",
                content_type="image/png"
            )
            
            logger.info(f"Asset {asset_id} rendered and uploaded: {url}")
            return url
            
        except Exception as e:
            logger.error(f"Render and upload failed for asset {asset_id}: {e}")
            return None
    
    async def batch_render(
        self,
        template_html: str,
        template_css: str,
        batch: List[Dict[str, Any]],
        aspect_ratios: List[AspectRatio],
        user_id: int,
        profile_id: int
    ) -> List[Dict[str, Any]]:
        """
        Batch render multiple assets with different data.
        
        Args:
            template_html: Jinja2 HTML template
            template_css: CSS styles
            batch: List of data dicts, each with 'asset_id' and template data
            aspect_ratios: Aspect ratios to render for each
            user_id: User ID
            profile_id: Profile ID
        
        Returns:
            List of results with asset_id, urls, and any errors
        """
        results = []
        
        for item in batch:
            asset_id = item.get("asset_id")
            data = item.get("data", {})
            
            item_results = {
                "asset_id": asset_id,
                "urls": {},
                "errors": [],
            }
            
            for ratio in aspect_ratios:
                try:
                    url = await self.render_and_upload(
                        template_html,
                        template_css,
                        data,
                        ratio,
                        user_id,
                        profile_id,
                        asset_id
                    )
                    item_results["urls"][ratio.value] = url
                except Exception as e:
                    item_results["errors"].append(f"{ratio.value}: {str(e)}")
            
            results.append(item_results)
            
            # Small delay between renders to avoid overwhelming resources
            await asyncio.sleep(0.1)
        
        return results
    
    async def preview_render(
        self,
        template_html: str,
        template_css: str,
        data: Dict[str, Any],
        width: int = 400,
        height: int = 400
    ) -> bytes:
        """
        Generate a small preview image for quick feedback.
        
        Args:
            template_html: Jinja2 HTML template
            template_css: CSS styles
            data: Template data
            width: Preview width
            height: Preview height
        
        Returns:
            PNG preview image bytes
        """
        html_content = self.render_template(template_html, template_css, data)
        return await self.render_to_image(html_content, width, height)


# Global renderer instance
template_renderer = TemplateRenderer()
