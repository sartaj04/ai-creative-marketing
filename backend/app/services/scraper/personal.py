"""
Personal brand scraper for LinkedIn and Twitter profiles.
Extracts voice profile, themes, and content samples.
"""
import asyncio
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

from app.services.scraper.base import (
    BrowserPool, ScraperConfig, with_retry
)


async def scrape_personal(url: str) -> Dict[str, Any]:
    """
    Scrape personal brand from LinkedIn or Twitter profile.
    
    Note: Direct scraping of LinkedIn/Twitter requires authentication.
    This implementation focuses on what's publicly accessible or
    uses API integration when available.
    
    Args:
        url: Profile URL (LinkedIn, Twitter, or personal website)
    
    Returns:
        Dict with bio, themes, content samples, and voice profile
    """
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    
    # Route to appropriate scraper
    if 'linkedin.com' in domain:
        return await scrape_linkedin_public(url)
    elif 'twitter.com' in domain or 'x.com' in domain:
        return await scrape_twitter_public(url)
    else:
        # Personal website
        return await scrape_personal_website(url)


async def scrape_linkedin_public(url: str) -> Dict[str, Any]:
    """
    Scrape publicly visible LinkedIn profile data.
    Limited without authentication.
    """
    config = ScraperConfig(
        timeout=30000,
        wait_until="networkidle"  # LinkedIn needs full load
    )
    
    pool = await BrowserPool.get_instance()
    
    async with pool.get_page(config) as page:
        try:
            await page.goto(url, wait_until=config.wait_until)
            
            # Wait for main content
            await page.wait_for_selector('main, .core-rail', timeout=10000)
            
            # Extract visible data
            data = await page.evaluate('''() => {
                // Name
                const name = document.querySelector('h1, .text-heading-xlarge')?.textContent?.trim();
                
                // Headline
                const headline = document.querySelector('.text-body-medium, [class*="headline"]')?.textContent?.trim();
                
                // About section
                const about = document.querySelector('#about ~ div, [class*="summary"]')?.textContent?.trim();
                
                // Profile image
                const image = document.querySelector('img[class*="profile-photo"], .pv-top-card-profile-picture img')?.src;
                
                // Experience (if visible)
                const experience = [];
                document.querySelectorAll('#experience ~ div li, .experience-item').forEach(el => {
                    const title = el.querySelector('h3, [class*="title"]')?.textContent?.trim();
                    const company = el.querySelector('h4, [class*="company"]')?.textContent?.trim();
                    if (title) {
                        experience.push({ title, company });
                    }
                });
                
                return {
                    name,
                    headline,
                    about: about?.substring(0, 500),
                    image,
                    experience: experience.slice(0, 3)
                };
            }''')
            
            # Analyze voice from content
            voice_profile = analyze_voice(data.get("about", ""), data.get("headline", ""))
            
            return {
                "platform": "linkedin",
                "url": url,
                "name": data.get("name"),
                "headline": data.get("headline"),
                "bio": data.get("about"),
                "profile_image": data.get("image"),
                "voice_profile": voice_profile,
                "themes": extract_themes(data.get("about", "") + " " + data.get("headline", "")),
                "sample_posts": [],  # Would need API for posts
                "note": "Full LinkedIn scraping requires LinkedIn API integration"
            }
            
        except Exception as e:
            return {
                "platform": "linkedin",
                "url": url,
                "error": str(e),
                "note": "LinkedIn requires authentication for full profile access. Consider using LinkedIn API."
            }


async def scrape_twitter_public(url: str) -> Dict[str, Any]:
    """
    Scrape publicly visible Twitter/X profile.
    """
    config = ScraperConfig(
        timeout=30000,
        wait_until="networkidle"
    )
    
    pool = await BrowserPool.get_instance()
    
    async with pool.get_page(config) as page:
        try:
            await page.goto(url, wait_until=config.wait_until)
            
            # Wait for profile to load
            await page.wait_for_selector('[data-testid="UserName"]', timeout=15000)
            
            data = await page.evaluate('''() => {
                // Name and handle
                const nameEl = document.querySelector('[data-testid="UserName"]');
                const name = nameEl?.querySelector('span')?.textContent?.trim();
                const handle = nameEl?.querySelectorAll('span')[1]?.textContent?.trim();
                
                // Bio
                const bio = document.querySelector('[data-testid="UserDescription"]')?.textContent?.trim();
                
                // Profile image
                const image = document.querySelector('[data-testid="UserAvatar"] img')?.src;
                
                // Stats
                const following = document.querySelector('a[href$="/following"] span')?.textContent;
                const followers = document.querySelector('a[href$="/followers"] span')?.textContent;
                
                // Recent tweets (visible ones)
                const tweets = [];
                document.querySelectorAll('[data-testid="tweet"]').forEach(tweet => {
                    const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent?.trim();
                    if (text && text.length > 20) {
                        tweets.push(text.substring(0, 280));
                    }
                });
                
                return {
                    name,
                    handle,
                    bio,
                    image,
                    following,
                    followers,
                    tweets: tweets.slice(0, 10)
                };
            }''')
            
            # Analyze voice from tweets
            all_content = " ".join(data.get("tweets", []))
            voice_profile = analyze_voice(all_content, data.get("bio", ""))
            
            return {
                "platform": "twitter",
                "url": url,
                "name": data.get("name"),
                "handle": data.get("handle"),
                "bio": data.get("bio"),
                "profile_image": data.get("image"),
                "followers": data.get("followers"),
                "voice_profile": voice_profile,
                "themes": extract_themes(all_content),
                "sample_posts": data.get("tweets", []),
            }
            
        except Exception as e:
            return {
                "platform": "twitter",
                "url": url,
                "error": str(e),
                "note": "X/Twitter may require authentication. Consider using X API."
            }


async def scrape_personal_website(url: str) -> Dict[str, Any]:
    """
    Scrape personal website/blog for voice profile.
    """
    config = ScraperConfig(timeout=25000)
    pool = await BrowserPool.get_instance()
    
    async with pool.get_page(config) as page:
        await page.goto(url, wait_until="domcontentloaded")
        
        from urllib.parse import urlparse
        base_url = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        
        data = await page.evaluate('''(baseUrl) => {
            // Name
            const name = document.querySelector('h1, [class*="name"], .title')?.textContent?.trim() ||
                        document.querySelector('title')?.textContent?.split('|')[0]?.trim();
            
            // Bio/About
            let bio = null;
            const aboutSelectors = ['#about', '[class*="about"]', '[class*="bio"]', '.intro', 'main p:first-of-type'];
            for (const sel of aboutSelectors) {
                const el = document.querySelector(sel);
                if (el) {
                    bio = el.textContent?.trim()?.substring(0, 500);
                    break;
                }
            }
            
            // Profile image
            let image = document.querySelector('[class*="avatar"], [class*="profile"] img, header img')?.src;
            if (image?.startsWith('/')) image = baseUrl + image;
            
            // Social links
            const socialLinks = {};
            document.querySelectorAll('a[href*="linkedin"], a[href*="twitter"], a[href*="instagram"]').forEach(a => {
                const href = a.href;
                if (href.includes('linkedin')) socialLinks.linkedin = href;
                if (href.includes('twitter') || href.includes('x.com')) socialLinks.twitter = href;
                if (href.includes('instagram')) socialLinks.instagram = href;
            });
            
            // Blog posts
            const posts = [];
            document.querySelectorAll('article, [class*="post"], .blog-item').forEach(el => {
                const title = el.querySelector('h2, h3')?.textContent?.trim();
                const excerpt = el.querySelector('p')?.textContent?.trim();
                if (title) {
                    posts.push({
                        title: title.substring(0, 100),
                        excerpt: excerpt?.substring(0, 200)
                    });
                }
            });
            
            return { name, bio, image, socialLinks, posts: posts.slice(0, 10) };
        }''', base_url)
        
        # Analyze voice
        all_content = data.get("bio", "") + " " + " ".join([p.get("excerpt", "") or "" for p in data.get("posts", [])])
        voice_profile = analyze_voice(all_content, "")
        
        return {
            "platform": "website",
            "url": url,
            "name": data.get("name"),
            "bio": data.get("bio"),
            "profile_image": data.get("image"),
            "social_links": data.get("socialLinks"),
            "voice_profile": voice_profile,
            "themes": extract_themes(all_content),
            "sample_posts": [p.get("title") for p in data.get("posts", [])],
        }


def analyze_voice(content: str, headline: str) -> Dict[str, Any]:
    """
    Analyze writing voice from content.
    """
    if not content:
        return {"tone": "professional", "style": "informative"}
    
    content_lower = content.lower()
    
    # Detect tone
    tone = "professional"
    if any(w in content_lower for w in ["passionate", "excited", "love", "amazing", "!"]):
        tone = "enthusiastic"
    elif any(w in content_lower for w in ["believe", "mission", "impact", "change"]):
        tone = "inspirational"
    elif any(w in content_lower for w in ["data", "research", "study", "analysis"]):
        tone = "analytical"
    elif any(w in content_lower for w in ["helped", "clients", "worked with", "consulting"]):
        tone = "consultative"
    
    # Detect style
    style = "informative"
    if content.count("I ") > 5 or content.count("my ") > 3:
        style = "personal"
    elif any(w in content_lower for w in ["step", "how to", "tips", "guide"]):
        style = "educational"
    elif any(w in content_lower for w in ["story", "journey", "experience"]):
        style = "storytelling"
    
    return {
        "tone": tone,
        "style": style,
        "formality": "formal" if len(content.split()) > 100 and "!" not in content else "casual"
    }


def extract_themes(content: str) -> List[str]:
    """
    Extract key themes from content.
    """
    if not content:
        return []
    
    # Common theme keywords
    theme_keywords = {
        "leadership": ["leader", "leadership", "manage", "team", "ceo", "founder"],
        "entrepreneurship": ["entrepreneur", "startup", "founder", "business", "venture"],
        "technology": ["tech", "software", "ai", "data", "digital", "engineering"],
        "marketing": ["marketing", "brand", "growth", "content", "social media"],
        "finance": ["finance", "investment", "trading", "crypto", "fintech"],
        "design": ["design", "ux", "ui", "creative", "product design"],
        "productivity": ["productivity", "efficiency", "workflow", "habits"],
        "career": ["career", "job", "professional", "work", "linkedin"],
        "mindset": ["mindset", "mindfulness", "mental", "wellness", "growth mindset"],
        "writing": ["writing", "content", "copywriting", "storytelling", "author"]
    }
    
    content_lower = content.lower()
    themes = []
    
    for theme, keywords in theme_keywords.items():
        if any(kw in content_lower for kw in keywords):
            themes.append(theme)
    
    return themes[:5]
