---
trigger: Working in the acme internal tools repo (platform/ or web/), building or changing an internal app
---
- `platform/` is the `@acme/platform` package: auth (identity providers), rbac, registry, audit, workflow, pii, money, idempotency, connectors, forms, ui. It contains no app-specific code.
- `web/` is the single Next.js host. Apps live in `web/src/app/apps/<key>/` and are registered in `web/src/apps.ts`.
- `web/src/platform.ts` is the only place the platform is configured (identity provider, connectors). Apps import helpers from `@/platform`.
- Access model: Entra security group -> role (declared in the app manifest) -> permissions. Group -> role assignments are rows in `group_roles`, seeded per app and managed in `/admin`.
- DB is SQLite via Drizzle. One migration history in `web/drizzle/`. Regenerate with `npm run db:generate -- --name <x>`. Never edit generated SQL except custom migrations.
- Seeds are deterministic (fixed PRNG); `npm run db:reset` rebuilds the DB from scratch.
