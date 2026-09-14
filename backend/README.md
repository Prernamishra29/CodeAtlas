# CodeAtlas API (NestJS) — Phase 2

Standalone self-hosted API mirroring the endpoints the frontend uses.
Architecture: Controller -> Service -> Prisma -> PostgreSQL.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # set DATABASE_URL and JWT_SECRET
npx prisma migrate dev --name init
npm run start:dev      # http://localhost:3333
```

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/register` | argon2id hash, returns JWT |
| POST | `/auth/login` | JWT access token |
| GET | `/auth/me` | requires `Authorization: Bearer` |
| GET | `/repositories` | own repositories only |
| POST | `/repositories` | validated GitHub URL |
| GET | `/repositories/:id` | 404 if not owned |
| DELETE | `/repositories/:id` | 404 if not owned |
| POST | `/repositories/:id/analyze` | creates Analysis record, returns `{ analysisId, status }` |
| GET | `/repositories/:id/analyses` | analysis history |
| GET | `/health` | liveness + DB ping |

## Security

- Passwords hashed with argon2id; plaintext is never stored or logged.
- The user id always comes from the verified JWT (`sub`), never from the request body.
- Global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`; DTOs validate every input.
- Not implemented yet (later phases): Redis, BullMQ, Tree-sitter, AI.
