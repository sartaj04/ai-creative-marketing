"""
Enhanced SaaS website scraper.
Extracts features, value propositions, testimonials, and screenshots.
"""
import asyncio
from typing import Dict, Any, List

from app.services.scraper.base import (
    BrowserPool, ScraperConfig, with_retry,
    extract_structured_data, extract_logo, extract_colors, extract_fonts
)


async def scrape_saas(url: str) -> Dict[str, Any]:
    """
    Scrape SaaS website for marketing content.
    
    Args:
        url: Website URL
    
    Returns:
        Dict with features, value props, testimonials, and assets
    """
    config = ScraperConfig(
        timeout=25000,
        wait_until="domcontentloaded"
    )
    
    pool = await BrowserPool.get_instance()
    
    async with pool.get_page(config) as page:
        # Navigate with retry
        async def navigate():
            await page.goto(url, wait_until=config.wait_until)
            # Scroll to trigger lazy loading
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight / 2)')
            await asyncio.sleep(0.5)
        
        await with_retry(navigate, max_retries=3)
        
        from urllib.parse import urlparse
        base_url = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        
        # Parallel extraction
        results = await asyncio.gather(
            extract_structured_data(page),
            extract_logo(page, base_url),
            extract_colors(page),
            extract_fonts(page),
            extract_hero(page),
            extract_features(page),
            extract_testimonials(page),
            extract_pricing(page),
            return_exceptions=True
        )
        
        structured_data, logo, colors, fonts, hero, features, testimonials, pricing = results
        
        # Handle exceptions
        if isinstance(structured_data, Exception): structured_data = {}
        if isinstance(logo, Exception): logo = None
        if isinstance(colors, Exception): colors = []
        if isinstance(fonts, Exception): fonts = []
        if isinstance(hero, Exception): hero = {}
        if isinstance(features, Exception): features = []
        if isinstance(testimonials, Exception): testimonials = []
        if isinstance(pricing, Exception): pricing = []
        
        # Extract brand info from structured data
        brand_name = None
        for item in structured_data.get("jsonLd", []):
            if isinstance(item, dict) and item.get("@type") in ["Organization", "WebSite", "SoftwareApplication"]:
                brand_name = item.get("name")
                break
        
        if not brand_name:
            brand_name = structured_data.get("openGraph", {}).get("site_name")
        
        return {
            "url": url,
            "brand_name": brand_name or urlparse(url).netloc.replace("www.", "").split(".")[0].title(),
            "logo_url": logo,
            "colors": colors,
            "fonts": fonts,
            "hero": hero,
            "features": features,
            "testimonials": testimonials,
            "pricing": pricing,
            "meta": {
                "title": structured_data.get("openGraph", {}).get("title"),
                "description": structured_data.get("openGraph", {}).get("description") or
                              structured_data.get("meta", {}).get("description"),
            }
        }


async def extract_hero(page) -> Dict[str, Any]:
    """Extract hero section content."""
    return await page.evaluate('''() => {
        // Find hero section
        const heroSelectors = [
            'section:first-of-type', '.hero', '[class*="hero"]', 
            'header + section', 'main > section:first-child',
            '[class*="banner"]', '.landing'
        ];
        
        let hero = null;
        for (const sel of heroSelectors) {
            hero = document.querySelector(sel);
            if (hero) break;
        }
        
        if (!hero) hero = document.body;
        
        // Extract headline
        const h1 = hero.querySelector('h1') || document.querySelector('h1');
        const headline = h1?.textContent?.trim();
        
        // Extract subheadline
        const subSelectors = ['h1 + p', 'h1 ~ p', '.hero p', '[class*="subtitle"]', '[class*="tagline"]'];
        let subheadline = null;
        for (const sel of subSelectors) {
            const el = hero.querySelector(sel) || document.querySelector(sel);
            if (el) {
                subheadline = el.textContent?.trim();
                break;
            }
        }
        
        // Extract CTA
        const ctaSelectors = ['a.btn, a[class*="button"]', 'button', '.cta a'];
        let cta = null;
        for (const sel of ctaSelectors) {
            const el = hero.querySelector(sel);
            if (el) {
                cta = el.textContent?.trim();
                break;
            }
        }
        
        return {
            headline: headline?.substring(0, 200),
            subheadline: subheadline?.substring(0, 300),
            cta: cta?.substring(0, 50)
        };
    }''')


async def extract_features(page) -> List[Dict[str, str]]:
    """Extract product features."""
    return await page.evaluate('''() => {
        const features = [];
        
        // Feature section selectors
        const sectionSelectors = [
            '[class*="feature"]', '#features', 
            'section:has([class*="feature"])',
            '[class*="benefit"]', '#benefits'
        ];
        
        let section = null;
        for (const sel of sectionSelectors) {
            try {
                section = document.querySelector(sel);
                if (section) break;
            } catch (e) {}
        }
        
        // Feature item selectors
        const itemSelectors = [
            '[class*="feature-item"]', '[class*="feature-card"]',
            '.feature', '[class*="benefit"]',
            'li:has(svg), li:has(i[class*="icon"])'
        ];
        
        const container = section || document;
        
        for (const sel of itemSelectors) {
            try {
                container.querySelectorAll(sel).forEach(el => {
                    const title = el.querySelector('h3, h4, strong, b')?.textContent?.trim();
                    const desc = el.querySelector('p')?.textContent?.trim();
                    
                    if (title || desc) {
                        features.push({
                            title: title?.substring(0, 100),
                            description: desc?.substring(0, 200)
                        });
                    }
                });
                
                if (features.length > 0) break;
            } catch (e) {}
        }
        
        // Fallback: look for lists
        if (features.length === 0) {
            document.querySelectorAll('ul li, ol li').forEach(li => {
                const text = li.textContent?.trim();
                if (text && text.length > 20 && text.length < 200 && !text.includes('©')) {
                    features.push({ title: text, description: null });
                }
            });
        }
        
        return features.slice(0, 10);
    }''')


async def extract_testimonials(page) -> List[Dict[str, str]]:
    """Extract customer testimonials."""
    return await page.evaluate('''() => {
        const testimonials = [];
        
        // Testimonial selectors
        const selectors = [
            '[class*="testimonial"]', '[class*="review"]',
            'blockquote', '[class*="quote"]',
            '[class*="customer-story"]'
        ];
        
        for (const sel of selectors) {
            document.querySelectorAll(sel).forEach(el => {
                const quote = el.querySelector('p, blockquote, [class*="text"]')?.textContent?.trim() ||
                             el.textContent?.trim();
                const author = el.querySelector('[class*="author"], [class*="name"], cite, figcaption')?.textContent?.trim();
                const role = el.querySelector('[class*="role"], [class*="title"], [class*="position"]')?.textContent?.trim();
                
                if (quote && quote.length > 30) {
                    testimonials.push({
                        quote: quote.substring(0, 300),
                        author: author?.substring(0, 50),
                        role: role?.substring(0, 50)
                    });
                }
            });
            
            if (testimonials.length > 0) break;
        }
        
        return testimonials.slice(0, 5);
    }''')


async def extract_pricing(page) -> List[Dict[str, Any]]:
    """Extract pricing information."""
    return await page.evaluate('''() => {
        const plans = [];
        
        // Pricing selectors
        const selectors = [
            '[class*="pricing-card"]', '[class*="plan"]',
            '[class*="tier"]', '[class*="package"]'
        ];
        
        for (const sel of selectors) {
            document.querySelectorAll(sel).forEach(el => {
                const name = el.querySelector('h3, h4, [class*="name"], [class*="title"]')?.textContent?.trim();
                const price = el.querySelector('[class*="price"], [class*="amount"]')?.textContent?.trim();
                const features = [...el.querySelectorAll('li, [class*="feature"]')]
                    .map(li => li.textContent?.trim())
                    .filter(t => t && t.length < 100)
                    .slice(0, 5);
                
                if (name || price) {
                    plans.push({
                        name: name?.substring(0, 50),
                        price: price?.substring(0, 50),
                        features
                    });
                }
            });
            
            if (plans.length > 0) break;
        }
        
        return plans.slice(0, 4);
    }''')
