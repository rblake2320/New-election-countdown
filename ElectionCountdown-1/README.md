# ElectionTracker - Real-Time Global Election Platform

A comprehensive, real-time election tracking platform serving as the authoritative source for all election information through November 2026, with secure candidate campaign portals and authentic data validation.

## 🚀 Features

### Core Platform
- **Real-time Election Tracking**: 601+ elections with live countdown timers
- **Authentic Data Only**: All polling percentages from verified API sources
- **Multi-source Integration**: Google Civic API, OpenFEC, ProPublica Congress, Census Bureau
- **Advanced Filtering**: By type, level, state, timeframe, and party affiliation
- **Candidate Management**: Comprehensive candidate profiles with authentic polling data

### Data Authenticity System
- **Quality Indicators**: hasAuthenticPolling, pollingConfidence, dataQuality scoring
- **Source Validation**: Clear indicators for static vs. live data
- **No Mock Data**: Eliminated all placeholder percentage values
- **Live Data Monitoring**: Continuous sync to maintain election count

### Michigan Primary Integration
- **Real Candidates**: 9 authenticated candidates including Elissa Slotkin, Mike Rogers, Tom Barrett
- **Federal Races**: U.S. Senate and House District elections
- **Authentic Sources**: FEC records, state election offices, verified news sources

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Shadcn/ui** components with Radix UI primitives
- **Tailwind CSS** for responsive design
- **TanStack Query** for server state management
- **Wouter** for client-side routing

### Backend
- **Node.js** with Express.js
- **TypeScript** with ES modules
- **Drizzle ORM** with PostgreSQL
- **JWT Authentication** with bcrypt
- **Rate Limiting** and security middleware

### Database
- **PostgreSQL** (Neon serverless)
- **Drizzle ORM** for type-safe operations
- **Connection Pooling** with WebSocket support
- **Automated Migrations** and schema management

## 🔧 Setup

### Prerequisites
- Node.js 20+
- PostgreSQL database
- API keys for external services

### Installation

```bash
git clone https://github.com/rblake2320/ElectionsCountDown.git
cd ElectionsCountDown
npm install
```

### Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=your_postgresql_url
GOOGLE_CIVIC_API_KEY=your_google_civic_key
OPENFEC_API_KEY=your_openfec_key
PROPUBLICA_API_KEY=your_propublica_key
CENSUS_API_KEY=your_census_key
MAPQUEST_API_KEY=your_mapquest_key
PERPLEXITY_API_KEY=your_perplexity_key
```

### Database Setup

```bash
npm run db:push
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 📊 API Endpoints

### Elections
- `GET /api/elections` - Get all elections with filtering
- `GET /api/elections/:id` - Get specific election
- `GET /api/elections/:id/candidates` - Get election candidates
- `POST /api/sync/elections/all` - Sync from all data sources

### Candidates
- `GET /api/candidates/:id` - Get candidate details
- `POST /api/setup/michigan-primary` - Add Michigan primary candidates

### Data Integrity
- `GET /api/data-audit/percentages` - Audit all percentage data
- `GET /api/sync/status` - Check election count and sync status

### Analytics
- `GET /api/stats` - Platform statistics
- `GET /api/global-status` - Global election dashboard data

## 🔌 API Integrations

### Government APIs
- **Google Civic Information API** - Federal and state elections
- **OpenFEC API** - Campaign finance data
- **ProPublica Congress API** - Congressional voting records
- **Census Bureau API** - Demographic and district data
- **OpenStates API** - State legislature data

### External Services
- **Perplexity AI** - Fact-checking and content validation
- **MapQuest API** - Geocoding and location services
- **Firecrawl** - Web scraping for official sources

## 📈 Data Sources

The platform aggregates data from 100+ authentic sources:
- Federal Election Commission (FEC)
- State Secretary of State offices
- Ballotpedia election calendar
- League of Women Voters (Vote411)
- Local election authorities
- Verified news sources

## 🔒 Security Features

- **JWT Authentication** with secure token management
- **Rate Limiting** per subscription tier
- **Content Validation** and sanitization
- **GDPR/CCPA Compliance** with privacy controls
- **Audit Logging** for all data changes
- **Bot Prevention** with behavioral analysis

## 🚀 Deployment

### Replit Deployment
The platform is optimized for Replit's autoscale deployment:

```bash
# Automatically handled by Replit
npm run build
```

### Manual Deployment
```bash
npm run build
npm start
```

## 📝 Development Guidelines

### Code Standards
- TypeScript strict mode enabled
- ESLint and Prettier configured
- Component-based architecture
- Type-safe database operations

### Database Schema
- Elections, candidates, users, and analytics tables
- Proper indexing for performance
- Foreign key relationships maintained
- Automated data archival

### Testing
- Comprehensive API testing
- Frontend component testing
- Database integration testing
- Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
- Create a GitHub issue
- Contact: [Your contact information]

## 🔄 Recent Updates

### July 23, 2025
- **Data Authenticity System**: Implemented comprehensive validation ensuring all polling percentages come from verified sources
- **Michigan Primary Integration**: Added 9 real candidates with authentic FEC and state records
- **Live Data Monitoring**: Continuous sync maintaining 601+ election count
- **API Optimization**: Enhanced performance with proper caching and error handling

### Key Metrics
- **601+ Elections** tracked across federal, state, and local levels
- **100% Authentic Data** - No mock or placeholder percentages
- **9 Michigan Candidates** added from verified sources
- **Multiple API Integrations** for comprehensive coverage

---

Built with ❤️ for transparent, data-driven democracy