# API

Base URL: `http://localhost:3333`

Authenticated routes require `Authorization: Bearer <accessToken>`.

Access tokens last 15 minutes. Refresh with `POST /auth/refresh` using the opaque `refreshToken` from login/register. The previous refresh token is revoked (rotation).

Error bodies: `{ "statusCode": number, "message": string | string[] }`. Internal errors are always `"An unexpected error occurred."`

## Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health/live` | no | Process is up |
| GET | `/health/ready` | no | 200 if Postgres + Redis answer, else 503 |
| GET | `/health` | no | Ready payload plus `uptime` |

## Auth

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/auth/register` | no | `{ email, name, password }` |
| POST | `/auth/login` | no | `{ email, password }` |
| POST | `/auth/refresh` | no | `{ refreshToken }` |
| POST | `/auth/logout` | optional | `{ refreshToken? }` |
| POST | `/auth/forgot-password` | no | `{ email }` always `{ ok: true }` |
| POST | `/auth/reset-password` | no | `{ token, newPassword }` |
| GET | `/auth/google` | no | Redirects to Google |
| GET | `/auth/github` | no | Redirects to GitHub |
| GET | `/auth/me` | yes | |
| PATCH | `/auth/me` | yes | profile fields |
| POST | `/auth/password` | yes | `{ currentPassword, newPassword }` |
| GET | `/auth/stats` | yes | |
| POST | `/auth/github-token` | yes | `{ token }` |
| DELETE | `/auth/github-token` | yes | |
| DELETE | `/auth/me` | yes | deletes the account |

Login/register/refresh respond with `{ user, accessToken, refreshToken, tokenType, expiresIn }`. `user` never includes password or GitHub token material — only `githubConnected`.

## Notifications

| Method | Path | Auth |
|---|---|---|
| GET | `/notifications` | yes |
| GET | `/notifications/unread-count` | yes |
| POST | `/notifications/read-all` | yes |
| POST | `/notifications/:id/read` | yes |

## Repositories

All routes require a JWT. Rows are isolated by the token's user id.

| Method | Path |
|---|---|
| GET | `/repositories` |
| POST | `/repositories` `{ url, branch? }` |
| GET | `/repositories/activity` |
| GET | `/repositories/insights` |
| GET | `/repositories/:id` |
| DELETE | `/repositories/:id` |
| POST | `/repositories/:id/analyze` |
| POST | `/repositories/:id/retry` |
| GET | `/repositories/:id/files` |
| GET | `/repositories/:id/dependencies` |
| GET | `/repositories/:id/health` |
| GET | `/repositories/:id/search?q=&kinds=` |
| GET | `/repositories/:id/documentation` |
| GET | `/repositories/:id/insights` |
| GET | `/repositories/:id/analyses` |
| GET | `/repositories/:id/analyses/latest` |
| DELETE | `/repositories/:id/analyses/:analysisId` |
| GET | `/repositories/:id/chat` |
| POST | `/repositories/:id/chat` `{ question, conversationId? }` SSE |

`url` must match `https://github.com/owner/repo`. Analyze returns 202 `{ analysisId, status, alreadyRunning }`. A second analyze while queued/cloning/scanning/analyzing returns the existing run instead of a duplicate job.
