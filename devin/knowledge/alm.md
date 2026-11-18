---
trigger: Shipping a change, adding a migration, or promoting to production
---
- Every change is a PR: CI runs typecheck, lint, tests (including `conformance.test.ts`) and a production build. No editing in production.
- Schema changes ship as a Drizzle migration in `web/drizzle/`, generated with `npm run db:generate`, never hand-edited after merge.
- Changes to `platform/`, `conformance.test.ts` or migrations need a CODEOWNERS (platform team) review.
- Devin Review runs on every PR against `fintech-guardrails.md`; resolve or explicitly reject each finding.
