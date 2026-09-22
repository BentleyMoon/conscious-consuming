#!/usr/bin/env node
/* Prove complete decision by register coverage from the current taxonomy and shelf. */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MATRIX_PATH = path.join(ROOT, 'pipeline', 'registers', 'coverage-matrix.json');
const failures = [];
const TARGET_SCOPES = new Set(['covered', 'open']);
const STATUSES = ['applicable', 'not-applicable', 'blocked', 'unmapped'];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function readJson(relPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
  } catch (error) {
    failures.push(`${relPath}: invalid JSON (${error.message})`);
    return {};
  }
}

function collectDecisions(value, out = []) {
  if (Array.isArray(value)) value.forEach(item => collectDecisions(item, out));
  else if (value && typeof value === 'object') {
    if (['id', 'path', 'scope', 'mode', 'realm', 'field', 'family', 'type'].every(key => Object.prototype.hasOwnProperty.call(value, key))) out.push(value);
    Object.values(value).forEach(item => collectDecisions(item, out));
  }
  return out;
}

function rowStatusGroups(decision) {
  return [
    ['applicable', decision.coverage?.applicable || []],
    ['not-applicable', decision.coverage?.notApplicable || []],
    ['blocked', decision.coverage?.blocked || []],
    ['unmapped', decision.coverage?.unmapped || []],
  ];
}

function main() {
  console.log('Register coverage audit');
  const taxonomy = readJson('content/taxonomy.json');
  const shelf = readJson('content/registers.json');
  const rules = readJson('content/register-coverage-rules.json');
  const inventory = readJson('pipeline/registers/entity-inventory.json');
  const matrix = readJson('pipeline/registers/coverage-matrix.json');
  const allDecisions = collectDecisions(taxonomy);
  const targets = allDecisions.filter(row => TARGET_SCOPES.has(row.scope));
  const targetsById = new Map(targets.map(row => [row.id, row]));
  const shelfById = new Map((shelf.registers || []).map(row => [row.id, row]));
  const ruleById = new Map((rules.registers || []).map(row => [row.registerId, row]));
  const builtCids = new Set((inventory.decisions || []).map(row => row.cid));
  const matrixIds = new Set();
  const statusCounts = Object.fromEntries(STATUSES.map(status => [status, 0]));

  expect(matrix.format === 'open-values-register-coverage-matrix', 'coverage matrix: wrong format');
  expect(matrix.version === '1.0.0', 'coverage matrix: unsupported version');
  expect((matrix.decisions || []).length === targets.length, `coverage matrix: expected ${targets.length} target decisions`);
  expect((matrix.registers || []).length === shelfById.size, `coverage matrix: expected ${shelfById.size} registers`);
  expect(ruleById.size === shelfById.size, 'coverage rules: must contain exactly one rule per shelf register');
  for (const registerId of shelfById.keys()) expect(ruleById.has(registerId), `coverage rules: missing ${registerId}`);

  for (const [index, decision] of (matrix.decisions || []).entries()) {
    const label = `coverage-matrix.decisions[${index}]`;
    expect(!matrixIds.has(decision.id), `${label}.id: duplicate ${decision.id}`);
    matrixIds.add(decision.id);
    const taxonomyDecision = targetsById.get(decision.id);
    expect(Boolean(taxonomyDecision), `${label}.id: unknown or excluded taxonomy decision ${decision.id}`);
    if (taxonomyDecision) {
      for (const field of ['cid', 'label', 'path', 'scope', 'realm', 'field', 'family', 'type', 'mode']) {
        expect((decision[field] ?? null) === (taxonomyDecision[field] ?? null), `${label}.${field}: taxonomy drift`);
      }
      expect(decision.built === builtCids.has(taxonomyDecision.cid), `${label}.built: inventory drift`);
    }
    const seenRegisters = new Set();
    for (const [status, rows] of rowStatusGroups(decision)) {
      expect(Array.isArray(rows), `${label}.coverage.${status}: expected array`);
      for (const [rowIndex, item] of (rows || []).entries()) {
        const registerId = status === 'unmapped' ? item : item.registerId;
        const at = `${label}.coverage.${status}[${rowIndex}]`;
        expect(typeof registerId === 'string', `${at}: missing register id`);
        expect(!seenRegisters.has(registerId), `${at}: register appears in more than one status group`);
        seenRegisters.add(registerId);
        const register = shelfById.get(registerId);
        expect(Boolean(register), `${at}: unknown shelf register ${registerId}`);
        if (status !== 'unmapped') {
          expect(item.criterion === register?.provenanceKey, `${at}.criterion: shelf drift`);
          expect(typeof item.reason === 'string' && item.reason.trim(), `${at}.reason: missing`);
          expect(item.basis?.kind === 'shelf-proven' || item.basis?.kind === 'selector', `${at}.basis: resolved status requires reviewed basis`);
          if (item.basis?.kind === 'selector') {
            const selectorIds = new Set((ruleById.get(registerId)?.selectors || []).map(selector => selector.id));
            expect(selectorIds.has(item.basis.id), `${at}.basis.id: unknown selector ${item.basis.id || '(missing)'}`);
          }
        }
        statusCounts[status] += 1;
      }
    }
    expect(seenRegisters.size === shelfById.size, `${label}.coverage: expected ${shelfById.size} unique register statuses, found ${seenRegisters.size}`);
    for (const registerId of shelfById.keys()) expect(seenRegisters.has(registerId), `${label}.coverage: missing ${registerId}`);
  }
  for (const decisionId of targetsById.keys()) expect(matrixIds.has(decisionId), `coverage matrix: missing target decision ${decisionId}`);

  for (const register of shelf.registers || []) {
    for (const proven of register.proven || []) {
      const matches = (matrix.decisions || []).filter(decision => decision.id === proven || decision.cid === proven);
      for (const decision of matches) {
        const applicable = new Set((decision.coverage?.applicable || []).map(row => row.registerId));
        expect(applicable.has(register.id), `${decision.id}/${register.id}: shelf-proven relationship must be applicable`);
      }
    }
  }

  const relationshipCount = targets.length * shelfById.size;
  expect(Object.values(statusCounts).reduce((sum, count) => sum + count, 0) === relationshipCount, 'coverage matrix: status denominator mismatch');
  expect(matrix.counts?.relationships === relationshipCount, 'coverage matrix counts.relationships: mismatch');
  expect(matrix.counts?.targetDecisions === targets.length, 'coverage matrix counts.targetDecisions: mismatch');
  expect(matrix.counts?.registers === shelfById.size, 'coverage matrix counts.registers: mismatch');
  for (const status of STATUSES) expect(matrix.counts?.statuses?.[status] === statusCounts[status], `coverage matrix counts.statuses.${status}: mismatch`);
  expect(matrix.counts?.coveredDecisions === targets.filter(row => row.scope === 'covered').length, 'coverage matrix counts.coveredDecisions: mismatch');
  expect(matrix.counts?.openDecisions === targets.filter(row => row.scope === 'open').length, 'coverage matrix counts.openDecisions: mismatch');
  expect(matrix.counts?.excludedHoldDecisions === allDecisions.filter(row => row.scope === 'hold').length, 'coverage matrix counts.excludedHoldDecisions: mismatch');
  expect(matrix.counts?.excludedOutDecisions === allDecisions.filter(row => row.scope === 'out').length, 'coverage matrix counts.excludedOutDecisions: mismatch');

  const reviewed = relationshipCount - statusCounts.unmapped;
  console.log(`  taxonomy decisions: ${allDecisions.length}`);
  console.log(`  target decisions: ${targets.length} (${matrix.counts?.coveredDecisions || 0} covered, ${matrix.counts?.openDecisions || 0} open)`);
  console.log(`  registers: ${shelfById.size}`);
  console.log(`  relationships: ${relationshipCount}`);
  console.log(`  applicable: ${statusCounts.applicable}`);
  console.log(`  not applicable: ${statusCounts['not-applicable']}`);
  console.log(`  blocked: ${statusCounts.blocked}`);
  console.log(`  unmapped: ${statusCounts.unmapped}`);
  console.log(`  reviewed applicability: ${reviewed}/${relationshipCount} (${(reviewed / relationshipCount * 100).toFixed(1)}%)`);
  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    failures.forEach(failure => console.log(`  FAIL ${failure}`));
    process.exit(1);
  }
  console.log('REGISTER COVERAGE CHECKS PASS');
}

main();
