"""Onboarding service for identity graph creation."""
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import ExtractedDocument
from app.models.identity import IdentityGraph, StyleProfile
from app.models.profile import Profile
from app.schemas.onboarding import (
    ProfessionalStepData,
    InterestsStepData,
    VoiceStepData,
)
from app.llm.gemini import GeminiProvider
from app.services.extraction_service import ExtractionService

logger = logging.getLogger(__name__)


class OnboardingService:
    """Service for managing onboarding flow and identity graph creation."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = GeminiProvider()
        self.extractor = ExtractionService()

    async def get_or_create_identity_graph(self, profile_id: UUID) -> IdentityGraph:
        """Get existing identity graph or create new one."""
        stmt = select(IdentityGraph).where(IdentityGraph.profile_id == profile_id)
        result = await self.db.execute(stmt)
        graph = result.scalar_one_or_none()

        if not graph:
            graph = IdentityGraph(
                profile_id=profile_id,
                onboarding_context={
                    "step": "INIT",
                    "question_count": 0,
                    "extracted_data": {},
                    "history": [],
                },
            )
            self.db.add(graph)
            await self.db.commit()
            await self.db.refresh(graph)

        return graph

    async def get_onboarding_status(self, profile_id: UUID) -> Dict[str, Any]:
        """Get onboarding status without modifying state (read-only)."""
        from app.services.completeness import (
            calculate_completeness,
            identity_graph_to_dict,
            style_profile_to_dict,
        )
        from sqlalchemy.orm import selectinload
        
        # Load identity graph and style profile together
        stmt = (
            select(IdentityGraph)
            .where(IdentityGraph.profile_id == profile_id)
        )
        result = await self.db.execute(stmt)
        graph = result.scalar_one_or_none()

        if not graph:
            return {
                "is_complete": False,
                "step": None,
                "completeness_score": 0,
                "has_extraction": False,
                "extracted_sources": [],
            }

        # Load style profile
        style_stmt = select(StyleProfile).where(StyleProfile.profile_id == profile_id)
        style_result = await self.db.execute(style_stmt)
        style_profile = style_result.scalar_one_or_none()

        context = graph.onboarding_context or {}

        # Determine extracted sources
        extracted_sources = []
        if context.get("linkedin_extracted"):
            extracted_sources.append("linkedin")
        if context.get("resume_extracted"):
            extracted_sources.append("resume")

        # Calculate completeness using the new calculator (same as identity universe endpoint)
        identity_data = identity_graph_to_dict(graph)
        style_data = style_profile_to_dict(style_profile)
        completeness = calculate_completeness(identity_data, style_data)

        return {
            "is_complete": context.get("step") == "COMPLETE",
            "step": context.get("step"),
            "completeness_score": completeness.percentage,  # Use calculated value, not stored
            "has_extraction": context.get("has_extraction", False),
            "extracted_sources": extracted_sources,
        }

    async def process_extraction(
        self,
        profile_id: UUID,
        source_type: str,
        input_value: str,
        file_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Process URL or File extraction."""
        graph = await self.get_or_create_identity_graph(profile_id)
        try:
            data = {}
            extraction_summary = None

            if source_type == "resume":
                # Use provided file_type or detect from path
                actual_file_type = file_type
                if not actual_file_type:
                    actual_file_type = Path(input_value).suffix.lower().lstrip(".")

                data = await self.extractor.extract_resume(input_value, actual_file_type)
                
                # Validate we got structured data, not just raw_text
                if data and len(data) == 1 and "raw_text" in data:
                    raise ValueError("Resume parsing failed - only raw text extracted. The LLM may not have responded correctly.")
                
                extraction_summary = self._build_resume_summary(data)

            # Save raw extraction
            doc = ExtractedDocument(
                profile_id=profile_id,
                source_type=source_type,
                source_url=None,  # Resume files don't have URLs
                content=str(data),
                metadata_json=data,
            )
            self.db.add(doc)
            
            # Log extraction for monitoring (without sensitive data)
            logger.info(
                f"LinkedIn profile extraction completed for profile {profile_id}: "
                f"source={source_type}, fields={len(data)}, "
                f"user_initiated=True"
            )

            # Safe update of extracted_data
            ctx = dict(graph.onboarding_context) if graph.onboarding_context else {}
            extracted = dict(ctx.get("extracted_data", {}))
            extracted.update(data)

            ctx["extracted_data"] = extracted
            ctx["has_extraction"] = True
            ctx[f"{source_type}_extracted"] = True
            graph.onboarding_context = ctx

            await self.db.commit()

            return {
                "success": True,
                "summary": f"Successfully extracted data from {source_type}.",
                "data": data,
                "extraction_summary": extraction_summary,
            }

        except Exception as e:
            logger.error(f"Extraction failed: {e}", exc_info=True)
            
            # Provide user-friendly error messages
            error_message = str(e).lower()
            if "apify token" in error_message or "not configured" in error_message:
                user_message = "LinkedIn extraction is currently unavailable. Please try uploading your LinkedIn profile PDF or continue with manual entry."
            elif "free plan" in error_message or ("paid apify plan" in error_message):
                user_message = "LinkedIn extraction requires a paid Apify plan. Free plans can only run actors through the UI. Please upgrade your Apify account or upload your LinkedIn profile PDF instead."
            elif "rent" in error_message or "paid actor" in error_message or "free trial" in error_message:
                user_message = "LinkedIn extraction is temporarily unavailable. Please try uploading your LinkedIn profile PDF or continue with manual entry."
            elif "linkedin" in error_message and ("invalid" in error_message or "format" in error_message):
                user_message = "Please enter a valid LinkedIn profile URL (e.g., linkedin.com/in/username)."
            elif "timeout" in error_message:
                user_message = "The extraction took too long. Please try again or use manual entry."
            elif "no data found" in error_message or "returned no data" in error_message:
                user_message = "We couldn't find data for this LinkedIn profile. This may be due to Apify plan restrictions or profile privacy settings. Please try uploading your LinkedIn profile PDF or continue with manual entry."
            elif "resume" in error_message or "file" in error_message:
                user_message = "We couldn't parse your LinkedIn profile PDF. Please try downloading it again from LinkedIn (Resources → Download PDF) or use manual entry."
            else:
                user_message = f"Unable to extract data from {source_type}. Please try uploading your LinkedIn profile PDF or continue with manual entry."
            
            return {
                "success": False,
                "summary": f"Failed to extract from {source_type}.",
                "error": user_message,
            }

    def _build_resume_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Build summary of resume extraction for UI display."""
        # Exclude raw_text and other non-structured fields from fields_extracted
        exclude_fields = {"raw_text", "parse_error"}
        fields_extracted = [
            k for k in data.keys() 
            if k not in exclude_fields and data.get(k) is not None and data.get(k) != []
        ]
        
        # Build comprehensive highlights
        highlights = {
            "current_role": data.get("current_role"),
            "industry": data.get("industry"),
            "years_experience": data.get("years_experience"),
            "career_stage": data.get("career_stage"),
            "skills_count": len(data.get("top_skills", [])) if data.get("top_skills") else 0,
            "highlights_count": len(data.get("career_highlights", [])) if data.get("career_highlights") else 0,
            "expertise_count": len(data.get("expertise_areas", [])) if data.get("expertise_areas") else 0,
            "content_pillars_count": len(data.get("content_pillars", [])) if data.get("content_pillars") else 0,
            "education_count": len(data.get("education", [])) if data.get("education") else 0,
        }
        
        # Add name if available (from raw_text or extracted)
        if "name" in data:
            highlights["name"] = data.get("name")
        
        return {
            "source": "resume",
            "fields_extracted": fields_extracted,
            "highlights": highlights,
        }

    async def complete_onboarding(self, profile_id: UUID) -> bool:
        """Finalize the profile from collected context."""
        graph = await self.get_or_create_identity_graph(profile_id)
        data = graph.onboarding_context.get("extracted_data", {}) if graph.onboarding_context else {}

        # Safe string field mapping
        string_field_mappings = {
            "current_role": "current_role",
            "industry": "industry",
            "goals": "goals",
            "target_audience": "target_audience",
            "desired_positioning": "desired_positioning",
            "aspirations": "aspirations",
            "career_stage": "career_stage",
            "bio_summary": "bio_summary",
        }

        for data_key, graph_field in string_field_mappings.items():
            if data_key in data and data[data_key]:
                setattr(graph, graph_field, str(data[data_key]))

        # Safe list field mappings
        list_field_mappings = [
            "expertise_areas",
            "career_highlights",
            "unique_angles",
            "interests",
            "beliefs",
            "contrarian_views",
            "content_pillars",
            "narrative_themes",
            "education",
            "themes",  # Legacy field for topics/themes
        ]

        for field in list_field_mappings:
            if field in data:
                value = data[field]
                current = getattr(graph, field, None)

                # Ensure current is a list
                if current is None:
                    current = []
                elif not isinstance(current, list):
                    current = []

                # Handle incoming value
                if isinstance(value, list):
                    # For education, replace entirely (structured data)
                    if field == "education":
                        setattr(graph, field, value)
                    else:
                        # Merge lists, avoiding duplicates
                        for item in value:
                            if item and item not in current:
                                current.append(item)
                        setattr(graph, field, current)
                elif value:
                    # Single value - add if not present
                    str_value = str(value)
                    if str_value not in current:
                        current.append(str_value)
                    setattr(graph, field, current)

        # Handle top_skills - merge into expertise_keywords (legacy field)
        # Note: top_skills are already included in expertise_areas from extraction,
        # so we only add to expertise_keywords to avoid duplication
        if "top_skills" in data and data["top_skills"]:
            skills = data["top_skills"]
            if isinstance(skills, list):
                current_keywords = getattr(graph, "expertise_keywords", None) or []
                if not isinstance(current_keywords, list):
                    current_keywords = []
                # Merge skills into expertise_keywords only
                for skill in skills:
                    if skill and skill not in current_keywords:
                        current_keywords.append(skill)
                graph.expertise_keywords = current_keywords

        # Note: years_experience is informational and doesn't need to be stored
        # separately or added to career_highlights. It's already captured in career_stage
        # and can be inferred from career_highlights if needed.

        # Calculate completeness score deterministically
        graph.completeness_score = self._calculate_completeness_score(graph)

        # Mark complete
        ctx = dict(graph.onboarding_context) if graph.onboarding_context else {}
        ctx["step"] = "COMPLETE"
        graph.onboarding_context = ctx

        self.db.add(graph)
        await self.db.commit()

        # Trigger async persona synthesis now that identity is complete
        # This is non-blocking - if Celery/Redis isn't available, onboarding still completes
        try:
            from app.tasks.persona_synthesizer import synthesize_persona_task
            synthesize_persona_task.delay(str(profile_id))
            logger.info(f"Queued persona synthesis task for profile {profile_id}")
        except Exception as e:
            # Don't fail onboarding if Celery/Redis is unavailable
            # Persona synthesis can happen later when background services are available
            logger.warning(f"Could not queue persona synthesis task for profile {profile_id}: {e}. Onboarding completed successfully, persona synthesis will be triggered later.")

        return True

    def _calculate_completeness_score(self, graph: IdentityGraph) -> int:
        """Calculate completeness score based on filled fields.

        Scoring rubric (total 100 points):
        - Core identity (40 points):
          - current_role: 15 points
          - industry: 10 points
          - expertise_areas (at least 2): 15 points
        - Strategy (35 points):
          - target_audience: 15 points
          - goals: 10 points
          - unique_angles (at least 1): 10 points
        - Content/Personality (25 points):
          - career_highlights (at least 2): 10 points
          - interests (at least 1): 5 points
          - beliefs (at least 1): 5 points
          - content_pillars (at least 1): 5 points
        """
        score = 0

        # Core identity (40 points)
        if graph.current_role:
            score += 15
        if graph.industry:
            score += 10
        expertise = graph.expertise_areas or []
        if len(expertise) >= 2:
            score += 15
        elif len(expertise) >= 1:
            score += 8

        # Strategy (35 points)
        if graph.target_audience:
            score += 15
        if graph.goals:
            score += 10
        angles = graph.unique_angles or []
        if len(angles) >= 1:
            score += 10

        # Content/Personality (25 points)
        highlights = graph.career_highlights or []
        if len(highlights) >= 2:
            score += 10
        elif len(highlights) >= 1:
            score += 5
        interests = graph.interests or []
        if len(interests) >= 1:
            score += 5
        beliefs = graph.beliefs or []
        if len(beliefs) >= 1:
            score += 5
        pillars = graph.content_pillars or []
        if len(pillars) >= 1:
            score += 5

        return min(score, 100)

    # Voice post style mappings - maps post IDs to tone slider adjustments
    VOICE_POST_STYLES = {
        # Formal/Professional posts (2-3)
        "formal_1": {"formal_casual": 0.2, "technical_simple": 0.1, "serious_playful": 0.2, "humble_confident": 0.1},
        "formal_2": {"formal_casual": 0.15, "technical_simple": 0.05, "serious_playful": 0.15, "humble_confident": 0.15},
        "formal_3": {"formal_casual": 0.25, "technical_simple": 0.15, "serious_playful": 0.1, "humble_confident": 0.05},
        # Casual/Conversational posts (2-3)
        "casual_1": {"formal_casual": -0.25, "technical_simple": -0.1, "serious_playful": -0.15, "humble_confident": 0.0},
        "casual_2": {"formal_casual": -0.2, "technical_simple": -0.15, "serious_playful": -0.1, "humble_confident": 0.05},
        "casual_3": {"formal_casual": -0.15, "technical_simple": -0.05, "serious_playful": -0.2, "humble_confident": -0.05},
        # Storytelling/Narrative posts (2-3)
        "story_1": {"formal_casual": -0.1, "technical_simple": -0.15, "serious_playful": -0.05, "humble_confident": 0.1},
        "story_2": {"formal_casual": -0.05, "technical_simple": -0.2, "serious_playful": 0.0, "humble_confident": 0.05},
        "story_3": {"formal_casual": 0.0, "technical_simple": -0.1, "serious_playful": -0.1, "humble_confident": 0.15},
        # Data-driven/Analytical posts (2-3)
        "data_1": {"formal_casual": 0.1, "technical_simple": 0.25, "serious_playful": 0.15, "humble_confident": 0.1},
        "data_2": {"formal_casual": 0.15, "technical_simple": 0.2, "serious_playful": 0.1, "humble_confident": 0.05},
        "data_3": {"formal_casual": 0.05, "technical_simple": 0.15, "serious_playful": 0.2, "humble_confident": 0.15},
        # Inspirational/Motivational posts (2-3)
        "inspire_1": {"formal_casual": -0.05, "technical_simple": -0.1, "serious_playful": -0.1, "humble_confident": 0.2},
        "inspire_2": {"formal_casual": 0.0, "technical_simple": -0.15, "serious_playful": -0.05, "humble_confident": 0.25},
        "inspire_3": {"formal_casual": 0.05, "technical_simple": -0.05, "serious_playful": 0.0, "humble_confident": 0.15},
        # Humorous/Playful posts (2-3)
        "humor_1": {"formal_casual": -0.2, "technical_simple": -0.1, "serious_playful": -0.25, "humble_confident": -0.1},
        "humor_2": {"formal_casual": -0.25, "technical_simple": -0.05, "serious_playful": -0.2, "humble_confident": 0.0},
    }

    async def save_step_data(
        self,
        profile_id: UUID,
        step_name: str,
        professional_data: Optional[ProfessionalStepData] = None,
        interests_data: Optional[InterestsStepData] = None,
        voice_data: Optional[VoiceStepData] = None,
    ) -> Dict[str, Any]:
        """Save configuration data for a specific onboarding step."""
        graph = await self.get_or_create_identity_graph(profile_id)
        
        # Get or create style profile
        stmt = select(StyleProfile).where(StyleProfile.profile_id == profile_id)
        result = await self.db.execute(stmt)
        style_profile = result.scalar_one_or_none()
        
        if not style_profile:
            style_profile = StyleProfile(profile_id=profile_id)
            self.db.add(style_profile)
        
        # Update onboarding context
        ctx = dict(graph.onboarding_context) if graph.onboarding_context else {}
        extracted_data = dict(ctx.get("extracted_data", {}))
        
        next_step = None
        message = None
        
        if step_name == "professional" and professional_data:
            # Save professional data directly to IdentityGraph
            graph.current_role = professional_data.current_role
            graph.industry = professional_data.industry
            
            if professional_data.years_experience:
                graph.career_stage = professional_data.years_experience
            
            if professional_data.expertise_areas:
                graph.expertise_areas = professional_data.expertise_areas
            
            if professional_data.career_highlight:
                current_highlights = graph.career_highlights or []
                if professional_data.career_highlight not in current_highlights:
                    current_highlights.append(professional_data.career_highlight)
                graph.career_highlights = current_highlights
            
            # Also update extracted_data for completeness tracking
            extracted_data["current_role"] = professional_data.current_role
            extracted_data["industry"] = professional_data.industry
            extracted_data["career_stage"] = professional_data.years_experience
            extracted_data["expertise_areas"] = professional_data.expertise_areas
            
            ctx["professional_completed"] = True
            next_step = "interests"
            message = "Professional background saved successfully"
            
        elif step_name == "interests" and interests_data:
            # Save interests data to IdentityGraph
            if interests_data.interests:
                graph.interests = interests_data.interests
                extracted_data["interests"] = interests_data.interests
            
            if interests_data.aspirations:
                graph.aspirations = interests_data.aspirations
                extracted_data["aspirations"] = interests_data.aspirations
            
            if interests_data.topics_of_interest:
                # Add to themes/content_pillars
                current_themes = graph.themes or []
                for topic in interests_data.topics_of_interest:
                    if topic not in current_themes:
                        current_themes.append(topic)
                graph.themes = current_themes
                extracted_data["themes"] = current_themes
            
            ctx["interests_completed"] = True
            next_step = "voice"
            message = "Interests and aspirations saved successfully"
            
        elif step_name == "voice" and voice_data:
            # Calculate tone sliders from selected posts
            tone_sliders = {
                "formal_casual": 0.5,
                "technical_simple": 0.5,
                "serious_playful": 0.5,
                "humble_confident": 0.5,
            }
            
            preferred_hooks = []
            
            if voice_data.selected_post_ids:
                # Aggregate adjustments from selected posts
                for post_id in voice_data.selected_post_ids:
                    if post_id in self.VOICE_POST_STYLES:
                        adjustments = self.VOICE_POST_STYLES[post_id]
                        for key, adjustment in adjustments.items():
                            tone_sliders[key] += adjustment
                        
                        # Track preferred hook styles
                        if post_id.startswith("formal"):
                            if "professional" not in preferred_hooks:
                                preferred_hooks.append("professional")
                        elif post_id.startswith("casual"):
                            if "conversational" not in preferred_hooks:
                                preferred_hooks.append("conversational")
                        elif post_id.startswith("story"):
                            if "storytelling" not in preferred_hooks:
                                preferred_hooks.append("storytelling")
                        elif post_id.startswith("data"):
                            if "data-driven" not in preferred_hooks:
                                preferred_hooks.append("data-driven")
                        elif post_id.startswith("inspire"):
                            if "inspirational" not in preferred_hooks:
                                preferred_hooks.append("inspirational")
                        elif post_id.startswith("humor"):
                            if "humorous" not in preferred_hooks:
                                preferred_hooks.append("humorous")
                
                # Clamp values to 0-1 range
                for key in tone_sliders:
                    tone_sliders[key] = max(0.0, min(1.0, tone_sliders[key]))
            
            # Save to StyleProfile
            style_profile.tone_sliders = tone_sliders
            style_profile.preferred_hooks = preferred_hooks
            
            # Also update tone_markers in IdentityGraph for compatibility
            graph.tone_markers = {
                "professional": 1.0 - tone_sliders["formal_casual"] + 0.5,
                "casual": tone_sliders["formal_casual"] + 0.5,
                "technical": tone_sliders["technical_simple"],
                "storytelling": 1.0 - tone_sliders["serious_playful"],
            }
            
            ctx["voice_completed"] = True
            next_step = "completion"
            message = "Voice preferences saved successfully"
        
        # Update context
        ctx["extracted_data"] = extracted_data
        graph.onboarding_context = ctx
        
        # Recalculate completeness score
        graph.completeness_score = self._calculate_completeness_score(graph)
        
        self.db.add(graph)
        self.db.add(style_profile)
        await self.db.commit()
        
        return {
            "success": True,
            "next_step": next_step,
            "message": message,
        }
