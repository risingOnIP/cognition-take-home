// Fails fast with a clear message when Node is older than web/package.json "engines".
import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const min = pkg.engines.node.replace(/[^\d.]/g, "");
const [maj, mnr] = process.versions.node.split(".").map(Number);
const [reqMaj, reqMin] = min.split(".").map(Number);
if (maj < reqMaj || (maj === reqMaj && mnr < reqMin)) {
  console.error(`\nNode ${min}+ is required; you have ${process.versions.node}.\n` +
    "Update to the latest Node 22 LTS:\n" +
    "  Windows:     winget upgrade OpenJS.NodeJS.LTS   (or download from https://nodejs.org)\n" +
    "  macOS/Linux: nvm install   (reads .nvmrc)\n");
  process.exit(1);
}
