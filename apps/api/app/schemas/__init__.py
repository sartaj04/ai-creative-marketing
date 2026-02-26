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
    DraftSlideResponse,
    DraftGenerateRequest,
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
from app.schemas.media import (
    MediaAssetResponse,
    ImageRenderRequest,
    ImageGenerateRequest,
    ImageUploadResponse,
)
from app.schemas.visual_template import (
    VariableFieldSchema,
    VisualTemplateResponse,
    VisualTemplateListResponse,
    VisualTemplateCreateRequest,
    VisualTemplateUpdateRequest,
    VisualTemplatePreviewRequest,
    SlideTemplateCreate,
    SlideTemplateResponse,
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
    "DraftSlideResponse",
    "DraftGenerateRequest",
    # Template
    "TemplateCreate",
    "TemplateResponse",
    "TemplateUpdate",
    "TemplateMatchRequest",
    # Analytics
    "AnalyticsSummary",
    "TopicAnalytics",
    "FormatAnalytics",
    # Media
    "MediaAssetResponse",
    "ImageRenderRequest",
    "ImageGenerateRequest",
    "ImageUploadResponse",
    # Visual Templates
    "VariableFieldSchema",
    "VisualTemplateResponse",
    "VisualTemplateListResponse",
    "VisualTemplateCreateRequest",
    "VisualTemplateUpdateRequest",
    "VisualTemplatePreviewRequest",
    "SlideTemplateCreate",
    "SlideTemplateResponse",
]

