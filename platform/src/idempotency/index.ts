import { and, eq } from "drizzle-orm";
import { idempotencyKeys, type Db } from "../db";

const PENDING = "__pending__";

export class IdempotencyInProgressError extends Error {
  constructor(scope: string, key: string) {
    super(`Operation ${scope}:${key} is already in progress`);
    this.name = "IdempotencyInProgressError";
  }
}

/**
 * Runs `fn` at most once per (scope, key). Retries (double-clicks, network retries) return the
 * stored result instead of moving money twice. The key is reserved (unique index) before `fn`
 * runs, so a concurrent second call fails fast instead of executing `fn` again.
 */
export async function runIdempotent<T>(db: Db, scope: string, key: string, fn: () => Promise<T>): Promise<{ result: T; replayed: boolean }> {
  const where = and(eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, key));
  const reserved = db.insert(idempotencyKeys).values({ scope, key, result: PENDING }).onConflictDoNothing().run();
  if (reserved.changes === 0) {
    const existing = db.select().from(idempotencyKeys).where(where).get();
    if (!existing || existing.result === PENDING) throw new IdempotencyInProgressError(scope, key);
    return { result: JSON.parse(existing.result) as T, replayed: true };
  }
  let result: T;
  try {
    result = await fn();
  } catch (e) {
    db.delete(idempotencyKeys).where(where).run();
    throw e;
  }
  db.update(idempotencyKeys).set({ result: JSON.stringify(result) }).where(where).run();
  return { result, replayed: false };
}
