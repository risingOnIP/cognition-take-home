# Playbook: add or change a platform primitive

**Use when:** two or more apps need the same capability, or a security/compliance rule must apply to every app.

1. Write the use cases from at least two apps in the PR description. Don't generalize from one app.
2. Add the module under `platform/src/<name>/` with an `index.ts`, and export it in `platform/package.json` `exports`.
3. Keep it framework-light: pure functions taking `(db, user, …)`. Only `src/index.ts` and `src/auth` may touch Next APIs. React components go in `src/ui`.
4. Add unit tests next to the code (`*.test.ts`, using `@acme/platform/testing`).
5. If the rule must hold for every app, add a check to `web/src/conformance.test.ts`.
6. Update `AGENTS.md`, `devin/knowledge/` and the README primitives table.
7. Run `npm run typecheck && npm run lint && npm test`. Changes to `platform/` need review from Platform Engineering (CODEOWNERS).
