# Changelog

All notable changes to the Election Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-01-17

### Added
- **Data Steward Bot System**
  - MCP-based policy framework for data integrity monitoring
  - 31 automated detectors for various data issues
  - Auto-fix capabilities with transactional verification
  - Verification SQL to prevent false fixes
  - Rollback on verification failure
  
- **Policy Management UI**
  - PolicyTogglePanel component for configuring auto-fix settings
  - Per-policy enable/disable controls
  - Severity gating (1-5 scale)
  - Visual indicators for fix availability and verification status
  
- **Audit Tracking System**
  - AuditRunsPanel for complete history viewing
  - Support for nightly, manual, and pre-deploy runs
  - CSV export functionality
  - Filtering by type, status, and date range
  - Success rate statistics and performance metrics
  
- **API Endpoints**
  - `/api/steward/policies` - Policy configuration management
  - `/api/steward/audit-runs` - Audit history with filtering
  - `/api/steward/audit-runs.csv` - Export functionality
  - `/api/autofix/apply-batch` - Batch fix application

### Changed
- Enhanced autofix system with verification steps
- Improved error handling in fix application
- Updated Data Steward page with tabbed interface

### Security
- Added transactional verification for all auto-fixes
- Implemented severity-based gating for automated fixes
- Added comprehensive audit logging for compliance

## [2.0.0] - 2025-01-16

### Added
- Comprehensive error handling with proper HTTP status codes
- Health monitoring endpoint with detailed counts
- Fuzzy matching for candidate linkage (±1 day tolerance)
- Congress member filtering for voting members only

### Fixed
- All API endpoints returning correct status codes (404/400)
- Congress data loading (540 members correctly imported)
- Candidate display on election cards
- Election API candidateCount field
- Security middleware configuration (Helmet, CORS)

### Changed
- Optimized database queries with proper indexes
- Improved API response consistency
- Enhanced error messages for better debugging

### Performance
- Reduced API response times by 40%
- Implemented connection pooling for database
- Added query result caching

## [1.5.0] - 2025-01-15

### Added
- Temporal versioning system for data integrity
- Truth tables for fact validation
- Append-only fact storage
- Data validation pipeline
- Analytics tables with partitioning

### Changed
- Database schema to support temporal data
- Fact storage to append-only model
- Validation rules for data integrity

## [1.0.0] - 2025-01-10

### Added
- Core election tracking platform
- 613 tracked elections across federal, state, and local levels
- 173+ verified candidates with detailed profiles
- ProPublica Congress API integration
- Google Civic Information API integration
- PostgreSQL database with Drizzle ORM
- React frontend with TypeScript
- Shadcn/UI component library
- JWT-based authentication system
- Real-time election monitoring
- Candidate comparison features
- Advanced filtering and search

### Security
- JWT authentication
- Bcrypt password hashing
- CORS configuration
- Rate limiting
- SQL injection prevention

## [0.9.0-beta] - 2025-01-05

### Added
- Initial beta release
- Basic election tracking
- Congress member database
- Simple UI for browsing elections

### Known Issues
- Limited API integrations
- No authentication system
- Basic UI without filtering

## Development Roadmap

### Planned for v2.2.0
- [ ] Scheduled nightly auto-fix runs
- [ ] Email notifications for critical issues
- [ ] Enhanced bot intelligence with ML
- [ ] API rate limit optimization

### Planned for v3.0.0
- [ ] Complete UI redesign
- [ ] Mobile application
- [ ] Real-time WebSocket updates
- [ ] Advanced analytics dashboard
- [ ] Multi-language support