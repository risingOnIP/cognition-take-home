import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

/** `DATABASE_PATH`, or `data/app.db` inside the host app (its working directory), so it runs with zero env configuration. */
export function resolveDatabasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");
}

export function openDatabase(file = resolveDatabasePath()): Database.Database {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = BetterSQLite3Database<any>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

const globalForDb = globalThis as unknown as { __acmeDb?: Db };

/** Process-wide singleton (survives Next.js dev hot reloads). */
export function getDb(): Db {
  if (!globalForDb.__acmeDb) globalForDb.__acmeDb = drizzle(openDatabase());
  return globalForDb.__acmeDb;
}

export function setDb(db: Db): void {
  globalForDb.__acmeDb = db;
}
