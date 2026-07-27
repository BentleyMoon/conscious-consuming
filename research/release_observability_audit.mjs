#!/usr/bin/env node
/* Release observability audit for Values Commons.

   This is a read-only guard over the human-facing release surfaces. The
   package receipts may be structurally valid while the status report or CLI
   hides the package identity; this audit makes the short package fingerprints
   part of the operating contract.
*/
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  formatPackageFingerprint,
  formatPackageModeFingerprints,
  formatReceiptPackageFingerprint,
  metaForPackageLane,
} from "../scripts/preflight-receipts.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function abs(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function readText(rel) {
  if (!exists(rel)) {
    failures.push(`${rel}: missing file`);
    return "";
  }
  return fs.readFileSync(abs(rel), "utf8");
}

function readJson(rel) {
  const text = readText(rel);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    failures.push(`${rel}: invalid JSON (${err.message})`);
    return { __error: err.message };
  }
}

function readJsonIfExists(rel) {
  if (!exists(rel)) return null;
  return readJson(rel);
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function validSha(value) {
  return /^[a-f0-9]{64}$/.test(String(value || ""));
}

function tableValue(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`^\\|\\s*${escaped}\\s*\\|\\s*([^|]+?)\\s*\\|\\s*$`, "m"));
  return match ? match[1].trim() : "";
}

function runReleaseStatus() {
  const result = spawnSync(process.execPath, ["scripts/release-status.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    failures.push(`npm run release:status equivalent failed: ${result.error.message}`);
    return "";
  }
  if (result.status !== 0) {
    failures.push(`scripts/release-status.mjs exited ${result.status}: ${(result.stderr || "").trim()}`);
  }
  return result.stdout || "";
}

function lineValue(output, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = output.match(new RegExp(`^\\s*${escaped}:\\s*(.+)$`, "m"));
  return match ? match[1].trim() : "";
}

function checkPackageMode(modeCheck, status, releaseOutput) {
  expect(modeCheck.schema === "values-commons-package-mode-check-v2", "dist/package-mode-check.json: expected package-mode schema v2");
  expect(modeCheck.status === "passed", `dist/package-mode-check.json: expected passed status, found ${modeCheck.status || "(missing)"}`);
  expect(validSha(modeCheck.privatePreview?.packageSha256), "dist/package-mode-check.json: privatePreview.packageSha256 should be a sha256");
  expect(validSha(modeCheck.publicProduction?.packageSha256), "dist/package-mode-check.json: publicProduction.packageSha256 should be a sha256");

  const summary = formatPackageModeFingerprints(modeCheck);
  expect(tableValue(status, "package-mode fingerprints") === summary, "docs/PROJECT-STATUS.md: package-mode fingerprints row should match dist/package-mode-check.json");
  expect(lineValue(releaseOutput, "package-mode fingerprints") === summary, "release:status output should include package-mode fingerprints");

  const privateShort = formatPackageFingerprint(modeCheck.privatePreview?.packageSha256);
  const publicShort = formatPackageFingerprint(modeCheck.publicProduction?.packageSha256);
  expect(tableValue(status, "private-preview package lane").includes(privateShort), "docs/PROJECT-STATUS.md: private-preview lane should show its short package fingerprint");
  expect(tableValue(status, "public-production package lane").includes(publicShort), "docs/PROJECT-STATUS.md: public-production lane should show its short package fingerprint");

  return { privateShort, publicShort, summary };
}

function checkR1Receipt({ receipt, modeCheck, status, releaseOutput, privateShort }) {
  if (!receipt) return "(not recorded)";
  expect(receipt.schema === "values-commons-r1-preflight-check-v1", "dist/r1-preflight-check.json: expected R1 preflight schema");
  expect(receipt.mode === "private-preview", "dist/r1-preflight-check.json: expected private-preview mode");
  expect(receipt.targetPackageSha256 === modeCheck.privatePreview?.packageSha256, "dist/r1-preflight-check.json: targetPackageSha256 should match private-preview package-mode fingerprint");

  const expected = formatReceiptPackageFingerprint(receipt, metaForPackageLane(modeCheck.privatePreview));
  expect(expected === privateShort, "R1 receipt formatter should resolve the private-preview fingerprint");
  expect(tableValue(status, "R1 target package fingerprint") === privateShort, "docs/PROJECT-STATUS.md: R1 target fingerprint row should match the private-preview package");
  expect(tableValue(status, "R1 preflight receipt").includes(privateShort), "docs/PROJECT-STATUS.md: R1 preflight row should show the target package fingerprint");
  expect(lineValue(releaseOutput, "r1 target package fingerprint") === privateShort, "release:status output should show the R1 target package fingerprint");
  return privateShort;
}

function checkPublicReceipt({ receipt, modeCheck, status, releaseOutput, publicShort }) {
  if (!receipt) return "(not recorded)";
  expect(receipt.schema === "values-commons-public-release-preflight-check-v1", "dist/release-preflight-check.json: expected public release preflight schema");
  expect(receipt.mode === "public-production", "dist/release-preflight-check.json: expected public-production mode");
  expect(receipt.packageModeFingerprints?.privatePreview === modeCheck.privatePreview?.packageSha256, "dist/release-preflight-check.json: private package fingerprint should match package-mode receipt");
  expect(receipt.packageModeFingerprints?.publicProduction === modeCheck.publicProduction?.packageSha256, "dist/release-preflight-check.json: public package fingerprint should match package-mode receipt");

  const expected = formatReceiptPackageFingerprint(receipt, null);
  expect(expected === publicShort, "public receipt formatter should resolve the public-production fingerprint");
  expect(tableValue(status, "public preflight receipt").includes(publicShort), "docs/PROJECT-STATUS.md: public preflight row should show the public package fingerprint");
  expect(lineValue(releaseOutput, "public preflight package fingerprint") === publicShort, "release:status output should show the public preflight package fingerprint");
  return publicShort;
}

function main() {
  console.log("Release observability audit");

  const status = readText("docs/PROJECT-STATUS.md");
  const modeCheck = readJson("dist/package-mode-check.json");
  const r1Receipt = readJsonIfExists("dist/r1-preflight-check.json");
  const publicReceipt = readJsonIfExists("dist/release-preflight-check.json");
  const releaseOutput = runReleaseStatus();

  const packageMode = checkPackageMode(modeCheck, status, releaseOutput);
  const r1 = checkR1Receipt({ receipt: r1Receipt, modeCheck, status, releaseOutput, privateShort: packageMode.privateShort });
  const pub = checkPublicReceipt({ receipt: publicReceipt, modeCheck, status, releaseOutput, publicShort: packageMode.publicShort });

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log(`  package-mode fingerprints: ${packageMode.summary}`);
  console.log(`  r1 target fingerprint: ${r1}`);
  console.log(`  public preflight fingerprint: ${pub}`);
  console.log("RELEASE OBSERVABILITY CHECKS PASS");
}

main();
