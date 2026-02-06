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
PERSONA_SYNTHESIS_PROMPT = """You are a persona synthesizer. Your task is to create a natural language "persona prompt" that captures who a person is and how they communicate, based on their full identity and style profile.

This persona prompt will be used by AI agents to generate content in the person's authentic voice.

=== IDENTITY UNIVERSE (Full Graph) ===
{identity_json}

=== PREFERENCES & STYLE ===
{style_json}

=== PROFILE METADATA ===
{profile_json}

=== WRITING STYLE ANALYSIS (from actual posts) ===
{writing_sample_insights}

=== INSTRUCTIONS ===
Analyze the FULL data provided above (Identity, Style, Profile) to understand every nuance.

Create a **structured system prompt** that acts as the "Ghostwriter's Bible" for this person.
It MUST be organized into these specific sections:

## 1. WHO YOU ARE (The Professional)
- Synthesize specific role, expertise, and authority markers.
- Contextualize their location/region.

## 2. YOUR VOICE & STYLE (The Writer)
- Define the exact tone (e.g., "Casual but confident", "Academic but accessible").
- vocabulary quirks, sentence structure preferences.
- **IMPORTANT**: Analyze `writing_sample_insights` to mimic their actual cadence.

## 3. PERSONALITY & WORLDVIEW (The Human)
- **CRITICAL**: You MUST incorporate their `interests` (hobbies) and `beliefs`.
- Explain how to use these as sources for metaphors or storytelling (e.g., "Use hiking analogies," "Reference sci-fi concepts").
- Don't just list them; explain how they flavor the content.

## 4. AUDIENCE & STRATEGY
- Who are they talking to?
- Topics to avoid (taboos) and preferred hook styles.

## 5. CAREER ARC & CONTENT FOCUS
- If timeline_events exist, use the narrative_arc to understand their career journey as a story.
- Reference specific career moments (roles, transitions, education) from timeline_events.
- Note key transitions and growth patterns from emotional_core fields.
- If primary_focus exists, it tells you what they WANT to write about — respect this and weave it in.

### Guidelines:
- Keep it DENSE and ACTIONABLE. Avoid generic fluff.
- Total length should be efficient (350-450 words) but comprehensive.
- Start with: "You are writing as [name]..."

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
        # Load profile with identity, style, and timeline
        from app.models.identity import IdentityGraph as IG, Timeline as TL
        result = await db.execute(
            select(Profile)
            .options(
                selectinload(Profile.identity_graph)
                    .selectinload(IG.timeline)
                    .selectinload(TL.events),
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

        # Serialize full objects to JSON
        import json
        
        def to_dict(obj):
            """Helper to convert allowlisted SQLAlchemy model attrs to dict."""
            if not obj: return {}
            data = {}
            for col in obj.__table__.columns:
                val = getattr(obj, col.name)
                # Handle basic serialization (UUID, datetime)
                if isinstance(val, UUID):
                    val = str(val)
                elif isinstance(val, datetime):
                    val = val.isoformat()
                data[col.name] = val
            return data

        identity_data = to_dict(identity)
        # Include Timeline data if available
        if hasattr(identity, "timeline") and identity.timeline:
            tl = identity.timeline
            identity_data["narrative_arc"] = tl.narrative_arc
            identity_data["primary_focus"] = tl.primary_focus
            identity_data["timeline_events"] = [
                {
                    "title": e.title,
                    "description": e.description,
                    "event_type": e.event_type.value if e.event_type else None,
                    "start_date": e.start_date.isoformat() if e.start_date else None,
                    "end_date": e.end_date.isoformat() if e.end_date else None,
                    "is_current": e.is_current,
                    "emotional_core": e.emotional_core,
                    "lessons_learned": e.lessons_learned or [],
                    "tags": e.tags or [],
                }
                for e in (tl.events or [])
            ]
        identity_json = json.dumps(identity_data, indent=2, default=str)
        style_json = json.dumps(to_dict(style), indent=2, default=str)
        profile_json = json.dumps({
            "name": profile.name,
            "description": profile.description,
            "location": profile.location,
            "learned_preferences": profile.learned_preferences
        }, indent=2, default=str)

        # Include writing sample insights if available
        writing_sample_insights = "No writing samples analyzed yet."
        if style and style.writing_sample_insights:
            from app.services.writing_sample_analyzer import WritingSampleAnalyzer
            
            analyzer = WritingSampleAnalyzer()
            # Check if detected_patterns exists for structured formatting
            if style.detected_patterns:
                writing_sample_insights = analyzer.format_insights_for_persona(style.detected_patterns)
            else:
                # Use the text summary directly
                writing_sample_insights = style.writing_sample_insights

        # Format the prompt
        prompt = PERSONA_SYNTHESIS_PROMPT.format(
            identity_json=identity_json,
            style_json=style_json,
            profile_json=profile_json,
            writing_sample_insights=writing_sample_insights,
        )

        try:
            # Generate persona prompt using LLM
            logger.info(f"Synthesizing persona prompt for profile {profile_id}")
            
            response = await self.llm.generate(
                prompt=prompt,
                system_prompt="You are an expert at understanding personal brands and communication styles. Create a clear, actionable persona prompt.",
                temperature=0.7,
                max_tokens=4000,
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

