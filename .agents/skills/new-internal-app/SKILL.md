---
name: new-internal-app
description: Build a new internal tool (queue, dashboard, admin panel) on the Acme internal tools platform. Use when asked to add an app under web/src/app/apps.
---

Follow `devin/playbooks/new-internal-app.md` exactly, and the rules in `AGENTS.md`.
The finished app must pass `npm run typecheck && npm run lint && npm test` and `npm run db:reset`.
