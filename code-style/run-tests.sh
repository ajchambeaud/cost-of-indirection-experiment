#!/bin/bash
VARIANT=${1:?Usage: ./run-tests.sh <variant-dir> [task]}
TASK=${2:-}

echo "=== Testing variant: $VARIANT ==="

# Install variant deps if needed
if [ -f "$VARIANT/package.json" ]; then
  (cd "$VARIANT" && npm install --silent)
fi

# Build TypeScript
if [ -f "$VARIANT/tsconfig.json" ]; then
  echo "Building TypeScript..."
  (cd "$VARIANT" && npx tsc) || { echo "ERROR: TypeScript build failed"; exit 1; }
fi

if [ ! -f "$VARIANT/dist/main.js" ]; then
  echo "ERROR: $VARIANT/dist/main.js not found"
  exit 1
fi

VARIANT_ABS=$(cd "$VARIANT" && pwd)

# Run baseline tests
echo ""
echo "--- Baseline tests ---"
VARIANT_DIR="$VARIANT_ABS" node --test tests/baseline/**/*.test.js
BASELINE_EXIT=$?

# Run task tests if specified
TASK_EXIT=0
if [ -n "$TASK" ] && [ -d "tests/tasks/$TASK" ]; then
  echo ""
  echo "--- Task tests: $TASK ---"
  VARIANT_DIR="$VARIANT_ABS" node --test "tests/tasks/$TASK/**/*.test.js"
  TASK_EXIT=$?
fi

if [ $BASELINE_EXIT -ne 0 ]; then
  echo ""
  echo "FAIL: Baseline tests failed (regression)"
  exit 1
fi

if [ $TASK_EXIT -ne 0 ]; then
  echo ""
  echo "FAIL: Task tests failed"
  exit 1
fi

echo ""
echo "PASS: All tests passed"
exit 0
