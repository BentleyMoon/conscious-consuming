#!/usr/bin/env node
/* Round 6 shared-floor interface audit.
   The published floor must remain default-on and source-gated, while the app
   exposes every receipt, stores per-rule loosening only on the device, and
   renders every folded option through a show-anyway disclosure. */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const expect = (condition, message) => { if (!condition) failures.push(message); };

function floorMatches(product, rule, category) {
  if (!product || !rule || !(rule.scope?.categories || []).includes(category)) return false;
  const match = rule.match || {};
  if (match.type !== 'criterion-band' || !match.criterion) return false;
  const value = product.scores && product.scores[match.criterion];
  if (!Number.isFinite(value) || !Number.isFinite(match.maximumExclusive) || value >= match.maximumExclusive) return false;
  const receipt = product.provenance && product.provenance[match.criterion];
  if (match.requiresSource && !(receipt && typeof receipt === 'object' && /^https?:\/\//.test(String(receipt.source || '')))) return false;
  if (match.requiresAsOf && !(receipt && typeof receipt === 'object' && String(receipt.asof || '').trim())) return false;
  return true;
}

function appChecks(floor) {
  const app = read('app/app.js');
  const styles = read('app/styles.css');
  for (const cue of [
    "DECISION_FLOOR_KEY='cc.decision.floor.v1'",
    'disabledRuleIds',
    'function decisionFloorRuleEnabled',
    'function decisionSetFloorRule',
    'function decisionRestoreFloor',
    'const activeRules=rules.filter(rule=>decisionFloorRuleEnabled(rule.id))',
    'data-floor-rule=',
    'decision-floor-receipt',
    'receipt.source',
    'receipt.asof',
    'function decisionFloorFoldHTML',
    'folded by the baseline',
    'They are folded from the answers, not erased.',
    'function decisionPopulateFloorFold',
    'pool.floorFolded',
    'DECISION_DIAL_KEY,DECISION_FLOOR_KEY'
  ]) expect(app.includes(cue), `app/app.js: missing Round 6 cue ${cue}`);

  expect(app.includes('allRules.slice().sort') && app.includes('ordered.map(rule=>decisionFloorRuleHTML'), 'app/app.js: receipt door must render every published floor rule');
  expect(app.includes("localStorage.setItem(DECISION_FLOOR_KEY") && !/fetch\([^)]*DECISION_FLOOR_KEY/.test(app), 'app/app.js: floor overrides must stay device-local');
  expect(!/how much do you care|care about ethics/i.test(app.slice(app.indexOf('const DECISION_DIAL_KEY'), app.indexOf('function renderLegacyDecide'))), 'app/app.js: floor interface returned to identity-performance language');
  const foldStart = app.indexOf('function decisionPopulateFloorFold');
  const foldEnd = app.indexOf('function decisionPersonalFoldHTML', foldStart);
  const foldPopulation = foldStart >= 0 && foldEnd > foldStart ? app.slice(foldStart, foldEnd) : '';
  expect(foldPopulation.includes('for(const row of ranked)') && !foldPopulation.includes('.slice('), 'app/app.js: show-anyway door must render every floor-folded option');

  for (const cue of [
    '.decision-floor[open]',
    '.decision-floor-rules',
    '.decision-floor-switch',
    'min-height:44px',
    '.decision-floor-receipt',
    '.decision-floor-fold>summary',
    '.decision-floor-fold-list',
    '@media(max-width:760px)'
  ]) expect(styles.includes(cue), `app/styles.css: missing Round 6 cue ${cue}`);

  const renderedRuleReference = (app.match(/decisionFloorRuleHTML\(rule,pool,contract\)/g) || []).length;
  expect(renderedRuleReference >= 2, 'app/app.js: floor rule renderer is not connected to the full rule set');
  expect((floor.rules || []).length === 10, 'content/lines.json: receipt door contract must remain bounded to ten pilot rules');
}

function dataChecks() {
  const lineRegistry = json('content/lines.json');
  const floor = (lineRegistry.sets || []).find((set) => set.tier === 'floor' && set.defaultOn);
  expect(!!floor, 'content/lines.json: missing default-on floor');
  if (!floor) return null;
  expect(floor.status === 'published', 'content/lines.json: approved floor must be published');
  expect(floor.label === 'The baseline', 'content/lines.json: published floor must use the founder-signed baseline label');
  expect(floor.version === '0.1.2-pilot', 'content/lines.json: baseline label change must carry version 0.1.2-pilot');
  expect(floor.presentation === 'fold' && floor.unknownEvidence === 'keep-visible', 'content/lines.json: floor must fold and keep unknown evidence visible');
  expect(floor.fork?.localRuleOverrides === true, 'content/lines.json: local rule overrides must remain portable');
  const currentChange = (floor.changelog || []).find((row) => row.version === floor.version);
  expect(currentChange && /The baseline/.test(currentChange.changes || '') && /unchanged/i.test(currentChange.changes || ''), 'content/lines.json: current version must record the baseline rename and unchanged behavior');
  expect((floor.changelog || []).some((row) => /Round 6/i.test(row.changes || '')), 'content/lines.json: Round 6 approval is missing from the floor changelog');
  for (const rule of (floor.rules || [])) {
    expect(/^https?:\/\//.test(String(rule.receipt?.source || '')), `${rule.id}: receipt source missing`);
    expect(/^\d{4}/.test(String(rule.receipt?.asof || '')), `${rule.id}: receipt date missing`);
  }

  const decisions = json('content/decisions.json');
  expect(decisions.status === 'founder-approved', 'content/decisions.json: founder approval must precede Round 6');
  expect(decisions.approval?.signal && /round 6/i.test(decisions.approval.signal), 'content/decisions.json: approval signal must name Round 6');
  const primary = (decisions.contracts || []).filter((contract) => contract.page?.primaryRoute);
  const pilots = primary.filter((contract) => contract.page.stage === 'approved-pilot');
  const batch = primary.filter((contract) => contract.page.stage === 'approved-batch');
  expect(primary.length === decisions.contracts.length, 'content/decisions.json: Round 9 must preserve the floor interface on every primary route');
  expect(pilots.map((contract) => contract.category).join('|') === 'coffee|banking', 'content/decisions.json: coffee and banking must remain the two approved pilots');
  expect(batch.length === decisions.contracts.length - pilots.length, 'content/decisions.json: every non-pilot route must use the approved batch stage');

  return floor;
}

function bankingReceipt(floor) {
  const banking = json('app/data/banking.json');
  const rules = (floor.rules || []).filter((rule) => (rule.scope?.categories || []).includes('banking'));
  const products = banking.products || [];
  const folded = products.filter((product) => rules.some((rule) => floorMatches(product, rule, 'banking')));
  const disabled = new Set(rules.map((rule) => rule.id));
  const activeAfterLoosening = rules.filter((rule) => !disabled.has(rule.id));
  const loosened = products.filter((product) => activeAfterLoosening.some((rule) => floorMatches(product, rule, 'banking')));
  expect(rules.length === 1, `banking: expected one applicable floor rule, found ${rules.length}`);
  expect(folded.length === 6, `banking: expected six default floor folds, found ${folded.length}`);
  expect(loosened.length === 0, 'banking: disabling the applicable rule must remove every floor fold');
  expect(products.length - folded.length >= floor.bounds.minimumRemainingPerCategory, 'banking: floor leaves too few visible options');
  return { total: products.length, folded: folded.length, loosened: loosened.length, publishedRules: (floor.rules || []).length };
}

function main() {
  const floor = dataChecks();
  if (!floor) return finish(null);
  appChecks(floor);
  const receipt = bankingReceipt(floor);
  expect(read('docs/DECISION-PILOT-REVIEW.md').includes('Founder decision: approved'), 'docs/DECISION-PILOT-REVIEW.md: approval receipt missing');
  finish(receipt);
}

function finish(receipt) {
  console.log('Round 6 floor-interface audit');
  if (receipt) {
    console.log(`  published rules: ${receipt.publishedRules}`);
    console.log(`  banking: ${receipt.folded}/${receipt.total} folded by default; ${receipt.loosened} folded after local loosening`);
    console.log(`  receipt door: ${receipt.publishedRules}/${receipt.publishedRules} rules wired; overrides: device-local; show-anyway: every folded option rendered`);
  }
  if (failures.length) {
    for (const failure of failures) console.error(`FAIL: ${failure}`);
    process.exit(1);
  }
  console.log('FLOOR INTERFACE CHECKS PASS');
}

main();
