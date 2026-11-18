**Platform once, apps cheaply.** Everything that must be right for every app (identity, access, audit, approvals, PII, money) lives in `@acme/platform` and is owned by a small platform team. An app is a thin folder that declares its permissions and roles, its data and its workflow, and composes platform components.

**Guardrails are code, not reviews.** Server actions must call `requirePermission`, pages must call `requirePageAccess`, writes must call `audit` in the same transaction. A conformance test fails CI when an app doesn't, regardless of whether a person or Devin wrote it.

**Devin builds and maintains apps from a playbook.** The repo carries its own instructions: `AGENTS.md`, knowledge, a `new-internal-app` playbook and a scaffold. A new app is one Devin session with a short brief. Maintenance bots handle dependency and security updates, guardrail review on PRs, docs sync and quarterly access reviews.

**Access still comes from Entra.** Users and groups are keyed by Entra object ID; groups map to app roles. Joiners and leavers are handled where they already are.
