"""Seed script to populate visual_templates with professional image and carousel templates.

Run: cd apps/api && source venv/bin/activate && python scripts/seed_templates.py
"""
import asyncio
import sys
import uuid
from pathlib import Path

# Add project root to path so we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import engine, async_session_maker
from app.models.visual_template import VisualTemplate, VisualTemplateType


# ═══════════════════════════════════════════════════════════════════════
# IMAGE TEMPLATES
# ═══════════════════════════════════════════════════════════════════════

IMAGE_TEMPLATES = [
    # ── 1. Bold Quote Card ────────────────────────────────────────────
    {
        "name": "Bold Quote Card",
        "type": "image",
        "category": "quote",
        "tags": ["bold", "dark", "professional", "linkedin"],
        "platform": "both",
        "dimensions": {"width": 1080, "height": 1080},
        "variables_schema": {
            "quote": {"type": "textarea", "maxLength": 200, "required": True, "description": "The main quote text"},
            "author": {"type": "text", "maxLength": 60, "required": True, "description": "Author / attribution"},
            "accent_color": {"type": "text", "maxLength": 20, "description": "Accent color (hex)", "default": "#6366F1"},
        },
        "default_values": {
            "quote": "The best way to predict the future is to create it.",
            "author": "Peter Drucker",
            "accent_color": "#6366F1",
        },
        "html_template": """<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; background: #0F172A; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; }
  .card { width: 100%; height: 100%; padding: 100px 80px; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; }
  .card::before { content: ''; position: absolute; top: 0; left: 0; width: 8px; height: 100%; background: {{accent_color}}; }
  .card::after { content: '"'; position: absolute; top: 60px; right: 80px; font-size: 200px; font-weight: 900; color: {{accent_color}}; opacity: 0.15; line-height: 1; }
  .quote { font-size: 52px; font-weight: 700; color: #F1F5F9; line-height: 1.3; margin-bottom: 48px; letter-spacing: -0.5px; }
  .author { font-size: 24px; color: {{accent_color}}; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; }
  .dots { position: absolute; bottom: 60px; right: 80px; display: flex; gap: 8px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: {{accent_color}}; opacity: 0.4; }
  .dot:last-child { opacity: 1; }
</style></head>
<body><div class="card">
  <div class="quote">{{quote}}</div>
  <div class="author">— {{author}}</div>
  <div class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
</div></body></html>""",
    },

    # ── 2. Stat Highlight ─────────────────────────────────────────────
    {
        "name": "Stat Highlight",
        "type": "image",
        "category": "stat",
        "tags": ["stats", "data", "professional", "clean"],
        "platform": "both",
        "dimensions": {"width": 1080, "height": 1080},
        "variables_schema": {
            "stat_value": {"type": "text", "maxLength": 20, "required": True, "description": "The big number (e.g. 73%)"},
            "stat_label": {"type": "text", "maxLength": 80, "required": True, "description": "What the stat represents"},
            "source": {"type": "text", "maxLength": 60, "description": "Data source attribution"},
            "bg_color": {"type": "text", "maxLength": 20, "description": "Background gradient start", "default": "#7C3AED"},
        },
        "default_values": {
            "stat_value": "73%",
            "stat_label": "of professionals say AI will transform their industry within 2 years",
            "source": "McKinsey Global Survey 2025",
            "bg_color": "#7C3AED",
        },
        "html_template": """<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; background: linear-gradient(135deg, {{bg_color}} 0%, #1E1B4B 100%); font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; }
  .card { width: 100%; height: 100%; padding: 100px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; position: relative; }
  .stat { font-size: 180px; font-weight: 900; color: white; line-height: 1; margin-bottom: 32px; text-shadow: 0 4px 30px rgba(0,0,0,0.3); }
  .label { font-size: 36px; font-weight: 600; color: rgba(255,255,255,0.9); line-height: 1.4; max-width: 700px; }
  .source { position: absolute; bottom: 60px; font-size: 18px; color: rgba(255,255,255,0.5); font-weight: 400; }
  .ring { position: absolute; width: 500px; height: 500px; border: 3px solid rgba(255,255,255,0.08); border-radius: 50%; }
  .ring-1 { top: -100px; left: -100px; }
  .ring-2 { bottom: -80px; right: -80px; width: 400px; height: 400px; }
</style></head>
<body><div class="card">
  <div class="ring ring-1"></div>
  <div class="ring ring-2"></div>
  <div class="stat">{{stat_value}}</div>
  <div class="label">{{stat_label}}</div>
  <div class="source">Source: {{source}}</div>
</div></body></html>""",
    },

    # ── 3. Tips Card ──────────────────────────────────────────────────
    {
        "name": "Pro Tips Card",
        "type": "image",
        "category": "tips",
        "tags": ["tips", "advice", "clean", "professional"],
        "platform": "both",
        "dimensions": {"width": 1080, "height": 1350},
        "variables_schema": {
            "title": {"type": "text", "maxLength": 60, "required": True, "description": "Card title"},
            "tip_1": {"type": "text", "maxLength": 80, "required": True, "description": "First tip"},
            "tip_2": {"type": "text", "maxLength": 80, "required": True, "description": "Second tip"},
            "tip_3": {"type": "text", "maxLength": 80, "required": True, "description": "Third tip"},
            "tip_4": {"type": "text", "maxLength": 80, "description": "Fourth tip (optional)"},
            "tip_5": {"type": "text", "maxLength": 80, "description": "Fifth tip (optional)"},
        },
        "default_values": {
            "title": "5 Morning Habits of Top CEOs",
            "tip_1": "Wake up before 6 AM consistently",
            "tip_2": "Exercise for at least 30 minutes",
            "tip_3": "Review priorities before checking email",
            "tip_4": "Practice 10 minutes of mindfulness",
            "tip_5": "Write 3 things you're grateful for",
        },
        "html_template": """<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1350px; background: #FAFBFC; font-family: 'Inter', sans-serif; }
  .card { width: 100%; height: 100%; padding: 80px 70px; display: flex; flex-direction: column; }
  .badge { display: inline-block; background: linear-gradient(135deg, #06B6D4, #3B82F6); color: white; font-size: 16px; font-weight: 600; padding: 10px 24px; border-radius: 30px; margin-bottom: 32px; letter-spacing: 1px; text-transform: uppercase; width: fit-content; }
  .title { font-size: 48px; font-weight: 800; color: #0F172A; line-height: 1.2; margin-bottom: 48px; }
  .tip { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 28px; }
  .num { width: 48px; height: 48px; min-width: 48px; background: linear-gradient(135deg, #06B6D4, #3B82F6); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 20px; }
  .tip-text { font-size: 26px; font-weight: 600; color: #334155; line-height: 1.4; padding-top: 6px; }
  .footer { margin-top: auto; border-top: 2px solid #E2E8F0; padding-top: 24px; font-size: 18px; color: #94A3B8; font-weight: 400; }
</style></head>
<body><div class="card">
  <div class="badge">💡 Pro Tips</div>
  <div class="title">{{title}}</div>
  <div class="tip"><div class="num">1</div><div class="tip-text">{{tip_1}}</div></div>
  <div class="tip"><div class="num">2</div><div class="tip-text">{{tip_2}}</div></div>
  <div class="tip"><div class="num">3</div><div class="tip-text">{{tip_3}}</div></div>
  <div class="tip"><div class="num">4</div><div class="tip-text">{{tip_4}}</div></div>
  <div class="tip"><div class="num">5</div><div class="tip-text">{{tip_5}}</div></div>
  <div class="footer">Save this for later ↗</div>
</div></body></html>""",
    },

    # ── 4. Announcement Card ──────────────────────────────────────────
    {
        "name": "Announcement Banner",
        "type": "image",
        "category": "announcement",
        "tags": ["announcement", "launch", "gradient", "bold"],
        "platform": "both",
        "dimensions": {"width": 1080, "height": 1080},
        "variables_schema": {
            "headline": {"type": "text", "maxLength": 60, "required": True, "description": "Main headline"},
            "subtext": {"type": "textarea", "maxLength": 120, "description": "Supporting description"},
            "cta": {"type": "text", "maxLength": 30, "description": "Call to action text", "default": "Learn More →"},
        },
        "default_values": {
            "headline": "We Just Launched Something Big",
            "subtext": "After months of building, we're thrilled to share our latest product with the world.",
            "cta": "Learn More →",
        },
        "html_template": """<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; background: linear-gradient(160deg, #0F172A 0%, #1E293B 50%, #0F172A 100%); font-family: 'Inter', sans-serif; overflow: hidden; }
  .card { width: 100%; height: 100%; padding: 100px 80px; display: flex; flex-direction: column; justify-content: center; position: relative; }
  .glow { position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%); top: 50%; left: 50%; transform: translate(-50%,-50%); filter: blur(60px); }
  .emoji { font-size: 64px; margin-bottom: 32px; }
  .headline { font-size: 56px; font-weight: 900; color: white; line-height: 1.15; margin-bottom: 24px; letter-spacing: -1px; position: relative; z-index: 1; }
  .subtext { font-size: 26px; color: rgba(255,255,255,0.7); line-height: 1.5; max-width: 700px; margin-bottom: 40px; position: relative; z-index: 1; }
  .cta { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; font-size: 22px; font-weight: 700; padding: 18px 40px; border-radius: 14px; position: relative; z-index: 1; }
</style></head>
<body><div class="card">
  <div class="glow"></div>
  <div class="emoji">🚀</div>
  <div class="headline">{{headline}}</div>
  <div class="subtext">{{subtext}}</div>
  <div class="cta">{{cta}}</div>
</div></body></html>""",
    },

    # ── 5. Comparison / Before-After ──────────────────────────────────
    {
        "name": "Before vs After",
        "type": "image",
        "category": "comparison",
        "tags": ["comparison", "before-after", "split", "professional"],
        "platform": "both",
        "dimensions": {"width": 1080, "height": 1080},
        "variables_schema": {
            "title": {"type": "text", "maxLength": 60, "required": True, "description": "Comparison title"},
            "before_1": {"type": "text", "maxLength": 60, "required": True},
            "before_2": {"type": "text", "maxLength": 60, "required": True},
            "before_3": {"type": "text", "maxLength": 60, "required": True},
            "after_1": {"type": "text", "maxLength": 60, "required": True},
            "after_2": {"type": "text", "maxLength": 60, "required": True},
            "after_3": {"type": "text", "maxLength": 60, "required": True},
        },
        "default_values": {
            "title": "Content Strategy",
            "before_1": "Post randomly when inspired",
            "before_2": "Copy what competitors do",
            "before_3": "Chase vanity metrics",
            "after_1": "Consistent weekly schedule",
            "after_2": "Build unique POV from experience",
            "after_3": "Track lead gen & conversations",
        },
        "html_template": """<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; background: #0F172A; font-family: 'Inter', sans-serif; }
  .card { width: 100%; height: 100%; padding: 70px; display: flex; flex-direction: column; }
  .header { font-size: 40px; font-weight: 800; color: white; text-align: center; margin-bottom: 48px; }
  .columns { display: flex; flex: 1; gap: 24px; }
  .col { flex: 1; border-radius: 20px; padding: 40px 32px; display: flex; flex-direction: column; }
  .col-before { background: rgba(239,68,68,0.1); border: 2px solid rgba(239,68,68,0.3); }
  .col-after { background: rgba(34,197,94,0.1); border: 2px solid rgba(34,197,94,0.3); }
  .col-title { font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 36px; text-align: center; padding-bottom: 20px; border-bottom: 2px solid rgba(255,255,255,0.1); }
  .col-before .col-title { color: #EF4444; }
  .col-after .col-title { color: #22C55E; }
  .item { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 28px; }
  .icon { font-size: 22px; min-width: 28px; margin-top: 2px; }
  .text { font-size: 24px; color: rgba(255,255,255,0.85); line-height: 1.35; font-weight: 500; }
</style></head>
<body><div class="card">
  <div class="header">{{title}}</div>
  <div class="columns">
    <div class="col col-before">
      <div class="col-title">❌ Before</div>
      <div class="item"><span class="icon">•</span><span class="text">{{before_1}}</span></div>
      <div class="item"><span class="icon">•</span><span class="text">{{before_2}}</span></div>
      <div class="item"><span class="icon">•</span><span class="text">{{before_3}}</span></div>
    </div>
    <div class="col col-after">
      <div class="col-title">✅ After</div>
      <div class="item"><span class="icon">•</span><span class="text">{{after_1}}</span></div>
      <div class="item"><span class="icon">•</span><span class="text">{{after_2}}</span></div>
      <div class="item"><span class="icon">•</span><span class="text">{{after_3}}</span></div>
    </div>
  </div>
</div></body></html>""",
    },

    # ── 6. Checklist Card ─────────────────────────────────────────────
    {
        "name": "Checklist Card",
        "type": "image",
        "category": "checklist",
        "tags": ["checklist", "clean", "minimal", "actionable"],
        "platform": "both",
        "dimensions": {"width": 1080, "height": 1350},
        "variables_schema": {
            "title": {"type": "text", "maxLength": 60, "required": True, "description": "Checklist title"},
            "item_1": {"type": "text", "maxLength": 60, "required": True},
            "item_2": {"type": "text", "maxLength": 60, "required": True},
            "item_3": {"type": "text", "maxLength": 60, "required": True},
            "item_4": {"type": "text", "maxLength": 60},
            "item_5": {"type": "text", "maxLength": 60},
            "item_6": {"type": "text", "maxLength": 60},
        },
        "default_values": {
            "title": "Your LinkedIn Profile Audit",
            "item_1": "Professional headshot (not a selfie)",
            "item_2": "Headline that shows value, not just title",
            "item_3": "Custom banner with clear CTA",
            "item_4": "About section with 3 clear paragraphs",
            "item_5": "5+ pinned featured posts",
            "item_6": "Skills endorsed by real connections",
        },
        "html_template": """<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1350px; background: #FFFFFF; font-family: 'Inter', sans-serif; }
  .card { width: 100%; height: 100%; padding: 80px 70px; display: flex; flex-direction: column; }
  .title { font-size: 44px; font-weight: 800; color: #0F172A; margin-bottom: 12px; line-height: 1.2; }
  .subtitle { font-size: 20px; color: #64748B; margin-bottom: 48px; }
  .item { display: flex; align-items: center; gap: 20px; padding: 24px 0; border-bottom: 1px solid #F1F5F9; }
  .check { width: 36px; height: 36px; min-width: 36px; border: 3px solid #6366F1; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .check-inner { width: 20px; height: 20px; background: #6366F1; border-radius: 5px; opacity: 0; }
  .item:nth-child(-n+3) .check-inner { opacity: 1; }
  .item-text { font-size: 26px; font-weight: 600; color: #1E293B; line-height: 1.3; }
  .footer { margin-top: auto; padding-top: 32px; font-size: 20px; color: #6366F1; font-weight: 600; }
</style></head>
<body><div class="card">
  <div class="title">{{title}}</div>
  <div class="subtitle">✅ Check off each item</div>
  <div class="item"><div class="check"><div class="check-inner"></div></div><div class="item-text">{{item_1}}</div></div>
  <div class="item"><div class="check"><div class="check-inner"></div></div><div class="item-text">{{item_2}}</div></div>
  <div class="item"><div class="check"><div class="check-inner"></div></div><div class="item-text">{{item_3}}</div></div>
  <div class="item"><div class="check"><div class="check-inner"></div></div><div class="item-text">{{item_4}}</div></div>
  <div class="item"><div class="check"><div class="check-inner"></div></div><div class="item-text">{{item_5}}</div></div>
  <div class="item"><div class="check"><div class="check-inner"></div></div><div class="item-text">{{item_6}}</div></div>
  <div class="footer">How many did you check? ↗</div>
</div></body></html>""",
    },

    # ── 7. Story / Testimonial Card ───────────────────────────────────
    {
        "name": "Story Spotlight",
        "type": "image",
        "category": "story",
        "tags": ["story", "testimonial", "personal", "warm"],
        "platform": "both",
        "dimensions": {"width": 1080, "height": 1080},
        "variables_schema": {
            "story_text": {"type": "textarea", "maxLength": 180, "required": True, "description": "The personal story or testimonial"},
            "name": {"type": "text", "maxLength": 40, "required": True, "description": "Person's name"},
            "role": {"type": "text", "maxLength": 60, "description": "Person's role or title"},
        },
        "default_values": {
            "story_text": "I was rejected from 47 companies before one said yes. That one yes changed everything. Don't let the no's define your story.",
            "name": "Alex Rivera",
            "role": "Founder & CEO, TechCraft",
        },
        "html_template": """<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; background: linear-gradient(170deg, #FFF7ED, #FFFBEB, #FFF1F2); font-family: 'Inter', sans-serif; }
  .card { width: 100%; height: 100%; padding: 100px 80px; display: flex; flex-direction: column; justify-content: center; position: relative; }
  .quote-mark { font-family: 'Playfair Display', serif; font-size: 180px; color: #F97316; opacity: 0.15; line-height: 1; position: absolute; top: 40px; left: 60px; }
  .story { font-size: 40px; font-weight: 600; color: #1C1917; line-height: 1.45; margin-bottom: 48px; position: relative; z-index: 1; }
  .person { display: flex; align-items: center; gap: 16px; position: relative; z-index: 1; }
  .avatar { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #F97316, #EF4444); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 22px; }
  .info .name { font-size: 22px; font-weight: 700; color: #1C1917; }
  .info .role { font-size: 18px; color: #78716C; margin-top: 2px; }
</style></head>
<body><div class="card">
  <div class="quote-mark">"</div>
  <div class="story">{{story_text}}</div>
  <div class="person">
    <div class="avatar">{{name}}</div>
    <div class="info">
      <div class="name">{{name}}</div>
      <div class="role">{{role}}</div>
    </div>
  </div>
</div></body></html>""",
    },

    # ── 8. Listicle Header ────────────────────────────────────────────
    {
        "name": "Listicle Header",
        "type": "image",
        "category": "listicle",
        "tags": ["listicle", "hook", "numbered", "engaging"],
        "platform": "both",
        "dimensions": {"width": 1080, "height": 1080},
        "variables_schema": {
            "number": {"type": "text", "maxLength": 5, "required": True, "description": "The number (e.g. '7')"},
            "title": {"type": "text", "maxLength": 80, "required": True, "description": "What the list is about"},
            "subtitle": {"type": "text", "maxLength": 60, "description": "Optional subtitle"},
        },
        "default_values": {
            "number": "7",
            "title": "Tools Every Solopreneur Needs in 2025",
            "subtitle": "That actually save you time & money",
        },
        "html_template": """<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; background: #0F172A; font-family: 'Inter', sans-serif; overflow: hidden; }
  .card { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 80px; position: relative; }
  .bg-num { position: absolute; font-size: 500px; font-weight: 900; color: rgba(99,102,241,0.07); line-height: 1; z-index: 0; }
  .number { font-size: 120px; font-weight: 900; background: linear-gradient(135deg, #6366F1, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 16px; position: relative; z-index: 1; }
  .title { font-size: 48px; font-weight: 800; color: white; line-height: 1.25; max-width: 700px; position: relative; z-index: 1; margin-bottom: 20px; }
  .subtitle { font-size: 26px; color: rgba(255,255,255,0.5); font-weight: 400; position: relative; z-index: 1; }
  .swipe { position: absolute; bottom: 50px; font-size: 18px; color: rgba(255,255,255,0.3); font-weight: 600; letter-spacing: 2px; text-transform: uppercase; }
</style></head>
<body><div class="card">
  <div class="bg-num">{{number}}</div>
  <div class="number">{{number}}</div>
  <div class="title">{{title}}</div>
  <div class="subtitle">{{subtitle}}</div>
  <div class="swipe">Swipe to save →</div>
</div></body></html>""",
    },
]

# ═══════════════════════════════════════════════════════════════════════
# CAROUSEL TEMPLATES
# ═══════════════════════════════════════════════════════════════════════

CAROUSEL_TEMPLATES = [
    # ── 1. Tips Carousel (5 slides) ───────────────────────────────────
    {
        "name": "Tips Carousel — Dark",
        "type": "carousel",
        "category": "tips",
        "tags": ["tips", "carousel", "dark", "swipeable"],
        "platform": "both",
        "dimensions": {"width": 1080, "height": 1350},
        "slide_count": 5,
        "slides_schema": {
            "slide_template": {
                "title": {"type": "text", "maxLength": 60, "required": True},
                "body": {"type": "textarea", "maxLength": 200},
            },
        },
        "default_values": {
            "slide_1_title": "5 LinkedIn Growth Tips",
            "slide_1_body": "That actually work in 2025. Swipe →",
            "slide_2_title": "Tip 1: Post Consistently",
            "slide_2_body": "3-5 times per week. The algorithm rewards consistency over perfection.",
            "slide_3_title": "Tip 2: Hook in 2 Lines",
            "slide_3_body": "If your first two lines don't stop the scroll, nothing else matters.",
            "slide_4_title": "Tip 3: Engage Before Posting",
            "slide_4_body": "Spend 15 min commenting on others' posts before publishing your own.",
            "slide_5_title": "Tip 5: End with a Question",
            "slide_5_body": "Comments > likes. Ask a question that makes people think.",
        },
        "html_template": """<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1350px; background: #0F172A; font-family: 'Inter', sans-serif; }
  .slide { width: 100%; height: 100%; padding: 80px 70px; display: flex; flex-direction: column; justify-content: center; position: relative; }
  .slide-num { position: absolute; top: 50px; right: 60px; font-size: 18px; color: rgba(255,255,255,0.3); font-weight: 600; }
  .accent-bar { width: 60px; height: 6px; background: linear-gradient(90deg, #6366F1, #EC4899); border-radius: 3px; margin-bottom: 32px; }
  .title { font-size: 52px; font-weight: 900; color: white; line-height: 1.2; margin-bottom: 24px; }
  .body { font-size: 30px; color: rgba(255,255,255,0.7); line-height: 1.5; }
  .dots { position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.2); }
  .dot.active { background: #6366F1; width: 30px; border-radius: 5px; }
</style></head>
<body><div class="slide">
  <div class="slide-num">{{slide_number}} / {{total_slides}}</div>
  <div class="accent-bar"></div>
  <div class="title">{{title}}</div>
  <div class="body">{{body}}</div>
  <div class="dots">
    <span class="dot active"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span>
  </div>
</div></body></html>""",
    },

    # ── 2. Story/Educational Carousel (7 slides) ─────────────────────
    {
        "name": "Story Carousel — Gradient",
        "type": "carousel",
        "category": "story",
        "tags": ["story", "educational", "gradient", "carousel"],
        "platform": "both",
        "dimensions": {"width": 1080, "height": 1350},
        "slide_count": 7,
        "slides_schema": {
            "slide_template": {
                "title": {"type": "text", "maxLength": 60, "required": True},
                "body": {"type": "textarea", "maxLength": 250},
            },
        },
        "default_values": {
            "slide_1_title": "How I Built a $1M Side Business",
            "slide_1_body": "While working a full-time job. Here's the real story. →",
            "slide_2_title": "The Starting Point",
            "slide_2_body": "In 2022, I was burned out at my 9-5 but had a mortgage and a kid. Quitting wasn't an option.",
            "slide_3_title": "The First Step",
            "slide_3_body": "I started sharing what I knew on LinkedIn. Just 3 posts a week. No strategy, just value.",
            "slide_4_title": "The Turning Point",
            "slide_4_body": "After 6 months, a post went viral (120K views). People started asking me to consult.",
            "slide_5_title": "The System",
            "slide_5_body": "I built a simple system: content → leads → calls → clients. 2 hours a day, every day.",
            "slide_6_title": "The Result",
            "slide_6_body": "Month 18: $83K/month in recurring revenue. I quit my job on my terms.",
            "slide_7_title": "The Lesson",
            "slide_7_body": "You don't need a revolutionary idea. You need consistency + genuine value + patience.",
        },
        "html_template": """<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1350px; background: linear-gradient(170deg, #1E1B4B 0%, #312E81 50%, #1E1B4B 100%); font-family: 'Inter', sans-serif; }
  .slide { width: 100%; height: 100%; padding: 80px 70px; display: flex; flex-direction: column; justify-content: center; position: relative; }
  .glow { position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, rgba(167,139,250,0.2), transparent 70%); top: 10%; right: 0; filter: blur(40px); }
  .chapter { display: inline-block; background: rgba(167,139,250,0.2); border: 1px solid rgba(167,139,250,0.3); color: #C4B5FD; font-size: 16px; font-weight: 600; padding: 8px 20px; border-radius: 20px; margin-bottom: 28px; width: fit-content; }
  .title { font-size: 52px; font-weight: 900; color: white; line-height: 1.2; margin-bottom: 28px; position: relative; z-index: 1; }
  .body { font-size: 28px; color: rgba(255,255,255,0.75); line-height: 1.55; max-width: 850px; position: relative; z-index: 1; }
  .progress { position: absolute; bottom: 50px; left: 70px; right: 70px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #8B5CF6, #EC4899); border-radius: 2px; width: 14%; }
</style></head>
<body><div class="slide">
  <div class="glow"></div>
  <div class="chapter">{{slide_number}} of {{total_slides}}</div>
  <div class="title">{{title}}</div>
  <div class="body">{{body}}</div>
  <div class="progress"><div class="progress-fill"></div></div>
</div></body></html>""",
    },

    # ── 3. How-To Carousel (5 slides) ─────────────────────────────────
    {
        "name": "How-To Guide",
        "type": "carousel",
        "category": "how-to",
        "tags": ["how-to", "tutorial", "step-by-step", "clean"],
        "platform": "both",
        "dimensions": {"width": 1080, "height": 1350},
        "slide_count": 5,
        "slides_schema": {
            "slide_template": {
                "title": {"type": "text", "maxLength": 60, "required": True},
                "body": {"type": "textarea", "maxLength": 200},
            },
        },
        "default_values": {
            "slide_1_title": "How to Write a LinkedIn Post That Gets 10K+ Views",
            "slide_1_body": "A step-by-step guide. Save this. →",
            "slide_2_title": "Step 1: The Hook",
            "slide_2_body": "Start with a bold claim, a surprising stat, or a personal confession. Make them stop scrolling.",
            "slide_3_title": "Step 2: The Story",
            "slide_3_body": "Tell a real experience. People don't connect with advice — they connect with stories.",
            "slide_4_title": "Step 3: The Insight",
            "slide_4_body": "Share one clear takeaway. Not five. One powerful lesson they can apply today.",
            "slide_5_title": "Step 4: The CTA",
            "slide_5_body": "End with a question or ask for a share. The algorithm loves comments. Make it easy to engage.",
        },
        "html_template": """<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1350px; background: #FAFBFC; font-family: 'Inter', sans-serif; }
  .slide { width: 100%; height: 100%; padding: 80px 70px; display: flex; flex-direction: column; justify-content: center; position: relative; }
  .step-indicator { position: absolute; top: 50px; right: 60px; }
  .step-badge { background: linear-gradient(135deg, #06B6D4, #3B82F6); color: white; font-size: 16px; font-weight: 700; padding: 10px 24px; border-radius: 30px; }
  .title { font-size: 48px; font-weight: 900; color: #0F172A; line-height: 1.2; margin-bottom: 28px; }
  .body { font-size: 28px; color: #475569; line-height: 1.55; }
  .bottom-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 8px; background: linear-gradient(90deg, #06B6D4, #3B82F6); }
</style></head>
<body><div class="slide">
  <div class="step-indicator"><span class="step-badge">{{slide_number}} / {{total_slides}}</span></div>
  <div class="title">{{title}}</div>
  <div class="body">{{body}}</div>
  <div class="bottom-bar"></div>
</div></body></html>""",
    },

    # ── 4. Listicle Carousel (6 slides) ───────────────────────────────
    {
        "name": "Listicle Carousel — Neon",
        "type": "carousel",
        "category": "listicle",
        "tags": ["listicle", "numbered", "neon", "dark"],
        "platform": "both",
        "dimensions": {"width": 1080, "height": 1350},
        "slide_count": 6,
        "slides_schema": {
            "slide_template": {
                "title": {"type": "text", "maxLength": 60, "required": True},
                "body": {"type": "textarea", "maxLength": 200},
            },
        },
        "default_values": {
            "slide_1_title": "6 Books That Changed How I Think About Business",
            "slide_1_body": "These aren't the usual suspects. Swipe →",
            "slide_2_title": "1. The Mom Test",
            "slide_2_body": "How to talk to customers and learn if your business is a good idea when everyone is lying to you.",
            "slide_3_title": "2. $100M Offers",
            "slide_3_body": "Create offers so good, people feel stupid saying no. By Alex Hormozi.",
            "slide_4_title": "3. Working Backwards",
            "slide_4_body": "Amazon's internal playbook for invention. Start from the customer and work backwards.",
            "slide_5_title": "4. Thinking in Bets",
            "slide_5_body": "Make smarter decisions without all the data. By Annie Duke (former poker champion).",
            "slide_6_title": "5. Never Split the Difference",
            "slide_6_body": "Negotiation tactics from an FBI hostage negotiator. Applies to business and life.",
        },
        "html_template": """<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1350px; background: #09090B; font-family: 'Inter', sans-serif; }
  .slide { width: 100%; height: 100%; padding: 80px 70px; display: flex; flex-direction: column; justify-content: center; position: relative; }
  .side-glow { position: absolute; left: 0; top: 30%; width: 6px; height: 40%; background: linear-gradient(180deg, #22D3EE, #8B5CF6); border-radius: 0 3px 3px 0; box-shadow: 0 0 30px rgba(34,211,238,0.4); }
  .slide-num { font-size: 100px; font-weight: 900; background: linear-gradient(135deg, #22D3EE, #8B5CF6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; opacity: 0.15; position: absolute; top: 40px; right: 60px; }
  .title { font-size: 48px; font-weight: 900; color: #FAFAFA; line-height: 1.2; margin-bottom: 24px; }
  .body { font-size: 26px; color: rgba(250,250,250,0.6); line-height: 1.55; }
  .nav { position: absolute; bottom: 50px; left: 70px; font-size: 16px; color: rgba(250,250,250,0.25); font-weight: 600; letter-spacing: 2px; }
</style></head>
<body><div class="slide">
  <div class="side-glow"></div>
  <div class="slide-num">{{slide_number}}</div>
  <div class="title">{{title}}</div>
  <div class="body">{{body}}</div>
  <div class="nav">{{slide_number}} / {{total_slides}}</div>
</div></body></html>""",
    },
]


# ═══════════════════════════════════════════════════════════════════════
# SEED FUNCTION
# ═══════════════════════════════════════════════════════════════════════

async def seed_templates():
    """Insert all seed templates into the database."""
    async with async_session_maker() as session:
        count = 0
        all_templates = IMAGE_TEMPLATES + CAROUSEL_TEMPLATES

        for t in all_templates:
            template = VisualTemplate(
                id=uuid.uuid4(),
                name=t["name"],
                type=VisualTemplateType(t["type"]),
                category=t["category"],
                html_template=t.get("html_template"),
                variables_schema=t.get("variables_schema", {}),
                slide_count=t.get("slide_count"),
                slides_schema=t.get("slides_schema"),
                default_values=t.get("default_values", {}),
                tags=t.get("tags", []),
                platform=t.get("platform", "both"),
                dimensions=t.get("dimensions", {"width": 1080, "height": 1080}),
                is_system=True,
                is_active=True,
                created_by=None,
            )
            session.add(template)
            count += 1
            print(f"  ✅ {t['type'].upper():>8} | {t['name']}")

        await session.commit()
        print(f"\n🎉 Seeded {count} templates ({len(IMAGE_TEMPLATES)} images, {len(CAROUSEL_TEMPLATES)} carousels)")


if __name__ == "__main__":
    print("🌱 Seeding visual templates...\n")
    asyncio.run(seed_templates())
