#!/usr/bin/env node
/* Audit the canonical tag/synonym registry used by future tag pages and Ask. */
'use strict';

const fs = require('fs');
const path = require('path');
const { buildAll, normalizeToken } = require('../pipeline/build_tags.js');

const ROOT = path.resolve(__dirname, '..');
const TAG_SRC = path.join(ROOT, 'content', 'tags.json');
const SYN_SRC = path.join(ROOT, 'content', 'synonyms.json');
const TAG_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'tags.json');
const SYN_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'synonyms.json');
const DATA_INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const failures = [];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function formatted(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function loadSources() {
  return {
    tags: readJson(TAG_SRC),
    synonyms: readJson(SYN_SRC),
    categories: readJson(DATA_INDEX)
  };
}

function checkAliasUniqueness(tagSource, synonymSource) {
  const seen = new Map();

  function add(raw, owner) {
    const key = normalizeToken(raw);
    expect(!!key, `${owner}: blank alias`);
    if (!key) return;
    const prior = seen.get(key);
    expect(!prior || prior === owner, `alias collision for "${raw}" between ${prior || '(none)'} and ${owner}`);
    seen.set(key, owner);
  }

  for (const tag of tagSource.tags || []) {
    add(tag.label, tag.id);
    for (const alias of tag.aliases || []) add(alias, tag.id);
  }
  for (const term of Object.keys(synonymSource.synonyms || {})) add(term, `synonym:${term}`);

  return seen.size;
}

function checkCertificationReceipts(tagSource, tagIndex) {
  const sourceCerts = (tagSource.tags || []).filter(tag => tag.kind === 'certification');
  expect(sourceCerts.length >= 6, `expected at least 6 certification tags, found ${sourceCerts.length}`);
  for (const tag of sourceCerts) {
    expect(/^https?:\/\//.test(String(tag.receipt || '')), `${tag.id}: certification receipt missing or not URL`);
  }
  for (const tag of tagIndex.nodes || []) {
    if (tag.kind !== 'certification') continue;
    expect(/^https?:\/\//.test(String(tag.receipt || '')), `${tag.id}: generated certification receipt missing or not URL`);
  }
}

function checkGeneratedSync(outputs) {
  const expected = new Map([
    [TAG_OUT, formatted(outputs.tagIndex)],
    [SYN_OUT, formatted(outputs.synonymIndex)]
  ]);
  for (const [file, body] of expected.entries()) {
    expect(fs.existsSync(file), `${rel(file)}: missing generated output`);
    if (fs.existsSync(file)) expect(fs.readFileSync(file, 'utf8') === body, `${rel(file)}: generated output is stale`);
  }
}

function checkTagIndex(tagSource, tagIndex, categories) {
  const minItems = tagSource.minItems || 10;
  const catIds = new Set((categories.categories || []).map(cat => cat.id));
  const ids = new Set();

  expect(tagIndex.format === 'ovs-node-index', 'app/data/nodes/tags.json: wrong format');
  expect(tagIndex.type === 'tag', 'app/data/nodes/tags.json: wrong type');
  expect((tagIndex.nodes || []).length >= 80, `app/data/nodes/tags.json: expected at least 80 generated tags, found ${(tagIndex.nodes || []).length}`);

  for (const node of tagIndex.nodes || []) {
    expect(!ids.has(node.id), `${node.id}: duplicate generated id`);
    ids.add(node.id);
    expect(/^ovs:tag\/[a-z0-9-]+$/.test(node.id), `${node.id}: bad generated tag id`);
    expect(node.type === 'tag', `${node.id}: generated node type should be tag`);
    expect(node.items >= minItems, `${node.id}: generated node below minItems (${node.items} < ${minItems})`);
    expect(Array.isArray(node.categories) && node.categories.length > 0, `${node.id}: missing generated categories`);
    for (const cid of node.categories || []) expect(catIds.has(cid), `${node.id}: unknown generated category ${cid}`);
  }

  const openSource = (tagSource.tags || []).find(tag => tag.id === 'ovs:tag/open-source');
  expect(!!openSource, 'ovs:tag/open-source: missing canonical dirty-vocabulary fold');
  if (openSource) {
    const aliases = new Set((openSource.aliases || []).map(normalizeToken));
    expect(aliases.has(normalizeToken('open-source')), 'ovs:tag/open-source: missing open-source alias');
    expect(aliases.has(normalizeToken('source-available')), 'ovs:tag/open-source: missing source-available alias');
    expect((tagIndex.nodes || []).some(node => node.id === 'ovs:tag/open-source'), 'ovs:tag/open-source: missing generated node');
  }
}

function checkSynonymIndex(synSource, synIndex, tagSource, categories) {
  const catIds = new Set((categories.categories || []).map(cat => cat.id));
  const tagIds = new Set((tagSource.tags || []).map(tag => tag.id));
  const aliases = synIndex.aliases || {};

  expect(synIndex.format === 'ovs-synonym-index', 'app/data/nodes/synonyms.json: wrong format');
  expect(Object.keys(aliases).length >= 60, `app/data/nodes/synonyms.json: expected at least 60 synonyms, found ${Object.keys(aliases).length}`);

  for (const [term, target] of Object.entries(aliases)) {
    const normalized = normalizeToken(term);
    expect(synIndex.normalized && synIndex.normalized[normalized] === target, `${term}: normalized synonym missing`);
    if (target.startsWith('ovs:cat/')) expect(catIds.has(target.slice('ovs:cat/'.length)), `${term}: unknown category target ${target}`);
    else if (target.startsWith('ovs:tag/')) expect(tagIds.has(target), `${term}: unknown tag target ${target}`);
    else expect(false, `${term}: unsupported target ${target}`);
  }

  for (const term of ['pop', 'sneakers', 'washing up liquid', 'cell phone']) {
    expect(Object.prototype.hasOwnProperty.call(aliases, term), `content/synonyms.json: missing seed synonym "${term}"`);
  }
}

function main() {
  console.log('Tag registry audit');
  const { tags, synonyms, categories } = loadSources();
  const outputs = buildAll();
  checkGeneratedSync(outputs);
  const aliasCount = checkAliasUniqueness(tags, synonyms);
  checkCertificationReceipts(tags, outputs.tagIndex);
  checkTagIndex(tags, outputs.tagIndex, categories);
  checkSynonymIndex(synonyms, outputs.synonymIndex, tags, categories);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log(`  source tags: ${(tags.tags || []).length}`);
  console.log(`  generated tags: ${(outputs.tagIndex.nodes || []).length}`);
  console.log(`  synonyms: ${Object.keys((synonyms || {}).synonyms || {}).length}`);
  console.log(`  unique aliases/synonyms: ${aliasCount}`);
  console.log('TAG REGISTRY CHECKS PASS');
}

main();
