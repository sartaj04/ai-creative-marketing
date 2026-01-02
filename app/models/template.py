"""
BrandScale AI - Template Model
HTML/CSS templates for different segments and platforms.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.config import ProfileType
from app.database import Base


class Template(Base):
    """
    Template model for HTML/CSS creative templates.
    
    Attributes:
        id: Primary key
        name: Template name
        segment: Target segment (ecommerce/saas/personal)
        description: Template description
        html_code: Jinja2 HTML template
        css_code: CSS styles
        thumbnail_url: Preview image URL
        aspect_ratios: Supported aspect ratios
        platforms: Supported platforms
        variables: List of template variables
        is_active: Whether template is available
        is_premium: Whether template requires paid tier
        created_at: Creation timestamp
        updated_at: Last update timestamp
    
    Template variables available:
        - {{logo}}: Brand logo URL
        - {{brand_color}}: Primary brand color
        - {{secondary_color}}: Secondary brand color
        - {{product_image}}: Product/main image URL
        - {{headline}}: Main headline text
        - {{subheadline}}: Subheadline text
        - {{body}}: Body copy text
        - {{cta}}: Call-to-action text
        - {{price}}: Product price
        - {{discount}}: Discount text
        - {{background_color}}: Background color
        - {{accent_color}}: Accent color
    """
    
    __tablename__ = "templates"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Template categorization
    segment: Mapped[ProfileType] = mapped_column(
        Enum(ProfileType, name="template_segment"),
        nullable=False,
        index=True
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(
        String(100),
        default="general",
        nullable=False
    )
    
    # Template content
    html_code: Mapped[str] = mapped_column(Text, nullable=False)
    css_code: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Preview
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Supported formats
    aspect_ratios: Mapped[List[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: ["1:1", "9:16", "1.91:1"]
    )
    platforms: Mapped[List[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: ["instagram_feed", "facebook", "linkedin"]
    )
    
    # Template variables (for documentation/validation)
    variables: Mapped[List[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: ["headline", "cta", "product_image", "logo", "brand_color"]
    )
    
    # Default values for variables
    default_values: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=True,
        default=dict
    )
    
    # Availability
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    def __repr__(self) -> str:
        return f"<Template(id={self.id}, name='{self.name}', segment={self.segment.value})>"
    
    def get_full_html(self, data: Dict[str, Any]) -> str:
        """
        Get complete HTML document with CSS and data injected.
        This is used by the renderer to create the final image.
        """
        from jinja2 import Template as Jinja2Template
        
        # Merge default values with provided data
        merged_data = {**self.default_values, **data} if self.default_values else data
        
        html_template = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        {self.css_code}
    </style>
</head>
<body>
    {self.html_code}
</body>
</html>
"""
        
        template = Jinja2Template(html_template)
        return template.render(**merged_data)
    
    def validate_data(self, data: Dict[str, Any]) -> List[str]:
        """
        Validate that all required variables are present in data.
        Returns list of missing required variables.
        """
        missing = []
        for var in self.variables:
            if var not in data and (not self.default_values or var not in self.default_values):
                missing.append(var)
        return missing
