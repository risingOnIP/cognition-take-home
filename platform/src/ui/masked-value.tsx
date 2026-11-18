"use client";

import { useState, useTransition } from "react";

/**
 * Displays a server-masked value. Revealing calls a server action that checks permission,
 * requires a reason and writes a `pii.reveal` audit event before returning the raw value.
 */
export function MaskedValue({
  masked,
  canReveal,
  reveal,
}: {
  masked: string;
  canReveal: boolean;
  reveal?: (reason: string) => Promise<{ value?: string; error?: string }>;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (value) return <span className="font-mono text-sm">{value}</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-sm text-muted">{masked}</span>
      {canReveal && reveal && (
        <button
          type="button"
          disabled={pending}
          className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
          onClick={() => {
            const reason = window.prompt("Reason for viewing this PII (recorded in the audit log):");
            if (!reason) return;
            start(async () => {
              const res = await reveal(reason);
              if (res.value) setValue(res.value);
              else setError(res.error ?? "Not allowed");
            });
          }}
        >
          Reveal
        </button>
      )}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
