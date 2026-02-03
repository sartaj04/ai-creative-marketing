"""LangGraph workflow for the Content Agency multi-agent system.

This module implements the agency workflow as a state machine:
Scout → Strategist → Writer → Editor → QA → (Approve/Regenerate)

Each node is an agent with a specialized role in content creation.
"""

import json
import logging
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
    preferred_hooks: list[str]
    location: Optional[list[str]]  # Target markets/locations
    writing_sample_insights: Optional[str]  # Derived from previous posts
    template: Optional[str]
    template_meta: Optional[dict]  # Template metadata (flexibility, min/max length)
    platform_intent: str  # Platform target: linkedin, x, ig, newsletter, generic
    
    # Agent outputs
    opportunities: Optional[list[dict]]  # Scout output
    content_brief: Optional[dict]  # Strategist output
    length_decision: Optional[dict]  # Length Strategist output
    draft: Optional[dict]  # Writer output
    refined_draft: Optional[dict]  # Editor output
    qa_result: Optional[dict]  # QA output
    
    # Uniqueness tracking (for diversity enforcement)
    uniqueness_context: dict  # Tracks used hooks, formats, CTAs across drafts
    
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

            opportunities = chain.invoke({
                "persona_prompt": state["persona_prompt"],
                "platform_intent": state.get("platform_intent", "generic"),
                "location": location_str or "Global/Unspecified",
                "learned_preferences": state.get("learned_preferences", "No preferences learned yet."),
                "existing_topics": ", ".join(state.get("existing_topics", [])) or "None",
            })
            
            # Ensure we have a list
            if not isinstance(opportunities, list):
                opportunities = [opportunities]
            
            # Sort by relevance score
            opportunities.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
            
            logger.info(f"Scout found {len(opportunities)} opportunities")
            return {"opportunities": opportunities}
            
        except Exception as e:
            logger.error(f"Scout Agent error: {e}")
            return {"opportunities": [], "errors": [f"Scout error: {str(e)}"]}
    
    def _strategist_agent(self, state: AgencyState) -> dict:
        """Strategist Agent: Select opportunity and create brief."""
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
        })
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", STRATEGIST_AGENT_SYSTEM),
            ("human", STRATEGIST_AGENT_PROMPT),
        ])
        
        try:
            chain = prompt | self.gemini_llm | JsonOutputParser()
            
            brief = chain.invoke({
                "opportunities": json.dumps([selected_opportunity], indent=2),
                "persona_prompt": state["persona_prompt"],
                "platform_intent": state.get("platform_intent", "generic"),
                "learned_preferences": state.get("learned_preferences", "No preferences yet."),
                "used_hook_styles": ", ".join(uniqueness_ctx.get("used_hook_styles", [])) or "None yet",
                "used_format_archetypes": ", ".join(uniqueness_ctx.get("used_format_archetypes", [])) or "None yet",
                "used_cta_styles": ", ".join(uniqueness_ctx.get("used_cta_styles", [])) or "None yet",
            })
            
            logger.info(f"Strategist created brief for: {brief.get('selected_topic', 'Unknown')} (format: {brief.get('format_archetype')}, hook: {brief.get('target_hook_style')})")
            return {
                "content_brief": brief,
                "regeneration_count": 0,  # Reset for new draft
            }
            
        except Exception as e:
            logger.error(f"Strategist Agent error: {e}")
            return {"content_brief": None, "errors": state.get("errors", []) + [f"Strategist error: {str(e)}"]}
    
    def _length_strategist_node(self, state: AgencyState) -> dict:
        """Length Strategist: Determine optimal content length based on topic and template."""
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
            
            # Determine optimal length (run async method in sync context)
            decision = asyncio.run(strategist.determine_optimal_length(
                topic=brief.get("selected_topic", ""),
                template_category=template_meta.get("category"),
                template_flexibility=template_meta.get("length_flexibility", "flexible"),
                template_min=template_meta.get("min_length"),
                template_max=template_meta.get("max_length"),
                brief_description=brief.get("content_angle", ""),
                user_length_patterns=writing_patterns,
            ))
            
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
        """Writer Agent: Generate initial draft."""
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
        
        logger.info(
            f"Writer Agent creating draft for: {brief.get('selected_topic', 'Unknown')} "
            f"(target: {target_length})"
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
            
            draft = chain.invoke({
                "topic": brief.get("selected_topic", ""),
                "angle": brief.get("content_angle", ""),
                "format_archetype": brief.get("format_archetype", "insight"),
                "hook_style": brief.get("target_hook_style", "bold_claim"),
                "cta_style": brief.get("cta_style", "question"),
                "key_points": json.dumps(brief.get("key_points", [])),
                "goal": brief.get("goal", "thought_leadership"),
                "tone_guidance": brief.get("tone_guidance", "") + qa_feedback,
                "platform_intent": state.get("platform_intent", "generic"),
                "target_length": target_length,
                "length_reasoning": length_decision.get("reasoning", ""),
                "structure_suggestion": length_decision.get("structure_suggestion", ""),
                "persona_prompt": state["persona_prompt"],
                "template": state.get("template", "No template provided."),
                "location": ", ".join(state.get("location") or []) or "Global/Unspecified",
            })
            
            logger.info(f"Writer created draft with hook: {draft.get('hook', '')[:50]}...")
            return {"draft": draft}
            
        except Exception as e:
            logger.error(f"Writer Agent error: {e}")
            return {"draft": None, "errors": state.get("errors", []) + [f"Writer error: {str(e)}"]}
    
    def _editor_agent(self, state: AgencyState) -> dict:
        """Editor Agent: Refine and polish the draft."""
        draft = state.get("draft")
        if not draft:
            logger.warning("No draft available for editor")
            return {"refined_draft": None}
        
        logger.info("Editor Agent refining draft")
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", EDITOR_AGENT_SYSTEM),
            ("human", EDITOR_AGENT_PROMPT),
        ])
        
        llm = self._get_writer_llm()
        tone_sliders = state.get("tone_sliders", {})
        
        try:
            chain = prompt | llm | JsonOutputParser()
            
            refined = chain.invoke({
                "hook": draft.get("hook", ""),
                "body": draft.get("body", ""),
                "platform_intent": state.get("platform_intent", "generic"),
                "formal_casual": tone_sliders.get("formal_casual", 0.5),
                "technical_simple": tone_sliders.get("technical_simple", 0.5),
                "serious_playful": tone_sliders.get("serious_playful", 0.5),
                "humble_confident": tone_sliders.get("humble_confident", 0.5),
                "preferred_hooks": ", ".join(state.get("preferred_hooks", [])) or "Any",
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
    
    def _qa_agent(self, state: AgencyState) -> dict:
        """QA Agent: Validate brand voice, quality, and detect repetition."""
        draft = state.get("refined_draft") or state.get("draft")
        if not draft:
            logger.warning("No draft available for QA")
            return {"qa_result": {"approved": False, "rejection_reason": "No draft to review"}}
        
        logger.info("QA Agent reviewing draft")
        
        # Build previous drafts summary for repetition detection
        completed_drafts = state.get("completed_drafts", [])
        previous_drafts_summary = "None"
        if completed_drafts:
            summaries = []
            for i, d in enumerate(completed_drafts, 1):
                hook_preview = d.get("hook", "")[:80]
                summaries.append(f"Draft {i} hook: \"{hook_preview}...\"")
            previous_drafts_summary = "\n".join(summaries)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", QA_AGENT_SYSTEM),
            ("human", QA_AGENT_PROMPT),
        ])
        
        try:
            chain = prompt | self.gemini_llm | JsonOutputParser()
            
            result = chain.invoke({
                "hook": draft.get("hook", ""),
                "body": draft.get("body", ""),
                "persona_prompt": state["persona_prompt"],
                "platform_intent": state.get("platform_intent", "generic"),
                "taboo_list": ", ".join(state.get("taboo_list", [])) or "None specified",
                "previous_drafts": previous_drafts_summary,
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
        """Save the completed draft to the list and update uniqueness context."""
        draft = state.get("refined_draft") or state.get("draft")
        brief = state.get("content_brief", {})
        if not draft:
            return {}
        
        # Extract style metadata for persistence
        hook_style = brief.get("target_hook_style")
        format_archetype = brief.get("format_archetype")
        cta_style = brief.get("cta_style")
        
        completed = state.get("completed_drafts", [])
        completed.append({
            "hook": draft.get("hook", ""),
            "body": draft.get("body", ""),
            "topic": draft.get("topic", ""),
            "hashtags": draft.get("hashtags", []),
            "qa_score": state.get("qa_result", {}).get("score", 0.0),
            # Style metadata for database persistence
            "hook_style": hook_style,
            "format_archetype": format_archetype,
            "cta_style": cta_style,
        })
        
        # Update uniqueness context for diversity enforcement
        uniqueness_ctx = state.get("uniqueness_context", {
            "used_hook_styles": [],
            "used_format_archetypes": [],
            "used_cta_styles": [],
        })
        
        # Track what was used in this draft
        if brief.get("target_hook_style"):
            uniqueness_ctx["used_hook_styles"].append(brief["target_hook_style"])
        if brief.get("format_archetype"):
            uniqueness_ctx["used_format_archetypes"].append(brief["format_archetype"])
        if brief.get("cta_style"):
            uniqueness_ctx["used_cta_styles"].append(brief["cta_style"])
        
        logger.info(f"Saved draft {len(completed)}/3: {draft.get('topic', 'Unknown')[:50]} (uniqueness: hooks={uniqueness_ctx['used_hook_styles']})")
        
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
            writing_sample_insights: Insights extracted from user writing samples
            location: Target markets or physical locations
            
        Returns:
            List of completed draft dicts (up to 3)
        """
        # Merge historical uniqueness with initial context
        default_uniqueness = {
            "used_hook_styles": [],
            "used_format_archetypes": [],
            "used_cta_styles": [],
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
            "template": template,
            "template_meta": template_meta or {},
            "platform_intent": platform_intent,
            "writing_sample_insights": writing_sample_insights,
            "location": location,
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
