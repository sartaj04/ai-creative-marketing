"""Google Gemini LLM provider using Vertex AI."""
import json
import logging
from typing import Any, Optional, Type

import vertexai
from google.oauth2 import service_account
from vertexai.generative_models import GenerativeModel, GenerationConfig
from pydantic import BaseModel

from app.core.config import settings
from app.llm.base import LLMProvider

logger = logging.getLogger(__name__)


# Pydantic model for resume extraction - Gemini will use this schema
class ResumeExtraction(BaseModel):
    """Schema for resume extraction results."""
    current_role: str = ""
    industry: str = ""
    years_experience: int = 0
    expertise_areas: list[str] = []
    top_skills: list[str] = []
    career_highlights: list[str] = []
    career_stage: str = ""
    education: list[dict] = []
    target_audience: str = ""
    desired_positioning: str = ""
    unique_angles: list[str] = []
    aspirations: str = ""
    goals: str = ""
    interests: list[str] = []
    beliefs: list[str] = []
    contrarian_views: list[str] = []
    content_pillars: list[str] = []
    narrative_themes: list[str] = []
    bio_summary: str = ""


class GeminiProvider(LLMProvider):
    """Google Gemini LLM provider using Vertex AI."""

    def __init__(self):
        """Initialize Gemini provider with Vertex AI credentials."""
        self._initialized = False
        self._model = None
        self._initialize_vertex_ai()

    def _initialize_vertex_ai(self):
        """Initialize Vertex AI with service account credentials."""
        try:
            if not settings.GCP_PROJECT_ID:
                logger.warning("GCP_PROJECT_ID not configured. Gemini will not work.")
                return

            # Build credentials from service account info
            if settings.GCP_CLIENT_EMAIL and settings.GCP_PRIVATE_KEY:
                credentials_info = {
                    "type": "service_account",
                    "project_id": settings.GCP_PROJECT_ID,
                    "private_key": settings.GCP_PRIVATE_KEY.replace("\\n", "\n"),
                    "client_email": settings.GCP_CLIENT_EMAIL,
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
                credentials = service_account.Credentials.from_service_account_info(
                    credentials_info,
                    scopes=["https://www.googleapis.com/auth/cloud-platform"],
                )

                vertexai.init(
                    project=settings.GCP_PROJECT_ID,
                    location=settings.GCP_LOCATION,
                    credentials=credentials,
                )
            else:
                # Fall back to default credentials (for local dev with gcloud auth)
                vertexai.init(
                    project=settings.GCP_PROJECT_ID,
                    location=settings.GCP_LOCATION,
                )

            self._model = GenerativeModel("gemini-2.5-flash")
            self._initialized = True
            logger.info("Vertex AI Gemini initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Vertex AI: {e}")
            self._initialized = False

    @property
    def name(self) -> str:
        return "gemini"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> str:
        """Generate text using Gemini via Vertex AI."""
        if not self._initialized or not self._model:
            raise RuntimeError("Gemini provider not initialized. Check GCP credentials.")

        try:
            # Combine system prompt and user prompt
            full_prompt = prompt
            if system_prompt:
                full_prompt = f"{system_prompt}\n\n{prompt}"

            # Configure generation
            generation_config = GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )

            response = self._model.generate_content(
                full_prompt,
                generation_config=generation_config,
            )

            # Handle response - check for truncation reasons
            if response and response.text:
                text_length = len(response.text)
                # Check finish reason to understand why generation stopped
                finish_reason = None
                if hasattr(response, 'candidates') and response.candidates:
                    candidate = response.candidates[0]
                    if hasattr(candidate, 'finish_reason'):
                        finish_reason = candidate.finish_reason
                
                if finish_reason:
                    logger.info(f"Gemini response: {text_length} chars, finish_reason: {finish_reason}, requested_max_tokens: {max_tokens}")
                    if finish_reason == 'MAX_TOKENS':
                        logger.warning(f"⚠️ Response truncated at MAX_TOKENS limit. Got {text_length} chars but requested {max_tokens} tokens")
                    elif finish_reason == 'SAFETY':
                        logger.warning(f"⚠️ Response stopped due to SAFETY filter")
                    elif finish_reason == 'STOP':
                        logger.info(f"Response completed normally (STOP)")
                else:
                    logger.info(f"Gemini response: {text_length} chars (finish_reason unknown)")
                
                return response.text
            else:
                logger.warning("Empty response from Gemini")
                return ""

        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            raise

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4000,
    ) -> dict[str, Any]:
        """Generate structured JSON response."""
        json_prompt = f"""
{prompt}

CRITICAL: Respond with ONLY valid JSON. No markdown code blocks, no explanations, no text before or after. Just the raw JSON object starting with {{ and ending with }}.
"""
        if system_prompt:
            json_prompt = f"{system_prompt}\n\n{json_prompt}"

        response = await self.generate(
            prompt=json_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        # Log raw response for debugging
        logger.debug(f"Raw LLM response length: {len(response)}")
        logger.debug(f"Raw response preview: {response[:200]}...")

        # Clean response and parse JSON
        cleaned = response.strip()
        
        # Check if response seems too short
        if len(cleaned) < 100:
            logger.warning(f"Response seems unusually short ({len(cleaned)} chars). Full response: {cleaned}")

        # Remove markdown code blocks if present (handle various formats)
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            # Find the closing ```
            end_idx = len(lines)
            for i, line in enumerate(lines):
                if i > 0 and (line.strip() == "```" or line.strip().startswith("```")):
                    end_idx = i
                    break
            cleaned = "\n".join(lines[1:end_idx]).strip()

        # Remove ```json prefix if present
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
        
        # Remove any leading/trailing whitespace
        cleaned = cleaned.strip()
        
        # Try to extract JSON if there's extra text
        # Find first { and last }
        first_brace = cleaned.find("{")
        last_brace = cleaned.rfind("}")
        
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            cleaned = cleaned[first_brace:last_brace + 1]

        try:
            parsed = json.loads(cleaned)
            if not isinstance(parsed, dict):
                raise ValueError(f"Parsed JSON is not a dict, got: {type(parsed)}")
            return parsed
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            logger.error(f"Response length: {len(cleaned)}")
            logger.error(f"Response preview (first 500 chars): {cleaned[:500]}")
            logger.error(f"Response preview (last 500 chars): {cleaned[-500:]}")
            
            # Check if JSON is incomplete (missing closing brace)
            open_braces = cleaned.count("{")
            close_braces = cleaned.count("}")
            if open_braces > close_braces:
                logger.warning(f"Incomplete JSON detected: {open_braces} opening braces, {close_braces} closing braces")
                # Try to complete it by adding missing closing braces
                missing_braces = open_braces - close_braces
                try:
                    completed = cleaned + "}" * missing_braces
                    parsed = json.loads(completed)
                    if isinstance(parsed, dict):
                        logger.info("Successfully completed incomplete JSON")
                        return parsed
                except json.JSONDecodeError:
                    pass
            
            # Try to find and extract JSON object more aggressively
            import re
            # Try to find the largest valid JSON object
            json_match = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if json_match:
                try:
                    parsed = json.loads(json_match.group(0))
                    logger.info("Successfully extracted JSON using regex fallback")
                    return parsed
                except json.JSONDecodeError:
                    pass
            
            raise ValueError(f"Failed to parse JSON response: {e}. Response length: {len(cleaned)}, Open braces: {open_braces}, Close braces: {close_braces}")

    async def extract_resume_structured(self, resume_text: str) -> dict[str, Any]:
        """Extract resume data using Gemini's native JSON mode with schema.
        
        This uses response_mime_type="application/json" for guaranteed valid JSON output.
        """
        if not self._initialized or not self._model:
            raise RuntimeError("Gemini provider not initialized. Check GCP credentials.")

        # Define the JSON schema for extraction with strict limits to control token usage
        response_schema = {
            "type": "object",
            "properties": {
                "current_role": {"type": "string", "description": "Most recent job title"},
                "industry": {"type": "string", "description": "Primary industry"},
                "years_experience": {"type": "integer", "description": "Total years of experience"},
                "expertise_areas": {
                    "type": "array",
                    "items": {"type": "string"},
                    "maxItems": 6,
                    "description": "Top 6 most relevant expertise areas"
                },
                "top_skills": {
                    "type": "array",
                    "items": {"type": "string"},
                    "maxItems": 12,
                    "description": "Top 12 most relevant technical/professional skills"
                },
                "career_highlights": {
                    "type": "array",
                    "items": {"type": "string"},
                    "maxItems": 6,
                    "description": "Top 6 most impactful achievements with metrics"
                },
                "career_stage": {
                    "type": "string",
                    "enum": ["Early Career", "Mid-Level", "Senior", "Executive", "Founder"]
                },
                "education": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "degree": {"type": "string"},
                            "school": {"type": "string"},
                            "year": {"type": "string"}
                        }
                    },
                    "maxItems": 3,
                    "description": "Highest 3 degrees/certifications"
                },
                "target_audience": {"type": "string", "description": "Who benefits from their expertise (1 sentence)"},
                "desired_positioning": {"type": "string", "description": "Professional positioning (1 sentence)"},
                "unique_angles": {
                    "type": "array",
                    "items": {"type": "string"},
                    "maxItems": 4,
                    "description": "Top 4 unique professional perspectives"
                },
                "goals": {"type": "string", "description": "Professional goals only (work-related, 1 sentence)"},
                "content_pillars": {
                    "type": "array",
                    "items": {"type": "string"},
                    "maxItems": 5,
                    "description": "Top 5 main content topics (work-related)"
                },
                "narrative_themes": {
                    "type": "array",
                    "items": {"type": "string"},
                    "maxItems": 4,
                    "description": "Top 4 recurring career themes"
                },
                "bio_summary": {"type": "string", "description": "2-3 sentence professional summary"}
            },
            "required": ["current_role", "industry", "years_experience", "expertise_areas", 
                        "top_skills", "career_highlights", "bio_summary"]
        }

        prompt = f"""Extract PROFESSIONAL/CAREER information from this LinkedIn profile. 
IMPORTANT: 
- Extract ONLY professional/career information: roles, skills, experience, achievements, education
- Do NOT extract beliefs, interests, aspirations, or personal values - these must come from direct questions
- Select only the TOP/MOST IMPORTANT items for each array field (respect maxItems limits)
- Keep string fields concise (1-2 sentences max)
- Prioritize recent experience and most significant achievements

LinkedIn Profile:
{resume_text}

Extract ONLY professional information following these guidelines:
- Current role, industry, years of experience
- Expertise areas and top skills
- Career highlights and achievements
- Education history
- Professional goals (work-related only)
- Target audience and positioning
- Content pillars and narrative themes (work-related)
- Bio summary (professional only)"""

        try:
            # Configure generation with JSON mode
            generation_config = GenerationConfig(
                temperature=0.2,
                max_output_tokens=8192,  # Increased to handle comprehensive extraction
                response_mime_type="application/json",
                response_schema=response_schema,
            )

            response = self._model.generate_content(
                prompt,
                generation_config=generation_config,
            )

            if response and response.text:
                response_text = response.text
                logger.info(f"Structured extraction response length: {len(response_text)}")
                
                # Check finish reason to see if response was truncated
                finish_reason = None
                if hasattr(response, 'candidates') and response.candidates:
                    candidate = response.candidates[0]
                    if hasattr(candidate, 'finish_reason'):
                        finish_reason = candidate.finish_reason
                
                if finish_reason == 'MAX_TOKENS':
                    logger.warning(f"Response truncated at MAX_TOKENS. Response length: {len(response_text)}")
                    # Try to fix incomplete JSON by finding the last complete object
                    # Find the last complete key-value pair or array item
                    try:
                        # Try to find where JSON might be incomplete
                        last_brace = response_text.rfind('}')
                        if last_brace != -1:
                            # Check if we have a complete JSON object up to this point
                            partial_json = response_text[:last_brace + 1]
                            try:
                                data = json.loads(partial_json)
                                logger.warning("Successfully parsed partial JSON after truncation")
                                return data
                            except json.JSONDecodeError:
                                pass
                    except Exception as e:
                        logger.error(f"Error trying to fix truncated JSON: {e}")
                
                # Parse the JSON response (should be valid by Gemini)
                try:
                    data = json.loads(response_text)
                    return data
                except json.JSONDecodeError as e:
                    logger.error(f"JSON parse error in structured extraction: {e}")
                    logger.error(f"Response length: {len(response_text)}")
                    logger.error(f"Response preview (first 500 chars): {response_text[:500]}")
                    logger.error(f"Response preview (last 500 chars): {response_text[-500:]}")
                    
                    # Try to fix incomplete JSON
                    # Check for unterminated strings or missing closing braces
                    open_braces = response_text.count('{')
                    close_braces = response_text.count('}')
                    open_brackets = response_text.count('[')
                    close_brackets = response_text.count(']')
                    
                    if open_braces > close_braces:
                        missing_braces = open_braces - close_braces
                        logger.warning(f"Incomplete JSON: missing {missing_braces} closing braces")
                        # Try to complete it
                        try:
                            completed = response_text + '}' * missing_braces
                            data = json.loads(completed)
                            logger.info("Successfully completed incomplete JSON")
                            return data
                        except json.JSONDecodeError:
                            pass
                    
                    # If we can't fix it, raise the error
                    raise ValueError(f"Failed to parse JSON from structured extraction: {e}. Response may be truncated.")
            else:
                logger.error("Empty response from Gemini structured extraction")
                return {}

        except Exception as e:
            logger.error(f"Gemini structured extraction error: {e}", exc_info=True)
            raise

    async def embed(self, text: str) -> list[float]:
        """Generate embedding using Vertex AI."""
        if not self._initialized:
            logger.warning("Gemini not initialized, returning zero vector")
            return [0.0] * 768

        try:
            from vertexai.language_models import TextEmbeddingModel

            model = TextEmbeddingModel.from_pretrained("text-embedding-004")
            embeddings = model.get_embeddings([text])

            if embeddings and len(embeddings) > 0:
                return embeddings[0].values
            return [0.0] * 768

        except Exception as e:
            logger.error(f"Gemini embedding error: {e}")
            return [0.0] * 768
