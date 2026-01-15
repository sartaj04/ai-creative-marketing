"""
Simple website scraper for demo purposes.
Extracts basic brand info using BeautifulSoup (faster than Playwright for demo).
"""
import re
from typing import Optional
import httpx
from bs4 import BeautifulSoup


async def scrape_website(url: str) -> Optional[dict]:
    """
    Scrape a website to extract basic brand information.
    
    Returns:
        dict with brand_name, description, colors, etc.
    """
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
            from urllib.parse import urlparse
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
        
        return {
            "brand_name": brand_name or "Your Brand",
            "description": description[:500] if description else "",
            "colors": colors,
            "keywords": keywords,
            "url": url
        }
        
    except Exception as e:
        print(f"Scraping error: {e}")
        return {
            "brand_name": "Your Brand",
            "description": "",
            "colors": ["#f97316", "#3b82f6"],
            "keywords": [],
            "url": url
        }
