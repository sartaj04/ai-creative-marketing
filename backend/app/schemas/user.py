"""
User-related Pydantic schemas.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserTier, UserSegment


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)
    segment: Optional[UserSegment] = None
    
    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response."""
    id: UUID
    email: str
    full_name: Optional[str] = None
    tier: UserTier
    segment: Optional[UserSegment] = None
    usage_count: int
    is_active: bool
    is_verified: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    
    # Computed fields
    usage_limit: int
    can_generate: bool
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    full_name: Optional[str] = Field(None, max_length=255)
    segment: Optional[UserSegment] = None


class TokenResponse(BaseModel):
    """Schema for authentication token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserResponse
