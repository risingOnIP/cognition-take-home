import { notFound } from "next/navigation";
import { listAuditEvents } from "@acme/platform/audit";
import { AuditTimeline, Card, PageHeader, StatusBadge, WorkflowActions } from "@acme/platform/ui";
import { db, requirePageAccess } from "@/platform";
import { transitionItemAction } from "../_lib/actions";
import { getItem } from "../_lib/service";
import { __camel__Workflow } from "../_lib/workflow";
import { __camel__App } from "../manifest";

export default async function __Pascal__Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageAccess(__camel__App.accessPermission);
  const item = getItem(db(), user, id);
  if (!item) notFound();
  const available = __camel__Workflow.available(item, user);
  return (
    <>
      <PageHeader title={<span className="flex items-center gap-3">{item.title} <StatusBadge status={item.status} /></span>} breadcrumb={[{ label: __camel__App.name, href: __camel__App.href }]} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="History" className="lg:col-span-2">
          <AuditTimeline events={listAuditEvents(db(), { entityType: "__key___item", entityId: item.id }).reverse()} />
        </Card>
        <Card title="Actions">
          <WorkflowActions
            transitions={available.map((t) => ({ key: t, label: __camel__Workflow.transitions[t].label, variant: t === "reject" ? "danger" : "primary" }))}
            action={transitionItemAction.bind(null, item.id)}
            blockedReason={__camel__Workflow.terminal.includes(item.status) ? "Closed." : __camel__Workflow.check("approve", item, user, "x")}
          />
        </Card>
      </div>
    </>
  );
}
