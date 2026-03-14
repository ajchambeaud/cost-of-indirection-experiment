#!/bin/bash
VARIANT=${1:?Usage: ./run-tests.sh <variant-dir> [port]}
PORT=${2:-3000}

echo "=== Testing variant: $VARIANT on port $PORT ==="

# Install variant deps if needed
if [ -f "$VARIANT/package.json" ]; then
  (cd "$VARIANT" && npm install --silent)
fi

# Build TypeScript if tsconfig exists
if [ -f "$VARIANT/tsconfig.json" ]; then
  echo "Building TypeScript..."
  (cd "$VARIANT" && npx tsc)
  ENTRY="$VARIANT/dist/app.js"
else
  ENTRY="$VARIANT/app.js"
fi

if [ ! -f "$ENTRY" ]; then
  echo "ERROR: $ENTRY not found"
  exit 1
fi

# Start server
PORT=$PORT node "$ENTRY" &
SERVER_PID=$!

# Wait for server to be ready
for i in $(seq 1 30); do
  if curl -s "http://localhost:$PORT/accounts" > /dev/null 2>&1; then
    break
  fi
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "ERROR: Server process died"
    exit 1
  fi
  sleep 0.2
done

# Run tests
BASE_URL="http://localhost:$PORT" node --test e2e/**/*.test.js
TEST_EXIT=$?

# Cleanup
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null || true

exit $TEST_EXIT
