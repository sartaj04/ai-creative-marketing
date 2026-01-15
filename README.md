# Pixo - AI Creative Marketing Platform

AI-powered creative marketing platform for the Indian market. Generate stunning marketing creatives for Instagram, Facebook, LinkedIn, Twitter, and Google Ads using AI.

## 🎯 Target Segments

1. **E-commerce brands** - Product advertisements
2. **SaaS companies** - Social media and marketing content
3. **Personal brands** - LinkedIn/Twitter thought leadership posts

## 🛠️ Tech Stack

### Backend
- Python FastAPI
- PostgreSQL + SQLAlchemy ORM
- Celery + Redis for job queue
- Playwright for web scraping
- OpenAI GPT-4 and GPT-4 Vision
- Pillow + rembg for image processing
- Jinja2 + Playwright for template rendering
- AWS S3 (boto3) for storage
- JWT authentication
- Razorpay for payments

### Frontend
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui components
- Zustand for state management
- React Query + Axios for API
- Framer Motion for animations
- React Hook Form + Zod validation
- Sonner for toast notifications
- Lucide React icons

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Quick Start with Docker

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-creative-marketing
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your credentials:
- `OPENAI_API_KEY` - Your OpenAI API key
- `AWS_*` - Your AWS S3 credentials
- `RAZORPAY_*` - Your Razorpay API keys

4. Start all services:
```bash
docker-compose up -d
```

5. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Flower (Celery monitor): http://localhost:5555

### Local Development

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
ai-creative-marketing/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # API endpoints
│   │   ├── core/            # Auth, security, exceptions
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   │   └── scraper/     # Web scrapers
│   │   └── tasks/           # Celery tasks
│   ├── alembic/             # Database migrations
│   ├── templates/           # Jinja2 HTML templates
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities, API client
│   │   └── stores/          # Zustand stores
│   └── public/
└── docker-compose.yml
```

## 🔑 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/refresh` - Refresh token

### Brand Profiles
- `GET /api/v1/brands` - List brand profiles
- `POST /api/v1/brands` - Create brand profile
- `GET /api/v1/brands/{id}` - Get brand profile
- `PATCH /api/v1/brands/{id}` - Update brand profile
- `DELETE /api/v1/brands/{id}` - Delete brand profile

### Scraping
- `POST /api/v1/scraping/scrape` - Start scraping job
- `GET /api/v1/scraping/job/{id}` - Get job status

### Generation
- `POST /api/v1/generation/copy` - Generate marketing copy
- `POST /api/v1/generation/asset` - Generate visual asset
- `POST /api/v1/generation/batch` - Batch generate assets

### Assets
- `GET /api/v1/assets` - List generated assets
- `GET /api/v1/assets/{id}` - Get asset
- `DELETE /api/v1/assets/{id}` - Delete asset

### Templates
- `GET /api/v1/templates` - List templates
- `GET /api/v1/templates/{id}` - Get template

### Payments
- `GET /api/v1/payments/plans` - Get pricing plans
- `POST /api/v1/payments/create-order` - Create Razorpay order
- `POST /api/v1/payments/verify` - Verify payment

## 💰 Pricing Tiers

| Tier | Price | Generations | Features |
|------|-------|-------------|----------|
| Free | ₹0/mo | 10/month | 5 basic templates, 1 brand profile |
| Starter | ₹499/mo | 100/month | All templates, 5 profiles, multi-language |
| Pro | ₹1,499/mo | Unlimited | All templates, unlimited profiles, API access |

## 📝 License

MIT License


cd /Users/sartajsyed/Documents/Brandscale/ai-creative-marketing/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browser (one-time)
playwright install chromium

# Run FastAPI
uvicorn app.main:app --reload --port 8000
uvicorn app.main:app --reload --port 8000 --reload-exclude 'venv/*'

cd /Users/sartajsyed/Documents/Brandscale/ai-creative-marketing/frontend

npm install
npm run dev

cd /Users/sartajsyed/Documents/Brandscale/ai-creative-marketing/backend
source venv/bin/activate
celery -A app.tasks.celery_app worker --loglevel=info