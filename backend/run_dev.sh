#!/bin/bash
# Development server with proper reload exclusions
# This excludes venv from file watching to prevent constant restarts

cd "$(dirname "$0")"

uvicorn app.main:app \
    --reload \
    --reload-dir app \
    --host 0.0.0.0 \
    --port 8000
