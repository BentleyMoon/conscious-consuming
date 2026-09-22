#!/usr/bin/env node
/* One end-to-end, offline gate for the governed register pipeline. */

import { spawnSync } from "node:child_process";
import process from "node:process";

const STEPS = [
  ["audit:registers", "shelf contract"],
  ["audit:register-snapshots", "snapshot integrity and offline adapters"],
  ["audit:register-mappings", "inventory-derived exact entity mappings"],
  ["audit:register-coverage", "taxonomy-derived coverage matrix"],
  ["audit:register-evidence", "deterministic evidence bundles"],
  ["audit:register-promotions", "approved promotion parity"],
  ["audit:register-safety-wave", "safety and certification receipts"],
  ["audit:register-money-wave", "money evidence and denominator boundary"],
  ["audit:register-durability-wave", "exact-model durability receipts"],
  ["audit:register-editorial-wave", "guide depth for approved evidence"],
  ["audit:register-freshness", "derived operating queue"],
];

function run(script, reason) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : "npm";
  const args = npmExecPath ? [npmExecPath, "run", script] : ["run", script];
  console.log(`\n> npm run ${script}`);
  console.log(`  ${reason}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: !npmExecPath && process.platform === "win32",
    env: process.env,
  });
  if (result.error) {
    console.error(`Failed to run npm run ${script}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log("Register pass gate");
for (const [script, reason] of STEPS) run(script, reason);
console.log(`\nREGISTER PASS GATE PASS (${STEPS.length}/${STEPS.length} steps)`);
