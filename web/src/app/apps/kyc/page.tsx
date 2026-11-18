import Link from "next/link";
import { can } from "@acme/platform/rbac";
import { Alert, Badge, DataTable, LinkButton, PageHeader, Stat, StatusBadge, TabNav } from "@acme/platform/ui";
import { db, requirePageAccess } from "@/platform";
import { RiskBadge, SlaBadge } from "./_components/badges";
import { userNames } from "./_lib/actions";
import { DOCUMENT_TYPES } from "./_lib/schema";
import { DUE_SOON_HOURS, listCases, queueStats, type KycCaseView } from "./_lib/service";
import { kycWorkflow } from "./_lib/workflow";
import { kycApp } from "./manifest";

const TABS = ["open", "breached", "escalated", "closed"] as const;
type Tab = (typeof TABS)[number];

const inTab: Record<Tab, (c: KycCaseView) => boolean> = {
  open: (c) => !kycWorkflow.terminal.includes(c.status),
  breached: (c) => c.sla.state === "breached",
  escalated: (c) => c.status === "escalated",
  closed: (c) => kycWorkflow.terminal.includes(c.status),
};

export default async function KycQueuePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requirePageAccess(kycApp.accessPermission);
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "open";
  const cases = listCases(db(), user);
  const stats = queueStats(cases);
  const names = await userNames();
  const seesAll = can(user, "kyc.view_all");
  const rows = cases.filter(inTab[tab]);
  const counts = Object.fromEntries(TABS.map((t) => [t, cases.filter(inTab[t]).length])) as Record<Tab, number>;
  const label: Record<Tab, string> = { open: "Open", breached: "SLA breached", escalated: "Escalated", closed: "Closed" };

  return (
    <>
      <PageHeader
        title="KYC review queue"
        description={
          seesAll
            ? "Every identity-verification case. Assign cases, approve high-risk or screening-hit cases and resolve escalations."
            : "Identity-verification cases assigned to you. Approve, reject or escalate; high-risk and screening-hit approvals go to a lead."
        }
        actions={
          can(user, "kyc.admin") && (
            <LinkButton href={`${kycApp.href}/admin`} variant="secondary">
              Admin
            </LinkButton>
          )
        }
      />
      {stats.breached > 0 && tab !== "breached" && (
        <div className="mb-4">
          <Alert tone="danger" title={`${stats.breached} open ${stats.breached === 1 ? "case has" : "cases have"} breached SLA`}>
            <Link href={`${kycApp.href}?tab=breached`} className="font-medium underline">
              Review breached cases
            </Link>
          </Alert>
        </div>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={seesAll ? "Open cases" : "Your open cases"} value={stats.open} />
        <Stat label="SLA breached" value={stats.breached} tone={stats.breached ? "danger" : "success"} hint="Past due, still open" />
        <Stat label={`Due within ${DUE_SOON_HOURS}h`} value={stats.dueSoon} tone={stats.dueSoon ? "warning" : undefined} />
        {seesAll ? (
          <Stat label="Unassigned" value={stats.unassigned} tone={stats.unassigned ? "warning" : undefined} hint="Open cases with no analyst" />
        ) : (
          <Stat label="Escalated" value={stats.escalated} hint="Waiting on a lead" />
        )}
      </div>
      <TabNav active={tab} tabs={TABS.map((t) => ({ key: t, label: `${label[t]} (${counts[t]})`, href: t === "open" ? kycApp.href : `${kycApp.href}?tab=${t}` }))} />
      <DataTable
        exportName={`kyc-${tab}`}
        emptyMessage={tab === "breached" ? "✓ No open cases have breached SLA" : "No cases"}
        columns={[
          { key: "id", header: "Case" },
          { key: "customer", header: "Customer" },
          { key: "document", header: "Document", filter: true },
          { key: "risk", header: "Risk", filter: true },
          { key: "screening", header: "Screening", filter: true },
          { key: "status", header: "Status", filter: true },
          { key: "assignedTo", header: "Assigned to", filter: true },
          { key: "sla", header: "SLA", align: "right" },
        ]}
        rows={rows.map((c) => ({
          id: c.id,
          href: `${kycApp.href}/${c.id}`,
          values: {
            id: c.id,
            customer: c.masked.customerName,
            document: DOCUMENT_TYPES[c.documentType],
            risk: c.riskLevel,
            screening: c.screeningHits.length ? `${c.screeningHits.length} hit${c.screeningHits.length > 1 ? "s" : ""}` : "Clear",
            status: c.status,
            assignedTo: c.assignedTo ? (names[c.assignedTo] ?? c.assignedTo) : "Unassigned",
            sla: c.sla.hoursLeft,
          },
          display: {
            customer: <span className="font-mono text-xs">{c.masked.customerName}</span>,
            risk: <RiskBadge risk={c.riskLevel} />,
            screening: c.screeningHits.length ? <Badge tone="danger">{c.screeningHits.map((h) => h.kind.toUpperCase()).join(", ")}</Badge> : <span className="text-muted">Clear</span>,
            status: <StatusBadge status={c.status} />,
            assignedTo: c.assignedTo ? (names[c.assignedTo] ?? c.assignedTo) : <Badge tone="warning">Unassigned</Badge>,
            sla: <SlaBadge sla={c.sla} />,
          },
        }))}
      />
    </>
  );
}
