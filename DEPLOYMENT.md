# Deployment — Hostinger VPS (Docker)

## Prerequisites
- Hostinger VPS with Docker + Docker Compose installed
- (Later) a domain pointed at the VPS IP — the app works on the bare IP until then

## First deploy

```bash
# On the VPS
git clone <your-repo-url> election-tracker
cd election-tracker

# Create the production env file
cat > .env <<'EOF'
POSTGRES_PASSWORD=<generate: openssl rand -hex 16>
JWT_SECRET=<generate: openssl rand -hex 32>
SESSION_SECRET=<generate: openssl rand -hex 32>
# Optional data-source keys (leave blank to run database-only):
OPENSTATES_API_KEY=
GOOGLE_CIVIC_API_KEY=
OPENFEC_API_KEY=
CENSUS_API_KEY=
CONGRESS_API_KEY=
EOF

# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# One-time: create the database schema
docker compose -f docker-compose.prod.yml exec app npx drizzle-kit push

# Restart the app so it seeds the verified 2026 election data
docker compose -f docker-compose.prod.yml restart app

# Verify
curl http://localhost:5000/api/health
# expect: {"ok":true,...,"elections":537,"candidates":120,...}
```

The app listens on port 5000. Put nginx (or Hostinger's proxy) in front for
TLS once the domain exists:

```nginx
server {
    listen 80;
    server_name your-domain.example;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then `certbot --nginx` for HTTPS and set `COOKIE_SECURE=true` (already set in
compose).

## Updates

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Schema changes additionally need:
```bash
docker compose -f docker-compose.prod.yml exec app npx drizzle-kit push
```

## Backups

```bash
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U elections elections > backup-$(date +%F).sql
```

## Notes

- All external API keys are optional — without them the platform serves the
  verified election database and hides the enhancement features.
- Health endpoint: `GET /api/health`. Service/key status: `GET /api/services/status`.
- The seed runs only when the `elections` table is empty; it never overwrites
  data.
