#!/usr/bin/env node
import process from "node:process";
import { formatWorktreeSummary } from "./worktree-lanes.mjs";

const sampleLimit = Number(process.env.VC_WORKTREE_SAMPLE_LIMIT || 8);

try {
  console.log(formatWorktreeSummary({ sampleLimit }));
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
