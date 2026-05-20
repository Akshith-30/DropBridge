# DropBridge — Milestone B deployment checklist

This document expands **“Next — Deploy (Milestone B)”** from [README.md](README.md). Follow the steps in order; later steps depend on URLs and secrets from earlier ones.

---

## 0. Preconditions

- [ ] Code on the branch you want to deploy is pushed to GitHub (or Git provider Render/Vercel can read).
- [ ] You have admin access to create projects on Supabase, Cloudflare, Render, and Vercel (or equivalents).
- [ ] Local pre-flight passes: `./scripts/verify-deploy-ready.sh` from repo root.

**Env templates (copy into dashboards, do not commit secrets):**

- Render: [`deploy/env.render.example`](deploy/env.render.example)
- Vercel: [`deploy/env.vercel.example`](deploy/env.vercel.example)

**Recommended order (avoids CORS / empty DB issues):**

1. Supabase + R2 credentials ready  
2. Render Blueprint — set env from `deploy/env.render.example` (include `SPRING_JPA_HIBERNATE_DDL_AUTO=update` and a **planned** `FRONTEND_URL`, e.g. `https://dropbridge.vercel.app`)  
3. Vercel frontend — set `VITE_*` using the **live** Render URL  
4. Confirm Vercel URL → update `FRONTEND_URL` on Render if it differs → redeploy backend  
5. After first successful boot → set `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` → redeploy  

---

## 1. Database — Supabase PostgreSQL

1. Create a [Supabase](https://supabase.com) project.
2. In **Project settings → Database**, copy the **URI** for a direct connection (port **5432**, not the pooler `6543` if you use Hibernate/JPA).
3. Build a JDBC URL Render can use, for example:
   - `jdbc:postgresql://db.<ref>.supabase.co:5432/postgres?sslmode=require`
4. Note **database password** (from project creation or reset).

**Render env vars (later):**

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Full JDBC URL above |
| `DB_USERNAME` | Usually `postgres` |
| `DB_PASSWORD` | Your Supabase DB password |

---

## 2. Object storage — Cloudflare R2

1. In [Cloudflare Dashboard](https://dash.cloudflare.com) → R2 → create a **bucket**.
2. Create an **R2 API token** with read/write on that bucket (or account-scoped as per Cloudflare docs).
3. Collect: **Account ID**, **Access Key ID**, **Secret Access Key**, **Bucket name**.

**Render env vars:**

| Key | Example |
|-----|---------|
| `R2_ACCOUNT_ID` | From R2 overview |
| `R2_ACCESS_KEY_ID` | From API token |
| `R2_SECRET_ACCESS_KEY` | From API token |
| `R2_BUCKET` | Your bucket name |

---

## 3. TURN / STUN — cross-NAT P2P (Metered, Twilio, etc.)

1. Sign up at [Metered.ca](https://www.metered.ca/tools/openrelay/) (or Twilio TURN) and create TURN credentials.
2. You will expose **only** the resulting URL, username, and credential to the **frontend** (Vite env), not to Render.

**Vercel env vars (later):**

| Key | Purpose |
|-----|---------|
| `VITE_TURN_URL` | e.g. `turn:global.relay.metered.ca:3478` |
| `VITE_TURN_USERNAME` | TURN username |
| `VITE_TURN_CREDENTIAL` | TURN password / credential |

Optional for local cross-NAT tests: same vars in `frontend/.env.local`.

---

## 4. Backend — Render

1. In [Render](https://render.com) → **New** → **Blueprint** (or connect repo and use [render.yaml](render.yaml)).
2. Point the blueprint at this repository. Backend uses **`runtime: docker`** ([`backend/Dockerfile`](backend/Dockerfile)) — Render does not support `runtime: java`.
3. Set **all** environment variables from `render.yaml` comments + sections below.
4. **First deploy / empty database:** [render.yaml](render.yaml) sets `SPRING_JPA_HIBERNATE_DDL_AUTO=update` by default. After the first successful boot and schema exists, change it to **`validate`** in the Render dashboard and redeploy.
5. Copy the service **public URL**, e.g. `https://dropbridge-api.onrender.com`.

**Health check:** [render.yaml](render.yaml) uses `healthCheckPath: /actuator/health`. The backend includes Spring Boot Actuator with `/actuator/health` permitted without auth.

**Core Render env summary:**

| Key | Notes |
|-----|--------|
| `JWT_SECRET` | `openssl rand -base64 48` |
| `FRONTEND_URL` | Set **after** Vercel deploy (step 5), then redeploy backend so CORS matches |
| `MAIL_*` | Optional; see README env table |

---

## 5. Frontend — Vercel

1. [Vercel](https://vercel.com) → **Add New** → **Project** → import this repo.
2. Set **Root Directory** to `frontend`.
3. Add environment variables from [README.md](README.md) (Vercel table) and [frontend/.env.production](frontend/.env.production):

| Key | Example |
|-----|---------|
| `VITE_API_BASE_URL` | `https://<your-render-service>.onrender.com` |
| `VITE_WS_URL` | `wss://<your-render-service>.onrender.com` |
| `VITE_TURN_*` | From step 3 |

4. Deploy and copy the **production URL** (e.g. `https://dropbridge.vercel.app`).

---

## 6. Wire frontend URL into backend

1. On Render, set `FRONTEND_URL` to your **exact** Vercel URL (scheme + host, no trailing slash unless your app expects it).
2. Redeploy the backend so CORS and any link generation use the correct origin.

---

## 7. Smoke test (production)

- [ ] Open Vercel URL → home loads, no console errors for API.
- [ ] **Sign in / guest:** create session, QR or link opens on second device.
- [ ] **P2P:** same Wi‑Fi and cross-network (with TURN vars set).
- [ ] **Cloud path:** force fallback or use offline receiver; file lands in R2; download works.
- [ ] **Email:** if `MAIL_*` set, trigger a flow that sends mail and confirm inbox.
- [ ] **Expiry:** optional — shorten TTL in a test environment or wait for cleanup window.

---

## 8. After launch (README “Mid term”)

Do **not** start these until Milestone B is stable:

1. Resume / `transfer_chunks` for cloud uploads  
2. Browser push notifications  
3. Further validation (virus scan, etc.)

Already in repo (post-MVP): multi-file sessions (1 GB per session), transfer history, rate limits, optional MIME validation.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Render build fails | Java 21 on Render; `mvn` logs; run `mvn -B package -DskipTests` locally |
| App starts then 503 / unhealthy | `GET /actuator/health` on service URL; DB reachable from Render (Supabase firewall / IP if any) |
| CORS errors in browser | `FRONTEND_URL` matches Vercel origin exactly |
| WebSocket fails | `VITE_WS_URL` uses `wss://` and same host as API |
| P2P only on LAN | `VITE_TURN_*` missing or wrong on Vercel |

---

*Keep this file updated when infra or env var names change.*
