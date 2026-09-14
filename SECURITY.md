# Security

- Never commit `backend/.env`, personal access tokens, OAuth client secrets, or JWT secrets.
- Rotate any secret that was pasted into chat, screenshots, or a public gist.
- Report vulnerabilities privately. Do not open a public issue with exploit details.

Production checklist:

1. `JWT_SECRET` at least 32 random characters (not a placeholder).
2. `CORS_ORIGIN` and `FRONTEND_URL` set to your public site origin (no `*`).
3. OAuth callback URLs match `API_PUBLIC_URL`.
4. Postgres and Redis are not exposed to the internet without auth.
5. The analysis worker is the only process that clones git; it must not execute cloned code.
