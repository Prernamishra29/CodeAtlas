# Architecture

CodeAtlas is a modular monolith: one NestJS API process, one dedicated analysis worker, one React SPA. Postgres holds application data and embeddings. Redis holds the BullMQ queues and a small read-through cache.

## Processes

| Process | Role |
|---|---|
| Frontend | TanStack Router SPA. Talks only to the public API. |
| API | Auth, repositories, analysis enqueue, search, health, RAG chat. Never clones git. |
| Worker | `git clone` → scan → Tree-sitter parse → persist → optional Gemini docs. Never serves HTTP. |

The worker is **not** a microservice mesh. It shares the Prisma schema and Redis connection settings with the API.

## Request path

1. Browser sends `Authorization: Bearer <access JWT>` (15m).
2. On 401, the client rotates a hashed refresh token via `POST /auth/refresh`.
3. All repository queries are scoped by `userId` from the verified JWT (`sub`). Chat is also ownership-checked.
4. `POST /repositories/:id/analyze` writes an `Analysis` row and enqueues `jobId = analysisId`.

## Analysis pipeline

Clone (git only) → scan (read files, skip `node_modules` / `.env`) → metadata → symbols/dependencies → optional embeddings/docs.

Repository code is never executed. Clone directories are created under `ANALYSIS_TMP_DIR` and deleted in `finally`.

## Queue reliability

| Setting | Value |
|---|---|
| Attempts | 3 |
| Backoff | exponential, 15s base |
| Timeout | 10 minutes |
| Lock duration | 120s (renewed while running) |
| Stalled interval | 30s, max 1 stall then fail |
| Duplicate prevention | in-flight DB check + unique `jobId` |
| Idempotency | completed/cancelled analyses are skipped |
| Dead letter | `repository-analysis-dead-letter` after final failure |

## Cache

See `backend/src/cache/cache.keys.ts`. Summary:

| Key | TTL | Invalidation |
|---|---|---|
| `ca:v1:repos:{userId}` | 20s | repo create/delete, analysis status |
| `ca:v1:repo:{userId}:{id}` | 45s | same |
| `ca:v1:analysis:{userId}:{id}` | 60s | analysis start/complete/fail/cancel |
| `ca:v1:files` / `ca:v1:deps` | 90s | analysis complete/fail/delete |
| `ca:v1:docs` | 120s | analysis complete/delete |
| `ca:v1:health` | 60s | analysis complete/delete |

Chat and search are not cached. Cache misses on Redis errors fall through to Postgres.

Analysis completions write `Notification` rows (and optional email). The SPA **Activity** page reads `/notifications`.

## Security

- Access JWT `typ=access`, HMAC with `JWT_SECRET`. Refresh tokens are random, stored as SHA-256 hashes, rotated on use.
- Helmet headers, CORS allow-list, global validation pipe, rate limits (120/min global; 8/min login/register; 20/min chat).
- GitHub URLs must be `https://github.com/owner/repo` with no credentials.
- GitHub PATs encrypted at rest (AES-256-GCM). Clone URLs with tokens are never logged.
- Unknown exceptions return a generic 500. Environment values are never returned.
- Health: `/health/live` (process), `/health/ready` (Postgres + Redis), `/health` (ready + uptime).

## Observability

Logs are JSON lines (`ts`, `level`, `msg`, fields). Secrets and `x-access-token` URLs are redacted.

Tracked fields include HTTP duration, analysis duration, queue latency, worker failures, AI latency/token usage, and database query duration.
