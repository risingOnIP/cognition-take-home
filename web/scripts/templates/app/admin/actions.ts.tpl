"use server";

import { revalidatePath } from "next/cache";
import { changeAppRole } from "@acme/platform/admin";
import type { FormState } from "@acme/platform/forms";
import { catalog, db, requirePermission } from "@/platform";
import { __camel__App } from "../manifest";

export async function changeRole(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("__key__.admin");
  const r = changeAppRole(db(), catalog, user, __camel__App, {
    op: formData.get("op") === "revoke" ? "revoke" : "grant",
    groupId: String(formData.get("groupId")),
    roleKey: String(formData.get("roleKey")),
    reason: String(formData.get("reason") ?? ""),
  });
  revalidatePath(`${__camel__App.href}/admin`);
  return { status: r.ok ? "success" : "error", message: r.message };
}
