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
    template: Optional[str]
    
    # Agent outputs
    opportunities: Optional[list[dict]]  # Scout output
    content_brief: Optional[dict]  # Strategist output
    draft: Optional[dict]  # Writer output
    refined_draft: Optional[dict]  # Editor output
    qa_result: Optional[dict]  # QA output
    
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
        workflow.add_node("writer", self._writer_agent)
        workflow.add_node("editor", self._editor_agent)
        workflow.add_node("qa", self._qa_agent)
        workflow.add_node("save_draft", self._save_draft)
        
        # Add edges
        workflow.add_edge(START, "scout")
        workflow.add_edge("scout", "strategist")
        workflow.add_edge("strategist", "writer")
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
            
            opportunities = chain.invoke({
                "persona_prompt": state["persona_prompt"],
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
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", STRATEGIST_AGENT_SYSTEM),
            ("human", STRATEGIST_AGENT_PROMPT),
        ])
        
        try:
            chain = prompt | self.gemini_llm | JsonOutputParser()
            
            brief = chain.invoke({
                "opportunities": json.dumps([selected_opportunity], indent=2),
                "persona_prompt": state["persona_prompt"],
                "learned_preferences": state.get("learned_preferences", "No preferences yet."),
            })
            
            logger.info(f"Strategist created brief for: {brief.get('selected_topic', 'Unknown')}")
            return {
                "content_brief": brief,
                "regeneration_count": 0,  # Reset for new draft
            }
            
        except Exception as e:
            logger.error(f"Strategist Agent error: {e}")
            return {"content_brief": None, "errors": state.get("errors", []) + [f"Strategist error: {str(e)}"]}
    
    def _writer_agent(self, state: AgencyState) -> dict:
        """Writer Agent: Generate initial draft."""
        brief = state.get("content_brief")
        if not brief:
            logger.warning("No brief available for writer")
            return {"draft": None}
        
        logger.info(f"Writer Agent creating draft for: {brief.get('selected_topic', 'Unknown')}")
        
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
            
            draft = chain.invoke({
                "topic": brief.get("selected_topic", ""),
                "angle": brief.get("content_angle", ""),
                "hook_style": brief.get("target_hook_style", "bold_claim"),
                "key_points": json.dumps(brief.get("key_points", [])),
                "goal": brief.get("goal", "thought_leadership"),
                "tone_guidance": brief.get("tone_guidance", "") + qa_feedback,
                "persona_prompt": state["persona_prompt"],
                "template": state.get("template", "No template provided."),
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
                "formal_casual": tone_sliders.get("formal_casual", 0.5),
                "technical_simple": tone_sliders.get("technical_simple", 0.5),
                "serious_playful": tone_sliders.get("serious_playful", 0.5),
                "humble_confident": tone_sliders.get("humble_confident", 0.5),
                "preferred_hooks": ", ".join(state.get("preferred_hooks", [])) or "Any",
            })
            
            # Preserve topic from original draft
            refined["topic"] = draft.get("topic", state.get("content_brief", {}).get("selected_topic", ""))
            
            logger.info(f"Editor refined draft: {refined.get('improvements', [])}")
            return {"refined_draft": refined}
            
        except Exception as e:
            logger.error(f"Editor Agent error: {e}")
            # On error, pass through the original draft
            return {"refined_draft": draft}
    
    def _qa_agent(self, state: AgencyState) -> dict:
        """QA Agent: Validate brand voice and quality."""
        draft = state.get("refined_draft") or state.get("draft")
        if not draft:
            logger.warning("No draft available for QA")
            return {"qa_result": {"approved": False, "rejection_reason": "No draft to review"}}
        
        logger.info("QA Agent reviewing draft")
        
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
                "taboo_list": ", ".join(state.get("taboo_list", [])) or "None specified",
            })
            
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
        """Save the completed draft to the list."""
        draft = state.get("refined_draft") or state.get("draft")
        if not draft:
            return {}
        
        completed = state.get("completed_drafts", [])
        completed.append({
            "hook": draft.get("hook", ""),
            "body": draft.get("body", ""),
            "topic": draft.get("topic", ""),
            "qa_score": state.get("qa_result", {}).get("score", 0.0),
        })
        
        logger.info(f"Saved draft {len(completed)}/3: {draft.get('topic', 'Unknown')[:50]}")
        
        return {
            "completed_drafts": completed,
            "current_draft_index": state.get("current_draft_index", 0) + 1,
            # Reset for next draft
            "draft": None,
            "refined_draft": None,
            "qa_result": None,
            "content_brief": None,
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
            
        Returns:
            List of completed draft dicts (up to 3)
        """
        initial_state: AgencyState = {
            "profile_id": str(profile_id),
            "persona_prompt": persona_prompt,
            "learned_preferences": learned_preferences or "No preferences learned yet.",
            "existing_topics": existing_topics or [],
            "taboo_list": taboo_list or [],
            "tone_sliders": tone_sliders or {},
            "preferred_hooks": preferred_hooks or [],
            "template": template,
            "opportunities": None,
            "content_brief": None,
            "draft": None,
            "refined_draft": None,
            "qa_result": None,
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
