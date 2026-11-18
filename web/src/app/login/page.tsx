import { users } from "@acme/platform/db";
import { loadUser } from "@acme/platform/rbac";
import { Badge } from "@acme/platform/ui";
import { catalog, db } from "@/platform";
import { signInAs } from "./actions";

export default function LoginPage() {
  const people = db()
    .select()
    .from(users)
    .all()
    .map((u) => loadUser(db(), catalog, u.id)!)
    .filter(Boolean);
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-brand-600 font-bold text-white">A</div>
        <h1 className="text-2xl font-semibold">Sign in as…</h1>
        <p className="mt-1 text-sm text-muted">
          Demo stand-in for Microsoft Entra ID SSO. Each person&apos;s access comes only from their Entra security groups, mapped to app roles.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {people.map((u) => (
          <form key={u.id} action={signInAs}>
            <input type="hidden" name="userId" value={u.id} />
            <button className="w-full rounded-lg border border-line bg-surface p-4 text-left shadow-sm transition hover:border-brand-500 hover:shadow">
              <div className="font-medium">{u.displayName}</div>
              <div className="text-xs text-muted">{u.jobTitle}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {u.groups.map((g) => (
                  <Badge key={g.id}>{g.name}</Badge>
                ))}
                {!u.groups.length && <Badge>no groups</Badge>}
              </div>
              <div className="mt-2 space-y-0.5 text-xs">
                {u.roles.length ? (
                  u.roles.map((r) => {
                    const role = catalog.roles.get(r);
                    const app = catalog.apps.find((a) => a.key === role?.app);
                    return (
                      <div key={r}>
                        <span className="text-muted">{app?.name ?? role?.app}:</span> <span className="font-medium">{role?.name ?? r}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-muted">No app access</div>
                )}
              </div>
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
