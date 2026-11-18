---
trigger: Setting up, running, testing or verifying the acme internal tools repo
---
- Node 22+. `npm install && npm run setup` (migrate + deterministic seed, no env vars needed), then `npm run dev` -> http://localhost:3000.
- Sign in with the demo user picker at `/login` (stand-in for Entra SSO). Useful personas: Priya (agent), Elena (Refunds approver + admin, ≤$5k), Sam (finance, payouts), Grace/Diego (compliance), Jordan (auditor, `/audit`), Chris (no access).
- `npm run db:reset` replaces the SQLite file; restart `npm run dev` afterwards (the running server keeps the old file open).
- Before opening a PR: `npm run typecheck && npm run lint && npm test && npm run db:reset`.
- `web/src/conformance.test.ts` fails if an app skips `requirePermission`, `requirePageAccess` or `audit`.
