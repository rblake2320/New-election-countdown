# Election Platform Version Control

## Current Version: 2.1.0

### Version History

#### v2.1.0 (January 17, 2025)
**Major Enhancement: Data Steward Bot with Auto-fix System**
- ✅ Added comprehensive MCP-based Data Steward Bot
- ✅ Implemented auto-fix capabilities with transactional verification
- ✅ Created policy management UI with per-policy toggles
- ✅ Added audit runs tracking system with CSV export
- ✅ Built complete monitoring dashboard for bot operations
- **Features Added:**
  - 31 data integrity detectors
  - Configurable auto-fix policies with severity gating
  - Verification SQL for each fix to prevent false positives
  - Audit trail for all bot actions
  - Batch fix capabilities for safe remediations

#### v2.0.0 (January 16, 2025)
**Platform Stabilization & Performance**
- ✅ Fixed all API endpoints (100% test success rate)
- ✅ Resolved candidate linkage issues with fuzzy matching
- ✅ Implemented proper error handling (404/400 status codes)
- ✅ Added comprehensive health monitoring endpoint
- ✅ Optimized database queries with proper indexes
- **Key Improvements:**
  - Congress data: 540 members correctly loaded
  - Election API: Returns candidateCount field
  - Security: Helmet, CORS, compression middleware
  - All target elections display candidates properly

#### v1.5.0 (January 15, 2025)
**Temporal Data System**
- ✅ Implemented temporal versioning for facts
- ✅ Added truth tables for data integrity
- ✅ Created append-only fact storage
- ✅ Built data validation pipeline

#### v1.0.0 (January 10, 2025)
**Initial Production Release**
- ✅ Core election tracking platform
- ✅ 613 tracked elections
- ✅ 173+ verified candidates
- ✅ ProPublica Congress API integration
- ✅ Google Civic API integration
- ✅ PostgreSQL with Drizzle ORM
- ✅ React frontend with TypeScript
- ✅ JWT authentication system

### Database Schema Versions

#### Schema v3 (Current)
- Added `steward_mcp_packs` table for bot policies
- Added `steward_audit_runs` table for tracking
- Added `steward_autofix_log` table for fix history
- Added verification columns for auto-fix system

#### Schema v2
- Added temporal tables (`temporal_facts`, `temporal_truth`)
- Added analytics tables with partitioning
- Implemented candidate portal infrastructure

#### Schema v1
- Initial schema with core tables
- Elections, candidates, congress members
- Authentication and session management

### API Version Compatibility

| API Version | Supported | Notes |
|------------|-----------|-------|
| v2.1 | ✅ Current | Full auto-fix and monitoring |
| v2.0 | ✅ Supported | Core platform APIs |
| v1.x | ⚠️ Deprecated | Will be removed in v3.0 |

### Migration Guide

#### From v2.0 to v2.1
```sql
-- Run these migrations in order:
-- 1. Create MCP tables
CREATE TABLE steward_mcp_packs (...);
CREATE TABLE steward_audit_runs (...);
CREATE TABLE steward_autofix_log (...);

-- 2. Add indexes
CREATE INDEX idx_steward_audit_runs_started_at ON steward_audit_runs(started_at DESC);
CREATE INDEX idx_steward_audit_runs_run_type ON steward_audit_runs(run_type);

-- 3. Insert default policies
INSERT INTO steward_mcp_packs (name, detector_sql, ...) VALUES (...);
```

#### From v1.x to v2.0
```sql
-- Major schema changes, requires full migration
-- Contact support for migration assistance
```

### Breaking Changes

#### v2.1.0
- None (backward compatible)

#### v2.0.0
- API endpoints restructured
- Authentication flow updated
- Database schema normalized

### Deployment Checklist

Before deploying a new version:
1. ✅ Run all tests: `npm test`
2. ✅ Check database migrations
3. ✅ Update VERSION.md
4. ✅ Run audit scan: `/api/steward/audit-runs`
5. ✅ Backup database
6. ✅ Test in staging environment
7. ✅ Update API documentation

### Rollback Procedures

If issues occur after deployment:
1. Use Replit's checkpoint system to rollback
2. Restore database from backup if needed
3. Revert to previous version tag
4. Run recovery audit scan

### Support

For version-related issues:
- Check audit logs: `/api/steward/audit-runs`
- Review bot suggestions: `/api/bot/suggestions`
- Contact platform team for assistance