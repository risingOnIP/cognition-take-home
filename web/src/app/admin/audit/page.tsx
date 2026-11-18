import { users } from "@acme/platform/db";
import { listAuditEvents, verifyAuditChain } from "@acme/platform/audit";
import { Alert, Badge, DataTable, PageHeader } from "@acme/platform/ui";
import { db, requirePageAccess } from "@/platform";

export default async function AuditPage() {
  await requirePageAccess("audit.view");
  const chain = verifyAuditChain(db());
  const names = Object.fromEntries(db().select().from(users).all().map((u) => [u.id, u.displayName]));
  const events = listAuditEvents(db(), { limit: 1000 });
  return (
    <>
      <PageHeader
        title="Audit trail"
        breadcrumb={[{ label: "Access & Audit", href: "/admin" }]}
        description="Every mutation in every app, append-only (UPDATE/DELETE blocked in the database) and SHA-256 hash-chained so any tampering is detectable."
      />
      <div className="mb-4">
        {chain.ok ? (
          <Alert tone="success" title="Hash chain verified">{chain.checked} events checked, no tampering detected.</Alert>
        ) : (
          <Alert tone="danger" title="Hash chain broken">Event #{chain.brokenAt} does not match its recorded hash.</Alert>
        )}
      </div>
      <DataTable
        exportName="audit-trail"
        pageSize={20}
        columns={[
          { key: "seq", header: "#", align: "right" },
          { key: "at", header: "Time" },
          { key: "actor", header: "Actor", filter: true },
          { key: "app", header: "App", filter: true },
          { key: "action", header: "Action", filter: true },
          { key: "entity", header: "Entity" },
          { key: "reason", header: "Reason" },
          { key: "hash", header: "Hash" },
        ]}
        rows={events.map((e) => ({
          id: String(e.seq),
          values: {
            seq: e.seq,
            at: e.at,
            actor: names[e.actorId] ?? e.actorId,
            app: e.app,
            action: e.action,
            entity: `${e.entityType}:${e.entityId}`,
            reason: e.reason,
            hash: e.hash.slice(0, 10),
          },
          display: {
            at: new Date(e.at).toLocaleString("en-US"),
            action: <Badge tone="brand">{e.action}</Badge>,
            hash: <code className="text-xs text-muted">{e.hash.slice(0, 10)}…</code>,
          },
        }))}
      />
    </>
  );
}
