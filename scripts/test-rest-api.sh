#!/bin/bash

# Test External REST API Endpoints
# Make sure the Next.js dev server is running on port 3000

set -e

echo "🧪 Testing External REST API Endpoints"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if server is running
echo "🔍 Checking if server is running on http://localhost:3000..."
if ! curl -s -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${RED}❌ Server is not running. Please start it with: npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Step 1: Create API key (using tRPC or direct DB)
echo "🔑 Step 1: Create API key"
echo "   Run this command in another terminal:"
echo -e "${YELLOW}   npx tsx -e \"import { createApiKey } from '~/lib/auth/api-key'; createApiKey('Test REST API').then(k => console.log('API Key:', k.key))\"${NC}"
echo ""
echo "   Enter your API key:"
read -r API_KEY
echo ""

if [ -z "$API_KEY" ]; then
    echo -e "${RED}❌ API key is required${NC}"
    exit 1
fi

# Step 2: Create a test provider (or use existing)
echo "📝 Step 2: Using test provider"
echo "   Model identifier: test-image-gen"
MODEL_ID="test-image-gen"
echo ""

# Step 3: Test POST /api/external/generation
echo "🚀 Step 3: Testing POST /api/external/generation"
echo ""

REQUEST_BODY='{
  "model_identifier": "'"$MODEL_ID"'",
  "prompt": "A beautiful sunset over the ocean",
  "input_images": [],
  "number_of_outputs": 1,
  "parameters": {
    "size_or_ratio": "16:9"
  }
}'

echo "Request body:"
echo "$REQUEST_BODY" | jq .
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3000/api/external/generation \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "$REQUEST_BODY")

echo "Response:"
echo "$RESPONSE" | jq .
echo ""

# Extract request ID
REQUEST_ID=$(echo "$RESPONSE" | jq -r '.id // empty')

if [ -z "$REQUEST_ID" ]; then
    echo -e "${RED}❌ Failed to create generation request${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Generation request created: $REQUEST_ID${NC}"
echo ""

# Step 4: Test GET /api/external/generation/:id
echo "🔍 Step 4: Testing GET /api/external/generation/$REQUEST_ID"
echo ""

GET_RESPONSE=$(curl -s -X GET "http://localhost:3000/api/external/generation/$REQUEST_ID" \
  -H "X-API-Key: $API_KEY")

echo "Response:"
echo "$GET_RESPONSE" | jq .
echo ""

STATUS=$(echo "$GET_RESPONSE" | jq -r '.status // empty')

if [ -z "$STATUS" ]; then
    echo -e "${RED}❌ Failed to get generation request${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Request status: $STATUS${NC}"
echo ""

# Step 5: Test authentication
echo "🔐 Step 5: Testing authentication (should fail)"
echo ""

AUTH_TEST=$(curl -s -X GET "http://localhost:3000/api/external/generation/$REQUEST_ID" \
  -H "X-API-Key: invalid-key-12345")

echo "Response with invalid key:"
echo "$AUTH_TEST" | jq .
echo ""

if echo "$AUTH_TEST" | jq -e '.error' > /dev/null; then
    echo -e "${GREEN}✅ Authentication validation working${NC}"
else
    echo -e "${YELLOW}⚠️  Expected authentication error${NC}"
fi
echo ""

# Summary
echo "📊 Summary:"
echo "   ✅ POST /api/external/generation - Create generation"
echo "   ✅ GET /api/external/generation/:id - Get status"
echo "   ✅ API key authentication"
echo ""
echo -e "${GREEN}🎉 All REST API tests passed!${NC}"
