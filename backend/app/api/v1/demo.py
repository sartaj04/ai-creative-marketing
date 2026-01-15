"""
Public demo API endpoint for website scraping and AI copy generation.
No authentication required - for homepage demo purposes.
"""
from typing import Optional
from pydantic import BaseModel, HttpUrl
from fastapi import APIRouter, HTTPException

router = APIRouter()


class DemoGenerationRequest(BaseModel):
    """Request for demo copy generation."""
    url: HttpUrl
    platform: str = "instagram"  # instagram, linkedin, twitter, google


class DemoGenerationResponse(BaseModel):
    """Response with generated copy."""
    headline: str
    copy: str
    cta: str
    hashtags: list[str]
    brand_name: str
    brand_colors: list[str]


@router.post("/generate", response_model=DemoGenerationResponse)
async def demo_generate_copy(request: DemoGenerationRequest):
    """
    Generate marketing copy from a website URL.
    This is a public endpoint for the homepage demo.
    """
    try:
        # Step 1: Scrape the website
        from app.utils.website_scraper import scrape_website
        scraped_data = await scrape_website(str(request.url))
        
        if not scraped_data:
            raise HTTPException(status_code=400, detail="Could not scrape website")
        
        brand_name = scraped_data.get("brand_name", "Your Brand")
        description = scraped_data.get("description", "")
        colors = scraped_data.get("colors", ["#f97316", "#3b82f6"])
        
        # Step 2: Generate copy using AI
        from app.services.generator.base import get_ai_client
        
        client = get_ai_client()
        
        platform_prompts = {
            "instagram": "Create an engaging Instagram post that's visual and uses emojis. Keep it short and punchy.",
            "linkedin": "Create a professional LinkedIn post that provides value and establishes thought leadership.",
            "twitter": "Create a viral Twitter/X post that's concise, witty, and encourages engagement.",
            "google": "Create compelling Google Display Ad copy that's direct and action-oriented.",
        }
        
        platform_instruction = platform_prompts.get(request.platform, platform_prompts["instagram"])
        
        prompt = f"""You are a creative marketing copywriter.

Based on this website information:
- Brand: {brand_name}
- Description: {description}

{platform_instruction}

Generate marketing copy in this exact JSON format:
{{
    "headline": "A catchy headline (5-10 words)",
    "copy": "The main ad copy (2-3 sentences, engaging and relevant to the brand)",
    "cta": "A call to action (2-4 words)",
    "hashtags": ["#relevant", "#hashtags", "#brand"]
}}

IMPORTANT: Return ONLY the JSON, no markdown or extra text."""

        response = await client.generate(prompt)
        
        # Parse the response
        import json
        import re
        
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            copy_data = json.loads(json_match.group())
        else:
            raise ValueError("Could not parse AI response")
        
        return DemoGenerationResponse(
            headline=copy_data.get("headline", f"Discover {brand_name}"),
            copy=copy_data.get("copy", f"Experience the best of {brand_name}. Quality products, exceptional service."),
            cta=copy_data.get("cta", "Learn More"),
            hashtags=copy_data.get("hashtags", [f"#{brand_name.replace(' ', '')}", "#Marketing"]),
            brand_name=brand_name,
            brand_colors=colors[:2] if colors else ["#f97316", "#3b82f6"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Fallback with basic info
        return DemoGenerationResponse(
            headline="Transform Your Business Today",
            copy="Discover how we can help you achieve your goals. Join thousands of satisfied customers who trust us.",
            cta="Get Started",
            hashtags=["#Business", "#Growth", "#Success"],
            brand_name="Your Brand",
            brand_colors=["#f97316", "#3b82f6"]
        )
