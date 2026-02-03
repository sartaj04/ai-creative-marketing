"""Profile endpoints."""
import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.models.document import ExtractedDocument, SourceType
from app.models.identity import IdentityGraph, StyleProfile
from app.models.profile import Profile, ProfileSource
from app.schemas.profile import (
    ProfileCreate,
    ProfileListResponse,
    ProfileResponse,
    ProfileUpdate,
)
from app.schemas.writing_samples import (
    WritingSampleAnalysisResponse,
    WritingSampleAnalysisTrigger,
    WritingSampleImport,
    WritingSampleResponse,
    WritingSamplesListResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)


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

    # Create sources if provided
    if profile_data.sources:
        sources = ProfileSource(
            profile_id=profile.id,
            linkedin_url=profile_data.sources.linkedin_url,
            website_url=profile_data.sources.website_url,
            manual_text=profile_data.sources.manual_text,
            rss_urls=profile_data.sources.rss_urls,
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

    return ProfileResponse.model_validate(profile)


@router.get("", response_model=ProfileListResponse)
async def list_profiles(
    current_user: CurrentUser,
    db: DBSession,
) -> ProfileListResponse:
    """List all profiles for current user."""
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.sources))
        .where(Profile.user_id == current_user.id)
        .order_by(Profile.created_at.desc())
    )
    profiles = result.scalars().all()

    return ProfileListResponse(
        profiles=[ProfileResponse.model_validate(p) for p in profiles],
        total=len(profiles),
    )


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> ProfileResponse:
    """Get a specific profile."""
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.sources))
        .where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return ProfileResponse.model_validate(profile)


@router.put("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: UUID,
    profile_data: ProfileUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> ProfileResponse:
    """Update a profile."""
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.sources))
        .where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    # Update fields
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)

    return ProfileResponse.model_validate(profile)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    """Delete a profile."""
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
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
    # Verify profile ownership
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )
    
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
    # Verify profile ownership
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.style_profile))
        .where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )
    
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
    style_profile = profile.style_profile
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
    # Verify profile ownership
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.style_profile))
        .where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )
    
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
    # Verify profile ownership
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )
    
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
