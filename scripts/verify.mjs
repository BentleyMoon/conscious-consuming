#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const full = process.argv.includes("--full");

const jsSyntaxFiles = [
  "app/app.js",
  "app/commons-config.js",
  "app/engine.js",
  "app/decision.js",
  "app/lines.js",
  "app/presentation.js",
  "app/presentation-data.js",
  "app/i18n.js",
  "app/reveal.js",
  "app/shell.js",
  "app/sigil.js",
  "app/sw.js",
  "pipeline/build_errands.js",
  "pipeline/build_lines.js",
  "pipeline/build_cards.js",
  "pipeline/build_challenge.js",
  "pipeline/build_decisions.js",
  "pipeline/build_design_tokens.js",
  "pipeline/build_presentation.js",
  "pipeline/build_proposals.js",
  "pipeline/build_initiatives.js",
  "pipeline/build_nodes.js",
  "pipeline/build_pulse.js",
  "pipeline/build_tags.js",
  "research/a11y_audit.js",
  "research/cache_bust_audit.js",
  "research/contrast_audit.js",
  "research/ci_config_audit.js",
  "research/citation_bundle_audit.js",
  "research/challenge_audit.js",
  "research/challenge_helpers.js",
  "research/command_surface_audit.js",
  "research/contribution_handoff_audit.js",
  "research/decision_pilot_audit.js",
  "research/decision_rollout_audit.js",
  "research/needs_ontology_audit.js",
  "research/presentation_ontology_audit.js",
  "research/presentation_design_audit.js",
  "research/presentation_package_audit.js",
  "research/presentation_acceptance_audit.js",
  "research/explore_three_doors_audit.js",
  "research/generality_release_audit.js",
  "research/design_tokens_audit.js",
  "research/governance_audit.js",
  "research/ask_readiness_audit.js",
  "research/content_readiness_audit.js",
  "research/deploy_config_audit.js",
  "research/errands_audit.js",
  "research/evidence_audit.js",
  "research/flash_drive_audit.js",
  "research/funding_audit.js",
  "research/first_use_audit.js",
  "research/floor_interface_audit.js",
  "research/personal_precedence_audit.js",
  "research/freshness_report.js",
  "research/guide_chart_audit.js",
  "research/guide_voice_audit.js",
  "research/product_voice_audit.js",
  "research/initiatives_audit.js",
  "research/linked_data_audit.js",
  "research/lines_audit.js",
  "research/maturity_audit.js",
  "research/node_index_audit.js",
  "research/node_walkthrough_audit.js",
  "research/ownership_edges_audit.js",
  "research/package_fingerprint_test.mjs",
  "research/pulse_audit.js",
  "research/preview_feedback_audit.js",
  "research/preflight_receipts_test.mjs",
  "research/provenance_summary_audit.js",
  "research/public_route_audit.js",
  "research/r1_readiness_audit.js",
  "research/release_observability_audit.mjs",
  "research/route_context_audit.js",
  "research/validate_lens.js",
  "research/standard_audit.js",
  "research/two_fields_audit.js",
  "research/value_signature_audit.js",
  "research/value_editorial_audit.js",
  "research/value_theme_map_audit.js",
  "research/verify_run.js",
  "research/stacks_audit.js",
  "research/tags_audit.js",
  "research/well_known_audit.js",
  "scripts/build.mjs",
  "scripts/check-generated-drift.mjs",
  "scripts/check-release-modes.mjs",
  "scripts/health-report.mjs",
  "scripts/package-fingerprint.mjs",
  "scripts/prepare-release.mjs",
  "scripts/r1-preflight.mjs",
  "scripts/release-preflight.mjs",
  "scripts/release-status.mjs",
  "scripts/preflight-receipts.mjs",
  "scripts/verify.mjs",
  "scripts/worktree-lanes.mjs",
  "scripts/worktree-summary.mjs",
  "scripts/write-status-report.mjs",
];

const nodeTests = [
  "research/instances_test.js",
  "research/federation_test.js",
  "research/lens_federation_test.js",
  "research/slate_test.js",
  "research/interop_test.js",
  "research/sigil_test.js",
  "research/federation_overlay_test.js",
  "research/values_spine_test.js",
  "research/graph_test.js",
  "research/kosplora_test.js",
  "research/off_score_test.js",
  "research/preflight_receipts_test.mjs",
  "research/package_fingerprint_test.mjs",
  "research/verify_phase_c.js",
];

const linkCheckFiles = [
  "README.md",
  "index.html",
  "app/index.html",
  "docs/README.md",
  "docs/DEPLOY-AND-SHARE.md",
  "docs/MATURITY-PROGRAM.md",
  "docs/STATE-OF-THE-BUILD.md",
];

function relPath(file) {
  return path.join(ROOT, file);
}

function exists(file) {
  return fs.existsSync(relPath(file));
}

function run(command, args, options = {}) {
  const label = [command, ...args].join(" ");
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    ...options,
  });
  if (result.error) {
    if (result.error.code === "ENOENT") return false;
    console.error(`Failed to run ${label}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
  return true;
}

function runPython(script) {
  const candidates = process.platform === "win32"
    ? [["py", ["-3"]], ["python", []], ["python3", []]]
    : [["python3", []], ["python", []]];
  for (const [command, baseArgs] of candidates) {
    if (run(command, [...baseArgs, script])) return;
  }
  console.error("No Python 3 executable found. Install Python or set PATH before verifying.");
  process.exit(1);
}

function stripTarget(raw) {
  let target = raw.trim();
  const title = target.match(/^([^"\s]+)\s+"[^"]*"$/);
  if (title) target = title[1];
  target = target.split("#")[0].split("?")[0];
  return target;
}

function shouldSkipTarget(target) {
  return !target
    || target.startsWith("#")
    || target.startsWith("//")
    || target.startsWith("{")
    || /^[a-z][a-z0-9+.-]*:/i.test(target);
}

function resolveLocalTarget(fromFile, target) {
  let rel = target.replace(/\\/g, "/");
  const rooted = rel.startsWith("/");
  if (rooted) rel = rel.slice(1);
  return rooted
    ? path.join(ROOT, rel)
    : path.resolve(path.dirname(relPath(fromFile)), rel);
}

function localTargetExists(absTarget) {
  if (fs.existsSync(absTarget)) return true;
  if (fs.existsSync(path.join(absTarget, "index.html"))) return true;
  return false;
}

function checkLocalLinks(files) {
  const failures = [];
  const markdownLink = /\[[^\]]+\]\(([^)]+)\)/g;
  const htmlLink = /\b(?:href|src)=["']([^"']+)["']/g;

  for (const file of files) {
    if (!exists(file)) {
      failures.push(`${file}: file listed for link check is missing`);
      continue;
    }
    const text = fs.readFileSync(relPath(file), "utf8");
    const targets = [];
    for (const m of text.matchAll(markdownLink)) targets.push(m[1]);
    for (const m of text.matchAll(htmlLink)) targets.push(m[1]);

    for (const raw of targets) {
      const target = stripTarget(raw);
      if (shouldSkipTarget(target)) continue;
      const abs = resolveLocalTarget(file, target);
      if (!abs.startsWith(ROOT) || !localTargetExists(abs)) {
        failures.push(`${file}: missing local link ${raw}`);
      }
    }
  }

  if (failures.length) {
    console.log("\nLocal link check failures:");
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }
  console.log(`\nLocal link check: ${files.length} source files OK`);
}

console.log(`Values Commons verification (${full ? "full" : "standard"})`);

for (const file of jsSyntaxFiles) {
  if (exists(file)) run("node", ["--check", file]);
}

if (exists("pipeline/test_scoring.py")) runPython("pipeline/test_scoring.py");
for (const test of nodeTests) {
  if (exists(test)) run("node", [test]);
}

const coreAudits = [
  ["research/verify_run.js"],
  ["research/standard_audit.js"],
  ["research/provenance_summary_audit.js"],
  ["research/value_theme_map_audit.js"],
  ["research/value_signature_audit.js"],
  ["research/value_editorial_audit.js"],
  ["research/node_index_audit.js"],
  ["research/ask_readiness_audit.js"],
  full ? ["research/pulse_audit.js"] : ["research/pulse_audit.js", "--allow-derived-drift"],
  ["research/public_route_audit.js"],
  ["research/cache_bust_audit.js"],
  ["research/a11y_audit.js"],
  ["research/decision_pilot_audit.js"],
  ["research/decision_rollout_audit.js"],
  ["research/needs_ontology_audit.js"],
  ["research/presentation_ontology_audit.js"],
  ["research/presentation_design_audit.js"],
  ["pipeline/build_presentation.js", "--check"],
  ["research/presentation_package_audit.js"],
  ["research/presentation_acceptance_audit.js", "--contract"],
  ["research/explore_three_doors_audit.js"],
  ["research/generality_release_audit.js"],
  ["research/floor_interface_audit.js"],
  ["research/personal_precedence_audit.js"],
  ["research/guide_voice_audit.js"],
  ["research/product_voice_audit.js"],
  ["research/guide_chart_audit.js"],
  ["research/passport_roundtrip_audit.js"],
  ["research/theme_coverage_audit.js"],
  ["research/contrast_audit.js"],
  ["research/release_observability_audit.mjs"],
  ["research/contribution_handoff_audit.js"],
  ["pipeline/build_decisions.js", "--check"],
];

const fullOnlyAudits = [
  ["research/challenge_audit.js"],
  ["research/design_tokens_audit.js"],
  ["research/governance_audit.js"],
  ["research/initiatives_audit.js"],
  ["research/lines_audit.js"],
  ["research/maturity_audit.js"],
  ["research/node_walkthrough_audit.js"],
  ["research/ownership_edges_audit.js"],
  ["research/route_context_audit.js"],
  ["research/errands_audit.js"],
  ["research/tags_audit.js"],
  ["research/two_fields_audit.js"],
  ["research/ci_config_audit.js"],
  ["research/command_surface_audit.js"],
];

for (const audit of coreAudits) run("node", audit);
if (full) for (const audit of fullOnlyAudits) run("node", audit);
if (full) {
  run("node", ["research/content_readiness_audit.js"]);
  run("node", ["research/citation_bundle_audit.js"]);
  run("node", ["research/validate_lens.js"]);
  run("node", ["research/linked_data_audit.js"]);
  run("node", ["research/flash_drive_audit.js"]);
  run("node", ["research/funding_audit.js"]);
  run("node", ["research/freshness_report.js"]);
  run("node", ["research/well_known_audit.js"]);
  run("node", ["research/stacks_audit.js"]);
  run("node", ["research/first_use_audit.js"]);
  run("node", ["research/preview_feedback_audit.js"]);
  run("node", ["research/evidence_audit.js"]);
}

checkLocalLinks(linkCheckFiles);

console.log(`\nVERIFY PASS (${full ? "full" : "standard"})`);
