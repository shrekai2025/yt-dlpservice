#!/bin/bash
# Test provider toggle and update functionality

echo "🧪 Testing Provider Management API"
echo "=================================="
echo ""

# Get first provider
echo "📋 Fetching providers..."
PROVIDER_DATA=$(curl -s "http://localhost:3000/api/trpc/generation.listProviders?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%7D%7D%7D")

echo "$PROVIDER_DATA" | jq -r '.[0].result.data.json[0] | "Provider: \(.name) (\(.modelIdentifier))\nStatus: \(if .isActive then "✅ Active" else "❌ Inactive" end)\nCalls: \(.callCount)"'

PROVIDER_ID=$(echo "$PROVIDER_DATA" | jq -r '.[0].result.data.json[0].id')
IS_ACTIVE=$(echo "$PROVIDER_DATA" | jq -r '.[0].result.data.json[0].isActive')

echo ""
echo "🔄 Testing Toggle..."
echo "Provider ID: $PROVIDER_ID"
echo "Current Status: $IS_ACTIVE"

# Toggle the provider
TOGGLE_RESULT=$(curl -s -X POST "http://localhost:3000/api/trpc/generation.toggleProvider" \
  -H "Content-Type: application/json" \
  -d "{\"0\":{\"json\":{\"id\":\"$PROVIDER_ID\"}}}")

echo ""
echo "Toggle Result:"
echo "$TOGGLE_RESULT" | jq '.[0].result.data.json'

echo ""
echo "✅ Test completed! Visit http://localhost:3000/admin/generation/providers to see the changes."
