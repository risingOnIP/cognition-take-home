"use client";

import { useActionState } from "react";
import type { FormState } from "../forms";
import { Alert, buttonClass } from "./primitives";

export interface FormField {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "money" | "select" | "textarea" | "hidden";
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  defaultValue?: string;
  required?: boolean;
}

const inputClass =
  "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 aria-[invalid=true]:border-rose-400";

/**
 * Power Apps "form" equivalent: declarative fields bound to a server action. Validation runs on
 * the server (Zod via `parseForm`) and field errors are rendered inline.
 */
export function SchemaForm({
  fields,
  action,
  submitLabel = "Submit",
}: {
  fields: FormField[];
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as FormState);
  const errors = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && state.message && <Alert tone="danger">{state.message}</Alert>}
      {state.status === "success" && state.message && <Alert tone="success">{state.message}</Alert>}
      {fields.map((f) => {
        if (f.type === "hidden") return <input key={f.name} type="hidden" name={f.name} defaultValue={f.defaultValue} />;
        const invalid = !!errors[f.name];
        const common = { id: f.name, name: f.name, defaultValue: f.defaultValue, required: f.required, "aria-invalid": invalid, className: inputClass, placeholder: f.placeholder };
        return (
          <div key={f.name}>
            <label htmlFor={f.name} className="mb-1 block text-sm font-medium">
              {f.label}
              {f.required && <span className="text-rose-500"> *</span>}
            </label>
            {f.type === "select" ? (
              <select {...common}>
                <option value="">Select…</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea rows={3} {...common} />
            ) : f.type === "money" ? (
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">$</span>
                <input {...common} inputMode="decimal" className={`${inputClass} pl-7`} />
              </div>
            ) : (
              <input type={f.type ?? "text"} {...common} />
            )}
            {f.help && !invalid && <p className="mt-1 text-xs text-muted">{f.help}</p>}
            {errors[f.name]?.map((e) => (
              <p key={e} className="mt-1 text-xs text-rose-600">
                {e}
              </p>
            ))}
          </div>
        );
      })}
      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "Working…" : submitLabel}
      </button>
    </form>
  );
}
