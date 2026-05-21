#!/usr/bin/env bash
# Print local dev instructions and run environment checks.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/scripts/check-local-env.sh"

echo ""
echo "Start local stack (two terminals):"
echo "  Terminal 1: cd backend && mvn spring-boot:run"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Docs: LOCAL_DEV.md"
