# Bot: weekly dependency & security sweep

- **Type:** Devin Automation, scheduled
- **Schedule:** Mondays 09:00 ET
- **Repo:** cognition-take-home

**Prompt**
> Run `npm audit --omit=dev` and `npm outdated` in the repo. For any high or critical advisory, or a patch/minor update to next, react, drizzle-orm, better-sqlite3 or zod, open one PR that upgrades them. Run `npm run typecheck && npm run lint && npm test && npm run build`. Include the advisory IDs and changelog links in the PR. Never bump a major version; open an issue for it instead. If nothing needs doing, end the session without a PR.
