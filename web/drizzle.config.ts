import { defineConfig } from "drizzle-kit";
import { resolveDatabasePath } from "@acme/platform/db";

// One migration history for the platform tables plus every app's tables.
export default defineConfig({
  dialect: "sqlite",
  schema: ["../platform/src/db/schema.ts", "./src/app/apps/*/_lib/schema.ts"],
  out: "./drizzle",
  dbCredentials: { url: resolveDatabasePath() },
});
