"use client";

import { useRef, useState } from "react";
import type { PrimitiveInfo } from "@acme/platform/catalog";

export interface PrimitiveGroup {
  key: string;
  title: string;
  blurb: string;
  items: PrimitiveInfo[];
}

export function PrimitiveDiagram({ groups }: { groups: PrimitiveGroup[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<PrimitiveGroup | null>(null);

  function show(g: PrimitiveGroup) {
    setOpen(g);
    dialog.current?.showModal();
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => show(g)}
            className="group rounded-lg border border-brand-100 bg-white px-4 py-3 text-left transition hover:border-brand-500 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{g.title}</span>
              <span className="text-xs text-muted opacity-0 transition group-hover:opacity-100">Details →</span>
            </div>
            <p className="mt-0.5 text-xs text-muted">{g.blurb}</p>
          </button>
        ))}
      </div>

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-full max-w-xl rounded-xl border border-line p-0 shadow-xl backdrop:bg-slate-900/40"
      >
        {open && (
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{open.title}</h3>
                <p className="text-sm text-muted">{open.blurb}</p>
              </div>
              <button type="button" onClick={() => dialog.current?.close()} className="rounded p-1 text-muted hover:bg-slate-100 hover:text-ink" aria-label="Close">
                ✕
              </button>
            </div>
            <ul className="mt-5 space-y-4">
              {open.items.map((p) => (
                <li key={p.name} className="border-t border-line pt-4 first:border-0 first:pt-0">
                  <div className="text-sm font-medium">{p.name}</div>
                  <p className="mt-1 text-sm text-slate-700">{p.what}</p>
                  <p className="mt-2 text-xs text-muted">
                    Replaces: {p.replaces} · <code className="text-brand-700">{p.module}</code>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </dialog>
    </>
  );
}
