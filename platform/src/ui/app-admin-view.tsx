import type { AppAccessSummary } from "../admin";
import type { FormState } from "../forms";
import { SchemaForm } from "./schema-form";
import { AuditLogTable } from "./audit-log-table";
import { Alert, Badge, Card } from "./primitives";
import { TabNav } from "./tab-nav";

export type AppAdminTab = "access" | "activity";

/** Standard admin view every app gets, split into two tabs: Access and Activity. */
export function AppAdminView({
  summary,
  baseHref,
  tab,
  actorNames = {},
  groupOptions = [],
  changeRole,
}: {
  summary: AppAccessSummary;
  baseHref: string;
  tab: AppAdminTab;
  actorNames?: Record<string, string>;
  /** Entra groups (from the tenant) the admin can map to this app's roles. */
  groupOptions?: { value: string; label: string }[];
  /** Server action that calls changeAppRole; omit for a read-only view. */
  changeRole?: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  return (
    <>
      <TabNav
        active={tab}
        tabs={[
          { key: "access", label: "Access", href: baseHref },
          { key: "activity", label: `Activity (${summary.recentActivity.length})`, href: `${baseHref}?tab=activity` },
        ]}
      />
      {tab === "access" ? (
        <div className="space-y-4">
          <Card title="Who administers this app">
            {(() => {
              const adminRoles = summary.roles.filter((r) => r.permissions.some((p) => p.endsWith(".admin")));
              const groups = adminRoles.flatMap((r) => r.groups);
              return (
                <p className="text-sm text-slate-700">
                  The <strong>{adminRoles.map((r) => r.name).join(", ") || "—"}</strong> role includes app admin rights, granted to{" "}
                  {groups.length ? groups.map((g) => <Badge key={g.name} tone="brand">{g.name}</Badge>) : <span className="text-muted">no group yet</span>}{" "}
                  ({groups.flatMap((g) => g.members).join(", ") || "nobody"}). Admins map groups to roles below and see the Activity tab.
                </p>
              );
            })()}
          </Card>
          {summary.sodViolations.length > 0 ? (
            <Alert tone="danger" title="Segregation-of-duties conflict">
              {summary.sodViolations.map((v) => `${v.displayName} holds ${v.roleA} and ${v.roleB}`).join("; ")}. Fix the Entra group membership.
            </Alert>
          ) : (
            <p className="text-sm text-emerald-700">✓ No segregation-of-duties conflicts</p>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Who can do what" className="lg:col-span-2">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Granted to group</th>
                  <th className="py-2">People</th>
                </tr>
              </thead>
              <tbody>
                {summary.roles.map((r) => (
                  <tr key={r.key} className="border-t border-line align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium">
                        {r.name} {r.permissions.some((p) => p.endsWith(".admin")) && <Badge tone="warning">admin</Badge>}
                      </div>
                      <div className="text-xs text-muted">{r.description}</div>
                    </td>
                    <td className="py-3 pr-4">
                      {r.groups.length ? r.groups.map((g) => <Badge key={g.name} tone="brand">{g.name}</Badge>) : <span className="text-xs text-muted">Not granted</span>}
                    </td>
                    <td className="py-3 text-slate-700">{r.groups.flatMap((g) => g.members).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {changeRole && (
            <Card title="Map an Entra group to a role">
              <SchemaForm
                action={changeRole}
                submitLabel="Save"
                fields={[
                  { name: "op", label: "Change", type: "select", options: [{ value: "grant", label: "Grant" }, { value: "revoke", label: "Revoke" }], required: true },
                  { name: "groupId", label: "Entra group", type: "select", options: groupOptions, required: true },
                  { name: "roleKey", label: "Role", type: "select", options: summary.roles.map((r) => ({ value: r.key, label: r.name })), required: true },
                  { name: "reason", label: "Ticket / reason", placeholder: "ACCESS-123", required: true },
                ]}
              />
            </Card>
          )}
          </div>
        </div>
      ) : (
        <AuditLogTable events={summary.recentActivity} actorNames={actorNames} />
      )}
    </>
  );
}
