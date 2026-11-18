"use client";

import { useActionState } from "react";
import type { FormState } from "../forms";
import { Alert, buttonClass, type ButtonVariant } from "./primitives";

export interface WorkflowActionOption {
  key: string;
  label: string;
  variant?: ButtonVariant;
}

/** Renders the transitions a user may perform plus a reason box (stored in the audit trail). */
export function WorkflowActions({
  transitions,
  action,
  reasonLabel = "Reason / note",
  blockedReason,
}: {
  transitions: WorkflowActionOption[];
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  reasonLabel?: string;
  /** Shown when no transitions are available, e.g. the maker-checker explanation. */
  blockedReason?: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as FormState);
  return (
    <form action={formAction} className="space-y-3">
      {state.status === "error" && <Alert tone="danger">{state.message}</Alert>}
      {state.status === "success" && state.message && <Alert tone="success">{state.message}</Alert>}
      {transitions.length ? (
        <>
          <label className="block text-sm font-medium" htmlFor="reason">
            {reasonLabel}
          </label>
          <textarea id="reason" name="reason" rows={2} className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <button key={t.key} type="submit" name="transition" value={t.key} disabled={pending} className={buttonClass(t.variant ?? "primary")}>
                {t.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">{blockedReason ?? "No actions available to you for this item."}</p>
      )}
    </form>
  );
}
