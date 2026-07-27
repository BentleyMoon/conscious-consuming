#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const args = process.argv.slice(2);
const preview = args.includes("--preview");
const pub = args.includes("--public");

if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node scripts/prepare-release.mjs --preview|--public");
  process.exit(0);
}

if (preview === pub) {
  console.error("Choose exactly one release lane: --preview or --public.");
  process.exit(2);
}

const lane = preview
  ? {
      name: "private preview",
      mode: "private-preview",
      buildScript: "build:preview",
      checks: [
        ["audit:first-use", "first-use route"],
        ["audit:preview:private", "private package mode"],
        ["audit:release-modes", "private/public package fingerprints"],
        ["verify:full", "full health gate"],
      ],
    }
  : {
      name: "public production",
      mode: "public-production",
      buildScript: "build",
      checks: [
        ["audit:preview:public", "public package mode"],
        ["audit:release-modes", "private/public package fingerprints"],
        ["verify:full", "full health gate"],
      ],
    };

const steps = [];

function runNpm(scriptName, reason, options = {}) {
  const record = options.record !== false;
  const label = `npm run ${scriptName}`;
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : "npm";
  const commandArgs = npmExecPath ? [npmExecPath, "run", scriptName] : ["run", scriptName];
  const started = Date.now();
  console.log(`\n> ${label}`);
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    stdio: "inherit",
    shell: !npmExecPath && process.platform === "win32",
    env: process.env,
  });
  const step = {
    script: scriptName,
    reason,
    command: label,
    elapsedMs: Date.now() - started,
    status: result.status ?? 1,
  };
  if (record) steps.push(step);
  if (result.error) {
    console.error(`Failed to run ${label}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`${path.relative(ROOT, file)}: ${err.message}`);
    process.exit(1);
  }
}

function gitValue(gitArgs) {
  const result = spawnSync("git", gitArgs, {
    cwd: ROOT,
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.error || result.status !== 0) return "";
  return result.stdout.trim();
}

console.log(`Preparing ${lane.name} release`);
runNpm(lane.buildScript, `${lane.name} build`);
for (const [scriptName, reason] of lane.checks) {
  runNpm(scriptName, reason);
  if (scriptName === "audit:release-modes") {
    runNpm("status:write", "package-mode fingerprint snapshot", { record: false });
  }
}

const metaPath = path.join(DIST, "build-meta.json");
if (!fs.existsSync(metaPath)) {
  console.error("dist/build-meta.json is missing after release preparation.");
  process.exit(1);
}
const buildMeta = readJson(metaPath);
if (buildMeta.mode !== lane.mode) {
  console.error(`dist/build-meta.json: expected ${lane.mode}, found ${buildMeta.mode || "(missing)"}`);
  process.exit(1);
}

const receipt = {
  schema: "values-commons-release-check-v1",
  status: "passed",
  mode: lane.mode,
  siteBase: buildMeta.siteBase,
  preparedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  buildMetaGeneratedAt: buildMeta.generatedAt,
  appDataFallback: buildMeta.appDataFallback,
  surfaces: buildMeta.surfaces || [],
  docsRendered: buildMeta.docsRendered || [],
  checks: steps,
  source: {
    gitHead: gitValue(["rev-parse", "--short", "HEAD"]),
    workingTreeChanged: Boolean(gitValue(["status", "--porcelain"])),
  },
};

fs.writeFileSync(path.join(DIST, "release-check.json"), JSON.stringify(receipt, null, 2) + "\n", "utf8");
runNpm("status:write", "durable project status snapshot", { record: false });

console.log("\nRELEASE PREP PASS");
console.log(`  mode: ${receipt.mode}`);
console.log(`  siteBase: ${receipt.siteBase}`);
console.log("  receipt: dist/release-check.json");
console.log("  status: docs/PROJECT-STATUS.md");
