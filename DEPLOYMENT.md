# FinGuard AI — Deployment

Everything runs on free tiers:

| Piece | Where | Notes |
|---|---|---|
| Frontend (Next.js) | Vercel project, root `apps/frontend` | Proxies `/api/*` to the backend project |
| Backend (FastAPI) | Vercel project, root `apps/backend` | Python on Vercel Functions, entrypoint `app.main:app` |
| Database | Supabase Postgres | Reached through the Supavisor pooler |
| CI | GitHub Actions | Lint, tests and migrations; Vercel deploys from Git |

The browser only ever talks to the frontend domain. `next.config.mjs` rewrites `/api/:path*` to `BACKEND_URL`, so the `fg_token` auth cookie is first-party and no CORS is involved in production.

---

## 1. Supabase connection strings

Supabase dashboard → **Connect**. Copy two URIs and change the scheme from `postgresql://` to `postgresql+asyncpg://`:

| Use | Pooler mode | Port | Where it goes |
|---|---|---|---|
| Runtime | Transaction | `6543` | `DATABASE_URL` on the backend Vercel project |
| Migrations | Session | `5432` (pooler host) | `DATABASE_URL` GitHub secret |

Both look like `postgresql+asyncpg://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:<port>/postgres`.

Don't use the direct host (`db.<project-ref>.supabase.co`). It's IPv6-only and Vercel can't reach it.

---

## 2. Backend Vercel project

```bash
npm i -g vercel@latest
cd apps/backend
vercel link          # create a new project, e.g. finguard-api
```

In the project settings, set **Root Directory** to `apps/backend` and connect the GitHub repo so pushes to `main` deploy automatically.

Environment variables (Production):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Transaction pooler URI (port 6543) |
| `SERVERLESS` | `true`: uses `NullPool` and disables asyncpg statement caching for the pooler |
| `ENVIRONMENT` | `production` |
| `JWT_SECRET` | `openssl rand -hex 32` (≥ 32 chars) |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRE_MINUTES` | `60` |
| `OPENROUTER_API_KEY` | From OpenRouter |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | From Plaid |
| `PLAID_ENV` | `sandbox` |
| `PLAID_ENCRYPTION_KEY` | Keep the **same** key as before, or stored Plaid tokens can't be decrypted |

```bash
vercel env add DATABASE_URL production   # repeat for each variable
vercel --prod
curl https://<backend>.vercel.app/health
```

---

## 3. Frontend Vercel project

On the existing frontend project (root `apps/frontend`), set:

| Variable | Value |
|---|---|
| `BACKEND_URL` | `https://<backend>.vercel.app` (server-side only, used by the rewrite) |
| `NEXT_PUBLIC_API_URL` | `/api` |

Redeploy, then check `curl https://<frontend>.vercel.app/api/health`.

Locally nothing changes: with `BACKEND_URL` unset there's no rewrite, and the frontend calls `http://localhost:8000` directly.

---

## 4. GitHub Actions

- `backend.yml`: ruff, then pytest, then (on `main`) `alembic upgrade head` against Supabase. The deploy itself comes from Vercel's Git integration.
- `frontend.yml`: lint and build. Vercel deploys from Git.

Secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
|---|---|
| `DATABASE_URL` | Session pooler URI (port 5432), used for migrations |
| `NEXT_PUBLIC_API_URL` | `/api` |

---

## 5. Retiring Azure

Once the Vercel backend is verified:

```bash
az group delete --name finguard-rg   # Container App, environment, ACR
```

Then delete the old GitHub secrets: `AZURE_CREDENTIALS`, `AZURE_RESOURCE_GROUP`, `ACR_NAME`, `ACR_LOGIN_SERVER`.

---

## Verification checklist

- [ ] `https://<backend>.vercel.app/health` → `{"status":"ok", ..., "environment":"production"}`
- [ ] `https://<frontend>.vercel.app/api/health` returns the same (rewrite works)
- [ ] Login works and DevTools shows `fg_token` as a cookie on the frontend domain
- [ ] Dashboard loads, Plaid sandbox connect works (`user_good` / `pass_good`), AI query answers
- [ ] Push to `apps/backend` on `main` → CI migrate job passes and Vercel deploys
- [ ] `vercel logs` shows no `prepared statement ... already exists` errors
