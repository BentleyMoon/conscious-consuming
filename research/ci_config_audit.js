#!/usr/bin/env node
/* CI configuration audit for Values Commons.

   The workflow should prove the project health gates and package-mode smoke
   test, but it should not deploy or depend on Cloudflare credentials.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = '.github/workflows/verify.yml';
const failures = [];

function abs(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function read(rel) {
  if (!exists(rel)) {
    failures.push(`${rel}: missing file`);
    return '';
  }
  return fs.readFileSync(abs(rel), 'utf8');
}

function readJson(rel) {
  const text = read(rel);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    failures.push(`${rel}: invalid JSON (${err.message})`);
    return {};
  }
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function expectIncludes(text, needle, message) {
  expect(text.includes(needle), message || `${WORKFLOW}: missing ${needle}`);
}

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function checkPackage() {
  const pkg = readJson('package.json');
  const scripts = pkg.scripts || {};
  expect(normalize(scripts['audit:ci']) === 'node research/ci_config_audit.js', 'package.json: missing audit:ci script');
  expect(normalize(scripts['audit:generated']) === 'node scripts/check-generated-drift.mjs', 'package.json: missing audit:generated script');
  expect(normalize(scripts['audit:commands']) === 'node research/command_surface_audit.js', 'package.json: missing audit:commands script');
}

function checkWorkflow() {
  const text = read(WORKFLOW);
  if (!text) return;

  for (const needle of [
    'name: Values Commons verify',
    'pull_request:',
    'push:',
    'workflow_dispatch:',
    'permissions:',
    'contents: read',
    'actions/checkout@v4',
    'actions/setup-node@v4',
    'node-version: "22"',
    'actions/setup-python@v5',
    'python-version: "3.12"',
    'run: npm ci',
    'run: npm run verify:full',
    'run: npm run audit:release-modes',
    'run: npm run release:status',
    'timeout-minutes:'
  ]) {
    expectIncludes(text, needle);
  }

  for (const forbidden of [
    'wrangler deploy',
    'npm run deploy',
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_ACCOUNT_ID',
    'secrets.',
    'permissions: write-all',
    'contents: write'
  ]) {
    if (text.includes(forbidden)) failures.push(`${WORKFLOW}: CI should not contain ${forbidden}`);
  }
}

function main() {
  console.log('CI configuration audit');
  checkPackage();
  checkWorkflow();

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('CI CONFIG CHECKS PASS');
}

main();
