# Acme internal tools platform (Power Apps replacement prototype)

A proof of concept for a ~60-engineer fintech that runs a KYC queue, a refunds dashboard and a feature-flag panel on
Microsoft Power Apps and plans 10+ more internal tools. It tests one question: **if engineers build these tools in code
with Devin, can each new app be cheap to build and still governed as well as Power Apps?**

It has two parts:

- **`platform/`** (`@acme/platform`): the shared primitives every app uses: identity, groups/roles, audit, approvals, PII, money, UI.
- **`web/`**: one Next.js host. Each internal app is a folder in `web/src/app/apps/<key>/` built only from platform primitives.
- **`devin/`**: the knowledge, playbooks and maintenance bots that let Devin build and maintain app #N consistently.

## Run it

Requires Node 22+. No env vars, secrets or external services.

```bash
npm install
npm run setup      # creates data/app.db, runs migrations, seeds deterministic demo data
npm run dev        # http://localhost:3000
```

`npm run db:reset` restores the demo data at any time. The database is gitignored; everyone gets the same data from the seed.

Sign in at `/login` with the user picker (the stand-in for Entra SSO). Suggested walkthrough:

| Persona | Groups | Try |
|---|---|---|
| Priya Shah (agent) | sg-refunds-agents | Raise a refund. Sees only her own refunds. |
| Marcus Lee (team lead) | sg-refunds-leads | Approve ≤ $500. Can't approve a $1,200 refund or his own request. |
| Elena Rossi (payments manager) | sg-payments-managers | Approve ≤ $5,000. Reveal a customer email (asks for a reason, audited). |
| Sam Okafor (finance ops) | sg-finance-ops | Approve any amount, execute payouts through the mock processor. |
| Alex Morgan (platform admin) | sg-platform-admins | `/admin`: group → role mapping, SoD violations, audit log + chain verification. |
| Chris Park (engineer) | none | Sees no apps; direct URLs redirect to `/forbidden`. |

Taylor Nguyen is deliberately in both the agents and finance groups so `/admin` shows a segregation-of-duties violation.

## What the platform provides

**Power Apps capabilities, rebuilt as code**

| Power Apps / Power Platform | Here |
|---|---|
| Entra ID sign-in, security groups | `@acme/platform/auth`: `IdentityProvider` interface; demo cookie provider; `entraIdentityProvider` + `syncEntraClaims` adapter (users/groups keyed by Entra object ID) |
| Dataverse security roles | `@acme/platform/rbac`: Entra group → role → permission; `can`, `assertCan`, `requirePermission` (server-enforced) |
| Dataverse row-level security | `rowScope()`; out-of-scope records 404 |
| App catalog / admin center | `@acme/platform/registry`: app manifests drive the launcher, nav, role catalog and `/admin` |
| Galleries, Excel export | `DataTable`: search, filters, sort, paging, CSV export |
| Forms + business rules | `SchemaForm` + Zod (`@acme/platform/forms`), validated on the server |
| Power Automate approvals | `@acme/platform/workflow`: state machine with permissions, required reasons, tiered limits |
| Connectors | `@acme/platform/connectors`: typed interface; mock payment processor |
| Themes | `@acme/platform/ui` + `theme.css`: shared shell and tokens |
| Solutions / ALM | Git, PRs, CI, migrations (better than Power Apps here) |

**Fintech controls**

| Control | Here |
|---|---|
| Tamper-evident audit trail | `audit()` writes in the same transaction as the change; SHA-256 hash chain; DB triggers make `audit_events` append-only; `verifyAuditChain()` |
| Maker-checker (four eyes) | `makerChecker: true` on workflow transitions |
| Approval limits | `approvalTier()` + tiered permissions |
| Segregation of duties | `sodConflicts` in manifests; `/admin` blocks conflicting grants and lists violations |
| PII masking, break-glass reveal | `maskPii()` on the server; `revealPii()` needs permission + reason and is audited |
| Money safety | Integer minor units, `parseMoneyToMinor`/`formatMoney`; `runIdempotent()` on payouts |
| Guardrails in CI | `web/src/conformance.test.ts` fails if an app skips `requirePermission`, `requirePageAccess` or `audit`, or uses floats for money |

## Apps

| App | Route | What it shows |
|---|---|---|
| Refunds | `/apps/refunds` | Tiered approval (≤$500 lead, ≤$5k manager, above that finance), maker-checker, row-level security, PII reveal, idempotent payouts via a connector, full audit history |
| KYC review | `/apps/kyc` | Built by a separate Devin session from the playbook. See `docs/BUILD_LOG.md` |

## Adding an app

```bash
npm run new-app -- chargebacks "Chargebacks"   # scaffolds web/src/app/apps/chargebacks and registers it
```

Then follow `devin/playbooks/new-internal-app.md`, or give Devin the same playbook (`!new-internal-app …`).

## Devin assets

- `AGENTS.md` and `.agents/skills/`: picked up automatically by Devin sessions in this repo.
- `devin/knowledge/`: architecture, fintech guardrails, commands. Load into Devin Knowledge.
- `devin/playbooks/`: new internal app; add a platform primitive.
- `devin/bots/`: weekly dependency/security sweep, PR guardrail review, docs sync, quarterly access review.

## Repo layout

```
platform/src/   auth rbac registry audit workflow pii money idempotency connectors forms ui db testing
web/src/app/    page.tsx (launcher)  login/  admin/  apps/<key>/{manifest.ts,_lib/,page.tsx,…}
web/drizzle/    SQL migrations (one history for platform + app tables)
web/scripts/    migrate, seed, reset, new-app (+ templates)
devin/          knowledge/ playbooks/ bots/
```

## Checks

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Not in this prototype (deliberately)

Real Entra OIDC login (adapter is there, no tenant), Postgres (Drizzle makes the switch mostly a driver change),
notifications/Teams, the feature-flag app, usage analytics, mobile/offline, and deployment/hosting.

## Optional: connect SharePoint

Supporting documents on a refund come from a `DocumentStore` (`@acme/platform/connectors`). With no configuration the demo uses a seeded in-memory library. To use a real SharePoint document library, register an Entra app with the Graph `Sites.Selected` (or `Files.ReadWrite.All`) application permission and set:

```bash
SHAREPOINT_TENANT_ID=...  SHAREPOINT_CLIENT_ID=...  SHAREPOINT_CLIENT_SECRET=...  SHAREPOINT_SITE_ID=...  # SHAREPOINT_DRIVE_ID optional
```

Files are read from `refunds/<refund id>/` in that library.
