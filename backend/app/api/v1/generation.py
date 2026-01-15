"""
Content generation API endpoints.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.brand_profile import BrandProfile
from app.models.generated_asset import GeneratedAsset
from app.models.job_status import JobStatus, JobType, JobStatusEnum
from app.schemas.generation import (
    CopyGenerationRequest,
    CopyVariant,
    AssetGenerationRequest,
    AssetGenerationResponse,
    BatchGenerationRequest,
    BatchGenerationResponse,
)
from app.schemas.job import JobStatusResponse
from app.core.auth import get_current_user
from app.core.exceptions import UsageLimitException


router = APIRouter()


@router.post("/copy", response_model=List[CopyVariant])
async def generate_copy(
    request: CopyGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate marketing copy variants using Gemini AI with optional refinement.
    
    Returns a list of copy variants based on the brand profile
    and generation parameters.
    """
    # Check usage limits
    if not current_user.can_generate:
        raise UsageLimitException(
            current_usage=current_user.usage_count,
            limit=current_user.usage_limit
        )
    
    # Verify brand profile exists and belongs to user
    result = await db.execute(
        select(BrandProfile)
        .where(
            BrandProfile.id == request.profile_id,
            BrandProfile.user_id == current_user.id
        )
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand profile not found"
        )
    
    # Build generation config
    config = {
        "campaign_type": request.campaign_type.value if request.campaign_type else "general",
        "festival": request.festival.value if request.festival else None,
        "language": request.language,
        "num_variants": request.num_variants,
    }
    
    # Generate copy using AI service
    from app.services.generator import generate_copy as gen_copy
    from app.services.generator.refinement import refine_copy
    
    try:
        raw_variants = await gen_copy(str(request.profile_id), config)
        
        # Apply multi-step refinement if requested (default: True for better quality)
        enable_refinement = getattr(request, 'enable_refinement', True)
        if enable_refinement and raw_variants:
            brand_context = {
                "name": profile.name,
                "tone": profile.voice_profile.get("tone", "professional") if profile.voice_profile else "professional",
                "target_audience": profile.target_audience or "Indian consumers"
            }
            refined_variants = await refine_copy(raw_variants, brand_context)
            raw_variants = refined_variants
        
        # Convert to response format
        variants = []
        for v in raw_variants:
            variants.append(CopyVariant(
                headline=v.get("headline", v.get("hook", "")),
                subheadline=v.get("subheadline", ""),
                body=v.get("body", ""),
                cta=v.get("cta", v.get("closing", "")),
                hashtags=v.get("hashtags", [])
            ))
        
    except Exception as e:
        # Fallback to basic generation on error
        variants = [CopyVariant(
            headline=f"{profile.name} - Shop Now",
            subheadline="Discover premium quality",
            body="Experience the best in quality and value.",
            cta="Shop Now",
            hashtags=["#Shopping", "#India"]
        )]
    
    # Increment usage count
    current_user.usage_count += 1
    await db.commit()
    
    return variants


@router.post("/asset", response_model=AssetGenerationResponse, status_code=status.HTTP_201_CREATED)
async def generate_asset(
    request: AssetGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a single visual asset from a template.
    """
    # Check usage limits
    if not current_user.can_generate:
        raise UsageLimitException(
            current_usage=current_user.usage_count,
            limit=current_user.usage_limit
        )
    
    # Verify brand profile
    result = await db.execute(
        select(BrandProfile)
        .where(
            BrandProfile.id == request.profile_id,
            BrandProfile.user_id == current_user.id
        )
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand profile not found"
        )
    
    # Create asset record
    asset = GeneratedAsset(
        user_id=current_user.id,
        profile_id=request.profile_id,
        template_id=request.template_id,
        platform=request.platform,
        aspect_ratio=request.aspect_ratio.value,
        language=request.language,
        copy_text={
            "headline": request.copy.headline,
            "subheadline": request.copy.subheadline,
            "body": request.copy.body,
            "cta": request.copy.cta,
            "hashtags": request.copy.hashtags
        },
        metadata={
            "campaign_name": request.campaign_name,
            "campaign_type": request.campaign_type.value if request.campaign_type else None,
            "festival": request.festival.value if request.festival else None
        }
    )
    
    db.add(asset)
    
    # Increment usage count
    current_user.usage_count += 1
    
    await db.commit()
    await db.refresh(asset)
    
    # TODO: Queue template rendering job
    
    return asset


@router.post("/batch", response_model=BatchGenerationResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_batch(
    request: BatchGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Start batch generation of multiple assets.
    
    This is an async operation. Returns a job ID to track progress.
    """
    total_assets = (
        len(request.template_ids) * 
        len(request.platforms) * 
        len(request.aspect_ratios) * 
        len(request.copies)
    )
    
    # Check if user has enough usage remaining
    if current_user.tier.value != "pro":
        remaining = current_user.usage_limit - current_user.usage_count
        if total_assets > remaining:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough usage remaining. Need {total_assets}, have {remaining}"
            )
    
    # Create batch job
    job = JobStatus(
        user_id=current_user.id,
        job_type=JobType.BATCH_RENDER,
        status=JobStatusEnum.PENDING,
        input_data={
            "profile_id": str(request.profile_id),
            "template_ids": [str(t) for t in request.template_ids],
            "platforms": [p.value for p in request.platforms],
            "aspect_ratios": [a.value for a in request.aspect_ratios],
            "copies": [c.model_dump() for c in request.copies],
            "language": request.language,
            "campaign_name": request.campaign_name,
            "campaign_type": request.campaign_type.value if request.campaign_type else None
        }
    )
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # TODO: Queue Celery task for batch rendering
    
    return BatchGenerationResponse(
        job_id=job.id,
        total_assets=total_assets,
        message=f"Batch generation started for {total_assets} assets"
    )


@router.get("/job/{job_id}", response_model=JobStatusResponse)
async def get_generation_job_status(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the status of a generation job.
    """
    result = await db.execute(
        select(JobStatus)
        .where(
            JobStatus.id == job_id,
            JobStatus.user_id == current_user.id
        )
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return JobStatusResponse(
        id=job.id,
        user_id=job.user_id,
        job_type=job.job_type,
        celery_task_id=job.celery_task_id,
        status=job.status,
        progress=job.progress,
        input_data=job.input_data,
        result=job.result,
        error_message=job.error_message,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at,
        is_complete=job.is_complete,
        duration_seconds=job.duration_seconds
    )
