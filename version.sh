#!/bin/bash
# Version management script for MNVD-scan

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  tag <version>    Create a new version tag (e.g., v1.0.0)"
    echo "  current          Show current version from package.json"
    echo "  bump <type>      Bump version (major|minor|patch)"
    echo "  list             List all version tags"
    echo "  help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 tag v1.0.0              # Create version tag v1.0.0"
    echo "  $0 bump patch              # Bump patch version (1.0.0 -> 1.0.1)"
    echo "  $0 bump minor              # Bump minor version (1.0.0 -> 1.1.0)"
    echo "  $0 bump major              # Bump major version (1.0.0 -> 2.0.0)"
    echo ""
}

get_current_version() {
    # Extract version from root package.json
    if [ -f "$ROOT_DIR/package.json" ]; then
        version=$(grep '"version"' "$ROOT_DIR/package.json" | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
        echo "$version"
    else
        echo "Error: package.json not found" >&2
        exit 1
    fi
}

bump_version() {
    local bump_type=$1
    local current_version=$(get_current_version)
    
    # Parse current version
    IFS='.' read -r major minor patch <<< "$current_version"
    
    case $bump_type in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch)
            patch=$((patch + 1))
            ;;
        *)
            echo -e "${RED}Error: Invalid bump type. Use major, minor, or patch${NC}" >&2
            exit 1
            ;;
    esac
    
    new_version="${major}.${minor}.${patch}"
    echo "$new_version"
}

update_package_versions() {
    local new_version=$1
    
    echo -e "${BLUE}Updating package.json files...${NC}"
    
    # Update root package.json
    if [ -f "$ROOT_DIR/package.json" ]; then
        sed -i.bak "s/\"version\": *\"[^\"]*\"/\"version\": \"$new_version\"/" "$ROOT_DIR/package.json"
        rm -f "$ROOT_DIR/package.json.bak"
        echo -e "${GREEN}✓ Updated root package.json${NC}"
    fi
    
    # Update backend package.json
    if [ -f "$ROOT_DIR/backend/package.json" ]; then
        sed -i.bak "s/\"version\": *\"[^\"]*\"/\"version\": \"$new_version\"/" "$ROOT_DIR/backend/package.json"
        rm -f "$ROOT_DIR/backend/package.json.bak"
        echo -e "${GREEN}✓ Updated backend/package.json${NC}"
    fi
    
    # Update frontend package.json
    if [ -f "$ROOT_DIR/frontend/package.json" ]; then
        sed -i.bak "s/\"version\": *\"[^\"]*\"/\"version\": \"$new_version\"/" "$ROOT_DIR/frontend/package.json"
        rm -f "$ROOT_DIR/frontend/package.json.bak"
        echo -e "${GREEN}✓ Updated frontend/package.json${NC}"
    fi
}

create_tag() {
    local version=$1
    
    # Validate version format
    if [[ ! $version =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo -e "${RED}Error: Invalid version format. Use vX.Y.Z (e.g., v1.0.0)${NC}" >&2
        exit 1
    fi
    
    # Extract version without 'v' prefix
    local version_number=${version#v}
    
    # Update package.json files
    update_package_versions "$version_number"
    
    # Check if tag already exists
    if git rev-parse "$version" >/dev/null 2>&1; then
        echo -e "${RED}Error: Tag $version already exists${NC}" >&2
        exit 1
    fi
    
    # Commit version changes
    echo -e "${BLUE}Committing version changes...${NC}"
    git add package.json backend/package.json frontend/package.json
    git commit -m "chore: bump version to $version"
    
    # Create and push tag
    echo -e "${BLUE}Creating tag $version...${NC}"
    git tag -a "$version" -m "Release $version"
    
    echo -e "${GREEN}✓ Tag $version created successfully${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Push the changes: git push origin main"
    echo "  2. Push the tag: git push origin $version"
    echo ""
    echo -e "${BLUE}This will trigger the GitHub Actions workflow to build and push Docker images with:${NC}"
    echo "  - ghcr.io/skitzo2000/mnvd-scan-frontend:$version"
    echo "  - ghcr.io/skitzo2000/mnvd-scan-backend:$version"
    echo "  - ghcr.io/skitzo2000/mnvd-scan-frontend:<commit-sha>"
    echo "  - ghcr.io/skitzo2000/mnvd-scan-backend:<commit-sha>"
}

list_tags() {
    echo -e "${BLUE}Version tags:${NC}"
    git tag -l "v*" | sort -V
}

# Main script
case ${1:-help} in
    tag)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Version required${NC}" >&2
            print_usage
            exit 1
        fi
        create_tag "$2"
        ;;
    current)
        version=$(get_current_version)
        echo -e "${BLUE}Current version:${NC} $version"
        ;;
    bump)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Bump type required (major|minor|patch)${NC}" >&2
            print_usage
            exit 1
        fi
        current=$(get_current_version)
        new=$(bump_version "$2")
        echo -e "${BLUE}Current version:${NC} $current"
        echo -e "${BLUE}New version:${NC} $new"
        echo ""
        read -p "Create tag v$new? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            create_tag "v$new"
        fi
        ;;
    list)
        list_tags
        ;;
    help|--help|-h)
        print_usage
        ;;
    *)
        echo -e "${RED}Error: Unknown command '$1'${NC}" >&2
        print_usage
        exit 1
        ;;
esac
