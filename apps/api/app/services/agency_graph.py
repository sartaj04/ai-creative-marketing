"""LangGraph workflow for the Content Agency multi-agent system.

This module implements the agency workflow as a state machine:
Scout → Strategist → Writer → Editor → QA → (Approve/Regenerate)

Each node is an agent with a specialized role in content creation.
Diversity is enforced through content_mode, authority_posture, emotional_tone,
identity facet sampling, and topic_domain tracking.
"""

import json
import logging
import random
from typing import Any, Optional
from uuid import UUID

from google.oauth2 import service_account
from langchain_aws import ChatBedrockConverse
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph, START
from typing_extensions import TypedDict

from app.core.config import settings
from app.services.agency_prompts import (
    SCOUT_AGENT_SYSTEM,
    SCOUT_AGENT_PROMPT,
    STRATEGIST_AGENT_SYSTEM,
    STRATEGIST_AGENT_PROMPT,
    WRITER_AGENT_SYSTEM,
    WRITER_AGENT_PROMPT,
    EDITOR_AGENT_SYSTEM,
    EDITOR_AGENT_PROMPT,
    QA_AGENT_SYSTEM,
    QA_AGENT_PROMPT,
    FORMAT_ARCHETYPES,
    HOOK_STYLES,
    CTA_STYLES,
    CONTENT_MODES,
    AUTHORITY_POSTURES,
    EMOTIONAL_TONES,
    sample_identity_facets,
    calculate_identity_depth,
    compute_authority_constraints,
)

logger = logging.getLogger(__name__)


# Maximum regeneration attempts before giving up
MAX_REGENERATIONS = 2


# ============================================================================
# State Definition
# ============================================================================

class AgencyState(TypedDict):
    """State passed between agents in the Content Agency workflow."""

    # Input context
    profile_id: str
    persona_prompt: str
    learned_preferences: str
    existing_topics: list[str]
    taboo_list: list[str]
    tone_sliders: dict
    preferred_hooks: list[str]
    location: Optional[list[str]]  # Target markets/locations
    writing_sample_insights: Optional[str]  # Derived from previous posts
    template: Optional[str]
    template_meta: Optional[dict]  # Template metadata (flexibility, min/max length)
    platform_intent: str  # Platform target: linkedin, x, ig, newsletter, generic
    trending_signals: Optional[str]  # External trending topics/news for topic discovery

    # Identity sampling
    identity_facets: Optional[dict]  # Raw identity graph dict for sampling
    sampled_facets: Optional[dict]   # Result of sample_identity_facets()

    # Agent outputs
    opportunities: Optional[list[dict]]  # Scout output
    content_brief: Optional[dict]  # Strategist output
    length_decision: Optional[dict]  # Length Strategist output
    draft: Optional[dict]  # Writer output
    refined_draft: Optional[dict]  # Editor output
    qa_result: Optional[dict]  # QA output

    # Uniqueness tracking (for diversity enforcement)
    uniqueness_context: dict  # Tracks used hooks, formats, CTAs, modes, postures, tones, domains

    # Control flow
    regeneration_count: int
    current_draft_index: int  # Which draft we're on (0, 1, 2)
    completed_drafts: list[dict]  # Successfully completed drafts
    errors: list[str]


# ============================================================================
# Credential Helpers
# ============================================================================

def _get_gcp_credentials():
    """Build GCP credentials from settings."""
    if not settings.GCP_CLIENT_EMAIL or not settings.GCP_PRIVATE_KEY:
        return None

    credentials_info = {
        "type": "service_account",
        "project_id": settings.GCP_PROJECT_ID,
        "private_key": settings.GCP_PRIVATE_KEY.replace("\\n", "\n"),
        "client_email": settings.GCP_CLIENT_EMAIL,
        "token_uri": "https://oauth2.googleapis.com/token",
    }
    return service_account.Credentials.from_service_account_info(
        credentials_info,
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )


def _build_tone_description(
    tone_sliders: dict,
    content_mode: str | None = None,
    emotional_tone: str | None = None,
) -> str:
    """Build a human-readable tone description from slider values.

    Each slider is 0.0-1.0. Values near 0.5 are neutral and omitted.
    Only notable leanings (< 0.3 or > 0.7) are mentioned.

    When content_mode or emotional_tone are provided, sliders are nudged
    contextually. A learner writing vulnerably should sound more humble
    than their baseline; an advisor writing decisively should sound
    more confident. The user's baseline is respected -- we nudge, not override.
    """
    if not tone_sliders:
        tone_sliders = {}

    # Start from user's baseline
    adjusted = {
        "formal_casual": tone_sliders.get("formal_casual", 0.5),
        "technical_simple": tone_sliders.get("technical_simple", 0.5),
        "serious_playful": tone_sliders.get("serious_playful", 0.5),
        "humble_confident": tone_sliders.get("humble_confident", 0.5),
    }

    # Context-dependent adjustments (nudge, don't override)
    _MODE_ADJUSTMENTS = {
        "learner": {"humble_confident": -0.2, "formal_casual": +0.1},
        "narrator": {"serious_playful": +0.1, "formal_casual": +0.15},
        "skeptic": {"humble_confident": +0.1},
        "observer": {"humble_confident": -0.15, "formal_casual": +0.1},
        "builder": {"formal_casual": +0.1},
    }
    _TONE_ADJUSTMENTS = {
        "vulnerable": {"humble_confident": -0.2, "formal_casual": +0.1},
        "amused": {"serious_playful": +0.2},
        "frustrated": {"humble_confident": +0.1, "serious_playful": -0.1},
        "excited": {"serious_playful": +0.1, "humble_confident": +0.1},
        "contemplative": {"serious_playful": -0.1, "formal_casual": -0.1},
    }

    for key, delta in _MODE_ADJUSTMENTS.get(content_mode, {}).items():
        adjusted[key] = max(0.0, min(1.0, adjusted[key] + delta))
    for key, delta in _TONE_ADJUSTMENTS.get(emotional_tone, {}).items():
        adjusted[key] = max(0.0, min(1.0, adjusted[key] + delta))

    descriptors = []
    if adjusted["formal_casual"] < 0.3:
        descriptors.append("formal")
    elif adjusted["formal_casual"] > 0.7:
        descriptors.append("casual")

    if adjusted["technical_simple"] < 0.3:
        descriptors.append("technical")
    elif adjusted["technical_simple"] > 0.7:
        descriptors.append("simple/accessible")

    if adjusted["serious_playful"] < 0.3:
        descriptors.append("serious")
    elif adjusted["serious_playful"] > 0.7:
        descriptors.append("playful")

    if adjusted["humble_confident"] < 0.3:
        descriptors.append("humble")
    elif adjusted["humble_confident"] > 0.7:
        descriptors.append("confident")

    if not descriptors:
        return "Balanced, professional tone"
    return ", ".join(descriptors).capitalize() + " tone"


# ============================================================================
# Content Agency Graph
# ============================================================================

class ContentAgencyGraph:
    """LangGraph-based multi-agent content creation system."""

    def __init__(self):
        """Initialize LLMs and build the graph."""
        self.gemini_llm = self._init_gemini_llm()
        self.claude_llm = self._init_claude_llm()
        self.graph = self._build_graph()

    def _init_gemini_llm(self) -> ChatGoogleGenerativeAI:
        """Initialize Gemini for internal analysis agents."""
        credentials = _get_gcp_credentials()

        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            project=settings.GCP_PROJECT_ID,
            location=settings.GCP_LOCATION,
            credentials=credentials,
            temperature=0.7,
            max_output_tokens=4096,
        )

    def _init_claude_llm(self) -> Optional[ChatBedrockConverse]:
        """Initialize Claude via Bedrock for content creation agents."""
        try:
            if not all([
                settings.AWS_BEDROCK_ACCESS_KEY_ID,
                settings.AWS_BEDROCK_SECRET_ACCESS_KEY,
                settings.AWS_BEDROCK_REGION,
            ]):
                logger.warning("AWS Bedrock credentials not configured, Claude unavailable")
                return None

            import boto3
            session = boto3.Session(
                aws_access_key_id=settings.AWS_BEDROCK_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_BEDROCK_SECRET_ACCESS_KEY,
                region_name=settings.AWS_BEDROCK_REGION,
            )

            return ChatBedrockConverse(
                model=settings.BEDROCK_MODEL_ID,
                region_name=settings.AWS_BEDROCK_REGION,
                credentials_profile_name=None,
                client=session.client("bedrock-runtime"),
                temperature=0.7,
                max_tokens=4096,
            )
        except Exception as e:
            logger.warning(f"Failed to init Claude: {e}")
            return None

    def _get_writer_llm(self):
        """Get the LLM for writing (prefer Claude, fallback to Gemini)."""
        return self.claude_llm if self.claude_llm else self.gemini_llm

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow."""
        workflow = StateGraph(AgencyState)

        # Add nodes
        workflow.add_node("scout", self._scout_agent)
        workflow.add_node("strategist", self._strategist_agent)
        workflow.add_node("length_strategist", self._length_strategist_node)
        workflow.add_node("writer", self._writer_agent)
        workflow.add_node("editor", self._editor_agent)
        workflow.add_node("qa", self._qa_agent)
        workflow.add_node("save_draft", self._save_draft)

        # Add edges
        workflow.add_edge(START, "scout")
        workflow.add_edge("scout", "strategist")
        workflow.add_edge("strategist", "length_strategist")
        workflow.add_edge("length_strategist", "writer")
        workflow.add_edge("writer", "editor")
        workflow.add_edge("editor", "qa")

        # Conditional edge from QA
        workflow.add_conditional_edges(
            "qa",
            self._route_after_qa,
            {
                "regenerate": "writer",
                "save": "save_draft",
                "end": END,
            }
        )

        # After save, check if we need more drafts
        workflow.add_conditional_edges(
            "save_draft",
            self._route_after_save,
            {
                "next_draft": "strategist",
                "end": END,
            }
        )

        # Compile the graph
        return workflow.compile(checkpointer=None, debug=False)

    def _route_after_qa(self, state: AgencyState) -> str:
        """Determine next step after QA review."""
        qa_result = state.get("qa_result", {})
        draft = state.get("refined_draft") or state.get("draft")

        # Fail-safe: If no draft exists, end workflow
        if not draft:
            logger.error("No draft available in QA routing, ending workflow")
            state.setdefault("errors", []).append("Workflow ended: No draft available for QA")
            return "end"

        if qa_result.get("approved", False):
            return "save"

        # Check regeneration limit
        if state.get("regeneration_count", 0) >= MAX_REGENERATIONS:
            logger.warning(f"Max regenerations reached for draft {state.get('current_draft_index', 0) + 1}, saving anyway")
            state.setdefault("errors", []).append(f"Draft {state.get('current_draft_index', 0) + 1} saved after max retries (may not meet all QA criteria)")
            # Save the draft anyway - it's better to have an imperfect draft than none
            return "save"

        return "regenerate"

    def _route_after_save(self, state: AgencyState) -> str:
        """Determine if we need to create more drafts."""
        current_index = state.get("current_draft_index", 0)
        opportunities = state.get("opportunities", [])

        # Fail-safe: If no opportunities, end workflow
        if not opportunities:
            logger.warning("No opportunities available, ending workflow")
            return "end"

        # We want 3 drafts, check if we have more opportunities
        if current_index < 2 and current_index + 1 < len(opportunities):
            return "next_draft"

        return "end"

    # ========================================================================
    # Agent Nodes
    # ========================================================================

    def _scout_agent(self, state: AgencyState) -> dict:
        """Scout Agent: Discover content opportunities."""
        logger.info(f"Scout Agent running for profile {state['profile_id']}")

        # Build identity facets summary for Scout
        identity_facets = state.get("identity_facets") or {}
        identity_summary = "No identity facets available."
        if identity_facets:
            # For scout, show a broad view of available facets
            facet_parts = []
            from app.services.agency_prompts import IDENTITY_FACET_CATEGORIES
            for category, fields in IDENTITY_FACET_CATEGORIES.items():
                values = []
                for field in fields:
                    val = identity_facets.get(field)
                    if isinstance(val, list) and val:
                        # Handle complex objects like timeline events (dicts)
                        for item in val[:3]:
                            if isinstance(item, dict):
                                if "title" in item:
                                    values.append(str(item["title"]))
                                elif "narrative" in item:
                                    values.append(str(item["narrative"])[:100] + "...")
                                else:
                                    values.append(str(item))
                            elif isinstance(item, str):
                                values.append(item)
                            else:
                                values.append(str(item))
                    elif isinstance(val, str) and val:
                        values.append(val)
                if values:
                    label = category.replace("_", " ").title()
                    facet_parts.append(f"- {label}: {', '.join(values)}")
            if facet_parts:
                identity_summary = "\n".join(facet_parts)

        prompt = ChatPromptTemplate.from_messages([
            ("system", SCOUT_AGENT_SYSTEM),
            ("human", SCOUT_AGENT_PROMPT),
        ])

        try:
            chain = prompt | self.gemini_llm | JsonOutputParser()
            # Format location list for prompt
            raw_location = state.get("location") or []
            if isinstance(raw_location, str):
                location_str = raw_location
            elif isinstance(raw_location, list):
                location_str = ", ".join(raw_location)
            else:
                location_str = "Global/Unspecified"

            # Get content focus from identity if available
            content_focus = identity_facets.get("primary_focus") or "Not specified"

            # Get trending signals if available (can be populated by external service)
            trending_signals = state.get("trending_signals") or "No trending signals available. Generate topics from persona and identity."

            opportunities = chain.invoke({
                "persona_prompt": state["persona_prompt"],
                "identity_facets": identity_summary,
                "platform_intent": state.get("platform_intent", "generic"),
                "location": location_str or "Global/Unspecified",
                "learned_preferences": state.get("learned_preferences", "No preferences learned yet."),
                "existing_topics": ", ".join(state.get("existing_topics", [])) or "None",
                "content_focus": content_focus,
                "trending_signals": trending_signals,
            })

            # Ensure we have a list
            if not isinstance(opportunities, list):
                opportunities = [opportunities]

            # Shuffle opportunities to prevent relevance-sort bias
            # Sequential index picking (0,1,2) by Strategist would always select
            # the "most relevant" (usually professional) topics first. Shuffling
            # ensures each batch has genuine variety in topic order.
            import random as _rand
            _rand.shuffle(opportunities)

            logger.info(f"Scout found {len(opportunities)} opportunities")
            return {"opportunities": opportunities}

        except Exception as e:
            logger.error(f"Scout Agent error: {e}")
            return {"opportunities": [], "errors": [f"Scout error: {str(e)}"]}

    def _strategist_agent(self, state: AgencyState) -> dict:
        """Strategist Agent: Select opportunity and create brief with diversity enforcement."""
        current_index = state.get("current_draft_index", 0)
        opportunities = state.get("opportunities", [])

        if not opportunities or current_index >= len(opportunities):
            logger.warning("No opportunities available for strategist")
            return {"content_brief": None}

        logger.info(f"Strategist Agent creating brief for draft {current_index + 1}")

        # Use the opportunity at current index
        selected_opportunity = opportunities[current_index]

        # Get uniqueness context for diversity enforcement
        uniqueness_ctx = state.get("uniqueness_context", {
            "used_hook_styles": [],
            "used_format_archetypes": [],
            "used_cta_styles": [],
            "used_content_modes": [],
            "used_authority_postures": [],
            "used_emotional_tones": [],
            "used_topic_domains": [],
            "used_identity_categories": [],
            "used_length_categories": [],
        })

        # Sample identity facets for THIS specific draft
        identity_facets = state.get("identity_facets") or {}
        sampled = sample_identity_facets(
            identity_dict=identity_facets,
            used_categories=uniqueness_ctx.get("used_identity_categories", []),
        )

        # Compute authority constraints based on timeline depth
        authority_constraints = compute_authority_constraints(identity_facets)

        prompt = ChatPromptTemplate.from_messages([
            ("system", STRATEGIST_AGENT_SYSTEM),
            ("human", STRATEGIST_AGENT_PROMPT),
        ])

        try:
            chain = prompt | self.gemini_llm | JsonOutputParser()

            # Split used styles into hard avoid (recent 5) and soft avoid (older 6-30)
            def _split_constraints(items: list) -> tuple[str, str]:
                hard = items[-5:] if len(items) >= 5 else items
                soft = items[:-5] if len(items) > 5 else []
                return (
                    ", ".join(hard) or "None yet",
                    ", ".join(soft) or "None",
                )

            hard_hooks, soft_hooks = _split_constraints(uniqueness_ctx.get("used_hook_styles", []))
            hard_formats, soft_formats = _split_constraints(uniqueness_ctx.get("used_format_archetypes", []))
            hard_ctas, soft_ctas = _split_constraints(uniqueness_ctx.get("used_cta_styles", []))
            hard_modes, soft_modes = _split_constraints(uniqueness_ctx.get("used_content_modes", []))
            hard_postures, soft_postures = _split_constraints(uniqueness_ctx.get("used_authority_postures", []))
            hard_tones, soft_tones = _split_constraints(uniqueness_ctx.get("used_emotional_tones", []))
            hard_domains, soft_domains = _split_constraints(uniqueness_ctx.get("used_topic_domains", []))

            # Add blocked postures to hard_avoid if identity doesn't support them
            blocked_postures = authority_constraints.get("blocked_postures", [])
            if blocked_postures:
                existing_hard_postures = hard_postures.split(", ") if hard_postures != "None yet" else []
                combined_postures = list(set(existing_hard_postures + blocked_postures))
                hard_postures = ", ".join(combined_postures) or "None yet"

            brief = chain.invoke({
                "opportunities": json.dumps([selected_opportunity], indent=2),
                "persona_prompt": state["persona_prompt"],
                "platform_intent": state.get("platform_intent", "generic"),
                "learned_preferences": state.get("learned_preferences", "No preferences yet."),
                "identity_facets": sampled.get("facet_summary", "No identity facets available."),
                "authority_constraints": authority_constraints.get("constraint_text", "No constraints."),
                "hard_avoid_hook_styles": hard_hooks,
                "hard_avoid_format_archetypes": hard_formats,
                "hard_avoid_cta_styles": hard_ctas,
                "hard_avoid_content_modes": hard_modes,
                "hard_avoid_authority_postures": hard_postures,
                "hard_avoid_emotional_tones": hard_tones,
                "hard_avoid_topic_domains": hard_domains,
                "soft_avoid_hook_styles": soft_hooks,
                "soft_avoid_format_archetypes": soft_formats,
                "soft_avoid_cta_styles": soft_ctas,
                "soft_avoid_content_modes": soft_modes,
                "soft_avoid_authority_postures": soft_postures,
                "soft_avoid_emotional_tones": soft_tones,
                "soft_avoid_topic_domains": soft_domains,
            })

            logger.info(
                f"Strategist created brief for: {brief.get('selected_topic', 'Unknown')} "
                f"(format: {brief.get('format_archetype')}, hook: {brief.get('target_hook_style')}, "
                f"mode: {brief.get('content_mode')}, posture: {brief.get('authority_posture')}, "
                f"tone: {brief.get('emotional_tone')})"
            )

            # Inject news metadata from the Scout's opportunity directly
            # (don't rely on the LLM to pass these through)
            brief["is_news_driven"] = selected_opportunity.get("is_news_driven", False)
            brief["news_source"] = selected_opportunity.get("news_source")

            return {
                "content_brief": brief,
                "sampled_facets": sampled,
                "regeneration_count": 0,  # Reset for new draft
            }

        except Exception as e:
            logger.error(f"Strategist Agent error: {e}")
            return {"content_brief": None, "errors": state.get("errors", []) + [f"Strategist error: {str(e)}"]}

    def _length_strategist_node(self, state: AgencyState) -> dict:
        """Length Strategist: Determine optimal content length based on topic, template, and content mode."""
        brief = state.get("content_brief")
        if not brief:
            logger.warning("No brief available for length strategist")
            return {"length_decision": None}

        logger.info(f"Length Strategist analyzing optimal length for: {brief.get('selected_topic', 'Unknown')}")

        try:
            from app.services.length_strategist import LengthStrategistService
            import asyncio

            strategist = LengthStrategistService()

            # Get template metadata if available
            template_meta = state.get("template_meta", {})

            # Extract writing sample insights for length patterns
            writing_patterns = state.get("writing_sample_insights")
            if not writing_patterns and state.get("persona_prompt") and "LENGTH PATTERNS:" in state.get("persona_prompt", ""):
                # Fallback: Extract from persona prompt if available there
                persona = state.get("persona_prompt", "")
                if "LENGTH PATTERNS:" in persona:
                    start = persona.find("LENGTH PATTERNS:")
                    end = persona.find("\n\n", start)
                    if end > start:
                        writing_patterns = persona[start:end]

            # Enforce length diversity across drafts in this batch
            # Only look at within-batch lengths (not historical) so each batch has variety
            completed_drafts = state.get("completed_drafts", [])
            batch_lengths = []
            for d in completed_drafts:
                wc = len(d.get("body", "").split()) if d.get("body") else 150
                if wc <= 50:
                    batch_lengths.append("very_short")
                elif wc <= 120:
                    batch_lengths.append("short")
                elif wc <= 300:
                    batch_lengths.append("medium")
                else:
                    batch_lengths.append("long")

            # Find categories NOT yet used in this batch and pick one randomly
            all_categories = ["very_short", "short", "medium", "long"]
            unused = [c for c in all_categories if c not in batch_lengths]

            length_hints = {
                "very_short": "PREFER a VERY SHORT post (30-50 words) for this draft. A single punchy observation. 2-3 lines max. Stop immediately.",
                "short": "PREFER a SHORT post (60-120 words) for this draft. Short, punchy posts are powerful.",
                "medium": "PREFER a MEDIUM post (150-250 words) for this draft. Enough room for one key insight with context.",
                "long": "PREFER a LONG, detailed post (300-600 words) for this draft. Go deep with multiple beats.",
            }

            if unused and len(completed_drafts) < 3:
                import random as _len_rand
                chosen = _len_rand.choice(unused)
                length_hint = length_hints[chosen]
                logger.info(f"Length hint for draft {len(completed_drafts)+1}: {chosen} (unused in batch: {unused})")
            else:
                length_hint = None

            # Determine optimal length (run async method in sync thread context)
            # We're inside asyncio.to_thread(), so no event loop is running here.
            # Create a new event loop for this thread to safely call async code.
            loop = asyncio.new_event_loop()
            try:
                decision = loop.run_until_complete(strategist.determine_optimal_length(
                    topic=brief.get("selected_topic", ""),
                    template_category=template_meta.get("category"),
                    template_flexibility=template_meta.get("length_flexibility", "flexible"),
                    template_min=template_meta.get("min_length"),
                    template_max=template_meta.get("max_length"),
                    brief_description=brief.get("content_angle", ""),
                    user_length_patterns=writing_patterns,
                    content_mode=brief.get("content_mode"),
                    length_hint=length_hint,
                ))
            finally:
                loop.close()

            logger.info(
                f"Length decision: {decision['target_min_words']}-{decision['target_max_words']} words. "
                f"Reason: {decision['reasoning'][:80]}..."
            )

            return {"length_decision": decision}

        except Exception as e:
            logger.error(f"Length Strategist error: {e}", exc_info=True)
            # Fallback to default range
            return {
                "length_decision": {
                    "target_min_words": 150,
                    "target_max_words": 250,
                    "reasoning": "Using default range due to error",
                    "structure_suggestion": "Standard structure",
                },
                "errors": state.get("errors", []) + [f"Length Strategist error: {str(e)}"],
            }

    def _writer_agent(self, state: AgencyState) -> dict:
        """Writer Agent: Generate initial draft with content mode and authority posture."""
        brief = state.get("content_brief")
        if not brief:
            logger.warning("No brief available for writer")
            return {"draft": None}

        # Get length decision
        length_decision = state.get("length_decision", {
            "target_min_words": 150,
            "target_max_words": 250,
            "reasoning": "Default length range",
            "structure_suggestion": "Standard structure",
        })

        target_length = f"{length_decision['target_min_words']}-{length_decision['target_max_words']} words"

        # Get sampled identity facets
        sampled_facets = state.get("sampled_facets", {})
        identity_facets_summary = sampled_facets.get("facet_summary", "No specific facets selected.")

        logger.info(
            f"Writer Agent creating draft for: {brief.get('selected_topic', 'Unknown')} "
            f"(target: {target_length}, mode: {brief.get('content_mode')}, posture: {brief.get('authority_posture')})"
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", WRITER_AGENT_SYSTEM),
            ("human", WRITER_AGENT_PROMPT),
        ])

        llm = self._get_writer_llm()

        try:
            chain = prompt | llm | JsonOutputParser()

            # Include QA feedback if this is a regeneration
            qa_feedback = ""
            if state.get("regeneration_count", 0) > 0:
                qa_result = state.get("qa_result", {})
                if qa_result.get("rejection_reason"):
                    qa_feedback = f"\n\nPREVIOUS FEEDBACK (address this): {qa_result['rejection_reason']}"
                # If repetition was detected, force different format
                if qa_result.get("repetition_detected"):
                    qa_feedback += f"\n\nREPETITION ISSUE: {qa_result.get('repetition_details', 'Use a completely different structure.')}"

            # Extract identity context for Writer (replaces full persona prompt)
            identity_data = state.get("identity_facets") or {}
            current_role = identity_data.get("current_role", "Professional")
            industry = identity_data.get("industry", "")
            tone_sliders = state.get("tone_sliders", {})
            tone_description = _build_tone_description(
                tone_sliders,
                content_mode=brief.get("content_mode"),
                emotional_tone=brief.get("emotional_tone"),
            )

            # Get writing style insights from analyzed samples
            writing_style_guidance = state.get("writing_sample_insights") or "No writing samples analyzed yet. Use natural, human language."

            draft = chain.invoke({
                "topic": brief.get("selected_topic", ""),
                "topic_domain": brief.get("topic_domain", "professional"),
                "angle": brief.get("content_angle", ""),
                "format_archetype": brief.get("format_archetype") or random.choice(FORMAT_ARCHETYPES),
                "hook_style": brief.get("target_hook_style") or random.choice(HOOK_STYLES),
                "cta_style": brief.get("cta_style") or random.choice(CTA_STYLES),
                "content_mode": brief.get("content_mode") or random.choice(CONTENT_MODES),
                "authority_posture": brief.get("authority_posture") or random.choice(AUTHORITY_POSTURES),
                "emotional_tone": brief.get("emotional_tone") or random.choice(EMOTIONAL_TONES),
                "key_points": json.dumps(brief.get("key_points", [])),
                "goal": brief.get("goal", "thought_leadership"),
                "tone_guidance": brief.get("tone_guidance", "") + qa_feedback,
                "platform_intent": state.get("platform_intent", "generic"),
                "target_length": target_length,
                "length_reasoning": length_decision.get("reasoning", ""),
                "structure_suggestion": length_decision.get("structure_suggestion", ""),
                "identity_facets_summary": identity_facets_summary,
                "current_role": current_role,
                "industry": industry,
                "tone_description": tone_description,
                "template": state.get("template", "No template provided."),
                "location": ", ".join(state.get("location") or []) or "Global/Unspecified",
                "writing_style_guidance": writing_style_guidance,
            })

            logger.info(f"Writer created draft with hook: {draft.get('hook', '')[:50]}...")
            return {"draft": draft}

        except Exception as e:
            logger.error(f"Writer Agent error: {e}")
            return {"draft": None, "errors": state.get("errors", []) + [f"Writer error: {str(e)}"]}

    def _editor_agent(self, state: AgencyState) -> dict:
        """Editor Agent: Refine and polish the draft while preserving intentional voice."""
        draft = state.get("draft")
        if not draft:
            logger.warning("No draft available for editor")
            return {"refined_draft": None}

        brief = state.get("content_brief", {})
        logger.info("Editor Agent refining draft")

        prompt = ChatPromptTemplate.from_messages([
            ("system", EDITOR_AGENT_SYSTEM),
            ("human", EDITOR_AGENT_PROMPT),
        ])

        llm = self._get_writer_llm()
        tone_sliders = state.get("tone_sliders", {})

        try:
            chain = prompt | llm | JsonOutputParser()

            # Get writing style insights
            writing_style_guidance = state.get("writing_sample_insights") or "No writing samples analyzed. Use natural, human language."

            refined = chain.invoke({
                "hook": draft.get("hook", ""),
                "body": draft.get("body", ""),
                "content_mode": brief.get("content_mode") or random.choice(CONTENT_MODES),
                "authority_posture": brief.get("authority_posture") or random.choice(AUTHORITY_POSTURES),
                "emotional_tone": brief.get("emotional_tone") or random.choice(EMOTIONAL_TONES),
                "topic_domain": brief.get("topic_domain", "professional"),
                "platform_intent": state.get("platform_intent", "generic"),
                "formal_casual": tone_sliders.get("formal_casual", 0.5),
                "technical_simple": tone_sliders.get("technical_simple", 0.5),
                "serious_playful": tone_sliders.get("serious_playful", 0.5),
                "humble_confident": tone_sliders.get("humble_confident", 0.5),
                "preferred_hooks": ", ".join(state.get("preferred_hooks", [])) or "Any",
                "writing_style_guidance": writing_style_guidance,
            })

            # Preserve topic and hashtags from original draft
            refined["topic"] = draft.get("topic", state.get("content_brief", {}).get("selected_topic", ""))
            refined["hashtags"] = draft.get("hashtags", [])

            logger.info(f"Editor refined draft: {refined.get('improvements', [])}")
            return {"refined_draft": refined}

        except Exception as e:
            logger.error(f"Editor Agent error: {e}")
            # On error, pass through the original draft
            return {"refined_draft": draft}

    def _check_semantic_similarity(self, current_body: str, completed_drafts: list[dict]) -> dict | None:
        """Check if current draft is semantically too similar to previous drafts.

        Uses Gemini embedding API to compute cosine similarity. Returns a
        rejection dict if similarity > 0.85, otherwise None (pass).
        """
        if not completed_drafts or not current_body:
            return None

        previous_bodies = [d.get("body", "") for d in completed_drafts if d.get("body")]
        if not previous_bodies:
            return None

        try:
            from google import genai

            client = genai.Client(
                vertexai=True,
                project=settings.GCP_PROJECT_ID,
                location=settings.GCP_LOCATION,
            )

            all_texts = [current_body] + previous_bodies
            response = client.models.embed_content(
                model="text-embedding-004",
                contents=all_texts,
            )

            current_embedding = response.embeddings[0].values
            max_similarity = 0.0
            most_similar_idx = 0

            for i, emb in enumerate(response.embeddings[1:]):
                # Cosine similarity (embeddings are already normalized)
                similarity = sum(a * b for a, b in zip(current_embedding, emb.values))
                if similarity > max_similarity:
                    max_similarity = similarity
                    most_similar_idx = i

            if max_similarity > 0.85:
                logger.warning(
                    f"Semantic similarity {max_similarity:.3f} detected with draft {most_similar_idx + 1}"
                )
                return {
                    "qa_result": {
                        "approved": False,
                        "score": 0.3,
                        "issues": [f"Semantic similarity {max_similarity:.2f} with draft {most_similar_idx + 1}"],
                        "rejection_reason": (
                            "This draft says the same thing as a previous draft in different words. "
                            "Write about a genuinely different topic or take a genuinely different angle."
                        ),
                        "repetition_detected": True,
                        "repetition_details": (
                            f"Cosine similarity {max_similarity:.2f} with previous draft. "
                            f"Surface structure differs but core message converges."
                        ),
                    },
                }

            return None

        except Exception as e:
            # Non-fatal: if embeddings fail, fall through to LLM-based QA check
            logger.warning(f"Semantic similarity check failed (non-fatal): {e}")
            return None

    def _qa_agent(self, state: AgencyState) -> dict:
        """QA Agent: Validate brand voice, quality, mode/posture adherence, and detect repetition."""
        draft = state.get("refined_draft") or state.get("draft")
        if not draft:
            logger.warning("No draft available for QA")
            return {"qa_result": {"approved": False, "rejection_reason": "No draft to review"}}

        brief = state.get("content_brief", {})
        logger.info("QA Agent reviewing draft")

        # Pre-check 1: Hard word count validation
        length_decision = state.get("length_decision", {})
        target_min = length_decision.get("target_min_words", 150)
        target_max = length_decision.get("target_max_words", 250)
        body_text = draft.get("body", "")
        word_count = len(body_text.split())

        # Reject if more than 25% outside target range
        min_allowed = int(target_min * 0.75)
        max_allowed = int(target_max * 1.25)

        if word_count < min_allowed:
            logger.warning(f"Draft too short: {word_count} words, target was {target_min}-{target_max}")
            return {
                "qa_result": {
                    "approved": False,
                    "score": 0.3,
                    "issues": [f"Post is too short ({word_count} words, target: {target_min}-{target_max})"],
                    "rejection_reason": f"Too short. Got {word_count} words, need at least {target_min}. Expand with more detail.",
                },
                "regeneration_count": state.get("regeneration_count", 0) + 1,
            }

        if word_count > max_allowed:
            logger.warning(f"Draft too long: {word_count} words, target was {target_min}-{target_max}")
            return {
                "qa_result": {
                    "approved": False,
                    "score": 0.3,
                    "issues": [f"Post is too long ({word_count} words, target: {target_min}-{target_max})"],
                    "rejection_reason": f"Too long. Got {word_count} words, max is {target_max}. Tighten and cut.",
                },
                "regeneration_count": state.get("regeneration_count", 0) + 1,
            }

        # Pre-check 2: semantic similarity before LLM QA
        completed_drafts = state.get("completed_drafts", [])
        similarity_rejection = self._check_semantic_similarity(
            draft.get("body", ""), completed_drafts
        )
        if similarity_rejection:
            return {
                **similarity_rejection,
                "regeneration_count": state.get("regeneration_count", 0) + 1,
            }

        # Build previous drafts summary for repetition detection
        previous_drafts_summary = "None"
        if completed_drafts:
            summaries = []
            for i, d in enumerate(completed_drafts, 1):
                hook_preview = d.get("hook", "")[:80]
                mode = d.get("content_mode", "unknown")
                posture = d.get("authority_posture", "unknown")
                summaries.append(
                    f"Draft {i} (mode: {mode}, posture: {posture}): "
                    f"hook: \"{hook_preview}...\""
                )
            previous_drafts_summary = "\n".join(summaries)

        prompt = ChatPromptTemplate.from_messages([
            ("system", QA_AGENT_SYSTEM),
            ("human", QA_AGENT_PROMPT),
        ])

        try:
            chain = prompt | self.gemini_llm | JsonOutputParser()

            # Get length target for validation
            length_decision = state.get("length_decision", {})
            target_length = f"{length_decision.get('target_min_words', 150)}-{length_decision.get('target_max_words', 250)} words"

            # Get writing style summary for alignment check
            writing_style_summary = state.get("writing_sample_insights") or "No writing samples analyzed yet."

            # Compute authority constraints for alignment check
            identity_facets = state.get("identity_facets") or {}
            authority_constraints = compute_authority_constraints(identity_facets)

            result = chain.invoke({
                "hook": draft.get("hook", ""),
                "body": draft.get("body", ""),
                "persona_prompt": state["persona_prompt"],
                "identity_facets_summary": state.get("sampled_facets", {}).get("facet_summary", "No facets available"),
                "topic_domain": brief.get("topic_domain", "professional"),
                "content_mode": brief.get("content_mode") or "explainer",
                "authority_posture": brief.get("authority_posture") or "experienced",
                "emotional_tone": brief.get("emotional_tone") or "matter_of_fact",
                "platform_intent": state.get("platform_intent", "generic"),
                "taboo_list": ", ".join(state.get("taboo_list", [])) or "None specified",
                "previous_drafts": previous_drafts_summary,
                "target_length": target_length,
                "writing_style_summary": writing_style_summary,
                "authority_constraints": authority_constraints.get("constraint_text", "No constraints."),
            })

            # Log repetition detection
            if result.get("repetition_detected"):
                logger.warning(f"QA detected repetition: {result.get('repetition_details', 'Unspecified')}")

            logger.info(f"QA result: approved={result.get('approved')}, score={result.get('score')}")

            return {
                "qa_result": result,
                "regeneration_count": state.get("regeneration_count", 0) + (0 if result.get("approved") else 1),
            }

        except Exception as e:
            logger.error(f"QA Agent error: {e}")
            # On error, approve to avoid blocking
            return {"qa_result": {"approved": True, "score": 0.7, "issues": ["QA error, auto-approved"]}}

    def _save_draft(self, state: AgencyState) -> dict:
        """Save the completed draft and update all diversity tracking dimensions."""
        draft = state.get("refined_draft") or state.get("draft")
        brief = state.get("content_brief", {})
        sampled_facets = state.get("sampled_facets", {})
        if not draft:
            return {}

        # Extract style and diversity metadata
        hook_style = brief.get("target_hook_style")
        format_archetype = brief.get("format_archetype")
        cta_style = brief.get("cta_style")
        content_mode = brief.get("content_mode")
        authority_posture = brief.get("authority_posture")
        emotional_tone = brief.get("emotional_tone")
        topic_domain = brief.get("topic_domain")

        # Extract news metadata from the selected opportunity
        is_news_driven = brief.get("is_news_driven", False)
        news_source = brief.get("news_source")

        # Build identity_facets_used from sampled facets
        identity_facets_used = None
        if sampled_facets:
            identity_facets_used = {
                "primary_facets": sampled_facets.get("primary_facets", {}),
                "secondary_facets": sampled_facets.get("secondary_facets", {}),
                "ignored_categories": sampled_facets.get("ignored_categories", []),
                "depth_warning": sampled_facets.get("depth_warning"),
                "identity_depth": sampled_facets.get("identity_depth"),
            }

        completed = state.get("completed_drafts", [])
        completed.append({
            "hook": draft.get("hook", ""),
            "body": draft.get("body", ""),
            "topic": draft.get("topic", ""),
            "hashtags": draft.get("hashtags", []),
            "qa_score": state.get("qa_result", {}).get("score", 0.0),
            # Style metadata
            "hook_style": hook_style,
            "format_archetype": format_archetype,
            "cta_style": cta_style,
            # Diversity metadata
            "content_mode": content_mode,
            "authority_posture": authority_posture,
            "emotional_tone": emotional_tone,
            "topic_domain": topic_domain,
            "identity_facets_used": identity_facets_used,
            # News metadata
            "is_news_driven": is_news_driven,
            "news_source": news_source,
        })

        # Classify length for diversity tracking
        word_count = len(draft.get("body", "").split())
        if word_count <= 50:
            length_category = "very_short"
        elif word_count <= 120:
            length_category = "short"
        elif word_count <= 300:
            length_category = "medium"
        else:
            length_category = "long"

        # Update uniqueness context for diversity enforcement
        uniqueness_ctx = state.get("uniqueness_context", {
            "used_hook_styles": [],
            "used_format_archetypes": [],
            "used_cta_styles": [],
            "used_content_modes": [],
            "used_authority_postures": [],
            "used_emotional_tones": [],
            "used_topic_domains": [],
            "used_identity_categories": [],
            "used_length_categories": [],
        })

        # Ensure used_length_categories exists (may be missing from historical data)
        if "used_length_categories" not in uniqueness_ctx:
            uniqueness_ctx["used_length_categories"] = []

        # Track all dimensions
        if hook_style:
            uniqueness_ctx["used_hook_styles"].append(hook_style)
        if format_archetype:
            uniqueness_ctx["used_format_archetypes"].append(format_archetype)
        if cta_style:
            uniqueness_ctx["used_cta_styles"].append(cta_style)
        if content_mode:
            uniqueness_ctx["used_content_modes"].append(content_mode)
        if authority_posture:
            uniqueness_ctx["used_authority_postures"].append(authority_posture)
        if emotional_tone:
            uniqueness_ctx["used_emotional_tones"].append(emotional_tone)
        if topic_domain:
            uniqueness_ctx["used_topic_domains"].append(topic_domain)
        # Track length category for cross-draft diversity
        uniqueness_ctx["used_length_categories"].append(length_category)
        # Track identity categories used
        if sampled_facets:
            for cat in sampled_facets.get("primary_facets", {}).keys():
                uniqueness_ctx["used_identity_categories"].append(cat)

        logger.info(
            f"Saved draft {len(completed)}/3: {draft.get('topic', 'Unknown')[:50]} "
            f"(mode={content_mode}, posture={authority_posture}, tone={emotional_tone}, "
            f"length={length_category}/{word_count}w)"
        )

        return {
            "completed_drafts": completed,
            "current_draft_index": state.get("current_draft_index", 0) + 1,
            "uniqueness_context": uniqueness_ctx,
            # Reset for next draft
            "draft": None,
            "refined_draft": None,
            "qa_result": None,
            "content_brief": None,
            "length_decision": None,
            "sampled_facets": None,
        }

    # ========================================================================
    # Public Interface
    # ========================================================================

    async def run(
        self,
        profile_id: UUID,
        persona_prompt: str,
        learned_preferences: str,
        existing_topics: list[str],
        taboo_list: list[str],
        tone_sliders: dict,
        preferred_hooks: list[str],
        template: Optional[str] = None,
        template_meta: Optional[dict] = None,
        platform_intent: str = "generic",
        historical_uniqueness: Optional[dict] = None,
        writing_sample_insights: Optional[str] = None,
        location: Optional[list[str]] = None,
        identity_facets: Optional[dict] = None,
        trending_signals: Optional[str] = None,
    ) -> list[dict]:
        """Run the content agency workflow for a profile.

        Args:
            profile_id: Profile UUID
            persona_prompt: Pre-synthesized persona context
            learned_preferences: Learned content preferences
            existing_topics: Topics already generated (to avoid duplicates)
            taboo_list: Topics/phrases to avoid
            tone_sliders: Style preferences
            preferred_hooks: Preferred hook styles
            template: Optional template for structure
            template_meta: Optional template metadata (category, flexibility, min/max length)
            platform_intent: Target platform (linkedin, x, ig, newsletter, generic)
            historical_uniqueness: Style history from past drafts (for cross-session diversity)
            writing_sample_insights: Insights extracted from user writing samples
            location: Target markets or physical locations
            identity_facets: Raw identity graph dict for facet sampling
            trending_signals: External trending topics/news for topic discovery

        Returns:
            List of completed draft dicts (up to 3)
        """
        # Merge historical uniqueness with initial context
        default_uniqueness = {
            "used_hook_styles": [],
            "used_format_archetypes": [],
            "used_cta_styles": [],
            "used_content_modes": [],
            "used_authority_postures": [],
            "used_emotional_tones": [],
            "used_topic_domains": [],
            "used_identity_categories": [],
            "used_length_categories": [],
        }
        if historical_uniqueness:
            for key in default_uniqueness:
                default_uniqueness[key] = historical_uniqueness.get(key, [])[:]

        initial_state: AgencyState = {
            "profile_id": str(profile_id),
            "persona_prompt": persona_prompt,
            "learned_preferences": learned_preferences or "No preferences learned yet.",
            "existing_topics": existing_topics or [],
            "taboo_list": taboo_list or [],
            "tone_sliders": tone_sliders or {},
            "preferred_hooks": preferred_hooks or [],
            "template": template,
            "template_meta": template_meta or {},
            "platform_intent": platform_intent,
            "writing_sample_insights": writing_sample_insights,
            "location": location,
            "identity_facets": identity_facets,
            "trending_signals": trending_signals,
            "sampled_facets": None,
            "opportunities": None,
            "content_brief": None,
            "length_decision": None,
            "draft": None,
            "refined_draft": None,
            "qa_result": None,
            "uniqueness_context": default_uniqueness,
            "regeneration_count": 0,
            "current_draft_index": 0,
            "completed_drafts": [],
            "errors": [],
        }

        logger.info(f"Starting Content Agency for profile {profile_id}")

        # Run the graph (sync invoke since LangGraph handles async internally)
        import asyncio
        # Pass recursion_limit in config
        final_state = await asyncio.to_thread(
            self.graph.invoke,
            initial_state,
            {"recursion_limit": 100}
        )

        drafts = final_state.get("completed_drafts", [])
        errors = final_state.get("errors", [])

        if errors:
            logger.warning(f"Agency completed with errors: {errors}")

        logger.info(f"Content Agency completed: {len(drafts)} drafts created")
        return drafts
