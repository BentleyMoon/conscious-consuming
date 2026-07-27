#!/usr/bin/env node
/* Build the canonical tag/synonym node indexes from content/tags.json and
   content/synonyms.json. Counts are computed from app/data/*.json so the node
   registry stays tied to the real generated corpus. */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TAG_SRC = path.join(ROOT, 'content', 'tags.json');
const SYN_SRC = path.join(ROOT, 'content', 'synonyms.json');
const DATA_INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const OUT_DIR = path.join(ROOT, 'app', 'data', 'nodes');
const TAG_OUT = path.join(OUT_DIR, 'tags.json');
const SYN_OUT = path.join(OUT_DIR, 'synonyms.json');
const VALID_KINDS = new Set(['certification', 'property', 'topic']);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function formatJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function normalizeToken(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[''`]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateTagSource(source) {
  const tags = Array.isArray(source.tags) ? source.tags : [];
  const ids = new Set();

  assert(source.format === 'ovs-tag-registry', 'content/tags.json: unexpected format');
  assert(tags.length >= 80, `content/tags.json: expected at least 80 tags, found ${tags.length}`);
  assert(Number.isInteger(source.minItems) && source.minItems > 0, 'content/tags.json: minItems must be a positive integer');

  for (const tag of tags) {
    assert(/^ovs:tag\/[a-z0-9-]+$/.test(tag.id || ''), `content/tags.json: bad tag id ${tag.id || '(missing)'}`);
    assert(!ids.has(tag.id), `content/tags.json: duplicate tag id ${tag.id}`);
    ids.add(tag.id);
    assert(typeof tag.label === 'string' && tag.label.trim(), `${tag.id}: missing label`);
    assert(Array.isArray(tag.aliases), `${tag.id}: aliases must be an array`);
    assert(VALID_KINDS.has(tag.kind), `${tag.id}: invalid kind ${tag.kind}`);
    assert(typeof tag.reads === 'string' && tag.reads.trim().split(/\s+/).length >= 5, `${tag.id}: missing useful reads`);
    assert(tag.receipt === null || /^https?:\/\//.test(String(tag.receipt)), `${tag.id}: receipt must be null or an http(s) URL`);
    if (tag.kind === 'certification') assert(tag.receipt, `${tag.id}: certification tags must carry a receipt`);
  }

  return tags;
}

function validateSynonymSource(source) {
  const synonyms = source.synonyms || {};
  assert(source.format === 'ovs-synonym-registry', 'content/synonyms.json: unexpected format');
  assert(synonyms && typeof synonyms === 'object' && !Array.isArray(synonyms), 'content/synonyms.json: synonyms must be an object');
  assert(Object.keys(synonyms).length >= 60, `content/synonyms.json: expected at least 60 synonyms, found ${Object.keys(synonyms).length}`);
  for (const [term, target] of Object.entries(synonyms)) {
    assert(normalizeToken(term), `content/synonyms.json: blank synonym term for ${target}`);
    assert(/^ovs:(cat|tag)\/[a-z0-9-]+$/.test(String(target)), `${term}: target must be ovs:cat/* or ovs:tag/*`);
  }
  return synonyms;
}

function buildAliasMap(tags) {
  const aliases = new Map();
  for (const tag of tags) {
    for (const raw of [tag.label, ...(tag.aliases || [])]) {
      const key = normalizeToken(raw);
      if (!key) continue;
      const existing = aliases.get(key);
      assert(!existing || existing === tag.id, `tag alias collision: "${raw}" maps to both ${existing} and ${tag.id}`);
      aliases.set(key, tag.id);
    }
  }
  return aliases;
}

function categoryMap() {
  const index = readJson(DATA_INDEX);
  const cats = new Map();
  for (const cat of index.categories || []) cats.set(cat.id, cat);
  return cats;
}

function productTags(product) {
  const out = [];
  for (const field of ['focuses', 'labels', 'tags']) {
    if (!Array.isArray(product[field])) continue;
    for (const value of product[field]) {
      if (typeof value === 'string' && value.trim()) out.push(value.trim());
    }
  }
  return out;
}

function collectCounts(tags, aliases) {
  const counters = new Map();
  for (const tag of tags) counters.set(tag.id, { items: 0, categories: new Set(), raw: new Map() });

  const cats = categoryMap();
  for (const [cid, cat] of cats.entries()) {
    const file = path.join(ROOT, 'app', 'data', cat.file || `${cid}.json`);
    if (!fs.existsSync(file)) continue;
    const data = readJson(file);
    for (const product of data.products || []) {
      const matched = new Map();
      for (const raw of productTags(product)) {
        const id = aliases.get(normalizeToken(raw));
        if (!id) continue;
        matched.set(id, raw);
      }
      for (const [id, raw] of matched.entries()) {
        const counter = counters.get(id);
        counter.items += 1;
        counter.categories.add(cid);
        counter.raw.set(raw, (counter.raw.get(raw) || 0) + 1);
      }
    }
  }

  return counters;
}

function buildTagsIndex(tagSource, counters) {
  const minItems = tagSource.minItems || 10;
  const nodes = validateTagSource(tagSource)
    .map(tag => {
      const counter = counters.get(tag.id) || { items: 0, categories: new Set(), raw: new Map() };
      return {
        id: tag.id,
        type: 'tag',
        label: tag.label,
        aliases: tag.aliases || [],
        kind: tag.kind,
        reads: tag.reads,
        receipt: tag.receipt || null,
        items: counter.items,
        categories: [...counter.categories].sort()
      };
    })
    .filter(node => node.items >= minItems)
    .sort((a, b) => b.items - a.items || a.label.localeCompare(b.label));

  return {
    format: 'ovs-node-index',
    type: 'tag',
    version: tagSource.version || '0.1',
    built: tagSource.updated || new Date().toISOString().slice(0, 10),
    minItems,
    source: 'content/tags.json',
    nodes
  };
}

function buildSynonymIndex(synSource, tagIds, catIds) {
  const synonyms = validateSynonymSource(synSource);
  const aliases = {};
  const normalized = {};
  const targets = {};

  for (const [term, target] of Object.entries(synonyms).sort((a, b) => a[0].localeCompare(b[0]))) {
    const type = target.split('/')[0];
    if (type === 'ovs:cat') assert(catIds.has(target.slice('ovs:cat/'.length)), `${term}: unknown category target ${target}`);
    if (type === 'ovs:tag') assert(tagIds.has(target), `${term}: unknown tag target ${target}`);
    const key = normalizeToken(term);
    assert(!normalized[key] || normalized[key] === target, `${term}: normalized synonym collision at "${key}"`);
    aliases[term] = target;
    normalized[key] = target;
    if (!targets[target]) targets[target] = [];
    targets[target].push(term);
  }

  return {
    format: 'ovs-synonym-index',
    version: synSource.version || '0.1',
    built: synSource.updated || new Date().toISOString().slice(0, 10),
    source: 'content/synonyms.json',
    aliases,
    normalized,
    targets
  };
}

function buildAll() {
  const tagSource = readJson(TAG_SRC);
  const synSource = readJson(SYN_SRC);
  const tags = validateTagSource(tagSource);
  const aliases = buildAliasMap(tags);
  const counters = collectCounts(tags, aliases);
  const tagIndex = buildTagsIndex(tagSource, counters);
  const tagIds = new Set(tags.map(tag => tag.id));
  const catIds = new Set(categoryMap().keys());
  const synonymIndex = buildSynonymIndex(synSource, tagIds, catIds);
  return { tagIndex, synonymIndex };
}

function writeOutputs(outputs) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(TAG_OUT, formatJson(outputs.tagIndex));
  fs.writeFileSync(SYN_OUT, formatJson(outputs.synonymIndex));
}

function checkOutputs(outputs) {
  const expected = new Map([
    [TAG_OUT, formatJson(outputs.tagIndex)],
    [SYN_OUT, formatJson(outputs.synonymIndex)]
  ]);
  const drift = [];
  for (const [file, body] of expected.entries()) {
    if (!fs.existsSync(file)) {
      drift.push(path.relative(ROOT, file).replace(/\\/g, '/') + ' is missing');
      continue;
    }
    if (fs.readFileSync(file, 'utf8') !== body) drift.push(path.relative(ROOT, file).replace(/\\/g, '/'));
  }
  return drift;
}

function main() {
  try {
    const check = process.argv.includes('--check');
    const outputs = buildAll();
    if (check) {
      const drift = checkOutputs(outputs);
      if (drift.length) {
        console.log('build_tags: generated outputs are stale');
        for (const item of drift) console.log('  ' + item);
        process.exit(1);
      }
      console.log(`build_tags: outputs current (${outputs.tagIndex.nodes.length} tags, ${Object.keys(outputs.synonymIndex.aliases).length} synonyms)`);
      return;
    }
    writeOutputs(outputs);
    console.log(`build_tags: wrote app/data/nodes/tags.json (${outputs.tagIndex.nodes.length} tags)`);
    console.log(`build_tags: wrote app/data/nodes/synonyms.json (${Object.keys(outputs.synonymIndex.aliases).length} synonyms)`);
  } catch (err) {
    console.error('build_tags FAILED:', err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  buildAll,
  normalizeToken,
  VALID_KINDS
};
