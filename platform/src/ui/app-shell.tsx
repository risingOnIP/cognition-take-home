import Link from "next/link";
import type { ReactNode } from "react";
import type { CurrentUser } from "../rbac";
import type { AppManifest } from "../registry";

const linkClass = "whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-ink";

/** Shared chrome: top bar with platform links, an Apps menu filtered by permission, and the signed-in user. */
export function AppShell({
  user,
  platformNav = [],
  apps,
  orgName = "Acme Pay",
  environment,
  children,
}: {
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
          <div className="ml-auto flex items-center gap-3 text-right">
            <div>
              <div className="text-sm font-medium leading-tight">{user.displayName}</div>
              <div className="text-xs text-muted" title={user.roles.join(", ")}>{user.roles.length} role{user.roles.length === 1 ? "" : "s"}</div>
            </div>
            <Link href="/login" className="whitespace-nowrap text-xs font-medium text-brand-600 hover:underline">
              Switch user
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
