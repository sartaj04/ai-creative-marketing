#!/bin/bash
# Pixo Deployment Script
# Usage: ./deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Deploying Pixo to $ENVIRONMENT..."

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]; then
    source "$PROJECT_ROOT/.env.$ENVIRONMENT"
else
    echo "❌ Environment file .env.$ENVIRONMENT not found!"
    exit 1
fi

# Validate required variables
required_vars=(
    "DB_PASSWORD"
    "REDIS_PASSWORD"
    "JWT_SECRET_KEY"
    "GEMINI_API_KEY"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_S3_BUCKET"
    "RAZORPAY_KEY_ID"
    "RAZORPAY_KEY_SECRET"
    "DOMAIN"
    "ACME_EMAIL"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required variable $var is not set!"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Pull latest code
echo "📥 Pulling latest code..."
cd "$PROJECT_ROOT"
git pull origin main

# Build and deploy
echo "🏗️ Building containers..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🔄 Stopping old containers..."
docker-compose -f docker-compose.prod.yml down

echo "🚀 Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

# Seed templates if first deployment
if [ "$2" == "--seed" ]; then
    echo "🌱 Seeding templates..."
    docker-compose -f docker-compose.prod.yml exec -T backend python -m app.scripts.seed_templates
fi

# Health check
echo "🏥 Running health checks..."
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://api.${DOMAIN}/health" || echo "000")
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}" || echo "000")

if [ "$BACKEND_HEALTH" == "200" ] && [ "$FRONTEND_HEALTH" == "200" ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Frontend: https://${DOMAIN}"
    echo "🔧 API: https://api.${DOMAIN}"
    echo "📚 API Docs: https://api.${DOMAIN}/docs"
else
    echo "⚠️ Health check failed!"
    echo "Backend: $BACKEND_HEALTH, Frontend: $FRONTEND_HEALTH"
    echo "Check logs with: docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi

# Cleanup old images
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "🎉 Deployment complete!"
