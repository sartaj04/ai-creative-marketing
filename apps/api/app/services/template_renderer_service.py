"""Template renderer service — renders HTML/CSS templates to PNG images via Playwright."""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class TemplateRendererService:
    """Renders HTML/CSS visual templates to PNG images using Playwright.

    Supports:
    - Single image rendering (quote cards, stat cards, etc.)
    - Multi-slide carousel rendering (each slide rendered separately)
    - Variable substitution in templates
    - Brand color/font injection
    """

    def __init__(self):
        self._browser = None
        self._playwright = None

    async def _ensure_browser(self):
        """Lazy-initialize Playwright browser."""
        if self._browser is None:
            from playwright.async_api import async_playwright

            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            logger.info("Playwright browser initialized for template rendering")

    async def render_template(
        self,
        html_template: str,
        variables: dict,
        width: int = 1080,
        height: int = 1080,
        brand_overrides: Optional[dict] = None,
    ) -> bytes:
        """Render an HTML template with variables to a PNG image.

        Args:
            html_template: HTML/CSS template string with {{variable}} placeholders
            variables: Dictionary of variable values to substitute
            width: Output image width in pixels
            height: Output image height in pixels
            brand_overrides: Optional brand customization {colors, fonts, logo_url}

        Returns:
            PNG image as bytes
        """
        await self._ensure_browser()

        # Substitute variables in the template
        rendered_html = self._substitute_variables(html_template, variables)

        # Inject brand overrides as CSS custom properties
        if brand_overrides:
            rendered_html = self._inject_brand_css(rendered_html, brand_overrides)

        # Wrap in full HTML document if not already
        if "<html" not in rendered_html.lower():
            rendered_html = self._wrap_html(rendered_html, width, height)

        # Render to PNG
        page = await self._browser.new_page(
            viewport={"width": width, "height": height},
            device_scale_factor=2,  # 2x for retina quality
        )
        try:
            await page.set_content(rendered_html, wait_until="networkidle")
            # Wait briefly for any fonts or images to load
            await page.wait_for_timeout(500)
            screenshot = await page.screenshot(
                type="png",
                clip={"x": 0, "y": 0, "width": width, "height": height},
            )
            return screenshot
        finally:
            await page.close()

    async def render_carousel(
        self,
        slides_html: list[str],
        slides_variables: list[dict],
        width: int = 1080,
        height: int = 1350,
        brand_overrides: Optional[dict] = None,
    ) -> list[bytes]:
        """Render multiple carousel slides to PNG images.

        Args:
            slides_html: List of HTML templates, one per slide
            slides_variables: List of variable dicts, one per slide
            width: Slide width in pixels
            height: Slide height in pixels (1350 for LinkedIn portrait)
            brand_overrides: Optional brand customization

        Returns:
            List of PNG image bytes, one per slide
        """
        results = []
        for html, variables in zip(slides_html, slides_variables):
            png = await self.render_template(
                html_template=html,
                variables=variables,
                width=width,
                height=height,
                brand_overrides=brand_overrides,
            )
            results.append(png)
        return results

    def _substitute_variables(self, html: str, variables: dict) -> str:
        """Replace {{variable}} placeholders with actual values."""
        result = html
        for key, value in variables.items():
            placeholder = "{{" + key + "}}"
            result = result.replace(placeholder, str(value) if value is not None else "")
        return result

    def _inject_brand_css(self, html: str, brand: dict) -> str:
        """Inject brand colors and fonts as CSS custom properties."""
        css_vars = []
        if "primary_color" in brand:
            css_vars.append(f"--brand-primary: {brand['primary_color']};")
        if "secondary_color" in brand:
            css_vars.append(f"--brand-secondary: {brand['secondary_color']};")
        if "accent_color" in brand:
            css_vars.append(f"--brand-accent: {brand['accent_color']};")
        if "background_color" in brand:
            css_vars.append(f"--brand-bg: {brand['background_color']};")
        if "text_color" in brand:
            css_vars.append(f"--brand-text: {brand['text_color']};")
        if "font_family" in brand:
            css_vars.append(f"--brand-font: {brand['font_family']};")

        if css_vars:
            brand_css = f"<style>:root {{ {' '.join(css_vars)} }}</style>"
            # Insert before closing </head> or at the start
            if "</head>" in html:
                html = html.replace("</head>", f"{brand_css}</head>")
            else:
                html = brand_css + html

        return html

    def _wrap_html(self, content: str, width: int, height: int) -> str:
        """Wrap partial HTML in a full document with reset styles."""
        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            width: {width}px;
            height: {height}px;
            overflow: hidden;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            -webkit-font-smoothing: antialiased;
        }}
    </style>
</head>
<body>
{content}
</body>
</html>"""

    async def close(self):
        """Clean up browser resources."""
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None


# Singleton instance
_renderer: Optional[TemplateRendererService] = None


async def get_template_renderer() -> TemplateRendererService:
    """Get or create the template renderer singleton."""
    global _renderer
    if _renderer is None:
        _renderer = TemplateRendererService()
    return _renderer
