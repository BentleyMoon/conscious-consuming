#!/usr/bin/env node
/* Can the things in the verify chain actually fail?

   Found 2026-07-31: two scripts in the chain printed FAIL and exited 0. A run where values stopped
   moving a ranking would have read as a failure in the log and shipped anyway. That is the worst
   arrangement available, because it carries all the authority of a check and none of the
   accountability, and its output gets acted on exactly as if it had been earned.

   The rule this enforces: a script in the chain is either a GATE, which reports its verdict in its
   exit code, or a REPORTER, which says so in its own output where a reader sees it. What it may
   not be is a reporter that prints failure language while exiting zero.

   Deliberately not enforced: whether a gate is SENSITIVE, meaning that breaking the thing it
   watches actually makes it fail. That needs a mutation per script and cannot be read off the
   source. It is the larger open question and is tracked separately. */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VERIFY = path.join(ROOT, 'scripts', 'verify.mjs');
const failures = [];

// Failure language a reader would take as a finding.
const SAYS_FAIL = /(^|[^a-z])(FAIL(ED|URE)?|✗|MISMATCH)([^a-z]|$)/;
// An explicit, reader-visible statement that this one never gates.
const SAYS_ADVISORY = /ADVISORY[^\n]*never fails|a place to look, not a finding/i;

function exitArguments(src) {
  const out = [];
  const re = /process\.exit(?:Code)?\s*(?:\(|=)\s*([^;)\n]*)/g;
  let m;
  while ((m = re.exec(src))) out.push(m[1].trim());
  return out;
}

function canExitNonZero(src) {
  // A thrown error leaves node with a non-zero status just as surely as an explicit exit.
  if (/\bthrow new Error/.test(src)) return true;
  return exitArguments(src).some((a) => a !== '0' && a !== '');
}

function main() {
  const verify = fs.readFileSync(VERIFY, 'utf8');
  const listed = [...new Set([...verify.matchAll(/research\/([a-z0-9_]+)\.js/g)].map((m) => m[1]))].sort();
  if (!listed.length) {
    console.log('FAIL could not read the audit list out of scripts/verify.mjs');
    process.exit(1);
  }

  let gates = 0, reporters = 0;
  for (const name of listed) {
    const file = path.join(ROOT, 'research', name + '.js');
    if (!fs.existsSync(file)) { failures.push(`${name}: listed in verify.mjs but not on disk`); continue; }
    const src = fs.readFileSync(file, 'utf8');

    if (canExitNonZero(src)) { gates += 1; continue; }
    reporters += 1;

    // A module that exports rather than reporting is neither, and is not the target here.
    if (/module\.exports\s*=/.test(src) && !SAYS_FAIL.test(src)) continue;

    // Look only at what the script prints, not at its comments and regexes.
    const printed = [...src.matchAll(/console\.log\(([\s\S]*?)\);/g)].map((m) => m[1]).join('\n');
    if (SAYS_FAIL.test(printed) && !SAYS_ADVISORY.test(printed)) {
      failures.push(`${name}: prints failure language but cannot exit non-zero. Give it an exit code, or say in its output that it never gates.`);
    }
  }

  console.log('Gate falsifiability audit');
  console.log(`  scripts in the verify chain: ${listed.length}`);
  console.log(`  gates (can exit non-zero)  : ${gates}`);
  console.log(`  reporters (always exit 0)  : ${reporters}`);
  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const f of failures) console.log(`  FAIL ${f}`);
    process.exit(1);
  }
  console.log('  every reporter that prints a failure says that it never gates');
  console.log('GATE FALSIFIABILITY AUDIT PASS');
}

main();
