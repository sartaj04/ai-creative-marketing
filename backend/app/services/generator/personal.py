"""
Personal brand copy generation service.
"""
from typing import Dict, Any, List

from app.services.generator.base import get_ai_client, parse_json_response
from app.models.brand_profile import BrandProfile


# Post types for personal branding
PERSONAL_POST_TYPES = {
    "story": {
        "format": "personal narrative with lesson",
        "structure": "hook → context → struggle → resolution → takeaway",
        "style": "vulnerable, authentic, relatable"
    },
    "tip": {
        "format": "actionable advice",
        "structure": "hook → numbered tips → why it works → try this",
        "style": "helpful, practical, concise"
    },
    "opinion": {
        "format": "contrarian or strong take",
        "structure": "bold statement → reasoning → evidence → discussion invite",
        "style": "confident, thought-provoking, conversational"
    },
    "question": {
        "format": "engagement-focused",
        "structure": "observation → question → context → invite responses",
        "style": "curious, inclusive, community-building"
    },
    "carousel": {
        "format": "multi-slide content",
        "structure": "cover hook → 5-7 content slides → summary/CTA",
        "style": "educational, scannable, value-packed"
    }
}


async def generate_personal_copy(
    profile: BrandProfile,
    config: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Generate personal brand content matching the person's voice.
    
    Args:
        profile: Brand profile with voice analysis
        config: {
            post_type: str (story, tip, opinion, question, carousel),
            topics: list[str],
            language: str,
            platform: str (linkedin, twitter),
            num_variants: int
        }
    """
    client = get_ai_client()
    
    # Get brand info
    voice_profile = profile.voice_profile
    brand_assets = profile.brand_assets
    
    # Extract voice characteristics
    tone = voice_profile.get("tone", "professional")
    themes = voice_profile.get("themes", brand_assets.get("themes", []))
    sample_posts = voice_profile.get("sample_posts", brand_assets.get("sample_posts", []))
    
    # Get config
    post_type = config.get("post_type", "tip")
    topics = config.get("topics", themes[:3] if themes else ["productivity", "growth"])
    language = config.get("language", "en")
    platform = config.get("platform", "linkedin")
    num_variants = config.get("num_variants", 10)
    
    post_format = PERSONAL_POST_TYPES.get(post_type, PERSONAL_POST_TYPES["tip"])
    
    # Platform-specific limits
    if platform == "twitter":
        length_guide = "Keep under 280 characters per tweet. For threads, split into 3-5 tweets."
    else:  # linkedin
        length_guide = "150-200 words optimal. Use line breaks for readability."
    
    # Voice matching prompt
    voice_samples = ""
    if sample_posts:
        voice_samples = f"""
VOICE SAMPLES (match this style):
{chr(10).join(['- "' + post[:200] + '..."' for post in sample_posts[:3]])}
"""

    prompt = f"""Generate {num_variants} {platform.capitalize()} posts for a personal brand.

VOICE PROFILE:
- Tone: {tone}
- Themes: {', '.join(themes[:5]) if themes else 'General thought leadership'}
{voice_samples}

POST TYPE: {post_type.capitalize()}
- Format: {post_format['format']}
- Structure: {post_format['structure']}
- Style: {post_format['style']}

TOPICS TO COVER: {', '.join(topics)}

PLATFORM: {platform.upper()}
- {length_guide}

LANGUAGE: {language.upper()}

CRITICAL REQUIREMENTS:
1. Write in FIRST PERSON ("I", not "we")
2. Sound like a real person, NOT corporate
3. Include personal touches (opinions, experiences)
4. Hook must grab attention immediately
5. End with engagement hook (question, challenge, or reflection)
6. For {platform}: optimize for the algorithm (engagement in first 30 mins matters)

Return ONLY a valid JSON array with {num_variants} posts:
[
  {{
    "hook": "Opening line that stops the scroll",
    "body": "Main content (use \\n for line breaks)",
    "closing": "Engagement prompt or reflection",
    "hashtags": ["#Tag1", "#Tag2"],
    "image_prompt": "Optional: suggest an image that would complement this post"
  }}
]"""

    try:
        response = await client.generate(prompt, temperature=0.85)  # Higher creativity
        variants = parse_json_response(response)
        return variants[:num_variants]
    except Exception as e:
        # Fallback
        return [
            {
                "hook": f"I've been thinking about {topics[0] if topics else 'this'} a lot lately.",
                "body": "Here's what I've learned:\n\n1. Start before you're ready\n2. Consistency beats perfection\n3. Your network is your net worth",
                "closing": "What would you add to this list?",
                "hashtags": ["#Thoughts", "#Growth"],
                "image_prompt": None
            }
        ]
