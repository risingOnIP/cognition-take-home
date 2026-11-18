import Link from "next/link";
import type { ReactNode } from "react";
import type { CurrentUser } from "../rbac";
import type { AppManifest } from "../registry";
import { Badge } from "./primitives";

/** Shared chrome: launcher nav filtered by permission, signed-in identity, roles and environment banner. */
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
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-line bg-surface">
        <Link href="/" className="flex items-center gap-2 border-b border-line px-5 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-sm font-bold text-white">{orgName[0]}</span>
          <span>
            <span className="block text-sm font-semibold leading-tight">{orgName}</span>
            <span className="block text-xs text-muted">Internal Tools</span>
          </span>
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Platform</div>
          {platformNav.map((l) => (
            <Link key={l.href} href={l.href} className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-ink">
              {l.label}
            </Link>
          ))}
          <div className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted">Apps</div>
          <Link href="/apps" className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-ink">
            All apps
          </Link>
          {apps.map((a) => (
            <Link key={a.key} href={a.href} className="block rounded-md px-3 py-2 pl-6 text-sm text-slate-700 hover:bg-slate-100 hover:text-ink">
              {a.name}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line p-4">
          <div className="text-sm font-medium">{user.displayName}</div>
          <div className="text-xs text-muted">{user.jobTitle ?? user.email}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {user.roles.length ? user.roles.map((r) => <Badge key={r} tone="brand">{r}</Badge>) : <Badge>no roles</Badge>}
          </div>
          <Link href="/login" className="mt-3 block text-xs font-medium text-brand-600 hover:underline">
            Switch user
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {environment && (
          <div className="bg-amber-100 px-6 py-1 text-center text-xs font-medium text-amber-900">
            {environment}
          </div>
        )}
        <main className="mx-auto w-full max-w-7xl flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
