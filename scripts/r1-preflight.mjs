#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { nextGateForActiveBlockers } from "./preflight-receipts.mjs";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const RECEIPT_PATH = path.join(DIST, "r1-preflight-check.json");
const steps = [];

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: node scripts/r1-preflight.mjs");
  console.log("Runs: prepare:preview -> audit:release-modes -> status:write -> health -> status:write -> status:check");
  console.log("Writes: dist/r1-preflight-check.json after all gates pass, then refreshes status");
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

function readJson(rel) {
  const file = path.join(ROOT, rel);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`${rel}: ${err.message}`);
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

function activeHandoffIds() {
  const file = path.join(ROOT, "docs", "CONTENT-HANDOFF.md");
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8");
  return [...text.matchAll(/^- \[(H\d+) active\//gm)].map(match => match[1]);
}

function expect(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function validatePrivatePreviewState() {
  const meta = readJson("dist/build-meta.json");
  const release = readJson("dist/release-check.json");
  const modeCheck = readJson("dist/package-mode-check.json");
  const current = modeCheck.currentDist || {};

  expect(meta.mode === "private-preview", `dist/build-meta.json: expected private-preview, found ${meta.mode || "(missing)"}`);
  expect(meta.appDataFallback === true, "dist/build-meta.json: private preview should include appDataFallback");
  expect(release.status === "passed", `dist/release-check.json: expected passed, found ${release.status || "(missing)"}`);
  expect(release.mode === meta.mode, "dist/release-check.json: mode should match build metadata");
  expect(release.siteBase === meta.siteBase, "dist/release-check.json: siteBase should match build metadata");
  expect(release.buildMetaGeneratedAt === meta.generatedAt, "dist/release-check.json: build timestamp should match build metadata");
  expect(modeCheck.status === "passed", `dist/package-mode-check.json: expected passed, found ${modeCheck.status || "(missing)"}`);
  expect(modeCheck.privatePreview?.mode === "private-preview", "dist/package-mode-check.json: missing private-preview lane");
  expect(/^[a-f0-9]{64}$/.test(modeCheck.privatePreview?.packageSha256 || ""), "dist/package-mode-check.json: private-preview lane should record a packageSha256");
  expect(modeCheck.publicProduction?.mode === "public-production", "dist/package-mode-check.json: missing public-production lane");
  expect(/^[a-f0-9]{64}$/.test(modeCheck.publicProduction?.packageSha256 || ""), "dist/package-mode-check.json: public-production lane should record a packageSha256");
  expect(current.mode === meta.mode, "dist/package-mode-check.json: currentDist mode should match build metadata");
  expect(current.siteBase === meta.siteBase, "dist/package-mode-check.json: currentDist siteBase should match build metadata");
  expect(current.buildMetaGeneratedAt === meta.generatedAt, "dist/package-mode-check.json: currentDist timestamp should match build metadata");

  return { meta, release, modeCheck };
}

function main() {
  console.log("Preparing R1 first-invite preflight");
  runNpm("prepare:preview", "private-preview package and full verification");
  runNpm("audit:release-modes", "private/public package-lane smoke");
  runNpm("status:write", "durable project status snapshot");
  runNpm("health", "operating health including R1 blocker visibility");

  const { meta, release, modeCheck } = validatePrivatePreviewState();
  const activeBlockers = activeHandoffIds();
  const checkedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  let receipt = {
    schema: "values-commons-r1-preflight-check-v1",
    status: "passed",
    checkedAt,
    mode: meta.mode,
    siteBase: meta.siteBase,
    buildMetaGeneratedAt: meta.generatedAt,
    appDataFallback: meta.appDataFallback,
    releasePreparedAt: release.preparedAt,
    packageModeCheckedAt: modeCheck.checkedAt,
    packageModeLanes: [modeCheck.privatePreview?.mode, modeCheck.publicProduction?.mode].filter(Boolean),
    targetPackageSha256: modeCheck.privatePreview?.packageSha256,
    activeBlockers,
    nextGate: nextGateForActiveBlockers(activeBlockers),
    steps,
    source: {
      gitHead: gitValue(["rev-parse", "--short", "HEAD"]),
      workingTreeChanged: Boolean(gitValue(["status", "--porcelain"])),
    },
  };

  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2) + "\n", "utf8");
  runNpm("status:write", "durable status snapshot including R1 preflight receipt");
  runNpm("status:check", "status snapshot matches the R1 preflight receipt");
  receipt = {
    ...receipt,
    statusRefreshedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    steps,
  };
  fs.writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2) + "\n", "utf8");

  console.log("\nR1 PREFLIGHT PASS");
  console.log(`  mode: ${receipt.mode}`);
  console.log(`  siteBase: ${receipt.siteBase}`);
  console.log(`  active blocker(s): ${activeBlockers.length ? activeBlockers.join(", ") : "none"}`);
  console.log("  receipt: dist/r1-preflight-check.json");
}

main();
