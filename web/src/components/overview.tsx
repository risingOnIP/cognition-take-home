import type { PrimitiveInfo } from "@acme/platform/catalog";

export function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 pt-10">
      <h2 className="text-lg font-semibold">{title}</h2>
      {intro && <p className="mt-1 max-w-3xl text-sm text-muted">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function PrimitiveTable({ rows }: { rows: PrimitiveInfo[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-2.5">Primitive</th>
            <th className="px-4 py-2.5">Replaces</th>
            <th className="px-4 py-2.5">Import</th>
            <th className="px-4 py-2.5">What it does</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.name} className="border-t border-line align-top">
              <td className="px-4 py-3 font-medium">{p.name}</td>
              <td className="px-4 py-3 text-muted">{p.replaces}</td>
              <td className="px-4 py-3">
                <code className="text-xs text-brand-700">{p.module}</code>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.exports.map((e) => (
                    <code key={e} className="rounded bg-slate-100 px-1 text-[11px]">
                      {e}
                    </code>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-700">{p.what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
