"""
Enhanced website scraper for brand info extraction.
Extracts brand info, logos, hero images, and OG images using BeautifulSoup.
"""
import re
from typing import Optional, Dict, Any, List
from urllib.parse import urljoin, urlparse
import httpx
from bs4 import BeautifulSoup, Tag


def _normalize_url(url: str, base_url: str) -> Optional[str]:
    """
    Normalize a URL to absolute form.
    
    Args:
        url: The URL to normalize (can be relative, absolute, or protocol-relative)
        base_url: The base URL of the page being scraped
        
    Returns:
        Absolute URL string or None if invalid
    """
    if not url or not url.strip():
        return None
    
    url = url.strip()
    
    # Skip data URIs and javascript
    if url.startswith(('data:', 'javascript:', 'mailto:', '#')):
        return None
    
    # Handle protocol-relative URLs
    if url.startswith('//'):
        return 'https:' + url
    
    # Already absolute
    if url.startswith(('http://', 'https://')):
        return url
    
    # Relative URL - join with base
    return urljoin(base_url, url)


def _get_image_type(url: str) -> str:
    """
    Determine image type from URL.
    
    Returns:
        Image type string (svg, png, jpg, gif, ico, webp, or unknown)
    """
    if not url:
        return "unknown"
    
    # Handle data URIs
    if url.startswith('data:image/svg'):
        return "svg"
    if url.startswith('data:image/png'):
        return "png"
    if url.startswith('data:image/'):
        match = re.match(r'data:image/(\w+)', url)
        return match.group(1) if match else "unknown"
    
    # Parse from URL path
    parsed = urlparse(url)
    path = parsed.path.lower()
    
    if '.svg' in path:
        return "svg"
    elif '.png' in path:
        return "png"
    elif '.jpg' in path or '.jpeg' in path:
        return "jpg"
    elif '.gif' in path:
        return "gif"
    elif '.ico' in path:
        return "ico"
    elif '.webp' in path:
        return "webp"
    
    return "unknown"


def _extract_logo(soup: BeautifulSoup, base_url: str) -> Dict[str, Any]:
    """
    Extract brand logo with confidence scoring.
    
    Priority order:
    1. og:logo meta tag
    2. link rel="icon" / rel="apple-touch-icon"
    3. img tags with logo-related class/id
    4. Header/navbar img elements
    5. SVG logos
    6. og:image as fallback
    
    Returns:
        Dict with url, type, and confidence
    """
    result = {"url": None, "type": None, "confidence": 0.0}
    
    # 1. Check for og:logo (highest confidence)
    og_logo = soup.find("meta", property="og:logo")
    if og_logo and og_logo.get("content"):
        url = _normalize_url(og_logo["content"], base_url)
        if url:
            return {"url": url, "type": _get_image_type(url), "confidence": 1.0}
    
    # 2. Check link rel="icon" or "apple-touch-icon"
    icon_selectors = [
        ("link", {"rel": "apple-touch-icon"}),
        ("link", {"rel": "apple-touch-icon-precomposed"}),
        ("link", {"rel": "icon"}),
        ("link", {"rel": "shortcut icon"}),
    ]
    
    for tag, attrs in icon_selectors:
        icon = soup.find(tag, attrs)
        if icon and icon.get("href"):
            url = _normalize_url(icon["href"], base_url)
            if url:
                # apple-touch-icon is usually higher quality
                confidence = 0.8 if "apple" in str(attrs.get("rel", "")) else 0.7
                return {"url": url, "type": _get_image_type(url), "confidence": confidence}
    
    # 3. Check for img tags with logo-related class/id
    logo_patterns = ['logo', 'brand', 'navbar-logo', 'site-logo', 'header-logo']
    
    for pattern in logo_patterns:
        # Check by class
        img = soup.find("img", class_=re.compile(pattern, re.I))
        if img:
            url = _get_img_src(img, base_url)
            if url:
                return {"url": url, "type": _get_image_type(url), "confidence": 0.85}
        
        # Check by id
        img = soup.find("img", id=re.compile(pattern, re.I))
        if img:
            url = _get_img_src(img, base_url)
            if url:
                return {"url": url, "type": _get_image_type(url), "confidence": 0.85}
    
    # Also check for alt attribute containing logo
    img = soup.find("img", alt=re.compile(r'logo', re.I))
    if img:
        url = _get_img_src(img, base_url)
        if url:
            return {"url": url, "type": _get_image_type(url), "confidence": 0.75}
    
    # 4. Check header/navbar for first img
    header_selectors = ['header', 'nav', '.navbar', '.header', '#header', '.nav']
    for selector in header_selectors:
        container = soup.select_one(selector)
        if container:
            img = container.find("img")
            if img:
                url = _get_img_src(img, base_url)
                if url:
                    return {"url": url, "type": _get_image_type(url), "confidence": 0.6}
    
    # 5. Check for inline SVG in header/logo containers
    for pattern in logo_patterns:
        container = soup.find(class_=re.compile(pattern, re.I))
        if container:
            svg = container.find("svg")
            if svg:
                # Serialize SVG to data URI
                try:
                    import base64
                    svg_str = str(svg)
                    svg_data = base64.b64encode(svg_str.encode()).decode()
                    data_url = f"data:image/svg+xml;base64,{svg_data}"
                    return {"url": data_url, "type": "svg", "confidence": 0.7}
                except:
                    pass
    
    # 6. Fallback to og:image (lowest confidence for logo)
    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        url = _normalize_url(og_image["content"], base_url)
        if url:
            return {"url": url, "type": _get_image_type(url), "confidence": 0.3}
    
    return result


def _get_img_src(img: Tag, base_url: str) -> Optional[str]:
    """
    Get image source, handling lazy-loaded images.
    
    Checks: src, data-src, data-lazy, data-original, srcset
    """
    # Priority: data-src attributes (lazy loaded) first if src is placeholder
    src = img.get("src", "")
    
    # Check if src is a placeholder
    is_placeholder = (
        not src or 
        'placeholder' in src.lower() or 
        'data:image/gif' in src.lower() or
        'blank' in src.lower() or
        '1x1' in src
    )
    
    # Try lazy-load attributes
    lazy_attrs = ["data-src", "data-lazy", "data-original", "data-lazy-src"]
    for attr in lazy_attrs:
        lazy_src = img.get(attr)
        if lazy_src:
            url = _normalize_url(lazy_src, base_url)
            if url:
                return url
    
    # Try srcset (get first/largest)
    srcset = img.get("srcset")
    if srcset:
        # Parse srcset and get the largest
        parts = srcset.split(",")
        if parts:
            # Get first entry
            first = parts[0].strip().split()[0]
            url = _normalize_url(first, base_url)
            if url:
                return url
    
    # Use regular src if not placeholder
    if src and not is_placeholder:
        return _normalize_url(src, base_url)
    
    return None


def _extract_hero_images(soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
    """
    Extract hero/product images suitable for ad creatives.
    
    Filters out icons, sprites, and decorative images.
    
    Returns:
        List of dicts with url, width, height, alt, and context
    """
    images = []
    seen_urls = set()
    
    # Define container contexts with priority
    context_selectors = [
        ("hero", [".hero", "#hero", "[class*='hero']", "section.hero"]),
        ("banner", [".banner", "#banner", "[class*='banner']"]),
        ("featured", [".featured", "#featured", "[class*='featured']"]),
        ("product", [".product", "#product", "[class*='product-image']", "[class*='product-hero']"]),
        ("main", ["main", "article", "section"]),
    ]
    
    def is_valid_hero_image(img: Tag) -> bool:
        """Check if image is likely a hero/content image, not an icon."""
        # Check dimensions if available
        width = img.get("width", "")
        height = img.get("height", "")
        
        try:
            w = int(re.sub(r'\D', '', str(width))) if width else 0
            h = int(re.sub(r'\D', '', str(height))) if height else 0
            
            # Skip tiny images (likely icons)
            if (w > 0 and w < 50) or (h > 0 and h < 50):
                return False
        except:
            pass
        
        # Check class/id for icon indicators
        classes = " ".join(img.get("class", []))
        img_id = img.get("id", "")
        combined = f"{classes} {img_id}".lower()
        
        skip_patterns = ['icon', 'sprite', 'avatar', 'emoji', 'badge', 'thumbnail', 'thumb']
        for pattern in skip_patterns:
            if pattern in combined:
                return False
        
        # Check src for icon indicators
        src = str(img.get("src", "")).lower()
        if any(p in src for p in ['icon', 'sprite', '16x16', '32x32', 'emoji']):
            return False
        
        return True
    
    def add_image(img: Tag, context: str):
        """Add image to results if valid."""
        if not is_valid_hero_image(img):
            return
        
        url = _get_img_src(img, base_url)
        if not url or url in seen_urls:
            return
        
        seen_urls.add(url)
        
        # Get dimensions
        width = img.get("width")
        height = img.get("height")
        
        try:
            w = int(re.sub(r'\D', '', str(width))) if width else None
            h = int(re.sub(r'\D', '', str(height))) if height else None
        except:
            w, h = None, None
        
        images.append({
            "url": url,
            "width": w,
            "height": h,
            "alt": img.get("alt", ""),
            "context": context
        })
    
    # Search in priority order
    for context, selectors in context_selectors:
        for selector in selectors:
            try:
                containers = soup.select(selector)
                for container in containers:
                    for img in container.find_all("img", limit=3):
                        add_image(img, context)
            except:
                continue
        
        # Stop if we have enough images
        if len(images) >= 5:
            break
    
    # If no images found, try first large images on page
    if not images:
        for img in soup.find_all("img", limit=20):
            add_image(img, "general")
            if len(images) >= 5:
                break
    
    return images[:5]


def _extract_og_images(soup: BeautifulSoup, base_url: str) -> List[str]:
    """
    Extract Open Graph and Twitter card images.
    
    Returns:
        List of unique image URLs
    """
    og_images = []
    seen = set()
    
    # OG image tags to check
    og_selectors = [
        ("meta", {"property": "og:image"}),
        ("meta", {"property": "og:image:url"}),
        ("meta", {"property": "og:image:secure_url"}),
        ("meta", {"name": "twitter:image"}),
        ("meta", {"name": "twitter:image:src"}),
    ]
    
    for tag, attrs in og_selectors:
        meta = soup.find(tag, attrs)
        if meta and meta.get("content"):
            url = _normalize_url(meta["content"], base_url)
            if url and url not in seen:
                seen.add(url)
                og_images.append(url)
    
    return og_images


async def scrape_website(url: str) -> Optional[dict]:
    """
    Scrape a website to extract brand information, logos, and images.
    
    Returns:
        dict with brand_name, description, colors, keywords, url,
        logo, hero_images, and og_images
    """
    # Default fallback response
    fallback = {
        "brand_name": "Your Brand",
        "description": "",
        "colors": ["#f97316", "#3b82f6"],
        "keywords": [],
        "url": url,
        "logo": {"url": None, "type": None, "confidence": 0.0},
        "hero_images": [],
        "og_images": []
    }
    
    try:
        async with httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
            html = response.text
        
        soup = BeautifulSoup(html, "lxml")
        
        # Extract brand name from various sources
        brand_name = None
        
        # Try meta og:site_name
        og_site = soup.find("meta", property="og:site_name")
        if og_site and og_site.get("content"):
            brand_name = og_site["content"]
        
        # Try og:title
        if not brand_name:
            og_title = soup.find("meta", property="og:title")
            if og_title and og_title.get("content"):
                brand_name = og_title["content"].split("|")[0].split("-")[0].strip()
        
        # Try regular title
        if not brand_name:
            title_tag = soup.find("title")
            if title_tag:
                brand_name = title_tag.get_text().split("|")[0].split("-")[0].strip()
        
        # Fallback to domain name
        if not brand_name:
            parsed = urlparse(url)
            brand_name = parsed.netloc.replace("www.", "").split(".")[0].title()
        
        # Extract description
        description = ""
        
        # Try meta description
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            description = meta_desc["content"]
        
        # Try og:description
        if not description:
            og_desc = soup.find("meta", property="og:description")
            if og_desc and og_desc.get("content"):
                description = og_desc["content"]
        
        # Fallback to first paragraph
        if not description:
            first_p = soup.find("p")
            if first_p:
                description = first_p.get_text()[:200]
        
        # Extract colors from inline styles and CSS
        colors = []
        
        # Look for hex colors in style attributes
        style_text = " ".join([str(tag.get("style", "")) for tag in soup.find_all(style=True)])
        hex_colors = re.findall(r'#(?:[0-9a-fA-F]{3}){1,2}', style_text)
        
        # Also check for CSS in style tags
        for style_tag in soup.find_all("style"):
            style_content = style_tag.string or ""
            hex_colors.extend(re.findall(r'#(?:[0-9a-fA-F]{3}){1,2}', style_content))
        
        # Remove duplicates and common boring colors
        boring_colors = {"#fff", "#ffffff", "#000", "#000000", "#333", "#333333", "#ccc", "#cccccc"}
        colors = list(set([c.lower() for c in hex_colors if c.lower() not in boring_colors]))[:5]
        
        # Default colors if none found
        if not colors:
            colors = ["#f97316", "#3b82f6"]
        
        # Extract keywords/tags
        keywords = []
        meta_keywords = soup.find("meta", attrs={"name": "keywords"})
        if meta_keywords and meta_keywords.get("content"):
            keywords = [k.strip() for k in meta_keywords["content"].split(",")][:5]
        
        # NEW: Extract logo with confidence scoring
        logo = _extract_logo(soup, url)
        
        # NEW: Extract hero/product images
        hero_images = _extract_hero_images(soup, url)
        
        # NEW: Extract OG/social images
        og_images = _extract_og_images(soup, url)
        
        return {
            "brand_name": brand_name or "Your Brand",
            "description": description[:500] if description else "",
            "colors": colors,
            "keywords": keywords,
            "url": url,
            "logo": logo,
            "hero_images": hero_images,
            "og_images": og_images
        }
        
    except Exception as e:
        print(f"Scraping error: {e}")
        return fallback
