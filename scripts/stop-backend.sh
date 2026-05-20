#!/usr/bin/env bash
# Stop any process listening on DropBridge's default port (8080)
set -e
PORT="${1:-8080}"
PIDS=$(lsof -ti ":$PORT" 2>/dev/null || true)
if [ -z "$PIDS" ]; then
  echo "No process is using port $PORT."
  exit 0
fi
echo "Stopping process(es) on port $PORT: $PIDS"
kill $PIDS
sleep 1
if lsof -ti ":$PORT" >/dev/null 2>&1; then
  echo "Force stopping..."
  kill -9 $(lsof -ti ":$PORT")
fi
echo "Port $PORT is free."
