import type { ReactNode } from "react";
import { AppShell } from "@acme/platform/ui";
import { platform, requireUser } from "@/platform";

export async function Shell({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell user={user} apps={platform.visibleApps(user)} environment={platform.identity.kind === "demo" ? "Local demo — sign-in is simulated; data is seeded and resettable with npm run db:reset" : undefined}>
      {children}
    </AppShell>
  );
}
