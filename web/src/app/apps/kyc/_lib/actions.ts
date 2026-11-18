"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { users } from "@acme/platform/db";
import { parseForm, type FormState } from "@acme/platform/forms";
import { WorkflowError } from "@acme/platform/workflow";
import { db, requirePermission } from "@/platform";
import { kycApp } from "../manifest";
import { INTAKE_ACTOR } from "./schema";
import { assignCase, assignCaseSchema, decideCase, revealCaseField } from "./service";

const userError = (e: unknown) => e instanceof WorkflowError || (e as Error).name === "AccessDeniedError";

export async function transitionCaseAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("kyc.view");
  const transition = String(formData.get("transition"));
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (transition !== "approve" && transition !== "reject" && transition !== "escalate") return { status: "error", message: `Unknown action ${transition}` };
  try {
    decideCase(db(), user, id, transition, reason);
  } catch (e) {
    if (userError(e)) return { status: "error", message: (e as Error).message };
    throw e;
  }
  revalidatePath(`${kycApp.href}/${id}`);
  revalidatePath(kycApp.href);
  return { status: "success", message: transition === "escalate" ? "Escalated to a compliance lead." : `Case ${transition === "approve" ? "approved" : "rejected"}.` };
}

export async function assignCaseAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("kyc.assign");
  const parsed = parseForm(assignCaseSchema, formData);
  if (!parsed.ok) return parsed.state;
  try {
    assignCase(db(), user, id, parsed.data);
  } catch (e) {
    if (userError(e)) return { status: "error", message: (e as Error).message };
    throw e;
  }
  revalidatePath(`${kycApp.href}/${id}`);
  revalidatePath(kycApp.href);
  return { status: "success", message: "Assignment updated." };
}

export async function revealCaseFieldAction(id: string, field: string, reason: string): Promise<{ value?: string; error?: string }> {
  const user = await requirePermission("kyc.pii.reveal");
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
  return { [INTAKE_ACTOR]: "Onboarding (automated intake)", ...Object.fromEntries(rows.map((u) => [u.id, u.n])) };
}
