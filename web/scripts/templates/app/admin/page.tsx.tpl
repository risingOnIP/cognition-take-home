import { appAccessSummary } from "@acme/platform/admin";
import { AppAdminView, PageHeader } from "@acme/platform/ui";
import { catalog, db, requirePageAccess } from "@/platform";
import { __camel__App } from "../manifest";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requirePageAccess("__key__.admin");
  const { tab } = await searchParams;
  return (
    <>
      <PageHeader title="__name__ admin" breadcrumb={[{ label: "__name__", href: __camel__App.href }]} />
      <AppAdminView summary={appAccessSummary(db(), catalog, __camel__App)} baseHref={`${__camel__App.href}/admin`} tab={tab === "activity" ? "activity" : "access"} />
    </>
  );
}
