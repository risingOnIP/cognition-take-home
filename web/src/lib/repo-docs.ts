import fs from "node:fs";
import path from "node:path";

export interface RepoDoc {
  file: string;
  title: string;
  meta: Record<string, string>;
  body: string;
}

/** The portal renders repo-level docs (devin/, docs/); find the workspace root (package.json with `workspaces`). */
function findRepoRoot(start = process.cwd()): string {
  let dir = start;
  while (true) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg) && JSON.parse(fs.readFileSync(pkg, "utf8")).workspaces) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

const root = () => findRepoRoot();

function parse(file: string, raw: string): RepoDoc {
  const meta: Record<string, string> = {};
  let body = raw;
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (fm) {
    for (const line of fm[1]!.split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    body = raw.slice(fm[0].length);
  }
  const heading = body.match(/^# (.+)\n/);
  if (heading) body = body.slice(heading[0].length);
  const title = heading?.[1] ?? meta.name ?? path.basename(file, ".md").replaceAll("-", " ");
  return { file, title, meta, body: body.trim() };
}

/** Markdown files under a repo folder, e.g. "devin/bots". Read at request time so the page always matches the repo. */
export function readDocs(dir: string): RepoDoc[] {
  const abs = path.join(root(), dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort()
    .map((f) => parse(`${dir}/${f}`, fs.readFileSync(path.join(abs, f), "utf8")));
}

export function readDoc(file: string): string {
  return fs.readFileSync(path.join(root(), file), "utf8");
}

export interface BuildMetric {
  app: string;
  what: string;
  how: string;
  wallClockMinutes: number | null;
  acus: number | null;
  humanInput: string;
  session: string | null;
}

export function readBuildMetrics(): BuildMetric[] {
  return JSON.parse(readDoc("docs/build-metrics.json")) as BuildMetric[];
}

export function formatMinutes(m: number | null): string {
  if (m == null) return "pending";
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
