# Pixo - Agentic Branding Platform

Pixo transforms manual personal branding into a 5-minute "Review & Approve" workflow. Background AI agents generate content drafts proactively; users curate via an intuitive swipe-based UI.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI (Python), SQLAlchemy async
- **Database**: PostgreSQL (Supabase)
- **Queue**: Celery + Redis (Upstash)
- **Auth**: JWT with email/password
- **LLM**: Google Gemini (primary), AWS Bedrock Claude (complex tasks)

## Project Structure

```
/
├── apps/
│   ├── api/                    # FastAPI Backend
│   │   ├── alembic/            # Database migrations
│   │   ├── app/
│   │   │   ├── api/v1/         # API endpoints
│   │   │   ├── core/           # Config, security, database
│   │   │   ├── models/         # SQLAlchemy models
│   │   │   ├── schemas/        # Pydantic schemas
│   │   │   ├── services/       # Business logic
│   │   │   ├── llm/            # LLM providers
│   │   │   ├── tasks/          # Celery background tasks
│   │   │   └── templates/      # Template engine
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   └── web/                    # Next.js Frontend
│       ├── src/
│       │   ├── app/            # App router pages
│       │   ├── components/     # React components
│       │   ├── lib/            # Utilities and API clients
│       │   └── stores/         # Zustand state management
│       ├── Dockerfile
│       └── package.json
│
├── docker-compose.yml
├── .env.example
├── Makefile
└── README.md
```

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)
- Supabase account (for PostgreSQL)
- Upstash account (for Redis)
- Google Cloud account (for Gemini API)
- AWS account (optional, for Bedrock/Claude)

## Environment Setup

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Fill in your environment variables in `.env`:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/database

# Redis (Upstash)
REDIS_URL=rediss://default:password@host:6379

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Google Gemini
GOOGLE_API_KEY=your-google-api-key

# AWS Bedrock (optional)
AWS_BEDROCK_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# S3 (for file uploads)
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=us-east-1
```

## Running with Docker

The easiest way to run the application:

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

Services will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Running Locally (Development)

### Backend

```bash
cd apps/api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# In a separate terminal, start Celery worker
celery -A app.core.celery_app worker --loglevel=info

# In another terminal, start Celery beat (scheduler)
celery -A app.core.celery_app beat --loglevel=info
```

### Frontend

```bash
cd apps/web

# Install dependencies
npm install

# Start development server
npm run dev
```

## Database Migrations

```bash
cd apps/api

# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Create new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### Profiles
- `GET /api/v1/profiles` - List profiles
- `POST /api/v1/profiles` - Create profile
- `GET /api/v1/profiles/{id}` - Get profile
- `PUT /api/v1/profiles/{id}` - Update profile
- `POST /api/v1/profiles/{id}/ingest` - Trigger source ingestion

### Identity & Style
- `GET /api/v1/profiles/{id}/identity-graph` - Get identity graph
- `PUT /api/v1/profiles/{id}/identity-graph` - Update identity graph
- `GET /api/v1/profiles/{id}/style-profile` - Get style profile
- `PUT /api/v1/profiles/{id}/style-profile` - Update style profile

### Drafts
- `GET /api/v1/drafts` - List drafts
- `POST /api/v1/drafts/{id}/action` - Approve/reject/edit draft
- `PUT /api/v1/drafts/{id}/schedule` - Schedule draft
- `PUT /api/v1/drafts/{id}/status` - Update status

### Templates
- `GET /api/v1/templates` - List templates
- `POST /api/v1/templates` - Create template
- `PUT /api/v1/templates/{id}` - Update template
- `DELETE /api/v1/templates/{id}` - Delete template
- `POST /api/v1/templates/{id}/duplicate` - Duplicate template
- `POST /api/v1/templates/match` - Find matching templates

### Analytics
- `GET /api/v1/analytics/summary` - Get summary metrics
- `GET /api/v1/analytics/topics` - Get topic performance
- `GET /api/v1/analytics/formats` - Get format performance

## Background Agents (Celery Tasks)

| Task | Schedule | Purpose |
|------|----------|---------|
| `style_learner_task` | On-demand + daily | Extract style from profile sources |
| `opportunity_scout_task` | Every 4 hours | Scan RSS feeds for opportunities |
| `draft_generator_task` | Daily 6 AM | Generate 1-3 drafts per profile |
| `feedback_loop_task` | Every 15 min | Update weights from swipe events |
| `analytics_digest_task` | Weekly Monday 9 AM | Generate tuning suggestions |

## Features

### Inbox (Swipe UI)
- Swipe right to approve drafts
- Swipe left to reject drafts
- Swipe up to edit before approving
- Desktop button fallback for non-touch devices

### Drafts Kanban
- Drag-and-drop between columns
- Columns: Approved, Scheduled, Published
- Schedule drafts for future publishing

### Templates
- Create content templates with `{placeholder}` variables
- Auto-extraction of variables from template content
- Category and format tagging
- Template matching for draft generation

### Analytics
- Approval rate tracking
- Topic and format performance
- AI tuning suggestions based on patterns

### Settings
- Profile management
- Style sliders (formal/casual, technical/simple, etc.)
- Format preferences
- Taboo topics (topics to avoid)
- RSS feed management

## Template System

Templates use `{variable_name}` syntax for placeholders:

```
Busting 5 Common Myths About {Topic}

There are many myths surrounding {specific_topic}. Let's debunk the most common ones.

Myth 1: {myth_1_title}
The Myth: {myth_1_description}
The Truth: {myth_1_truth}
```

Variables are automatically extracted when templates are created.

## Development

### Makefile Commands

```bash
make up          # Start all services
make down        # Stop all services
make logs        # View logs
make migrate     # Run migrations
make shell       # Open API shell
```

### API Setup (Python Backend)

**First-time setup:**
```bash
cd apps/api
./setup_venv.sh  # Creates venv and installs dependencies
```

**Or manually:**
```bash
cd apps/api
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

**Running the API server:**
```bash
cd apps/api
./run.sh  # Uses venv automatically

# Or manually:
cd apps/api
source venv/bin/activate
uvicorn app.main:app --reload
```

**Running Celery worker:**
```bash
cd apps/api
source venv/bin/activate
celery -A app.core.celery_app worker --loglevel=info
```

### Web Setup (Next.js Frontend)

```bash
cd apps/web
npm install
npm run dev
```

### Code Style

- Backend: Black, isort, flake8
- Frontend: ESLint, Prettier

## License

Private - All rights reserved.
