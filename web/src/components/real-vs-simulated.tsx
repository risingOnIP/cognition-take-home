export function RealVsSimulated() {
  return (
    <div className="grid gap-4 rounded-xl border border-line bg-surface p-5 md:grid-cols-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Real today</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          <li>Group → role → permission checks on every page and action</li>
          <li>Row-level scoping, maker-checker, SoD blocking</li>
          <li>Role grants managed here, every change audited</li>
        </ul>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Simulated</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          <li>Sign-in: a user picker instead of Microsoft login</li>
          <li>Directory: seeded users and groups instead of your tenant</li>
        </ul>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Only step left</p>
        <p className="mt-2 text-sm text-slate-700">
          Register an Entra app, add Microsoft login, and swap <code>demoIdentityProvider</code> for <code>entraIdentityProvider</code> in <code>web/src/platform.ts</code>. Group memberships then sync from Entra on each sign-in; nothing in the apps changes.
        </p>
      </div>
    </div>
  );
}
