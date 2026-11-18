import Link from "next/link";
import type { AppAccessSummary } from "../admin";
import { AuditTimeline } from "./audit-timeline";
import { Alert, Badge, Card } from "./primitives";

/** Standard admin view every app gets: who has access (via which Entra group), SoD issues, recent activity. */
export function AppAdminView({ summary, actorNames = {} }: { summary: AppAccessSummary; actorNames?: Record<string, string> }) {
  return (
    <div className="space-y-6">
      {summary.sodViolations.length > 0 && (
        <Alert tone="danger" title={`${summary.sodViolations.length} segregation-of-duties violation(s)`}>
          <ul className="mt-1 list-disc pl-5">
            {summary.sodViolations.map((v) => (
              <li key={`${v.userId}-${v.roleA}-${v.roleB}`}>
                <strong>{v.displayName}</strong> holds both <code>{v.roleA}</code> and <code>{v.roleB}</code>: {v.reason}
              </li>
            ))}
          </ul>
        </Alert>
      )}
      <Card
        title="Who has access"
        actions={
          <Link href="/admin" className="text-sm text-brand-700 hover:underline">
            Change grants in Access &amp; Audit →
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Entra group</th>
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
                    {r.groups.length ? (
                      <div className="flex flex-wrap gap-1">
                        {r.groups.map((g) => (
                          <Badge key={g.name} tone="brand">
                            {g.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted">Not granted</span>
                    )}
                  </td>
                  <td className="py-3 text-slate-700">{r.groups.flatMap((g) => g.members).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Recent activity">
        <AuditTimeline events={summary.recentActivity} actorNames={actorNames} />
      </Card>
    </div>
  );
}
