"""
BrandScale AI - Copy Generation Service
GPT-4 powered marketing copy generation for all segments.
"""
import json
from typing import Any, Dict, List, Optional

from loguru import logger
from openai import AsyncOpenAI

from app.config import (
    FestivalCalendar,
    ProfileType,
    settings,
    SUPPORTED_LANGUAGES,
)


class CopyGenerator:
    """
    AI-powered marketing copy generator using GPT-4.
    
    Supports:
    - E-commerce: Product ads, sale announcements, new arrivals
    - SaaS: Feature highlights, testimonials, comparison posts
    - Personal brand: LinkedIn, Twitter, thought leadership
    
    Languages: English, Hindi, Tamil, Bengali, Marathi, Arabic
    """
    
    def __init__(self):
        """Initialize OpenAI client."""
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.temperature = settings.openai_temperature
        self.max_tokens = settings.openai_max_tokens
    
    async def generate(
        self,
        profile_type: ProfileType,
        brand_context: Dict[str, Any],
        config: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Main entry point for copy generation.
        
        Args:
            profile_type: Type of brand (ecommerce/saas/personal)
            brand_context: Brand assets and voice profile
            config: Generation configuration
        
        Returns:
            List of copy variants
        """
        if profile_type == ProfileType.ECOMMERCE:
            return await self.generate_ecommerce_copy(brand_context, config)
        elif profile_type == ProfileType.SAAS:
            return await self.generate_saas_copy(brand_context, config)
        elif profile_type == ProfileType.PERSONAL:
            return await self.generate_personal_brand_copy(brand_context, config)
        else:
            raise ValueError(f"Unsupported profile type: {profile_type}")
    
    async def generate_ecommerce_copy(
        self,
        brand_context: Dict[str, Any],
        config: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generate e-commerce ad copy.
        
        Config options:
        - campaign_type: sale, launch, awareness, festival
        - language: en, hi, ta, bn, mr, ar
        - num_variants: Number of copy variants (1-20)
        - products: List of products to feature
        - festival: Festival name for themed copy
        """
        campaign_type = config.get("campaign_type", "general")
        language = config.get("language", "en")
        num_variants = config.get("num_variants", 5)
        products = config.get("products", [])
        festival = config.get("festival")
        
        # Get festival context if applicable
        festival_context = ""
        if festival:
            fest_info = FestivalCalendar.get_festival_context(festival)
            if fest_info:
                festival_context = f"""
Festival Theme: {fest_info['theme']}
Colors to use: {', '.join(fest_info['colors'])}
Keywords to include: {', '.join(fest_info['keywords'])}
Suggested CTAs: {', '.join(fest_info['cta_suggestions'])}
"""
        
        # Build product context
        product_context = ""
        if products:
            product_context = "Products to feature:\n"
            for p in products[:3]:
                product_context += f"- {p.get('name', 'Product')}: {p.get('description', '')} - {p.get('price', '')}\n"
        
        language_name = SUPPORTED_LANGUAGES.get(language, "English")
        
        prompt = f"""You are an expert e-commerce copywriter specializing in the Indian and Middle East markets.

Generate {num_variants} unique ad copy variants for the following brand:

Brand Name: {brand_context.get('name', 'Brand')}
Brand Description: {brand_context.get('description', '')}
Brand Voice: {brand_context.get('tone', 'professional')}
Keywords: {', '.join(brand_context.get('keywords', []))}

Campaign Type: {campaign_type}
Target Language: {language_name}
{festival_context}
{product_context}

For each variant, provide:
1. headline: Catchy headline (max 60 characters)
2. subheadline: Supporting text (max 100 characters)
3. body: Brief body copy (max 200 characters)
4. cta: Call-to-action text (max 20 characters)
5. hashtags: 3-5 relevant hashtags

Important guidelines:
- Write in {language_name}
- Match the brand voice: {brand_context.get('tone', 'professional')}
- For Hindi/Tamil/Bengali: Use natural language, not transliteration
- For Arabic: Use right-to-left text conventions
- Include cultural references when appropriate
- Make copy platform-optimized (Instagram, Facebook)
- Create urgency for sale campaigns
- Highlight value proposition clearly

Return as a JSON array of objects with keys: headline, subheadline, body, cta, hashtags, language
"""
        
        return await self._generate_copy(prompt, num_variants)
    
    async def generate_saas_copy(
        self,
        brand_context: Dict[str, Any],
        config: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generate SaaS marketing copy.
        
        Config options:
        - post_type: feature, testimonial, comparison, tip, announcement
        - language: en, hi, ar
        - num_variants: Number of variants
        - features: Specific features to highlight
        - audience: Target audience description
        """
        post_type = config.get("post_type", "feature")
        language = config.get("language", "en")
        num_variants = config.get("num_variants", 5)
        features = config.get("features", [])
        audience = config.get("audience", "business professionals")
        
        language_name = SUPPORTED_LANGUAGES.get(language, "English")
        
        # Build feature context
        feature_context = ""
        if features:
            feature_context = "Key Features:\n"
            for f in features[:5]:
                if isinstance(f, dict):
                    feature_context += f"- {f.get('title', '')}: {f.get('description', '')}\n"
                else:
                    feature_context += f"- {f}\n"
        
        # Testimonials if available
        testimonial_context = ""
        if brand_context.get("testimonials"):
            testimonial_context = "Customer Testimonials:\n"
            for t in brand_context["testimonials"][:3]:
                testimonial_context += f'"{t.get("text", "")}" - {t.get("author", "Customer")}\n'
        
        post_type_instructions = {
            "feature": "Highlight product features with clear benefits. Focus on solving problems.",
            "testimonial": "Create social proof posts featuring customer success stories.",
            "comparison": "Position against competitors subtly. Focus on unique advantages.",
            "tip": "Share valuable tips that demonstrate expertise. Provide actionable advice.",
            "announcement": "Create buzz for new features or updates. Build excitement.",
        }
        
        prompt = f"""You are a B2B SaaS marketing expert creating LinkedIn and Twitter content.

Generate {num_variants} unique copy variants for:

Company: {brand_context.get('name', 'Company')}
Description: {brand_context.get('description', '')}
Tagline: {brand_context.get('tagline', '')}
Voice: {brand_context.get('tone', 'professional')}

Post Type: {post_type}
{post_type_instructions.get(post_type, '')}

Target Audience: {audience}
Language: {language_name}

{feature_context}
{testimonial_context}

For each variant, provide:
1. headline: Hook that grabs attention (max 80 characters)
2. subheadline: Value proposition (max 120 characters)
3. body: Main content (max 280 characters for Twitter compatibility)
4. cta: Clear action (max 25 characters)
5. hashtags: 3-5 industry-relevant hashtags

Guidelines:
- Professional but approachable tone
- Data-driven when possible
- Clear benefit statements
- Platform-appropriate (LinkedIn is professional, Twitter is conversational)
- Include emojis sparingly for visual appeal
- Write in {language_name}

Return as a JSON array of objects with keys: headline, subheadline, body, cta, hashtags, language
"""
        
        return await self._generate_copy(prompt, num_variants)
    
    async def generate_personal_brand_copy(
        self,
        brand_context: Dict[str, Any],
        config: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generate personal brand content.
        
        Config options:
        - post_type: thought_leadership, story, tip, motivation, engagement
        - platform: linkedin, twitter
        - language: en, hi
        - num_variants: Number of variants
        - topics: Topics to write about
        """
        post_type = config.get("post_type", "thought_leadership")
        platform = config.get("platform", "linkedin")
        language = config.get("language", "en")
        num_variants = config.get("num_variants", 5)
        topics = config.get("topics", [])
        
        language_name = SUPPORTED_LANGUAGES.get(language, "English")
        
        # Voice profile
        voice = brand_context.get("voice_profile", {})
        sample_content = voice.get("sample_content", [])
        
        # Platform-specific guidelines
        platform_guide = {
            "linkedin": {
                "max_length": 1300,
                "style": "professional, story-driven",
                "format": "Use line breaks for readability. Start with a hook.",
            },
            "twitter": {
                "max_length": 280,
                "style": "conversational, punchy",
                "format": "Be concise. Use threads for longer content.",
            },
        }
        
        guide = platform_guide.get(platform, platform_guide["linkedin"])
        
        post_type_instructions = {
            "thought_leadership": "Share insights and opinions. Establish expertise.",
            "story": "Tell a personal or professional story. Be authentic.",
            "tip": "Share actionable advice. Provide immediate value.",
            "motivation": "Inspire and encourage. Share lessons learned.",
            "engagement": "Ask questions. Encourage comments and discussion.",
        }
        
        prompt = f"""You are a personal branding expert and ghostwriter for {platform.title()}.

Generate {num_variants} unique posts for:

Person: {brand_context.get('name', 'Professional')}
Bio: {brand_context.get('about', brand_context.get('headline', ''))}
Expertise Areas: {', '.join(topics) if topics else 'General professional development'}
Voice Style: {voice.get('tone', 'professional')}

Post Style: {post_type}
{post_type_instructions.get(post_type, '')}

Platform: {platform.title()}
Max Length: {guide['max_length']} characters
Style: {guide['style']}
Format: {guide['format']}

Sample Content (match this voice):
{chr(10).join(sample_content[:2]) if sample_content else 'Professional, authentic, insightful'}

Language: {language_name}

For each post variant, provide:
1. headline: Opening hook (first line that appears before "see more")
2. body: Full post content (follow platform guidelines)
3. cta: Soft call-to-action or question (optional)
4. hashtags: 3-5 relevant hashtags

Guidelines:
- Match the authentic voice of the person
- Be genuine and relatable
- For LinkedIn: Use short paragraphs and white space
- For Twitter: Be punchy and memorable
- Include a personal touch or story element
- End with engagement prompt if appropriate
- Write in {language_name}

Return as a JSON array with keys: headline, body, cta, hashtags, language
"""
        
        return await self._generate_copy(prompt, num_variants)
    
    async def _generate_copy(
        self,
        prompt: str,
        num_variants: int
    ) -> List[Dict[str, Any]]:
        """
        Call GPT-4 API and parse response.
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a world-class marketing copywriter. Always respond with valid JSON arrays."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"},
            )
            
            content = response.choices[0].message.content
            logger.debug(f"GPT-4 response: {content[:500]}...")
            
            # Parse JSON
            try:
                result = json.loads(content)
                
                # Handle both array and object responses
                if isinstance(result, list):
                    variants = result
                elif isinstance(result, dict):
                    # Look for common keys that contain the array
                    for key in ["variants", "copies", "results", "data"]:
                        if key in result and isinstance(result[key], list):
                            variants = result[key]
                            break
                    else:
                        # If it's a single variant
                        variants = [result]
                else:
                    variants = []
                
                # Validate and clean variants
                cleaned_variants = []
                for v in variants[:num_variants]:
                    cleaned = {
                        "headline": str(v.get("headline", ""))[:100],
                        "subheadline": str(v.get("subheadline", ""))[:150] if v.get("subheadline") else None,
                        "body": str(v.get("body", ""))[:500] if v.get("body") else None,
                        "cta": str(v.get("cta", "Learn More"))[:30],
                        "hashtags": v.get("hashtags", [])[:5] if isinstance(v.get("hashtags"), list) else [],
                        "language": v.get("language", "en"),
                    }
                    cleaned_variants.append(cleaned)
                
                return cleaned_variants
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse GPT-4 response as JSON: {e}")
                # Try to extract JSON from response
                import re
                json_match = re.search(r'\[[\s\S]*\]', content)
                if json_match:
                    return json.loads(json_match.group())
                return []
            
        except Exception as e:
            logger.error(f"GPT-4 API call failed: {e}")
            raise
    
    async def batch_generate(
        self,
        profile_type: ProfileType,
        brand_context: Dict[str, Any],
        configs: List[Dict[str, Any]]
    ) -> List[List[Dict[str, Any]]]:
        """
        Generate copy for multiple configurations in batch.
        More cost-efficient for multiple platforms/variants.
        """
        import asyncio
        
        tasks = [
            self.generate(profile_type, brand_context, config)
            for config in configs
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any failures
        final_results = []
        for r in results:
            if isinstance(r, Exception):
                logger.error(f"Batch generation failed for one config: {r}")
                final_results.append([])
            else:
                final_results.append(r)
        
        return final_results
    
    async def refine_copy(
        self,
        original: Dict[str, Any],
        instructions: str
    ) -> Dict[str, Any]:
        """
        Refine existing copy based on user feedback.
        """
        prompt = f"""Refine this marketing copy based on the instructions provided.

Original Copy:
- Headline: {original.get('headline', '')}
- Subheadline: {original.get('subheadline', '')}
- Body: {original.get('body', '')}
- CTA: {original.get('cta', '')}

Refinement Instructions:
{instructions}

Return the refined copy as JSON with keys: headline, subheadline, body, cta, hashtags, language
Keep the same overall message but apply the requested changes.
"""
        
        variants = await self._generate_copy(prompt, 1)
        return variants[0] if variants else original
    
    async def translate_copy(
        self,
        copy: Dict[str, Any],
        target_language: str
    ) -> Dict[str, Any]:
        """
        Translate existing copy to another language with cultural adaptation.
        """
        language_name = SUPPORTED_LANGUAGES.get(target_language, "English")
        
        prompt = f"""Translate and culturally adapt this marketing copy to {language_name}.

Original Copy (English):
- Headline: {copy.get('headline', '')}
- Subheadline: {copy.get('subheadline', '')}
- Body: {copy.get('body', '')}
- CTA: {copy.get('cta', '')}

Guidelines:
- Don't just translate literally - adapt for cultural context
- Keep the marketing impact and persuasive elements
- Use natural {language_name} expressions
- Maintain the same length constraints
- For Hindi/Tamil/Bengali: Use Devanagari/Tamil/Bengali script
- For Arabic: Use Arabic script and right-to-left conventions

Return as JSON with keys: headline, subheadline, body, cta, hashtags, language
Set language to '{target_language}'
"""
        
        variants = await self._generate_copy(prompt, 1)
        return variants[0] if variants else copy


# Global generator instance
copy_generator = CopyGenerator()
