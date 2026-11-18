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
  { title: "Automated checks", text: "CI blocks the PR if any page or action skips a permission check or audit." },
  { title: "Review & ship", text: "A human approves the PR. The app's admin maps Entra groups to its roles." },
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
              <Link key={f.href} href={f.href} className={`group rounded-2xl border p-5 transition border-brand-100 bg-brand-50/60 hover:border-brand-500`}>
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold text-brand-900">{f.title}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${f.badge === "Build" ? "bg-brand-100 text-brand-700" : "bg-slate-200 text-slate-700"}`}>{f.badge}</span>
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

        <section className="mt-16 grid gap-4 text-sm md:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="font-semibold">Access: real today, sign-in simulated</h3>
            <p className="mt-2 text-slate-600">
              Every page and action checks Entra group → app role → permission on the server. The demo uses a user picker and seeded groups in place of your tenant; connecting Entra login (swap <code>demoIdentityProvider</code> for <code>entraIdentityProvider</code>) is the one remaining step.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="font-semibold">Hosting: not decided, not locked in</h3>
            <p className="mt-2 text-slate-600">
              A standard Next.js app plus a database. It runs anywhere Node runs: Azure App Service, AWS, Vercel or your own Kubernetes. SQLite is for the demo; production would use Postgres or Azure SQL.
            </p>
          </div>
        </section>
      </div>
    </Shell>
  );
}
