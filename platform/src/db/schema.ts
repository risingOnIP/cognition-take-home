import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);

/** Directory: mirrors Entra ID users. `entraObjectId` is the `oid` claim. */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  entraObjectId: text("entra_object_id").unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  jobTitle: text("job_title"),
  department: text("department"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

/** Directory: mirrors Entra ID security groups. `entraObjectId` matches the `groups` claim. */
export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  entraObjectId: text("entra_object_id").unique(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: createdAt(),
});

export const groupMembers = sqliteTable(
  "group_members",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
);

/**
 * Group -> role assignment. Role keys (and the permissions they grant) are defined in code
 * by app manifests so they are reviewed in PRs; *who* holds them is data, so it is managed
 * and audited at runtime.
 */
export const groupRoles = sqliteTable(
  "group_roles",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id),
    roleKey: text("role_key").notNull(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.roleKey] })],
);

/** Append-only, hash-chained audit trail. UPDATE/DELETE are blocked by triggers (see migrations). */
export const auditEvents = sqliteTable(
  "audit_events",
  {
    seq: integer("seq").primaryKey({ autoIncrement: true }),
    at: text("at").notNull(),
    actorId: text("actor_id").notNull(),
    app: text("app").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: text("before"),
    after: text("after"),
    reason: text("reason"),
    prevHash: text("prev_hash").notNull(),
    hash: text("hash").notNull(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId), index("audit_actor_idx").on(t.actorId)],
);

/** Stores results of money-moving operations so retries never double-execute. */
export const idempotencyKeys = sqliteTable(
  "idempotency_keys",
  {
    key: text("key").notNull(),
    scope: text("scope").notNull(),
    result: text("result").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("idempotency_scope_key_idx").on(t.scope, t.key)],
);
