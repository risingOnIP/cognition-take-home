---
trigger: Setting up, running, testing or verifying the acme internal tools repo
---
- Node 22.13+. From `web/`: `npm install && npm run setup` (migrate + deterministic seed, no env vars needed), then `npm run dev` -> http://localhost:3000.
- Sign in with the demo user picker at `/login` (stand-in for Entra SSO). Useful personas: Priya (agent), Elena (Refunds approver + admin, ≤$5k), Sam (finance, payouts), Grace/Diego (compliance), Diego (KYC lead + admin), Jordan (auditor, `/audit`), Avery (demo superuser: every app), Chris (no access).
- `npm run db:reset` replaces the SQLite file; restart `npm run dev` afterwards (the running server keeps the old file open).
- Before opening a PR, from the repo root (covers platform + web): `npm run typecheck && npm run lint && npm test`, then `npm run db:reset` in `web/`.
- `web/src/conformance.test.ts` fails if an app skips `requirePermission`, `requirePageAccess` or `audit`.
