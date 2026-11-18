import { appAccessSummary } from "@acme/platform/admin";
import { groups } from "@acme/platform/db";
import { AppAdminView, PageHeader } from "@acme/platform/ui";
import { catalog, db, requirePageAccess } from "@/platform";
import { userNames } from "../_lib/actions";
import { refundsApp } from "../manifest";
import { changeRefundsRole } from "./actions";

export default async function RefundsAdmin({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requirePageAccess("refunds.admin");
  const { tab } = await searchParams;
  return (
    <>
      <PageHeader title="Refunds admin" breadcrumb={[{ label: "Refunds", href: refundsApp.href }]} description="Map your company's Entra groups to Refunds roles, and review activity in this app." />
      <AppAdminView
        summary={appAccessSummary(db(), catalog, refundsApp)}
        baseHref={`${refundsApp.href}/admin`}
        tab={tab === "activity" ? "activity" : "access"}
        actorNames={await userNames()}
        groupOptions={db().select().from(groups).all().map((g) => ({ value: g.id, label: g.name }))}
        changeRole={changeRefundsRole}
      />
    </>
  );
}
