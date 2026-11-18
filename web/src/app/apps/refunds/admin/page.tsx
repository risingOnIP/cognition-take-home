import { appAccessSummary } from "@acme/platform/admin";
import { AppAdminView, PageHeader } from "@acme/platform/ui";
import { catalog, db, requirePageAccess } from "@/platform";
import { userNames } from "../_lib/actions";
import { refundsApp } from "../manifest";

export default async function RefundsAdmin() {
  await requirePageAccess("refunds.admin");
  return (
    <>
      <PageHeader title="Refunds admin" breadcrumb={[{ label: "Refunds", href: refundsApp.href }]} description="Who can do what in Refunds, and everything that happened." />
      <AppAdminView summary={appAccessSummary(db(), catalog, refundsApp)} actorNames={await userNames()} />
    </>
  );
}
