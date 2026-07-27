export function receiptMatchesBuild(receipt, meta) {
  const baseMatches = Boolean(meta && !meta.__error && receipt && !receipt.__error
    && receipt.mode === meta.mode
    && receipt.siteBase === meta.siteBase);
  if (!baseMatches) return false;

  const receiptPackageSha = receipt.targetPackageSha256 || receipt.packageSha256;
  if (meta.packageSha256 || receiptPackageSha) {
    return Boolean(meta.packageSha256 && receiptPackageSha && receiptPackageSha === meta.packageSha256);
  }
  return receipt.buildMetaGeneratedAt === meta.generatedAt;
}

export function metaForPackageLane(lane) {
  if (!lane) return null;
  return {
    mode: lane.mode,
    siteBase: lane.siteBase,
    generatedAt: lane.buildMetaGeneratedAt,
    packageSha256: lane.packageSha256,
  };
}

export function formatPackageFingerprint(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? `sha256:${text.slice(0, 12)}` : "(missing)";
}

export function formatPackageModeFingerprints(modeCheck) {
  const privateSha = modeCheck?.privatePreview?.packageSha256 || modeCheck?.packageModeFingerprints?.privatePreview;
  const publicSha = modeCheck?.publicProduction?.packageSha256 || modeCheck?.packageModeFingerprints?.publicProduction;
  const parts = [];
  if (modeCheck?.privatePreview || privateSha) {
    parts.push(`private-preview ${formatPackageFingerprint(privateSha)}`);
  }
  if (modeCheck?.publicProduction || publicSha) {
    parts.push(`public-production ${formatPackageFingerprint(publicSha)}`);
  }
  return parts.length ? parts.join(", ") : "(none)";
}

export function formatReceiptPackageFingerprint(receipt, meta) {
  const direct = receipt?.targetPackageSha256 || receipt?.packageSha256 || meta?.packageSha256;
  if (direct) return formatPackageFingerprint(direct);
  if (receipt?.mode === "private-preview") {
    return formatPackageFingerprint(receipt?.packageModeFingerprints?.privatePreview);
  }
  if (receipt?.mode === "public-production") {
    return formatPackageFingerprint(receipt?.packageModeFingerprints?.publicProduction);
  }
  return "(missing)";
}

function optionalFingerprintSuffix(receipt, meta) {
  const fingerprint = formatReceiptPackageFingerprint(receipt, meta);
  return fingerprint === "(missing)" ? "" : `; ${fingerprint}`;
}

export function activeBlockersLabel(activeBlockers) {
  return Array.isArray(activeBlockers) && activeBlockers.length
    ? activeBlockers.join(", ")
    : "none";
}

export function nextGateForActiveBlockers(activeBlockers) {
  const ids = Array.isArray(activeBlockers) ? activeBlockers.filter(Boolean) : [];
  if (!ids.length) return "run founder R1 review receipt before first invites";

  const known = new Set(["H10", "H4"]);
  const parts = [];
  if (ids.includes("H10")) {
    parts.push("H10 remains active: render provenance/source-independence surfaces and record final app/design drain evidence");
  }
  if (ids.includes("H4")) {
    parts.push("H4 remains active: record preview/runtime evidence, public-gate behavior, and final app/design drain decision");
  }
  for (const id of ids.filter(id => !known.has(id))) {
    parts.push(`${id} remains active: drain it with app/design evidence or name the exact remaining blocker`);
  }
  return parts.join("; ");
}

export function preflightReceiptState(receipt, meta) {
  if (!receipt) {
    return {
      state: "not-recorded",
      label: "not recorded",
      matchesCurrent: false,
    };
  }
  if (receipt.__error) {
    return {
      state: "invalid",
      label: `invalid JSON (${receipt.__error})`,
      matchesCurrent: false,
    };
  }

  const status = receipt.status || "(missing status)";
  const matchesCurrent = receiptMatchesBuild(receipt, meta);
  return {
    state: matchesCurrent ? "passed" : "stale",
    label: matchesCurrent ? status : `stale (${status})`,
    matchesCurrent,
    status,
    checkedAt: receipt.checkedAt || "(missing time)",
    mode: receipt.mode || "(missing mode)",
  };
}

export function formatR1PreflightStatus(receipt, meta) {
  const state = preflightReceiptState(receipt, meta);
  if (state.state === "not-recorded" || state.state === "invalid") return state.label;

  return `${state.label} at ${state.checkedAt} (${state.mode}; active blocker(s): ${activeBlockersLabel(receipt.activeBlockers)}; target package ${state.matchesCurrent ? "matches" : "differs"}${optionalFingerprintSuffix(receipt, meta)})`;
}

export function formatPublicPreflightStatus(receipt, meta) {
  const state = preflightReceiptState(receipt, meta);
  if (state.state === "not-recorded" || state.state === "invalid") return state.label;

  const deployGuard = receipt.deployGuard === "npm run prepare:public && npm run audit:deploy"
    ? "deploy guard yes"
    : "deploy guard check";
  return `${state.label} at ${state.checkedAt} (${state.mode}; ${deployGuard}; current dist ${state.matchesCurrent ? "matches" : "differs"}${optionalFingerprintSuffix(receipt, meta)})`;
}
