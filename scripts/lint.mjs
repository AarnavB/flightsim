import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["apps/web/src", "packages", "tests", "scripts"];
const extensions = [".ts", ".tsx", ".js", ".mjs"];
const problems = [];
let checked = 0;

function walk(path) {
  for (const entry of readdirSync(path)) {
    const full = join(path, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (extensions.some((ext) => full.endsWith(ext))) {
      checked += 1;
      const source = readFileSync(full, "utf8");
      if (source.includes("<<<<<<<") || source.includes(">>>>>>>")) {
        problems.push(full + ": merge-conflict marker");
      }
      source.split("\n").forEach((line, index) => {
        if (/[\t ]+$/.test(line)) problems.push(full + ":" + (index + 1) + ": trailing whitespace");
      });
    }
  }
}

for (const root of roots) walk(root);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("Source hygiene checks passed (" + checked + " files).");
