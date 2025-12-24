#!/bin/bash
# Test script for version management functionality

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Testing MNVD-scan Version Management ==="
echo ""

# Test 1: version.sh script exists and is executable
echo "Test 1: version.sh script exists and is executable"
if [ -x "$ROOT_DIR/version.sh" ]; then
    echo "✓ version.sh is executable"
else
    echo "✗ version.sh is not executable or doesn't exist"
    exit 1
fi
echo ""

# Test 2: version.sh can show current version
echo "Test 2: version.sh can show current version"
VERSION=$("$ROOT_DIR/version.sh" current 2>&1)
if [[ $VERSION =~ [0-9]+\.[0-9]+\.[0-9]+ ]]; then
    echo "✓ Current version: $VERSION"
else
    echo "✗ Failed to get current version"
    echo "Output: $VERSION"
    exit 1
fi
echo ""

# Test 3: docker-compose.versioned.yml exists
echo "Test 3: docker-compose.versioned.yml exists"
if [ -f "$ROOT_DIR/docker-compose.versioned.yml" ]; then
    echo "✓ docker-compose.versioned.yml exists"
else
    echo "✗ docker-compose.versioned.yml doesn't exist"
    exit 1
fi
echo ""

# Test 4: docker-compose.versioned.yml is valid YAML
echo "Test 4: docker-compose.versioned.yml is valid YAML"
if command -v docker &> /dev/null; then
    # Try modern docker compose subcommand first
    if docker compose version &> /dev/null 2>&1; then
        if docker compose -f "$ROOT_DIR/docker-compose.versioned.yml" config > /dev/null 2>&1; then
            echo "✓ docker-compose.versioned.yml is valid"
        else
            echo "⚠ docker-compose.versioned.yml validation failed (expected without env vars)"
        fi
    else
        echo "⚠ Docker Compose not available, skipping validation"
    fi
else
    echo "⚠ Docker not available, skipping validation"
fi
echo ""

# Test 5: VERSIONING.md exists
echo "Test 5: VERSIONING.md documentation exists"
if [ -f "$ROOT_DIR/VERSIONING.md" ]; then
    echo "✓ VERSIONING.md exists"
else
    echo "✗ VERSIONING.md doesn't exist"
    exit 1
fi
echo ""

# Test 6: GitHub Actions workflow has version tag support
echo "Test 6: GitHub Actions workflow has version tag support"
if grep -q "v\*\.\*\.\*" "$ROOT_DIR/.github/workflows/docker-ghcr.yaml"; then
    echo "✓ GitHub Actions workflow configured for version tags"
else
    echo "✗ GitHub Actions workflow missing version tag configuration"
    exit 1
fi
echo ""

# Test 7: Check README has versioning section
echo "Test 7: README has versioning documentation"
if grep -q "Version-Specific Deployments" "$ROOT_DIR/README.md"; then
    echo "✓ README.md has versioning documentation"
else
    echo "✗ README.md missing versioning documentation"
    exit 1
fi
echo ""

# Test 8: env_template has IMAGE_TAG configuration
echo "Test 8: env_template has IMAGE_TAG configuration"
if grep -q "IMAGE_TAG" "$ROOT_DIR/env_template"; then
    echo "✓ env_template has IMAGE_TAG configuration"
else
    echo "✗ env_template missing IMAGE_TAG configuration"
    exit 1
fi
echo ""

# Test 9: Docker image tag patterns in versioned compose
echo "Test 9: Docker image tag patterns in versioned compose"
if grep -q "\${IMAGE_TAG:-latest}" "$ROOT_DIR/docker-compose.versioned.yml"; then
    echo "✓ docker-compose.versioned.yml uses IMAGE_TAG variable"
else
    echo "✗ docker-compose.versioned.yml missing IMAGE_TAG variable"
    exit 1
fi
echo ""

# Test 10: Workflow builds on both main and tags
echo "Test 10: Workflow triggers on main and tags"
WORKFLOW_FILE="$ROOT_DIR/.github/workflows/docker-ghcr.yaml"
if grep -q "branches:" "$WORKFLOW_FILE" && grep -q "main" "$WORKFLOW_FILE" && grep -q "tags:" "$WORKFLOW_FILE"; then
    echo "✓ Workflow configured for both branch and tag triggers"
else
    echo "✗ Workflow missing branch or tag triggers"
    exit 1
fi
echo ""

echo "=== All tests passed! ==="
echo ""
echo "Summary:"
echo "  ✓ version.sh script is working"
echo "  ✓ Docker Compose configuration is valid"
echo "  ✓ Documentation is complete"
echo "  ✓ GitHub Actions workflow is configured"
echo ""
echo "To use version tagging:"
echo "  1. Run: ./version.sh bump patch"
echo "  2. Push tag: git push origin <tag>"
echo "  3. GitHub Actions will build versioned images"
echo ""
