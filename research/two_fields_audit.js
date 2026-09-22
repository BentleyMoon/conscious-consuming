#!/usr/bin/env node
/* Decision contract audit.

   CQ's primaryAxis/tradeoff checks now also guard J2/J5's decision contract:
   signed differences reads, practical 1-3 axis mappings, honest budget-data
   posture, applicable answer archetypes, complete live-category coverage, and
   generated source/index parity.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const decisionPage = require('../app/decision.js');

const ROOT = path.resolve(__dirname, '..');
const DECISIONS_FILE = path.join(ROOT, 'content', 'decisions.json');
const INDEX_FILE = path.join(ROOT, 'app', 'data', 'index.json');
const PAGE_PILOTS = ['coffee', 'banking'];
const S8_COPY_CRITERIA = {
  'breakfast-cereal': ['low_sugar'],
  coffee: ['fair_trade', 'organic', 'rainforest_alliance'],
  razors: ['durability'],
  'learning-resources': ['educational'],
  'mobile-carriers': ['privacy'],
};
const S8_COPY_PILOTS = Object.keys(S8_COPY_CRITERIA);
const S8_COPY_PILOT_SET = new Set(S8_COPY_PILOTS);
const S8_CERTIFICATION_LIMIT_PILOTS = new Set(['coffee', 'dark-chocolate', 'tea']);
const S8_CERTIFICATION_KEYS = ['organic', 'fair_trade', 'rainforest_alliance'];
const ARCHETYPES = new Set(['best-for-most', 'strictest-match', 'budget-honest']);
const BUDGET_MODES = new Set(['none', 'observed-price-rank', 'assessed-fees-rank', 'assessed-affordability-rank']);
const BUDGET_CRITERIA = new Set(['economical', 'fees', 'price']);
const failures = [];

function rel(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, '/');
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    failures.push(`${rel(file)}: invalid JSON (${err.message})`);
    return null;
  }
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function isNonemptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function entityRows(dataset) {
  return dataset.products || dataset.resources || [];
}

function criterionStats(dataset, criterion) {
  const values = entityRows(dataset)
    .map((entity) => entity.scores && entity.scores[criterion])
    .filter(Number.isFinite);
  if (!values.length) return { known: 0, minimum: null, maximum: null, spread: null };
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return { known: values.length, minimum, maximum, spread: maximum - minimum };
}

function checkDataset(file, dataset, options = {}) {
  if (!dataset || !dataset.meta) return;
  const label = rel(file);
  const criteriaKeys = new Set((dataset.criteria || []).map((criterion) => criterion && criterion.key).filter(Boolean));
  const meta = dataset.meta || {};

  if (!isNonemptyString(meta.primaryAxis)) {
    failures.push(`${label}: meta.primaryAxis is required`);
  } else if (!criteriaKeys.has(meta.primaryAxis)) {
    failures.push(`${label}: meta.primaryAxis "${meta.primaryAxis}" is not declared in criteria`);
  }

  if (meta.tradeoff != null) {
    if (!Array.isArray(meta.tradeoff) || meta.tradeoff.length !== 2) {
      failures.push(`${label}: meta.tradeoff must be a two-item criterion-key array`);
    } else {
      for (const key of meta.tradeoff) {
        if (!criteriaKeys.has(key)) failures.push(`${label}: meta.tradeoff key ${key} not found in criteria`);
      }
    }

    if (!Array.isArray(meta.tradeoffLabels) || meta.tradeoffLabels.length !== 2) {
      failures.push(`${label}: meta.tradeoffLabels must be a two-item label array when tradeoff exists`);
    } else {
      for (const entry of meta.tradeoffLabels) {
        if (!isNonemptyString(entry)) failures.push(`${label}: meta.tradeoffLabels entries must be nonempty strings`);
      }
    }
  } else if (meta.tradeoffLabels != null) {
    failures.push(`${label}: meta.tradeoffLabels cannot appear without meta.tradeoff`);
  }

  if (options.generatedFood && criteriaKeys.has('economical') && !meta.tradeoff) {
    failures.push(`${label}: generated food with economical pricing should declare an honest price tradeoff`);
  }
}

function checkConsumer(consumer, label) {
  expect(consumer && typeof consumer === 'object', `${label}: missing consumer object`);
  if (!consumer || typeof consumer !== 'object') return;
  for (const key of ['reads', 'axes', 'budget', 'archetypes', 'page']) {
    expect(isNonemptyString(consumer[key]), `${label}.${key}: missing named consumer`);
    const round = key === 'page' ? 'Round 9' : 'Round 8';
    if (isNonemptyString(consumer[key])) expect(consumer[key].includes(round), `${label}.${key}: must name the ${round} consumer`);
  }
}

function checkDecision(decision, dataset, label, options = {}) {
  const category = dataset && dataset.meta && dataset.meta.id;
  const criteriaKeys = new Set((dataset && dataset.criteria || []).map((criterion) => criterion && criterion.key).filter(Boolean));
  const rows = entityRows(dataset || {});
  expect(decision && typeof decision === 'object', `${label}: missing decision object`);
  if (!decision || typeof decision !== 'object') return;
  expect(decision.category === category, `${label}.category: expected ${category}, found ${decision.category || '(missing)'}`);

  const limits = decision.evidenceLimits;
  if (S8_CERTIFICATION_LIMIT_PILOTS.has(category)) {
    const evidence = dataset.meta.certificationEvidence || {};
    expect(limits && limits.state === 'partial', `${label}.evidenceLimits: missing partial contract`);
    expect(limits && (limits.scoredCriteria || []).join('|') === S8_CERTIFICATION_KEYS.join('|'), `${label}.evidenceLimits.scoredCriteria: expected distinct certification criteria`);
    expect(limits && (limits.unscoredTopics || []).join('|') === 'packaging|farmer pay', `${label}.evidenceLimits.unscoredTopics: expected honest unscored topics`);
    expect(limits && limits.summary === 'Organic, fair-trade and Rainforest Alliance certification are scored when product label data exists.', `${label}.evidenceLimits.summary: unexpected copy`);
    expect(limits && limits.detail === 'Packaging and farmer pay are not scored. Missing certification labels remain unknown.', `${label}.evidenceLimits.detail: unexpected copy`);
    const receipt = limits && limits.receipt;
    expect(receipt && receipt.source === evidence.source && receipt.asOf === evidence.asOf, `${label}.evidenceLimits.receipt: source or date drifted`);
    expect(receipt && receipt.entryCount === rows.length, `${label}.evidenceLimits.receipt.entryCount: expected ${rows.length}`);
    expect(receipt && receipt.missingRule === evidence.missingRule, `${label}.evidenceLimits.receipt.missingRule: drifted`);
    for (const criterion of S8_CERTIFICATION_KEYS) {
      expect(receipt && receipt.criteria && JSON.stringify(receipt.criteria[criterion]) === JSON.stringify(evidence.criteria && evidence.criteria[criterion]), `${label}.evidenceLimits.receipt.criteria.${criterion}: drifted from dataset evidence`);
    }
  } else {
    expect(limits == null, `${label}.evidenceLimits: must remain absent outside the three certification pilots`);
  }

  const reads = decision.reads || {};
  const text = reads.text || '';
  expect(isNonemptyString(text), `${label}.reads.text: missing text`);
  expect(text.length <= 140, `${label}.reads.text: exceeds 140 characters (${text.length})`);
  expect(text.trim().endsWith('.'), `${label}.reads.text: should be one complete sentence`);
  expect(text.trim().split(/\s+/).length <= 24, `${label}.reads.text: exceeds the 24-word voice bar`);
  expect(!/[!—]/.test(text), `${label}.reads.text: avoid shouting or em dashes`);
  expect(!/\b(?:your values|how much (?:do )?you care|ethical(?:ly)?|perfect|obviously|simply)\b/i.test(text), `${label}.reads.text: identity-performance or overclaiming language`);
  expect(!/\b\d+[,.]?\d*\s+(?:products?|options?|items?)\b/i.test(text), `${label}.reads.text: bare warehouse count`);

  const basis = Array.isArray(reads.basis) ? reads.basis : [];
  expect(basis.length >= 2 && basis.length <= 5, `${label}.reads.basis: expected 2-5 derived criteria`);
  const basisKeys = new Set();
  for (const [index, item] of basis.entries()) {
    const at = `${label}.reads.basis[${index}]`;
    expect(item && typeof item === 'object', `${at}: must be an object`);
    if (!item || typeof item !== 'object') continue;
    expect(criteriaKeys.has(item.criterion), `${at}.criterion: ${item.criterion || '(missing)'} is not declared by ${category}`);
    expect(!basisKeys.has(item.criterion), `${at}.criterion: duplicate ${item.criterion}`);
    basisKeys.add(item.criterion);
    expect(isNonemptyString(item.readsAs), `${at}.readsAs: missing phrase`);
    if (isNonemptyString(item.readsAs)) expect(text.toLowerCase().includes(item.readsAs.toLowerCase()), `${at}.readsAs: "${item.readsAs}" is absent from the read`);
    const stats = criterionStats(dataset, item.criterion);
    expect(stats.known > 0, `${at}.criterion: ${item.criterion} has no populated scores`);
    expect(stats.spread > 0, `${at}.criterion: ${item.criterion} has no real spread`);
  }

  const signature = reads.signature || {};
  expect(signature.by === 'Conscious Consuming', `${label}.reads.signature.by: expected Conscious Consuming`);
  expect(/^\d{4}-\d{2}-\d{2}$/.test(String(signature.on || '')), `${label}.reads.signature.on: expected YYYY-MM-DD`);
  expect(signature.status === 'pilot' || signature.status === 'approved-batch', `${label}.reads.signature.status: expected pilot or approved batch`);

  const axes = Array.isArray(decision.axes) ? decision.axes : [];
  expect(axes.length >= 1 && axes.length <= 3, `${label}.axes: expected 1-3 practical axes`);
  const axisIds = new Set();
  for (const [index, axis] of axes.entries()) {
    const at = `${label}.axes[${index}]`;
    expect(axis && typeof axis === 'object', `${at}: must be an object`);
    if (!axis || typeof axis !== 'object') continue;
    expect(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(axis.id || '')), `${at}.id: invalid id`);
    expect(!axisIds.has(axis.id), `${at}.id: duplicate ${axis.id}`);
    axisIds.add(axis.id);
    expect(axis.kind === 'criterion' || axis.kind === 'tradeoff' || axis.kind === 'cost-values', `${at}.kind: expected criterion, tradeoff, or cost-values`);
    expect(isNonemptyString(axis.label), `${at}.label: missing label`);
    expect(isNonemptyString(axis.question) && axis.question.length <= 80, `${at}.question: missing or too long`);
    expect(!/\b(?:your values|how much (?:do )?you care|care about ethics)\b/i.test(String(axis.question || '')), `${at}.question: asks for identity performance`);
    const keys = Array.isArray(axis.criteria) ? axis.criteria : [];
    const rightKeyCount = axis.kind === 'tradeoff' ? keys.length === 2 : (axis.kind === 'cost-values' ? keys.length >= 2 : keys.length === 1);
    expect(rightKeyCount, `${at}.criteria: wrong number of criterion keys for ${axis.kind || 'axis'}`);
    expect(new Set(keys).size === keys.length, `${at}.criteria: duplicate criterion key`);
    for (const key of keys) {
      expect(criteriaKeys.has(key), `${at}.criteria: ${key} is not declared by ${category}`);
      expect(criterionStats(dataset, key).known > 0, `${at}.criteria: ${key} has no populated scores`);
      expect(criterionStats(dataset, key).spread > 0, `${at}.criteria: ${key} has no real spread`);
    }
    expect(Array.isArray(axis.poles) && axis.poles.length === 2 && axis.poles.every(isNonemptyString), `${at}.poles: expected two plain labels`);
    expect(Number.isInteger(axis.default) && axis.default >= 0 && axis.default <= 100, `${at}.default: expected 0-100 integer`);
  }

  if (Array.isArray(dataset.meta.tradeoff)) {
    const expectedTradeoff = dataset.meta.tradeoff.join('|');
    const tradeoffs = axes.filter((axis) => axis.kind === 'tradeoff').map((axis) => axis.criteria.join('|'));
    const costDefaultReplacesIt = decision.budget && decision.budget.available
      && dataset.meta.tradeoff.includes(decision.budget.criterion)
      && axes[0] && axes[0].kind === 'cost-values';
    expect(costDefaultReplacesIt || tradeoffs.includes(expectedTradeoff), `${label}.axes: must reuse existing meta.tradeoff ${expectedTradeoff}`);
  }

  const budget = decision.budget || {};
  expect(typeof budget.available === 'boolean', `${label}.budget.available: must be boolean`);
  expect(BUDGET_MODES.has(budget.mode), `${label}.budget.mode: unknown mode ${budget.mode || '(missing)'}`);
  const archetypes = Array.isArray(decision.archetypes) ? decision.archetypes : [];
  expect(archetypes.length >= 2 && archetypes.length <= 3, `${label}.archetypes: expected 2-3 slots`);
  expect(new Set(archetypes).size === archetypes.length, `${label}.archetypes: duplicate slot`);
  expect(archetypes.every((slot) => ARCHETYPES.has(slot)), `${label}.archetypes: unknown slot`);
  expect(archetypes.includes('best-for-most') && archetypes.includes('strictest-match'), `${label}.archetypes: missing required answer recipe`);

  const page = decision.page || {};
  expect(page.stage === 'approved-pilot' || page.stage === 'approved-batch', `${label}.page.stage: unknown stage`);
  expect(typeof page.primaryRoute === 'boolean', `${label}.page.primaryRoute: must be boolean`);
  expect(page.primaryRoute === true, `${label}.page.primaryRoute: Round 9 must promote ${category}`);
  if (PAGE_PILOTS.includes(category)) expect(page.stage === 'approved-pilot', `${label}.page.stage: primary pilot must preserve founder approval`);
  else expect(page.stage === 'approved-batch', `${label}.page.stage: batch category must record Round 9 approval`);

  if (budget.available) {
    expect(budget.mode !== 'none', `${label}.budget.mode: available budget cannot use none`);
    expect(BUDGET_CRITERIA.has(budget.criterion), `${label}.budget.criterion: expected a price/fee criterion`);
    expect(criteriaKeys.has(budget.criterion), `${label}.budget.criterion: ${budget.criterion || '(missing)'} is not declared`);
    const stats = criterionStats(dataset, budget.criterion);
    expect(Number.isInteger(budget.minimumKnown) && budget.minimumKnown >= 1, `${label}.budget.minimumKnown: expected positive integer`);
    expect(stats.known >= budget.minimumKnown, `${label}.budget: ${stats.known} known is below minimum ${budget.minimumKnown}`);
    expect(archetypes.includes('budget-honest'), `${label}.archetypes: budget data requires budget-honest`);
    const first = axes[0] || {};
    expect(first.id === 'cost-or-values' && first.kind === 'cost-values', `${label}.axes[0]: dependable cost evidence requires the S4 cost-or-values default`);
    if (S8_COPY_PILOT_SET.has(category)) {
      const expectedCostPole = budget.mode === 'observed-price-rank'
        ? 'Lower price'
        : (budget.mode === 'assessed-fees-rank' ? 'Lower fees' : 'Lower cost');
      expect(first.label !== 'Cost or values', `${label}.axes[0]: S8 pilot needs a named practical choice`);
      expect(first.question.endsWith('?'), `${label}.axes[0]: S8 pilot question must be complete`);
      expect(!/stronger values fit|better for people|cost or values/i.test(`${first.label} ${first.question} ${(first.poles || []).join(' ')}`), `${label}.axes[0]: S8 pilot retained generic values copy`);
      expect(Array.isArray(first.poles) && first.poles[0] === expectedCostPole, `${label}.axes[0]: S8 pilot cost pole must read ${expectedCostPole}`);
      expect(Array.isArray(first.poles) && first.poles[0] !== first.poles[1], `${label}.axes[0]: S8 pilot poles must name different choices`);
      expect((first.criteria || []).slice(1).join('|') === S8_COPY_CRITERIA[category].join('|'), `${label}.axes[0]: named choice must weight only ${S8_COPY_CRITERIA[category].join(', ')}`);
    } else {
      const expectedCostPole = budget.mode === 'observed-price-rank'
        ? 'Lower observed price'
        : (budget.mode === 'assessed-fees-rank' ? 'Lower fees' : 'Lower cost');
      const expectedCostLabel = budget.mode === 'observed-price-rank'
        ? 'Price'
        : (budget.mode === 'assessed-fees-rank' ? 'Fees' : 'Cost');
      expect(first.label === `${expectedCostLabel} or overall fit`, `${label}.axes[0]: signed batch needs the plain overall-fit label`);
      expect(first.question === `${expectedCostPole} or a stronger overall fit?`, `${label}.axes[0]: signed batch needs the plain cost question`);
      expect(Array.isArray(first.poles) && first.poles.join('|') === `${expectedCostPole}|Stronger overall fit`, `${label}.axes[0]: signed batch poles drifted`);
    }
    expect(first.default === 50 && first.criteria && first.criteria[0] === budget.criterion, `${label}.axes[0]: cost criterion must lead from a balanced default`);
    expect(first.criteria && first.criteria.length >= 2, `${label}.axes[0]: values side needs populated evidence`);
    const low = decisionPage.dialWeights(dataset.criteria, decision, { [first.id]: 0 });
    const middle = decisionPage.dialWeights(dataset.criteria, decision, { [first.id]: 50 });
    const high = decisionPage.dialWeights(dataset.criteria, decision, { [first.id]: 100 });
    expect(low[budget.criterion] > middle[budget.criterion] && middle[budget.criterion] > high[budget.criterion], `${label}.axes[0]: cost weight must fall as the range moves right`);
    for (const key of (first.criteria || []).slice(1)) {
      expect(low[key] < middle[key] && middle[key] < high[key], `${label}.axes[0]: ${key} weight must rise as the range moves right`);
    }
    if (budget.mode === 'observed-price-rank') expect(dataset.meta.priced === stats.known, `${label}.budget: observed price count must match meta.priced`);
    if (options.generated) {
      expect(budget.knownEntries === stats.known, `${label}.budget.knownEntries: expected ${stats.known}`);
      expect(budget.coverage === Number((stats.known / rows.length).toFixed(4)), `${label}.budget.coverage: derived coverage mismatch`);
    }
  } else {
    expect(budget.mode === 'none', `${label}.budget.mode: unavailable budget must use none`);
    expect(!archetypes.includes('budget-honest'), `${label}.archetypes: budget-honest cannot appear without budget data`);
    expect(!axes.some((axis) => axis.kind === 'cost-values'), `${label}.axes: unavailable cost data cannot expose a cost range`);
    if (options.generated) {
      expect(budget.knownEntries === 0 && budget.coverage === 0, `${label}.budget: unavailable budget receipt should be zero`);
    }
  }

  if (options.generated) {
    checkConsumer(decision.consumer, `${label}.consumer`);
    const receipt = reads.receipt || {};
    expect(receipt.dataset === category, `${label}.reads.receipt.dataset: expected ${category}`);
    expect(receipt.entryCount === rows.length, `${label}.reads.receipt.entryCount: expected ${rows.length}`);
    const receiptRows = Array.isArray(receipt.criteria) ? receipt.criteria : [];
    expect(receiptRows.length === basis.length, `${label}.reads.receipt.criteria: expected one spread per basis`);
    for (const item of basis) {
      const row = receiptRows.find((candidate) => candidate.criterion === item.criterion);
      const stats = criterionStats(dataset, item.criterion);
      expect(!!row, `${label}.reads.receipt.criteria: missing ${item.criterion}`);
      if (!row) continue;
      expect(row.readsAs === item.readsAs, `${label}.reads.receipt.${item.criterion}: readsAs mismatch`);
      for (const key of ['known', 'minimum', 'maximum', 'spread']) {
        expect(row[key] === stats[key], `${label}.reads.receipt.${item.criterion}.${key}: expected ${stats[key]}`);
      }
    }
  }
}

function checkLensSources() {
  const dir = path.join(ROOT, 'content', 'lenses');
  for (const name of fs.readdirSync(dir).filter((file) => file.endsWith('.json')).sort()) {
    const file = path.join(dir, name);
    checkDataset(file, readJson(file));
  }
}

function checkBuiltDatasets() {
  const index = readJson(INDEX_FILE);
  if (!index || !Array.isArray(index.categories)) return null;
  for (const category of index.categories) {
    const file = path.join(ROOT, 'app', 'data', category.file || `${category.id}.json`);
    const dataset = readJson(file);
    if (!dataset) continue;
    checkDataset(file, dataset, { generatedFood: dataset.meta && dataset.meta.source === 'Open Food Facts' });
  }
  return index;
}

function checkDecisionRegistry(index) {
  const registry = readJson(DECISIONS_FILE);
  if (!registry || !index) return;
  expect(registry.format === 'open-values-decision-contracts', 'content/decisions.json: wrong format');
  expect(/^0\.2\.0(?:[-+].*)?$/.test(String(registry.version || '')), 'content/decisions.json: version must be 0.2.0 semver');
  expect(/^\d{4}-\d{2}-\d{2}$/.test(String(registry.published || '')), 'content/decisions.json: published must be YYYY-MM-DD');
  expect(registry.status === 'founder-approved', 'content/decisions.json: post-checkpoint rounds require the founder-approved pilot');
  expect(registry.approval && /^\d{4}-\d{2}-\d{2}$/.test(String(registry.approval.on || '')), 'content/decisions.json: founder approval needs a date');
  expect(registry.approval && isNonemptyString(registry.approval.scope) && isNonemptyString(registry.approval.signal), 'content/decisions.json: founder approval needs scope and signal');
  const copyPilot = registry.copyPilot || {};
  expect(copyPilot.status === 'approved-batch', 'content/decisions.json.copyPilot: signed S8 samples must record batch approval');
  expect(/^\d{4}-\d{2}-\d{2}$/.test(String(copyPilot.on || '')), 'content/decisions.json.copyPilot.on: expected YYYY-MM-DD');
  expect(isNonemptyString(copyPilot.scope) && isNonemptyString(copyPilot.batchGate), 'content/decisions.json.copyPilot: scope and batch gate are required');
  expect(Array.isArray(copyPilot.categories) && copyPilot.categories.join('|') === S8_COPY_PILOTS.join('|'), 'content/decisions.json.copyPilot.categories: expected the five signed-order S8 samples');
  checkConsumer(registry.consumer, 'content/decisions.json.consumer');

  const contracts = Array.isArray(registry.contracts) ? registry.contracts : [];
  const categories = contracts.map((contract) => contract.category);
  const liveCategories = index.categories.map((category) => category.id);
  // 2026-08-14. Four serially promoted categories take the coverage ratchet to 122.
  // 124 on 2026-08-26: messaging and browsers authored their own contracts in the split.
  expect(contracts.length === 124, `content/decisions.json: expected 124 category contracts, found ${contracts.length}`);
  const categorySet = new Set(categories);
  expect(
    liveCategories.every((category) => categorySet.has(category)) && categories.every((category) => liveCategories.includes(category)),
    'content/decisions.json: contract coverage must exactly match the live category index'
  );
  expect(new Set(categories).size === categories.length, 'content/decisions.json: duplicate category contract');

  for (const sourceDecision of contracts) {
    const category = index.categories.find((candidate) => candidate.id === sourceDecision.category);
    expect(!!category, `content/decisions.json: unknown category ${sourceDecision.category}`);
    if (!category) continue;
    const datasetFile = path.join(ROOT, 'app', 'data', category.file);
    const dataset = readJson(datasetFile);
    if (!dataset) continue;
    checkDecision(sourceDecision, dataset, `content/decisions.json:${sourceDecision.category}`);
    checkDecision(dataset.meta.decision, dataset, `${rel(datasetFile)}:meta.decision`, { generated: true });
    expect(JSON.stringify(category.decision) === JSON.stringify(dataset.meta.decision), `app/data/index.json:${sourceDecision.category}.decision: must match generated dataset`);

    const generated = dataset.meta.decision || {};
    expect(generated.category === sourceDecision.category, `app/data/${sourceDecision.category}.json: generated category mismatch`);
    for (const key of ['axes', 'archetypes', 'page']) {
      expect(JSON.stringify(generated[key]) === JSON.stringify(sourceDecision[key]), `app/data/${sourceDecision.category}.json: generated ${key} drifted from source`);
    }
    expect(JSON.stringify(generated.reads && generated.reads.basis) === JSON.stringify(sourceDecision.reads.basis), `app/data/${sourceDecision.category}.json: generated read basis drifted from source`);
    expect(generated.reads && generated.reads.text === sourceDecision.reads.text, `app/data/${sourceDecision.category}.json: generated read text drifted from source`);
  }

  const stray = index.categories.filter((category) => category.decision && !categories.includes(category.id));
  expect(stray.length === 0, `app/data/index.json: unexpected decision contracts on ${stray.map((category) => category.id).join(', ')}`);

  console.log('Decision contract audit');
  const primaryRoutes = contracts.filter((contract) => contract.page && contract.page.primaryRoute).length;
  const budgetEligible = contracts.filter((contract) => contract.budget && contract.budget.available).length;
  const noPrice = contracts.length - budgetEligible;
  const basisRows = contracts.reduce((sum, contract) => sum + contract.reads.basis.length, 0);
  const axes = contracts.reduce((sum, contract) => sum + contract.axes.length, 0);
  console.log(`  category contracts: ${contracts.length}/${index.categories.length}`);
  console.log(`  evidence-backed read fields: ${basisRows}`);
  console.log(`  practical dials: ${axes}`);
  console.log(`  honest budget slots: ${budgetEligible}`);
  console.log(`  S4 cost-or-values defaults: ${budgetEligible}; plain no-price categories: ${noPrice}`);
  console.log(`  S8 practical-copy pilot: ${S8_COPY_PILOTS.length} signed samples; plain grammar applied to ${budgetEligible - S8_COPY_PILOTS.length} more cost-aware categories`);
  for (const category of S8_COPY_PILOTS) {
    const contract = contracts.find((candidate) => candidate.category === category);
    const axis = contract && contract.axes && contract.axes[0];
    console.log(`    ${category}: ${axis ? axis.question : 'missing'}`);
  }
  const batchRoutes = contracts.filter((contract) => contract.page && contract.page.stage === 'approved-batch').length;
  console.log(`  primary decision routes: ${primaryRoutes}; approved batch routes: ${batchRoutes}`);
}

checkLensSources();
const index = checkBuiltDatasets();
checkDecisionRegistry(index);

if (failures.length) {
  console.log('DECISION CONTRACT AUDIT FAILED');
  for (const failure of failures) console.log(`  FAIL ${failure}`);
  process.exit(1);
}

console.log('DECISION CONTRACT AUDIT PASS');
