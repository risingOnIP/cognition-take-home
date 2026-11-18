import { appAccessSummary } from "@acme/platform/admin";
import { groups } from "@acme/platform/db";
import { AppAdminView, PageHeader } from "@acme/platform/ui";
import { catalog, db, requirePageAccess } from "@/platform";
import { userNames } from "../_lib/actions";
import { kycApp } from "../manifest";
import { changeRole } from "./actions";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requirePageAccess("kyc.admin");
  const { tab } = await searchParams;
  return (
    <>
      <PageHeader
        title="KYC review queue admin"
        breadcrumb={[{ label: "KYC review queue", href: kycApp.href }]}
        description="Map your company's Entra groups to KYC roles, and review activity in this app."
      />
      <AppAdminView
        summary={appAccessSummary(db(), catalog, kycApp)}
        baseHref={`${kycApp.href}/admin`}
        tab={tab === "activity" ? "activity" : "access"}
        actorNames={await userNames()}
        groupOptions={db().select().from(groups).all().map((g) => ({ value: g.id, label: g.name }))}
        changeRole={changeRole}
      />
    </>
  );
}
