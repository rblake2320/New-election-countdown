# 🚀 Complete Replit Setup Guide

**Problem**: Fresh GitHub clone to Replit doesn't work because environment variables and database aren't configured.

**Solution**: Follow this step-by-step guide.

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Import from GitHub

1. Go to **https://replit.com**
2. Click **"+ Create Repl"**
3. Select **"Import from GitHub"**
4. Paste your repo URL: `https://github.com/rblake2320/New-election-countdown`
5. Click **"Import from GitHub"**
6. Wait for import to complete (30-60 seconds)

### Step 2: Configure Database (CRITICAL)

**Option A: Get Free Neon Database (Recommended)**

1. Go to **https://neon.tech** (opens in new tab)
2. Click **"Sign Up"** (free tier - 10GB storage)
3. Create new project called **"ElectionTracker"**
4. After project created, click **"Connection String"**
5. **Copy the full connection string** (starts with `postgresql://`)
6. Go back to your Replit tab

**Option B: Use Existing Database**

If you already have a PostgreSQL database, get your connection string.

### Step 3: Add Database URL to Replit Secrets

**In your Replit:**

1. Click **🔒 "Secrets"** in the left sidebar (or Tools → Secrets)
2. Click **"+ New Secret"**
3. For **Key**, enter: `DATABASE_URL`
4. For **Value**, paste your database connection string
   ```
   postgresql://username:password@hostname.neon.tech:5432/database?sslmode=require
   ```
5. Click **"Add Secret"**

✅ **CRITICAL**: Without this, the app won't work!

### Step 4: Add API Keys (Optional but Recommended)

Add these optional keys for full functionality:

**Google Civic API** (Free - 25K requests/day):
1. Go to https://console.cloud.google.com/apis/credentials
2. Create API Key
3. Add to Secrets as: `GOOGLE_CIVIC_API_KEY`

**OpenFEC API** (Free - Unlimited):
1. Go to https://api.open.fec.gov/developers/
2. Sign up with email
3. Add to Secrets as: `OPENFEC_API_KEY`

**ProPublica Congress API** (Free - 5K requests/day):
1. Request key at https://www.propublica.org/datastore/api/propublica-congress-api
2. Add to Secrets as: `PROPUBLICA_API_KEY`

### Step 5: Install Dependencies

**In Replit Shell** (bottom of screen):

```bash
npm install
```

⏳ Wait 2-3 minutes for all packages to install.

### Step 6: Setup Database Tables

**In Replit Shell**:

```bash
npm run db:push
```

This creates all tables in your database.

### Step 7: Run the Application

Click the big green **▶ "Run"** button at top of Replit.

Or in Shell:
```bash
npm run dev
```

### Step 8: Verify It Works

**Check the console output** - you should see:

```
🌱 Starting database seed...
📊 Seeding elections...
   ✅ Inserted 15 elections
👥 Seeding candidates...
   ✅ Inserted 40 candidates
🏛️ Seeding congress members...
   ✅ Inserted 4 congress members
✅ Database seeding complete!
📈 Summary:
   Elections: 15
   Candidates: 40
   Congress Members: 4
```

**Open the app** in the Replit webview (right side):
- You should see **15 elections** on the homepage
- Filter dropdowns should work
- Election cards should be clickable

✅ **SUCCESS!** Your app is running.

---

## 🔧 Troubleshooting Common Issues

### Issue 1: "DATABASE_URL must be set"

**Symptom**: App crashes immediately with error

**Solution**:
1. Go to Secrets (🔒)
2. Verify `DATABASE_URL` exists
3. Verify the value is complete (starts with `postgresql://`)
4. Click **"Restart"** button in Replit

### Issue 2: "Cannot connect to database"

**Symptom**: Database connection errors

**Possible Causes**:

**A) Wrong connection string format**
```bash
# Correct format:
postgresql://username:password@host.neon.tech:5432/dbname?sslmode=require

# Common mistakes:
# - Missing ?sslmode=require at the end
# - Missing password
# - Wrong hostname
```

**B) Database doesn't exist**
- Make sure you created the database in Neon
- Check the database name matches your connection string

**C) Network/firewall issue**
- Neon databases should work from Replit by default
- Try restarting the Repl

### Issue 3: "No elections showing" / Empty homepage

**Check A: Did tables get created?**

In Replit Shell:
```bash
npm run db:push
```

If you see errors, the tables might not exist.

**Check B: Did seed run?**

Look at the console when app starts. If you DON'T see:
```
🌱 Starting database seed...
```

Then manually seed:
```bash
npm run db:seed
```

**Check C: Is database connection working?**

In Replit Shell:
```bash
node -e "console.log(process.env.DATABASE_URL ? '✅ DB URL exists' : '❌ DB URL missing')"
```

Should say: `✅ DB URL exists`

### Issue 4: "Module not found" or "Cannot find package"

**Solution**: Reinstall dependencies

In Replit Shell:
```bash
rm -rf node_modules package-lock.json
npm install
```

Then click **"Run"** again.

### Issue 5: Build errors / TypeScript errors

**Solution**: Clear cache and rebuild

In Replit Shell:
```bash
rm -rf dist .vite
npm run build
```

### Issue 6: Port already in use

**Solution**: Stop and restart

1. Click **"Stop"** button in Replit (top right)
2. Wait 5 seconds
3. Click **"Run"** button again

---

## 🎯 Verification Commands

Run these in Replit Shell to verify everything:

```bash
# 1. Check environment
echo "DATABASE_URL: $([ -n "$DATABASE_URL" ] && echo '✅ SET' || echo '❌ MISSING')"
echo "GOOGLE_CIVIC_API_KEY: $([ -n "$GOOGLE_CIVIC_API_KEY" ] && echo '✅ SET' || echo '⚠️  NOT SET (optional)')"

# 2. Check Node.js version
node --version
# Should be: v20.x.x or higher

# 3. Check npm version
npm --version
# Should be: 9.x.x or higher

# 4. Test database connection (after app is running)
curl http://localhost:5000/api/health
# Should return: {"status":"ok", "database":"connected"}

# 5. Check elections count (after app is running)
curl http://localhost:5000/api/elections | grep -o '"id"' | wc -l
# Should return: 15

# 6. Full API verification
node scripts/verify-apis.js
```

---

## 🔄 Starting Fresh (Nuclear Option)

If nothing works:

1. **Delete the Repl** completely
2. **Import from GitHub again**
3. **Add DATABASE_URL** to Secrets (fresh database recommended)
4. **Run setup**:
   ```bash
   npm install
   npm run db:push
   npm run dev
   ```
5. **Check logs** carefully for any errors

---

## 📊 What Should Work After Setup

### Homepage:
- ✅ Shows 15 elections
- ✅ Countdown timers update in real-time
- ✅ Filter by State dropdown (CA, TX, NY, FL, VA)
- ✅ Filter by Type dropdown (general, primary, special)
- ✅ Filter by Level dropdown (federal, state)
- ✅ Election cards are clickable

### Election Details Page:
- ✅ Shows 2-4 candidates per election
- ✅ Candidate cards show party colors
- ✅ Polling percentages display
- ✅ Charts show polling trends

### API Endpoints:
- ✅ `/api/health` → `{ "status": "ok" }`
- ✅ `/api/elections` → Array of 15 elections
- ✅ `/api/elections/:id` → Single election details
- ✅ `/api/elections/:id/candidates` → Array of candidates
- ✅ `/api/stats` → Platform statistics

---

## 🚀 Next Steps After Setup

Once your app is running:

1. **Test thoroughly**:
   - Click through every page
   - Test all filters
   - View election details
   - Check mobile view (resize browser)

2. **Add more API keys** (optional):
   - CENSUS_API_KEY
   - OPENSTATES_API_KEY
   - VOTESMART_API_KEY
   - PERPLEXITY_API_KEY

3. **Customize** (optional):
   - Update branding in `client/src/App.tsx`
   - Modify color scheme in `tailwind.config.ts`
   - Add your own elections via admin panel

4. **Deploy to production**:
   - Click "Deploy" in Replit
   - Configure custom domain (optional)
   - Set up monitoring

---

## 🆘 Getting Help

**Still stuck?** Provide these details:

1. **Replit console output** (copy full logs)
2. **Secrets configured** (key names only - NOT values):
   ```
   DATABASE_URL: ✅ or ❌
   GOOGLE_CIVIC_API_KEY: ✅ or ❌
   etc.
   ```
3. **Output of**: `npm run db:push`
4. **Output of**: `npm run db:seed`
5. **Screenshot** of homepage (if loads)
6. **Node version**: `node --version`
7. **NPM version**: `npm --version`

---

## ✅ Quick Checklist

Before asking for help, verify:

- [ ] DATABASE_URL is in Replit Secrets
- [ ] DATABASE_URL value is complete (starts with `postgresql://`)
- [ ] Ran `npm install` successfully (no errors)
- [ ] Ran `npm run db:push` successfully (no errors)
- [ ] App is running (green "Run" button shows "Stop")
- [ ] Checked console logs for errors
- [ ] Tried restarting the Repl

---

## 🎯 Expected Initial Data

After successful seed:

**Elections**:
- 2024 Presidential Election (past)
- 2026 U.S. Senate races (CA, NY, TX, FL)
- 2026 Gubernatorial races (CA, NY, TX, FL)
- 2026 U.S. House races (CA-12, TX-21, NY-14)
- 2025/2026 Primary elections
- 2025 Special elections

**Total**: 15 elections

**Candidates**: 40+ candidates (2-4 per election)

**Congress Members**: 4 sample members

---

**Last Updated**: December 3, 2025
**Tested On**: Replit Free & Hacker tiers
**Database**: Neon PostgreSQL (free tier)
**Node Version**: 20.x+
