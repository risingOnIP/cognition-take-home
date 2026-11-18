"use server";

import { revalidatePath } from "next/cache";
import { parseForm, type FormState } from "@acme/platform/forms";
import { WorkflowError } from "@acme/platform/workflow";
import { db, requirePermission } from "@/platform";
import { __camel__App } from "../manifest";
import { createItem, newItemSchema, transitionItem } from "./service";

export async function createItemAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("__key__.create");
  const parsed = parseForm(newItemSchema, formData);
  if (!parsed.ok) return parsed.state;
  createItem(db(), user, parsed.data);
  revalidatePath(__camel__App.href);
  return { status: "success", message: "Created." };
}

export async function transitionItemAction(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("__key__.view");
  const transition = String(formData.get("transition")) as "approve" | "reject";
  try {
    transitionItem(db(), user, id, transition, String(formData.get("reason") ?? "").trim() || null);
  } catch (e) {
    if (e instanceof WorkflowError) return { status: "error", message: e.message };
    throw e;
  }
  revalidatePath(`${__camel__App.href}/${id}`);
  return { status: "success", message: "Done." };
}
