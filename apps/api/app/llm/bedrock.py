"""AWS Bedrock (Claude) LLM provider."""
import json
from typing import Any, Optional

import boto3

from app.core.config import settings
from app.llm.base import LLMProvider


class BedrockProvider(LLMProvider):
    """AWS Bedrock LLM provider for Claude."""

    def __init__(self):
        """Initialize Bedrock provider."""
        self._client = boto3.client(
            "bedrock-runtime",
            region_name=settings.AWS_BEDROCK_REGION,
            aws_access_key_id=settings.AWS_BEDROCK_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_BEDROCK_SECRET_ACCESS_KEY,
        )
        self._model_id = settings.BEDROCK_MODEL_ID

    @property
    def name(self) -> str:
        return "bedrock"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> str:
        """Generate text using Claude via Bedrock."""
        try:
            # Build messages for Claude
            messages = [{"role": "user", "content": prompt}]

            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": messages,
            }

            if system_prompt:
                body["system"] = system_prompt

            response = self._client.invoke_model(
                modelId=self._model_id,
                contentType="application/json",
                accept="application/json",
                body=json.dumps(body),
            )

            response_body = json.loads(response["body"].read())
            return response_body["content"][0]["text"]

        except Exception as e:
            print(f"Bedrock generation error: {e}")
            raise

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
    ) -> dict[str, Any]:
        """Generate structured JSON response."""
        json_system = system_prompt or ""
        json_system += "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, just the JSON object."

        response = await self.generate(
            prompt=prompt,
            system_prompt=json_system,
            temperature=temperature,
            max_tokens=2000,
        )

        # Clean response and parse JSON
        cleaned = response.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            print(f"Response was: {cleaned}")
            return {}

    async def generate_structured(
        self,
        prompt: str,
        response_schema: dict[str, Any],
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4000,
    ) -> dict[str, Any]:
        """Generate structured JSON response following a schema.
        
        Args:
            prompt: The user prompt
            response_schema: JSON schema dict defining the expected response structure
            system_prompt: Optional system instruction
            temperature: Generation temperature
            max_tokens: Maximum tokens to generate
            
        Returns:
            Parsed JSON dict matching the schema
        """
        # Enhance prompt with schema information
        schema_description = json.dumps(response_schema, indent=2)
        enhanced_prompt = f"""{prompt}

IMPORTANT: Respond with a valid JSON object that matches this exact schema:
{schema_description}

Return ONLY the JSON object, no markdown, no explanation."""
        
        # Use generate_json which handles JSON parsing
        return await self.generate_json(
            prompt=enhanced_prompt,
            system_prompt=system_prompt,
            temperature=temperature,
        )

    async def embed(self, text: str) -> list[float]:
        """Generate embedding using Bedrock Titan."""
        try:
            # Use Titan embeddings model
            body = {
                "inputText": text,
            }

            response = self._client.invoke_model(
                modelId="amazon.titan-embed-text-v1",
                contentType="application/json",
                accept="application/json",
                body=json.dumps(body),
            )

            response_body = json.loads(response["body"].read())
            return response_body["embedding"]

        except Exception as e:
            print(f"Bedrock embedding error: {e}")
            # Return zero vector as fallback
            return [0.0] * 1536
