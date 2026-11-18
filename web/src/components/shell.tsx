import type { ReactNode } from "react";
import { can } from "@acme/platform/rbac";
import { AppShell } from "@acme/platform/ui";
import { platform, requireUser } from "@/platform";

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
  return (
    <AppShell
      user={user}
      platformNav={platformNav}
      apps={platform.visibleApps(user).filter((a) => a.href.startsWith("/apps/"))}
      environment={platform.identity.kind === "demo" ? "Local demo: sign-in is simulated, authorization is real. Reset data with npm run db:reset" : undefined}
    >
      {children}
    </AppShell>
  );
}
