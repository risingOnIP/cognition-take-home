import { drizzle } from "drizzle-orm/better-sqlite3";
import { openDatabase } from "@acme/platform/db";
import { seedDirectory } from "./seed-directory";
import { seedRefunds } from "../src/app/apps/refunds/_lib/seed";
import { seedKyc } from "../src/app/apps/kyc/_lib/seed";
// new-app:seed-imports

/** Deterministic: the same users, groups and records every run, so every reviewer sees the same data. */
export function runSeed() {
  const sqlite = openDatabase();
  const db = drizzle(sqlite);
  seedDirectory(db);
  seedRefunds(db);
  seedKyc(db);
  // new-app:seed-calls
  sqlite.close();
  console.log("✔ seeded demo data");
}

if (process.argv[1] === import.meta.filename) runSeed();
