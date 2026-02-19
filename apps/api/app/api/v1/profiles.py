"""Profile endpoints."""
import logging
import uuid as uuid_mod
from datetime import datetime
from pathlib import Path
from uuid import UUID

import aiofiles
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession, get_profile_with_access
from app.models.document import ExtractedDocument, SourceType
from app.models.identity import IdentityGraph, StyleProfile
from app.models.profile import Profile, ProfileSource
from app.models.profile_member import ProfileMember, MemberRole, MemberStatus
from app.schemas.profile import (
    ProfileCreate,
    ProfileListResponse,
    ProfileResponse,
    ProfileSourceResponse,
    ProfileUpdate,
    SourceUpdateRequest,
)
from app.schemas.writing_samples import (
    WritingSampleAnalysisResponse,
    WritingSampleAnalysisTrigger,
    WritingSampleImport,
    WritingSampleResponse,
    WritingSamplesListResponse,
)
from app.schemas.identity import TimelineResponse
from app.services.timeline_service import TimelineService

router = APIRouter()
logger = logging.getLogger(__name__)


def _profile_response(profile: Profile, role: str | None = None) -> ProfileResponse:
    """Build a ProfileResponse with optional role."""
    resp = ProfileResponse.model_validate(profile)
    resp.role = role
    return resp


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_data: ProfileCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> ProfileResponse:
    """Create a new profile."""
    # Create profile
    profile = Profile(
        user_id=current_user.id,
        name=profile_data.name,
        type=profile_data.type,
        description=profile_data.description,
    )
    db.add(profile)
    await db.flush()

    # Create OWNER membership
    membership = ProfileMember(
        profile_id=profile.id,
        user_id=current_user.id,
        role=MemberRole.OWNER,
        status=MemberStatus.ACCEPTED,
    )
    db.add(membership)

    # Create sources if provided
    if profile_data.sources:
        sources = ProfileSource(
            profile_id=profile.id,
            linkedin_url=profile_data.sources.linkedin_url,
            website_url=profile_data.sources.website_url,
        )
        db.add(sources)

    # Create empty identity graph
    identity_graph = IdentityGraph(profile_id=profile.id)
    db.add(identity_graph)

    # Create default style profile
    style_profile = StyleProfile(profile_id=profile.id)
    db.add(style_profile)

    await db.commit()
    await db.refresh(profile)

    # Reload with relationships
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.sources))
        .where(Profile.id == profile.id)
    )
    profile = result.scalar_one()

    return _profile_response(profile, role=MemberRole.OWNER.value)


@router.get("", response_model=ProfileListResponse)
async def list_profiles(
    current_user: CurrentUser,
    db: DBSession,
) -> ProfileListResponse:
    """List all profiles the current user has access to."""
    result = await db.execute(
        select(Profile, ProfileMember.role)
        .join(ProfileMember, ProfileMember.profile_id == Profile.id)
        .where(
            ProfileMember.user_id == current_user.id,
            ProfileMember.status == MemberStatus.ACCEPTED,
        )
        .options(selectinload(Profile.sources))
        .order_by(Profile.created_at.desc())
    )
    rows = result.all()

    return ProfileListResponse(
        profiles=[_profile_response(row[0], role=row[1].value) for row in rows],
        total=len(rows),
    )


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> ProfileResponse:
    """Get a specific profile."""
    profile, membership = await get_profile_with_access(profile_id, current_user, db)
    return _profile_response(profile, role=membership.role.value)


@router.put("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: UUID,
    profile_data: ProfileUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> ProfileResponse:
    """Update a profile. Name changes require owner access."""
    # If name is being updated, require owner
    require_owner = profile_data.name is not None
    profile, membership = await get_profile_with_access(
        profile_id, current_user, db, require_owner=require_owner
    )

    # Update fields
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)

    return _profile_response(profile, role=membership.role.value)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    """Delete a profile. Owner only."""
    profile, _ = await get_profile_with_access(
        profile_id, current_user, db, require_owner=True
    )
    await db.delete(profile)
    await db.commit()


# ============================================================================
# Writing Samples Endpoints
# ============================================================================


@router.post("/{profile_id}/writing-samples", status_code=status.HTTP_201_CREATED)
async def import_writing_samples(
    profile_id: UUID,
    sample_data: WritingSampleImport,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    """
    Import user's writing samples for style analysis.

    Stores posts as ExtractedDocuments with USER_POST source type.
    """
    profile, _ = await get_profile_with_access(profile_id, current_user, db)

    # Validate platform
    valid_platforms = ["linkedin", "twitter", "manual"]
    if sample_data.platform not in valid_platforms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid platform. Must be one of: {', '.join(valid_platforms)}",
        )

    # Store each post as ExtractedDocument
    sample_ids = []
    for post_content in sample_data.posts:
        # Skip empty posts
        if not post_content or not post_content.strip():
            continue

        document = ExtractedDocument(
            profile_id=profile_id,
            source_type=SourceType.USER_POST,
            source_url=None,
            content=post_content.strip(),
            metadata_json={
                "platform": sample_data.platform,
                "imported_at": datetime.utcnow().isoformat(),
            },
        )
        db.add(document)
        await db.flush()
        sample_ids.append(str(document.id))

    await db.commit()

    logger.info(f"Imported {len(sample_ids)} writing samples for profile {profile_id}")

    return {
        "message": f"Successfully imported {len(sample_ids)} writing samples",
        "sample_ids": sample_ids,
        "total": len(sample_ids),
    }


@router.get("/{profile_id}/writing-samples", response_model=WritingSamplesListResponse)
async def get_writing_samples(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> WritingSamplesListResponse:
    """Get all writing samples for a profile."""
    # Need style_profile for analysis status — load separately
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.style_profile))
        .where(Profile.id == profile_id)
    )
    profile_with_style = result.scalar_one_or_none()

    # Verify access
    _, _ = await get_profile_with_access(profile_id, current_user, db)

    # Get all USER_POST documents
    result = await db.execute(
        select(ExtractedDocument)
        .where(
            ExtractedDocument.profile_id == profile_id,
            ExtractedDocument.source_type == SourceType.USER_POST,
        )
        .order_by(ExtractedDocument.created_at.desc())
    )
    documents = result.scalars().all()

    # Determine analysis status
    style_profile = profile_with_style.style_profile if profile_with_style else None
    analysis_status = "none"
    if style_profile and style_profile.writing_sample_insights:
        analysis_status = "completed"
    elif documents:
        analysis_status = "ready"  # Has samples but not analyzed

    return WritingSamplesListResponse(
        samples=[
            WritingSampleResponse(
                id=doc.id,
                content=doc.content,
                platform=doc.metadata_json.get("platform", "unknown"),
                created_at=doc.created_at,
            )
            for doc in documents
        ],
        total=len(documents),
        analysis_status=analysis_status,
        writing_samples_count=style_profile.writing_samples_count if style_profile else 0,
    )


@router.post("/{profile_id}/analyze-writing-samples")
async def analyze_writing_samples(
    profile_id: UUID,
    trigger_data: WritingSampleAnalysisTrigger,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    """
    Analyze imported writing samples and update style profile.

    Extracts patterns from user's actual posts and stores insights.
    Optionally regenerates persona prompt with new insights.
    """
    profile, _ = await get_profile_with_access(profile_id, current_user, db)

    # Get all USER_POST documents
    result = await db.execute(
        select(ExtractedDocument)
        .where(
            ExtractedDocument.profile_id == profile_id,
            ExtractedDocument.source_type == SourceType.USER_POST,
        )
        .order_by(ExtractedDocument.created_at.desc())
    )
    documents = result.scalars().all()

    if not documents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No writing samples found. Import samples first.",
        )

    if len(documents) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Need at least 3 writing samples for analysis. Found {len(documents)}.",
        )

    # Trigger async analysis task
    from app.tasks.writing_sample_analyzer import analyze_writing_samples_task

    task = analyze_writing_samples_task.delay(
        str(profile_id),
        regenerate_persona=trigger_data.regenerate_persona,
    )

    logger.info(f"Queued writing sample analysis task {task.id} for profile {profile_id}")

    return {
        "message": "Writing sample analysis queued",
        "task_id": task.id,
        "status": "processing",
        "samples_count": len(documents),
        "persona_regenerated": trigger_data.regenerate_persona,
    }


@router.delete("/{profile_id}/writing-samples/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_writing_sample(
    profile_id: UUID,
    document_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    """Delete a specific writing sample."""
    profile, _ = await get_profile_with_access(profile_id, current_user, db)

    # Get document
    result = await db.execute(
        select(ExtractedDocument).where(
            ExtractedDocument.id == document_id,
            ExtractedDocument.profile_id == profile_id,
            ExtractedDocument.source_type == SourceType.USER_POST,
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Writing sample not found",
        )

    await db.delete(document)
    await db.commit()

    logger.info(f"Deleted writing sample {document_id} for profile {profile_id}")


@router.get("/{profile_id}/timeline", response_model=TimelineResponse)
async def get_profile_timeline(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> TimelineResponse:
    """Get the timeline for a profile."""
    profile, _ = await get_profile_with_access(profile_id, current_user, db)

    timeline_service = TimelineService(db)
    timeline = await timeline_service.get_full_timeline(profile_id)

    if not timeline:
        # We need identity graph ID
        result = await db.execute(
            select(IdentityGraph).where(IdentityGraph.profile_id == profile_id)
        )
        identity_graph = result.scalar_one_or_none()

        if not identity_graph:
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Identity Graph not found",
            )

        timeline = await timeline_service.get_or_create_timeline(identity_graph.id)
        # Ensure events is loaded/set to avoid MissingGreenlet
        await db.refresh(timeline, ["events"])

    return TimelineResponse.model_validate(timeline)


# ============================================================================
# Source Management Endpoints
# ============================================================================

ALLOWED_EXTENSIONS = {"pdf", "docx"}
MAX_FILE_SIZE_MB = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


@router.put("/{profile_id}/sources", response_model=ProfileSourceResponse)
async def update_sources(
    profile_id: UUID,
    source_data: SourceUpdateRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> ProfileSourceResponse:
    """Update profile sources. Adding a NEW source triggers identity deepening."""
    profile, _ = await get_profile_with_access(profile_id, current_user, db)

    # Get or create ProfileSource
    result = await db.execute(
        select(ProfileSource).where(ProfileSource.profile_id == profile_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        source = ProfileSource(profile_id=profile_id)
        db.add(source)
        await db.flush()

    # Track what's NEW for triggering extraction
    new_linkedin = (
        source_data.linkedin_url is not None
        and source_data.linkedin_url != source.linkedin_url
        and source_data.linkedin_url.strip()
    )
    new_website = (
        source_data.website_url is not None
        and source_data.website_url != source.website_url
    )

    # Update fields
    if source_data.linkedin_url is not None:
        source.linkedin_url = source_data.linkedin_url
    if source_data.website_url is not None:
        source.website_url = source_data.website_url

    await db.commit()
    await db.refresh(source)

    # Trigger extraction for NEW LinkedIn URL (deepening, not replacing)
    if new_linkedin:
        try:
            from app.tasks.linkedin_identity_extraction import scrape_and_extract_identity_task
            scrape_and_extract_identity_task.delay(str(profile_id), source_data.linkedin_url)
            logger.info(f"Triggered LinkedIn extraction for profile {profile_id}")
        except Exception as e:
            logger.warning(f"Failed to trigger LinkedIn extraction: {e}")

    # For new website URL, trigger persona re-synthesis
    if new_website:
        try:
            from app.tasks.persona_synthesizer import synthesize_persona_task
            synthesize_persona_task.delay(str(profile_id))
            logger.info(f"Triggered persona synthesis for profile {profile_id} after website update")
        except Exception as e:
            logger.warning(f"Failed to trigger persona synthesis: {e}")

    return ProfileSourceResponse.model_validate(source)


@router.post("/{profile_id}/sources/upload-resume")
async def upload_profile_resume(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
    file: UploadFile = File(...),
) -> dict:
    """Upload a resume to deepen identity for an existing profile."""
    profile, _ = await get_profile_with_access(profile_id, current_user, db)

    # Validate filename
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided",
        )

    file_path = Path(file.filename)
    ext = file_path.suffix.lower().lstrip(".")

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB",
        )

    # Save file
    filename = f"{uuid_mod.uuid4()}.{ext}"
    tmp_path = f"/tmp/{filename}"
    async with aiofiles.open(tmp_path, "wb") as buffer:
        await buffer.write(contents)

    try:
        from app.services.onboarding_service import OnboardingService

        service = OnboardingService(db)
        result = await service.process_extraction(
            profile.id, "resume", tmp_path, file_type=ext
        )

        # Update resume_path on ProfileSource
        source_result = await db.execute(
            select(ProfileSource).where(ProfileSource.profile_id == profile_id)
        )
        source = source_result.scalar_one_or_none()
        if not source:
            source = ProfileSource(profile_id=profile_id)
            db.add(source)
        source.resume_path = f"uploaded:{file.filename}"
        await db.commit()

        # Trigger persona re-synthesis with new resume data
        try:
            from app.tasks.persona_synthesizer import synthesize_persona_task
            synthesize_persona_task.delay(str(profile_id))
        except Exception as e:
            logger.warning(f"Failed to trigger persona synthesis: {e}")

        return {
            "success": True,
            "message": "Resume uploaded and identity deepened",
            "filename": file.filename,
        }
    finally:
        # Clean up temp file
        try:
            import aiofiles.os
            await aiofiles.os.remove(tmp_path)
        except Exception:
            pass
