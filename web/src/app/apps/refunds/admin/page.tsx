import { appAccessSummary } from "@acme/platform/admin";
import { AppAdminView, PageHeader } from "@acme/platform/ui";
import { catalog, db, requirePageAccess } from "@/platform";
import { userNames } from "../_lib/actions";
import { refundsApp } from "../manifest";

export default async function RefundsAdmin({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requirePageAccess("refunds.admin");
  const { tab } = await searchParams;
  return (
    <>
      <PageHeader title="Refunds admin" breadcrumb={[{ label: "Refunds", href: refundsApp.href }]} />
      <AppAdminView summary={appAccessSummary(db(), catalog, refundsApp)} baseHref={`${refundsApp.href}/admin`} tab={tab === "activity" ? "activity" : "access"} actorNames={await userNames()} />
    </>
  );
}
