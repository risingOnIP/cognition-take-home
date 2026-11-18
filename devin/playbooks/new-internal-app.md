# Playbook: build a new internal app

**Use when:** asked to build a new internal tool (queue, dashboard, admin panel) on the Acme internal tools platform.

## Inputs to confirm (ask only if missing)
- What the app does, who uses it, and which Entra groups get which role.
- The records involved, their statuses and transitions, and who may perform each transition.
- Any money, PII or approval-limit requirements.

## Procedure
1. Read `AGENTS.md` and `devin/knowledge/*.md`. Look at `web/src/app/apps/refunds/` as the reference app.
2. `npm install && npm run setup`, then create a branch.
3. Scaffold: `npm run new-app -- <key> "<Name>"`.
4. `manifest.ts`: declare permissions (`<key>.<verb>`), roles (`<key>.<role>`) and any `sodConflicts`.
5. `_lib/schema.ts`: tables prefixed with the app key. Money is `integer` minor units. Store the maker in `createdBy`.
6. `_lib/workflow.ts`: model statuses and transitions with `defineWorkflow`. Use `makerChecker` for approvals, `requireReason` for rejections/escalations, and `approvalTier` for amount limits.
7. `_lib/service.ts`: plain functions `(db, user, …)`. Each starts with `assertCan`. Each write uses `db.transaction` + `audit(tx, …)`. Apply row-level scope for lists. Mask PII with `maskPii`.
8. `_lib/actions.ts`: thin `"use server"` wrappers. The first line is `await requirePermission(...)`, then `parseForm(schema, formData)` and the service call, then `revalidatePath`.
9. Pages: list (`DataTable` + `Stat`s), detail (`DescriptionList`, `MaskedValue`, `WorkflowActions`, `AuditTimeline`), create form (`SchemaForm`). Each page calls `requirePageAccess`.
10. `_lib/seed.ts`: map existing directory groups (see `web/scripts/seed-directory.ts`) to the new roles in `group_roles`, and insert 15–30 deterministic records covering every status. Use a fixed-seed PRNG, never `Math.random`.
11. Migration: `npm run db:generate -- --name <key>`, then `npm run db:reset`.
12. Tests: `_lib/service.test.ts` using `createTestDb(schema)` / `createTestUser` from `@acme/platform/testing`. Cover permissions, maker-checker, row scope and the audit trail.
13. Verify: `npm run typecheck && npm run lint && npm test`. Then run `npm run dev` and click through the app as two personas (maker and checker).
14. Open a PR with a short description and screenshots. Do not modify `platform/`; list any missing primitive as a follow-up.

## Done when
- The app shows in the launcher only for the intended groups, and the CI conformance tests pass.
- Every state change appears in `/security/audit` and the app's admin Activity tab and the hash chain verifies.
