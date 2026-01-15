"""
Enhanced e-commerce scraper with platform-specific extraction.
Optimized for speed and reliability.
"""
import asyncio
from typing import Dict, Any, List, Optional
from urllib.parse import urljoin, urlparse

from app.services.scraper.base import (
    BrowserPool, ScraperConfig, with_retry,
    extract_structured_data, detect_platform,
    extract_logo, extract_colors, extract_fonts
)


async def scrape_ecommerce(url: str, max_products: int = 20) -> Dict[str, Any]:
    """
    Scrape e-commerce website with optimized extraction.
    
    Args:
        url: Website URL
        max_products: Maximum products to extract
    
    Returns:
        Dict with logo, colors, fonts, products, and metadata
    """
    config = ScraperConfig(
        timeout=25000,
        wait_until="domcontentloaded"  # Faster than networkidle
    )
    
    pool = await BrowserPool.get_instance()
    
    async with pool.get_page(config) as page:
        # Navigate with retry
        async def navigate():
            await page.goto(url, wait_until=config.wait_until)
        
        await with_retry(navigate, max_retries=3)
        
        # Parallel extraction for speed
        base_url = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        
        # Run extractions in parallel
        results = await asyncio.gather(
            extract_structured_data(page),
            detect_platform(page),
            extract_logo(page, base_url),
            extract_colors(page),
            extract_fonts(page),
            return_exceptions=True
        )
        
        structured_data, platform, logo, colors, fonts = results
        
        # Handle any exceptions
        if isinstance(structured_data, Exception):
            structured_data = {"jsonLd": [], "openGraph": {}, "meta": {}}
        if isinstance(platform, Exception):
            platform = "unknown"
        if isinstance(logo, Exception):
            logo = None
        if isinstance(colors, Exception):
            colors = []
        if isinstance(fonts, Exception):
            fonts = []
        
        # Extract products using platform-specific selectors
        products = await extract_products(page, platform, base_url, max_products)
        
        # Extract from structured data
        brand_name = extract_brand_from_structured(structured_data, url)
        
        return {
            "url": url,
            "platform": platform,
            "brand_name": brand_name,
            "logo_url": logo,
            "colors": colors,
            "fonts": fonts,
            "products": products,
            "structured_data": structured_data,
            "meta": {
                "title": structured_data.get("meta", {}).get("title") or structured_data.get("openGraph", {}).get("title"),
                "description": structured_data.get("meta", {}).get("description") or structured_data.get("openGraph", {}).get("description"),
            }
        }


async def extract_products(page, platform: str, base_url: str, max_products: int) -> List[Dict[str, Any]]:
    """
    Extract products with platform-specific selectors.
    """
    # Platform-specific configurations
    platform_configs = {
        "shopify": {
            "container": '.product-card, .product-grid-item, [data-product-id], .grid__item .card',
            "title": '.product-card__title, .card__heading, h3, h2, .title',
            "price": '.price, .product-price, [data-product-price], .money',
            "image": 'img[data-src], img.lazyload, img',
            "link": 'a[href*="/products/"]'
        },
        "woocommerce": {
            "container": '.product, .wc-block-grid__product, li.product',
            "title": '.woocommerce-loop-product__title, h2, .product-title',
            "price": '.price, .woocommerce-Price-amount',
            "image": 'img',
            "link": 'a.woocommerce-loop-product__link, a'
        },
        "magento": {
            "container": '.product-item, .item.product',
            "title": '.product-item-link, .product-name',
            "price": '.price, .price-box .price',
            "image": 'img.product-image-photo, img',
            "link": 'a.product-item-link'
        },
        "default": {
            "container": '[class*="product"], [data-product], .item, .card',
            "title": 'h2, h3, .title, .name, [class*="title"], [class*="name"]',
            "price": '[class*="price"], .amount, .cost',
            "image": 'img',
            "link": 'a'
        }
    }
    
    config = platform_configs.get(platform, platform_configs["default"])
    
    products = await page.evaluate('''(config, baseUrl, maxProducts) => {
        const products = [];
        const containers = document.querySelectorAll(config.container);
        
        for (let i = 0; i < Math.min(containers.length, maxProducts); i++) {
            const el = containers[i];
            
            // Title
            const titleEl = el.querySelector(config.title);
            const title = titleEl?.textContent?.trim();
            
            // Price
            const priceEl = el.querySelector(config.price);
            let price = priceEl?.textContent?.trim();
            // Clean price
            if (price) {
                price = price.replace(/\\s+/g, ' ').split(' ')[0];
            }
            
            // Image
            const imgEl = el.querySelector(config.image);
            let image = imgEl?.dataset?.src || imgEl?.src;
            if (image) {
                if (image.startsWith('//')) image = 'https:' + image;
                else if (image.startsWith('/')) image = new URL(image, baseUrl).href;
            }
            
            // Link
            const linkEl = el.querySelector(config.link);
            let link = linkEl?.href;
            if (link && link.startsWith('/')) {
                link = new URL(link, baseUrl).href;
            }
            
            if (title && (image || price)) {
                products.push({
                    title: title.substring(0, 100),
                    price: price?.substring(0, 50),
                    image_url: image,
                    link: link
                });
            }
        }
        
        return products;
    }''', config, base_url, max_products)
    
    # Try JSON-LD fallback if no products found
    if not products:
        products = await extract_products_from_jsonld(page, base_url)
    
    return products


async def extract_products_from_jsonld(page, base_url: str) -> List[Dict[str, Any]]:
    """
    Extract products from JSON-LD structured data.
    Most reliable for Shopify and well-structured sites.
    """
    return await page.evaluate('''(baseUrl) => {
        const products = [];
        
        document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                
                // Handle Product type
                const processProduct = (item) => {
                    if (item['@type'] === 'Product' || item['@type']?.includes('Product')) {
                        const offer = item.offers?.[0] || item.offers || {};
                        products.push({
                            title: item.name?.substring(0, 100),
                            price: offer.price ? `${offer.priceCurrency || '₹'}${offer.price}` : null,
                            image_url: Array.isArray(item.image) ? item.image[0] : item.image,
                            link: item.url
                        });
                    }
                };
                
                // Check if array or object
                if (Array.isArray(data)) {
                    data.forEach(processProduct);
                } else if (data['@graph']) {
                    data['@graph'].forEach(processProduct);
                } else {
                    processProduct(data);
                }
            } catch (e) {}
        });
        
        return products.slice(0, 20);
    }''', base_url)


def extract_brand_from_structured(structured_data: Dict, fallback_url: str) -> str:
    """
    Extract brand name from structured data or URL.
    """
    # Try JSON-LD
    for item in structured_data.get("jsonLd", []):
        if isinstance(item, dict):
            # Organization or WebSite
            if item.get("@type") in ["Organization", "WebSite"]:
                if item.get("name"):
                    return item["name"]
            
            # Product brand
            if item.get("brand", {}).get("name"):
                return item["brand"]["name"]
    
    # Try Open Graph
    og = structured_data.get("openGraph", {})
    if og.get("site_name"):
        return og["site_name"]
    
    # Fallback to domain
    from urllib.parse import urlparse
    domain = urlparse(fallback_url).netloc
    return domain.replace("www.", "").split(".")[0].title()


async def scrape_product_page(url: str) -> Dict[str, Any]:
    """
    Scrape a single product page for detailed information.
    """
    config = ScraperConfig(timeout=20000)
    pool = await BrowserPool.get_instance()
    
    async with pool.get_page(config) as page:
        await page.goto(url, wait_until="domcontentloaded")
        
        # Extract from JSON-LD first (most reliable)
        structured = await extract_structured_data(page)
        
        for item in structured.get("jsonLd", []):
            if isinstance(item, dict) and item.get("@type") == "Product":
                offer = item.get("offers", {})
                if isinstance(offer, list):
                    offer = offer[0] if offer else {}
                
                return {
                    "title": item.get("name"),
                    "description": item.get("description"),
                    "price": offer.get("price"),
                    "currency": offer.get("priceCurrency", "INR"),
                    "image_urls": item.get("image") if isinstance(item.get("image"), list) else [item.get("image")],
                    "brand": item.get("brand", {}).get("name"),
                    "sku": item.get("sku"),
                    "availability": offer.get("availability"),
                }
        
        # Fallback to DOM extraction
        return await page.evaluate('''() => {
            return {
                title: document.querySelector('h1, .product-title, [class*="product-name"]')?.textContent?.trim(),
                description: document.querySelector('[class*="description"], .product-description')?.textContent?.trim()?.substring(0, 500),
                price: document.querySelector('[class*="price"]:not([class*="compare"])')?.textContent?.trim(),
                image_urls: [...document.querySelectorAll('.product-image img, [class*="gallery"] img, [class*="product"] img')]
                    .map(img => img.dataset.src || img.src)
                    .filter(Boolean)
                    .slice(0, 5)
            };
        }''')
