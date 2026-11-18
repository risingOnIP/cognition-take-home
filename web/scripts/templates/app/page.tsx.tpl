import { can } from "@acme/platform/rbac";
import { Card, DataTable, PageHeader, SchemaForm, StatusBadge } from "@acme/platform/ui";
import { db, requirePageAccess } from "@/platform";
import { createItemAction } from "./_lib/actions";
import { listItems } from "./_lib/service";
import { __camel__App } from "./manifest";

export default async function __Pascal__Page() {
  const user = await requirePageAccess(__camel__App.accessPermission);
  const items = listItems(db(), user);
  return (
    <>
      <PageHeader title={__camel__App.name} description={__camel__App.description} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DataTable
            exportName="__key__"
            columns={[{ key: "title", header: "Title" }, { key: "status", header: "Status", filter: true }, { key: "createdAt", header: "Created" }]}
            rows={items.map((i) => ({ id: i.id, href: `${__camel__App.href}/${i.id}`, values: { title: i.title, status: i.status, createdAt: i.createdAt }, display: { status: <StatusBadge status={i.status} /> } }))}
          />
        </div>
        {can(user, "__key__.create") && (
          <Card title="New item">
            <SchemaForm action={createItemAction} fields={[{ name: "title", label: "Title", required: true }]} />
          </Card>
        )}
      </div>
    </>
  );
}
