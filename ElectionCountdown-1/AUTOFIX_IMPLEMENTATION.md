# Auto-fix Implementation for Data Steward Bot

## Overview
Added comprehensive auto-fix capabilities to the Data Steward Bot with transactional verification, allowing it to automatically remediate data integrity issues based on configurable policies. The system includes safety controls, audit logging, and a policy management UI.

## Architecture

### Database Schema
- **steward_mcp_packs**: Extended with auto-fix controls
  - `auto_fix_enabled`: Toggle for enabling auto-fixes per MCP
  - `auto_fix_max_severity`: Maximum severity level for auto-fixes (1=critical to 5=low)
  - `autofix_sql`: Parameterized SQL for safe remediations
  - `auto_fixes_applied`: Counter for tracking applied fixes
  
- **steward_autofix_log**: Audit trail for all auto-fix attempts
  - Records success/failure, error messages, and execution details
  
- **v_autofix_candidates**: View identifying fixable suggestions based on policy settings

### API Endpoints

#### Auto-fix Management (`/api/autofix`)
- `GET /candidates`: List auto-fixable issues
- `POST /apply/:id`: Apply a specific fix with verification
- `POST /apply-batch`: Batch apply safe fixes
- `GET /history`: View auto-fix history

#### Policy Configuration (`/api/steward`)
- `GET /policies`: List all policies with settings
- `PATCH /policies/:id`: Update policy auto-fix settings

#### Audit Tracking (`/api/steward`)
- `GET /audit-runs`: List all audit runs with filtering
- `GET /audit-runs/:id`: Get detailed audit run info
- `GET /audit-runs.csv`: Export audit history to CSV
- `POST /audit-runs`: Create new audit run

### UI Components
- **AutofixPanel**: React component for managing auto-fixes
  - Shows candidates for auto-fixing
  - Allows manual or batch application
  - Displays fix history with success/failure status
  
- **PolicyTogglePanel**: Policy configuration interface
  - Enable/disable auto-fix per policy
  - Set maximum severity levels
  - View fix SQL and verification status
  - Track applied fixes count
  
- **AuditRunsPanel**: Complete audit history tracking
  - View all nightly, manual, and pre-deploy runs
  - Filter by type, status, and date range
  - Export audit history to CSV
  - Track fix success rates and statistics
  - Monitor bot performance over time

## Current Auto-fix Policies

### Enabled by Default (Safe)
None - all auto-fixes require manual enablement for safety

### Available for Configuration
1. **CONGRESS_MISMATCH**: Update expected congress totals
2. **ZERO_CANDIDATE_HOTLIST**: Mark elections for re-fetch
3. **DATE_DRIFT**: Update election dates (disabled by default)

## Safety Features
- Severity-based gating (only fix low-severity issues by default)
- Parameterized SQL to prevent injection
- Full audit logging of all fix attempts
- Manual review required for critical issues
- Rollback capability via database transactions

## Usage

### Enable Auto-fix for an MCP
```sql
UPDATE steward_mcp_packs 
SET auto_fix_enabled = true, 
    auto_fix_max_severity = 4  -- Allow up to medium severity
WHERE name = 'CONGRESS_MISMATCH';
```

### Apply Fixes via API
```bash
# View candidates
curl http://localhost:5000/api/autofix/candidates

# Apply single fix
curl -X POST http://localhost:5000/api/autofix/apply/123 \
  -H "Content-Type: application/json" \
  -d '{"executor": "manual"}'

# Batch apply safe fixes
curl -X POST http://localhost:5000/api/autofix/apply-batch \
  -H "Content-Type: application/json" \
  -d '{"maxSeverity": "low", "limit": 5}'
```

## Benefits
- **Simplicity**: No external dependencies or complex infrastructure
- **Safety**: Multiple layers of protection against bad fixes
- **Auditability**: Complete history of all auto-fix attempts
- **Flexibility**: Easy to add new fix policies via database
- **Integration**: Works seamlessly with existing bot framework

## Future Enhancements (if needed)
- Schedule automatic batch fixes during low-traffic periods
- Add more sophisticated fix policies for complex issues
- Implement approval workflows for high-severity fixes
- Add metrics dashboard for fix success rates