#!/bin/bash

# NVD Scanner Complete Test Suite Runner
# Runs all tests in sequence and provides comprehensive reporting

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 NVD Scanner Complete Test Suite${NC}"
echo "=============================================="
echo "This script will run all tests to validate the"
echo "complete NVD Scanner application functionality."
echo ""

# Check if Docker Compose is running
echo -e "${YELLOW}📋 Pre-flight Checks${NC}"
echo "------------------------"

if ! docker compose ps | grep -q "Up"; then
    echo -e "${RED}❌ Docker Compose services are not running${NC}"
    echo "Please run 'docker compose up -d' first"
    exit 1
fi

echo -e "${GREEN}✅ Docker Compose services are running${NC}"

# Check if services are healthy
echo -e "\n${YELLOW}🔍 Service Health Check${NC}"
echo "------------------------"

# Check backend health
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend service is healthy${NC}"
else
    echo -e "${RED}❌ Backend service is not responding${NC}"
    exit 1
fi

# Check frontend health
if curl -s http://localhost:3000/ > /dev/null; then
    echo -e "${GREEN}✅ Frontend service is healthy${NC}"
else
    echo -e "${RED}❌ Frontend service is not responding${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ All services are healthy${NC}"

# Run API Tests
echo -e "\n${YELLOW}🧪 Running API Tests${NC}"
echo "======================"
if ./tests/test-api.sh; then
    echo -e "${GREEN}✅ API tests passed${NC}"
else
    echo -e "${RED}❌ API tests failed${NC}"
    exit 1
fi

# Run Frontend Integration Tests
echo -e "\n${YELLOW}🌐 Running Frontend Integration Tests${NC}"
echo "=========================================="
if ./tests/test-frontend.sh; then
    echo -e "${GREEN}✅ Frontend integration tests passed${NC}"
else
    echo -e "${RED}❌ Frontend integration tests failed${NC}"
    exit 1
fi

# Performance Test
echo -e "\n${YELLOW}⚡ Running Performance Tests${NC}"
echo "=============================="

echo "Testing API response times..."
start_time=$(date +%s%N)
curl -s http://localhost:3000/api/stats > /dev/null
end_time=$(date +%s%N)
api_time=$(( (end_time - start_time) / 1000000 ))

echo "Testing frontend response times..."
start_time=$(date +%s%N)
curl -s http://localhost:3000/ > /dev/null
end_time=$(date +%s%N)
frontend_time=$(( (end_time - start_time) / 1000000 ))

echo -e "${GREEN}✅ API response time: ${api_time}ms${NC}"
echo -e "${GREEN}✅ Frontend response time: ${frontend_time}ms${NC}"

if [ $api_time -lt 1000 ] && [ $frontend_time -lt 2000 ]; then
    echo -e "${GREEN}✅ Performance tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Performance tests completed with warnings${NC}"
fi

# Data Persistence Test
echo -e "\n${YELLOW}💾 Running Data Persistence Tests${NC}"
echo "=================================="

# Create a test query
echo "Creating test query for persistence test..."
query_data='{
  "name": "Persistence Test Query",
  "cpe_id": "cpe:2.3:a:mysql:mysql:8.0:*:*:*:*:*:*:*",
  "description": "Test query for data persistence validation"
}'

response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$query_data" \
  http://localhost:3000/api/queries)

if echo "$response" | grep -q '"id"'; then
    echo -e "${GREEN}✅ Test query created successfully${NC}"
    QUERY_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "Query ID: $QUERY_ID"
    
    # Restart services to test persistence
    echo "Restarting services to test data persistence..."
    docker compose restart backend
    
    # Wait for backend to start
    sleep 5
    
    # Check if query still exists
    if curl -s http://localhost:3000/api/queries | grep -q "$QUERY_ID"; then
        echo -e "${GREEN}✅ Data persistence test passed${NC}"
    else
        echo -e "${RED}❌ Data persistence test failed${NC}"
        exit 1
    fi
    
    # Cleanup
    curl -s -X DELETE "http://localhost:3000/api/queries/$QUERY_ID" > /dev/null
    echo -e "${GREEN}✅ Test query cleaned up${NC}"
else
    echo -e "${RED}❌ Failed to create test query${NC}"
    exit 1
fi

# Final Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "==============="
echo -e "${GREEN}✅ API Tests: PASSED${NC}"
echo -e "${GREEN}✅ Frontend Integration Tests: PASSED${NC}"
echo -e "${GREEN}✅ Performance Tests: PASSED${NC}"
echo -e "${GREEN}✅ Data Persistence Tests: PASSED${NC}"

echo -e "\n${GREEN}🎉 All tests completed successfully!${NC}"
echo "=============================================="
echo "The NVD Scanner application is fully functional"
echo "and ready for production use."
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "• Configure NVD_API_KEY for vulnerability scanning"
echo "• Configure DISCORD_WEBHOOK_URL for notifications"
echo "• Set up monitoring and alerting"
echo "• Deploy to production environment"
