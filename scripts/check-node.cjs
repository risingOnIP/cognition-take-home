// Fails fast with a clear message when Node is older than the version in package.json "engines".
const min = require("../package.json").engines.node.replace(/[^\d.]/g, "");
const [maj, mnr] = process.versions.node.split(".").map(Number);
const [reqMaj, reqMin] = min.split(".").map(Number);
if (maj < reqMaj || (maj === reqMaj && mnr < reqMin)) {
  console.error(`\nNode ${min}+ is required; you have ${process.versions.node}.\n` +
    "Update to the latest Node 22 LTS:\n" +
    "  Windows:     winget upgrade OpenJS.NodeJS.LTS   (or download from https://nodejs.org)\n" +
    "  macOS/Linux: nvm install   (reads .nvmrc)\n");
  process.exit(1);
}
