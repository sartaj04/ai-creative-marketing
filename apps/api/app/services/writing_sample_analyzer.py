"""Writing Sample Analyzer - Extract patterns from user's actual posts."""
import logging
from typing import Dict, List, Optional

from app.llm.provider import get_llm_provider

logger = logging.getLogger(__name__)


WRITING_SAMPLE_ANALYSIS_PROMPT = """You are an expert writing style analyst. Analyze these writing samples from a user to extract their unique writing patterns, voice, and style.

WRITING SAMPLES:
{samples}

Extract and describe the following patterns:

1. **Length Distribution**: 
   - What's the typical word count range?
   - Do they vary length or stay consistent?
   - Distribution: X% short (50-150), Y% medium (150-300), Z% long (300+)

2. **Opening Styles**:
   - How do they typically start posts? (question, bold statement, story, observation)
   - Any signature opening phrases? (e.g., "Here's the thing:", "Let me be honest:")
   - Do they use hooks effectively?

3. **Structure & Formatting**:
   - Paragraph count (single vs. multiple short paragraphs)
   - Line break frequency (dense vs. spaced out)
   - Use of bullets, lists, or numbered points
   - Bold text, caps, or other emphasis

4. **Vocabulary & Voice**:
   - Common phrases, idioms, or transition words
   - Technical vs. casual language
   - Industry jargon usage
   - Unique expressions or catchphrases

5. **Tone Markers**:
   - Formal vs. casual
   - Serious vs. playful/humorous
   - Confident vs. humble
   - Data-driven vs. story-driven
   - Give specific examples from their posts

6. **Closing Patterns**:
   - How do they end posts? (question, CTA, cliffhanger, summary)
   - Engagement tactics used

7. **Visual Elements**:
   - Emoji usage (frequency, placement, types)
   - Special characters (→, •, —, etc.)
   - Formatting patterns

8. **Content Patterns**:
   - Do they share personal stories or stay professional?
   - Use of data/statistics vs. anecdotes
   - First person vs. second person

Provide a comprehensive analysis that can guide content generation to match their authentic voice.

Return ONLY valid JSON:
{{
  "summary": "A 300-400 word natural language summary of their writing style",
  "length_distribution": {{
    "typical_range": "120-200 words",
    "distribution": "60% short (100-200 words), 30% medium (200-350 words), 10% long (350+ words)",
    "variation_level": "moderate"
  }},
  "opening_styles": {{
    "primary_style": "rhetorical questions",
    "signature_phrases": ["Here's the thing:", "Let me be honest:", "Quick observation:"],
    "examples": ["Here's the thing: remote work isn't for everyone.", "Let me be honest - I used to think..."]
  }},
  "structure": {{
    "paragraph_count": "2-4 short paragraphs",
    "line_breaks": "frequent (every 1-2 sentences)",
    "lists_bullets": "rarely uses",
    "emphasis": "occasional bold for key points"
  }},
  "vocabulary": {{
    "common_phrases": ["game-changer", "here's what works", "the reality is"],
    "tone": "conversational but authoritative",
    "jargon_level": "minimal - prefers plain language",
    "unique_expressions": ["plot twist:", "here's the kicker:"]
  }},
  "tone_examples": [
    {{"quote": "Actual sentence from their post showing tone", "note": "Shows confident but approachable style"}},
    {{"quote": "Another example", "note": "Demonstrates casual yet professional voice"}}
  ],
  "closing_patterns": {{
    "primary_style": "open-ended questions",
    "examples": ["What's your take?", "Have you experienced this?", "Thoughts?"],
    "cta_usage": "subtle, conversational"
  }},
  "visual_elements": {{
    "emoji_frequency": "1-2 per post, usually at end",
    "emoji_types": ["💡", "🎯", "✨"],
    "special_chars": ["→", "•"],
    "formatting": "minimal caps, occasional bold"
  }},
  "content_patterns": {{
    "personal_stories": "frequently shares relevant anecdotes",
    "data_usage": "occasionally mentions statistics",
    "perspective": "primarily first-person with 'you' to engage reader",
    "vulnerability": "comfortable sharing failures and lessons"
  }}
}}"""


class WritingSampleAnalyzer:
    """Service for analyzing user's writing samples."""
    
    def __init__(self):
        """Initialize Writing Sample Analyzer."""
        self.llm_provider = get_llm_provider()
    
    async def analyze_samples(self, samples: List[str]) -> Dict[str, any]:
        """
        Analyze writing samples to extract patterns and style.
        
        Args:
            samples: List of user's actual posts (text content)
        
        Returns:
            Dict containing:
                - summary: Natural language summary of writing style
                - length_distribution: Length patterns
                - opening_styles: How they start posts
                - structure: Paragraph/formatting patterns
                - vocabulary: Common phrases and voice
                - tone_examples: Specific examples showing tone
                - closing_patterns: How they end posts
                - visual_elements: Emoji/formatting usage
                - content_patterns: Personal vs professional style
        """
        if not samples or len(samples) < 1:
            logger.warning("No samples provided for analysis")
            return None
        
        try:
            # Format samples for prompt
            formatted_samples = "\n\n---\n\n".join([
                f"SAMPLE {i+1}:\n{sample}"
                for i, sample in enumerate(samples)
            ])
            
            logger.info(f"Analyzing {len(samples)} writing samples")
            
            # Create prompt
            prompt = WRITING_SAMPLE_ANALYSIS_PROMPT.format(
                samples=formatted_samples
            )
            
            # Call LLM with increased token limit for detailed analysis
            response = await self.llm_provider.generate_structured(
                prompt=prompt,
                response_schema={
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string"},
                        "length_distribution": {
                            "type": "object",
                            "properties": {
                                "typical_range": {"type": "string"},
                                "distribution": {"type": "string"},
                                "variation_level": {"type": "string"},
                            },
                        },
                        "opening_styles": {
                            "type": "object",
                            "properties": {
                                "primary_style": {"type": "string"},
                                "signature_phrases": {"type": "array"},
                                "examples": {"type": "array"},
                            },
                        },
                        "structure": {"type": "object"},
                        "vocabulary": {"type": "object"},
                        "tone_examples": {"type": "array"},
                        "closing_patterns": {"type": "object"},
                        "visual_elements": {"type": "object"},
                        "content_patterns": {"type": "object"},
                    },
                    "required": ["summary", "length_distribution", "opening_styles"],
                },
                max_tokens=8000,  # Increased for detailed analysis
            )
            
            if not response or not isinstance(response, dict):
                logger.error("Invalid response from Writing Sample Analyzer")
                return None
            
            logger.info(
                f"Successfully analyzed writing samples. "
                f"Summary length: {len(response.get('summary', ''))} chars"
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Error analyzing writing samples: {e}", exc_info=True)
            return None
    
    def format_insights_for_persona(self, analysis: Dict[str, any]) -> str:
        """
        Format analysis into natural language for persona prompt.
        
        Args:
            analysis: The structured analysis from analyze_samples
        
        Returns:
            Natural language description suitable for persona prompt
        """
        if not analysis:
            return ""
        
        insights = []
        
        # Summary
        if "summary" in analysis:
            insights.append("WRITING STYLE ANALYSIS (from actual posts):")
            insights.append(analysis["summary"])
            insights.append("")
        
        # Length patterns
        if "length_distribution" in analysis:
            ld = analysis["length_distribution"]
            insights.append(f"LENGTH PATTERNS: {ld.get('distribution', 'Varies')}")
            insights.append("")
        
        # Opening style
        if "opening_styles" in analysis:
            os = analysis["opening_styles"]
            if "signature_phrases" in os and os["signature_phrases"]:
                phrases = ", ".join(f'"{p}"' for p in os["signature_phrases"][:3])
                insights.append(f"SIGNATURE OPENINGS: {phrases}")
                insights.append("")
        
        # Structure
        if "structure" in analysis:
            struct = analysis["structure"]
            insights.append(f"STRUCTURE: {struct.get('paragraph_count', '2-3 paragraphs')}, "
                          f"{struct.get('line_breaks', 'standard spacing')}")
            insights.append("")
        
        # Vocabulary
        if "vocabulary" in analysis:
            vocab = analysis["vocabulary"]
            if "common_phrases" in vocab and vocab["common_phrases"]:
                phrases = ", ".join(f'"{p}"' for p in vocab["common_phrases"][:4])
                insights.append(f"COMMON PHRASES: {phrases}")
            insights.append(f"TONE: {vocab.get('tone', 'Professional and engaging')}")
            insights.append("")
        
        # Visual elements
        if "visual_elements" in analysis:
            ve = analysis["visual_elements"]
            insights.append(f"FORMATTING: {ve.get('emoji_frequency', 'Minimal emojis')}, "
                          f"{ve.get('formatting', 'clean and simple')}")
            insights.append("")
        
        return "\n".join(insights)
