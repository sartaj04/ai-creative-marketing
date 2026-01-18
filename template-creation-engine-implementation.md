# Template Creation Engine — Implementation Plan

## Purpose

The Template Creation Engine is an **admin-only system** that allows Pixo to ingest, normalize, validate, and manage high-quality creative templates.

Templates are treated as **first-class assets**, not static files.

This engine ensures:
- Visual quality
- Consistency
- Scalability
- Safe AI usage

---

## Core Principles

1. Templates are curated, not generated blindly
2. AI assists creation but does not bypass human review
3. All templates conform to a single internal schema
4. Every template is testable with dummy data
5. Storage is asset-based (S3), not code-based

---

## Supported Template Inputs

### Input Sources
- High-quality ad images (PNG / JPG)
- Hand-written HTML / CSS templates
- Figma exports (manual or plugin-based)
- Canva exports (manual)

⚠️ Parsing Figma/Canva natively is out of scope for MVP.

---

## System Architecture (High-Level)

Admin Upload
↓
AI-Assisted Layout Extraction
↓
Template Normalization
↓
Admin Editor & QA
↓
Dummy Render Validation
↓
Approval & Versioning
↓
Storage (S3 + DB)


---

## Canonical Template Schema (Conceptual)

Each template is stored as metadata + assets.

### Metadata (Postgres)
- template_id
- name
- industry
- platform
- objective
- aspect_ratio
- supported_formats
- version
- status (draft / approved / deprecated)

### Layout Definition (JSON)
- Zones (percentage-based)
- Zone type (image, text, logo, CTA)
- Min/max text limits
- Required vs optional fields
- Alignment & stacking rules

### Assets (S3)
- Source image / HTML
- Normalized HTML template
- Preview renders
- Exported PNG/JPG

---

## Template Normalization Layer

Purpose:
Convert all inputs into a **single internal representation**.

### Responsibilities
- Detect layout zones
- Infer hierarchy
- Suggest variable mapping
- Generate draft HTML/CSS
- Output editable JSON schema

AI assists here, but output is always editable.

---

## Admin Template Editor

### Key Capabilities
- Visual zone editor
- Variable configuration (required / optional)
- Text length constraints
- Platform-specific overrides
- Industry & objective tagging

### Non-Goals
- No WYSIWYG Canva replacement
- No end-user access

This tool is for **quality control**, not creativity.

---

## Rendering Modes (Critical)

### 1. Dummy Render Mode (QA)

Purpose:
Validate template integrity.

Rules:
- All zones filled
- No conditionals
- Max-length text
- Placeholder images/logos
- Worst-case scenarios

If a template breaks here → it is rejected.

---

### 2. Production Render Mode

Purpose:
User-facing generation.

Rules:
- Conditional elements allowed
- AI-generated content injected
- Platform-specific hiding/showing
- Brand-aware styling

Dummy mode is never exposed to users.

---

## Storage Strategy

### Object Storage (S3 / GCS / R2)
- Raw uploads
- HTML templates
- Rendered images
- Versioned assets

### Database (Postgres)
- Template registry
- Metadata
- Layout schema
- Version history
- Performance metrics (future)

Templates are **assets**, not source code.

---

## Versioning & Lifecycle

Each template supports:
- Draft → Approved → Deprecated
- Immutable version history
- Rollback capability
- Performance tagging (future)

No template is deleted — only deprecated.

---

## AI’s Role (Strictly Limited)

AI is allowed to:
- Suggest layout zones
- Propose variable mappings
- Generate draft HTML
- Recommend categorization

AI is NOT allowed to:
- Auto-publish templates
- Skip validation
- Modify approved templates silently

Human approval is mandatory.

---

## MVP Scope

### Included
- Image → template ingestion
- HTML template ingestion
- Manual admin QA
- Dummy render validation
- S3-based storage
- Template registry

### Excluded (Post-MVP)
- Figma plugin
- Automated performance optimization
- Auto-mutating templates
- User-created templates

---

## Why This Engine Is Strategic

- Prevents low-quality AI outputs
- Enables designer collaboration
- Allows future marketplace / crowdsourcing
- Creates a defensible moat
- Decouples creativity from AI hallucination

---

## Success Criteria

- Templates never visually break
- Generated ads look human-designed
- New templates can be added without code changes
- Admins trust the system

---

## Summary

The Template Creation Engine is the **foundation** of Pixo.

AI chooses.
Templates render.
Humans control quality.

Everything else builds on this.
