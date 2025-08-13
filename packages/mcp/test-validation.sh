#!/bin/bash

# Test script for category and tag validation
# This script demonstrates how the new validation works

echo "🧪 Testing Category and Tag Validation"
echo "======================================"

# Test 1: No restrictions (should work)
echo ""
echo "Test 1: No restrictions set"
echo "----------------------------"
export ALLOWED_CATEGORIES=""
export ALLOWED_TAGS=""

echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_allowed_values","arguments":{}}}' | node dist/index.js

# Test 2: With category restrictions
echo ""
echo "Test 2: Category restrictions set"
echo "---------------------------------"
export ALLOWED_CATEGORIES="work,personal,research"
export ALLOWED_TAGS=""

echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_allowed_values","arguments":{}}}' | node dist/index.js

# Test 3: With tag restrictions
echo ""
echo "Test 3: Tag restrictions set"
echo "----------------------------"
export ALLOWED_CATEGORIES="work,personal,research"
export ALLOWED_TAGS="important,urgent,review"

echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_allowed_values","arguments":{}}}' | node dist/index.js

# Test 4: Try to create memory with allowed values (should work)
echo ""
echo "Test 4: Creating memory with allowed values (should work)"
echo "--------------------------------------------------------"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"write_mem","arguments":{"title":"Test Memory","content":"This is a test memory.","category":"work","tags":["important"]}}}' | node dist/index.js

# Test 5: Try to create memory with disallowed category (should fail)
echo ""
echo "Test 5: Creating memory with disallowed category (should fail)"
echo "-------------------------------------------------------------"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"write_mem","arguments":{"title":"Test Memory 2","content":"This should fail.","category":"invalid","tags":["important"]}}}' | node dist/index.js

# Test 6: Try to create memory with disallowed tags (should fail)
echo ""
echo "Test 6: Creating memory with disallowed tags (should fail)"
echo "----------------------------------------------------------"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"write_mem","arguments":{"title":"Test Memory 3","content":"This should also fail.","category":"work","tags":["invalid"]}}}' | node dist/index.js

echo ""
echo "✅ Validation tests completed!"
