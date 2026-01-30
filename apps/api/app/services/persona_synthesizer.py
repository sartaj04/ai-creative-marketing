"""Persona synthesizer service - generates cached persona prompts from identity+style."""
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.llm.gemini import GeminiProvider
from app.models.identity import IdentityGraph, StyleProfile
from app.models.profile import Profile
from app.models.draft import Draft, DraftEvent, DraftAction

logger = logging.getLogger(__name__)


# Prompt template for persona synthesis
PERSONA_SYNTHESIS_PROMPT = """You are a persona synthesizer. Your task is to create a natural language "persona prompt" that captures who a person is and how they communicate, based on their identity and style data.

This persona prompt will be used by AI agents to generate content in the person's authentic voice.

=== IDENTITY DATA ===
Current Role: {current_role}
Industry: {industry}
Expertise Areas: {expertise_areas}
Career Highlights: {career_highlights}
Target Audience: {target_audience}
Unique Angles: {unique_angles}
Content Pillars: {content_pillars}
Themes: {themes}
Authority Angles: {authority_angles}
Bio Summary: {bio_summary}
Interests: {interests}
Beliefs: {beliefs}

=== STYLE DATA ===
Tone Preferences:
- Formal/Casual (0=formal, 1=casual): {formal_casual}
- Technical/Simple (0=simple, 1=technical): {technical_simple}
- Serious/Playful (0=serious, 1=playful): {serious_playful}
- Humble/Confident (0=humble, 1=confident): {humble_confident}

Preferred Hook Styles: {preferred_hooks}
Topics to Avoid: {taboo_list}

=== LEARNED PREFERENCES ===
{learned_preferences}

=== INSTRUCTIONS ===
Create a persona prompt (300-500 words) that:
1. Describes who this person is professionally (role, expertise, positioning)
2. Captures their communication style and tone preferences in natural language
3. Notes topics, approaches, or language to avoid
4. Provides clear guidance for writing in their authentic voice
5. Mentions their target audience and how to speak to them
6. Incorporates any learned preferences from their feedback history

Write it as instructions to an AI, starting with "You are writing as [name/role]..."

Output ONLY the persona prompt text, no JSON or additional formatting."""


# Prompt template for feedback learning
FEEDBACK_LEARNING_PROMPT = """You are analyzing a user's content preferences based on their feedback history.

=== CURRENT PREFERENCE SUMMARY ===
{current_preferences}

=== RECENT INTERACTIONS ===
APPROVED/LIKED (user wants more of this):
{approved_list}

REJECTED/DISLIKED (user wants less of this):
{rejected_list}

=== INSTRUCTIONS ===
Update the preference summary to incorporate these new signals. Focus on:
1. Topics/themes they consistently like or dislike
2. Content formats they prefer (posts, threads, etc.)
3. Hook styles that resonate vs. fall flat
4. Tone patterns they gravitate toward

Keep the summary CONCISE (under 400 words). Be specific about patterns.
If there are no strong patterns yet, note that more data is needed.

Output ONLY the updated preference summary, no JSON or additional formatting."""


class PersonaSynthesizerService:
    """Service for synthesizing persona prompts from identity and style data."""

    def __init__(self):
        """Initialize the service with LLM provider."""
        self.llm = GeminiProvider()

    async def learn_from_feedback(
        self,
        db: AsyncSession,
        profile_id: UUID,
    ) -> str | None:
        """
        Analyze recent feedback to learn user preferences using hybrid approach.
        
        Hybrid approach:
        - Uses existing learned_preferences summary (long-term memory)
        - Plus last 20 raw interactions (recent context)
        - Generates updated preference summary with Gemini
        
        Args:
            db: Database session
            profile_id: UUID of the profile
            
        Returns:
            Updated learned_preferences string, or None if not enough data
        """
        # Load profile
        result = await db.execute(
            select(Profile).where(Profile.id == profile_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            logger.error(f"Profile not found: {profile_id}")
            return None
        
        # Get last 20 draft events (approved or rejected)
        events_result = await db.execute(
            select(DraftEvent, Draft)
            .join(Draft, DraftEvent.draft_id == Draft.id)
            .where(
                and_(
                    Draft.profile_id == profile_id,
                    DraftEvent.action.in_([DraftAction.APPROVE, DraftAction.REJECT])
                )
            )
            .order_by(DraftEvent.created_at.desc())
            .limit(20)
        )
        interactions = events_result.all()
        
        if len(interactions) < 3:
            logger.info(f"Not enough feedback data for profile {profile_id} ({len(interactions)} interactions)")
            return None
        
        # Separate approved and rejected
        approved_list = []
        rejected_list = []
        
        for event, draft in interactions:
            summary = f"- Topic: {draft.topic or 'General'} | Format: {draft.format.value} | Hook: {draft.hook[:100]}..."
            if event.action == DraftAction.APPROVE:
                approved_list.append(summary)
            else:
                rejected_list.append(summary)
        
        # Current preferences (long-term memory)
        current_preferences = profile.learned_preferences or "No preferences learned yet."
        
        # Build prompt
        prompt = FEEDBACK_LEARNING_PROMPT.format(
            current_preferences=current_preferences,
            approved_list="\n".join(approved_list) if approved_list else "None",
            rejected_list="\n".join(rejected_list) if rejected_list else "None",
        )
        
        try:
            logger.info(f"Learning preferences for profile {profile_id} from {len(interactions)} interactions")
            
            response = await self.llm.generate(
                prompt=prompt,
                system_prompt="You are an expert at understanding content preferences and patterns.",
                temperature=0.5,
                max_tokens=800,
            )
            
            new_preferences = response.strip()
            
            if not new_preferences:
                logger.error(f"Empty preferences generated for profile {profile_id}")
                return None
            
            # Update profile
            profile.learned_preferences = new_preferences
            profile.learned_preferences_updated_at = datetime.now(timezone.utc)
            profile.feedback_count_since_last_learn = 0
            
            await db.commit()
            await db.refresh(profile)
            
            logger.info(f"Updated learned preferences for profile {profile_id}")
            
            # Also regenerate persona prompt to incorporate new learnings
            await self.synthesize_persona_prompt(db, profile_id)
            
            return new_preferences
            
        except Exception as e:
            logger.error(f"Failed to learn preferences for profile {profile_id}: {e}", exc_info=True)
            return None

    async def synthesize_persona_prompt(
        self,
        db: AsyncSession,
        profile_id: UUID,
    ) -> str | None:
        """
        Generate a natural language persona prompt from identity graph and style profile.
        Updates the profile's persona_prompt field.

        Args:
            db: Database session
            profile_id: UUID of the profile to synthesize persona for

        Returns:
            The synthesized persona prompt string, or None if synthesis failed
        """
        # Load profile with identity and style
        result = await db.execute(
            select(Profile)
            .options(
                selectinload(Profile.identity_graph),
                selectinload(Profile.style_profile),
            )
            .where(Profile.id == profile_id)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            logger.error(f"Profile not found: {profile_id}")
            return None

        identity = profile.identity_graph
        style = profile.style_profile

        if not identity:
            logger.warning(f"Profile {profile_id} has no identity graph, skipping persona synthesis")
            return None

        # Prepare identity data with safe defaults
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

        # Prepare style data with safe defaults
        tone_sliders = style.tone_sliders if style else {}
        style_data = {
            "formal_casual": tone_sliders.get("formal_casual", 0.5),
            "technical_simple": tone_sliders.get("technical_simple", 0.5),
            "serious_playful": tone_sliders.get("serious_playful", 0.5),
            "humble_confident": tone_sliders.get("humble_confident", 0.5),
            "preferred_hooks": ", ".join(style.preferred_hooks if style else []) or "Not specified",
            "taboo_list": ", ".join(style.taboo_list if style else []) or "None specified",
        }
        
        # Include learned preferences
        learned_preferences = profile.learned_preferences or "No preferences learned yet from feedback."

        # Format the prompt
        prompt = PERSONA_SYNTHESIS_PROMPT.format(
            **identity_data, 
            **style_data,
            learned_preferences=learned_preferences,
        )

        try:
            # Generate persona prompt using LLM
            logger.info(f"Synthesizing persona prompt for profile {profile_id}")
            
            response = await self.llm.generate(
                prompt=prompt,
                system_prompt="You are an expert at understanding personal brands and communication styles. Create a clear, actionable persona prompt.",
                temperature=0.7,
                max_tokens=1500,
            )

            persona_prompt = response.strip()

            if not persona_prompt:
                logger.error(f"Empty persona prompt generated for profile {profile_id}")
                return None

            # Update profile with synthesized persona prompt
            profile.persona_prompt = persona_prompt
            profile.persona_prompt_updated_at = datetime.now(timezone.utc)

            await db.commit()
            await db.refresh(profile)

            logger.info(f"Successfully synthesized persona prompt for profile {profile_id} ({len(persona_prompt)} chars)")
            return persona_prompt

        except Exception as e:
            logger.error(f"Failed to synthesize persona prompt for profile {profile_id}: {e}", exc_info=True)
            return None

    def get_tone_description(self, sliders: dict) -> str:
        """Convert tone sliders to natural language description."""
        descriptions = []

        fc = sliders.get("formal_casual", 0.5)
        if fc < 0.3:
            descriptions.append("formal and professional")
        elif fc > 0.7:
            descriptions.append("casual and conversational")

        ts = sliders.get("technical_simple", 0.5)
        if ts > 0.7:
            descriptions.append("technical and detailed")
        elif ts < 0.3:
            descriptions.append("simple and accessible")

        sp = sliders.get("serious_playful", 0.5)
        if sp > 0.7:
            descriptions.append("engaging and playful")
        elif sp < 0.3:
            descriptions.append("serious and authoritative")

        hc = sliders.get("humble_confident", 0.5)
        if hc > 0.7:
            descriptions.append("confident and bold")
        elif hc < 0.3:
            descriptions.append("humble and relatable")

        return ", ".join(descriptions) if descriptions else "balanced and professional"

