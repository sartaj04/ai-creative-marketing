"""
BrandScale AI - Rate Limiter
Redis-backed rate limiting by user tier.
"""
from functools import wraps
from typing import Callable, Optional

import redis.asyncio as redis
from fastapi import HTTPException, Request, status
from loguru import logger

from app.config import settings, TIER_LIMITS, UserTier
from app.models.user import User


class RateLimiter:
    """
    Redis-backed rate limiter for API endpoints.
    Limits are based on user subscription tier.
    """
    
    def __init__(self):
        """Initialize Redis connection."""
        self._redis: Optional[redis.Redis] = None
    
    async def get_redis(self) -> redis.Redis:
        """Get or create Redis connection."""
        if self._redis is None:
            self._redis = redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
        return self._redis
    
    async def close(self):
        """Close Redis connection."""
        if self._redis:
            await self._redis.close()
            self._redis = None
    
    def _get_key(self, user_id: int, action: str = "generate") -> str:
        """Generate Redis key for rate limiting."""
        return f"ratelimit:{action}:{user_id}"
    
    async def check_rate_limit(
        self,
        user_id: int,
        tier: UserTier,
        action: str = "generate"
    ) -> tuple[bool, int, int]:
        """
        Check if user is within rate limits.
        
        Args:
            user_id: User ID
            tier: User's subscription tier
            action: Action type (e.g., "generate", "scrape")
        
        Returns:
            Tuple of (allowed, current_count, limit)
        """
        if not settings.rate_limit_enabled:
            return True, 0, -1
        
        limit = TIER_LIMITS.get(tier, 0)
        
        # Pro tier has unlimited access
        if limit == -1:
            return True, 0, -1
        
        r = await self.get_redis()
        key = self._get_key(user_id, action)
        
        # Get current count
        count = await r.get(key)
        current_count = int(count) if count else 0
        
        return current_count < limit, current_count, limit
    
    async def increment(
        self,
        user_id: int,
        action: str = "generate",
        amount: int = 1
    ) -> int:
        """
        Increment the rate limit counter.
        
        Args:
            user_id: User ID
            action: Action type
            amount: Amount to increment by
        
        Returns:
            New count
        """
        r = await self.get_redis()
        key = self._get_key(user_id, action)
        
        # Increment with monthly expiry (31 days)
        pipe = r.pipeline()
        pipe.incrby(key, amount)
        pipe.expire(key, 60 * 60 * 24 * 31)  # 31 days
        results = await pipe.execute()
        
        new_count = results[0]
        logger.debug(f"Rate limit for user {user_id}: {new_count}")
        
        return new_count
    
    async def get_remaining(
        self,
        user_id: int,
        tier: UserTier,
        action: str = "generate"
    ) -> int:
        """
        Get remaining quota for user.
        
        Args:
            user_id: User ID
            tier: User's subscription tier
            action: Action type
        
        Returns:
            Remaining count (-1 for unlimited)
        """
        limit = TIER_LIMITS.get(tier, 0)
        
        if limit == -1:
            return -1
        
        r = await self.get_redis()
        key = self._get_key(user_id, action)
        
        count = await r.get(key)
        current_count = int(count) if count else 0
        
        return max(0, limit - current_count)
    
    async def reset(self, user_id: int, action: str = "generate") -> None:
        """Reset rate limit counter for a user."""
        r = await self.get_redis()
        key = self._get_key(user_id, action)
        await r.delete(key)
        logger.info(f"Reset rate limit for user {user_id}, action {action}")


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(action: str = "generate"):
    """
    Decorator for rate-limited endpoints.
    
    Usage:
        @app.post("/generate")
        @rate_limit("generate")
        async def generate(user: User = Depends(get_current_user)):
            ...
    
    Args:
        action: Action type for rate limiting
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get user from kwargs (injected by FastAPI dependency)
            user = kwargs.get("user") or kwargs.get("current_user")
            
            if user is None:
                # Try to find user in args
                for arg in args:
                    if isinstance(arg, User):
                        user = arg
                        break
            
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required for rate-limited endpoint"
                )
            
            # Check rate limit
            allowed, current, limit = await rate_limiter.check_rate_limit(
                user.id,
                user.tier,
                action
            )
            
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "message": f"Rate limit exceeded for {action}",
                        "current": current,
                        "limit": limit,
                        "tier": user.tier.value,
                        "upgrade_url": "/upgrade"
                    }
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


async def check_generation_limit(user: User) -> bool:
    """
    Check if user can generate more assets.
    
    Args:
        user: User object
    
    Returns:
        True if user can generate
    
    Raises:
        HTTPException if limit exceeded
    """
    allowed, current, limit = await rate_limiter.check_rate_limit(
        user.id,
        user.tier,
        "generate"
    )
    
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": "Monthly generation limit reached",
                "current": current,
                "limit": limit,
                "tier": user.tier.value,
                "remaining": 0,
            }
        )
    
    return True


async def increment_generation_count(user: User, amount: int = 1) -> int:
    """
    Increment generation count after successful generation.
    
    Args:
        user: User object
        amount: Number of assets generated
    
    Returns:
        New total count
    """
    return await rate_limiter.increment(user.id, "generate", amount)
