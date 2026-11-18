import { redirect } from "next/navigation";
import type { IdentityProvider } from "./auth";
import { getDb, type Db } from "./db";
import { AccessDeniedError, assertCan, can, loadUser, visibleApps, type CurrentUser } from "./rbac";
import { buildRoleCatalog, platformAdminApp, type AppManifest, type Permission } from "./registry";

export interface PlatformConfig {
  apps: AppManifest[];
  identity: IdentityProvider;
  db?: () => Db;
}

/**
 * Wires the registry, identity provider and database together. The web app calls this once
 * (web/src/platform.ts) and every internal app imports the returned helpers.
 */
export function createPlatform(config: PlatformConfig) {
  const apps = [platformAdminApp, ...config.apps];
  const catalog = buildRoleCatalog(apps);
  const db = config.db ?? getDb;

  async function getCurrentUser(): Promise<CurrentUser | null> {
    const id = await config.identity.getUserId();
    return id ? loadUser(db(), catalog, id) : null;
  }

  /** For pages: redirects to sign-in if anonymous. */
  async function requireUser(): Promise<CurrentUser> {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    return user;
  }

  /** For server actions and data loaders: throws `AccessDeniedError` without the permission. */
  async function requirePermission(permission: Permission): Promise<CurrentUser> {
    const user = await getCurrentUser();
    if (!user) throw new AccessDeniedError(permission);
    assertCan(user, permission);
    return user;
  }

  /** For pages: anonymous -> /login, lacking permission -> /forbidden. */
  async function requirePageAccess(permission: Permission): Promise<CurrentUser> {
    const user = await requireUser();
    if (!can(user, permission)) redirect(`/forbidden?permission=${encodeURIComponent(permission)}`);
    return user;
  }

  return {
    apps,
    catalog,
    db,
    identity: config.identity,
    getCurrentUser,
    requireUser,
    requirePermission,
    requirePageAccess,
    visibleApps: (user: CurrentUser | null) => visibleApps(catalog, user),
  };
}

export type Platform = ReturnType<typeof createPlatform>;
export { can, AccessDeniedError, type CurrentUser };
