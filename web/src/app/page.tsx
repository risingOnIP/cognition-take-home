import Link from "next/link";
import { LinkButton } from "@acme/platform/ui";
import { Shell } from "@/components/shell";
import { platform } from "@/platform";

const foundations: { href: string; title: string; what: string; examples: string[]; badge: "Build" | "Maintain" }[] = [
  {
    href: "/primitives",
    title: "Shared primitives",
    what: "Reusable code every app imports, written and reviewed once.",
    examples: ["Entra sign-in & roles", "Audit log", "Maker-checker approvals", "PII masking", "SharePoint connector"],
    badge: "Build",
  },
  {
    href: "/knowledge",
    title: "Knowledge",
    what: "The rules Devin applies automatically in this repo.",
    examples: ["Fintech guardrails", "Access management", "UI conventions"],
    badge: "Build",
  },
  {
    href: "/playbooks",
    title: "Playbooks",
    what: "Step-by-step procedures Devin follows, on demand or on a schedule.",
    examples: ["Build a new internal app", "Add a primitive", "Add a maintenance bot"],
    badge: "Build",
  },
  {
    href: "/bots",
    title: "Bots",
    what: "Scheduled Devin sessions that keep apps and the platform maintained.",
    examples: ["Weekly dependency & security sweep", "PR guardrail review", "Quarterly access review"],
    badge: "Maintain",
  },
];

const steps = [
  { title: "Brief", text: "An engineer describes the tool in a paragraph." },
  { title: "Devin builds", text: "Follows the playbook, imports the primitives, writes only what's unique to the app." },
  { title: "Review & ship", text: "CI runs the checks, a human approves the PR, and the app's admin maps Entra groups to its roles." },
  { title: "Maintain with Devin bots", text: "Scheduled bots patch dependencies, review every PR against the guardrails and run quarterly access reviews." },
];

const powerAppsTradeoffs = [
  { feature: "Mobile app for everyone", response: "These are desk tools. Devin can build a mobile app if needed." },
  { feature: "Low-code tools for non-engineers", response: "Your builders are engineers. A brief to Devin is faster for this team." },
  { feature: "Copilot in Power Apps", response: "Copilot stays inside Power Apps. Devin writes and maintains code you own." },
];

const recommendationFactors = [
  { title: "Build cost", text: "Instead of the $250K/year Power Apps license estimate, budget for a brief, Devin time, and a review per app." },
  { title: "Maintenance", text: "Maintenance moves in-house. Devin bots handle routine work; your team approves changes." },
  { title: "Security", text: "Your team owns security. Host on Azure or AWS; auditor access and audit logging are built in." },
  { title: "Engineering time", text: "No Power Fx. Engineers write briefs and review PRs, then spend more time on product and business priorities instead of internal tools." },
  { title: "Risk", text: "Give one engineer explicit ownership for a fraction of their time. The code is yours; any engineer can maintain it without Devin." },
];

const delta = [
  {
    title: "Access (AAA)",
    today: [
      "Authorization and accounting are real: server-side group → role → permission checks, app admins map Entra groups to roles, and every change is audited.",
      "Authentication is simulated: a user picker and seeded groups stand in for Microsoft Entra ID.",
    ],
    change: [
      "Register an Entra app and swap demoIdentityProvider for entraIdentityProvider in web/src/platform.ts.",
      "Users and groups then come from the tenant's sign-in claims; no app code changes.",
    ],
  },
  {
    title: "Data",
    today: [
      "SQLite with deterministic fake data. Drizzle schema in code: shared platform tables, one app-prefixed table set per app, versioned migrations.",
      "SharePoint documents connector over Microsoft Graph, running on a mock.",
    ],
    change: [
      "Switch the Drizzle dialect to Postgres or Azure SQL and regenerate migrations; services barely change.",
      "Load real data or read existing systems through connectors; add SharePoint credentials if needed.",
    ],
  },
  {
    title: "Hosting",
    today: [
      "Runs locally with npm run dev: a standard Next.js app plus a database.",
      "No host chosen yet, and nothing ties it to one.",
    ],
    change: [
      "Deploy anywhere Node runs: Azure App Service, AWS, Vercel or their own Kubernetes.",
      "Add secrets management and staging/production environments.",
    ],
  },
];

export default function Home() {
  const apps = platform.apps.filter((a) => a.href.startsWith("/apps/"));
  return (
    <Shell>
      <div className="mx-auto max-w-5xl py-4">
        <header className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Internal Tools Platform</h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Everything an internal tool needs that isn&apos;t specific to it is built once: shared code, plus the knowledge and playbooks Devin uses to build each new app the same way.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <LinkButton href="/apps">Open apps</LinkButton>
          </div>
        </header>

        <section className="mt-14">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {foundations.map((f) => (
              <Link key={f.href} href={f.href} className={`group rounded-2xl border p-5 transition ${f.badge === "Maintain" ? "border-emerald-200 bg-emerald-50/70 hover:border-emerald-500" : "border-brand-100 bg-brand-50/60 hover:border-brand-500"}`}>
                <div className="flex items-baseline justify-between">
                  <h2 className={`font-semibold ${f.badge === "Maintain" ? "text-emerald-900" : "text-brand-900"}`}>{f.title}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${f.badge === "Build" ? "bg-brand-100 text-brand-700" : "bg-emerald-100 text-emerald-800"}`}>{f.badge}</span>
                  <span className="text-brand-700 opacity-0 transition group-hover:opacity-100">→</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{f.what}</p>
                <ul className="mt-3 space-y-1 text-xs text-muted">
                  {f.examples.map((e) => (
                    <li key={e}>· {e}</li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>

          <div className="flex flex-col items-center py-2 text-muted">
            <span className="text-[11px] uppercase tracking-wider">build and maintain</span>
            <span className="text-lg leading-none">↓</span>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold">Internal apps</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {apps.map((a) => (
                <a key={a.key} href={a.href} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-4 py-3 transition hover:border-brand-500">
                  <div className="text-sm font-semibold">{a.name} ↗</div>
                  <div className="font-mono text-xs text-muted">{a.href}</div>
                </a>
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
        </section>

        <section className="mt-16" aria-labelledby="replicability-heading">
          <h2 id="replicability-heading" className="text-center text-lg font-semibold">What&apos;s replicable with Devin vs not</h2>
          <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-5">
              <h3 className="font-semibold">Replicable</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-600">
                <li>
                  Entra roles, approvals, audit, and PII masking, plus the{" "}
                  <Link href="/primitives#fintech" className="font-medium text-brand-700 underline underline-offset-2">Fintech controls</Link>{" "}
                  Power Apps leaves to you.
                </li>
                <li>SharePoint through Microsoft Graph.</li>
                <li>Teams as a tab.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-line bg-surface p-5">
              <h3 className="font-semibold">Not replicable as-is</h3>
              <dl className="mt-3 space-y-3">
                {powerAppsTradeoffs.map(({ feature, response }) => (
                  <div key={feature}>
                    <dt className="font-medium">{feature}</dt>
                    <dd className="text-slate-600">{response}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="recommendation-heading">
          <h2 id="recommendation-heading" className="text-center text-lg font-semibold">Recommendation: build with Devin vs buy Power Apps</h2>
          <div className="mt-6 rounded-xl border border-line bg-surface p-5 text-sm">
            <p className="font-semibold">Build with Devin. How I weighed it:</p>
            <dl className="mt-2 divide-y divide-line">
              {recommendationFactors.map(({ title, text }) => (
                <div key={title} className="grid gap-1 py-2.5 sm:grid-cols-[9rem_1fr]">
                  <dt className="font-medium">{title}</dt>
                  <dd className="text-slate-600">{text}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-slate-600">
              <strong className="text-slate-900">When I&apos;d say buy instead:</strong> If no one can own the platform, or non-engineers need to build their own tools.
            </p>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-center text-lg font-semibold">Delta from prototype to real world</h2>
          <div className="mt-6 grid gap-4 text-sm md:grid-cols-3">
            {delta.map((d) => (
              <div key={d.title} className="grid grid-rows-[auto_1fr_1fr] gap-3 rounded-xl border border-line bg-surface p-5">
                <h3 className="font-semibold">{d.title}</h3>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Today</div>
                  <ul className="mt-1 space-y-1.5 text-slate-600">
                    {d.today.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-dashed border-brand-200 bg-brand-50/40 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">To go live</div>
                  <ul className="mt-1 space-y-1.5 text-slate-600">
                    {d.change.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
