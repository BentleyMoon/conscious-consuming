#!/usr/bin/env node
/* Provenance summary audit.

   H10 depends on generated source-independence fields being exactly true:
   a verdict must not imply more independent sourcing than the scored facts
   actually have. This recomputes entry summaries and category profiles from
   app/data/*.json, then checks the bundled index carries the same profile.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'app', 'data');
const failures = [];

const SOURCE_DOMAIN_LABELS = {
  'world.openfoodfacts.org': 'Open Food Facts',
  'openfoodfacts.org': 'Open Food Facts',
  'prices.openfoodfacts.org': 'Open Prices',
  'world.openbeautyfacts.org': 'Open Beauty Facts',
  'openbeautyfacts.org': 'Open Beauty Facts',
  'bcorporation.net': 'B Lab',
  'github.com': 'GitHub',
  'en.wikipedia.org': 'Wikipedia',
  'wikipedia.org': 'Wikipedia',
};

function rel(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/');
}

function readJson(abs) {
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    failures.push(`${rel(abs)}: invalid or missing JSON (${err.message})`);
    return null;
  }
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function stringLengthOk(value, max) {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function sourceDomain(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const parsed = new URL(url.includes('://') ? url.trim() : `https://${url.trim()}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, '') || null;
  } catch (_) {
    return null;
  }
}

function sourceLabel(domain) {
  if (!domain) return null;
  if (SOURCE_DOMAIN_LABELS[domain]) return SOURCE_DOMAIN_LABELS[domain];
  if (domain.endsWith('.openfoodfacts.org')) return 'Open Food Facts';
  if (domain.endsWith('.openbeautyfacts.org')) return 'Open Beauty Facts';
  if (domain.endsWith('.wikipedia.org')) return 'Wikipedia';
  return domain;
}

function sortedSourceRows(domains) {
  return Object.entries(domains)
    .map(([domain, info]) => ({ domain, label: info.label || domain, facts: info.facts }))
    .sort((a, b) => (b.facts - a.facts) || codepointCompare(a.label, b.label));
}

function codepointCompare(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function expectedEntrySummary(ds, entity) {
  const criteria = ds.criteria || [];
  const scores = entity.scores || {};
  const provenance = entity.provenance || {};
  const domains = {};
  let factCount = 0;
  let noteOnlyFactCount = 0;

  for (const criterion of criteria) {
    const key = criterion && criterion.key;
    if (!key || scores[key] === null || scores[key] === undefined) continue;
    factCount++;
    const source = provenance[key];
    if (source && typeof source === 'object' && !Array.isArray(source)) {
      const domain = sourceDomain(source.source);
      if (domain) {
        if (!domains[domain]) domains[domain] = { label: sourceLabel(domain), facts: 0 };
        domains[domain].facts++;
      } else {
        noteOnlyFactCount++;
      }
    } else if (typeof source === 'string' && source.trim()) {
      noteOnlyFactCount++;
    } else {
      noteOnlyFactCount++;
    }
  }

  const rows = sortedSourceRows(domains);
  const summary = {
    factCount,
    sourcedFactCount: rows.reduce((sum, row) => sum + row.facts, 0),
    sourceDomainCount: rows.length,
    singleSource: rows.length === 1,
    primarySource: rows.length ? rows[0].label : (ds.meta && ds.meta.source) || 'unsourced note',
  };
  if (noteOnlyFactCount) summary.noteOnlyFactCount = noteOnlyFactCount;
  if (rows.length > 1) summary.sourceLabels = rows.slice(0, 6).map(row => row.label);
  return summary;
}

function sameArray(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function checkEntrySummary(cid, entity, expected) {
  const actual = entity.provenanceSummary;
  const code = entity.code || entity.id || entity.name || '(unknown)';
  const prefix = `app/data/${cid}.json:${code}`;
  expect(actual && typeof actual === 'object', `${prefix}: missing provenanceSummary`);
  if (!actual || typeof actual !== 'object') return;

  for (const key of ['factCount', 'sourcedFactCount', 'sourceDomainCount', 'singleSource', 'primarySource']) {
    expect(actual[key] === expected[key], `${prefix}: provenanceSummary.${key} expected ${JSON.stringify(expected[key])}, found ${JSON.stringify(actual[key])}`);
  }
  expect((actual.noteOnlyFactCount || 0) === (expected.noteOnlyFactCount || 0), `${prefix}: noteOnlyFactCount expected ${expected.noteOnlyFactCount || 0}, found ${actual.noteOnlyFactCount || 0}`);

  if (expected.sourceLabels) {
    expect(sameArray(actual.sourceLabels, expected.sourceLabels), `${prefix}: sourceLabels expected ${JSON.stringify(expected.sourceLabels)}, found ${JSON.stringify(actual.sourceLabels)}`);
  } else {
    expect(!actual.sourceLabels, `${prefix}: sourceLabels should be omitted for zero/single-source entries`);
  }

  expect(actual.sourcedFactCount + (actual.noteOnlyFactCount || 0) === actual.factCount, `${prefix}: sourced + note-only facts should equal factCount`);
  expect(actual.sourceDomainCount === 0 || actual.sourcedFactCount > 0, `${prefix}: sourceDomainCount should not be positive without sourced facts`);
}

function expectedProfile(ds, summaries) {
  const primaryCounts = new Map();
  let sourceDomainTotal = 0;
  let singleSourceEntries = 0;
  let multiSourceEntries = 0;
  let noSourceEntries = 0;
  let noteOnlyEntries = 0;

  for (const summary of summaries) {
    sourceDomainTotal += summary.sourceDomainCount;
    primaryCounts.set(summary.primarySource, (primaryCounts.get(summary.primarySource) || 0) + 1);
    if (summary.noteOnlyFactCount) noteOnlyEntries++;
    if (summary.sourceDomainCount === 0) noSourceEntries++;
    else if (summary.sourceDomainCount === 1) singleSourceEntries++;
    else multiSourceEntries++;
  }

  return {
    entryCount: summaries.length,
    singleSourceEntries,
    multiSourceEntries,
    noSourceEntries,
    noteOnlyEntries,
    averageSourceDomains: summaries.length ? Math.round((sourceDomainTotal / summaries.length) * 100) / 100 : 0,
    topPrimarySources: [...primaryCounts.entries()]
      .sort((a, b) => (b[1] - a[1]) || codepointCompare(a[0], b[0]))
      .slice(0, 6)
      .map(([label, entries]) => ({ label, entries })),
  };
}

function profileMatches(actual, expected) {
  return actual
    && actual.entryCount === expected.entryCount
    && actual.singleSourceEntries === expected.singleSourceEntries
    && actual.multiSourceEntries === expected.multiSourceEntries
    && actual.noSourceEntries === expected.noSourceEntries
    && actual.noteOnlyEntries === expected.noteOnlyEntries
    && actual.averageSourceDomains === expected.averageSourceDomains
    && JSON.stringify(actual.topPrimarySources || []) === JSON.stringify(expected.topPrimarySources);
}

function checkProfile(label, actual, expected) {
  expect(profileMatches(actual, expected), `${label}: provenanceProfile expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`);
}

function expectedChip(summary) {
  if ((summary.sourceDomainCount || 0) > 1) return `${summary.sourceDomainCount} independent sources`;
  if ((summary.sourceDomainCount || 0) === 1) return `One source: ${summary.primarySource || 'source'}`;
  return 'Source links missing';
}

function checkDisplayExample(kind, example, datasetsById, predicate, shouldExist) {
  if (!shouldExist) {
    expect(example === null, `provenanceDisplayContract.examples.${kind}: expected null because no matching entry exists`);
    return;
  }
  expect(example && typeof example === 'object', `provenanceDisplayContract.examples.${kind}: missing example`);
  if (!example || typeof example !== 'object') return;

  const ds = datasetsById.get(example.category);
  expect(Boolean(ds), `provenanceDisplayContract.examples.${kind}: unknown category ${example.category}`);
  if (!ds) return;

  const entity = (ds.products || []).find(p => {
    const code = p.code || p.id || '';
    return code === example.code;
  });
  expect(Boolean(entity), `provenanceDisplayContract.examples.${kind}: unknown code ${example.code} in ${example.category}`);
  if (!entity) return;

  const expected = expectedEntrySummary(ds, entity);
  expect(predicate(expected), `provenanceDisplayContract.examples.${kind}: example summary does not match its kind`);
  expect(JSON.stringify(example.summary) === JSON.stringify(expected), `provenanceDisplayContract.examples.${kind}: summary should mirror generated entry summary`);
  expect(example.expectedChip === expectedChip(expected), `provenanceDisplayContract.examples.${kind}: expectedChip should be ${JSON.stringify(expectedChip(expected))}, found ${JSON.stringify(example.expectedChip)}`);
}

function safeCardCode(code) {
  return String(code || '').replace(/[^a-zA-Z0-9._-]/g, '-');
}

function expectedRule(summary) {
  if ((summary.sourceDomainCount || 0) > 1) return 'multi-source';
  if ((summary.sourceDomainCount || 0) === 1) return 'single-source';
  return 'no-source';
}

function expectedConfidence(summary) {
  return expectedRule(summary) === 'multi-source' ? 'standard' : 'held';
}

function checkReviewTarget(label, target, datasetsById) {
  expect(target && typeof target === 'object', `${label}: missing target`);
  if (!target || typeof target !== 'object') return null;

  const ds = datasetsById.get(target.category);
  expect(Boolean(ds), `${label}: unknown category ${target.category}`);
  if (!ds) return null;

  const entity = (ds.products || []).find(p => {
    const code = p.code || p.id || '';
    return code === target.code;
  });
  expect(Boolean(entity), `${label}: unknown code ${target.code} in ${target.category}`);
  if (!entity) return null;

  const expected = expectedEntrySummary(ds, entity);
  expect(JSON.stringify(target.summary) === JSON.stringify(expected), `${label}: target summary should mirror generated entry summary`);
  expect(target.expectedChip === expectedChip(expected), `${label}: expectedChip should match generated summary`);

  const routes = target.routes || {};
  expect(routes.explore === `#explore/${encodeURIComponent(target.category)}`, `${label}: explore route mismatch`);
  expect(routes.item === `#item/${encodeURIComponent(target.category)}/${encodeURIComponent(target.code)}`, `${label}: item route mismatch`);
  expect(routes.appCard === `#card/${encodeURIComponent(target.category)}/${encodeURIComponent(target.code)}`, `${label}: appCard route mismatch`);

  return { expected, ds, entity };
}

function checkReviewMatrix(matrix, coverage, datasetsById) {
  expect(matrix && typeof matrix === 'object', 'provenanceDisplayContract.reviewMatrix: missing review matrix');
  if (!matrix || typeof matrix !== 'object') return;

  expect(matrix.status === 'h10-provenance-preview-review-matrix', 'provenanceDisplayContract.reviewMatrix.status: wrong status');
  expect(matrix.appOwned === true, 'provenanceDisplayContract.reviewMatrix.appOwned: should be true');
  expect(matrix.h10DrainableFromReviewMatrixAlone === false, 'provenanceDisplayContract.reviewMatrix: matrix alone must not drain H10');
  expect(/real entries/i.test(String(matrix.purpose || '')), 'provenanceDisplayContract.reviewMatrix.purpose: should say fixtures come from real entries');

  const surfaceIds = new Set((matrix.surfaces || []).map(surface => surface.id));
  for (const id of ['ranked-list', 'item-page', 'static-verdict-card', 'node-page', 'trust-lens-control']) {
    expect(surfaceIds.has(id), `provenanceDisplayContract.reviewMatrix.surfaces: missing ${id}`);
  }
  for (const surface of matrix.surfaces || []) {
    expect(typeof surface.routePattern === 'string' && surface.routePattern.trim(), `${surface.id}: routePattern missing`);
    expect((surface.mustShow || []).length > 0, `${surface.id}: mustShow should not be empty`);
    expect((surface.mustNot || []).some(item => /do not/i.test(item)), `${surface.id}: mustNot should contain an explicit do-not guardrail`);
  }

  const scenarios = matrix.scenarios || [];
  expect(matrix.totals?.surfaceCount === (matrix.surfaces || []).length, 'provenanceDisplayContract.reviewMatrix.totals.surfaceCount mismatch');
  expect(matrix.totals?.scenarioCount === scenarios.length, 'provenanceDisplayContract.reviewMatrix.totals.scenarioCount mismatch');
  expect(matrix.totals?.targetCount === scenarios.filter(s => s.target).length, 'provenanceDisplayContract.reviewMatrix.totals.targetCount mismatch');

  const byId = new Map();
  for (const scenario of scenarios) {
    expect(typeof scenario.id === 'string' && scenario.id.trim(), 'provenanceDisplayContract.reviewMatrix.scenarios: scenario missing id');
    expect(!byId.has(scenario.id), `provenanceDisplayContract.reviewMatrix.scenarios: duplicate ${scenario.id}`);
    byId.set(scenario.id, scenario);
    expect(surfaceIds.has(scenario.surface), `${scenario.id}: unknown surface ${scenario.surface}`);
    expect((scenario.mustShow || []).length > 0, `${scenario.id}: mustShow should not be empty`);
    expect((scenario.mustNot || []).some(item => /do not/i.test(item)), `${scenario.id}: mustNot should contain an explicit do-not guardrail`);

    if (scenario.target) {
      const checked = checkReviewTarget(`provenanceDisplayContract.reviewMatrix.scenarios.${scenario.id}`, scenario.target, datasetsById);
      if (checked) {
        expect(scenario.expected?.rule === expectedRule(checked.expected), `${scenario.id}: expected rule mismatch`);
        expect(scenario.expected?.chip === expectedChip(checked.expected), `${scenario.id}: expected chip mismatch`);
        expect(scenario.expected?.confidenceMode === expectedConfidence(checked.expected), `${scenario.id}: expected confidenceMode mismatch`);
        expect(scenario.expected?.defaultVisibility === 'visible', `${scenario.id}: defaultVisibility should keep entries visible`);
        if (scenario.surface === 'static-verdict-card') {
          expect(!checked.ds.meta?.productBase, `${scenario.id}: static verdict card fixture should use a pre-rendered curated lens`);
          expect(scenario.target.routes?.staticHtml === `./c/${scenario.target.category}/${safeCardCode(scenario.target.code)}.html`, `${scenario.id}: staticHtml route mismatch`);
          expect(scenario.target.routes?.staticImage === `./c/${scenario.target.category}/${safeCardCode(scenario.target.code)}.png`, `${scenario.id}: staticImage route mismatch`);
          expect(scenario.route === scenario.target.routes.staticHtml, `${scenario.id}: scenario route should point at staticHtml`);
        }
      }
    }
  }

  for (const id of ['ranked-list-multi-source', 'ranked-list-single-source', 'item-page-multi-source', 'item-page-single-source', 'static-verdict-card', 'node-embedded-verdict', 'trust-lens-control']) {
    expect(byId.has(id), `provenanceDisplayContract.reviewMatrix.scenarios: missing ${id}`);
  }
  if (coverage.noteOnlyEntries > 0) {
    expect(byId.has('note-only-entry'), 'provenanceDisplayContract.reviewMatrix.scenarios: missing note-only-entry fixture despite note-only coverage');
  }

  const lensScenario = byId.get('trust-lens-control');
  expect(lensScenario?.expected?.default === 'off', 'trust-lens-control: default should be off');
  expect(lensScenario?.expected?.keepRule === 'sourceDomainCount > 1', 'trust-lens-control: keepRule mismatch');
  expect(/Fold single-source/i.test(String(lensScenario?.expected?.foldRule || '')), 'trust-lens-control: foldRule should describe folded single-source entries');
  const targetCategory = lensScenario?.targetCategory || {};
  const cat = [...datasetsById.values()].find(ds => ds.meta && ds.meta.id === targetCategory.category);
  expect(Boolean(cat), `trust-lens-control: target category ${targetCategory.category || '(missing)'} not found`);
  if (cat) {
    const profile = cat.meta?.provenanceProfile || {};
    expect(profile.singleSourceEntries === targetCategory.singleSourceEntries, 'trust-lens-control: singleSourceEntries mismatch');
    expect(profile.multiSourceEntries === targetCategory.multiSourceEntries, 'trust-lens-control: multiSourceEntries mismatch');
    expect(profile.singleSourceEntries > 0 && profile.multiSourceEntries > 0, 'trust-lens-control: target category should contain both single and multi-source entries');
  }

  if (coverage.noSourceEntries === 0) {
    expect((matrix.notIncluded || []).some(row => row.id === 'no-source-entry' && /no no-source entries/i.test(row.reason || '')), 'provenanceDisplayContract.reviewMatrix.notIncluded: should explain missing no-source fixture');
  }
  expect(matrix.totals?.notIncludedCount === (matrix.notIncluded || []).length, 'provenanceDisplayContract.reviewMatrix.totals.notIncludedCount mismatch');
}

function checkDrainContract(contract, reviewMatrix) {
  expect(contract && typeof contract === 'object', 'provenanceDisplayContract.drainContract: missing drain contract');
  if (!contract || typeof contract !== 'object') return;

  expect(/H10 drain/i.test(contract.purpose || ''), 'provenanceDisplayContract.drainContract.purpose: should name H10 drain purpose');
  expect(contract.status === 'pending-app-integration', 'provenanceDisplayContract.drainContract.status: should stay pending app integration');
  expect(contract.activeHandoff === 'H10', 'provenanceDisplayContract.drainContract.activeHandoff: should point to H10');
  expect(/Claude H10/i.test(contract.namedConsumer || ''), 'provenanceDisplayContract.drainContract.namedConsumer: should name Claude H10');
  expect(contract.h10DrainableFromDataAlone === false, 'provenanceDisplayContract.drainContract.h10DrainableFromDataAlone: data alone must not drain H10');
  expect(/app-owned/i.test(contract.drainRule || '') && /generated data alone/i.test(contract.drainRule || ''), 'provenanceDisplayContract.drainContract.drainRule: should name app-owned/data-alone boundary');

  const receipt = contract.receiptContract || {};
  expect(receipt.schema === 'h10-local-evidence-v1', 'provenanceDisplayContract.drainContract.receiptContract.schema mismatch');
  expect(/device-local/i.test(receipt.storage || '') && /no account/i.test(receipt.storage || ''), 'provenanceDisplayContract.drainContract.receiptContract.storage should be local/no-account');
  for (const field of ['schema', 'createdAt', 'channel', 'buildHash', 'contractStatus', 'scenarioResults', 'finalDecision']) {
    expect((receipt.requiredTopLevelFields || []).includes(field), `provenanceDisplayContract.drainContract.receiptContract.requiredTopLevelFields missing ${field}`);
  }
  expect((receipt.requiredTopLevelFields || []).includes('stepResults'), 'provenanceDisplayContract.drainContract.receiptContract.requiredTopLevelFields missing stepResults');
  for (const field of ['scenarioId', 'surface', 'route', 'observedChip', 'observedConfidenceMode', 'passed', 'notes', 'recordedAt']) {
    expect((receipt.perScenarioFields || []).includes(field), `provenanceDisplayContract.drainContract.receiptContract.perScenarioFields missing ${field}`);
  }
  for (const status of ['pending', 'passed-ready-to-drain', 'blocked']) {
    expect((receipt.allowedFinalStatuses || []).includes(status), `provenanceDisplayContract.drainContract.receiptContract.allowedFinalStatuses missing ${status}`);
  }
  expect((receipt.mustNot || []).some(line => /user values/i.test(line)), 'provenanceDisplayContract.drainContract.receiptContract.mustNot should forbid storing user values');
  expect((receipt.mustNot || []).some(line => /send/i.test(line) && /automatically/i.test(line)), 'provenanceDisplayContract.drainContract.receiptContract.mustNot should forbid automatic sending');

  const scenarios = reviewMatrix?.scenarios || [];
  const scenarioIds = new Set(scenarios.map(scenario => scenario.id));
  const scenarioById = new Map(scenarios.map(scenario => [scenario.id, scenario]));
  const steps = contract.steps || [];
  const template = contract.receiptTemplate || {};
  expect(template && typeof template === 'object', 'provenanceDisplayContract.drainContract.receiptTemplate: missing receipt template');
  expect(template.schema === receipt.schema, 'provenanceDisplayContract.drainContract.receiptTemplate.schema should match receipt contract');
  for (const field of receipt.requiredTopLevelFields || []) {
    expect(hasOwn(template, field), `provenanceDisplayContract.drainContract.receiptTemplate missing top-level ${field}`);
  }
  expect(template.createdAt === null, 'provenanceDisplayContract.drainContract.receiptTemplate.createdAt should stay blank');
  expect(template.channel === 'local-review', 'provenanceDisplayContract.drainContract.receiptTemplate.channel should be local-review');
  expect(template.buildHash === null, 'provenanceDisplayContract.drainContract.receiptTemplate.buildHash should stay blank');
  expect(template.contractStatus === contract.status, 'provenanceDisplayContract.drainContract.receiptTemplate.contractStatus mismatch');
  expect(Array.isArray(template.scenarioResults) && template.scenarioResults.length === scenarioIds.size, 'provenanceDisplayContract.drainContract.receiptTemplate.scenarioResults count mismatch');
  const templateScenarioIds = new Set();
  for (const result of template.scenarioResults || []) {
    for (const field of receipt.perScenarioFields || []) {
      expect(hasOwn(result, field), `provenanceDisplayContract.drainContract.receiptTemplate.${result?.scenarioId || '(missing)'} missing ${field}`);
    }
    const scenario = scenarioById.get(result?.scenarioId);
    expect(Boolean(scenario), `provenanceDisplayContract.drainContract.receiptTemplate references unknown scenario ${result?.scenarioId || '(missing)'}`);
    if (!scenario) continue;
    templateScenarioIds.add(result.scenarioId);
    expect(result.surface === scenario.surface, `${result.scenarioId}: receiptTemplate surface mismatch`);
    expect(result.route === scenario.route, `${result.scenarioId}: receiptTemplate route mismatch`);
    if (scenario.target) {
      expect(result.category === scenario.target.category, `${result.scenarioId}: receiptTemplate category mismatch`);
      expect(result.code === scenario.target.code, `${result.scenarioId}: receiptTemplate code mismatch`);
    } else if (scenario.targetCategory) {
      expect(result.category === scenario.targetCategory.category, `${result.scenarioId}: receiptTemplate target category mismatch`);
      expect(result.code === null, `${result.scenarioId}: receiptTemplate code should stay blank when there is no entry target`);
    }
    if (scenario.expected?.chip) expect(result.expectedChip === scenario.expected.chip, `${result.scenarioId}: receiptTemplate expectedChip mismatch`);
    if (scenario.expected?.confidenceMode) expect(result.expectedConfidenceMode === scenario.expected.confidenceMode, `${result.scenarioId}: receiptTemplate expectedConfidenceMode mismatch`);
    expect(result.observedChip === null, `${result.scenarioId}: receiptTemplate observedChip should stay blank`);
    expect(result.observedConfidenceMode === null, `${result.scenarioId}: receiptTemplate observedConfidenceMode should stay blank`);
    expect(result.passed === null, `${result.scenarioId}: receiptTemplate passed should not imply a result`);
    expect(result.notes === '', `${result.scenarioId}: receiptTemplate notes should start empty`);
    expect(result.recordedAt === null, `${result.scenarioId}: receiptTemplate recordedAt should stay blank`);
    expect(JSON.stringify(result.mustShow || []) === JSON.stringify(scenario.mustShow || []), `${result.scenarioId}: receiptTemplate mustShow mismatch`);
    expect(JSON.stringify(result.mustNot || []) === JSON.stringify(scenario.mustNot || []), `${result.scenarioId}: receiptTemplate mustNot mismatch`);
    expect(!hasOwn(result, 'screenshot') && !hasOwn(result, 'userValues') && !hasOwn(result, 'personalBrowsingHistory'), `${result.scenarioId}: receiptTemplate must not include personal/screenshot fields`);
  }
  for (const scenarioId of scenarioIds) {
    expect(templateScenarioIds.has(scenarioId), `provenanceDisplayContract.drainContract.receiptTemplate missing scenario ${scenarioId}`);
  }
  expect(Array.isArray(template.stepResults) && template.stepResults.length === steps.length, 'provenanceDisplayContract.drainContract.receiptTemplate.stepResults count mismatch');
  for (const [index, stepResult] of (template.stepResults || []).entries()) {
    const step = steps[index];
    expect(stepResult.step === step?.step, `${step?.id || index}: receiptTemplate step number mismatch`);
    expect(stepResult.stepId === step?.id, `${step?.id || index}: receiptTemplate stepId mismatch`);
    expect(stepResult.label === step?.label, `${step?.id || index}: receiptTemplate label mismatch`);
    expect(JSON.stringify(stepResult.scenarioIds || []) === JSON.stringify(step?.scenarioIds || []), `${step?.id || index}: receiptTemplate step scenarioIds mismatch`);
    expect(stepResult.passed === null, `${step?.id || index}: receiptTemplate step passed should not imply a result`);
    expect(stepResult.notes === '', `${step?.id || index}: receiptTemplate step notes should start empty`);
    expect(stepResult.recordedAt === null, `${step?.id || index}: receiptTemplate step recordedAt should stay blank`);
  }
  expect(template.finalDecision?.status === 'pending', 'provenanceDisplayContract.drainContract.receiptTemplate.finalDecision.status should be pending');
  expect(template.finalDecision?.readyToDrain === false, 'provenanceDisplayContract.drainContract.receiptTemplate.finalDecision.readyToDrain should be false');
  expect(template.finalDecision?.decidedBy === null && template.finalDecision?.decidedAt === null, 'provenanceDisplayContract.drainContract.receiptTemplate.finalDecision should stay undecided');
  expect((template.finalDecision?.remainingBlockers || []).some(line => /app-owned H10 implementation evidence/i.test(line)), 'provenanceDisplayContract.drainContract.receiptTemplate.finalDecision should name the app-owned blocker');

  const expectedStepOrder = [
    'load-generated-contract',
    'ranked-list-provenance',
    'item-page-provenance',
    'static-card-provenance',
    'node-embedded-provenance',
    'trust-lens-control',
    'final-h10-drain-decision'
  ];
  const coveredScenarioIds = new Set();
  expect(steps.length === expectedStepOrder.length, 'provenanceDisplayContract.drainContract.steps: unexpected step count');
  steps.forEach((step, index) => {
    const expectedId = expectedStepOrder[index];
    expect(step?.step === index + 1, `provenanceDisplayContract.drainContract.steps.${expectedId}: step should be sequential`);
    expect(step?.id === expectedId, `provenanceDisplayContract.drainContract.steps.${index + 1}: expected ${expectedId}, found ${step?.id || '(missing)'}`);
    expect(typeof step?.label === 'string' && step.label.trim(), `${expectedId}: label missing`);
    expect(Array.isArray(step?.scenarioIds), `${expectedId}: scenarioIds should be an array`);
    for (const scenarioId of step?.scenarioIds || []) {
      expect(scenarioIds.has(scenarioId), `${expectedId}: references unknown scenario ${scenarioId}`);
      coveredScenarioIds.add(scenarioId);
    }
    expect(Array.isArray(step?.sourceFiles) && step.sourceFiles.length > 0, `${expectedId}: sourceFiles should not be empty`);
    expect(typeof step?.contractPointer === 'string' && step.contractPointer.includes('provenanceDisplayContract'), `${expectedId}: contractPointer should point into provenanceDisplayContract`);
    expect((step?.appOwnedEvidence || []).length >= 2, `${expectedId}: appOwnedEvidence needs at least two requirements`);
    expect((step?.passWhen || []).length >= 2, `${expectedId}: passWhen needs at least two conditions`);
    expect((step?.mustNot || []).length >= 2, `${expectedId}: mustNot needs at least two rules`);
    expect((step?.mustNot || []).some(line => /do not/i.test(line)), `${expectedId}: mustNot should contain explicit do-not language`);
  });
  for (const scenarioId of scenarioIds) {
    expect(coveredScenarioIds.has(scenarioId), `provenanceDisplayContract.drainContract: scenario ${scenarioId} not covered by any step`);
  }

  const byId = new Map(steps.map(step => [step.id, step]));
  expect((byId.get('ranked-list-provenance')?.scenarioIds || []).includes('ranked-list-single-source'), 'ranked-list-provenance should cover single-source list fixture');
  if (scenarioIds.has('note-only-entry')) {
    expect((byId.get('item-page-provenance')?.scenarioIds || []).includes('note-only-entry'), 'item-page-provenance should cover note-only fixture');
  }
  expect((byId.get('static-card-provenance')?.sourceFiles || []).includes('app/c/_cards.json'), 'static-card-provenance should include card manifest source');
  expect((byId.get('trust-lens-control')?.sourceFiles || []).some(file => /trustLensControl/.test(file)), 'trust-lens-control should point at trustLensControl source');
  expect((byId.get('final-h10-drain-decision')?.scenarioIds || []).length === scenarioIds.size, 'final-h10-drain-decision should cover every scenario');

  expect(contract.finalDecision?.expectedStatusBeforeAppWork === 'pending-app-integration', 'provenanceDisplayContract.drainContract.finalDecision expected status mismatch');
  expect(contract.finalDecision?.dataAloneIsInsufficient === true, 'provenanceDisplayContract.drainContract.finalDecision should reject data-only drain');
  expect((contract.finalDecision?.drainOnlyWhen || []).length >= 4, 'provenanceDisplayContract.drainContract.finalDecision needs drain conditions');
  expect((contract.finalDecision?.drainOnlyWhen || []).some(line => /Trust Lens/i.test(line)), 'provenanceDisplayContract.drainContract.finalDecision should mention Trust Lens control');
  expect((contract.finalDecision?.mustNot || []).some(line => /data generation alone/i.test(line)), 'provenanceDisplayContract.drainContract.finalDecision should forbid data-only drain');
  expect((contract.finalDecision?.mustNot || []).some(line => /independent sources/i.test(line)), 'provenanceDisplayContract.drainContract.finalDecision should forbid overstating independent sources');

  const surfaceCount = (reviewMatrix?.surfaces || []).length;
  const scenarioCount = (reviewMatrix?.scenarios || []).length;
  expect(contract.coverage?.steps === steps.length, 'provenanceDisplayContract.drainContract.coverage.steps mismatch');
  expect(contract.coverage?.surfaceCount === surfaceCount, 'provenanceDisplayContract.drainContract.coverage.surfaceCount mismatch');
  expect(contract.coverage?.scenarioCount === scenarioCount, 'provenanceDisplayContract.drainContract.coverage.scenarioCount mismatch');
  expect(contract.coverage?.coveredScenarioCount === coveredScenarioIds.size, 'provenanceDisplayContract.drainContract.coverage.coveredScenarioCount mismatch');
  expect(contract.coverage?.allScenariosCovered === true, 'provenanceDisplayContract.drainContract.coverage.allScenariosCovered should be true');
  expect(contract.coverage?.dataAloneDrainable === false, 'provenanceDisplayContract.drainContract.coverage.dataAloneDrainable should be false');
  expect(contract.coverage?.receiptTemplateScenarioCount === scenarioIds.size, 'provenanceDisplayContract.drainContract.coverage.receiptTemplateScenarioCount mismatch');
  expect(contract.coverage?.receiptTemplateStepCount === steps.length, 'provenanceDisplayContract.drainContract.coverage.receiptTemplateStepCount mismatch');
  expect(contract.coverage?.finalStepId === 'final-h10-drain-decision', 'provenanceDisplayContract.drainContract.coverage.finalStepId mismatch');
}

function checkCopyContract(copy, renderRules, trustLensControl, reviewMatrix) {
  expect(copy && typeof copy === 'object', 'provenanceDisplayContract.copyContract: missing copy contract');
  if (!copy || typeof copy !== 'object') return;

  expect(copy.status === 'h10-provenance-microcopy-contract', 'provenanceDisplayContract.copyContract.status mismatch');
  expect(/provenance chips/i.test(copy.purpose || '') && /local H10 review receipts/i.test(copy.purpose || ''), 'provenanceDisplayContract.copyContract.purpose should name provenance chips and H10 receipts');
  expect(copy.h10DrainableFromCopyAlone === false, 'provenanceDisplayContract.copyContract.h10DrainableFromCopyAlone should be false');
  expect((copy.copyTone || []).includes('source-strength, not moral judgment'), 'provenanceDisplayContract.copyContract.copyTone should keep copy values-relative');

  const max = copy.maxLengths || {};
  expect(max.chip === 40 && max.shortDetail === 140 && max.longDetail === 220 && max.button === 24 && max.receiptLine === 180, 'provenanceDisplayContract.copyContract.maxLengths mismatch');

  const banned = /\b(verified|certified|proof|approved|guaranteed|safe|sponsored)\b|trust score/i;
  const ruleTemplates = new Map((renderRules || []).map(rule => [rule.id, rule.chipTemplate]));
  const chipRows = copy.chipCopy || [];
  const chipByRule = new Map(chipRows.map(row => [row.rule, row]));
  expect(chipRows.length === 4, 'provenanceDisplayContract.copyContract.chipCopy should include 4 rows');
  for (const rule of ['multi-source', 'single-source', 'no-source', 'note-only']) {
    const row = chipByRule.get(rule);
    expect(Boolean(row), `provenanceDisplayContract.copyContract.chipCopy missing ${rule}`);
    if (!row) continue;
    expect(stringLengthOk(row.template, max.chip), `${rule}: chip template should be non-empty and within max length`);
    expect(stringLengthOk(row.detail, max.shortDetail), `${rule}: chip detail should be non-empty and within max length`);
    expect(stringLengthOk(row.confidenceLabel, max.chip), `${rule}: confidence label should be non-empty and within max length`);
    for (const value of [row.template, row.detail, row.confidenceLabel]) {
      expect(!banned.test(value || ''), `${rule}: display copy contains overclaiming language`);
    }
  }
  for (const rule of ['multi-source', 'single-source', 'no-source']) {
    expect(chipByRule.get(rule)?.template === ruleTemplates.get(rule), `provenanceDisplayContract.copyContract.chipCopy.${rule}: template should match render rule`);
  }
  expect(/notes/i.test(chipByRule.get('note-only')?.template || '') && /do not count as independent sources/i.test(chipByRule.get('note-only')?.detail || ''), 'provenanceDisplayContract.copyContract.chipCopy.note-only should keep notes separate from sources');
  expect(chipByRule.get('single-source')?.confidenceLabel === 'Confidence held', 'single-source copy should use held confidence');
  expect(chipByRule.get('no-source')?.confidenceLabel === 'Confidence held', 'no-source copy should use held confidence');
  expect(chipByRule.get('multi-source')?.confidenceLabel === 'Normal confidence', 'multi-source copy should use normal confidence');

  const expectedSurfaces = new Set((reviewMatrix?.surfaces || []).map(surface => surface.id));
  const surfaceRows = copy.surfaceCopy || [];
  const surfaceById = new Map(surfaceRows.map(row => [row.surface, row]));
  expect(surfaceRows.length === expectedSurfaces.size, 'provenanceDisplayContract.copyContract.surfaceCopy count mismatch');
  for (const surfaceId of expectedSurfaces) {
    const row = surfaceById.get(surfaceId);
    expect(Boolean(row), `provenanceDisplayContract.copyContract.surfaceCopy missing ${surfaceId}`);
    if (!row) continue;
    expect(stringLengthOk(row.placement, max.shortDetail), `${surfaceId}: placement should be bounded`);
    expect(stringLengthOk(row.primary, max.longDetail), `${surfaceId}: primary copy should be bounded`);
    expect(stringLengthOk(row.detail, max.longDetail), `${surfaceId}: detail copy should be bounded`);
    for (const value of [row.placement, row.primary, row.detail]) {
      expect(!banned.test(value || ''), `${surfaceId}: surface copy contains overclaiming language`);
    }
  }
  expect(surfaceById.get('trust-lens-control')?.primary === trustLensControl?.label, 'trust-lens-control surface copy should reuse Trust Lens label');
  expect(/default ranking/i.test(surfaceById.get('ranked-list')?.primary || ''), 'ranked-list copy should keep default ranking unchanged');
  expect(/same-domain/i.test(surfaceById.get('item-page')?.primary || ''), 'item-page copy should require same-domain grouping');
  expect(/no stronger than the generated chip/i.test(surfaceById.get('static-verdict-card')?.primary || ''), 'static-card copy should avoid overclaiming');
  expect(/must not upgrade/i.test(surfaceById.get('node-page')?.detail || ''), 'node-page copy should prevent provenance upgrades');

  const lens = copy.trustLensCopy || {};
  expect(lens.label === trustLensControl?.label, 'provenanceDisplayContract.copyContract.trustLensCopy.label should match trustLensControl');
  expect(lens.default === trustLensControl?.default && lens.default === 'off', 'provenanceDisplayContract.copyContract.trustLensCopy.default should be off');
  expect(stringLengthOk(lens.showAnywayLabel, max.button), 'provenanceDisplayContract.copyContract.trustLensCopy.showAnywayLabel should be bounded');
  for (const field of ['label', 'offState', 'onState', 'foldDisclosure', 'showAnywayLabel']) {
    expect(stringLengthOk(lens[field], field === 'showAnywayLabel' ? max.button : max.longDetail), `trustLensCopy.${field} should be bounded`);
    expect(!banned.test(lens[field] || ''), `trustLensCopy.${field} contains overclaiming language`);
  }
  expect(/folded, not removed/i.test(lens.foldDisclosure || ''), 'provenanceDisplayContract.copyContract.trustLensCopy.foldDisclosure should say entries are folded, not removed');

  const receipt = copy.receiptCopy || {};
  for (const field of ['title', 'pending', 'ready', 'localBoundary', 'finalDecision']) {
    expect(stringLengthOk(receipt[field], max.receiptLine), `receiptCopy.${field} should be bounded`);
    expect(!banned.test(receipt[field] || ''), `receiptCopy.${field} contains overclaiming language`);
  }
  expect(/no account/i.test(receipt.localBoundary || '') && /analytics/i.test(receipt.localBoundary || '') && /automatic sending/i.test(receipt.localBoundary || ''), 'provenanceDisplayContract.copyContract.receiptCopy.localBoundary should keep the local/no-capture boundary');
  expect(/app\/design/i.test(receipt.finalDecision || ''), 'provenanceDisplayContract.copyContract.receiptCopy.finalDecision should leave drain decision to app/design');

  const mustNot = copy.mustNot || [];
  for (const term of ['verified', 'certified', 'proof', 'approved', 'guaranteed', 'safe', 'sponsored', 'trust score']) {
    expect(mustNot.some(line => line.toLowerCase().includes(term)), `provenanceDisplayContract.copyContract.mustNot should forbid ${term}`);
  }
  expect(mustNot.some(line => /one source domain as several independent sources/i.test(line)), 'provenanceDisplayContract.copyContract.mustNot should forbid overstating source independence');
  expect(mustNot.some(line => /note-only facts into source badges/i.test(line)), 'provenanceDisplayContract.copyContract.mustNot should forbid note-only source badges');
  expect(mustNot.some(line => /default-on/i.test(line)), 'provenanceDisplayContract.copyContract.mustNot should keep Trust Lens off by default');

  expect(copy.coverage?.surfaceCount === expectedSurfaces.size, 'provenanceDisplayContract.copyContract.coverage.surfaceCount mismatch');
  expect(copy.coverage?.chipRules === chipRows.length, 'provenanceDisplayContract.copyContract.coverage.chipRules mismatch');
  expect(copy.coverage?.scenarioCount === (reviewMatrix?.scenarios || []).length, 'provenanceDisplayContract.copyContract.coverage.scenarioCount mismatch');
  expect(copy.coverage?.copyAloneDrainable === false, 'provenanceDisplayContract.copyContract.coverage.copyAloneDrainable should be false');
}

function checkWalkthrough(walkthrough, reviewMatrix, drainContract, copyContract) {
  expect(walkthrough && typeof walkthrough === 'object', 'provenanceDisplayContract.walkthrough: missing walkthrough');
  if (!walkthrough || typeof walkthrough !== 'object') return;

  expect(walkthrough.status === 'h10-provenance-review-walkthrough', 'provenanceDisplayContract.walkthrough.status mismatch');
  expect(/Ordered app-owned H10 review path/i.test(walkthrough.purpose || ''), 'provenanceDisplayContract.walkthrough.purpose should name ordered app-owned review');
  expect(walkthrough.appOwned === true, 'provenanceDisplayContract.walkthrough.appOwned should be true');
  expect(walkthrough.h10DrainableFromWalkthroughAlone === false, 'provenanceDisplayContract.walkthrough should not drain H10 alone');
  expect((walkthrough.beforeReview || []).some(line => /running app/i.test(line)), 'provenanceDisplayContract.walkthrough.beforeReview should require running app review');
  expect((walkthrough.beforeReview || []).some(line => /receiptTemplate/i.test(line)), 'provenanceDisplayContract.walkthrough.beforeReview should point to receiptTemplate');
  expect((walkthrough.beforeReview || []).some(line => /screenshots/i.test(line) && /user values/i.test(line)), 'provenanceDisplayContract.walkthrough.beforeReview should forbid screenshots/user values');

  const scenarios = reviewMatrix?.scenarios || [];
  const scenarioById = new Map(scenarios.map(scenario => [scenario.id, scenario]));
  const surfaceCopy = new Map((copyContract?.surfaceCopy || []).map(row => [row.surface, row]));
  const chipCopy = new Map((copyContract?.chipCopy || []).map(row => [row.rule, row]));
  const stepIdsByScenario = new Map();
  for (const step of drainContract?.steps || []) {
    for (const scenarioId of step.scenarioIds || []) {
      if (!stepIdsByScenario.has(scenarioId)) stepIdsByScenario.set(scenarioId, []);
      stepIdsByScenario.get(scenarioId).push(step.id);
    }
  }
  const finalStepId = drainContract?.coverage?.finalStepId;
  const items = walkthrough.items || [];
  expect(Array.isArray(items) && items.length === scenarios.length, 'provenanceDisplayContract.walkthrough.items count mismatch');
  const covered = new Set();

  items.forEach((item, index) => {
    expect(item.order === index + 1, `walkthrough item ${index + 1}: order mismatch`);
    expect(typeof item.id === 'string' && item.id === `h10-walk-${item.scenarioId}`, `walkthrough item ${index + 1}: id mismatch`);
    const scenario = scenarioById.get(item.scenarioId);
    expect(Boolean(scenario), `provenanceDisplayContract.walkthrough references unknown scenario ${item.scenarioId || '(missing)'}`);
    if (!scenario) return;
    covered.add(item.scenarioId);
    expect(item.surface === scenario.surface, `${item.scenarioId}: walkthrough surface mismatch`);
    expect(item.route === scenario.route, `${item.scenarioId}: walkthrough route mismatch`);
    const target = scenario.target || {};
    const targetCategory = scenario.targetCategory || {};
    expect(item.target?.category === (target.category || targetCategory.category), `${item.scenarioId}: walkthrough target category mismatch`);
    expect(item.target?.categoryLabel === (target.categoryLabel || targetCategory.categoryLabel), `${item.scenarioId}: walkthrough target categoryLabel mismatch`);
    expect((item.target?.code || null) === (target.code || null), `${item.scenarioId}: walkthrough target code mismatch`);
    expect((item.target?.name || null) === (target.name || null), `${item.scenarioId}: walkthrough target name mismatch`);

    const expected = scenario.expected || {};
    expect((item.expected?.rule || null) === (expected.rule || null), `${item.scenarioId}: walkthrough expected rule mismatch`);
    expect((item.expected?.chip || null) === (expected.chip || null), `${item.scenarioId}: walkthrough expected chip mismatch`);
    expect((item.expected?.confidenceMode || null) === (expected.confidenceMode || null), `${item.scenarioId}: walkthrough expected confidenceMode mismatch`);
    expect((item.expected?.defaultVisibility || null) === (expected.defaultVisibility || null), `${item.scenarioId}: walkthrough expected defaultVisibility mismatch`);
    expect((item.expected?.trustLensDefault || null) === (expected.default || null), `${item.scenarioId}: walkthrough trustLensDefault mismatch`);
    expect((item.expected?.trustLensKeepRule || null) === (expected.keepRule || null), `${item.scenarioId}: walkthrough trustLensKeepRule mismatch`);
    expect((item.expected?.trustLensFoldRule || null) === (expected.foldRule || null), `${item.scenarioId}: walkthrough trustLensFoldRule mismatch`);

    const surface = surfaceCopy.get(scenario.surface) || {};
    expect(item.copy?.surfacePrimary === surface.primary, `${item.scenarioId}: walkthrough surfacePrimary copy mismatch`);
    expect(item.copy?.surfaceDetail === surface.detail, `${item.scenarioId}: walkthrough surfaceDetail copy mismatch`);
    const chip = chipCopy.get(expected.rule) || {};
    expect((item.copy?.chipTemplate || null) === (chip.template || null), `${item.scenarioId}: walkthrough chipTemplate copy mismatch`);
    expect((item.copy?.confidenceLabel || null) === (chip.confidenceLabel || null), `${item.scenarioId}: walkthrough confidenceLabel copy mismatch`);

    expect(Array.isArray(item.actions) && item.actions.length >= 4, `${item.scenarioId}: walkthrough actions should be complete`);
    expect((item.passWhen || []).length >= (scenario.mustShow || []).length + 2, `${item.scenarioId}: walkthrough passWhen should include scenario checks and receipt checks`);
    for (const mustShow of scenario.mustShow || []) {
      expect((item.passWhen || []).includes(mustShow), `${item.scenarioId}: walkthrough passWhen missing ${mustShow}`);
    }
    expect((item.passWhen || []).some(line => /copyContract/i.test(line)), `${item.scenarioId}: walkthrough passWhen should mention copyContract`);
    expect((item.passWhen || []).some(line => /Receipt row/i.test(line)), `${item.scenarioId}: walkthrough passWhen should mention receipt row`);
    for (const mustNot of scenario.mustNot || []) {
      expect((item.mustNot || []).includes(mustNot), `${item.scenarioId}: walkthrough mustNot missing ${mustNot}`);
    }
    expect((item.mustNot || []).some(line => /Do not mark the final H10 drain decision/i.test(line)), `${item.scenarioId}: walkthrough mustNot should block item-only drain`);

    expect(item.receipt?.schema === drainContract?.receiptContract?.schema, `${item.scenarioId}: walkthrough receipt schema mismatch`);
    expect(item.receipt?.scenarioId === item.scenarioId, `${item.scenarioId}: walkthrough receipt scenarioId mismatch`);
    for (const field of ['observedChip', 'observedConfidenceMode', 'passed', 'notes', 'recordedAt']) {
      expect((item.receipt?.fieldsToFill || []).includes(field), `${item.scenarioId}: walkthrough receipt fields missing ${field}`);
    }
    expect(item.receipt?.startBlank === true, `${item.scenarioId}: walkthrough receipt should start blank`);

    const expectedSteps = stepIdsByScenario.get(item.scenarioId) || [];
    expect(JSON.stringify(item.drainStepIds || []) === JSON.stringify(expectedSteps), `${item.scenarioId}: walkthrough drainStepIds mismatch`);
    expect((item.drainStepIds || []).includes(finalStepId), `${item.scenarioId}: walkthrough should include final drain step`);
    if (item.scenarioId === 'trust-lens-control') {
      expect((item.actions || []).some(line => /Trust Lens off/i.test(line)), 'trust-lens-control walkthrough should start with Trust Lens off');
      expect((item.passWhen || []).some(line => /off by default/i.test(line)), 'trust-lens-control walkthrough should require off-by-default behavior');
    }
  });

  for (const scenario of scenarios) {
    expect(covered.has(scenario.id), `provenanceDisplayContract.walkthrough missing scenario ${scenario.id}`);
  }
  expect(walkthrough.finalGate?.stepId === finalStepId, 'provenanceDisplayContract.walkthrough.finalGate.stepId mismatch');
  expect(walkthrough.finalGate?.statusBeforeAppWork === drainContract?.status, 'provenanceDisplayContract.walkthrough.finalGate status mismatch');
  expect((walkthrough.finalGate?.drainOnlyAfter || []).length >= 3, 'provenanceDisplayContract.walkthrough.finalGate needs drain conditions');
  expect((walkthrough.finalGate?.drainOnlyAfter || []).some(line => /docs\/CONTENT-HANDOFF\.md/i.test(line)), 'provenanceDisplayContract.walkthrough.finalGate should leave movement to handoff');
  expect((walkthrough.finalGate?.mustNot || []).some(line => /walkthrough generation alone/i.test(line)), 'provenanceDisplayContract.walkthrough.finalGate should forbid data-only drain');

  expect(walkthrough.coverage?.items === items.length, 'provenanceDisplayContract.walkthrough.coverage.items mismatch');
  expect(walkthrough.coverage?.scenarioCount === scenarios.length, 'provenanceDisplayContract.walkthrough.coverage.scenarioCount mismatch');
  expect(walkthrough.coverage?.coveredScenarioCount === covered.size, 'provenanceDisplayContract.walkthrough.coverage.coveredScenarioCount mismatch');
  expect(walkthrough.coverage?.allScenariosCovered === true, 'provenanceDisplayContract.walkthrough.coverage.allScenariosCovered should be true');
  expect(walkthrough.coverage?.drainStepCount === (drainContract?.steps || []).length, 'provenanceDisplayContract.walkthrough.coverage.drainStepCount mismatch');
  expect(walkthrough.coverage?.copySurfaceCount === (copyContract?.surfaceCopy || []).length, 'provenanceDisplayContract.walkthrough.coverage.copySurfaceCount mismatch');
  expect(walkthrough.coverage?.walkthroughAloneDrainable === false, 'provenanceDisplayContract.walkthrough.coverage.walkthroughAloneDrainable should be false');
}

function checkReviewTranscript(transcript, validator, tracker, drainContract, resultCopy, states, copyRows, recipe, bannedResultCopy) {
  expect(transcript && typeof transcript === 'object', 'receiptValidator.reviewTranscript missing');
  expect(transcript.status === 'h10-validator-review-transcript-contract', 'receiptValidator.reviewTranscript.status mismatch');
  expect(/local H10 validation review transcript/i.test(transcript.purpose || ''), 'receiptValidator.reviewTranscript.purpose should name local H10 validation review transcript');
  expect(transcript.appOwned === true, 'receiptValidator.reviewTranscript.appOwned should be true');
  expect(transcript.activeHandoff === 'H10', 'receiptValidator.reviewTranscript.activeHandoff should be H10');
  expect(transcript.localOnly === true, 'receiptValidator.reviewTranscript.localOnly should be true');
  expect(transcript.noServerAuthority === true, 'receiptValidator.reviewTranscript.noServerAuthority should be true');
  expect(transcript.h10DrainableFromTranscriptAlone === false, 'receiptValidator.reviewTranscript should not drain H10 alone');
  expect(transcript.schema === 'h10-validator-review-transcript-v1', 'receiptValidator.reviewTranscript.schema mismatch');
  expect(transcript.validatorPointer === 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator', 'receiptValidator.reviewTranscript.validatorPointer mismatch');
  expect(transcript.resultCopyPointer === 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.resultCopy', 'receiptValidator.reviewTranscript.resultCopyPointer mismatch');
  expect(transcript.receiptTemplatePointer === 'provenanceDisplayContract.drainContract.receiptTemplate', 'receiptValidator.reviewTranscript.receiptTemplatePointer mismatch');
  expect(transcript.resultSchemaPointer === recipe?.outputContract?.schema, 'receiptValidator.reviewTranscript.resultSchemaPointer mismatch');

  const max = transcript.maxLengths || {};
  expect(max.title === 80 && max.sectionLabel === 48 && max.instruction === 160 && max.line === 220 && max.handoffRule === 100, 'receiptValidator.reviewTranscript.maxLengths mismatch');

  const expectedSectionIds = ['context', 'validator-result', 'issues', 'scenario-evidence', 'step-evidence', 'handoff-boundary'];
  const sections = transcript.sections || [];
  expect(JSON.stringify(sections.map(row => row.id)) === JSON.stringify(expectedSectionIds), 'receiptValidator.reviewTranscript.sections order mismatch');
  const sectionById = new Map(sections.map(row => [row.id, row]));
  for (const sectionId of expectedSectionIds) {
    const section = sectionById.get(sectionId);
    expect(Boolean(section), `receiptValidator.reviewTranscript.sections missing ${sectionId}`);
    if (!section) continue;
    expect(stringLengthOk(section.label, max.sectionLabel), `${sectionId}: transcript section label too long or missing`);
    expect(stringLengthOk(section.instruction, max.instruction), `${sectionId}: transcript section instruction too long or missing`);
    for (const field of ['label', 'instruction']) {
      expect(!bannedResultCopy.test(section[field] || ''), `${sectionId}: transcript section ${field} overclaims`);
    }
  }

  const receiptContract = drainContract?.receiptContract || {};
  for (const field of ['schema', 'createdAt', 'channel', 'buildHash', 'contractStatus', 'finalDecision']) {
    expect((sectionById.get('context')?.includeFields || []).includes(field), `receiptValidator.reviewTranscript.context missing ${field}`);
  }
  for (const field of ['state', 'readyToDrain', 'label', 'headline', 'body', 'action']) {
    expect((sectionById.get('validator-result')?.includeFields || []).includes(field), `receiptValidator.reviewTranscript.validator-result missing ${field}`);
  }
  for (const field of ['code', 'severity', 'label', 'message', 'repairHint', 'fixtureIds']) {
    expect((sectionById.get('issues')?.includeFields || []).includes(field), `receiptValidator.reviewTranscript.issues missing ${field}`);
  }
  expect(JSON.stringify(sectionById.get('scenario-evidence')?.includeFields || []) === JSON.stringify(receiptContract.perScenarioFields || []), 'receiptValidator.reviewTranscript.scenario-evidence fields mismatch');
  expect(JSON.stringify(sectionById.get('step-evidence')?.includeFields || []) === JSON.stringify(validator.rowRules?.stepFields || []), 'receiptValidator.reviewTranscript.step-evidence fields mismatch');
  for (const field of ['activeHandoff', 'handoffFile', 'localOnly', 'noServerAuthority', 'readyToDrain']) {
    expect((sectionById.get('handoff-boundary')?.includeFields || []).includes(field), `receiptValidator.reviewTranscript.handoff-boundary missing ${field}`);
  }

  const stateSummaries = transcript.stateSummaries || [];
  expect(stateSummaries.length === states.length, 'receiptValidator.reviewTranscript.stateSummaries count mismatch');
  const summaryByState = new Map(stateSummaries.map(row => [row.state, row]));
  for (const state of states) {
    const summary = summaryByState.get(state.state);
    expect(Boolean(summary), `receiptValidator.reviewTranscript.stateSummaries missing ${state.state}`);
    if (!summary) continue;
    expect(summary.readyToDrain === state.readyToDrain, `${state.state}: transcript readyToDrain mismatch`);
    for (const field of ['label', 'headline', 'body', 'action']) {
      expect(summary[field] === state[field], `${state.state}: transcript ${field} should mirror resultCopy`);
      expect(!bannedResultCopy.test(summary[field] || ''), `${state.state}: transcript ${field} overclaims`);
    }
    expect(stringLengthOk(summary.transcriptLine, max.line), `${state.state}: transcriptLine too long or missing`);
    expect(!bannedResultCopy.test(summary.transcriptLine || ''), `${state.state}: transcriptLine overclaims`);
    expect(stringLengthOk(summary.handoffRule, max.handoffRule), `${state.state}: handoffRule too long or missing`);
    expect(/app\/design/i.test(summary.handoffRule || '') && /CONTENT-HANDOFF\.md/i.test(summary.handoffRule || ''), `${state.state}: handoffRule should leave movement to app/design`);
  }

  const issueRows = transcript.issueRows || [];
  expect(issueRows.length === copyRows.length, 'receiptValidator.reviewTranscript.issueRows count mismatch');
  const issueByCode = new Map(issueRows.map(row => [row.code, row]));
  for (const copy of copyRows) {
    const issue = issueByCode.get(copy.code);
    expect(Boolean(issue), `receiptValidator.reviewTranscript.issueRows missing ${copy.code}`);
    if (!issue) continue;
    for (const field of ['severity', 'label', 'message', 'repairHint']) {
      expect(issue[field] === copy[field], `${copy.code}: transcript issue ${field} should mirror resultCopy`);
      expect(!bannedResultCopy.test(issue[field] || ''), `${copy.code}: transcript issue ${field} overclaims`);
    }
    expect(JSON.stringify(issue.fixtureIds || []) === JSON.stringify(copy.fixtureIds || []), `${copy.code}: transcript issue fixtureIds mismatch`);
    expect(stringLengthOk(issue.transcriptLine, max.line), `${copy.code}: transcript issue line too long or missing`);
    expect(!bannedResultCopy.test(issue.transcriptLine || ''), `${copy.code}: transcript issue line overclaims`);
  }

  const fixtureCases = validator.fixtureCases || [];
  const fixturePackets = transcript.fixturePackets || [];
  expect(fixturePackets.length === fixtureCases.length, 'receiptValidator.reviewTranscript.fixturePackets count mismatch');
  const packetByFixture = new Map(fixturePackets.map(row => [row.fixtureId, row]));
  const expectedSectionIdsFromTranscript = sections.map(row => row.id);
  for (const fixture of fixtureCases) {
    const packet = packetByFixture.get(fixture.id);
    expect(Boolean(packet), `receiptValidator.reviewTranscript.fixturePackets missing ${fixture.id}`);
    if (!packet) continue;
    const expectedState = fixture.expectValid === false ? 'invalid' : fixture.attemptedFinalStatus;
    const expectedSummary = summaryByState.get(expectedState) || {};
    const expectedCodes = fixture.expectValid === false && fixture.reasonCode ? [fixture.reasonCode] : [];
    const expectedLabels = expectedCodes.map(code => issueByCode.get(code)?.label).filter(Boolean);
    const expectedHints = expectedCodes.map(code => issueByCode.get(code)?.repairHint).filter(Boolean);
    expect(packet.expectedState === expectedState, `${fixture.id}: transcript fixture expectedState mismatch`);
    expect(packet.sourceAttemptedFinalStatus === fixture.attemptedFinalStatus, `${fixture.id}: transcript fixture sourceAttemptedFinalStatus mismatch`);
    expect(packet.sourceReadyToDrain === fixture.readyToDrain, `${fixture.id}: transcript fixture sourceReadyToDrain mismatch`);
    expect(packet.expectedReadyToDrain === expectedSummary.readyToDrain, `${fixture.id}: transcript fixture expectedReadyToDrain mismatch`);
    expect(stringLengthOk(packet.expectedTitle, max.title), `${fixture.id}: transcript fixture expectedTitle too long or missing`);
    expect(/H10/i.test(packet.expectedTitle || '') && (packet.expectedTitle || '').includes(expectedSummary.label || ''), `${fixture.id}: transcript fixture expectedTitle should name H10 and state label`);
    expect(JSON.stringify(packet.expectedSections || []) === JSON.stringify(expectedSectionIdsFromTranscript), `${fixture.id}: transcript fixture expectedSections mismatch`);
    expect(JSON.stringify(packet.expectedIssueCodes || []) === JSON.stringify(expectedCodes), `${fixture.id}: transcript fixture expectedIssueCodes mismatch`);
    expect(JSON.stringify(packet.expectedIssueLabels || []) === JSON.stringify(expectedLabels), `${fixture.id}: transcript fixture expectedIssueLabels mismatch`);
    expect(JSON.stringify(packet.expectedRepairHints || []) === JSON.stringify(expectedHints), `${fixture.id}: transcript fixture expectedRepairHints mismatch`);
    expect(packet.expectedHandoffRule === expectedSummary.handoffRule, `${fixture.id}: transcript fixture expectedHandoffRule mismatch`);
    expect(/app\/design/i.test(packet.expectedHandoffRule || '') && /CONTENT-HANDOFF\.md/i.test(packet.expectedHandoffRule || ''), `${fixture.id}: transcript fixture handoff rule should leave movement to app/design`);
    if (fixture.expectValid === false) {
      expect(packet.expectedState === 'invalid', `${fixture.id}: invalid transcript fixture should use invalid state`);
      expect(packet.expectedIssueCodes.length >= 1, `${fixture.id}: invalid transcript fixture should name issue codes`);
    } else {
      expect(packet.expectedIssueCodes.length === 0, `${fixture.id}: valid transcript fixture should have no issue codes`);
    }
    const mustInclude = packet.mustInclude || [];
    expect(mustInclude.some(line => /sections/i.test(line) && /generated order/i.test(line)), `${fixture.id}: transcript fixture mustInclude should require section order`);
    expect(mustInclude.some(line => /resultCopy/i.test(line)), `${fixture.id}: transcript fixture mustInclude should mirror resultCopy`);
    expect(mustInclude.some(line => /Issue rows/i.test(line)), `${fixture.id}: transcript fixture mustInclude should put issues first`);
    const packetMustNot = packet.mustNot || [];
    expect(packetMustNot.some(line => /upload/i.test(line) && /automatically/i.test(line)), `${fixture.id}: transcript fixture mustNot should reject automatic upload`);
    expect(packetMustNot.some(line => /drain H10/i.test(line)), `${fixture.id}: transcript fixture mustNot should reject fixture-only drain`);
    expect(packetMustNot.some(line => /screenshots/i.test(line) && /analytics identifiers/i.test(line)), `${fixture.id}: transcript fixture mustNot should forbid private fields`);
    for (const value of [
      packet.expectedTitle,
      packet.expectedHandoffRule,
      ...(packet.expectedIssueLabels || []),
      ...(packet.expectedRepairHints || []),
      ...mustInclude,
      ...packetMustNot
    ]) {
      expect(!bannedResultCopy.test(value || ''), `${fixture.id}: transcript fixture copy overclaims`);
    }
  }

  const runtimeAssertions = transcript.runtimeAssertions || [];
  expect(runtimeAssertions.length === fixturePackets.length, 'receiptValidator.reviewTranscript.runtimeAssertions count mismatch');
  const assertionByFixture = new Map(runtimeAssertions.map(row => [row.fixtureId, row]));
  for (const packet of fixturePackets) {
    const assertion = assertionByFixture.get(packet.fixtureId);
    expect(Boolean(assertion), `${packet.fixtureId}: transcript runtime assertion missing`);
    if (!assertion) continue;
    expect(assertion.mode === 'local-transcript-render-smoke', `${packet.fixtureId}: transcript runtime assertion mode mismatch`);
    expect(assertion.expectedTitle === packet.expectedTitle, `${packet.fixtureId}: transcript runtime assertion expectedTitle mismatch`);
    expect(assertion.expectedState === packet.expectedState, `${packet.fixtureId}: transcript runtime assertion expectedState mismatch`);
    expect(assertion.expectedReadyToDrain === packet.expectedReadyToDrain, `${packet.fixtureId}: transcript runtime assertion expectedReadyToDrain mismatch`);
    expect(JSON.stringify(assertion.expectedSectionIds || []) === JSON.stringify(packet.expectedSections || []), `${packet.fixtureId}: transcript runtime assertion expectedSectionIds mismatch`);
    expect(assertion.expectedIssueCount === (packet.expectedIssueCodes || []).length, `${packet.fixtureId}: transcript runtime assertion expectedIssueCount mismatch`);
    expect(JSON.stringify(assertion.expectedIssueCodes || []) === JSON.stringify(packet.expectedIssueCodes || []), `${packet.fixtureId}: transcript runtime assertion expectedIssueCodes mismatch`);
    const assertionLines = assertion.assertions || [];
    expect(assertionLines.length >= 6, `${packet.fixtureId}: transcript runtime assertion should include enough checks`);
    expect(assertionLines.some(line => /title/i.test(line) && /expectedTitle/.test(line)), `${packet.fixtureId}: transcript runtime assertion should check title`);
    expect(assertionLines.some(line => /sections/i.test(line) && /order/i.test(line)), `${packet.fixtureId}: transcript runtime assertion should check section order`);
    expect(assertionLines.some(line => /Issue rows/i.test(line) && /before/i.test(line)), `${packet.fixtureId}: transcript runtime assertion should keep issues before ready copy`);
    expect(assertionLines.some(line => /local receipt only/i.test(line) && /app\/design/i.test(line)), `${packet.fixtureId}: transcript runtime assertion should keep handoff boundary`);
    expect(assertionLines.some(line => /forbidden privacy fields/i.test(line)), `${packet.fixtureId}: transcript runtime assertion should check redaction`);
    expect(assertionLines.some(line => /upload/i.test(line) && /drain H10/i.test(line)), `${packet.fixtureId}: transcript runtime assertion should reject upload and drain`);
    const assertionMustNot = assertion.mustNot || [];
    expect(assertionMustNot.some(line => /drain decision/i.test(line)), `${packet.fixtureId}: transcript runtime assertion mustNot should reject drain decisions`);
    expect(assertionMustNot.some(line => /upload/i.test(line)), `${packet.fixtureId}: transcript runtime assertion mustNot should reject upload`);
    expect(assertionMustNot.some(line => /screenshots/i.test(line) && /analytics identifiers/i.test(line)), `${packet.fixtureId}: transcript runtime assertion mustNot should forbid private fields`);
    for (const value of [
      assertion.expectedTitle,
      assertion.expectedState,
      ...(assertion.expectedSectionIds || []),
      ...(assertion.expectedIssueCodes || []),
      ...assertionLines,
      ...assertionMustNot
    ]) {
      expect(!bannedResultCopy.test(value || ''), `${packet.fixtureId}: transcript runtime assertion copy overclaims`);
    }
  }

  const smokeReceipt = transcript.runtimeAssertionReceiptTemplate || {};
  expect(smokeReceipt.schema === 'h10-transcript-smoke-receipt-v1', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.schema mismatch');
  expect(smokeReceipt.createdAt === null, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.createdAt should stay blank');
  expect(smokeReceipt.channel === 'local-review', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.channel should be local-review');
  expect(smokeReceipt.buildHash === null, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.buildHash should stay blank');
  expect(smokeReceipt.activeHandoff === 'H10', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.activeHandoff should be H10');
  expect(smokeReceipt.contractPointer === 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.contractPointer mismatch');
  expect(smokeReceipt.runtimeAssertionsPointer === 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertions', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.runtimeAssertionsPointer mismatch');
  expect(smokeReceipt.localOnly === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.localOnly should be true');
  expect(smokeReceipt.noServerAuthority === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.noServerAuthority should be true');
  expect(smokeReceipt.h10DrainableFromReceiptAlone === false, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate should not drain H10 alone');
  const smokeRows = smokeReceipt.fixtureResults || [];
  expect(smokeRows.length === runtimeAssertions.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.fixtureResults count mismatch');
  const smokeByFixture = new Map(smokeRows.map(row => [row.fixtureId, row]));
  for (const assertion of runtimeAssertions) {
    const row = smokeByFixture.get(assertion.fixtureId);
    expect(Boolean(row), `${assertion.fixtureId}: transcript smoke receipt row missing`);
    if (!row) continue;
    expect(row.mode === assertion.mode, `${assertion.fixtureId}: transcript smoke receipt mode mismatch`);
    expect(row.expectedTitle === assertion.expectedTitle, `${assertion.fixtureId}: transcript smoke receipt expectedTitle mismatch`);
    expect(row.expectedState === assertion.expectedState, `${assertion.fixtureId}: transcript smoke receipt expectedState mismatch`);
    expect(row.expectedReadyToDrain === assertion.expectedReadyToDrain, `${assertion.fixtureId}: transcript smoke receipt expectedReadyToDrain mismatch`);
    expect(JSON.stringify(row.expectedSectionIds || []) === JSON.stringify(assertion.expectedSectionIds || []), `${assertion.fixtureId}: transcript smoke receipt expectedSectionIds mismatch`);
    expect(row.expectedIssueCount === assertion.expectedIssueCount, `${assertion.fixtureId}: transcript smoke receipt expectedIssueCount mismatch`);
    expect(JSON.stringify(row.expectedIssueCodes || []) === JSON.stringify(assertion.expectedIssueCodes || []), `${assertion.fixtureId}: transcript smoke receipt expectedIssueCodes mismatch`);
    expect(row.observedTitle === null, `${assertion.fixtureId}: transcript smoke receipt observedTitle should stay blank`);
    expect(Array.isArray(row.observedSectionIds) && row.observedSectionIds.length === 0, `${assertion.fixtureId}: transcript smoke receipt observedSectionIds should stay blank`);
    expect(Array.isArray(row.observedIssueCodes) && row.observedIssueCodes.length === 0, `${assertion.fixtureId}: transcript smoke receipt observedIssueCodes should stay blank`);
    expect(row.observedReadyToDrain === null, `${assertion.fixtureId}: transcript smoke receipt observedReadyToDrain should stay blank`);
    expect(row.passed === null, `${assertion.fixtureId}: transcript smoke receipt passed should stay blank`);
    expect(row.notes === '', `${assertion.fixtureId}: transcript smoke receipt notes should start empty`);
    expect(row.recordedAt === null, `${assertion.fixtureId}: transcript smoke receipt recordedAt should stay blank`);
    expect(JSON.stringify(row.mustNot || []) === JSON.stringify(assertion.mustNot || []), `${assertion.fixtureId}: transcript smoke receipt mustNot mismatch`);
    expect(!hasOwn(row, 'screenshot') && !hasOwn(row, 'userValues') && !hasOwn(row, 'personalBrowsingHistory') && !hasOwn(row, 'analyticsIdentifiers'), `${assertion.fixtureId}: transcript smoke receipt must not include private fields`);
    for (const value of [
      row.expectedTitle,
      row.expectedState,
      ...(row.expectedSectionIds || []),
      ...(row.expectedIssueCodes || []),
      ...(row.mustNot || [])
    ]) {
      expect(!bannedResultCopy.test(value || ''), `${assertion.fixtureId}: transcript smoke receipt copy overclaims`);
    }
  }
  expect(smokeReceipt.summary?.totalFixtures === runtimeAssertions.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.summary.totalFixtures mismatch');
  expect(smokeReceipt.summary?.passedFixtures === 0, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.summary.passedFixtures should start at 0');
  expect(smokeReceipt.summary?.failedFixtures === 0, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.summary.failedFixtures should start at 0');
  expect(smokeReceipt.summary?.blockedFixtures === 0, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.summary.blockedFixtures should start at 0');
  expect(smokeReceipt.summary?.readyForH10Review === false, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.summary.readyForH10Review should start false');
  expect(smokeReceipt.finalDecision?.status === 'pending', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.finalDecision.status should be pending');
  expect(smokeReceipt.finalDecision?.decidedBy === 'app/design', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.finalDecision.decidedBy should be app/design');
  expect(smokeReceipt.finalDecision?.decidedAt === null, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.finalDecision.decidedAt should stay blank');
  expect(smokeReceipt.finalDecision?.readyToDrainH10 === false, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.finalDecision.readyToDrainH10 should start false');
  expect((smokeReceipt.finalDecision?.remainingBlockers || []).some(line => /CONTENT-HANDOFF\.md/i.test(line) && /App\/design/i.test(line)), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.finalDecision should name app/design handoff blocker');
  const smokeRedaction = smokeReceipt.redactionRules || {};
  expect(JSON.stringify(smokeRedaction.forbiddenFields || []) === JSON.stringify(tracker?.storage?.forbiddenFields || []), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.redactionRules.forbiddenFields mismatch');
  expect(smokeRedaction.recursiveForbidden === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.redactionRules.recursiveForbidden should be true');
  expect(smokeRedaction.noAutomaticSend === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.redactionRules.noAutomaticSend should be true');
  expect(smokeRedaction.noScreenshots === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.redactionRules.noScreenshots should be true');
  expect(smokeRedaction.noUserValues === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.redactionRules.noUserValues should be true');
  expect(smokeRedaction.noAnalyticsIdentifiers === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.redactionRules.noAnalyticsIdentifiers should be true');
  const smokeMustInclude = smokeReceipt.mustInclude || [];
  expect(smokeMustInclude.some(line => /every generated runtime assertion/i.test(line)), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.mustInclude should require every assertion');
  expect(smokeMustInclude.some(line => /Observed title/i.test(line) && /issue codes/i.test(line)), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.mustInclude should name observed fields');
  expect(smokeMustInclude.some(line => /CONTENT-HANDOFF\.md/i.test(line)), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.mustInclude should name handoff file');
  const smokeMustNot = smokeReceipt.mustNot || [];
  expect(smokeMustNot.some(line => /upload/i.test(line) && /automatically/i.test(line)), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.mustNot should reject automatic upload');
  expect(smokeMustNot.some(line => /drains H10/i.test(line)), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.mustNot should reject receipt-only drain');
  expect(smokeMustNot.some(line => /screenshots/i.test(line) && /analytics identifiers/i.test(line)), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate.mustNot should forbid private fields');
  for (const value of [
    ...(smokeReceipt.finalDecision?.remainingBlockers || []),
    ...smokeMustInclude,
    ...smokeMustNot
  ]) {
    expect(!bannedResultCopy.test(value || ''), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate copy overclaims');
  }

  const smokeValidator = transcript.runtimeAssertionReceiptValidator || {};
  expect(smokeValidator.status === 'h10-transcript-smoke-receipt-validator-contract', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.status mismatch');
  expect(/Local validation recipe/i.test(smokeValidator.purpose || ''), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.purpose should name local validation');
  expect(smokeValidator.schema === 'h10-transcript-smoke-receipt-validator-v1', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.schema mismatch');
  expect(smokeValidator.appOwned === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.appOwned should be true');
  expect(smokeValidator.activeHandoff === 'H10', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.activeHandoff should be H10');
  expect(smokeValidator.validatesPointer === 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.validatesPointer mismatch');
  expect(smokeValidator.runtimeAssertionsPointer === 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertions', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.runtimeAssertionsPointer mismatch');
  expect(smokeValidator.resultSchema === 'h10-transcript-smoke-validation-result-v1', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultSchema mismatch');
  expect(smokeValidator.localOnly === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.localOnly should be true');
  expect(smokeValidator.noServerAuthority === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.noServerAuthority should be true');
  expect(smokeValidator.h10DrainableFromValidatorAlone === false, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator should not drain H10 alone');

  const expectedSmokeTopLevelFields = [
    'schema', 'createdAt', 'channel', 'buildHash', 'activeHandoff', 'contractPointer',
    'runtimeAssertionsPointer', 'localOnly', 'noServerAuthority', 'h10DrainableFromReceiptAlone',
    'fixtureResults', 'summary', 'finalDecision', 'redactionRules', 'mustInclude', 'mustNot'
  ];
  const expectedSmokeRowFields = [
    'fixtureId', 'mode', 'expectedTitle', 'expectedState', 'expectedReadyToDrain',
    'expectedSectionIds', 'expectedIssueCount', 'expectedIssueCodes', 'observedTitle',
    'observedSectionIds', 'observedIssueCodes', 'observedReadyToDrain', 'passed',
    'notes', 'recordedAt', 'mustNot'
  ];
  const smokeShape = smokeValidator.requiredShape || {};
  expect(JSON.stringify(smokeShape.topLevelFields || []) === JSON.stringify(expectedSmokeTopLevelFields), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.requiredShape.topLevelFields mismatch');
  expect(JSON.stringify(smokeShape.fixtureResultFields || []) === JSON.stringify(expectedSmokeRowFields), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.requiredShape.fixtureResultFields mismatch');
  expect(smokeShape.fixtureResultCount === runtimeAssertions.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.requiredShape.fixtureResultCount mismatch');
  expect(JSON.stringify(smokeShape.fixtureIds || []) === JSON.stringify(runtimeAssertions.map(row => row.fixtureId)), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.requiredShape.fixtureIds mismatch');

  const smokeAlgorithm = smokeValidator.algorithm || [];
  const expectedSmokeAlgorithmIds = [
    'parse-local-smoke-receipt',
    'check-schema-and-boundary',
    'check-fixture-row-set',
    'compare-generated-expectations',
    'require-observed-transcript-fields',
    'compare-observed-transcript-fields',
    'scan-forbidden-fields',
    'compute-review-readiness',
    'preserve-app-design-final-decision'
  ];
  expect(JSON.stringify(smokeAlgorithm.map(row => row.id)) === JSON.stringify(expectedSmokeAlgorithmIds), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.algorithm ids mismatch');
  for (const [index, step] of smokeAlgorithm.entries()) {
    expect(step.step === index + 1, `${step.id || index}: smoke validator step number mismatch`);
    expect(typeof step.check === 'string' && step.check.length > 20, `${step.id || index}: smoke validator check missing`);
    expect(typeof step.failureCode === 'string' && step.failureCode.length > 3, `${step.id || index}: smoke validator failureCode missing`);
    expect(!bannedResultCopy.test(step.check || ''), `${step.id || index}: smoke validator check overclaims`);
  }
  const scanStep = smokeAlgorithm.find(row => row.id === 'scan-forbidden-fields') || {};
  expect(JSON.stringify(scanStep.forbiddenFields || []) === JSON.stringify(tracker?.storage?.forbiddenFields || []), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.scan-forbidden-fields forbiddenFields mismatch');
  expect((smokeAlgorithm.find(row => row.id === 'preserve-app-design-final-decision')?.check || '').match(/app\/design/i), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator final step should name app/design');

  const smokeErrorRows = smokeValidator.errorCodes || [];
  const expectedSmokeErrorCodes = [
    'malformed-smoke-receipt',
    'smoke-schema-mismatch',
    'fixture-row-count-mismatch',
    'generated-expectation-mismatch',
    'missing-observed-transcript-fields',
    'observed-transcript-mismatch',
    'forbidden-privacy-field',
    'summary-count-mismatch',
    'final-decision-overreach'
  ];
  expect(JSON.stringify(smokeErrorRows.map(row => row.code)) === JSON.stringify(expectedSmokeErrorCodes), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.errorCodes mismatch');
  const smokeErrorByCode = new Map(smokeErrorRows.map(row => [row.code, row]));
  for (const code of expectedSmokeErrorCodes) {
    const row = smokeErrorByCode.get(code) || {};
    expect(row.severity === 'error', `${code}: smoke validator error severity should be error`);
    expect(typeof row.message === 'string' && row.message.length > 20, `${code}: smoke validator error message missing`);
    expect(typeof row.repairHint === 'string' && row.repairHint.length > 20, `${code}: smoke validator repairHint missing`);
    expect(!bannedResultCopy.test(row.message || ''), `${code}: smoke validator error message overclaims`);
    expect(!bannedResultCopy.test(row.repairHint || ''), `${code}: smoke validator repairHint overclaims`);
  }
  for (const step of smokeAlgorithm) {
    expect(smokeErrorByCode.has(step.failureCode), `${step.id}: smoke validator failureCode should map to errorCodes`);
  }
  expect(/generated runtime assertion/i.test(smokeErrorByCode.get('fixture-row-count-mismatch')?.message || ''), 'fixture-row-count-mismatch should name generated runtime assertions');
  expect(/observed title/i.test(smokeErrorByCode.get('missing-observed-transcript-fields')?.repairHint || ''), 'missing-observed-transcript-fields should name observed fields');
  expect(/screenshots/i.test(smokeErrorByCode.get('forbidden-privacy-field')?.repairHint || '') && /analytics identifiers/i.test(smokeErrorByCode.get('forbidden-privacy-field')?.repairHint || ''), 'forbidden-privacy-field should name private fields');
  expect(/CONTENT-HANDOFF\.md/i.test(smokeErrorByCode.get('final-decision-overreach')?.repairHint || ''), 'final-decision-overreach should point to handoff');

  const smokeFixtureCases = smokeValidator.fixtureCases || [];
  const expectedSmokeFixtureIds = [
    'blank-smoke-template-pending',
    'all-smoke-fixtures-pass',
    'one-smoke-fixture-failed-with-note',
    'not-json-smoke-input',
    'schema-boundary-mismatch',
    'missing-smoke-fixture-row',
    'expected-title-edited',
    'passed-row-missing-observed-fields',
    'passed-row-observed-mismatch',
    'smoke-receipt-privacy-field-leak',
    'smoke-summary-count-drift',
    'smoke-final-decision-overreach'
  ];
  expect(JSON.stringify(smokeFixtureCases.map(row => row.id)) === JSON.stringify(expectedSmokeFixtureIds), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.fixtureCases ids mismatch');
  const smokeFixtureById = new Map(smokeFixtureCases.map(row => [row.id, row]));
  const firstSmokeFixtureId = runtimeAssertions[0]?.fixtureId;
  for (const fixture of smokeFixtureCases) {
    expect(typeof fixture.description === 'string' && fixture.description.length > 30, `${fixture.id || '(missing)'}: smoke fixture description missing`);
    expect(typeof fixture.expectValid === 'boolean', `${fixture.id || '(missing)'}: smoke fixture expectValid should be boolean`);
    expect(typeof fixture.expectReadyForH10Review === 'boolean', `${fixture.id || '(missing)'}: smoke fixture expectReadyForH10Review should be boolean`);
    expect(typeof fixture.inputKind === 'string' && fixture.inputKind.length > 3, `${fixture.id || '(missing)'}: smoke fixture inputKind missing`);
    const expectedCodes = fixture.expectedErrorCodes || [];
    for (const code of expectedCodes) {
      expect(smokeErrorByCode.has(code), `${fixture.id}: smoke fixture expectedErrorCode ${code} should map to validator errorCodes`);
    }
    if (fixture.expectValid) {
      expect(expectedCodes.length === 0, `${fixture.id}: valid smoke fixture should not expect errors`);
    } else {
      expect(expectedCodes.length >= 1, `${fixture.id}: invalid smoke fixture should expect at least one error`);
      expect(typeof fixture.mustFailBecause === 'string' && fixture.mustFailBecause.length > 20, `${fixture.id}: invalid smoke fixture should explain failure`);
    }
    for (const value of [
      fixture.description,
      fixture.inputKind,
      fixture.rowState,
      fixture.mustFailBecause,
      ...(fixture.mustHold || []),
      ...(fixture.expectedErrorCodes || []),
      ...(fixture.fixtureIds || [])
    ]) {
      expect(!bannedResultCopy.test(value || ''), `${fixture.id}: smoke fixture copy overclaims`);
    }
  }

  const blankSmoke = smokeFixtureById.get('blank-smoke-template-pending') || {};
  expect(blankSmoke.expectValid === true && blankSmoke.expectReadyForH10Review === false, 'blank smoke fixture should be valid but not ready');
  expect(blankSmoke.rowState === 'all-blank', 'blank smoke fixture rowState mismatch');
  expect(blankSmoke.summary?.passedFixtures === 0 && blankSmoke.summary?.readyForH10Review === false, 'blank smoke fixture summary mismatch');
  expect((blankSmoke.mustHold || []).some(line => /Blank observed fields/i.test(line)), 'blank smoke fixture should allow blank observed fields');

  const allPassSmoke = smokeFixtureById.get('all-smoke-fixtures-pass') || {};
  expect(allPassSmoke.expectValid === true && allPassSmoke.expectReadyForH10Review === true, 'all-pass smoke fixture should be valid and ready for review');
  expect(JSON.stringify(allPassSmoke.fixtureIds || []) === JSON.stringify(runtimeAssertions.map(row => row.fixtureId)), 'all-pass smoke fixture should include every runtime assertion fixture');
  expect(allPassSmoke.summary?.passedFixtures === runtimeAssertions.length && allPassSmoke.summary?.failedFixtures === 0 && allPassSmoke.summary?.readyForH10Review === true, 'all-pass smoke fixture summary mismatch');
  expect(allPassSmoke.finalDecision?.readyToDrainH10 === false, 'all-pass smoke fixture should not move H10 directly');
  expect((allPassSmoke.mustHold || []).some(line => /app\/design evidence/i.test(line)), 'all-pass smoke fixture should keep app/design boundary');

  const failedSmoke = smokeFixtureById.get('one-smoke-fixture-failed-with-note') || {};
  expect(failedSmoke.expectValid === true && failedSmoke.expectReadyForH10Review === false, 'failed smoke fixture should be valid but not ready');
  expect(JSON.stringify(failedSmoke.fixtureIds || []) === JSON.stringify(firstSmokeFixtureId ? [firstSmokeFixtureId] : []), 'failed smoke fixture should name first fixture');
  expect(failedSmoke.summary?.failedFixtures === 1 && failedSmoke.summary?.readyForH10Review === false, 'failed smoke fixture summary mismatch');
  expect((failedSmoke.mustHold || []).some(line => /notes/i.test(line)), 'failed smoke fixture should require notes');

  expect(smokeFixtureById.get('not-json-smoke-input')?.inputKind === 'not-json', 'not-json smoke fixture inputKind mismatch');
  expect(JSON.stringify(smokeFixtureById.get('not-json-smoke-input')?.expectedErrorCodes || []) === JSON.stringify(['malformed-smoke-receipt']), 'not-json smoke fixture error mismatch');
  const schemaCase = smokeFixtureById.get('schema-boundary-mismatch') || {};
  expect(JSON.stringify(schemaCase.expectedErrorCodes || []) === JSON.stringify(['smoke-schema-mismatch']), 'schema smoke fixture error mismatch');
  expect(schemaCase.mutation?.localOnly === false && schemaCase.mutation?.noServerAuthority === false, 'schema smoke fixture should mutate local/no-server boundary');
  const missingRow = smokeFixtureById.get('missing-smoke-fixture-row') || {};
  expect(JSON.stringify(missingRow.expectedErrorCodes || []) === JSON.stringify(['fixture-row-count-mismatch']), 'missing row smoke fixture error mismatch');
  expect(missingRow.mutation?.missingFixtureId === firstSmokeFixtureId, 'missing row smoke fixture should name missing first fixture');
  expect(missingRow.mutation?.expectedFixtureCount === runtimeAssertions.length, 'missing row smoke fixture expected count mismatch');
  expect(missingRow.mutation?.observedFixtureCount === Math.max(runtimeAssertions.length - 1, 0), 'missing row smoke fixture observed count mismatch');
  const expectedEdited = smokeFixtureById.get('expected-title-edited') || {};
  expect(JSON.stringify(expectedEdited.expectedErrorCodes || []) === JSON.stringify(['generated-expectation-mismatch']), 'expected-title smoke fixture error mismatch');
  expect(/Edited local title/i.test(expectedEdited.mutation?.expectedTitle || ''), 'expected-title smoke fixture should mutate expectedTitle');
  const missingObserved = smokeFixtureById.get('passed-row-missing-observed-fields') || {};
  expect(JSON.stringify(missingObserved.expectedErrorCodes || []) === JSON.stringify(['missing-observed-transcript-fields']), 'missing observed smoke fixture error mismatch');
  for (const field of ['observedTitle', 'observedSectionIds', 'observedIssueCodes', 'observedReadyToDrain', 'recordedAt']) {
    expect((missingObserved.mutation?.missingFields || []).includes(field), `missing observed smoke fixture should name ${field}`);
  }
  const observedMismatch = smokeFixtureById.get('passed-row-observed-mismatch') || {};
  expect(JSON.stringify(observedMismatch.expectedErrorCodes || []) === JSON.stringify(['observed-transcript-mismatch']), 'observed mismatch smoke fixture error mismatch');
  expect(/Different local transcript title/i.test(observedMismatch.mutation?.observedTitle || ''), 'observed mismatch smoke fixture should mutate observedTitle');
  const privacySmoke = smokeFixtureById.get('smoke-receipt-privacy-field-leak') || {};
  expect(JSON.stringify(privacySmoke.expectedErrorCodes || []) === JSON.stringify(['forbidden-privacy-field']), 'privacy smoke fixture error mismatch');
  expect((tracker?.storage?.forbiddenFields || []).includes(privacySmoke.containsForbiddenField), 'privacy smoke fixture should name a forbidden field');
  expect(JSON.stringify(privacySmoke.forbiddenFields || []) === JSON.stringify(tracker?.storage?.forbiddenFields || []), 'privacy smoke fixture forbidden fields mismatch');
  expect(privacySmoke.recursiveForbidden === true, 'privacy smoke fixture should require recursive checks');
  const summaryDrift = smokeFixtureById.get('smoke-summary-count-drift') || {};
  expect(JSON.stringify(summaryDrift.expectedErrorCodes || []) === JSON.stringify(['summary-count-mismatch']), 'summary drift smoke fixture error mismatch');
  expect(summaryDrift.mutation?.readyForH10Review === true && summaryDrift.mutation?.passedFixtures === 0, 'summary drift smoke fixture should mutate summary counts');
  const finalOverreach = smokeFixtureById.get('smoke-final-decision-overreach') || {};
  expect(JSON.stringify(finalOverreach.expectedErrorCodes || []) === JSON.stringify(['final-decision-overreach']), 'final overreach smoke fixture error mismatch');
  expect(finalOverreach.mutation?.readyToDrainH10 === true, 'final overreach smoke fixture should try to move H10');

  const smokeResultCopy = smokeValidator.resultCopy || {};
  expect(smokeResultCopy.status === 'h10-transcript-smoke-validation-copy-contract', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy.status mismatch');
  expect(/local transcript smoke receipt validation/i.test(smokeResultCopy.purpose || ''), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy.purpose should name local transcript smoke validation');
  expect(smokeResultCopy.schema === 'h10-transcript-smoke-validation-copy-v1', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy.schema mismatch');
  expect(smokeResultCopy.localOnly === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy.localOnly should be true');
  expect(smokeResultCopy.noServerAuthority === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy.noServerAuthority should be true');
  const smokeDisplayRules = smokeResultCopy.displayRules || [];
  expect(smokeDisplayRules.length >= 5, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy.displayRules should be complete');
  expect(smokeDisplayRules.some(line => /error codes/i.test(line)), 'smoke result copy should show errors first');
  expect(smokeDisplayRules.some(line => /local/i.test(line) && /uploaded/i.test(line)), 'smoke result copy should say local/not uploaded');
  expect(smokeDisplayRules.some(line => /ready for app\/design smoke review/i.test(line)), 'smoke result copy should bound ready wording');
  expect(smokeDisplayRules.some(line => /CONTENT-HANDOFF\.md/i.test(line)), 'smoke result copy should name handoff');
  expect(smokeDisplayRules.some(line => /screenshots/i.test(line) && /analytics identifiers/i.test(line)), 'smoke result copy should forbid privacy fields');
  for (const line of smokeDisplayRules) {
    expect(!bannedResultCopy.test(line || ''), `smoke result copy displayRule overclaims: ${line}`);
  }

  const smokeStates = smokeResultCopy.resultStates || [];
  const expectedSmokeStates = ['pending-smoke-template', 'not-ready-for-h10-review', 'ready-for-h10-review', 'invalid'];
  expect(JSON.stringify(smokeStates.map(row => row.state)) === JSON.stringify(expectedSmokeStates), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy.resultStates mismatch');
  const smokeStateById = new Map(smokeStates.map(row => [row.state, row]));
  expect(smokeStateById.get('pending-smoke-template')?.readyForH10Review === false, 'pending smoke copy should not be ready');
  expect(smokeStateById.get('not-ready-for-h10-review')?.readyForH10Review === false, 'not-ready smoke copy should not be ready');
  expect(smokeStateById.get('ready-for-h10-review')?.readyForH10Review === true, 'ready smoke copy should be ready for review');
  expect(smokeStateById.get('invalid')?.readyForH10Review === false, 'invalid smoke copy should not be ready');
  expect(/app\/design/i.test(smokeStateById.get('ready-for-h10-review')?.body || '') && /CONTENT-HANDOFF\.md/i.test(smokeStateById.get('ready-for-h10-review')?.body || ''), 'ready smoke copy should keep app/design handoff boundary');
  for (const state of smokeStates) {
    for (const field of ['label', 'headline', 'body', 'action']) {
      expect(stringLengthOk(state[field], 180), `${state.state || '(missing)'}: smoke result state ${field} missing or too long`);
      expect(!bannedResultCopy.test(state[field] || ''), `${state.state || '(missing)'}: smoke result state ${field} overclaims`);
    }
  }

  const smokeCopyRows = smokeResultCopy.errorCopy || [];
  expect(JSON.stringify(smokeCopyRows.map(row => row.code)) === JSON.stringify(expectedSmokeErrorCodes), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy.errorCopy codes mismatch');
  const smokeCopyByCode = new Map(smokeCopyRows.map(row => [row.code, row]));
  for (const error of smokeErrorRows) {
    const copy = smokeCopyByCode.get(error.code) || {};
    expect(copy.severity === error.severity, `${error.code}: smoke result copy severity mismatch`);
    for (const field of ['label', 'message', 'repairHint']) {
      expect(stringLengthOk(copy[field], 180), `${error.code}: smoke result copy ${field} missing or too long`);
      expect(!bannedResultCopy.test(copy[field] || ''), `${error.code}: smoke result copy ${field} overclaims`);
    }
    const expectedFixtureIdsForCode = smokeFixtureCases
      .filter(fixture => (fixture.expectedErrorCodes || []).includes(error.code))
      .map(fixture => fixture.id);
    expect(JSON.stringify(copy.fixtureIds || []) === JSON.stringify(expectedFixtureIdsForCode), `${error.code}: smoke result copy fixtureIds mismatch`);
  }
  expect(/Private field/i.test(smokeCopyByCode.get('forbidden-privacy-field')?.label || ''), 'privacy smoke copy should label private field');
  expect(/CONTENT-HANDOFF\.md/i.test(smokeCopyByCode.get('final-decision-overreach')?.repairHint || ''), 'final overreach smoke copy should point to handoff');

  const smokeCopyExpectations = smokeResultCopy.fixtureCopyExpectations || [];
  expect(smokeCopyExpectations.length === smokeFixtureCases.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy.fixtureCopyExpectations count mismatch');
  const smokeCopyExpectationByFixture = new Map(smokeCopyExpectations.map(row => [row.fixtureId, row]));
  const smokeExpectedStateForFixture = fixture => {
    if (fixture.expectValid === false) return 'invalid';
    if (fixture.expectReadyForH10Review === true) return 'ready-for-h10-review';
    if (fixture.rowState === 'all-blank') return 'pending-smoke-template';
    return 'not-ready-for-h10-review';
  };
  for (const fixture of smokeFixtureCases) {
    const expected = smokeCopyExpectationByFixture.get(fixture.id) || {};
    expect(expected.expectedState === smokeExpectedStateForFixture(fixture), `${fixture.id}: smoke fixture copy expectedState mismatch`);
    expect(expected.expectedReadyForH10Review === fixture.expectReadyForH10Review, `${fixture.id}: smoke fixture copy readiness mismatch`);
    expect(JSON.stringify(expected.expectedErrorCodes || []) === JSON.stringify(fixture.expectedErrorCodes || []), `${fixture.id}: smoke fixture copy error codes mismatch`);
    expect(smokeStateById.has(expected.expectedState), `${fixture.id}: smoke fixture copy state should map to resultStates`);
  }
  const smokeResultMustNot = smokeResultCopy.mustNot || [];
  expect(smokeResultMustNot.some(line => /claim H10 is drained/i.test(line)), 'smoke result copy mustNot should reject drained claim');
  expect(smokeResultMustNot.some(line => /upload/i.test(line) && /automatically/i.test(line)), 'smoke result copy mustNot should reject automatic upload');
  expect(smokeResultMustNot.some(line => /privacy-field errors/i.test(line) && /warnings/i.test(line)), 'smoke result copy mustNot should keep privacy errors hard');
  for (const line of smokeResultMustNot) {
    expect(!bannedResultCopy.test(line || ''), `smoke result copy mustNot overclaims: ${line}`);
  }
  expect(smokeResultCopy.coverage?.resultStateCount === smokeStates.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy.coverage.resultStateCount mismatch');
  expect(smokeResultCopy.coverage?.errorCopyCount === smokeCopyRows.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy.coverage.errorCopyCount mismatch');
  expect(smokeResultCopy.coverage?.fixtureCopyExpectationCount === smokeCopyExpectations.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy.coverage.fixtureCopyExpectationCount mismatch');
  expect(smokeResultCopy.coverage?.localOnly === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy.coverage.localOnly should be true');

  const smokeReviewTranscript = smokeValidator.reviewTranscript || {};
  expect(smokeReviewTranscript.status === 'h10-transcript-smoke-validation-review-transcript-contract', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.status mismatch');
  expect(/transcript smoke validation results/i.test(smokeReviewTranscript.purpose || ''), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.purpose should name smoke validation results');
  expect(smokeReviewTranscript.schema === 'h10-transcript-smoke-validation-review-transcript-v1', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.schema mismatch');
  expect(smokeReviewTranscript.appOwned === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.appOwned should be true');
  expect(smokeReviewTranscript.activeHandoff === 'H10', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.activeHandoff should be H10');
  expect(smokeReviewTranscript.localOnly === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.localOnly should be true');
  expect(smokeReviewTranscript.noServerAuthority === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.noServerAuthority should be true');
  expect(smokeReviewTranscript.h10DrainableFromTranscriptAlone === false, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript should not drain H10 alone');
  expect(smokeReviewTranscript.validatorPointer === 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.validatorPointer mismatch');
  expect(smokeReviewTranscript.resultCopyPointer === 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy', 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.resultCopyPointer mismatch');
  expect(smokeReviewTranscript.resultSchemaPointer === smokeValidator.resultSchema, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.resultSchemaPointer mismatch');
  const smokeReviewSections = smokeReviewTranscript.sections || [];
  const expectedSmokeReviewSectionIds = ['context', 'validator-result', 'errors', 'fixture-evidence', 'handoff-boundary'];
  expect(JSON.stringify(smokeReviewSections.map(row => row.id)) === JSON.stringify(expectedSmokeReviewSectionIds), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.sections order mismatch');
  const smokeReviewSectionById = new Map(smokeReviewSections.map(row => [row.id, row]));
  const smokeReviewMax = smokeReviewTranscript.maxLengths || {};
  expect(smokeReviewMax.title === 88 && smokeReviewMax.sectionLabel === 48 && smokeReviewMax.instruction === 160 && smokeReviewMax.line === 220 && smokeReviewMax.handoffRule === 100, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.maxLengths mismatch');
  for (const sectionId of expectedSmokeReviewSectionIds) {
    const section = smokeReviewSectionById.get(sectionId) || {};
    expect(stringLengthOk(section.label, smokeReviewMax.sectionLabel), `${sectionId}: smoke review section label missing or too long`);
    expect(stringLengthOk(section.instruction, smokeReviewMax.instruction), `${sectionId}: smoke review section instruction missing or too long`);
    expect(!bannedResultCopy.test(section.label || ''), `${sectionId}: smoke review section label overclaims`);
    expect(!bannedResultCopy.test(section.instruction || ''), `${sectionId}: smoke review section instruction overclaims`);
  }
  for (const field of ['schema', 'createdAt', 'channel', 'buildHash', 'activeHandoff', 'summary', 'finalDecision']) {
    expect((smokeReviewSectionById.get('context')?.includeFields || []).includes(field), `smoke review context missing ${field}`);
  }
  for (const field of ['state', 'readyForH10Review', 'label', 'headline', 'body', 'action']) {
    expect((smokeReviewSectionById.get('validator-result')?.includeFields || []).includes(field), `smoke review validator-result missing ${field}`);
  }
  for (const field of ['code', 'severity', 'label', 'message', 'repairHint', 'fixtureIds']) {
    expect((smokeReviewSectionById.get('errors')?.includeFields || []).includes(field), `smoke review errors missing ${field}`);
  }
  expect(JSON.stringify(smokeReviewSectionById.get('fixture-evidence')?.includeFields || []) === JSON.stringify(expectedSmokeRowFields), 'smoke review fixture-evidence fields mismatch');
  for (const field of ['activeHandoff', 'handoffFile', 'localOnly', 'noServerAuthority', 'readyForH10Review']) {
    expect((smokeReviewSectionById.get('handoff-boundary')?.includeFields || []).includes(field), `smoke review handoff-boundary missing ${field}`);
  }

  const smokeReviewStates = smokeReviewTranscript.stateSummaries || [];
  expect(smokeReviewStates.length === smokeStates.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.stateSummaries count mismatch');
  const smokeReviewStateById = new Map(smokeReviewStates.map(row => [row.state, row]));
  for (const state of smokeStates) {
    const summary = smokeReviewStateById.get(state.state) || {};
    expect(summary.readyForH10Review === state.readyForH10Review, `${state.state}: smoke review state readiness mismatch`);
    for (const field of ['label', 'headline', 'body', 'action']) {
      expect(summary[field] === state[field], `${state.state}: smoke review state ${field} should mirror resultCopy`);
      expect(!bannedResultCopy.test(summary[field] || ''), `${state.state}: smoke review state ${field} overclaims`);
    }
    expect(stringLengthOk(summary.transcriptLine, smokeReviewMax.line), `${state.state}: smoke review transcriptLine missing or too long`);
    expect(/CONTENT-HANDOFF\.md/i.test(summary.handoffRule || ''), `${state.state}: smoke review handoffRule should name handoff`);
    expect(!bannedResultCopy.test(summary.transcriptLine || ''), `${state.state}: smoke review transcriptLine overclaims`);
  }

  const smokeReviewIssues = smokeReviewTranscript.issueRows || [];
  expect(smokeReviewIssues.length === smokeCopyRows.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.issueRows count mismatch');
  const smokeReviewIssueByCode = new Map(smokeReviewIssues.map(row => [row.code, row]));
  for (const copy of smokeCopyRows) {
    const issue = smokeReviewIssueByCode.get(copy.code) || {};
    for (const field of ['severity', 'label', 'message', 'repairHint']) {
      expect(issue[field] === copy[field], `${copy.code}: smoke review issue ${field} should mirror resultCopy`);
      expect(!bannedResultCopy.test(issue[field] || ''), `${copy.code}: smoke review issue ${field} overclaims`);
    }
    expect(JSON.stringify(issue.fixtureIds || []) === JSON.stringify(copy.fixtureIds || []), `${copy.code}: smoke review issue fixtureIds mismatch`);
    expect(stringLengthOk(issue.transcriptLine, smokeReviewMax.line), `${copy.code}: smoke review issue transcriptLine missing or too long`);
    expect(!bannedResultCopy.test(issue.transcriptLine || ''), `${copy.code}: smoke review issue transcriptLine overclaims`);
  }

  const smokeReviewFixturePackets = smokeReviewTranscript.fixturePackets || [];
  expect(smokeReviewFixturePackets.length === smokeFixtureCases.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.fixturePackets count mismatch');
  const smokeReviewPacketByFixture = new Map(smokeReviewFixturePackets.map(row => [row.fixtureId, row]));
  for (const fixture of smokeFixtureCases) {
    const packet = smokeReviewPacketByFixture.get(fixture.id) || {};
    const expectation = smokeCopyExpectationByFixture.get(fixture.id) || {};
    const expectedState = expectation.expectedState;
    const stateSummary = smokeReviewStateById.get(expectedState) || {};
    const expectedIssues = (fixture.expectedErrorCodes || []).map(code => smokeReviewIssueByCode.get(code) || {});
    expect(packet.expectedState === expectedState, `${fixture.id}: smoke review packet expectedState mismatch`);
    expect(packet.sourceInputKind === fixture.inputKind, `${fixture.id}: smoke review packet sourceInputKind mismatch`);
    expect((packet.sourceRowState || null) === (fixture.rowState || null), `${fixture.id}: smoke review packet sourceRowState mismatch`);
    expect(packet.expectedReadyForH10Review === fixture.expectReadyForH10Review, `${fixture.id}: smoke review packet readiness mismatch`);
    expect(packet.expectedTitle === `H10 transcript smoke validation - ${stateSummary.label}`, `${fixture.id}: smoke review packet title mismatch`);
    expect(JSON.stringify(packet.expectedSections || []) === JSON.stringify(expectedSmokeReviewSectionIds), `${fixture.id}: smoke review packet sections mismatch`);
    expect(JSON.stringify(packet.expectedIssueCodes || []) === JSON.stringify(fixture.expectedErrorCodes || []), `${fixture.id}: smoke review packet issue codes mismatch`);
    expect(JSON.stringify(packet.expectedIssueLabels || []) === JSON.stringify(expectedIssues.map(row => row.label).filter(Boolean)), `${fixture.id}: smoke review packet issue labels mismatch`);
    expect(JSON.stringify(packet.expectedRepairHints || []) === JSON.stringify(expectedIssues.map(row => row.repairHint).filter(Boolean)), `${fixture.id}: smoke review packet repair hints mismatch`);
    expect(packet.expectedHandoffRule === stateSummary.handoffRule, `${fixture.id}: smoke review packet handoff rule mismatch`);
    expect((packet.mustInclude || []).some(line => /generated order/i.test(line)), `${fixture.id}: smoke review packet should require generated order`);
    expect((packet.mustInclude || []).some(line => /resultCopy/i.test(line)), `${fixture.id}: smoke review packet should mirror resultCopy`);
    expect((packet.mustNot || []).some(line => /upload/i.test(line) && /automatically/i.test(line)), `${fixture.id}: smoke review packet should forbid upload`);
    expect((packet.mustNot || []).some(line => /drain H10/i.test(line)), `${fixture.id}: smoke review packet should forbid H10 drain`);
    expect((packet.mustNot || []).some(line => /screenshots/i.test(line) && /analytics identifiers/i.test(line)), `${fixture.id}: smoke review packet should forbid private fields`);
    for (const value of [
      packet.expectedTitle,
      packet.sourceInputKind,
      packet.sourceRowState,
      packet.expectedHandoffRule,
      ...(packet.expectedSections || []),
      ...(packet.expectedIssueCodes || []),
      ...(packet.expectedIssueLabels || []),
      ...(packet.expectedRepairHints || []),
      ...(packet.mustInclude || []),
      ...(packet.mustNot || [])
    ]) {
      expect(!bannedResultCopy.test(value || ''), `${fixture.id}: smoke review packet copy overclaims`);
    }
  }

  const smokeReviewTemplates = smokeReviewTranscript.lineTemplates || {};
  for (const [key, limit] of Object.entries({
    title: smokeReviewMax.title,
    stateLine: smokeReviewMax.line,
    issueLine: smokeReviewMax.line,
    fixtureLine: smokeReviewMax.line,
    boundaryLine: smokeReviewMax.line
  })) {
    expect(stringLengthOk(smokeReviewTemplates[key], limit), `receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.lineTemplates.${key} missing or too long`);
    expect(!bannedResultCopy.test(smokeReviewTemplates[key] || ''), `receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript.lineTemplates.${key} overclaims`);
  }
  expect(/H10 transcript smoke validation/i.test(smokeReviewTemplates.title || ''), 'smoke review title template should name H10 transcript smoke validation');
  expect(/Local smoke receipt only/i.test(smokeReviewTemplates.boundaryLine || '') && /automatic upload/i.test(smokeReviewTemplates.boundaryLine || '') && /app\/design/i.test(smokeReviewTemplates.boundaryLine || ''), 'smoke review boundaryLine should keep local/app-design boundary');

  const smokeReviewRedaction = smokeReviewTranscript.redactionRules || {};
  expect(JSON.stringify(smokeReviewRedaction.forbiddenFields || []) === JSON.stringify(tracker?.storage?.forbiddenFields || []), 'smoke review redaction forbiddenFields mismatch');
  expect(smokeReviewRedaction.recursiveForbidden === true, 'smoke review redaction recursiveForbidden should be true');
  expect(smokeReviewRedaction.noAutomaticSend === true, 'smoke review redaction noAutomaticSend should be true');
  expect(smokeReviewRedaction.noScreenshots === true, 'smoke review redaction noScreenshots should be true');
  expect(smokeReviewRedaction.noUserValues === true, 'smoke review redaction noUserValues should be true');
  expect(smokeReviewRedaction.noAnalyticsIdentifiers === true, 'smoke review redaction noAnalyticsIdentifiers should be true');
  expect(/personal browsing history/i.test(smokeReviewRedaction.notesRule || '') && /private values/i.test(smokeReviewRedaction.notesRule || ''), 'smoke review notesRule should bound notes');
  const smokeReviewMustInclude = smokeReviewTranscript.mustInclude || [];
  expect(smokeReviewMustInclude.some(line => /h10-transcript-smoke-validation-result-v1/i.test(line)), 'smoke review mustInclude should name result schema');
  expect(smokeReviewMustInclude.some(line => /error codes/i.test(line)), 'smoke review mustInclude should show errors first');
  expect(smokeReviewMustInclude.some(line => /pass\/fail counts/i.test(line)), 'smoke review mustInclude should include counts');
  expect(smokeReviewMustInclude.some(line => /CONTENT-HANDOFF\.md/i.test(line)), 'smoke review mustInclude should name handoff');
  const smokeReviewMustNot = smokeReviewTranscript.mustNot || [];
  expect(smokeReviewMustNot.some(line => /screenshots/i.test(line) && /analytics identifiers/i.test(line)), 'smoke review mustNot should forbid private fields');
  expect(smokeReviewMustNot.some(line => /upload/i.test(line) && /automatically/i.test(line)), 'smoke review mustNot should reject automatic upload');
  expect(smokeReviewMustNot.some(line => /drains H10/i.test(line)), 'smoke review mustNot should reject transcript-only drain');
  expect(smokeReviewMustNot.some(line => /privacy errors/i.test(line) && /warnings/i.test(line)), 'smoke review mustNot should keep privacy errors hard');
  for (const value of [
    smokeReviewTranscript.purpose,
    ...smokeReviewMustInclude,
    ...smokeReviewMustNot
  ]) {
    expect(!bannedResultCopy.test(value || ''), 'smoke review transcript copy overclaims');
  }
  expect(smokeReviewTranscript.coverage?.sectionCount === smokeReviewSections.length, 'smoke review coverage sectionCount mismatch');
  expect(smokeReviewTranscript.coverage?.stateSummaryCount === smokeReviewStates.length, 'smoke review coverage stateSummaryCount mismatch');
  expect(smokeReviewTranscript.coverage?.issueRowCount === smokeReviewIssues.length, 'smoke review coverage issueRowCount mismatch');
  expect(smokeReviewTranscript.coverage?.fixturePacketCount === smokeReviewFixturePackets.length, 'smoke review coverage fixturePacketCount mismatch');
  expect(smokeReviewTranscript.coverage?.forbiddenFieldCount === (tracker?.storage?.forbiddenFields || []).length, 'smoke review coverage forbiddenFieldCount mismatch');
  expect(smokeReviewTranscript.coverage?.localOnly === true, 'smoke review coverage localOnly should be true');
  expect(smokeReviewTranscript.coverage?.transcriptAloneDrainable === false, 'smoke review coverage transcriptAloneDrainable should be false');

  const smokeOutput = smokeValidator.outputContract || {};
  const expectedSmokeOutputFields = [
    'valid', 'readyForH10Review', 'errors', 'warnings', 'passedFixtures',
    'failedFixtures', 'blockedFixtures', 'missingFixtureIds', 'mismatchedFixtureIds',
    'forbiddenFieldsSeen', 'checkedAt'
  ];
  expect(smokeOutput.schema === smokeValidator.resultSchema, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.outputContract.schema mismatch');
  expect(JSON.stringify(smokeOutput.fields || []) === JSON.stringify(expectedSmokeOutputFields), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.outputContract.fields mismatch');

  const smokeValidatorMustInclude = smokeValidator.mustInclude || [];
  expect(smokeValidatorMustInclude.some(line => /runtimeAssertions/i.test(line)), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.mustInclude should name runtimeAssertions');
  expect(smokeValidatorMustInclude.some(line => /hard errors/i.test(line)), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.mustInclude should keep privacy hard');
  expect(smokeValidatorMustInclude.some(line => /CONTENT-HANDOFF\.md/i.test(line)), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.mustInclude should name handoff');
  const smokeValidatorMustNot = smokeValidator.mustNot || [];
  expect(smokeValidatorMustNot.some(line => /upload/i.test(line) && /automatically/i.test(line)), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.mustNot should reject upload');
  expect(smokeValidatorMustNot.some(line => /drains H10/i.test(line)), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.mustNot should reject validator-only drain');
  expect(smokeValidatorMustNot.some(line => /privacy errors/i.test(line) && /warnings/i.test(line)), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.mustNot should keep privacy errors hard');
  for (const value of [
    smokeValidator.purpose,
    ...smokeValidatorMustInclude,
    ...smokeValidatorMustNot
  ]) {
    expect(!bannedResultCopy.test(value || ''), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator copy overclaims');
  }
  expect(smokeValidator.coverage?.topLevelFieldCount === expectedSmokeTopLevelFields.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.topLevelFieldCount mismatch');
  expect(smokeValidator.coverage?.fixtureResultFieldCount === expectedSmokeRowFields.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.fixtureResultFieldCount mismatch');
  expect(smokeValidator.coverage?.fixtureResultCount === runtimeAssertions.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.fixtureResultCount mismatch');
  expect(smokeValidator.coverage?.algorithmStepCount === smokeAlgorithm.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.algorithmStepCount mismatch');
  expect(smokeValidator.coverage?.errorCodeCount === smokeErrorRows.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.errorCodeCount mismatch');
  expect(smokeValidator.coverage?.fixtureCaseCount === smokeFixtureCases.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.fixtureCaseCount mismatch');
  expect(smokeValidator.coverage?.validFixtureCount === smokeFixtureCases.filter(row => row.expectValid).length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.validFixtureCount mismatch');
  expect(smokeValidator.coverage?.invalidFixtureCount === smokeFixtureCases.filter(row => row.expectValid === false).length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.invalidFixtureCount mismatch');
  expect(smokeValidator.coverage?.resultCopyStateCount === smokeStates.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.resultCopyStateCount mismatch');
  expect(smokeValidator.coverage?.resultCopyErrorCount === smokeCopyRows.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.resultCopyErrorCount mismatch');
  expect(smokeValidator.coverage?.resultCopyFixtureExpectationCount === smokeCopyExpectations.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.resultCopyFixtureExpectationCount mismatch');
  expect(smokeValidator.coverage?.reviewTranscriptSectionCount === smokeReviewSections.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.reviewTranscriptSectionCount mismatch');
  expect(smokeValidator.coverage?.reviewTranscriptFixtureCount === smokeReviewFixturePackets.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.reviewTranscriptFixtureCount mismatch');
  expect(JSON.stringify(smokeValidator.coverage?.failureModes || []) === JSON.stringify([...expectedSmokeErrorCodes].sort()), 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.failureModes mismatch');
  expect(smokeValidator.coverage?.resultFieldCount === expectedSmokeOutputFields.length, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.resultFieldCount mismatch');
  expect(smokeValidator.coverage?.localOnly === true, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.localOnly should be true');
  expect(smokeValidator.coverage?.validatorAloneDrainable === false, 'receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.coverage.validatorAloneDrainable should be false');

  const templates = transcript.lineTemplates || {};
  for (const [key, limit] of Object.entries({
    title: max.title,
    stateLine: max.line,
    issueLine: max.line,
    scenarioLine: max.line,
    stepLine: max.line,
    boundaryLine: max.line
  })) {
    expect(stringLengthOk(templates[key], limit), `receiptValidator.reviewTranscript.lineTemplates.${key} missing or too long`);
    expect(!bannedResultCopy.test(templates[key] || ''), `receiptValidator.reviewTranscript.lineTemplates.${key} overclaims`);
  }
  expect(/H10/i.test(templates.title || ''), 'receiptValidator.reviewTranscript.title should name H10');
  expect(/Local receipt only/i.test(templates.boundaryLine || '') && /automatic upload/i.test(templates.boundaryLine || '') && /app\/design/i.test(templates.boundaryLine || ''), 'receiptValidator.reviewTranscript.boundaryLine should keep local/app-design boundary');

  const redaction = transcript.redactionRules || {};
  expect(JSON.stringify(redaction.forbiddenFields || []) === JSON.stringify(tracker?.storage?.forbiddenFields || []), 'receiptValidator.reviewTranscript.redactionRules.forbiddenFields mismatch');
  expect(redaction.recursiveForbidden === true, 'receiptValidator.reviewTranscript.redactionRules.recursiveForbidden should be true');
  expect(redaction.noAutomaticSend === true, 'receiptValidator.reviewTranscript.redactionRules.noAutomaticSend should be true');
  expect(redaction.noScreenshots === true, 'receiptValidator.reviewTranscript.redactionRules.noScreenshots should be true');
  expect(redaction.noUserValues === true, 'receiptValidator.reviewTranscript.redactionRules.noUserValues should be true');
  expect(redaction.noAnalyticsIdentifiers === true, 'receiptValidator.reviewTranscript.redactionRules.noAnalyticsIdentifiers should be true');
  expect(/personal browsing history/i.test(redaction.notesRule || '') && /private values/i.test(redaction.notesRule || ''), 'receiptValidator.reviewTranscript.redactionRules.notesRule should bound notes');

  const transcriptMustInclude = transcript.mustInclude || [];
  expect(transcriptMustInclude.some(line => /h10-validator-result-v1/i.test(line)), 'receiptValidator.reviewTranscript.mustInclude should name result schema');
  expect(transcriptMustInclude.some(line => /error codes/i.test(line)), 'receiptValidator.reviewTranscript.mustInclude should show errors first');
  expect(transcriptMustInclude.some(line => /pass\/fail counts/i.test(line)), 'receiptValidator.reviewTranscript.mustInclude should include counts');
  expect(transcriptMustInclude.some(line => /CONTENT-HANDOFF\.md/i.test(line)), 'receiptValidator.reviewTranscript.mustInclude should name handoff file');
  const transcriptMustNot = transcript.mustNot || [];
  expect(transcriptMustNot.some(line => /screenshots/i.test(line) && /analytics identifiers/i.test(line)), 'receiptValidator.reviewTranscript.mustNot should forbid private fields');
  expect(transcriptMustNot.some(line => /upload/i.test(line) && /automatically/i.test(line)), 'receiptValidator.reviewTranscript.mustNot should reject automatic upload');
  expect(transcriptMustNot.some(line => /drains H10/i.test(line)), 'receiptValidator.reviewTranscript.mustNot should reject transcript-only drain');
  expect(transcriptMustNot.some(line => /privacy errors/i.test(line) && /warnings/i.test(line)), 'receiptValidator.reviewTranscript.mustNot should keep privacy errors hard');

  expect(transcript.coverage?.sectionCount === sections.length, 'receiptValidator.reviewTranscript.coverage.sectionCount mismatch');
  expect(transcript.coverage?.stateSummaryCount === stateSummaries.length, 'receiptValidator.reviewTranscript.coverage.stateSummaryCount mismatch');
  expect(transcript.coverage?.issueRowCount === issueRows.length, 'receiptValidator.reviewTranscript.coverage.issueRowCount mismatch');
  expect(transcript.coverage?.fixturePacketCount === fixturePackets.length, 'receiptValidator.reviewTranscript.coverage.fixturePacketCount mismatch');
  expect(transcript.coverage?.runtimeAssertionCount === runtimeAssertions.length, 'receiptValidator.reviewTranscript.coverage.runtimeAssertionCount mismatch');
  expect(transcript.coverage?.runtimeAssertionReceiptRowCount === smokeRows.length, 'receiptValidator.reviewTranscript.coverage.runtimeAssertionReceiptRowCount mismatch');
  expect(transcript.coverage?.runtimeAssertionReceiptValidatorStepCount === smokeAlgorithm.length, 'receiptValidator.reviewTranscript.coverage.runtimeAssertionReceiptValidatorStepCount mismatch');
  expect(transcript.coverage?.runtimeAssertionReceiptValidatorFixtureCount === smokeFixtureCases.length, 'receiptValidator.reviewTranscript.coverage.runtimeAssertionReceiptValidatorFixtureCount mismatch');
  expect(transcript.coverage?.runtimeAssertionReceiptValidatorCopyStateCount === smokeStates.length, 'receiptValidator.reviewTranscript.coverage.runtimeAssertionReceiptValidatorCopyStateCount mismatch');
  expect(transcript.coverage?.runtimeAssertionReceiptValidatorReviewTranscriptSectionCount === smokeReviewSections.length, 'receiptValidator.reviewTranscript.coverage.runtimeAssertionReceiptValidatorReviewTranscriptSectionCount mismatch');
  expect(transcript.coverage?.forbiddenFieldCount === (tracker?.storage?.forbiddenFields || []).length, 'receiptValidator.reviewTranscript.coverage.forbiddenFieldCount mismatch');
  expect(transcript.coverage?.scenarioFieldCount === (receiptContract.perScenarioFields || []).length, 'receiptValidator.reviewTranscript.coverage.scenarioFieldCount mismatch');
  expect(transcript.coverage?.stepFieldCount === (validator.rowRules?.stepFields || []).length, 'receiptValidator.reviewTranscript.coverage.stepFieldCount mismatch');
  expect(transcript.coverage?.localOnly === true, 'receiptValidator.reviewTranscript.coverage.localOnly should be true');
  expect(transcript.coverage?.transcriptAloneDrainable === false, 'receiptValidator.reviewTranscript.coverage.transcriptAloneDrainable should be false');
}

function checkReviewKitReceiptValidator(validator, tracker, drainContract) {
  expect(validator && typeof validator === 'object', 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator: missing receipt validator');
  if (!validator || typeof validator !== 'object') return;

  const receipt = drainContract?.receiptContract || {};
  const template = drainContract?.receiptTemplate || {};
  const scenarioIds = (template.scenarioResults || []).map(row => row.scenarioId).filter(Boolean);
  const stepIds = (template.stepResults || []).map(row => row.stepId).filter(Boolean);
  const finalStepId = drainContract?.coverage?.finalStepId;
  const nonFinalStepIds = stepIds.filter(stepId => stepId !== finalStepId);

  expect(validator.status === 'h10-local-receipt-validator-contract', 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.status mismatch');
  expect(/local H10 evidence receipts/i.test(validator.purpose || ''), 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.purpose should name local H10 receipts');
  expect(validator.appOwned === true, 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.appOwned should be true');
  expect(validator.activeHandoff === 'H10', 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.activeHandoff should be H10');
  expect(validator.h10DrainableFromValidatorAlone === false, 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator should not drain H10 alone');
  expect(validator.schema === receipt.schema, 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.schema mismatch');
  expect(validator.validatesPointer === 'provenanceDisplayContract.reviewKit.evidenceTracker', 'receiptValidator.validatesPointer mismatch');
  expect(validator.templatePointer === 'provenanceDisplayContract.drainContract.receiptTemplate', 'receiptValidator.templatePointer mismatch');

  const shape = validator.requiredShape || {};
  expect(JSON.stringify(shape.topLevelFields || []) === JSON.stringify(receipt.requiredTopLevelFields || []), 'receiptValidator.requiredShape.topLevelFields mismatch');
  expect(shape.scenarioResultCount === scenarioIds.length, 'receiptValidator.requiredShape.scenarioResultCount mismatch');
  expect(shape.stepResultCount === stepIds.length, 'receiptValidator.requiredShape.stepResultCount mismatch');
  expect(JSON.stringify(shape.scenarioIds || []) === JSON.stringify(scenarioIds), 'receiptValidator.requiredShape.scenarioIds mismatch');
  expect(JSON.stringify(shape.stepIds || []) === JSON.stringify(stepIds), 'receiptValidator.requiredShape.stepIds mismatch');
  expect(shape.finalStepId === finalStepId, 'receiptValidator.requiredShape.finalStepId mismatch');

  const rows = validator.rowRules || {};
  expect(JSON.stringify(rows.scenarioFields || []) === JSON.stringify(receipt.perScenarioFields || []), 'receiptValidator.rowRules.scenarioFields mismatch');
  for (const field of ['step', 'stepId', 'label', 'scenarioIds', 'passed', 'notes', 'recordedAt']) {
    expect((rows.stepFields || []).includes(field), `receiptValidator.rowRules.stepFields missing ${field}`);
  }
  for (const field of ['observedChip', 'observedConfidenceMode', 'recordedAt']) {
    expect((rows.observedFieldsRequiredWhenPassed || []).includes(field), `receiptValidator.rowRules.observedFieldsRequiredWhenPassed missing ${field}`);
  }
  expect(JSON.stringify(rows.finalStepLockedUntil || []) === JSON.stringify(nonFinalStepIds), 'receiptValidator.rowRules.finalStepLockedUntil mismatch');
  expect(/non-final step rows/i.test(rows.finalStepStatusRequires || ''), 'receiptValidator.rowRules.finalStepStatusRequires should mention non-final step rows');

  const statusById = new Map((validator.statusRules || []).map(row => [row.status, row]));
  for (const status of receipt.allowedFinalStatuses || []) {
    expect(statusById.has(status), `receiptValidator.statusRules missing ${status}`);
  }
  expect(statusById.get('pending')?.readyToDrain === false, 'receiptValidator pending should not be ready');
  expect(statusById.get('blocked')?.readyToDrain === false, 'receiptValidator blocked should not be ready');
  expect(statusById.get('passed-ready-to-drain')?.readyToDrain === true, 'receiptValidator passed-ready-to-drain should be ready');
  expect((statusById.get('passed-ready-to-drain')?.allowedWhen || []).some(line => /App\/design/i.test(line)), 'receiptValidator passed-ready-to-drain should require app/design review');
  expect((statusById.get('passed-ready-to-drain')?.mustNot || []).some(line => /automatically/i.test(line)), 'receiptValidator must not move H10 automatically');

  const privacy = validator.privacyRules || {};
  expect(JSON.stringify(privacy.forbiddenFields || []) === JSON.stringify(tracker?.storage?.forbiddenFields || []), 'receiptValidator.privacyRules.forbiddenFields mismatch');
  expect(privacy.recursiveForbidden === true, 'receiptValidator.privacyRules.recursiveForbidden should be true');
  expect(privacy.noNetworkSend === true, 'receiptValidator.privacyRules.noNetworkSend should be true');
  expect(privacy.noScreenshots === true, 'receiptValidator.privacyRules.noScreenshots should be true');
  expect(privacy.noUserValues === true, 'receiptValidator.privacyRules.noUserValues should be true');
  expect(privacy.noAnalyticsIdentifiers === true, 'receiptValidator.privacyRules.noAnalyticsIdentifiers should be true');

  const exportChecks = validator.exportChecks || [];
  for (const phrase of ['schema matches', 'scenarioResults count', 'stepResults count', 'finalDecision.status', 'readyToDrain', 'final step cannot pass', 'forbidden privacy fields']) {
    expect(exportChecks.some(line => line.toLowerCase().includes(phrase.toLowerCase())), `receiptValidator.exportChecks missing ${phrase}`);
  }

  const fixtureCases = validator.fixtureCases || [];
  expect(Array.isArray(fixtureCases) && fixtureCases.length === 7, 'receiptValidator.fixtureCases should contain 7 validation vectors');
  const fixtureById = new Map(fixtureCases.map(row => [row.id, row]));
  const expectedFixtureIds = [
    'blank-template-pending',
    'blocked-with-named-surface',
    'all-evidence-ready',
    'final-step-locked-too-early',
    'privacy-field-leak',
    'unknown-receipt-row-id',
    'passed-scenario-missing-observation'
  ];
  for (const id of expectedFixtureIds) {
    expect(fixtureById.has(id), `receiptValidator.fixtureCases missing ${id}`);
  }
  for (const fixture of fixtureCases) {
    expect(typeof fixture.id === 'string' && fixture.id.trim(), 'receiptValidator.fixtureCases: fixture id missing');
    expect(typeof fixture.description === 'string' && fixture.description.length > 20, `${fixture.id}: fixture description too thin`);
    expect(typeof fixture.expectValid === 'boolean', `${fixture.id}: fixture expectValid should be boolean`);
    expect((receipt.allowedFinalStatuses || []).includes(fixture.attemptedFinalStatus), `${fixture.id}: attemptedFinalStatus should be allowed`);
    expect(typeof fixture.readyToDrain === 'boolean', `${fixture.id}: readyToDrain should be boolean`);
    for (const field of tracker?.storage?.forbiddenFields || []) {
      expect(!hasOwn(fixture, field), `${fixture.id}: fixture must not use forbidden field ${field} as a property`);
    }
    if (fixture.expectValid === false) {
      expect(typeof fixture.reasonCode === 'string' && fixture.reasonCode.trim(), `${fixture.id}: invalid fixture needs reasonCode`);
      expect(/fail/i.test(fixture.mustFailBecause || ''), `${fixture.id}: invalid fixture should explain why it fails`);
    }
  }

  const validStatuses = new Set(fixtureCases.filter(row => row.expectValid).map(row => row.attemptedFinalStatus));
  for (const status of receipt.allowedFinalStatuses || []) {
    expect(validStatuses.has(status), `receiptValidator.fixtureCases should include a valid ${status} example`);
  }
  const invalidReasons = new Set(fixtureCases.filter(row => row.expectValid === false).map(row => row.reasonCode));
  for (const reason of ['final-step-locked', 'forbidden-privacy-field', 'template-id-mismatch', 'missing-required-observation']) {
    expect(invalidReasons.has(reason), `receiptValidator.fixtureCases missing invalid reason ${reason}`);
  }

  const pendingFixture = fixtureById.get('blank-template-pending') || {};
  expect(pendingFixture.expectValid === true && pendingFixture.readyToDrain === false, 'blank-template-pending fixture should be valid but not ready');
  expect(pendingFixture.finalDecision?.status === 'pending' && pendingFixture.finalDecision?.readyToDrain === false, 'blank-template-pending fixture finalDecision mismatch');
  expect(/blank-template/i.test(pendingFixture.scenarioState || '') && /blank-template/i.test(pendingFixture.stepState || ''), 'blank-template-pending fixture should name blank template state');

  const blockedFixture = fixtureById.get('blocked-with-named-surface') || {};
  expect(blockedFixture.expectValid === true && blockedFixture.attemptedFinalStatus === 'blocked', 'blocked-with-named-surface fixture should be valid blocked');
  expect((blockedFixture.requiredFieldsWhenFailed || []).includes('notes') && (blockedFixture.requiredFieldsWhenFailed || []).includes('recordedAt'), 'blocked fixture should require notes and recordedAt');
  expect((blockedFixture.scenarioIds || []).every(id => scenarioIds.includes(id)), 'blocked fixture references unknown scenario id');
  expect((blockedFixture.stepIds || []).every(id => stepIds.includes(id)), 'blocked fixture references unknown step id');

  const readyFixture = fixtureById.get('all-evidence-ready') || {};
  expect(readyFixture.expectValid === true && readyFixture.readyToDrain === true, 'all-evidence-ready fixture should be valid ready');
  expect(JSON.stringify(readyFixture.scenarioIds || []) === JSON.stringify(scenarioIds), 'all-evidence-ready fixture scenarioIds mismatch');
  expect(JSON.stringify(readyFixture.stepIds || []) === JSON.stringify(stepIds), 'all-evidence-ready fixture stepIds mismatch');
  expect(readyFixture.requiresAppDesignReview === true, 'all-evidence-ready fixture should require app/design review');
  expect(readyFixture.handoffFile === tracker?.finalDecisionLock?.handoffFile, 'all-evidence-ready fixture handoffFile mismatch');

  const lockedFixture = fixtureById.get('final-step-locked-too-early') || {};
  expect(lockedFixture.expectValid === false && lockedFixture.reasonCode === 'final-step-locked', 'locked fixture reason mismatch');
  expect(lockedFixture.finalStepId === finalStepId, 'locked fixture finalStepId mismatch');
  expect((lockedFixture.missingPrerequisiteStepIds || []).length > 0, 'locked fixture should name a missing prerequisite');
  expect((lockedFixture.missingPrerequisiteStepIds || []).every(id => nonFinalStepIds.includes(id)), 'locked fixture missing prerequisite should be non-final');

  const privacyFixture = fixtureById.get('privacy-field-leak') || {};
  expect(privacyFixture.expectValid === false && privacyFixture.reasonCode === 'forbidden-privacy-field', 'privacy fixture reason mismatch');
  expect((tracker?.storage?.forbiddenFields || []).includes(privacyFixture.containsForbiddenField), 'privacy fixture should name a forbidden field');
  expect(JSON.stringify(privacyFixture.forbiddenFields || []) === JSON.stringify(tracker?.storage?.forbiddenFields || []), 'privacy fixture forbidden fields mismatch');
  expect(privacyFixture.recursiveForbidden === true, 'privacy fixture should require recursive forbidden-field checks');

  const unknownFixture = fixtureById.get('unknown-receipt-row-id') || {};
  expect(unknownFixture.expectValid === false && unknownFixture.reasonCode === 'template-id-mismatch', 'unknown-id fixture reason mismatch');
  expect((unknownFixture.unknownScenarioIds || []).some(id => !scenarioIds.includes(id)), 'unknown-id fixture needs an unknown scenario id');
  expect((unknownFixture.unknownStepIds || []).some(id => !stepIds.includes(id)), 'unknown-id fixture needs an unknown step id');
  expect(JSON.stringify(unknownFixture.knownScenarioIds || []) === JSON.stringify(scenarioIds), 'unknown-id fixture knownScenarioIds mismatch');
  expect(JSON.stringify(unknownFixture.knownStepIds || []) === JSON.stringify(stepIds), 'unknown-id fixture knownStepIds mismatch');

  const missingObservationFixture = fixtureById.get('passed-scenario-missing-observation') || {};
  expect(missingObservationFixture.expectValid === false && missingObservationFixture.reasonCode === 'missing-required-observation', 'missing-observation fixture reason mismatch');
  for (const field of ['observedChip', 'observedConfidenceMode', 'recordedAt']) {
    expect((missingObservationFixture.missingFields || []).includes(field), `missing-observation fixture missing ${field}`);
  }
  expect((missingObservationFixture.scenarioIds || []).every(id => scenarioIds.includes(id)), 'missing-observation fixture references unknown scenario id');

  const recipe = validator.implementationRecipe || {};
  expect(recipe && typeof recipe === 'object', 'receiptValidator.implementationRecipe missing');
  expect(recipe.status === 'h10-local-validator-implementation-recipe', 'receiptValidator.implementationRecipe.status mismatch');
  expect(/local H10 evidence receipt/i.test(recipe.purpose || ''), 'receiptValidator.implementationRecipe.purpose should name local H10 evidence receipt');
  expect(recipe.localOnly === true, 'receiptValidator.implementationRecipe.localOnly should be true');
  expect(recipe.noServerAuthority === true, 'receiptValidator.implementationRecipe.noServerAuthority should be true');

  const input = recipe.input || {};
  expect(input.receiptSchema === receipt.schema, 'receiptValidator.implementationRecipe.input.receiptSchema mismatch');
  expect(/local\/exported JSON/i.test(input.source || ''), 'receiptValidator.implementationRecipe.input.source should be local/exported JSON');
  expect(input.templatePointer === 'provenanceDisplayContract.drainContract.receiptTemplate', 'receiptValidator.implementationRecipe.input.templatePointer mismatch');
  expect(input.validatorPointer === 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator', 'receiptValidator.implementationRecipe.input.validatorPointer mismatch');

  const output = recipe.outputContract || {};
  expect(output.schema === 'h10-validator-result-v1', 'receiptValidator.implementationRecipe.outputContract.schema mismatch');
  for (const field of ['valid', 'readyToDrain', 'finalStatus', 'errors', 'warnings', 'missingScenarioIds', 'missingStepIds', 'forbiddenFieldsSeen', 'lockedFinalStep', 'checkedAt']) {
    expect((output.fields || []).includes(field), `receiptValidator.implementationRecipe.outputContract.fields missing ${field}`);
  }
  expect((output.validWhen || []).some(line => /readyToDrain/i.test(line)), 'receiptValidator.implementationRecipe.outputContract.validWhen should mention readyToDrain');
  expect((output.mustNot || []).some(line => /upload|send/i.test(line)), 'receiptValidator.implementationRecipe.outputContract.mustNot should forbid upload/send');
  expect((output.mustNot || []).some(line => /H10/i.test(line) && /validator output alone/i.test(line)), 'receiptValidator.implementationRecipe.outputContract.mustNot should reject validator-only H10 movement');
  for (const field of tracker?.storage?.forbiddenFields || []) {
    expect((output.mustNot || []).some(line => new RegExp(field, 'i').test(line) || /screenshots|user values|browsing history|analytics identifiers/i.test(line)), `receiptValidator.implementationRecipe.outputContract.mustNot should cover forbidden field ${field}`);
  }

  const outcomes = recipe.statusOutcomes || [];
  const outcomeByStatus = new Map(outcomes.map(row => [row.finalStatus, row]));
  for (const status of receipt.allowedFinalStatuses || []) {
    expect(outcomeByStatus.has(status), `receiptValidator.implementationRecipe.statusOutcomes missing ${status}`);
  }
  expect(outcomeByStatus.get('pending')?.readyToDrain === false, 'receiptValidator.implementationRecipe pending should not be ready');
  expect(outcomeByStatus.get('blocked')?.readyToDrain === false, 'receiptValidator.implementationRecipe blocked should not be ready');
  expect(outcomeByStatus.get('passed-ready-to-drain')?.readyToDrain === true, 'receiptValidator.implementationRecipe passed-ready-to-drain should be ready');
  expect(/app-design-review/i.test(outcomeByStatus.get('passed-ready-to-drain')?.resultKind || ''), 'receiptValidator.implementationRecipe ready result should name app/design review');

  const algorithm = recipe.algorithmSteps || [];
  const expectedAlgorithmIds = [
    'parse-local-json',
    'check-schema-and-top-level',
    'check-template-ids',
    'check-scenario-rows',
    'check-step-rows',
    'scan-privacy-fields',
    'evaluate-final-lock',
    'evaluate-final-status',
    'emit-local-result'
  ];
  expect(Array.isArray(algorithm) && algorithm.length === expectedAlgorithmIds.length, 'receiptValidator.implementationRecipe.algorithmSteps count mismatch');
  const algorithmIds = new Set();
  algorithm.forEach((step, index) => {
    expect(step.order === index + 1, `${step.id || index}: implementation recipe order mismatch`);
    expect(step.id === expectedAlgorithmIds[index], `implementation recipe expected ${expectedAlgorithmIds[index]}, got ${step.id || '(missing)'}`);
    expect(!algorithmIds.has(step.id), `${step.id}: duplicate implementation algorithm step`);
    algorithmIds.add(step.id);
    expect(typeof step.check === 'string' && step.check.length > 30, `${step.id}: implementation recipe check too thin`);
    expect(Array.isArray(step.emits), `${step.id}: implementation recipe emits should be an array`);
  });
  expect(/never fetch, upload/i.test((algorithm[0] || {}).check || ''), 'parse-local-json should forbid fetch/upload');
  expect(JSON.stringify((algorithm[2] || {}).scenarioIds || []) === JSON.stringify(scenarioIds), 'check-template-ids scenarioIds mismatch');
  expect(JSON.stringify((algorithm[2] || {}).stepIds || []) === JSON.stringify(stepIds), 'check-template-ids stepIds mismatch');
  expect(JSON.stringify((algorithm[5] || {}).forbiddenFields || []) === JSON.stringify(tracker?.storage?.forbiddenFields || []), 'scan-privacy-fields forbiddenFields mismatch');
  expect((algorithm[6] || {}).finalStepId === finalStepId, 'evaluate-final-lock finalStepId mismatch');
  expect(JSON.stringify((algorithm[6] || {}).lockedUntil || []) === JSON.stringify(nonFinalStepIds), 'evaluate-final-lock lockedUntil mismatch');
  expect(JSON.stringify((algorithm[7] || {}).allowedStatuses || []) === JSON.stringify(receipt.allowedFinalStatuses || []), 'evaluate-final-status allowedStatuses mismatch');
  expect(/not an automatic H10 drain/i.test((algorithm[8] || {}).check || ''), 'emit-local-result should reject automatic drain');

  const errorCodes = recipe.errorCodes || [];
  const expectedErrorCodes = [
    'malformed-json',
    'schema-mismatch',
    'missing-top-level-field',
    'template-id-mismatch',
    'missing-required-observation',
    'missing-step-field',
    'forbidden-privacy-field',
    'final-step-locked',
    'invalid-final-status',
    'ready-status-mismatch'
  ];
  const errorByCode = new Map(errorCodes.map(row => [row.code, row]));
  expect(errorCodes.length === expectedErrorCodes.length, 'receiptValidator.implementationRecipe.errorCodes count mismatch');
  for (const code of expectedErrorCodes) {
    const err = errorByCode.get(code);
    expect(Boolean(err), `receiptValidator.implementationRecipe.errorCodes missing ${code}`);
    if (!err) continue;
    expect(err.severity === 'error', `${code}: error severity mismatch`);
    expect(algorithmIds.has(err.fromStep), `${code}: fromStep should reference an algorithm step`);
    expect(Array.isArray(err.fixtureIds), `${code}: fixtureIds should be an array`);
  }
  for (const reason of invalidReasons) {
    const err = errorByCode.get(reason);
    expect(Boolean(err), `receiptValidator.implementationRecipe.errorCodes missing fixture reason ${reason}`);
    if (!err) continue;
    const matchingFixtures = fixtureCases.filter(row => row.reasonCode === reason).map(row => row.id).sort();
    expect(JSON.stringify((err.fixtureIds || []).slice().sort()) === JSON.stringify(matchingFixtures), `${reason}: fixtureIds should map invalid fixtures`);
  }

  const fixtureExpectations = recipe.fixtureExpectations || [];
  expect(fixtureExpectations.length === fixtureCases.length, 'receiptValidator.implementationRecipe.fixtureExpectations count mismatch');
  const expectationByFixture = new Map(fixtureExpectations.map(row => [row.fixtureId, row]));
  for (const fixture of fixtureCases) {
    const expected = expectationByFixture.get(fixture.id);
    expect(Boolean(expected), `receiptValidator.implementationRecipe.fixtureExpectations missing ${fixture.id}`);
    if (!expected) continue;
    expect(expected.expectValid === fixture.expectValid, `${fixture.id}: fixture expectation validity mismatch`);
    expect(expected.readyToDrain === fixture.readyToDrain, `${fixture.id}: fixture expectation readyToDrain mismatch`);
    const expectedCodes = fixture.expectValid === false && fixture.reasonCode ? [fixture.reasonCode] : [];
    expect(JSON.stringify(expected.expectedErrorCodes || []) === JSON.stringify(expectedCodes), `${fixture.id}: fixture expectation error codes mismatch`);
  }

  const resultCopy = validator.resultCopy || {};
  expect(resultCopy && typeof resultCopy === 'object', 'receiptValidator.resultCopy missing');
  expect(resultCopy.status === 'h10-validator-result-copy-contract', 'receiptValidator.resultCopy.status mismatch');
  expect(/local H10 receipt validation/i.test(resultCopy.purpose || ''), 'receiptValidator.resultCopy.purpose should name local H10 receipt validation');
  expect(resultCopy.localOnly === true, 'receiptValidator.resultCopy.localOnly should be true');
  expect(resultCopy.noServerAuthority === true, 'receiptValidator.resultCopy.noServerAuthority should be true');
  expect(resultCopy.schema === 'h10-validator-result-copy-v1', 'receiptValidator.resultCopy.schema mismatch');

  const displayRules = resultCopy.displayRules || [];
  expect(displayRules.length >= 5, 'receiptValidator.resultCopy.displayRules should be complete');
  expect(displayRules.some(line => /error codes/i.test(line)), 'receiptValidator.resultCopy.displayRules should show errors first');
  expect(displayRules.some(line => /local/i.test(line) && /uploaded/i.test(line)), 'receiptValidator.resultCopy.displayRules should say local/not uploaded');
  expect(displayRules.some(line => /ready for app\/design review/i.test(line)), 'receiptValidator.resultCopy.displayRules should limit ready copy to app/design review');
  expect(displayRules.some(line => /CONTENT-HANDOFF\.md/i.test(line)), 'receiptValidator.resultCopy.displayRules should name handoff movement');
  expect(displayRules.some(line => /screenshots/i.test(line) && /analytics identifiers/i.test(line)), 'receiptValidator.resultCopy.displayRules should forbid privacy fields');

  const bannedResultCopy = /verified|certified|proof|trust score/i;
  for (const line of displayRules) {
    expect(!bannedResultCopy.test(line || ''), `receiptValidator.resultCopy.displayRules overclaims: ${line}`);
  }

  const states = resultCopy.resultStates || [];
  const expectedStates = ['pending', 'blocked', 'passed-ready-to-drain', 'invalid'];
  expect(states.length === expectedStates.length, 'receiptValidator.resultCopy.resultStates count mismatch');
  const stateById = new Map(states.map(row => [row.state, row]));
  for (const stateId of expectedStates) {
    const state = stateById.get(stateId);
    expect(Boolean(state), `receiptValidator.resultCopy.resultStates missing ${stateId}`);
    if (!state) continue;
    expect(stringLengthOk(state.label, 48), `${stateId}: result state label too long or missing`);
    expect(stringLengthOk(state.headline, 96), `${stateId}: result state headline too long or missing`);
    expect(stringLengthOk(state.body, 190), `${stateId}: result state body too long or missing`);
    expect(stringLengthOk(state.action, 80), `${stateId}: result state action too long or missing`);
    for (const field of ['label', 'headline', 'body', 'action']) {
      expect(!bannedResultCopy.test(state[field] || ''), `${stateId}: result state ${field} overclaims`);
    }
  }
  expect(stateById.get('pending')?.readyToDrain === false, 'receiptValidator.resultCopy pending should not be ready');
  expect(stateById.get('blocked')?.readyToDrain === false, 'receiptValidator.resultCopy blocked should not be ready');
  expect(stateById.get('invalid')?.readyToDrain === false, 'receiptValidator.resultCopy invalid should not be ready');
  expect(stateById.get('passed-ready-to-drain')?.readyToDrain === true, 'receiptValidator.resultCopy passed-ready-to-drain should be ready');
  expect(/app\/design/i.test(stateById.get('passed-ready-to-drain')?.body || '') && /handoff/i.test(stateById.get('passed-ready-to-drain')?.body || ''), 'receiptValidator.resultCopy ready body should require app/design handoff review');

  const copyRows = resultCopy.errorCopy || [];
  expect(copyRows.length === errorCodes.length, 'receiptValidator.resultCopy.errorCopy count mismatch');
  const copyByCode = new Map(copyRows.map(row => [row.code, row]));
  for (const error of errorCodes) {
    const copy = copyByCode.get(error.code);
    expect(Boolean(copy), `receiptValidator.resultCopy.errorCopy missing ${error.code}`);
    if (!copy) continue;
    expect(copy.severity === error.severity, `${error.code}: result copy severity mismatch`);
    expect(stringLengthOk(copy.label, 64), `${error.code}: result copy label too long or missing`);
    expect(stringLengthOk(copy.message, 150), `${error.code}: result copy message too long or missing`);
    expect(stringLengthOk(copy.repairHint, 190), `${error.code}: result copy repairHint too long or missing`);
    expect(JSON.stringify(copy.fixtureIds || []) === JSON.stringify(error.fixtureIds || []), `${error.code}: result copy fixtureIds mismatch`);
    for (const field of ['label', 'message', 'repairHint']) {
      expect(!bannedResultCopy.test(copy[field] || ''), `${error.code}: result copy ${field} overclaims`);
    }
  }
  expect(/template/i.test(copyByCode.get('template-id-mismatch')?.message || ''), 'template-id-mismatch copy should mention template');
  expect(/observed|confidence|recorded/i.test(copyByCode.get('missing-required-observation')?.message || ''), 'missing-required-observation copy should mention observation fields');
  expect(/screenshots/i.test(copyByCode.get('forbidden-privacy-field')?.repairHint || '') && /analytics identifiers/i.test(copyByCode.get('forbidden-privacy-field')?.repairHint || ''), 'forbidden-privacy-field copy should name forbidden fields');
  expect(/prerequisite/i.test(copyByCode.get('final-step-locked')?.message || '') && /non-final/i.test(copyByCode.get('final-step-locked')?.repairHint || ''), 'final-step-locked copy should mention prerequisites and non-final steps');
  expect(/pending, blocked, or passed-ready-to-drain/i.test(copyByCode.get('invalid-final-status')?.repairHint || ''), 'invalid-final-status copy should list allowed statuses');
  expect(/true only for passed-ready-to-drain/i.test(copyByCode.get('ready-status-mismatch')?.repairHint || ''), 'ready-status-mismatch copy should define ready boolean');

  const copyExpectations = resultCopy.fixtureCopyExpectations || [];
  expect(copyExpectations.length === fixtureCases.length, 'receiptValidator.resultCopy.fixtureCopyExpectations count mismatch');
  const copyExpectationByFixture = new Map(copyExpectations.map(row => [row.fixtureId, row]));
  for (const fixture of fixtureCases) {
    const expected = copyExpectationByFixture.get(fixture.id);
    expect(Boolean(expected), `receiptValidator.resultCopy.fixtureCopyExpectations missing ${fixture.id}`);
    if (!expected) continue;
    const expectedState = fixture.expectValid === false ? 'invalid' : fixture.attemptedFinalStatus;
    const expectedCodes = fixture.expectValid === false && fixture.reasonCode ? [fixture.reasonCode] : [];
    expect(expected.expectedState === expectedState, `${fixture.id}: result copy expectedState mismatch`);
    expect(JSON.stringify(expected.expectedErrorCodes || []) === JSON.stringify(expectedCodes), `${fixture.id}: result copy expectedErrorCodes mismatch`);
  }

  const resultMustNot = resultCopy.mustNot || [];
  expect(resultMustNot.some(line => /claim H10 is drained/i.test(line)), 'receiptValidator.resultCopy.mustNot should reject drained claim');
  expect(resultMustNot.some(line => /upload/i.test(line) && /automatically/i.test(line)), 'receiptValidator.resultCopy.mustNot should reject automatic upload');
  expect(resultMustNot.some(line => /privacy-field errors/i.test(line) && /warnings/i.test(line)), 'receiptValidator.resultCopy.mustNot should keep privacy errors hard');

  checkReviewTranscript(validator.reviewTranscript, validator, tracker, drainContract, resultCopy, states, copyRows, recipe, bannedResultCopy);
  const reviewTranscript = validator.reviewTranscript || {};

  const lock = validator.finalDecisionLock || {};
  expect(lock.stepId === finalStepId, 'receiptValidator.finalDecisionLock.stepId mismatch');
  expect(JSON.stringify(lock.lockedUntil || []) === JSON.stringify(tracker?.finalDecisionLock?.lockedUntil || []), 'receiptValidator.finalDecisionLock.lockedUntil mismatch');
  expect(lock.readyStatus === tracker?.finalDecisionLock?.readyStatus, 'receiptValidator.finalDecisionLock.readyStatus mismatch');
  expect(lock.blockedStatus === tracker?.finalDecisionLock?.blockedStatus, 'receiptValidator.finalDecisionLock.blockedStatus mismatch');
  expect(lock.handoffFile === tracker?.finalDecisionLock?.handoffFile, 'receiptValidator.finalDecisionLock.handoffFile mismatch');

  expect(validator.coverage?.scenarioResultCount === scenarioIds.length, 'receiptValidator.coverage.scenarioResultCount mismatch');
  expect(validator.coverage?.stepResultCount === stepIds.length, 'receiptValidator.coverage.stepResultCount mismatch');
  expect(validator.coverage?.statusRuleCount === 3, 'receiptValidator.coverage.statusRuleCount mismatch');
  expect(validator.coverage?.forbiddenFieldCount === (tracker?.storage?.forbiddenFields || []).length, 'receiptValidator.coverage.forbiddenFieldCount mismatch');
  expect(validator.coverage?.fixtureCaseCount === fixtureCases.length, 'receiptValidator.coverage.fixtureCaseCount mismatch');
  expect(validator.coverage?.validFixtureCount === fixtureCases.filter(row => row.expectValid).length, 'receiptValidator.coverage.validFixtureCount mismatch');
  expect(validator.coverage?.invalidFixtureCount === fixtureCases.filter(row => row.expectValid === false).length, 'receiptValidator.coverage.invalidFixtureCount mismatch');
  expect(validator.coverage?.implementationStepCount === algorithm.length, 'receiptValidator.coverage.implementationStepCount mismatch');
  expect(validator.coverage?.resultCopyStateCount === states.length, 'receiptValidator.coverage.resultCopyStateCount mismatch');
  expect(validator.coverage?.resultCopyErrorCount === copyRows.length, 'receiptValidator.coverage.resultCopyErrorCount mismatch');
  expect(validator.coverage?.reviewTranscriptSectionCount === (reviewTranscript.sections || []).length, 'receiptValidator.coverage.reviewTranscriptSectionCount mismatch');
  expect(validator.coverage?.reviewTranscriptIssueCount === (reviewTranscript.issueRows || []).length, 'receiptValidator.coverage.reviewTranscriptIssueCount mismatch');
  expect(validator.coverage?.reviewTranscriptFixtureCount === (reviewTranscript.fixturePackets || []).length, 'receiptValidator.coverage.reviewTranscriptFixtureCount mismatch');
  expect(validator.coverage?.reviewTranscriptRuntimeAssertionCount === (reviewTranscript.runtimeAssertions || []).length, 'receiptValidator.coverage.reviewTranscriptRuntimeAssertionCount mismatch');
  expect(validator.coverage?.reviewTranscriptRuntimeReceiptRowCount === ((reviewTranscript.runtimeAssertionReceiptTemplate || {}).fixtureResults || []).length, 'receiptValidator.coverage.reviewTranscriptRuntimeReceiptRowCount mismatch');
  expect(validator.coverage?.reviewTranscriptRuntimeReceiptValidatorStepCount === ((reviewTranscript.runtimeAssertionReceiptValidator || {}).algorithm || []).length, 'receiptValidator.coverage.reviewTranscriptRuntimeReceiptValidatorStepCount mismatch');
  expect(validator.coverage?.reviewTranscriptRuntimeReceiptValidatorFixtureCount === ((reviewTranscript.runtimeAssertionReceiptValidator || {}).fixtureCases || []).length, 'receiptValidator.coverage.reviewTranscriptRuntimeReceiptValidatorFixtureCount mismatch');
  expect(validator.coverage?.reviewTranscriptRuntimeReceiptValidatorCopyStateCount === (((reviewTranscript.runtimeAssertionReceiptValidator || {}).resultCopy || {}).resultStates || []).length, 'receiptValidator.coverage.reviewTranscriptRuntimeReceiptValidatorCopyStateCount mismatch');
  expect(validator.coverage?.reviewTranscriptRuntimeReceiptValidatorReviewTranscriptSectionCount === (((reviewTranscript.runtimeAssertionReceiptValidator || {}).reviewTranscript || {}).sections || []).length, 'receiptValidator.coverage.reviewTranscriptRuntimeReceiptValidatorReviewTranscriptSectionCount mismatch');
  expect(validator.coverage?.failureModeCount === invalidReasons.size, 'receiptValidator.coverage.failureModeCount mismatch');
  expect(JSON.stringify(validator.coverage?.failureModes || []) === JSON.stringify(Array.from(invalidReasons).sort()), 'receiptValidator.coverage.failureModes mismatch');
  expect(recipe.coverage?.algorithmStepCount === algorithm.length, 'receiptValidator.implementationRecipe.coverage.algorithmStepCount mismatch');
  expect(recipe.coverage?.errorCodeCount === errorCodes.length, 'receiptValidator.implementationRecipe.coverage.errorCodeCount mismatch');
  expect(recipe.coverage?.fixtureExpectationCount === fixtureExpectations.length, 'receiptValidator.implementationRecipe.coverage.fixtureExpectationCount mismatch');
  expect(recipe.coverage?.invalidFixtureMappedCount === fixtureCases.filter(row => row.expectValid === false && row.reasonCode).length, 'receiptValidator.implementationRecipe.coverage.invalidFixtureMappedCount mismatch');
  expect(recipe.coverage?.resultFieldCount === (output.fields || []).length, 'receiptValidator.implementationRecipe.coverage.resultFieldCount mismatch');
  expect(recipe.coverage?.localOnly === true, 'receiptValidator.implementationRecipe.coverage.localOnly should be true');
  expect(resultCopy.coverage?.resultStateCount === states.length, 'receiptValidator.resultCopy.coverage.resultStateCount mismatch');
  expect(resultCopy.coverage?.errorCopyCount === copyRows.length, 'receiptValidator.resultCopy.coverage.errorCopyCount mismatch');
  expect(resultCopy.coverage?.fixtureCopyExpectationCount === copyExpectations.length, 'receiptValidator.resultCopy.coverage.fixtureCopyExpectationCount mismatch');
  expect(resultCopy.coverage?.localOnly === true, 'receiptValidator.resultCopy.coverage.localOnly should be true');
  expect(validator.coverage?.validatorAloneDrainable === false, 'receiptValidator.coverage.validatorAloneDrainable should be false');
}

function checkReviewKitEvidenceTracker(tracker, reviewKit, drainContract) {
  expect(tracker && typeof tracker === 'object', 'provenanceDisplayContract.reviewKit.evidenceTracker: missing evidence tracker');
  if (!tracker || typeof tracker !== 'object') return;

  expect(tracker.status === 'h10-local-evidence-tracker-contract', 'provenanceDisplayContract.reviewKit.evidenceTracker.status mismatch');
  expect(/local evidence tracker/i.test(tracker.purpose || ''), 'provenanceDisplayContract.reviewKit.evidenceTracker.purpose should name local evidence tracker');
  expect(tracker.appOwned === true, 'provenanceDisplayContract.reviewKit.evidenceTracker.appOwned should be true');
  expect(tracker.activeHandoff === 'H10', 'provenanceDisplayContract.reviewKit.evidenceTracker.activeHandoff should be H10');
  expect(tracker.h10DrainableFromEvidenceTrackerAlone === false, 'provenanceDisplayContract.reviewKit.evidenceTracker should not drain H10 alone');

  const storage = tracker.storage || {};
  expect(storage.key === 'cc:h10-local-evidence-v1', 'provenanceDisplayContract.reviewKit.evidenceTracker.storage.key mismatch');
  expect(storage.schema === drainContract?.receiptContract?.schema, 'provenanceDisplayContract.reviewKit.evidenceTracker.storage.schema mismatch');
  expect(storage.channel === 'local-review', 'provenanceDisplayContract.reviewKit.evidenceTracker.storage.channel mismatch');
  expect(storage.localOnly === true, 'provenanceDisplayContract.reviewKit.evidenceTracker.storage.localOnly should be true');
  expect(storage.exportFormat === 'JSON', 'provenanceDisplayContract.reviewKit.evidenceTracker.storage.exportFormat should be JSON');
  for (const field of ['screenshots', 'userValues', 'personalBrowsingHistory', 'analyticsClientId']) {
    expect((storage.forbiddenFields || []).includes(field), `provenanceDisplayContract.reviewKit.evidenceTracker.storage.forbiddenFields missing ${field}`);
  }

  const groups = reviewKit?.surfaceGroups || [];
  const groupIds = groups.map(group => group.id);
  const groupByStep = new Map();
  const groupByScenario = new Map();
  for (const group of groups) {
    for (const stepId of group.appEvidenceStepIds || []) {
      if (!groupByStep.has(stepId)) groupByStep.set(stepId, []);
      groupByStep.get(stepId).push(group);
    }
    for (const scenarioId of group.receiptRows || []) groupByScenario.set(scenarioId, group);
  }

  const finalStepId = drainContract?.coverage?.finalStepId;
  const steps = drainContract?.steps || [];
  const items = tracker.items || [];
  expect(Array.isArray(items) && items.length === steps.length, 'provenanceDisplayContract.reviewKit.evidenceTracker.items count mismatch');
  const itemIds = new Set();
  const nonFinalIds = [];
  const loadId = 'h10-evidence-load-generated-contract';
  let scenarioReceiptRows = 0;

  steps.forEach((step, index) => {
    const item = items[index] || {};
    const expectedId = `h10-evidence-${step.id}`;
    const isFinal = step.id === finalStepId;
    expect(item.id === expectedId, `${step.id}: evidence tracker id mismatch`);
    expect(!itemIds.has(item.id), `${step.id}: duplicate evidence tracker item id`);
    itemIds.add(item.id);
    expect(item.stepId === step.id, `${step.id}: evidence tracker stepId mismatch`);
    expect(item.order === step.step, `${step.id}: evidence tracker order mismatch`);
    expect(item.label === step.label, `${step.id}: evidence tracker label mismatch`);
    expect(item.recordMode === (isFinal ? 'locked-final-decision' : 'manual-observation'), `${step.id}: evidence tracker recordMode mismatch`);
    expect(JSON.stringify(item.sourceFiles || []) === JSON.stringify(step.sourceFiles || []), `${step.id}: evidence tracker sourceFiles mismatch`);
    expect(item.contractPointer === step.contractPointer, `${step.id}: evidence tracker contractPointer mismatch`);
    expect(JSON.stringify(item.scenarioIds || []) === JSON.stringify(step.scenarioIds || []), `${step.id}: evidence tracker scenarioIds mismatch`);

    const expectedReceiptRows = (step.scenarioIds || []).filter(scenarioId => groupByScenario.has(scenarioId));
    expect(JSON.stringify(item.receiptRows || []) === JSON.stringify(expectedReceiptRows), `${step.id}: evidence tracker receiptRows mismatch`);
    if (!isFinal) scenarioReceiptRows += expectedReceiptRows.length;

    let expectedGroupIds = [];
    if (isFinal) {
      expectedGroupIds = groupIds;
    } else {
      for (const scenarioId of step.scenarioIds || []) {
        const group = groupByScenario.get(scenarioId);
        if (group && !expectedGroupIds.includes(group.id)) expectedGroupIds.push(group.id);
      }
      if (!expectedGroupIds.length) {
        for (const group of groupByStep.get(step.id) || []) {
          if (!expectedGroupIds.includes(group.id)) expectedGroupIds.push(group.id);
        }
      }
    }
    expect(JSON.stringify(item.surfaceGroupIds || []) === JSON.stringify(expectedGroupIds), `${step.id}: evidence tracker surfaceGroupIds mismatch`);

    const expectedPrerequisites = step.id === 'load-generated-contract'
      ? []
      : (isFinal ? nonFinalIds : [loadId]);
    expect(JSON.stringify(item.prerequisiteIds || []) === JSON.stringify(expectedPrerequisites), `${step.id}: evidence tracker prerequisiteIds mismatch`);

    const updates = item.requiredReceiptUpdates || {};
    expect(updates.stepResultId === step.id, `${step.id}: evidence tracker requiredReceiptUpdates.stepResultId mismatch`);
    expect(JSON.stringify(updates.scenarioResultIds || []) === JSON.stringify(expectedReceiptRows), `${step.id}: evidence tracker requiredReceiptUpdates.scenarioResultIds mismatch`);
    for (const field of ['passed', 'notes', 'recordedAt']) {
      expect((updates.stepFields || []).includes(field), `${step.id}: evidence tracker stepFields missing ${field}`);
    }
    const expectedScenarioFields = expectedReceiptRows.length
      ? ['observedChip', 'observedConfidenceMode', 'passed', 'notes', 'recordedAt']
      : [];
    expect(JSON.stringify(updates.scenarioFields || []) === JSON.stringify(expectedScenarioFields), `${step.id}: evidence tracker scenarioFields mismatch`);

    for (const ready of step.passWhen || []) {
      expect((item.readyWhen || []).includes(ready), `${step.id}: evidence tracker readyWhen missing drain step condition ${ready}`);
    }
    expect((item.mustNot || []).some(line => /generated JSON alone/i.test(line)), `${step.id}: evidence tracker mustNot should reject generated-JSON-only recording`);
    if (isFinal) {
      expect((item.readyWhen || []).some(line => /Every prerequisite evidence item/i.test(line)), 'final H10 evidence item should require prerequisites');
      expect((item.mustNot || []).some(line => /unlock the final H10 drain decision/i.test(line)), 'final H10 evidence item should forbid unlocking early');
    } else {
      nonFinalIds.push(item.id);
    }
  });

  const summary = tracker.copySummary || {};
  for (const field of ['checkedCount', 'totalCount', 'missingPrerequisiteIds', 'readyToDrain', 'buildHash', 'channel']) {
    expect((summary.includeFields || []).includes(field), `provenanceDisplayContract.reviewKit.evidenceTracker.copySummary.includeFields missing ${field}`);
  }
  expect(/final drain belongs to app\/design/i.test(summary.mustSay || ''), 'provenanceDisplayContract.reviewKit.evidenceTracker.copySummary.mustSay should leave drain to app/design');
  expect(/screenshots/i.test(summary.mustNot || '') && /automatic upload/i.test(summary.mustNot || ''), 'provenanceDisplayContract.reviewKit.evidenceTracker.copySummary.mustNot should keep no-capture boundary');

  const lock = tracker.finalDecisionLock || {};
  expect(lock.itemId === `h10-evidence-${finalStepId}`, 'provenanceDisplayContract.reviewKit.evidenceTracker.finalDecisionLock.itemId mismatch');
  expect(lock.stepId === finalStepId, 'provenanceDisplayContract.reviewKit.evidenceTracker.finalDecisionLock.stepId mismatch');
  expect(JSON.stringify(lock.lockedUntil || []) === JSON.stringify(nonFinalIds), 'provenanceDisplayContract.reviewKit.evidenceTracker.finalDecisionLock.lockedUntil mismatch');
  expect(lock.readyStatus === 'passed-ready-to-drain', 'provenanceDisplayContract.reviewKit.evidenceTracker.finalDecisionLock.readyStatus mismatch');
  expect(lock.blockedStatus === 'blocked', 'provenanceDisplayContract.reviewKit.evidenceTracker.finalDecisionLock.blockedStatus mismatch');
  expect(lock.handoffFile === 'docs/CONTENT-HANDOFF.md', 'provenanceDisplayContract.reviewKit.evidenceTracker.finalDecisionLock.handoffFile mismatch');
  expect(JSON.stringify(lock.finalGate || {}) === JSON.stringify(reviewKit?.finalGate || {}), 'provenanceDisplayContract.reviewKit.evidenceTracker.finalDecisionLock.finalGate mismatch');
  expect((lock.mustNot || []).some(line => /tracker presence alone/i.test(line)), 'provenanceDisplayContract.reviewKit.evidenceTracker.finalDecisionLock must reject tracker-only drain');
  expect((lock.mustNot || []).some(line => /app\/design review/i.test(line)), 'provenanceDisplayContract.reviewKit.evidenceTracker.finalDecisionLock must leave receipt movement to app/design');

  checkReviewKitReceiptValidator(tracker.receiptValidator, tracker, drainContract);

  expect(tracker.coverage?.itemCount === items.length, 'provenanceDisplayContract.reviewKit.evidenceTracker.coverage.itemCount mismatch');
  expect(tracker.coverage?.nonFinalItemCount === nonFinalIds.length, 'provenanceDisplayContract.reviewKit.evidenceTracker.coverage.nonFinalItemCount mismatch');
  expect(tracker.coverage?.surfaceGroupCount === groups.length, 'provenanceDisplayContract.reviewKit.evidenceTracker.coverage.surfaceGroupCount mismatch');
  expect(tracker.coverage?.drainStepCount === steps.length, 'provenanceDisplayContract.reviewKit.evidenceTracker.coverage.drainStepCount mismatch');
  expect(tracker.coverage?.scenarioReceiptRows === scenarioReceiptRows, 'provenanceDisplayContract.reviewKit.evidenceTracker.coverage.scenarioReceiptRows mismatch');
  expect(tracker.coverage?.finalLocked === true, 'provenanceDisplayContract.reviewKit.evidenceTracker.coverage.finalLocked should be true');
  expect(tracker.coverage?.dataAloneDrainable === false, 'provenanceDisplayContract.reviewKit.evidenceTracker.coverage.dataAloneDrainable should be false');
}

function checkReviewKit(reviewKit, reviewMatrix, drainContract, copyContract, walkthrough) {
  expect(reviewKit && typeof reviewKit === 'object', 'provenanceDisplayContract.reviewKit: missing review kit');
  if (!reviewKit || typeof reviewKit !== 'object') return;

  expect(reviewKit.status === 'h10-provenance-review-kit', 'provenanceDisplayContract.reviewKit.status mismatch');
  expect(/Compact app-facing H10 review package/i.test(reviewKit.purpose || ''), 'provenanceDisplayContract.reviewKit.purpose should name compact app-facing review package');
  expect(reviewKit.appOwned === true, 'provenanceDisplayContract.reviewKit.appOwned should be true');
  expect(reviewKit.activeHandoff === 'H10', 'provenanceDisplayContract.reviewKit.activeHandoff should be H10');
  expect(reviewKit.h10DrainableFromReviewKitAlone === false, 'provenanceDisplayContract.reviewKit must not drain H10 alone');

  const pointers = reviewKit.contractPointers || {};
  for (const [key, expected] of Object.entries({
    display: 'provenanceDisplayContract',
    reviewMatrix: 'provenanceDisplayContract.reviewMatrix',
    drainContract: 'provenanceDisplayContract.drainContract',
    copyContract: 'provenanceDisplayContract.copyContract',
    walkthrough: 'provenanceDisplayContract.walkthrough',
    receiptTemplate: 'provenanceDisplayContract.drainContract.receiptTemplate'
  })) {
    expect(pointers[key] === expected, `provenanceDisplayContract.reviewKit.contractPointers.${key} mismatch`);
  }

  expect(Array.isArray(reviewKit.quickStart) && reviewKit.quickStart.length >= 5, 'provenanceDisplayContract.reviewKit.quickStart should be complete');
  expect(reviewKit.quickStart.some(line => /running app/i.test(line)), 'provenanceDisplayContract.reviewKit.quickStart should require the running app');
  expect(reviewKit.quickStart.some(line => /receiptRows/i.test(line)), 'provenanceDisplayContract.reviewKit.quickStart should mention receipt rows');
  expect(reviewKit.quickStart.some(line => /Trust Lens off by default/i.test(line)), 'provenanceDisplayContract.reviewKit.quickStart should keep Trust Lens off by default');
  expect(reviewKit.quickStart.some(line => /Leave H10 active/i.test(line)), 'provenanceDisplayContract.reviewKit.quickStart should leave H10 active before app/design final decision');

  const scenarios = reviewMatrix?.scenarios || [];
  const scenarioIds = new Set(scenarios.map(scenario => scenario.id));
  const surfaceIds = new Set((reviewMatrix?.surfaces || []).map(surface => surface.id));
  const surfaceById = new Map((reviewMatrix?.surfaces || []).map(surface => [surface.id, surface]));
  const copyBySurface = new Map((copyContract?.surfaceCopy || []).map(row => [row.surface, row]));
  const walkthroughByScenario = new Map((walkthrough?.items || []).map(item => [item.scenarioId, item]));
  const finalStepId = drainContract?.coverage?.finalStepId;
  const groups = reviewKit.surfaceGroups || [];
  expect(Array.isArray(groups) && groups.length === surfaceIds.size, 'provenanceDisplayContract.reviewKit.surfaceGroups count mismatch');
  const covered = new Set();

  for (const group of groups) {
    expect(surfaceIds.has(group.surface), `provenanceDisplayContract.reviewKit.surfaceGroups: unknown surface ${group.surface || '(missing)'}`);
    const surface = surfaceById.get(group.surface) || {};
    const copy = copyBySurface.get(group.surface) || {};
    expect(group.id === `h10-kit-${group.surface}`, `${group.surface}: reviewKit group id mismatch`);
    expect(group.routePattern === surface.routePattern, `${group.surface}: reviewKit routePattern mismatch`);
    expect(group.placement === copy.placement, `${group.surface}: reviewKit placement copy mismatch`);
    expect(group.primaryCopy === copy.primary, `${group.surface}: reviewKit primaryCopy mismatch`);
    expect(group.detailCopy === copy.detail, `${group.surface}: reviewKit detailCopy mismatch`);

    const expectedScenarios = scenarios.filter(scenario => scenario.surface === group.surface);
    const expectedScenarioIds = expectedScenarios.map(scenario => scenario.id);
    expect(JSON.stringify(group.scenarioIds || []) === JSON.stringify(expectedScenarioIds), `${group.surface}: reviewKit scenarioIds mismatch`);
    expect(JSON.stringify(group.receiptRows || []) === JSON.stringify(expectedScenarioIds), `${group.surface}: reviewKit receiptRows mismatch`);
    for (const scenarioId of group.scenarioIds || []) {
      expect(scenarioIds.has(scenarioId), `${group.surface}: reviewKit references unknown scenario ${scenarioId}`);
      covered.add(scenarioId);
    }

    const expectedRoutes = [...new Set(expectedScenarios.map(scenario => scenario.route).filter(Boolean))];
    expect(JSON.stringify(group.routes || []) === JSON.stringify(expectedRoutes), `${group.surface}: reviewKit routes mismatch`);
    const expectedRules = [...new Set(expectedScenarios.map(scenario => scenario.expected?.rule).filter(Boolean))];
    const expectedChips = [...new Set(expectedScenarios.map(scenario => scenario.expected?.chip).filter(Boolean))];
    const expectedModes = [...new Set(expectedScenarios.map(scenario => scenario.expected?.confidenceMode).filter(Boolean))];
    expect(JSON.stringify(group.expectedRules || []) === JSON.stringify(expectedRules), `${group.surface}: reviewKit expectedRules mismatch`);
    expect(JSON.stringify(group.expectedChips || []) === JSON.stringify(expectedChips), `${group.surface}: reviewKit expectedChips mismatch`);
    expect(JSON.stringify(group.expectedConfidenceModes || []) === JSON.stringify(expectedModes), `${group.surface}: reviewKit expectedConfidenceModes mismatch`);

    const expectedStepIds = [];
    for (const scenarioId of expectedScenarioIds) {
      for (const stepId of walkthroughByScenario.get(scenarioId)?.drainStepIds || []) {
        if (stepId !== finalStepId && !expectedStepIds.includes(stepId)) expectedStepIds.push(stepId);
      }
    }
    expect(JSON.stringify(group.appEvidenceStepIds || []) === JSON.stringify(expectedStepIds), `${group.surface}: reviewKit appEvidenceStepIds mismatch`);
    expect((group.passWhen || []).some(line => /receipt row/i.test(line)), `${group.surface}: reviewKit passWhen should require receipt observations`);
    for (const mustShow of surface.mustShow || []) {
      expect((group.passWhen || []).includes(mustShow), `${group.surface}: reviewKit passWhen missing surface mustShow ${mustShow}`);
    }
    for (const mustNot of surface.mustNot || []) {
      expect((group.mustNot || []).includes(mustNot), `${group.surface}: reviewKit mustNot missing surface rule ${mustNot}`);
    }
    expect((group.mustNot || []).some(line => /Do not drain H10/i.test(line)), `${group.surface}: reviewKit mustNot should block group-only drain`);
  }
  for (const scenarioId of scenarioIds) {
    expect(covered.has(scenarioId), `provenanceDisplayContract.reviewKit missing scenario ${scenarioId}`);
  }

  const receipt = reviewKit.receiptExport || {};
  expect(receipt.schema === drainContract?.receiptContract?.schema, 'provenanceDisplayContract.reviewKit.receiptExport.schema mismatch');
  expect(receipt.templatePointer === 'provenanceDisplayContract.drainContract.receiptTemplate', 'provenanceDisplayContract.reviewKit.receiptExport.templatePointer mismatch');
  expect(receipt.scenarioRows === (drainContract?.receiptTemplate?.scenarioResults || []).length, 'provenanceDisplayContract.reviewKit.receiptExport.scenarioRows mismatch');
  expect(receipt.stepRows === (drainContract?.receiptTemplate?.stepResults || []).length, 'provenanceDisplayContract.reviewKit.receiptExport.stepRows mismatch');
  expect(receipt.localOnly === true, 'provenanceDisplayContract.reviewKit.receiptExport.localOnly should be true');
  for (const field of ['screenshots', 'userValues', 'personalBrowsingHistory', 'analyticsClientId']) {
    expect((receipt.forbiddenFields || []).includes(field), `provenanceDisplayContract.reviewKit.receiptExport.forbiddenFields missing ${field}`);
  }

  expect(reviewKit.handoff?.id === 'H10', 'provenanceDisplayContract.reviewKit.handoff.id should be H10');
  expect(reviewKit.handoff?.file === 'docs/CONTENT-HANDOFF.md', 'provenanceDisplayContract.reviewKit.handoff.file mismatch');
  expect(reviewKit.handoff?.owner === 'design-app', 'provenanceDisplayContract.reviewKit.handoff.owner mismatch');
  expect(reviewKit.handoff?.drainOnlyFromAppDesign === true, 'provenanceDisplayContract.reviewKit.handoff should leave drain to app/design');
  expect(reviewKit.handoff?.currentStatus === drainContract?.status, 'provenanceDisplayContract.reviewKit.handoff currentStatus mismatch');

  expect(JSON.stringify(reviewKit.finalGate || {}) === JSON.stringify(walkthrough?.finalGate || {}), 'provenanceDisplayContract.reviewKit.finalGate should mirror walkthrough finalGate');
  checkReviewKitEvidenceTracker(reviewKit.evidenceTracker, reviewKit, drainContract);
  const tracker = reviewKit.evidenceTracker || {};
  const receiptValidator = tracker.receiptValidator || {};
  const validatorTranscript = receiptValidator.reviewTranscript || {};
  const smokeValidator = validatorTranscript.runtimeAssertionReceiptValidator || {};
  const smokeReviewTranscript = smokeValidator.reviewTranscript || {};
  const closure = reviewKit.closureManifest || {};
  expect(closure.status === 'h10-generated-review-stack-closure', 'provenanceDisplayContract.reviewKit.closureManifest.status mismatch');
  expect(/generated H10 review stack/i.test(closure.purpose || ''), 'provenanceDisplayContract.reviewKit.closureManifest.purpose should name generated H10 review stack');
  expect(closure.schema === 'h10-generated-review-stack-closure-v1', 'provenanceDisplayContract.reviewKit.closureManifest.schema mismatch');
  expect(closure.appOwned === true, 'provenanceDisplayContract.reviewKit.closureManifest.appOwned should be true');
  expect(closure.activeHandoff === 'H10', 'provenanceDisplayContract.reviewKit.closureManifest.activeHandoff should be H10');
  expect(closure.localOnly === true, 'provenanceDisplayContract.reviewKit.closureManifest.localOnly should be true');
  expect(closure.noServerAuthority === true, 'provenanceDisplayContract.reviewKit.closureManifest.noServerAuthority should be true');
  expect(closure.h10DrainableFromClosureAlone === false, 'provenanceDisplayContract.reviewKit.closureManifest should not drain H10 alone');
  expect(closure.generatedRecursionClosed === true, 'provenanceDisplayContract.reviewKit.closureManifest.generatedRecursionClosed should be true');

  const closureLayers = closure.stackLayers || [];
  const expectedClosureLayers = [
    ['display-contract', 'provenanceDisplayContract', 'h10-app-owned-provenance-display-contract'],
    ['review-matrix', 'provenanceDisplayContract.reviewMatrix', reviewMatrix?.status],
    ['copy-contract', 'provenanceDisplayContract.copyContract', copyContract?.status],
    ['walkthrough', 'provenanceDisplayContract.walkthrough', walkthrough?.status],
    ['drain-contract', 'provenanceDisplayContract.drainContract', drainContract?.status],
    ['review-kit', 'provenanceDisplayContract.reviewKit', reviewKit.status],
    ['evidence-tracker', 'provenanceDisplayContract.reviewKit.evidenceTracker', tracker.status],
    ['receipt-validator', 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator', receiptValidator.status],
    ['validator-result-copy', 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.resultCopy', receiptValidator.resultCopy?.status],
    ['validator-review-transcript', 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript', validatorTranscript.status],
    ['transcript-runtime-assertions', 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertions', 'h10-transcript-runtime-assertions'],
    ['transcript-smoke-receipt-template', 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate', validatorTranscript.runtimeAssertionReceiptTemplate?.schema],
    ['transcript-smoke-receipt-validator', 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator', smokeValidator.status],
    ['transcript-smoke-fixtures', 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.fixtureCases', 'h10-transcript-smoke-fixture-cases'],
    ['transcript-smoke-result-copy', 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy', smokeValidator.resultCopy?.status],
    ['transcript-smoke-review-transcript', 'provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript', smokeReviewTranscript.status]
  ];
  expect(JSON.stringify(closureLayers.map(row => row.id)) === JSON.stringify(expectedClosureLayers.map(row => row[0])), 'provenanceDisplayContract.reviewKit.closureManifest.stackLayers ids mismatch');
  for (const [index, [id, pointer, status]] of expectedClosureLayers.entries()) {
    const layer = closureLayers[index] || {};
    expect(layer.id === id, `${id}: closure layer id mismatch`);
    expect(layer.pointer === pointer, `${id}: closure layer pointer mismatch`);
    expect(layer.status === status, `${id}: closure layer status mismatch`);
    expect(layer.drainableFromLayerAlone === false, `${id}: closure layer must not drain alone`);
    expect(typeof layer.reviewRole === 'string' && layer.reviewRole.length > 20, `${id}: closure layer reviewRole missing`);
  }

  const closureGates = closure.appOwnedGates || [];
  const drainSteps = drainContract?.steps || [];
  expect(closureGates.length === drainSteps.length, 'provenanceDisplayContract.reviewKit.closureManifest.appOwnedGates count mismatch');
  for (const [index, step] of drainSteps.entries()) {
    const gate = closureGates[index] || {};
    expect(gate.stepId === step.id, `${step.id}: closure gate stepId mismatch`);
    expect(gate.label === step.label, `${step.id}: closure gate label mismatch`);
    expect(gate.trackedBy === 'provenanceDisplayContract.reviewKit.evidenceTracker.items', `${step.id}: closure gate trackedBy mismatch`);
    expect(gate.requiresRunningAppEvidence === (step.id !== finalStepId), `${step.id}: closure gate running-app requirement mismatch`);
    expect(gate.finalDecision === (step.id === finalStepId), `${step.id}: closure gate finalDecision mismatch`);
    expect(gate.scenarioCount === (step.scenarioIds || []).length, `${step.id}: closure gate scenarioCount mismatch`);
  }
  expect((closure.completionRules || []).some(line => /running app/i.test(line)), 'closure completionRules should require running app rendering');
  expect((closure.completionRules || []).some(line => /docs\/CONTENT-HANDOFF\.md/i.test(line)), 'closure completionRules should name handoff');
  expect((closure.completionRules || []).some(line => /screenshots/i.test(line) && /analytics identifiers/i.test(line)), 'closure completionRules should keep privacy boundary');
  expect((closure.stopRules || []).some(line => /another generated validator layer/i.test(line)), 'closure stopRules should stop validator recursion');
  expect((closure.stopRules || []).some(line => /green builds/i.test(line) && /running-app evidence/i.test(line)), 'closure stopRules should reject audit-only drain');
  expect((closure.stopRules || []).some(line => /source independence/i.test(line) && /sourceDomainCount/i.test(line)), 'closure stopRules should preserve source independence boundary');
  expect((closure.stopRules || []).some(line => /upload/i.test(line) && /automatically/i.test(line)), 'closure stopRules should reject automatic upload');
  expect((closure.nextAppActions || []).some(line => /ranked lists/i.test(line) && /Trust Lens/i.test(line)), 'closure nextAppActions should name provenance surfaces');
  expect((closure.nextAppActions || []).some(line => /local H10 receipt/i.test(line) && /transcript smoke/i.test(line)), 'closure nextAppActions should name local smoke path');
  expect((closure.nextAppActions || []).some(line => /drain H10/i.test(line) && /remaining blocker/i.test(line)), 'closure nextAppActions should name final handoff decision');
  expect(closure.coverage?.stackLayerCount === closureLayers.length, 'closure coverage stackLayerCount mismatch');
  expect(closure.coverage?.appOwnedGateCount === closureGates.length, 'closure coverage appOwnedGateCount mismatch');
  expect(closure.coverage?.finalGateId === finalStepId, 'closure coverage finalGateId mismatch');
  expect(closure.coverage?.surfaceGroupCount === groups.length, 'closure coverage surfaceGroupCount mismatch');
  expect(closure.coverage?.scenarioCount === scenarios.length, 'closure coverage scenarioCount mismatch');
  expect(closure.coverage?.generatedRecursionClosed === true, 'closure coverage generatedRecursionClosed should be true');
  expect(closure.coverage?.closureAloneDrainable === false, 'closure coverage closureAloneDrainable should be false');

  expect(reviewKit.coverage?.surfaceGroupCount === groups.length, 'provenanceDisplayContract.reviewKit.coverage.surfaceGroupCount mismatch');
  expect(reviewKit.coverage?.scenarioCount === scenarios.length, 'provenanceDisplayContract.reviewKit.coverage.scenarioCount mismatch');
  expect(reviewKit.coverage?.coveredScenarioCount === covered.size, 'provenanceDisplayContract.reviewKit.coverage.coveredScenarioCount mismatch');
  expect(reviewKit.coverage?.allScenariosCovered === true, 'provenanceDisplayContract.reviewKit.coverage.allScenariosCovered should be true');
  expect(reviewKit.coverage?.drainStepCount === (drainContract?.steps || []).length, 'provenanceDisplayContract.reviewKit.coverage.drainStepCount mismatch');
  expect(reviewKit.coverage?.receiptScenarioRows === (drainContract?.receiptTemplate?.scenarioResults || []).length, 'provenanceDisplayContract.reviewKit.coverage.receiptScenarioRows mismatch');
  expect(reviewKit.coverage?.closureStackLayerCount === closureLayers.length, 'provenanceDisplayContract.reviewKit.coverage.closureStackLayerCount mismatch');
  expect(reviewKit.coverage?.dataAloneDrainable === false, 'provenanceDisplayContract.reviewKit.coverage.dataAloneDrainable should be false');
}

function checkDisplayContract(contract, coverage, datasetsById) {
  expect(contract && typeof contract === 'object', 'app/data/index.json: missing provenanceDisplayContract');
  if (!contract || typeof contract !== 'object') return;

  expect(contract.status === 'h10-app-owned-provenance-display-contract', 'provenanceDisplayContract.status: should name H10 display contract');
  expect(/Claude H10/.test(String(contract.consumer || '')), 'provenanceDisplayContract.consumer: should name Claude H10 as consumer');
  expect(contract.h10DrainableFromDataAlone === false, 'provenanceDisplayContract.h10DrainableFromDataAlone: data contract alone must not drain H10');
  expect(JSON.stringify(contract.coverage) === JSON.stringify(coverage), `provenanceDisplayContract.coverage expected ${JSON.stringify(coverage)}, found ${JSON.stringify(contract.coverage)}`);

  const requiredFields = ['factCount', 'sourcedFactCount', 'sourceDomainCount', 'singleSource', 'primarySource', 'sourceLabels', 'noteOnlyFactCount'];
  for (const field of requiredFields) {
    expect((contract.sourceFields || []).includes(field), `provenanceDisplayContract.sourceFields: missing ${field}`);
  }

  const rules = new Map((contract.renderRules || []).map(rule => [rule.id, rule]));
  expect(rules.size === 3, 'provenanceDisplayContract.renderRules: expected multi-source, single-source, and no-source rules');
  expect(rules.get('multi-source')?.chipTemplate === '{sourceDomainCount} independent sources', 'provenanceDisplayContract: multi-source chip template drifted');
  expect(rules.get('multi-source')?.confidenceMode === 'standard', 'provenanceDisplayContract: multi-source confidence should remain standard');
  expect(rules.get('single-source')?.chipTemplate === 'One source: {primarySource}', 'provenanceDisplayContract: single-source chip template drifted');
  expect(rules.get('single-source')?.confidenceMode === 'held', 'provenanceDisplayContract: single-source confidence should be held');
  expect(/do not render each criterion/i.test(String(rules.get('single-source')?.detail || '')), 'provenanceDisplayContract: single-source detail should prohibit per-criterion corroboration');
  expect(rules.get('no-source')?.confidenceMode === 'held', 'provenanceDisplayContract: no-source confidence should be held');
  expect(/must never increase sourceDomainCount/i.test(String(contract.noteOnlyRule || '')), 'provenanceDisplayContract.noteOnlyRule: note-only facts must not count as sources');

  const lens = contract.trustLensControl || {};
  expect(lens.default === 'off', 'provenanceDisplayContract.trustLensControl.default: should be off by default');
  expect(lens.keepRule === 'sourceDomainCount > 1', 'provenanceDisplayContract.trustLensControl.keepRule: should require independent corroboration');
  expect(/do not hide them by default/i.test(String(lens.foldRule || '')), 'provenanceDisplayContract.trustLensControl.foldRule: should keep single-source visibility honest');

  const examples = contract.examples || {};
  checkDisplayExample('singleSource', examples.singleSource, datasetsById, s => s.singleSource === true, coverage.singleSourceEntries > 0);
  checkDisplayExample('multiSource', examples.multiSource, datasetsById, s => s.sourceDomainCount > 1, coverage.multiSourceEntries > 0);
  checkDisplayExample('noteOnly', examples.noteOnly, datasetsById, s => (s.noteOnlyFactCount || 0) > 0, coverage.noteOnlyEntries > 0);
  checkDisplayExample('noSource', examples.noSource, datasetsById, s => s.sourceDomainCount === 0, coverage.noSourceEntries > 0);
  checkReviewMatrix(contract.reviewMatrix, coverage, datasetsById);
  checkDrainContract(contract.drainContract, contract.reviewMatrix);
  checkCopyContract(contract.copyContract, contract.renderRules, contract.trustLensControl, contract.reviewMatrix);
  checkWalkthrough(contract.walkthrough, contract.reviewMatrix, contract.drainContract, contract.copyContract);
  checkReviewKit(contract.reviewKit, contract.reviewMatrix, contract.drainContract, contract.copyContract, contract.walkthrough);
}

function main() {
  console.log('Provenance summary audit');
  const indexPath = path.join(DATA, 'index.json');
  const index = readJson(indexPath);
  if (!index) process.exit(1);

  const categories = index.categories || [];
  let entries = 0;
  let singleSource = 0;
  let multiSource = 0;
  let noSource = 0;
  let noteOnly = 0;
  const datasetsById = new Map();

  for (const cat of categories) {
    const file = cat.file || `${cat.id}.json`;
    const dsPath = path.join(DATA, file);
    const ds = readJson(dsPath);
    if (!ds) continue;
    datasetsById.set(cat.id, ds);
    const products = ds.products || [];
    const summaries = [];

    expect(cat.n === products.length, `app/data/index.json:${cat.id}: n should match ${file} product count`);
    for (const entity of products) {
      const expected = expectedEntrySummary(ds, entity);
      summaries.push(expected);
      checkEntrySummary(cat.id, entity, expected);
    }

    const expected = expectedProfile(ds, summaries);
    checkProfile(`app/data/${file}:meta`, ds.meta && ds.meta.provenanceProfile, expected);
    checkProfile(`app/data/index.json:${cat.id}`, cat.provenanceProfile, expected);

    entries += expected.entryCount;
    singleSource += expected.singleSourceEntries;
    multiSource += expected.multiSourceEntries;
    noSource += expected.noSourceEntries;
    noteOnly += expected.noteOnlyEntries;
  }

  // 124 on 2026-08-26: the digital-services split gave messaging and browsers their own datasets.
  expect(categories.length === 124, `app/data/index.json: expected 124 categories, found ${categories.length}`);
  expect(entries > 20000, `app/data: expected broad entry coverage, found ${entries}`);
  expect(singleSource > 10000, `app/data: expected visible single-source population, found ${singleSource}`);
  expect(multiSource > 100, `app/data: expected visible multi-source population, found ${multiSource}`);
  expect(noSource < 20, `app/data: expected no-source entries to stay bounded, found ${noSource}`);

  const coverage = {
    categoryCount: categories.length,
    entryCount: entries,
    singleSourceEntries: singleSource,
    multiSourceEntries: multiSource,
    noSourceEntries: noSource,
    noteOnlyEntries: noteOnly,
  };
  checkDisplayContract(index.provenanceDisplayContract, coverage, datasetsById);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures.slice(0, 80)) console.log(`  FAIL ${failure}`);
    if (failures.length > 80) console.log(`  ... ${failures.length - 80} more`);
    process.exit(1);
  }

  console.log(`  categories checked: ${categories.length}`);
  console.log(`  entries checked: ${entries}`);
  console.log(`  single-source entries: ${singleSource}`);
  console.log(`  multi-source entries: ${multiSource}`);
  console.log(`  no-source entries: ${noSource}`);
  console.log(`  note-only entries: ${noteOnly}`);
  console.log('PROVENANCE SUMMARY CHECKS PASS');
}

main();
