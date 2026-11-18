# Build log

Wall-clock time and Devin usage for each part. This is the evidence behind the "cost per additional app" estimate.
The numbers live in `docs/build-metrics.json` and are rendered on the `/apps` overview page.

## Notes per build

### 1. Platform + Refunds
Built first, together, on purpose: the primitives were extracted from a real app instead of designed in the abstract.

### 2. KYC review queue
Built by a fresh Devin session that only had the repo, `devin/playbooks/new-internal-app.md`, `devin/knowledge/` and a one-paragraph brief ([PR #3](https://github.com/risingOnIP/cognition-take-home/pull/3)). 4 minutes from start to PR (17:07 to 17:11 EST) with tests and screenshots, about 9 minutes to green CI, no `platform/` changes, no human input. An earlier run (PR #2) was discarded because the platform and rules changed after it.

Friction it reported, now folded back into the playbook/knowledge: maker other than the creator (escalations), no shared SLA helper, `Date.now()` lint rule in pages, restarting the dev server after `db:reset`.
