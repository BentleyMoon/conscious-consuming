#!/usr/bin/env node
/* Audit the generated pulse ledger for the "What's new" strip. */
'use strict';

const fs = require('fs');
const path = require('path');
const { buildAll, ALLOWED_KINDS } = require('../pipeline/build_pulse.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'app', 'data', 'pulse.json');
const DATA_INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const TAGS = path.join(ROOT, 'app', 'data', 'nodes', 'tags.json');
const ERRANDS = path.join(ROOT, 'app', 'data', 'nodes', 'errands.json');
const GUIDES_DIR = path.join(ROOT, 'content', 'guides');
const allowDerivedDrift = process.argv.includes('--allow-derived-drift');
const failures = [];
const warnings = [];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function formatJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function resolver() {
  const cats = new Set((readJson(DATA_INDEX).categories || []).map(c => c.id));
  const tags = fs.existsSync(TAGS) ? new Set((readJson(TAGS).nodes || []).map(n => n.id)) : new Set();
  const errands = fs.existsSync(ERRANDS) ? new Set((readJson(ERRANDS).nodes || []).map(n => n.id)) : new Set();

  return function resolves(node) {
    if (node.startsWith('ovs:cat/')) return cats.has(node.slice('ovs:cat/'.length));
    if (node.startsWith('ovs:tag/')) return tags.has(node);
    if (node.startsWith('ovs:errand/')) return errands.has(node);
    if (node.startsWith('ovs:guide/')) {
      const slug = node.slice('ovs:guide/'.length);
      return fs.existsSync(path.join(GUIDES_DIR, `${slug}.md`));
    }
    return false;
  };
}

function checkGeneratedSync(expected) {
  expect(fs.existsSync(OUT), 'app/data/pulse.json: missing generated output');
  if (!fs.existsSync(OUT)) return false;
  const matches = fs.readFileSync(OUT, 'utf8') === formatJson(expected);
  if (!matches) {
    // Always a warning, never a gate: pulse derives from git history, so it is stale after EVERY
    // commit by construction — a strict check here is a treadmill (each fix-commit re-stales it),
    // which kept turning CI red (PHASE-INTEGRATION §4). The build pipeline regenerates pulse into
    // dist on every release, so the shipped feed is always fresh; the committed copy may lag by
    // exactly the commits that came after it, and that is fine for a display ledger.
    warn('app/data/pulse.json: generated output lags the newest commits (regenerated at build time; run node pipeline/build_pulse.js to refresh the committed copy)');
  }
  return matches;
}

function checkPulse(pulse) {
  const resolves = resolver();
  expect(pulse.format === 'ovs-pulse', 'app/data/pulse.json: wrong format');
  expect(Array.isArray(pulse.entries), 'app/data/pulse.json: entries must be an array');
  expect(Number.isInteger(pulse.truncated) && pulse.truncated >= 0, 'app/data/pulse.json: truncated must be a nonnegative integer');
  expect(pulse.entries.length > 0, 'app/data/pulse.json: expected at least one pulse entry');
  expect(pulse.entries.length <= 48, `app/data/pulse.json: too many entries (${pulse.entries.length})`);

  let previous = null;
  let staleCount = 0;
  const seen = new Set();
  for (const [idx, entry] of pulse.entries.entries()) {
    expect(/^\d{4}-\d{2}-\d{2}$/.test(entry.date || ''), `entry ${idx + 1}: bad date ${entry.date}`);
    if (previous) expect(previous.localeCompare(entry.date) >= 0, `entry ${idx + 1}: dates are not newest-first`);
    previous = entry.date;

    expect(/^ovs:[a-z]+\/[a-z0-9-]+$/.test(entry.node || ''), `entry ${idx + 1}: bad node ${entry.node}`);
    expect(resolves(entry.node || ''), `entry ${idx + 1}: node does not resolve (${entry.node})`);
    expect(ALLOWED_KINDS.has(entry.kind), `entry ${idx + 1}: bad kind ${entry.kind}`);
    expect(typeof entry.what === 'string' && entry.what.trim().split(/\s+/).length >= 5, `entry ${idx + 1}: what is too thin`);
    expect(!/\b(like|share|streak|follow|trending|popular)\b/i.test(entry.what), `entry ${idx + 1}: engagement wording leaked into pulse`);
    expect(!/\blocal ledger\b/i.test(entry.what), `entry ${idx + 1}: generic local-ledger wording leaked into pulse`);
    expect(!/\bwas updated\b/i.test(entry.what), `entry ${idx + 1}: generic updated wording leaked into pulse`);
    expect(!/\bundefined|null\b/i.test(entry.what), `entry ${idx + 1}: placeholder wording leaked into pulse`);
    if (entry.source) expect(/^https?:\/\//.test(entry.source), `entry ${idx + 1}: source must be an http(s) URL`);
    if (entry.commit) expect(/^[0-9a-f]{8}$/.test(entry.commit), `entry ${idx + 1}: bad commit ${entry.commit}`);

    const key = `${entry.date}|${entry.node}|${entry.kind}|${entry.what}`;
    expect(!seen.has(key), `entry ${idx + 1}: duplicate pulse row`);
    seen.add(key);
    if (entry.kind === 'stale') staleCount += 1;
  }
  // A fully refreshed source queue is a valid steady state. The pulse is built
  // from the same dated provenance as the freshness report, so demanding a
  // stale row would make it impossible to clear the queue and stay green.
  return staleCount;
}

function main() {
  console.log('Pulse audit');
  const expected = buildAll();
  const current = fs.existsSync(OUT) ? readJson(OUT) : null;
  checkGeneratedSync(expected);
  const checked = allowDerivedDrift && current ? current : expected;
  const staleCount = checkPulse(checked);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  if (warnings.length) {
    console.log(`  warnings: ${warnings.length}`);
    for (const warning of warnings) console.log(`  WARN ${warning}`);
  }
  console.log(`  entries: ${checked.entries.length}`);
  console.log(`  stale freshness entries: ${staleCount}`);
  console.log(`  truncated: ${checked.truncated}`);
  console.log('PULSE CHECKS PASS');
}

main();
