#!/usr/bin/env bash
set -euo pipefail

# Example CI invocation for mem-coverage
# Fails the build if global or scoped thresholds (from config) are not met.

echo "Running mem-coverage..."
pnpm mem-coverage -- --config=src/mem-coverage/_examples/.coverage.json --verbose
status=$?

if [ $status -ne 0 ]; then
    echo "mem-coverage thresholds not met; failing build."
    exit $status
fi

echo "mem-coverage passed."
