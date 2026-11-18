import { listAuditEvents, verifyAuditChain } from "@acme/platform/audit";
import { users } from "@acme/platform/db";
import { AuditLogTable, PageHeader } from "@acme/platform/ui";
import { db, requirePageAccess } from "@/platform";

export default async function AuditPage() {
  await requirePageAccess("audit.view");
  const chain = verifyAuditChain(db());
  const names = Object.fromEntries(db().select().from(users).all().map((u) => [u.id, u.displayName]));
  return (
    <>
      <PageHeader title="Audit log" description="Every change in every app, append-only and hash-chained. Visible only to the Entra groups mapped to the Auditor role (internal audit). App admins see their own app's activity in the app's admin page." />
      <p className={`mb-4 text-sm ${chain.ok ? "text-emerald-700" : "text-red-700"}`}>
        {chain.ok ? `✓ Hash chain verified: ${chain.checked} events, no tampering` : `✗ Hash chain broken at event #${chain.brokenAt}`}
      </p>
      <AuditLogTable events={listAuditEvents(db(), { limit: 2000 })} actorNames={names} showApp pageSize={20} />
    </>
  );
}
