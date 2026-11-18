import { eq } from "drizzle-orm";
import { listAuditEvents, type AuditEvent } from "../audit";
import { groupMembers, groupRoles, groups, users, type DbOrTx } from "../db";
import { findSodViolations, type SodViolation } from "../rbac";
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
    recentActivity: listAuditEvents(db, { app: app.key, limit: opts.activityLimit ?? 20 }),
  };
}
