# MNVD-scan Project

## Overview
MNVD (Monitor-NVD) is a Node.js application that monitors the National Vulnerability Database (NVD) for specific operating systems and services, sending notifications to Discord/Teams when new vulnerabilities are detected.

## Architecture
- **Type**: Monorepo (backend + frontend)
- **Backend**: Node.js 22 / Express.js (plain JavaScript)
- **Frontend**: Next.js 16 / React 19 / Material-UI 7 (JavaScript + TypeScript)
- **Storage**: JSON file-based Data Access Layer (no database)
- **Notifications**: Multi-platform webhook management (Discord, Teams)
- **Containerization**: Docker with multi-stage builds, rootless support
- **CI/CD**: GitHub Actions -> GHCR

## Languages
- JavaScript (backend, primary)
- JavaScript/TypeScript (frontend)

## Frameworks
- Express.js (backend API)
- Next.js (frontend SSR/SSG)
- React 19 (UI)
- Material-UI 7 (component library)

## Package Manager
- npm (with package-lock.json)

## Testing
- Shell-based test scripts (tests/)
- Manual test runners (test-api.sh, test-frontend.sh)
- Node.js test files (test-nal.js, test-sal.js, test-webhooks.js)
- No formal test framework (no Jest/Mocha/Vitest)

## Key Layers
- **DAL** (Data Access Layer): JSON file storage in backend/dal/
- **NAL** (Notification Access Layer): Webhook management in backend/nal/
- **SAL** (Scan Access Layer): Scan orchestration in backend/sal/

## Infrastructure
- Docker Compose (dev + production + versioned)
- GitHub Actions CI/CD (docker-ghcr.yaml)
- Dependabot for dependency updates
- GHCR image publishing

## Ports
- Frontend: 3000
- Backend: 3001 (dev), 3000 (container internal)

## Environment Variables
- NVD_API_KEY (required)
- DISCORD_WEBHOOK_URL (optional)
- TEAMS_WEBHOOK_URL (optional)
- PORT, DATA_DIR (optional)
