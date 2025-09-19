#!/bin/bash

# NVD Scanner Frontend Integration Test Suite
# Tests frontend-backend integration and user workflows

set -e

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🌐 Starting NVD Scanner Frontend Integration Test Suite${NC}"
echo "=============================================================="

# Test 1: Frontend Homepage
echo -e "\n${YELLOW}Test 1: Frontend Homepage${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/frontend_home.html "$BASE_URL/")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Frontend homepage accessible${NC}"
    # Check if it's actually the frontend (not a 404)
    if grep -q "NVD Scanner\|Monitor National Vulnerability Database" /tmp/frontend_home.html; then
        echo -e "${GREEN}✅ Frontend content detected${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend content not detected, may be a 404 page${NC}"
    fi
else
    echo -e "${RED}❌ Frontend homepage failed (HTTP $response)${NC}"
    exit 1
fi

# Test 2: Backend API Direct Access
echo -e "\n${YELLOW}Test 2: Backend API Direct Access${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/frontend_api_response.json "http://localhost:3001/api/health")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Backend API direct access working${NC}"
    cat /tmp/frontend_api_response.json
else
    echo -e "${RED}❌ Backend API direct access failed (HTTP $response)${NC}"
    exit 1
fi

# Test 3: Backend Stats API
echo -e "\n${YELLOW}Test 3: Backend Stats API${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/frontend_stats_response.json "http://localhost:3001/api/stats")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Backend stats API working${NC}"
    cat /tmp/frontend_stats_response.json
else
    echo -e "${RED}❌ Backend stats API failed (HTTP $response)${NC}"
    exit 1
fi

# Test 4: Backend Queries API
echo -e "\n${YELLOW}Test 4: Backend Queries API${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/frontend_queries_response.json "http://localhost:3001/api/queries")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Backend queries API working${NC}"
    cat /tmp/frontend_queries_response.json
else
    echo -e "${RED}❌ Backend queries API failed (HTTP $response)${NC}"
    exit 1
fi

# Test 5: Create Query through Backend API
echo -e "\n${YELLOW}Test 5: Create Query through Backend API${NC}"
query_data='{
  "name": "Frontend Test Query",
  "cpe_id": "cpe:2.3:a:nginx:nginx:1.18:*:*:*:*:*:*:*",
  "description": "Test query created through backend integration"
}'

response=$(curl -s -w "%{http_code}" -o /tmp/frontend_create_response.json \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$query_data" \
  "http://localhost:3001/api/queries")

if [ "$response" = "201" ]; then
    echo -e "${GREEN}✅ Frontend query creation successful${NC}"
    cat /tmp/frontend_create_response.json
    # Extract query ID for later tests
    QUERY_ID=$(cat /tmp/frontend_create_response.json | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "Query ID: $QUERY_ID"
else
    echo -e "${RED}❌ Frontend query creation failed (HTTP $response)${NC}"
    cat /tmp/frontend_create_response.json
    exit 1
fi

# Test 6: Verify Query through Backend
echo -e "\n${YELLOW}Test 6: Verify Query through Backend${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/frontend_verify_response.json "http://localhost:3001/api/queries")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Frontend query verification successful${NC}"
    cat /tmp/frontend_verify_response.json
else
    echo -e "${RED}❌ Frontend query verification failed (HTTP $response)${NC}"
    exit 1
fi

# Test 7: Backend Queries with Stats
echo -e "\n${YELLOW}Test 7: Backend Queries with Stats${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/frontend_queries_stats_response.json "http://localhost:3001/api/queries-with-stats")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Frontend queries with stats working${NC}"
    cat /tmp/frontend_queries_stats_response.json
else
    echo -e "${RED}❌ Frontend queries with stats failed (HTTP $response)${NC}"
    exit 1
fi

# Test 8: Backend CVE Query
echo -e "\n${YELLOW}Test 8: Backend CVE Query${NC}"
if [ -n "$QUERY_ID" ]; then
    response=$(curl -s -w "%{http_code}" -o /tmp/frontend_cves_response.json "http://localhost:3001/api/queries/$QUERY_ID/cves")
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ Frontend CVE query working${NC}"
        cat /tmp/frontend_cves_response.json
    else
        echo -e "${RED}❌ Frontend CVE query failed (HTTP $response)${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Skipping CVE test (no query ID)${NC}"
fi

# Test 9: Frontend Static Assets
echo -e "\n${YELLOW}Test 9: Frontend Static Assets${NC}"
response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/favicon.svg")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Frontend static assets working${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend static assets returned HTTP $response${NC}"
fi

# Test 10: Cleanup - Delete Test Query
echo -e "\n${YELLOW}Test 10: Cleanup - Delete Test Query${NC}"
if [ -n "$QUERY_ID" ]; then
    response=$(curl -s -w "%{http_code}" -o /tmp/frontend_delete_response.json \
      -X DELETE \
      "http://localhost:3001/api/queries/$QUERY_ID")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ Frontend query deletion successful${NC}"
        cat /tmp/frontend_delete_response.json
    else
        echo -e "${RED}❌ Frontend query deletion failed (HTTP $response)${NC}"
        cat /tmp/frontend_delete_response.json
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Skipping delete test (no query ID)${NC}"
fi

# Cleanup
rm -f /tmp/frontend_*.html /tmp/frontend_*.json

echo -e "\n${GREEN}🎉 All frontend integration tests completed successfully!${NC}"
echo "=============================================================="
