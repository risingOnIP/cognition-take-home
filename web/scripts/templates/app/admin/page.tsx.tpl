import { appAccessSummary } from "@acme/platform/admin";
import { groups } from "@acme/platform/db";
import { AppAdminView, PageHeader } from "@acme/platform/ui";
import { catalog, db, requirePageAccess } from "@/platform";
import { __camel__App } from "../manifest";
import { changeRole } from "./actions";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requirePageAccess("__key__.admin");
  const { tab } = await searchParams;
  return (
    <>
      <PageHeader title="__name__ admin" breadcrumb={[{ label: "__name__", href: __camel__App.href }]} />
      <AppAdminView
        summary={appAccessSummary(db(), catalog, __camel__App)}
        baseHref={`${__camel__App.href}/admin`}
        tab={tab === "activity" ? "activity" : "access"}
        groupOptions={db().select().from(groups).all().map((g) => ({ value: g.id, label: g.name }))}
        changeRole={changeRole}
      />
    </>
  );
}
