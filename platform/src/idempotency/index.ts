import { and, eq } from "drizzle-orm";
import { idempotencyKeys, type Db } from "../db";

/**
 * Runs `fn` at most once per (scope, key). Retries (double-clicks, network retries) return the
 * stored result instead of moving money twice. The unique index is the final guard against races.
 */
export async function runIdempotent<T>(db: Db, scope: string, key: string, fn: () => Promise<T>): Promise<{ result: T; replayed: boolean }> {
  const existing = db
    .select()
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, key)))
    .get();
  if (existing) return { result: JSON.parse(existing.result) as T, replayed: true };
  const result = await fn();
  db.insert(idempotencyKeys).values({ scope, key, result: JSON.stringify(result) }).run();
  return { result, replayed: false };
}
