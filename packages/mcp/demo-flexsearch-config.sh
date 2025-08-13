#!/bin/bash

# Demo script for FlexSearch configuration
# This script demonstrates how to configure FlexSearch through environment variables

echo "🔍 FlexSearch Configuration Demo"
echo "================================"

echo ""
echo "1. Default Configuration"
echo "------------------------"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_flexsearch_config","arguments":{}}}' | node dist/index.js

echo ""
echo "2. German Language Optimization"
echo "-------------------------------"
export FLEXSEARCH_LANGUAGE=de
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_flexsearch_config","arguments":{}}}' | node dist/index.js

echo ""
echo "3. High Precision Search"
echo "------------------------"
export FLEXSEARCH_RESOLUTION=15
export FLEXSEARCH_DEPTH=5
export FLEXSEARCH_THRESHOLD=0
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_flexsearch_config","arguments":{}}}' | node dist/index.js

echo ""
echo "4. Context-Aware Search"
echo "------------------------"
export FLEXSEARCH_CONTEXT=true
export FLEXSEARCH_CONTEXT_RESOLUTION=8
export FLEXSEARCH_CONTEXT_DEPTH=4
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_flexsearch_config","arguments":{}}}' | node dist/index.js

echo ""
echo "5. Custom Stopwords"
echo "-------------------"
export FLEXSEARCH_STOPWORDS='["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"]'
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_flexsearch_config","arguments":{}}}' | node dist/index.js

echo ""
echo "6. Strict Tokenization"
echo "----------------------"
export FLEXSEARCH_TOKENIZE=strict
export FLEXSEARCH_CHARSET=exact
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_flexsearch_config","arguments":{}}}' | node dist/index.js

echo ""
echo "✅ FlexSearch configuration demo completed!"
echo ""
echo "💡 Tips:"
echo "- Set these variables in your .env file for persistent configuration"
echo "- Use the get_flexsearch_config tool to verify your settings"
echo "- Adjust resolution and depth based on your performance needs"
echo "- Enable context search for finding related terms near each other"

