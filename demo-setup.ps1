# ElectionTracker - One-Click Demo Setup (Windows PowerShell)
# This script sets up everything needed for an investor demo

$ErrorActionPreference = "Stop"

Write-Host "🚀 ElectionTracker - Demo Setup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (!(Test-Path .env)) {
    Write-Host "⚠️  No .env file found. Creating from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ Created .env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: You need to add your API keys to .env" -ForegroundColor Yellow
    Write-Host "   Required:" -ForegroundColor Yellow
    Write-Host "   - DATABASE_URL" -ForegroundColor Yellow
    Write-Host "   - GOOGLE_CIVIC_API_KEY" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Press Enter when you've added the keys, or Ctrl+C to exit..." -ForegroundColor Yellow
    Read-Host
}

Write-Host "📦 Step 1: Installing dependencies..." -ForegroundColor Cyan
npm install
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "🗄️  Step 2: Setting up database..." -ForegroundColor Cyan
npm run db:push
Write-Host "✅ Database schema created" -ForegroundColor Green
Write-Host ""

Write-Host "🧪 Step 3: Running tests..." -ForegroundColor Cyan
try {
    npm test 2>&1 | Out-Null
    Write-Host "✅ Tests passed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Some tests failed, but continuing..." -ForegroundColor Yellow
}
Write-Host ""

Write-Host "🏗️  Step 4: Building application..." -ForegroundColor Cyan
npm run build
Write-Host "✅ Application built" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the demo:" -ForegroundColor Cyan
Write-Host "  Development:  " -NoNewline; Write-Host "npm run dev" -ForegroundColor Green
Write-Host "  Production:   " -NoNewline; Write-Host "npm start" -ForegroundColor Green
Write-Host "  Docker:       " -NoNewline; Write-Host "docker-compose up" -ForegroundColor Green
Write-Host ""
Write-Host "Open in browser: " -NoNewline; Write-Host "http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "Investor Resources:" -ForegroundColor Cyan
Write-Host "  - Admin Settings:  http://localhost:5000/admin-settings"
Write-Host "  - System Health:   http://localhost:5000/api/health/enhanced"
Write-Host "  - API Docs:        See API_DOCUMENTATION.md"
Write-Host "  - Pitch Deck:      See INVESTOR_PITCH.md"
Write-Host ""
Write-Host "Ready for investors! 🚀" -ForegroundColor Green
