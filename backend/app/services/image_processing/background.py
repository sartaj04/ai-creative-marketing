"""
Background removal and generation using rembg and AI.
"""
import io
from typing import Optional, Tuple
from PIL import Image
import httpx

from app.config import settings


async def remove_background(
    image_data: bytes,
    model: str = "u2net"
) -> bytes:
    """
    Remove background from an image using rembg.
    
    Args:
        image_data: Raw image bytes
        model: rembg model to use (u2net, u2netp, u2net_human_seg, etc.)
    
    Returns:
        PNG image bytes with transparent background
    """
    from rembg import remove, new_session
    
    # Create session with specified model
    session = new_session(model)
    
    # Process image
    output = remove(
        image_data,
        session=session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10,
    )
    
    return output


async def remove_background_simple(image_data: bytes) -> bytes:
    """
    Simple background removal without alpha matting.
    Faster but less accurate edges.
    """
    from rembg import remove
    return remove(image_data)


async def generate_background(
    subject_image: bytes,
    prompt: str,
    style: str = "gradient",
    colors: Optional[Tuple[str, str]] = None
) -> bytes:
    """
    Generate a new background for the subject.
    
    Args:
        subject_image: Image with transparent background
        prompt: Description of desired background
        style: gradient, solid, or ai_generated
        colors: Tuple of (start_color, end_color) for gradients
    
    Returns:
        Composited image with new background
    """
    from PIL import Image
    import io
    
    # Open subject with transparency
    subject = Image.open(io.BytesIO(subject_image))
    if subject.mode != 'RGBA':
        subject = subject.convert('RGBA')
    
    width, height = subject.size
    
    if style == "solid":
        # Create solid color background
        bg_color = colors[0] if colors else "#1a1a2e"
        background = Image.new('RGBA', (width, height), bg_color)
    
    elif style == "gradient":
        # Create gradient background
        from PIL import ImageDraw
        
        start_color = colors[0] if colors else "#1a1a2e"
        end_color = colors[1] if colors and len(colors) > 1 else "#16213e"
        
        background = Image.new('RGBA', (width, height))
        draw = ImageDraw.Draw(background)
        
        # Parse hex colors
        r1, g1, b1 = int(start_color[1:3], 16), int(start_color[3:5], 16), int(start_color[5:7], 16)
        r2, g2, b2 = int(end_color[1:3], 16), int(end_color[3:5], 16), int(end_color[5:7], 16)
        
        # Draw gradient (top to bottom)
        for y in range(height):
            ratio = y / height
            r = int(r1 + (r2 - r1) * ratio)
            g = int(g1 + (g2 - g1) * ratio)
            b = int(b1 + (b2 - b1) * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
    
    elif style == "ai_generated":
        # Use Gemini to generate background description, then create
        # For now, fall back to gradient
        background = await _generate_ai_background(width, height, prompt)
    
    else:
        background = Image.new('RGBA', (width, height), "#ffffff")
    
    # Composite subject over background
    background.paste(subject, (0, 0), subject)
    
    # Convert to bytes
    output = io.BytesIO()
    background.save(output, format='PNG')
    return output.getvalue()


async def _generate_ai_background(
    width: int,
    height: int,
    prompt: str
) -> Image.Image:
    """
    Generate AI background using Gemini Vision or placeholder.
    For MVP, returns a styled gradient based on prompt keywords.
    """
    from PIL import Image, ImageDraw
    
    # Parse prompt for color hints
    prompt_lower = prompt.lower()
    
    if "festive" in prompt_lower or "diwali" in prompt_lower:
        colors = [("#ff6b35", "#f7931e"), ("#ffd700", "#ff4500")]
    elif "professional" in prompt_lower or "corporate" in prompt_lower:
        colors = [("#1a365d", "#2d3748"), ("#4a5568", "#2b6cb0")]
    elif "nature" in prompt_lower or "green" in prompt_lower:
        colors = [("#134e5e", "#71b280"), ("#11998e", "#38ef7d")]
    elif "luxury" in prompt_lower or "premium" in prompt_lower:
        colors = [("#1a1a2e", "#16213e"), ("#0f0c29", "#302b63")]
    else:
        colors = [("#667eea", "#764ba2"), ("#f093fb", "#f5576c")]
    
    # Create gradient
    background = Image.new('RGBA', (width, height))
    draw = ImageDraw.Draw(background)
    
    start, end = colors[0]
    r1, g1, b1 = int(start[1:3], 16), int(start[3:5], 16), int(start[5:7], 16)
    r2, g2, b2 = int(end[1:3], 16), int(end[3:5], 16), int(end[5:7], 16)
    
    for y in range(height):
        ratio = y / height
        r = int(r1 + (r2 - r1) * ratio)
        g = int(g1 + (g2 - g1) * ratio)
        b = int(b1 + (b2 - b1) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
    
    return background


async def enhance_image(
    image_data: bytes,
    brightness: float = 1.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
    sharpness: float = 1.0
) -> bytes:
    """
    Enhance image quality with adjustments.
    
    Args:
        image_data: Raw image bytes
        brightness: 1.0 = original, >1 = brighter
        contrast: 1.0 = original, >1 = more contrast
        saturation: 1.0 = original, >1 = more saturated
        sharpness: 1.0 = original, >1 = sharper
    
    Returns:
        Enhanced image bytes
    """
    from PIL import Image, ImageEnhance
    import io
    
    img = Image.open(io.BytesIO(image_data))
    
    # Apply enhancements
    if brightness != 1.0:
        img = ImageEnhance.Brightness(img).enhance(brightness)
    
    if contrast != 1.0:
        img = ImageEnhance.Contrast(img).enhance(contrast)
    
    if saturation != 1.0:
        img = ImageEnhance.Color(img).enhance(saturation)
    
    if sharpness != 1.0:
        img = ImageEnhance.Sharpness(img).enhance(sharpness)
    
    # Convert back to bytes
    output = io.BytesIO()
    format = 'PNG' if img.mode == 'RGBA' else 'JPEG'
    img.save(output, format=format, quality=95)
    return output.getvalue()


async def auto_enhance(image_data: bytes) -> bytes:
    """
    Automatically enhance image with balanced settings.
    """
    return await enhance_image(
        image_data,
        brightness=1.05,
        contrast=1.1,
        saturation=1.15,
        sharpness=1.2
    )
