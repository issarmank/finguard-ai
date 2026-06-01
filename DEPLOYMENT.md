# FinGuard AI — Deployment Log

**Date:** 2026-06-01  
**Subscription:** f5616a62 (Azure for Students)  
**Git user:** Issar Manknojiya  

---

## Configuration

| Variable | Value |
|---|---|
| Resource Group | `finguard-rg` |
| Location | `eastus` |
| ACR Name | `finguardacr` |
| ACR Login Server | `finguardacr.azurecr.io` |
| PostgreSQL Server | `finguard-pg` |
| PostgreSQL DB | `finguard_prod` |
| PostgreSQL User | `finguard` |
| Container Apps Env | `finguard-env` |
| Container App Name | `finguard-api` |

---

## Step 1 — Azure Resource Creation

### Commands Run

```bash
# 1. Create resource group
az group create --name finguard-rg --location eastus

# 2. Create container registry
az acr create --resource-group finguard-rg --name finguardacr --sku Basic --admin-enabled true

# 3. Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group finguard-rg --name finguard-pg \
  --location eastus --sku-name Standard_B1ms \
  --storage-size 32 --version 16 \
  --admin-user finguard --admin-password "<PG_PASS>" \
  --public-access 0.0.0.0

# 4. Create database
az postgres flexible-server db create \
  --resource-group finguard-rg --server-name finguard-pg --database-name finguard_prod

# 5. Create Container Apps environment
az containerapp env create --name finguard-env --resource-group finguard-rg --location eastus
```

### Outputs

<!-- Filled in as commands complete -->

---

## Step 2 — Entrypoint & Dockerfile (already done)

`apps/backend/entrypoint.sh`:
```sh
#!/bin/sh
set -e
uv run alembic upgrade head
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

`apps/backend/Dockerfile` CMD: `["/entrypoint.sh"]`

---

## Step 3 — Backend Environment Variables

Set on the Container App after creation:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://finguard:<PG_PASS>@finguard-pg.postgres.database.azure.com:5432/finguard_prod` |
| `JWT_SECRET` | Generated via `openssl rand -hex 32` |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRE_MINUTES` | `60` |
| `OPENROUTER_API_KEY` | From OpenRouter dashboard |
| `PLAID_CLIENT_ID` | From Plaid dashboard |
| `PLAID_SECRET` | From Plaid dashboard |
| `PLAID_ENV` | `sandbox` |
| `CORS_ORIGINS` | Updated after Vercel deploy |
| `ENVIRONMENT` | `production` |

```bash
az containerapp update \
  --name finguard-api \
  --resource-group finguard-rg \
  --set-env-vars \
    DATABASE_URL="postgresql+asyncpg://finguard:<PG_PASS>@finguard-pg.postgres.database.azure.com:5432/finguard_prod" \
    JWT_SECRET="<JWT_SECRET>" \
    JWT_ALGORITHM="HS256" \
    JWT_EXPIRE_MINUTES="60" \
    OPENROUTER_API_KEY="<OPENROUTER_API_KEY>" \
    PLAID_CLIENT_ID="<PLAID_CLIENT_ID>" \
    PLAID_SECRET="<PLAID_SECRET>" \
    PLAID_ENV="sandbox" \
    CORS_ORIGINS='["https://<your-app>.vercel.app"]' \
    ENVIRONMENT="production"
```

---

## Step 4 — First Backend Deploy

```bash
# Login to ACR
az acr login --name finguardacr

# Build and push image
docker build -t finguardacr.azurecr.io/finguard-api:latest ./apps/backend
docker push finguardacr.azurecr.io/finguard-api:latest

# Create Container App
az containerapp create \
  --name finguard-api \
  --resource-group finguard-rg \
  --environment finguard-env \
  --image finguardacr.azurecr.io/finguard-api:latest \
  --registry-server finguardacr.azurecr.io \
  --registry-username <ACR_USERNAME> \
  --registry-password <ACR_PASSWORD> \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 --max-replicas 3
```

### Container App URL

<!-- Fill in after creation -->
`https://finguard-api.<random>.azurecontainerapps.io`

---

## Step 5 — Frontend Deploy on Vercel

1. Go to vercel.com → **Import Git Repository** → select `finguard-ai`
2. Set **Root Directory** to `apps/frontend`
3. Framework: Next.js (auto-detected)
4. Add env variable: `NEXT_PUBLIC_API_URL=https://finguard-api.<random>.azurecontainerapps.io`
5. Deploy → note your `*.vercel.app` URL
6. Update `CORS_ORIGINS` on the backend Container App to include your Vercel URL

---

## Step 6 — GitHub Actions CI/CD (already done)

Workflows in `.github/workflows/`:
- `backend.yml` — test → build → push ACR → `az containerapp update`
- `frontend.yml` — npm ci → lint → build (Vercel auto-deploys via GitHub integration)

---

## Step 7 — GitHub Secrets

Add in: **Settings → Secrets and variables → Actions**

| Secret | Value |
|---|---|
| `AZURE_CREDENTIALS` | Output of `az ad sp create-for-rbac ...` (see below) |
| `AZURE_RESOURCE_GROUP` | `finguard-rg` |
| `ACR_NAME` | `finguardacr` |
| `ACR_LOGIN_SERVER` | `finguardacr.azurecr.io` |
| `NEXT_PUBLIC_API_URL` | Your Azure Container Apps URL |

```bash
# Generate AZURE_CREDENTIALS service principal
az ad sp create-for-rbac \
  --name finguard-github-actions \
  --sdk-auth \
  --role contributor \
  --scopes /subscriptions/f5616a62-ae8e-4f3b-98e5-6c16af2b12d3/resourceGroups/finguard-rg
```

Paste the full JSON output as the `AZURE_CREDENTIALS` secret.

---

## Verification Checklist

- [ ] `curl https://finguard-api.<random>.azurecontainerapps.io/health` → `{"status":"ok"}`
- [ ] `az containerapp logs show --name finguard-api --resource-group finguard-rg` confirms Alembic ran
- [ ] Vercel URL loads, login works
- [ ] Plaid sandbox connect works (`user_good` / `pass_good`)
- [ ] Push to `apps/backend` → GitHub Actions deploys automatically
- [ ] Push to `apps/frontend` → Vercel deploys automatically