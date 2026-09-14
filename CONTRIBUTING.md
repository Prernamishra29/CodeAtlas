# Contributing

## Layout

- `src/` — React SPA
- `backend/src/` — NestJS API modules (`auth`, `repositories`, `analysis`, `ai`, `health`, `cache`, `notifications`)
- `backend/src/worker/` — dedicated analysis process
- `backend/prisma/` — schema and migrations

Keep new work inside these modules. Do not add services, brokers, or extra HTTP servers unless the product itself needs a new process (it does not).

## Local loop

1. `docker compose up -d postgres redis`
2. `backend/.env` from `.env.example`
3. API `npm run start:prod`, worker `npm run start:worker`, UI `npm run dev`

## Checks before a PR

```sh
cd backend && npm test && npm run typecheck && npm run build
npm test && npm run lint && npm run typecheck
```

## Rules

- User data is scoped by JWT `sub`. Never query repositories by id alone.
- Do not log tokens, Authorization headers, or authenticated git URLs.
- Do not return stack traces or environment values.
- Do not execute cloned repository code.
- Cache only the keys listed in `backend/src/cache/cache.keys.ts`, with invalidation on analysis/repo writes.
- Secrets stay in `.env` (gitignored). Update `.env.example` when you add a variable.

## Tests

Put unit tests next to the code (`*.spec.ts`) or under `backend/test/`. Live API tests run only when `RUN_API_TESTS=1`.
