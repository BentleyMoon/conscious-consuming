#!/usr/bin/env node
/* Register shelf audit.

   The shelf is a promise about the whole catalogue, so this gate derives its
   subject from content/registers.json and the catalogue. It does not maintain
   a second list of register ids, criterion keys, or proven decisions.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../app/engine.js');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];
const HTTP_URL = /^https?:\/\//i;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CRITERION_KEY = /^[a-z][a-z0-9_]*$/;

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function readJson(relPath) {
  return JSON.parse(readText(relPath));
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function uniqueStrings(values, label) {
  expect(Array.isArray(values) && values.length > 0, `${label}: expected a non-empty array`);
  if (!Array.isArray(values)) return;
  const seen = new Set();
  values.forEach((value, index) => {
    expect(typeof value === 'string' && value.trim().length > 0, `${label}[${index}]: expected a non-empty string`);
    expect(!seen.has(value), `${label}[${index}]: duplicate ${value}`);
    seen.add(value);
  });
}

function objectBody(relPath, name, declaration = 'const') {
  const text = readText(relPath);
  const prefix = declaration === 'python' ? `${name}\\s*=\\s*` : `const\\s+${name}\\s*=\\s*`;
  const match = text.match(new RegExp(`${prefix}\\{([\\s\\S]*?)\\n\\}`));
  expect(Boolean(match), `${relPath}: missing ${name} registry`);
  return match ? match[1] : '';
}

function mapKeys(relPath, name, declaration = 'const') {
  const body = objectBody(relPath, name, declaration);
  const keys = new Set();
  for (const match of body.matchAll(/(?:^|[\s,])([A-Za-z0-9_]+|["'][^"']+["'])\s*:/g)) {
    keys.add(match[1].replace(/^["']|["']$/g, ''));
  }
  return keys;
}

function tradeoffKeys() {
  const body = objectBody('pipeline/build_decisions.js', 'TRADEOFFS');
  const keys = new Set();
  for (const match of body.matchAll(/["']([a-z][a-z0-9_]*\|[a-z][a-z0-9_]*)["']\s*:/g)) {
    match[1].split('|').forEach(key => keys.add(key));
  }
  return keys;
}

function collectCatalogueIds(value, out = new Set()) {
  if (Array.isArray(value)) {
    value.forEach(item => collectCatalogueIds(item, out));
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  const isDecision = typeof value.path === 'string'
    && typeof value.scope === 'string'
    && typeof value.mode === 'string';
  if (isDecision && typeof value.id === 'string' && ID.test(value.id)) out.add(value.id);
  if (isDecision && typeof value.cid === 'string' && ID.test(value.cid)) out.add(value.cid);
  Object.values(value).forEach(item => collectCatalogueIds(item, out));
  return out;
}

function applyProbe(shelf) {
  const arg = process.argv.find(value => value.startsWith('--probe='));
  if (!arg) return;
  const probe = arg.slice('--probe='.length);
  if (probe === 'duplicate-register') {
    shelf.registers.push(JSON.parse(JSON.stringify(shelf.registers[0])));
  } else if (probe === 'unknown-decision') {
    shelf.registers[0].proven.push('not-a-catalogue-decision');
  } else if (probe === 'unregistered-key') {
    shelf.registers[0].provenanceKey = 'not_registered';
  } else {
    failures.push(`unknown probe ${probe}`);
  }
}

function addLensIds(dir, out) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return;
  for (const name of fs.readdirSync(abs).filter(item => item.endsWith('.json'))) {
    out.add(path.basename(name, '.json'));
    const value = readJson(path.join(dir, name).replace(/\\/g, '/'));
    if (value && value.meta) {
      for (const candidate of [value.meta.id, value.meta.cid, value.meta.category]) {
        if (typeof candidate === 'string' && ID.test(candidate)) out.add(candidate);
      }
    }
  }
}

function main() {
  console.log('Register shelf audit');
  const shelf = readJson('content/registers.json');
  applyProbe(shelf);
  const catalogueIds = collectCatalogueIds(readJson('content/taxonomy.json'));
  addLensIds('content/lenses', catalogueIds);
  addLensIds('content/lenses-pending', catalogueIds);

  expect(shelf.format === 'open-values-register-shelf', 'content/registers.json: wrong format');
  expect(shelf.version === '1.0.0', 'content/registers.json: unsupported version');
  expect(shelf.howToRead && typeof shelf.howToRead === 'object', 'content/registers.json: missing howToRead');
  expect(Array.isArray(shelf.registers) && shelf.registers.length > 0, 'content/registers.json: missing registers');
  expect(Array.isArray(shelf.refused) && shelf.refused.length > 0, 'content/registers.json: missing refused source classes');

  const criterionRegistries = [
    ['app/engine.js:KEY2THEME', new Set(Object.keys(engine.KEY2THEME || {}))],
    ['pipeline/build_datasets.py:KEY2THEME', mapKeys('pipeline/build_datasets.py', 'KEY2THEME', 'python')],
    ['research/verify_run.js:KEY2THEME', mapKeys('research/verify_run.js', 'KEY2THEME')],
    ['pipeline/build_decisions.js:COPY', mapKeys('pipeline/build_decisions.js', 'COPY')],
    ['pipeline/build_decisions.js:TRADEOFFS', tradeoffKeys()]
  ];

  const registerIds = new Set();
  const endpoints = new Set();
  const accessCounts = {};
  const reachCounts = {};
  const touchedDecisions = new Set();

  for (const [index, register] of (shelf.registers || []).entries()) {
    const at = `content/registers.json:registers[${index}]`;
    expect(register && typeof register === 'object' && !Array.isArray(register), `${at}: expected object`);
    if (!register || typeof register !== 'object') continue;
    expect(ID.test(String(register.id || '')), `${at}.id: invalid id`);
    expect(!registerIds.has(register.id), `${at}.id: duplicate ${register.id}`);
    registerIds.add(register.id);
    expect(typeof register.name === 'string' && register.name.trim(), `${at}.name: missing name`);
    expect(typeof register.publisher === 'string' && register.publisher.trim(), `${at}.publisher: missing publisher`);
    expect(['api', 'bulk', 'page'].includes(register.access), `${at}.access: expected api, bulk, or page`);
    expect(['cross-cutting', 'single'].includes(register.reach), `${at}.reach: expected cross-cutting or single`);
    expect(HTTP_URL.test(String(register.endpoint || '')), `${at}.endpoint: expected http(s) URL`);
    expect(!endpoints.has(register.endpoint), `${at}.endpoint: duplicate ${register.endpoint}`);
    endpoints.add(register.endpoint);
    expect(CRITERION_KEY.test(String(register.provenanceKey || '')), `${at}.provenanceKey: invalid key`);
    uniqueStrings(register.populates, `${at}.populates`);
    uniqueStrings(register.proven, `${at}.proven`);
    if (register.alsoAt != null) {
      uniqueStrings(register.alsoAt, `${at}.alsoAt`);
      for (const [urlIndex, url] of register.alsoAt.entries()) {
        expect(HTTP_URL.test(url), `${at}.alsoAt[${urlIndex}]: expected http(s) URL`);
      }
    }
    for (const decisionId of register.proven || []) {
      touchedDecisions.add(decisionId);
      expect(catalogueIds.has(decisionId), `${at}.proven: unknown catalogue decision ${decisionId}`);
    }
    for (const [label, keys] of criterionRegistries) {
      expect(keys.has(register.provenanceKey), `${at}.provenanceKey: ${register.provenanceKey} missing from ${label}`);
    }
    accessCounts[register.access] = (accessCounts[register.access] || 0) + 1;
    reachCounts[register.reach] = (reachCounts[register.reach] || 0) + 1;
  }

  const refusalPatterns = new Set();
  for (const [index, refusal] of (shelf.refused || []).entries()) {
    const at = `content/registers.json:refused[${index}]`;
    expect(refusal && typeof refusal === 'object' && !Array.isArray(refusal), `${at}: expected object`);
    if (!refusal || typeof refusal !== 'object') continue;
    expect(typeof refusal.pattern === 'string' && refusal.pattern.trim(), `${at}.pattern: missing pattern`);
    expect(!refusalPatterns.has(refusal.pattern), `${at}.pattern: duplicate ${refusal.pattern}`);
    refusalPatterns.add(refusal.pattern);
    expect(typeof refusal.why === 'string' && refusal.why.trim().length >= 24, `${at}.why: missing durable reason`);
    if (refusal.examples != null) uniqueStrings(refusal.examples, `${at}.examples`);
  }

  const scalable = (accessCounts.api || 0) + (accessCounts.bulk || 0);
  console.log(`  registers: ${registerIds.size}`);
  console.log(`  scalable endpoints: ${scalable} (${accessCounts.api || 0} api, ${accessCounts.bulk || 0} bulk)`);
  console.log(`  reach: ${reachCounts['cross-cutting'] || 0} cross-cutting, ${reachCounts.single || 0} single`);
  console.log(`  proven catalogue decisions: ${touchedDecisions.size}`);
  console.log(`  refused source classes: ${refusalPatterns.size}`);

  if (warnings.length) {
    console.log(`  warnings: ${warnings.length}`);
    warnings.forEach(warning => console.log(`  WARN ${warning}`));
  }
  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    failures.forEach(failure => console.log(`  FAIL ${failure}`));
    process.exit(1);
  }
  console.log('REGISTER SHELF CHECKS PASS');
}

main();
