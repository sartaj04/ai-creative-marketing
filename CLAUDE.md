# Pixo — AI Creative Marketing Platform

## Project Overview
- **Product**: Pixo — Agentic personal branding platform for LinkedIn/Twitter
- **Status**: Active development — core agent loop working, expanding to rich media (carousels, images, visual templates)
- **Mission**: Turn 60-min/day manual branding into a 5-min "Review & Approve" swipe workflow

## Architecture

### Monorepo Structure
```
apps/api/     — FastAPI backend (Python 3.11)
apps/web/     — Next.js 14 App Router frontend (TypeScript)
workers/      — Background workers
docker-compose.yml
```

### Backend (apps/api/)
- **Framework**: FastAPI + async SQLAlchemy + Alembic migrations
- **DB**: PostgreSQL (Supabase) with pgvector
- **Queue**: Celery + Upstash Redis
- **Auth**: JWT (email/password), 24h token expiry
- **LLM**: Gemini (primary/cheap) + Claude via AWS Bedrock (complex tasks)
- **AI Framework**: LangChain + LangGraph for multi-agent pipelines
- **Storage**: AWS S3 (ap-south-1 region)
- **Key services**: `agency_graph.py`, `content_agency_service.py`, `generator_service.py`, `multi_agent_generator.py`

### Frontend (apps/web/)
- **Framework**: Next.js 14 App Router
- **State**: Zustand stores in `src/stores/`
- **UI**: shadcn/ui + Tailwind
- **API Layer**: `src/lib/api/*.ts` using `apiClient` from `./client`
- **Key pages**: `/dashboard/inbox`, `/dashboard/drafts`, `/dashboard/templates`, `/dashboard/carousel`, `/dashboard/visual-templates`

## Key Models & DB
- **Profile** = Workspace (multi-tenant). Access via `get_profile_with_access()` in `deps.py`
- `profile_members` junction table → Owner/Member roles
- `drafts` → content drafts with swipe feedback
- `draft_slides` → carousel slides per draft
- `media_assets` → uploaded/generated images
- `slide_templates`, `visual_templates` → template system (new)

## Active Development Areas (as of Feb 2026)
- Visual templates system (new files: `visual_templates.py`, `media.py`, `slide_template.py`)
- Draft slide generation for carousels
- Image generation pipeline (`image_generation_service.py`)
- Unsplash integration (`unsplash_service.py`)
- Template renderer (`template_renderer_service.py`, `template_gen_graph.py`)
- Pending migrations: `b3c4d5e6f7g8`, `c4d5e6f7g8h9` (media + slides)

## Environment Variables Required
```env
# Database
DATABASE_URL=postgresql+asyncpg://...   # Supabase

# Redis
REDIS_URL=rediss://...                  # Upstash

# JWT
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_S3_REGION=ap-south-1

# AWS Bedrock (Claude)
AWS_BEDROCK_ACCESS_KEY_ID=
AWS_BEDROCK_SECRET_ACCESS_KEY=
AWS_BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0

# Google Gemini
AI_PROVIDER=gemini
GCP_PROJECT_ID=
GCP_LOCATION=
GCP_CLIENT_EMAIL=
GCP_PRIVATE_KEY=

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

## Critical Patterns & Conventions

### Access Control (ALWAYS use this pattern)
```python
profile = await get_profile_with_access(profile_id, current_user, db, require_owner=False)
# Never use: Profile.user_id == current_user.id
```

### New API Endpoints Checklist
- [ ] Auth dependency: `current_user: CurrentUser`
- [ ] DB dependency: `db: DBSession`
- [ ] Profile access check via `get_profile_with_access()`
- [ ] Added to `router.py`
- [ ] Pydantic schema in `schemas/`
- [ ] Alembic migration if new model

### Frontend API Calls
```typescript
// Always use apiClient from ./client, never fetch directly
import { apiClient } from './client'
const data = await apiClient.get('/endpoint')
```

### Error Display (Frontend)
```typescript
import { useToast } from '@/components/ui/use-toast'
import { getErrorMessage } from '@/lib/utils'
const { toast } = useToast()
// In catch: toast({ variant: 'destructive', description: getErrorMessage(error) })
```

## Known Gotchas
1. **`generators.py` historically had no auth** — always verify auth on new endpoints
2. **Alembic migrations**: two new unrun migrations as of Feb 2026. Run before testing new models.
3. **AI_PROVIDER env var**: switches between `gemini` and `bedrock`. Default is `gemini`.
4. **AWS region**: S3 is `ap-south-1`, Bedrock is `us-east-1` — don't mix them
5. **GCP service account key**: keep JSON keys out of git — they are gitignored (`*-credentials.json`)
6. **`workers/` directory**: separate from Celery tasks — check both for background work

## Running Locally
```bash
# Full stack via Docker
docker-compose up

# Frontend only
cd apps/web && npm run dev

# Backend only
cd apps/api && uvicorn app.main:app --reload

# Run pending migrations
cd apps/api && alembic upgrade head
```

## Workflow Files
- [discovery.md](./discovery.md) — Problem statements, unknowns, constraints
- [research.md](./research.md) — Findings, sources, decisions
- [plan.md](./plan.md) — Phased execution plans
- [progress.md](./progress.md) — Session logs, blockers, next steps
