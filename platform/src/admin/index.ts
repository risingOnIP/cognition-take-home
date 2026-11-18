import { and, eq } from "drizzle-orm";
import { audit, listAuditEvents, type AuditEvent } from "../audit";
import { groupMembers, groupRoles, groups, users, type Db, type DbOrTx } from "../db";
import { assertCan, findSodViolations, sodViolationsIfGranted, type CurrentUser, type SodViolation } from "../rbac";
import type { AppManifest, RoleCatalog } from "../registry";

export interface AppAccessSummary {
  roles: {
    key: string;
    name: string;
    description: string;
    permissions: string[];
    groups: { name: string; members: string[] }[];
  }[];
  sodViolations: SodViolation[];
  recentActivity: AuditEvent[];
}

/** Everything an app owner needs to answer "who can do what in my app, and what happened". */
export function appAccessSummary(db: DbOrTx, catalog: RoleCatalog, app: AppManifest, opts: { activityLimit?: number } = {}): AppAccessSummary {
  const grants = db
    .select({ roleKey: groupRoles.roleKey, groupId: groups.id, groupName: groups.name })
    .from(groupRoles)
    .innerJoin(groups, eq(groups.id, groupRoles.groupId))
    .all();
  const members = db
    .select({ groupId: groupMembers.groupId, displayName: users.displayName })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(users.active, true))
    .all();
  const appRoleKeys = new Set(app.roles.map((r) => r.key));
  return {
    roles: app.roles.map((r) => ({
      key: r.key,
      name: r.name,
      description: r.description,
      permissions: [...r.permissions],
      groups: grants
        .filter((g) => g.roleKey === r.key)
        .map((g) => ({ name: g.groupName, members: members.filter((m) => m.groupId === g.groupId).map((m) => m.displayName) })),
    })),
    sodViolations: findSodViolations(db, catalog).filter((v) => appRoleKeys.has(v.roleA) || appRoleKeys.has(v.roleB)),
    recentActivity: listAuditEvents(db, { app: app.key, limit: opts.activityLimit ?? 500 }),
  };
}

export type RoleChangeResult = { ok: true; message: string } | { ok: false; message: string };

/**
 * App admins map Entra groups to their own app's roles. Requires `<app>.admin`, a reason, only touches
 * roles declared by this app, blocks segregation-of-duties conflicts, and audits the change.
 */
export function changeAppRole(
  db: Db,
  catalog: RoleCatalog,
  user: CurrentUser,
  app: AppManifest,
  input: { op: "grant" | "revoke"; groupId: string; roleKey: string; reason: string },
): RoleChangeResult {
  assertCan(user, `${app.key}.admin`);
  if (!app.roles.some((r) => r.key === input.roleKey)) return { ok: false, message: `${input.roleKey} is not a ${app.name} role.` };
  if (!input.reason.trim()) return { ok: false, message: "A reason (e.g. ticket number) is required for access changes." };
  if (input.op === "grant") {
    const conflicts = sodViolationsIfGranted(db, catalog, input.groupId, input.roleKey);
    if (conflicts.length) return { ok: false, message: `Blocked by segregation of duties: ${conflicts.map((c) => `${c.displayName} (${c.reason})`).join("; ")}` };
  }
  db.transaction((tx) => {
    if (input.op === "grant") tx.insert(groupRoles).values({ groupId: input.groupId, roleKey: input.roleKey }).onConflictDoNothing().run();
    else tx.delete(groupRoles).where(and(eq(groupRoles.groupId, input.groupId), eq(groupRoles.roleKey, input.roleKey))).run();
    audit(tx, {
      actorId: user.id,
      app: app.key,
      action: `role.${input.op}`,
      entity: { type: "group", id: input.groupId },
      ...(input.op === "grant" ? { after: { roleKey: input.roleKey } } : { before: { roleKey: input.roleKey } }),
      reason: input.reason.trim(),
    });
  });
  return { ok: true, message: `${input.op === "grant" ? "Granted" : "Revoked"} ${input.roleKey}.` };
}
