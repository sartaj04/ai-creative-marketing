"""Article scraping and extraction service."""
import logging
import re
from typing import Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Common content selectors in order of preference
CONTENT_SELECTORS = [
    'article',
    '[role="main"]',
    'main',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#content',
    '.post-body',
    '.article-body',
]

# Elements to remove
REMOVE_SELECTORS = [
    'script',
    'style',
    'nav',
    'header',
    'footer',
    'aside',
    '.sidebar',
    '.comments',
    '.advertisement',
    '.ad',
    '.social-share',
    '.related-posts',
    'iframe',
]


def clean_text(text: str) -> str:
    """Clean extracted text."""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove special characters that don't add value
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    return text.strip()


def validate_url(url: str) -> bool:
    """Validate URL format."""
    try:
        result = urlparse(url)
        return all([result.scheme in ('http', 'https'), result.netloc])
    except Exception:
        return False


async def scrape_article(url: str) -> dict:
    """Scrape article content from a URL.
    
    Args:
        url: Article URL
        
    Returns:
        dict with 'title', 'content', 'url'
        
    Raises:
        ValueError: If URL is invalid or content cannot be extracted
    """
    if not validate_url(url):
        raise ValueError("Invalid URL format. Must be a valid HTTP/HTTPS URL.")
    
    try:
        async with httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={
                'User-Agent': 'Mozilla/5.0 (compatible; ContentBot/1.0)',
                'Accept': 'text/html,application/xhtml+xml',
            }
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
            
    except httpx.TimeoutException:
        raise ValueError("Request timed out. The website may be slow or unavailable.")
    except httpx.HTTPStatusError as e:
        raise ValueError(f"HTTP error {e.response.status_code}: Could not access the article.")
    except Exception as e:
        logger.error(f"Error fetching article: {e}")
        raise ValueError(f"Failed to fetch article: {str(e)}")
    
    # Parse HTML
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Remove unwanted elements
    for selector in REMOVE_SELECTORS:
        for element in soup.select(selector):
            element.decompose()
    
    # Extract title
    title = None
    title_tag = soup.find('h1') or soup.find('title')
    if title_tag:
        title = clean_text(title_tag.get_text())
    
    # Try to find main content
    content = None
    for selector in CONTENT_SELECTORS:
        content_elem = soup.select_one(selector)
        if content_elem:
            content = clean_text(content_elem.get_text())
            if len(content) > 200:  # Minimum content threshold
                break
    
    # Fallback to body if no content found
    if not content or len(content) < 200:
        body = soup.find('body')
        if body:
            content = clean_text(body.get_text())
    
    if not content or len(content) < 100:
        raise ValueError("Could not extract meaningful content from this article.")
    
    # Limit content length for LLM processing
    if len(content) > 10000:
        content = content[:10000] + "..."
    
    logger.info(f"Extracted article from {url}: {len(content)} chars")
    
    return {
        'title': title or 'Untitled Article',
        'content': content,
        'url': url,
    }
