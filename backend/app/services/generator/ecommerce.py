"""
E-commerce copy generation service.
"""
from typing import Dict, Any, List

from app.services.generator.base import get_ai_client, parse_json_response
from app.models.brand_profile import BrandProfile


# Festival themes for Indian market
FESTIVAL_THEMES = {
    "diwali": {
        "keywords": ["festival of lights", "sparkle", "illuminate", "celebrate", "traditional"],
        "emojis": ["🪔", "✨", "🎆", "🎁"],
        "colors": ["gold", "orange", "red"],
        "cta_style": "festive"
    },
    "eid": {
        "keywords": ["Eid Mubarak", "blessings", "celebration", "family", "joy"],
        "emojis": ["🌙", "⭐", "🎁"],
        "colors": ["green", "gold", "white"],
        "cta_style": "warm"
    },
    "holi": {
        "keywords": ["colors", "splash", "vibrant", "joy", "celebrate"],
        "emojis": ["🎨", "💜", "💙", "💚", "💛"],
        "colors": ["multicolor", "bright"],
        "cta_style": "playful"
    },
    "pongal": {
        "keywords": ["harvest", "prosperity", "traditional", "auspicious"],
        "emojis": ["🌾", "☀️", "🎉"],
        "colors": ["yellow", "orange"],
        "cta_style": "traditional"
    },
    "onam": {
        "keywords": ["prosperity", "harvest", "traditional", "Kerala", "celebration"],
        "emojis": ["🌸", "🎊", "🛶"],
        "colors": ["gold", "white", "red"],
        "cta_style": "traditional"
    },
    "dussehra": {
        "keywords": ["victory", "triumph", "celebration", "power", "auspicious"],
        "emojis": ["🏹", "✨", "🎯"],
        "colors": ["red", "gold"],
        "cta_style": "powerful"
    }
}

# Language prompts
LANGUAGE_INSTRUCTIONS = {
    "en": "Write in natural, conversational English.",
    "hi": "Write in natural Hindi (Devanagari script). Use culturally appropriate idioms and expressions. Do NOT transliterate English - write authentic Hindi.",
    "ta": "Write in natural Tamil (Tamil script). Use culturally appropriate expressions for Tamil-speaking audiences.",
    "ar": "Write in natural Arabic. Consider cultural nuances for Indian Arabic-speaking audiences."
}


async def generate_ecommerce_copy(
    profile: BrandProfile,
    config: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Generate e-commerce marketing copy.
    
    Args:
        profile: Brand profile with assets
        config: {
            product_id: str (optional),
            campaign_type: str (sale, new_arrival, festival, clearance),
            festival: str (optional),
            discount_percentage: int (optional),
            language: str,
            num_variants: int
        }
    """
    client = get_ai_client()
    
    # Get brand info
    brand_name = profile.name
    brand_assets = profile.brand_assets
    voice_profile = profile.voice_profile
    
    # Get product if specified
    product = None
    products = brand_assets.get("products", [])
    if config.get("product_id") and products:
        for p in products:
            if p.get("id") == config["product_id"]:
                product = p
                break
    if not product and products:
        product = products[0]  # Use first product as default
    
    # Build prompt
    campaign_type = config.get("campaign_type", "general")
    festival = config.get("festival")
    language = config.get("language", "en")
    num_variants = config.get("num_variants", 10)
    discount = config.get("discount_percentage")
    
    # Festival theme
    festival_context = ""
    if festival and festival in FESTIVAL_THEMES:
        theme = FESTIVAL_THEMES[festival]
        festival_context = f"""
Festival: {festival.capitalize()}
- Use these festive keywords naturally: {', '.join(theme['keywords'])}
- You may use these emojis sparingly: {' '.join(theme['emojis'])}
- Festive tone should be {theme['cta_style']}
"""

    # Language instruction
    lang_instruction = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["en"])
    
    prompt = f"""Generate {num_variants} unique ad copy variants for an Indian e-commerce brand.

BRAND:
- Name: {brand_name}
- Voice: {voice_profile.get('tone', 'professional')} and {voice_profile.get('style', 'engaging')}
- Target audience: Indian consumers

PRODUCT:
- Name: {product.get('title', 'Featured Product') if product else 'Featured Collection'}
- Price: {product.get('price', 'Premium pricing') if product else 'Various'}
- Category: {product.get('category', 'Lifestyle') if product else 'Mixed'}

CAMPAIGN TYPE: {campaign_type.upper()}
{f'- Discount: {discount}% OFF' if discount else ''}
{festival_context}

LANGUAGE: {language.upper()}
{lang_instruction}

REQUIREMENTS:
1. Headlines: 5-8 words, punchy, benefit-driven
2. Subheadlines: Supporting message, creates desire
3. CTA: Strong action verbs, creates urgency
4. Body: 1-2 sentences expanding on the offer
5. Hashtags: 3-5 relevant hashtags for Indian audience

Return ONLY a valid JSON array with exactly {num_variants} objects:
[
  {{
    "headline": "...",
    "subheadline": "...",
    "body": "...",
    "cta": "...",
    "hashtags": ["#tag1", "#tag2", "#tag3"]
  }}
]"""

    try:
        response = await client.generate(prompt, temperature=0.8)
        variants = parse_json_response(response)
        return variants[:num_variants]
    except Exception as e:
        # Return fallback variants on error
        return [
            {
                "headline": f"{brand_name} - Shop Now",
                "subheadline": "Discover premium quality",
                "body": "Experience the best in quality and value.",
                "cta": "Shop Now",
                "hashtags": ["#Shopping", "#India", "#Quality"]
            }
        ]
