# CodeAtlas

Import a GitHub repository, analyze it, and explore it as **maps, health scores, files, docs, search, and chat** — instead of reading the tree from scratch.

This is a **self-hosted engineering intelligence app**: one NestJS API, one analysis worker, one React UI, PostgreSQL (with pgvector), and Redis. There are no extra microservices.

| | |
|---|---|
| **UI** | http://localhost:8080 |
| **API** | http://localhost:3333 |
| **Database UI** | `npx prisma studio` in `backend/` → http://localhost:5555 |
| **License** | MIT |

---

## What it does

1. Sign up (email + password). Optional Google / GitHub login.
2. Paste a GitHub URL (**Import**). Public repos work with no token.
3. Keep the **worker** running. Status goes queued → analyzing → **Ready**.
4. Open the repo:

| Area | What you get |
|---|---|
| **Overview** | File counts, languages, insights |
| **Architecture** | Folders and import arrows (not an LLM dump) |
| **Dependencies** | Who imports whom |
| **Files** | Paths, languages, symbols |
| **Health** | Five scores + radar |
| **Docs** | Generated markdown (needs Gemini/OpenAI) |
| **Search** | Files and symbols |
| **Chat** | Answers from analyzed files/docs only (needs LLM key) |
| **Activity** | Analysis finished / failed (sidebar). Email only if SMTP or Resend is set |

**Private repos:** Settings → GitHub → personal access token (`repo` or Contents: Read). That token is **not** the same as GitHub **login**.

**Forgot password (local):** no SMTP needed. Submit your signup email; the next screen shows a reset link. Real inbox mail needs Resend or SMTP.

---

## Architecture

```
Browser  (Vite + TanStack Router, :8080)
    │  JWT access + refresh
    ▼
API      (NestJS, :3333)     auth, repos, search, chat, enqueue jobs
    │  BullMQ
    ▼
Worker   clone → scan → parse → optional Gemini docs
    │
PostgreSQL (pgvector)     Redis (queue + cache)
```

- The **API never clones git**. The **worker never serves HTTP**.
- Cloned code is **read only** (no `npm install`, no eval). Temp folders are deleted after the job.
- Tree-sitter parses JS/TS/TSX, Python, Java, Go. Other languages are counted; imports are still extracted where possible.

More detail: [ARCHITECTURE.md](ARCHITECTURE.md) · HTTP API: [API.md](API.md) · Security: [SECURITY.md](SECURITY.md)

---

## Repository layout

```
├── src/                    React UI (routes, features, components)
├── backend/
│   ├── src/                Nest API (auth, repositories, analysis, ai, notifications)
│   ├── src/worker/         Analysis worker
│   └── prisma/             Schema + migrations
├── docker-compose.yml      postgres, redis, api, worker, frontend
├── Dockerfile.frontend
└── backend/Dockerfile
```

---

## Requirements

- Node.js **22**
- Docker Desktop (Postgres + Redis)
- Git

---

## Run locally (three terminals)

**1. Database + Redis** (from the project root — the folder that contains `docker-compose.yml`):

```sh
docker compose up -d postgres redis
```

**2. API**

```sh
cp backend/.env.example backend/.env
# Edit JWT_SECRET (32+ random characters)

cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```

Wait until the log shows the API on port **3333**.

**3. Worker** (required or imports stay **queued**)

```sh
cd backend
npm run start:worker:dev
```

**4. Website** (from project root)

```sh
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:8080 — register, then import a **public** GitHub URL.

Optional: `cd backend && npx prisma studio` to browse tables (`User`, `Repository`, `Analysis`, `CodeFile`, …).

### Scripts (backend)

| Command | What it does |
|---|---|
| `npm run start:dev` / `npm run dev` | API with reload |
| `npm run start:worker:dev` | Worker (tsx, with reload) |
| `npm run start:worker` | Worker from `dist/` after `npm run build` |
| `npx prisma studio` | Database browser |
| `npm test` | Unit tests |

---

## Docker (all-in-one)

```sh
cp backend/.env.example backend/.env
# set a strong JWT_SECRET
docker compose up --build
```

| Service | Port |
|---|---|
| Frontend | 8080 |
| API | 3333 |
| Postgres | 5432 |
| Redis | 6379 |

Hosted API URL at build time:

```sh
docker compose build --build-arg VITE_API_URL=https://api.yourdomain.com frontend
```

---

## Environment

Copy templates. **Never commit `.env` or `backend/.env`.** They are gitignored.

### Frontend (`.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Browser API origin, default `http://localhost:3333` |

### Backend (`backend/.env`)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres |
| `JWT_SECRET` | yes | Tokens + encrypting GitHub PATs (32+ chars in production) |
| `CORS_ORIGIN` | yes in prod | Allowed site origins, comma-separated |
| `FRONTEND_URL` | for OAuth / reset links | e.g. `http://localhost:8080` |
| `API_PUBLIC_URL` | for OAuth | e.g. `http://localhost:3333` |
| `REDIS_HOST` / `REDIS_PORT` | yes | Queue + cache |
| `GEMINI_API_KEY` | no | Docs + chat |
| `GOOGLE_CLIENT_ID` / `SECRET` | no | Google login |
| `GITHUB_CLIENT_ID` / `SECRET` | no | GitHub login (**OAuth App**, not GitHub App) |
| `RESEND_API_KEY` or `SMTP_*` | no | Real emails for reset + activity |
| `MAIL_FROM` | with mail | From address |

OAuth callbacks (must match the apps you create):

- `{API_PUBLIC_URL}/auth/google/callback`
- `{API_PUBLIC_URL}/auth/github/callback`

GitHub OAuth App: [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps**.

---

## Features vs optional extras

| Built in | Optional (env) | Not in this project |
|---|---|---|
| Register / login / JWT | Google & GitHub login | Billing / Stripe |
| Import + analyze public repos | Gemini/OpenAI docs & chat | SaaS multi-tenant billing |
| Maps, health, files, search | SMTP / Resend emails | Notification bell |
| Activity in the sidebar | Private repos (PAT) | |
| Password reset (on-screen link locally) | Emailed reset links | |

---

## Publish on GitHub

**Before you push**

1. `git status` — **`backend/.env` must not appear**. If it does, it is already ignored; do not `git add -f` it.
2. Rotate any secrets that were ever pasted in chat or an old `.env.example`.
3. Use a new `JWT_SECRET` for any public host.

```sh
git init
git add .
git status
git commit -m "Publish CodeAtlas"
gh repo create codeatlas --private --source=. --remote=origin --push
```

Use `--public` only after the checklist above.

---

## Deploy (your own server)

1. `NODE_ENV=production`
2. Strong `JWT_SECRET`, explicit `CORS_ORIGIN`, `FRONTEND_URL`, `API_PUBLIC_URL`
3. Run **postgres + redis + api + worker + frontend** (Compose or equivalent)
4. `npx prisma db push` or `npx prisma migrate deploy`
5. Probe `GET /health/live` and `GET /health/ready`
6. Worker must stay running or analysis stays queued

---

## Tests

```sh
cd backend && npm test && npm run typecheck
npm test && npm run lint
```

Live API tests (Postgres + Redis + schema):

```sh
cd backend
$env:RUN_API_TESTS="1"
npm test
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep repository queries scoped by the JWT user id. Do not log tokens or clone URLs that contain credentials.
