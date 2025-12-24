#!/bin/bash
# Replit Deployment Diagnostic Script
# Run this in Replit Shell to diagnose issues
# Usage: bash diagnose-replit.sh

echo "========================================"
echo "🔍 ElectionTracker Deployment Diagnostic"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Environment Variables
echo "1️⃣  Checking Environment Variables..."
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL is NOT set${NC}"
    echo "   → Go to Secrets and add DATABASE_URL"
    echo "   → Get free database at https://neon.tech"
    ENV_OK=false
else
    echo -e "${GREEN}✅ DATABASE_URL is set${NC}"
    # Check format without exposing full URL
    if [[ $DATABASE_URL == postgresql://* ]]; then
        echo -e "${GREEN}   Format looks correct${NC}"
    else
        echo -e "${RED}   ⚠️  Format may be wrong (should start with postgresql://)${NC}"
    fi
    ENV_OK=true
fi

if [ -z "$GOOGLE_CIVIC_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  GOOGLE_CIVIC_API_KEY not set (optional)${NC}"
else
    echo -e "${GREEN}✅ GOOGLE_CIVIC_API_KEY is set${NC}"
fi

if [ -z "$OPENFEC_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  OPENFEC_API_KEY not set (optional)${NC}"
else
    echo -e "${GREEN}✅ OPENFEC_API_KEY is set${NC}"
fi

echo ""

# Check 2: Node.js & npm
echo "2️⃣  Checking Node.js & npm..."
NODE_VERSION=$(node --version 2>&1)
NPM_VERSION=$(npm --version 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
    echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js or npm not found${NC}"
fi

echo ""

# Check 3: Dependencies
echo "3️⃣  Checking Dependencies..."
if [ -d "node_modules" ]; then
    MODULE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
    echo -e "${GREEN}✅ node_modules exists ($MODULE_COUNT packages)${NC}"
    
    # Check critical packages
    if [ -d "node_modules/express" ]; then
        echo -e "${GREEN}   ✅ express installed${NC}"
    else
        echo -e "${RED}   ❌ express NOT installed${NC}"
    fi
    
    if [ -d "node_modules/react" ]; then
        echo -e "${GREEN}   ✅ react installed${NC}"
    else
        echo -e "${RED}   ❌ react NOT installed${NC}"
    fi
    
    if [ -d "node_modules/drizzle-orm" ]; then
        echo -e "${GREEN}   ✅ drizzle-orm installed${NC}"
    else
        echo -e "${RED}   ❌ drizzle-orm NOT installed${NC}"
    fi
else
    echo -e "${RED}❌ node_modules NOT found${NC}"
    echo "   → Run: npm install"
fi

echo ""

# Check 4: Database Files
echo "4️⃣  Checking Database Configuration..."
if [ -f "server/db.ts" ]; then
    echo -e "${GREEN}✅ server/db.ts exists${NC}"
else
    echo -e "${RED}❌ server/db.ts NOT found${NC}"
fi

if [ -f "shared/schema.ts" ]; then
    echo -e "${GREEN}✅ shared/schema.ts exists${NC}"
else
    echo -e "${RED}❌ shared/schema.ts NOT found${NC}"
fi

if [ -f "drizzle.config.ts" ]; then
    echo -e "${GREEN}✅ drizzle.config.ts exists${NC}"
else
    echo -e "${RED}❌ drizzle.config.ts NOT found${NC}"
fi

if [ -d "migrations" ]; then
    MIGRATION_COUNT=$(ls migrations/*.sql 2>/dev/null | wc -l)
    echo -e "${GREEN}✅ migrations/ exists ($MIGRATION_COUNT migration files)${NC}"
else
    echo -e "${YELLOW}⚠️  migrations/ NOT found${NC}"
fi

echo ""

# Check 5: Seed Script
echo "5️⃣  Checking Seed Script..."
if [ -f "server/seed-data.ts" ]; then
    echo -e "${GREEN}✅ server/seed-data.ts exists${NC}"
    
    # Check if it's properly integrated
    if grep -q "seedDatabase" server/index.ts 2>/dev/null; then
        echo -e "${GREEN}   ✅ Seed integrated in server/index.ts${NC}"
    else
        echo -e "${RED}   ❌ Seed NOT integrated in server/index.ts${NC}"
    fi
else
    echo -e "${RED}❌ server/seed-data.ts NOT found${NC}"
    echo "   → This file should contain database seeding logic"
fi

echo ""

# Check 6: Build Files
echo "6️⃣  Checking Build Configuration..."
if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ package.json exists${NC}"
    
    # Check scripts
    if grep -q '"dev"' package.json; then
        echo -e "${GREEN}   ✅ 'dev' script found${NC}"
    fi
    if grep -q '"db:push"' package.json; then
        echo -e "${GREEN}   ✅ 'db:push' script found${NC}"
    fi
    if grep -q '"db:seed"' package.json; then
        echo -e "${GREEN}   ✅ 'db:seed' script found${NC}"
    else
        echo -e "${RED}   ❌ 'db:seed' script NOT found${NC}"
    fi
else
    echo -e "${RED}❌ package.json NOT found${NC}"
fi

if [ -f "vite.config.ts" ]; then
    echo -e "${GREEN}✅ vite.config.ts exists${NC}"
else
    echo -e "${RED}❌ vite.config.ts NOT found${NC}"
fi

if [ -f "tsconfig.json" ]; then
    echo -e "${GREEN}✅ tsconfig.json exists${NC}"
else
    echo -e "${RED}❌ tsconfig.json NOT found${NC}"
fi

echo ""

# Check 7: Test Database Connection (if app is running)
echo "7️⃣  Testing Database Connection..."
if [ "$ENV_OK" = true ]; then
    # Try to connect to database using node
    CONNECTION_TEST=$(node -e "
        import('node-fetch').then(async fetch => {
            try {
                const res = await fetch.default('http://localhost:5000/api/health', { timeout: 5000 });
                const data = await res.json();
                console.log('SUCCESS:', JSON.stringify(data));
            } catch (error) {
                console.log('FAIL:', error.message);
            }
        }).catch(err => console.log('ERROR:', err.message));
    " 2>&1)
    
    if echo "$CONNECTION_TEST" | grep -q "SUCCESS"; then
        echo -e "${GREEN}✅ API is responding${NC}"
        echo "   $CONNECTION_TEST"
    else
        echo -e "${YELLOW}⚠️  API not responding (may not be running yet)${NC}"
        echo "   $CONNECTION_TEST"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping (DATABASE_URL not set)${NC}"
fi

echo ""

# Check 8: Port Status
echo "8️⃣  Checking Port Status..."
if lsof -i :5000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Port 5000 is in use (app may be running)${NC}"
    lsof -i :5000 | grep LISTEN | head -1
else
    echo -e "${YELLOW}⚠️  Port 5000 is not in use (app not running)${NC}"
fi

echo ""

# Summary
echo "========================================"
echo "📊 Diagnostic Summary"
echo "========================================"
echo ""

ISSUES_FOUND=0

if [ "$ENV_OK" = false ]; then
    echo -e "${RED}🔴 CRITICAL: DATABASE_URL not set${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND+1))
fi

if [ ! -d "node_modules" ]; then
    echo -e "${RED}🔴 CRITICAL: Dependencies not installed${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND+1))
fi

if [ ! -f "server/seed-data.ts" ]; then
    echo -e "${RED}🔴 CRITICAL: Seed script missing${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND+1))
fi

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No critical issues found!${NC}"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. If not running, start with: npm run dev"
    echo "   2. Open the app in Replit webview"
    echo "   3. Check for 15 elections on homepage"
else
    echo -e "${RED}⚠️  Found $ISSUES_FOUND critical issue(s)${NC}"
    echo ""
    echo "🔧 Fix these issues:"
    
    if [ "$ENV_OK" = false ]; then
        echo "   1. Add DATABASE_URL to Replit Secrets"
        echo "      → Get free database at https://neon.tech"
    fi
    
    if [ ! -d "node_modules" ]; then
        echo "   2. Install dependencies: npm install"
    fi
    
    if [ ! -f "server/seed-data.ts" ]; then
        echo "   3. Seed script missing - may need to pull latest from GitHub"
    fi
    
    echo ""
    echo "   Then run: bash diagnose-replit.sh (to re-check)"
fi

echo ""
echo "📖 Full guide: Read REPLIT_SETUP_GUIDE.md"
echo "🆘 Still stuck? Read COMPLETE_REPO_PUSH.md"
echo "========================================"
