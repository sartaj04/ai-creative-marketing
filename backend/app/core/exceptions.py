"""
Custom exception classes for the application.
"""
from typing import Optional, Any, Dict


class PixoException(Exception):
    """Base exception for Pixo application."""
    
    def __init__(
        self,
        message: str,
        code: str = "PIXO_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)


class ScrapingException(PixoException):
    """Exception raised when scraping fails."""
    
    def __init__(self, message: str, url: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="SCRAPING_ERROR",
            details={"url": url, **(details or {})}
        )


class GenerationException(PixoException):
    """Exception raised when content generation fails."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="GENERATION_ERROR",
            details=details
        )


class TemplateRenderException(PixoException):
    """Exception raised when template rendering fails."""
    
    def __init__(self, message: str, template_id: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="TEMPLATE_RENDER_ERROR",
            details={"template_id": template_id, **(details or {})}
        )


class StorageException(PixoException):
    """Exception raised when S3 storage operations fail."""
    
    def __init__(self, message: str, operation: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="STORAGE_ERROR",
            details={"operation": operation, **(details or {})}
        )


class UsageLimitException(PixoException):
    """Exception raised when user exceeds usage limits."""
    
    def __init__(self, current_usage: int, limit: int):
        super().__init__(
            message=f"Usage limit exceeded. Used {current_usage}/{limit}",
            code="USAGE_LIMIT_EXCEEDED",
            details={"current_usage": current_usage, "limit": limit}
        )


class PaymentException(PixoException):
    """Exception raised when payment processing fails."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="PAYMENT_ERROR",
            details=details
        )
