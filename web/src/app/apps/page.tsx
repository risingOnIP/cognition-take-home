import Link from "next/link";
import { eq } from "drizzle-orm";
import { fintechPrimitives, powerAppsPrimitives, type PrimitiveInfo } from "@acme/platform/catalog";
import { groupRoles, groups } from "@acme/platform/db";
import { Badge, Card, PageHeader } from "@acme/platform/ui";
import { Markdown } from "@/components/markdown";
import { formatMinutes, readBuildMetrics, readDoc, readDocs } from "@/lib/repo-docs";
import { catalog, db, platform, requireUser } from "@/platform";

const sections = [
  ["apps", "Apps"],
  ["strategy", "Strategy"],
  ["primitives", "Power Apps primitives"],
  ["fintech", "Fintech controls"],
  ["devin", "Devin: knowledge, playbooks, bots"],
  ["metrics", "Build time"],
] as const;

/** Which Entra groups grant access to an app — shown so people know what to request. */
function groupsGranting(permission: string): string[] {
  const roleKeys = [...catalog.roles.values()].filter((r) => r.permissions.includes(permission)).map((r) => r.key);
  const rows = db().select({ name: groups.name, roleKey: groupRoles.roleKey }).from(groupRoles).innerJoin(groups, eq(groups.id, groupRoles.groupId)).all();
  return [...new Set(rows.filter((r) => roleKeys.includes(r.roleKey)).map((r) => r.name))];
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 pt-10">
      <h2 className="text-lg font-semibold">{title}</h2>
      {intro && <p className="mt-1 max-w-3xl text-sm text-muted">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PrimitiveTable({ rows }: { rows: PrimitiveInfo[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-2.5">Primitive</th>
            <th className="px-4 py-2.5">Replaces</th>
            <th className="px-4 py-2.5">Import</th>
            <th className="px-4 py-2.5">What it does</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.name} className="border-t border-line align-top">
              <td className="px-4 py-3 font-medium">{p.name}</td>
              <td className="px-4 py-3 text-muted">{p.replaces}</td>
              <td className="px-4 py-3">
                <code className="text-xs text-brand-700">{p.module}</code>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.exports.map((e) => (
                    <code key={e} className="rounded bg-slate-100 px-1 text-[11px]">
                      {e}
                    </code>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-700">{p.what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PlatformOverview() {
  const user = await requireUser();
  const mine = new Set(platform.visibleApps(user).map((a) => a.key));
  const metrics = readBuildMetrics();
  const metricFor = (key: string) => metrics.find((m) => m.app === key);
  const knowledge = readDocs("devin/knowledge");
  const playbooks = readDocs("devin/playbooks");
  const bots = readDocs("devin/bots");

  return (
    <>
      <PageHeader
        title="Internal tools platform"
        description={`Signed in as ${user.displayName}. Every app below is built only from @acme/platform primitives; access comes from your Entra security groups.`}
      />
      <nav className="flex flex-wrap gap-2 border-b border-line pb-4">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-slate-700 hover:border-brand-500 hover:text-brand-700">
            {label}
          </a>
        ))}
      </nav>

      <Section id="apps" title="Apps" intro="Each app lives at /apps/<slug> and is a folder in web/src/app/apps/<slug>/ with a manifest, a workflow, a service and pages.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platform.apps.map((a) => {
            const canOpen = mine.has(a.key);
            const m = metricFor(a.key);
            const body = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{a.name}</h3>
                  {canOpen ? <Badge tone="success">access</Badge> : <Badge>no access</Badge>}
                </div>
                <p className="mt-1 font-mono text-xs text-muted">{a.href}</p>
                <p className="mt-2 text-sm text-slate-700">{a.description}</p>
                <dl className="mt-4 space-y-1 text-xs text-muted">
                  <div>Owner: {a.owner}</div>
                  <div>Roles: {a.roles.map((r) => r.name).join(", ")}</div>
                  {!canOpen && <div>Granted via: {groupsGranting(a.accessPermission).join(", ") || "no group yet"}</div>}
                  {m && (
                    <div>
                      Build time: {formatMinutes(m.wallClockMinutes)}
                      {m.acus != null && ` · ${m.acus} ACUs`}
                    </div>
                  )}
                </dl>
              </>
            );
            return canOpen ? (
              <Link key={a.key} href={a.href} className="rounded-lg border border-line bg-surface p-5 shadow-sm transition hover:border-brand-500 hover:shadow">
                {body}
              </Link>
            ) : (
              <div key={a.key} className="rounded-lg border border-dashed border-line p-5">
                {body}
              </div>
            );
          })}
        </div>
      </Section>

      <Section id="strategy" title="Strategy">
        <Card>
          <Markdown>{readDoc("docs/STRATEGY.md")}</Markdown>
        </Card>
      </Section>

      <Section id="primitives" title="Power Apps primitives" intro="The Power Apps / Power Platform capabilities this team actually relies on, rebuilt as small typed modules.">
        <PrimitiveTable rows={powerAppsPrimitives} />
      </Section>

      <Section id="fintech" title="Fintech controls" intro="Controls a regulated team needs that Power Apps leaves to each app builder. Here they are platform defaults.">
        <PrimitiveTable rows={fintechPrimitives} />
      </Section>

      <Section id="devin" title="Devin: knowledge, playbooks, bots" intro="Rendered from the devin/ folder in the repo. The repo is the source of truth; these are synced into the Devin org.">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Knowledge" className="lg:col-span-1">
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

      <Section id="metrics" title="Build time" intro="What each part cost to build with Devin. The second app is the number that matters: it estimates the cost of each of the next 10.">
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5">What</th>
                <th className="px-4 py-2.5">How</th>
                <th className="px-4 py-2.5">Wall-clock</th>
                <th className="px-4 py-2.5">ACUs</th>
                <th className="px-4 py-2.5">Human input</th>
                <th className="px-4 py-2.5">Session</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.app} className="border-t border-line align-top">
                  <td className="px-4 py-3 font-medium">{m.what}</td>
                  <td className="px-4 py-3 text-slate-700">{m.how}</td>
                  <td className="px-4 py-3">{formatMinutes(m.wallClockMinutes)}</td>
                  <td className="px-4 py-3">{m.acus ?? "pending"}</td>
                  <td className="px-4 py-3 text-slate-700">{m.humanInput}</td>
                  <td className="px-4 py-3">
                    {m.session ? (
                      <a href={m.session} target="_blank" rel="noreferrer" className="text-brand-700 underline">
                        open
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
