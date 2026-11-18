import path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { openDatabase, resolveDatabasePath } from "@acme/platform/db";

export function runMigrations() {
  const sqlite = openDatabase();
  migrate(drizzle(sqlite), { migrationsFolder: path.join(import.meta.dirname, "..", "drizzle") });
  sqlite.close();
  console.log(`✔ migrated ${resolveDatabasePath()}`);
}

if (process.argv[1] === import.meta.filename) runMigrations();
