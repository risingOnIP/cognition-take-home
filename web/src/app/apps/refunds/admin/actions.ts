"use server";

import { revalidatePath } from "next/cache";
import { changeAppRole } from "@acme/platform/admin";
import type { FormState } from "@acme/platform/forms";
import { catalog, db, requirePermission } from "@/platform";
import { refundsApp } from "../manifest";

export async function changeRefundsRole(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("refunds.admin");
  const r = changeAppRole(db(), catalog, user, refundsApp, {
    op: formData.get("op") === "revoke" ? "revoke" : "grant",
    groupId: String(formData.get("groupId")),
    roleKey: String(formData.get("roleKey")),
    reason: String(formData.get("reason") ?? ""),
  });
  revalidatePath(`${refundsApp.href}/admin`);
  return { status: r.ok ? "success" : "error", message: r.message };
}
