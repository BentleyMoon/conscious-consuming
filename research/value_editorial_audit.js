#!/usr/bin/env node
/* Q10 value-page editorial audit.

   The source preserves a five-value founder-review pilot and expands it with
   evidence-classified label families. This gate checks claim-level receipts,
   skeptical section structure, source/generated parity, and the explicit
   boundary that generated data alone does not make the copy live.
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const CERTIFIED_SECTIONS = ['requires', 'checked-by', 'limits', 'scoring'];
const ASSESSED_SECTIONS = ['evidence', 'checked-by', 'limits', 'scoring'];
const PILOT_KEYS = ['organic', 'fair_trade', 'rainforest_alliance', 'privacy', 'repairability'];
const LABEL_KEYS = ['vegan', 'palm_oil', 'cruelty_free'];
const DIGITAL_KEYS = ['openness', 'transparency', 'accessibility'];
const MATERIAL_KEYS = ['longevity', 'durability', 'packaging', 'environment'];
const SMOKE_KEYS = ['organic', 'vegan', 'palm_oil', 'privacy', 'environment'];
const READY_KEYS = [...PILOT_KEYS, ...LABEL_KEYS, ...DIGITAL_KEYS, ...MATERIAL_KEYS];
const CLASSIFICATIONS = {
  organic: 'certification-scheme',
  fair_trade: 'certification-scheme',
  rainforest_alliance: 'certification-scheme',
  privacy: 'assessed-value',
  repairability: 'assessed-value',
  vegan: 'label-family',
  palm_oil: 'ingredient-analysis',
  cruelty_free: 'label-family',
  openness: 'assessed-value',
  transparency: 'assessed-value',
  accessibility: 'assessed-value',
  longevity: 'assessed-value',
  durability: 'assessed-value',
  packaging: 'assessed-value',
  environment: 'mixed-methods',
};
const OVERCLAIM = /\b(?:proves that|guarantees that|is always ethical|is always sustainable)\b/i;
const CLASSIFICATION_COPY = {
  'certification-scheme': ['Checked standard', 'A named scheme with published rules and a checking process; its limits still matter.'],
  'label-family': ['Label family', 'Several claims or programmes share this name, so the exact source must stay visible.'],
  'ingredient-analysis': ['Ingredient analysis', 'A result inferred from listed ingredients or package data, with unknown kept as unknown.'],
  'assessed-value': ['Sourced assessment', 'A category-relative reading of cited facts, not a certification or universal scale.'],
  'mixed-methods': ['Mixed evidence', 'The evidence method changes by category, so numbers are meaningful only within a decision.'],
};

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function appValuePages() {
  const text = fs.readFileSync(path.join(ROOT, 'app', 'app.js'), 'utf8');
  const block = text.match(/const VALUE_PAGES=\{([\s\S]*?)\n\};/);
  expect(block, 'app/app.js: VALUE_PAGES block is missing');
  if (!block) return {};
  const out = {};
  for (const match of block[1].matchAll(/^\s*([a-z_]+):\{label:'([^']+)',kind:'(certified|assessed)'/gm)) {
    out[match[1]] = { label: match[2], kind: match[3] };
  }
  return out;
}

function auditClaim(key, sectionId, claim, index) {
  const prefix = `${key}:${sectionId}:claim-${index + 1}`;
  expect(typeof claim.text === 'string' && claim.text.length >= 40, `${prefix}: text must be specific, not a label`);
  expect(typeof claim.text === 'string' && claim.text.length <= 520, `${prefix}: text is too long for a calm value page`);
  expect(typeof claim.sourceLabel === 'string' && claim.sourceLabel.length >= 5, `${prefix}: sourceLabel is missing`);
  expect(/^https:\/\//.test(claim.source || ''), `${prefix}: source must be an https URL`);
  expect(/^202\d-\d{2}-\d{2}$/.test(claim.asOf || ''), `${prefix}: asOf must be a full YYYY-MM-DD date`);
  expect(!OVERCLAIM.test(claim.text || ''), `${prefix}: copy overclaims what the receipt supports`);
}

function auditEntry(key, entry, appSpec) {
  expect(entry.key === key, `${key}: repeated key mismatch`);
  expect(entry.label === appSpec.label, `${key}: label must match app VALUE_PAGES`);
  expect(entry.kind === appSpec.kind, `${key}: kind must match app VALUE_PAGES`);
  expect(entry.classification === CLASSIFICATIONS[key], `${key}: evidence classification changed`);
  expect(entry.status === 'ready-for-founder-review', `${key}: pilot status must be ready-for-founder-review`);
  expect(typeof entry.summary === 'string' && entry.summary.length >= 80 && entry.summary.length <= 300, `${key}: summary must be concise and substantive`);
  expect(!OVERCLAIM.test(entry.summary || ''), `${key}: summary overclaims`);

  const sections = entry.sections || [];
  const expectedSections = entry.kind === 'certified' ? CERTIFIED_SECTIONS : ASSESSED_SECTIONS;
  expect(same(sections.map(section => section.id), expectedSections), `${key}: expected section order ${expectedSections.join(' > ')}`);
  const sourceDomains = new Set();
  for (const section of sections) {
    expect(typeof section.heading === 'string' && section.heading.length >= 8, `${key}:${section.id}: heading is missing`);
    expect(Array.isArray(section.claims) && section.claims.length >= 1 && section.claims.length <= 2, `${key}:${section.id}: expected one or two claims`);
    for (const [index, claim] of (section.claims || []).entries()) {
      auditClaim(key, section.id, claim, index);
      try { sourceDomains.add(new URL(claim.source).hostname.replace(/^www\./, '')); } catch {}
    }
  }
  expect(sourceDomains.size >= 3, `${key}: expected receipts from at least three source domains`);

  const allCopy = JSON.stringify(entry);
  if (key === 'vegan') {
    expect(/trademark/i.test(allCopy) && /ingredient-analysis/i.test(allCopy), 'vegan: must distinguish a checked trademark from ingredient analysis');
  }
  if (key === 'palm_oil') {
    expect(/not (?:a )?(?:global )?certification|no single checker/i.test(allCopy), 'palm_oil: must not imply a certification scheme');
  }
  if (key === 'cruelty_free') {
    expect(/vegan/i.test(allCopy), 'cruelty_free: must distinguish animal-testing claims from vegan ingredient claims');
  }
  if (key === 'openness') {
    expect(/open weights alone are not/i.test(allCopy), 'openness: must distinguish open weights from open-source AI');
    expect(/category-relative/i.test(allCopy), 'openness: must preserve category-relative scoring');
  }
  if (key === 'transparency') {
    expect(/does not prove|not proof/i.test(allCopy), 'transparency: must distinguish disclosure from performance');
    expect(/60 points.*40/i.test(allCopy), 'transparency: must disclose the current beauty-field formula');
  }
  if (key === 'accessibility') {
    expect(/practical access/i.test(allCopy), 'accessibility: must name the criterion as practical access');
    expect(/not (?:a claim of )?WCAG|not presented as WCAG/i.test(allCopy), 'accessibility: must not imply WCAG conformance');
    expect(/people with disabilities/i.test(allCopy), 'accessibility: must preserve disability accessibility as a distinct concern');
  }
  if (key === 'longevity') {
    expect(/support.*track record|track record.*support/i.test(allCopy), 'longevity: must distinguish product support from organizational track record');
    expect(/must not be compared|different questions/i.test(allCopy), 'longevity: must forbid cross-rubric comparison');
  }
  if (key === 'durability') {
    expect(/distinct from.*support|support.*distinct/i.test(allCopy), 'durability: must remain distinct from support longevity');
    expect(/warranty.*not proof|warranty.*not a measured service life|not a measured service life.*warranty/i.test(allCopy), 'durability: must not treat warranty length as measured lifespan');
  }
  if (key === 'packaging') {
    expect(/not the product's whole footprint|do not score.*full life cycle/i.test(allCopy), 'packaging: must remain narrower than whole-product impact');
    expect(/reduction and reuse ahead of recycling/i.test(allCopy), 'packaging: must preserve the waste hierarchy');
  }
  if (key === 'environment') {
    expect(entry.classification === 'mixed-methods', 'environment: must remain explicitly mixed-methods');
    expect(/A, B, C, D, and E to 100, 75, 50, 25, and 0/i.test(allCopy), 'environment: must disclose the exact local food-grade mapping');
    expect(/only meaningful within that decision|cannot be compared numerically/i.test(allCopy), 'environment: must forbid cross-category score comparison');
  }
}

function auditRenderContract(contract, entries) {
  expect(Boolean(contract), 'generated: renderContract is missing');
  if (!contract) return;
  expect(contract.format === 'q10-value-page-render-v1', 'renderContract: wrong format');
  expect(contract.state === 'live-verified', 'renderContract: state must be live-verified');
  expect(contract.entryPath === 'CC_BUNDLE.index.valueEditorial.entries[key]', 'renderContract: entry path drifted');
  expect(contract.eligibleStatus === 'ready-for-founder-review', 'renderContract: eligibility status drifted');
  expect(same(contract.placement, { after: '.value-head', before: '.value-where', headingLevel: 2 }), 'renderContract: placement must preserve the computed page structure');
  expect(contract.walkMinutes === 2, 'renderContract: founder walk must remain two minutes');
  expect(contract.rendersLive === true, 'renderContract: running integration must remain marked live');
  expect(/running-app walk passed/i.test(contract.drainRule || ''), 'renderContract: drain rule must retain the passed running-app boundary');
  const verification = contract.verification || {};
  expect(verification.status === 'passed' && verification.verifiedOn === '2026-07-18', 'renderContract: running verification receipt is missing');
  expect(verification.surface === 'local running app', 'renderContract: verification surface drifted');
  expect(same(verification.routesPassed, SMOKE_KEYS), 'renderContract: verification must cover all smoke routes');
  expect((verification.assertions || []).length === 5, 'renderContract: expected five running assertions');
  expect(verification.consoleErrors === 0, 'renderContract: console verification must remain clean');

  const copy = contract.classificationCopy || {};
  expect(same(Object.keys(copy), Object.keys(CLASSIFICATION_COPY)), 'renderContract: classification copy keys drifted');
  for (const [key, [label, description]] of Object.entries(CLASSIFICATION_COPY)) {
    expect(copy[key] && copy[key].label === label, `renderContract:${key}: classification label drifted`);
    expect(copy[key] && copy[key].description === description, `renderContract:${key}: classification description drifted`);
  }

  const rules = contract.rules || [];
  const forbidden = contract.forbidden || [];
  expect(rules.length === 5, 'renderContract: expected five bounded render rules');
  expect(forbidden.length === 4, 'renderContract: expected four bounded prohibitions');
  expect(/semantic sections/i.test(rules.join(' ')) && /keyboard reachable/i.test(rules.join(' ')), 'renderContract: semantic and keyboard rules are required');
  expect(/visible source and as-of date/i.test(rules.join(' ')), 'renderContract: receipts must remain visible');
  expect(/do not hide source labels or dates/i.test(forbidden.join(' ')), 'renderContract: hidden receipts must be forbidden');
  expect(/do not remove.*Where it lives/i.test(forbidden.join(' ')), 'renderContract: computed category section must be preserved');

  const routes = contract.smokeRoutes || [];
  expect(same(routes.map(route => route.key), SMOKE_KEYS), 'renderContract: smoke routes must remain the five classification samples');
  expect(new Set(routes.map(route => route.classification)).size === Object.keys(CLASSIFICATION_COPY).length, 'renderContract: smoke routes must cover every evidence classification');
  for (const route of routes) {
    const entry = entries[route.key];
    expect(Boolean(entry), `renderContract:${route.key}: entry is missing`);
    if (!entry) continue;
    expect(route.route === `#value/${route.key}`, `renderContract:${route.key}: route drifted`);
    expect(route.classification === entry.classification, `renderContract:${route.key}: classification drifted`);
    expect(same(route.sectionIds, entry.sections.map(section => section.id)), `renderContract:${route.key}: section order drifted`);
    expect(route.expectedClaimCount === entry.sections.reduce((sum, section) => sum + section.claims.length, 0), `renderContract:${route.key}: claim count drifted`);
    expect(same(route.requiredReceiptFields, ['sourceLabel', 'source', 'asOf']), `renderContract:${route.key}: receipt fields drifted`);
    expect(route.mustHideMissingEditorialCopy === true, `renderContract:${route.key}: stale missing-editorial copy must be hidden`);
  }
}

function auditAppIntegration() {
  const app = fs.readFileSync(path.join(ROOT, 'app', 'app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'app', 'styles.css'), 'utf8');
  expect(app.includes('function valueEditorialHTML(key)'), 'app: valueEditorial renderer is missing');
  expect(app.includes('valueEditorial:idx.valueEditorial'), 'app: served-mode bootstrap must retain the valueEditorial contract');
  expect(app.includes('entry.status!==contract.eligibleStatus'), 'app: ineligible editorial must use the honesty fallback');
  expect(app.includes('contract.classificationCopy&&contract.classificationCopy[entry.classification]'), 'app: evidence classification copy is not consumed');
  expect(app.includes('<section class="value-editorial" aria-labelledby='), 'app: editorial needs a semantic labelled section');
  expect(app.includes('<section class="value-editorial-section" aria-labelledby='), 'app: editorial subsections must be semantic and labelled');
  expect(app.includes('<time datetime="${esc(claim.asOf)}">Checked ${esc(claim.asOf)}</time>'), 'app: visible checked date is missing');
  expect(app.includes('${esc(claim.sourceLabel)}</span><time'), 'app: named source must precede its visible date');
  expect(app.includes('target="_blank" rel="noopener"'), 'app: external receipts need safe new-tab behavior');
  expect(app.indexOf('${editorial}') < app.indexOf('<section class="value-where">'), 'app: editorial must render before Where it lives');
  expect(app.includes("${editorial?'':`<section class=\"value-honesty\""), 'app: honesty copy must remain a defensive fallback');
  expect(!app.includes('A certification value.'), 'app: label-family and ingredient-analysis values must not be called certifications');
  expect(styles.includes('.value-editorial-grid{'), 'app: editorial layout styles are missing');
  expect(styles.includes('.value-source:focus-visible{'), 'app: receipt links need a visible keyboard focus state');
}

function main() {
  console.log('Value editorial audit');
  const source = readJson('content/value-editorial.json');
  const generated = readJson('app/data/index.json').valueEditorial;
  const appPages = appValuePages();
  const appKeys = Object.keys(appPages);
  const sourceKeys = Object.keys(source.entries || {});

  expect(source.format === 'open-values-value-editorial', 'source: wrong format');
  expect(source.version === '0.4.0', 'source: Part 4 version must be 0.4.0');
  expect(source.state === 'environmental-durability-batch', 'source: state must describe the environmental-durability batch');
  expect(/^202\d-\d{2}-\d{2}$/.test(source.updated || ''), 'source: updated must be a full date');
  expect(same(source.requiredValues, appKeys), 'source: requiredValues must match app VALUE_PAGES in order');
  expect(same(source.pilotValues, PILOT_KEYS), 'source: pilotValues changed from the five representative samples');
  expect(same(sourceKeys, READY_KEYS), 'source: entries must cover all fifteen app values in the bounded batch order');
  expect(/existing honesty block/i.test(source.renderRule || ''), 'source: renderRule must preserve honesty for missing editorial');

  for (const key of sourceKeys) auditEntry(key, source.entries[key], appPages[key] || {});

  expect(Boolean(generated), 'app/data/index.json: valueEditorial was not generated');
  if (generated) {
    expect(same(generated.requiredValues, source.requiredValues), 'generated: requiredValues drifted from source');
    expect(same(generated.pilotValues, source.pilotValues), 'generated: pilotValues drifted from source');
    expect(same(generated.entries, source.entries), 'generated: editorial entries drifted from source');
    expect(generated.coverage.required === 15, 'generated: coverage.required must be 15');
    expect(generated.coverage.founderReviewPilot === 5, 'generated: founder-review pilot coverage must remain 5');
    expect(generated.coverage.readyForFounderReview === 15, 'generated: ready editorial coverage must be 15');
    expect(generated.coverage.remaining === 0, 'generated: remaining coverage must be 0');
    expect(same(generated.coverage.remainingValues, []), 'generated: remainingValues must be empty at full source coverage');
    expect(generated.coverage.rendersLive === true, 'generated: live app integration state regressed');
    expect(generated.coverage.appIntegration === 'live-verified', 'generated: app integration state must be live-verified');
    auditRenderContract(generated.renderContract, generated.entries);
  }

  const dataJs = fs.readFileSync(path.join(ROOT, 'app', 'data.js'), 'utf8');
  expect(dataJs.includes('"valueEditorial"'), 'app/data.js: bundled valueEditorial contract is missing');
  expect(dataJs.includes('"renderContract"'), 'app/data.js: bundled renderContract is missing');
  auditAppIntegration();

  console.log(`  app value pages: ${appKeys.length}`);
  console.log(`  founder-review pilot: ${PILOT_KEYS.length}`);
  console.log(`  label-family batch: ${LABEL_KEYS.length}`);
  console.log(`  assessed-digital batch: ${DIGITAL_KEYS.length}`);
  console.log(`  environmental-durability batch: ${MATERIAL_KEYS.length}`);
  console.log(`  ready editorial: ${sourceKeys.length}`);
  console.log(`  remaining honest gaps: ${15 - sourceKeys.length}`);
  console.log(`  render smoke routes: ${(generated && generated.renderContract && generated.renderContract.smokeRoutes || []).length}`);
  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }
  console.log('VALUE EDITORIAL CHECKS PASS');
}

main();
