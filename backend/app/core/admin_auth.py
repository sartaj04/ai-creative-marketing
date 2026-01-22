"""
Admin authentication utilities.

Provides dependencies for admin-only endpoints.
"""
from fastapi import Depends, HTTPException, status

from app.core.auth import get_current_user
from app.models.user import User


async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Verify that the current user is an admin.
    
    Use this dependency on admin-only endpoints to ensure
    only admins can access them.
    
    Args:
        current_user: The authenticated user from JWT token
        
    Returns:
        The admin User object
        
    Raises:
        HTTPException: If user is not an admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required. This endpoint is restricted to administrators only."
        )
    return current_user


async def get_optional_admin_user(
    current_user: User = Depends(get_current_user)
) -> tuple[User, bool]:
    """
    Get current user and whether they have admin access.
    
    Useful for endpoints that behave differently for admins vs regular users.
    
    Args:
        current_user: The authenticated user from JWT token
        
    Returns:
        Tuple of (User, is_admin boolean)
    """
    return current_user, current_user.is_admin
