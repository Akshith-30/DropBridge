# Local development vs production

DropBridge uses **separate environments** by design. Follow this so data and APIs never get mixed up.

## Quick start (local)

```bash
# 1. Postgres (once)
createdb dropbridge   # or: psql -c "CREATE DATABASE dropbridge;"

# 2. Backend → local Postgres + ./uploads (dev profile: ddl-auto=update, creates `devices` table)
cd backend && mvn spring-boot:run

# 3. Frontend → proxies /api and /ws to :8080 (start backend first, or wait ~10s)
cd frontend && npm install && npm run dev
```

**Start order:** run the backend until you see `Started DropBridge`, then start Vite. If the frontend loads first, you may briefly see `[vite] ws proxy error: ECONNRESET` — that is the presence WebSocket retrying while Spring Boot is still starting. It is harmless once the API is up.

Open **http://localhost:5173**. In the browser console you should see:

```text
[DropBridge] API → /api
[DropBridge] WS  → (via Vite proxy)
```

Verify DB (latest transfer should appear here, **not** in Supabase):

```bash
psql -h localhost -U postgres -d dropbridge -c \
  "SELECT created_at, mode, status, title FROM transfer_sessions ORDER BY created_at DESC LIMIT 5;"
```

Or run: `./scripts/check-local-env.sh`

---

## How environments are wired

| Layer | Local (`npm run dev` + `mvn spring-boot:run`) | Production |
|-------|-----------------------------------------------|------------|
| **Frontend env** | `frontend/.env.development` | `frontend/.env.production` + Vercel vars |
| **API / WebSocket** | Vite proxy → `localhost:8080` | `VITE_API_BASE_URL` / `VITE_WS_URL` on Render |
| **Backend profile** | `dev` (default) — `application-dev.yml` | `production` — `application-production.yml` |
| **Database** | `localhost:5432/dropbridge` | Supabase (Render `DATABASE_URL`) |
| **File bytes** | `backend/uploads/` | Cloudflare R2 |

---

## Env files (frontend)

| File | Committed? | When loaded |
|------|------------|-------------|
| `.env` | Yes | Comments only |
| `.env.development` | Yes | `npm run dev` — **local backend** |
| `.env.production` | Yes | `npm run build` — **Render URLs** |
| `.env.local` | No (gitignored) | Optional overrides |

After changing any `.env*` file, **restart** `npm run dev`.

---

## Backend profiles

| Command | Profile | Database |
|---------|---------|----------|
| `mvn spring-boot:run` | `dev` (default) | Local Postgres — Hibernate **update** + `devices` table |
| Docker / Render | `production` | Supabase + R2 — run `deploy/migrations/003_*.sql` manually |

After pulling account/devices changes, **restart the backend once** and confirm in pgAdmin:

- Table **`devices`** exists
- **`user_contacts`** has **`contact_user_id`** (not `contact_device_id`)

Re-add network contacts if the dev migration removed unmappable rows.

**Never** set `SPRING_PROFILES_ACTIVE=production` on your machine unless you intentionally want to hit Supabase from local.

---

## Common mistakes

| Symptom | Cause | Fix |
|---------|--------|-----|
| `No static resource api/contacts` | Frontend still calling Render | Restart `npm run dev`; console must show `API → /api` |
| Latest transfer not in Supabase | You used local DB | Query **localhost** `dropbridge` |
| `files` table empty | P2P transfers (expected) | Use **Cloud / stored** mode to populate `files` |
| Auth works but network fails | Old backend JVM | Restart `mvn spring-boot:run` |

---

## Debug production API from local UI (optional)

```bash
cp deploy/env.frontend.local.example frontend/.env.local
# Edit .env.local: set VITE_USE_LOCAL_BACKEND=false and Render URLs
npm run dev
```

---

## Switching to production

1. Push to GitHub → Vercel + Render redeploy.
2. Run SQL migrations on Supabase if needed (`deploy/migrations/`).
3. Do **not** copy `.env.development` to Vercel — use `deploy/env.vercel.example`.
4. Render uses `SPRING_PROFILES_ACTIVE=production` (see `backend/Dockerfile`).

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full checklist.
