"""Identity graph and style profile endpoints."""
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.models.profile import Profile
from app.models.identity import IdentityGraph, StyleProfile
from app.schemas.identity import (
    IdentityGraphResponse,
    IdentityGraphUpdate,
    StyleProfileResponse,
    StyleProfileUpdate,
)

router = APIRouter()


@router.get("/profiles/{profile_id}/identity-graph", response_model=IdentityGraphResponse)
async def get_identity_graph(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> IdentityGraphResponse:
    """Get identity graph for a profile."""
    # Verify profile ownership
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    result = await db.execute(
        select(IdentityGraph).where(IdentityGraph.profile_id == profile_id)
    )
    identity_graph = result.scalar_one_or_none()

    if not identity_graph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Identity graph not found",
        )

    return IdentityGraphResponse.model_validate(identity_graph)


@router.put("/profiles/{profile_id}/identity-graph", response_model=IdentityGraphResponse)
async def update_identity_graph(
    profile_id: UUID,
    update_data: IdentityGraphUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> IdentityGraphResponse:
    """Update identity graph for a profile."""
    # Verify profile ownership
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    result = await db.execute(
        select(IdentityGraph).where(IdentityGraph.profile_id == profile_id)
    )
    identity_graph = result.scalar_one_or_none()

    if not identity_graph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Identity graph not found",
        )

    # Update fields
    data = update_data.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(identity_graph, field, value)

    # Recalculate completeness score using the new calculator
    from app.services.completeness import (
        calculate_completeness,
        identity_graph_to_dict,
        style_profile_to_dict,
    )
    from sqlalchemy import select as sql_select
    
    # Load style profile for completeness calculation
    style_stmt = sql_select(StyleProfile).where(StyleProfile.profile_id == profile_id)
    style_result = await db.execute(style_stmt)
    style_profile = style_result.scalar_one_or_none()
    
    identity_data = identity_graph_to_dict(identity_graph)
    style_data = style_profile_to_dict(style_profile)
    completeness = calculate_completeness(identity_data, style_data)
    
    # Update stored completeness_score to keep DB in sync
    identity_graph.completeness_score = completeness.percentage

    # Increment version
    identity_graph.version += 1

    await db.commit()
    await db.refresh(identity_graph)

    # Trigger async persona re-synthesis after identity changes
    from app.tasks.persona_synthesizer import synthesize_persona_task
    synthesize_persona_task.delay(str(profile_id))

    return IdentityGraphResponse.model_validate(identity_graph)


@router.get("/profiles/{profile_id}/style-profile", response_model=StyleProfileResponse)
async def get_style_profile(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> StyleProfileResponse:
    """Get style profile for a profile."""
    # Verify profile ownership
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    result = await db.execute(
        select(StyleProfile).where(StyleProfile.profile_id == profile_id)
    )
    style_profile = result.scalar_one_or_none()

    if not style_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Style profile not found",
        )

    return StyleProfileResponse.model_validate(style_profile)


@router.put("/profiles/{profile_id}/style-profile", response_model=StyleProfileResponse)
async def update_style_profile(
    profile_id: UUID,
    update_data: StyleProfileUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> StyleProfileResponse:
    """Update style profile for a profile."""
    # Verify profile ownership
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    result = await db.execute(
        select(StyleProfile).where(StyleProfile.profile_id == profile_id)
    )
    style_profile = result.scalar_one_or_none()

    if not style_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Style profile not found",
        )

    # Update fields
    data = update_data.model_dump(exclude_unset=True)
    for field, value in data.items():
        if value is not None:
            setattr(style_profile, field, value)

    # Recalculate completeness score (style changes affect completeness)
    from app.services.completeness import (
        calculate_completeness,
        identity_graph_to_dict,
        style_profile_to_dict,
    )
    
    # Load identity graph for completeness calculation
    identity_stmt = select(IdentityGraph).where(IdentityGraph.profile_id == profile_id)
    identity_result = await db.execute(identity_stmt)
    identity_graph = identity_result.scalar_one_or_none()
    
    if identity_graph:
        identity_data = identity_graph_to_dict(identity_graph)
        style_data = style_profile_to_dict(style_profile)
        completeness = calculate_completeness(identity_data, style_data)
        
        # Update stored completeness_score to keep DB in sync
        identity_graph.completeness_score = completeness.percentage
        await db.flush()  # Flush identity_graph update

    # Increment version
    style_profile.version += 1

    await db.commit()
    await db.refresh(style_profile)

    # Trigger async persona re-synthesis after style changes
    from app.tasks.persona_synthesizer import synthesize_persona_task
    synthesize_persona_task.delay(str(profile_id))

    return StyleProfileResponse.model_validate(style_profile)


# ============================================
# Identity Universe (Unified) Endpoints
# ============================================

from app.schemas.identity_universe import (
    IdentityUniverseResponse,
    PersonaData,
    RegenerationPreview,
    RegenerationRequest,
    RegenerationField,
)


@router.get("/profiles/{profile_id}/identity-universe", response_model=IdentityUniverseResponse)
async def get_identity_universe(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> IdentityUniverseResponse:
    """
    Get complete identity universe (graph + style + persona) for visualization.
    This is the unified endpoint for the Identity Universe feature.
    """
    from app.services.completeness import (
        calculate_completeness,
        identity_graph_to_dict,
        style_profile_to_dict,
    )
    
    # Load profile with all related data
    result = await db.execute(
        select(Profile)
        .options(
            selectinload(Profile.identity_graph),
            selectinload(Profile.style_profile),
        )
        .where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    identity = profile.identity_graph
    style = profile.style_profile

    if not identity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Identity graph not found for this profile",
        )

    # Calculate completeness from actual data using schema
    identity_data = identity_graph_to_dict(identity)
    style_data = style_profile_to_dict(style)
    completeness = calculate_completeness(identity_data, style_data)

    # Build identity graph dict with all fields
    identity_dict = {
        "id": str(identity.id),
        "profile_id": str(identity.profile_id),
        # Core identity
        "current_role": identity.current_role,
        "industry": identity.industry,
        # Professional details
        "expertise_areas": identity.expertise_areas or [],
        "career_highlights": identity.career_highlights or [],
        "career_stage": identity.career_stage,
        "education": identity.education or [],
        "bio_summary": identity.bio_summary,
        # Brand Strategy
        "target_audience": identity.target_audience,
        "desired_positioning": identity.desired_positioning,
        "unique_angles": identity.unique_angles or [],
        "aspirations": identity.aspirations,
        "goals": identity.goals,
        # Personality & Content
        "interests": identity.interests or [],
        "beliefs": identity.beliefs or [],
        "contrarian_views": identity.contrarian_views or [],
        # Content Strategy
        "content_pillars": identity.content_pillars or [],
        "narrative_themes": identity.narrative_themes or [],
        # Legacy fields (now properly included)
        "themes": identity.themes or [],
        "expertise_keywords": identity.expertise_keywords or [],
        "tone_markers": identity.tone_markers or {},
        "audience_notes": identity.audience_notes or {},
        "authority_angles": identity.authority_angles or [],
        # Metadata - use calculated completeness
        "completeness_score": completeness.percentage,
        "version": identity.version,
        "last_updated_at": identity.last_updated_at.isoformat() if identity.last_updated_at else None,
        "created_at": identity.created_at.isoformat() if identity.created_at else None,
    }

    # Build style profile dict if exists
    style_dict = None
    if style:
        style_dict = {
            "id": str(style.id),
            "profile_id": str(style.profile_id),
            "tone_sliders": style.tone_sliders or {
                "formal_casual": 0.5,
                "technical_simple": 0.5,
                "serious_playful": 0.5,
                "humble_confident": 0.5,
            },
            "format_preferences": style.format_preferences or {
                "post": 0.5,
                "thread": 0.3,
                "carousel": 0.2,
            },
            "taboo_list": style.taboo_list or [],
            "preferred_hooks": style.preferred_hooks or [],
            "weights": style.weights or {},
            "version": style.version,
            "created_at": style.created_at.isoformat() if style.created_at else None,
            "updated_at": style.updated_at.isoformat() if style.updated_at else None,
        }

    # Build persona data
    persona = PersonaData(
        persona_prompt=profile.persona_prompt,
        persona_prompt_updated_at=profile.persona_prompt_updated_at,
        learned_preferences=profile.learned_preferences,
        learned_preferences_updated_at=profile.learned_preferences_updated_at,
    )

    return IdentityUniverseResponse(
        identity_graph=identity_dict,
        style_profile=style_dict,
        persona=persona,
        profile_id=profile.id,
        profile_name=profile.name,
        completeness_score=completeness.percentage,
    )


@router.post("/profiles/{profile_id}/identity-universe/regenerate-preview", response_model=RegenerationPreview)
async def preview_regeneration(
    profile_id: UUID,
    request: RegenerationRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> RegenerationPreview:
    """
    Generate a preview of identity regeneration without persisting.
    Returns proposed changes that can be selectively accepted.
    """
    # Load profile with identity
    result = await db.execute(
        select(Profile)
        .options(
            selectinload(Profile.identity_graph),
            selectinload(Profile.style_profile),
        )
        .where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    identity = profile.identity_graph
    if not identity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Identity graph not found",
        )

    # For now, just use persona synthesizer to generate a new persona prompt as preview
    # Full regeneration of identity fields would require more complex AI processing
    from app.services.persona_synthesizer import PersonaSynthesizerService
    
    synthesizer = PersonaSynthesizerService()
    
    changes: list[RegenerationField] = []
    new_persona = None
    
    if request.scope == "full" or (request.fields_to_regenerate and "persona_prompt" in request.fields_to_regenerate):
        # Generate new persona prompt preview (don't save)
        # We'll call the LLM but not persist
        # For preview, build the prompt the same way as synthesis, but return instead of saving
        
        style = profile.style_profile
        
        # Build identity data for synthesis
        identity_data = {
            "current_role": identity.current_role or "Professional",
            "industry": identity.industry or "Not specified",
            "expertise_areas": ", ".join(identity.expertise_areas or []) or "Not specified",
            "career_highlights": ", ".join(identity.career_highlights or []) or "Not specified",
            "target_audience": identity.target_audience or "Professionals",
            "unique_angles": ", ".join(identity.unique_angles or []) or "Not specified",
            "content_pillars": ", ".join(identity.content_pillars or []) or "Not specified",
            "themes": ", ".join(identity.themes or []) or "Not specified",
            "authority_angles": ", ".join(identity.authority_angles or []) or "Not specified",
            "bio_summary": identity.bio_summary or "Not provided",
            "interests": ", ".join(identity.interests or []) or "Not specified",
            "beliefs": ", ".join(identity.beliefs or []) or "Not specified",
        }
        
        tone_sliders = style.tone_sliders if style else {}
        style_data = {
            "formal_casual": tone_sliders.get("formal_casual", 0.5),
            "technical_simple": tone_sliders.get("technical_simple", 0.5),
            "serious_playful": tone_sliders.get("serious_playful", 0.5),
            "humble_confident": tone_sliders.get("humble_confident", 0.5),
            "preferred_hooks": ", ".join(style.preferred_hooks if style else []) or "Not specified",
            "taboo_list": ", ".join(style.taboo_list if style else []) or "None specified",
        }
        
        learned_preferences = profile.learned_preferences or "No preferences learned yet from feedback."
        
        # Generate new persona
        from app.services.persona_synthesizer import PERSONA_SYNTHESIS_PROMPT
        from app.llm.gemini import GeminiProvider
        
        llm = GeminiProvider()
        prompt = PERSONA_SYNTHESIS_PROMPT.format(
            **identity_data,
            **style_data,
            learned_preferences=learned_preferences,
        )
        
        try:
            new_persona = await llm.generate(
                prompt=prompt,
                system_prompt="You are an expert at understanding personal brands and communication styles. Create a clear, actionable persona prompt.",
                temperature=0.7,
                max_tokens=1500,
            )
            new_persona = new_persona.strip()
            
            if new_persona and new_persona != profile.persona_prompt:
                changes.append(RegenerationField(
                    field_name="persona_prompt",
                    current_value=profile.persona_prompt,
                    proposed_value=new_persona,
                    field_category="persona",
                ))
        except Exception as e:
            # Log but don't fail - return empty changes
            import logging
            logging.error(f"Failed to generate persona preview: {e}")

    return RegenerationPreview(
        profile_id=profile_id,
        changes=changes,
        new_persona_prompt=new_persona,
        regeneration_scope=request.scope,
    )
