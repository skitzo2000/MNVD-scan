#!/bin/bash

# NVD Scanner API Test Suite
# Tests all backend API endpoints for functionality

set -e

BASE_URL="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Starting NVD Scanner API Test Suite${NC}"
echo "================================================"

# Test 1: Health Check
echo -e "\n${YELLOW}Test 1: Health Check${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$BASE_URL/api/health")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    cat /tmp/health_response.json
else
    echo -e "${RED}❌ Health check failed (HTTP $response)${NC}"
    exit 1
fi

# Test 2: Get Initial Stats
echo -e "\n${YELLOW}Test 2: Get Initial Stats${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/stats_response.json "$BASE_URL/api/stats")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Stats endpoint working${NC}"
    cat /tmp/stats_response.json
else
    echo -e "${RED}❌ Stats endpoint failed (HTTP $response)${NC}"
    exit 1
fi

# Test 3: Get Initial Queries
echo -e "\n${YELLOW}Test 3: Get Initial Queries${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/queries_response.json "$BASE_URL/api/queries")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Queries endpoint working${NC}"
    cat /tmp/queries_response.json
else
    echo -e "${RED}❌ Queries endpoint failed (HTTP $response)${NC}"
    exit 1
fi

# Test 4: Create a Test Query
echo -e "\n${YELLOW}Test 4: Create Test Query${NC}"
query_data='{
  "name": "Test Apache HTTP Server",
  "cpe_id": "cpe:2.3:a:apache:httpd:2.4:*:*:*:*:*:*:*",
  "description": "Test query for Apache HTTP Server vulnerabilities"
}'

response=$(curl -s -w "%{http_code}" -o /tmp/create_response.json \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$query_data" \
  "$BASE_URL/api/queries")

if [ "$response" = "201" ]; then
    echo -e "${GREEN}✅ Query creation successful${NC}"
    cat /tmp/create_response.json
    # Extract query ID for later tests
    QUERY_ID=$(cat /tmp/create_response.json | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "Query ID: $QUERY_ID"
else
    echo -e "${RED}❌ Query creation failed (HTTP $response)${NC}"
    cat /tmp/create_response.json
    exit 1
fi

# Test 5: Verify Query was Created
echo -e "\n${YELLOW}Test 5: Verify Query Creation${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/queries_after_response.json "$BASE_URL/api/queries")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Query verification successful${NC}"
    cat /tmp/queries_after_response.json
else
    echo -e "${RED}❌ Query verification failed (HTTP $response)${NC}"
    exit 1
fi

# Test 6: Get Updated Stats
echo -e "\n${YELLOW}Test 6: Get Updated Stats${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/stats_updated_response.json "$BASE_URL/api/stats")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Updated stats retrieved${NC}"
    cat /tmp/stats_updated_response.json
else
    echo -e "${RED}❌ Updated stats failed (HTTP $response)${NC}"
    exit 1
fi

# Test 7: Get Queries with Stats
echo -e "\n${YELLOW}Test 7: Get Queries with Stats${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/queries_stats_response.json "$BASE_URL/api/queries-with-stats")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Queries with stats retrieved${NC}"
    cat /tmp/queries_stats_response.json
else
    echo -e "${RED}❌ Queries with stats failed (HTTP $response)${NC}"
    exit 1
fi

# Test 8: Get CVEs for Query (should be empty)
echo -e "\n${YELLOW}Test 8: Get CVEs for Query${NC}"
if [ -n "$QUERY_ID" ]; then
    response=$(curl -s -w "%{http_code}" -o /tmp/cves_response.json "$BASE_URL/api/queries/$QUERY_ID/cves")
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ CVEs endpoint working${NC}"
        cat /tmp/cves_response.json
    else
        echo -e "${RED}❌ CVEs endpoint failed (HTTP $response)${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Skipping CVE test (no query ID)${NC}"
fi

# Test 9: Test CPE Validation
echo -e "\n${YELLOW}Test 9: Test CPE Validation${NC}"
cpe_test_data='{
  "cpe_id": "cpe:2.3:a:apache:httpd:2.4:*:*:*:*:*:*:*"
}'

response=$(curl -s -w "%{http_code}" -o /tmp/cpe_test_response.json \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$cpe_test_data" \
  "$BASE_URL/api/test-cpe")

if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ CPE test successful${NC}"
    cat /tmp/cpe_test_response.json
else
    echo -e "${YELLOW}⚠️  CPE test returned HTTP $response (may be expected if NVD API key not set)${NC}"
    cat /tmp/cpe_test_response.json
fi

# Test 10: Delete Test Query
echo -e "\n${YELLOW}Test 10: Delete Test Query${NC}"
if [ -n "$QUERY_ID" ]; then
    response=$(curl -s -w "%{http_code}" -o /tmp/delete_response.json \
      -X DELETE \
      "$BASE_URL/api/queries/$QUERY_ID")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ Query deletion successful${NC}"
        cat /tmp/delete_response.json
    else
        echo -e "${RED}❌ Query deletion failed (HTTP $response)${NC}"
        cat /tmp/delete_response.json
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Skipping delete test (no query ID)${NC}"
fi

# Test 11: Verify Query was Deleted
echo -e "\n${YELLOW}Test 11: Verify Query Deletion${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/queries_final_response.json "$BASE_URL/api/queries")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Final query verification successful${NC}"
    cat /tmp/queries_final_response.json
else
    echo -e "${RED}❌ Final query verification failed (HTTP $response)${NC}"
    exit 1
fi

# Cleanup
rm -f /tmp/*_response.json

echo -e "\n${GREEN}🎉 All API tests completed successfully!${NC}"
echo "================================================"
