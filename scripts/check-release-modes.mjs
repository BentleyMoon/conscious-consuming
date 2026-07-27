#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { packageSha256 } from "./package-fingerprint.mjs";

const previewBase = (process.env.CC_PREVIEW_SITE_BASE || "https://conscious-consuming.example").replace(/\/+$/, "");
const publicBase = (process.env.CC_PUBLIC_SITE_BASE || "https://valuescommons.org/app").replace(/\/+$/, "");
const root = process.cwd();
const dist = path.join(root, "dist");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "values-commons-release-modes-"));
const previewOut = path.join(tmpRoot, "private-preview");
const publicOut = path.join(tmpRoot, "public-production");

function run(command, args, options = {}) {
  const label = [command, ...args].join(" ");
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
    ...options,
  });
  if (result.error) {
    if (result.error.code === "ENOENT") return false;
    throw result.error;
  }
  if (result.status !== 0) {
    const err = new Error(`${label} failed with status ${result.status}`);
    err.status = result.status || 1;
    throw err;
  }
  return true;
}

function runPython(script, args = []) {
  const candidates = process.platform === "win32"
    ? [["py", ["-3"]], ["python", []], ["python3", []]]
    : [["python3", []], ["python", []]];
  for (const [command, baseArgs] of candidates) {
    if (run(command, [...baseArgs, script, ...args])) return;
  }
  console.error("No Python 3 executable found. Install Python or set PATH before release-mode audit.");
  process.exit(1);
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`${path.relative(root, file)}: ${err.message}`);
    process.exit(1);
  }
}

function summarizeMeta(outDir) {
  const metaPath = path.join(outDir, "build-meta.json");
  const meta = readJsonIfExists(metaPath);
  if (!meta) {
    console.error(`${path.relative(root, metaPath)}: missing build-meta.json after package audit`);
    process.exit(1);
  }
  return {
    mode: meta.mode,
    siteBase: meta.siteBase,
    buildMetaGeneratedAt: meta.generatedAt,
    packageSha256: packageSha256(outDir),
    appDataFallback: meta.appDataFallback,
    surfaces: Array.isArray(meta.surfaces) ? meta.surfaces.length : 0,
    docsRendered: Array.isArray(meta.docsRendered) ? meta.docsRendered.length : 0,
  };
}

function summarizeCurrentDist() {
  const meta = readJsonIfExists(path.join(dist, "build-meta.json"));
  if (!meta) return null;
  return {
    mode: meta.mode,
    siteBase: meta.siteBase,
    buildMetaGeneratedAt: meta.generatedAt,
    appDataFallback: meta.appDataFallback,
  };
}

function main() {
  console.log("Release-mode package audit");
  console.log("  scratch output: " + tmpRoot);
  console.log(`  private preview base: ${previewBase}`);
  console.log(`  public production base: ${publicBase}`);

  runPython("pipeline/build_site.py", ["--preview", "--site-base", previewBase, "--out-dir", previewOut]);
  run("node", ["research/preview_feedback_audit.js", "--mode=private-preview", `--dist-dir=${previewOut}`]);
  run("node", ["research/well_known_audit.js", `--dist-dir=${previewOut}`]);
  run("node", ["research/stacks_audit.js", `--dist-dir=${previewOut}`]);

  runPython("pipeline/build_site.py", ["--public", "--site-base", publicBase, "--out-dir", publicOut]);
  run("node", ["research/preview_feedback_audit.js", "--mode=public-production", `--dist-dir=${publicOut}`]);
  run("node", ["research/well_known_audit.js", `--dist-dir=${publicOut}`]);
  run("node", ["research/stacks_audit.js", `--dist-dir=${publicOut}`]);

  fs.mkdirSync(dist, { recursive: true });
  const receipt = {
    schema: "values-commons-package-mode-check-v2",
    status: "passed",
    checkedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    privatePreview: summarizeMeta(previewOut),
    publicProduction: summarizeMeta(publicOut),
    currentDist: summarizeCurrentDist(),
  };
  fs.writeFileSync(path.join(dist, "package-mode-check.json"), JSON.stringify(receipt, null, 2) + "\n", "utf8");

  console.log("\nRELEASE MODES PASS (dist/ package files left unchanged)");
  console.log("  receipt: dist/package-mode-check.json");
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exitCode = err.status || 1;
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
