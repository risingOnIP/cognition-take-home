"use server";

import { revalidatePath } from "next/cache";
import { users } from "@acme/platform/db";
import { parseForm, type FormState } from "@acme/platform/forms";
import { WorkflowError } from "@acme/platform/workflow";
import { eq } from "drizzle-orm";
import { db, requirePermission } from "@/platform";
import { kycApp } from "../manifest";
import { PII_FIELDS, reassignCase, reassignSchema, revealCaseField, SYSTEM_ACTOR, transitionCase, type PiiField } from "./service";
import { kycWorkflow, type KycTransition } from "./workflow";

const isUserError = (e: unknown) => e instanceof WorkflowError || (e as Error).name === "AccessDeniedError";

function revalidateCase(id: string) {
  revalidatePath(`${kycApp.href}/${id}`);
  revalidatePath(kycApp.href);
}

export async function transitionCaseAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("kyc.view");
  const transition = String(formData.get("transition")) as KycTransition;
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!(transition in kycWorkflow.transitions)) return { status: "error", message: `Unknown action ${transition}` };
  try {
    transitionCase(db(), user, id, transition, reason);
  } catch (e) {
    if (isUserError(e)) return { status: "error", message: (e as Error).message };
    throw e;
  }
  revalidateCase(id);
  return { status: "success", message: "Done." };
}

export async function reassignCaseAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("kyc.assign");
  const parsed = parseForm(reassignSchema, formData);
  if (!parsed.ok) return parsed.state;
  try {
    reassignCase(db(), user, id, parsed.data);
  } catch (e) {
    if (isUserError(e)) return { status: "error", message: (e as Error).message };
    throw e;
  }
  revalidateCase(id);
  return { status: "success", message: "Case reassigned." };
}

export async function revealCaseFieldAction(id: string, field: PiiField, reason: string): Promise<{ value?: string; error?: string }> {
  const user = await requirePermission("kyc.pii.reveal");
  if (!PII_FIELDS.includes(field)) return { error: "Unknown field" };
  try {
    const value = revealCaseField(db(), user, id, field, reason);
    revalidatePath(`${kycApp.href}/${id}`);
    return { value };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function userNames(): Promise<Record<string, string>> {
  await requirePermission("kyc.view");
  const rows = db().select({ id: users.id, n: users.displayName }).from(users).where(eq(users.active, true)).all();
  return { [SYSTEM_ACTOR]: "Onboarding system", ...Object.fromEntries(rows.map((u) => [u.id, u.n])) };
}
