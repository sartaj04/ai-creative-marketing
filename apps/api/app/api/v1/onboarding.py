"""Onboarding API endpoints."""
import json
import uuid
from pathlib import Path

import aiofiles
import aiofiles.os
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.models.profile import Profile, ProfileSource, ProfileType
from app.models.profile_member import ProfileMember, MemberRole, MemberStatus
from app.models.identity import IdentityGraph, StyleProfile
from app.models.user import User
from app.models.document import ExtractedDocument, SourceType
from app.schemas.onboarding import (
    ChatMessage,
    ContentFocusRequest,
    ContentFocusResponse,
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
from app.services.timeline_service import TimelineService
from app.models.identity import TimelineEventType
from app.services.onboarding_prompts import (
    PIXO_ONBOARDING_SYSTEM_PROMPT,
    PIXO_REFINEMENT_SYSTEM_PROMPT,
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

from pydantic import BaseModel


class LinkedInURLRequest(BaseModel):
    """Request schema for LinkedIn URL submission."""
    linkedin_url: str


class LinkedInURLResponse(BaseModel):
    """Response schema for LinkedIn URL submission."""
    success: bool
    message: str
    profile_extracted: bool = False
    posts_scraping_queued: bool = False
    career_timeline_extracted: bool = False
    suggested_topics: list[str] = []
    error: str | None = None


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

        # Create OWNER membership
        membership = ProfileMember(
            profile_id=profile.id,
            user_id=user_id,
            role=MemberRole.OWNER,
            status=MemberStatus.ACCEPTED,
        )
        db.add(membership)

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


@router.post("/linkedin-url", response_model=LinkedInURLResponse)
async def submit_linkedin_url(
    request: LinkedInURLRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Submit LinkedIn profile URL to scrape profile data and posts.

    This is the primary onboarding input. Scrapes the user's LinkedIn profile
    for structured identity data, and queues an async task to scrape their
    posts for deep identity extraction (stories, opinions, interest details).
    """
    from app.services.extraction_service import ExtractionService, LINKEDIN_URL_PATTERN

    profile = await get_or_create_user_profile(current_user.id, db, current_user.name)

    # Validate URL format
    if not LINKEDIN_URL_PATTERN.match(request.linkedin_url):
        return LinkedInURLResponse(
            success=False,
            message="Invalid LinkedIn URL. Expected format: linkedin.com/in/username",
            error="invalid_url",
        )

    # Save LinkedIn URL to ProfileSource for future use
    source_stmt = select(ProfileSource).where(ProfileSource.profile_id == profile.id)
    source_result = await db.execute(source_stmt)
    profile_source = source_result.scalars().first()
    if profile_source:
        profile_source.linkedin_url = request.linkedin_url
    else:
        profile_source = ProfileSource(
            profile_id=profile.id,
            linkedin_url=request.linkedin_url,
        )
        db.add(profile_source)
    await db.flush()

    extraction = ExtractionService()
    profile_extracted = False

    # Step 1: Scrape LinkedIn profile (synchronous, fast)
    try:
        linkedin_data = await extraction.extract_linkedin_profile(request.linkedin_url)
        if linkedin_data:
            # Save extracted data directly to identity graph
            service = OnboardingService(db)
            graph = await service.get_or_create_identity_graph(profile.id)
            ctx = dict(graph.onboarding_context) if graph.onboarding_context else {}
            extracted = dict(ctx.get("extracted_data", {}))
            extracted.update(linkedin_data)
            ctx["extracted_data"] = extracted
            ctx["has_extraction"] = True
            ctx["linkedin_extracted"] = True
            graph.onboarding_context = ctx

            # Also set direct fields on identity graph
            if linkedin_data.get("current_role"):
                graph.current_role = linkedin_data["current_role"]
            if linkedin_data.get("industry"):
                graph.industry = linkedin_data["industry"]
            if linkedin_data.get("expertise_areas"):
                graph.expertise_areas = linkedin_data["expertise_areas"]
            if linkedin_data.get("bio_summary"):
                graph.bio_summary = linkedin_data["bio_summary"]
            if linkedin_data.get("career_highlights"):
                graph.career_highlights = linkedin_data["career_highlights"]

            await db.commit()
            profile_extracted = True
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"LinkedIn profile extraction failed: {e}")
        
        # Check for critical errors that should stop the flow
        error_msg = str(e)
        if "free plan" in error_msg.lower() or "apify token" in error_msg.lower() or "paid apify plan" in error_msg.lower():
            return LinkedInURLResponse(
                success=False,
                message="An error occurred during extraction. Please try uploading your LinkedIn profile PDF instead.",
                error=error_msg,
                profile_extracted=False
            )
        
        # For other errors, we check if they are critical enough to stop the flow
        # If no profile data was extracted, we should likely fail to let the user know
        if not profile_extracted:
             return LinkedInURLResponse(
                success=False,
                message="We couldn't extract data from this LinkedIn URL.",
                error=str(e),
                profile_extracted=False
            )
        # If we somehow have data but got an error (unlikely here but safe fallback), pass

    # Step 2: Extract career timeline via Gemini (if we have profile data)
    career_timeline_extracted = False
    suggested_topics: list[str] = []
    if profile_extracted and linkedin_data:
        try:
            from app.llm.gemini import GeminiProvider
            from datetime import datetime as dt

            gemini = GeminiProvider()
            timeline_result = await gemini.extract_career_timeline(linkedin_data)

            if timeline_result and timeline_result.get("events"):
                service = OnboardingService(db)
                graph = await service.get_or_create_identity_graph(profile.id)
                timeline_service = TimelineService(db)
                timeline = await timeline_service.get_or_create_timeline(graph.id)

                # Save narrative arc
                timeline.narrative_arc = timeline_result.get("narrative_arc", "")

                # Create TimelineEvents from extracted data
                for event_data in timeline_result["events"]:
                    event_type_str = event_data.get("type", "other")
                    event_type_map = {
                        "work": TimelineEventType.WORK,
                        "education": TimelineEventType.EDUCATION,
                    }
                    event_type = event_type_map.get(event_type_str, TimelineEventType.OTHER)

                    # Parse dates (YYYY-MM format)
                    start_date = None
                    end_date = None
                    try:
                        if event_data.get("start_date"):
                            start_date = dt.strptime(event_data["start_date"], "%Y-%m")
                    except (ValueError, TypeError):
                        pass
                    try:
                        if event_data.get("end_date"):
                            end_date = dt.strptime(event_data["end_date"], "%Y-%m")
                    except (ValueError, TypeError):
                        pass

                    await timeline_service.add_event(
                        timeline_id=timeline.id,
                        title=f"{event_data.get('title', '')} at {event_data.get('organization', '')}".strip(" at "),
                        event_type=event_type,
                        start_date=start_date,
                        end_date=end_date,
                        description=event_data.get("description", ""),
                        tags=event_data.get("skills_used", []),
                    )

                    # Set additional fields via direct update if available
                    # (TimelineService.add_event doesn't accept all fields)

                await db.commit()
                career_timeline_extracted = True
                suggested_topics = timeline_result.get("suggested_topics", [])
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Career timeline extraction failed: {e}")
            # Non-critical: continue without timeline

    # Step 3: Queue async task to scrape posts + extract identity
    posts_queued = False
    try:
        from app.tasks.linkedin_identity_extraction import scrape_and_extract_identity_task
        scrape_and_extract_identity_task.delay(str(profile.id), request.linkedin_url)
        posts_queued = True
    except Exception:
        pass

    return LinkedInURLResponse(
        success=True,
        message="LinkedIn profile processed. Post analysis running in background.",
        profile_extracted=profile_extracted,
        posts_scraping_queued=posts_queued,
        career_timeline_extracted=career_timeline_extracted,
        suggested_topics=suggested_topics,
    )


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

        # Attempt to find LinkedIn URL in the uploaded document for post scraping
        try:
            from app.services.extraction_service import extract_linkedin_url_from_text, ResumeParser
            parser = ResumeParser()
            if ext == "pdf":
                raw_text = parser._extract_text_from_pdf(tmp_path)
            elif ext in ("docx", "doc"):
                raw_text = parser._extract_text_from_docx(tmp_path)
            else:
                raw_text = ""

            linkedin_url = extract_linkedin_url_from_text(raw_text)
            if linkedin_url:
                from app.tasks.linkedin_identity_extraction import scrape_and_extract_identity_task
                scrape_and_extract_identity_task.delay(str(profile.id), linkedin_url)
        except Exception:
            pass  # Non-critical: post scraping is a bonus

        return result
    finally:
        # Async cleanup
        try:
            await aiofiles.os.remove(tmp_path)
        except OSError:
            pass  # File may not exist if extraction failed early


@router.post("/content-focus", response_model=ContentFocusResponse)
async def save_content_focus(
    request: ContentFocusRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Save user's content focus topics during onboarding.

    Merges primary_topics and custom_topics (deduped) and saves
    to Timeline.primary_focus as a JSON string.
    """
    import json as _json

    profile = await get_or_create_user_profile(current_user.id, db, current_user.name)

    # Merge and deduplicate topics
    all_topics: list[str] = list(request.primary_topics)
    for custom in request.custom_topics:
        if custom and custom.strip() and custom.strip() not in all_topics:
            all_topics.append(custom.strip())

    # Save to Timeline.primary_focus
    service = OnboardingService(db)
    graph = await service.get_or_create_identity_graph(profile.id)
    timeline_service = TimelineService(db)
    timeline = await timeline_service.get_or_create_timeline(graph.id)
    timeline.primary_focus = _json.dumps(all_topics)
    await db.commit()

    return ContentFocusResponse(success=True, topics_saved=len(all_topics))


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
    
    # Count stories and opinions
    stories = existing_data.get("stories", [])
    stories_count = len(stories) if isinstance(stories, list) else 0
    opinions = existing_data.get("opinion_statements", [])
    opinions_count = len(opinions) if isinstance(opinions, list) else 0
    
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
        stories_count=stories_count,
        opinions_count=opinions_count,
    )
    
    # Use appropriate system prompt based on mode
    system_prompt = PIXO_REFINEMENT_SYSTEM_PROMPT if request.mode == "refinement" else PIXO_ONBOARDING_SYSTEM_PROMPT
    full_prompt = f"{system_prompt}\n\n{conversation_prompt}"
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
    
    # Handle corrections: if the LLM flagged fields as corrected, allow overwrites
    corrections = []
    if isinstance(extracted_json, dict):
        corrections = extracted_json.pop("corrections", []) or []
    
    # Merge with existing data (don't overwrite with empty values, UNLESS it's a correction)
    merged_data = {**existing_data}
    for key, value in extracted_json.items():
        if key in corrections:
            # Correction: always overwrite, even with empty/updated value
            merged_data[key] = value
        elif value and (isinstance(value, list) and len(value) > 0 or not isinstance(value, list)):
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

        # Save stories and opinion_statements (append, don't replace)
        if merged_data.get("stories"):
            existing_stories = identity_graph.stories or []
            new_stories = merged_data["stories"]
            if isinstance(new_stories, list):
                for s in new_stories:
                    if s and s not in existing_stories:
                        existing_stories.append(s)
            identity_graph.stories = existing_stories

            # [NEW] Add stories to Timeline
            try:
                timeline_service = TimelineService(db)
                timeline = await timeline_service.get_or_create_timeline(identity_graph.id)
                new_stories_list = merged_data["stories"]
                if isinstance(new_stories_list, list):
                    for s in new_stories_list:
                        if isinstance(s, dict):
                            await timeline_service.add_event(
                                timeline_id=timeline.id,
                                title=s.get("title", "New Story"),
                                event_type=TimelineEventType.LIFE_EVENT,
                                description=s.get("narrative", ""),
                                emotional_core=s.get("emotional_core", ""),
                                source="chat"
                            )
            except Exception as e:
                # Don't fail chat if timeline update fails
                pass

        if merged_data.get("opinion_statements"):
            existing_opinions = identity_graph.opinion_statements or []
            new_opinions = merged_data["opinion_statements"]
            if isinstance(new_opinions, list):
                for o in new_opinions:
                    if o and o not in existing_opinions:
                        existing_opinions.append(o)
            identity_graph.opinion_statements = existing_opinions

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

        # If refinement chat added new identity data, regenerate persona prompt
        # so content generation picks up the new stories/opinions
        if request.mode == "refinement" and (
            merged_data.get("stories") or merged_data.get("opinion_statements")
        ):
            try:
                from app.tasks.persona_synthesizer import synthesize_persona_task
                synthesize_persona_task.delay(str(profile.id))
            except Exception:
                pass  # Non-blocking — persona regen can happen later

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
    
    # Trigger content generation for new user
    if success:
        from app.tasks.content_agency import run_content_agency_task
        # Run async task to generate initial content
        run_content_agency_task.delay(str(profile.id))
    
    return {
        "success": success,
        "redirect_url": "/dashboard",
    }
