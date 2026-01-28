"""Authentication schemas."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    name: Optional[str] = Field(None, max_length=255)


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response."""

    id: UUID
    email: str
    name: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


class TokenPayload(BaseModel):
    """Schema for JWT token payload."""

    sub: str
    exp: datetime
