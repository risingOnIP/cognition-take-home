import Link from "next/link";
import { eq } from "drizzle-orm";
import { groupRoles, groups } from "@acme/platform/db";
import { Badge, PageHeader } from "@acme/platform/ui";
import { Section } from "@/components/overview";
import { formatMinutes, readBuildMetrics } from "@/lib/repo-docs";
import { catalog, db, platform, requireUser } from "@/platform";

/** Which Entra groups grant access to an app — shown so people know what to request. */
function groupsGranting(permission: string): string[] {
  const roleKeys = [...catalog.roles.values()].filter((r) => r.permissions.includes(permission)).map((r) => r.key);
  const rows = db().select({ name: groups.name, roleKey: groupRoles.roleKey }).from(groupRoles).innerJoin(groups, eq(groups.id, groupRoles.groupId)).all();
  return [...new Set(rows.filter((r) => roleKeys.includes(r.roleKey)).map((r) => r.name))];
}

export default async function AppsIndex() {
  const user = await requireUser();
  const mine = new Set(platform.visibleApps(user).map((a) => a.key));
  const metrics = readBuildMetrics();
  const built = platform.apps.filter((a) => a.href.startsWith("/apps/"));

  return (
    <>
      <PageHeader title="Apps" description={`What's built today. Each app lives at /apps/<slug>, uses only @acme/platform primitives, and is visible to you based on your Entra groups (signed in as ${user.displayName}).`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {built.map((a) => {
          const canOpen = mine.has(a.key);
          const m = metrics.find((x) => x.app === a.key);
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
                  <div className="pt-1 font-medium text-ink">
                    Build time: {formatMinutes(m.wallClockMinutes)}
                    {m.acus != null && ` · ${m.acus} ACUs`}
                  </div>
                )}
              </dl>
            </>
          );
          return canOpen ? (
            <Link key={a.key} href={a.href} target="_blank" rel="noreferrer" className="rounded-lg border border-line bg-surface p-5 shadow-sm transition hover:border-brand-500 hover:shadow">
              {body}
            </Link>
          ) : (
            <div key={a.key} className="rounded-lg border border-dashed border-line p-5">
              {body}
            </div>
          );
        })}
      </div>

      <Section id="metrics" title="How long each app took" intro="Measured per Devin session. The second app is the number that matters: it estimates the cost of each of the next 10.">
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
