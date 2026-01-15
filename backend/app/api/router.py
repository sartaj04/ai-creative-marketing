"""
API Router - combines all API routes.
"""
from fastapi import APIRouter

from app.api.v1 import auth, users, brands, scraping, generation, assets, templates, calendar, payments, demo

api_router = APIRouter()

# Include v1 routes
api_router.include_router(
    auth.router,
    prefix="/v1/auth",
    tags=["Authentication"]
)

api_router.include_router(
    users.router,
    prefix="/v1/users",
    tags=["Users"]
)

api_router.include_router(
    brands.router,
    prefix="/v1/brands",
    tags=["Brand Profiles"]
)

api_router.include_router(
    scraping.router,
    prefix="/v1/scraping",
    tags=["Scraping"]
)

api_router.include_router(
    generation.router,
    prefix="/v1/generation",
    tags=["Content Generation"]
)

api_router.include_router(
    assets.router,
    prefix="/v1/assets",
    tags=["Generated Assets"]
)

api_router.include_router(
    templates.router,
    prefix="/v1/templates",
    tags=["Templates"]
)

api_router.include_router(
    calendar.router,
    prefix="/v1/calendar",
    tags=["Content Calendar"]
)

api_router.include_router(
    payments.router,
    prefix="/v1/payments",
    tags=["Payments"]
)

# Public demo endpoint (no auth required)
api_router.include_router(
    demo.router,
    prefix="/v1/demo",
    tags=["Demo"]
)

