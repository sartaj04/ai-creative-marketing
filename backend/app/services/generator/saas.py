"""
SaaS copy generation service.
"""
from typing import Dict, Any, List

from app.services.generator.base import get_ai_client, parse_json_response
from app.models.brand_profile import BrandProfile


# Audience personas for B2B SaaS
AUDIENCE_PROFILES = {
    "developers": {
        "tone": "technical but friendly",
        "pain_points": ["complex integrations", "poor documentation", "slow APIs"],
        "values": ["clean code", "fast performance", "good DX"],
        "hashtags": ["#DevTools", "#Coding", "#TechIndia"]
    },
    "marketers": {
        "tone": "results-driven",
        "pain_points": ["manual tasks", "poor analytics", "low ROI"],
        "values": ["automation", "data insights", "growth"],
        "hashtags": ["#MarTech", "#GrowthHacking", "#DigitalMarketing"]
    },
    "founders": {
        "tone": "ambitious and practical",
        "pain_points": ["scaling challenges", "limited resources", "time constraints"],
        "values": ["efficiency", "cost-effective solutions", "rapid growth"],
        "hashtags": ["#StartupIndia", "#Founders", "#Entrepreneurship"]
    },
    "designers": {
        "tone": "creative and modern",
        "pain_points": ["collaboration issues", "version control", "handoff problems"],
        "values": ["beautiful UI", "seamless workflow", "creative freedom"],
        "hashtags": ["#DesignThinking", "#UIUX", "#ProductDesign"]
    }
}

# Post types
POST_TYPES = {
    "feature_announcement": {
        "format": "hook + feature + benefit + CTA",
        "length": "150-200 words for LinkedIn",
        "style": "exciting but professional"
    },
    "tip": {
        "format": "hook + numbered tips + takeaway",
        "length": "100-150 words",
        "style": "educational and helpful"
    },
    "insight": {
        "format": "observation + data/story + implication + discussion prompt",
        "length": "150-200 words",
        "style": "thought-provoking"
    },
    "testimonial": {
        "format": "customer quote + context + results + invitation",
        "length": "100-150 words",
        "style": "authentic and relatable"
    },
    "comparison": {
        "format": "before/after or old way/new way",
        "length": "100-150 words",
        "style": "clear and persuasive"
    }
}


async def generate_saas_copy(
    profile: BrandProfile,
    config: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Generate SaaS marketing copy for social media.
    
    Args:
        profile: Brand profile with features and value props
        config: {
            post_type: str (feature_announcement, tip, insight, testimonial, comparison),
            target_audience: str (developers, marketers, founders, designers),
            language: str,
            num_variants: int
        }
    """
    client = get_ai_client()
    
    # Get brand info
    brand_name = profile.name
    brand_assets = profile.brand_assets
    voice_profile = profile.voice_profile
    
    # Get config
    post_type = config.get("post_type", "feature_announcement")
    target_audience = config.get("target_audience", "founders")
    language = config.get("language", "en")
    num_variants = config.get("num_variants", 5)
    
    # Get audience profile
    audience = AUDIENCE_PROFILES.get(target_audience, AUDIENCE_PROFILES["founders"])
    post_format = POST_TYPES.get(post_type, POST_TYPES["feature_announcement"])
    
    # Extract features
    features = brand_assets.get("features", [])
    value_props = brand_assets.get("value_props", [])
    testimonials = brand_assets.get("testimonials", [])
    
    prompt = f"""Generate {num_variants} LinkedIn/Twitter posts for an Indian SaaS company.

COMPANY:
- Name: {brand_name}
- Description: {profile.description or 'B2B SaaS platform'}
- Key Features: {', '.join(features[:5]) if features else 'Productivity, Automation, Analytics'}
- Value Propositions: {', '.join(value_props[:3]) if value_props else 'Save time, Reduce costs, Scale faster'}

TARGET AUDIENCE: {target_audience.capitalize()}
- Tone: {audience['tone']}
- Pain points they have: {', '.join(audience['pain_points'])}
- What they value: {', '.join(audience['values'])}

POST TYPE: {post_type.replace('_', ' ').title()}
- Format: {post_format['format']}
- Length: {post_format['length']}
- Style: {post_format['style']}

LANGUAGE: {language.upper()}
{'Write in Hindi (Devanagari script) naturally.' if language == 'hi' else 'Write in natural English.'}

REQUIREMENTS FOR LINKEDIN:
1. Hook in first line (pattern interrupt, question, or bold statement)
2. Use line breaks for readability
3. End with engagement prompt or clear CTA
4. Include relevant emojis (sparingly, 2-3 max)
5. Hashtags at the end

Return ONLY a valid JSON array with {num_variants} posts:
[
  {{
    "hook": "First line that grabs attention",
    "body": "Main content with line breaks (use \\n)",
    "cta": "Engagement prompt or call-to-action",
    "hashtags": ["#Tag1", "#Tag2", "#Tag3"]
  }}
]"""

    try:
        response = await client.generate(prompt, temperature=0.8)
        variants = parse_json_response(response)
        return variants[:num_variants]
    except Exception as e:
        # Fallback
        return [
            {
                "hook": f"🚀 Big news from {brand_name}!",
                "body": f"We're helping {target_audience} work smarter, not harder.\n\nOur latest updates include powerful features designed for the Indian market.",
                "cta": "What's your biggest productivity challenge? Let me know in the comments 👇",
                "hashtags": audience["hashtags"]
            }
        ]
