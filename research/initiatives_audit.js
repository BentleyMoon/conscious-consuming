#!/usr/bin/env node
/* C14 initiatives and asks/offers audit.

   This proves the fifth entry type is present as ordinary sourced lens data,
   and that the help-over-selling board starts as a file contract instead of a
   live account/database surface.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const {
  OUT: ASKS_OFFERS_INDEX,
  buildAsksOffersIndex,
  formatJson
} = require('../pipeline/build_initiatives.js');

const ROOT = path.resolve(__dirname, '..');
const INITIATIVES = path.join(ROOT, 'content', 'lenses', 'initiatives-causes.json');
const GENERATED_INITIATIVES = path.join(ROOT, 'app', 'data', 'causes-to-support.json');
const ASKS_OFFERS = path.join(ROOT, 'content', 'asks-offers.json');
const DATA_INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const GUIDES = path.join(ROOT, 'content', 'guides');
const failures = [];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const URL = /^https?:\/\//;
const YEAR = /^(19|20)\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNIVERSAL = new Set(['planet', 'people', 'openness', 'access', 'wellbeing', 'autonomy', 'animals', 'community', 'quality', 'joy']);
const REGIONS = new Set(['US', 'UK', 'EU', 'global']);
const NO_PRIVATE_DATA = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/i;
const INTERNAL_COPY = /\bfork this\b|\blive request\b|\blive offer\b|\btemplate\b/i;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function sourceOk(source, label) {
  expect(isObject(source), `${label}: missing source object`);
  if (!isObject(source)) return;
  expect(nonEmpty(source.note), `${label}: missing note`);
  expect(URL.test(String(source.source || '')), `${label}: missing http(s) source`);
  expect(YEAR.test(String(source.asof || '')), `${label}: missing asof year`);
}

function entityArray(lens) {
  return lens.products || lens.resources || [];
}

function loadCategoryIds() {
  const index = readJson(DATA_INDEX);
  return new Set((index.categories || []).map(category => category.id));
}

function checkInitiativesLens(lens) {
  expect(lens.meta && lens.meta.id === 'causes-to-support', 'initiatives lens: expected causes-to-support id');
  expect(lens.meta && lens.meta.type === 'Initiatives', 'initiatives lens: must use Initiatives type');
  expect(entityArray(lens).length >= 50, 'initiatives lens: expected broad roster');
  const criteria = new Set((lens.criteria || []).map(criterion => criterion.key));
  for (const key of ['impact', 'transparency', 'ways_to_help', 'openness', 'longevity']) {
    expect(criteria.has(key), `initiatives lens: missing criterion ${key}`);
  }
  const focusText = entityArray(lens).flatMap(entity => entity.focuses || []).join(' | ').toLowerCase();
  for (const needed of ['digital rights', 'climate', 'humanitarian', 'grassroots', 'evidence-backed']) {
    expect(focusText.includes(needed), `initiatives lens: missing focus coverage for ${needed}`);
  }
  for (const entity of entityArray(lens)) {
    for (const [key, score] of Object.entries(entity.scores || {})) {
      if (score == null) continue;
      const source = entity.provenance && entity.provenance[key];
      expect(isObject(source), `${entity.code}.${key}: score missing citation object`);
      if (isObject(source)) sourceOk(source, `${entity.code}.${key}`);
    }
  }
}

function checkActPath(pathValue, label) {
  expect(isObject(pathValue), `${label}: missing actPath object`);
  if (!isObject(pathValue)) return;
  expect(['url', 'plain'].includes(pathValue.kind), `${label}: actPath.kind must be url or plain`);
  expect(nonEmpty(pathValue.label), `${label}: actPath missing label`);
  if (pathValue.kind === 'url') expect(URL.test(String(pathValue.url || '')), `${label}: actPath missing http(s) url`);
  if (pathValue.kind === 'plain') expect(nonEmpty(pathValue.instruction), `${label}: plain actPath missing instruction`);
}

function checkInitiativeSurfaceContract(sourceLens, generatedLens) {
  expect(generatedLens && generatedLens.meta && generatedLens.meta.id === 'causes-to-support', 'generated initiatives: missing causes-to-support dataset');
  const sourceRows = entityArray(sourceLens);
  const generatedRows = entityArray(generatedLens || {});
  expect(generatedRows.length === sourceRows.length, 'generated initiatives: entry count must match source lens');
  for (const entity of generatedRows) {
    const label = `generated ${entity.code}`;
    expect(isObject(entity.legitimacy), `${label}: missing legitimacy object`);
    if (isObject(entity.legitimacy)) {
      expect(nonEmpty(entity.legitimacy.line), `${label}: legitimacy missing line`);
      expect(String(entity.legitimacy.line || '').includes(entity.name), `${label}: legitimacy line should name who runs it`);
      sourceOk(entity.legitimacy.source, `${label}.legitimacy.source`);
    }
    checkActPath(entity.actPath, label);
    expect(!Array.isArray(entity.actPaths), `${label}: must expose exactly one actPath, not actPaths`);
  }
}

function checkRelated(item, initiativeCodes, categoryIds) {
  const related = item.related || {};
  for (const category of related.categories || []) {
    expect(categoryIds.has(category), `${item.id}: unknown related category ${category}`);
  }
  for (const guide of related.guides || []) {
    expect(fs.existsSync(path.join(GUIDES, `${guide}.md`)), `${item.id}: unknown related guide ${guide}`);
  }
  for (const initiative of related.initiatives || []) {
    expect(initiativeCodes.has(initiative), `${item.id}: unknown related initiative ${initiative}`);
  }
}

function checkAsksOffers(data, lens) {
  expect(data.format === 'open-values-asks-offers', 'asks/offers: wrong format');
  expect(data.version === '0.1.0', 'asks/offers: wrong version');
  expect(data.standard === 'open-values-standard', 'asks/offers: wrong standard');
  expect(DATE.test(String(data.updated || '')), 'asks/offers: updated must be YYYY-MM-DD');
  expect(Array.isArray(data.principles) && data.principles.length >= 4, 'asks/offers: too few principles');
  expect(data.publication && data.publication.liveDatabase === false, 'asks/offers: liveDatabase must stay false');
  expect(/private contact/i.test(data.publication && data.publication.privacy || ''), 'asks/offers: privacy must forbid private contact details');
  expect(!NO_PRIVATE_DATA.test(JSON.stringify(data)), 'asks/offers: public file appears to contain private contact data');
  expect(Array.isArray(data.items) && data.items.length >= 6, 'asks/offers: expected at least six seed items');

  const initiativeCodes = new Set(entityArray(lens).map(entity => entity.code));
  const categoryIds = loadCategoryIds();
  const ids = new Set();
  let asks = 0;
  let offers = 0;

  for (const item of data.items || []) {
    expect(SLUG.test(String(item.id || '')), `${item.id}: invalid id`);
    expect(!ids.has(item.id), `${item.id}: duplicate id`);
    ids.add(item.id);
    expect(['ask', 'offer'].includes(item.kind), `${item.id}: invalid kind`);
    if (item.kind === 'ask') asks += 1;
    if (item.kind === 'offer') offers += 1;
    expect(['template', 'seed', 'live', 'archived'].includes(item.status), `${item.id}: invalid status`);
    expect(item.status !== 'live', `${item.id}: live records are not allowed in the seed file`);
    expect(nonEmpty(item.title), `${item.id}: missing title`);
    expect(nonEmpty(item.summary), `${item.id}: missing summary`);
    expect(nonEmpty(item.prompt), `${item.id}: missing prompt`);
    for (const field of ['title', 'summary', 'prompt']) {
      expect(!INTERNAL_COPY.test(String(item[field] || '')), `${item.id}.${field}: sounds like internal file-format copy`);
    }
    expect(Array.isArray(item.audience) && item.audience.length > 0, `${item.id}: missing audience`);
    expect(Array.isArray(item.values) && item.values.length > 0, `${item.id}: missing values`);
    for (const value of item.values || []) expect(UNIVERSAL.has(value), `${item.id}: unknown universal value ${value}`);
    expect(Array.isArray(item.regions) && item.regions.length > 0, `${item.id}: missing regions`);
    for (const region of item.regions || []) expect(REGIONS.has(region), `${item.id}: unknown region ${region}`);
    if (item.kind === 'ask') expect(Array.isArray(item.needs) && item.needs.length > 0, `${item.id}: ask missing needs`);
    if (item.kind === 'offer') expect(Array.isArray(item.offers) && item.offers.length > 0, `${item.id}: offer missing offers`);
    expect(Array.isArray(item.receipts) && item.receipts.length >= 2, `${item.id}: expected at least two receipts`);
    (item.receipts || []).forEach((receipt, i) => sourceOk(receipt, `${item.id}.receipts[${i}]`));
    expect(Array.isArray(item.limits) && item.limits.length > 0, `${item.id}: missing limits`);
    checkRelated(item, initiativeCodes, categoryIds);
  }

  expect(asks >= 3, 'asks/offers: expected at least three ask templates');
  expect(offers >= 3, 'asks/offers: expected at least three offer templates');
  return { asks, offers, items: (data.items || []).length };
}

function checkGeneratedIndex() {
  expect(fs.existsSync(ASKS_OFFERS_INDEX), 'asks/offers index: missing generated output app/data/asks-offers-index.json');
  if (!fs.existsSync(ASKS_OFFERS_INDEX)) return;
  const expected = formatJson(buildAsksOffersIndex());
  const actual = fs.readFileSync(ASKS_OFFERS_INDEX, 'utf8');
  expect(actual === expected, 'asks/offers index: generated output is stale; run node pipeline/build_initiatives.js');
}

function main() {
  console.log('Initiatives audit');
  const lens = readJson(INITIATIVES);
  const generatedLens = fs.existsSync(GENERATED_INITIATIVES) ? readJson(GENERATED_INITIATIVES) : null;
  const asksOffers = readJson(ASKS_OFFERS);
  checkInitiativesLens(lens);
  checkInitiativeSurfaceContract(lens, generatedLens);
  const stats = checkAsksOffers(asksOffers, lens);
  checkGeneratedIndex();
  console.log(`  initiatives: ${entityArray(lens).length}`);
  console.log(`  asks/offers: ${stats.items} (${stats.asks} asks, ${stats.offers} offers)`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('INITIATIVES CHECKS PASS');
}

main();
