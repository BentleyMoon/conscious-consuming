#!/usr/bin/env node
/* Audit task-style errand definitions and their generated node index. */
'use strict';

const fs = require('fs');
const path = require('path');
const { buildAll } = require('../pipeline/build_errands.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'content', 'errands.json');
const OUT = path.join(ROOT, 'app', 'data', 'nodes', 'errands.json');
const DATA_INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const failures = [];

const REQUIRED = [
  'weekly-groceries',
  'breakfast-reset',
  'pick-a-bank',
  'move-your-subscriptions',
  'de-google',
  'new-phone-sanely',
  'clean-the-bathroom-cabinet',
  'dinner-for-8',
  'gift-under-20',
  'back-to-school',
  'first-apartment',
  'switch-your-search'
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function normalize(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function formatJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function categoryCriteria() {
  const index = readJson(DATA_INDEX);
  const out = new Map();
  for (const cat of index.categories || []) {
    const dataPath = path.join(ROOT, 'app', 'data', cat.file || `${cat.id}.json`);
    const data = fs.existsSync(dataPath) ? readJson(dataPath) : {};
    out.set(cat.id, new Set((data.criteria || []).map(c => c.key)));
  }
  return out;
}

function checkSeedSet(source) {
  const got = new Set((source.errands || []).map(e => String(e.id || '').replace(/^ovs:errand\//, '')));
  for (const id of REQUIRED) expect(got.has(id), `missing required errand ${id}`);
  for (const id of got) expect(REQUIRED.includes(id), `unexpected errand ${id}`);
}

function checkAliases(source) {
  const seen = new Map();
  for (const errand of source.errands || []) {
    for (const raw of [errand.label, ...(errand.aliases || [])]) {
      const key = normalize(raw);
      expect(!!key, `${errand.id}: blank alias/label`);
      if (!key) continue;
      const prior = seen.get(key);
      expect(!prior || prior === errand.id, `alias collision for "${raw}" between ${prior} and ${errand.id}`);
      seen.set(key, errand.id);
    }
  }
  return seen.size;
}

function checkGeneratedSync(index) {
  expect(fs.existsSync(OUT), 'app/data/nodes/errands.json: missing generated output');
  if (fs.existsSync(OUT)) expect(fs.readFileSync(OUT, 'utf8') === formatJson(index), 'app/data/nodes/errands.json: generated output is stale');
}

function checkGeneratedIndex(index, criteriaByCat) {
  expect(index.format === 'ovs-node-index', 'app/data/nodes/errands.json: wrong format');
  expect(index.type === 'errand', 'app/data/nodes/errands.json: wrong type');
  expect((index.nodes || []).length === 12, `app/data/nodes/errands.json: expected 12 errands, found ${(index.nodes || []).length}`);

  const ids = new Set();
  let tradeoffCount = 0;
  for (const node of index.nodes || []) {
    expect(!ids.has(node.id), `${node.id}: duplicate generated id`);
    ids.add(node.id);
    expect(node.output === 'list', `${node.id}: output must be list`);
    expect(Array.isArray(node.steps) && node.steps.length > 0, `${node.id}: missing generated steps`);
    expect(Array.isArray(node.categories) && node.categories.length > 0, `${node.id}: missing generated categories`);
    for (const step of node.steps || []) {
      expect(criteriaByCat.has(step.cat), `${node.id}: unknown generated step category ${step.cat}`);
      expect(step.pick === 'one' || step.pick === 'several', `${node.id}: step ${step.cat} has bad pick ${step.pick}`);
      expect(typeof step.note === 'string' && step.note.trim().length > 12, `${node.id}: step ${step.cat} needs useful list copy`);
      expect(typeof step.label === 'string' && step.label.trim(), `${node.id}: step ${step.cat} missing category label`);
    }
    if (node.tradeoff) {
      tradeoffCount += 1;
      expect(node.tradeoff.length === 2, `${node.id}: tradeoff must have two keys`);
      for (const key of node.tradeoff) {
        for (const cid of node.categories) {
          expect(criteriaByCat.get(cid).has(key), `${node.id}: tradeoff key ${key} not found in ${cid}`);
        }
      }
    }
  }
  expect(tradeoffCount >= 4, `expected at least 4 errands with real tradeoffs, found ${tradeoffCount}`);
}

function main() {
  console.log('Errands audit');
  const source = readJson(SRC);
  const index = buildAll();
  const criteriaByCat = categoryCriteria();

  checkSeedSet(source);
  const aliasCount = checkAliases(source);
  checkGeneratedSync(index);
  checkGeneratedIndex(index, criteriaByCat);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log(`  errands: ${(source.errands || []).length}`);
  console.log(`  generated nodes: ${(index.nodes || []).length}`);
  console.log(`  aliases/labels: ${aliasCount}`);
  console.log('ERRANDS CHECKS PASS');
}

main();
