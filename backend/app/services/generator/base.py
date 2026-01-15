"""
Base AI client for copy generation.
Supports both Gemini and OpenAI.
"""
import json
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod

from app.config import settings
from app.database import async_session_maker


class AIClient(ABC):
    """Abstract base class for AI providers."""
    
    @abstractmethod
    async def generate(self, prompt: str, temperature: float = 0.8) -> str:
        """Generate text from prompt."""
        pass


class GeminiClient(AIClient):
    """Google Gemini AI client using Vertex AI with service account."""
    
    def __init__(self):
        # Use Vertex AI with service account credentials
        if not all([settings.gcp_project_id, settings.gcp_client_email, settings.gcp_private_key]):
            raise ValueError("Missing GCP credentials. Set GCP_PROJECT_ID, GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY in .env")
        
        from google.oauth2 import service_account
        import google.auth.transport.requests
        
        # Build credentials from env vars
        private_key = settings.gcp_private_key
        # Handle escaped newlines in private key
        if '\\n' in private_key:
            private_key = private_key.replace('\\n', '\n')
        
        credentials_info = {
            "type": "service_account",
            "project_id": settings.gcp_project_id,
            "private_key": private_key,
            "client_email": settings.gcp_client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        
        self.credentials = service_account.Credentials.from_service_account_info(
            credentials_info,
            scopes=['https://www.googleapis.com/auth/cloud-platform']
        )
        self.project_id = settings.gcp_project_id
        self.location = settings.gcp_location or "us-central1"
    
    async def generate(self, prompt: str, temperature: float = 0.8) -> str:
        """Generate text using Gemini via Vertex AI."""
        import google.auth.transport.requests
        import requests
        
        # Refresh credentials if needed
        if not self.credentials.valid:
            self.credentials.refresh(google.auth.transport.requests.Request())
        
        # Use Vertex AI REST API directly
        url = f"https://{self.location}-aiplatform.googleapis.com/v1/projects/{self.project_id}/locations/{self.location}/publishers/google/models/gemini-2.5-flash:generateContent"
        
        headers = {
            "Authorization": f"Bearer {self.credentials.token}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": 2048,
            }
        }
        
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        return result["candidates"][0]["content"]["parts"][0]["text"]



class OpenAIClient(AIClient):
    """OpenAI GPT client."""
    
    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI(api_key=settings.openai_api_key)
    
    async def generate(self, prompt: str, temperature: float = 0.8) -> str:
        """Generate text using GPT-4."""
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert marketing copywriter for Indian brands."},
                {"role": "user", "content": prompt}
            ],
            temperature=temperature,
            max_tokens=2048
        )
        
        return response.choices[0].message.content


def get_ai_client() -> AIClient:
    """Get the configured AI client."""
    if settings.ai_provider == "gemini":
        return GeminiClient()
    else:
        return OpenAIClient()


async def generate_copy(
    profile_id: str,
    generation_config: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Generate marketing copy based on profile type.
    
    Args:
        profile_id: Brand profile UUID
        generation_config: Generation parameters
        
    Returns:
        List of copy variants
    """
    from sqlalchemy import select
    from app.models.brand_profile import BrandProfile
    
    # Get brand profile
    async with async_session_maker() as session:
        result = await session.execute(
            select(BrandProfile).where(BrandProfile.id == profile_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise ValueError(f"Profile {profile_id} not found")
    
    # Route to appropriate generator
    profile_type = profile.profile_type.value
    
    if profile_type == "ecommerce":
        from app.services.generator.ecommerce import generate_ecommerce_copy
        return await generate_ecommerce_copy(profile, generation_config)
    elif profile_type == "saas":
        from app.services.generator.saas import generate_saas_copy
        return await generate_saas_copy(profile, generation_config)
    elif profile_type == "personal":
        from app.services.generator.personal import generate_personal_copy
        return await generate_personal_copy(profile, generation_config)
    else:
        raise ValueError(f"Unknown profile type: {profile_type}")


def parse_json_response(response: str) -> List[Dict[str, Any]]:
    """
    Parse JSON from AI response.
    Handles markdown code blocks and cleanup.
    """
    # Remove markdown code blocks if present
    content = response.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    
    content = content.strip()
    
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Try to extract JSON array from response
        start = content.find("[")
        end = content.rfind("]") + 1
        if start != -1 and end > start:
            return json.loads(content[start:end])
        raise
