import { and, eq, inArray, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { groupMembers, groupRoles, groups, users, type DbOrTx } from "../db";
import type { AppManifest, Permission, RoleCatalog } from "../registry";

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  jobTitle: string | null;
  department: string | null;
  groups: { id: string; name: string }[];
  roles: string[];
  permissions: Set<Permission>;
}

export class AccessDeniedError extends Error {
  constructor(public readonly permission: Permission, userId?: string) {
    super(`Access denied: ${userId ?? "anonymous"} lacks "${permission}"`);
    this.name = "AccessDeniedError";
  }
}

export function permissionsForRoles(catalog: RoleCatalog, roleKeys: string[]): Set<Permission> {
  const perms = new Set<Permission>();
  for (const key of roleKeys) for (const p of catalog.roles.get(key)?.permissions ?? []) perms.add(p);
  return perms;
}

/** Resolves user -> Entra groups -> roles -> permissions. */
export function loadUser(db: DbOrTx, catalog: RoleCatalog, userId: string): CurrentUser | null {
  const user = db.select().from(users).where(and(eq(users.id, userId), eq(users.active, true))).get();
  if (!user) return null;
  const memberOf = db
    .select({ id: groups.id, name: groups.name })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(eq(groupMembers.userId, userId))
    .all();
  const roleRows = memberOf.length
    ? db
        .select({ roleKey: groupRoles.roleKey })
        .from(groupRoles)
        .where(inArray(groupRoles.groupId, memberOf.map((g) => g.id)))
        .all()
    : [];
  const roles = [...new Set(roleRows.map((r) => r.roleKey))].filter((k) => catalog.roles.has(k)).sort();
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    jobTitle: user.jobTitle,
    department: user.department,
    groups: memberOf,
    roles,
    permissions: permissionsForRoles(catalog, roles),
  };
}

export function can(user: CurrentUser | null, permission: Permission): boolean {
  return !!user && user.permissions.has(permission);
}

export function assertCan(user: CurrentUser | null, permission: Permission): asserts user is CurrentUser {
  if (!can(user, permission)) throw new AccessDeniedError(permission, user?.id);
}

export function visibleApps(catalog: RoleCatalog, user: CurrentUser | null): AppManifest[] {
  return catalog.apps.filter((a) => can(user, a.accessPermission));
}

/**
 * Row-level security helper (Dataverse-style "own records" vs "all records").
 * Returns `undefined` (no filter) when the user holds `allPermission`, else restricts to `ownerColumn = user.id`.
 */
export function rowScope(user: CurrentUser, allPermission: Permission, ownerColumn: SQLiteColumn): SQL | undefined {
  return can(user, allPermission) ? undefined : eq(ownerColumn, user.id);
}

export interface SodViolation {
  userId: string;
  displayName: string;
  roleA: string;
  roleB: string;
  reason: string;
}

/** Users whose combined group memberships grant two conflicting roles. */
export function findSodViolations(db: DbOrTx, catalog: RoleCatalog): SodViolation[] {
  if (!catalog.sodConflicts.length) return [];
  const rows = db
    .select({ userId: users.id, displayName: users.displayName, roleKey: groupRoles.roleKey })
    .from(users)
    .innerJoin(groupMembers, eq(groupMembers.userId, users.id))
    .innerJoin(groupRoles, eq(groupRoles.groupId, groupMembers.groupId))
    .all();
  const byUser = new Map<string, { displayName: string; roles: Set<string> }>();
  for (const r of rows) {
    const entry = byUser.get(r.userId) ?? { displayName: r.displayName, roles: new Set() };
    entry.roles.add(r.roleKey);
    byUser.set(r.userId, entry);
  }
  const out: SodViolation[] = [];
  for (const [userId, { displayName, roles }] of byUser) {
    for (const c of catalog.sodConflicts) {
      if (roles.has(c.roleA) && roles.has(c.roleB)) out.push({ userId, displayName, ...c });
    }
  }
  return out;
}

/** SoD violations that *would* exist if `roleKey` were granted to `groupId`. */
export function sodViolationsIfGranted(db: DbOrTx, catalog: RoleCatalog, groupId: string, roleKey: string): SodViolation[] {
  const conflicts = catalog.sodConflicts.filter((c) => c.roleA === roleKey || c.roleB === roleKey);
  if (!conflicts.length) return [];
  const members = db
    .select({ userId: users.id, displayName: users.displayName })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId))
    .all();
  const out: SodViolation[] = [];
  for (const m of members) {
    const held = loadUser(db, catalog, m.userId)?.roles ?? [];
    for (const c of conflicts) {
      const other = c.roleA === roleKey ? c.roleB : c.roleA;
      if (held.includes(other)) out.push({ ...m, ...c });
    }
  }
  return out;
}
