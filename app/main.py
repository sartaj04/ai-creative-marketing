"""
BrandScale AI - FastAPI Application
Main application entry point with all routes and middleware.
"""
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app.config import settings
from app.database import close_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown."""
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    
    # Initialize database tables (in development)
    if settings.debug:
        await init_db()
        logger.info("Database tables initialized")
    
    # Initialize Sentry if configured
    if settings.sentry_dsn:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            integrations=[FastApiIntegration()],
            traces_sample_rate=0.1,
        )
        logger.info("Sentry initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")
    await close_db()
    
    # Close service connections
    from app.services.scraper import web_scraper
    from app.services.renderer import template_renderer
    await web_scraper.close()
    await template_renderer.close()


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="AI-powered creative marketing platform for E-commerce, SaaS, and Personal brands",
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://brandscale.ai",
        "https://*.brandscale.ai",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include API routers
from app.api.auth import router as auth_router
from app.api.scrape import router as scrape_router
from app.api.generate import router as generate_router
from app.api.assets import router as assets_router
from app.api.templates import router as templates_router
from app.api.profiles import router as profiles_router

app.include_router(auth_router)
app.include_router(scrape_router)
app.include_router(generate_router)
app.include_router(assets_router)
app.include_router(templates_router)
app.include_router(profiles_router)


# Global exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.exception(f"Unhandled exception: {exc}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "message": "An unexpected error occurred",
            "status_code": 500,
        }
    )


# Health check endpoints
@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
    }


@app.get("/health/ready", tags=["Health"])
async def readiness_check() -> Dict[str, Any]:
    """
    Readiness check - verifies all dependencies are available.
    """
    checks = {
        "database": False,
        "redis": False,
    }
    
    # Check database
    try:
        from sqlalchemy import text
        from app.database import async_session_factory
        
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
            checks["database"] = True
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
    
    # Check Redis
    try:
        import redis.asyncio as redis
        r = redis.from_url(settings.redis_url)
        await r.ping()
        await r.close()
        checks["redis"] = True
    except Exception as e:
        logger.warning(f"Redis health check failed: {e}")
    
    all_healthy = all(checks.values())
    
    return {
        "status": "ready" if all_healthy else "degraded",
        "checks": checks,
    }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API info."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs" if settings.debug else "Disabled in production",
        "health": "/health",
    }


# Run with: uvicorn app.main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        workers=1 if settings.debug else 4,
    )
