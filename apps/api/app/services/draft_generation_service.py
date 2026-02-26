"""Draft Generation Service — Mode 2 (deterministic).

Generates a Draft by filling a saved VisualTemplate with LLM-generated variable values.

Responsibilities:
  - Load VisualTemplate + SlideTemplate records from DB
  - Build brand context from Profile (or accept explicit override)
  - Call LLM once to generate variable values (NOT HTML, NOT layout)
  - Substitute variables into stored per-slide HTML
  - Render each slide to PNG via TemplateRendererService (Playwright)
  - Persist Draft + DraftSlide + MediaAsset records
  - Return fully loaded Draft ORM object

No vision analysis, no HTML generation, no layout decisions.
"""
import json
import logging
import re
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.draft import AgentType, Draft, DraftFormat, DraftStatus
from app.models.draft_slide import DraftSlide
from app.models.media_asset import MediaAsset, MediaAssetType
from app.models.profile import Profile
from app.models.slide_template import SlideTemplate
from app.models.visual_template import VisualTemplate, VisualTemplateType

logger = logging.getLogger(__name__)


class DraftGenerationService:
    """Generates a rendered Draft from a saved VisualTemplate.

    Usage:
        service = DraftGenerationService(db=db)
        draft = await service.run(template_id=..., profile_id=..., brand_context=...)
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Public API ────────────────────────────────────────────────────

    async def run(
        self,
        template_id: UUID,
        profile_id: UUID,
        brand_context: dict | None = None,
    ) -> Draft:
        """Generate and persist a Draft from a VisualTemplate.

        Args:
            template_id: UUID of an existing VisualTemplate
            profile_id:  UUID of the profile to generate for
            brand_context: Optional dict with brand overrides:
                {primary_color, secondary_color, font_family, persona_summary, tone}
                If None, auto-loaded from profile.

        Returns:
            Draft ORM object with slides and media_assets eagerly loaded.

        Raises:
            ValueError: Template not found, inactive, or carousel has no slides.
            RuntimeError: LLM or rendering failure.
        """
        template = await self._load_template(template_id)

        if brand_context is None:
            brand_context = await self._build_brand_context(profile_id)

        is_carousel = template.type == VisualTemplateType.CAROUSEL

        if is_carousel:
            if not template.slides:
                raise ValueError(
                    f"Carousel template '{template.name}' ({template_id}) has no "
                    "SlideTemplate records. An admin must save the template with "
                    "per-slide HTML before drafts can be generated."
                )
            variable_sets = await self._generate_carousel_variables(template, brand_context)
        else:
            variable_sets = [await self._generate_image_variables(template, brand_context)]

        # Create Draft — flush to obtain ID without committing
        draft = Draft(
            profile_id=profile_id,
            visual_template_id=template.id,
            status=DraftStatus.INBOX,
            format=DraftFormat.CAROUSEL if is_carousel else DraftFormat.POST,
            hook=brand_context.get("generated_hook", f"Generated from {template.name}"),
            body=brand_context.get("generated_caption", ""),
            generated_by=AgentType.CONTENT_AGENCY,
            topic=f"Visual draft: {template.name}",
            confidence=0.8,
            sources_json=[],
        )
        self.db.add(draft)
        await self.db.flush()  # draft.id now available; still within the transaction

        # Render slides / single image
        from app.services.template_renderer_service import get_template_renderer
        from app.services.storage_service import get_storage_service

        renderer = await get_template_renderer()
        storage = get_storage_service()
        dimensions = template.dimensions or {"width": 1080, "height": 1080}
        width = int(dimensions.get("width", 1080))
        height = int(dimensions.get("height", 1080))
        brand_overrides = self._extract_brand_overrides(brand_context)

        if is_carousel:
            slides = sorted(template.slides, key=lambda s: s.order)
            await self._render_carousel_slides(
                draft=draft,
                slides=slides,
                variable_sets=variable_sets,
                renderer=renderer,
                storage=storage,
                width=width,
                height=height,
                brand_overrides=brand_overrides,
            )
        else:
            await self._render_single_image(
                draft=draft,
                template=template,
                variables=variable_sets[0],
                renderer=renderer,
                storage=storage,
                width=width,
                height=height,
                brand_overrides=brand_overrides,
            )

        await self.db.commit()
        await self.db.refresh(draft, attribute_names=["slides", "media_assets"])
        return draft

    # ── Template Loading ──────────────────────────────────────────────

    async def _load_template(self, template_id: UUID) -> VisualTemplate:
        """Load VisualTemplate with slides eagerly loaded."""
        result = await self.db.execute(
            select(VisualTemplate)
            .options(selectinload(VisualTemplate.slides))
            .where(
                VisualTemplate.id == template_id,
                VisualTemplate.is_active == True,  # noqa: E712
            )
        )
        template = result.scalar_one_or_none()
        if not template:
            raise ValueError(f"VisualTemplate {template_id} not found or is inactive.")
        if not template.html_template and not template.slides:
            raise ValueError(
                f"VisualTemplate '{template.name}' ({template_id}) has no HTML content. "
                "Cannot generate draft."
            )
        return template

    # ── Brand Context ─────────────────────────────────────────────────

    async def _build_brand_context(self, profile_id: UUID) -> dict:
        """Build brand context dict from Profile relationships."""
        result = await self.db.execute(
            select(Profile)
            .options(
                selectinload(Profile.identity_graph),
                selectinload(Profile.style_profile),
            )
            .where(Profile.id == profile_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            logger.warning(f"Profile {profile_id} not found, using empty brand context")
            return {}

        context: dict = {
            "persona_summary": profile.persona_prompt or "",
            "profile_name": profile.name,
        }

        style = profile.style_profile
        if style:
            context["tone"] = str(getattr(style, "tone_sliders", {}) or {})

        identity = profile.identity_graph
        if identity:
            context["industry"] = getattr(identity, "industry", "") or ""
            context["expertise_areas"] = getattr(identity, "expertise_areas", []) or []

        return context

    # ── LLM Variable Generation ───────────────────────────────────────

    async def _generate_image_variables(
        self,
        template: VisualTemplate,
        brand_context: dict,
    ) -> dict:
        """Generate variable values for a single-image template via one LLM call."""
        variables_schema = template.variables_schema or {}
        default_values = template.default_values or {}

        if not variables_schema:
            return dict(default_values)

        prompt = self._build_image_variable_prompt(
            template_name=template.name,
            template_category=template.category or "",
            variables_schema=variables_schema,
            default_values=default_values,
            brand_context=brand_context,
        )

        raw = await self._call_llm(prompt)
        filled = self._parse_llm_json(raw)
        # LLM values override defaults; defaults fill any gaps
        return {**default_values, **filled}

    async def _generate_carousel_variables(
        self,
        template: VisualTemplate,
        brand_context: dict,
    ) -> list[dict]:
        """Generate variable values for all carousel slides in one LLM call.

        Returns a list of dicts, one per slide in order.
        """
        slides = sorted(template.slides, key=lambda s: s.order)

        slides_schema_summary = [
            {
                "slide_order": slide.order,
                "variables": slide.variable_schema or {},
                "defaults": slide.default_values or {},
            }
            for slide in slides
        ]

        prompt = self._build_carousel_variable_prompt(
            template_name=template.name,
            template_category=template.category or "",
            slides_schema=slides_schema_summary,
            brand_context=brand_context,
        )

        raw = await self._call_llm(prompt)
        parsed = self._parse_llm_json(raw)
        llm_slides: list[dict] = parsed.get("slides", [])

        # Merge per-slide: LLM values override slide-level defaults
        result: list[dict] = []
        for i, slide in enumerate(slides):
            llm_vals = llm_slides[i] if i < len(llm_slides) else {}
            merged = {**(slide.default_values or {}), **llm_vals}
            result.append(merged)

        return result

    def _build_image_variable_prompt(
        self,
        template_name: str,
        template_category: str,
        variables_schema: dict,
        default_values: dict,
        brand_context: dict,
    ) -> str:
        """Build prompt instructing LLM to fill variable values for an image template."""
        persona = brand_context.get("persona_summary", "a professional content creator")
        industry = brand_context.get("industry", "")
        profile_name = brand_context.get("profile_name", "")

        variables_list = "\n".join(
            f"  - {k}: {v.get('description', '')} "
            f"(maxLength: {v.get('maxLength', 'no limit')}, type: {v.get('type', 'text')})"
            for k, v in variables_schema.items()
        )

        return f"""You are filling in content for a social media visual template.

Template: "{template_name}" (category: {template_category})
Creator: {profile_name} — {industry}
Voice/Persona: {persona}

Fill these variables with compelling, on-brand content:
{variables_list}

Return ONLY a JSON object with variable names as keys and their content as string values.
Example: {{"headline": "Your compelling headline here", "body_text": "Supporting copy..."}}

Rules:
- Respect maxLength constraints strictly
- Keep tone consistent with the persona
- Make content feel specific and authentic, not generic
- Do NOT include HTML, markdown, or extra keys
- Do NOT include image URLs (image variables will be filled separately)"""

    def _build_carousel_variable_prompt(
        self,
        template_name: str,
        template_category: str,
        slides_schema: list[dict],
        brand_context: dict,
    ) -> str:
        """Build prompt for filling all carousel slide variables in one LLM call."""
        persona = brand_context.get("persona_summary", "a professional content creator")
        profile_name = brand_context.get("profile_name", "")
        industry = brand_context.get("industry", "")

        slides_json = json.dumps(slides_schema, indent=2)

        return f"""You are filling in content for a multi-slide social media carousel template.

Template: "{template_name}" (category: {template_category})
Creator: {profile_name} — {industry}
Voice/Persona: {persona}

Each slide has its own variable schema. Fill all slides with coherent, narrative-arc content.

Slides variable schemas:
{slides_json}

Return a JSON object with a "slides" array, one object per slide in order:
{{
  "slides": [
    {{"var_name_slide1": "value", ...}},
    {{"var_name_slide2": "value", ...}},
    ...
  ]
}}

Rules:
- Each entry in "slides" corresponds to the same-indexed slide in the input
- Respect all maxLength constraints strictly
- Create a coherent narrative that flows logically across slides
- Do NOT include HTML, markdown, or extra keys
- Do NOT include image URLs"""

    async def _call_llm(self, prompt: str) -> str:
        """Call Claude via AWS Bedrock. Returns raw response text."""
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        import boto3
        from langchain_aws import ChatBedrockConverse

        session = boto3.Session(
            aws_access_key_id=settings.AWS_BEDROCK_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_BEDROCK_SECRET_ACCESS_KEY,
            region_name=settings.AWS_BEDROCK_REGION,
        )
        llm = ChatBedrockConverse(
            model=settings.BEDROCK_MODEL_ID,
            region_name=settings.AWS_BEDROCK_REGION,
            credentials_profile_name=None,
            client=session.client("bedrock-runtime"),
            temperature=0.6,
            max_tokens=4000,
        )

        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=1) as executor:
            resp = await loop.run_in_executor(executor, lambda: llm.invoke(prompt))

        content = resp.content
        if isinstance(content, list):
            return "\n".join(
                block.text if hasattr(block, "text") else str(block)
                for block in content
                if hasattr(block, "text")
            )
        return str(content)

    def _parse_llm_json(self, raw: str) -> dict:
        """Parse JSON from LLM response, stripping markdown fences if present."""
        text = raw.strip()
        match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
        if match:
            text = match.group(1)
        else:
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1:
                text = text[start : end + 1]

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM JSON response: {e}\nRaw (first 500): {raw[:500]}")
            return {}

    # ── Rendering ─────────────────────────────────────────────────────

    async def _render_carousel_slides(
        self,
        draft: Draft,
        slides: list[SlideTemplate],
        variable_sets: list[dict],
        renderer,
        storage,
        width: int,
        height: int,
        brand_overrides: dict,
    ) -> None:
        """Render each carousel slide, create DraftSlide and MediaAsset records."""
        for i, (slide_template, variables) in enumerate(zip(slides, variable_sets)):
            # Substitute variables into the stored HTML (produces rendered_html for audit)
            rendered_html = renderer._substitute_variables(slide_template.html_structure, variables)

            draft_slide = DraftSlide(
                draft_id=draft.id,
                slide_template_id=slide_template.id,
                rendered_html=rendered_html,
                filled_variables=variables,
                order=i,
            )
            self.db.add(draft_slide)

            # Render to PNG and upload to S3
            try:
                png_bytes = await renderer.render_template(
                    html_template=slide_template.html_structure,
                    variables=variables,
                    width=width,
                    height=height,
                    brand_overrides=brand_overrides or None,
                )

                url, key = await storage.upload_image(
                    file_bytes=png_bytes,
                    content_type="image/png",
                    prefix=f"drafts/{draft.profile_id}",
                )

                asset = MediaAsset(
                    draft_id=draft.id,
                    type=MediaAssetType.CAROUSEL_SLIDE,
                    storage_url=url,
                    storage_key=key,
                    slide_index=i,
                    visual_template_id=draft.visual_template_id,
                    metadata_json={
                        "width": width,
                        "height": height,
                        "format": "png",
                        "source": "template_render",
                        "slide_template_id": str(slide_template.id),
                    },
                )
                self.db.add(asset)

            except Exception as e:
                logger.error(
                    f"Failed to render slide {i} (template={slide_template.id}) "
                    f"for draft {draft.id}: {e}"
                )
                # Partial render failure — continue with remaining slides

    async def _render_single_image(
        self,
        draft: Draft,
        template: VisualTemplate,
        variables: dict,
        renderer,
        storage,
        width: int,
        height: int,
        brand_overrides: dict,
    ) -> None:
        """Render a single-image template and create a MediaAsset record."""
        try:
            png_bytes = await renderer.render_template(
                html_template=template.html_template,
                variables=variables,
                width=width,
                height=height,
                brand_overrides=brand_overrides or None,
            )

            url, key = await storage.upload_image(
                file_bytes=png_bytes,
                content_type="image/png",
                prefix=f"drafts/{draft.profile_id}",
            )

            asset = MediaAsset(
                draft_id=draft.id,
                type=MediaAssetType.IMAGE,
                storage_url=url,
                storage_key=key,
                visual_template_id=draft.visual_template_id,
                metadata_json={
                    "width": width,
                    "height": height,
                    "format": "png",
                    "source": "template_render",
                },
            )
            self.db.add(asset)

        except Exception as e:
            logger.error(f"Failed to render image for draft {draft.id}: {e}")

    def _extract_brand_overrides(self, brand_context: dict) -> dict:
        """Extract brand color/font overrides from brand context dict."""
        overrides = {}
        for key in ("primary_color", "secondary_color", "font_family", "text_color"):
            if key in brand_context and brand_context[key]:
                overrides[key] = brand_context[key]
        return overrides
