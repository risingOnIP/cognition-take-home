import { fintechPrimitives, powerAppsPrimitives } from "@acme/platform/catalog";
import { Card, LinkButton, PageHeader } from "@acme/platform/ui";
import { Markdown } from "@/components/markdown";
import { PrimitiveTable, Section } from "@/components/overview";
import { Shell } from "@/components/shell";
import { readDoc, readDocs } from "@/lib/repo-docs";

const sections = [
  ["architecture", "Architecture"],
  ["flow", "Building an app"],
  ["strategy", "Strategy"],
  ["primitives", "Power Apps primitives"],
  ["fintech", "Fintech controls"],
  ["devin", "Devin assets"],
] as const;

const layers = [
  { name: "Apps", path: "web/src/app/apps/<slug>/", items: ["manifest.ts", "_lib/schema · workflow · service · actions", "pages"], tone: "border-brand-500 bg-brand-50" },
  { name: "Host", path: "web/", items: ["Next.js app shell", "/login (Entra stand-in)", "/admin (groups, roles, audit)", "migrations + seed"], tone: "border-slate-300 bg-white" },
  { name: "@acme/platform", path: "platform/src/", items: ["auth · rbac · registry", "audit · workflow · pii · money", "idempotency · connectors", "forms · ui"], tone: "border-slate-300 bg-slate-50" },
  { name: "Data & identity", path: "SQLite (Drizzle) · Entra ID", items: ["users / groups (Entra object IDs)", "group → role grants", "append-only audit_events"], tone: "border-slate-300 bg-slate-100" },
];

const flow = [
  { step: "Brief", who: "Engineer", detail: "One paragraph: users, records, statuses, who approves what." },
  { step: "Devin session", who: "Devin + new-internal-app playbook", detail: "Reads AGENTS.md and knowledge; runs npm run new-app -- <slug>." },
  { step: "Declare", who: "Devin", detail: "manifest.ts (permissions, roles, SoD), schema.ts, workflow.ts." },
  { step: "Compose", who: "Devin", detail: "Service + pages from platform primitives: rbac, audit, workflow, pii, DataTable, SchemaForm." },
  { step: "Guardrails", who: "CI", detail: "Typecheck, tests, conformance test (requirePermission, requirePageAccess, audit)." },
  { step: "Review", who: "Devin Review + human", detail: "PR checked against fintech guardrails, then merged." },
  { step: "Live", who: "Entra groups", detail: "Appears in /apps for the groups mapped to its roles; every action audited." },
];

export default function Home() {
  const knowledge = readDocs("devin/knowledge");
  const playbooks = readDocs("devin/playbooks");
  const bots = readDocs("devin/bots");
  return (
    <Shell>
      <PageHeader
        title="Acme internal tools platform"
        description="Shared primitives for building governed internal tools in code: identity, access, audit, approvals, PII and money handled once, so each new app is small."
        actions={<LinkButton href="/apps">Open apps →</LinkButton>}
      />
      <nav className="flex flex-wrap gap-2 border-b border-line pb-4">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-slate-700 hover:border-brand-500 hover:text-brand-700">
            {label}
          </a>
        ))}
      </nav>

      <Section id="architecture" title="Architecture" intro="Apps depend only on the platform. The platform owns every control that must be identical across apps.">
        <div className="mx-auto max-w-3xl space-y-2">
          {layers.map((l, i) => (
            <div key={l.name}>
              <div className={`rounded-lg border-2 p-4 ${l.tone}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{l.name}</span>
                  <code className="text-xs text-muted">{l.path}</code>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {l.items.map((it) => (
                    <span key={it} className="rounded border border-line bg-white px-2 py-0.5 text-xs text-slate-700">
                      {it}
                    </span>
                  ))}
                </div>
              </div>
              {i < layers.length - 1 && <div className="py-0.5 text-center text-sm text-muted">↓ imports / uses</div>}
            </div>
          ))}
        </div>
      </Section>

      <Section id="flow" title="Building an app with Devin" intro="How a new internal tool goes from idea to live. Steps 2–4 are one Devin session.">
        <ol className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          {flow.map((f, i) => (
            <li key={f.step} className="relative rounded-lg border border-line bg-surface p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
                <span className="text-sm font-semibold">{f.step}</span>
              </div>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-brand-700">{f.who}</p>
              <p className="mt-1 text-xs text-slate-700">{f.detail}</p>
              {i < flow.length - 1 && <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-muted xl:block">→</span>}
            </li>
          ))}
        </ol>
        <Card className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">What an app writes vs. what it gets for free</p>
          <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs leading-5 text-slate-100">{`// apps/<slug>/_lib/service.ts
export function approve(db, user, id, reason) {
  const item = getItem(db, user, id);            // row-level scope → 404 if not yours
  const to = workflow.apply("approve", item, user, reason); // permission, maker-checker, reason
  db.transaction((tx) => {
    tx.update(items).set({ status: to }) ...;
    audit(tx, { actorId: user.id, action: "item.approve", before, after, reason }); // hash-chained
  });
}`}</pre>
        </Card>
      </Section>

      <Section id="strategy" title="Strategy">
        <Card>
          <Markdown>{readDoc("docs/STRATEGY.md")}</Markdown>
        </Card>
      </Section>

      <Section id="primitives" title="Power Apps primitives" intro="The Power Apps / Power Platform capabilities this team relies on, rebuilt as small typed modules.">
        <PrimitiveTable rows={powerAppsPrimitives} />
      </Section>

      <Section id="fintech" title="Fintech controls" intro="Controls a regulated team needs that Power Apps leaves to each app builder. Here they are platform defaults.">
        <PrimitiveTable rows={fintechPrimitives} />
      </Section>

      <Section id="devin" title="Devin assets" intro="Rendered from the devin/ folder. The repo is the source of truth; these are synced into the Devin org.">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Knowledge">
            <p className="mb-3 text-xs text-muted">Rules Devin retrieves automatically when the trigger matches.</p>
            <div className="space-y-2">
              {knowledge.map((k) => (
                <details key={k.file} className="rounded border border-line px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium capitalize">{k.title}</summary>
                  {k.meta.trigger && <p className="mt-2 text-xs text-muted">Trigger: {k.meta.trigger}</p>}
                  <div className="mt-2">
                    <Markdown>{k.body}</Markdown>
                  </div>
                </details>
              ))}
            </div>
          </Card>
          <Card title="Playbooks" className="lg:col-span-2">
            <p className="mb-3 text-xs text-muted">Step-by-step procedures. Start a session with the playbook and a one-paragraph brief.</p>
            <div className="space-y-2">
              {playbooks.map((p) => (
                <details key={p.file} className="rounded border border-line px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium">{p.title}</summary>
                  <div className="mt-2">
                    <Markdown>{p.body}</Markdown>
                  </div>
                </details>
              ))}
            </div>
          </Card>
        </div>
        <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-muted">Maintenance bots</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {bots.map((b) => (
            <Card key={b.file} title={b.title.replace(/^Bot:\s*/, "")}>
              <Markdown>{b.body}</Markdown>
            </Card>
          ))}
        </div>
      </Section>
    </Shell>
  );
}
