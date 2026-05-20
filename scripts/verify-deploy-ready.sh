#!/usr/bin/env bash
# Quick pre-flight before Milestone B (run from repo root).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Backend compile & package"
cd backend
mvn -q -B package -DskipTests
test -f target/dropbridge-0.0.1-SNAPSHOT.jar && echo "    JAR OK"

echo "==> Frontend production build"
cd "$ROOT/frontend"
npm run build --silent

echo "==> Deploy artifacts"
for f in render.yaml DEPLOYMENT.md deploy/env.render.example deploy/env.vercel.example; do
  test -f "$ROOT/$f" || { echo "Missing $f"; exit 1; }
  echo "    $f OK"
done

echo ""
echo "Ready for Milestone B. Next:"
echo "  1. Push repo to GitHub"
echo "  2. Supabase + R2 credentials → Render (see deploy/env.render.example)"
echo "  3. Render Blueprint → render.yaml"
echo "  4. Vercel import frontend/ (see deploy/env.vercel.example)"
echo "  5. Set FRONTEND_URL on Render → redeploy backend"
echo "  6. After first boot: SPRING_JPA_HIBERNATE_DDL_AUTO=validate on Render"
