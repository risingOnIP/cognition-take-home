"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { buttonClass, cx } from "./primitives";

export interface DataTableColumn {
  key: string;
  header: string;
  align?: "left" | "right";
  /** Show a dropdown filter built from the distinct values in this column. */
  filter?: boolean;
}

export interface DataTableRow {
  id: string;
  href?: string;
  /** Raw values used for search, sort, filter and CSV export. */
  values: Record<string, string | number | null>;
  /** Optional rendered cells (e.g. badges); falls back to the raw value. */
  display?: Record<string, ReactNode>;
}

/** Power Apps "gallery" equivalent: search, filter, sort, paginate, export to CSV. */
export function DataTable({
  columns,
  rows,
  pageSize = 10,
  exportName,
  emptyMessage = "No records",
}: {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  pageSize?: number;
  exportName?: string;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const filterOptions = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const c of columns.filter((c) => c.filter)) {
      out[c.key] = [...new Set(rows.map((r) => String(r.values[c.key] ?? "")))].filter(Boolean).sort();
    }
    return out;
  }, [columns, rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter(
      (r) =>
        (!q || Object.values(r.values).some((v) => String(v ?? "").toLowerCase().includes(q))) &&
        Object.entries(filters).every(([k, v]) => !v || String(r.values[k] ?? "") === v),
    );
    if (sort) {
      out = [...out].sort((a, b) => {
        const av = a.values[sort.key] ?? "";
        const bv = b.values[sort.key] ?? "";
        return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * sort.dir;
      });
    }
    return out;
  }, [rows, query, filters, sort]);

  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pages - 1);
  const pageRows = visible.slice(current * pageSize, current * pageSize + pageSize);

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [columns.map((c) => esc(c.header)).join(","), ...visible.map((r) => columns.map((c) => esc(r.values[c.key])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${exportName ?? "export"}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-lg border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search…"
          className="w-64 rounded-md border border-line px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        {columns
          .filter((c) => c.filter)
          .map((c) => (
            <select
              key={c.key}
              aria-label={`Filter by ${c.header}`}
              value={filters[c.key] ?? ""}
              onChange={(e) => {
                setFilters({ ...filters, [c.key]: e.target.value });
                setPage(0);
              }}
              className="rounded-md border border-line px-2 py-1.5 text-sm"
            >
              <option value="">All {c.header.toLowerCase()}</option>
              {filterOptions[c.key]?.map((o) => (
                <option key={o} value={o}>
                  {o.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          ))}
        <div className="ml-auto flex items-center gap-3 text-xs text-muted">
          <span>
            {visible.length} of {rows.length}
          </span>
          {exportName && (
            <button type="button" onClick={exportCsv} className={buttonClass("secondary", "sm")}>
              Export CSV
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              {columns.map((c) => (
                <th key={c.key} className={cx("px-4 py-2 font-medium", c.align === "right" && "text-right")}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-ink"
                    onClick={() => setSort(sort?.key === c.key ? { key: c.key, dir: sort.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 })}
                  >
                    {c.header}
                    {sort?.key === c.key && <span>{sort.dir === 1 ? "▲" : "▼"}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-slate-50">
                {columns.map((c, i) => {
                  const content = r.display?.[c.key] ?? r.values[c.key] ?? "—";
                  return (
                    <td key={c.key} className={cx("px-4 py-2.5", c.align === "right" && "text-right tabular-nums")}>
                      {i === 0 && r.href ? (
                        <Link href={r.href} className="font-medium text-brand-600 hover:underline">
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!pageRows.length && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-muted">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-line px-3 py-2 text-xs text-muted">
          <button type="button" className={buttonClass("secondary", "sm")} disabled={current === 0} onClick={() => setPage(current - 1)}>
            Previous
          </button>
          <span>
            Page {current + 1} / {pages}
          </span>
          <button type="button" className={buttonClass("secondary", "sm")} disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
