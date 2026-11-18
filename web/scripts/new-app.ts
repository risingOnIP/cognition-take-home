/**
 * Scaffolds a new internal app on the platform:
 *   npm run new-app -- <key> "<Display Name>"
 * Creates src/app/apps/<key>/ from the template and registers its manifest and seed.
 */
import fs from "node:fs";
import path from "node:path";

const [key, name] = process.argv.slice(2);
if (!key || !/^[a-z][a-z0-9-]*$/.test(key) || !name) {
  console.error('Usage: npm run new-app -- <key> "<Display Name>"   (key: lowercase, e.g. kyc)');
  process.exit(1);
}

const web = path.join(import.meta.dirname, "..");
const target = path.join(web, "src", "app", "apps", key);
if (fs.existsSync(target)) {
  console.error(`src/app/apps/${key} already exists`);
  process.exit(1);
}

const camel = key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
const Pascal = camel[0]!.toUpperCase() + camel.slice(1);
const subst = (s: string) => s.replaceAll("__key__", key).replaceAll("__name__", name).replaceAll("__camel__", camel).replaceAll("__Pascal__", Pascal);

const templateDir = path.join(import.meta.dirname, "templates", "app");
function copy(from: string, to: string) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name.replace(/\.tpl$/, ""));
    if (entry.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      copy(src, dest);
    } else fs.writeFileSync(dest, subst(fs.readFileSync(src, "utf8")));
  }
}
fs.mkdirSync(target, { recursive: true });
copy(templateDir, target);

function insertBefore(file: string, marker: string, line: string) {
  const p = path.join(web, file);
  const src = fs.readFileSync(p, "utf8");
  if (!src.includes(marker)) throw new Error(`marker ${marker} missing in ${file}`);
  fs.writeFileSync(p, src.replace(marker, `${line}\n${marker}`));
}
insertBefore("src/apps.ts", "// new-app:manifest-imports", `import { ${camel}App } from "./app/apps/${key}/manifest";`);
insertBefore("src/apps.ts", "  // new-app:manifest-entries", `  ${camel}App,`);
insertBefore("scripts/seed.ts", "// new-app:seed-imports", `import { seed${Pascal} } from "../src/app/apps/${key}/_lib/seed";`);
insertBefore("scripts/seed.ts", "  // new-app:seed-calls", `  seed${Pascal}(db);`);

console.log(`✔ Created src/app/apps/${key} and registered it.
Next:
  1. Edit manifest.ts (permissions, roles), _lib/schema.ts, _lib/workflow.ts
  2. npm run db:generate -- --name ${key}   # creates the migration
  3. npm run db:reset && npm run dev        # open /apps/${key}
  4. npm test                               # conformance + your service tests`);
