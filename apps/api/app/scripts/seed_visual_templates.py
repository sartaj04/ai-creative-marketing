"""Seed system visual templates for social media content creation.

Run: python -m app.scripts.seed_visual_templates
"""

import asyncio
import logging
from uuid import uuid4

from sqlalchemy import select
from app.core.database import async_session_factory
from app.models.visual_template import VisualTemplate, VisualTemplateType

logger = logging.getLogger(__name__)

# ============================================================================
# Template definitions
# ============================================================================

SYSTEM_TEMPLATES = [
    # ── Quote Templates ────────────────────────────────────────────────
    {
        "name": "Bold Quote Card",
        "type": VisualTemplateType.IMAGE,
        "category": "quote",
        "tags": ["quote", "inspiration", "minimal"],
        "dimensions": {"width": 1080, "height": 1080},
        "variables_schema": {
            "quote_text": {"type": "textarea", "maxLength": 200, "required": True, "placeholder": "Your quote here..."},
            "author_name": {"type": "text", "maxLength": 60, "required": True, "placeholder": "Author Name"},
            "author_title": {"type": "text", "maxLength": 80, "placeholder": "Title or context"},
            "accent_color": {"type": "color", "default": "#0ea5e9"},
            "bg_color": {"type": "color", "default": "#0f172a"},
        },
        "default_values": {"accent_color": "#0ea5e9", "bg_color": "#0f172a"},
        "html_template": """<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1080px; background: {{bg_color}}; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; padding: 80px; }
.card { text-align: left; }
.quote-mark { font-size: 120px; color: {{accent_color}}; line-height: 1; margin-bottom: -20px; }
.quote { font-size: 42px; font-weight: 700; color: #fff; line-height: 1.3; margin-bottom: 40px; }
.author { font-size: 22px; color: {{accent_color}}; font-weight: 700; }
.title { font-size: 18px; color: rgba(255,255,255,0.6); margin-top: 8px; }
.line { width: 60px; height: 4px; background: {{accent_color}}; margin-bottom: 16px; }
</style></head><body>
<div class="card">
  <div class="quote-mark">"</div>
  <p class="quote">{{quote_text}}</p>
  <div class="line"></div>
  <p class="author">{{author_name}}</p>
  <p class="title">{{author_title}}</p>
</div>
</body></html>""",
    },
    {
        "name": "Gradient Quote",
        "type": VisualTemplateType.IMAGE,
        "category": "quote",
        "tags": ["quote", "gradient", "modern"],
        "dimensions": {"width": 1080, "height": 1080},
        "variables_schema": {
            "quote_text": {"type": "textarea", "maxLength": 180, "required": True},
            "author_name": {"type": "text", "maxLength": 60, "required": True},
        },
        "default_values": {},
        "html_template": """<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1080px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Outfit', sans-serif; display: flex; align-items: center; justify-content: center; padding: 100px; }
.quote { font-size: 44px; font-weight: 600; color: #fff; line-height: 1.35; margin-bottom: 40px; text-align: center; }
.author { font-size: 20px; color: rgba(255,255,255,0.8); text-align: center; }
</style></head><body>
<div>
  <p class="quote">"{{quote_text}}"</p>
  <p class="author">— {{author_name}}</p>
</div>
</body></html>""",
    },

    # ── Stats Templates ────────────────────────────────────────────────
    {
        "name": "Big Number Stat",
        "type": VisualTemplateType.IMAGE,
        "category": "stat",
        "tags": ["statistics", "data", "impact"],
        "dimensions": {"width": 1080, "height": 1080},
        "variables_schema": {
            "big_number": {"type": "text", "maxLength": 20, "required": True, "placeholder": "73%"},
            "stat_label": {"type": "text", "maxLength": 80, "required": True, "placeholder": "of marketers say AI improved ROI"},
            "source": {"type": "text", "maxLength": 60, "placeholder": "Source: HubSpot 2025"},
            "accent_color": {"type": "color", "default": "#10b981"},
        },
        "default_values": {"accent_color": "#10b981"},
        "html_template": """<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;800&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1080px; background: #0f172a; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; }
.container { text-align: center; padding: 80px; }
.number { font-size: 160px; font-weight: 800; color: {{accent_color}}; line-height: 1; margin-bottom: 30px; }
.label { font-size: 32px; color: #e2e8f0; line-height: 1.4; max-width: 700px; margin: 0 auto 40px; }
.source { font-size: 16px; color: rgba(255,255,255,0.4); }
</style></head><body>
<div class="container">
  <p class="number">{{big_number}}</p>
  <p class="label">{{stat_label}}</p>
  <p class="source">{{source}}</p>
</div>
</body></html>""",
    },

    # ── Tips Templates ─────────────────────────────────────────────────
    {
        "name": "Tips List Card",
        "type": VisualTemplateType.IMAGE,
        "category": "tips",
        "tags": ["tips", "list", "actionable"],
        "dimensions": {"width": 1080, "height": 1350},
        "variables_schema": {
            "headline": {"type": "text", "maxLength": 60, "required": True, "placeholder": "5 Tips for Better..."},
            "tip_1": {"type": "text", "maxLength": 80, "required": True},
            "tip_2": {"type": "text", "maxLength": 80, "required": True},
            "tip_3": {"type": "text", "maxLength": 80, "required": True},
            "tip_4": {"type": "text", "maxLength": 80},
            "tip_5": {"type": "text", "maxLength": 80},
            "accent_color": {"type": "color", "default": "#f59e0b"},
        },
        "default_values": {"accent_color": "#f59e0b"},
        "html_template": """<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1350px; background: #1e293b; font-family: 'Inter', sans-serif; padding: 80px; }
.headline { font-size: 48px; font-weight: 700; color: #fff; margin-bottom: 50px; line-height: 1.2; }
.tip { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 30px; }
.tip-num { width: 48px; height: 48px; border-radius: 12px; background: {{accent_color}}; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; color: #000; flex-shrink: 0; }
.tip-text { font-size: 24px; color: #e2e8f0; line-height: 1.4; padding-top: 8px; }
</style></head><body>
<h1 class="headline">{{headline}}</h1>
<div class="tip"><div class="tip-num">1</div><p class="tip-text">{{tip_1}}</p></div>
<div class="tip"><div class="tip-num">2</div><p class="tip-text">{{tip_2}}</p></div>
<div class="tip"><div class="tip-num">3</div><p class="tip-text">{{tip_3}}</p></div>
<div class="tip"><div class="tip-num">4</div><p class="tip-text">{{tip_4}}</p></div>
<div class="tip"><div class="tip-num">5</div><p class="tip-text">{{tip_5}}</p></div>
</body></html>""",
    },

    # ── Announcement Templates ─────────────────────────────────────────
    {
        "name": "Announcement Banner",
        "type": VisualTemplateType.IMAGE,
        "category": "announcement",
        "tags": ["announcement", "launch", "news"],
        "dimensions": {"width": 1080, "height": 1080},
        "variables_schema": {
            "headline": {"type": "text", "maxLength": 60, "required": True, "placeholder": "We're launching..."},
            "subtext": {"type": "textarea", "maxLength": 150, "placeholder": "Brief description"},
            "cta_text": {"type": "text", "maxLength": 30, "default": "Learn More"},
            "gradient_start": {"type": "color", "default": "#0ea5e9"},
            "gradient_end": {"type": "color", "default": "#6366f1"},
        },
        "default_values": {"cta_text": "Learn More", "gradient_start": "#0ea5e9", "gradient_end": "#6366f1"},
        "html_template": """<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1080px; background: linear-gradient(135deg, {{gradient_start}}, {{gradient_end}}); font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; padding: 100px; }
.container { text-align: center; }
.headline { font-size: 56px; font-weight: 800; color: #fff; line-height: 1.2; margin-bottom: 30px; }
.subtext { font-size: 24px; color: rgba(255,255,255,0.85); line-height: 1.5; margin-bottom: 50px; }
.cta { display: inline-block; padding: 16px 48px; background: #fff; color: {{gradient_start}}; font-size: 20px; font-weight: 700; border-radius: 50px; }
</style></head><body>
<div class="container">
  <h1 class="headline">{{headline}}</h1>
  <p class="subtext">{{subtext}}</p>
  <span class="cta">{{cta_text}}</span>
</div>
</body></html>""",
    },

    # ── Comparison Templates ───────────────────────────────────────────
    {
        "name": "Before vs After",
        "type": VisualTemplateType.IMAGE,
        "category": "comparison",
        "tags": ["comparison", "before-after", "transformation"],
        "dimensions": {"width": 1080, "height": 1080},
        "variables_schema": {
            "title": {"type": "text", "maxLength": 60, "required": True},
            "before_label": {"type": "text", "maxLength": 20, "default": "Before"},
            "after_label": {"type": "text", "maxLength": 20, "default": "After"},
            "before_1": {"type": "text", "maxLength": 60, "required": True},
            "before_2": {"type": "text", "maxLength": 60},
            "before_3": {"type": "text", "maxLength": 60},
            "after_1": {"type": "text", "maxLength": 60, "required": True},
            "after_2": {"type": "text", "maxLength": 60},
            "after_3": {"type": "text", "maxLength": 60},
        },
        "default_values": {"before_label": "Before", "after_label": "After"},
        "html_template": """<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1080px; background: #0f172a; font-family: 'Inter', sans-serif; padding: 70px; }
.title { font-size: 38px; font-weight: 700; color: #fff; text-align: center; margin-bottom: 50px; }
.grid { display: flex; gap: 30px; }
.col { flex: 1; }
.col-label { font-size: 20px; font-weight: 700; padding: 14px 0; text-align: center; border-radius: 12px; margin-bottom: 20px; }
.before .col-label { background: rgba(239,68,68,0.2); color: #ef4444; }
.after .col-label { background: rgba(16,185,129,0.2); color: #10b981; }
.item { font-size: 22px; color: #e2e8f0; padding: 16px 20px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-bottom: 12px; line-height: 1.4; }
</style></head><body>
<h1 class="title">{{title}}</h1>
<div class="grid">
  <div class="col before">
    <div class="col-label">❌ {{before_label}}</div>
    <div class="item">{{before_1}}</div>
    <div class="item">{{before_2}}</div>
    <div class="item">{{before_3}}</div>
  </div>
  <div class="col after">
    <div class="col-label">✅ {{after_label}}</div>
    <div class="item">{{after_1}}</div>
    <div class="item">{{after_2}}</div>
    <div class="item">{{after_3}}</div>
  </div>
</div>
</body></html>""",
    },

    # ── Checklist Templates ────────────────────────────────────────────
    {
        "name": "Checklist Card",
        "type": VisualTemplateType.IMAGE,
        "category": "checklist",
        "tags": ["checklist", "actionable", "todo"],
        "dimensions": {"width": 1080, "height": 1350},
        "variables_schema": {
            "headline": {"type": "text", "maxLength": 60, "required": True},
            "item_1": {"type": "text", "maxLength": 80, "required": True},
            "item_2": {"type": "text", "maxLength": 80, "required": True},
            "item_3": {"type": "text", "maxLength": 80, "required": True},
            "item_4": {"type": "text", "maxLength": 80},
            "item_5": {"type": "text", "maxLength": 80},
            "item_6": {"type": "text", "maxLength": 80},
            "accent_color": {"type": "color", "default": "#8b5cf6"},
        },
        "default_values": {"accent_color": "#8b5cf6"},
        "html_template": """<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1350px; background: #1a1a2e; font-family: 'Inter', sans-serif; padding: 80px; }
.headline { font-size: 46px; font-weight: 700; color: #fff; margin-bottom: 50px; line-height: 1.2; }
.item { display: flex; align-items: center; gap: 20px; margin-bottom: 28px; }
.check { width: 36px; height: 36px; border: 3px solid {{accent_color}}; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.text { font-size: 24px; color: #e2e8f0; line-height: 1.3; }
</style></head><body>
<h1 class="headline">{{headline}}</h1>
<div class="item"><div class="check">☐</div><p class="text">{{item_1}}</p></div>
<div class="item"><div class="check">☐</div><p class="text">{{item_2}}</p></div>
<div class="item"><div class="check">☐</div><p class="text">{{item_3}}</p></div>
<div class="item"><div class="check">☐</div><p class="text">{{item_4}}</p></div>
<div class="item"><div class="check">☐</div><p class="text">{{item_5}}</p></div>
<div class="item"><div class="check">☐</div><p class="text">{{item_6}}</p></div>
</body></html>""",
    },

    # ── Listicle Templates ─────────────────────────────────────────────
    {
        "name": "Numbered Listicle",
        "type": VisualTemplateType.IMAGE,
        "category": "listicle",
        "tags": ["listicle", "numbered", "educational"],
        "dimensions": {"width": 1080, "height": 1350},
        "variables_schema": {
            "headline": {"type": "text", "maxLength": 60, "required": True, "placeholder": "7 Things I Wish I Knew..."},
            "item_1": {"type": "text", "maxLength": 80, "required": True},
            "item_2": {"type": "text", "maxLength": 80, "required": True},
            "item_3": {"type": "text", "maxLength": 80, "required": True},
            "item_4": {"type": "text", "maxLength": 80},
            "item_5": {"type": "text", "maxLength": 80},
            "item_6": {"type": "text", "maxLength": 80},
            "item_7": {"type": "text", "maxLength": 80},
        },
        "default_values": {},
        "html_template": """<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1350px; background: linear-gradient(180deg, #1e1b4b, #312e81); font-family: 'Inter', sans-serif; padding: 80px; }
.headline { font-size: 44px; font-weight: 800; color: #fff; margin-bottom: 50px; line-height: 1.2; }
.item { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 24px; }
.num { font-size: 28px; font-weight: 800; color: #a78bfa; min-width: 40px; }
.text { font-size: 22px; color: #e2e8f0; line-height: 1.4; }
</style></head><body>
<h1 class="headline">{{headline}}</h1>
<div class="item"><span class="num">01</span><p class="text">{{item_1}}</p></div>
<div class="item"><span class="num">02</span><p class="text">{{item_2}}</p></div>
<div class="item"><span class="num">03</span><p class="text">{{item_3}}</p></div>
<div class="item"><span class="num">04</span><p class="text">{{item_4}}</p></div>
<div class="item"><span class="num">05</span><p class="text">{{item_5}}</p></div>
<div class="item"><span class="num">06</span><p class="text">{{item_6}}</p></div>
<div class="item"><span class="num">07</span><p class="text">{{item_7}}</p></div>
</body></html>""",
    },

    # ── Story Templates ────────────────────────────────────────────────
    {
        "name": "Personal Story Card",
        "type": VisualTemplateType.IMAGE,
        "category": "story",
        "tags": ["story", "personal", "authentic"],
        "dimensions": {"width": 1080, "height": 1080},
        "variables_schema": {
            "headline": {"type": "text", "maxLength": 60, "required": True, "placeholder": "The day I realized..."},
            "story_text": {"type": "textarea", "maxLength": 250, "required": True},
            "author_name": {"type": "text", "maxLength": 40},
            "bg_color": {"type": "color", "default": "#18181b"},
        },
        "default_values": {"bg_color": "#18181b"},
        "html_template": """<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Inter:wght@400;600&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1080px; background: {{bg_color}}; display: flex; align-items: center; justify-content: center; padding: 100px; }
.card { border-left: 4px solid #f59e0b; padding-left: 40px; }
.headline { font-family: 'Merriweather', serif; font-size: 36px; font-weight: 700; color: #fff; margin-bottom: 30px; line-height: 1.3; }
.story { font-family: 'Inter', sans-serif; font-size: 22px; color: #a1a1aa; line-height: 1.6; margin-bottom: 30px; }
.author { font-family: 'Inter', sans-serif; font-size: 18px; color: #f59e0b; font-weight: 600; }
</style></head><body>
<div class="card">
  <h2 class="headline">{{headline}}</h2>
  <p class="story">{{story_text}}</p>
  <p class="author">{{author_name}}</p>
</div>
</body></html>""",
    },

    # ── Carousel Templates ─────────────────────────────────────────────
    {
        "name": "Step-by-Step Carousel",
        "type": VisualTemplateType.CAROUSEL,
        "category": "tips",
        "tags": ["carousel", "steps", "how-to"],
        "dimensions": {"width": 1080, "height": 1350},
        "slide_count": 5,
        "variables_schema": {
            "headline": {"type": "text", "maxLength": 60, "required": True},
            "accent_color": {"type": "color", "default": "#0ea5e9"},
        },
        "slides_schema": {
            "title": {"type": "text", "maxLength": 40, "required": True},
            "body": {"type": "textarea", "maxLength": 120, "required": True},
        },
        "default_values": {"accent_color": "#0ea5e9"},
        "html_template": """<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1350px; background: #0f172a; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; justify-content: center; padding: 80px; }
.step-num { font-size: 72px; font-weight: 800; color: {{accent_color}}; opacity: 0.3; margin-bottom: 10px; }
.title { font-size: 48px; font-weight: 800; color: #fff; margin-bottom: 30px; line-height: 1.2; }
.body { font-size: 28px; color: #94a3b8; line-height: 1.5; }
.progress { position: absolute; bottom: 60px; left: 80px; right: 80px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; }
.progress-fill { height: 100%; background: {{accent_color}}; border-radius: 2px; width: {{progress_pct}}%; }
</style></head><body>
<div class="step-num">{{slide_number}}</div>
<h2 class="title">{{title}}</h2>
<p class="body">{{body}}</p>
<div class="progress"><div class="progress-fill"></div></div>
</body></html>""",
    },
    {
        "name": "Insight Carousel",
        "type": VisualTemplateType.CAROUSEL,
        "category": "listicle",
        "tags": ["carousel", "insights", "educational"],
        "dimensions": {"width": 1080, "height": 1350},
        "slide_count": 7,
        "variables_schema": {
            "headline": {"type": "text", "maxLength": 60, "required": True},
        },
        "slides_schema": {
            "title": {"type": "text", "maxLength": 50, "required": True},
            "body": {"type": "textarea", "maxLength": 150, "required": True},
            "emoji": {"type": "text", "maxLength": 4, "default": "💡"},
        },
        "default_values": {},
        "html_template": """<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1350px; background: linear-gradient(135deg, #1e1b4b, #312e81); font-family: 'Inter', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px; text-align: center; }
.emoji { font-size: 80px; margin-bottom: 30px; }
.title { font-size: 44px; font-weight: 700; color: #fff; margin-bottom: 30px; line-height: 1.25; }
.body { font-size: 26px; color: #c4b5fd; line-height: 1.5; max-width: 800px; }
.dots { position: absolute; bottom: 60px; display: flex; gap: 8px; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.2); }
.dot.active { background: #a78bfa; }
</style></head><body>
<div class="emoji">{{emoji}}</div>
<h2 class="title">{{title}}</h2>
<p class="body">{{body}}</p>
</body></html>""",
    },
    {
        "name": "Myth Buster Carousel",
        "type": VisualTemplateType.CAROUSEL,
        "category": "comparison",
        "tags": ["carousel", "myths", "debunk"],
        "dimensions": {"width": 1080, "height": 1350},
        "slide_count": 6,
        "variables_schema": {
            "headline": {"type": "text", "maxLength": 60, "required": True},
        },
        "slides_schema": {
            "myth": {"type": "text", "maxLength": 80, "required": True},
            "reality": {"type": "textarea", "maxLength": 150, "required": True},
        },
        "default_values": {},
        "html_template": """<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1350px; background: #0f172a; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; justify-content: center; padding: 80px; }
.myth-label { font-size: 18px; font-weight: 700; color: #ef4444; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px; }
.myth { font-size: 40px; font-weight: 800; color: #fff; margin-bottom: 50px; line-height: 1.2; text-decoration: line-through; text-decoration-color: #ef4444; }
.reality-label { font-size: 18px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px; }
.reality { font-size: 30px; color: #e2e8f0; line-height: 1.5; }
</style></head><body>
<p class="myth-label">❌ Myth</p>
<p class="myth">{{myth}}</p>
<p class="reality-label">✅ Reality</p>
<p class="reality">{{reality}}</p>
</body></html>""",
    },

    # ── Framework Templates ────────────────────────────────────────────
    {
        "name": "Framework Breakdown",
        "type": VisualTemplateType.IMAGE,
        "category": "tips",
        "tags": ["framework", "methodology", "professional"],
        "dimensions": {"width": 1080, "height": 1080},
        "variables_schema": {
            "framework_name": {"type": "text", "maxLength": 40, "required": True, "placeholder": "The STAR Method"},
            "step_1_letter": {"type": "text", "maxLength": 1, "required": True},
            "step_1_word": {"type": "text", "maxLength": 30, "required": True},
            "step_1_desc": {"type": "text", "maxLength": 60, "required": True},
            "step_2_letter": {"type": "text", "maxLength": 1, "required": True},
            "step_2_word": {"type": "text", "maxLength": 30, "required": True},
            "step_2_desc": {"type": "text", "maxLength": 60, "required": True},
            "step_3_letter": {"type": "text", "maxLength": 1, "required": True},
            "step_3_word": {"type": "text", "maxLength": 30, "required": True},
            "step_3_desc": {"type": "text", "maxLength": 60, "required": True},
            "step_4_letter": {"type": "text", "maxLength": 1},
            "step_4_word": {"type": "text", "maxLength": 30},
            "step_4_desc": {"type": "text", "maxLength": 60},
        },
        "default_values": {},
        "html_template": """<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1080px; background: #0f172a; font-family: 'Inter', sans-serif; padding: 80px; }
.framework-name { font-size: 40px; font-weight: 800; color: #fff; margin-bottom: 60px; text-align: center; }
.step { display: flex; align-items: flex-start; gap: 24px; margin-bottom: 32px; }
.letter { font-size: 56px; font-weight: 800; color: #6366f1; min-width: 60px; line-height: 1; }
.content { flex: 1; }
.word { font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 6px; }
.desc { font-size: 18px; color: #94a3b8; line-height: 1.4; }
</style></head><body>
<h1 class="framework-name">{{framework_name}}</h1>
<div class="step"><span class="letter">{{step_1_letter}}</span><div class="content"><p class="word">{{step_1_word}}</p><p class="desc">{{step_1_desc}}</p></div></div>
<div class="step"><span class="letter">{{step_2_letter}}</span><div class="content"><p class="word">{{step_2_word}}</p><p class="desc">{{step_2_desc}}</p></div></div>
<div class="step"><span class="letter">{{step_3_letter}}</span><div class="content"><p class="word">{{step_3_word}}</p><p class="desc">{{step_3_desc}}</p></div></div>
<div class="step"><span class="letter">{{step_4_letter}}</span><div class="content"><p class="word">{{step_4_word}}</p><p class="desc">{{step_4_desc}}</p></div></div>
</body></html>""",
    },

    # ── Minimal/Clean Templates ────────────────────────────────────────
    {
        "name": "Clean Text Card",
        "type": VisualTemplateType.IMAGE,
        "category": "quote",
        "tags": ["minimal", "clean", "text-only"],
        "dimensions": {"width": 1080, "height": 1080},
        "variables_schema": {
            "text": {"type": "textarea", "maxLength": 200, "required": True},
            "accent_color": {"type": "color", "default": "#ec4899"},
        },
        "default_values": {"accent_color": "#ec4899"},
        "html_template": """<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@600&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px; height: 1080px; background: #fff; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; padding: 120px; }
.text { font-size: 42px; font-weight: 600; color: #1e293b; line-height: 1.4; text-align: left; border-left: 6px solid {{accent_color}}; padding-left: 30px; }
</style></head><body>
<p class="text">{{text}}</p>
</body></html>""",
    },
]


async def seed_templates():
    """Insert system visual templates into the database."""
    async with async_session_factory() as db:
        # Check if templates already exist
        result = await db.execute(
            select(VisualTemplate).where(VisualTemplate.created_by.is_(None)).limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing:
            logger.info("System templates already seeded, skipping")
            return

        for tmpl_data in SYSTEM_TEMPLATES:
            template = VisualTemplate(
                id=uuid4(),
                name=tmpl_data["name"],
                type=tmpl_data["type"],
                category=tmpl_data["category"],
                html_template=tmpl_data.get("html_template"),
                variables_schema=tmpl_data.get("variables_schema", {}),
                slide_count=tmpl_data.get("slide_count"),
                slides_schema=tmpl_data.get("slides_schema"),
                default_values=tmpl_data.get("default_values", {}),
                tags=tmpl_data.get("tags", []),
                dimensions=tmpl_data.get("dimensions", {"width": 1080, "height": 1080}),
                created_by=None,  # System template
            )
            db.add(template)

        await db.commit()
        logger.info(f"Seeded {len(SYSTEM_TEMPLATES)} system visual templates")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed_templates())
