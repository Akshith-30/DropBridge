#!/usr/bin/env bash
# Verify local dev wiring (run from repo root).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== DropBridge local environment check ==="
echo ""

# Frontend
if [[ -f frontend/.env.development ]] && grep -q 'VITE_USE_LOCAL_BACKEND=true' frontend/.env.development; then
  echo "✓ frontend/.env.development → local backend enabled"
else
  echo "✗ frontend/.env.development missing or VITE_USE_LOCAL_BACKEND not true"
fi

if [[ -f frontend/.env.local ]] && grep -q 'VITE_USE_LOCAL_BACKEND=false' frontend/.env.local 2>/dev/null; then
  echo "⚠ frontend/.env.local overrides to PRODUCTION API"
fi

# Backend health
if curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1; then
  echo "✓ Backend responding on http://localhost:8080"
else
  echo "✗ Backend not running — start: cd backend && mvn spring-boot:run"
fi

# Postgres
if command -v pg_isready >/dev/null 2>&1 && pg_isready -h localhost -p 5432 -q 2>/dev/null; then
  echo "✓ Postgres accepting connections on localhost:5432"
  if command -v psql >/dev/null 2>&1; then
    COUNT=$(psql -h localhost -U postgres -d dropbridge -tAc \
      "SELECT count(*) FROM transfer_sessions" 2>/dev/null || echo "?")
    echo "  transfer_sessions rows (local DB): ${COUNT}"
  fi
else
  echo "✗ Postgres not ready — start Postgres and: createdb dropbridge"
fi

echo ""
echo "When npm run dev is running, browser console should show:"
echo "  [DropBridge] API → /api"
echo "  [DropBridge] WS  → (via Vite proxy)"
echo ""
echo "Supabase Table Editor = PRODUCTION only (not localhost tests)."
