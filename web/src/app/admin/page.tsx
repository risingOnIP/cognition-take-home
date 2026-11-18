import Link from "next/link";
import { groupMembers, groupRoles, groups, users } from "@acme/platform/db";
import { can, findSodViolations } from "@acme/platform/rbac";
import { Alert, Badge, Card, DataTable, LinkButton, PageHeader, SchemaForm } from "@acme/platform/ui";
import { catalog, db, requirePageAccess } from "@/platform";
import { grantRole, revokeRole } from "./actions";

export default async function AdminPage() {
  const user = await requirePageAccess("admin.view");
  const d = db();
  const allGroups = d.select().from(groups).all();
  const members = d.select().from(groupMembers).all();
  const assignments = d.select().from(groupRoles).all();
  const people = d.select().from(users).all();
  const violations = findSodViolations(d, catalog);
  const canManage = can(user, "admin.roles.manage");
  const roleOptions = [...catalog.roles.values()].map((r) => ({ value: r.key, label: `${r.key} — ${r.name}` }));
  const groupOptions = allGroups.map((g) => ({ value: g.id, label: g.name }));

  return (
    <>
      <PageHeader
        title="Access & Audit"
        description="Entra groups are the unit of access. Roles (and their permissions) are declared in each app's manifest in code; assigning them to groups is data, audited and checked for segregation-of-duties conflicts."
        actions={can(user, "audit.view") && <LinkButton href="/admin/audit" variant="secondary">Audit trail</LinkButton>}
      />
      <div className="space-y-6">
        {violations.length > 0 && (
          <Alert tone="danger" title={`${violations.length} segregation-of-duties violation(s)`}>
            <ul className="mt-1 list-disc pl-5">
              {violations.map((v) => (
                <li key={`${v.userId}-${v.roleA}-${v.roleB}`}>
                  <strong>{v.displayName}</strong> holds both <code>{v.roleA}</code> and <code>{v.roleB}</code> — {v.reason}
                </li>
              ))}
            </ul>
          </Alert>
        )}
        <Card title="Groups → roles">
          <DataTable
            columns={[
              { key: "group", header: "Entra group" },
              { key: "members", header: "Members" },
              { key: "roles", header: "Roles" },
            ]}
            rows={allGroups.map((g) => {
              const roleKeys = assignments.filter((a) => a.groupId === g.id).map((a) => a.roleKey);
              const memberNames = members.filter((m) => m.groupId === g.id).map((m) => people.find((p) => p.id === m.userId)?.displayName ?? m.userId);
              return {
                id: g.id,
                values: { group: g.name, members: memberNames.join(", "), roles: roleKeys.join(", ") },
                display: { roles: <span className="flex flex-wrap gap-1">{roleKeys.map((r) => <Badge key={r} tone="brand">{r}</Badge>)}</span> },
              };
            })}
          />
        </Card>
        {canManage && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Grant role to group">
              <SchemaForm
                action={grantRole}
                submitLabel="Grant role"
                fields={[
                  { name: "groupId", label: "Group", type: "select", options: groupOptions, required: true },
                  { name: "roleKey", label: "Role", type: "select", options: roleOptions, required: true },
                  { name: "reason", label: "Reason / ticket", placeholder: "ACCESS-123", required: true },
                ]}
              />
            </Card>
            <Card title="Revoke role from group">
              <SchemaForm
                action={revokeRole}
                submitLabel="Revoke role"
                fields={[
                  { name: "groupId", label: "Group", type: "select", options: groupOptions, required: true },
                  { name: "roleKey", label: "Role", type: "select", options: roleOptions, required: true },
                  { name: "reason", label: "Reason / ticket", required: true },
                ]}
              />
            </Card>
          </div>
        )}
        <Card title="Role catalog (from app manifests)">
          <div className="grid gap-3 md:grid-cols-2">
            {[...catalog.roles.values()].map((r) => (
              <div key={r.key} className="rounded-md border border-line p-3">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-semibold">{r.key}</code>
                  <span className="text-xs text-muted">{r.app}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{r.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">{r.permissions.map((p) => <Badge key={p}>{p}</Badge>)}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            Changing what a role can do is a code change reviewed in a PR. See <Link className="underline" href="/admin/audit">audit trail</Link> for who changed assignments.
          </p>
        </Card>
      </div>
    </>
  );
}
