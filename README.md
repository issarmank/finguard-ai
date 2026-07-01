# FinGuard AI

<img width="2936" height="1648" alt="image" src="https://github.com/user-attachments/assets/c0a3c9af-5b10-4638-8aff-0e20b0d071e6" />

A personal finance dashboard powered by Plaid and AI. Track spending, set budgets, manage goals, monitor net worth, and get AI-generated insights — all in one place.

**Live:** [finguard-issarmanks-projects.vercel.app](https://finguard-issarmanks-projects.vercel.app)

---

## Features

- **Dashboard** — spending overview, recent transactions, budget progress
- **Transactions** — Plaid-synced transaction history with category tagging
- **Budgets** — monthly budget tracking with AI-generated analysis
- **Goals** — savings goals with progress tracking
- **Net Worth** — asset/liability tracking with historical snapshots
- **AI Query** — natural language questions about your finances
- **Audit Reports** — financial audit log and reports

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TailwindCSS |
| Backend | FastAPI (Python), SQLAlchemy async, Alembic |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (python-jose) |
| Banking | Plaid API |
| AI | OpenRouter (Gemini, DeepSeek, Claude) |
| Package manager | `uv` (backend), `npm` (frontend) |

---

## Project Structure

```
finguard-ai/
├── apps/
│   ├── backend/          # FastAPI backend
│   │   ├── app/
│   │   │   ├── routers/  # auth, plaid, transactions, budgets, goals, net_worth, ai
│   │   │   ├── models/   # SQLAlchemy models
│   │   │   ├── schemas/  # Pydantic schemas
│   │   │   └── main.py
│   │   ├── alembic/      # DB migrations
│   │   └── Dockerfile
│   └── frontend/         # Next.js frontend
│       └── src/
│           ├── app/      # App Router pages
│           ├── components/
│           └── lib/
├── .github/workflows/    # CI/CD (GitHub Actions)
└── DEPLOYMENT.md         # Full deployment guide
```

---

## Local Development

### Prerequisites

- Python 3.12+, `uv`
- Node.js 18+, npm
- A [Supabase](https://supabase.com) project
- A [Plaid](https://plaid.com) sandbox account
- An [OpenRouter](https://openrouter.ai) API key

### Backend

```bash
cd apps/backend

# Install dependencies
uv sync

# Create .env
cp .env.example .env   # then fill in your values

# Run migrations
uv run alembic upgrade head

# Start server
uv run uvicorn app.main:app --reload --port 8000
```

**Backend `.env`:**
```
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET=your-secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
OPENROUTER_API_KEY=sk-or-...
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox
ENVIRONMENT=development
```

### Frontend

```bash
cd apps/frontend

# Install dependencies
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

The app is deployed on:

- **Backend:** Azure Container Apps (`finguard-api`)
- **Database:** Supabase (PostgreSQL via Session Pooler)
- **Frontend:** Vercel (`finguard` project)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full deployment guide including CI/CD setup, environment variables, and known gotchas.

### CI/CD

- Push to `apps/backend/**` → GitHub Actions tests, builds, and deploys to Azure
- Push to `apps/frontend/**` → Vercel auto-deploys

---

## API Docs

Available at `/docs` (Swagger UI) and `/redoc` when the backend is running.

Production: [finguard-api.thankfulsky-bac536ee.eastus.azurecontainerapps.io/docs](https://finguard-api.thankfulsky-bac536ee.eastus.azurecontainerapps.io/docs)
