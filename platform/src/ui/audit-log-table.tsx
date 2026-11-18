import type { AuditEvent } from "../audit";
import { DataTable } from "./data-table";
import { Badge } from "./primitives";

function summarize(e: AuditEvent): string {
  const parse = (v: unknown): Record<string, unknown> => {
    if (typeof v === "string") {
      try {
        const o = JSON.parse(v);
        return o && typeof o === "object" ? o : {};
      } catch {
        return {};
      }
    }
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  };
  const before = parse(e.before);
  const after = parse(e.after);
  if ("status" in before && "status" in after) return `${before.status} → ${after.status}`;
  return Object.entries(after)
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ");
}

/** Audit log viewer: filter by person, action (and app), search, paginate, export. Scrolls inside its panel. */
export function AuditLogTable({ events, actorNames = {}, showApp = false, pageSize = 15 }: { events: AuditEvent[]; actorNames?: Record<string, string>; showApp?: boolean; pageSize?: number }) {
  return (
    <DataTable
      exportName="audit-log"
      pageSize={pageSize}
      emptyMessage="No activity yet"
      columns={[
        { key: "at", header: "When" },
        { key: "actor", header: "Who", filter: true },
        ...(showApp ? [{ key: "app", header: "App", filter: true }] : []),
        { key: "action", header: "Action", filter: true },
        { key: "entity", header: "Record" },
        { key: "change", header: "Change" },
        { key: "reason", header: "Reason" },
      ]}
      rows={events.map((e) => ({
        id: String(e.seq),
        values: {
          at: e.at,
          actor: actorNames[e.actorId] ?? e.actorId,
          app: e.app,
          action: e.action,
          entity: `${e.entityType} ${e.entityId}`,
          change: summarize(e),
          reason: e.reason ?? "",
        },
        display: {
          at: new Date(e.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
          action: <Badge tone="brand">{e.action}</Badge>,
        },
      }))}
    />
  );
}
