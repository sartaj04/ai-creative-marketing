"""Generator API endpoints for creating drafts from various sources."""
import logging
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import Integer, cast, func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, DBSession, get_profile_with_access
from app.models.identity import StyleProfile
from app.models.profile import Profile
from app.models.template import Template, TemplateCategory, TemplateUsage
from app.services.goal_mapper import GoalMapper
from app.schemas.generator import (
    ArticleGenerateRequest,
    FormatGenerateRequest,
    GeneratorResponse,
    ScratchGenerateRequest,
    TemplateRecommendation,
    TemplateRecommendationsResponse,
    YouTubeGenerateRequest,
)
from app.services.generator_service import GeneratorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/generators", tags=["Generators"])


def _draft_to_response(draft) -> GeneratorResponse:
    """Convert draft to response schema."""
    return GeneratorResponse(
        draft_id=draft.id,
        hook=draft.hook,
        body=draft.body,
        topic=draft.topic,
        confidence=draft.confidence,
    )


# ============================================================================
# Template Recommendation Endpoint
# ============================================================================

@router.get("/templates/recommend", response_model=TemplateRecommendationsResponse)
async def recommend_templates(
    current_user: CurrentUser,
    db: DBSession,
    profile_id: UUID = Query(..., description="Profile UUID"),
    source_type: str = Query(..., description="Source type: scratch, youtube, article, pdf, audio, format"),
    topic_hint: Optional[str] = Query(None, description="Optional topic hint for better recommendations"),
    goal: Optional[str] = Query(None, description="Goal for scratch mode: thought_leadership, engagement, educate, inspire, share_experience, promote"),
    search: Optional[str] = Query(None, description="Search query for template name/description"),
    tags: Optional[str] = Query(None, description="Comma-separated tags to filter by"),
    limit: int = Query(5, ge=1, le=200, description="Number of templates to return"),
) -> TemplateRecommendationsResponse:
    """Get recommended templates based on profile, source type, goal, topic, search, and tags."""
    try:
        # Verify access
        await get_profile_with_access(profile_id, current_user, db)

        # Load profile with style
        profile_result = await db.execute(
            select(Profile)
            .options(selectinload(Profile.style_profile))
            .where(Profile.id == profile_id, Profile.is_active == True)
        )
        profile = profile_result.scalar_one_or_none()
        if not profile:
            raise ValueError("Profile not found or inactive")

        style_profile = profile.style_profile

        # Use GoalMapper... (keeping existing logic)
        if goal:
            goal_mapping = GoalMapper.get_all_mappings_for_goal(goal)
            preferred_categories = goal_mapping["categories"]
            preferred_use_cases = goal_mapping["use_cases"]
            preferred_tags = goal_mapping["tags"]
        else:
            # Fallback... (keeping existing logic)
            source_type_categories = {
                "scratch": [TemplateCategory.TIPS, TemplateCategory.FRAMEWORK, TemplateCategory.STORY],
                "youtube": [TemplateCategory.LESSONS, TemplateCategory.STORY, TemplateCategory.TIPS],
                "article": [TemplateCategory.CONTRARIAN, TemplateCategory.LESSONS, TemplateCategory.COMPARISON],
                "pdf": [TemplateCategory.FRAMEWORK, TemplateCategory.CASE_STUDY, TemplateCategory.TIPS],
                "audio": [TemplateCategory.STORY, TemplateCategory.LESSONS, TemplateCategory.TIPS],
                "format": [TemplateCategory.TIPS, TemplateCategory.STORY, TemplateCategory.FRAMEWORK],
            }
            preferred_categories = source_type_categories.get(source_type, [TemplateCategory.TIPS, TemplateCategory.STORY])
            preferred_use_cases = []
            preferred_tags = []

        # Build query
        query = select(Template).where(
            Template.is_active == True,
            Template.is_system == True,  # Focus on system templates for now
        )

        # Apply Search Filter
        if search:
            search_term = f"%{search}%"
            query = query.where(
                (Template.name.ilike(search_term)) |
                (Template.description.ilike(search_term))
            )

        # Apply Tags Filter
        if tags:
            tag_list = [t.strip() for t in tags.split(',') if t.strip()]
            if tag_list:
                # Assuming tags is an ARRAY/List type in DB
                query = query.where(Template.tags.contains(tag_list))

        result = await db.execute(query)
        all_templates = result.scalars().all()

        # Score each template
        scored_templates = []
        for template in all_templates:
            score = 0.0

            # 1. Category match (25% weight)
            if template.category in preferred_categories:
                category_index = preferred_categories.index(template.category)
                category_score = 1.0 - (category_index * 0.15)  # First category = 1.0, second = 0.85, etc.
                score += category_score * 0.25
            else:
                score += 0.1 * 0.25  # Small score for non-preferred categories

            # 2. Goal/Use case match (30% weight) - match template use_cases with goal's preferred use cases
            if goal and preferred_use_cases and template.use_cases:
                # Check for exact or partial matches in use cases
                use_case_matches = 0
                for template_uc in template.use_cases:
                    template_uc_lower = str(template_uc).lower()
                    for pref_uc in preferred_use_cases:
                        pref_uc_lower = pref_uc.lower()
                        # Check for exact match or if preferred use case is contained in template use case
                        if pref_uc_lower == template_uc_lower or pref_uc_lower in template_uc_lower:
                            use_case_matches += 1
                            break

                if use_case_matches > 0:
                    # Score based on how many use cases match (normalized by preferred count)
                    use_case_score = min(use_case_matches / max(len(preferred_use_cases), 1), 1.0)
                    score += use_case_score * 0.3
                else:
                    score += 0.05 * 0.3  # Small score if no use case match
            elif not goal:
                # For non-goal modes, give neutral score
                score += 0.15 * 0.3

            # 3. Goal Tags match (20% weight) - match template tags with goal's preferred tags
            if goal and preferred_tags and template.tags:
                # Check for tag matches
                tag_matches = sum(
                    1 for tag in template.tags
                    if any(pref_tag.lower() in str(tag).lower() or str(tag).lower() in pref_tag.lower()
                           for pref_tag in preferred_tags)
                )
                if tag_matches > 0:
                    tag_score = min(tag_matches / max(len(preferred_tags), 1), 1.0)
                    score += tag_score * 0.2
                else:
                    score += 0.05 * 0.2
            else:
                score += 0.1 * 0.2

            # 4. Topic/Tags match (10% weight) - if topic_hint provided, match with template tags
            if topic_hint and template.tags:
                topic_lower = topic_hint.lower()
                matching_tags = sum(
                    1 for tag in template.tags
                    if tag.lower() in topic_lower or topic_lower in tag.lower()
                )
                if matching_tags > 0:
                    tag_score = min(matching_tags / max(len(template.tags), 1), 1.0)
                    score += tag_score * 0.10
                else:
                    score += 0.05 * 0.10
            else:
                score += 0.1 * 0.10

            # 5. Tone fit (10% weight) - match template tone_fit with user's style
            if style_profile and template.tone_fit:
                tone_sliders = style_profile.tone_sliders or {}
                # Check if template tone_fit matches user's tone preferences
                tone_match = False
                for tone in template.tone_fit:
                    tone_lower = str(tone).lower()
                    # Simple matching based on tone descriptions
                    if "formal" in tone_lower and tone_sliders.get("formal_casual", 0.5) < 0.4:
                        tone_match = True
                    elif "casual" in tone_lower and tone_sliders.get("formal_casual", 0.5) > 0.6:
                        tone_match = True
                    elif "technical" in tone_lower and tone_sliders.get("technical_simple", 0.5) > 0.6:
                        tone_match = True
                    elif "simple" in tone_lower and tone_sliders.get("technical_simple", 0.5) < 0.4:
                        tone_match = True

                if tone_match:
                    score += 1.0 * 0.10
                else:
                    score += 0.3 * 0.10  # Partial score if no explicit match
            else:
                score += 0.5 * 0.10  # Neutral score if no tone data

            # 6. Historical performance (5% weight) - usage and approval rate
            usage_query = select(
                func.count(TemplateUsage.id).label("total"),
                func.sum(
                    cast(TemplateUsage.was_approved, Integer)
                ).label("approved"),
            ).where(
                TemplateUsage.template_id == template.id,
                TemplateUsage.profile_id == profile_id,
            )
            usage_result = await db.execute(usage_query)
            usage_stats = usage_result.first()

            if usage_stats and usage_stats.total and usage_stats.total > 0:
                approval_rate = (usage_stats.approved or 0) / usage_stats.total
                score += approval_rate * 0.05
            else:
                # For templates never used by this profile, give neutral score
                score += 0.5 * 0.05

            # Normalize score to 0-1 range
            score = min(max(score, 0.0), 1.0)

            scored_templates.append((template, score))

        # Sort by score descending
        scored_templates.sort(key=lambda x: x[1], reverse=True)

        # Get usage counts for top templates
        top_template_ids = [t[0].id for t in scored_templates[:limit]]
        usage_counts_query = select(
            TemplateUsage.template_id,
            func.count(TemplateUsage.id).label("count"),
        ).where(
            TemplateUsage.template_id.in_(top_template_ids),
            TemplateUsage.profile_id == profile_id,
        ).group_by(TemplateUsage.template_id)

        usage_counts_result = await db.execute(usage_counts_query)
        usage_counts = {row.template_id: row.count for row in usage_counts_result}

        # Build recommendations
        recommendations = []
        for template, match_score in scored_templates[:limit]:
            recommendations.append(
                TemplateRecommendation(
                    id=template.id,
                    name=template.name,
                    description=template.description,
                    category=template.category.value if hasattr(template.category, 'value') else str(template.category),
                    content=template.content,
                    match_score=round(match_score, 2),
                    usage_count=usage_counts.get(template.id, 0),
                    tags=template.tags or [],
                )
            )

        return TemplateRecommendationsResponse(
            templates=recommendations,
            source_type=source_type,
            topic_hint=topic_hint,
            goal=goal,
        )

    except Exception as e:
        logger.error(f"Error recommending templates: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get template recommendations.")


# ============================================================================
# Generation Endpoints
# ============================================================================

@router.post("/scratch", response_model=GeneratorResponse)
async def generate_from_scratch(
    request: ScratchGenerateRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> GeneratorResponse:
    """Generate a draft from scratch based on topic and key points."""
    try:
        await get_profile_with_access(request.profile_id, current_user, db)
        service = GeneratorService(db)
        draft = await service.generate_from_scratch(
            profile_id=request.profile_id,
            topic=request.topic,
            key_points=request.key_points,
            goal=request.goal,
            template_id=request.template_id,
            use_persona=request.use_persona,
            feedback=request.feedback,
            previous_draft_id=request.previous_draft_id,
        )
        return _draft_to_response(draft)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating from scratch: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate draft. Please try again.")


@router.post("/audio", response_model=GeneratorResponse)
async def generate_from_audio(
    current_user: CurrentUser,
    db: DBSession,
    profile_id: Annotated[UUID, Form()],
    file: UploadFile = File(...),
    template_id: Annotated[Optional[UUID], Form()] = None,
    use_persona: Annotated[bool, Form()] = True,
    feedback: Annotated[Optional[str], Form()] = None,
    previous_draft_id: Annotated[Optional[UUID], Form()] = None,
) -> GeneratorResponse:
    """Generate a draft from audio content."""
    try:
        await get_profile_with_access(profile_id, current_user, db)

        if not file.filename:
            raise ValueError("No file provided")

        content = await file.read()
        if not content:
            raise ValueError("Empty file")

        service = GeneratorService(db)
        draft = await service.generate_from_audio(
            profile_id=profile_id,
            audio_content=content,
            filename=file.filename,
            template_id=template_id,
            use_persona=use_persona,
            feedback=feedback,
            previous_draft_id=previous_draft_id,
        )
        return _draft_to_response(draft)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating from audio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate draft from audio. Please try again.")


@router.post("/pdf", response_model=GeneratorResponse)
async def generate_from_pdf(
    current_user: CurrentUser,
    db: DBSession,
    profile_id: Annotated[UUID, Form()],
    file: UploadFile = File(...),
    template_id: Annotated[Optional[UUID], Form()] = None,
    use_persona: Annotated[bool, Form()] = True,
    feedback: Annotated[Optional[str], Form()] = None,
    previous_draft_id: Annotated[Optional[UUID], Form()] = None,
) -> GeneratorResponse:
    """Generate a draft from PDF content."""
    try:
        await get_profile_with_access(profile_id, current_user, db)

        if not file.filename:
            raise ValueError("No file provided")

        if not file.filename.lower().endswith('.pdf'):
            raise ValueError("Only PDF files are supported")

        content = await file.read()
        if not content:
            raise ValueError("Empty file")

        if len(content) > 10 * 1024 * 1024:
            raise ValueError("File too large. Maximum size is 10MB.")

        service = GeneratorService(db)
        draft = await service.generate_from_pdf(
            profile_id=profile_id,
            pdf_content=content,
            filename=file.filename,
            template_id=template_id,
            use_persona=use_persona,
            feedback=feedback,
            previous_draft_id=previous_draft_id,
        )
        return _draft_to_response(draft)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating from PDF: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate draft from PDF. Please try again.")


@router.post("/youtube", response_model=GeneratorResponse)
async def generate_from_youtube(
    request: YouTubeGenerateRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> GeneratorResponse:
    """Generate a draft from a YouTube video transcript."""
    try:
        await get_profile_with_access(request.profile_id, current_user, db)
        service = GeneratorService(db)
        draft = await service.generate_from_youtube(
            profile_id=request.profile_id,
            youtube_url=request.youtube_url,
            template_id=request.template_id,
            use_persona=request.use_persona,
            feedback=request.feedback,
            previous_draft_id=request.previous_draft_id,
        )
        return _draft_to_response(draft)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating from YouTube: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate draft from YouTube. Please try again.")


@router.post("/article", response_model=GeneratorResponse)
async def generate_from_article(
    request: ArticleGenerateRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> GeneratorResponse:
    """Generate a draft from an article URL."""
    try:
        await get_profile_with_access(request.profile_id, current_user, db)
        service = GeneratorService(db)
        draft = await service.generate_from_article(
            profile_id=request.profile_id,
            article_url=request.article_url,
            template_id=request.template_id,
            use_persona=request.use_persona,
            feedback=request.feedback,
            previous_draft_id=request.previous_draft_id,
        )
        return _draft_to_response(draft)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating from article: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate draft from article. Please try again.")


@router.post("/format", response_model=GeneratorResponse)
async def generate_formatted(
    request: FormatGenerateRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> GeneratorResponse:
    """Generate a formatted draft from raw content."""
    try:
        await get_profile_with_access(request.profile_id, current_user, db)
        service = GeneratorService(db)
        draft = await service.generate_formatted(
            profile_id=request.profile_id,
            content=request.content,
            template_id=request.template_id,
            use_persona=request.use_persona,
            feedback=request.feedback,
            previous_draft_id=request.previous_draft_id,
        )
        return _draft_to_response(draft)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating formatted: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to format content. Please try again.")


# ============================================================================
# Content Agency Trigger Endpoint
# ============================================================================

@router.post("/agency/run")
async def trigger_content_agency(
    current_user: CurrentUser,
    db: DBSession,
    profile_id: UUID = Query(..., description="Profile UUID to run agency for"),
) -> dict:
    """Manually trigger the Content Agency for a profile."""
    await get_profile_with_access(profile_id, current_user, db)

    from app.tasks.content_agency import run_content_agency_task

    task = run_content_agency_task.delay(str(profile_id))

    return {
        "message": "Content Agency triggered successfully",
        "task_id": task.id,
        "profile_id": str(profile_id),
    }
