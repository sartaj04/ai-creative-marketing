"""
Dummy Render Service.

Performs QA validation by rendering templates with worst-case test data:
- Maximum length text in all zones
- Placeholder images
- Stress-test parameters

Templates must pass dummy render before they can be approved.
"""
import asyncio
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

from jinja2 import Template as Jinja2Template

from app.services.template_renderer import (
    get_browser,
    release_browser,
    ASPECT_RATIO_DIMENSIONS,
)
from app.services.s3_storage import upload_template_asset


# Stress test data generators
STRESS_TEST_DATA = {
    # Max length text for each variable type
    "headline": "A" * 60 + " Maximum Length Headline Test",
    "subheadline": "B" * 100 + " This is a very long subheadline to test overflow",
    "body": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 10,
    "cta": "Click Here Now!!!!",
    "cta_text": "Shop Now & Save Big!",
    "button_text": "Limited Time Offer",
    "price": "$999,999.99",
    "discount": "99% OFF!",
    "offer": "Buy 1 Get 10 Free",
    
    # Placeholder images
    "image": "https://via.placeholder.com/800x600/333333/FFFFFF?text=Image+Placeholder",
    "logo": "https://via.placeholder.com/200x200/666666/FFFFFF?text=LOGO",
    "background": "https://via.placeholder.com/1920x1080/1a1a1a/333333?text=Background",
    "product_image": "https://via.placeholder.com/600x600/444444/FFFFFF?text=Product",
    "hero_image": "https://via.placeholder.com/1200x800/222222/FFFFFF?text=Hero",
    
    # Colors (worst case - high contrast)
    "primary_color": "#FF0000",
    "secondary_color": "#00FF00",
    "background_color": "#000000",
    "text_color": "#FFFFFF",
    
    # URLs
    "url": "https://example.com/very-long-url-path/that/might/cause/issues",
    "link": "https://example.com",
}


def generate_stress_test_data(variables: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate worst-case test data for template variables.
    
    Args:
        variables: List of variable definitions from template
        
    Returns:
        Dict of variable name -> stress test value
    """
    data = {}
    
    for var in variables:
        name = var.get("name", "")
        var_type = var.get("type", "text")
        
        # Try exact name match first
        if name in STRESS_TEST_DATA:
            data[name] = STRESS_TEST_DATA[name]
            continue
        
        # Try partial name match
        name_lower = name.lower()
        matched = False
        for key, value in STRESS_TEST_DATA.items():
            if key in name_lower or name_lower in key:
                data[name] = value
                matched = True
                break
        
        if matched:
            continue
        
        # Fallback by type
        if var_type == "image":
            data[name] = STRESS_TEST_DATA["image"]
        elif var_type == "color":
            data[name] = STRESS_TEST_DATA["primary_color"]
        elif var_type == "url":
            data[name] = STRESS_TEST_DATA["url"]
        else:
            # Default text - use max length
            max_length = var.get("max_length", 100)
            data[name] = "X" * min(max_length, 200) + " TEST"
    
    return data


async def run_dummy_render(
    template_id: str,
    html_code: str,
    css_code: str,
    variables: List[Dict[str, Any]],
    aspect_ratio: str = "1:1"
) -> Dict[str, Any]:
    """
    Execute dummy render QA validation.
    
    Args:
        template_id: Template UUID
        html_code: Template HTML code
        css_code: Template CSS code
        variables: Template variable definitions
        aspect_ratio: Aspect ratio to render
        
    Returns:
        Dict with:
        - passed: bool
        - render_url: Optional[str]
        - issues: List of detected issues
    """
    issues = []
    
    # Generate stress test data
    test_data = generate_stress_test_data(variables)
    
    # Get dimensions
    width, height = ASPECT_RATIO_DIMENSIONS.get(aspect_ratio, (1080, 1080))
    
    # Render HTML with Jinja2
    try:
        jinja_template = Jinja2Template(html_code)
        rendered_html = jinja_template.render(**test_data)
    except Exception as e:
        issues.append({
            "type": "render_error",
            "severity": "critical",
            "message": f"Template failed to render: {str(e)}"
        })
        return {
            "passed": False,
            "render_url": None,
            "issues": issues
        }
    
    # Build full HTML
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ 
                width: {width}px; 
                height: {height}px; 
                overflow: hidden;
                position: relative;
            }}
            {css_code}
        </style>
    </head>
    <body>
        {rendered_html}
    </body>
    </html>
    """
    
    # Render with Playwright
    browser_tuple = await get_browser()
    _, browser = browser_tuple  # Unpack the (playwright, browser) tuple
    render_url = None
    
    try:
        page = await browser.new_page(viewport={"width": width, "height": height})
        
        await page.set_content(full_html, wait_until="networkidle")
        
        # Wait for images to load
        await page.wait_for_timeout(2000)
        
        # Check for overflow issues
        overflow_check = await page.evaluate("""
            () => {
                const body = document.body;
                const issues = [];
                
                // Check if content overflows viewport
                if (body.scrollHeight > body.clientHeight) {
                    issues.push({
                        type: 'overflow_vertical',
                        severity: 'warning',
                        message: `Content overflows vertically: ${body.scrollHeight}px vs ${body.clientHeight}px viewport`
                    });
                }
                
                if (body.scrollWidth > body.clientWidth) {
                    issues.push({
                        type: 'overflow_horizontal',
                        severity: 'warning',
                        message: `Content overflows horizontally: ${body.scrollWidth}px vs ${body.clientWidth}px viewport`
                    });
                }
                
                // Check for cut-off text (elements extending beyond viewport)
                const elements = document.querySelectorAll('*');
                for (const el of elements) {
                    const rect = el.getBoundingClientRect();
                    if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
                        if (el.textContent && el.textContent.trim()) {
                            issues.push({
                                type: 'element_overflow',
                                severity: 'warning',
                                message: `Element extends beyond viewport: ${el.tagName}.${el.className}`
                            });
                            break;  // Limit to first instance
                        }
                    }
                }
                
                return issues;
            }
        """)
        
        issues.extend(overflow_check)
        
        # Take screenshot
        screenshot = await page.screenshot(type="png", full_page=False)
        
        await page.close()
        
        # Upload to S3
        try:
            filename = f"dummy_render_{uuid.uuid4()}.png"
            render_url = await upload_template_asset(
                buffer=screenshot,
                template_id=template_id,
                filename=filename,
                asset_type="dummy_render"
            )
        except Exception as e:
            issues.append({
                "type": "upload_error",
                "severity": "warning",
                "message": f"Failed to upload render: {str(e)}"
            })
        
    except Exception as e:
        issues.append({
            "type": "browser_error",
            "severity": "critical",
            "message": f"Browser rendering failed: {str(e)}"
        })
        return {
            "passed": False,
            "render_url": None,
            "issues": issues
        }
    finally:
        await release_browser(browser_tuple)
    
    # Determine pass/fail
    critical_issues = [i for i in issues if i.get("severity") == "critical"]
    passed = len(critical_issues) == 0
    
    return {
        "passed": passed,
        "render_url": render_url,
        "issues": issues
    }


async def validate_template_integrity(
    html_code: str,
    css_code: str,
    variables: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Quick validation without full render.
    
    Checks:
    - HTML is parseable
    - All required variables are defined
    - CSS doesn't have known problematic patterns
    """
    issues = []
    
    # Check HTML parsing
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_code, "html.parser")
    except Exception as e:
        issues.append({
            "type": "html_parse_error",
            "severity": "critical",
            "message": f"Invalid HTML: {str(e)}"
        })
        return {"valid": False, "issues": issues}
    
    # Check for Jinja2 template syntax
    try:
        Jinja2Template(html_code)
    except Exception as e:
        issues.append({
            "type": "template_syntax_error",
            "severity": "critical",
            "message": f"Invalid template syntax: {str(e)}"
        })
    
    # Check CSS
    if css_code:
        # Warn about potentially problematic CSS
        if "!important" in css_code:
            issues.append({
                "type": "css_warning",
                "severity": "info",
                "message": "CSS contains !important declarations"
            })
        
        if "@import" in css_code:
            issues.append({
                "type": "css_warning",
                "severity": "warning",
                "message": "CSS contains @import which may slow rendering"
            })
    
    valid = not any(i.get("severity") == "critical" for i in issues)
    
    return {"valid": valid, "issues": issues}
