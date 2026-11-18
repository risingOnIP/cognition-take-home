# Bot: docs & app catalog sync

- **Type:** Devin Automation, triggered on merge to `main` when `web/src/apps.ts` or any `manifest.ts` changes
- **Repo:** cognition-take-home

**Prompt**
> Regenerate the "Apps" and "Roles" tables in README.md from the app manifests (name, owner, route, roles and their permissions), and update `devin/knowledge/repo-commands.md` personas if seed users changed. Open a PR only if something changed.
