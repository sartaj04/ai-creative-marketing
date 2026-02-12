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

import boto3
from google.oauth2 import service_account
from langchain_aws import ChatBedrockConverse
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

    # Input data (persona_prompt replaces identity_data + style_data)
    persona_prompt: str  # Pre-synthesized natural language context
    source_type: str
    source_content: str
    template_content: Optional[str]
    template_meta: Optional[dict]  # Template metadata (flexibility, min/max length)

    # Agent outputs (identity_analysis and style_analysis removed - no longer needed)
    content_analysis: Optional[dict]
    length_decision: Optional[dict]  # Length Strategist output

    # Final output
    final_draft: Optional[dict]

    # Review feedback
    review_approved: Optional[bool]
    review_feedback: Optional[dict]
    regeneration_count: int  # Track how many times we've regenerated

    # Persona toggle
    use_persona: bool  # Whether to include professional identity

    # User feedback for regeneration
    user_feedback: Optional[str]
    previous_draft_body: Optional[str]


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

CONTENT_AGENT_PROMPT = """You are the Content Agent. Your role is to analyze source material and extract the most valuable insights for creating a social media post.

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

TEMPLATE HANDLING:
- If a template was provided above, your suggested_structure MUST follow the template's exact format. Identify which parts of the source content map to which template placeholders.
- If NO template was provided, suggest a natural structure that fits the content.

Provide your analysis as JSON:
{{
    "key_insights": ["insight1", "insight2", "insight3"],
    "main_message": "The core message to communicate",
    "supporting_points": ["point1", "point2"],
    "potential_angles": ["angle1", "angle2"],
    "suggested_structure": "How to organize the post (follow template if provided)",
    "content_hooks": ["potential hook 1", "potential hook 2"],
    "template_mapping": "Which source content maps to which template sections (only if template provided, otherwise null)"
}}"""

SYNTHESIS_AGENT_PROMPT = """You are the Synthesis Agent. Your job is to create the final post based on persona context and content analysis.

=== PERSONA CONTEXT ===
{persona_prompt}

=== CONTENT ANALYSIS ===
{content_analysis}

{template_section}

{regeneration_feedback}

{user_feedback_section}

Create a post that:
1. Authentically represents the writing style provided in the persona context
2. Matches their communication style and tone
3. Effectively conveys the key insights from the source material
4. Uses an appropriate hook that grabs attention
5. Ends with engagement-driving content

TEMPLATE RULES:
- If a STRICT VERBATIM MODE template was provided above, your ONLY job is to fill placeholders. Do NOT write freely. Do NOT add text. Do NOT paraphrase. Copy the template character-for-character and replace ONLY the {{placeholder}} markers with relevant content.
- If NO template was provided, write freely using the guidelines below.

IMPORTANT GUIDELINES:
1. The hook should be punchy and attention-grabbing (first line people see)
2. Keep the post focused and valuable
3. Match the tone preferences from the persona context exactly
4. Avoid anything mentioned in "things to avoid" in the persona context
5. If regeneration_feedback is provided, address those specific concerns

WRITING VOICE — SOUND HUMAN, NOT AI:
Write like you're texting a smart friend or posting a quick thought. Not like you're writing a blog post or giving a TED talk.

1. Use SIMPLE words. "use" not "utilize". "help" not "facilitate". "start" not "embark". "show" not "demonstrate". "think" not "conceptualize".
2. Write SHORT sentences. Then a longer one when you need it. Then short again. Real people don't write in uniform 15-word sentences.
3. Start sentences with "And", "But", "So", "Look,", "Thing is,". Real people do this.
4. Leave thoughts UNFINISHED sometimes. Not every paragraph needs a neat conclusion.
5. Be SPECIFIC. Not "I learned a lot from failure" but "I mass-emailed 200 investors with the wrong company name in the subject line."
6. Use contractions. "I'm", "don't", "can't", "it's", "that's", "won't". Always. No exceptions.
7. NEVER use these words/phrases: "landscape", "leverage", "navigate", "harness", "unlock", "delve", "foster", "utilize", "facilitate", "embark", "moreover", "furthermore", "it's worth noting", "at the end of the day", "game-changer", "deep dive", "unpack", "let that sink in", "read that again", "here's the thing", "spoiler alert", "plot twist", "in today's fast-paced world", "here's why this matters"
8. NEVER use dashes (—, –, -) for parenthetical thoughts. Use periods or restructure.
9. Don't wrap up with motivation. No "The future is bright." No "The possibilities are endless." No "And that's the real lesson." Just stop when you've made your point.
10. Don't start multiple sentences with "I". Mix it up.
11. No transition words between paragraphs. Don't write "Moreover", "Furthermore", "That said", "Having said that", "On the flip side". Just start the next thought.
12. CURRENT YEAR IS 2026.
13. Include at least one concrete, lived example (a specific time, place, mistake, or observation).
14. If appropriate, add 2-4 high-impact hashtags at the end (industry-specific or trending, NOT generic like #success #motivation).
15. LENGTH IS NON-NEGOTIABLE. Your post MUST fall within the target length range provided below. Count your words mentally before outputting.
    - If target is under 50 words: write a VERY SHORT post. 2-3 lines. A single punchy thought. Stop immediately.
    - If target is 50-120 words: write a SHORT punchy post. 3-5 lines max. Stop when you've made the point.
    - If target is 120-250 words: write a MEDIUM post. Enough room for one key insight.
    - If target is 250-500 words: write a LONG detailed post. Multi-paragraph with depth and texture.
    - Do NOT default to medium. A 40-word observation can be more powerful than a padded 200-word post.

Output the final post as JSON:
{{
    "hook": "The attention-grabbing first line",
    "body": "The complete post including hook and body",
    "topic": "A short topic label (2-4 words)",
    "hashtags": ["#Tag1", "#Tag2"],
    "confidence": 0.85,
    "reasoning": "Brief explanation of how the post reflects the persona and content"
}}"""

REVIEW_AGENT_PROMPT = """You are the Review Agent, a strict quality gatekeeper. Your role is to ensure the generated post meets EXCELLENT quality standards and sounds like a real human wrote it. Be thorough and demanding.

=== GENERATED POST ===
Hook: {hook}
Body: {body}

=== PERSONA CONTEXT ===
{persona_prompt}

=== CONTENT SOURCE ===
Source Type: {source_type}
Source Content Preview: {source_content_preview}

Review the post with STRICT quality standards. Check:

1. AI-LANGUAGE DETECTION (STRICT — reject if ANY present):
   - Words: "landscape", "leverage", "navigate", "harness", "unlock", "delve", "foster", "utilize", "facilitate", "embark", "conceptualize"
   - Phrases: "it's worth noting", "at the end of the day", "game-changer", "deep dive", "unpack", "let that sink in", "read that again", "here's the thing", "spoiler alert", "plot twist", "Moreover", "Furthermore", "That said", "Having said that", "in today's fast-paced world", "here's why this matters"
   - Patterns: More than 3 dashes (—, –, -) in the post
   - Patterns: All paragraphs roughly same length (±1 sentence). Real writing has varied paragraph lengths.
   - Patterns: Every paragraph starts with "I". Need varied sentence openers.
   - Patterns: Post ends with motivational platitude or "The possibilities are endless"-type closer
   - Patterns: No contractions used. Real people always use contractions.
   - Patterns: Formulaic opening like "I've spent X years..." / "In today's..." / "Here's why..."
   If ANY of the above are found, mark as critical issue and reject.

2. STYLE ADHERENCE:
   - Does the tone match the persona context? (Not just close, but precise)
   - Does the hook grab attention? (Would you stop scrolling?)
   - Does it COMPLETELY avoid all taboo topics? (Zero tolerance)
   - Does it use simple, conversational language? (Not corporate or academic)

3. IDENTITY ALIGNMENT:
   - Does it authentically reflect who this person is? (Not generic thought leadership)
   - Does it speak appropriately to their audience?

4. CONTENT QUALITY:
   - Does the body provide REAL value? (Actionable insights, not fluff)
   - Are there specific examples, data, or concrete details? (Not vague)
   - Does it include at least one lived, specific example? (time, place, specific observation)
   - Is the writing crisp? (No filler, every word counts)

5. TEMPLATE COMPLIANCE:
   - If a template was provided, compare the generated post against the template CHARACTER BY CHARACTER.
   - Every non-placeholder word in the template MUST appear exactly in the output, unchanged.
   - If ANY non-placeholder text has been paraphrased, reworded, or restructured, mark as CRITICAL template compliance failure.
   - Are template placeholders filled with relevant content?
   - If no template was provided, is the structure appropriate for the content?

6. FORMATTING & LENGTH:
   - Is it an appropriate length? ({target_length_range})
   - Short paragraphs, proper line breaks, not a wall of text
   - Are hashtags (if present) industry-specific? (NOT generic like #success #motivation)

QUALITY THRESHOLD:
- Overall score must be >= 0.85 to approve
- Any critical issues (especially AI-language) = automatic regeneration
- 2+ major issues = regeneration required

Provide your review as JSON:
{{
    "approved": true or false,
    "overall_score": 0.0-1.0,
    "issues": [
        {{
            "category": "ai_language|style|identity|quality|template|formatting",
            "severity": "critical|major|minor",
            "description": "What's wrong (be specific)",
            "suggestion": "How to fix it (be actionable)"
        }}
    ],
    "strengths": ["What works well"],
    "recommendation": "approve|regenerate",
    "regeneration_guidance": "Specific, actionable instructions for regeneration if needed."
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
        """Initialize the LLMs and build the graph."""
        credentials = _get_credentials()

        # Gemini LLM for Identity, Style, and Content agents (simpler analysis tasks)
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            project=settings.GCP_PROJECT_ID,
            location=settings.GCP_LOCATION,
            credentials=credentials,
            temperature=0.7,
            max_output_tokens=2048,
        )

        # Claude LLM for Synthesis and Review agents (quality-critical tasks)
        self.claude_llm = self._init_claude_llm()

        self.graph = self._build_graph()

    def _init_claude_llm(self):
        """Initialize Claude LLM via Bedrock for quality-critical agents.

        Returns ChatBedrockConverse instance, or None if Bedrock credentials
        are not configured (agents will fall back to Gemini).
        """
        if not settings.AWS_BEDROCK_ACCESS_KEY_ID or not settings.AWS_BEDROCK_SECRET_ACCESS_KEY:
            logger.warning(
                "AWS Bedrock credentials not configured. "
                "Synthesis and Review agents will fall back to Gemini."
            )
            return None

        try:
            bedrock_client = boto3.client(
                "bedrock-runtime",
                region_name=settings.AWS_BEDROCK_REGION,
                aws_access_key_id=settings.AWS_BEDROCK_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_BEDROCK_SECRET_ACCESS_KEY,
            )

            claude_llm = ChatBedrockConverse(
                client=bedrock_client,
                model=settings.BEDROCK_MODEL_ID,
                temperature=0.7,
                max_tokens=4096,
            )

            logger.info(
                f"Claude LLM initialized via Bedrock "
                f"(model={settings.BEDROCK_MODEL_ID}, region={settings.AWS_BEDROCK_REGION})"
            )
            return claude_llm

        except Exception as e:
            logger.error(f"Failed to initialize Claude LLM: {e}. Falling back to Gemini.")
            return None

    def _invoke_with_fallback(
        self,
        prompt: ChatPromptTemplate,
        variables: dict,
        agent_name: str,
    ) -> dict:
        """Invoke an LLM chain, preferring Claude with Gemini fallback.

        Args:
            prompt: The ChatPromptTemplate to use
            variables: Template variables to pass to invoke()
            agent_name: Name of the agent (for logging)

        Returns:
            Parsed JSON dict from the LLM response

        Raises:
            Exception: If both Claude and Gemini fail
        """
        llm = self.claude_llm if self.claude_llm is not None else self.llm
        provider_name = "claude" if llm is not self.llm else "gemini"
        chain = prompt | llm | JsonOutputParser()

        try:
            result = chain.invoke(variables)
            logger.info(f"{agent_name} completed (using {provider_name})")
            return result
        except Exception as e:
            if llm is not self.llm:
                logger.warning(f"{agent_name} failed with Claude: {e}. Retrying with Gemini.")
                fallback_chain = prompt | self.llm | JsonOutputParser()
                result = fallback_chain.invoke(variables)
                logger.info(f"{agent_name} completed via Gemini fallback")
                return result
            raise

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow.
        
        Optimized 3-agent flow (was 5 agents):
        Content Agent → Length Strategist → Synthesis Agent → Review Agent
        
        Identity/Style agents removed - persona_prompt now provides this context.
        """
        workflow = StateGraph(GenerationState)

        # Add agent nodes (identity_agent and style_agent removed)
        workflow.add_node("content_agent", self._content_agent)
        workflow.add_node("length_strategist", self._length_strategist_node)
        workflow.add_node("synthesis_agent", self._synthesis_agent)
        workflow.add_node("review_agent", self._review_agent)

        # Set entry point and edges
        workflow.set_entry_point("content_agent")
        workflow.add_edge("content_agent", "length_strategist")
        workflow.add_edge("length_strategist", "synthesis_agent")
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

    def _length_strategist_node(self, state: GenerationState) -> dict:
        """Length Strategist: Determine optimal content length."""
        content = state.get("content_analysis", {})
        if not content:
            # Fallback if content analysis failed
            return {"length_decision": None}
            
        logger.info("Length Strategist analyzing optimal length")
        
        try:
            from app.services.length_strategist import LengthStrategistService
            import asyncio
            
            strategist = LengthStrategistService()
            template_meta = state.get("template_meta", {})
            
            # Use content analysis to inform the decision
            topic = content.get("main_message", "General Content")
            brief = f"Main message: {content.get('main_message')}. Insights: {', '.join(content.get('key_insights', [])[:3])}"
            
            # Infer content mode from content analysis for mode-aware length ranges
            # (observer→short, narrator→long, etc.)
            suggested_structure = content.get("suggested_structure", "")
            potential_angles = content.get("potential_angles", [])
            # Simple heuristic: if analysis suggests storytelling → narrator, if short observation → observer
            content_mode = None
            if any(kw in str(suggested_structure).lower() for kw in ["story", "narrative", "personal", "experience"]):
                content_mode = "narrator"
            elif any(kw in str(suggested_structure).lower() for kw in ["observation", "quick", "short", "brief"]):
                content_mode = "observer"
            elif any(kw in str(suggested_structure).lower() for kw in ["how", "step", "framework", "guide"]):
                content_mode = "explainer"
            
            # Determine optimal length (sync wrapper for async call)
            decision = asyncio.run(strategist.determine_optimal_length(
                topic=topic,
                template_category=template_meta.get("category"),
                template_flexibility=template_meta.get("length_flexibility", "flexible"),
                template_min=template_meta.get("min_length"),
                template_max=template_meta.get("max_length"),
                brief_description=brief,
                user_length_patterns=None,
                content_mode=content_mode,
            ))
            
            logger.info(
                f"Length decision: {decision['target_min_words']}-{decision['target_max_words']} words. "
                f"Reason: {decision['reasoning'][:50]}..."
            )
            
            return {"length_decision": decision}
            
        except Exception as e:
            logger.error(f"Length Strategist error: {e}", exc_info=True)
            return {"length_decision": None}


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
            import re as _re
            placeholders = _re.findall(r'\{(\w+)\}', state["template_content"])
            placeholder_list = ", ".join([f"{{{p}}}" for p in placeholders])
            template_section = f"\nTEMPLATE TO FOLLOW (MUST match this structure EXACTLY):\n{state['template_content']}\n\nPLACEHOLDERS FOUND: {placeholder_list}\n\nYou MUST provide a specific 'template_mapping' in your JSON output that maps each placeholder to the specific content that should fill it. For each placeholder, determine the best content from the source material."

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
        import re as _re

        template_section = ""
        if state.get("template_content"):
            template_text = state["template_content"]
            placeholders = _re.findall(r'\{(\w+)\}', template_text)
            placeholder_list = ", ".join([f"{{{p}}}" for p in placeholders])
            placeholder_plan = "\n".join([f"   - {{{p}}}: [determine from content analysis]" for p in placeholders])

            template_section = f"""
=== TEMPLATE (STRICT VERBATIM MODE) ===

TEMPLATE TEXT:
---
{template_text}
---

PLACEHOLDERS FOUND: {placeholder_list}

STRICT INSTRUCTIONS:
1. Your output body MUST be the EXACT template text above with ONLY the placeholders replaced.
2. Every word, punctuation mark, line break, and emoji in the template that is NOT a {{placeholder}} must appear EXACTLY as-is in your output.
3. You are NOT allowed to paraphrase, reword, restructure, add transitions, or change ANY non-placeholder text.
4. For each placeholder, determine the best content to fill it based on the content analysis:
{placeholder_plan}
5. Then, output the template with placeholders literally replaced.
6. The hook should be the first line of the resulting filled template.
7. DO NOT add any text before or after the template. The filled template IS the complete post.
"""

        # Include regeneration feedback if this is a regeneration
        regeneration_feedback = ""
        review_feedback = state.get("review_feedback", {})
        if review_feedback and review_feedback.get("regeneration_guidance"):
            regeneration_feedback = f"\n=== REGENERATION FEEDBACK ===\nThe previous draft had issues. Please address:\n{review_feedback['regeneration_guidance']}\n\nIssues found:\n"
            for issue in review_feedback.get("issues", []):
                regeneration_feedback += f"- [{issue.get('severity', 'unknown').upper()}] {issue.get('category', 'unknown')}: {issue.get('description', '')}\n"
            regeneration_feedback += "\nPlease regenerate with these concerns addressed.\n"

        # Include user feedback for regeneration
        user_feedback_section = ""
        user_feedback = state.get("user_feedback")
        previous_draft_body = state.get("previous_draft_body")
        if user_feedback or previous_draft_body:
            user_feedback_section = "\n=== USER FEEDBACK ON PREVIOUS DRAFT ===\n"
            if previous_draft_body:
                user_feedback_section += f"Previous draft (for reference):\n{previous_draft_body[:2000]}\n\n"
            if user_feedback:
                user_feedback_section += f"User's feedback: {user_feedback}\n"
            user_feedback_section += "IMPORTANT: Address the user's feedback specifically. Rewrite the post to incorporate their requested changes while maintaining quality.\n"

        # Include length guidance
        length_guidance = ""
        length_decision = state.get("length_decision")
        if length_decision:
            length_guidance = (
                f"\nTARGET LENGTH: {length_decision['target_min_words']}-{length_decision['target_max_words']} words\n"
                f"LENGTH STRATEGY: {length_decision.get('reasoning', '')}\n"
                f"STRUCTURE SUGGESTION: {length_decision.get('structure_suggestion', '')}\n"
            )

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert LinkedIn content creator who synthesizes persona context and content insights into compelling posts. You MUST respond with ONLY valid JSON, no additional text."),
            ("user", SYNTHESIS_AGENT_PROMPT + "\n\n{length_guidance}"),
        ])

        variables = {
            "persona_prompt": state.get("persona_prompt", "No persona context available."),
            "content_analysis": json.dumps(state.get("content_analysis", {}), indent=2),
            "template_section": template_section,
            "regeneration_feedback": regeneration_feedback,
            "user_feedback_section": user_feedback_section,
            "length_guidance": length_guidance,
        }

        try:
            result = self._invoke_with_fallback(prompt, variables, "Synthesis Agent")
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
            ("system", "You are a quality assurance expert who reviews LinkedIn content for style adherence, quality, and appropriateness. You MUST respond with ONLY valid JSON, no additional text."),
            ("user", REVIEW_AGENT_PROMPT),
        ])

        try:
            # Prepare source content preview (truncated)
            source_preview = state.get("source_content", "")[:500] + "..." if len(state.get("source_content", "")) > 500 else state.get("source_content", "")
            
            # Get length decision for validation
            length_decision = state.get("length_decision", {
                "target_min_words": 150,
                "target_max_words": 250,
                "reasoning": "Default range",
            })
            target_length_range = f"{length_decision['target_min_words']}-{length_decision['target_max_words']} words"

            variables = {
                "hook": hook,
                "body": body,
                "persona_prompt": state.get("persona_prompt", "No persona context available."),
                "source_type": state.get("source_type", "unknown"),
                "source_content_preview": source_preview,
                "target_length_range": target_length_range,
            }

            result = self._invoke_with_fallback(prompt, variables, "Review Agent")

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
        use_persona: bool = True,
        feedback: Optional[str] = None,
        previous_draft_id: Optional[UUID] = None,
    ) -> Draft:
        """Run the multi-agent generation workflow and save the draft.

        Args:
            db: Database session
            profile_id: Profile UUID
            source_type: Type of source (scratch, youtube, article, pdf, audio, format)
            source_data: Source-specific data (topic, transcript, content, etc.)
            template_id: Optional template UUID for structural guidance
            use_persona: Whether to include professional identity in generation
            feedback: User feedback for regeneration
            previous_draft_id: ID of previous draft being regenerated

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

        # Get cached persona prompt (synthesized from identity + style)
        persona_prompt = profile.persona_prompt
        if not persona_prompt:
            # Fallback: generate on-the-fly if not cached (for backward compatibility)
            logger.warning(f"Profile {profile_id} has no cached persona_prompt, generating on-the-fly")
            from app.services.persona_synthesizer import PersonaSynthesizerService
            synthesizer = PersonaSynthesizerService()
            persona_prompt = await synthesizer.synthesize_persona_prompt(db, profile_id)
            if not persona_prompt:
                raise ValueError("Failed to generate persona prompt. Please complete onboarding first.")

        # When use_persona is False, build a style-only prompt (preserves writing voice without identity)
        if not use_persona:
            persona_prompt = self._build_style_only_prompt(style)

        # Load previous draft body if regenerating with feedback
        previous_draft_body = None
        if previous_draft_id:
            prev_result = await db.execute(
                select(Draft).where(Draft.id == previous_draft_id)
            )
            prev_draft = prev_result.scalar_one_or_none()
            if prev_draft:
                previous_draft_body = prev_draft.body

        # Load template if provided
        template_content = None
        template_meta = {}
        if template_id:
            template_result = await db.execute(
                select(Template).where(Template.id == template_id, Template.is_active == True)
            )
            template = template_result.scalar_one_or_none()
            if template:
                template_content = template.content
                template_meta = {
                    "category": template.category.value if template.category else None,
                    "length_flexibility": template.length_flexibility,
                    "min_length": template.min_length,
                    "max_length": template.max_length,
                }

        # Prepare source content based on type
        source_content = self._prepare_source_content(source_type, source_data)
        
        # Determine optimal length using Length Strategist
        from app.services.length_strategist import LengthStrategistService
        length_strategist = LengthStrategistService()

        # Extract writing patterns from persona if available
        writing_patterns = None
        if persona_prompt and "LENGTH PATTERNS:" in persona_prompt:
            start = persona_prompt.find("LENGTH PATTERNS:")
            end = persona_prompt.find("\n\n", start)
            if end > start:
                writing_patterns = persona_prompt[start:end]

        # Infer content_mode from source type for length variety
        source_to_mode = {
            "scratch": "builder",      # User writing from scratch = building something
            "youtube": "explainer",    # Repurposing video = explaining
            "audio": "narrator",       # Audio content = storytelling
            "article": "observer",     # Reacting to article = observing
            "pdf": "explainer",        # PDF content = explaining
            "format": None,            # Template-driven = let template decide
        }
        inferred_mode = source_to_mode.get(source_type)

        length_decision = await length_strategist.determine_optimal_length(
            topic=source_data.get("topic", "Content Generation"),
            template_category=template_meta.get("category"),
            template_flexibility=template_meta.get("length_flexibility", "flexible"),
            template_min=template_meta.get("min_length"),
            template_max=template_meta.get("max_length"),
            brief_description=source_content[:200],  # First 200 chars as brief
            user_length_patterns=writing_patterns,
            content_mode=inferred_mode,
        )

        # Build initial state (simplified - no need for identity_data/style_data)
        initial_state: GenerationState = {
            "persona_prompt": persona_prompt,
            "source_type": source_type,
            "source_content": source_content,
            "template_content": template_content,
            "template_meta": template_meta,
            "content_analysis": None,
            "length_decision": length_decision,
            "final_draft": None,
            "review_approved": None,
            "review_feedback": None,
            "regeneration_count": 0,
            "use_persona": use_persona,
            "user_feedback": feedback,
            "previous_draft_body": previous_draft_body,
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

    def _build_style_only_prompt(self, style) -> str:
        """Build a style-only persona prompt that preserves writing voice without identity details.

        Used when use_persona=False. Keeps HOW the user writes but strips WHO they are
        (career, role, expertise, stories, authority angles).
        """
        parts = [
            "You are writing a LinkedIn post. Match the following writing style exactly, "
            "but do NOT reference any specific professional identity, career, role, or personal background.\n"
        ]

        if style:
            tone_sliders = style.tone_sliders or {}
            tone_desc = get_tone_description(tone_sliders)
            parts.append(f"## TONE & VOICE\nWrite with a {tone_desc} tone.")
            parts.append(
                f"Tone sliders: formal/casual={tone_sliders.get('formal_casual', 0.5)}, "
                f"technical/simple={tone_sliders.get('technical_simple', 0.5)}, "
                f"serious/playful={tone_sliders.get('serious_playful', 0.5)}, "
                f"humble/confident={tone_sliders.get('humble_confident', 0.5)}"
            )

            if style.preferred_hooks:
                parts.append(f"\n## PREFERRED HOOK STYLES\n{', '.join(style.preferred_hooks)}")

            if style.taboo_list:
                parts.append(f"\n## TOPICS TO AVOID\n{', '.join(style.taboo_list)}")

            if style.writing_sample_insights:
                parts.append(f"\n## WRITING PATTERNS (from actual posts)\n{style.writing_sample_insights}")

            if style.detected_patterns:
                try:
                    from app.services.writing_sample_analyzer import WritingSampleAnalyzer
                    analyzer = WritingSampleAnalyzer()
                    patterns_text = analyzer.format_insights_for_persona(style.detected_patterns)
                    parts.append(f"\n## DETECTED STYLE PATTERNS\n{patterns_text}")
                except Exception:
                    pass

        parts.append(
            "\n## IMPORTANT CONSTRAINT\n"
            "Do NOT mention any specific professional role, company, industry expertise, "
            "career history, or personal stories. Write as a knowledgeable person sharing "
            "insights on the topic, without anchoring to any particular professional identity."
        )

        return "\n".join(parts)

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
