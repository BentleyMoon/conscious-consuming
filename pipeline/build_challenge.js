#!/usr/bin/env node
/* Build app/data/challenge-index.json from content/challenge/index.json.

   The source file stays the authored contract. This generated index is the
   compact, runtime-friendly view: instance defaults, replayed top picks, and
   selected sourced contrary facts.
*/
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const engine = require('../app/engine.js');
const {
  rankEntities,
  buildTagMap,
  selectSteelmanTag,
  selectOppositeStrengthTag
} = require('../research/challenge_helpers.js');

const ROOT = path.resolve(__dirname, '..');
const CHALLENGE = path.join(ROOT, 'content', 'challenge', 'index.json');
const DATA_INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const OUT = path.join(ROOT, 'app', 'data', 'challenge-index.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function formatJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function cleanObject(value) {
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined && entry !== null) out[key] = entry;
  }
  return out;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function round(value, places = 4) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function categoryMap() {
  const index = readJson(DATA_INDEX);
  return new Map((index.categories || []).map(category => [category.id, category]));
}

function loadLens(category) {
  return readJson(path.join(ROOT, 'app', 'data', `${category}.json`));
}

function topSummary(row) {
  if (!row) return null;
  const entity = row.entity || {};
  const result = row.result || {};
  return cleanObject({
    code: entity.code,
    name: entity.name,
    brand: entity.brand,
    score: result.score,
    coverage: round(result.coverage),
    why: result.why
  });
}

function citation(tag) {
  return cleanObject({
    tag: tag.id,
    axis: tag.axis,
    score: tag.score,
    summary: tag.summary,
    source: clone(tag.source)
  });
}

function summarizeInstance(instance) {
  return cleanObject({
    id: instance.id,
    label: instance.label,
    role: instance.role,
    status: instance.status,
    challengeDefault: instance.challengeDefault,
    surfaces: clone(instance.surfaces || []),
    config: instance.config ? clone(instance.config) : undefined
  });
}

function summarizeCategory(category, lens) {
  return cleanObject({
    id: category,
    label: lens.meta && lens.meta.label,
    type: lens.meta && lens.meta.type,
    file: `app/data/${category}.json`,
    n: lens.meta && lens.meta.n,
    criteria: (lens.criteria || []).map(criterion => ({
      key: criterion.key,
      label: criterion.label
    }))
  });
}

function summarizeCase(test, lens, tags) {
  const userRank = rankEntities(lens, test.userView.weights, engine);
  const oppositeRank = rankEntities(lens, test.oppositeView.weights, engine);
  const steelmanTag = selectSteelmanTag(test, tags);
  const oppositeTag = selectOppositeStrengthTag(test, tags);
  const oppositeReceipt = oppositeTag ? citation(oppositeTag) : null;
  const steelmanReceipt = steelmanTag ? citation(steelmanTag) : null;

  return {
    id: test.id,
    category: test.category,
    label: test.label,
    reads: test.reads,
    userView: {
      label: test.userView.label,
      weights: clone(test.userView.weights),
      expectedTop: test.userView.expectedTop,
      top: topSummary(userRank[0])
    },
    oppositeView: {
      label: test.oppositeView.label,
      weights: clone(test.oppositeView.weights),
      expectedTop: test.oppositeView.expectedTop,
      top: topSummary(oppositeRank[0]),
      sourceTag: test.oppositeView.sourceTag,
      selectedTag: oppositeReceipt,
      receipt: oppositeReceipt
    },
    steelman: {
      forEntity: test.steelman.forEntity,
      axis: test.steelman.axis,
      sourceTag: test.steelman.sourceTag,
      framing: test.steelman.framing,
      line: test.steelman.framing,
      selectedTag: steelmanReceipt,
      receipt: steelmanReceipt
    }
  };
}

function buildChallengeIndex() {
  const sourceText = fs.readFileSync(CHALLENGE, 'utf8');
  const challenge = JSON.parse(sourceText);
  const tags = buildTagMap(challenge.contraryTags || []);
  const categories = categoryMap();
  const lenses = new Map();

  function lensFor(category) {
    if (!lenses.has(category)) lenses.set(category, loadLens(category));
    return lenses.get(category);
  }

  for (const test of challenge.cases || []) lensFor(test.category);

  const coveredCategories = [...new Set((challenge.cases || []).map(test => test.category))]
    .sort()
    .map(category => summarizeCategory(category, lensFor(category)));

  return {
    format: 'open-values-challenge-index',
    version: '0.1.0',
    standard: 'open-values-standard',
    built: challenge.updated,
    purpose: 'Generated compact index for calm anti-echo-chamber surfaces across Open Values instances.',
    generatedFrom: {
      path: rel(CHALLENGE),
      updated: challenge.updated,
      sha256: sha256(sourceText)
    },
    counts: {
      instances: (challenge.instances || []).length,
      algorithms: (challenge.algorithms || []).length,
      cases: (challenge.cases || []).length,
      contraryTags: (challenge.contraryTags || []).length,
      categories: coveredCategories.length
    },
    principles: clone(challenge.principles || []),
    algorithms: (challenge.algorithms || []).map(algorithm => ({
      id: algorithm.id,
      label: algorithm.label,
      summary: algorithm.summary
    })),
    instances: (challenge.instances || []).map(summarizeInstance),
    categories: coveredCategories,
    cases: (challenge.cases || []).map(test => summarizeCase(test, lensFor(test.category), tags))
  };
}

function writeOutput(index) {
  fs.writeFileSync(OUT, formatJson(index));
}

function checkOutput(index) {
  if (!fs.existsSync(OUT)) return ['app/data/challenge-index.json is missing'];
  return fs.readFileSync(OUT, 'utf8') === formatJson(index) ? [] : ['app/data/challenge-index.json'];
}

function main() {
  try {
    const index = buildChallengeIndex();
    if (process.argv.includes('--check')) {
      const drift = checkOutput(index);
      if (drift.length) {
        console.log('build_challenge: generated output is stale');
        for (const item of drift) console.log('  ' + item);
        process.exit(1);
      }
      console.log(`build_challenge: output current (${index.counts.cases} cases, ${index.counts.categories} categories)`);
      return;
    }
    writeOutput(index);
    console.log(`build_challenge: wrote app/data/challenge-index.json (${index.counts.cases} cases, ${index.counts.categories} categories)`);
  } catch (err) {
    console.error('build_challenge FAILED:', err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  OUT,
  buildChallengeIndex,
  formatJson
};
