import { createHash } from "node:crypto";
import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { auditEvents, type DbOrTx, type Tx } from "../db";

export const GENESIS_HASH = "0".repeat(64);

export interface AuditInput {
  actorId: string;
  app: string;
  action: string;
  entity: { type: string; id: string };
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  /** Override the timestamp. Only for seeding/backfills; live code must omit it. */
  at?: string;
}

export type AuditEvent = typeof auditEvents.$inferSelect;

function canonical(value: unknown): string {
  if (value === undefined || value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .filter((k) => obj[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashEvent(prevHash: string, e: Omit<AuditEvent, "seq" | "hash" | "prevHash">): string {
  return createHash("sha256").update(`${prevHash}|${canonical(e)}`).digest("hex");
}

/**
 * Appends an audit event. Takes a transaction on purpose: the audit row commits or rolls back
 * together with the business change it describes.
 */
export function audit(tx: Tx, input: AuditInput): AuditEvent {
  const last = tx.select({ hash: auditEvents.hash }).from(auditEvents).orderBy(desc(auditEvents.seq)).limit(1).get();
  const prevHash = last?.hash ?? GENESIS_HASH;
  const body = {
    at: input.at ?? new Date().toISOString(),
    actorId: input.actorId,
    app: input.app,
    action: input.action,
    entityType: input.entity.type,
    entityId: input.entity.id,
    before: input.before === undefined ? null : canonical(input.before),
    after: input.after === undefined ? null : canonical(input.after),
    reason: input.reason ?? null,
  };
  const hash = hashEvent(prevHash, body);
  return tx
    .insert(auditEvents)
    .values({ ...body, prevHash, hash })
    .returning()
    .get();
}

export interface ChainVerification {
  ok: boolean;
  checked: number;
  /** `seq` of the first event whose hash does not match. */
  brokenAt?: number;
}

/** Recomputes every hash; any edit to a past row (even bypassing triggers) is detected. */
export function verifyAuditChain(db: DbOrTx): ChainVerification {
  let prev = GENESIS_HASH;
  let checked = 0;
  for (const row of db.select().from(auditEvents).orderBy(asc(auditEvents.seq)).all()) {
    const { seq, hash, prevHash, ...body } = row;
    if (prevHash !== prev || hashEvent(prevHash, body) !== hash) return { ok: false, checked, brokenAt: seq };
    prev = hash;
    checked++;
  }
  return { ok: true, checked };
}

export function listAuditEvents(
  db: DbOrTx,
  filter: { app?: string; entityType?: string; entityId?: string; actorId?: string; limit?: number } = {},
): AuditEvent[] {
  const where: SQL[] = [];
  if (filter.app) where.push(eq(auditEvents.app, filter.app));
  if (filter.entityType) where.push(eq(auditEvents.entityType, filter.entityType));
  if (filter.entityId) where.push(eq(auditEvents.entityId, filter.entityId));
  if (filter.actorId) where.push(eq(auditEvents.actorId, filter.actorId));
  return db
    .select()
    .from(auditEvents)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(auditEvents.seq))
    .limit(filter.limit ?? 200)
    .all();
}
