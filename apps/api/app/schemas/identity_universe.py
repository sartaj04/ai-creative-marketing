"""Identity Universe schemas - unified response for complete identity visualization."""
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PersonaData(BaseModel):
    """Persona prompt and learned preferences from Profile."""
    
    persona_prompt: Optional[str] = None
    persona_prompt_updated_at: Optional[datetime] = None
    learned_preferences: Optional[str] = None
    learned_preferences_updated_at: Optional[datetime] = None


class IdentityUniverseResponse(BaseModel):
    """Combined response with IdentityGraph + StyleProfile + Persona for visualization."""
    
    # Identity Graph (core identity data)
    identity_graph: dict[str, Any]
    
    # Style Profile (tone and preferences)
    style_profile: Optional[dict[str, Any]] = None
    
    # Persona (synthesized prompt)
    persona: PersonaData
    
    # Profile metadata
    profile_id: UUID
    profile_name: str
    location: list[str] = []
    completeness_score: int = 0


class RegenerationField(BaseModel):
    """A single field change in regeneration preview."""
    
    field_name: str
    current_value: Any
    proposed_value: Any
    field_category: str  # "identity", "style", "persona"


class RegenerationPreview(BaseModel):
    """Preview of identity regeneration with diff."""
    
    profile_id: UUID
    changes: list[RegenerationField] = Field(default_factory=list)
    new_persona_prompt: Optional[str] = None
    regeneration_scope: str  # "full", "partial"
    

class RegenerationRequest(BaseModel):
    """Request to regenerate identity (full or partial)."""
    
    scope: str = "full"  # "full" or "partial"
    fields_to_regenerate: Optional[list[str]] = None  # If partial, which fields


class RegenerationAccept(BaseModel):
    """Accept regeneration changes (all or selective)."""
    
    accept_all: bool = False
    accepted_fields: Optional[list[str]] = None  # If not accept_all, list fields to accept
