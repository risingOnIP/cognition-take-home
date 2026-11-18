import type { AuditEvent } from "../audit";
import { Badge } from "./primitives";

function parse(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function diff(before: Record<string, unknown> | null, after: Record<string, unknown> | null): string[] {
  if (!after) return [];
  return Object.keys(after)
    .filter((k) => JSON.stringify(before?.[k]) !== JSON.stringify(after[k]))
    .map((k) => (before && k in before ? `${k}: ${String(before[k])} → ${String(after[k])}` : `${k}: ${String(after[k])}`));
}

/** Per-record history rendered from the platform audit trail. */
export function AuditTimeline({ events, actorNames = {} }: { events: AuditEvent[]; actorNames?: Record<string, string> }) {
  if (!events.length) return <p className="text-sm text-muted">No history yet.</p>;
  return (
    <ol className="space-y-4">
      {events.map((e) => (
        <li key={e.seq} className="relative border-l-2 border-line pl-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="brand">{e.action}</Badge>
            <span className="font-medium">{actorNames[e.actorId] ?? e.actorId}</span>
            <time className="text-xs text-muted">{new Date(e.at).toLocaleString("en-US")}</time>
          </div>
          {e.reason && <p className="mt-1 text-sm text-slate-700">“{e.reason}”</p>}
          {diff(parse(e.before), parse(e.after)).map((d) => (
            <p key={d} className="font-mono text-xs text-muted">
              {d}
            </p>
          ))}
          <p className="mt-0.5 font-mono text-[10px] text-slate-400" title="SHA-256 hash chained to the previous event">
            #{e.seq} · {e.hash.slice(0, 12)}…
          </p>
        </li>
      ))}
    </ol>
  );
}
