"""Generator service for creating drafts from various sources using multi-agent system."""
import logging
import os
import tempfile
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.draft import Draft
from app.services.article_service import scrape_article
from app.services.audio_service import transcribe_audio
from app.services.multi_agent_generator import MultiAgentGenerator
from app.services.youtube_service import get_youtube_transcript

logger = logging.getLogger(__name__)

# Singleton instance of the multi-agent generator
_multi_agent_generator: Optional[MultiAgentGenerator] = None


def get_multi_agent_generator() -> MultiAgentGenerator:
    """Get or create the multi-agent generator singleton."""
    global _multi_agent_generator
    if _multi_agent_generator is None:
        _multi_agent_generator = MultiAgentGenerator()
    return _multi_agent_generator


class GeneratorService:
    """Service for generating drafts from various sources using multi-agent system.

    Each generation method:
    1. Processes the source material (transcribe audio, scrape article, etc.)
    2. Calls the MultiAgentGenerator with source data and optional template
    3. Returns the generated Draft

    The MultiAgentGenerator uses a LangGraph workflow with 4 agents:
    - Identity Agent: Analyzes IdentityGraph
    - Style Agent: Analyzes StyleProfile
    - Content Agent: Extracts insights from source material
    - Synthesis Agent: Combines all analyses into final draft
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.generator = get_multi_agent_generator()

    async def generate_from_scratch(
        self,
        profile_id: UUID,
        topic: str,
        key_points: list[str],
        goal: str,
        template_id: Optional[UUID] = None,
        use_persona: bool = True,
        feedback: Optional[str] = None,
        previous_draft_id: Optional[UUID] = None,
    ) -> Draft:
        """Generate a draft from scratch based on topic and key points.

        Args:
            profile_id: Profile UUID
            topic: Main topic for the post
            key_points: List of key points to cover
            goal: Goal of the post (thought leadership, engagement, etc.)
            template_id: Optional template for structural guidance
            use_persona: Whether to include professional identity
            feedback: User feedback for regeneration
            previous_draft_id: ID of previous draft being regenerated

        Returns:
            Generated Draft
        """
        source_data = {
            "topic": topic,
            "key_points": key_points if key_points else [],
            "goal": goal,
        }

        return await self.generator.generate(
            db=self.db,
            profile_id=profile_id,
            source_type="scratch",
            source_data=source_data,
            template_id=template_id,
            use_persona=use_persona,
            feedback=feedback,
            previous_draft_id=previous_draft_id,
        )

    async def generate_from_audio(
        self,
        profile_id: UUID,
        audio_content: bytes,
        filename: str,
        template_id: Optional[UUID] = None,
        use_persona: bool = True,
        feedback: Optional[str] = None,
        previous_draft_id: Optional[UUID] = None,
    ) -> Draft:
        """Generate a draft from audio content.

        Args:
            profile_id: Profile UUID
            audio_content: Audio file bytes
            filename: Original filename
            template_id: Optional template for structural guidance
            use_persona: Whether to include professional identity
            feedback: User feedback for regeneration
            previous_draft_id: ID of previous draft being regenerated

        Returns:
            Generated Draft
        """
        # Transcribe audio
        try:
            if not audio_content:
                raise ValueError("Audio file is empty.")

            transcript = await transcribe_audio(audio_content, filename)

            if not transcript or not transcript.strip():
                raise ValueError("Audio transcription failed or returned empty text.")

        except Exception as e:
            if isinstance(e, ValueError):
                raise e
            logger.error(f"Audio transcription error: {e}")
            raise ValueError(f"Failed to process audio: {str(e)}")

        source_data = {
            "transcript": transcript,
        }

        return await self.generator.generate(
            db=self.db,
            profile_id=profile_id,
            source_type="audio",
            source_data=source_data,
            template_id=template_id,
            use_persona=use_persona,
            feedback=feedback,
            previous_draft_id=previous_draft_id,
        )

    async def generate_from_pdf(
        self,
        profile_id: UUID,
        pdf_content: bytes,
        filename: str,
        template_id: Optional[UUID] = None,
        use_persona: bool = True,
        feedback: Optional[str] = None,
        previous_draft_id: Optional[UUID] = None,
    ) -> Draft:
        """Generate a draft from PDF content.

        Args:
            profile_id: Profile UUID
            pdf_content: PDF file bytes
            filename: Original filename
            template_id: Optional template for structural guidance

        Returns:
            Generated Draft
        """
        # Use Gemini for PDF processing
        from app.llm.gemini import GeminiProvider
        from google.genai import types

        llm = GeminiProvider()

        # Create multimodal content: [PDF Part, Summarization Prompt]
        contents = [
            types.Part.from_bytes(data=pdf_content, mime_type="application/pdf"),
            """Analyze this PDF document in detail.
Extract the most valuable insights, key arguments, data points, and core messages.
Provide a comprehensive summary that preserves the original meaning and specific details.
Focus on information that would be valuable for a professional LinkedIn post.
Do not lose important context or nuances.
"""
        ]

        logger.info(f"Sending PDF to Gemini (size: {len(pdf_content)} bytes)")

        try:
            # Generate comprehensive summary using Gemini's long context window
            content = await llm.generate_content(
                contents=contents,
                system_prompt="You are an expert analyst capable of reading and understanding complex documents.",
                max_tokens=8192,  # Allow for long summaries
            )
            
            if not content:
                raise ValueError("AI failed to process the PDF document.")
                
        except Exception as e:
            logger.error(f"Gemini PDF processing error: {e}")
            raise ValueError(f"Failed to process PDF: {str(e)}")

        source_data = {
            "content": content,
            "filename": filename
        }

        return await self.generator.generate(
            db=self.db,
            profile_id=profile_id,
            source_type="pdf",
            source_data=source_data,
            template_id=template_id,
            use_persona=use_persona,
            feedback=feedback,
            previous_draft_id=previous_draft_id,
        )

    async def generate_from_youtube(
        self,
        profile_id: UUID,
        youtube_url: str,
        template_id: Optional[UUID] = None,
        use_persona: bool = True,
        feedback: Optional[str] = None,
        previous_draft_id: Optional[UUID] = None,
    ) -> Draft:
        """Generate a draft from YouTube video transcript.

        Args:
            profile_id: Profile UUID
            youtube_url: YouTube video URL
            template_id: Optional template for structural guidance

        Returns:
            Generated Draft
        """
        try:
            # Get transcript
            transcript = await get_youtube_transcript(youtube_url)
            
            if not transcript or not transcript.strip():
                raise ValueError("No transcript available for this video.")
                
        except Exception as e:
            # Re-raise ValueErrors (like "No transcript available") directly
            if isinstance(e, ValueError):
                raise e
            # Log other errors and provide a friendly message
            logger.error(f"YouTube transcript error: {e}")
            raise ValueError(f"Failed to retrieve transcript: {str(e)}")

        source_data = {
            "transcript": transcript,
        }

        return await self.generator.generate(
            db=self.db,
            profile_id=profile_id,
            source_type="youtube",
            source_data=source_data,
            template_id=template_id,
            use_persona=use_persona,
            feedback=feedback,
            previous_draft_id=previous_draft_id,
        )

    async def generate_from_article(
        self,
        profile_id: UUID,
        article_url: str,
        template_id: Optional[UUID] = None,
        use_persona: bool = True,
        feedback: Optional[str] = None,
        previous_draft_id: Optional[UUID] = None,
    ) -> Draft:
        """Generate a draft from article content.

        Args:
            profile_id: Profile UUID
            article_url: Article URL to scrape
            template_id: Optional template for structural guidance

        Returns:
            Generated Draft
        """
        try:
            # Scrape article
            article = await scrape_article(article_url)
            
            if not article or not article.get("content"):
                raise ValueError("Unable to extract content from this article.")
            
            content = article["content"]
            if len(content.strip()) < 200:
                raise ValueError("Article content is too short or could not be fully extracted.")
                
        except Exception as e:
            if isinstance(e, ValueError):
                raise e
            logger.error(f"Article scraping error: {e}")
            raise ValueError(f"Failed to scrape article: {str(e)}")

        source_data = {
            "title": article.get("title", "Article"),
            "content": content,
        }

        return await self.generator.generate(
            db=self.db,
            profile_id=profile_id,
            source_type="article",
            source_data=source_data,
            template_id=template_id,
            use_persona=use_persona,
            feedback=feedback,
            previous_draft_id=previous_draft_id,
        )

    async def generate_formatted(
        self,
        profile_id: UUID,
        content: str,
        template_id: Optional[UUID] = None,
        use_persona: bool = True,
        feedback: Optional[str] = None,
        previous_draft_id: Optional[UUID] = None,
    ) -> Draft:
        """Generate a formatted draft from raw content.

        Args:
            profile_id: Profile UUID
            content: Raw text content to format
            template_id: Optional template for structural guidance
            use_persona: Whether to include professional identity
            feedback: User feedback for regeneration
            previous_draft_id: ID of previous draft being regenerated

        Returns:
            Generated Draft
        """
        source_data = {
            "content": content,
        }

        return await self.generator.generate(
            db=self.db,
            profile_id=profile_id,
            source_type="format",
            source_data=source_data,
            template_id=template_id,
            use_persona=use_persona,
            feedback=feedback,
            previous_draft_id=previous_draft_id,
        )
