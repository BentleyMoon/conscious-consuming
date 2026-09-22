#!/usr/bin/env node
/* Round 12 generality and founder-release receipt.

   Proves an illustrative Kosplora learning lens delegates to the exact shared
   decision component used by Conscious Consuming, preserves the decision
   precedence and kill-tests, and ships a review package that remains honestly
   pending human judgment.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const engine = require('../app/engine.js');
const decision = require('../app/decision.js');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
function read(rel) { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (error) { failures.push(`${rel}: cannot read (${error.message})`); return ''; } }
function expect(condition, message) { if (!condition) failures.push(message); }

function loadLens() {
  const sandbox = { window: {} };
  sandbox.window.window = sandbox.window;
  try { vm.runInNewContext(read('kosplora/lens.js'), sandbox, { filename: 'kosplora/lens.js' }); }
  catch (error) { failures.push(`kosplora/lens.js: cannot evaluate (${error.message})`); }
  return sandbox.window.OVS_LENS || null;
}

function changedInOneDial(lens, dataset, pool, defaults) {
  const baseline = defaults.recipes.find((row) => row.id === 'best-for-most');
  if (!baseline) return null;
  const tieWeights = engine.themeDefaults(lens.criteria, {}, lens.key2theme);
  for (const axis of lens.decision.axes || []) for (const value of [0, 100]) {
    const result = decision.recipes({ engine, dataset, contract: lens.decision, pool, values: { [axis.id]: value }, tieWeights });
    const best = result.recipes.find((row) => row.id === 'best-for-most');
    if (best && best.product.code !== baseline.product.code) return { axis: axis.id, value, from: baseline.product.name, to: best.product.name };
  }
  return null;
}

function main() {
  const lens = loadLens();
  const app = read('app/app.js');
  const shared = read('app/decision.js');
  const shell = read('app/shell.js');
  const appIndex = read('app/index.html');
  const kosplora = read('kosplora/shelf/index.html');
  const review = read('docs/DECISION-REFRAME-FOUNDER-REVIEW.md');
  const verify = read('scripts/verify.mjs');
  const pkg = JSON.parse(read('package.json') || '{}');

  expect(lens && lens.decision, 'Kosplora lens: illustrative decision contract missing');
  if (!lens || !lens.decision) return finish(null);
  const contract = lens.decision;
  const dataset = { meta: { id: contract.category, label: lens.meta.title }, criteria: lens.criteria, products: lens.resources };
  const pool = { base: lens.resources.slice(), entries: lens.resources.slice(), floorFolded: [], personalFolded: [], personalHidden: 0 };
  const tieWeights = engine.themeDefaults(lens.criteria, {}, lens.key2theme);
  const defaults = decision.recipes({ engine, dataset, contract, pool, values: {}, tieWeights });
  const changed = changedInOneDial(lens, dataset, pool, defaults);

  expect(decision.VERSION === '1.0', `app/decision.js: expected shared component v1.0, found ${decision.VERSION}`);
  expect(!/kosplora|learning|coffee|banking/i.test(shared), 'app/decision.js: shared component contains domain-specific branching or language');
  expect(appIndex.includes('<script src="./decision.js') && appIndex.indexOf('./decision.js') < appIndex.indexOf('./app.js'), 'app/index.html: Conscious Consuming must load the shared decision component before app.js');
  expect(kosplora.includes('<script src="../../app/decision.js') && kosplora.indexOf('../../app/decision.js') < kosplora.indexOf('../../app/shell.js'), 'kosplora/shelf/index.html: illustrative instance must load the same decision component before the shell');
  for (const call of ['CC.decisionPage.dialWeights', 'CC.decisionPage.recipes', 'CC.decisionPage.answerCardHTML', 'CC.decisionPage.dialHTML']) expect(app.includes(call), `app/app.js: shared component call missing (${call})`);
  for (const call of ['DECISION.recipes', 'DECISION.answerCardHTML', 'DECISION.dialHTML', 'DECISION.dialPosition']) expect(shell.includes(call), `app/shell.js: shared instance call missing (${call})`);

  expect(contract.status === 'illustrative', 'Kosplora decision must be marked illustrative in lens data');
  expect(kosplora.includes('Illustrative learning decision') || shell.includes('Illustrative generality receipt'), 'Kosplora surface: illustrative status is not visible');
  expect(/not (?:an endorsement|release-grade evidence)/i.test(kosplora + shell), 'Kosplora surface: evidence boundary is not plain');
  expect((contract.axes || []).length >= 1 && (contract.axes || []).length <= 3, `Kosplora decision: expected 1-3 practical axes, found ${(contract.axes || []).length}`);
  for (const axis of contract.axes || []) {
    expect(!/how much (?:do )?you care|care about ethics|your values|ethical(?:ly)?/i.test(String(axis.question || '')), `Kosplora axis ${axis.id}: identity-performance prompt`);
    expect((axis.criteria || []).every((key) => lens.criteria.some((row) => row.key === key)), `Kosplora axis ${axis.id}: undeclared criterion`);
  }
  expect(contract.budget && contract.budget.available === false, 'Kosplora decision: must not invent a budget answer without price data');
  expect((contract.archetypes || []).join('|') === 'best-for-most|strictest-match', 'Kosplora decision: archetypes must match the evidence it actually has');
  expect(defaults.recipes.length === contract.archetypes.length, `Kosplora zero setup: computed ${defaults.recipes.length}/${contract.archetypes.length} recipes`);
  expect(!!changed, 'Kosplora kill-test: no changed best-for-most answer is reachable in one practical dial move');

  expect(contract.floor && contract.floor.rules.length === 0 && /folds zero/i.test(contract.floor.reads), 'Kosplora floor: illustrative zero-fold evidence posture must be explicit');
  expect((lens.lines || []).length >= 3, 'Kosplora lens: durable learning lines missing');
  for (const line of lens.lines || []) {
    const kept = lens.resources.filter((resource) => Number.isFinite(resource.scores[line.criterion]) && resource.scores[line.criterion] >= line.minimum);
    expect(kept.length > 0 && kept.length < lens.resources.length, `Kosplora line ${line.id}: must filter some, not all, resources`);
  }
  const poolSource = shell.slice(shell.indexOf('function candidatePool()'), shell.indexOf('function floorAndLinesHTML'));
  expect(poolSource.indexOf('floorFolded=[], afterFloor=RESOURCES.slice()') < poolSource.indexOf('for(const resource of afterFloor)'), 'app/shell.js: floor must precede personal lines');
  expect(shell.includes('filtered from the answers, not erased') && shell.includes('show anyway'), 'Kosplora lines: complete show-anyway fold missing');
  expect(shell.includes('Equal scores only') && shell.includes('They cannot restore a filtered option'), 'close-call priorities: last-place tie-breaker boundary missing');

  expect(!/how much (?:do )?you care|care about ethics|set how much each matters|value sliders?/i.test(kosplora + shell), 'Kosplora surface returned to value-identity sliders');
  expect(!/type="range"/i.test(kosplora + shell), 'Kosplora-specific files must not define a parallel range control; shared decision.js owns practical ranges');
  // Strengthened 2026-07-27: the shell used to hardcode 'learning resources', which meant the
  // shared component named one instance's subject and read wrong on every other one. The receipt
  // now pins the stronger property: the count says what it counts USING THE LENS'S OWN NOUN, and
  // the shell contains no instance-specific subject at all.
  expect(shell.includes('Rank all ${result.ranked.length} eligible ${NOUN} options with these choices'), 'count: ranking scope must say what the number counts, in the noun the lens supplies');
  expect(/const NOUN\s*=\s*META\.noun/.test(shell), 'shell must take its subject noun from the lens, never hardcode one');
  expect(!/learning resources?/i.test(shell), 'shared shell must not name any single instance subject');
  // Strengthened again the same day: the noun fix above was necessary and nowhere near
  // sufficient. The shell still hardcoded Kosplora's section heading, Kosplora's dial ids, and
  // a proof block linking to Kosplora's founder review, all rendered on every other instance.
  // curl could not see any of it because the shell writes this markup client-side. The receipt
  // now pins the general property rather than one string: instance copy lives in the lens.
  for (const leak of ['Choose somewhere to learn', 'kosplora-dial', 'Conscious Consuming and this page', 'DECISION-REFRAME-FOUNDER-REVIEW']) {
    expect(!shell.includes(leak), `app/shell.js: instance-specific copy, id, or link leaked into the shared shell (${leak})`);
  }
  expect(/CONTRACT\.headline/.test(shell) && /META\.proof/.test(shell) && /META\.slug/.test(shell), 'shell must take its headline, proof block, and dial id prefix from the lens');
  expect(!!(contract.headline && lens.meta.slug && lens.meta.proof && (lens.meta.proof.links || []).length), 'Kosplora lens must supply its own headline, slug, and proof block now that the shell supplies none');
  expect(shell.includes('criteria annotated') && shell.includes('folded from ${pool.base.length}') && shell.includes('eligible ${NOUN} options ranked'), 'numbers: proof and precedence counts must carry meaning');

  for (const route of ['/app/#map', '/app/#need/learn', '/app/#decide/learning-resources', '/app/#decide/banking', '/kosplora/', '/app/#decide/coffee']) expect(review.includes(route), `founder review: missing walkthrough route ${route}`);
  expect(/Founder decision:\*\* pending human review/.test(review), 'founder review: must remain pending until a human records the decision');
  expect(review.includes('does not deploy either package') && review.includes('Public deployment remains a separate, explicit human action'), 'founder review: release/deploy boundary missing');
  for (const audit of ['decision_pilot_audit.js', 'decision_rollout_audit.js', 'floor_interface_audit.js', 'personal_precedence_audit.js', 'generality_release_audit.js']) expect(verify.includes(audit), `scripts/verify.mjs: complete kill-test gate missing ${audit}`);
  expect(pkg.scripts && pkg.scripts['audit:generality-release'] === 'node research/generality_release_audit.js', 'package.json: audit:generality-release command missing');
  expect(read('pipeline/build_site.py').includes("'DECISION-REFRAME-FOUNDER-REVIEW'"), 'release package: founder review is not rendered into dist/docs');

  finish({ defaults, changed, resources: lens.resources.length, lines: lens.lines.length });
}

function finish(receipt) {
  console.log('\nRound 12 generality + release audit');
  if (receipt) {
    console.log(`  shared component: Decision Page v${decision.VERSION}; same asset in Conscious Consuming and Kosplora`);
    console.log(`  illustrative lens: ${receipt.resources} resources · ${receipt.lines} durable lines · ${receipt.defaults.recipes.length} zero-setup recipes`);
    console.log(`  one-dial change: ${receipt.changed.from} -> ${receipt.changed.to} (${receipt.changed.axis}=${receipt.changed.value})`);
    console.log('  precedence: baseline -> rules -> named choices -> close-call priorities');
    console.log('  founder package: rendered, reproducible, human decision still pending; no deploy implied');
  }
  if (failures.length) {
    console.error(`GENERALITY + RELEASE AUDIT FAIL (${failures.length})`);
    failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exit(1);
  }
  console.log('GENERALITY + RELEASE AUDIT PASS');
}

main();
