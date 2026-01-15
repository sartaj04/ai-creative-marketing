"""
Main image processor orchestrating all image operations.
"""
import io
from typing import Optional, Dict, Any, List
from PIL import Image
import uuid

from app.services.image_processing.background import (
    remove_background,
    generate_background,
    enhance_image,
    auto_enhance
)
from app.services.s3_storage import S3Storage
from app.config import settings


class ImageProcessor:
    """
    Unified image processing pipeline for Pixo.
    Handles product images, backgrounds, and enhancements.
    """
    
    def __init__(self):
        self.s3 = S3Storage()
    
    async def process_product_image(
        self,
        image_data: bytes,
        remove_bg: bool = True,
        auto_enhance_enabled: bool = True,
        new_background: Optional[Dict[str, Any]] = None,
        resize_to: Optional[tuple] = None
    ) -> Dict[str, Any]:
        """
        Full product image processing pipeline.
        
        Args:
            image_data: Raw product image bytes
            remove_bg: Whether to remove background
            auto_enhance_enabled: Apply auto enhancement
            new_background: Background config {style, prompt, colors}
            resize_to: Target (width, height)
        
        Returns:
            Dict with processed image URL and metadata
        """
        result = {
            "original_size": None,
            "processed_size": None,
            "has_transparency": False,
            "image_url": None,
            "thumbnail_url": None
        }
        
        # Get original size
        img = Image.open(io.BytesIO(image_data))
        result["original_size"] = img.size
        
        processed = image_data
        
        # Step 1: Remove background
        if remove_bg:
            processed = await remove_background(processed)
            result["has_transparency"] = True
        
        # Step 2: Apply new background if specified
        if new_background and result["has_transparency"]:
            processed = await generate_background(
                processed,
                prompt=new_background.get("prompt", ""),
                style=new_background.get("style", "gradient"),
                colors=new_background.get("colors")
            )
            result["has_transparency"] = False
        
        # Step 3: Enhance
        if auto_enhance_enabled:
            processed = await auto_enhance(processed)
        
        # Step 4: Resize if needed
        if resize_to:
            processed = await self._resize_image(processed, resize_to)
        
        # Get final size
        final_img = Image.open(io.BytesIO(processed))
        result["processed_size"] = final_img.size
        
        # Step 5: Upload to S3
        filename = f"processed/{uuid.uuid4()}.png"
        result["image_url"] = await self.s3.upload_image(
            processed,
            filename,
            content_type="image/png"
        )
        
        # Generate thumbnail
        thumbnail = await self._create_thumbnail(processed, (300, 300))
        thumb_filename = f"thumbnails/{uuid.uuid4()}.jpg"
        result["thumbnail_url"] = await self.s3.upload_image(
            thumbnail,
            thumb_filename,
            content_type="image/jpeg"
        )
        
        return result
    
    async def batch_process(
        self,
        images: List[bytes],
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Process multiple images with the same settings.
        """
        results = []
        for image_data in images:
            result = await self.process_product_image(image_data, **kwargs)
            results.append(result)
        return results
    
    async def create_multiple_sizes(
        self,
        image_data: bytes,
        sizes: Dict[str, tuple]
    ) -> Dict[str, str]:
        """
        Create multiple size versions of an image.
        
        Args:
            image_data: Source image bytes
            sizes: Dict of {name: (width, height)}
        
        Returns:
            Dict of {name: url}
        """
        urls = {}
        
        for name, size in sizes.items():
            resized = await self._resize_image(image_data, size)
            filename = f"resized/{uuid.uuid4()}_{name}.png"
            url = await self.s3.upload_image(
                resized,
                filename,
                content_type="image/png"
            )
            urls[name] = url
        
        return urls
    
    async def _resize_image(
        self,
        image_data: bytes,
        target_size: tuple,
        maintain_aspect: bool = True
    ) -> bytes:
        """
        Resize image to target size.
        """
        img = Image.open(io.BytesIO(image_data))
        
        if maintain_aspect:
            img.thumbnail(target_size, Image.Resampling.LANCZOS)
        else:
            img = img.resize(target_size, Image.Resampling.LANCZOS)
        
        output = io.BytesIO()
        format = 'PNG' if img.mode == 'RGBA' else 'JPEG'
        img.save(output, format=format, quality=95)
        return output.getvalue()
    
    async def _create_thumbnail(
        self,
        image_data: bytes,
        size: tuple = (300, 300)
    ) -> bytes:
        """
        Create a JPEG thumbnail.
        """
        img = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB for JPEG
        if img.mode in ('RGBA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[3])
            else:
                background.paste(img)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        img.thumbnail(size, Image.Resampling.LANCZOS)
        
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=85, optimize=True)
        return output.getvalue()
    
    async def extract_dominant_colors(
        self,
        image_data: bytes,
        num_colors: int = 5
    ) -> List[str]:
        """
        Extract dominant colors from image.
        Returns list of hex color strings.
        """
        from collections import Counter
        
        img = Image.open(io.BytesIO(image_data))
        img = img.convert('RGB')
        
        # Reduce size for faster processing
        img.thumbnail((150, 150))
        
        # Get pixels
        pixels = list(img.getdata())
        
        # Quantize colors (reduce to 32 colors)
        quantized = []
        for r, g, b in pixels:
            qr = (r // 32) * 32
            qg = (g // 32) * 32
            qb = (b // 32) * 32
            quantized.append((qr, qg, qb))
        
        # Count and get top colors
        counter = Counter(quantized)
        top_colors = counter.most_common(num_colors)
        
        # Convert to hex
        hex_colors = []
        for (r, g, b), _ in top_colors:
            hex_colors.append(f"#{r:02x}{g:02x}{b:02x}")
        
        return hex_colors
