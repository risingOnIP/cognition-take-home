export type Permission = string;

export interface RoleDef {
  /** Globally unique, e.g. `refunds.manager`. Assigned to Entra groups via `group_roles`. */
  key: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface AppManifest {
  /** URL-safe id, also used as the `app` field in audit events. */
  key: string;
  name: string;
  description: string;
  href: string;
  /** Owning team, shown in the launcher (who to ask for access / who maintains it). */
  owner: string;
  /** Permission required to see the app in the launcher and open it. */
  accessPermission: Permission;
  permissions: Record<Permission, string>;
  roles: RoleDef[];
  /** Pairs of role keys no single user may hold at once (segregation of duties). */
  sodConflicts?: [string, string, string][];
}

export function defineApp<const M extends AppManifest>(manifest: M): M {
  for (const role of manifest.roles) {
    for (const p of role.permissions) {
      if (!(p in manifest.permissions)) {
        throw new Error(`App "${manifest.key}": role "${role.key}" grants undeclared permission "${p}"`);
      }
    }
  }
  return manifest;
}

/** Built-in app: directory, access management and the audit trail. */
export const platformAdminApp = defineApp({
  key: "admin",
  name: "Access & Audit",
  description: "Directory, group-to-role assignments, segregation-of-duties checks and the audit trail.",
  href: "/admin",
  owner: "Platform Engineering",
  accessPermission: "admin.view",
  permissions: {
    "admin.view": "Open the Access & Audit app",
    "admin.roles.manage": "Assign or remove roles on groups",
    "audit.view": "Read the audit trail",
  },
  roles: [
    {
      key: "platform.admin",
      name: "Platform admin",
      description: "Manages group-to-role assignments.",
      permissions: ["admin.view", "admin.roles.manage", "audit.view"],
    },
    {
      key: "platform.auditor",
      name: "Auditor",
      description: "Read-only access to directory and audit trail.",
      permissions: ["admin.view", "audit.view"],
    },
  ],
});

export interface RoleCatalog {
  apps: AppManifest[];
  roles: Map<string, RoleDef & { app: string }>;
  sodConflicts: { roleA: string; roleB: string; reason: string }[];
}

export function buildRoleCatalog(apps: AppManifest[]): RoleCatalog {
  const roles = new Map<string, RoleDef & { app: string }>();
  const keys = new Set<string>();
  for (const app of apps) {
    if (keys.has(app.key)) throw new Error(`Duplicate app key "${app.key}"`);
    keys.add(app.key);
    for (const role of app.roles) {
      if (roles.has(role.key)) throw new Error(`Duplicate role key "${role.key}"`);
      roles.set(role.key, { ...role, app: app.key });
    }
  }
  const sodConflicts = apps.flatMap((a) =>
    (a.sodConflicts ?? []).map(([roleA, roleB, reason]) => ({ roleA, roleB, reason })),
  );
  return { apps, roles, sodConflicts };
}
