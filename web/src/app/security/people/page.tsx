import { groupMembers, groups, users } from "@acme/platform/db";
import { loadUser } from "@acme/platform/rbac";
import { DataTable, PageHeader } from "@acme/platform/ui";
import { catalog, db, requirePageAccess } from "@/platform";
import { SecurityTabs } from "../tabs";

export default async function PeoplePage() {
  await requirePageAccess("admin.view");
  const d = db();
  const people = d.select().from(users).all();
  const allGroups = d.select().from(groups).all();
  const members = d.select().from(groupMembers).all();
  return (
    <>
      <PageHeader title="Security" description="Each person's effective access, derived from their Entra groups." />
      <SecurityTabs active="people" />
      <DataTable
        columns={[
          { key: "name", header: "Person" },
          { key: "title", header: "Title" },
          { key: "groups", header: "Entra groups", filter: true },
          { key: "roles", header: "Effective roles" },
        ]}
        rows={people.map((p) => {
          const u = loadUser(d, catalog, p.id);
          const gs = members.filter((m) => m.userId === p.id).map((m) => allGroups.find((g) => g.id === m.groupId)?.name ?? m.groupId);
          return {
            id: p.id,
            values: {
              name: p.displayName,
              title: p.jobTitle,
              groups: gs.join(", ") || "none",
              roles: u ? u.roles.map((r) => catalog.roles.get(r)?.name ?? r).join(", ") || "none" : "disabled",
            },
          };
        })}
      />
    </>
  );
}
