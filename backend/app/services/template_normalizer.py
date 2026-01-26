"""
Template Normalization Service.

Analyzes uploaded templates to:
- Detect layout zones
- Extract template variables
- Infer hierarchy and structure
- Generate editable layout schema
"""
import re
from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup


# Common zone type indicators
ZONE_PATTERNS = {
    "headline": [
        r"headline", r"title", r"heading", r"h1", r"main-text",
        r"hero-text", r"primary-text"
    ],
    "subheadline": [
        r"subheadline", r"subtitle", r"tagline", r"sub-text",
        r"secondary-text"
    ],
    "body": [
        r"body", r"description", r"content", r"text", r"copy",
        r"paragraph"
    ],
    "cta": [
        r"cta", r"button", r"action", r"click", r"link",
        r"btn", r"call-to-action"
    ],
    "image": [
        r"image", r"img", r"photo", r"picture", r"hero-image",
        r"product-image", r"background"
    ],
    "logo": [
        r"logo", r"brand", r"brand-logo"
    ],
    "price": [
        r"price", r"cost", r"amount", r"offer", r"discount"
    ],
    "badge": [
        r"badge", r"tag", r"label", r"ribbon", r"sale"
    ],
}


# Jinja2 variable pattern
JINJA_VARIABLE_PATTERN = re.compile(r"\{\{\s*(\w+)\s*\}\}")


def detect_zone_type(element_classes: List[str], element_id: str, tag_name: str) -> str:
    """
    Detect the zone type based on element attributes.
    
    Args:
        element_classes: List of CSS class names
        element_id: Element ID
        tag_name: HTML tag name
        
    Returns:
        Detected zone type or "unknown"
    """
    # Combine all identifiers
    identifiers = " ".join(element_classes + [element_id or "", tag_name]).lower()
    
    # Check against patterns
    for zone_type, patterns in ZONE_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, identifiers):
                return zone_type
    
    # Tag-based fallback
    if tag_name in ["h1", "h2"]:
        return "headline"
    elif tag_name in ["h3", "h4", "h5", "h6"]:
        return "subheadline"
    elif tag_name == "p":
        return "body"
    elif tag_name == "button":
        return "cta"
    elif tag_name == "img":
        return "image"
    elif tag_name == "a":
        return "cta"
    
    return "unknown"


def extract_variables_from_text(text: str) -> List[Dict[str, Any]]:
    """
    Extract Jinja2 template variables from text.
    
    Args:
        text: Text content to analyze
        
    Returns:
        List of variable definitions
    """
    variables = []
    seen = set()
    
    for match in JINJA_VARIABLE_PATTERN.finditer(text):
        var_name = match.group(1)
        if var_name not in seen:
            seen.add(var_name)
            variables.append({
                "name": var_name,
                "type": infer_variable_type(var_name),
                "required": True,
                "description": f"Variable: {var_name}"
            })
    
    return variables


def infer_variable_type(var_name: str) -> str:
    """
    Infer variable type from its name.
    
    Args:
        var_name: Variable name
        
    Returns:
        Inferred type: text, image, color, url
    """
    name_lower = var_name.lower()
    
    if any(x in name_lower for x in ["image", "img", "photo", "picture", "logo", "background"]):
        return "image"
    elif any(x in name_lower for x in ["color", "colour", "bg"]):
        return "color"
    elif any(x in name_lower for x in ["url", "link", "href"]):
        return "url"
    else:
        return "text"


def analyze_element(element, parent_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Analyze a single HTML element for zone detection.
    
    Args:
        element: BeautifulSoup element
        parent_id: Parent zone ID for nesting
        
    Returns:
        Zone definition or None
    """
    if not hasattr(element, 'name') or element.name is None:
        return None
    
    # Skip common non-content elements
    if element.name in ["script", "style", "meta", "link", "head"]:
        return None
    
    classes = element.get("class", [])
    element_id = element.get("id", "")
    
    zone_type = detect_zone_type(classes, element_id, element.name)
    
    # Get text content (if any)
    text_content = element.get_text(strip=True) if zone_type not in ["image"] else None
    
    # Look for variables
    variables = []
    if text_content:
        variables = extract_variables_from_text(str(element))
    
    # Check for src attribute (images)
    src = element.get("src", "")
    if src and "{{" in src:
        var_match = JINJA_VARIABLE_PATTERN.search(src)
        if var_match:
            variables.append({
                "name": var_match.group(1),
                "type": "image",
                "required": True,
                "description": f"Image source: {var_match.group(1)}"
            })
    
    # Only return meaningful zones
    if zone_type != "unknown" or variables:
        return {
            "id": element_id or f"{zone_type}_{id(element)}",
            "type": zone_type,
            "tag": element.name,
            "classes": classes,
            "parent_id": parent_id,
            "variables": variables,
            "required": zone_type in ["headline", "image", "logo"],
        }
    
    return None


async def normalize_template(html_code: str, css_code: str = "") -> Dict[str, Any]:
    """
    Analyze template and generate layout schema.
    
    Args:
        html_code: Template HTML code
        css_code: Template CSS code
        
    Returns:
        Dict with zones, variables, hierarchy, and layout_schema
    """
    warnings = []
    
    try:
        soup = BeautifulSoup(html_code, "html.parser")
    except Exception as e:
        warnings.append(f"HTML parsing warning: {str(e)}")
        soup = BeautifulSoup(html_code, "html5lib")
    
    zones = []
    all_variables = []
    seen_variables = set()
    
    # Find all potentially meaningful elements
    for element in soup.find_all(True):  # True finds all tags
        zone = analyze_element(element)
        if zone:
            zones.append(zone)
            
            # Collect unique variables
            for var in zone.get("variables", []):
                if var["name"] not in seen_variables:
                    seen_variables.add(var["name"])
                    all_variables.append(var)
    
    # Build hierarchy (group zones by parent)
    hierarchy = build_hierarchy(zones)
    
    # Generate layout schema
    layout_schema = {
        "version": "1.0",
        "zones": [
            {
                "id": z["id"],
                "type": z["type"],
                "required": z.get("required", False),
                "constraints": {
                    "min_text_length": 0,
                    "max_text_length": get_max_length_for_type(z["type"]),
                }
            }
            for z in zones
        ],
        "responsive": {
            "breakpoints": []
        }
    }
    
    # Analyze CSS for additional info
    css_analysis = analyze_css(css_code)
    if css_analysis.get("warnings"):
        warnings.extend(css_analysis["warnings"])
    
    return {
        "zones": zones,
        "variables": all_variables,
        "hierarchy": hierarchy,
        "layout_schema": layout_schema,
        "warnings": warnings
    }


def build_hierarchy(zones: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Build hierarchy structure from flat zone list.
    """
    # Group by type
    by_type = {}
    for zone in zones:
        zone_type = zone["type"]
        if zone_type not in by_type:
            by_type[zone_type] = []
        by_type[zone_type].append(zone["id"])
    
    return {
        "zone_count": len(zones),
        "types": by_type,
        "structure": "flat"  # Could be enhanced to detect nested structures
    }


def get_max_length_for_type(zone_type: str) -> int:
    """
    Get default max text length for zone type.
    """
    limits = {
        "headline": 60,
        "subheadline": 100,
        "body": 500,
        "cta": 25,
        "price": 20,
        "badge": 30,
    }
    return limits.get(zone_type, 200)


def analyze_css(css_code: str) -> Dict[str, Any]:
    """
    Analyze CSS for layout information.
    """
    warnings = []
    
    # Check for potential issues
    if "position: fixed" in css_code.lower():
        warnings.append("CSS contains fixed positioning which may cause rendering issues")
    
    if "overflow: hidden" not in css_code.lower():
        warnings.append("Consider adding overflow:hidden to prevent content overflow")
    
    return {
        "warnings": warnings
    }
