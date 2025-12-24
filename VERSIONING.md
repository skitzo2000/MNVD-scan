# MNVD-scan Versioning Guide

This document describes the versioning strategy for MNVD-scan Docker images and how to use them.

## Overview

MNVD-scan uses semantic versioning (SemVer) for releases and publishes Docker images to GitHub Container Registry (GHCR) with multiple tags to support different deployment scenarios.

## Image Tagging Strategy

### Tag Types

1. **Version Tags** (`v{major}.{minor}.{patch}`)
   - Created when a git tag is pushed
   - Examples: `v1.0.0`, `v1.2.3`, `v2.0.0`
   - **Use for**: Production deployments requiring stability and predictability
   - **Immutable**: Once published, these tags never change

2. **Latest Tag** (`latest`)
   - Always points to the most recent build from the `main` branch
   - **Use for**: Development environments, staying current with latest changes
   - **Mutable**: Updates with every main branch push

3. **Commit SHA Tags** (`{7-char-sha}`)
   - Generated for every build from main branch or tagged release
   - Examples: `a1b2c3d`, `9f8e7d6`
   - **Use for**: Pinning to exact commits, debugging, reproducible testing
   - **Immutable**: Each commit has a unique SHA

## Available Images

All images are published to GitHub Container Registry:

- **Frontend**: `ghcr.io/skitzo2000/mnvd-scan-frontend`
- **Backend**: `ghcr.io/skitzo2000/mnvd-scan-backend`

### Viewing Available Tags

You can view all available tags on the GitHub Container Registry:

- Frontend: https://github.com/skitzo2000/MNVD-scan/pkgs/container/mnvd-scan-frontend
- Backend: https://github.com/skitzo2000/MNVD-scan/pkgs/container/mnvd-scan-backend

Or use Docker CLI:
```bash
# List available tags
docker pull ghcr.io/skitzo2000/mnvd-scan-frontend:latest
docker image inspect ghcr.io/skitzo2000/mnvd-scan-frontend:latest

# Or use crane (https://github.com/google/go-containerregistry/tree/main/cmd/crane)
crane ls ghcr.io/skitzo2000/mnvd-scan-frontend
```

## Using Specific Versions

### Method 1: Versioned Docker Compose (Recommended)

The `docker-compose.versioned.yml` file allows you to specify versions via environment variables:

```bash
# Use latest version (default)
docker compose -f docker-compose.versioned.yml up -d

# Use specific version
IMAGE_TAG=v1.0.0 docker compose -f docker-compose.versioned.yml up -d

# Use commit SHA
IMAGE_TAG=a1b2c3d docker compose -f docker-compose.versioned.yml up -d

# Or set in .env file
echo "IMAGE_TAG=v1.0.0" >> .env
docker compose -f docker-compose.versioned.yml up -d
```

### Method 2: Direct Docker Commands

```bash
# Pull specific version
docker pull ghcr.io/skitzo2000/mnvd-scan-backend:v1.0.0
docker pull ghcr.io/skitzo2000/mnvd-scan-frontend:v1.0.0

# Run with specific version
docker run -d \
  --name mnvd-backend \
  -e NVD_API_KEY=your_key \
  -v ./data:/app/data \
  ghcr.io/skitzo2000/mnvd-scan-backend:v1.0.0
```

### Method 3: Modified Production Compose

Edit `docker-compose.production.yml` to hardcode specific versions:

```yaml
services:
  backend:
    image: ghcr.io/skitzo2000/mnvd-scan-backend:v1.0.0  # Changed from :latest
  frontend:
    image: ghcr.io/skitzo2000/mnvd-scan-frontend:v1.0.0  # Changed from :latest
```

## Creating New Versions (Maintainers)

### Using the Version Script (Recommended)

The `version.sh` script automates version management:

```bash
# Check current version
./version.sh current

# View all existing version tags
./version.sh list

# Bump patch version (1.0.0 -> 1.0.1)
./version.sh bump patch

# Bump minor version (1.0.0 -> 1.1.0)
./version.sh bump minor

# Bump major version (1.0.0 -> 2.0.0)
./version.sh bump major

# Create specific version
./version.sh tag v2.5.0
```

The script will:
1. Update version in all `package.json` files
2. Commit the version changes
3. Create an annotated git tag
4. Provide instructions for pushing

### Manual Version Creation

If you prefer manual control:

```bash
# 1. Update versions in package.json files
vim package.json
vim backend/package.json
vim frontend/package.json

# 2. Commit changes
git add package.json backend/package.json frontend/package.json
git commit -m "chore: bump version to v1.0.0"

# 3. Create annotated tag
git tag -a v1.0.0 -m "Release v1.0.0

- Feature: New vulnerability scanning
- Fix: Improved notification reliability
- Breaking: Changed API endpoint structure"

# 4. Push changes and tag
git push origin main
git push origin v1.0.0
```

### Build and Publish Process

When you push a version tag, GitHub Actions automatically:

1. Runs tests and linting
2. Builds Docker images for frontend and backend
3. Publishes images with tags:
   - Version tag (e.g., `v1.0.0`)
   - Commit SHA (e.g., `a1b2c3d`)
4. Does NOT update the `latest` tag (preserves main branch builds)

When you push to main branch, GitHub Actions:

1. Runs tests and linting
2. Builds Docker images
3. Publishes images with tags:
   - `latest` tag
   - Commit SHA tag

## Version Strategy Recommendations

### For Production Environments

✅ **DO:**
- Pin to specific version tags (e.g., `v1.0.0`)
- Test new versions in staging before upgrading
- Keep previous version running until new version is validated
- Document which version is deployed

❌ **DON'T:**
- Use `latest` tag (unpredictable updates)
- Auto-update without testing
- Skip version documentation

```bash
# Production example
IMAGE_TAG=v1.0.0 docker compose -f docker-compose.versioned.yml up -d
```

### For Development Environments

✅ **DO:**
- Use `latest` tag to stay current
- Regularly pull new images
- Test with upcoming versions

```bash
# Development example
docker compose up --build  # Uses latest local code
# or
docker compose -f docker-compose.production.yml up -d  # Uses latest images
```

### For Testing/CI

✅ **DO:**
- Use commit SHA tags for reproducibility
- Pin to specific versions for regression testing
- Test upgrade paths between versions

```bash
# Testing example
IMAGE_TAG=a1b2c3d docker compose -f docker-compose.versioned.yml up -d
```

## Upgrading Between Versions

### Safe Upgrade Process

1. **Backup your data**
   ```bash
   # Stop containers
   docker compose down
   
   # Backup data directory
   tar -czf backup-$(date +%Y%m%d).tar.gz ./data/
   ```

2. **Test new version in staging**
   ```bash
   # Use new version in test environment
   IMAGE_TAG=v1.1.0 docker compose -f docker-compose.versioned.yml up -d
   ```

3. **Deploy to production**
   ```bash
   # Stop old version
   docker compose -f docker-compose.versioned.yml down
   
   # Update IMAGE_TAG in .env
   sed -i 's/IMAGE_TAG=v1.0.0/IMAGE_TAG=v1.1.0/' .env
   
   # Start new version
   docker compose -f docker-compose.versioned.yml up -d
   ```

4. **Validate deployment**
   ```bash
   # Check logs
   docker compose -f docker-compose.versioned.yml logs -f
   
   # Verify health
   curl http://localhost:3000/api/health
   ```

### Rollback Process

If issues occur, rollback to previous version:

```bash
# Stop current version
docker compose -f docker-compose.versioned.yml down

# Revert to previous version
IMAGE_TAG=v1.0.0 docker compose -f docker-compose.versioned.yml up -d

# Or restore from backup if needed
tar -xzf backup-20231201.tar.gz
```

## Running Multiple Versions Simultaneously

You can run different versions on different ports:

```bash
# v1.0.0 on default ports (3000, 3001)
IMAGE_TAG=v1.0.0 docker compose -f docker-compose.versioned.yml up -d

# v1.1.0 on alternate ports
# Create docker-compose.v1.1.0.yml with different ports
IMAGE_TAG=v1.1.0 docker compose -f docker-compose.v1.1.0.yml -p mnvd-v110 up -d
```

Example `docker-compose.v1.1.0.yml`:
```yaml
services:
  backend:
    image: ghcr.io/skitzo2000/mnvd-scan-backend:v1.1.0
    ports:
      - "3101:3000"  # Different port
    # ... rest of config
  
  frontend:
    image: ghcr.io/skitzo2000/mnvd-scan-frontend:v1.1.0
    ports:
      - "3100:3000"  # Different port
    # ... rest of config
```

## Semantic Versioning Guidelines

MNVD-scan follows [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** version (v2.0.0): Incompatible API changes, breaking changes
- **MINOR** version (v1.1.0): New features, backward compatible
- **PATCH** version (v1.0.1): Bug fixes, backward compatible

### What Triggers Each Version Type

**Major (Breaking Changes)**:
- API endpoint changes requiring client updates
- Database schema changes requiring migration
- Configuration format changes
- Removal of deprecated features

**Minor (New Features)**:
- New API endpoints
- New features that don't break existing functionality
- New configuration options (with defaults)
- Performance improvements

**Patch (Bug Fixes)**:
- Bug fixes
- Security patches
- Documentation updates
- Dependency updates (non-breaking)

## Troubleshooting

### "Image not found" Error

```bash
# Verify tag exists
docker pull ghcr.io/skitzo2000/mnvd-scan-backend:v1.0.0

# If it fails, check available tags on GitHub or try:
docker pull ghcr.io/skitzo2000/mnvd-scan-backend:latest
```

### Version Mismatch Between Frontend/Backend

Always use the same version tag for both frontend and backend:

```bash
# ✅ Correct - same version
IMAGE_TAG=v1.0.0 docker compose -f docker-compose.versioned.yml up -d

# ❌ Incorrect - mismatched versions may cause issues
# Don't manually set different versions for frontend/backend
```

### Getting Build Information

Each image contains build metadata:

```bash
# Inspect image for labels
docker inspect ghcr.io/skitzo2000/mnvd-scan-backend:v1.0.0 | jq '.[0].Config.Labels'
```

## Additional Resources

- [Docker Image Documentation](https://docs.docker.com/engine/reference/commandline/image/)
- [Semantic Versioning Specification](https://semver.org/)
- [GitHub Container Registry Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [MNVD-scan Main README](./README.md)
