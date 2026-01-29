"""Multi-agent content generator using LangChain and LangGraph.

This module implements a 5-agent system for collaborative content generation:
1. Identity Agent - Analyzes IdentityGraph to understand who the person is
2. Style Agent - Analyzes StyleProfile to understand communication preferences
3. Content Agent - Processes source material and extracts insights
4. Synthesis Agent - Combines all analyses to generate the final post
5. Review Agent - Validates quality, style adherence, and content appropriateness
"""

import json
import logging
from typing import Any, Optional
from uuid import UUID

from google.oauth2 import service_account
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
# Use ChatGoogleGenerativeAI which supports Vertex AI with service account credentials
# When project and credentials are provided, it automatically uses Vertex AI backend
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph, START
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing_extensions import TypedDict

from app.core.config import settings
from app.models.draft import AgentType, Draft, DraftFormat, DraftStatus
from app.models.identity import IdentityGraph, StyleProfile
from app.models.profile import Profile
from app.models.template import Template, TemplateUsage

logger = logging.getLogger(__name__)


# ============================================================================
# State Definition
# ============================================================================

class GenerationState(TypedDict):
    """State passed between agents in the LangGraph workflow."""

    # Input data
    identity_data: dict
    style_data: dict
    source_type: str
    source_content: str
    template_content: Optional[str]

    # Agent outputs
    identity_analysis: Optional[dict]
    style_analysis: Optional[dict]
    content_analysis: Optional[dict]

    # Final output
    final_draft: Optional[dict]
    
    # Review feedback
    review_approved: Optional[bool]
    review_feedback: Optional[dict]
    regeneration_count: int  # Track how many times we've regenerated


# ============================================================================
# Prompts
# ============================================================================

IDENTITY_AGENT_PROMPT = """You are the Identity Agent. Your role is to analyze a person's professional identity and provide guidance for content creation that authentically represents who they are.

Analyze this person's identity graph and determine:
1. Their core professional positioning
2. Key expertise areas to highlight
3. How to speak to their target audience
4. Authority markers that establish credibility
5. Themes that align with their brand

IDENTITY GRAPH:
- Current Role: {current_role}
- Industry: {industry}
- Expertise Areas: {expertise_areas}
- Career Highlights: {career_highlights}
- Themes: {themes}
- Authority Angles: {authority_angles}
- Target Audience: {target_audience}
- Unique Angles: {unique_angles}
- Content Pillars: {content_pillars}
- Bio Summary: {bio_summary}

Provide your analysis as JSON:
{{
    "core_positioning": "A concise statement of how this person should be positioned",
    "key_expertise_to_highlight": ["expertise1", "expertise2", "expertise3"],
    "audience_considerations": "How to speak to their target audience",
    "authority_markers": ["marker1", "marker2"],
    "relevant_themes": ["theme1", "theme2"],
    "voice_guidance": "How the content should reflect their professional identity"
}}"""

STYLE_AGENT_PROMPT = """You are the Style Agent. Your role is to analyze a person's communication style preferences and provide guidance for creating content that matches how they want to sound.

Analyze this person's style profile and determine:
1. The appropriate tone for their content
2. What type of hook would resonate
3. How to structure the post
4. What to avoid
5. How to drive engagement

STYLE PROFILE:
- Tone Description: {tone_description}
- Formal/Casual Slider (0=formal, 1=casual): {formal_casual}
- Technical/Simple Slider (0=simple, 1=technical): {technical_simple}
- Serious/Playful Slider (0=serious, 1=playful): {serious_playful}
- Humble/Confident Slider (0=humble, 1=confident): {humble_confident}
- Format Preferences: {format_preferences}
- Preferred Hook Styles: {preferred_hooks}
- Topics to Avoid: {taboo_list}

Provide your analysis as JSON:
{{
    "recommended_tone": "Description of the ideal tone",
    "hook_style": "What kind of hook would work best",
    "structural_approach": "How to structure the post",
    "things_to_avoid": ["avoid1", "avoid2"],
    "engagement_style": "How to end and drive engagement",
    "formatting_tips": ["tip1", "tip2"]
}}"""

CONTENT_AGENT_PROMPT = """You are the Content Agent. Your role is to analyze source material and extract the most valuable insights for creating a LinkedIn post.

SOURCE TYPE: {source_type}

SOURCE CONTENT:
{source_content}

{template_section}

Analyze this source material and extract:
1. The key insights worth sharing
2. The main message or takeaway
3. Supporting points that add value
4. Potential angles to explore
5. How to structure the content

Provide your analysis as JSON:
{{
    "key_insights": ["insight1", "insight2", "insight3"],
    "main_message": "The core message to communicate",
    "supporting_points": ["point1", "point2"],
    "potential_angles": ["angle1", "angle2"],
    "suggested_structure": "How to organize the post",
    "content_hooks": ["potential hook 1", "potential hook 2"]
}}"""

SYNTHESIS_AGENT_PROMPT = """You are the Synthesis Agent. Three specialist agents have analyzed a content creation request. Your job is to synthesize their analyses and create the final LinkedIn post.

=== IDENTITY ANALYSIS ===
{identity_analysis}

=== STYLE ANALYSIS ===
{style_analysis}

=== CONTENT ANALYSIS ===
{content_analysis}

{template_section}

{regeneration_feedback}

Create a LinkedIn post that:
1. Authentically represents the person's professional identity
2. Matches their communication style and tone
3. Effectively conveys the key insights from the source material
4. Uses an appropriate hook that grabs attention
5. Ends with engagement-driving content

IMPORTANT GUIDELINES:
- The hook should be punchy and attention-grabbing (first line people see)
- Keep the post focused and valuable
- Match the tone preferences exactly
- Avoid anything in the "things to avoid" list
- If a template structure was provided, follow it as guidance
- If regeneration_feedback is provided, address those specific concerns

Output the final post as JSON:
{{
    "hook": "The attention-grabbing first line",
    "body": "The complete post including hook and body",
    "topic": "A short topic label (2-4 words)",
    "confidence": 0.85,
    "reasoning": "Brief explanation of how the post reflects all three analyses"
}}"""

REVIEW_AGENT_PROMPT = """You are the Review Agent, a strict quality gatekeeper. Your role is to ensure the generated LinkedIn post meets EXCELLENT quality standards before it's saved. Be thorough and demanding - only approve posts that are truly great.

=== GENERATED POST ===
Hook: {hook}
Body: {body}

=== IDENTITY GUIDELINES ===
{identity_analysis}

=== STYLE REQUIREMENTS ===
{style_analysis}

=== CONTENT SOURCE ===
Source Type: {source_type}
Source Content Preview: {source_content_preview}

Review the post with STRICT quality standards. Check:

1. STYLE ADHERENCE (MUST BE PERFECT):
   - Does the tone EXACTLY match the recommended tone? (Not just close, but precise)
   - Does the hook style match preferences? (Check preferred hook styles)
   - Is the formatting appropriate? (Proper spacing, line breaks, emoji usage)
   - Does it COMPLETELY avoid all taboo topics? (Zero tolerance)
   - Does it follow format preferences? (Structure, length, style)

2. IDENTITY ALIGNMENT (MUST BE AUTHENTIC):
   - Does it authentically reflect the professional positioning? (Not generic)
   - Are relevant expertise areas naturally highlighted? (Not forced)
   - Does it speak appropriately to the target audience? (Right level, right language)
   - Does it maintain brand consistency? (Voice, values, themes)

3. CONTENT QUALITY (MUST BE EXCELLENT):
   - Is the hook TRULY compelling and attention-grabbing? (Would you stop scrolling?)
   - Is the hook unique and not generic/cliché? (Avoid "Here's what I learned...")
   - Does the body provide REAL value? (Actionable insights, not fluff)
   - Is the body well-structured with clear flow? (Logical progression)
   - Are there specific examples, data, or concrete details? (Not vague)
   - Does it effectively convey the key insights from source material? (All important points covered)
   - Is the engagement call-to-action compelling and specific? (Not just "What do you think?")
   - Is the writing crisp and engaging? (No filler, every word counts)
   - Does it have personality and voice? (Not robotic or generic)

4. FORMATTING & STRUCTURE (MUST BE PROFESSIONAL):
   - Is the post properly formatted for LinkedIn? (Short paragraphs, white space)
   - Is it an appropriate length? (1300-3000 characters ideal, not too short/long)
   - Are paragraphs well-structured? (One idea per paragraph, 2-4 lines max)
   - Is there proper use of line breaks? (Not a wall of text)
   - Are emojis used appropriately? (If used, sparingly and meaningfully)
   - Is the hook on its own line? (First impression matters)

5. APPROPRIATENESS & PROFESSIONALISM (ZERO TOLERANCE):
   - Is the content professional and appropriate? (No casual language unless style allows)
   - Are there any offensive, controversial, or inappropriate elements? (None allowed)
   - Does it maintain brand consistency? (Aligned with identity)
   - Is it free of typos, grammar errors, or awkward phrasing? (Must be polished)

6. ENGAGEMENT POTENTIAL (MUST BE HIGH):
   - Would this post generate meaningful engagement? (Comments, shares, saves)
   - Is there a clear value proposition? (Why should someone read this?)
   - Does it invite discussion or action? (Not just informational)
   - Is it shareable? (Would someone want to share this?)

QUALITY THRESHOLD:
- Overall score must be >= 0.85 to approve
- Any critical issues = automatic regeneration
- 2+ major issues = regeneration required
- Minor issues are acceptable only if overall quality is exceptional

Be STRICT. A mediocre post should be regenerated. Only approve if:
- Style adherence is perfect
- Content quality is excellent (not just good)
- Writing is polished and engaging
- Value is clear and substantial
- Engagement potential is high

Provide your review as JSON:
{{
    "approved": true or false,
    "overall_score": 0.0-1.0,
    "issues": [
        {{
            "category": "style|identity|quality|formatting|appropriateness|engagement",
            "severity": "critical|major|minor",
            "description": "What's wrong (be specific)",
            "suggestion": "How to fix it (be actionable)"
        }}
    ],
    "strengths": ["What works well"],
    "recommendation": "approve|regenerate",
    "regeneration_guidance": "Specific, actionable instructions for regeneration if needed. Be detailed about what needs to change."
}}

If approved is false, recommendation must be "regenerate" and regeneration_guidance must provide clear, actionable feedback."""


# ============================================================================
# Helper Functions
# ============================================================================

def get_tone_description(sliders: dict) -> str:
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


def _get_credentials():
    """Build GCP credentials from settings."""
    if settings.GCP_CLIENT_EMAIL and settings.GCP_PRIVATE_KEY:
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
    return None


# ============================================================================
# Multi-Agent Generator
# ============================================================================

class MultiAgentGenerator:
    """LangGraph-based multi-agent system for content generation."""

    def __init__(self):
        """Initialize the LLM and build the graph."""
        credentials = _get_credentials()

        # ChatGoogleGenerativeAI automatically uses Vertex AI when project and credentials are provided
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash-001",
            project=settings.GCP_PROJECT_ID,
            location=settings.GCP_LOCATION,
            credentials=credentials,
            temperature=0.7,
            max_output_tokens=2048,
        )

        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow."""
        workflow = StateGraph(GenerationState)

        # Add agent nodes
        workflow.add_node("identity_agent", self._identity_agent)
        workflow.add_node("style_agent", self._style_agent)
        workflow.add_node("content_agent", self._content_agent)
        workflow.add_node("synthesis_agent", self._synthesis_agent)
        workflow.add_node("review_agent", self._review_agent)

        # Set entry point and edges
        workflow.set_entry_point("identity_agent")
        workflow.add_edge("identity_agent", "style_agent")
        workflow.add_edge("style_agent", "content_agent")
        workflow.add_edge("content_agent", "synthesis_agent")
        workflow.add_edge("synthesis_agent", "review_agent")
        
        # Conditional edge: review can approve or request regeneration
        workflow.add_conditional_edges(
            "review_agent",
            self._should_regenerate,
            {
                "regenerate": "synthesis_agent",  # Go back to synthesis if issues found
                "approve": END,  # End if approved
            }
        )

        return workflow.compile()
    
    def _should_regenerate(self, state: GenerationState) -> str:
        """Determine if we should regenerate based on review feedback."""
        review = state.get("review_feedback", {})
        regeneration_count = state.get("regeneration_count", 0)
        
        # If review approved, we're done
        if state.get("review_approved") is True:
            return "approve"
        
        # If not approved but we've regenerated too many times, approve anyway
        # (to avoid infinite loops - max 2 regeneration attempts)
        if regeneration_count >= 2:
            logger.warning(f"Max regeneration attempts reached ({regeneration_count}). Approving draft despite issues.")
            return "approve"
        
        # Check review recommendation
        recommendation = review.get("recommendation", "").lower()
        if recommendation == "approve":
            return "approve"
        
        # Otherwise, regenerate
        logger.info(f"Review agent requested regeneration (attempt {regeneration_count + 1}/2)")
        return "regenerate"

    def _identity_agent(self, state: GenerationState) -> dict:
        """Analyze identity graph and provide content guidance."""
        identity = state["identity_data"]

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert at understanding professional identities and personal brands."),
            ("user", IDENTITY_AGENT_PROMPT),
        ])

        chain = prompt | self.llm | JsonOutputParser()

        try:
            result = chain.invoke({
                "current_role": identity.get("current_role", "Not specified"),
                "industry": identity.get("industry", "Not specified"),
                "expertise_areas": ", ".join(identity.get("expertise_areas", [])),
                "career_highlights": ", ".join(identity.get("career_highlights", [])),
                "themes": ", ".join(identity.get("themes", [])),
                "authority_angles": ", ".join(identity.get("authority_angles", [])),
                "target_audience": identity.get("target_audience", "Professionals"),
                "unique_angles": ", ".join(identity.get("unique_angles", [])),
                "content_pillars": ", ".join(identity.get("content_pillars", [])),
                "bio_summary": identity.get("bio_summary", ""),
            })
            logger.info("Identity Agent completed analysis")
            return {"identity_analysis": result}
        except Exception as e:
            logger.error(f"Identity Agent error: {e}")
            return {"identity_analysis": {"error": str(e)}}

    def _style_agent(self, state: GenerationState) -> dict:
        """Analyze style profile and provide tone guidance."""
        style = state["style_data"]
        tone_sliders = style.get("tone_sliders", {})

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert at understanding communication styles and personal voice."),
            ("user", STYLE_AGENT_PROMPT),
        ])

        chain = prompt | self.llm | JsonOutputParser()

        try:
            result = chain.invoke({
                "tone_description": get_tone_description(tone_sliders),
                "formal_casual": tone_sliders.get("formal_casual", 0.5),
                "technical_simple": tone_sliders.get("technical_simple", 0.5),
                "serious_playful": tone_sliders.get("serious_playful", 0.5),
                "humble_confident": tone_sliders.get("humble_confident", 0.5),
                "format_preferences": str(style.get("format_preferences", {})),
                "preferred_hooks": ", ".join(style.get("preferred_hooks", [])),
                "taboo_list": ", ".join(style.get("taboo_list", [])),
            })
            logger.info("Style Agent completed analysis")
            return {"style_analysis": result}
        except Exception as e:
            logger.error(f"Style Agent error: {e}")
            return {"style_analysis": {"error": str(e)}}

    def _content_agent(self, state: GenerationState) -> dict:
        """Extract insights from source material."""
        template_section = ""
        if state.get("template_content"):
            template_section = f"\nTEMPLATE TO FOLLOW:\n{state['template_content']}\n\nUse this template as structural guidance for the content."

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert at extracting valuable insights from content."),
            ("user", CONTENT_AGENT_PROMPT),
        ])

        chain = prompt | self.llm | JsonOutputParser()

        try:
            result = chain.invoke({
                "source_type": state["source_type"],
                "source_content": state["source_content"][:8000],  # Limit content length
                "template_section": template_section,
            })
            logger.info("Content Agent completed analysis")
            return {"content_analysis": result}
        except Exception as e:
            logger.error(f"Content Agent error: {e}")
            return {"content_analysis": {"error": str(e)}}

    def _synthesis_agent(self, state: GenerationState) -> dict:
        """Synthesize all analyses into final draft."""
        template_section = ""
        if state.get("template_content"):
            template_section = f"\nTEMPLATE STRUCTURE TO FOLLOW:\n{state['template_content']}"
        
        # Include regeneration feedback if this is a regeneration
        regeneration_feedback = ""
        review_feedback = state.get("review_feedback", {})
        if review_feedback and review_feedback.get("regeneration_guidance"):
            regeneration_feedback = f"\n=== REGENERATION FEEDBACK ===\nThe previous draft had issues. Please address:\n{review_feedback['regeneration_guidance']}\n\nIssues found:\n"
            for issue in review_feedback.get("issues", []):
                regeneration_feedback += f"- [{issue.get('severity', 'unknown').upper()}] {issue.get('category', 'unknown')}: {issue.get('description', '')}\n"
            regeneration_feedback += "\nPlease regenerate with these concerns addressed.\n"

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert LinkedIn content creator who synthesizes multiple perspectives into compelling posts."),
            ("user", SYNTHESIS_AGENT_PROMPT),
        ])

        chain = prompt | self.llm | JsonOutputParser()

        try:
            result = chain.invoke({
                "identity_analysis": json.dumps(state.get("identity_analysis", {}), indent=2),
                "style_analysis": json.dumps(state.get("style_analysis", {}), indent=2),
                "content_analysis": json.dumps(state.get("content_analysis", {}), indent=2),
                "template_section": template_section,
                "regeneration_feedback": regeneration_feedback,
            })
            logger.info("Synthesis Agent completed - draft generated")
            return {"final_draft": result}
        except Exception as e:
            logger.error(f"Synthesis Agent error: {e}")
            return {"final_draft": {"error": str(e)}}
    
    def _review_agent(self, state: GenerationState) -> dict:
        """Review and validate the generated draft."""
        final_draft = state.get("final_draft", {})
        
        if not final_draft or "error" in final_draft:
            return {
                "review_approved": False,
                "review_feedback": {
                    "approved": False,
                    "overall_score": 0.0,
                    "issues": [{
                        "category": "quality",
                        "severity": "critical",
                        "description": "Draft generation failed",
                        "suggestion": "Regenerate the draft"
                    }],
                    "recommendation": "regenerate",
                    "regeneration_guidance": "The draft generation failed. Please try again."
                },
                "regeneration_count": state.get("regeneration_count", 0) + 1,
            }
        
        hook = final_draft.get("hook", "")
        body = final_draft.get("body", "")
        
        if not hook or not body:
            return {
                "review_approved": False,
                "review_feedback": {
                    "approved": False,
                    "overall_score": 0.0,
                    "issues": [{
                        "category": "quality",
                        "severity": "critical",
                        "description": "Draft is missing required fields (hook or body)",
                        "suggestion": "Ensure both hook and body are generated"
                    }],
                    "recommendation": "regenerate",
                    "regeneration_guidance": "The draft is incomplete. Please ensure both hook and body are generated."
                },
                "regeneration_count": state.get("regeneration_count", 0) + 1,
            }
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a quality assurance expert who reviews LinkedIn content for style adherence, quality, and appropriateness."),
            ("user", REVIEW_AGENT_PROMPT),
        ])

        chain = prompt | self.llm | JsonOutputParser()

        try:
            # Prepare source content preview (truncated)
            source_preview = state.get("source_content", "")[:500] + "..." if len(state.get("source_content", "")) > 500 else state.get("source_content", "")
            
            result = chain.invoke({
                "hook": hook,
                "body": body,
                "identity_analysis": json.dumps(state.get("identity_analysis", {}), indent=2),
                "style_analysis": json.dumps(state.get("style_analysis", {}), indent=2),
                "source_type": state.get("source_type", "unknown"),
                "source_content_preview": source_preview,
            })
            
            approved = result.get("approved", False)
            overall_score = result.get("overall_score", 0.0)
            issues = result.get("issues", [])
            
            # Additional quality gates: enforce strict quality standards
            critical_issues = [issue for issue in issues if issue.get("severity") == "critical"]
            major_issues = [issue for issue in issues if issue.get("severity") == "major"]
            
            # Quality gate 1: Score threshold (must be >= 0.85)
            if approved and overall_score < 0.85:
                logger.warning(f"Review approved but score ({overall_score:.2f}) below quality threshold (0.85). Regenerating.")
                approved = False
                result["approved"] = False
                result["recommendation"] = "regenerate"
                if not result.get("regeneration_guidance"):
                    result["regeneration_guidance"] = f"Overall quality score ({overall_score:.2f}) is below the 0.85 threshold. Improve content quality, engagement potential, writing polish, and ensure the post provides substantial value."
            
            # Quality gate 2: Critical issues (zero tolerance)
            if critical_issues:
                approved = False
                result["approved"] = False
                result["recommendation"] = "regenerate"
                logger.warning(f"Critical issues found: {len(critical_issues)}. Regenerating.")
                if not result.get("regeneration_guidance"):
                    critical_descriptions = [f"{issue.get('category')}: {issue.get('description')}" for issue in critical_issues]
                    result["regeneration_guidance"] = f"Critical issues must be fixed: {'; '.join(critical_descriptions)}"
            
            # Quality gate 3: Too many major issues (2+ = regenerate)
            if len(major_issues) >= 2:
                approved = False
                result["approved"] = False
                result["recommendation"] = "regenerate"
                logger.warning(f"Too many major issues found: {len(major_issues)}. Regenerating.")
                if not result.get("regeneration_guidance"):
                    major_descriptions = [f"{issue.get('category')}: {issue.get('description')}" for issue in major_issues[:3]]
                    result["regeneration_guidance"] = f"Multiple major issues found ({len(major_issues)}). Address: {'; '.join(major_descriptions)}"
            
            status = "APPROVED" if approved else "REQUIRES REGENERATION"
            logger.info(f"Review Agent completed - {status} (Score: {overall_score:.2f}, Total Issues: {len(issues)}, Critical: {len(critical_issues)}, Major: {len(major_issues)})")
            
            # Increment regeneration count only if not approved (we're about to regenerate)
            new_count = state.get("regeneration_count", 0)
            if not approved:
                new_count += 1
            
            return {
                "review_approved": approved,
                "review_feedback": result,
                "regeneration_count": new_count,
            }
        except Exception as e:
            logger.error(f"Review Agent error: {e}")
            # On error, approve to avoid blocking (but log the issue)
            return {
                "review_approved": True,
                "review_feedback": {
                    "approved": True,
                    "overall_score": 0.7,
                    "issues": [],
                    "note": f"Review check failed but approving draft: {str(e)}"
                },
                "regeneration_count": state.get("regeneration_count", 0),
            }

    async def generate(
        self,
        db: AsyncSession,
        profile_id: UUID,
        source_type: str,
        source_data: dict,
        template_id: Optional[UUID] = None,
    ) -> Draft:
        """Run the multi-agent generation workflow and save the draft.

        Args:
            db: Database session
            profile_id: Profile UUID
            source_type: Type of source (scratch, youtube, article, pdf, audio, format)
            source_data: Source-specific data (topic, transcript, content, etc.)
            template_id: Optional template UUID for structural guidance

        Returns:
            Created Draft object
        """
        # Load profile with identity and style
        result = await db.execute(
            select(Profile)
            .options(
                selectinload(Profile.identity_graph),
                selectinload(Profile.style_profile),
            )
            .where(Profile.id == profile_id, Profile.is_active == True)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            raise ValueError("Profile not found or inactive.")

        identity = profile.identity_graph
        style = profile.style_profile

        if not identity:
            raise ValueError("Profile has no identity graph. Please complete onboarding first.")

        # Load template if provided
        template_content = None
        if template_id:
            template_result = await db.execute(
                select(Template).where(Template.id == template_id, Template.is_active == True)
            )
            template = template_result.scalar_one_or_none()
            if template:
                template_content = template.content

        # Prepare source content based on type
        source_content = self._prepare_source_content(source_type, source_data)

        # Prepare identity data
        identity_data = {
            "current_role": identity.current_role,
            "industry": identity.industry,
            "expertise_areas": identity.expertise_areas or [],
            "career_highlights": identity.career_highlights or [],
            "themes": identity.themes or [],
            "authority_angles": identity.authority_angles or [],
            "target_audience": identity.target_audience,
            "unique_angles": identity.unique_angles or [],
            "content_pillars": identity.content_pillars or [],
            "bio_summary": identity.bio_summary,
        }

        # Prepare style data
        style_data = {
            "tone_sliders": style.tone_sliders if style else {},
            "format_preferences": style.format_preferences if style else {},
            "preferred_hooks": style.preferred_hooks if style else [],
            "taboo_list": style.taboo_list if style else [],
        }

        # Build initial state
        initial_state: GenerationState = {
            "identity_data": identity_data,
            "style_data": style_data,
            "source_type": source_type,
            "source_content": source_content,
            "template_content": template_content,
            "identity_analysis": None,
            "style_analysis": None,
            "content_analysis": None,
            "final_draft": None,
            "review_approved": None,
            "review_feedback": None,
            "regeneration_count": 0,
        }

        # Run the graph
        logger.info(f"Starting multi-agent generation for profile {profile_id}, source_type={source_type}")
        final_state = self.graph.invoke(initial_state)

        # Extract final draft
        final_draft = final_state.get("final_draft", {})

        if not final_draft or "error" in final_draft:
            raise ValueError(f"Generation failed: {final_draft.get('error', 'Unknown error')}")

        if not final_draft.get("hook") or not final_draft.get("body"):
            raise ValueError("Generation produced incomplete draft. Please try again.")
        
        # Check if review approved (should be True if we reached END)
        review_approved = final_state.get("review_approved")
        if review_approved is False:
            # This shouldn't happen if the graph worked correctly, but log it
            review_feedback = final_state.get("review_feedback", {})
            issues = review_feedback.get("issues", [])
            logger.warning(f"Draft was not approved by review agent. Issues: {issues}")
            # Still proceed, but log the warning

        # Create draft record
        draft = Draft(
            profile_id=profile.id,
            template_id=template_id,
            status=DraftStatus.INBOX,
            format=DraftFormat.POST,
            hook=final_draft["hook"],
            body=final_draft["body"],
            topic=final_draft.get("topic", source_data.get("topic", "Generated Post")),
            confidence=final_draft.get("confidence", 0.7),
            sources_json=[{
                "type": source_type,
                "data": {k: v[:100] if isinstance(v, str) else v for k, v in source_data.items()},
                "reasoning": final_draft.get("reasoning", ""),
                "review_feedback": final_state.get("review_feedback"),
                "regeneration_count": final_state.get("regeneration_count", 0),
            }],
            generated_by=AgentType.DRAFT_GENERATOR,
        )
        db.add(draft)
        await db.flush()

        # Track template usage if applicable
        if template_id:
            usage = TemplateUsage(
                template_id=template_id,
                draft_id=draft.id,
                profile_id=profile.id,
            )
            db.add(usage)

        await db.commit()
        await db.refresh(draft)

        logger.info(f"Generated draft {draft.id} using multi-agent system")
        return draft

    def _prepare_source_content(self, source_type: str, source_data: dict) -> str:
        """Prepare source content string based on type."""
        if source_type == "scratch":
            parts = [f"Topic: {source_data.get('topic', 'Not specified')}"]
            if source_data.get("key_points"):
                parts.append(f"Key Points: {', '.join(source_data['key_points'])}")
            if source_data.get("goal"):
                parts.append(f"Goal: {source_data['goal']}")
            return "\n".join(parts)

        elif source_type in ("youtube", "audio"):
            return f"Transcript:\n{source_data.get('transcript', '')}"

        elif source_type == "article":
            title = source_data.get("title", "Article")
            content = source_data.get("content", "")
            return f"Article Title: {title}\n\nArticle Content:\n{content}"

        elif source_type in ("pdf", "format"):
            return source_data.get("content", "")

        else:
            return str(source_data)
