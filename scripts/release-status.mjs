#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  formatPackageModeFingerprints,
  formatReceiptPackageFingerprint,
  metaForPackageLane,
  preflightReceiptState,
} from "./preflight-receipts.mjs";

const ROOT = process.cwd();

function readJson(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    return { __error: err.message };
  }
}

function readText(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
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

function ok(value) {
  return value ? "yes" : "no";
}

const pkg = readJson("package.json") || {};
const meta = readJson("dist/build-meta.json");
const receipt = readJson("dist/release-check.json");
const modeCheck = readJson("dist/package-mode-check.json");
const r1Preflight = readJson("dist/r1-preflight-check.json");
const releasePreflight = readJson("dist/release-preflight-check.json");
const wrangler = readText("wrangler.toml");
const scripts = pkg.scripts || {};
const routes = parseRoutes(wrangler);

console.log("Release status");
if (!meta) {
  console.log("  dist/build-meta.json: missing");
} else if (meta.__error) {
  console.log(`  dist/build-meta.json: invalid JSON (${meta.__error})`);
} else {
  console.log(`  mode: ${meta.mode || "(missing)"}`);
  console.log(`  siteBase: ${meta.siteBase || "(missing)"}`);
  console.log(`  build generated: ${meta.generatedAt || "(missing)"}`);
  console.log(`  surfaces: ${Array.isArray(meta.surfaces) ? meta.surfaces.length : 0}`);
  console.log(`  docs rendered: ${Array.isArray(meta.docsRendered) ? meta.docsRendered.length : 0}`);
  console.log(`  app data fallback: ${meta.appDataFallback === true ? "included" : "omitted"}`);
}

if (!receipt) {
  console.log("  release receipt: missing");
} else if (receipt.__error) {
  console.log(`  release receipt: invalid JSON (${receipt.__error})`);
} else {
  const checks = Array.isArray(receipt.checks) ? receipt.checks.map(c => c && c.script).filter(Boolean) : [];
  const matchesMeta = meta && !meta.__error
    && receipt.mode === meta.mode
    && receipt.siteBase === meta.siteBase
    && receipt.buildMetaGeneratedAt === meta.generatedAt;
  console.log(`  release receipt: ${receipt.status || "(missing)"}`);
  console.log(`  prepared: ${receipt.preparedAt || "(missing)"}`);
  console.log(`  receipt matches build: ${ok(matchesMeta)}`);
  console.log(`  checks: ${checks.length ? checks.join(", ") : "(none)"}`);
}

if (!modeCheck) {
  console.log("  package-mode check: missing");
} else if (modeCheck.__error) {
  console.log(`  package-mode check: invalid JSON (${modeCheck.__error})`);
} else if (modeCheck.schema === "values-commons-package-mode-check-v2") {
  const current = modeCheck.currentDist;
  const matchesMeta = Boolean(meta && !meta.__error && current
    && current.mode === meta.mode
    && current.siteBase === meta.siteBase
    && current.buildMetaGeneratedAt === meta.generatedAt);
  const lanes = [modeCheck.privatePreview?.mode, modeCheck.publicProduction?.mode].filter(Boolean);
  console.log(`  package-mode check: ${modeCheck.status || "(missing)"}`);
  console.log(`  package-mode checked: ${modeCheck.checkedAt || "(missing)"}`);
  console.log(`  package-mode lanes: ${lanes.length ? lanes.join(", ") : "(none)"}`);
  console.log(`  package-mode fingerprints: ${formatPackageModeFingerprints(modeCheck)}`);
  console.log(`  package-mode current dist matches build: ${ok(matchesMeta)}`);
} else {
  const matchesMeta = meta && !meta.__error
    && modeCheck.finalDistMode === meta.mode
    && modeCheck.finalSiteBase === meta.siteBase
    && modeCheck.buildMetaGeneratedAt === meta.generatedAt;
  console.log(`  package-mode check: ${modeCheck.status || "(missing)"}`);
  console.log(`  package-mode checked: ${modeCheck.checkedAt || "(missing)"}`);
  console.log(`  package-mode matches build: ${ok(matchesMeta)}`);
}

if (!r1Preflight) {
  console.log("  r1 preflight receipt: not recorded");
} else if (r1Preflight.__error) {
  console.log(`  r1 preflight receipt: invalid JSON (${r1Preflight.__error})`);
} else {
  const blockers = Array.isArray(r1Preflight.activeBlockers) && r1Preflight.activeBlockers.length
    ? r1Preflight.activeBlockers.join(", ")
    : "none";
  const r1TargetMeta = metaForPackageLane(modeCheck?.privatePreview) || meta;
  const state = preflightReceiptState(r1Preflight, r1TargetMeta);
  console.log(`  r1 preflight receipt: ${state.label}`);
  console.log(`  r1 preflight checked: ${r1Preflight.checkedAt || "(missing)"}`);
  console.log(`  r1 preflight mode: ${r1Preflight.mode || "(missing)"}`);
  console.log(`  r1 active blocker(s): ${blockers}`);
  console.log(`  r1 receipt matches target package: ${ok(state.matchesCurrent)}`);
  console.log(`  r1 target package fingerprint: ${formatReceiptPackageFingerprint(r1Preflight, r1TargetMeta)}`);
}

if (!releasePreflight) {
  console.log("  public preflight receipt: not recorded");
} else if (releasePreflight.__error) {
  console.log(`  public preflight receipt: invalid JSON (${releasePreflight.__error})`);
} else {
  const state = preflightReceiptState(releasePreflight, meta);
  const lanes = Array.isArray(releasePreflight.packageModeLanes)
    ? releasePreflight.packageModeLanes.filter(Boolean)
    : [];
  console.log(`  public preflight receipt: ${state.label}`);
  console.log(`  public preflight checked: ${releasePreflight.checkedAt || "(missing)"}`);
  console.log(`  public preflight mode: ${releasePreflight.mode || "(missing)"}`);
  console.log(`  public preflight lanes: ${lanes.length ? lanes.join(", ") : "(none)"}`);
  console.log(`  public preflight matches build: ${ok(state.matchesCurrent)}`);
  console.log(`  public preflight package fingerprint: ${formatReceiptPackageFingerprint(releasePreflight, meta)}`);
}

console.log(`  deploy guard: ${ok(scripts.predeploy === "npm run prepare:public && npm run audit:deploy")}`);
console.log(`  dry-run guard: ${ok(scripts["wrangler:dry-run"] === "npm run predeploy && wrangler deploy --dry-run")}`);
console.log(`  wrangler routes: ${routes.length ? routes.join(", ") : "(none)"}`);
