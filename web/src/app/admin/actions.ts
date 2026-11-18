"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { audit } from "@acme/platform/audit";
import { groupRoles } from "@acme/platform/db";
import type { FormState } from "@acme/platform/forms";
import { sodViolationsIfGranted } from "@acme/platform/rbac";
import { catalog, db, requirePermission } from "@/platform";

export async function grantRole(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("admin.roles.manage");
  const groupId = String(formData.get("groupId"));
  const roleKey = String(formData.get("roleKey"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!catalog.roles.has(roleKey)) return { status: "error", message: `Unknown role ${roleKey}` };
  if (!reason) return { status: "error", message: "A reason (e.g. ticket number) is required for access changes." };
  const conflicts = sodViolationsIfGranted(db(), catalog, groupId, roleKey);
  if (conflicts.length) {
    return { status: "error", message: `Blocked by segregation of duties: ${conflicts.map((c) => `${c.displayName} (${c.reason})`).join("; ")}` };
  }
  db().transaction((tx) => {
    tx.insert(groupRoles).values({ groupId, roleKey }).onConflictDoNothing().run();
    audit(tx, { actorId: user.id, app: "admin", action: "role.grant", entity: { type: "group", id: groupId }, after: { roleKey }, reason });
  });
  revalidatePath("/admin");
  return { status: "success", message: `Granted ${roleKey}.` };
}

export async function revokeRole(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("admin.roles.manage");
  const groupId = String(formData.get("groupId"));
  const roleKey = String(formData.get("roleKey"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { status: "error", message: "A reason is required for access changes." };
  db().transaction((tx) => {
    tx.delete(groupRoles).where(and(eq(groupRoles.groupId, groupId), eq(groupRoles.roleKey, roleKey))).run();
    audit(tx, { actorId: user.id, app: "admin", action: "role.revoke", entity: { type: "group", id: groupId }, before: { roleKey }, reason });
  });
  revalidatePath("/admin");
  return { status: "success", message: `Revoked ${roleKey}.` };
}
