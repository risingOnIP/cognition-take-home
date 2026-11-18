import Link from "next/link";
import { groupRoles, groups } from "@acme/platform/db";
import { Badge, PageHeader } from "@acme/platform/ui";
import { eq } from "drizzle-orm";
import { Shell } from "@/components/shell";
import { catalog, db, platform, requireUser } from "@/platform";

/** Which Entra groups grant access to an app — shown so people know what to request. */
function groupsGranting(permission: string): string[] {
  const roleKeys = [...catalog.roles.values()].filter((r) => r.permissions.includes(permission)).map((r) => r.key);
  const rows = db().select({ name: groups.name, roleKey: groupRoles.roleKey }).from(groupRoles).innerJoin(groups, eq(groups.id, groupRoles.groupId)).all();
  return [...new Set(rows.filter((r) => roleKeys.includes(r.roleKey)).map((r) => r.name))];
}

export default async function Launcher() {
  const user = await requireUser();
  const mine = platform.visibleApps(user);
  const others = platform.apps.filter((a) => !mine.includes(a));
  return (
    <Shell>
      <PageHeader title={`Welcome, ${user.displayName.split(" ")[0]}`} description="Apps you can open are based on your Entra security groups." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mine.map((a) => (
          <Link key={a.key} href={a.href} className="group rounded-lg border border-line bg-surface p-5 shadow-sm transition hover:border-brand-500 hover:shadow">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold group-hover:text-brand-700">{a.name}</h2>
              <Badge tone="success">access</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{a.description}</p>
            <p className="mt-4 text-xs text-muted">Owner: {a.owner}</p>
          </Link>
        ))}
        {!mine.length && <p className="text-sm text-muted">You don&apos;t have access to any apps yet.</p>}
      </div>
      {others.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted">Other apps</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((a) => (
              <div key={a.key} className="rounded-lg border border-dashed border-line p-5">
                <h3 className="font-medium text-slate-600">{a.name}</h3>
                <p className="mt-2 text-sm text-muted">{a.description}</p>
                <p className="mt-4 text-xs text-muted">
                  Request access from {a.owner} — granted via {groupsGranting(a.accessPermission).join(", ") || "no group yet"}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}
