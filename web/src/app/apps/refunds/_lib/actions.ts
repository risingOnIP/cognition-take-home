"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { users } from "@acme/platform/db";
import { parseForm, type FormState } from "@acme/platform/forms";
import { revealPii } from "@acme/platform/pii";
import { WorkflowError } from "@acme/platform/workflow";
import { eq } from "drizzle-orm";
import { db, paymentProcessor, requirePermission } from "@/platform";
import { refundsApp } from "../manifest";
import { createRefund, decideRefund, getRefund, newRefundSchema, payRefund } from "./service";

export async function createRefundAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("refunds.request");
  const parsed = parseForm(newRefundSchema, formData);
  if (!parsed.ok) return parsed.state;
  const refund = createRefund(db(), user, parsed.data);
  revalidatePath(refundsApp.href);
  redirect(`${refundsApp.href}/${refund.id}`);
}

export async function transitionRefundAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("refunds.view");
  const transition = String(formData.get("transition"));
  const reason = String(formData.get("reason") ?? "").trim() || null;
  try {
    if (transition === "approve" || transition === "reject") decideRefund(db(), user, id, transition, reason);
    else if (transition === "pay") await payRefund(db(), user, id, paymentProcessor);
    else return { status: "error", message: `Unknown action ${transition}` };
  } catch (e) {
    if (e instanceof WorkflowError || (e as Error).name === "AccessDeniedError") return { status: "error", message: (e as Error).message };
    throw e;
  }
  revalidatePath(`${refundsApp.href}/${id}`);
  revalidatePath(refundsApp.href);
  return { status: "success", message: "Done." };
}

export async function revealCustomerEmailAction(id: string, reason: string): Promise<{ value?: string; error?: string }> {
  const user = await requirePermission("refunds.pii.reveal");
  const refund = getRefund(db(), user, id);
  if (!refund) return { error: "Not found" };
  try {
    const value = revealPii(db(), { user, permission: "refunds.pii.reveal", app: refundsApp.key, entity: { type: "refund", id }, field: "customerEmail", value: refund.customerEmail, reason });
    revalidatePath(`${refundsApp.href}/${id}`);
    return { value };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function userNames(): Promise<Record<string, string>> {
  await requirePermission("refunds.view");
  return Object.fromEntries(db().select({ id: users.id, n: users.displayName }).from(users).where(eq(users.active, true)).all().map((u) => [u.id, u.n]));
}
