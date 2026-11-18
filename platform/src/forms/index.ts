import { z } from "zod";

export type FormState<T = unknown> =
  | { status: "idle" }
  | { status: "success"; message?: string; data?: T }
  | { status: "error"; message?: string; fieldErrors?: Record<string, string[]> };

export const initialFormState: FormState = { status: "idle" };

/** Validates FormData against a Zod schema on the server. Never trust client-side validation. */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { ok: true; data: z.infer<S> } | { ok: false; state: FormState } {
  const raw: Record<string, FormDataEntryValue> = {};
  for (const [k, v] of formData.entries()) if (!k.startsWith("$ACTION")) raw[k] = v;
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, state: { status: "error", message: "Please fix the highlighted fields.", fieldErrors } };
}
