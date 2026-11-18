import { notFound } from "next/navigation";
import { listAuditEvents } from "@acme/platform/audit";
import { formatMoney } from "@acme/platform/money";
import { maskPii } from "@acme/platform/pii";
import { can } from "@acme/platform/rbac";
import { Alert, AuditTimeline, Card, DescriptionList, MaskedValue, PageHeader, StatusBadge, WorkflowActions } from "@acme/platform/ui";
import { approvalTier } from "@acme/platform/workflow";
import { db, requirePageAccess } from "@/platform";
import { revealCustomerEmailAction, transitionRefundAction, userNames } from "../_lib/actions";
import { REASON_CODES } from "../_lib/schema";
import { getRefund } from "../_lib/service";
import { APPROVAL_TIERS, refundWorkflow } from "../_lib/workflow";
import { refundsApp } from "../manifest";

export default async function RefundDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageAccess(refundsApp.accessPermission);
  const refund = getRefund(db(), user, id);
  if (!refund) notFound();
  const names = await userNames();
  const tier = approvalTier(APPROVAL_TIERS, refund.amountMinor);
  const available = refundWorkflow.available(refund, user);
  const nextTransition = refund.status === "approved" ? "pay" : "approve";
  const blocked = refundWorkflow.terminal.includes(refund.status) ? "This refund is closed." : refundWorkflow.check(nextTransition, refund, user, "x");

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {refund.id} <StatusBadge status={refund.status} />
          </span>
        }
        breadcrumb={[{ label: "Refunds", href: refundsApp.href }]}
        description={`${formatMoney(refund.amountMinor, refund.currency)} to ${refund.customerName} — ${REASON_CODES[refund.reasonCode]}`}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Details">
            <DescriptionList
              items={[
                { label: "Amount", value: formatMoney(refund.amountMinor, refund.currency) },
                { label: "Original payment", value: <code>{refund.paymentId}</code> },
                { label: "Customer", value: refund.customerName },
                {
                  label: "Customer email",
                  value: (
                    <MaskedValue masked={maskPii(refund.customerEmail, "email")} canReveal={can(user, "refunds.pii.reveal")} reveal={revealCustomerEmailAction.bind(null, refund.id)} />
                  ),
                },
                { label: "Requested by", value: names[refund.createdBy] ?? refund.createdBy },
                { label: "Approval required", value: tier.label },
                { label: "Decided by", value: refund.decidedBy ? names[refund.decidedBy] : "—" },
                { label: "Processor refund id", value: refund.processorRefundId ? <code>{refund.processorRefundId}</code> : "—" },
              ]}
            />
            {refund.notes && <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm">{refund.notes}</p>}
          </Card>
          <Card title="History (from audit trail)">
            <AuditTimeline events={listAuditEvents(db(), { entityType: "refund", entityId: refund.id }).reverse()} actorNames={names} />
          </Card>
        </div>
        <Card title="Actions">
          {refund.status === "failed" && (
            <div className="mb-3">
              <Alert tone="danger">The payment processor declined this refund.</Alert>
            </div>
          )}
          <WorkflowActions
            transitions={available.map((t) => ({ key: t, label: refundWorkflow.transitions[t].label, variant: t === "reject" ? "danger" : "primary" }))}
            action={transitionRefundAction.bind(null, refund.id)}
            blockedReason={blocked}
          />
        </Card>
      </div>
    </>
  );
}
