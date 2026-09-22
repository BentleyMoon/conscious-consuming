#!/usr/bin/env node
/* Validate every reviewed register mapping against every current built option. */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAP_DIR = path.join(ROOT, 'content', 'register-mappings');
const INVENTORY_PATH = path.join(ROOT, 'pipeline', 'registers', 'entity-inventory.json');
const failures = [];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const HTTP_URL = /^https?:\/\//i;
const STATUSES = new Set(['matched', 'ambiguous', 'unmatched', 'not-applicable', 'unreviewed']);
const ROOT_KEYS = new Set(['format', 'version', 'registerId', 'updated', 'note', 'mappings']);
const ROW_KEYS = new Set(['cid', 'entityCode', 'entityName', 'entityIdentitySha256', 'status', 'legalName', 'aliases', 'jurisdiction', 'registerIdentifier', 'matchEvidence', 'candidates', 'reason', 'review']);

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function readJson(abs) {
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (error) {
    failures.push(`${path.relative(ROOT, abs)}: invalid JSON (${error.message})`);
    return null;
  }
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(canonical(value)).digest('hex');
}

function nonempty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function expectKeys(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const key of Object.keys(value)) expect(allowed.has(key), `${label}: unexpected field ${key}`);
}

function validateIdentifier(value, label) {
  expect(value && typeof value === 'object' && !Array.isArray(value), `${label}: missing identifier object`);
  if (!value || typeof value !== 'object') return;
  expectKeys(value, new Set(['scheme', 'value', 'url']), label);
  expect(nonempty(value.scheme), `${label}.scheme: missing`);
  expect(nonempty(value.value), `${label}.value: missing`);
  if (value.url != null) expect(HTTP_URL.test(value.url), `${label}.url: expected http(s) URL`);
}

function sourceAllowed(register, source) {
  if (!register) return false;
  let candidate;
  try {
    candidate = new URL(source);
  } catch {
    return false;
  }
  return [register.endpoint, ...(register.alsoAt || [])].some(url => {
    try {
      const hostname = new URL(url).hostname;
      return candidate.hostname === hostname || candidate.hostname.endsWith(`.${hostname}`);
    } catch {
      return false;
    }
  });
}

function validateEvidence(value, label, register) {
  expect(value && typeof value === 'object' && !Array.isArray(value), `${label}: missing evidence object`);
  if (!value || typeof value !== 'object') return;
  expectKeys(value, new Set(['source', 'note', 'accessed']), label);
  expect(HTTP_URL.test(String(value.source || '')), `${label}.source: expected http(s) URL`);
  if (HTTP_URL.test(String(value.source || ''))) expect(sourceAllowed(register, value.source), `${label}.source: outside this register's shelf-declared hosts`);
  expect(nonempty(value.note), `${label}.note: missing`);
  expect(DATE.test(String(value.accessed || '')), `${label}.accessed: expected YYYY-MM-DD`);
}

function validateReview(value, label, updated) {
  expect(value && typeof value === 'object' && !Array.isArray(value), `${label}: missing review object`);
  if (!value || typeof value !== 'object') return;
  expectKeys(value, new Set(['by', 'on']), label);
  expect(nonempty(value.by), `${label}.by: missing`);
  expect(DATE.test(String(value.on || '')), `${label}.on: expected YYYY-MM-DD`);
  if (DATE.test(String(value.on || '')) && DATE.test(updated)) expect(value.on <= updated, `${label}.on: later than map updated date`);
}

function builtEntities(inventory) {
  const decisions = new Map();
  for (const receipt of inventory.decisions || []) {
    const dataset = readJson(path.join(ROOT, receipt.dataset));
    if (!dataset) continue;
    const entities = dataset[receipt.entityField] || [];
    const byCode = new Map();
    for (const entity of entities) {
      byCode.set(entity.code, {
        name: entity.name,
        identitySha256: digest({code: entity.code, name: entity.name}),
      });
    }
    decisions.set(receipt.cid, {receipt, byCode});
  }
  return decisions;
}

function validateCandidate(value, label, register) {
  expect(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
  if (!value || typeof value !== 'object') return;
  expectKeys(value, new Set(['legalName', 'jurisdiction', 'registerIdentifier', 'matchEvidence']), label);
  expect(nonempty(value.legalName), `${label}.legalName: missing`);
  expect(nonempty(value.jurisdiction), `${label}.jurisdiction: missing`);
  validateIdentifier(value.registerIdentifier, `${label}.registerIdentifier`);
  validateEvidence(value.matchEvidence, `${label}.matchEvidence`, register);
}

function validateRow(row, label, decisions, updated, seen, statusCounts, register) {
  expect(row && typeof row === 'object' && !Array.isArray(row), `${label}: expected object`);
  if (!row || typeof row !== 'object') return;
  expectKeys(row, ROW_KEYS, label);
  const target = `${row.cid}/${row.entityCode}`;
  expect(!seen.has(target), `${label}: duplicate target ${target}`);
  seen.add(target);
  const decision = decisions.get(row.cid);
  expect(Boolean(decision), `${label}.cid: unknown built decision ${row.cid || '(missing)'}`);
  const entity = decision && decision.byCode.get(row.entityCode);
  expect(Boolean(entity), `${label}.entityCode: unknown option ${target}`);
  if (entity) {
    expect(row.entityName === entity.name, `${label}.entityName: expected current name ${entity.name}`);
    expect(row.entityIdentitySha256 === entity.identitySha256, `${label}.entityIdentitySha256: stale or invalid identity receipt`);
  } else expect(SHA256.test(String(row.entityIdentitySha256 || '')), `${label}.entityIdentitySha256: invalid sha256`);
  expect(STATUSES.has(row.status), `${label}.status: unknown status ${row.status || '(missing)'}`);
  if (STATUSES.has(row.status)) statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;

  if (row.status === 'matched') {
    expect(nonempty(row.legalName), `${label}.legalName: matched row requires legal name`);
    expect(Array.isArray(row.aliases), `${label}.aliases: matched row requires array`);
    if (Array.isArray(row.aliases)) expect(new Set(row.aliases).size === row.aliases.length && row.aliases.every(nonempty), `${label}.aliases: expected unique non-empty strings`);
    expect(nonempty(row.jurisdiction), `${label}.jurisdiction: matched row requires jurisdiction`);
    validateIdentifier(row.registerIdentifier, `${label}.registerIdentifier`);
    validateEvidence(row.matchEvidence, `${label}.matchEvidence`, register);
    validateReview(row.review, `${label}.review`, updated);
    expect(row.candidates == null && row.reason == null, `${label}: matched row must not carry unresolved fields`);
  } else if (row.status === 'ambiguous') {
    expect(Array.isArray(row.candidates) && row.candidates.length > 0, `${label}.candidates: ambiguous row requires candidates`);
    (row.candidates || []).forEach((candidate, index) => validateCandidate(candidate, `${label}.candidates[${index}]`, register));
    expect(nonempty(row.reason), `${label}.reason: ambiguous row requires reason`);
    validateReview(row.review, `${label}.review`, updated);
    expect(row.registerIdentifier == null, `${label}: ambiguous row cannot choose a register identifier`);
  } else if (row.status === 'unmatched' || row.status === 'not-applicable') {
    expect(nonempty(row.reason), `${label}.reason: ${row.status} row requires reason`);
    validateEvidence(row.matchEvidence, `${label}.matchEvidence`, register);
    validateReview(row.review, `${label}.review`, updated);
    expect(row.registerIdentifier == null && row.candidates == null, `${label}: ${row.status} row cannot carry a selected or candidate identifier`);
  } else if (row.status === 'unreviewed') {
    for (const field of ['legalName', 'aliases', 'jurisdiction', 'registerIdentifier', 'matchEvidence', 'candidates', 'reason', 'review']) {
      expect(row[field] == null, `${label}: unreviewed row cannot carry ${field}`);
    }
  }
}

function applyProbe(decisions, registers, statusCounts) {
  const arg = process.argv.find(value => value.startsWith('--probe='));
  if (!arg) return;
  const probe = arg.slice('--probe='.length);
  const [cid, decision] = decisions.entries().next().value;
  const [entityCode, entity] = decision.byCode.entries().next().value;
  const register = registers.values().next().value;
  const row = {
    cid,
    entityCode,
    entityName: entity.name,
    entityIdentitySha256: entity.identitySha256,
    status: 'matched',
    legalName: entity.name,
    aliases: [],
    jurisdiction: 'fixture',
    registerIdentifier: {scheme: 'fixture', value: 'fixture'},
    matchEvidence: {source: register.endpoint, note: 'Falsifiability probe only.', accessed: '2026-08-14'},
    review: {by: 'Falsifiability probe', on: '2026-08-14'},
  };
  if (probe === 'matched-without-identifier') delete row.registerIdentifier;
  else if (probe === 'unresolved-claims') {
    row.status = 'unreviewed';
    row.claimEligible = true;
  } else if (probe === 'unknown-entity') row.entityCode = 'not-a-catalogue-option';
  else {
    failures.push(`unknown probe ${probe}`);
    return;
  }
  validateRow(row, `probe.${probe}`, decisions, '2026-08-14', new Set(), statusCounts, register);
}

function main() {
  console.log('Register entity mapping audit');
  const shelf = readJson(path.join(ROOT, 'content', 'registers.json')) || {};
  const registers = new Map((shelf.registers || []).map(row => [row.id, row]));
  const inventory = readJson(INVENTORY_PATH) || {};
  const decisions = builtEntities(inventory);
  const files = fs.existsSync(MAP_DIR)
    ? fs.readdirSync(MAP_DIR).filter(name => name.endsWith('.json')).sort()
    : [];
  const mappedRegisters = new Set();
  const statusCounts = {};
  let rows = 0;
  for (const name of files) {
    const abs = path.join(MAP_DIR, name);
    const label = path.relative(ROOT, abs).replace(/\\/g, '/');
    const value = readJson(abs);
    if (!value) continue;
    expectKeys(value, ROOT_KEYS, label);
    expect(value.format === 'open-values-register-entity-map', `${label}: wrong format`);
    expect(value.version === '1.0.0', `${label}: unsupported version`);
    const register = registers.get(value.registerId);
    expect(Boolean(register), `${label}.registerId: unknown shelf register ${value.registerId || '(missing)'}`);
    expect(name === `${value.registerId}.json`, `${label}: filename must match registerId`);
    expect(!mappedRegisters.has(value.registerId), `${label}.registerId: duplicate map for ${value.registerId}`);
    mappedRegisters.add(value.registerId);
    expect(DATE.test(String(value.updated || '')), `${label}.updated: expected YYYY-MM-DD`);
    expect(nonempty(value.note), `${label}.note: missing`);
    expect(Array.isArray(value.mappings) && value.mappings.length > 0, `${label}.mappings: expected non-empty array`);
    const seen = new Set();
    for (const [index, row] of (value.mappings || []).entries()) {
      rows += 1;
      validateRow(row, `${label}.mappings[${index}]`, decisions, value.updated, seen, statusCounts, register);
    }
  }
  applyProbe(decisions, registers, statusCounts);

  console.log(`  built decisions: ${inventory.counts?.decisions || 0}`);
  console.log(`  addressable entities: ${inventory.counts?.entities || 0}`);
  console.log(`  register map files: ${files.length}`);
  console.log(`  mapping rows: ${rows}`);
  console.log(`  claim-eligible matched rows: ${statusCounts.matched || 0}`);
  console.log(`  unresolved rows: ${(statusCounts.unreviewed || 0) + (statusCounts.ambiguous || 0) + (statusCounts.unmatched || 0)}`);
  console.log(`  not-applicable rows: ${statusCounts['not-applicable'] || 0}`);
  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    failures.forEach(failure => console.log(`  FAIL ${failure}`));
    process.exit(1);
  }
  console.log('REGISTER ENTITY MAPPING CHECKS PASS');
}

main();
