import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

/** Walks up from cwd to the workspace root (the package.json that declares `workspaces`). */
export function findRepoRoot(start = process.cwd()): string {
  let dir = start;
  while (true) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg) && JSON.parse(fs.readFileSync(pkg, "utf8")).workspaces) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

/** Defaults to `<repo>/data/app.db` so the project runs with zero env configuration. */
export function resolveDatabasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(findRepoRoot(), "data", "app.db");
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
