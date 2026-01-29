"""Onboarding request and response schemas."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class OnboardingStartRequest(BaseModel):
    """Request to start onboarding."""

    method: str = "chat"


class OnboardingStartResponse(BaseModel):
    """Response from starting onboarding."""

    message: str
    step: Optional[str] = None
    complete: bool = False


class OnboardingMessageRequest(BaseModel):
    """Request to send a message during onboarding."""

    message: str


class OnboardingMessageResponse(BaseModel):
    """Response from sending a message."""

    message: str
    complete: bool
    ui_hint: Optional[str] = None  # "show_upload", "show_linkedin_helper", "show_confirmation"


class OnboardingExtractRequest(BaseModel):
    """Request to extract data from external source."""

    source_type: str
    input_value: str


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
