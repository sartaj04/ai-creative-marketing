.PHONY: help install dev build up down logs migrate seed test lint format clean

# Default target
help:
	@echo "Pixo - Agentic Branding Platform"
	@echo ""
	@echo "Usage:"
	@echo "  make install     Install all dependencies"
	@echo "  make dev         Start development servers"
	@echo "  make build       Build Docker images"
	@echo "  make up          Start all services with Docker"
	@echo "  make down        Stop all services"
	@echo "  make logs        View logs"
	@echo "  make migrate     Run database migrations"
	@echo "  make seed        Seed database with sample data"
	@echo "  make test        Run tests"
	@echo "  make lint        Run linters"
	@echo "  make format      Format code"
	@echo "  make clean       Clean up"

# Install dependencies
install:
	cd apps/api && pip install -r requirements.txt
	cd apps/web && npm install

# Development (without Docker)
dev:
	@echo "Starting development servers..."
	@echo "Run these in separate terminals:"
	@echo "  Terminal 1: cd apps/api && uvicorn app.main:app --reload"
	@echo "  Terminal 2: cd apps/api && celery -A app.core.celery_app worker --loglevel=info"
	@echo "  Terminal 3: cd apps/web && npm run dev"

# Build Docker images
build:
	docker-compose build

# Start services with Docker
up:
	docker-compose up -d

# Stop services
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# Run migrations
migrate:
	cd apps/api && alembic upgrade head

# Seed database with sample templates
seed:
	cd apps/api && python -m app.scripts.seed_templates

# Run tests
test:
	cd apps/api && pytest
	cd apps/web && npm test

# Lint code
lint:
	cd apps/api && ruff check .
	cd apps/web && npm run lint

# Format code
format:
	cd apps/api && ruff format .
	cd apps/web && npm run format

# Clean up
clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf apps/web/.next
	rm -rf apps/web/node_modules
