"""
BrandScale AI - Template Seed Script
Populates the database with starter templates.
"""
import asyncio
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import ProfileType
from app.database import async_session_factory
from app.models.template import Template


# Template definitions
TEMPLATES = [
    {
        "name": "Product Showcase - Split Layout",
        "segment": ProfileType.ECOMMERCE,
        "description": "Product on left, text on right. Perfect for featuring individual products.",
        "category": "product",
        "html_file": "ecommerce_product_left.html",
        "css_file": "ecommerce_product_left.css",
        "aspect_ratios": ["1:1", "4:5", "1.91:1"],
        "platforms": ["instagram_feed", "facebook", "linkedin"],
        "variables": ["headline", "subheadline", "body", "cta", "product_image", "logo", "brand_color", "price"],
        "default_values": {
            "background_color": "#FFFFFF",
            "cta": "Shop Now",
        },
        "is_premium": False,
    },
    {
        "name": "SaaS Feature Highlight",
        "segment": ProfileType.SAAS,
        "description": "Gradient background with feature highlights. Great for product launches.",
        "category": "feature",
        "html_file": "saas_feature.html",
        "css_file": "saas_feature.css",
        "aspect_ratios": ["1:1", "1.91:1", "16:9"],
        "platforms": ["linkedin", "twitter", "facebook"],
        "variables": ["headline", "subheadline", "body", "cta", "product_image", "logo", "brand_color", "secondary_color", "feature_1", "feature_2", "feature_3"],
        "default_values": {
            "brand_color": "#6366F1",
            "secondary_color": "#8B5CF6",
            "cta": "Start Free Trial",
        },
        "is_premium": False,
    },
    {
        "name": "Quote Card - Dark Mode",
        "segment": ProfileType.PERSONAL,
        "description": "Elegant quote card for thought leadership. Works great for LinkedIn.",
        "category": "quote",
        "html_file": "personal_quote.html",
        "css_file": "personal_quote.css",
        "aspect_ratios": ["1:1", "4:5", "9:16"],
        "platforms": ["instagram_feed", "linkedin", "twitter"],
        "variables": ["headline", "subheadline", "body", "cta", "product_image", "brand_color", "background_color"],
        "default_values": {
            "background_color": "#1A1A2E",
            "brand_color": "#E94560",
        },
        "is_premium": False,
    },
]


async def load_template_files(template_dir: Path, html_file: str, css_file: str) -> tuple:
    """Load HTML and CSS files for a template."""
    html_path = template_dir / html_file
    css_path = template_dir / css_file
    
    html_code = html_path.read_text() if html_path.exists() else "<div>Template not found</div>"
    css_code = css_path.read_text() if css_path.exists() else ""
    
    return html_code, css_code


async def seed_templates():
    """Seed the templates table with starter templates."""
    template_dir = Path(__file__).parent.parent / "app" / "templates"
    
    async with async_session_factory() as db:
        for template_data in TEMPLATES:
            # Check if template already exists
            from sqlalchemy import select
            stmt = select(Template).where(Template.name == template_data["name"])
            existing = (await db.execute(stmt)).scalar_one_or_none()
            
            if existing:
                print(f"Template '{template_data['name']}' already exists, skipping...")
                continue
            
            # Load HTML and CSS
            html_code, css_code = await load_template_files(
                template_dir,
                template_data["html_file"],
                template_data["css_file"]
            )
            
            # Create template
            template = Template(
                name=template_data["name"],
                segment=template_data["segment"],
                description=template_data["description"],
                category=template_data["category"],
                html_code=html_code,
                css_code=css_code,
                aspect_ratios=template_data["aspect_ratios"],
                platforms=template_data["platforms"],
                variables=template_data["variables"],
                default_values=template_data["default_values"],
                is_active=True,
                is_premium=template_data["is_premium"],
            )
            
            db.add(template)
            print(f"Created template: {template_data['name']}")
        
        await db.commit()
        print(f"\nSeeded {len(TEMPLATES)} templates successfully!")


if __name__ == "__main__":
    asyncio.run(seed_templates())
