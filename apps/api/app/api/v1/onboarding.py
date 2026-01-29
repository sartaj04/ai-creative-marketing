"""Onboarding API endpoints."""
import uuid
from pathlib import Path

import aiofiles
import aiofiles.os
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.models.profile import Profile, ProfileType
from app.models.identity import IdentityGraph, StyleProfile
from app.models.user import User
from app.models.document import ExtractedDocument, SourceType
from app.schemas.onboarding import (
    OnboardingCompleteResponse,
    OnboardingExtractRequest,
    OnboardingExtractResponse,
    OnboardingMessageRequest,
    OnboardingMessageResponse,
    OnboardingStartRequest,
    OnboardingStartResponse,
    OnboardingStatusResponse,
)
from app.services.onboarding_service import OnboardingService

router = APIRouter()

# Constants
ALLOWED_EXTENSIONS = {"pdf", "docx"}
MAX_FILE_SIZE_MB = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# LinkedIn extraction removed - users upload resume instead


async def get_or_create_user_profile(user_id, db, user_name: str = None):
    """Get user's profile or create one if it doesn't exist."""
    stmt = select(Profile).where(Profile.user_id == user_id)
    result = await db.execute(stmt)
    profile = result.scalars().first()
    
    if not profile:
        # Get user name if not provided
        if not user_name:
            user_stmt = select(User).where(User.id == user_id)
            user_result = await db.execute(user_stmt)
            user = user_result.scalar_one_or_none()
            user_name = user.name if user else "User"
        
        # Create profile
        profile = Profile(
            user_id=user_id,
            name=user_name or "User",
            type=ProfileType.INDIVIDUAL,
            description=None,
        )
        db.add(profile)
        await db.flush()
        
        # Create empty identity graph
        identity_graph = IdentityGraph(
            profile_id=profile.id,
            onboarding_context={
                "step": "INIT",
                "question_count": 0,
                "extracted_data": {},
                "history": [],
            },
        )
        db.add(identity_graph)
        
        # Create default style profile
        style_profile = StyleProfile(profile_id=profile.id)
        db.add(style_profile)
        
        await db.commit()
        await db.refresh(profile)
    
    return profile


@router.get("/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    current_user: CurrentUser,
    db: DBSession,
):
    """Check onboarding completion status (read-only)."""
    profile = await get_or_create_user_profile(current_user.id, db, current_user.name)
    service = OnboardingService(db)
    status_result = await service.get_onboarding_status(profile.id)
    return status_result


@router.post("/start", response_model=OnboardingStartResponse)
async def start_onboarding(
    request: OnboardingStartRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Start the onboarding conversation."""
    profile = await get_or_create_user_profile(current_user.id, db, current_user.name)
    service = OnboardingService(db)
    result = await service.start_onboarding(profile.id, request.method)
    return result


@router.post("/message", response_model=OnboardingMessageResponse)
async def send_message(
    request: OnboardingMessageRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Send a message to the onboarding AI."""
    profile = await get_or_create_user_profile(current_user.id, db, current_user.name)
    service = OnboardingService(db)
    result = await service.handle_message(profile.id, request.message)
    return result


# LinkedIn extraction endpoint removed - users should upload LinkedIn profile PDF instead
# Instructions provided in UI for downloading LinkedIn profile PDF (Resources → Download PDF)


@router.post("/upload-resume", response_model=OnboardingExtractResponse)
async def upload_resume(
    current_user: CurrentUser,
    db: DBSession,
    file: UploadFile = File(...),
):
    """Upload LinkedIn profile PDF and extract data."""
    profile = await get_or_create_user_profile(current_user.id, db, current_user.name)

    # Validate filename exists
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided",
        )

    # Safe extension extraction using pathlib
    file_path = Path(file.filename)
    ext = file_path.suffix.lower().lstrip(".")

    # Validate file type
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read file contents and check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB",
        )

    # Save file using async operations
    filename = f"{uuid.uuid4()}.{ext}"
    tmp_path = f"/tmp/{filename}"

    async with aiofiles.open(tmp_path, "wb") as buffer:
        await buffer.write(contents)

    try:
        service = OnboardingService(db)
        # Pass actual file type to service
        result = await service.process_extraction(
            profile.id, "resume", tmp_path, file_type=ext
        )
        return result
    finally:
        # Async cleanup
        try:
            await aiofiles.os.remove(tmp_path)
        except OSError:
            pass  # File may not exist if extraction failed early


@router.post("/complete", response_model=OnboardingCompleteResponse)
async def complete_onboarding(
    current_user: CurrentUser,
    db: DBSession,
):
    """Complete onboarding and finalize profile."""
    profile = await get_or_create_user_profile(current_user.id, db, current_user.name)
    service = OnboardingService(db)
    success = await service.complete_onboarding(profile.id)
    return {
        "success": success,
        "redirect_url": "/dashboard",
    }
