#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import process from "node:process";

const ROOT = process.cwd();
const deploy = process.argv.includes("--deploy");

const groups = [
  {
    title: "Worktree Snapshot",
    commands: [
      ["worktree:summary", "changed files grouped by operating lane"],
    ],
  },
  {
    title: "Status Snapshot",
    commands: [
      ["status:check", "written project status matches durable project state"],
    ],
  },
  {
    title: "Release Snapshot",
    commands: [
      ["release:status", "current dist/ label and receipts"],
      ["audit:release-observability", "status surfaces show the same package fingerprints"],
    ],
  },
  {
    title: "Operating Surface",
    commands: [
      ["audit:commands", "npm scripts and docs agree"],
      ["audit:ci", "CI remains verification-only"],
      ["audit:cache-bust", "per-asset cache-busting remains history-legible"],
      ["audit:handoff", "Claude/Codex handoff is structured"],
    ],
  },
  {
    title: "Product Readiness",
    commands: [
      ["audit:content", "content queues and source freshness"],
      ["audit:register-pass", "complete public-register operating gate"],
      ["audit:provenance", "source-independence summaries and H10 contracts match generated facts"],
      ["audit:citations", "re-runnable citation bundles"],
      ["audit:conformance", "OVS lens/passport contract"],
      ["audit:linked-data", "verdict-card JSON-LD export contract"],
      ["audit:flash-drive", "physical/offline package instructions"],
      ["audit:funding", "public funding ledger and independence caps"],
      ["audit:freshness", "maintainer source-date queue"],
      ["audit:well-known", "well-known Open Values discovery manifest"],
      ["audit:stacks", "content-addressed lens stack"],
      ["audit:routes", "public route shell and share metadata contract"],
      ["audit:first-use", "newcomer/reviewer path"],
      ["audit:preview", "current dist/ package and feedback loop"],
      ["audit:r1", "R1 package lanes and preview blocker visibility"],
    ],
  },
];

if (deploy) {
  groups.push({
    title: "Deploy Readiness",
    commands: [
      ["audit:deploy", "Wrangler config plus public release and preflight receipts"],
    ],
  });
}

function runNpm(scriptName, reason) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : "npm";
  const commandArgs = npmExecPath ? [npmExecPath, "run", scriptName] : ["run", scriptName];
  const label = `npm run ${scriptName}`;
  const started = Date.now();
  console.log(`\n> ${label}`);
  console.log(`  ${reason}`);
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    stdio: "inherit",
    shell: !npmExecPath && process.platform === "win32",
    env: scriptName === "worktree:summary"
      ? { ...process.env, VC_WORKTREE_SAMPLE_LIMIT: process.env.VC_WORKTREE_SAMPLE_LIMIT || "3" }
      : process.env,
  });
  if (result.error) {
    console.error(`Failed to run ${label}: ${result.error.message}`);
    return { scriptName, status: 1, elapsedMs: Date.now() - started };
  }
  return { scriptName, status: result.status ?? 1, elapsedMs: Date.now() - started };
}

console.log(`Values Commons health report${deploy ? " + deploy gate" : ""}`);
console.log("  This is a lightweight operating report; it does not rebuild generated outputs.");
console.log("  Run npm run audit:generated when source/data edits may have changed committed outputs.");

const results = [];
for (const group of groups) {
  console.log(`\n== ${group.title} ==`);
  for (const [scriptName, reason] of group.commands) {
    const result = runNpm(scriptName, reason);
    results.push(result);
    if (result.status !== 0) break;
  }
  if (results.some(r => r.status !== 0)) break;
}

const failed = results.filter(r => r.status !== 0);
console.log("\nHealth summary");
for (const r of results) {
  const seconds = (r.elapsedMs / 1000).toFixed(1);
  console.log(`  ${r.status === 0 ? "PASS" : "FAIL"} ${r.scriptName} (${seconds}s)`);
}

if (failed.length) {
  console.log("\nHEALTH REPORT FAILED");
  console.log(`  first failing command: npm run ${failed[0].scriptName}`);
  process.exit(failed[0].status || 1);
}

console.log("\nHEALTH REPORT PASS");
