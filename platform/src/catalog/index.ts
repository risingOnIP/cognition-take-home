/** Self-description of the platform: what each primitive is, how to import it, and what it replaces. */
export interface PrimitiveInfo {
  name: string;
  module: string;
  exports: string[];
  replaces: string;
  what: string;
}

export const powerAppsPrimitives: PrimitiveInfo[] = [
  { name: "Identity & SSO", module: "@acme/platform/auth", exports: ["IdentityProvider", "demoIdentityProvider", "entraIdentityProvider", "syncEntraClaims"], replaces: "Entra ID sign-in", what: "Pluggable identity. Users and groups are keyed by Entra object ID; the demo provider is a sign-in-as picker." },
  { name: "Groups, roles, permissions", module: "@acme/platform/rbac", exports: ["loadUser", "can", "assertCan", "requirePermission"], replaces: "Dataverse security roles + Entra security groups", what: "Entra group → role → permission. Roles are declared per app; grants are data managed in /admin." },
  { name: "Row-level security", module: "@acme/platform/rbac", exports: ["rowScope"], replaces: "Dataverse record ownership / business units", what: "Lists are scoped to the user's own records unless they hold a view-all permission; out-of-scope records return 404." },
  { name: "App registry & launcher", module: "@acme/platform/registry", exports: ["defineApp", "buildRoleCatalog"], replaces: "Power Platform admin center app catalog", what: "Each app is a typed manifest (owner, route, permissions, roles). Launcher, nav and role catalog are generated from it." },
  { name: "Data tables", module: "@acme/platform/ui", exports: ["DataTable"], replaces: "Galleries + Export to Excel", what: "Search, column filters, sorting, paging and CSV export." },
  { name: "Forms & business rules", module: "@acme/platform/forms", exports: ["parseForm", "SchemaForm"], replaces: "Power Apps forms + business rules", what: "Declarative fields rendered by SchemaForm; Zod validation runs on the server." },
  { name: "Workflows & approvals", module: "@acme/platform/workflow", exports: ["defineWorkflow", "approvalTier"], replaces: "Power Automate approvals", what: "Typed state machine: allowed transitions, required permission, required reason, maker-checker." },
  { name: "Payment connector", module: "@acme/platform/connectors", exports: ["PaymentProcessor", "createMockPaymentProcessor"], replaces: "Power Platform connectors", what: "Typed adapter for the payment processor. A mock is included; production swaps in Stripe/Adyen in one place." },
  { name: "SharePoint documents", module: "@acme/platform/connectors", exports: ["DocumentStore", "createSharePointDocumentStore", "createMockDocumentStore"], replaces: "SharePoint connector", what: "List and upload files in a SharePoint document library via Microsoft Graph (Entra app registration). Falls back to an in-memory mock when not configured." },
  { name: "App admin view", module: "@acme/platform/admin", exports: ["appAccessSummary", "AppAdminView"], replaces: "Power Platform admin center (per-app sharing and activity)", what: "Every app gets /apps/<slug>/admin with two tabs: Access (which Entra groups grant each role and who is in them) and Activity (the app's audit log, filterable and paginated)." },
  { name: "Shell & theme", module: "@acme/platform/ui", exports: ["AppShell", "Card", "PageHeader", "Badge", "theme.css"], replaces: "Themes / component libraries", what: "Shared layout, nav filtered by permission, identity badge and design tokens." },
];

export const fintechPrimitives: PrimitiveInfo[] = [
  { name: "Tamper-evident audit log", module: "@acme/platform/audit", exports: ["audit", "verifyAuditChain", "listAuditEvents", "AuditLogTable"], replaces: "Dataverse auditing (not tamper-evident)", what: "Written in the same transaction as the change. SHA-256 hash chain; DB triggers block UPDATE/DELETE." },
  { name: "Maker-checker", module: "@acme/platform/workflow", exports: ["makerChecker: true"], replaces: "Custom Power Automate logic", what: "Whoever created a record cannot approve or execute it." },
  { name: "Approval limits", module: "@acme/platform/workflow", exports: ["approvalTier"], replaces: "Custom Power Automate logic", what: "Amount-based authority expressed as tiered permissions, not role names in code." },
  { name: "Segregation of duties", module: "@acme/platform/rbac", exports: ["findSodViolations", "sodViolationsIfGranted"], replaces: "Manual access reviews", what: "Apps declare conflicting roles; /admin blocks conflicting grants and lists existing violations." },
  { name: "PII masking & break-glass", module: "@acme/platform/pii", exports: ["maskPii", "revealPii", "MaskedValue"], replaces: "Column security profiles", what: "Masked on the server before reaching the browser. Reveal needs a permission and a reason, and is audited." },
  { name: "Money safety", module: "@acme/platform/money", exports: ["parseMoneyToMinor", "formatMoney", "moneyField"], replaces: "Currency columns (decimal)", what: "Amounts are integer minor units with a currency. No floats." },
  { name: "Idempotent side effects", module: "@acme/platform/idempotency", exports: ["runIdempotent"], replaces: "None", what: "Payouts and other external calls run once per key, even on double-clicks or retries." },
  { name: "Guardrails in CI", module: "web/src/conformance.test.ts", exports: ["requirePermission", "requirePageAccess", "audit"], replaces: "DLP policies / CoE toolkit", what: "Build fails if an app skips permission checks, page access checks or audit, or uses floats for money." },
];
