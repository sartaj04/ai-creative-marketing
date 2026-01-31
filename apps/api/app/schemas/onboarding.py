"""Onboarding request and response schemas."""
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class ExtractionSummary(BaseModel):
    """Summary of extracted data for UI display."""

    source: str
    fields_extracted: List[str]
    highlights: Dict[str, Any]


class OnboardingExtractResponse(BaseModel):
    """Response from extraction."""

    success: bool
    summary: str
    data: Optional[Dict[str, Any]] = None
    extraction_summary: Optional[ExtractionSummary] = None
    error: Optional[str] = None


class OnboardingCompleteResponse(BaseModel):
    """Response from completing onboarding."""

    success: bool
    redirect_url: str


class OnboardingStatusResponse(BaseModel):
    """Response for onboarding status check (read-only)."""

    is_complete: bool
    step: Optional[str] = None
    completeness_score: int = 0
    has_extraction: bool = False
    extracted_sources: List[str] = []


# Step-specific data schemas
class ProfessionalStepData(BaseModel):
    """Data from professional background step."""

    current_role: str
    industry: str
    years_experience: Optional[str] = None
    expertise_areas: List[str] = []
    career_highlight: Optional[str] = None


class InterestsStepData(BaseModel):
    """Data from interests/personality step."""

    interests: List[str] = []
    aspirations: Optional[str] = None
    topics_of_interest: List[str] = []


class VoiceStepData(BaseModel):
    """Data from voice selection step."""

    selected_post_ids: List[str] = []


class OnboardingStepSaveRequest(BaseModel):
    """Request to save onboarding step data."""

    step_name: str  # "professional", "interests", "voice"
    professional_data: Optional[ProfessionalStepData] = None
    interests_data: Optional[InterestsStepData] = None
    voice_data: Optional[VoiceStepData] = None


class OnboardingStepSaveResponse(BaseModel):
    """Response from saving step data."""

    success: bool
    next_step: Optional[str] = None
    message: Optional[str] = None


# ============================================================================
# Conversational Onboarding Schemas
# ============================================================================


class ChatMessage(BaseModel):
    """A single message in the conversation."""

    role: Literal["user", "assistant"]
    content: str


class ConversationalExtractedData(BaseModel):
    """Structured data extracted from the conversation."""

    # Professional
    current_role: str = ""
    industry: str = ""
    years_experience: str = ""
    expertise_areas: List[str] = Field(default_factory=list)
    career_highlight: str = ""

    # Interests
    interests: List[str] = Field(default_factory=list)
    topics_of_interest: List[str] = Field(default_factory=list)
    aspirations: str = ""

    # Tone sliders (0.0-1.0, None if not yet discussed)
    tone_formal_casual: Optional[float] = None
    tone_technical_simple: Optional[float] = None
    tone_serious_playful: Optional[float] = None
    tone_humble_confident: Optional[float] = None

    # Summary
    bio_summary: str = ""


class OnboardingChatRequest(BaseModel):
    """Request for conversational onboarding."""

    message: str
    conversation_history: List[ChatMessage] = Field(default_factory=list)


class OnboardingChatResponse(BaseModel):
    """Response from conversational onboarding."""

    response: str  # Pixo's reply
    extracted_data: ConversationalExtractedData  # Structured data from conversation
    is_complete: bool  # Has enough info to complete onboarding
    conversation_history: List[ChatMessage]  # Updated conversation history
