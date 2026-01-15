"""
Multi-step refinement for copy generation.
Implements: Generate → Critique → Refine loop.
"""
from typing import Dict, Any, List

from app.services.generator.base import get_ai_client, parse_json_response


async def refine_copy(
    initial_copies: List[Dict[str, Any]],
    brand_context: Dict[str, Any],
    refinement_criteria: Dict[str, Any] = None
) -> List[Dict[str, Any]]:
    """
    Refine generated copy through a critique-improve loop.
    
    Args:
        initial_copies: List of generated copy variants
        brand_context: Brand info for context
        refinement_criteria: Optional specific criteria to focus on
    
    Returns:
        List of refined copy variants
    """
    client = get_ai_client()
    
    # Default criteria
    criteria = refinement_criteria or {
        "hook_strength": "Does it stop the scroll? Is it specific, not generic?",
        "clarity": "Is the message instantly clear? No jargon or confusion?",
        "emotion": "Does it evoke feeling? Excitement, curiosity, urgency?",
        "specificity": "Are there concrete details vs vague claims?",
        "cta_effectiveness": "Is the call-to-action compelling and clear?",
        "brand_voice": "Does it match the brand's tone and personality?",
        "audience_fit": "Will the target audience relate to this?"
    }
    
    refined_copies = []
    
    for i, copy in enumerate(initial_copies):
        # Step 1: Critique the copy
        critique_prompt = f"""You are a senior marketing copywriter and critic. Analyze this ad copy:

COPY:
- Headline: {copy.get('headline', copy.get('hook', ''))}
- Body: {copy.get('body', '')}
- CTA: {copy.get('cta', copy.get('closing', ''))}

BRAND CONTEXT:
- Name: {brand_context.get('name', 'Brand')}
- Tone: {brand_context.get('tone', 'professional')}
- Target: {brand_context.get('target_audience', 'Indian consumers')}

CRITIQUE CRITERIA:
{chr(10).join([f'- {k}: {v}' for k, v in criteria.items()])}

Provide a critical analysis. Be specific about:
1. What works well (1-2 points)
2. What needs improvement (2-3 specific issues)
3. Concrete suggestions for each issue

Format as JSON:
{{
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "improvements": ["specific change 1", "specific change 2", "specific change 3"]
}}"""

        try:
            critique_response = await client.generate(critique_prompt, temperature=0.3)
            critique = parse_json_response(critique_response)
        except Exception:
            # Skip refinement if critique fails
            refined_copies.append(copy)
            continue
        
        # Step 2: Refine based on critique
        refine_prompt = f"""You are an expert copywriter. Improve this ad copy based on the critique.

ORIGINAL COPY:
- Headline: {copy.get('headline', copy.get('hook', ''))}
- Body: {copy.get('body', '')}
- CTA: {copy.get('cta', copy.get('closing', ''))}
- Hashtags: {copy.get('hashtags', [])}

CRITIQUE:
Weaknesses: {critique.get('weaknesses', [])}
Suggested Improvements: {critique.get('improvements', [])}

BRAND CONTEXT:
- Name: {brand_context.get('name', 'Brand')}
- Tone: {brand_context.get('tone', 'professional')}

REQUIREMENTS:
1. Address each weakness directly
2. Implement the suggested improvements
3. Keep the original intent and message
4. Make it more compelling, specific, and emotionally resonant
5. Maintain the same format/structure

Return ONLY the improved copy as JSON:
{{
  "headline": "...",
  "body": "...",
  "cta": "...",
  "hashtags": ["..."],
  "improvements_made": ["what you changed and why"]
}}"""

        try:
            refined_response = await client.generate(refine_prompt, temperature=0.6)
            refined = parse_json_response(refined_response)
            
            # Merge with original (keep any fields not in refined)
            merged = {**copy, **refined}
            refined_copies.append(merged)
        except Exception:
            # Keep original if refinement fails
            refined_copies.append(copy)
    
    return refined_copies


async def batch_refine_with_comparison(
    copies: List[Dict[str, Any]],
    brand_context: Dict[str, Any],
    select_top_n: int = 5
) -> Dict[str, Any]:
    """
    Refine copies and rank them for quality.
    
    Args:
        copies: List of generated copy variants
        brand_context: Brand context
        select_top_n: Number of top copies to return
    
    Returns:
        Dict with ranked copies and analysis
    """
    client = get_ai_client()
    
    # First refine all copies
    refined = await refine_copy(copies, brand_context)
    
    # Then rank them
    copies_text = "\n\n".join([
        f"Copy {i+1}:\n- Headline: {c.get('headline', c.get('hook', ''))}\n- Body: {c.get('body', '')[:200]}...\n- CTA: {c.get('cta', c.get('closing', ''))}"
        for i, c in enumerate(refined)
    ])
    
    rank_prompt = f"""You are a marketing expert. Rank these {len(refined)} ad copies from best to worst.

{copies_text}

BRAND CONTEXT:
- Name: {brand_context.get('name', 'Brand')}
- Target: {brand_context.get('target_audience', 'Indian consumers')}
- Goal: {brand_context.get('campaign_goal', 'drive engagement and conversions')}

Rank based on:
1. Hook effectiveness (will it stop someone scrolling?)
2. Message clarity
3. Emotional resonance
4. Call-to-action strength
5. Overall persuasiveness

Return JSON:
{{
  "rankings": [
    {{"copy_index": 1, "score": 9.2, "reason": "Strong hook, specific value prop"}},
    {{"copy_index": 3, "score": 8.5, "reason": "Good emotion, but CTA is weak"}},
    ...
  ],
  "overall_feedback": "Brief summary of the batch quality"
}}"""

    try:
        rank_response = await client.generate(rank_prompt, temperature=0.3)
        rankings = parse_json_response(rank_response)
        
        # Sort refined copies by ranking
        ranked_indices = [r["copy_index"] - 1 for r in rankings.get("rankings", [])]
        sorted_copies = []
        for idx in ranked_indices[:select_top_n]:
            if 0 <= idx < len(refined):
                refined[idx]["rank_score"] = rankings["rankings"][ranked_indices.index(idx)]["score"]
                refined[idx]["rank_reason"] = rankings["rankings"][ranked_indices.index(idx)]["reason"]
                sorted_copies.append(refined[idx])
        
        return {
            "top_copies": sorted_copies,
            "all_refined": refined,
            "feedback": rankings.get("overall_feedback", "")
        }
    except Exception:
        return {
            "top_copies": refined[:select_top_n],
            "all_refined": refined,
            "feedback": "Ranking not available"
        }
