import { groupRoles, groups } from "@acme/platform/db";
import { can, findSodViolations } from "@acme/platform/rbac";
import { Alert, Badge, Card, PageHeader, SchemaForm } from "@acme/platform/ui";
import { RealVsSimulated } from "@/components/real-vs-simulated";
import { catalog, db, requirePageAccess } from "@/platform";
import { grantRole, revokeRole } from "./actions";
import { SecurityTabs } from "./tabs";

export default async function SecurityPage() {
  const user = await requirePageAccess("admin.view");
  const d = db();
  const allGroups = d.select().from(groups).all();
  const assignments = d.select().from(groupRoles).all();
  const violations = findSodViolations(d, catalog);
  const canManage = can(user, "admin.roles.manage");
  const roleOptions = [...catalog.roles.values()].map((r) => ({ value: r.key, label: `${r.name} (${r.app})` }));
  const groupOptions = allGroups.map((g) => ({ value: g.id, label: g.name }));
  const roleName = (k: string) => catalog.roles.get(k)?.name ?? k;

  return (
    <>
      <PageHeader title="Security" description="Who can do what across every app. Access is granted to Entra groups, never to individuals." />
      <SecurityTabs active="roles" />
      <div className="space-y-6">
        <RealVsSimulated />
        {violations.length > 0 ? (
          <Alert tone="danger" title="Segregation-of-duties conflict">
            {violations.map((v) => `${v.displayName}: ${roleName(v.roleA)} + ${roleName(v.roleB)}`).join("; ")}. Remove the person from one of the Entra groups.
          </Alert>
        ) : (
          <p className="text-sm text-emerald-700">✓ No segregation-of-duties conflicts. Conflicting grants are blocked below.</p>
        )}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Group → roles" className="lg:col-span-2">
            <table className="w-full text-left text-sm">
              <tbody>
                {allGroups.map((g) => {
                  const roles = assignments.filter((a) => a.groupId === g.id);
                  return (
                    <tr key={g.id} className="border-t border-line first:border-0">
                      <td className="py-2.5 pr-4 font-medium">{g.name}</td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap gap-1">{roles.length ? roles.map((a) => <Badge key={a.roleKey} tone="brand">{roleName(a.roleKey)}</Badge>) : <span className="text-xs text-muted">No roles</span>}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          {canManage ? (
            <div className="space-y-6">
              <Card title="Grant a role">
                <SchemaForm
                  action={grantRole}
                  submitLabel="Grant"
                  fields={[
                    { name: "groupId", label: "Group", type: "select", options: groupOptions, required: true },
                    { name: "roleKey", label: "Role", type: "select", options: roleOptions, required: true },
                    { name: "reason", label: "Ticket / reason", placeholder: "ACCESS-123", required: true },
                  ]}
                />
              </Card>
              <Card title="Revoke a role">
                <SchemaForm
                  action={revokeRole}
                  submitLabel="Revoke"
                  fields={[
                    { name: "groupId", label: "Group", type: "select", options: groupOptions, required: true },
                    { name: "roleKey", label: "Role", type: "select", options: roleOptions, required: true },
                    { name: "reason", label: "Ticket / reason", required: true },
                  ]}
                />
              </Card>
            </div>
          ) : (
            <Card title="Read-only">
              <p className="text-sm text-muted">You can review access but not change it. Platform admins can grant and revoke roles.</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
