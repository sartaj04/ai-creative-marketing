"""
BrandScale AI - Image Processing Service
Image manipulation, background removal, and enhancement.
"""
import io
from typing import Optional, Tuple

from loguru import logger
from PIL import Image, ImageEnhance, ImageFilter

from app.config import ASPECT_RATIO_DIMENSIONS, AspectRatio


class ImageProcessor:
    """
    Image processing utilities for creative assets.
    
    Features:
    - Background removal using rembg
    - Image resizing and cropping
    - Enhancement (brightness, contrast, sharpness)
    - Format conversion
    - Quality validation
    """
    
    def __init__(self):
        """Initialize image processor."""
        self._rembg_session = None
    
    def _get_rembg_session(self):
        """Lazy load rembg session for background removal."""
        if self._rembg_session is None:
            try:
                from rembg import new_session
                self._rembg_session = new_session("u2net")
            except ImportError:
                logger.warning("rembg not installed. Background removal unavailable.")
        return self._rembg_session
    
    async def remove_background(
        self,
        image_data: bytes,
        output_format: str = "PNG"
    ) -> bytes:
        """
        Remove background from an image.
        
        Args:
            image_data: Raw image bytes
            output_format: Output format (PNG recommended for transparency)
        
        Returns:
            Image bytes with transparent background
        """
        try:
            from rembg import remove
            
            # Process with rembg
            output = remove(
                image_data,
                session=self._get_rembg_session(),
                alpha_matting=True,
                alpha_matting_foreground_threshold=240,
                alpha_matting_background_threshold=10,
            )
            
            # Convert to PIL for format handling
            img = Image.open(io.BytesIO(output))
            
            # Ensure RGBA for transparency
            if img.mode != "RGBA":
                img = img.convert("RGBA")
            
            # Save to bytes
            buffer = io.BytesIO()
            img.save(buffer, format=output_format, quality=95)
            buffer.seek(0)
            
            logger.info("Background removed successfully")
            return buffer.read()
            
        except Exception as e:
            logger.error(f"Background removal failed: {e}")
            raise
    
    async def resize_image(
        self,
        image_data: bytes,
        width: int,
        height: int,
        maintain_aspect: bool = True,
        background_color: Optional[str] = None
    ) -> bytes:
        """
        Resize an image to specified dimensions.
        
        Args:
            image_data: Raw image bytes
            width: Target width
            height: Target height
            maintain_aspect: Whether to maintain aspect ratio
            background_color: Color to fill if padding needed (hex)
        
        Returns:
            Resized image bytes
        """
        img = Image.open(io.BytesIO(image_data))
        
        if maintain_aspect:
            # Calculate scaling factor
            original_ratio = img.width / img.height
            target_ratio = width / height
            
            if original_ratio > target_ratio:
                # Image is wider - scale by width
                new_width = width
                new_height = int(width / original_ratio)
            else:
                # Image is taller - scale by height
                new_height = height
                new_width = int(height * original_ratio)
            
            # Resize with high quality
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Create background if needed
            if background_color or (new_width != width or new_height != height):
                bg_color = self._parse_color(background_color or "#FFFFFF")
                
                if img.mode == "RGBA":
                    background = Image.new("RGBA", (width, height), bg_color + (255,))
                else:
                    background = Image.new("RGB", (width, height), bg_color)
                
                # Center the image
                offset = ((width - new_width) // 2, (height - new_height) // 2)
                background.paste(img, offset, img if img.mode == "RGBA" else None)
                img = background
        else:
            # Stretch to fit
            img = img.resize((width, height), Image.Resampling.LANCZOS)
        
        # Save to bytes
        buffer = io.BytesIO()
        format = "PNG" if img.mode == "RGBA" else "JPEG"
        img.save(buffer, format=format, quality=95)
        buffer.seek(0)
        
        return buffer.read()
    
    async def resize_for_aspect_ratio(
        self,
        image_data: bytes,
        aspect_ratio: AspectRatio,
        background_color: Optional[str] = None
    ) -> bytes:
        """
        Resize image for a specific aspect ratio.
        
        Args:
            image_data: Raw image bytes
            aspect_ratio: Target aspect ratio
            background_color: Background fill color
        
        Returns:
            Resized image bytes
        """
        dimensions = ASPECT_RATIO_DIMENSIONS.get(aspect_ratio, (1080, 1080))
        return await self.resize_image(
            image_data,
            dimensions[0],
            dimensions[1],
            maintain_aspect=True,
            background_color=background_color
        )
    
    async def enhance_image(
        self,
        image_data: bytes,
        brightness: float = 1.0,
        contrast: float = 1.0,
        sharpness: float = 1.0,
        saturation: float = 1.0
    ) -> bytes:
        """
        Enhance image quality.
        
        Args:
            image_data: Raw image bytes
            brightness: Brightness factor (1.0 = original)
            contrast: Contrast factor (1.0 = original)
            sharpness: Sharpness factor (1.0 = original)
            saturation: Color saturation (1.0 = original)
        
        Returns:
            Enhanced image bytes
        """
        img = Image.open(io.BytesIO(image_data))
        
        # Apply enhancements
        if brightness != 1.0:
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(brightness)
        
        if contrast != 1.0:
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(contrast)
        
        if sharpness != 1.0:
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(sharpness)
        
        if saturation != 1.0:
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(saturation)
        
        # Save to bytes
        buffer = io.BytesIO()
        format = "PNG" if img.mode == "RGBA" else "JPEG"
        img.save(buffer, format=format, quality=95)
        buffer.seek(0)
        
        return buffer.read()
    
    async def composite_on_background(
        self,
        foreground_data: bytes,
        background_color: str = "#FFFFFF",
        width: int = 1080,
        height: int = 1080,
        position: str = "center"
    ) -> bytes:
        """
        Place a foreground image (with transparency) on a solid background.
        
        Args:
            foreground_data: Image bytes (should have transparency)
            background_color: Hex color for background
            width: Canvas width
            height: Canvas height
            position: Position (center, top, bottom)
        
        Returns:
            Composited image bytes
        """
        # Create background
        bg_color = self._parse_color(background_color)
        background = Image.new("RGB", (width, height), bg_color)
        
        # Load foreground
        foreground = Image.open(io.BytesIO(foreground_data))
        if foreground.mode != "RGBA":
            foreground = foreground.convert("RGBA")
        
        # Scale foreground to fit (80% of canvas)
        max_fg_width = int(width * 0.8)
        max_fg_height = int(height * 0.8)
        
        fg_ratio = foreground.width / foreground.height
        target_ratio = max_fg_width / max_fg_height
        
        if fg_ratio > target_ratio:
            new_width = max_fg_width
            new_height = int(max_fg_width / fg_ratio)
        else:
            new_height = max_fg_height
            new_width = int(max_fg_height * fg_ratio)
        
        foreground = foreground.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Calculate position
        x = (width - new_width) // 2
        if position == "center":
            y = (height - new_height) // 2
        elif position == "top":
            y = int(height * 0.1)
        elif position == "bottom":
            y = height - new_height - int(height * 0.1)
        else:
            y = (height - new_height) // 2
        
        # Composite
        background.paste(foreground, (x, y), foreground)
        
        # Save to bytes
        buffer = io.BytesIO()
        background.save(buffer, format="PNG", quality=95)
        buffer.seek(0)
        
        return buffer.read()
    
    async def validate_image(
        self,
        image_data: bytes,
        min_width: int = 100,
        min_height: int = 100,
        max_size_mb: float = 10
    ) -> Tuple[bool, str]:
        """
        Validate image meets requirements.
        
        Args:
            image_data: Raw image bytes
            min_width: Minimum width in pixels
            min_height: Minimum height in pixels
            max_size_mb: Maximum file size in MB
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Check file size
            size_mb = len(image_data) / (1024 * 1024)
            if size_mb > max_size_mb:
                return False, f"Image too large: {size_mb:.2f}MB (max {max_size_mb}MB)"
            
            # Check dimensions
            img = Image.open(io.BytesIO(image_data))
            
            if img.width < min_width:
                return False, f"Image too narrow: {img.width}px (min {min_width}px)"
            
            if img.height < min_height:
                return False, f"Image too short: {img.height}px (min {min_height}px)"
            
            # Check format
            if img.format not in ["JPEG", "PNG", "GIF", "WEBP"]:
                return False, f"Unsupported format: {img.format}"
            
            return True, "Valid"
            
        except Exception as e:
            return False, f"Invalid image: {str(e)}"
    
    async def convert_format(
        self,
        image_data: bytes,
        target_format: str = "PNG",
        quality: int = 95
    ) -> bytes:
        """
        Convert image to a different format.
        
        Args:
            image_data: Raw image bytes
            target_format: Target format (PNG, JPEG, WEBP)
            quality: Output quality (1-100)
        
        Returns:
            Converted image bytes
        """
        img = Image.open(io.BytesIO(image_data))
        
        # Handle transparency for non-supporting formats
        if target_format.upper() == "JPEG" and img.mode == "RGBA":
            # Create white background
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        
        buffer = io.BytesIO()
        img.save(buffer, format=target_format.upper(), quality=quality)
        buffer.seek(0)
        
        return buffer.read()
    
    async def get_dominant_colors(
        self,
        image_data: bytes,
        num_colors: int = 5
    ) -> list:
        """
        Extract dominant colors from an image.
        
        Args:
            image_data: Raw image bytes
            num_colors: Number of colors to extract
        
        Returns:
            List of hex color strings
        """
        try:
            from colorthief import ColorThief
            
            color_thief = ColorThief(io.BytesIO(image_data))
            palette = color_thief.get_palette(color_count=num_colors)
            
            return [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in palette]
            
        except Exception as e:
            logger.warning(f"Color extraction failed: {e}")
            return []
    
    def _parse_color(self, hex_color: str) -> Tuple[int, int, int]:
        """Parse hex color to RGB tuple."""
        hex_color = hex_color.lstrip("#")
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    async def crop_to_aspect_ratio(
        self,
        image_data: bytes,
        aspect_ratio: AspectRatio,
        focus: str = "center"
    ) -> bytes:
        """
        Crop image to specific aspect ratio without resizing.
        
        Args:
            image_data: Raw image bytes
            aspect_ratio: Target aspect ratio
            focus: Crop focus point (center, top, bottom, left, right)
        
        Returns:
            Cropped image bytes
        """
        img = Image.open(io.BytesIO(image_data))
        
        # Get target ratio
        dimensions = ASPECT_RATIO_DIMENSIONS.get(aspect_ratio, (1, 1))
        target_ratio = dimensions[0] / dimensions[1]
        current_ratio = img.width / img.height
        
        if current_ratio > target_ratio:
            # Image is wider - crop width
            new_width = int(img.height * target_ratio)
            if focus == "left":
                left = 0
            elif focus == "right":
                left = img.width - new_width
            else:
                left = (img.width - new_width) // 2
            img = img.crop((left, 0, left + new_width, img.height))
        else:
            # Image is taller - crop height
            new_height = int(img.width / target_ratio)
            if focus == "top":
                top = 0
            elif focus == "bottom":
                top = img.height - new_height
            else:
                top = (img.height - new_height) // 2
            img = img.crop((0, top, img.width, top + new_height))
        
        buffer = io.BytesIO()
        format = "PNG" if img.mode == "RGBA" else "JPEG"
        img.save(buffer, format=format, quality=95)
        buffer.seek(0)
        
        return buffer.read()


# Global processor instance
image_processor = ImageProcessor()
