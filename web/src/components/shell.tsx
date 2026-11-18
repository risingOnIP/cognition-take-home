import type { ReactNode } from "react";
import { groups, users } from "@acme/platform/db";
import { can } from "@acme/platform/rbac";
import { eq, inArray } from "drizzle-orm";
import { AppShell } from "@acme/platform/ui";
import { catalog, db, platform, requireUser } from "@/platform";

export async function Shell({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const platformNav = [
    { href: "/", label: "Overview" },
    { href: "/primitives", label: "Primitives" },
    { href: "/knowledge", label: "Knowledge" },
    { href: "/playbooks", label: "Playbooks" },
    { href: "/bots", label: "Bots" },
    ...(can(user, "audit.view") ? [{ href: "/audit", label: "Audit log" }] : []),
  ];
  const me = db().select({ oid: users.entraObjectId }).from(users).where(eq(users.id, user.id)).get();
  const groupIds = user.groups.map((g) => g.id);
  const profile = {
    entraObjectId: me?.oid ?? null,
    groups: groupIds.length ? db().select({ name: groups.name, entraObjectId: groups.entraObjectId }).from(groups).where(inArray(groups.id, groupIds)).all() : [],
    appRoles: user.roles.map((key) => {
      const role = catalog.roles.get(key);
      return { key, app: catalog.apps.find((a) => a.key === role?.app)?.name ?? role?.app ?? "", role: role?.name ?? key };
    }),
  };
  return (
    <AppShell
      profile={profile}
      user={user}
      platformNav={platformNav}
      apps={platform.visibleApps(user).filter((a) => a.href.startsWith("/apps/"))}
      environment={platform.identity.kind === "demo" ? "Local demo: sign-in is simulated, authorization is real. Reset data with npm run db:reset" : undefined}
    >
      {children}
    </AppShell>
  );
}
