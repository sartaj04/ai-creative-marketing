# BrandScale AI - AI-Powered Creative Marketing Platform

A production-ready backend for generating AI-powered marketing creatives for E-commerce, SaaS, and Personal brands.

## Features

- 🌐 **Web Scraping**: Extract brand assets, colors, fonts, and products using Playwright
- 🤖 **AI Copy Generation**: GPT-4 powered marketing copy in multiple languages
- 🎨 **Template Rendering**: HTML to image conversion with 50+ templates
- 📸 **Image Processing**: Background removal, enhancement, and optimization
- 📅 **Content Calendar**: Schedule and manage social media posts
- 🔐 **Authentication**: JWT-based auth with tier-based rate limiting

## Tech Stack

- **Backend**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Queue**: Celery + Redis
- **Scraping**: Playwright
- **AI**: OpenAI GPT-4 and GPT-4 Vision
- **Image**: Pillow, rembg, OpenCV
- **Storage**: AWS S3

## Quick Start

```bash
# Clone and configure
cp .env.example .env
# Edit .env with your API keys

# Start with Docker
docker-compose up -d

# Run migrations
docker-compose exec api alembic upgrade head

# Seed templates
docker-compose exec api python scripts/seed_templates.py

# Access API docs
open http://localhost:8000/docs
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | Login and get JWT |
| `POST /api/scrape` | Scrape website for brand assets |
| `POST /api/generate` | Generate marketing creatives |
| `GET /api/assets` | List generated assets |
| `GET /api/templates` | List available templates |

## Project Structure

```
app/
├── api/          # FastAPI routes
├── models/       # SQLAlchemy models
├── schemas/      # Pydantic schemas
├── services/     # Business logic
│   ├── scraper.py      # Web scraping
│   ├── generator.py    # AI copy generation
│   ├── renderer.py     # Template rendering
│   └── image_processor.py
├── workers/      # Celery tasks
├── utils/        # Utilities (auth, S3, rate limiting)
├── templates/    # HTML/CSS templates
├── config.py     # Configuration
├── database.py   # Database setup
└── main.py       # FastAPI app
```

## Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](http://localhost:8000/docs)

## License

MIT