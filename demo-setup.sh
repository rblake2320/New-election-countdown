#!/bin/bash

# ElectionTracker - One-Click Demo Setup
# This script sets up everything needed for an investor demo

set -e  # Exit on error

echo "🚀 ElectionTracker - Demo Setup Script"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: You need to add your API keys to .env${NC}"
    echo "   Required:"
    echo "   - DATABASE_URL"
    echo "   - GOOGLE_CIVIC_API_KEY"
    echo ""
    echo "   Press Enter when you've added the keys, or Ctrl+C to exit..."
    read -r
fi

echo "📦 Step 1: Installing dependencies..."
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo "🗄️  Step 2: Setting up database..."
npm run db:push
echo -e "${GREEN}✅ Database schema created${NC}"
echo ""

echo "🧪 Step 3: Running tests..."
if npm test > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed, but continuing...${NC}"
fi
echo ""

echo "🏗️  Step 4: Building application..."
npm run build
echo -e "${GREEN}✅ Application built${NC}"
echo ""

echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "To start the demo:"
echo "  Development:  ${GREEN}npm run dev${NC}"
echo "  Production:   ${GREEN}npm start${NC}"
echo "  Docker:       ${GREEN}docker-compose up${NC}"
echo ""
echo "Open in browser: ${GREEN}http://localhost:5000${NC}"
echo ""
echo "Investor Resources:"
echo "  - Admin Settings:  http://localhost:5000/admin-settings"
echo "  - System Health:   http://localhost:5000/api/health/enhanced"
echo "  - API Docs:        See API_DOCUMENTATION.md"
echo "  - Pitch Deck:      See INVESTOR_PITCH.md"
echo ""
echo -e "${GREEN}Ready for investors! 🚀${NC}"
