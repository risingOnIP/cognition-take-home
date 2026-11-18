---
trigger: Adding roles or permissions, building an admin page, or changing who can access an app
---
- Access is granted to Entra groups, never to individuals: user -> group (Entra) -> role (`group_roles`) -> permissions (manifest).
- Keep roles minimal: 2–3 per app (e.g. user, approver/lead, admin via the approver role). Add a role only when a real control (approval limit, SoD) needs it.
- Every app declares an `<key>.admin` permission and gets `/apps/<key>/admin` from the scaffold: `AppAdminView` with Access and Activity tabs. Give `.admin` to the app owner's role only.
- Role -> group grants are changed in each app's admin page (`/apps/<key>/admin`, permission `<key>.admin`) via `changeAppRole`, require a ticket/reason, are audited, and are blocked if they would create a segregation-of-duties conflict.
- Declare conflicting roles in the manifest's `sodConflicts`. The platform blocks conflicting grants; conflicts can still arise from Entra membership changes, so `/security` and each app's admin tab show any detected conflict.
- Audit: app admins see their app's activity in the admin Activity tab; the platform-wide `/audit` log is only for groups mapped to `platform.auditor` (internal audit), not engineers by default.
- Authorization is real code today; only sign-in is simulated. Going live = swap `demoIdentityProvider` for `entraIdentityProvider` in `web/src/platform.ts`.
