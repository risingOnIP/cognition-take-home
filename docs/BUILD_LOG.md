# Build log

Wall-clock time and Devin usage for each part. This is the evidence behind the "cost per additional app" estimate.
The numbers live in `docs/build-metrics.json` and are rendered on the `/apps` overview page.

## Notes per build

### 1. Platform + Refunds
Built first, together, on purpose: the primitives were extracted from a real app instead of designed in the abstract.

### 2. KYC review queue
Built by a separate Devin session that only had the repo, `devin/playbooks/new-internal-app.md` and a one-paragraph brief.
