import { formatMoney } from "@acme/platform/money";
import { can } from "@acme/platform/rbac";
import { DataTable, LinkButton, PageHeader, Stat, StatusBadge } from "@acme/platform/ui";
import { db, requirePageAccess } from "@/platform";
import { userNames } from "./_lib/actions";
import { REASON_CODES } from "./_lib/schema";
import { listRefunds, refundStats } from "./_lib/service";
import { refundWorkflow } from "./_lib/workflow";
import { refundsApp } from "./manifest";

export default async function RefundsPage() {
  const user = await requirePageAccess(refundsApp.accessPermission);
  const rows = listRefunds(db(), user);
  const stats = refundStats(rows);
  const names = await userNames();
  const awaitingMe = rows.filter((r) => refundWorkflow.available(r, user).length > 0);

  return (
    <>
      <PageHeader
        title="Refunds"
        description={can(user, "refunds.view_all") ? "All refund requests across the support team." : "Refunds you have raised. Approvals happen with a team lead or above."}
        actions={
          <div className="flex gap-2">
            {can(user, "refunds.admin") && (
              <LinkButton href={`${refundsApp.href}/admin`} variant="secondary">
                Admin
              </LinkButton>
            )}
            {can(user, "refunds.request") && <LinkButton href={`${refundsApp.href}/new`}>New refund</LinkButton>}
          </div>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Awaiting your action" value={awaitingMe.length} tone={awaitingMe.length ? "warning" : undefined} hint="Based on your approval limit" />
        <Stat label="Pending approval" value={stats.pendingCount} hint={formatMoney(stats.pendingMinor)} />
        <Stat label="Approved, not paid" value={stats.approvedCount} hint={formatMoney(stats.approvedMinor)} />
        <Stat label="Paid out" value={stats.paidCount} hint={formatMoney(stats.paidMinor)} tone="success" />
      </div>
      <DataTable
        exportName="refunds"
        columns={[
          { key: "id", header: "Refund" },
          { key: "customer", header: "Customer" },
          { key: "amount", header: "Amount", align: "right" },
          { key: "reason", header: "Reason", filter: true },
          { key: "status", header: "Status", filter: true },
          { key: "requestedBy", header: "Requested by", filter: true },
          { key: "createdAt", header: "Created" },
        ]}
        rows={rows.map((r) => ({
          id: r.id,
          href: `${refundsApp.href}/${r.id}`,
          values: {
            id: r.id,
            customer: r.customerName,
            amount: r.amountMinor,
            reason: REASON_CODES[r.reasonCode],
            status: r.status,
            requestedBy: names[r.createdBy] ?? r.createdBy,
            createdAt: r.createdAt,
          },
          display: {
            amount: formatMoney(r.amountMinor, r.currency),
            status: <StatusBadge status={r.status} />,
            createdAt: new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
          },
        }))}
      />
    </>
  );
}
