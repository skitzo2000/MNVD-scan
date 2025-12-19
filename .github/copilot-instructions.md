# GitHub Copilot Instructions for MNVD-scan

## Repository Overview

MNVD (Monitor National Vulnerability Database) is a Node.js application that monitors the National Vulnerability Database (NVD) for specific operating systems and services, sending notifications via webhooks when new vulnerabilities are detected.

**Attribution**: This product uses the NVD API but is not endorsed or certified by the NVD.

## Language Composition

- **JavaScript**:  89.3% (Primary language)
- **Shell**:  9.2% (Docker and deployment scripts)
- **Dockerfile**: 1.5% (Container configuration)

## Technology Stack

### Backend (Node.js 22+)
- **Runtime**: Node.js >=18.0.0 (recommended 22+)
- **Framework**: Express.js 5.1.0
- **HTTP Client**:  Axios 1.13.2
- **Security**:  Helmet 8.1.0, CORS 2.8.5, Express Rate Limit 8.2.1
- **Scheduling**: Node-cron 4.2.1
- **Environment**:  Dotenv 17.2.3
- **Storage**: JSON file-based Data Access Layer (no database)

### Frontend (Next.js 16)
- **Framework**: Next.js 16.0.1 with App Router
- **React**: React 19.1.1 / React DOM 19.2.0
- **UI Library**: Material-UI 7.3.4
- **Styling**: Emotion 11.14.x (@emotion/react, @emotion/styled, @emotion/cache)
- **Data Fetching**: SWR 2.2.4 (intelligent caching and background updates)
- **HTTP Client**: Axios 1.7.9

### Development Tools
- **Linting**: ESLint 9.39.1 with React and TypeScript plugins
- **Development Server**:  Nodemon 3.1.7
- **Bundle Analysis**: @next/bundle-analyzer 16.0.1
- **Containerization**: Docker with multi-stage builds and rootless support

## Project Structure

```
MNVD-scan/
├── backend/                      # Node.js backend service
│   ├── server.js                # Main Express server
│   ├── database.js              # Database operations (DAL interface)
│   ├── dal/                     # Data Access Layer
│   │   └── index.js             # JSON file storage implementation
│   ├── nal/                     # Notification Access Layer
│   │   └── index.js             # Webhook management (Discord, Teams)
│   ├── sal/                     # Scan Access Layer
│   │   └── index.js             # Scan and workflow management
│   ├── notification-service.js  # Multi-platform notification service
│   ├── nvd-client.js            # NVD API client
│   ├── discord-notifier.js      # Legacy Discord notification handler
│   ├── scanner.js               # Scanning orchestration
│   └── package.json             # Backend dependencies
│
├── frontend/                     # Next.js 16 frontend
│   ├── pages/                   # Next.js pages and API routes
│   │   ├── _app.js              # App configuration with MUI theme
│   │   ├── _document.js         # HTML document structure
│   │   ├── index.js             # Main dashboard page
│   │   └── api/                 # API proxy routes to backend
│   ├── components/              # React components
│   │   ├── layout/              # Layout components (Header, Footer, Layout)
│   │   ├── ui/                  # UI components (Cards, Lists, Dialogs)
│   │   ├── forms/               # Form components
│   │   └── hooks/               # Custom React hooks with SWR
│   ├── lib/                     # Utility libraries
│   │   └── swr-config.js        # SWR configuration
│   └── package.json             # Frontend dependencies
│
├── data/                         # JSON file storage (runtime)
│   ├── queries.json             # Vulnerability queries
│   ├── cves.json                # CVE data
│   ├── scans.json               # Scan history and statistics
│   ├── workflows.json           # Workflow definitions
│   ├── notifications.json       # Notification history
│   └── webhooks.json            # Webhook configuration
│
├── tests/                        # Test suites
│   ├── test-api.sh              # API endpoint tests
│   ├── test-frontend.sh         # Frontend integration tests
│   ├── test-nal.js              # NAL functionality tests
│   ├── test-sal.js              # SAL functionality tests
│   ├── test-webhooks.js         # Webhook compatibility tests
│   └── run-all-tests.sh         # Complete test suite
│
├── docs/                         # Documentation
├── test-data/                    # Test data files
├── .github/                      # GitHub workflows and configuration
├── .cursor/                      # Cursor IDE configuration
│
├── docker-compose.yml            # Development Docker setup
├── docker-compose.production.yml # Production Docker setup
├── Dockerfile.node               # Multi-stage Docker build
├── start-docker.sh               # Docker startup script
├── env_template                  # Environment variable template
├── package.json                  # Root package.json (workspaces)
│
└── Documentation files: 
    ├── README.md                 # Main documentation
    ├── MIGRATION_SUMMARY.md      # Next.js migration details
    ├── DEPENDENCY_UPDATE_SUMMARY.md
    ├── NEXTJS_MIGRATION_TODO.md
    └── CLEANUP_LIST.md
```

## Architecture Patterns

### Data Access Layer (DAL)
- **Pattern**: Repository pattern with JSON file storage
- **Location**: `backend/dal/`
- **Storage**:  Lightweight JSON files (no database dependencies)
- **Benefits**: Portable, version-controllable, no database administration

### Notification Access Layer (NAL)
- **Pattern**: Multi-platform webhook management
- **Location**: `backend/nal/`
- **Platforms**: Discord, Microsoft Teams
- **Features**: Category management, flexible routing, comprehensive logging

### Scan Access Layer (SAL)
- **Pattern**: Workflow management for vulnerability scans
- **Location**: `backend/sal/`
- **Capabilities**: NVD scans, custom scans, workflow templates, scheduling

## Key Features & Concepts

### Backend Functionality
1. **NVD Integration**: Polls NVD API for CVE data using CPE queries
2. **Idempotency**: Tracks processed CVEs to avoid duplicate notifications
3. **Rate Limiting**: Built-in API rate limiting and retry logic
4. **Scheduled Scans**: Automated scanning every 6 hours via node-cron
5. **Webhook Management**: Multi-platform notification support
6. **JSON Storage**: File-based persistence with no external database

### Frontend Features
1. **Server Components**: Next.js App Router with SSR
2. **SWR Data Fetching**: Intelligent caching, background updates, optimistic UI
3. **Material-UI**:  Modern, responsive UI components
4. **Real-time Updates**:  Automatic background data refresh
5. **Performance Monitoring**: Development-time performance tracking
6. **Bundle Optimization**: Code splitting, tree shaking, image optimization

## Development Guidelines

### When Working on Backend Code
- Use async/await for all asynchronous operations
- All data operations must go through the DAL (`backend/dal/`)
- Use the NAL for sending notifications (`backend/nal/`)
- Follow Express.js middleware patterns
- Implement proper error handling with try-catch blocks
- Use environment variables for configuration (dotenv)

### When Working on Frontend Code
- Use Next.js App Router conventions (not Pages Router)
- Leverage SWR for data fetching (avoid raw fetch/axios in components)
- Use Material-UI components consistently
- Implement responsive design with MUI breakpoints
- Use Emotion for custom styling when needed
- Follow React 19 best practices (no deprecated lifecycle methods)

### File Naming Conventions
- **Backend**: kebab-case for files (e.g., `notification-service.js`)
- **Frontend**: kebab-case for components (e.g., `query-list.js`)
- **Configuration**: lowercase with extensions (e.g., `package.json`, `.dockerignore`)

## API Patterns

### Backend API Endpoints
- `GET /api/queries` - List all vulnerability queries
- `POST /api/queries` - Create new query
- `DELETE /api/queries/:id` - Delete query
- `POST /api/scan` - Trigger manual scan
- `GET /api/stats` - Get scan statistics
- `GET /api/health` - Health check

### Frontend API Routes
- API routes in `frontend/pages/api/` proxy to backend
- Use SWR hooks for data fetching in components
- Implement optimistic updates for better UX

## Docker & Deployment

### Container Strategy
- **Multi-stage builds**:  Separate dependency, build, and runtime layers
- **Rootless execution**: Runs as non-root user (UID 1001)
- **Development**:  Hot reload with volume mounts
- **Production**:  Optimized standalone builds from GHCR

### Environment Variables
Required: 
- `NVD_API_KEY` - NVD API key
- `DISCORD_WEBHOOK_URL` - Discord webhook (optional if using per-query webhooks)
- `TEAMS_WEBHOOK_URL` - Teams webhook (optional)

Optional:
- `PORT` - Server port (default: 3000)
- `DATA_DIR` - JSON storage directory (default: ./data)
- `NODE_ENV` - Environment (development/production)

## Common Operations

### Adding New Dependencies
```bash
# Backend
cd backend && npm install <package>

# Frontend
cd frontend && npm install <package>
```

### Running Tests
```bash
# All tests
./tests/run-all-tests.sh

# Specific tests
./tests/test-api.sh
node tests/test-nal.js
```

### Building for Production
```bash
npm run build              # Build both frontend and backend
docker compose -f docker-compose.production.yml up -d
```

## Security Considerations

1. **No hardcoded secrets** - Always use environment variables
2. **Rate limiting** - Express rate limit middleware in place
3. **Security headers** - Helmet middleware configured
4. **CORS** - Properly configured for frontend-backend communication
5. **Input validation** - Validate all user inputs
6. **Dependency audits** - Run `npm audit` regularly (currently 0 vulnerabilities)

## Performance Optimization

1. **Backend**: Rate limiting, efficient JSON file I/O, connection pooling
2. **Frontend**:  SWR caching, code splitting, bundle analysis, image optimization
3. **Docker**: Multi-stage builds, layer caching, standalone output mode

## Migration Notes

- Migrated from Create React App to Next.js 16 (see MIGRATION_SUMMARY.md)
- Uses modern React 19 and Next.js 16 features
- No legacy CRA artifacts remain
- Zero security vulnerabilities in dependencies
