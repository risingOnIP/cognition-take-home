import fs from "node:fs";
import { resolveDatabasePath } from "@acme/platform/db";
import { runMigrations } from "./migrate";
import { runSeed } from "./seed";

const file = resolveDatabasePath();
for (const f of [file, `${file}-wal`, `${file}-shm`]) fs.rmSync(f, { force: true });
runMigrations();
runSeed();
