FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port (Railway will inject PORT env var)
EXPOSE 8000

# Start command - Gunicorn with Uvicorn workers for production
# --workers: Number of worker processes (default 4, configurable via WEB_CONCURRENCY)
# --worker-class: Use Uvicorn's ASGI worker
# --bind: Listen on all interfaces
# --timeout: Worker timeout (120s for long-running AI requests)
# --graceful-timeout: Graceful shutdown timeout
# --keep-alive: Keep-alive connections
CMD gunicorn app.main:app \
    --workers ${WEB_CONCURRENCY:-4} \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:${PORT:-8000} \
    --timeout 120 \
    --graceful-timeout 30 \
    --keep-alive 5 \
    --log-level info

