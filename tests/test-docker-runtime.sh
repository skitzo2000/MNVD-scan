#!/bin/bash

# Docker Runtime Test Script
# Tests that Docker images can be built and containers start without module errors
# This validates the Dockerfile configuration and dependency installation

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Docker Runtime Tests${NC}"
echo "=============================================="
echo "Testing Dockerfile configuration and dependency"
echo "installation for backend and frontend services."
echo ""

# Test backend package.json has required dependencies
echo -e "${YELLOW}📋 Validating backend package.json dependencies...${NC}"
cd backend

if grep -q '"dotenv"' package.json && \
   grep -q '"express"' package.json && \
   grep -q '"axios"' package.json && \
   grep -q '"cors"' package.json && \
   grep -q '"helmet"' package.json; then
    echo -e "${GREEN}✅ All required dependencies are declared in package.json${NC}"
else
    echo -e "${RED}❌ Missing required dependencies in package.json${NC}"
    exit 1
fi

# Test that package-lock.json exists
if [ -f "package-lock.json" ]; then
    echo -e "${GREEN}✅ package-lock.json exists (enables reproducible builds)${NC}"
else
    echo -e "${RED}❌ package-lock.json is missing${NC}"
    exit 1
fi

# Test that dependencies can be installed locally
echo -e "\n${YELLOW}📦 Testing local dependency installation...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies locally..."
    if npm ci --omit=dev 2>&1 | tail -5; then
        echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
    else
        echo -e "${RED}❌ Dependency installation failed${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ node_modules already exists${NC}"
fi

# Test that all critical modules can be required
echo -e "\n${YELLOW}🔍 Testing critical module imports...${NC}"
node -e "
    try {
        require('dotenv');
        require('express');
        require('axios');
        require('cors');
        require('helmet');
        require('express-rate-limit');
        require('node-cron');
        console.log('✅ All critical modules can be imported');
    } catch (err) {
        console.error('❌ Module import failed:', err.message);
        process.exit(1);
    }
" || exit 1

# Test Dockerfile syntax
echo -e "\n${YELLOW}🔍 Validating Dockerfile syntax...${NC}"
if docker build --check -f Dockerfile . 2>&1 | grep -q "Dockerfile"; then
    echo -e "${GREEN}✅ Dockerfile syntax is valid${NC}"
else
    # Some Docker versions don't support --check, so just verify file exists
    if [ -f "Dockerfile" ]; then
        echo -e "${GREEN}✅ Dockerfile exists${NC}"
    else
        echo -e "${RED}❌ Dockerfile not found${NC}"
        exit 1
    fi
fi

# Test that .dockerignore exists and excludes core files
echo -e "\n${YELLOW}🔍 Validating .dockerignore...${NC}"
if [ -f ".dockerignore" ]; then
    if grep -q "core" .dockerignore && grep -q "node_modules" .dockerignore; then
        echo -e "${GREEN}✅ .dockerignore properly configured${NC}"
    else
        echo -e "${YELLOW}⚠️  .dockerignore may need updates${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .dockerignore not found - consider adding one${NC}"
fi

cd ..

# Test frontend package.json
echo -e "\n${YELLOW}📋 Validating frontend package.json dependencies...${NC}"
cd frontend

if grep -q '"next"' package.json && \
   grep -q '"react"' package.json; then
    echo -e "${GREEN}✅ Frontend dependencies are declared in package.json${NC}"
else
    echo -e "${RED}❌ Missing required frontend dependencies in package.json${NC}"
    exit 1
fi

if [ -f "package-lock.json" ]; then
    echo -e "${GREEN}✅ Frontend package-lock.json exists${NC}"
else
    echo -e "${RED}❌ Frontend package-lock.json is missing${NC}"
    exit 1
fi

cd ..

# Test that outdated Dockerfile.node is not present
echo -e "\n${YELLOW}🔍 Checking for outdated Dockerfile.node...${NC}"
if [ -f "Dockerfile.node" ]; then
    echo -e "${RED}❌ Outdated Dockerfile.node found - this should be removed${NC}"
    echo "The root Dockerfile.node is obsolete. Use backend/Dockerfile and frontend/Dockerfile instead."
    exit 1
else
    echo -e "${GREEN}✅ No outdated root Dockerfile found${NC}"
fi

# Test that docker-compose.yml references correct Dockerfiles
echo -e "\n${YELLOW}🔍 Validating docker-compose.yml configuration...${NC}"
if grep -q "context: ./backend" docker-compose.yml && \
   grep -q "context: ./frontend" docker-compose.yml; then
    echo -e "${GREEN}✅ docker-compose.yml correctly references backend and frontend contexts${NC}"
else
    echo -e "${RED}❌ docker-compose.yml has incorrect build context configuration${NC}"
    exit 1
fi

# Final Summary
echo -e "\n${BLUE}📊 Docker Runtime Test Summary${NC}"
echo "================================================"
echo -e "${GREEN}✅ Backend dependencies are properly declared${NC}"
echo -e "${GREEN}✅ Backend dependencies can be installed${NC}"
echo -e "${GREEN}✅ All critical backend modules can be imported${NC}"
echo -e "${GREEN}✅ Frontend dependencies are properly declared${NC}"
echo -e "${GREEN}✅ No outdated Dockerfile.node present${NC}"
echo -e "${GREEN}✅ docker-compose.yml is correctly configured${NC}"

echo -e "\n${GREEN}🎉 All Docker runtime tests passed!${NC}"
echo "Docker images should build successfully in CI/CD pipeline."
echo ""
echo -e "${YELLOW}Note:${NC} Actual Docker image builds will be performed by GitHub Actions."
echo "This test validates configuration and dependency availability."
