# 🚀 Quick Start - 5 Minutes to Running

The fastest way to get your Election Tracker running.

## Step 1: Install Dependencies (1 min)
```bash
npm install
```

## Step 2: Configure Environment (2 min)

Create `.env` file:
```bash
cp .env.example .env
```

**Minimum required** - Add these two lines to `.env`:
```env
DATABASE_URL=your_postgres_connection_string
GOOGLE_CIVIC_API_KEY=your_google_civic_key
```

> 💡 Get Neon database free: https://neon.tech  
> 💡 Get Google Civic API key: https://console.cloud.google.com/apis/credentials

## Step 3: Setup Database (1 min)
```bash
npm run db:push
```

## Step 4: Start Development Server (1 min)
```bash
npm run dev
```

## Step 5: Verify (30 seconds)

Open these in your browser:
- ✅ http://localhost:5000 - Main app
- ✅ http://localhost:5000/api/health - Should return `{"status":"ok"}`
- ✅ http://localhost:5000/api/elections - Should return election data

---

## 🎯 That's It!

You're now running the Election Tracker locally.

## Next Steps

1. **Explore the app**: Browse elections, check candidates
2. **Add more API keys**: See `.env.example` for optional services
3. **Read full docs**: Check `SETUP.md` for detailed setup
4. **Start coding**: See `CONTRIBUTING.md` for guidelines

---

## 🆘 Quick Troubleshooting

### "DATABASE_URL must be set"
→ Make sure `.env` file exists with valid DATABASE_URL

### "Cannot find module"
→ Run `npm install` again

### "Port 5000 already in use"
→ Kill process: `netstat -ano | findstr :5000` then `taskkill /PID <id> /F`

### Still stuck?
→ See full troubleshooting in `SETUP.md`

---

## 📚 Documentation Map

- `QUICK_START.md` ← You are here (fastest path)
- `SETUP.md` - Detailed setup guide
- `API_DOCUMENTATION.md` - API reference
- `SECURITY.md` - Security guidelines
- `DEPLOYMENT_CHECKLIST.md` - Production deployment

---

**Ready in 5 minutes!** ⚡
