#!/bin/bash
# Setup script for API virtual environment

set -e

echo "🚀 Setting up Python virtual environment for API..."

# Navigate to API directory
cd "$(dirname "$0")"

# Check if venv already exists
if [ -d "venv" ]; then
    echo "✅ Virtual environment already exists"
else
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip --quiet

# Install dependencies
echo "📥 Installing dependencies from requirements.txt..."
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "To activate the virtual environment in the future, run:"
echo "  source apps/api/venv/bin/activate"
echo ""
echo "To run the API server:"
echo "  cd apps/api && source venv/bin/activate && uvicorn app.main:app --reload"
echo ""
