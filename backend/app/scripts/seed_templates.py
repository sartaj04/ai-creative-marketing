"""
Seed database with initial templates.
Run with: python -m app.scripts.seed_templates
"""
import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.database import async_session_maker, init_db
from app.models.template import Template


TEMPLATES = [
    {
        "name": "Product Showcase",
        "description": "E-commerce product display with gradient background and discount badge",
        "category": "product",
        "segment": "ecommerce",
        "html_file": "instagram_product.html",
        "aspect_ratios": ["1:1", "4:5", "9:16"],
        "variables": [
            {"name": "logo_url", "type": "image", "required": False},
            {"name": "headline", "type": "text", "required": True},
            {"name": "subheadline", "type": "text", "required": False},
            {"name": "cta", "type": "text", "required": True, "default": "Shop Now"},
            {"name": "product_image", "type": "image", "required": False},
            {"name": "discount", "type": "number", "required": False},
            {"name": "bg_color_1", "type": "color", "required": False, "default": "#1a1a2e"},
            {"name": "bg_color_2", "type": "color", "required": False, "default": "#16213e"},
            {"name": "cta_color", "type": "color", "required": False, "default": "#f97316"},
        ],
        "is_premium": False
    },
    {
        "name": "Festival Sale",
        "description": "Celebratory design for Diwali, Eid, Holi, and other Indian festivals",
        "category": "sale",
        "segment": "ecommerce",
        "html_file": "festival_sale.html",
        "aspect_ratios": ["1:1", "9:16", "1.91:1"],
        "variables": [
            {"name": "logo_url", "type": "image", "required": False},
            {"name": "headline", "type": "text", "required": True},
            {"name": "subheadline", "type": "text", "required": False},
            {"name": "cta", "type": "text", "required": True},
            {"name": "festival", "type": "text", "required": False},
            {"name": "festival_emoji", "type": "text", "required": False, "default": "🎉"},
            {"name": "terms", "type": "text", "required": False},
            {"name": "accent_color", "type": "color", "required": False, "default": "#f97316"},
        ],
        "is_premium": False
    },
    {
        "name": "LinkedIn Thought Leadership",
        "description": "Professional post design for LinkedIn with author attribution",
        "category": "social",
        "segment": "saas",
        "html_file": "linkedin_post.html",
        "aspect_ratios": ["1:1", "1.91:1"],
        "variables": [
            {"name": "logo_url", "type": "image", "required": False},
            {"name": "brand_name", "type": "text", "required": False},
            {"name": "headline", "type": "text", "required": True},
            {"name": "body", "type": "text", "required": True},
            {"name": "hashtags", "type": "array", "required": False},
            {"name": "cta", "type": "text", "required": False},
            {"name": "author_name", "type": "text", "required": False},
            {"name": "author_title", "type": "text", "required": False},
            {"name": "author_image", "type": "image", "required": False},
            {"name": "accent_color", "type": "color", "required": False, "default": "#f97316"},
        ],
        "is_premium": False
    },
    {
        "name": "Twitter/X Post",
        "description": "Tweet-style design optimized for Twitter/X",
        "category": "social",
        "segment": "personal",
        "html_file": "twitter_post.html",
        "aspect_ratios": ["1:1", "16:9"],
        "variables": [
            {"name": "logo_url", "type": "image", "required": False},
            {"name": "brand_name", "type": "text", "required": True},
            {"name": "handle", "type": "text", "required": False},
            {"name": "body", "type": "text", "required": True},
            {"name": "hashtags", "type": "array", "required": False},
            {"name": "cta", "type": "text", "required": False},
            {"name": "accent_color", "type": "color", "required": False, "default": "#1da1f2"},
        ],
        "is_premium": False
    },
    {
        "name": "Google Display Ad",
        "description": "Google Ads compliant display ad with product focus",
        "category": "ads",
        "segment": "ecommerce",
        "html_file": "google_display.html",
        "aspect_ratios": ["1.91:1", "1:1", "4:5"],
        "variables": [
            {"name": "logo_url", "type": "image", "required": False},
            {"name": "headline", "type": "text", "required": True},
            {"name": "subheadline", "type": "text", "required": False},
            {"name": "product_image", "type": "image", "required": True},
            {"name": "cta", "type": "text", "required": True, "default": "Shop Now"},
            {"name": "price", "type": "text", "required": False},
            {"name": "original_price", "type": "text", "required": False},
            {"name": "discount", "type": "number", "required": False},
            {"name": "cta_color", "type": "color", "required": False, "default": "#1a73e8"},
        ],
        "is_premium": False
    }
]


async def seed_templates():
    """Seed the database with initial templates."""
    await init_db()
    
    async with async_session_maker() as session:
        for template_data in TEMPLATES:
            # Check if template already exists
            result = await session.execute(
                select(Template).where(Template.name == template_data["name"])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"Template '{template_data['name']}' already exists, skipping...")
                continue
            
            # Read HTML file
            html_file = template_data.pop("html_file")
            try:
                with open(f"templates/{html_file}", "r") as f:
                    html_code = f.read()
            except FileNotFoundError:
                print(f"Template file {html_file} not found, using placeholder...")
                html_code = "<div>Template placeholder</div>"
            
            # Create template
            template = Template(
                id=uuid.uuid4(),
                name=template_data["name"],
                description=template_data["description"],
                category=template_data["category"],
                segment=template_data["segment"],
                html_code=html_code,
                css_code="",  # CSS is embedded in HTML
                variables=template_data["variables"],
                aspect_ratios=template_data["aspect_ratios"],
                is_premium=template_data["is_premium"],
                is_active=True,
                usage_count=0,
                created_at=datetime.now(timezone.utc)
            )
            
            session.add(template)
            print(f"Created template: {template_data['name']}")
        
        await session.commit()
        print("\nTemplate seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed_templates())
