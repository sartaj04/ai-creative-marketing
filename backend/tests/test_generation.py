"""
Tests for copy generation service.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.generator.base import GeminiClient, OpenAIClient, parse_json_response


class TestParseJsonResponse:
    """Test JSON parsing from AI responses."""
    
    def test_parse_clean_json(self):
        """Test parsing clean JSON array."""
        response = '[{"headline": "Test", "body": "Test body"}]'
        result = parse_json_response(response)
        assert len(result) == 1
        assert result[0]["headline"] == "Test"
    
    def test_parse_json_with_markdown(self):
        """Test parsing JSON wrapped in markdown code blocks."""
        response = '```json\n[{"headline": "Test"}]\n```'
        result = parse_json_response(response)
        assert len(result) == 1
    
    def test_parse_json_with_surrounding_text(self):
        """Test parsing JSON with surrounding text."""
        response = 'Here is your copy:\n[{"headline": "Test"}]\nHope this helps!'
        result = parse_json_response(response)
        assert len(result) == 1
    
    def test_parse_invalid_json(self):
        """Test parsing invalid JSON raises error."""
        response = "This is not JSON at all"
        with pytest.raises(Exception):
            parse_json_response(response)


class TestGeminiClient:
    """Test Gemini AI client."""
    
    @pytest.mark.slow
    async def test_generate_with_mock(self):
        """Test generation with mocked Gemini response."""
        with patch('google.generativeai.GenerativeModel') as mock_model:
            mock_response = MagicMock()
            mock_response.text = '[{"headline": "AI Generated", "body": "Test"}]'
            mock_model.return_value.generate_content.return_value = mock_response
            
            client = GeminiClient()
            client.model = mock_model.return_value
            
            result = await client.generate("Test prompt")
            assert "AI Generated" in result


class TestRefinementService:
    """Test multi-step refinement."""
    
    async def test_refine_copy_structure(self):
        """Test refinement maintains copy structure."""
        from app.services.generator.refinement import refine_copy
        
        initial_copies = [
            {
                "headline": "Original Headline",
                "body": "Original body text",
                "cta": "Shop Now",
                "hashtags": ["#test"]
            }
        ]
        
        brand_context = {
            "name": "Test Brand",
            "tone": "professional",
            "target_audience": "Indian consumers"
        }
        
        # With mocked AI client
        with patch('app.services.generator.base.get_ai_client') as mock_client:
            mock = AsyncMock()
            mock.generate.return_value = '{"strengths": [], "weaknesses": [], "improvements": []}'
            mock_client.return_value = mock
            
            result = await refine_copy(initial_copies, brand_context)
            
            # Should return list with same or more fields
            assert len(result) == 1
            assert "headline" in result[0]
