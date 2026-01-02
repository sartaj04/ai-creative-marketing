# API Routes Package
from app.api.auth import router as auth_router
from app.api.scrape import router as scrape_router
from app.api.generate import router as generate_router
from app.api.assets import router as assets_router
from app.api.templates import router as templates_router
from app.api.profiles import router as profiles_router

__all__ = [
    "auth_router",
    "scrape_router",
    "generate_router",
    "assets_router",
    "templates_router",
    "profiles_router",
]
