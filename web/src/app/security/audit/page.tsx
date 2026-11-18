import { listAuditEvents, verifyAuditChain } from "@acme/platform/audit";
import { users } from "@acme/platform/db";
import { AuditLogTable, PageHeader } from "@acme/platform/ui";
import { db, requirePageAccess } from "@/platform";
import { SecurityTabs } from "../tabs";

export default async function AuditPage() {
  await requirePageAccess("audit.view");
  const chain = verifyAuditChain(db());
  const names = Object.fromEntries(db().select().from(users).all().map((u) => [u.id, u.displayName]));
  return (
    <>
      <PageHeader title="Security" description="Every change in every app. Append-only and hash-chained, so edits or deletions are detectable." />
      <SecurityTabs active="audit" />
      <p className={`mb-4 text-sm ${chain.ok ? "text-emerald-700" : "text-red-700"}`}>
        {chain.ok ? `✓ Hash chain verified: ${chain.checked} events, no tampering` : `✗ Hash chain broken at event #${chain.brokenAt}`}
      </p>
      <AuditLogTable events={listAuditEvents(db(), { limit: 2000 })} actorNames={names} showApp pageSize={20} />
    </>
  );
}
