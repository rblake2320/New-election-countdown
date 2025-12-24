# Election Tracker Platform

## Overview

This is a comprehensive election tracking and candidate management platform designed to provide real-time election data, candidate management tools, voter analytics, and secure campaign portals. The platform integrates multiple data sources to deliver accurate, up-to-date election information with enterprise-grade security and compliance features. Its business vision is to be the leading platform for election transparency and candidate engagement, offering significant market potential in political technology.

**Current Version:** 2.5.0 (November 4, 2025)

**Current Status:** Platform production-ready. Fresh deployments seed 15 sample elections (2024-2026) for demonstration. Production systems with API keys enabled sync 600+ elections from verified sources. Includes 515 authentic Congress members and comprehensive candidate tracking. All critical systems operational with graceful API failover and comprehensive multi-layer data validation. **NEW: Live election results tracking system fully operational** with automated ingestion, race calling logic, and admin manual entry backup.

**New in v2.5.0 - Live Election Results Tracking System:**
- ✅ **Admin Results Entry**: Protected admin interface at `/admin/results` for manual vote count entry with authentication guards
- ✅ **Automated Results Ingestion**: ResultsIngestionService with 30-second polling from Google Civic API and state-level scrapers
- ✅ **Race Calling Logic**: Automated winner determination based on margin thresholds (100% reporting, 95%+5%, 80%+10%, 50%+15% projection)
- ✅ **Live Dashboard**: "Happening Now" page at `/happening-now` with auto-refresh, real-time vote counts, and winner badges
- ✅ **Enhanced Components**: LiveResultsTracker component with vote counts, reporting percentages, and progress bars
- ✅ **API Endpoints**: 4 ingestion control endpoints (start/stop/trigger/status) with authentication protection
- ✅ **Multi-Source Support**: Flexible architecture ready for AP Elections API integration when available
- ✅ **Security**: Frontend and backend authentication guards protecting all admin results entry functions

**Previous: v2.4.1 - Data Integrity & UI Navigation Fixes:**
- ✅ **State Filter Fixed**: Reactivated 8 elections incorrectly marked inactive (7 Louisiana + 1 Arizona)
- ✅ **Election Card Navigation**: Made election titles clickable with hover effects for detail page navigation
- ✅ **Active Election Count**: Increased from 619 to 627 by reactivating legitimate future elections
- ✅ **Data Cleanup**: Identified and deactivated 3 past/test elections (Virginia Primary, Example Domain test, Louisiana Special)

**New in v2.4.0 - Multi-Layer Data Validation System:**
- ✅ **4-Layer Validation Architecture**: Rules-based → AI-powered (Perplexity) → Official sources → Manual review
- ✅ **State-Specific Election Rules**: Comprehensive validator for all 50 states (coordinated elections, Louisiana Saturday requirement, special elections)
- ✅ **Data Provenance Tracking**: Complete audit trail for all data sources with verification timestamps and confidence scores
- ✅ **Automated Audit System**: Daily scheduled audits with comprehensive reporting and issue categorization
- ✅ **Admin Validation API**: 5 new endpoints for managing validation issues, fixing election dates, and reviewing audit history
- ✅ **Critical Bug Fixed**: Multi-layer reconciliation now properly allows higher-confidence layers to override lower-confidence failures
- ✅ **Initial Audit Complete**: 630 elections validated, 36 critical issues identified (96% pass rate), 26 queued for manual review

**Recent Fixes (v2.3.0):**
- ✅ **Perplexity API crash fixed**: Election details endpoint now gracefully handles API failures with fallback messaging
- ✅ **DrillService stabilized**: Fixed 28 type mismatches, RTO/RPO metrics now properly convert minutes↔seconds
- ✅ **Congress data cleaned**: Removed 528 duplicate placeholder members (1043 → 515 authentic members)
- ✅ **Election categorization**: Standardized case inconsistencies (local→Local, federal→Federal, state→State)
- ✅ **Analytics log spam**: Resolved health check flooding - only logs status changes

**Platform Features:**
- ✅ API error handling: Proper 404/400 status codes for invalid requests
- ✅ Congress data: 515 members with voting member filtering and proper bioguide IDs
- ✅ Election API: Returns candidateCount field for all elections
- ✅ Candidate linkage: Fuzzy matching with ±1 day tolerance prevents stuck UI states
- ✅ Health endpoint: Comprehensive counts including congress_total
- ✅ Security: Helmet, CORS, compression middleware properly configured
- ✅ Data Steward Bot: MCP framework with 31 detected issues and auto-fix capabilities
- ✅ Authentication: JWT-based auth with Argon2 password hashing, session management
- ✅ User Portal: Campaign management, candidate profiles, API key generation
- ✅ Layout Consistency: Featured and Upcoming cards use same component with equal heights
- ✅ CSS Isolation: Demo styles scoped to prevent global bleeding
- ✅ Admin Features: Hidden from normal users via useIsAdmin hook and VITE_ADMIN_FEATURES flag

## User Preferences

Preferred communication style: Simple, everyday language.
Theme preference: Adaptive text visibility for both light and dark modes.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM
- **Authentication**: JWT-based authentication with Argon2 password hashing
- **Session Management**: Server-side sessions with JWT tokens in httpOnly cookies
- **API Structure**: RESTful APIs
- **Real-time Features**: Event-driven architecture
- **Data Integrity**: Temporal versioning system with append-only facts and truth tables
- **Bot Framework**: MCP (Monitoring Control Packs) policy-driven system with database-stored detectors and auto-fix verification

### Database Architecture
- **Primary Database**: PostgreSQL (Neon serverless)
- **Schema Management**: Drizzle ORM with migration system
- **Connection Pooling**: Neon serverless pool
- **Backup Strategy**: Automated PostgreSQL dumps

### Key Components
- **Election Management System**: Comprehensive election database, real-time result tracking, candidate management, multi-source data aggregation.
- **Live Results Tracking System** (NEW v2.5.0): Complete live election results infrastructure with automated ingestion service (30s polling), race calling logic (margin-based winner determination), admin manual entry interface (`/admin/results`), live dashboard (`/happening-now`), and multi-source support (Google Civic API, state scrapers, ready for AP Elections API). Features frontend/backend authentication guards, vote count tracking, reporting percentages, and auto-refresh capabilities.
- **Multi-Layer Data Validation System** (v2.4.0): 4-layer validation architecture (rules-based → AI-powered → official sources → manual review) with state-specific election rules, automated auditing, data provenance tracking, and admin API endpoints. Ensures data accuracy with 96% pass rate across 630 elections.
- **Candidate Portal System**: Secure authentication, subscription-based access control, campaign content management, voter interaction analytics, position statement management.
- **Security & Compliance Framework**: Multi-layer authentication/authorization, rate limiting, content validation, privacy regulation compliance (GDPR, CCPA), audit logging, bot prevention.
- **Data Integration Services**: Integration with government APIs, congressional data, third-party services for fact-checking, geographic services, real-time monitoring via web scraping and RSS feeds.
- **Analytics & Monitoring**: Production-grade analytics pipeline with event tracking (page views, candidate interactions, comparisons), health monitoring endpoints, performance metrics using partitioned PostgreSQL tables and materialized views, anonymous session tracking with UTM parameters.

### Data Flow
The system involves data ingestion from external APIs, AI-powered validation, storage in PostgreSQL, in-memory caching for performance, API delivery to frontends, real-time updates via an event-driven system, and analytics collection.

### Deployment Strategy
- **Development Environment**: Local Vite dev server, Neon development database.
- **Production Deployment**: Replit autoscale deployment, Neon production database, built-in monitoring.
- **Security Considerations**: Environment variables for secrets, CORS, rate limiting, CSP headers, SQL injection prevention.
- **Performance Optimization**: Database query optimization, multi-layer caching, connection pooling, automated data archival, CDN-ready static assets.

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit**: Development and deployment platform
- **WebSocket Support**: For real-time features

### API Integrations
- **ProPublica Congress API**: Congressional data
- **Google Civic Information API**: Election and candidate information
- **Data.gov APIs**: Government election data
- **Census Bureau API**: Demographic and district data
- **MapQuest API**: Geocoding and location services
- **Perplexity AI API**: Fact-checking and content validation
- **OpenStates API**: State legislature data
- **OpenFEC API**: Campaign finance data

### Development Tools
- **Drizzle Kit**: Database schema management
- **Vite**: Frontend build tool
- **ESBuild**: Backend JavaScript bundling
- **TypeScript**: Type safety
- **Puppeteer, Playwright, Selenium**: For browser automation and advanced data collection
- **Vitest**: Production-ready testing framework with comprehensive coverage
- **Testing Library**: React component testing with user interaction simulation
- **MSW**: API mocking for deterministic test environments