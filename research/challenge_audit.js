#!/usr/bin/env node
/* C13 challenge audit: proves opposite-view fixtures and contrary tags remain
   replayable against the generated datasets, without touching app presentation. */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../app/engine.js');
const {
  OUT: CHALLENGE_INDEX,
  buildChallengeIndex,
  formatJson
} = require('../pipeline/build_challenge.js');
const {
  entityArray,
  rankEntities,
  buildTagMap,
  selectSteelmanTag,
  selectOppositeStrengthTag
} = require('./challenge_helpers.js');

const ROOT = path.resolve(__dirname, '..');
const CHALLENGE = path.join(ROOT, 'content', 'challenge', 'index.json');
const failures = [];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function dataFile(cid) {
  return path.join(ROOT, 'app', 'data', `${cid}.json`);
}

function loadCategory(cid) {
  const file = dataFile(cid);
  expect(fs.existsSync(file), `${cid}: missing generated dataset`);
  return fs.existsSync(file) ? readJson(file) : null;
}

function validSource(source, label) {
  expect(source && typeof source === 'object', `${label}: missing source object`);
  if (!source || typeof source !== 'object') return;
  expect(typeof source.note === 'string' && source.note.trim(), `${label}: missing source note`);
  expect(/^https?:\/\//.test(String(source.source || '')), `${label}: missing http(s) source`);
  expect(/^(19|20)\d{2}$/.test(String(source.asof || '')), `${label}: missing asof year`);
}

function checkReadSentence(value, label) {
  expect(typeof value === 'string' && value.trim(), `${label}: missing reads sentence`);
  if (typeof value !== 'string') return;
  expect(value.startsWith('The strongest case the other way: '), `${label}: must use fair-opponent framing`);
  expect(value.length <= 140, `${label}: reads sentence is too long`);
}

function sameSource(a, b) {
  return a && b
    && a.note === b.note
    && a.source === b.source
    && String(a.asof) === String(b.asof);
}

function checkGeneratedIndex() {
  expect(fs.existsSync(CHALLENGE_INDEX), 'challenge index: missing generated output app/data/challenge-index.json');
  if (!fs.existsSync(CHALLENGE_INDEX)) return;
  const expected = formatJson(buildChallengeIndex());
  const actual = fs.readFileSync(CHALLENGE_INDEX, 'utf8');
  expect(actual === expected, 'challenge index: generated output is stale; run node pipeline/build_challenge.js');
}

function checkTag(tag, categories) {
  const label = `tag ${tag && tag.id}`;
  expect(tag && typeof tag.id === 'string' && tag.id.trim(), `${label}: missing id`);
  expect(['steelman-weakness', 'opposite-view-strength'].includes(tag && tag.polarity), `${label}: bad polarity`);
  validSource(tag && tag.source, label);

  const lens = categories.get(tag.category) || loadCategory(tag.category);
  if (!lens) return null;
  categories.set(tag.category, lens);
  const entity = entityArray(lens).find(row => row.code === tag.entity);
  expect(!!entity, `${label}: unknown entity ${tag.entity}`);
  if (!entity) return null;
  const criterionKeys = new Set((lens.criteria || []).map(criterion => criterion.key));
  expect(criterionKeys.has(tag.axis), `${label}: unknown axis ${tag.axis}`);
  expect(entity.scores && entity.scores[tag.axis] === tag.score, `${label}: score does not match generated data`);
  const generatedSource = entity.provenance && entity.provenance[tag.axis];
  expect(generatedSource && typeof generatedSource === 'object', `${label}: generated provenance is not a citation object`);
  if (generatedSource && typeof generatedSource === 'object') {
    expect(sameSource(tag.source, generatedSource), `${label}: source does not match generated provenance`);
  }
  return { lens, entity };
}

function checkWeights(view, lens, label) {
  const criteria = new Set((lens.criteria || []).map(criterion => criterion.key));
  expect(view && typeof view.label === 'string' && view.label.trim(), `${label}: missing label`);
  expect(view && view.weights && typeof view.weights === 'object', `${label}: missing weights`);
  for (const [key, weight] of Object.entries((view && view.weights) || {})) {
    expect(criteria.has(key), `${label}.${key}: weight references unknown criterion`);
    expect(Number.isFinite(weight) && weight >= 0 && weight <= 5, `${label}.${key}: weight must be 0..5`);
  }
}

function checkCase(test, categories, tags) {
  const label = `case ${test && test.id}`;
  expect(test && /^[a-z0-9-]+$/.test(String(test.id || '')), `${label}: invalid id`);
  checkReadSentence(test && test.reads, `${label}.reads`);
  const lens = categories.get(test.category) || loadCategory(test.category);
  if (!lens) return;
  categories.set(test.category, lens);
  checkWeights(test.userView, lens, `${label}.userView`);
  checkWeights(test.oppositeView, lens, `${label}.oppositeView`);

  const userRank = rankEntities(lens, test.userView.weights, engine);
  const oppositeRank = rankEntities(lens, test.oppositeView.weights, engine);
  expect(userRank.length > 0, `${label}: user view produced no ranking`);
  expect(oppositeRank.length > 0, `${label}: opposite view produced no ranking`);
  if (userRank[0]) expect(userRank[0].entity.code === test.userView.expectedTop, `${label}: user expectedTop ${test.userView.expectedTop} but got ${userRank[0].entity.code}`);
  if (oppositeRank[0]) expect(oppositeRank[0].entity.code === test.oppositeView.expectedTop, `${label}: opposite expectedTop ${test.oppositeView.expectedTop} but got ${oppositeRank[0].entity.code}`);
  expect(test.userView.expectedTop !== test.oppositeView.expectedTop, `${label}: challenge must expose a different opposite top`);

  const steelman = test.steelman || {};
  expect(steelman.forEntity === test.userView.expectedTop, `${label}: steelman should target the user-view top pick`);
  expect(typeof steelman.framing === 'string' && steelman.framing.length >= 40, `${label}: steelman framing is too thin`);
  expect(!/gotcha|hypocrit|obvious|silly|just\s/i.test(String(steelman.framing || '')), `${label}: steelman framing sounds dismissive`);
  const steelTag = tags.get(steelman.sourceTag);
  expect(!!steelTag, `${label}: missing steelman source tag ${steelman.sourceTag}`);
  if (steelTag) {
    expect(steelTag.category === test.category, `${label}: steelman tag category mismatch`);
    expect(steelTag.entity === steelman.forEntity, `${label}: steelman tag entity mismatch`);
    expect(steelTag.axis === steelman.axis, `${label}: steelman tag axis mismatch`);
    expect(steelTag.polarity === 'steelman-weakness', `${label}: steelman tag has wrong polarity`);
    expect((test.userView.weights[steelman.axis] || 0) <= 2, `${label}: steelman axis should be de-emphasized in the user view`);
  }
  const selectedSteelman = selectSteelmanTag(test, tags);
  expect(!!selectedSteelman, `${label}: no selectable steelman tag for user-view top`);
  if (selectedSteelman) {
    expect(selectedSteelman.id === steelman.sourceTag, `${label}: steelman should choose ${selectedSteelman.id}, got ${steelman.sourceTag}`);
  }

  const oppositeTag = tags.get(test.oppositeView.sourceTag);
  expect(!!oppositeTag, `${label}: missing opposite-view source tag ${test.oppositeView.sourceTag}`);
  if (oppositeTag) {
    expect(oppositeTag.category === test.category, `${label}: opposite tag category mismatch`);
    expect(oppositeTag.entity === test.oppositeView.expectedTop, `${label}: opposite tag should support the opposite top`);
    expect(oppositeTag.polarity === 'opposite-view-strength', `${label}: opposite tag has wrong polarity`);
  }
  const selectedOpposite = selectOppositeStrengthTag(test, tags);
  expect(!!selectedOpposite, `${label}: no selectable opposite-view strength tag`);
  if (selectedOpposite) {
    expect(selectedOpposite.id === test.oppositeView.sourceTag, `${label}: opposite view should choose ${selectedOpposite.id}, got ${test.oppositeView.sourceTag}`);
    validSource(selectedOpposite.source, `${label}.oppositeReceipt`);
  }

  return { userTop: userRank[0] && userRank[0].entity.code, oppositeTop: oppositeRank[0] && oppositeRank[0].entity.code };
}

function main() {
  console.log('Challenge audit');
  const data = readJson(CHALLENGE);
  expect(data.format === 'open-values-challenge-set', 'challenge set: wrong format');
  expect(data.version === '0.1.0', 'challenge set: wrong version');
  expect(data.standard === 'open-values-standard', 'challenge set: wrong standard');
  expect(Array.isArray(data.principles) && data.principles.length >= 3, 'challenge set: missing principles');
  expect(Array.isArray(data.algorithms) && data.algorithms.length >= 2, 'challenge set: missing algorithms');
  expect(Array.isArray(data.instances) && data.instances.some(instance => instance.id === 'kosplora' && instance.challengeDefault === 'prominent'), 'challenge set: Kosplora challenge config missing');
  expect(Array.isArray(data.instances) && data.instances.some(instance => instance.id === 'socrates-colosseum' && instance.status === 'format-seed'), 'challenge set: Socrates format seed missing');
  expect(Array.isArray(data.cases) && data.cases.length >= 4, 'challenge set: too few challenge cases');
  expect(Array.isArray(data.contraryTags) && data.contraryTags.length >= 8, 'challenge set: too few contrary tags');

  const categories = new Map();
  const tags = buildTagMap(data.contraryTags || []);
  for (const tag of data.contraryTags || []) {
    if ((data.contraryTags || []).filter(candidate => candidate.id === tag.id).length > 1) failures.push(`tag ${tag.id}: duplicate id`);
    checkTag(tag, categories);
  }

  const seenCases = new Set();
  const results = [];
  for (const test of data.cases || []) {
    if (seenCases.has(test.id)) failures.push(`case ${test.id}: duplicate id`);
    seenCases.add(test.id);
    const result = checkCase(test, categories, tags);
    if (result) results.push({ id: test.id, ...result });
  }

  const categoriesCovered = new Set((data.cases || []).map(test => test.category));
  expect(categoriesCovered.size >= 4, 'challenge set: should cover at least four categories');
  expect((data.algorithms || []).some(algorithm => algorithm.id === 'opposite-view'), 'challenge set: missing opposite-view algorithm');
  expect((data.algorithms || []).some(algorithm => algorithm.id === 'steelman'), 'challenge set: missing steelman algorithm');

  for (const result of results) {
    console.log(`  ${result.id}: ${result.userTop} -> opposite ${result.oppositeTop}`);
  }
  console.log(`  cases: ${(data.cases || []).length}`);
  console.log(`  contrary tags: ${(data.contraryTags || []).length}`);
  console.log(`  categories: ${categoriesCovered.size}`);
  checkGeneratedIndex();

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('CHALLENGE CHECKS PASS');
}

main();
