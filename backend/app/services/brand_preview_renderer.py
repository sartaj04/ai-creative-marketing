"""
Brand Preview Renderer Service.

Generates HTML previews of templates with different sample brand profiles.
This is a lightweight service that applies brand variables to templates
and returns HTML that can be rendered in iframes on the frontend.

NOTE: No Playwright/browser automation needed - frontend handles rendering.
"""
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from jinja2 import Template as Jinja2Template


@dataclass
class BrandProfile:
    """Sample brand profile for template preview."""
    id: str
    name: str
    primary_color: str
    secondary_color: str
    background_color: str
    text_color: str
    accent_color: str
    font_family: str
    sample_headline: str
    sample_subheadline: str
    sample_cta: str
    sample_description: str
    logo_placeholder: str  # URL to a placeholder logo


@dataclass
class BrandPreviewResult:
    """Result of applying a brand profile to a template."""
    brand_id: str
    brand_name: str
    rendered_html: str  # Complete HTML document for iframe
    colors_used: Dict[str, str]
    font_family: str
    sample_content: Dict[str, str]


# Sample brand profiles for preview
SAMPLE_BRAND_PROFILES: List[BrandProfile] = [
    BrandProfile(
        id="tech_startup",
        name="Tech Startup",
        primary_color="#0066FF",
        secondary_color="#00D4FF",
        background_color="#0A0A0F",
        text_color="#FFFFFF",
        accent_color="#8B5CF6",
        font_family="'Inter', 'Segoe UI', sans-serif",
        sample_headline="Build Faster. Scale Smarter.",
        sample_subheadline="The all-in-one platform for modern teams",
        sample_cta="Start Free Trial",
        sample_description="Enterprise-grade tools at startup speed",
        logo_placeholder="https://placehold.co/200x60/0066FF/FFFFFF?text=TechCo"
    ),
    BrandProfile(
        id="ecommerce_sale",
        name="E-commerce Sale",
        primary_color="#FF3366",
        secondary_color="#FFD700",
        background_color="#1A1A1A",
        text_color="#FFFFFF",
        accent_color="#FF6B35",
        font_family="'Poppins', 'Arial Black', sans-serif",
        sample_headline="MEGA SALE - Up to 70% OFF!",
        sample_subheadline="Limited time offer on bestsellers",
        sample_cta="Shop Now",
        sample_description="Don't miss out on these incredible deals",
        logo_placeholder="https://placehold.co/200x60/FF3366/FFFFFF?text=ShopMax"
    ),
    BrandProfile(
        id="healthcare",
        name="Healthcare & Wellness",
        primary_color="#10B981",
        secondary_color="#3B82F6",
        background_color="#F0FDF4",
        text_color="#064E3B",
        accent_color="#06B6D4",
        font_family="'Open Sans', 'Helvetica Neue', sans-serif",
        sample_headline="Your Health, Our Priority",
        sample_subheadline="Trusted care for your whole family",
        sample_cta="Book Appointment",
        sample_description="Expert doctors available 24/7",
        logo_placeholder="https://placehold.co/200x60/10B981/FFFFFF?text=MediCare"
    ),
    BrandProfile(
        id="food_restaurant",
        name="Food & Restaurant",
        primary_color="#F97316",
        secondary_color="#FBBF24",
        background_color="#FFFBEB",
        text_color="#7C2D12",
        accent_color="#EF4444",
        font_family="'Playfair Display', 'Georgia', serif",
        sample_headline="Taste the Difference",
        sample_subheadline="Fresh ingredients, authentic flavors",
        sample_cta="Order Now",
        sample_description="Free delivery on orders over ₹499",
        logo_placeholder="https://placehold.co/200x60/F97316/FFFFFF?text=FoodieHub"
    ),
    BrandProfile(
        id="luxury_premium",
        name="Luxury & Premium",
        primary_color="#B8860B",
        secondary_color="#D4AF37",
        background_color="#0D0D0D",
        text_color="#FAFAFA",
        accent_color="#C9A227",
        font_family="'Cormorant Garamond', 'Times New Roman', serif",
        sample_headline="Elegance Redefined",
        sample_subheadline="Crafted for the discerning",
        sample_cta="Discover More",
        sample_description="Timeless luxury, modern sensibility",
        logo_placeholder="https://placehold.co/200x60/B8860B/FFFFFF?text=Luxuria"
    ),
    BrandProfile(
        id="real_estate",
        name="Real Estate",
        primary_color="#1E3A5F",
        secondary_color="#3498DB",
        background_color="#F8FAFC",
        text_color="#1E293B",
        accent_color="#22C55E",
        font_family="'Montserrat', 'Arial', sans-serif",
        sample_headline="Find Your Dream Home",
        sample_subheadline="Premium properties in prime locations",
        sample_cta="View Properties",
        sample_description="0% brokerage | Verified listings",
        logo_placeholder="https://placehold.co/200x60/1E3A5F/FFFFFF?text=HomeQuest"
    ),
    BrandProfile(
        id="fitness_gym",
        name="Fitness & Gym",
        primary_color="#7C3AED",
        secondary_color="#EC4899",
        background_color="#18181B",
        text_color="#FFFFFF",
        accent_color="#F59E0B",
        font_family="'Oswald', 'Impact', sans-serif",
        sample_headline="TRANSFORM YOUR BODY",
        sample_subheadline="Join the fitness revolution",
        sample_cta="Join Now - 50% OFF",
        sample_description="Expert trainers | Top equipment | Results guaranteed",
        logo_placeholder="https://placehold.co/200x60/7C3AED/FFFFFF?text=FitZone"
    ),
]


def get_brand_profile(brand_id: str) -> Optional[BrandProfile]:
    """Get a brand profile by ID."""
    for profile in SAMPLE_BRAND_PROFILES:
        if profile.id == brand_id:
            return profile
    return None


def get_all_brand_profiles() -> List[BrandProfile]:
    """Get all available brand profiles."""
    return SAMPLE_BRAND_PROFILES


def generate_brand_preview_data(brand: BrandProfile) -> Dict[str, Any]:
    """
    Generate template variable data from a brand profile.

    Uses ONLY the standard variable names defined in the variable schema.
    This ensures compatibility with templates generated by the CrewAI pipeline.

    Standard Variables:
    - Text: headline, subheadline, cta_text, description
    - Images: logo_url, product_image, background_image
    - Colors: primary_color, secondary_color, background_color, text_color
    - Commerce: discount, price, original_price, offer_text
    """
    return {
        # Text content (standard names)
        "headline": brand.sample_headline,
        "subheadline": brand.sample_subheadline,
        "cta_text": brand.sample_cta,
        "description": brand.sample_description,

        # Colors (standard names)
        "primary_color": brand.primary_color,
        "secondary_color": brand.secondary_color,
        "background_color": brand.background_color,
        "text_color": brand.text_color,

        # Images (standard names with placeholder URLs)
        "logo_url": brand.logo_placeholder,
        "product_image": f"https://placehold.co/400x400/{brand.primary_color.replace('#', '')}/FFFFFF?text=Product",
        "background_image": f"https://placehold.co/1200x800/{brand.background_color.replace('#', '')}/333333?text=",

        # Commerce (standard names)
        "discount": "50%",
        "price": "₹999",
        "original_price": "₹1,999",
        "offer_text": "Limited Time Offer",
    }


def render_template_with_brand(
    html_code: str,
    css_code: str,
    brand: BrandProfile,
    width: int = 400,
    height: int = 400
) -> BrandPreviewResult:
    """
    Render a template with a specific brand profile.
    
    Returns complete HTML document that can be used in an iframe.
    No Playwright needed - just string substitution!
    
    Args:
        html_code: Template HTML code (with Jinja2 variables)
        css_code: Template CSS code
        brand: Brand profile to apply
        width: Preview width in pixels
        height: Preview height in pixels
        
    Returns:
        BrandPreviewResult with rendered HTML
    """
    # Generate data for this brand
    preview_data = generate_brand_preview_data(brand)
    
    # NOTE: Defaults removed as requested - no fallback for empty HTML
    # If html_code is empty, we'll just render an empty template
    
    # Render HTML with Jinja2
    try:
        if html_code and html_code.strip():
            template = Jinja2Template(html_code)
            rendered_html = template.render(**preview_data)
        else:
            rendered_html = ""
    except Exception as e:
        # NOTE: Error fallback removed - just return empty and log
        import logging
        logging.error(f"Brand preview template render error: {str(e)}")
        rendered_html = ""
    
    # If HTML is still empty (no input or error), show a clear "No Content" placeholder
    if not rendered_html or not rendered_html.strip():
        bg_color = brand.background_color or "#f8fafc"
        primary_color = brand.primary_color or "#6366f1"
        text_color = brand.text_color or "#1e293b"
        
        rendered_html = f"""
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: {bg_color}; color: {text_color}; font-family: sans-serif; text-align: center; border: 2px dashed {primary_color}44;">
            <div style="font-size: 3rem; margin-bottom: 20px;">🪄</div>
            <h2 style="font-size: 1.5rem; font-weight: 700; color: {primary_color}; margin-bottom: 8px;">No Template Content</h2>
            <p style="font-size: 1rem; opacity: 0.7; max-width: 250px;">The AI hasn't generated any HTML code yet, or the rendering failed.</p>
        </div>
        """
    
    # Apply colors to CSS (replace CSS variables)
    css_with_colors = css_code if css_code else ""
    css_with_colors = css_with_colors.replace("var(--primary-color)", brand.primary_color)
    css_with_colors = css_with_colors.replace("var(--secondary-color)", brand.secondary_color)
    css_with_colors = css_with_colors.replace("var(--background-color)", brand.background_color)
    css_with_colors = css_with_colors.replace("var(--text-color)", brand.text_color)
    css_with_colors = css_with_colors.replace("var(--accent-color)", brand.accent_color)
    
    # Build complete HTML document for iframe
    full_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Open+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700;800&family=Oswald:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        html, body {{ 
            width: 100%; 
            height: 100%; 
            overflow: hidden; 
            font-family: {brand.font_family};
            background: {brand.background_color};
        }}
        
        /* CSS Variables for brand colors */
        :root {{
            --primary-color: {brand.primary_color};
            --secondary-color: {brand.secondary_color};
            --background-color: {brand.background_color};
            --text-color: {brand.text_color};
            --accent-color: {brand.accent_color};
        }}
        
        {css_with_colors}
    </style>
</head>
<body>
    {rendered_html}
</body>
</html>"""
    
    return BrandPreviewResult(
        brand_id=brand.id,
        brand_name=brand.name,
        rendered_html=full_html,
        colors_used={
            "primary": brand.primary_color,
            "secondary": brand.secondary_color,
            "background": brand.background_color,
            "text": brand.text_color,
            "accent": brand.accent_color,
        },
        font_family=brand.font_family,
        sample_content={
            "headline": brand.sample_headline,
            "subheadline": brand.sample_subheadline,
            "cta": brand.sample_cta,
        }
    )


def render_all_brand_previews(
    html_code: str,
    css_code: str,
) -> List[BrandPreviewResult]:
    """
    Render a template with all sample brand profiles.
    
    This is a synchronous function - no async needed since
    we're just doing string manipulation, not browser rendering!
    
    Args:
        html_code: Template HTML code
        css_code: Template CSS code
        
    Returns:
        List of BrandPreviewResult for each brand
    """
    results = []
    
    for brand in SAMPLE_BRAND_PROFILES:
        result = render_template_with_brand(
            html_code=html_code,
            css_code=css_code,
            brand=brand,
        )
        results.append(result)
    
    return results
