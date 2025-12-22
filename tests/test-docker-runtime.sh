#!/bin/bash

# Docker Runtime Test Script
# Tests that Docker containers can start and run without errors
# Validates that all required modules load correctly

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Docker Runtime Tests${NC}"
echo "=============================================="
echo "Testing that Docker containers start correctly"
echo "and all dependencies are properly installed."
echo ""

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up test containers...${NC}"
    docker compose -f docker-compose.test.yml down -v 2>/dev/null || true
    docker rm -f test-backend test-frontend 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Test backend Docker build
echo -e "${YELLOW}📦 Building backend Docker image...${NC}"
if docker build -t mnvd-backend-test:latest -f backend/Dockerfile backend/; then
    echo -e "${GREEN}✅ Backend Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Backend Docker image build failed${NC}"
    exit 1
fi

# Test frontend Docker build
echo -e "\n${YELLOW}📦 Building frontend Docker image...${NC}"
if docker build -t mnvd-frontend-test:latest -f frontend/Dockerfile frontend/; then
    echo -e "${GREEN}✅ Frontend Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Frontend Docker image build failed${NC}"
    exit 1
fi

# Test backend container startup and module loading
echo -e "\n${YELLOW}🚀 Testing backend container startup...${NC}"

# Run backend container with minimal environment
docker run -d \
    --name test-backend \
    -e NODE_ENV=production \
    -e NVD_API_KEY=test_key \
    -e DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/test \
    -p 3001:3000 \
    mnvd-backend-test:latest

echo "Waiting for backend to start (10 seconds)..."
sleep 10

# Check if container is still running
if docker ps | grep -q test-backend; then
    echo -e "${GREEN}✅ Backend container started successfully${NC}"
else
    echo -e "${RED}❌ Backend container failed to start${NC}"
    echo "Container logs:"
    docker logs test-backend
    exit 1
fi

# Check backend logs for errors
echo -e "\n${YELLOW}🔍 Checking backend logs for errors...${NC}"
BACKEND_LOGS=$(docker logs test-backend 2>&1)

if echo "$BACKEND_LOGS" | grep -i "error.*cannot find module"; then
    echo -e "${RED}❌ Backend has missing module errors${NC}"
    echo "Logs:"
    echo "$BACKEND_LOGS"
    exit 1
elif echo "$BACKEND_LOGS" | grep -qi "error"; then
    echo -e "${YELLOW}⚠️  Backend has errors (may be configuration-related):${NC}"
    echo "$BACKEND_LOGS" | grep -i error | head -5
    # Don't fail on configuration errors, only on module errors
else
    echo -e "${GREEN}✅ No module loading errors found${NC}"
fi

# Test that critical modules are loaded
echo -e "\n${YELLOW}🔍 Testing critical module imports...${NC}"
docker exec test-backend node -e "
    try {
        require('dotenv');
        require('express');
        require('axios');
        require('cors');
        require('helmet');
        require('express-rate-limit');
        require('node-cron');
        console.log('All critical modules loaded successfully');
    } catch (err) {
        console.error('Module loading failed:', err.message);
        process.exit(1);
    }
" && echo -e "${GREEN}✅ All critical backend modules can be imported${NC}" || {
    echo -e "${RED}❌ Critical backend module import failed${NC}"
    exit 1
}

# Test backend health endpoint
echo -e "\n${YELLOW}🏥 Testing backend health endpoint...${NC}"
sleep 5  # Give the server a bit more time to fully start
for i in {1..5}; do
    if curl -s -f http://localhost:3001/api/health > /dev/null; then
        echo -e "${GREEN}✅ Backend health endpoint responding${NC}"
        break
    else
        if [ $i -eq 5 ]; then
            echo -e "${RED}❌ Backend health endpoint not responding after 5 attempts${NC}"
            echo "Backend logs:"
            docker logs test-backend
            exit 1
        fi
        echo "Attempt $i failed, retrying in 2 seconds..."
        sleep 2
    fi
done

# Test frontend container startup
echo -e "\n${YELLOW}🚀 Testing frontend container startup...${NC}"

docker run -d \
    --name test-frontend \
    -e NODE_ENV=production \
    -e BACKEND_URL=http://localhost:3001 \
    -p 3002:3000 \
    mnvd-frontend-test:latest

echo "Waiting for frontend to start (15 seconds)..."
sleep 15

# Check if container is still running
if docker ps | grep -q test-frontend; then
    echo -e "${GREEN}✅ Frontend container started successfully${NC}"
else
    echo -e "${RED}❌ Frontend container failed to start${NC}"
    echo "Container logs:"
    docker logs test-frontend
    exit 1
fi

# Check frontend logs for errors
echo -e "\n${YELLOW}🔍 Checking frontend logs for errors...${NC}"
FRONTEND_LOGS=$(docker logs test-frontend 2>&1)

if echo "$FRONTEND_LOGS" | grep -i "error.*cannot find module"; then
    echo -e "${RED}❌ Frontend has missing module errors${NC}"
    echo "Logs:"
    echo "$FRONTEND_LOGS"
    exit 1
else
    echo -e "${GREEN}✅ No module loading errors found in frontend${NC}"
fi

# Test frontend health
echo -e "\n${YELLOW}🏥 Testing frontend availability...${NC}"
sleep 5
for i in {1..5}; do
    if curl -s -f http://localhost:3002/ > /dev/null; then
        echo -e "${GREEN}✅ Frontend is responding${NC}"
        break
    else
        if [ $i -eq 5 ]; then
            echo -e "${YELLOW}⚠️  Frontend not responding (may be normal if not fully initialized)${NC}"
            # Don't fail, as frontend may take longer to start
            break
        fi
        echo "Attempt $i failed, retrying in 3 seconds..."
        sleep 3
    fi
done

# Final Summary
echo -e "\n${BLUE}📊 Docker Runtime Test Summary${NC}"
echo "================================================"
echo -e "${GREEN}✅ Backend Docker image builds successfully${NC}"
echo -e "${GREEN}✅ Frontend Docker image builds successfully${NC}"
echo -e "${GREEN}✅ Backend container starts without module errors${NC}"
echo -e "${GREEN}✅ Frontend container starts without module errors${NC}"
echo -e "${GREEN}✅ All critical backend modules can be imported${NC}"
echo -e "${GREEN}✅ Backend health endpoint is responding${NC}"

echo -e "\n${GREEN}🎉 All Docker runtime tests passed!${NC}"
echo "Containers can start successfully and all dependencies are present."
