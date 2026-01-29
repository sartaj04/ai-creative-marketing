"""Audio transcription service using Gemini."""
import logging
import os
import tempfile
from pathlib import Path
from typing import BinaryIO

from google.genai import types

from app.llm.gemini import GeminiProvider

logger = logging.getLogger(__name__)

# Supported audio formats
SUPPORTED_FORMATS = {'.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac'}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB


def validate_audio_file(filename: str, file_size: int) -> None:
    """Validate audio file format and size.
    
    Raises:
        ValueError: If file is invalid
    """
    ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED_FORMATS:
        raise ValueError(
            f"Unsupported audio format: {ext}. "
            f"Supported formats: {', '.join(SUPPORTED_FORMATS)}"
        )
    
    if file_size > MAX_FILE_SIZE:
        raise ValueError(
            f"File too large: {file_size / 1024 / 1024:.1f}MB. "
            f"Maximum size: {MAX_FILE_SIZE / 1024 / 1024:.0f}MB"
        )


async def transcribe_audio(file_content: bytes, filename: str) -> str:
    """Transcribe audio file to text using Gemini.
    
    Args:
        file_content: Audio file bytes
        filename: Original filename (for extension detection)
        
    Returns:
        Transcribed text
        
    Raises:
        ValueError: If transcription fails
    """
    validate_audio_file(filename, len(file_content))
    
    # Save to temp file for processing
    ext = Path(filename).suffix.lower()
    
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        
        logger.info(f"Transcribing audio file: {filename} ({len(file_content)} bytes)")
        
        # Use Gemini for transcription
        llm = GeminiProvider()
        
        # Determine mime type
        mime_type = "audio/mp3"  # Default
        if ext == '.wav':
            mime_type = "audio/wav"
        elif ext == '.m4a':
            mime_type = "audio/m4a"
        elif ext == '.ogg':
            mime_type = "audio/ogg"
        elif ext == '.flac':
            mime_type = "audio/flac"
        
        # Read the file and send to Gemini with transcription prompt
        prompt_text = """Transcribe the following audio content accurately. 
Output only the transcription, no additional commentary or formatting.
If the audio is unclear in parts, do your best to transcribe what you can hear.
If there's no speech, respond with "No speech detected in audio."
"""
        
        # Create multimodal content: [Audio Part, Text Prompt]
        contents = [
            types.Part.from_bytes(data=file_content, mime_type=mime_type),
            prompt_text
        ]
        
        logger.info(f"Sending audio to Gemini (mime: {mime_type}, size: {len(file_content)})")
        
        transcript = await llm.generate_content(
            contents=contents,
            system_prompt="You are a professional transcription assistant.",
        )
        
        if not transcript or len(transcript.strip()) < 10:
            raise ValueError("Transcription returned empty result.")
        
        logger.info(f"Transcription complete: {len(transcript)} chars")
        return transcript.strip()
        
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise ValueError(f"Failed to transcribe audio: {str(e)}")
    finally:
        # Clean up temp file
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.unlink(tmp_path)
