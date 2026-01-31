"""Onboarding API endpoints."""
import json
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
    ChatMessage,
    ConversationalExtractedData,
    OnboardingChatRequest,
    OnboardingChatResponse,
    OnboardingCompleteResponse,
    OnboardingExtractResponse,
    OnboardingStatusResponse,
    OnboardingStepSaveRequest,
    OnboardingStepSaveResponse,
)
from app.services.onboarding_service import OnboardingService
from app.services.onboarding_prompts import (
    PIXO_ONBOARDING_SYSTEM_PROMPT,
    PIXO_CONVERSATION_PROMPT,
    PIXO_EXTRACTION_PROMPT,
    check_extraction_complete,
)
from app.llm.provider import get_llm_provider

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


@router.post("/save-step", response_model=OnboardingStepSaveResponse)
async def save_onboarding_step(
    request: OnboardingStepSaveRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Save configuration data for a specific onboarding step."""
    profile = await get_or_create_user_profile(current_user.id, db, current_user.name)
    service = OnboardingService(db)
    result = await service.save_step_data(
        profile_id=profile.id,
        step_name=request.step_name,
        professional_data=request.professional_data,
        interests_data=request.interests_data,
        voice_data=request.voice_data,
    )
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


@router.post("/chat", response_model=OnboardingChatResponse)
async def onboarding_chat(
    request: OnboardingChatRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Conversational onboarding with Pixo."""
    profile = await get_or_create_user_profile(current_user.id, db, current_user.name)
    
    # Get LLM provider
    llm = get_llm_provider()
    
    # Build conversation history string for prompts
    history_parts = []
    for msg in request.conversation_history:
        role_label = "User" if msg.role == "user" else "Pixo"
        history_parts.append(f"{role_label}: {msg.content}")
    history_parts.append(f"User: {request.message}")
    conversation_str = "\n".join(history_parts)
    
    # Get existing extracted data from identity graph
    stmt = select(IdentityGraph).where(IdentityGraph.profile_id == profile.id)
    result = await db.execute(stmt)
    identity_graph = result.scalars().first()
    
    existing_data = {}
    if identity_graph and identity_graph.onboarding_context:
        existing_data = identity_graph.onboarding_context.get("extracted_data", {})
    
    # Calculate what's missing for the prompt
    has_role = "✅" if existing_data.get("current_role") else "❌ MISSING"
    has_industry = "✅" if existing_data.get("industry") else "❌ MISSING"
    expertise_areas = existing_data.get("expertise_areas", [])
    expertise_count = len(expertise_areas) if isinstance(expertise_areas, list) else 0
    interests = existing_data.get("interests", [])
    interests_count = len(interests) if isinstance(interests, list) else 0
    topics = existing_data.get("topics_of_interest", [])
    topics_count = len(topics) if isinstance(topics, list) else 0
    has_aspirations = "✅" if existing_data.get("aspirations") else "❌ MISSING"
    
    # Count tone sliders that are not default (0.5)
    tone_count = sum(1 for tone_key in ["tone_formal_casual", "tone_technical_simple", "tone_serious_playful", "tone_humble_confident"]
                     if existing_data.get(tone_key) is not None and existing_data.get(tone_key) != 0.5)
    has_formal_casual = "✅" if existing_data.get("tone_formal_casual") is not None and existing_data.get("tone_formal_casual") != 0.5 else "❌ MISSING"
    has_technical_simple = "✅" if existing_data.get("tone_technical_simple") is not None and existing_data.get("tone_technical_simple") != 0.5 else "❌ MISSING"
    has_serious_playful = "✅" if existing_data.get("tone_serious_playful") is not None and existing_data.get("tone_serious_playful") != 0.5 else "❌ MISSING"
    has_humble_confident = "✅" if existing_data.get("tone_humble_confident") is not None and existing_data.get("tone_humble_confident") != 0.5 else "❌ MISSING"
    
    # Generate Pixo's response
    conversation_prompt = PIXO_CONVERSATION_PROMPT.format(
        conversation_history=conversation_str,
        extracted_data=json.dumps(existing_data, indent=2) if existing_data else "{}",
        has_role=has_role,
        has_industry=has_industry,
        expertise_count=expertise_count,
        interests_count=interests_count,
        topics_count=topics_count,
        has_aspirations=has_aspirations,
        tone_count=tone_count,
        has_formal_casual=has_formal_casual,
        has_technical_simple=has_technical_simple,
        has_serious_playful=has_serious_playful,
        has_humble_confident=has_humble_confident,
    )
    
    # Use system prompt + conversation prompt
    full_prompt = f"{PIXO_ONBOARDING_SYSTEM_PROMPT}\n\n{conversation_prompt}"
    pixo_response = await llm.generate(full_prompt, max_tokens=2000)  # Increased from default 1000 to 2000 for full responses
    
    # Extract structured data from conversation
    extraction_prompt = PIXO_EXTRACTION_PROMPT.format(
        conversation_history=conversation_str + f"\nPixo: {pixo_response}"
    )
    
    try:
        extracted_json = await llm.generate_json(extraction_prompt)
        if isinstance(extracted_json, str):
            extracted_json = json.loads(extracted_json)
    except Exception as e:
        # If extraction fails, use existing data
        extracted_json = existing_data
    
    # Merge with existing data (don't overwrite with empty values)
    merged_data = {**existing_data}
    for key, value in extracted_json.items():
        if value and (isinstance(value, list) and len(value) > 0 or not isinstance(value, list)):
            merged_data[key] = value
    
    # Check if we have enough data to complete
    is_complete = check_extraction_complete(merged_data)
    
    # Update conversation history
    updated_history = list(request.conversation_history)
    updated_history.append(ChatMessage(role="user", content=request.message))
    updated_history.append(ChatMessage(role="assistant", content=pixo_response))
    
    # Save to identity graph
    if identity_graph:
        onboarding_context = identity_graph.onboarding_context or {}
        onboarding_context["extracted_data"] = merged_data
        onboarding_context["conversation_history"] = [
            {"role": m.role, "content": m.content} for m in updated_history
        ]
        onboarding_context["step"] = "CONVERSATION"
        identity_graph.onboarding_context = onboarding_context
        
        # Also update identity graph fields directly
        if merged_data.get("current_role"):
            identity_graph.current_role = merged_data["current_role"]
        if merged_data.get("industry"):
            identity_graph.industry = merged_data["industry"]
        if merged_data.get("expertise_areas"):
            identity_graph.expertise_areas = merged_data["expertise_areas"]
        if merged_data.get("interests"):
            identity_graph.interests = merged_data["interests"]
        if merged_data.get("topics_of_interest"):
            identity_graph.themes = merged_data["topics_of_interest"]
        if merged_data.get("aspirations"):
            identity_graph.aspirations = merged_data["aspirations"]
        if merged_data.get("career_highlight"):
            identity_graph.career_highlights = [merged_data["career_highlight"]]
        if merged_data.get("bio_summary"):
            identity_graph.bio_summary = merged_data["bio_summary"]
        
        # Update style profile with tone sliders
        style_stmt = select(StyleProfile).where(StyleProfile.profile_id == profile.id)
        style_result = await db.execute(style_stmt)
        style_profile = style_result.scalars().first()
        
        if style_profile:
            tone_sliders = style_profile.tone_sliders or {}
            if merged_data.get("tone_formal_casual") is not None:
                tone_sliders["formal_casual"] = merged_data["tone_formal_casual"]
            if merged_data.get("tone_technical_simple") is not None:
                tone_sliders["technical_simple"] = merged_data["tone_technical_simple"]
            if merged_data.get("tone_serious_playful") is not None:
                tone_sliders["serious_playful"] = merged_data["tone_serious_playful"]
            if merged_data.get("tone_humble_confident") is not None:
                tone_sliders["humble_confident"] = merged_data["tone_humble_confident"]
            style_profile.tone_sliders = tone_sliders
        
        await db.commit()
    
    # Build response
    extracted_response = ConversationalExtractedData(
        current_role=merged_data.get("current_role", ""),
        industry=merged_data.get("industry", ""),
        years_experience=merged_data.get("years_experience", ""),
        expertise_areas=merged_data.get("expertise_areas", []),
        career_highlight=merged_data.get("career_highlight", ""),
        interests=merged_data.get("interests", []),
        topics_of_interest=merged_data.get("topics_of_interest", []),
        aspirations=merged_data.get("aspirations", ""),
        tone_formal_casual=merged_data.get("tone_formal_casual"),
        tone_technical_simple=merged_data.get("tone_technical_simple"),
        tone_serious_playful=merged_data.get("tone_serious_playful"),
        tone_humble_confident=merged_data.get("tone_humble_confident"),
        bio_summary=merged_data.get("bio_summary", ""),
    )
    
    return OnboardingChatResponse(
        response=pixo_response,
        extracted_data=extracted_response,
        is_complete=is_complete,
        conversation_history=updated_history,
    )


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
