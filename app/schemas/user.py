"""
BrandScale AI - User Schemas
Pydantic models for user authentication and management.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.config import UserSegment, UserTier


class UserCreate(BaseModel):
    """Schema for user registration."""
    
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    segment: Optional[UserSegment] = None
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Ensure password has minimum complexity."""
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
    
    id: int
    email: str
    tier: UserTier
    segment: Optional[UserSegment] = None
    usage_count: int
    usage_reset_date: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    
    segment: Optional[UserSegment] = None
    

class Token(BaseModel):
    """JWT token response."""
    
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserResponse


class TokenData(BaseModel):
    """Data extracted from JWT token."""
    
    user_id: int
    email: str
    tier: UserTier
    exp: datetime
