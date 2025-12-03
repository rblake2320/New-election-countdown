# Version Control Guide for Election Platform

## Overview

This guide explains how to manage versions, create releases, and maintain the project's version history.

## Current Version System

We use **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes that require migration
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes and minor improvements

**Current Version: 2.1.0**

## Project Structure

```
election-platform/
├── VERSION.md           # Detailed version history and migration guides
├── CHANGELOG.md         # User-facing changelog
├── VERSION_CONTROL_GUIDE.md  # This file
├── .gitignore          # Git ignore configuration
├── scripts/
│   ├── version-bump.js # Automated version bumping
│   └── create-backup.js # Database backup utility
└── backups/            # Database backups (git-ignored)
```

## Daily Workflow

### 1. Before Making Changes

Always check the current version and recent changes:
```bash
# View current version
head -20 VERSION.md

# Check recent commits (when git is available)
git log --oneline -10
```

### 2. During Development

Track your changes in a local file:
```bash
# Create a changes file for your session
echo "## Changes in this session" > today-changes.md
echo "- Fixed: Issue with candidate display" >> today-changes.md
echo "- Added: New API endpoint for audit runs" >> today-changes.md
```

### 3. After Completing Features

Update the documentation:
1. Add your changes to CHANGELOG.md
2. Update VERSION.md if significant
3. Run tests to ensure stability

## Version Bumping Process

### Automated Method

```bash
# For bug fixes (2.1.0 → 2.1.1)
node scripts/version-bump.js patch

# For new features (2.1.0 → 2.2.0)
node scripts/version-bump.js minor

# For breaking changes (2.1.0 → 3.0.0)
node scripts/version-bump.js major
```

### Manual Method

1. **Update VERSION.md**
   - Change "Current Version" at the top
   - Add new version entry with date and changes

2. **Update CHANGELOG.md**
   - Add new version section
   - List all changes categorized by type

3. **Update replit.md**
   - Update version in status section
   - Add significant architectural changes

## Creating Releases

### Pre-release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Database migrations ready
- [ ] Backup created
- [ ] Security scan completed

### Release Process

1. **Create Database Backup**
   ```bash
   node scripts/create-backup.js
   ```

2. **Run Audit Scan**
   ```bash
   curl -X POST http://localhost:5000/api/steward/audit-runs \
     -H "Content-Type: application/json" \
     -d '{"run_type": "predeploy", "notes": "Pre-release audit"}'
   ```

3. **Update Version Files**
   ```bash
   node scripts/version-bump.js minor
   ```

4. **Test Critical Paths**
   - Load main page
   - Check election display
   - Verify candidate data
   - Test Data Steward bot

5. **Deploy**
   - Use Replit's deployment button
   - Monitor logs for errors
   - Verify production health endpoint

## Rollback Procedures

### Quick Rollback (Last Working Version)

1. **Use Replit Checkpoints**
   - Click "View Checkpoints" in Replit
   - Select last known good checkpoint
   - Restore code and database

2. **Manual Database Rollback**
   ```bash
   # List available backups
   ls -la backups/
   
   # Restore from backup (requires custom script)
   node scripts/restore-backup.js backups/backup-2025-01-17.json
   ```

### Version-Specific Rollback

For rolling back to a specific version:

1. **Identify Target Version**
   - Check VERSION.md for version history
   - Note any required migrations

2. **Restore Code**
   - Use git checkout (if available)
   - Or manually restore from backups

3. **Run Migrations**
   - Check migration guide in VERSION.md
   - Apply reverse migrations if needed

## Version Tags and Branches

### Naming Convention

- **Release tags**: `v2.1.0`
- **Beta versions**: `v2.2.0-beta.1`
- **Hotfixes**: `v2.1.1-hotfix`

### Branch Strategy

```
main (production)
  ├── develop (staging)
  │   ├── feature/data-steward-bot
  │   ├── feature/audit-system
  │   └── fix/candidate-display
  └── hotfix/critical-security-fix
```

## Database Versioning

### Schema Versions

Track schema changes in migrations:
```sql
-- migration_v2_to_v3.sql
BEGIN;
ALTER TABLE elections ADD COLUMN version_tag VARCHAR(20);
UPDATE system_info SET schema_version = 3;
COMMIT;
```

### Data Versioning

Use temporal tables for data versioning:
- `temporal_facts`: Append-only facts
- `temporal_truth`: Current truth state
- `audit_runs`: Change history

## API Versioning

### Current API Versions

- **v2**: Current production API
- **v1**: Deprecated, removal planned

### API Endpoints

```
/api/v2/elections     # Current
/api/v2/candidates    # Current
/api/v1/elections     # Deprecated
```

## Monitoring Version Health

### Health Check Endpoints

```bash
# System health with version info
curl http://localhost:5000/api/health

# Data Steward audit status
curl http://localhost:5000/api/steward/audit-runs?limit=1

# Check for data issues
curl http://localhost:5000/api/bot/suggestions
```

### Version Metrics

Monitor these metrics after deployment:
- API response times
- Error rates
- Database query performance
- Auto-fix success rates
- User activity patterns

## Best Practices

### DO's
✅ Always create backups before major changes
✅ Document all changes in CHANGELOG.md
✅ Test migrations in development first
✅ Keep version numbers consistent across files
✅ Use semantic versioning strictly
✅ Tag releases for easy rollback
✅ Monitor health after deployment

### DON'Ts
❌ Skip version bumps for production changes
❌ Make breaking changes without major version bump
❌ Deploy without running tests
❌ Forget to update documentation
❌ Mix multiple features in patch releases
❌ Delete old backups immediately

## Troubleshooting

### Common Issues

1. **Version Mismatch**
   - Check all version files are synchronized
   - Run version-bump script to fix

2. **Failed Migration**
   - Restore from backup
   - Review migration SQL
   - Test in development

3. **API Compatibility**
   - Check API version in requests
   - Review breaking changes in CHANGELOG
   - Update client code if needed

## Emergency Contacts

For critical issues:
1. Check Replit status page
2. Review audit logs
3. Contact platform team
4. Use rollback procedures

## Automation Scripts

### Daily Backup Script
```bash
#!/bin/bash
# Add to cron for daily backups
node /app/scripts/create-backup.js
```

### Version Check Script
```bash
#!/bin/bash
# Check version consistency
grep -h "version" VERSION.md CHANGELOG.md replit.md
```

## Future Improvements

Planned versioning enhancements:
- [ ] Automated changelog generation from commits
- [ ] Version compatibility matrix
- [ ] Automated rollback testing
- [ ] Version-specific feature flags
- [ ] A/B testing for major releases