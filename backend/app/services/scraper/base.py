"""
Robust base scraper with browser pooling, retries, and structured data extraction.
"""
import asyncio
import re
import json
from typing import Dict, Any, Optional, List, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse

from playwright.async_api import async_playwright, Browser, Page, TimeoutError as PlaywrightTimeout


@dataclass
class ScraperConfig:
    """Scraper configuration."""
    timeout: int = 30000  # 30 seconds
    wait_until: str = "domcontentloaded"  # Faster than networkidle
    max_retries: int = 3
    retry_delay: float = 1.0
    viewport_width: int = 1280
    viewport_height: int = 720
    user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


class BrowserPool:
    """
    Singleton browser pool for efficient resource management.
    Reuses browser instances across scraping requests.
    """
    _instance: Optional['BrowserPool'] = None
    _lock = asyncio.Lock()
    
    def __init__(self):
        self._browser: Optional[Browser] = None
        self._playwright = None
        self._page_count = 0
        self._max_pages = 10  # Max concurrent pages
    
    @classmethod
    async def get_instance(cls) -> 'BrowserPool':
        """Get or create the singleton instance."""
        async with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
                await cls._instance._initialize()
            return cls._instance
    
    async def _initialize(self):
        """Initialize Playwright and browser."""
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
            ]
        )
    
    @asynccontextmanager
    async def get_page(self, config: ScraperConfig = None):
        """Get a page from the pool."""
        config = config or ScraperConfig()
        
        if self._browser is None:
            await self._initialize()
        
        context = await self._browser.new_context(
            viewport={'width': config.viewport_width, 'height': config.viewport_height},
            user_agent=config.user_agent,
            ignore_https_errors=True,
        )
        
        # Block unnecessary resources for speed
        await context.route("**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,ttf,eot}", 
                           lambda route: route.abort())
        await context.route("**/*google*analytics*", lambda route: route.abort())
        await context.route("**/*facebook*", lambda route: route.abort())
        await context.route("**/*hotjar*", lambda route: route.abort())
        
        page = await context.new_page()
        page.set_default_timeout(config.timeout)
        
        try:
            yield page
        finally:
            await context.close()
    
    async def close(self):
        """Close browser and playwright."""
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
        BrowserPool._instance = None


async def with_retry(
    func: Callable,
    max_retries: int = 3,
    delay: float = 1.0,
    exceptions: tuple = (Exception,)
) -> Any:
    """Execute function with retry logic."""
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            return await func()
        except exceptions as e:
            last_exception = e
            if attempt < max_retries - 1:
                await asyncio.sleep(delay * (attempt + 1))
    
    raise last_exception


async def extract_structured_data(page: Page) -> Dict[str, Any]:
    """
    Extract structured data from JSON-LD, Open Graph, and Schema.org.
    This is the most reliable source of information.
    """
    return await page.evaluate('''() => {
        const result = {
            jsonLd: [],
            openGraph: {},
            meta: {},
            schemaOrg: null
        };
        
        // Extract JSON-LD (most reliable)
        document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                result.jsonLd.push(data);
            } catch (e) {}
        });
        
        // Extract Open Graph
        document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
            const prop = meta.getAttribute('property').replace('og:', '');
            result.openGraph[prop] = meta.content;
        });
        
        // Extract other meta
        document.querySelectorAll('meta[name]').forEach(meta => {
            result.meta[meta.name] = meta.content;
        });
        
        return result;
    }''')


async def detect_platform(page: Page) -> str:
    """
    Detect the e-commerce platform.
    """
    return await page.evaluate('''() => {
        // Shopify
        if (window.Shopify || document.querySelector('[data-shopify]') || 
            document.querySelector('link[href*="cdn.shopify"]')) {
            return 'shopify';
        }
        
        // WooCommerce
        if (document.body.classList.contains('woocommerce') || 
            document.querySelector('.woocommerce') ||
            document.querySelector('[class*="wc-"]')) {
            return 'woocommerce';
        }
        
        // Magento
        if (window.require?.s?.contexts?._.config?.baseUrl?.includes('static') ||
            document.querySelector('[data-mage-init]')) {
            return 'magento';
        }
        
        // BigCommerce
        if (window.BCData || document.querySelector('[data-bc]')) {
            return 'bigcommerce';
        }
        
        // Squarespace
        if (window.Static?.SQUARESPACE_CONTEXT || 
            document.querySelector('[data-squarespace-cacheversion]')) {
            return 'squarespace';
        }
        
        // Wix
        if (window.wixBiSession || document.querySelector('[data-wix]')) {
            return 'wix';
        }
        
        return 'unknown';
    }''')


async def extract_logo(page: Page, base_url: str) -> Optional[str]:
    """
    Extract logo URL with multiple fallback strategies.
    """
    logo = await page.evaluate('''(baseUrl) => {
        const strategies = [
            // 1. Common logo selectors
            () => document.querySelector('header img[src*="logo"], .logo img, #logo img, [class*="logo"] img')?.src,
            () => document.querySelector('header a img, nav a img')?.src,
            () => document.querySelector('img[alt*="logo" i], img[class*="logo" i]')?.src,
            
            // 2. SVG logos
            () => {
                const svg = document.querySelector('header svg, .logo svg, [class*="logo"] svg');
                if (svg) {
                    const serializer = new XMLSerializer();
                    const svgStr = serializer.serializeToString(svg);
                    return 'data:image/svg+xml;base64,' + btoa(svgStr);
                }
                return null;
            },
            
            // 3. Link rel icon
            () => document.querySelector('link[rel*="icon"]')?.href,
            
            // 4. Open Graph image (often logo for homepage)
            () => document.querySelector('meta[property="og:image"]')?.content,
            
            // 5. First image in header
            () => document.querySelector('header img')?.src,
        ];
        
        for (const strategy of strategies) {
            try {
                const result = strategy();
                if (result && !result.includes('data:image/gif')) {
                    // Make absolute URL
                    if (result.startsWith('//')) return 'https:' + result;
                    if (result.startsWith('/')) return new URL(result, baseUrl).href;
                    return result;
                }
            } catch (e) {}
        }
        
        return null;
    }''', base_url)
    
    return logo


async def extract_colors(page: Page) -> List[str]:
    """
    Extract brand colors from CSS custom properties and computed styles.
    """
    colors = await page.evaluate('''() => {
        const colors = new Set();
        
        // 1. CSS Custom Properties (most reliable for brand colors)
        const root = getComputedStyle(document.documentElement);
        const cssVars = [
            '--primary-color', '--primary', '--brand-color', '--brand',
            '--accent-color', '--accent', '--main-color', '--theme-color',
            '--color-primary', '--color-brand', '--color-accent'
        ];
        
        cssVars.forEach(varName => {
            const value = root.getPropertyValue(varName).trim();
            if (value && value !== '') colors.add(value);
        });
        
        // 2. Extract from key elements
        const selectors = ['header', 'nav', '.navbar', '.header', 'a.btn', 'button.primary', '.btn-primary'];
        selectors.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) {
                const style = getComputedStyle(el);
                if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                    colors.add(style.backgroundColor);
                }
            }
        });
        
        // 3. Button and link colors
        document.querySelectorAll('a[class*="btn"], button[class*="primary"], .cta').forEach(el => {
            const style = getComputedStyle(el);
            if (style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                colors.add(style.backgroundColor);
            }
        });
        
        // Convert to hex
        const toHex = (color) => {
            if (color.startsWith('#')) return color;
            if (color.startsWith('rgb')) {
                const match = color.match(/\\d+/g);
                if (match && match.length >= 3) {
                    return '#' + match.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
                }
            }
            return null;
        };
        
        return [...colors].map(toHex).filter(c => c && c.length === 7);
    }''')
    
    # Filter out blacks/whites and duplicates
    filtered = []
    seen = set()
    for color in colors:
        if color and color.lower() not in ['#000000', '#ffffff', '#fff', '#000']:
            if color.lower() not in seen:
                seen.add(color.lower())
                filtered.append(color)
    
    return filtered[:5]  # Max 5 colors


async def extract_fonts(page: Page) -> List[str]:
    """
    Extract font families used on the page.
    """
    fonts = await page.evaluate('''() => {
        const fonts = new Set();
        
        // Check key elements
        const elements = ['body', 'h1', 'h2', 'p', 'header', 'nav'];
        elements.forEach(tag => {
            const el = document.querySelector(tag);
            if (el) {
                const family = getComputedStyle(el).fontFamily;
                // Get first font in stack
                const primary = family.split(',')[0].trim().replace(/['"]/g, '');
                if (primary && !primary.includes('system') && !primary.includes('emoji')) {
                    fonts.add(primary);
                }
            }
        });
        
        // Check @font-face
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    if (rule.type === CSSRule.FONT_FACE_RULE) {
                        const family = rule.style.fontFamily?.replace(/['"]/g, '');
                        if (family) fonts.add(family);
                    }
                }
            } catch (e) {}
        }
        
        return [...fonts];
    }''')
    
    # Filter common system fonts
    system_fonts = {'arial', 'helvetica', 'times', 'georgia', 'verdana', 'sans-serif', 'serif', 'monospace'}
    return [f for f in fonts if f.lower() not in system_fonts][:5]
