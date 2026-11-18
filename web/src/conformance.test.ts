import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { apps } from "./apps";

/**
 * Platform guardrails enforced in CI, so every app — whether written by a human or by Devin —
 * follows the same security rules. Cheap static checks; the runtime checks live in the platform.
 */
const appsDir = path.join(import.meta.dirname, "app", "apps");
const appDirs = fs.readdirSync(appsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const read = (...p: string[]) => fs.readFileSync(path.join(appsDir, ...p), "utf8");
const exists = (...p: string[]) => fs.existsSync(path.join(appsDir, ...p));

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
}

describe.each(appDirs)("app %s", (app) => {
  it("is registered in src/apps.ts with a manifest", () => {
    expect(exists(app, "manifest.ts")).toBe(true);
    expect(apps.some((a) => a.href === `/apps/${app}`)).toBe(true);
  });

  it("every exported server action checks a permission first", () => {
    if (!exists(app, "_lib", "actions.ts")) return;
    const src = read(app, "_lib", "actions.ts");
    expect(src.startsWith('"use server"')).toBe(true);
    const bodies = src.split(/export async function /).slice(1);
    for (const body of bodies) {
      const name = body.slice(0, body.indexOf("("));
      const fnBody = body.slice(body.indexOf("{"));
      const firstStatement = fnBody.split("\n").slice(1).find((l) => l.trim()) ?? "";
      expect(firstStatement, `${app}/${name} must start with requirePermission()`).toMatch(/await requirePermission\(/);
    }
  });

  it("every page enforces access", () => {
    for (const file of walk(path.join(appsDir, app)).filter((f) => f.endsWith("page.tsx"))) {
      expect(fs.readFileSync(file, "utf8"), path.relative(appsDir, file)).toMatch(/requirePageAccess\(/);
    }
  });

  it("every service that writes data writes an audit event", () => {
    for (const file of walk(path.join(appsDir, app)).filter((f) => /_lib\/.*\.ts$/.test(f) && !f.endsWith(".test.ts") && !f.endsWith("seed.ts"))) {
      const src = fs.readFileSync(file, "utf8");
      if (/\.(insert|update|delete)\(/.test(src)) expect(src, path.relative(appsDir, file)).toMatch(/audit\(/);
    }
  });

  it("does not bypass the platform (raw SQL driver, money floats)", () => {
    for (const file of walk(path.join(appsDir, app)).filter((f) => /\.tsx?$/.test(f))) {
      const src = fs.readFileSync(file, "utf8");
      const rel = path.relative(appsDir, file);
      expect(src, rel).not.toMatch(/from "better-sqlite3"/);
      expect(src, rel).not.toMatch(/parseFloat\(/);
    }
  });
});
