# Production Deployment Checklist

Complete this checklist before deploying to production.

## Pre-Deployment

### Code Quality
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run check`)
- [ ] Code reviewed and approved
- [ ] Git repository up to date
- [ ] No debugging code (console.logs, debugger statements)

### Security
- [ ] `.env` file NOT in git repository
- [ ] All API keys rotated for production
- [ ] `JWT_SECRET` is strong random string (64+ characters)
- [ ] `SESSION_SECRET` is strong random string
- [ ] Security audit completed (`npm audit`)
- [ ] HTTPS certificates configured
- [ ] CORS allowlist configured for production domain
- [ ] Rate limiting tested and configured

### Database
- [ ] Production database provisioned
- [ ] Database backups configured (automated daily)
- [ ] Connection pooling configured (min: 2, max: 10)
- [ ] Database migrations tested
- [ ] Indexes created on frequently queried columns
- [ ] `DATABASE_URL` uses SSL/TLS (`?sslmode=require`)

### Environment Variables
- [ ] All required API keys added to production `.env`
  - [ ] `DATABASE_URL`
  - [ ] `GOOGLE_CIVIC_API_KEY`
  - [ ] `OPENFEC_API_KEY`
  - [ ] `PROPUBLICA_API_KEY`
  - [ ] `JWT_SECRET`
  - [ ] `SESSION_SECRET`
- [ ] `NODE_ENV=production` set
- [ ] `APP_URL` set to production domain
- [ ] `COOKIE_SECURE=true` for HTTPS
- [ ] Rate limit values appropriate for production

### Monitoring & Logging
- [ ] Error tracking configured (Sentry, LogRocket, etc.)
- [ ] Application monitoring setup (New Relic, DataDog, etc.)
- [ ] Log aggregation configured
- [ ] Uptime monitoring enabled (Pingdom, UptimeRobot, etc.)
- [ ] Performance monitoring enabled
- [ ] Database query performance monitoring

### Performance
- [ ] Build optimized for production (`npm run build`)
- [ ] Static assets compressed (gzip/brotli)
- [ ] CDN configured for static assets
- [ ] Database query performance tested
- [ ] API response times under 200ms (p95)
- [ ] Images optimized and compressed

### Infrastructure
- [ ] Server/container specs adequate (CPU, RAM, Disk)
- [ ] Auto-scaling configured (if using cloud platform)
- [ ] Load balancer configured (for multiple instances)
- [ ] SSL/TLS certificate valid and auto-renewing
- [ ] Firewall rules configured
- [ ] DDoS protection enabled

## Deployment

### Build & Deploy
- [ ] Run production build: `npm run build`
- [ ] Test production build locally: `npm start`
- [ ] Push database schema: `npm run db:push`
- [ ] Deploy to production server
- [ ] Verify deployment successful
- [ ] Check all environment variables loaded

### Smoke Tests
- [ ] Homepage loads: `https://yourdomain.com`
- [ ] Health check: `https://yourdomain.com/api/health`
- [ ] Enhanced health: `https://yourdomain.com/api/health/enhanced`
- [ ] Elections API: `https://yourdomain.com/api/elections`
- [ ] Authentication working
- [ ] Database queries working
- [ ] External APIs responding

### Critical User Flows
- [ ] User registration works
- [ ] User login works
- [ ] Election search works
- [ ] Candidate data displays
- [ ] Watchlist functionality works
- [ ] Notifications system works (if enabled)
- [ ] Mobile view displays correctly

## Post-Deployment

### Monitoring (First 24 Hours)
- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify database connection stability
- [ ] Review logs for errors
- [ ] Monitor memory usage
- [ ] Check CPU utilization
- [ ] Verify API rate limits working

### Validation
- [ ] All API endpoints responding
- [ ] Database queries performing well
- [ ] No 500 errors in logs
- [ ] External API integrations working
- [ ] Email notifications sending (if enabled)
- [ ] Background jobs running (results ingestion)

### Documentation
- [ ] Update README with production URL
- [ ] Document any production-specific configurations
- [ ] Update API documentation
- [ ] Create runbook for common issues
- [ ] Document rollback procedure

### Communication
- [ ] Notify team of successful deployment
- [ ] Update status page (if applicable)
- [ ] Announce to users (if major changes)

## Rollback Plan

If issues occur:

1. **Immediate Actions**
   ```bash
   # Revert to previous git commit
   git revert HEAD
   git push origin main
   
   # Or redeploy previous version
   git checkout <previous-commit>
   npm run build
   # Deploy
   ```

2. **Database Rollback**
   ```bash
   # If schema changes were made
   # Restore from backup taken before deployment
   ```

3. **Verification After Rollback**
   - [ ] Health check passes
   - [ ] Critical user flows work
   - [ ] Database connections stable
   - [ ] No new errors in logs

## Emergency Contacts

- **DevOps Lead**: [Contact Info]
- **Database Admin**: [Contact Info]
- **Security Contact**: [Contact Info]
- **On-Call Engineer**: [Contact Info]

## Post-Mortem (If Issues Occurred)

- [ ] Document what went wrong
- [ ] Identify root cause
- [ ] Create action items to prevent recurrence
- [ ] Update deployment checklist
- [ ] Share learnings with team

---

## Quick Reference Commands

```bash
# Build for production
npm run build

# Run production build locally
NODE_ENV=production npm start

# Push database schema
npm run db:push

# Run smoke tests
npm test

# Check for security vulnerabilities
npm audit

# View production logs (depends on hosting)
# Heroku: heroku logs --tail
# AWS: aws logs tail /aws/lambda/your-function
# Replit: Check dashboard logs
```

---

## Success Criteria

Deployment is successful when:
- ✅ All health checks pass
- ✅ Zero 500 errors in first hour
- ✅ Response times < 200ms (p95)
- ✅ Database connections stable
- ✅ External APIs responding
- ✅ Critical user flows working
- ✅ No security alerts

---

**Deployment Date**: ________________  
**Deployed By**: ________________  
**Git Commit**: ________________  
**Sign-off**: ________________  

**Issues Encountered**: _________________  
**Resolution**: _________________
