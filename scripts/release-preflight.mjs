#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const RECEIPT_PATH = path.join(DIST, "release-preflight-check.json");
const R1_RECEIPT_PATH = path.join(DIST, "r1-preflight-check.json");
const steps = [];

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: node scripts/release-preflight.mjs");
  console.log("Runs: prepare:public -> audit:release-modes -> status:write -> health:deploy -> status:write -> status:check");
  console.log("Writes: dist/release-preflight-check.json after all gates pass, then refreshes status");
  process.exit(0);
}

function runNpm(scriptName, reason) {
  const label = `npm run ${scriptName}`;
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : "npm";
  const commandArgs = npmExecPath ? [npmExecPath, "run", scriptName] : ["run", scriptName];
  const started = Date.now();
  console.log(`\n> ${label}`);
  console.log(`  ${reason}`);
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
  steps.push(step);
  if (result.error) {
    console.error(`Failed to run ${label}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

function readText(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function readJson(rel) {
  const file = path.join(ROOT, rel);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`${rel}: ${err.message}`);
    process.exit(1);
  }
}

function readJsonIfExists(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function restoreR1Receipt(receipt) {
  if (!receipt || receipt.schema !== "values-commons-r1-preflight-check-v1") return false;
  if (receipt.status !== "passed" || receipt.mode !== "private-preview") return false;
  fs.writeFileSync(R1_RECEIPT_PATH, JSON.stringify(receipt, null, 2) + "\n", "utf8");
  return true;
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

function parseRoutes(toml) {
  const routes = [];
  let current = null;
  for (const raw of toml.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "[[routes]]") {
      current = {};
      routes.push(current);
      continue;
    }
    if (!current) continue;
    const m = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (/^".*"$/.test(value)) value = value.slice(1, -1);
    current[m[1]] = value;
  }
  return routes.map(route => route.pattern).filter(Boolean);
}

function expect(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function validatePublicReleaseState() {
  const pkg = readJson("package.json");
  const meta = readJson("dist/build-meta.json");
  const release = readJson("dist/release-check.json");
  const modeCheck = readJson("dist/package-mode-check.json");
  const current = modeCheck.currentDist || {};
  const scripts = pkg.scripts || {};

  expect(meta.mode === "public-production", `dist/build-meta.json: expected public-production, found ${meta.mode || "(missing)"}`);
  expect(meta.siteBase === "https://valuescommons.org/app", `dist/build-meta.json: expected https://valuescommons.org/app, found ${meta.siteBase || "(missing)"}`);
  expect(meta.appDataFallback === false, "dist/build-meta.json: public production should omit appDataFallback");
  expect(!fs.existsSync(path.join(DIST, "app", "data.js")), "dist/app/data.js: public production should omit the oversized fallback bundle");

  expect(release.schema === "values-commons-release-check-v1", "dist/release-check.json: expected release receipt schema values-commons-release-check-v1");
  expect(release.status === "passed", `dist/release-check.json: expected passed status, found ${release.status || "(missing)"}`);
  expect(release.mode === meta.mode, "dist/release-check.json: mode should match build metadata");
  expect(release.siteBase === meta.siteBase, "dist/release-check.json: siteBase should match build metadata");
  expect(release.buildMetaGeneratedAt === meta.generatedAt, "dist/release-check.json: build timestamp should match build metadata");
  expect(release.appDataFallback === meta.appDataFallback, "dist/release-check.json: appDataFallback should match build metadata");
  const releaseSteps = Array.isArray(release.checks) ? release.checks.map(step => step && step.script).filter(Boolean) : [];
  for (const script of ["build", "audit:preview:public", "verify:full"]) {
    expect(releaseSteps.includes(script), `dist/release-check.json: missing passed check ${script}`);
  }

  expect(modeCheck.schema === "values-commons-package-mode-check-v2", "dist/package-mode-check.json: expected package-mode receipt schema v2");
  expect(modeCheck.status === "passed", `dist/package-mode-check.json: expected passed, found ${modeCheck.status || "(missing)"}`);
  expect(modeCheck.privatePreview?.mode === "private-preview", "dist/package-mode-check.json: missing private-preview lane");
  expect(modeCheck.privatePreview?.appDataFallback === true, "dist/package-mode-check.json: private-preview lane should include fallback");
  expect(/^[a-f0-9]{64}$/.test(modeCheck.privatePreview?.packageSha256 || ""), "dist/package-mode-check.json: private-preview lane should record a packageSha256");
  expect(modeCheck.publicProduction?.mode === "public-production", "dist/package-mode-check.json: missing public-production lane");
  expect(modeCheck.publicProduction?.appDataFallback === false, "dist/package-mode-check.json: public-production lane should omit fallback");
  expect(/^[a-f0-9]{64}$/.test(modeCheck.publicProduction?.packageSha256 || ""), "dist/package-mode-check.json: public-production lane should record a packageSha256");
  expect(current.mode === meta.mode, "dist/package-mode-check.json: currentDist mode should match build metadata");
  expect(current.siteBase === meta.siteBase, "dist/package-mode-check.json: currentDist siteBase should match build metadata");
  expect(current.buildMetaGeneratedAt === meta.generatedAt, "dist/package-mode-check.json: currentDist timestamp should match build metadata");

  expect(scripts["release:preflight"] === "node scripts/release-preflight.mjs", "package.json: release:preflight should use the release preflight wrapper");
  expect(scripts.predeploy === "npm run prepare:public && npm run audit:deploy", "package.json: predeploy should prepare public release and audit deploy config");
  expect(scripts["wrangler:dry-run"] === "npm run predeploy && wrangler deploy --dry-run", "package.json: wrangler:dry-run should reuse the predeploy guard");

  return {
    meta,
    release,
    modeCheck,
    scripts,
    routes: parseRoutes(readText("wrangler.toml")),
  };
}

function receiptFor({ meta, release, modeCheck, scripts, routes }, checkedAt, statusRefreshedAt = null) {
  return {
    schema: "values-commons-public-release-preflight-check-v1",
    status: "passed",
    checkedAt,
    mode: meta.mode,
    siteBase: meta.siteBase,
    buildMetaGeneratedAt: meta.generatedAt,
    appDataFallback: meta.appDataFallback,
    releasePreparedAt: release.preparedAt,
    packageModeCheckedAt: modeCheck.checkedAt,
    packageModeLanes: [modeCheck.privatePreview?.mode, modeCheck.publicProduction?.mode].filter(Boolean),
    packageModeFingerprints: {
      privatePreview: modeCheck.privatePreview?.packageSha256,
      publicProduction: modeCheck.publicProduction?.packageSha256,
    },
    deployGuard: scripts.predeploy,
    dryRunGuard: scripts["wrangler:dry-run"],
    routes,
    nextGate: "manual Wrangler dry run or npm run deploy after final human review",
    statusRefreshedAt,
    steps,
    source: {
      gitHead: gitValue(["rev-parse", "--short", "HEAD"]),
      workingTreeChanged: Boolean(gitValue(["status", "--porcelain"])),
    },
  };
}

function writeReceipt(receipt) {
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2) + "\n", "utf8");
}

function main() {
  console.log("Preparing public release preflight");
  const r1Receipt = readJsonIfExists("dist/r1-preflight-check.json");
  runNpm("prepare:public", "public-production package and full verification");
  runNpm("audit:release-modes", "private/public package-lane smoke");
  const r1Preserved = restoreR1Receipt(r1Receipt);
  if (r1Preserved) {
    console.log("\nPreserved existing R1 preflight receipt across public dist rebuild");
  }
  runNpm("status:write", "durable project status snapshot before deploy gate");
  runNpm("health:deploy", "operating health plus production deploy guard");

  const state = validatePublicReleaseState();
  const checkedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  writeReceipt(receiptFor(state, checkedAt));
  runNpm("status:write", "durable status snapshot including public preflight receipt");
  runNpm("status:check", "status snapshot matches the public preflight receipt");
  const refreshedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const receipt = receiptFor(state, checkedAt, refreshedAt);
  writeReceipt(receipt);

  console.log("\nPUBLIC RELEASE PREFLIGHT PASS");
  console.log(`  mode: ${receipt.mode}`);
  console.log(`  siteBase: ${receipt.siteBase}`);
  console.log(`  routes: ${receipt.routes.length ? receipt.routes.join(", ") : "(none)"}`);
  console.log("  receipt: dist/release-preflight-check.json");
}

main();
