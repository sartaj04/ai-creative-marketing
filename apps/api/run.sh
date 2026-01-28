#!/bin/bash
# Run script for API server - ensures venv is activated

set -e

# Navigate to API directory
cd "$(dirname "$0")"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please run: ./setup_venv.sh"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "❌ Dependencies not installed!"
    echo "Please run: pip install -r requirements.txt"
    exit 1
fi

# Run the server
echo "🚀 Starting API server..."
echo "📍 Server will be available at: http://127.0.0.1:8000"
echo "📚 API docs at: http://127.0.0.1:8000/docs"
echo ""
export PYTHONDONTWRITEBYTECODE=1
export WATCHFILES_FORCE_POLLING=true

# Only watch the app directory to avoid venv noise
uvicorn app.main:app --reload --reload-dir app
