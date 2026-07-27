#!/usr/bin/env node
/* Build app/data/nodes/errands.json from content/errands.json.
   Errands are task recipes: they point at existing categories, end in a list,
   and stay data-only until the app runner consumes them. */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'content', 'errands.json');
const DATA_INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const OUT_DIR = path.join(ROOT, 'app', 'data', 'nodes');
const OUT = path.join(OUT_DIR, 'errands.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function formatJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeId(id) {
  return String(id || '').replace(/^ovs:errand\//, '');
}

function categoryIndex() {
  const index = readJson(DATA_INDEX);
  const out = new Map();
  for (const cat of index.categories || []) {
    const file = path.join(ROOT, 'app', 'data', cat.file || `${cat.id}.json`);
    const data = fs.existsSync(file) ? readJson(file) : {};
    out.set(cat.id, {
      id: cat.id,
      label: cat.label,
      type: cat.type,
      group: cat.group,
      criteria: new Set((data.criteria || []).map(c => c.key))
    });
  }
  return out;
}

function validateSource(source, cats) {
  assert(source.format === 'ovs-errand-registry', 'content/errands.json: unexpected format');
  assert(Array.isArray(source.errands), 'content/errands.json: errands must be an array');
  assert(source.errands.length === 12, `content/errands.json: expected 12 seed errands, found ${source.errands.length}`);

  const ids = new Set();
  for (const errand of source.errands) {
    assert(/^ovs:errand\/[a-z0-9-]+$/.test(errand.id || ''), `bad errand id ${errand.id || '(missing)'}`);
    assert(!ids.has(errand.id), `${errand.id}: duplicate errand id`);
    ids.add(errand.id);
    assert(typeof errand.label === 'string' && errand.label.trim(), `${errand.id}: missing label`);
    assert(Array.isArray(errand.aliases), `${errand.id}: aliases must be an array`);
    assert(typeof errand.reads === 'string' && errand.reads.trim().split(/\s+/).length >= 8, `${errand.id}: reads must be a useful sentence`);
    assert(errand.output === 'list', `${errand.id}: output must be "list"`);
    assert(Array.isArray(errand.steps) && errand.steps.length > 0, `${errand.id}: missing steps`);

    const stepCats = new Set();
    for (const [idx, step] of errand.steps.entries()) {
      assert(cats.has(step.cat), `${errand.id}: step ${idx + 1} references unknown category ${step.cat}`);
      assert(step.pick === 'one' || step.pick === 'several', `${errand.id}: step ${idx + 1} pick must be one|several`);
      assert(typeof step.note === 'string' && step.note.trim().split(/\s+/).length >= 3, `${errand.id}: step ${idx + 1} needs natural list copy`);
      stepCats.add(step.cat);
    }

    if (errand.tradeoff !== undefined) {
      assert(Array.isArray(errand.tradeoff) && errand.tradeoff.length === 2, `${errand.id}: tradeoff must be a pair`);
      for (const key of errand.tradeoff) {
        assert(/^[a-z][a-z0-9_]*$/.test(key), `${errand.id}: bad tradeoff key ${key}`);
        for (const cid of stepCats) {
          assert(cats.get(cid).criteria.has(key), `${errand.id}: tradeoff key ${key} is not a criterion in ${cid}`);
        }
      }
    }
  }
}

function buildAll() {
  const source = readJson(SRC);
  const cats = categoryIndex();
  validateSource(source, cats);

  const nodes = source.errands
    .map(errand => {
      const categories = [...new Set(errand.steps.map(step => step.cat))];
      const node = {
        id: errand.id,
        type: 'errand',
        label: errand.label,
        aliases: errand.aliases || [],
        reads: errand.reads,
        output: 'list',
        categories,
        steps: errand.steps.map(step => {
          const cat = cats.get(step.cat);
          return {
            cat: step.cat,
            label: cat.label,
            pick: step.pick,
            note: step.note
          };
        })
      };
      if (errand.tradeoff) node.tradeoff = errand.tradeoff;
      return node;
    })
    .sort((a, b) => normalizeId(a.id).localeCompare(normalizeId(b.id)));

  return {
    format: 'ovs-node-index',
    type: 'errand',
    version: source.version || '0.1',
    built: source.updated || new Date().toISOString().slice(0, 10),
    source: 'content/errands.json',
    nodes
  };
}

function writeOutput(index) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, formatJson(index));
}

function checkOutput(index) {
  if (!fs.existsSync(OUT)) return ['app/data/nodes/errands.json is missing'];
  const expected = formatJson(index);
  return fs.readFileSync(OUT, 'utf8') === expected ? [] : ['app/data/nodes/errands.json'];
}

function main() {
  try {
    const index = buildAll();
    if (process.argv.includes('--check')) {
      const drift = checkOutput(index);
      if (drift.length) {
        console.log('build_errands: generated output is stale');
        for (const item of drift) console.log('  ' + item);
        process.exit(1);
      }
      console.log(`build_errands: output current (${index.nodes.length} errands)`);
      return;
    }
    writeOutput(index);
    console.log(`build_errands: wrote app/data/nodes/errands.json (${index.nodes.length} errands)`);
  } catch (err) {
    console.error('build_errands FAILED:', err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  buildAll
};
