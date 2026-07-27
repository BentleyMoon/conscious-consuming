#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  formatPackageFingerprint,
  formatPackageModeFingerprints,
  formatPublicPreflightStatus,
  formatR1PreflightStatus,
  preflightReceiptState,
  receiptMatchesBuild,
} from "../scripts/preflight-receipts.mjs";

const meta = {
  mode: "private-preview",
  siteBase: "http://localhost:8877",
  generatedAt: "2026-07-09T10:16:30Z",
};

const packageMeta = {
  ...meta,
  generatedAt: "2026-07-09T11:00:00Z",
  packageSha256: "a".repeat(64),
};

const matchingReceipt = {
  status: "passed",
  mode: meta.mode,
  siteBase: meta.siteBase,
  buildMetaGeneratedAt: meta.generatedAt,
  checkedAt: "2026-07-09T10:20:00Z",
  activeBlockers: ["H10", "H4"],
  deployGuard: "npm run prepare:public && npm run audit:deploy",
};

const packageReceipt = {
  ...matchingReceipt,
  targetPackageSha256: packageMeta.packageSha256,
};

const staleReceipt = {
  ...matchingReceipt,
  buildMetaGeneratedAt: "2026-07-08T09:00:00Z",
};

const stalePackageReceipt = {
  ...packageReceipt,
  targetPackageSha256: "b".repeat(64),
};

const packageModeCheck = {
  privatePreview: { packageSha256: "a".repeat(64) },
  publicProduction: { packageSha256: "b".repeat(64) },
};

const publicPackageMeta = {
  ...meta,
  mode: "public-production",
};

const publicPackageReceipt = {
  ...matchingReceipt,
  mode: "public-production",
  packageModeFingerprints: {
    privatePreview: "a".repeat(64),
    publicProduction: "c".repeat(64),
  },
};

assert.equal(receiptMatchesBuild(matchingReceipt, meta), true);
assert.equal(receiptMatchesBuild(staleReceipt, meta), false);
assert.equal(receiptMatchesBuild(packageReceipt, packageMeta), true);
assert.equal(receiptMatchesBuild(stalePackageReceipt, packageMeta), false);

assert.equal(formatPackageFingerprint("a".repeat(64)), "sha256:aaaaaaaaaaaa");
assert.equal(formatPackageFingerprint(null), "(missing)");
assert.equal(
  formatPackageModeFingerprints(packageModeCheck),
  "private-preview sha256:aaaaaaaaaaaa, public-production sha256:bbbbbbbbbbbb",
);

assert.deepEqual(preflightReceiptState(null, meta), {
  state: "not-recorded",
  label: "not recorded",
  matchesCurrent: false,
});

assert.deepEqual(preflightReceiptState({ __error: "Unexpected token" }, meta), {
  state: "invalid",
  label: "invalid JSON (Unexpected token)",
  matchesCurrent: false,
});

assert.equal(preflightReceiptState(matchingReceipt, meta).state, "passed");
assert.equal(preflightReceiptState(matchingReceipt, meta).label, "passed");
assert.equal(preflightReceiptState(staleReceipt, meta).state, "stale");
assert.equal(preflightReceiptState(staleReceipt, meta).label, "stale (passed)");
assert.equal(preflightReceiptState(packageReceipt, packageMeta).state, "passed");
assert.equal(preflightReceiptState(stalePackageReceipt, packageMeta).state, "stale");

assert.equal(
  formatR1PreflightStatus(matchingReceipt, meta),
  "passed at 2026-07-09T10:20:00Z (private-preview; active blocker(s): H10, H4; target package matches)",
);
assert.equal(
  formatR1PreflightStatus(staleReceipt, meta),
  "stale (passed) at 2026-07-09T10:20:00Z (private-preview; active blocker(s): H10, H4; target package differs)",
);
assert.equal(
  formatR1PreflightStatus(packageReceipt, packageMeta),
  "passed at 2026-07-09T10:20:00Z (private-preview; active blocker(s): H10, H4; target package matches; sha256:aaaaaaaaaaaa)",
);
assert.equal(
  formatR1PreflightStatus(stalePackageReceipt, packageMeta),
  "stale (passed) at 2026-07-09T10:20:00Z (private-preview; active blocker(s): H10, H4; target package differs; sha256:bbbbbbbbbbbb)",
);
assert.equal(
  formatPublicPreflightStatus(matchingReceipt, meta),
  "passed at 2026-07-09T10:20:00Z (private-preview; deploy guard yes; current dist matches)",
);
assert.equal(
  formatPublicPreflightStatus(staleReceipt, meta),
  "stale (passed) at 2026-07-09T10:20:00Z (private-preview; deploy guard yes; current dist differs)",
);
assert.equal(
  formatPublicPreflightStatus(publicPackageReceipt, publicPackageMeta),
  "passed at 2026-07-09T10:20:00Z (public-production; deploy guard yes; current dist matches; sha256:cccccccccccc)",
);

console.log("preflight receipts test passed");
