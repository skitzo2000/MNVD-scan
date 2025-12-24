# Quick Start: Using Docker Image Versions

## For Users: Deploy Specific Versions

### Option 1: Use the versioned compose file (Recommended)

```bash
# Use latest version (default)
docker compose -f docker-compose.versioned.yml up -d

# Use specific version
IMAGE_TAG=v1.0.0 docker compose -f docker-compose.versioned.yml up -d

# Or set in .env file
echo "IMAGE_TAG=v1.0.0" >> .env
docker compose -f docker-compose.versioned.yml up -d
```

### Option 2: Pull specific images directly

```bash
# Pull specific version
docker pull ghcr.io/skitzo2000/mnvd-scan-backend:v1.0.0
docker pull ghcr.io/skitzo2000/mnvd-scan-frontend:v1.0.0

# Run with specific version
docker run -d ghcr.io/skitzo2000/mnvd-scan-backend:v1.0.0
docker run -d ghcr.io/skitzo2000/mnvd-scan-frontend:v1.0.0
```

## For Maintainers: Create New Versions

### Quick version bump and release

```bash
# Bump patch version (1.0.0 -> 1.0.1)
./version.sh bump patch

# This will:
# 1. Update all package.json files
# 2. Create a git commit
# 3. Create a git tag
# 4. Show you the push commands

# Push to trigger build
git push origin main
git push origin v1.0.1
```

### Manual version creation

```bash
# Create specific version
./version.sh tag v2.0.0

# Push to trigger build
git push origin main
git push origin v2.0.0
```

## Available Image Tags

After pushing a version tag, GitHub Actions creates:

- `ghcr.io/skitzo2000/mnvd-scan-backend:v1.0.0` - Version tag
- `ghcr.io/skitzo2000/mnvd-scan-backend:{commit-sha}` - Commit SHA
- `ghcr.io/skitzo2000/mnvd-scan-frontend:v1.0.0` - Version tag
- `ghcr.io/skitzo2000/mnvd-scan-frontend:{commit-sha}` - Commit SHA

Main branch pushes create:

- `ghcr.io/skitzo2000/mnvd-scan-backend:latest` - Latest tag
- `ghcr.io/skitzo2000/mnvd-scan-backend:{commit-sha}` - Commit SHA
- `ghcr.io/skitzo2000/mnvd-scan-frontend:latest` - Latest tag
- `ghcr.io/skitzo2000/mnvd-scan-frontend:{commit-sha}` - Commit SHA

## View Available Versions

```bash
# List all version tags
./version.sh list

# Or check on GitHub
# Frontend: https://github.com/skitzo2000/MNVD-scan/pkgs/container/mnvd-scan-frontend
# Backend: https://github.com/skitzo2000/MNVD-scan/pkgs/container/mnvd-scan-backend
```

## Best Practices

✅ **Production**: Pin to specific versions (`IMAGE_TAG=v1.0.0`)  
✅ **Development**: Use `latest` tag  
✅ **Testing**: Use commit SHAs for reproducibility  

❌ **Production**: Don't use `latest` (unpredictable)  
❌ **Version Mix**: Don't mix frontend/backend versions  

## Troubleshooting

### Version tag not building?

Check that:
1. Tag format is `v*.*.*` (e.g., `v1.0.0`)
2. Tag was pushed: `git push origin v1.0.0`
3. GitHub Actions workflow ran successfully

### Can't find a specific version?

```bash
# Check if tag exists locally
git tag -l

# Check if tag exists on remote
git ls-remote --tags origin
```

## More Information

- Full documentation: [VERSIONING.md](./VERSIONING.md)
- Main README: [README.md](./README.md)
- GitHub Actions workflow: [.github/workflows/docker-ghcr.yaml](./.github/workflows/docker-ghcr.yaml)
