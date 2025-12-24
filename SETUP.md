# Election Tracker - Quick Setup Guide

Get your development environment running in 5 minutes.

## Prerequisites

- **Node.js** 20+ (check with `node --version`)
- **PostgreSQL** database (we recommend [Neon](https://neon.tech) for serverless)
- **Git** for version control

## Step 1: Clone & Install

```bash
git clone <your-repo-url>
cd New-election-countdown
npm install
```

## Step 2: Configure Environment

1. Copy the environment template:
```bash
cp .env.example .env
```

2. **Edit `.env`** and add your credentials:

### Required (App won't start without these):
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
GOOGLE_CIVIC_API_KEY=your_key_here
```

### Recommended (for full functionality):
```env
OPENFEC_API_KEY=your_key_here
PROPUBLICA_API_KEY=your_key_here
CENSUS_API_KEY=your_key_here
```

### Optional (enhanced features):
```env
OPENSTATES_API_KEY=your_key_here
VOTESMART_API_KEY=your_key_here
MAPQUEST_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here
```

## Step 3: Database Setup

Push the database schema:
```bash
npm run db:push
```

This creates all tables, indexes, and relationships automatically.

## Step 4: Start Development Server

```bash
npm run dev
```

Open http://localhost:5000 in your browser.

## Step 5: Verify Installation

Check these endpoints:
- http://localhost:5000 - Main app should load
- http://localhost:5000/api/health - Should return `{"status":"ok"}`
- http://localhost:5000/api/elections - Should return election data

---

## Getting API Keys (Free Tier Available)

### Google Civic API (Required)
1. Go to https://console.cloud.google.com/apis/credentials
2. Create new project
3. Enable "Google Civic Information API"
4. Create credentials → API Key
5. Copy key to `.env`

### OpenFEC (Recommended)
1. Visit https://api.open.fec.gov/developers/
2. Sign up for free API key
3. Copy key to `.env`

### ProPublica Congress API (Recommended)
1. Visit https://www.propublica.org/datastore/api/propublica-congress-api
2. Request API key (usually approved instantly)
3. Copy key to `.env`

### Census Bureau (Recommended)
1. Visit https://api.census.gov/data/key_signup.html
2. Fill out form and submit
3. Check email for API key
4. Copy key to `.env`

See `.env.example` for complete list with links.

---

## Common Issues & Solutions

### Issue: "Cannot find module 'drizzle-orm'"
**Solution**: Run `npm install` again

### Issue: "DATABASE_URL must be set"
**Solution**: Check your `.env` file exists and has valid `DATABASE_URL`

### Issue: "Port 5000 already in use"
**Solution**: 
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <process_id> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

### Issue: API returns empty data
**Solution**: Check that API keys are set correctly in `.env`

### Issue: TypeScript errors
**Solution**: This is normal during development. The app will still run.

---

## Project Structure

```
New-election-countdown/
├── client/              # React frontend
│   └── src/
│       ├── components/  # UI components
│       ├── pages/       # Route pages
│       └── hooks/       # Custom hooks
├── server/              # Express backend
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── db.ts            # Database connection
├── shared/              # Shared types
│   └── schema.ts        # Database schema
├── .env                 # Your secrets (DO NOT COMMIT)
└── .env.example         # Template for .env
```

---

## Available Scripts

```bash
npm run dev        # Start development server (hot reload)
npm run build      # Build for production
npm start          # Run production build
npm run check      # Type check with TypeScript
npm run db:push    # Push schema changes to database
```

---

## Next Steps

1. ✅ **Explore the UI**: Browse elections at http://localhost:5000
2. ✅ **Check API docs**: See available endpoints in `server/routes/`
3. ✅ **Read CONTRIBUTING.md**: Guidelines for making changes
4. ✅ **Join development**: Pick an issue and start coding!

---

## Need Help?

- **Documentation**: Check the `/docs` folder (coming soon)
- **API Issues**: See `BUG_FIXES_AND_IMPROVEMENTS.md`
- **Security**: Read `SECURITY.md` before handling sensitive data
- **Deployment**: See `DEPLOYMENT.md` for production setup

---

## Quick Start Checklist

- [ ] Node.js 20+ installed
- [ ] PostgreSQL database provisioned
- [ ] `.env` file created with DATABASE_URL
- [ ] Google Civic API key added
- [ ] `npm install` completed successfully
- [ ] `npm run db:push` ran without errors
- [ ] `npm run dev` starts server
- [ ] http://localhost:5000 loads in browser
- [ ] http://localhost:5000/api/health returns OK

If all boxes are checked, you're ready to code! 🚀

---

**Having issues?** Check `BUG_FIXES_AND_IMPROVEMENTS.md` for common problems and solutions.
