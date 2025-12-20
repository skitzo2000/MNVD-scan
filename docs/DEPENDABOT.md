# Dependabot Configuration

This document explains the Dependabot configuration for the MNVD-scan project and how it helps maintain security and dependency updates.

## Overview

Dependabot is configured to automatically create pull requests for dependency updates across all package ecosystems used in this project. This helps keep dependencies up-to-date and addresses security vulnerabilities promptly.

## Configuration File

The Dependabot configuration is located at `.github/dependabot.yml`.

## Monitored Ecosystems

### 1. Backend NPM Dependencies (`/backend`)
- **Schedule**: Daily checks
- **Package Manager**: npm
- **PR Limit**: 10 concurrent PRs
- **Grouping**: 
  - Production dependencies (minor and patch updates grouped)
  - Development dependencies (ESLint, Nodemon, etc. grouped)
- **Labels**: `dependencies`, `backend`

**Key Dependencies Monitored**:
- Express.js
- Axios
- Helmet (security)
- CORS
- Express Rate Limit
- Node-cron
- Dotenv

### 2. Frontend NPM Dependencies (`/frontend`)
- **Schedule**: Daily checks
- **Package Manager**: npm
- **PR Limit**: 10 concurrent PRs
- **Grouping**:
  - Production dependencies (minor and patch updates grouped)
  - Development dependencies (ESLint, TypeScript, bundle analyzer grouped)
- **Labels**: `dependencies`, `frontend`

**Key Dependencies Monitored**:
- Next.js
- React & React DOM
- Material-UI (@mui/material, @mui/icons-material)
- Emotion (styling)
- SWR (data fetching)
- Axios

### 3. Docker Images
Dependabot monitors three separate Dockerfiles for base image updates:

#### Backend Dockerfile (`/backend/Dockerfile`)
- **Schedule**: Weekly (Mondays)
- **PR Limit**: 5 concurrent PRs
- **Labels**: `dependencies`, `docker`, `backend`

#### Frontend Dockerfile (`/frontend/Dockerfile`)
- **Schedule**: Weekly (Mondays)
- **PR Limit**: 5 concurrent PRs
- **Labels**: `dependencies`, `docker`, `frontend`

#### Root Dockerfile (`/Dockerfile.node`)
- **Schedule**: Weekly (Mondays)
- **PR Limit**: 5 concurrent PRs
- **Labels**: `dependencies`, `docker`

### 4. GitHub Actions (`/.github/workflows`)
- **Schedule**: Weekly (Mondays)
- **PR Limit**: 5 concurrent PRs
- **Grouping**: All actions grouped together
- **Labels**: `dependencies`, `github-actions`

**Actions Monitored**:
- actions/checkout
- actions/setup-node
- docker/setup-buildx-action
- docker/login-action
- docker/build-push-action

## Security Features

### 1. Daily NPM Checks
NPM dependencies are checked daily to ensure security vulnerabilities are addressed promptly. This is especially critical for:
- Backend security middleware (Helmet, CORS, Express Rate Limit)
- HTTP clients and API integrations (Axios)
- Framework dependencies (Express, Next.js, React)

### 2. Security Updates Priority
Security updates are **always created as separate PRs** by Dependabot's design and are never grouped with other updates. This default behavior ensures:
- Security patches can be reviewed and merged quickly
- Security updates don't get delayed by other dependency changes
- Critical vulnerabilities can be addressed immediately

### 3. Grouped Non-Security Updates
To reduce PR noise while maintaining security:
- Minor and patch updates are grouped by category (production vs development)
- Major version updates are always created as separate PRs for careful review
- Security updates are never grouped and always get individual PRs

## Update Strategy

### NPM Dependencies
- **Daily checks** for new versions
- **Grouped updates** for minor/patch versions (production and development separated)
- **Individual PRs** for:
  - Major version updates
  - Security vulnerabilities (any severity)
  - Breaking changes

### Docker Images
- **Weekly checks** on Mondays
- Updates for base images (e.g., `node:22-slim`)
- Helps maintain security patches in base operating systems

### GitHub Actions
- **Weekly checks** on Mondays
- Grouped updates for all action version bumps
- Ensures CI/CD pipeline uses latest stable action versions

## Pull Request Management

### Automatic Features
- **Auto-assignment**: PRs are automatically assigned to @skitzo2000
- **Auto-review requests**: @skitzo2000 is added as reviewer
- **Commit message format**: Follows conventional commits (`chore(scope): message`)
- **Labels**: Automatically applied based on ecosystem and location

### PR Limits
To prevent overwhelming the repository with PRs:
- **10 concurrent PRs** for npm dependencies (high update frequency)
- **5 concurrent PRs** for Docker images (lower update frequency)
- **5 concurrent PRs** for GitHub Actions (stable ecosystem)

### Review Process
1. Dependabot creates PR with changelog and compatibility score
2. Automated checks run (linting, builds, tests)
3. Review the changes, especially for:
   - Breaking changes
   - Security implications
   - API changes
4. Merge if tests pass and changes are safe
5. Monitor application after deployment

## Best Practices

### When to Merge Dependabot PRs

✅ **Merge Immediately**:
- Security updates (after quick verification)
- Patch version updates that pass all tests
- Minor version updates for dev dependencies

⚠️ **Review Carefully**:
- Major version updates (check breaking changes)
- Updates to core dependencies (Express, React, Next.js)
- Docker base image major version bumps

❌ **Don't Auto-Merge**:
- Updates with failing tests
- Major framework updates without testing
- Updates with known issues in release notes

### Handling Failed Updates

If a Dependabot PR fails tests:
1. Check the changelog for breaking changes
2. Update code to accommodate changes
3. Consider if the update is necessary now
4. Close PR if update should be delayed

### Monitoring Dependabot

- Check Dependabot alerts in GitHub Security tab
- Review weekly digest of open Dependabot PRs
- Ensure PRs aren't sitting unreviewed for too long

## Troubleshooting

### Dependabot Not Creating PRs

Check:
1. Dependabot is enabled in repository settings
2. Configuration file syntax is valid (YAML)
3. Directories specified exist and contain package files
4. Open PR limit hasn't been reached

### Too Many PRs

Solutions:
1. Increase grouping (add more patterns to groups)
2. Reduce check frequency (daily → weekly)
3. Increase PR limits if appropriate
4. Use `ignore` conditions for dependencies you don't want updated

### Conflicts with Manual Updates

If you manually update dependencies:
1. Dependabot will detect the change
2. Close any related open Dependabot PRs
3. Dependabot will rebase and update remaining PRs

## Configuration Reference

Key configuration options used:

```yaml
schedule:
  interval: "daily" | "weekly"  # How often to check
  day: "monday"                  # Day of week (for weekly)

open-pull-requests-limit: 10    # Max concurrent PRs

groups:                          # Group multiple updates
  group-name:
    patterns: ["*"]              # Packages to include
    exclude-patterns: ["test-*"] # Packages to exclude
    update-types:                # Version types to group
      - "minor"
      - "patch"

labels:                          # Auto-apply labels
  - "dependencies"

reviewers:                       # Auto-request reviews
  - "username"

assignees:                       # Auto-assign PRs
  - "username"
```

## Additional Resources

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Dependabot Configuration Options](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [About Dependabot Security Updates](https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates)

## Contact

For questions about Dependabot configuration, contact the repository maintainer @skitzo2000.
