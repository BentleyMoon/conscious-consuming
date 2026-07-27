#!/usr/bin/env node
/* Round 9 category-wide decision-page rollout preflight.

   Proves the machine-testable rollout boundary for every live category:
   the shared route is primary, zero setup computes every eligible recipe,
   practical ranges never ask for a value identity, every visible number has
   an explicit job, and floor matches remain available in a show-anyway fold.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../app/engine.js');

const ROOT = path.resolve(__dirname, '..');
const PAGE_PILOTS = new Set(['coffee', 'banking']);
const CATEGORY_ASSIGNMENT_GUARDS = {
  'spices-seasoning': {
    minimumEntries: 50,
    name: /\b(?:spices?|seasonings?|assaisonn\w*|herbs?|herbes?|salt|sel|salz|sale|sal|pepper|poivre|pfeffer|pimienta|garlic|ail|ajo|knoblauch|paprika|curry|cumin|coriand\w*|oregano|origan|thyme|thym|rosemary|romarin|basil\w*|parsley|persil|cinnamon|cannelle|canela|zimt|turmeric|curcuma|ginger|gingembre|nutmeg|muscade|cloves?|girofle|vanilla|vanille|chilli?|piment|cayenne|saffron|safran|tarragon|estragon|anise?|anis|cardamom\w*|fenugreek|fennel|fenouil|dill|aneth|herbamare)\b/i,
  },
  'fruit-jam': {
    minimumEntries: 200,
    name: /\b(?:jams?|confiture|marmalade|marmellata|doce|fruit\s+spread|preserves?)\b/i,
  },
  honey: {
    minimumEntries: 300,
    name: /\b(?:honey|miel|honig|miele|mel|miod|med|mez)\b/i,
  },
  'pasta-sauce': {
    minimumEntries: 250,
    reject: /\b(?:oats?|avoine|avena|hafer)\b/i,
  },
  'fruit-juice': {
    minimumEntries: 200,
    reject: /\b(?:soy|soya|soja)\b/i,
  },
  butter: {
    minimumEntries: 100,
    reject: /\b(?:peanuts?|arachid\w*|amendoim|erdnuss\w*)\b/i,
  },
  'cereal-bars': {
    minimumEntries: 250,
    reject: /^(?:flocons?\s+d[' ]avoine|corn\s+flakes?(?:\s+bio)?|muesli\s+fruits\s+et\s+noixraisins,\s*noisettes,\s*noix\s+de\s+coco|muesli\s+croustillant\s+chocolat)$/i,
  },
  'dried-fruit': {
    minimumEntries: 200,
    reject: /^(?!.*\b(?:dates?|fruits?|raisins?|cranberr\w*|goji|coco)\b).*\b(?:peanuts?|arachid\w*|amendoim|erdnuss\w*)\b/i,
  },
};
const CERTIFICATION_PILOTS = {
  coffee: { entries: 291, known: 225, organic: 41, fair_trade: 27, rainforest_alliance: 39 },
  'dark-chocolate': { entries: 391, known: 364, organic: 140, fair_trade: 129, rainforest_alliance: 47 },
  tea: { entries: 344, known: 271, organic: 101, fair_trade: 37, rainforest_alliance: 59 },
};
const CERTIFICATION_KEYS = ['organic', 'fair_trade', 'rainforest_alliance'];
const CERTIFICATION_TAGS = {
  organic: ['en:eu-organic', 'en:organic', 'en:soil-association-organic', 'en:usda-organic'],
  fair_trade: ['en:fair-for-life', 'en:fair-trade', 'en:fairtrade', 'en:fairtrade-cocoa', 'en:fairtrade-international'],
  rainforest_alliance: ['en:rainforest-alliance', 'en:rainforest-alliance-black-tea', 'en:rainforest-alliance-cocoa', 'en:rainforest-alliance-coffee', 'en:rainforest-alliance-tea'],
};
const failures = [];

function read(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch (error) {
    failures.push(`${rel}: cannot read (${error.message})`);
    return '';
  }
}

function json(rel) {
  try {
    return JSON.parse(read(rel));
  } catch (error) {
    failures.push(`${rel}: invalid JSON (${error.message})`);
    return null;
  }
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function categoryText(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function certificationScoringContractChecks(contract) {
  expect(contract && contract.status === 'h20-app-owned-certification-scoring-parity', 'certificationScoringContract: missing H20 parity contract');
  if (!contract) return 0;
  expect(/app\/app\.js offScore/.test(String(contract.consumer || '')) && /app\/engine\.js/.test(String(contract.consumer || '')), 'certificationScoringContract: consumer must name both browser scoring surfaces');
  expect((contract.categories || []).join('|') === 'coffee|dark-chocolate|tea', 'certificationScoringContract: split must stay bounded to three pilots');
  expect(contract.unknownScore === null, 'certificationScoringContract: missing labels must score unknown');
  expect(/unknown \(null\).*absent \(0\)/i.test(String(contract.missingRule || '')), 'certificationScoringContract: missingness rule drifted');
  expect(/count once.*two-field/i.test(String(contract.admissionRule || '')), 'certificationScoringContract: one-field admission rule is missing');
  expect(/outside coffee, dark-chocolate, and tea retain the collapsed ethics score/i.test(String(contract.legacyRule || '')), 'certificationScoringContract: legacy boundary is missing');
  expect(contract.h20DrainableFromDataAlone === false, 'certificationScoringContract: data alone must not drain H20');

  const rows = contract.criteria || [];
  expect(rows.map((row) => row.key).join('|') === CERTIFICATION_KEYS.join('|'), 'certificationScoringContract: criterion order or coverage drifted');
  for (const row of rows) {
    expect((row.acceptedTags || []).join('|') === CERTIFICATION_TAGS[row.key].join('|'), `certificationScoringContract:${row.key}: accepted tags drifted`);
    expect(row.scoreWhenMatched === 100 && row.scoreWhenLabelsPresentWithoutMatch === 0, `certificationScoringContract:${row.key}: binary score contract drifted`);
  }

  const fixtures = contract.fixtures || [];
  const byId = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const expected = {
    'labels-missing': [[], { organic: null, fair_trade: null, rainforest_alliance: null }, 0],
    'label-present-unmatched': [['en:vegan'], { organic: 0, fair_trade: 0, rainforest_alliance: 0 }, 1],
    'organic-variant': [['en:soil-association-organic'], { organic: 100, fair_trade: 0, rainforest_alliance: 0 }, 1],
    'fair-trade-variant': [['en:fair-for-life'], { organic: 0, fair_trade: 100, rainforest_alliance: 0 }, 1],
    'rainforest-alliance-variant': [['en:rainforest-alliance-tea'], { organic: 0, fair_trade: 0, rainforest_alliance: 100 }, 1],
    'combined-certifications': [['en:eu-organic', 'en:fairtrade-cocoa', 'en:rainforest-alliance-cocoa'], { organic: 100, fair_trade: 100, rainforest_alliance: 100 }, 1],
  };
  expect(fixtures.length === Object.keys(expected).length, `certificationScoringContract: expected ${Object.keys(expected).length} parity fixtures, found ${fixtures.length}`);
  for (const [id, [labels, scores, contribution]] of Object.entries(expected)) {
    const fixture = byId.get(id);
    expect(fixture && JSON.stringify(fixture.labels) === JSON.stringify(labels), `certificationScoringContract:${id}: labels drifted`);
    expect(fixture && JSON.stringify(fixture.expectedScores) === JSON.stringify(scores), `certificationScoringContract:${id}: expected scores drifted`);
    expect(fixture && fixture.knownFieldContribution === contribution, `certificationScoringContract:${id}: roster contribution drifted`);
  }
  return fixtures.length;
}

function certificationChecks(category, dataset) {
  const expected = CERTIFICATION_PILOTS[category];
  if (!expected) return false;
  const declared = new Set((dataset.criteria || []).map((criterion) => criterion.key));
  expect(!declared.has('ethics'), `${category}: collapsed ethics criterion must be absent from the S8 pilot`);
  for (const key of CERTIFICATION_KEYS) expect(declared.has(key), `${category}: missing distinct ${key} criterion`);
  expect(dataset.key2theme && dataset.key2theme.fair_trade === 'people', `${category}: fair_trade needs a dataset-local people mapping`);
  expect(dataset.key2theme && dataset.key2theme.rainforest_alliance === 'planet', `${category}: rainforest_alliance needs a dataset-local planet mapping`);

  const evidence = dataset.meta && dataset.meta.certificationEvidence;
  expect(evidence && evidence.source === 'Open Food Facts labels', `${category}: certification evidence source is missing`);
  expect(evidence && /^20\d{2}$/.test(String(evidence.asOf || '')), `${category}: certification evidence asOf is missing`);
  expect(evidence && evidence.entryCount === expected.entries, `${category}: certification receipt entry count drifted`);
  expect(evidence && /unknown \(null\).*absent \(0\)/i.test(String(evidence.missingRule || '')), `${category}: certification missingness rule is not explicit`);

  const products = dataset.products || [];
  expect(products.length === expected.entries, `${category}: expected ${expected.entries} pilot entries, found ${products.length}`);
  for (const key of CERTIFICATION_KEYS) {
    const known = products.filter((product) => Number.isFinite(product.scores && product.scores[key]));
    const positive = known.filter((product) => product.scores[key] === 100);
    const receipt = evidence && evidence.criteria && evidence.criteria[key];
    expect(known.every((product) => product.scores[key] === 0 || product.scores[key] === 100), `${category}:${key}: certification scores must be binary when known`);
    expect(known.length === expected.known, `${category}:${key}: expected ${expected.known} known labels, found ${known.length}`);
    expect(positive.length === expected[key], `${category}:${key}: expected ${expected[key]} positive labels, found ${positive.length}`);
    expect(receipt && receipt.known === known.length && receipt.positive === positive.length, `${category}:${key}: coverage receipt does not match products`);
    for (const product of known) {
      const provenance = product.provenance && product.provenance[key];
      expect(provenance && /^https:\/\/world\.openfoodfacts\.org\/product\//.test(String(provenance.source || '')), `${category}:${product.code}:${key}: sourced provenance missing`);
      expect(provenance && provenance.asof === evidence.asOf, `${category}:${product.code}:${key}: provenance date does not match the category receipt`);
    }
  }
  for (const product of products) {
    const states = CERTIFICATION_KEYS.map((key) => product.scores && product.scores[key]);
    expect(states.every((value) => value == null) || states.every(Number.isFinite), `${category}:${product.code}: label unknownness must apply to all certification criteria together`);
  }
  const contractKeys = [
    ...((dataset.meta.decision.reads && dataset.meta.decision.reads.basis) || []).map((row) => row.criterion),
    ...(dataset.meta.decision.axes || []).flatMap((axis) => axis.criteria || []),
  ];
  expect(!contractKeys.includes('ethics'), `${category}: decision contract still consumes collapsed ethics`);
  for (const key of CERTIFICATION_KEYS) expect(contractKeys.includes(key), `${category}: decision contract does not consume ${key}`);

  const limits = dataset.meta.decision.evidenceLimits;
  expect(limits && limits.state === 'partial', `${category}: partial evidence-limits contract is missing`);
  expect(limits && (limits.scoredCriteria || []).join('|') === CERTIFICATION_KEYS.join('|'), `${category}: evidence limits must name the three scored certification criteria`);
  expect(limits && (limits.unscoredTopics || []).join('|') === 'packaging|farmer pay', `${category}: evidence limits must keep packaging and farmer pay unscored`);
  expect(limits && /scored when product label data exists/i.test(String(limits.summary || '')), `${category}: evidence summary must bound certification scoring to label data`);
  expect(limits && /not scored/i.test(String(limits.detail || '')) && /remain unknown/i.test(String(limits.detail || '')), `${category}: evidence detail must name both unscored topics and unknown labels`);
  const limitReceipt = limits && limits.receipt;
  expect(limitReceipt && limitReceipt.source === evidence.source && limitReceipt.asOf === evidence.asOf, `${category}: evidence-limit source receipt drifted`);
  expect(limitReceipt && limitReceipt.entryCount === products.length, `${category}: evidence-limit entry receipt drifted`);
  expect(limitReceipt && limitReceipt.missingRule === evidence.missingRule, `${category}: evidence-limit missingness receipt drifted`);
  for (const key of CERTIFICATION_KEYS) {
    expect(limitReceipt && limitReceipt.criteria && JSON.stringify(limitReceipt.criteria[key]) === JSON.stringify(evidence.criteria[key]), `${category}:${key}: evidence-limit coverage receipt drifted`);
  }
  return true;
}

function floorMatches(product, rule, category) {
  if (!product || !rule || !(rule.scope && rule.scope.categories || []).includes(category)) return false;
  const match = rule.match || {};
  if (match.type !== 'criterion-band' || !match.criterion) return false;
  const value = product.scores && product.scores[match.criterion];
  const maximum = Number(match.maximumExclusive);
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || value >= maximum) return false;
  const receipt = product.provenance && product.provenance[match.criterion];
  if (match.requiresSource && !(receipt && typeof receipt === 'object' && /^https?:\/\//.test(String(receipt.source || '')))) return false;
  if (match.requiresAsOf && !(receipt && typeof receipt === 'object' && String(receipt.asof || '').trim())) return false;
  return true;
}

function candidatePool(dataset, floor) {
  const rules = (floor.rules || []).filter((rule) => (rule.scope && rule.scope.categories || []).includes(dataset.meta.id));
  const entries = [];
  const folded = [];
  for (const product of dataset.products || []) {
    (rules.some((rule) => floorMatches(product, rule, dataset.meta.id)) ? folded : entries).push(product);
  }
  return { entries, folded, rules };
}

function dialWeights(dataset, values = {}) {
  const contributions = {};
  for (const criterion of dataset.criteria || []) contributions[criterion.key] = [];
  for (const axis of dataset.meta.decision.axes || []) {
    const value = values[axis.id] == null ? axis.default : values[axis.id];
    if (axis.kind === 'cost-values') {
      contributions[axis.criteria[0]].push(1 + 4 * (1 - value / 100));
      for (const key of axis.criteria.slice(1)) contributions[key].push(1 + 4 * (value / 100));
    } else if (axis.kind === 'tradeoff') {
      contributions[axis.criteria[0]].push(1 + 4 * (1 - value / 100));
      contributions[axis.criteria[1]].push(1 + 4 * (value / 100));
    } else contributions[axis.criteria[0]].push(1 + 4 * (value / 100));
  }
  const out = {};
  for (const [key, rows] of Object.entries(contributions)) out[key] = rows.length ? rows.reduce((sum, item) => sum + item, 0) / rows.length : 0;
  for (const key of Object.keys(out)) out[key] = Math.round(out[key] * 10) / 10;
  return out;
}

function budgetWeights(dataset, dial) {
  const out = {};
  for (const criterion of dataset.criteria || []) out[criterion.key] = 0;
  for (const key of Object.keys(dial)) if (dial[key] > 0) out[key] = Math.min(2, dial[key]);
  out[dataset.meta.decision.budget.criterion] = 5;
  return out;
}

function ranked(dataset, entries, weights) {
  const tieWeights = engine.themeDefaults(dataset.criteria);
  return entries.map((product) => ({
    product,
    score: engine.score(product, { criteria: dataset.criteria, weights, excludes: new Set() }),
    tie: engine.score(product, { criteria: dataset.criteria, weights: tieWeights, excludes: new Set() }),
  })).filter((row) => row.score).sort((a, b) =>
    b.score.score - a.score.score
    || ((b.tie && b.tie.score) || 0) - ((a.tie && a.tie.score) || 0)
    || a.product.name.localeCompare(b.product.name)
  );
}

function strictMetric(dataset, product) {
  const keys = [...new Set((dataset.meta.decision.reads.basis || []).map((item) => item.criterion).filter(Boolean))];
  const values = keys.map((key) => product.scores && product.scores[key]);
  return values.length && values.every(Number.isFinite) ? Math.min(...values) : -1;
}

function recipes(dataset, entries) {
  const contract = dataset.meta.decision;
  const weights = dialWeights(dataset);
  const primary = ranked(dataset, entries, weights);
  const result = [];
  if (contract.archetypes.includes('best-for-most') && primary[0]) result.push({ id: 'best-for-most', product: primary[0].product });
  if (contract.archetypes.includes('strictest-match') && primary.length) {
    const strict = primary.slice().sort((a, b) =>
      strictMetric(dataset, b.product) - strictMetric(dataset, a.product)
      || b.score.score - a.score.score
    )[0];
    if (strict) result.push({ id: 'strictest-match', product: strict.product });
  }
  if (contract.archetypes.includes('budget-honest') && contract.budget.available) {
    const known = entries.filter((product) => Number.isFinite(product.scores && product.scores[contract.budget.criterion]));
    const budget = ranked(dataset, known, budgetWeights(dataset, weights));
    if (budget[0]) result.push({ id: 'budget-honest', product: budget[0].product });
  }
  return result;
}

function appChecks() {
  const app = read('app/app.js');
  const shared = read('app/decision.js');
  const styles = read('app/styles.css');
  const start = app.indexOf('// J4 / Round 4. The signed decision contract is the only category configuration here.');
  const end = app.indexOf('function renderLegacyDecide(cid,facet)', start);
  const surface = start >= 0 && end > start ? app.slice(start, end) : '';

  for (const cue of [
    'function decisionPrimaryCategory(cid)',
    'decision.page.primaryRoute',
    "if(cid&&decisionPrimaryCategory(cid)){location.hash=decideHref(cid,facet);return;}",
    "else if(view==='rank')",
    'listHref=rankingHref(cid,query)',
    'return renderContractDecision(cid,facet,contract)',
  ]) expect(app.includes(cue), `app/app.js: missing category-wide route cue ${cue}`);

  expect(surface.length > 0, 'app/app.js: shared decision surface marker is missing');
  expect(!/how much (?:do )?you care|care about ethics|value slider/i.test(surface), 'app/app.js: shared decision surface asks for identity performance');
  expect(surface.includes('contract.axes') && app.includes('CC.decisionPage.dialHTML(axis,value'), 'app/app.js: practical ranges must come only from signed contract axes through the shared component');
  expect(shared.includes('data-decision-axis') && shared.includes("if(Number(value)===50)return 'Balanced'"), 'app/decision.js: dial output must explain position instead of showing an orphan number');
  expect(surface.includes('function decisionBudgetNote') && surface.includes('entries.'), 'app/app.js: budget counts must name what they count');
  expect(surface.includes('No price evidence here yet. This ranking uses the other measures available.'), 'app/app.js: categories without price evidence need the plain S4 message');
  expect(shared.includes('value} &times; ${weight}') && shared.includes('Weighted result: <b>${recipe.score.score}/100</b>'), 'app/decision.js: math numbers must name score, weight, and scale');
  expect(app.includes('CC.decisionPage.recipes') && app.includes('CC.decisionPage.answerCardHTML'), 'app/app.js: category pages must consume the shared recipe and answer renderers');
  expect(!surface.includes('DATA.meta.n'), 'app/app.js: decision header must not expose a warehouse count');

  const foldStart = surface.indexOf('function decisionPopulateFloorFold');
  const foldEnd = surface.indexOf('function decisionPersonalFoldHTML', foldStart);
  const foldPopulation = foldStart >= 0 && foldEnd > foldStart ? surface.slice(foldStart, foldEnd) : '';
  expect(surface.includes('They remain in the show-anyway section below.') || surface.includes("'They remain'"), 'app/app.js: floor context must promise a show-anyway fold');
  expect(surface.includes('function decisionFloorFoldHTML') && surface.includes('not erased'), 'app/app.js: floor fold must explicitly preserve hidden options');
  expect(foldPopulation.includes('for(const row of ranked)') && !foldPopulation.includes('.slice('), 'app/app.js: show-anyway population must render every floor-folded option');

  for (const cue of [
    '.decision-answer-grid',
    '.decision-floor-fold>summary',
    '.decision-personal-fold>summary',
    '.decision-dial-control input[type=range]',
    '@media(max-width:760px)',
    '@media(max-width:600px)',
  ]) expect(styles.includes(cue), `app/styles.css: missing responsive rollout cue ${cue}`);
}

function main() {
  const registry = json('content/decisions.json');
  const index = json('app/data/index.json');
  const lineRegistry = json('content/lines.json');
  const floor = lineRegistry && (lineRegistry.sets || []).find((set) => set.tier === 'floor' && set.defaultOn);
  expect(!!registry, 'content/decisions.json: registry missing');
  expect(!!index && Array.isArray(index.categories), 'app/data/index.json: category index missing');
  expect(!!floor, 'content/lines.json: default-on shared floor missing');
  if (!registry || !index || !floor) return finish({});

  const live = index.categories.map((category) => category.id);
  const contracts = registry.contracts || [];
  expect(live.length === 88, `app/data/index.json: expected 88 live categories, found ${live.length}`);
  expect(contracts.map((contract) => contract.category).join('|') === live.join('|'), 'content/decisions.json: rollout coverage must exactly match the live category index');
  expect(/Round 9/i.test(String(registry.consumer && registry.consumer.page || '')), 'content/decisions.json: page consumer must name Round 9');
  const certificationParityFixtures = certificationScoringContractChecks(index.certificationScoringContract);

  const receipt = {
    categories: 0,
    pilotRoutes: 0,
    batchRoutes: 0,
    zeroSetupRecipes: 0,
    answerCards: 0,
    budgetSlots: 0,
    floorFolded: 0,
    categoriesWithFolds: 0,
    categoryAssignmentPaths: 0,
    certificationPilots: 0,
    certificationParityFixtures,
  };

  for (const category of index.categories) {
    const dataset = json(`app/data/${category.file}`);
    if (!dataset || !dataset.meta || !dataset.meta.decision) {
      failures.push(`${category.id}: generated decision contract missing`);
      continue;
    }
    const contract = dataset.meta.decision;
    receipt.categories += 1;
    if (certificationChecks(category.id, dataset)) receipt.certificationPilots += 1;
    expect(contract.category === category.id, `${category.id}: generated contract category mismatch`);
    if (!CERTIFICATION_PILOTS[category.id]) expect(contract.evidenceLimits == null, `${category.id}: evidence limits escaped the three S8 certification pilots`);
    expect(contract.page && contract.page.primaryRoute === true, `${category.id}: #explore must promote to the shared decision route`);
    const expectedStage = PAGE_PILOTS.has(category.id) ? 'approved-pilot' : 'approved-batch';
    expect(contract.page && contract.page.stage === expectedStage, `${category.id}: expected ${expectedStage} page stage`);
    if (expectedStage === 'approved-pilot') receipt.pilotRoutes += 1;
    else receipt.batchRoutes += 1;

    for (const axis of contract.axes || []) {
      expect(!/how much (?:do )?you care|care about ethics|your values|ethical(?:ly)?/i.test(String(axis.question || '')), `${category.id}:${axis.id}: range asks for identity performance`);
      expect((axis.criteria || []).every((criterion) => (dataset.criteria || []).some((declared) => declared.key === criterion)), `${category.id}:${axis.id}: range uses an undeclared criterion`);
    }
    expect(!/\b\d+[,.]?\d*\s+(?:products?|options?|items?)\b/i.test(String(contract.reads && contract.reads.text || '')), `${category.id}: differences read contains a warehouse count`);

    const pool = candidatePool(dataset, floor);
    expect(pool.entries.length + pool.folded.length === (dataset.products || []).length, `${category.id}: floor partition loses or duplicates options`);
    expect(pool.entries.length > 0, `${category.id}: zero setup leaves no eligible options`);
    receipt.floorFolded += pool.folded.length;
    if (pool.folded.length) receipt.categoriesWithFolds += 1;

    const assignmentGuard = CATEGORY_ASSIGNMENT_GUARDS[category.id];
    if (assignmentGuard) {
      expect((dataset.products || []).length >= assignmentGuard.minimumEntries, `${category.id}: category guard left fewer than ${assignmentGuard.minimumEntries} useful entries`);
      const postures = [
        ['balanced', {}],
        ['cost end', Object.fromEntries((contract.axes || []).map((axis) => [axis.id, 0]))],
        ['values end', Object.fromEntries((contract.axes || []).map((axis) => [axis.id, 100]))],
      ];
      for (const [posture, values] of postures) {
        const top = ranked(dataset, pool.entries, dialWeights(dataset, values)).slice(0, 10);
        expect(top.length === 10, `${category.id}: ${posture} category-assignment receipt needs ten ranked entries`);
        for (const row of top) {
          const name = categoryText(row.product.name);
          if (assignmentGuard.name) {
            expect(assignmentGuard.name.test(name), `${category.id}: ${posture} top ten contains an entry not placed here by its own name: ${row.product.name}`);
          }
          if (assignmentGuard.reject) {
            expect(!assignmentGuard.reject.test(name), `${category.id}: ${posture} top ten still contains the measured sibling-category identity: ${row.product.name}`);
          }
        }
        receipt.categoryAssignmentPaths += 1;
      }
    }

    const defaults = recipes(dataset, pool.entries);
    expect(defaults.length === (contract.archetypes || []).length, `${category.id}: zero setup computed ${defaults.length}/${(contract.archetypes || []).length} eligible recipes`);
    for (const slot of contract.archetypes || []) expect(defaults.some((answer) => answer.id === slot), `${category.id}: zero setup missing ${slot}`);
    const cards = new Set(defaults.map((answer) => answer.product.code));
    receipt.zeroSetupRecipes += defaults.length;
    receipt.answerCards += cards.size;
    if (contract.budget && contract.budget.available) {
      receipt.budgetSlots += 1;
      expect(defaults.some((answer) => answer.id === 'budget-honest'), `${category.id}: honest budget slot produced no zero-setup answer`);
    }
  }

  expect(receipt.categories === 88, `rollout: tested ${receipt.categories}/88 generated categories`);
  expect(receipt.pilotRoutes === 2, `rollout: expected 2 founder-approved pilot routes, found ${receipt.pilotRoutes}`);
  expect(receipt.batchRoutes === 86, `rollout: expected 86 approved batch routes, found ${receipt.batchRoutes}`);
  expect(receipt.certificationPilots === 3, `rollout: expected 3 S8 certification pilots, found ${receipt.certificationPilots}`);
  expect(receipt.categoryAssignmentPaths === 24, `rollout: expected 24 category-assignment ranking paths, found ${receipt.categoryAssignmentPaths}`);
  expect(receipt.floorFolded === 23, `rollout: shared floor should preserve its bounded 23-option receipt, found ${receipt.floorFolded}`);
  appChecks();
  finish(receipt);
}

function finish(receipt) {
  console.log('Round 9 decision-page rollout audit');
  console.log(`  primary routes: ${receipt.categories || 0}/88 (${receipt.pilotRoutes || 0} pilot + ${receipt.batchRoutes || 0} approved batch)`);
  console.log(`  zero-setup recipes: ${receipt.zeroSetupRecipes || 0}; rendered answer cards after collapse: ${receipt.answerCards || 0}`);
  console.log(`  honest budget slots: ${receipt.budgetSlots || 0}`);
  console.log(`  shared-floor folds: ${receipt.floorFolded || 0} across ${receipt.categoriesWithFolds || 0} categories; every match retained`);
  console.log(`  category assignment: ${receipt.categoryAssignmentPaths || 0} top-ten paths checked across three strict guards and five bounded S8 pilots`);
  console.log(`  certification criteria: ${receipt.certificationPilots || 0}/3 evidence-backed S8 pilots`);
  console.log(`  certification parity: ${receipt.certificationParityFixtures || 0} generated H20 fixtures; app-side consumption still open`);
  console.log('  range posture: practical contract axes only; no ethics/value identity sliders');
  console.log('  number posture: math labels score, weight, and 100-point scale; decision reads contain no product, option, or item counts');
  if (failures.length) {
    console.log(`DECISION PAGE ROLLOUT AUDIT FAILED (${failures.length})`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }
  console.log('DECISION PAGE ROLLOUT AUDIT PASS');
}

main();
