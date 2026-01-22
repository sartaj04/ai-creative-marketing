"""
Pydantic Schemas
"""
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    TokenResponse,
)
from app.schemas.brand_profile import (
    BrandProfileCreate,
    BrandProfileUpdate,
    BrandProfileResponse,
    BrandAssets,
    VoiceProfile,
)
from app.schemas.generation import (
    CopyGenerationRequest,
    CopyVariant,
    AssetGenerationRequest,
    AssetGenerationResponse,
)
from app.schemas.job import (
    JobStatusResponse,
    JobCreate,
)
from app.schemas.admin_template import (
    AdminTemplateCreate,
    AdminTemplateUpdate,
    AdminTemplateResponse,
    AdminTemplateListResponse,
    TemplateVersionResponse,
    TemplateApprovalLogResponse,
    DummyRenderRequest,
    DummyRenderResponse,
    ApproveTemplateRequest,
    DeprecateTemplateRequest,
    RevertTemplateRequest,
    TemplateNormalizationResult,
)

__all__ = [
    # User
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "UserUpdate",
    "TokenResponse",
    # Brand
    "BrandProfileCreate",
    "BrandProfileUpdate",
    "BrandProfileResponse",
    "BrandAssets",
    "VoiceProfile",
    # Generation
    "CopyGenerationRequest",
    "CopyVariant",
    "AssetGenerationRequest",
    "AssetGenerationResponse",
    # Job
    "JobStatusResponse",
    "JobCreate",
    # Admin Templates
    "AdminTemplateCreate",
    "AdminTemplateUpdate",
    "AdminTemplateResponse",
    "AdminTemplateListResponse",
    "TemplateVersionResponse",
    "TemplateApprovalLogResponse",
    "DummyRenderRequest",
    "DummyRenderResponse",
    "ApproveTemplateRequest",
    "DeprecateTemplateRequest",
    "RevertTemplateRequest",
    "TemplateNormalizationResult",
]

