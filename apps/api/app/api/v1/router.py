"""Main API v1 router."""
from fastapi import APIRouter

from app.api.v1 import auth, profiles, identity, drafts, templates, analytics, rss

api_router = APIRouter()

# Include all routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(profiles.router, prefix="/profiles", tags=["Profiles"])
api_router.include_router(identity.router, tags=["Identity & Style"])
api_router.include_router(drafts.router, prefix="/drafts", tags=["Drafts"])
api_router.include_router(templates.router, prefix="/templates", tags=["Templates"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(rss.router, tags=["RSS Feeds"])
