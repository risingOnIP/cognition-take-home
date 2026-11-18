import { can } from "@acme/platform/rbac";
import { Alert, Badge, DataTable, PageHeader, Stat, StatusBadge } from "@acme/platform/ui";
import { db, requirePageAccess } from "@/platform";
import { userNames } from "./_lib/actions";
import { DOCUMENT_TYPES } from "./_lib/schema";
import { kycQueue } from "./_lib/service";
import { availableKyc } from "./_lib/workflow";
import { RiskBadge, ScreeningBadges } from "./_lib/ui";
import { kycApp } from "./manifest";

const formatDue = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function KycQueuePage() {
  const user = await requirePageAccess(kycApp.accessPermission);
  const { rows, stats } = kycQueue(db(), user);
  const names = await userNames();
  const awaitingMe = rows.filter((c) => availableKyc(c, user).length > 0).length;
  const seesAll = can(user, "kyc.view_all");

  return (
    <>
      <PageHeader
        title="KYC review queue"
        description={
          seesAll
            ? "Every identity-verification case, most urgent SLA first. PII is masked; reveals need a reason and are audited."
            : "Cases assigned to you, most urgent SLA first. High-risk and screening-hit approvals go to a compliance lead for sign-off."
        }
      />
      {stats.breached > 0 && (
        <div className="mb-4">
          <Alert tone="danger" title={`${stats.breached} open case${stats.breached === 1 ? "" : "s"} past SLA`}>
            Breached cases are highlighted in the SLA column. The queue lists them first; sort by Due to re-order.
          </Alert>
        </div>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Awaiting your action" value={awaitingMe} tone={awaitingMe ? "warning" : undefined} />
        <Stat label="Open cases" value={stats.open} hint={seesAll ? `${stats.unassigned} unassigned` : undefined} />
        <Stat label="SLA breached" value={stats.breached} tone={stats.breached ? "danger" : "success"} />
        <Stat label="Due within 24h" value={stats.dueSoon} tone={stats.dueSoon ? "warning" : undefined} />
        <Stat label="Sign-off / escalated" value={`${stats.awaitingSignoff} / ${stats.escalated}`} hint="Waiting on a compliance lead" />
      </div>
      <DataTable
        exportName="kyc-cases"
        pageSize={15}
        columns={[
          { key: "id", header: "Case" },
          { key: "customer", header: "Customer" },
          { key: "document", header: "Document", filter: true },
          { key: "risk", header: "Risk", align: "right" },
          { key: "riskLevel", header: "Level", filter: true },
          { key: "screening", header: "Screening", filter: true },
          { key: "status", header: "Status", filter: true },
          { key: "assignee", header: "Assigned to", filter: true },
          { key: "due", header: "Due" },
          { key: "sla", header: "SLA" },
        ]}
        rows={rows.map((c) => {
          const { sla } = c;
          const screening = [c.sanctionsHit && "Sanctions", c.pepHit && "PEP"].filter(Boolean).join(" + ") || "Clear";
          return {
            id: c.id,
            href: `${kycApp.href}/${c.id}`,
            values: {
              id: c.id,
              customer: c.customerName,
              document: DOCUMENT_TYPES[c.documentType],
              risk: c.riskScore,
              riskLevel: c.riskLevel,
              screening,
              status: c.status,
              assignee: c.assignedTo ? (names[c.assignedTo] ?? c.assignedTo) : "Unassigned",
              due: c.slaDueAt,
              sla: sla.label,
            },
            display: {
              id: <span className={sla.tone === "danger" ? "font-semibold text-rose-700" : undefined}>{c.id}</span>,
              risk: c.riskScore,
              riskLevel: <RiskBadge level={c.riskLevel} />,
              screening: <ScreeningBadges sanctions={c.sanctionsHit} pep={c.pepHit} />,
              status: <StatusBadge status={c.status} />,
              assignee: c.assignedTo ? (names[c.assignedTo] ?? c.assignedTo) : <Badge tone="warning">Unassigned</Badge>,
              due: formatDue(c.slaDueAt),
              sla: <Badge tone={sla.tone}>{sla.label}</Badge>,
            },
          };
        })}
      />
    </>
  );
}
