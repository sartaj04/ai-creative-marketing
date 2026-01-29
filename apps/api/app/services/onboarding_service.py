"""Onboarding service for identity graph creation."""
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import ExtractedDocument
from app.models.identity import IdentityGraph
from app.models.profile import Profile
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
        stmt = select(IdentityGraph).where(IdentityGraph.profile_id == profile_id)
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

        context = graph.onboarding_context or {}

        # Determine extracted sources
        extracted_sources = []
        if context.get("linkedin_extracted"):
            extracted_sources.append("linkedin")
        if context.get("resume_extracted"):
            extracted_sources.append("resume")

        return {
            "is_complete": context.get("step") == "COMPLETE",
            "step": context.get("step"),
            "completeness_score": graph.completeness_score,
            "has_extraction": context.get("has_extraction", False),
            "extracted_sources": extracted_sources,
        }

    async def start_onboarding(self, profile_id: UUID, method: str) -> Dict[str, Any]:
        """Initialize onboarding and return first message."""
        graph = await self.get_or_create_identity_graph(profile_id)

        # Get profile name for personalization
        stmt = select(Profile).where(Profile.id == profile_id)
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()
        user_name = profile.name if profile else "there"

        context = graph.onboarding_context or {}

        if context.get("step") == "COMPLETE":
            return {"message": "You're already set up! Redirecting...", "complete": True}

        # If already started, return last assistant message
        if context.get("step") != "INIT":
            history = context.get("history", [])
            if history:
                last_msg = history[-1]
                if last_msg.get("role") == "assistant":
                    return {"message": last_msg["content"], "step": context.get("step")}

        # Initial conversational message offering all options
        initial_msg = f"""Hey {user_name} — I'm Pixo. I'll help set up your brand profile so I can generate content in your voice and based on your real experience.

What's the easiest way for you to share your background?

You can:
• Upload your LinkedIn profile PDF (go to your LinkedIn profile → click "Resources" → select "Download PDF") or paste your profile text
• Or just answer a few quick questions here"""

        # Update context
        context["step"] = "PROFESSIONAL_FOUNDATION"
        context["history"] = [{"role": "assistant", "content": initial_msg}]

        graph.onboarding_context = dict(context)
        self.db.add(graph)
        await self.db.commit()

        return {"message": initial_msg, "step": "PROFESSIONAL_FOUNDATION"}

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

    def _build_linkedin_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Build summary of LinkedIn extraction for UI display."""
        fields_extracted = [k for k in data.keys() if data.get(k)]

        # Build name from firstName + lastName
        name_parts = []
        if data.get("firstName"):
            name_parts.append(data["firstName"])
        if data.get("lastName"):
            name_parts.append(data["lastName"])
        name = " ".join(name_parts) if name_parts else None

        return {
            "source": "linkedin",
            "fields_extracted": fields_extracted,
            "highlights": {
                "name": name,
                "headline": data.get("headline"),
                "current_company": data.get("companyName"),
                "location": data.get("locationName"),
                "connections": data.get("connectionsCount"),
                "skills_count": len(data.get("skills", [])) if data.get("skills") else 0,
                "experience_count": len(data.get("experience", [])) if data.get("experience") else 0,
            },
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

    def _detect_user_intent(self, message: str) -> Optional[str]:
        """Detect user intent from message for UI hints."""
        lower_msg = message.lower()
        
        # Check for upload intent
        upload_keywords = ["upload", "linkedin", "profile", "pdf", "document", "file", "attach"]
        if any(kw in lower_msg for kw in upload_keywords):
            return "show_upload"
        
        # Check for LinkedIn intent
        linkedin_keywords = ["linkedin", "linked in", "profile"]
        if any(kw in lower_msg for kw in linkedin_keywords):
            return "show_linkedin_helper"
        
        return None

    async def handle_message(self, profile_id: UUID, message: str) -> Dict[str, Any]:
        """Process user message and generate next response."""
        graph = await self.get_or_create_identity_graph(profile_id)
        context = dict(graph.onboarding_context) if graph.onboarding_context else {}

        # Detect user intent for UI hints
        ui_hint = self._detect_user_intent(message)

        history = list(context.get("history", []))
        history.append({"role": "user", "content": message})

        try:
            # Analyze answer using Gemini
            # Note: beliefs, interests, aspirations should ONLY come from direct questions, not from extraction
            analysis_prompt = f"""
            Analyze this user response in the context of personal branding onboarding.
            User Input: "{message}"
            Current Known Data: {context.get("extracted_data")}

            Extract any relevant information for these PROFESSIONAL fields only:
            - current_role
            - industry
            - expertise_areas (list)
            - goals (professional goals only)
            - target_audience
            - unique_angles (list)
            - career_highlights (list)

            IMPORTANT: Do NOT extract beliefs, interests, or aspirations from this message unless the user explicitly mentions them in response to a direct question about those topics.

            Return JSON with 'extracted_info' (dict with the above fields if found).
            """
            analysis = await self.llm.generate_json(analysis_prompt)

            # Safe update of extracted_data
            extracted = dict(context.get("extracted_data", {}))
            extracted_info = analysis.get("extracted_info", {})
            if isinstance(extracted_info, dict):
                for key, value in extracted_info.items():
                    if value:  # Only update if value is non-empty
                        if isinstance(value, list) and key in extracted:
                            # Merge lists
                            existing = extracted.get(key, [])
                            if isinstance(existing, list):
                                extracted[key] = existing + value
                            else:
                                extracted[key] = value
                        else:
                            extracted[key] = value
            context["extracted_data"] = extracted

            # Determine next question
            has_extraction = context.get("has_extraction", False) or context.get("resume_extracted", False) or context.get("linkedin_extracted", False)
            extracted_data = context.get("extracted_data", {})
            
            # After extraction, ALWAYS ask about beliefs, interests, aspirations via questions
            # These should NEVER be extracted from LinkedIn profile - only from direct questions
            if has_extraction:
                # Check what personal fields we still need to ask about
                needs_beliefs = not extracted_data.get("beliefs") or len(extracted_data.get("beliefs", [])) < 2
                needs_interests = not extracted_data.get("interests") or len(extracted_data.get("interests", [])) < 2
                needs_aspirations = not extracted_data.get("aspirations")
                
                # Prioritize asking about personal aspects first
                if needs_beliefs:
                    focus_instruction = "Ask about their beliefs and principles. Example: 'What beliefs or principles guide your work and decisions?'"
                elif needs_interests:
                    focus_instruction = "Ask about their interests and hobbies. Example: 'What interests or hobbies energize you outside of work?'"
                elif needs_aspirations:
                    focus_instruction = "Ask about their aspirations. Example: 'What are you most excited about achieving in the next few years?'"
                else:
                    # All personal fields collected, can ask about professional details if missing
                    focus_instruction = "Ask about any missing professional details like goals, target audience, or unique angles."
            else:
                # No extraction yet - focus on professional foundation first
                focus_instruction = "Focus on professional foundation: role, industry, goals, target audience, expertise areas."
            
            next_step_prompt = f"""
            We are onboarding a user for a personal branding AI.
            Conversation History: {history[-5:]}
            Collected Data: {context.get("extracted_data")}
            Question Count: {context.get("question_count", 0)}
            Has Extraction: {has_extraction}

            Determine the next best question to ask to complete their profile.
            
            {focus_instruction}
            
            {"CRITICAL: We have their professional background from LinkedIn. Now we MUST ask direct questions about beliefs, interests, and aspirations. These cannot be inferred from a LinkedIn profile - they must come from conversation." if has_extraction else ""}
            
            Ask natural, conversational questions. Examples:
            - "What beliefs or principles guide your work?"
            - "What interests or hobbies energize you outside of work?"
            - "What are you most excited about achieving in the next few years?"
            - "What topics do you find yourself thinking about most?"

            Avoid sensitive topics: age, religion, politics, income, relationships.

            Completion criteria: We need Role, Industry, Goals, Audience, at least 2 Expertise Areas, at least 2 Beliefs (from questions), at least 2 Interests (from questions), and Aspirations (from questions). If we have all of these OR we have asked > 15 questions, mark as complete.

            Return JSON:
            {{
                "next_question": "The actual text to say to the user",
                "is_complete": boolean
            }}
            """

            decision = await self.llm.generate_json(next_step_prompt)

            response_text = decision.get("next_question", "Tell me more about your professional goals.")
            is_complete = decision.get("is_complete", False)

            history.append({"role": "assistant", "content": response_text})

            context["history"] = history
            context["question_count"] = context.get("question_count", 0) + 1

            graph.onboarding_context = context
            self.db.add(graph)
            await self.db.commit()

            if is_complete or context["question_count"] > 15:
                return {
                    "message": "Perfect! I have everything I need to start building your brand strategy.",
                    "complete": True,
                    "ui_hint": "show_confirmation",
                }

            return {"message": response_text, "complete": False, "ui_hint": ui_hint}

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error in conversation: {e}")
            return {
                "message": "I'm having trouble processing that. Could you try rephrasing?",
                "complete": False,
                "ui_hint": ui_hint,
            }
        except Exception as e:
            logger.error(f"Error in conversation: {e}", exc_info=True)
            question_count = context.get("question_count", 0)
            if question_count < 3:
                return {
                    "message": "I had a small hiccup. Let's continue - what's your main professional focus?",
                    "complete": False,
                    "ui_hint": ui_hint,
                }
            else:
                return {
                    "message": "I missed that. Could you tell me more about your goals?",
                    "complete": False,
                    "ui_hint": ui_hint,
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
