import { Card, PageHeader, SchemaForm } from "@acme/platform/ui";
import { requirePageAccess } from "@/platform";
import { createRefundAction } from "../_lib/actions";
import { REASON_CODES } from "../_lib/schema";
import { APPROVAL_TIERS } from "../_lib/workflow";
import { refundsApp } from "../manifest";

export default async function NewRefundPage() {
  await requirePageAccess("refunds.request");
  return (
    <>
      <PageHeader title="New refund" breadcrumb={[{ label: "Refunds", href: refundsApp.href }]} description="The request is routed to an approver based on the amount. You can't approve your own request." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SchemaForm
            action={createRefundAction}
            submitLabel="Submit for approval"
            fields={[
              { name: "paymentId", label: "Original payment id", placeholder: "pay_8f3k2", required: true, help: "Use an id starting with pay_fail to simulate a processor failure." },
              { name: "customerName", label: "Customer name", required: true },
              { name: "customerEmail", label: "Customer email", type: "email", required: true },
              { name: "amount", label: "Amount (USD)", type: "money", placeholder: "125.00", required: true },
              { name: "reasonCode", label: "Reason code", type: "select", required: true, options: Object.entries(REASON_CODES).map(([value, label]) => ({ value, label })) },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </Card>
        <Card title="Approval limits">
          <ul className="space-y-2 text-sm">
            {APPROVAL_TIERS.map((t) => (
              <li key={t.permission} className="flex justify-between gap-2">
                <span>{t.label}</span>
                <code className="text-xs text-muted">{t.permission}</code>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
