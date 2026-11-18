import { appAccessSummary } from "@acme/platform/admin";
import { AppAdminView, PageHeader } from "@acme/platform/ui";
import { catalog, db, requirePageAccess } from "@/platform";
import { __camel__App } from "../manifest";

export default async function AdminPage() {
  await requirePageAccess("__key__.admin");
  return (
    <>
      <PageHeader title="__name__ admin" breadcrumb={[{ label: "__name__", href: __camel__App.href }]} description="Who can do what in __name__, and everything that happened." />
      <AppAdminView summary={appAccessSummary(db(), catalog, __camel__App)} />
    </>
  );
}
