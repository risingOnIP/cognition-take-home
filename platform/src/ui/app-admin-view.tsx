import Link from "next/link";
import type { AppAccessSummary } from "../admin";
import { AuditLogTable } from "./audit-log-table";
import { Alert, Badge, Card } from "./primitives";
import { TabNav } from "./tab-nav";

export type AppAdminTab = "access" | "activity";

/** Standard admin view every app gets, split into two tabs: Access and Activity. */
export function AppAdminView({ summary, baseHref, tab, actorNames = {} }: { summary: AppAccessSummary; baseHref: string; tab: AppAdminTab; actorNames?: Record<string, string> }) {
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
          {summary.sodViolations.length > 0 ? (
            <Alert tone="danger" title="Segregation-of-duties conflict">
              {summary.sodViolations.map((v) => `${v.displayName} holds ${v.roleA} and ${v.roleB}`).join("; ")}. Fix the Entra group membership.
            </Alert>
          ) : (
            <p className="text-sm text-emerald-700">✓ No segregation-of-duties conflicts</p>
          )}
          <Card
            title="Who can do what"
            actions={
              <Link href="/security" className="text-sm text-brand-700 hover:underline">
                Change in Security →
              </Link>
            }
          >
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
                      <div className="font-medium">{r.name}</div>
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
        </div>
      ) : (
        <AuditLogTable events={summary.recentActivity} actorNames={actorNames} />
      )}
    </>
  );
}
