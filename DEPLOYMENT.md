# ElectionTracker Deployment Guide

This guide covers deployment options for the ElectionTracker platform.

## Replit Deployment (Recommended)

The platform is optimized for Replit's autoscale deployment system.

### Prerequisites
- Replit account
- Database configured (Neon PostgreSQL recommended)
- Required API keys set as secrets

### Deployment Steps

1. **Environment Setup**
   ```bash
   # Replit automatically handles these
   npm install
   npm run build
   ```

2. **Database Configuration**
   ```bash
   # Run migrations
   npm run db:push
   ```

3. **Environment Variables**
   Set these as Replit Secrets:
   - `DATABASE_URL`
   - `GOOGLE_CIVIC_API_KEY`
   - `OPENFEC_API_KEY`
   - `PROPUBLICA_API_KEY`
   - `CENSUS_API_KEY`
   - `MAPQUEST_API_KEY`
   - `PERPLEXITY_API_KEY`

4. **Deploy**
   ```bash
   # Replit handles deployment automatically
   # Application available at your-repl-name.replit.app
   ```

### Replit Configuration

The project includes:
- `.replit` configuration file
- Automatic dependency management
- Built-in database integration
- SSL/TLS termination
- Load balancing
- Health monitoring

## Manual Deployment

### System Requirements
- Node.js 20+
- PostgreSQL 14+
- 2GB+ RAM
- SSL certificate

### Installation

1. **Clone Repository**
   ```bash
   git clone https://github.com/rblake2320/ElectionsCountDown.git
   cd ElectionsCountDown
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Database Setup**
   ```bash
   npm run db:push
   ```

5. **Build Application**
   ```bash
   npm run build
   ```

6. **Start Production Server**
   ```bash
   npm start
   ```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NODE_ENV=production
    depends_on:
      - postgres
  
  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=electiontracker
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Cloud Platform Deployment

#### Vercel
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "client/**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/client/$1"
    }
  ]
}
```

#### Heroku
```json
{
  "name": "electiontracker",
  "stack": "heroku-22",
  "buildpacks": [
    {
      "url": "heroku/nodejs"
    }
  ],
  "addons": [
    {
      "plan": "heroku-postgresql:mini"
    }
  ]
}
```

#### Railway
```yaml
# railway.toml
[build]
  builder = "NIXPACKS"

[deploy]
  startCommand = "npm start"
  healthcheckPath = "/api/health"
  healthcheckTimeout = 100

[[services]]
  name = "electiontracker"
  port = 5000
```

## Database Deployment

### Neon (Recommended)
- Serverless PostgreSQL
- Automatic scaling
- Built-in connection pooling
- Global edge network

### Self-hosted PostgreSQL
```sql
-- Create database
CREATE DATABASE electiontracker;

-- Create user
CREATE USER electiontracker_user WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE electiontracker TO electiontracker_user;
```

## Performance Optimization

### Production Checklist
- [ ] Enable gzip compression
- [ ] Configure caching headers
- [ ] Set up CDN for static assets
- [ ] Implement database connection pooling
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Enable security headers
- [ ] Configure SSL/TLS

### Monitoring Setup

```bash
# Health check endpoint
curl https://your-domain.com/api/health

# Database status
curl https://your-domain.com/api/database/status

# Election count verification
curl https://your-domain.com/api/sync/status
```

### Security Configuration

```nginx
# Nginx configuration
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'" always;
}
```

## Backup and Recovery

### Database Backup
```bash
# Daily backup script
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup_20250123.sql
```

### Application Backup
```bash
# Backup configuration and data
tar -czf electiontracker_backup_$(date +%Y%m%d).tar.gz \
  .env \
  uploads/ \
  logs/
```

## Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Session management
- Database connection pooling
- Cache distribution

### Vertical Scaling
- CPU and memory optimization
- Database performance tuning
- Query optimization
- Index management

## Troubleshooting

### Common Issues
1. **Database Connection**: Check connection string and network access
2. **API Rate Limits**: Implement proper rate limiting and caching
3. **Memory Usage**: Monitor and optimize database queries
4. **SSL/TLS**: Ensure proper certificate configuration

### Debug Mode
```bash
# Enable debug logging
NODE_ENV=development npm start

# Check application logs
tail -f logs/app.log

# Monitor database queries
LOG_LEVEL=debug npm start
```

## Support

For deployment issues:
1. Check the troubleshooting section
2. Review application logs
3. Verify environment configuration
4. Create a GitHub issue with details