"""Extraction service for LinkedIn profiles and resumes."""
import asyncio
import json
import logging
import os
import re
from asyncio import TimeoutError as AsyncTimeoutError
from pathlib import Path
from typing import Any, Dict, Optional, Set

from apify_client import ApifyClient
from docx import Document as DocxDocument
from pypdf import PdfReader

from app.llm.gemini import GeminiProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

# LinkedIn URL validation pattern
LINKEDIN_URL_PATTERN = re.compile(
    r"^https?://(www\.)?linkedin\.com/in/[\w\-]+/?$",
    re.IGNORECASE,
)

# Whitelist of allowed LinkedIn fields to return (sanitization)
LINKEDIN_ALLOWED_FIELDS: Set[str] = {
    "firstName",
    "lastName",
    "headline",
    "summary",
    "locationName",
    "industryName",
    "experience",
    "education",
    "skills",
    "certifications",
    "languages",
    "publications",
    "projects",
    "connectionsCount",
    "profilePicture",
}


class LinkedInScraper:
    """Scraper for LinkedIn profiles using Apify.
    
    SAFETY MEASURES:
    - User-initiated only (user provides their own URL)
    - Rate limiting via delays
    - One-time extraction per user
    - No bulk scraping
    - Only public data (no cookies/auth)
    """

    APIFY_TIMEOUT_SECONDS = 120  # 2 minute timeout
    MAX_RETRIES = 2
    RETRY_DELAY_SECONDS = 5
    # Safety: Minimum delay between extractions (seconds)
    MIN_EXTRACTION_DELAY = 3
    MAX_EXTRACTION_DELAY = 8

    def __init__(self, api_token: Optional[str] = None):
        # Try multiple sources: passed token, environment variable, or settings
        self.api_token = api_token or os.getenv("APIFY_TOKEN") or getattr(settings, "APIFY_TOKEN", None)
        if not self.api_token:
            logger.warning("No Apify token found. LinkedIn extraction may fail.")
        self.client = ApifyClient(self.api_token) if self.api_token else None

    def _validate_linkedin_url(self, url: str) -> bool:
        """Validate LinkedIn URL format."""
        return bool(LINKEDIN_URL_PATTERN.match(url))

    def _sanitize_linkedin_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize LinkedIn response to only include whitelisted fields."""
        sanitized = {}
        for key in LINKEDIN_ALLOWED_FIELDS:
            if key in data:
                value = data[key]
                # Additional sanitization for nested structures
                if key == "experience" and isinstance(value, list):
                    sanitized[key] = [
                        {
                            k: v
                            for k, v in exp.items()
                            if k
                            in {
                                "title",
                                "companyName",
                                "locationName",
                                "description",
                                "startDate",
                                "endDate",
                                "timePeriod",
                            }
                        }
                        for exp in value
                        if isinstance(exp, dict)
                    ]
                elif key == "education" and isinstance(value, list):
                    sanitized[key] = [
                        {
                            k: v
                            for k, v in edu.items()
                            if k
                            in {
                                "schoolName",
                                "degreeName",
                                "fieldOfStudy",
                                "startDate",
                                "endDate",
                                "grade",
                            }
                        }
                        for edu in value
                        if isinstance(edu, dict)
                    ]
                elif key == "skills" and isinstance(value, list):
                    # Only keep skill names, not endorsement counts etc.
                    sanitized[key] = [
                        s.get("name") if isinstance(s, dict) else s
                        for s in value[:50]  # Limit to 50 skills
                    ]
                else:
                    sanitized[key] = value
        return sanitized

    async def scrape_profile(self, profile_url: str) -> Dict[str, Any]:
        """Scrape LinkedIn profile using Apify with timeout and retry.
        
        SAFETY: This is user-initiated extraction of their own profile only.
        We add delays to avoid detection patterns.
        """
        # Validate URL
        if not self._validate_linkedin_url(profile_url):
            raise ValueError(
                "Invalid LinkedIn URL format. Expected: linkedin.com/in/username"
            )

        if not self.client:
            raise ValueError("Apify token not configured.")
        
        # SAFETY: Add random delay to avoid detection patterns
        import random
        delay = random.uniform(self.MIN_EXTRACTION_DELAY, self.MAX_EXTRACTION_DELAY)
        logger.info(f"LinkedIn extraction: Adding {delay:.1f}s delay for safety")
        await asyncio.sleep(delay)

        # Using Dev Fusion's pay-per-use scraper (no monthly subscription)
        # Pricing: $10 per 1,000 profiles (includes email extraction)
        # Complies with LinkedIn ToS by scraping only public data without cookies
        actor_id = "dev_fusion/Linkedin-Profile-Scraper"
        
        # Ensure URL is in full format
        if not profile_url.startswith("http"):
            profile_url = f"https://{profile_url}"
        
        # Dev Fusion accepts LinkedIn profile URLs
        run_input = {
            "profileUrls": [profile_url],
        }

        last_error = None
        for attempt in range(self.MAX_RETRIES + 1):
            try:
                loop = asyncio.get_event_loop()

                # Run actor with timeout
                run = await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        lambda: self.client.actor(actor_id).call(run_input=run_input),
                    ),
                    timeout=self.APIFY_TIMEOUT_SECONDS,
                )
                
                # Check run status for errors
                run_status = run.get("status", "").upper()
                if run_status == "FAILED":
                    run_data = self.client.run(run["id"]).get()
                    error_msg = run_data.get("statusMessage") or run_data.get("defaultDatasetId")
                    if error_msg and ("free plan" in str(error_msg).lower() or "UI" in str(error_msg)):
                        raise ValueError("LinkedIn extraction requires a paid Apify plan. Free plans can only run actors through the UI. Please upgrade your Apify account or use resume upload instead.")
                    raise ValueError(f"Apify actor failed: {error_msg or 'Unknown error'}")

                # Get results with timeout
                dataset_items = await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        lambda: list(
                            self.client.dataset(run["defaultDatasetId"]).iterate_items()
                        ),
                    ),
                    timeout=30,  # 30 second timeout for fetching results
                )

                if not dataset_items:
                    raise ValueError("No data found for this LinkedIn profile.")

                # Sanitize response before returning
                raw_data = dataset_items[0]
                
                # Check if extraction actually succeeded (not just empty result)
                if not raw_data or raw_data == {}:
                    # Check run logs for error messages
                    try:
                        run_data = self.client.run(run["id"]).get()
                        logs = run_data.get("log", "")
                        if logs and ("free plan" in logs.lower() or "UI" in logs):
                            raise ValueError("LinkedIn extraction requires a paid Apify plan. Free plans can only run actors through the UI. Please upgrade your Apify account or use resume upload instead.")
                    except Exception:
                        pass  # If we can't check logs, continue with generic error
                    
                    raise ValueError("LinkedIn extraction returned no data. This may be due to Apify plan restrictions or profile privacy settings.")
                
                return self._sanitize_linkedin_response(raw_data)

            except AsyncTimeoutError:
                last_error = (
                    f"Apify request timed out after {self.APIFY_TIMEOUT_SECONDS}s"
                )
                logger.warning(f"Attempt {attempt + 1} failed: {last_error}")
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Attempt {attempt + 1} failed: {last_error}")

            # Wait before retry (except on last attempt)
            if attempt < self.MAX_RETRIES:
                await asyncio.sleep(self.RETRY_DELAY_SECONDS)

        raise ValueError(
            f"LinkedIn extraction failed after {self.MAX_RETRIES + 1} attempts: {last_error}"
        )


class ResumeParser:
    """Parser for resume files (PDF/DOCX)."""

    def __init__(self):
        self.llm = GeminiProvider()

    def _extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file."""
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text

    def _extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file."""
        doc = DocxDocument(file_path)
        text = "\n".join([para.text for para in doc.paragraphs if para.text])
        return text

    async def parse_resume(self, file_path: str, file_type: str) -> Dict[str, Any]:
        """Extract text and parse with Gemini."""
        try:
            # Normalize file type
            file_type_lower = file_type.lower().strip(".")

            if file_type_lower == "pdf":
                raw_text = self._extract_text_from_pdf(file_path)
            elif file_type_lower in ("docx", "doc"):
                raw_text = self._extract_text_from_docx(file_path)
            else:
                # Try to detect from file extension as fallback
                ext = Path(file_path).suffix.lower().lstrip(".")
                if ext == "pdf":
                    raw_text = self._extract_text_from_pdf(file_path)
                elif ext in ("docx", "doc"):
                    raw_text = self._extract_text_from_docx(file_path)
                else:
                    raise ValueError(f"Unsupported file type: {file_type}")

            if not raw_text or len(raw_text.strip()) < 50:
                raise ValueError("Could not extract meaningful text from resume")

            # Use Gemini's native JSON mode for structured extraction
            # This guarantees valid JSON output using response_schema
            cleaned_text = raw_text[:50000]  # Limit text length
            
            logger.info(f"Calling Gemini structured extraction (text length: {len(cleaned_text)} chars)")
            
            try:
                # Use the new structured extraction method with Gemini's JSON mode
                data = await self.llm.extract_resume_structured(cleaned_text)
                
                # Validate we got data
                if not data or not isinstance(data, dict):
                    raise ValueError("Structured extraction returned empty or invalid data")
                
                logger.info(f"Successfully extracted {len(data)} fields: {list(data.keys())}")
                
                # Add raw_text for database storage (not from Gemini, so doesn't consume LLM tokens)
                data["raw_text"] = raw_text[:5000]
                
                return data
                
            except Exception as e:
                logger.error(f"Structured extraction failed: {e}", exc_info=True)
                raise ValueError(f"Resume parsing failed: {str(e)}") from e

        except Exception as e:
            logger.error(f"Error parsing resume: {e}", exc_info=True)
            raise


class ExtractionService:
    """Service for extracting data from various sources."""

    def __init__(self):
        self.linkedin = LinkedInScraper()
        self.resume = ResumeParser()

    async def extract_linkedin(self, url: str) -> Dict[str, Any]:
        """Extract data from LinkedIn profile."""
        return await self.linkedin.scrape_profile(url)

    async def extract_resume(self, file_path: str, file_type: str) -> Dict[str, Any]:
        """Extract data from resume file."""
        return await self.resume.parse_resume(file_path, file_type)
