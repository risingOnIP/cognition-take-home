# Agent guide (Devin and humans)

Monorepo: `platform/` (`@acme/platform`, shared primitives) and `web/` (Next.js host for every internal app).

## Rules for every internal app
- Lives in `web/src/app/apps/<key>/`: `manifest.ts`, `_lib/{schema,workflow,service,actions,seed}.ts`, pages.
- Start from the scaffold: `npm run new-app -- <key> "<Name>"`. Follow `devin/playbooks/new-internal-app.md`.
- Permissions and roles are declared only in `manifest.ts` (2–3 roles; the owner role holds `<key>.admin`). Initial group -> role mappings go in the app's `seed.ts`; afterwards app admins change them in `/apps/<key>/admin`.
- Every server action begins with `await requirePermission(...)`. Every page calls `requirePageAccess(...)`.
- Business logic goes in `_lib/service.ts` as plain functions `(db, user, ...)`, so it can be unit-tested without Next.
- Every write runs inside `db.transaction` and calls `audit(tx, ...)` in the same transaction.
- Money is integer minor units (`@acme/platform/money`). Never floats.
- PII is masked on the server with `maskPii`; reveal only through `revealPii` (permission + reason + audit).
- Use the `@acme/platform/ui` components; don't add a new UI library.
- Don't edit `platform/` while building an app. If a primitive is missing, follow `devin/playbooks/add-platform-primitive.md` in a separate PR.

## Commands
`npm install && npm run setup` (migrate + seed), `npm run dev`, `npm test`, `npm run typecheck`, `npm run lint`,
`npm run db:generate -- --name <name>` after schema changes, `npm run db:reset` to restore demo data.

`web/src/conformance.test.ts` enforces the rules above in CI.
