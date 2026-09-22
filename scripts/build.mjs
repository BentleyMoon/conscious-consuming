#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import process from "node:process";

const preview = process.argv.includes("--preview");
const siteBase = (process.env.CC_SITE_BASE || (preview
  ? "https://conscious-consuming.example"
  : "https://valuescommons.org/app")).replace(/\/+$/, "");

const env = {
  ...process.env,
  CC_SITE_BASE: siteBase,
};
if (!preview) env.CC_PUBLIC = "1";

function run(command, args) {
  const label = [command, ...args].join(" ");
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: false });
  if (result.error) {
    if (result.error.code === "ENOENT") return false;
    throw result.error;
  }
  if (result.status !== 0) process.exit(result.status || 1);
  return true;
}

function runPython(script, args = []) {
  const candidates = process.platform === "win32"
    ? [["py", ["-3"]], ["python", []], ["python3", []]]
    : [["python3", []], ["python", []]];
  for (const [command, baseArgs] of candidates) {
    if (run(command, [...baseArgs, script, ...args])) return;
  }
  console.error("No Python 3 executable found. Install Python or set PATH before building.");
  process.exit(1);
}

console.log(`Building ${preview ? "private preview" : "public production"} site for ${siteBase}`);
runPython("pipeline/build_icon.py");
run("node", ["pipeline/build_lines.js"]);
runPython("pipeline/build_datasets.py");
run("node", ["pipeline/build_presentation.js"]);
run("node", ["pipeline/build_tags.js"]);
run("node", ["pipeline/build_errands.js"]);
run("node", ["pipeline/build_nodes.js"]);
run("node", ["pipeline/build_pulse.js"]);
run("node", ["pipeline/build_challenge.js"]);
run("node", ["pipeline/build_proposals.js"]);
run("node", ["pipeline/build_initiatives.js"]);
run("node", ["pipeline/build_design_tokens.js"]);
run("node", ["pipeline/build_cards.js"]);
run("node", ["pipeline/build_map.js"]);
runPython("pipeline/build_guides.py");
runPython("pipeline/build_site.py", [preview ? "--preview" : "--public", "--site-base", siteBase]);
