#!/usr/bin/env node
/* Value-signature audit.

   The H4 bloom is allowed to be visual, but its vector must be boringly true:
   every generated valueSignature must be exactly the engine's theme projection
   over scored facts, with missing themes omitted and no invented zeroes.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../app/engine.js');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'app', 'data');
const DESIGN_TOKENS = path.join(DATA, 'design-tokens.json');
const INDEX = path.join(DATA, 'index.json');
const failures = [];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    failures.push(`${rel(file)}: cannot read JSON (${err.message})`);
    return null;
  }
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function itemsFor(lens) {
  if (Array.isArray(lens && lens.products)) return lens.products;
  if (Array.isArray(lens && lens.resources)) return lens.resources;
  return [];
}

function roundScore(value) {
  if (!Number.isFinite(value)) return null;
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? rounded : rounded;
}

function normalizeSignature(value, order) {
  const out = {};
  const source = isObject(value) ? value : {};
  for (const theme of order) {
    const rounded = roundScore(Number(source[theme]));
    if (rounded != null) out[theme] = rounded;
  }
  return out;
}

function sameObject(a, b) {
  return JSON.stringify(a || {}) === JSON.stringify(b || {});
}

function sameArray(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => item === b[i]);
}

function codeOf(entity) {
  return String((entity && (entity.code || entity.id || entity.name)) || '(unknown)');
}

function cardRoute(category, code) {
  return `#card/${category}/${encodeURIComponent(String(code || ''))}`;
}

function profileFromStats(stats, minimumThemesForBloom, order) {
  const themeCounts = {};
  for (const theme of order) {
    if (stats.themeCounts[theme]) themeCounts[theme] = stats.themeCounts[theme];
  }
  return {
    entryCount: stats.entryCount,
    signedEntries: stats.signedEntries,
    drawableEntries: stats.drawableEntries,
    minimumThemesForBloom,
    themeCounts,
  };
}

function auditLens(file, lens, indexCategory, order, minimumThemesForBloom) {
  const category = (lens.meta && lens.meta.id) || file.replace(/\.json$/, '');
  const key2theme = Object.assign({}, engine.KEY2THEME || {}, lens.key2theme || {});
  const stats = {
    category,
    entryCount: itemsFor(lens).length,
    signedEntries: 0,
    drawableEntries: 0,
    themeCounts: {},
    unmappedCriteria: new Map(),
  };

  for (const entity of itemsFor(lens)) {
    const scores = entity && entity.scores || {};
    for (const [key, score] of Object.entries(scores)) {
      if (score != null && !key2theme[key]) {
        stats.unmappedCriteria.set(key, (stats.unmappedCriteria.get(key) || 0) + 1);
      }
    }
    const expected = normalizeSignature(engine.signature(entity, key2theme), order);
    const actual = normalizeSignature(entity.valueSignature, order);
    const themes = Object.keys(expected);
    if (themes.length) {
      stats.signedEntries += 1;
      if (themes.length >= minimumThemesForBloom) stats.drawableEntries += 1;
      for (const theme of themes) stats.themeCounts[theme] = (stats.themeCounts[theme] || 0) + 1;
      expect(sameObject(actual, expected), `app/data/${file}:${codeOf(entity)} valueSignature expected ${JSON.stringify(expected)}, found ${JSON.stringify(entity.valueSignature)}`);
    } else {
      expect(!entity.valueSignature, `app/data/${file}:${codeOf(entity)} should omit valueSignature when no mapped scores exist`);
    }
  }

  for (const [key, count] of stats.unmappedCriteria.entries()) {
    failures.push(`app/data/${file}: unmapped scored criterion ${key} (${count} entries)`);
  }

  const expectedProfile = profileFromStats(stats, minimumThemesForBloom, order);
  expect(sameObject(lens.meta && lens.meta.valueSignatureProfile, expectedProfile), `app/data/${file}: meta.valueSignatureProfile mismatch`);
  expect(sameObject(indexCategory && indexCategory.valueSignatureProfile, expectedProfile), `app/data/index.json:${category} valueSignatureProfile mismatch`);
  return stats;
}

function mergeCoverage(statsList, minimumThemesForBloom, order) {
  const coverage = {
    categories: statsList.length,
    entries: 0,
    scoredEntries: 0,
    signedEntries: 0,
    drawableEntries: 0,
    missingSignatureEntries: 0,
    staleSignatureEntries: 0,
    minimumThemesForBloom,
    themeCounts: {},
  };
  for (const stats of statsList) {
    coverage.entries += stats.entryCount;
    coverage.scoredEntries += stats.signedEntries;
    coverage.signedEntries += stats.signedEntries;
    coverage.drawableEntries += stats.drawableEntries;
    for (const theme of order) {
      if (stats.themeCounts[theme]) coverage.themeCounts[theme] = (coverage.themeCounts[theme] || 0) + stats.themeCounts[theme];
    }
  }
  const orderedThemeCounts = {};
  for (const theme of order) {
    if (coverage.themeCounts[theme]) orderedThemeCounts[theme] = coverage.themeCounts[theme];
  }
  coverage.themeCounts = orderedThemeCounts;
  return coverage;
}

function findEntity(category, code) {
  const file = path.join(DATA, `${category}.json`);
  const lens = readJson(file);
  if (!lens) return null;
  return itemsFor(lens).find(entity => codeOf(entity) === String(code));
}

function auditFixtures(valueBloom, order, minimumThemesForBloom) {
  const fixtures = valueBloom && valueBloom.previewFixtures;
  expect(Array.isArray(fixtures) && fixtures.length === 3, 'app/data/design-tokens.json:valueBloom.previewFixtures must contain exactly three fixtures');
  if (!Array.isArray(fixtures)) return;
  const seenCategories = new Set();
  for (const [i, fixture] of fixtures.entries()) {
    const at = `app/data/design-tokens.json:valueBloom.previewFixtures[${i}]`;
    expect(isObject(fixture), `${at} must be an object`);
    if (!isObject(fixture)) continue;
    expect(typeof fixture.category === 'string' && fixture.category.length > 0, `${at}.category missing`);
    expect(typeof fixture.code === 'string' && fixture.code.length > 0, `${at}.code missing`);
    expect(typeof fixture.name === 'string' && fixture.name.length > 0, `${at}.name missing`);
    expect(fixture.route === cardRoute(fixture.category, fixture.code), `${at}.route should be ${cardRoute(fixture.category, fixture.code)}`);
    expect(!seenCategories.has(fixture.category), `${at}.category duplicates ${fixture.category}`);
    seenCategories.add(fixture.category);

    const entity = findEntity(fixture.category, fixture.code);
    expect(Boolean(entity), `${at}: target entity not found`);
    if (!entity) continue;
    const actual = normalizeSignature(entity.valueSignature, order);
    const fixtureSignature = normalizeSignature(fixture.signature, order);
    expect(sameObject(fixtureSignature, actual), `${at}.signature does not match live entity valueSignature`);
    expect(Object.keys(fixtureSignature).length === fixture.themeCount, `${at}.themeCount mismatch`);
    expect(fixture.themeCount >= minimumThemesForBloom, `${at}.themeCount below bloom floor`);
  }
}

function main() {
  console.log('Value signature audit');
  const index = readJson(INDEX);
  const designTokens = readJson(DESIGN_TOKENS);
  if (!index || !designTokens) process.exit(1);

  const valueBloom = designTokens.valueBloom || {};
  const order = Array.isArray(valueBloom.order) ? valueBloom.order : [];
  const minimumThemesForBloom = Number.isInteger(valueBloom.minimumThemesForBloom) ? valueBloom.minimumThemesForBloom : 2;
  expect(sameArray(order, ['planet', 'people', 'health', 'honesty', 'privacy', 'animals', 'cost', 'local']), 'valueBloom.order must match the canonical theme order');

  const indexByCategory = new Map((index.categories || []).map(category => [category.id, category]));
  const files = (index.categories || [])
    .map(category => category.file)
    .filter(Boolean)
    .sort();

  const statsList = [];
  for (const file of files) {
    const lens = readJson(path.join(DATA, file));
    if (!lens) continue;
    statsList.push(auditLens(file, lens, indexByCategory.get((lens.meta && lens.meta.id) || file.replace(/\.json$/, '')), order, minimumThemesForBloom));
  }

  const coverage = mergeCoverage(statsList, minimumThemesForBloom, order);
  expect(sameObject(designTokens.valueSignatureCoverage, coverage), 'app/data/design-tokens.json:valueSignatureCoverage mismatch');
  expect(sameObject(valueBloom.signatureCoverage, coverage), 'app/data/design-tokens.json:valueBloom.signatureCoverage mismatch');
  expect(designTokens.counts && designTokens.counts.valueSignatures === coverage.signedEntries, 'app/data/design-tokens.json:counts.valueSignatures mismatch');
  expect(designTokens.counts && designTokens.counts.drawableBloomEntries === coverage.drawableEntries, 'app/data/design-tokens.json:counts.drawableBloomEntries mismatch');
  auditFixtures(valueBloom, order, minimumThemesForBloom);

  console.log(`  categories: ${coverage.categories}`);
  console.log(`  entries: ${coverage.entries}`);
  console.log(`  signed entries: ${coverage.signedEntries}`);
  console.log(`  drawable entries: ${coverage.drawableEntries}`);
  console.log(`  preview fixtures: ${(valueBloom.previewFixtures || []).map(fixture => `${fixture.category}/${fixture.code}`).join(', ')}`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures.slice(0, 40)) console.log(`  FAIL ${failure}`);
    if (failures.length > 40) console.log(`  ... ${failures.length - 40} more`);
    process.exit(1);
  }

  console.log('VALUE SIGNATURE CHECKS PASS');
}

main();
