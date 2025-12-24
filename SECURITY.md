# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please send an email to your security contact with:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** assessment
4. **Suggested fix** (if you have one)

We will respond within 48 hours and work with you to understand and address the issue.

## Security Measures in Place

### Authentication & Authorization
- ✅ JWT-based authentication with secure token management
- ✅ bcrypt password hashing with salt rounds
- ✅ Session management with PostgreSQL storage
- ✅ CSRF protection via cookie settings
- ✅ Rate limiting per subscription tier

### Data Protection
- ✅ Environment variables for all secrets
- ✅ SQL injection protection via Drizzle ORM parameterized queries
- ✅ Input validation and sanitization
- ✅ XSS protection headers
- ✅ Content Security Policy (CSP)

### Network Security
- ✅ HTTPS enforcement in production
- ✅ CORS configuration with allowlist
- ✅ Security headers (helmet middleware)
- ✅ Frame protection (X-Frame-Options)

### Database Security
- ✅ Connection pooling with timeout limits
- ✅ Prepared statements (no string concatenation)
- ✅ Database connection encryption (SSL/TLS)
- ✅ Graceful error handling (no stack trace leaks)

### API Security
- ✅ API key validation middleware
- ✅ Request size limits
- ✅ Timeout enforcement
- ✅ Bot prevention service

## Best Practices for Contributors

### Environment Variables
- **NEVER** commit `.env` files
- **NEVER** hardcode secrets in code
- Use `.env.example` as a template
- Rotate API keys regularly

### Code Review Checklist
- [ ] No sensitive data in logs
- [ ] All user inputs validated
- [ ] SQL queries use parameterized statements
- [ ] Error messages don't leak system information
- [ ] Authentication checked on protected routes
- [ ] Rate limiting applied to public endpoints

### Sensitive Data Handling
**DO NOT** log or expose:
- Passwords (even hashed)
- API keys or tokens
- Session IDs
- Database connection strings
- User personal information (PII)
- Internal system paths

### Secure Coding Guidelines

#### ✅ Good Example
```typescript
// Parameterized query via Drizzle ORM
const user = await db.select()
  .from(users)
  .where(eq(users.email, userEmail))
  .limit(1);
```

#### ❌ Bad Example
```typescript
// String concatenation - SQL injection risk!
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;
```

## Security Testing

Before deploying:
1. Run `npm audit` to check for vulnerable dependencies
2. Review all console.log statements for sensitive data
3. Verify `.env` is in `.gitignore`
4. Test authentication flows
5. Verify rate limiting works
6. Check CORS configuration

## Incident Response Plan

If a security breach occurs:

1. **Immediate Actions**
   - Revoke compromised credentials
   - Enable maintenance mode if needed
   - Preserve logs for analysis

2. **Assessment**
   - Identify scope of breach
   - Determine data exposure
   - Document timeline

3. **Mitigation**
   - Apply security patches
   - Update credentials
   - Notify affected users (if applicable)

4. **Post-Mortem**
   - Root cause analysis
   - Update security measures
   - Document lessons learned

## Compliance

This application handles election data and must comply with:

- **GDPR** (General Data Protection Regulation)
- **CCPA** (California Consumer Privacy Act)
- **Federal election data handling regulations**

### User Data Rights
Users have the right to:
- Access their data
- Delete their data
- Export their data
- Opt-out of data collection

## Security Audit History

| Date | Auditor | Findings | Status |
|------|---------|----------|--------|
| 2025-12-03 | Internal | 3 bugs fixed | ✅ Resolved |

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## Contact

For security concerns, contact: [Your Security Contact Email]

---

**Last Updated**: December 3, 2025  
**Next Review**: March 3, 2026
