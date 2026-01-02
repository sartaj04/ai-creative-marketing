"""
BrandScale AI - Generate Routes
AI copy generation and asset creation endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.brand_profile import BrandProfile
from app.models.user import User
from app.schemas.job import (
    GenerateJobCreate,
    GenerateJobResponse,
    JobStatusResponse,
)
from app.utils.auth import get_current_active_user
from app.utils.rate_limiter import check_generation_limit, increment_generation_count
from app.workers.celery_app import get_task_status
from app.workers.tasks import generate_job


router = APIRouter(prefix="/api/generate", tags=["Generation"])


@router.post("", response_model=GenerateJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_generate_job(
    request: GenerateJobCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Queue an asset generation job.
    
    Generates AI copy and renders templates.
    Requires an existing brand profile from scraping.
    """
    # Check rate limit
    await check_generation_limit(current_user)
    
    # Verify profile exists and belongs to user
    stmt = select(BrandProfile).where(
        BrandProfile.id == request.profile_id,
        BrandProfile.user_id == current_user.id
    )
    profile = (await db.execute(stmt)).scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand profile not found"
        )
    
    if profile.scrape_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Profile scraping not complete (status: {profile.scrape_status})"
        )
    
    # Estimate number of assets
    num_variants = request.config.num_variants
    num_platforms = len(request.config.platforms)
    num_ratios = len(request.config.aspect_ratios)
    estimated_assets = num_variants * max(1, num_platforms // 2)
    
    # Queue generation job
    task = generate_job.delay(
        profile_id=profile.id,
        user_id=current_user.id,
        config=request.config.model_dump()
    )
    
    return GenerateJobResponse(
        job_id=task.id,
        profile_id=profile.id,
        status="pending",
        message="Generation job queued",
        estimated_assets=estimated_assets
    )


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_generate_status(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check the status of a generation job.
    """
    # Get task status
    status_info = get_task_status(job_id)
    
    # Increment usage count if completed
    if status_info["status"] == "completed":
        result = status_info.get("result", {})
        assets_count = result.get("total_assets", 0)
        if assets_count > 0:
            await increment_generation_count(current_user, assets_count)
    
    return JobStatusResponse(**status_info)


@router.post("/preview")
async def preview_copy(
    request: GenerateJobCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate copy preview without rendering images.
    Useful for quick iteration on copy before full generation.
    """
    from app.services.generator import copy_generator
    
    # Verify profile
    stmt = select(BrandProfile).where(
        BrandProfile.id == request.profile_id,
        BrandProfile.user_id == current_user.id
    )
    profile = (await db.execute(stmt)).scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand profile not found"
        )
    
    # Generate copy only (no rendering)
    brand_context = profile.get_brand_context()
    
    config = request.config.model_dump()
    config["num_variants"] = min(config.get("num_variants", 3), 5)  # Limit for preview
    
    try:
        copies = await copy_generator.generate(
            profile_type=profile.profile_type,
            brand_context=brand_context,
            config=config
        )
        
        return {
            "profile_id": profile.id,
            "copies": copies,
            "count": len(copies),
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Copy generation failed: {str(e)}"
        )


@router.post("/refine")
async def refine_copy(
    original: dict,
    instructions: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Refine existing copy based on user feedback.
    """
    from app.services.generator import copy_generator
    
    try:
        refined = await copy_generator.refine_copy(original, instructions)
        return {"refined": refined}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Refinement failed: {str(e)}"
        )


@router.post("/translate")
async def translate_copy(
    copy: dict,
    target_language: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Translate copy to another language with cultural adaptation.
    """
    from app.config import SUPPORTED_LANGUAGES
    from app.services.generator import copy_generator
    
    if target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported language: {target_language}. Supported: {list(SUPPORTED_LANGUAGES.keys())}"
        )
    
    try:
        translated = await copy_generator.translate_copy(copy, target_language)
        return {"translated": translated}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {str(e)}"
        )
