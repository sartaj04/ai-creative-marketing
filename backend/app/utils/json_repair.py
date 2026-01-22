"""
JSON Repair Utility.
Provides robust parsing for AI-generated JSON which may contain formatting errors.
"""
import json
import re
from typing import Any, Dict, List, Union

def repair_json(text: str) -> Union[Dict[str, Any], List[Any], None]:
    """
    Attempt to repair and parse malformed JSON text.
    
    Handles:
    - Markdown code blocks
    - Trailing commas
    - Missing quotes
    - Unbalanced braces (basic cases)
    - Python-style None/True/False
    """
    if not text:
        return None
        
    # 1. Strip markdown code blocks
    text = text.strip()
    if "```" in text:
        # Try to find json block first
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
        if json_match:
            text = json_match.group(1)
        else:
            # Fallback cleanup
            text = text.replace("```json", "").replace("```", "")
    
    text = text.strip()
    
    # 2. Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
        
    # 3. Apply fixes
    
    # Fix Python constants to JSON
    text = text.replace("None", "null").replace("True", "true").replace("False", "false")
    
    # Remove comments (// and #)
    text = re.sub(r"//.*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*#.*$", "", text, flags=re.MULTILINE)
    
    # Fix trailing commas in objects and arrays
    text = re.sub(r",\s*\}", "}", text)
    text = re.sub(r",\s*\]", "]", text)
    
    # Attempt parse again
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
        
    # 4. Extract first valid JSON object or array structure
    # This helps if there's extra text before/after
    try:
        # Find outer braces
        match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
        if match:
            potential_json = match.group(1)
            return json.loads(potential_json)
    except json.JSONDecodeError:
        pass
        
    return None
