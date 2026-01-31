"""Pydantic schemas for API validation."""
from app.schemas.auth import (
    Token,
    TokenPayload,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.schemas.profile import (
    ProfileCreate,
    ProfileResponse,
    ProfileSourceCreate,
    ProfileSourceResponse,
    ProfileUpdate,
)
from app.schemas.identity import (
    IdentityGraphResponse,
    IdentityGraphUpdate,
    StyleProfileResponse,
    StyleProfileUpdate,
)
from app.schemas.draft import (
    DraftActionRequest,
    DraftResponse,
    DraftScheduleRequest,
    DraftStatusUpdate,
)
from app.schemas.template import (
    TemplateCreate,
    TemplateResponse,
    TemplateUpdate,
    TemplateMatchRequest,
)
from app.schemas.analytics import (
    AnalyticsSummary,
    TopicAnalytics,
    FormatAnalytics,
)
from app.schemas.identity_universe import (
    IdentityUniverseResponse,
    PersonaData,
    RegenerationPreview,
    RegenerationRequest,
    RegenerationAccept,
    RegenerationField,
)

__all__ = [
    # Auth
    "Token",
    "TokenPayload",
    "UserCreate",
    "UserLogin",
    "UserResponse",
    # Profile
    "ProfileCreate",
    "ProfileResponse",
    "ProfileSourceCreate",
    "ProfileSourceResponse",
    "ProfileUpdate",
    # Identity
    "IdentityGraphResponse",
    "IdentityGraphUpdate",
    "StyleProfileResponse",
    "StyleProfileUpdate",
    # Identity Universe
    "IdentityUniverseResponse",
    "PersonaData",
    "RegenerationPreview",
    "RegenerationRequest",
    "RegenerationAccept",
    "RegenerationField",
    # Draft
    "DraftActionRequest",
    "DraftResponse",
    "DraftScheduleRequest",
    "DraftStatusUpdate",
    # Template
    "TemplateCreate",
    "TemplateResponse",
    "TemplateUpdate",
    "TemplateMatchRequest",
    # Analytics
    "AnalyticsSummary",
    "TopicAnalytics",
    "FormatAnalytics",
]
