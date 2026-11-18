import Link from "next/link";
import { fintechPrimitives, powerAppsPrimitives, type PrimitiveInfo } from "@acme/platform/catalog";
import { LinkButton } from "@acme/platform/ui";
import { PrimitiveDiagram, type PrimitiveGroup } from "@/components/primitive-diagram";
import { Shell } from "@/components/shell";
import { platform } from "@/platform";

const all = [...powerAppsPrimitives, ...fintechPrimitives];
const pick = (...names: string[]): PrimitiveInfo[] => names.map((n) => all.find((p) => p.name === n)).filter((p): p is PrimitiveInfo => !!p);

const groups: PrimitiveGroup[] = [
  { key: "access", title: "Access & admin", blurb: "Entra groups → roles → permissions", items: pick("Identity & SSO", "Groups, roles, permissions", "Row-level security", "Segregation of duties", "App admin view") },
  { key: "audit", title: "Audit trail", blurb: "Every change logged, tamper-evident", items: pick("Tamper-evident audit log") },
  { key: "approvals", title: "Approvals", blurb: "Maker-checker and amount limits", items: pick("Workflows & approvals", "Maker-checker", "Approval limits") },
  { key: "pii", title: "PII protection", blurb: "Masked by default, audited reveal", items: pick("PII masking & break-glass") },
  { key: "money", title: "Money & payouts", blurb: "Integer cents, run-once payouts", items: pick("Money safety", "Idempotent side effects") },
  { key: "connectors", title: "Connectors", blurb: "SharePoint documents, payment processor", items: pick("SharePoint documents", "Payment connector") },
  { key: "ui", title: "UI kit", blurb: "Tables, forms, app shell", items: pick("Data tables", "Forms & business rules", "Shell & theme", "App registry & launcher") },
  { key: "delivery", title: "Guardrails & delivery", blurb: "CI checks, PR review, migrations", items: pick("Guardrails in CI", "ALM") },
];

const steps = [
  { title: "Brief", text: "An engineer describes the tool in a paragraph." },
  { title: "Devin builds", text: "Builds on the shared primitives; writes only what's unique to the app." },
  { title: "CI checks", text: "Fails the build if access checks or audit are missing." },
  { title: "Review & ship", text: "Human approves the PR; access comes from Entra." },
];

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-2 text-muted">
      <span className="text-[11px] uppercase tracking-wider">{label}</span>
      <span className="text-lg leading-none">↓</span>
    </div>
  );
}

export default function Home() {
  const apps = platform.apps.filter((a) => a.href.startsWith("/apps/"));
  return (
    <Shell>
      <div className="mx-auto max-w-4xl py-4">
        <header className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Shared Primitives Platform</h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            A library of reusable modules that every internal tool is built from. Sign-in, permissions, audit, approvals and PII handling are written and reviewed once, so engineers only build what is unique to each app.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <LinkButton href="/apps">Open apps</LinkButton>
            <LinkButton href="/primitives" variant="secondary">
              All primitives
            </LinkButton>
          </div>
        </header>

        <section className="mt-14">
          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-brand-900">Shared primitives</h2>
              <span className="text-xs text-muted">Click a group for details</span>
            </div>
            <PrimitiveDiagram groups={groups} />
          </div>

          <Arrow label="imported by" />

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold">Internal apps</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {apps.map((a) => (
                <Link key={a.key} href={a.href} className="rounded-lg border border-line px-4 py-3 transition hover:border-brand-500">
                  <div className="text-sm font-semibold">{a.name}</div>
                  <div className="font-mono text-xs text-muted">{a.href}</div>
                </Link>
              ))}
              <div className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-muted">+ 10 planned</div>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-center text-lg font-semibold">How a new app gets built</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="text-center">
                <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">{i + 1}</span>
                <div className="mt-2 text-sm font-semibold">{s.title}</div>
                <p className="mt-1 text-xs text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-center text-sm">
            <Link href="/devin" className="text-brand-700 hover:underline">
              See the Devin playbook, knowledge and maintenance bots →
            </Link>
          </p>
        </section>
      </div>
    </Shell>
  );
}
