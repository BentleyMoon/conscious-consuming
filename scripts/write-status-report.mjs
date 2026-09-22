#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  formatPackageFingerprint,
  formatPackageModeFingerprints,
  formatPublicPreflightStatus,
  formatR1PreflightStatus,
  formatReceiptPackageFingerprint,
  metaForPackageLane,
  nextGateForActiveBlockers,
} from "./preflight-receipts.mjs";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs", "PROJECT-STATUS.md");
const check = process.argv.includes("--check");

function relPath(file) {
  return path.join(ROOT, file);
}

function filePresent(rel) {
  return fs.existsSync(relPath(rel));
}

function readText(rel) {
  const file = relPath(rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function readJson(rel) {
  const text = readText(rel);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    return { __error: err.message };
  }
}

function yes(value) {
  return value ? "yes" : "no";
}

function safe(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

function sectionBetween(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  if (start < 0) return "";
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  return text.slice(start, end < 0 ? text.length : end);
}

function guideStatusCounts() {
  const dir = relPath("content/guides");
  const counts = new Map();
  if (!fs.existsSync(dir)) return counts;
  for (const name of fs.readdirSync(dir).filter(name => name.endsWith(".md")).sort()) {
    const text = fs.readFileSync(path.join(dir, name), "utf8");
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const status = frontmatter?.[1].match(/^status:\s*(.+)$/m)?.[1].trim() || "published";
    counts.set(status, (counts.get(status) || 0) + 1);
  }
  return counts;
}

function handoffItems() {
  const text = readText("docs/CONTENT-HANDOFF.md");
  // WHOLE FILE, not one section. This read was scoped to section 4, "Other app/ asks", while
  // scripts/r1-preflight.mjs scans the whole document for the same marker. H20 lives in section 1,
  // so the generated status report listed three active blockers where the canonical handoff has
  // four, and audit:r1 failed on the mismatch. A status document that reports fewer open problems
  // than the source it is generated from is the one drift this project can least afford.
  // Parked entries are checked to carry no active markers, so widening the scope adds none.
  const section = text;
  const items = [];
  let current = null;

  for (const line of section.split(/\r?\n/)) {
    const match = line.match(/^-\s+\[(H\d+)\s+active\/([^\]]+)\]\s+(.+)$/);
    if (match) {
      current = { id: match[1], owner: match[2], text: match[3].trim(), updates: [] };
      items.push(current);
      continue;
    }
    if (!current) continue;
    if (/^\s*-\s+\[H\d+\s+/.test(line) || /^##\s+/.test(line)) {
      current = null;
      continue;
    }
    if (/^\s{2,}\S/.test(line)) current.updates.push(line.trim());
  }

  return items;
}

function dataSnapshot() {
  const index = readJson("app/data/index.json");
  const categories = Array.isArray(index?.categories) ? index.categories : [];
  return {
    categories: categories.length,
    entries: categories.reduce((sum, cat) => sum + (Number(cat.n) || 0), 0),
    domains: new Set(categories.map(cat => cat.domain).filter(Boolean)).size,
    types: new Set(categories.map(cat => cat.type).filter(Boolean)).size,
  };
}

function releaseSnapshot() {
  const pkg = readJson("package.json") || {};
  const meta = readJson("dist/build-meta.json");
  const receipt = readJson("dist/release-check.json");
  const modeCheck = readJson("dist/package-mode-check.json");
  const r1Preflight = readJson("dist/r1-preflight-check.json");
  const releasePreflight = readJson("dist/release-preflight-check.json");
  const scripts = pkg.scripts || {};
  const releaseMatches = Boolean(meta && receipt && !meta.__error && !receipt.__error
    && receipt.mode === meta.mode
    && receipt.siteBase === meta.siteBase
    && receipt.buildMetaGeneratedAt === meta.generatedAt);
  const modeCurrent = modeCheck?.currentDist;
  const modeMatches = Boolean(meta && modeCheck && !meta.__error && !modeCheck.__error
    && (modeCheck.schema === "values-commons-package-mode-check-v2"
      ? modeCurrent
        && modeCurrent.mode === meta.mode
        && modeCurrent.siteBase === meta.siteBase
        && modeCurrent.buildMetaGeneratedAt === meta.generatedAt
      : modeCheck.finalDistMode === meta.mode
        && modeCheck.finalSiteBase === meta.siteBase
        && modeCheck.buildMetaGeneratedAt === meta.generatedAt));
  return {
    meta,
    receipt,
    modeCheck,
    r1Preflight,
    releasePreflight,
    r1PreflightMeta: metaForPackageLane(modeCheck?.privatePreview) || meta,
    releaseMatches,
    modeMatches,
    deployGuard: scripts.predeploy === "npm run prepare:public && npm run audit:deploy",
    dryRunGuard: scripts["wrangler:dry-run"] === "npm run predeploy && wrangler deploy --dry-run",
  };
}

function packageLaneStatus(lane, expectedMode, expectedFallback) {
  if (!lane) return "(missing)";
  const fallbackText = lane.appDataFallback === true ? "fallback included" : "fallback omitted";
  const expectedFallbackText = expectedFallback ? "fallback included" : "fallback omitted";
  const fingerprint = formatPackageFingerprint(lane.packageSha256);
  const ok = lane.mode === expectedMode && lane.appDataFallback === expectedFallback;
  const sizeText = `surfaces ${lane.surfaces ?? 0}, docs ${lane.docsRendered ?? 0}`;
  return ok
    ? `passed (${fallbackText}; ${fingerprint}; ${sizeText})`
    : `check (${lane.mode || "missing mode"}; ${fallbackText}; ${fingerprint}; expected ${expectedMode}, ${expectedFallbackText})`;
}

function r1PreviewSnapshot(release, handoff) {
  const activeIds = handoff.map(item => item.id).filter(Boolean);
  return {
    r1Runbook: filePresent("docs/R1-REVIEW.md"),
    feedbackLoop: filePresent("docs/PREVIEW-FEEDBACK-LOOP.md"),
    grantPreviewPath: filePresent("docs/GRANT-PREVIEW-PATH.md"),
    privateLane: packageLaneStatus(release.modeCheck?.privatePreview, "private-preview", true),
    publicLane: packageLaneStatus(release.modeCheck?.publicProduction, "public-production", false),
    preflightReceipt: formatR1PreflightStatus(release.r1Preflight, release.r1PreflightMeta),
    currentDist: release.modeMatches
      ? `matches ${release.meta?.mode || "current"} build metadata`
      : "check current dist against build metadata",
    activeBlockers: activeIds.length ? activeIds.join(", ") : "none",
    nextGate: nextGateForActiveBlockers(activeIds),
  };
}

function countsText(counts) {
  return [...counts.entries()].map(([status, count]) => `${status} ${count}`).join(", ") || "(none)";
}

function renderTable(rows) {
  return rows.map(row => `| ${row.map(safe).join(" | ")} |`).join("\n");
}

function renderReport(generatedAt) {
  const data = dataSnapshot();
  const guideCounts = guideStatusCounts();
  const handoff = handoffItems();
  const release = releaseSnapshot();
  const r1 = r1PreviewSnapshot(release, handoff);

  const lines = [];
  lines.push("# Project Status Report");
  lines.push("");
  lines.push(`*Generated ${generatedAt} by \`npm run status:write\`. This is a durable operating snapshot, not a replacement for the audits.*`);
  lines.push("");
  lines.push("## Headline");
  lines.push("");
  lines.push("- Git/worktree: not embedded; run `npm run worktree:summary` for the live local diff");
  lines.push(`- Built app data: ${data.categories} categories, ${data.entries.toLocaleString("en-US")} entries, ${data.domains} domains, ${data.types} item types`);
  lines.push(`- Guides: ${countsText(guideCounts)}`);
  lines.push(`- Active handoff: ${handoff.length} item(s)`);
  lines.push(`- Release package: ${release.meta?.mode || "(missing)"} at ${release.meta?.siteBase || "(missing)"}`);
  lines.push(`- Release receipt: ${release.receipt?.status || "(missing)"}; matches build: ${yes(release.releaseMatches)}`);
  lines.push(`- Package-mode smoke: ${release.modeCheck?.status || "(missing)"}; current dist matches: ${yes(release.modeMatches)}`);
  lines.push(`- R1 preview readiness: private/public package lanes recorded; active blocker(s): ${r1.activeBlockers}`);
  lines.push("");
  lines.push("## Release Package");
  lines.push("");
  lines.push(renderTable([
    ["Field", "Value"],
    ["---", "---"],
    ["dist mode", release.meta?.mode || "(missing)"],
    ["site base", release.meta?.siteBase || "(missing)"],
    ["build generated", release.meta?.generatedAt || "(missing)"],
    ["surfaces", Array.isArray(release.meta?.surfaces) ? String(release.meta.surfaces.length) : "0"],
    ["docs rendered", Array.isArray(release.meta?.docsRendered) ? String(release.meta.docsRendered.length) : "0"],
    ["app data fallback", release.meta?.appDataFallback === true ? "included" : "omitted"],
    ["release prepared", release.receipt?.preparedAt || "(missing)"],
    ["release checks", Array.isArray(release.receipt?.checks) ? release.receipt.checks.map(c => c.script).filter(Boolean).join(", ") : "(none)"],
    ["public preflight receipt", formatPublicPreflightStatus(release.releasePreflight, release.meta)],
    ["package-mode checked", release.modeCheck?.checkedAt || "(missing)"],
    ["package-mode lanes", [release.modeCheck?.privatePreview?.mode, release.modeCheck?.publicProduction?.mode].filter(Boolean).join(", ") || "(none)"],
    ["package-mode fingerprints", formatPackageModeFingerprints(release.modeCheck)],
    ["deploy guard", yes(release.deployGuard)],
    ["dry-run guard", yes(release.dryRunGuard)],
  ]));
  lines.push("");
  lines.push("## R1 / Preview Readiness");
  lines.push("");
  lines.push(renderTable([
    ["Field", "Value"],
    ["---", "---"],
    ["R1 runbook", r1.r1Runbook ? "present" : "missing"],
    ["preview feedback loop", r1.feedbackLoop ? "present" : "missing"],
    ["grant preview path", r1.grantPreviewPath ? "present" : "missing"],
    ["private-preview package lane", r1.privateLane],
    ["public-production package lane", r1.publicLane],
    ["R1 preflight receipt", r1.preflightReceipt],
    ["R1 target package fingerprint", formatReceiptPackageFingerprint(release.r1Preflight, release.r1PreflightMeta)],
    ["current dist", r1.currentDist],
    ["active blocker(s)", r1.activeBlockers],
    ["next review gate", r1.nextGate],
  ]));
  lines.push("");
  lines.push("## Active Handoff");
  lines.push("");
  if (handoff.length) {
    for (const item of handoff) {
      lines.push(`- ${item.id} (${item.owner}): ${item.text}`);
      const recent = item.updates.slice(-6);
      if (item.updates.length) {
        lines.push(`  Recent updates shown: ${recent.length} of ${item.updates.length}`);
        for (const update of recent) lines.push(`  - ${update}`);
      }
    }
  } else {
    lines.push("- none");
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- This report does not run tests or audits; it records durable project, release, data, and handoff state.");
  lines.push("- Use `npm run worktree:summary` for the current git diff; git state is intentionally not embedded here.");
  lines.push("- Use `npm run status:check` to verify this file still matches durable local state, ignoring only the timestamp line.");
  lines.push("- Use `npm run health` for the lightweight pass/fail operating report.");
  lines.push("- Use `npm run verify` or `npm run verify:full` before treating this snapshot as review-ready.");
  lines.push("");

  return lines.join("\n");
}

function normalizeReport(text) {
  return text.replace(
    /^\*Generated .+? by `npm run status:write`\./m,
    "*Generated <timestamp> by `npm run status:write`."
  );
}

function main() {
  const generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const report = renderReport(generatedAt);

  if (check) {
    if (!fs.existsSync(OUT)) {
      console.error("docs/PROJECT-STATUS.md is missing. Run npm run status:write.");
      process.exit(1);
    }
    const current = fs.readFileSync(OUT, "utf8");
    if (normalizeReport(current) !== normalizeReport(report)) {
      console.error("docs/PROJECT-STATUS.md is stale. Run npm run status:write.");
      process.exit(1);
    }
    console.log("PROJECT STATUS CHECK PASS");
    return;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  if (fs.existsSync(OUT)) {
    const current = fs.readFileSync(OUT, "utf8");
    if (normalizeReport(current) === normalizeReport(report)) {
      console.log(`${path.relative(ROOT, OUT).replace(/\\/g, "/")} unchanged`);
      return;
    }
  }
  fs.writeFileSync(OUT, report, "utf8");
  console.log(`Wrote ${path.relative(ROOT, OUT).replace(/\\/g, "/")}`);
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
