"""
BrandScale AI - Authentication Utilities
JWT token handling, password hashing, and user authentication.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings, UserTier
from app.database import get_db
from app.models.user import User
from app.schemas.user import TokenData


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer security scheme
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def create_access_token(
    user_id: int,
    email: str,
    tier: UserTier,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        user_id: User's database ID
        email: User's email
        tier: User's subscription tier
        expires_delta: Optional custom expiration time
    
    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiration_hours)
    
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "tier": tier.value,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt


def decode_access_token(token: str) -> TokenData:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token string
    
    Returns:
        TokenData with user information
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )
        
        user_id = int(payload.get("sub"))
        email = payload.get("email")
        tier = UserTier(payload.get("tier"))
        exp = datetime.fromtimestamp(payload.get("exp"))
        
        if user_id is None or email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return TokenData(
            user_id=user_id,
            email=email,
            tier=tier,
            exp=exp
        )
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Get a user by email address."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    """Get a user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def authenticate_user(
    db: AsyncSession,
    email: str,
    password: str
) -> Optional[User]:
    """
    Authenticate a user by email and password.
    
    Args:
        db: Database session
        email: User's email
        password: Plain text password
    
    Returns:
        User object if authentication successful, None otherwise
    """
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    FastAPI dependency to get the current authenticated user.
    
    Usage:
        @app.get("/protected")
        async def protected_route(user: User = Depends(get_current_user)):
            ...
    """
    token_data = decode_access_token(credentials.credentials)
    
    user = await get_user_by_id(db, token_data.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Reset usage counter if needed
    user.reset_usage_if_needed()
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    FastAPI dependency to ensure user is active.
    Currently just returns the user, but can be extended
    to check for account suspension, etc.
    """
    return current_user


def require_tier(minimum_tier: UserTier):
    """
    Decorator/dependency factory to require a minimum subscription tier.
    
    Usage:
        @app.get("/pro-feature")
        async def pro_feature(user: User = Depends(require_tier(UserTier.PRO))):
            ...
    """
    async def tier_checker(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        tier_hierarchy = {
            UserTier.FREE: 0,
            UserTier.STARTER: 1,
            UserTier.PRO: 2,
        }
        
        if tier_hierarchy[current_user.tier] < tier_hierarchy[minimum_tier]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires {minimum_tier.value} tier or higher"
            )
        
        return current_user
    
    return tier_checker
