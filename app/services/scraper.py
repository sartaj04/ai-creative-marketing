"""
BrandScale AI - Web Scraping Service
Playwright-based scraping for e-commerce, SaaS, and personal brand websites.
"""
import asyncio
import base64
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

from colorthief import ColorThief
from loguru import logger
from openai import AsyncOpenAI
from playwright.async_api import Browser, BrowserContext, Page, async_playwright

from app.config import ProfileType, settings


class WebScraper:
    """
    Playwright-based web scraper for extracting brand assets.
    
    Supports:
    - E-commerce sites (Shopify, WooCommerce, custom)
    - SaaS websites
    - Personal brand profiles (LinkedIn, Twitter)
    """
    
    def __init__(self):
        """Initialize scraper configuration."""
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._openai = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
        
        # User agents for rotation
        self.user_agents = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ]
    
    async def _get_browser(self) -> Browser:
        """Get or create browser instance."""
        if self._browser is None:
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=settings.playwright_headless,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                ]
            )
        return self._browser
    
    async def _get_context(self) -> BrowserContext:
        """Create a new browser context with random user agent."""
        import random
        browser = await self._get_browser()
        context = await browser.new_context(
            user_agent=random.choice(self.user_agents),
            viewport={"width": 1920, "height": 1080},
            java_script_enabled=True,
        )
        return context
    
    async def close(self):
        """Close browser and cleanup resources."""
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        self._browser = None
        self._playwright = None
    
    async def scrape(
        self,
        url: str,
        profile_type: ProfileType
    ) -> Dict[str, Any]:
        """
        Main entry point for scraping.
        
        Args:
            url: Website URL to scrape
            profile_type: Type of profile (ecommerce/saas/personal)
        
        Returns:
            Dict with brand_assets and voice_profile
        """
        logger.info(f"Starting scrape for {url} (type: {profile_type.value})")
        
        if profile_type == ProfileType.ECOMMERCE:
            return await self.scrape_ecommerce(url)
        elif profile_type == ProfileType.SAAS:
            return await self.scrape_saas(url)
        elif profile_type == ProfileType.PERSONAL:
            return await self.scrape_personal_brand(url)
        else:
            raise ValueError(f"Unsupported profile type: {profile_type}")
    
    async def scrape_ecommerce(self, url: str) -> Dict[str, Any]:
        """
        Scrape e-commerce website for products, images, and brand assets.
        
        Supports: Shopify, WooCommerce, and custom e-commerce sites.
        """
        context = await self._get_context()
        page = await context.new_page()
        
        try:
            await page.goto(url, wait_until="networkidle", timeout=settings.playwright_timeout)
            await asyncio.sleep(2)  # Extra wait for dynamic content
            
            # Extract brand assets in parallel
            results = await asyncio.gather(
                self._extract_logo(page, url),
                self._extract_colors_from_page(page),
                self._extract_fonts(page),
                self._extract_products(page, url),
                self._extract_meta_info(page),
                return_exceptions=True
            )
            
            logo_url = results[0] if not isinstance(results[0], Exception) else None
            colors = results[1] if not isinstance(results[1], Exception) else {}
            fonts = results[2] if not isinstance(results[2], Exception) else {}
            products = results[3] if not isinstance(results[3], Exception) else []
            meta_info = results[4] if not isinstance(results[4], Exception) else {}
            
            # Extract additional images
            images = await self._extract_images(page, url)
            
            brand_assets = {
                "logo_url": logo_url,
                "favicon_url": await self._extract_favicon(page, url),
                "colors": colors,
                "fonts": fonts,
                "products": products[:20],  # Limit to 20 products
                "images": images[:30],  # Limit to 30 images
                "tagline": meta_info.get("tagline"),
                "description": meta_info.get("description"),
            }
            
            # Generate voice profile from content
            voice_profile = await self._analyze_voice(page, brand_assets)
            
            return {
                "brand_assets": brand_assets,
                "voice_profile": voice_profile,
            }
            
        except Exception as e:
            logger.error(f"Scraping failed for {url}: {e}")
            raise
        finally:
            await page.close()
            await context.close()
    
    async def scrape_saas(self, url: str) -> Dict[str, Any]:
        """
        Scrape SaaS website for company info, features, and testimonials.
        """
        context = await self._get_context()
        page = await context.new_page()
        
        try:
            await page.goto(url, wait_until="networkidle", timeout=settings.playwright_timeout)
            await asyncio.sleep(2)
            
            # Extract brand assets
            logo_url = await self._extract_logo(page, url)
            colors = await self._extract_colors_from_page(page)
            fonts = await self._extract_fonts(page)
            meta_info = await self._extract_meta_info(page)
            
            # SaaS-specific extraction
            features = await self._extract_features(page)
            testimonials = await self._extract_testimonials(page)
            screenshots = await self._extract_screenshots(page, url)
            
            brand_assets = {
                "logo_url": logo_url,
                "favicon_url": await self._extract_favicon(page, url),
                "colors": colors,
                "fonts": fonts,
                "features": features,
                "testimonials": testimonials,
                "screenshots": screenshots[:10],
                "tagline": meta_info.get("tagline"),
                "description": meta_info.get("description"),
                "images": screenshots,
            }
            
            voice_profile = await self._analyze_voice(page, brand_assets)
            
            return {
                "brand_assets": brand_assets,
                "voice_profile": voice_profile,
            }
            
        except Exception as e:
            logger.error(f"SaaS scraping failed for {url}: {e}")
            raise
        finally:
            await page.close()
            await context.close()
    
    async def scrape_personal_brand(self, url: str) -> Dict[str, Any]:
        """
        Scrape personal brand profile (LinkedIn, Twitter, or personal website).
        """
        context = await self._get_context()
        page = await context.new_page()
        
        try:
            await page.goto(url, wait_until="networkidle", timeout=settings.playwright_timeout)
            await asyncio.sleep(2)
            
            parsed_url = urlparse(url)
            domain = parsed_url.netloc.lower()
            
            if "linkedin.com" in domain:
                return await self._scrape_linkedin(page, url)
            elif "twitter.com" in domain or "x.com" in domain:
                return await self._scrape_twitter(page, url)
            else:
                # Generic personal website
                return await self._scrape_personal_website(page, url)
            
        except Exception as e:
            logger.error(f"Personal brand scraping failed for {url}: {e}")
            raise
        finally:
            await page.close()
            await context.close()
    
    async def _scrape_linkedin(self, page: Page, url: str) -> Dict[str, Any]:
        """Extract profile info from LinkedIn (limited due to auth)."""
        # LinkedIn requires login for full access
        # Extract what's publicly visible
        
        try:
            name = await page.locator("h1").first.inner_text()
        except:
            name = "Unknown"
        
        try:
            headline = await page.locator(".text-body-medium").first.inner_text()
        except:
            headline = ""
        
        try:
            about = await page.locator("section.summary >> div.display-flex").first.inner_text()
        except:
            about = ""
        
        brand_assets = {
            "name": name,
            "headline": headline,
            "about": about,
            "platform": "linkedin",
        }
        
        voice_profile = {
            "tone": "professional",
            "style": ["business", "networking"],
            "platform": "linkedin",
        }
        
        return {
            "brand_assets": brand_assets,
            "voice_profile": voice_profile,
        }
    
    async def _scrape_twitter(self, page: Page, url: str) -> Dict[str, Any]:
        """Extract profile info from Twitter/X."""
        try:
            name = await page.locator('[data-testid="UserName"]').first.inner_text()
        except:
            name = "Unknown"
        
        try:
            bio = await page.locator('[data-testid="UserDescription"]').first.inner_text()
        except:
            bio = ""
        
        # Extract recent tweets for voice analysis
        tweets = []
        try:
            tweet_elements = await page.locator('[data-testid="tweetText"]').all()
            for tweet in tweet_elements[:10]:
                tweets.append(await tweet.inner_text())
        except:
            pass
        
        brand_assets = {
            "name": name,
            "bio": bio,
            "tweets": tweets,
            "platform": "twitter",
        }
        
        # Analyze tweet style
        voice_profile = {
            "tone": "casual",
            "style": ["concise", "engaging"],
            "sample_content": tweets[:5],
            "platform": "twitter",
        }
        
        return {
            "brand_assets": brand_assets,
            "voice_profile": voice_profile,
        }
    
    async def _scrape_personal_website(self, page: Page, url: str) -> Dict[str, Any]:
        """Scrape generic personal website."""
        logo_url = await self._extract_logo(page, url)
        colors = await self._extract_colors_from_page(page)
        meta_info = await self._extract_meta_info(page)
        
        # Look for about/bio content
        about_text = ""
        for selector in ["#about", ".about", "[class*='about']", "[class*='bio']"]:
            try:
                element = page.locator(selector).first
                if await element.count() > 0:
                    about_text = await element.inner_text()
                    break
            except:
                continue
        
        # Extract content samples
        content_samples = []
        try:
            paragraphs = await page.locator("article p, .post p, .content p").all()
            for p in paragraphs[:10]:
                text = await p.inner_text()
                if len(text) > 50:
                    content_samples.append(text)
        except:
            pass
        
        brand_assets = {
            "logo_url": logo_url,
            "colors": colors,
            "tagline": meta_info.get("tagline"),
            "description": meta_info.get("description"),
            "about": about_text,
        }
        
        voice_profile = {
            "tone": "professional",
            "sample_content": content_samples[:5],
        }
        
        return {
            "brand_assets": brand_assets,
            "voice_profile": voice_profile,
        }
    
    async def _extract_logo(self, page: Page, base_url: str) -> Optional[str]:
        """Extract logo URL from various common locations."""
        logo_selectors = [
            'img[class*="logo"]',
            'img[id*="logo"]',
            'img[alt*="logo"]',
            'a[class*="logo"] img',
            'header img',
            '[class*="navbar"] img',
            '[class*="header"] img:first-child',
        ]
        
        for selector in logo_selectors:
            try:
                element = page.locator(selector).first
                if await element.count() > 0:
                    src = await element.get_attribute("src")
                    if src:
                        return urljoin(base_url, src)
            except:
                continue
        
        # Try og:image as fallback
        try:
            og_image = await page.locator('meta[property="og:image"]').get_attribute("content")
            if og_image:
                return urljoin(base_url, og_image)
        except:
            pass
        
        return None
    
    async def _extract_favicon(self, page: Page, base_url: str) -> Optional[str]:
        """Extract favicon URL."""
        selectors = [
            'link[rel="icon"]',
            'link[rel="shortcut icon"]',
            'link[rel="apple-touch-icon"]',
        ]
        
        for selector in selectors:
            try:
                element = page.locator(selector).first
                if await element.count() > 0:
                    href = await element.get_attribute("href")
                    if href:
                        return urljoin(base_url, href)
            except:
                continue
        
        return urljoin(base_url, "/favicon.ico")
    
    async def _extract_colors_from_page(self, page: Page) -> Dict[str, Any]:
        """Extract brand colors from CSS and elements."""
        colors = {
            "primary": None,
            "secondary": None,
            "accent": None,
            "dominant": [],
        }
        
        try:
            # Get colors from CSS variables
            css_colors = await page.evaluate("""
                () => {
                    const root = document.documentElement;
                    const styles = getComputedStyle(root);
                    const colors = {};
                    
                    // Common CSS variable names
                    const varNames = [
                        '--primary', '--primary-color', '--brand-primary',
                        '--secondary', '--secondary-color',
                        '--accent', '--accent-color',
                    ];
                    
                    varNames.forEach(name => {
                        const value = styles.getPropertyValue(name).trim();
                        if (value) {
                            colors[name] = value;
                        }
                    });
                    
                    return colors;
                }
            """)
            
            # Map to our format
            for var, value in css_colors.items():
                if "primary" in var and not colors["primary"]:
                    colors["primary"] = value
                elif "secondary" in var and not colors["secondary"]:
                    colors["secondary"] = value
                elif "accent" in var and not colors["accent"]:
                    colors["accent"] = value
            
            # Get dominant colors from key elements
            element_colors = await page.evaluate("""
                () => {
                    const colors = [];
                    const elements = document.querySelectorAll('header, nav, button, .btn, a.button');
                    
                    elements.forEach(el => {
                        const style = getComputedStyle(el);
                        const bg = style.backgroundColor;
                        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                            colors.push(bg);
                        }
                    });
                    
                    return [...new Set(colors)].slice(0, 5);
                }
            """)
            
            colors["dominant"] = element_colors[:5]
            
        except Exception as e:
            logger.warning(f"Color extraction failed: {e}")
        
        return colors
    
    async def _extract_fonts(self, page: Page) -> Dict[str, str]:
        """Extract font families from page."""
        fonts = {}
        
        try:
            font_info = await page.evaluate("""
                () => {
                    const body = document.body;
                    const h1 = document.querySelector('h1');
                    
                    const bodyFont = getComputedStyle(body).fontFamily.split(',')[0].trim().replace(/['"]/g, '');
                    
                    let headingFont = bodyFont;
                    if (h1) {
                        headingFont = getComputedStyle(h1).fontFamily.split(',')[0].trim().replace(/['"]/g, '');
                    }
                    
                    return { body: bodyFont, heading: headingFont };
                }
            """)
            
            fonts["body"] = font_info.get("body", "system-ui")
            fonts["heading"] = font_info.get("heading", fonts["body"])
            
        except Exception as e:
            logger.warning(f"Font extraction failed: {e}")
            fonts = {"body": "system-ui", "heading": "system-ui"}
        
        return fonts
    
    async def _extract_products(self, page: Page, base_url: str) -> List[Dict[str, Any]]:
        """Extract products from e-commerce page."""
        products = []
        
        # Common product selectors
        product_selectors = [
            '.product',
            '.product-item',
            '.product-card',
            '[class*="product-grid"] > div',
            '[class*="ProductCard"]',
            '.shopify-product',
        ]
        
        for selector in product_selectors:
            try:
                items = await page.locator(selector).all()
                if len(items) > 0:
                    for item in items[:20]:
                        product = await self._extract_product_info(item, base_url)
                        if product:
                            products.append(product)
                    break
            except:
                continue
        
        return products
    
    async def _extract_product_info(self, element, base_url: str) -> Optional[Dict[str, Any]]:
        """Extract info from a single product element."""
        try:
            # Product name
            name_element = element.locator("h2, h3, h4, .product-title, .product-name").first
            name = await name_element.inner_text() if await name_element.count() > 0 else None
            
            if not name:
                return None
            
            # Product image
            img_element = element.locator("img").first
            image_url = None
            if await img_element.count() > 0:
                src = await img_element.get_attribute("src") or await img_element.get_attribute("data-src")
                if src:
                    image_url = urljoin(base_url, src)
            
            # Price
            price_element = element.locator(".price, .product-price, [class*='price']").first
            price = await price_element.inner_text() if await price_element.count() > 0 else None
            
            # Description
            desc_element = element.locator("p, .description").first
            description = await desc_element.inner_text() if await desc_element.count() > 0 else None
            
            return {
                "name": name.strip(),
                "image_url": image_url,
                "price": price.strip() if price else None,
                "description": description[:200] if description else None,
            }
            
        except Exception as e:
            logger.debug(f"Product extraction failed: {e}")
            return None
    
    async def _extract_meta_info(self, page: Page) -> Dict[str, Optional[str]]:
        """Extract meta information (title, description, tagline)."""
        info = {
            "tagline": None,
            "description": None,
        }
        
        try:
            # Meta description
            meta_desc = await page.locator('meta[name="description"]').get_attribute("content")
            info["description"] = meta_desc
            
            # OG description as fallback
            if not info["description"]:
                og_desc = await page.locator('meta[property="og:description"]').get_attribute("content")
                info["description"] = og_desc
            
            # Look for tagline in hero section
            hero_selectors = [
                "h1 + p",
                ".hero p",
                "[class*='hero'] p",
                ".banner p",
                "header h2",
            ]
            
            for selector in hero_selectors:
                try:
                    element = page.locator(selector).first
                    if await element.count() > 0:
                        text = await element.inner_text()
                        if 10 < len(text) < 200:
                            info["tagline"] = text.strip()
                            break
                except:
                    continue
            
        except Exception as e:
            logger.warning(f"Meta extraction failed: {e}")
        
        return info
    
    async def _extract_images(self, page: Page, base_url: str) -> List[Dict[str, Any]]:
        """Extract all relevant images from page."""
        images = []
        
        try:
            img_elements = await page.locator("img").all()
            
            for img in img_elements[:50]:
                try:
                    src = await img.get_attribute("src") or await img.get_attribute("data-src")
                    if not src or "data:image" in src:
                        continue
                    
                    alt = await img.get_attribute("alt") or ""
                    
                    # Skip tiny images (likely icons)
                    width = await img.get_attribute("width")
                    if width and int(width) < 50:
                        continue
                    
                    images.append({
                        "url": urljoin(base_url, src),
                        "alt": alt,
                        "type": self._classify_image_type(src, alt),
                    })
                except:
                    continue
            
        except Exception as e:
            logger.warning(f"Image extraction failed: {e}")
        
        return images
    
    def _classify_image_type(self, url: str, alt: str) -> str:
        """Classify image type based on URL and alt text."""
        url_lower = url.lower()
        alt_lower = alt.lower()
        
        if any(x in url_lower or x in alt_lower for x in ["logo", "brand"]):
            return "logo"
        elif any(x in url_lower or x in alt_lower for x in ["product", "item"]):
            return "product"
        elif any(x in url_lower or x in alt_lower for x in ["banner", "hero", "slide"]):
            return "banner"
        elif any(x in url_lower or x in alt_lower for x in ["lifestyle", "model", "wear"]):
            return "lifestyle"
        else:
            return "other"
    
    async def _extract_features(self, page: Page) -> List[Dict[str, str]]:
        """Extract SaaS features."""
        features = []
        
        feature_selectors = [
            ".feature",
            ".features > div",
            "[class*='feature-card']",
            ".benefit",
        ]
        
        for selector in feature_selectors:
            try:
                items = await page.locator(selector).all()
                for item in items[:10]:
                    title_el = item.locator("h2, h3, h4, .title").first
                    desc_el = item.locator("p").first
                    
                    title = await title_el.inner_text() if await title_el.count() > 0 else None
                    desc = await desc_el.inner_text() if await desc_el.count() > 0 else None
                    
                    if title:
                        features.append({
                            "title": title.strip(),
                            "description": desc.strip() if desc else None,
                        })
            except:
                continue
        
        return features[:10]
    
    async def _extract_testimonials(self, page: Page) -> List[Dict[str, str]]:
        """Extract customer testimonials."""
        testimonials = []
        
        selectors = [
            ".testimonial",
            ".review",
            "[class*='testimonial']",
            "blockquote",
        ]
        
        for selector in selectors:
            try:
                items = await page.locator(selector).all()
                for item in items[:5]:
                    text_el = item.locator("p, .quote, .text").first
                    author_el = item.locator(".author, .name, cite").first
                    
                    text = await text_el.inner_text() if await text_el.count() > 0 else None
                    author = await author_el.inner_text() if await author_el.count() > 0 else None
                    
                    if text:
                        testimonials.append({
                            "text": text.strip()[:500],
                            "author": author.strip() if author else None,
                        })
            except:
                continue
        
        return testimonials[:5]
    
    async def _extract_screenshots(self, page: Page, base_url: str) -> List[Dict[str, Any]]:
        """Extract product screenshots from SaaS site."""
        screenshots = []
        
        # Look for images in feature/demo sections
        selectors = [
            ".screenshot img",
            ".demo img",
            "[class*='product'] img",
            ".features img",
        ]
        
        for selector in selectors:
            try:
                items = await page.locator(selector).all()
                for item in items[:10]:
                    src = await item.get_attribute("src")
                    if src:
                        screenshots.append({
                            "url": urljoin(base_url, src),
                            "type": "screenshot",
                        })
            except:
                continue
        
        return screenshots
    
    async def _analyze_voice(
        self,
        page: Page,
        brand_assets: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze brand voice using AI (if available) or heuristics."""
        
        # Collect text content for analysis
        try:
            headings = await page.locator("h1, h2, h3").all_inner_texts()
            paragraphs = await page.locator("p").all_inner_texts()
            ctas = await page.locator("button, .btn, a.button").all_inner_texts()
        except:
            headings, paragraphs, ctas = [], [], []
        
        content = " ".join(headings[:5] + paragraphs[:10] + ctas[:5])
        
        # Default voice profile
        voice_profile = {
            "tone": "professional",
            "style": ["clear", "concise"],
            "keywords": [],
            "topics": [],
            "language_preferences": ["en"],
            "emoji_usage": "minimal",
            "cta_style": "direct",
        }
        
        # Analyze with GPT-4 if available
        if self._openai and content and len(content) > 100:
            try:
                response = await self._openai.chat.completions.create(
                    model="gpt-4-turbo-preview",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a brand voice analyst. Analyze the given content and extract the brand voice characteristics."
                        },
                        {
                            "role": "user",
                            "content": f"""Analyze this brand content and return a JSON object with:
- tone: one of (professional, casual, playful, bold, inspiring, friendly)
- style: array of 2-3 descriptors (e.g., concise, storytelling, data-driven)
- keywords: array of 5-10 key brand words
- topics: array of main topics/themes
- emoji_usage: one of (minimal, moderate, frequent)
- cta_style: one of (direct, soft, question)

Content to analyze:
{content[:2000]}

Return only valid JSON."""
                        }
                    ],
                    temperature=0.3,
                    max_tokens=500,
                )
                
                result_text = response.choices[0].message.content
                # Parse JSON from response
                import json
                # Find JSON in response
                json_match = re.search(r'\{[^{}]*\}', result_text, re.DOTALL)
                if json_match:
                    ai_voice = json.loads(json_match.group())
                    voice_profile.update(ai_voice)
                    
            except Exception as e:
                logger.warning(f"Voice analysis with AI failed: {e}")
        
        return voice_profile
    
    async def classify_images_with_vision(
        self,
        images: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Use GPT-4 Vision to classify scraped images.
        Only call for important images to minimize API costs.
        """
        if not self._openai or not images:
            return images
        
        classified_images = []
        
        for img in images[:10]:  # Limit to 10 for cost control
            try:
                response = await self._openai.chat.completions.create(
                    model="gpt-4-vision-preview",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Classify this image as one of: product, lifestyle, banner, logo, screenshot, person, other. Return just the category word."
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {"url": img["url"]}
                                }
                            ]
                        }
                    ],
                    max_tokens=20,
                )
                
                category = response.choices[0].message.content.strip().lower()
                img["type"] = category if category in ["product", "lifestyle", "banner", "logo", "screenshot", "person"] else "other"
                img["ai_classified"] = True
                
            except Exception as e:
                logger.debug(f"Vision classification failed for {img['url']}: {e}")
            
            classified_images.append(img)
        
        return classified_images + images[10:]


# Global scraper instance
web_scraper = WebScraper()
