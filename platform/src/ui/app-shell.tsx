import Link from "next/link";
import type { ReactNode } from "react";
import type { CurrentUser } from "../rbac";
import type { AppManifest } from "../registry";
import { Badge } from "./primitives";

const linkClass = "whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-ink";

/** What the user menu shows: Entra identity and groups, and the role each app's RBAC gives them. */
export interface UserProfile {
  entraObjectId: string | null;
  groups: { name: string; entraObjectId: string | null }[];
  appRoles: { app: string; role: string; key: string }[];
}

/** Shared chrome: top bar with platform links, an Apps menu filtered by permission, and the signed-in user. */
export function AppShell({
  user,
  platformNav = [],
  apps,
  orgName = "Acme Pay",
  environment,
  profile,
  children,
}: {
  profile?: UserProfile;
  user: CurrentUser;
  platformNav?: { href: string; label: string }[];
  apps: AppManifest[];
  orgName?: string;
  environment?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {environment && <div className="bg-amber-100 px-6 py-1 text-center text-xs font-medium text-amber-900">{environment}</div>}
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-sm font-bold text-white">{orgName[0]}</span>
            <span className="whitespace-nowrap text-sm font-semibold">{orgName}</span>
          </Link>
          <nav className="flex items-center gap-1">
            {platformNav.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass}>
                {l.label}
              </Link>
            ))}
            <details className="relative">
              <summary className={`${linkClass} cursor-pointer list-none`}>Apps ▾</summary>
              <div className="absolute left-0 mt-1 w-56 rounded-lg border border-line bg-surface p-1 shadow-lg">
                <Link href="/apps" className={`block ${linkClass}`}>
                  All apps
                </Link>
                {apps.map((a) => (
                  <Link key={a.key} href={a.href} className={`block ${linkClass}`}>
                    {a.name}
                  </Link>
                ))}
                {!apps.length && <p className="px-3 py-1.5 text-xs text-muted">No apps for your groups</p>}
              </div>
            </details>
          </nav>
          <details className="relative ml-auto">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-100">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-xs font-semibold">
                {user.displayName.split(" ").map((p) => p[0]).join("")}
              </span>
              <span className="whitespace-nowrap text-sm font-medium">{user.displayName} ▾</span>
            </summary>
            <div className="absolute right-0 mt-1 w-80 rounded-lg border border-line bg-surface p-4 text-sm shadow-lg">
              <div className="font-medium">{user.displayName}</div>
              <div className="text-xs text-muted">{user.jobTitle}</div>
              <dl className="mt-3 space-y-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Microsoft Entra ID</dt>
                  <dd className="mt-1">{user.email}</dd>
                  {profile?.entraObjectId && <dd className="font-mono text-xs text-muted">oid {profile.entraObjectId}</dd>}
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Entra groups</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {user.groups.length ? user.groups.map((g) => <Badge key={g.id}>{g.name}</Badge>) : <span className="text-muted">None</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">App roles (from group mappings)</dt>
                  <dd className="mt-1">
                    {profile?.appRoles.length ? (
                      <table className="w-full text-left">
                        <tbody>
                          {[...new Set(profile.appRoles.map((r) => r.app))].sort().map((app) => (
                            <tr key={app} className="border-t border-line first:border-0">
                              <td className="py-1 text-muted">{app}</td>
                              <td className="py-1 text-right font-medium">
                                {profile.appRoles.filter((r) => r.app === app).map((r) => r.role).join(", ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <span className="text-muted">No app access</span>
                    )}
                  </dd>
                </div>
              </dl>
              <Link href="/login" className="mt-4 block border-t border-line pt-3 text-xs font-medium text-brand-600 hover:underline">
                Switch user
              </Link>
            </div>
          </details>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
