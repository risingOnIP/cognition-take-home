# Acme internal tools platform (Power Apps replacement prototype)

A proof of concept for a ~60-engineer fintech that runs a KYC queue, a refunds dashboard and a feature-flag panel on
Microsoft Power Apps and plans 10+ more internal tools. It tests one question: **if engineers build these tools in code
with Devin, can each new app be cheap to build and still governed as well as Power Apps?**

There is a **platform** that makes every future app quick and consistent to build, and a **demo web app** that hosts the apps built on it.

| Folder | What it is |
|---|---|
| `platform/` | The shared primitives (`@acme/platform`): Entra identity, group → role → permission checks, audit log, approvals, PII masking, money, connectors, UI kit. Imported by every app. |
| `web/` | The demo: one Next.js app with the platform portal and every internal app at `/apps/<key>`. Everything you run lives here, including its database (`web/data/`), migrations (`web/drizzle/`) and scripts (`web/scripts/`). |
| `devin/` | What Devin follows to build and maintain apps: `knowledge/` (rules), `playbooks/` (procedures), `bots/` (scheduled maintenance). |
| `docs/` | Build log and metrics (how long each app took), and the strategy note. |

Hidden: `.agents/skills/` (Devin skill for new apps) and `.github/` (CI, CODEOWNERS). `AGENTS.md` holds the rules every app follows.

## Run it

**Minimum Node version: 22.13** (latest Node 22 LTS recommended). Check with `node -v`. `npm install`, `npm run setup` and `npm run dev` stop with a clear message if Node is older. To update:

- Windows: download the LTS installer from https://nodejs.org
- macOS/Linux with nvm: `nvm install` (reads `.nvmrc`)

**Run every command from the `web/` folder.** No env vars, secrets or external services.

```bash
cd web
npm install        # installs web + platform (npm workspaces)
npm run setup      # creates web/data/app.db, runs migrations, seeds deterministic demo data
npm run dev        # http://localhost:3000
```

`npm run db:reset` (also from `web/`) restores the demo data at any time; restart `npm run dev` afterwards. The database is gitignored; everyone gets the same data from the seed.

**Windows:** clone outside OneDrive (OneDrive locks `node_modules` and causes `EPERM` errors). `better-sqlite3` downloads a prebuilt binary for supported Node versions; if `npm install` falls back to `node-gyp rebuild` and fails with "Could not find any Visual Studio installation", either update to the latest Node 22 LTS and retry, or install Visual Studio Build Tools with the "Desktop development with C++" workload. Then delete `node_modules` and run `npm install` again.

Sign in at `/login` with the user picker (the stand-in for Entra SSO). Suggested walkthrough:

| Persona | Groups | Try |
|---|---|---|
| Priya Shah (agent) | sg-support | Raise a refund. Sees only her own refunds. |
| Elena Rossi (approver) | sg-payments | Approve ≤ $5,000, reveal a customer email (reason required, audited). Opens `/apps/refunds/admin` to map Entra groups to Refunds roles. |
| Sam Okafor (finance) | sg-finance | Approve above $5,000, execute payouts through the mock processor. |
| Grace Kim / Diego Alvarez (compliance) | sg-compliance / sg-compliance-leads | `/apps/kyc`: Grace sees only her assigned cases; Diego sees all, reassigns, signs off high-risk cases and administers the app. |
| Jordan Blake (internal audit) | sg-internal-audit | `/audit`: platform-wide audit log + chain verification. |
| Avery Demo (superuser) | sg-demo-superusers | Every app: Refunds approver + finance, KYC lead, auditor. Can't raise refunds (SoD). |
| Chris Park (engineer) | sg-engineering | Sees no apps; direct URLs redirect to `/forbidden`. |

Groups stand in for the company's existing Entra ID groups. Each app's admin maps groups to that app's roles; the platform blocks mappings that break segregation of duties.

**Hosting** is not decided and nothing here depends on a specific host: it is a standard Next.js app plus a database, deployable to Azure App Service, AWS, Vercel or Kubernetes. SQLite is for the demo; production would use Postgres or Azure SQL.

## What the platform provides

**Power Apps capabilities, rebuilt as code**

| Power Apps / Power Platform | Here |
|---|---|
| Entra ID sign-in, security groups | `@acme/platform/auth`: `IdentityProvider` interface; demo cookie provider; `entraIdentityProvider` + `syncEntraClaims` adapter (users/groups keyed by Entra object ID) |
| Dataverse security roles | `@acme/platform/rbac`: Entra group → role → permission; `can`, `assertCan`, `requirePermission` (server-enforced) |
| Dataverse row-level security | `rowScope()`; out-of-scope records 404 |
| App catalog / admin center | `@acme/platform/registry`: app manifests drive the launcher, nav, role catalog and each app's `/apps/<key>/admin` |
| Galleries, Excel export | `DataTable`: search, filters, sort, paging, CSV export |
| Forms + business rules | `SchemaForm` + Zod (`@acme/platform/forms`), validated on the server |
| Power Automate approvals | `@acme/platform/workflow`: state machine with permissions, required reasons, tiered limits |
| Connectors | `@acme/platform/connectors`: typed interface; mock payment processor; SharePoint documents via Microsoft Graph (mock without credentials) |
| Themes | `@acme/platform/ui` + `theme.css`: shared shell and tokens |
| Solutions / ALM | Git, PRs, CI, migrations (better than Power Apps here) |

**Fintech controls**

| Control | Here |
|---|---|
| Tamper-evident audit trail | `audit()` writes in the same transaction as the change; SHA-256 hash chain; DB triggers make `audit_events` append-only; `verifyAuditChain()` |
| Maker-checker (four eyes) | `makerChecker: true` on workflow transitions |
| Approval limits | `approvalTier()` + tiered permissions |
| Segregation of duties | `sodConflicts` in manifests; app admin pages block conflicting grants and list any violations from Entra membership |
| PII masking, break-glass reveal | `maskPii()` on the server; `revealPii()` needs permission + reason and is audited |
| Money safety | Integer minor units, `parseMoneyToMinor`/`formatMoney`; `runIdempotent()` on payouts |
| Guardrails in CI | `web/src/conformance.test.ts` fails if an app skips `requirePermission`, `requirePageAccess` or `audit`, or uses floats for money |

## Apps

| App | Route | What it shows |
|---|---|---|
| Refunds | `/apps/refunds` | Tiered approval (≤$5k approver, above that finance), maker-checker, row-level security, PII reveal, idempotent payouts via a connector, full audit history |
| KYC review | `/apps/kyc` | Analyst/lead queue, SLA breaches, masked PII with audited reveal, lead sign-off for high risk, maker-checker on escalations. Built in 4 min by a fresh Devin session from the playbook ([PR #3](https://github.com/risingOnIP/cognition-take-home/pull/3)); see `docs/BUILD_LOG.md` |

## Adding an app

```bash
cd web
npm run new-app -- chargebacks "Chargebacks"   # scaffolds web/src/app/apps/chargebacks and registers it
```

Then follow `devin/playbooks/new-internal-app.md`, or ask Devin to build the app with a one-paragraph brief; it picks up the `new-internal-app` skill in `.agents/skills/` and the playbook.

## Devin assets

- `AGENTS.md` and `.agents/skills/`: picked up automatically by Devin sessions in this repo.
- `devin/knowledge/`: architecture, fintech guardrails, access management, UI conventions, ALM, repo commands. Load into Devin Knowledge.
- `devin/playbooks/`: new internal app; add a platform primitive; add a maintenance bot.
- `devin/bots/`: weekly dependency/security sweep, PR guardrail review, docs sync, quarterly access review. Onboarding: `devin/playbooks/add-maintenance-bot.md`, listed at `/bots`.

## Checks

CI runs these from the repo root, where they cover both `platform/` and `web/`:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Not in this prototype (deliberately)

Real Entra OIDC login (adapter is there, no tenant), Postgres (switch the Drizzle dialect and regenerate migrations),
notifications/Teams, the feature-flag app, usage analytics, mobile/offline, and deployment/hosting. The home page's "Delta from prototype to real world" section lists what changes for each.

## Optional: connect SharePoint

Supporting documents on a refund come from a `DocumentStore` (`@acme/platform/connectors`). With no configuration the demo uses a seeded in-memory library. To use a real SharePoint document library, register an Entra app with the Graph `Sites.Selected` (or `Files.ReadWrite.All`) application permission and set:

```bash
SHAREPOINT_TENANT_ID=...  SHAREPOINT_CLIENT_ID=...  SHAREPOINT_CLIENT_SECRET=...  SHAREPOINT_SITE_ID=...  # SHAREPOINT_DRIVE_ID optional
```

Files are read from `refunds/<refund id>/` in that library.
