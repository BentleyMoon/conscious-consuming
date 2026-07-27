#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const expect = (condition, message) => { if (!condition) failures.push(message); };

function floorMatches(product, rule, category) {
  if (!rule.scope || !(rule.scope.categories || []).includes(category)) return false;
  const match = rule.match || {};
  const value = product.scores && product.scores[match.criterion];
  if (match.type !== 'criterion-band' || !Number.isFinite(value) || value >= Number(match.maximumExclusive)) return false;
  const receipt = product.provenance && product.provenance[match.criterion];
  if (match.requiresSource && !(receipt && typeof receipt === 'object' && /^https?:\/\//.test(String(receipt.source || '')))) return false;
  if (match.requiresAsOf && !(receipt && typeof receipt === 'object' && String(receipt.asof || '').trim())) return false;
  return true;
}

function contractChecks() {
  const registry = json('content/lines.json');
  const selection = registry.portableSelection || {};
  expect(selection.format === 'open-values-line-selection', 'content/lines.json: portable selection format missing');
  expect(selection.version === '0.1', 'content/lines.json: portable selection version must be 0.1');
  expect(selection.merge === 'additive', 'content/lines.json: imports must be additive');
  expect(selection.unknownRuleIds === 'report-not-apply', 'content/lines.json: unknown ids must be reported, never guessed');
  for (const kind of ['allergy', 'diet', 'require', 'avoid']) expect((selection.portableKinds || []).includes(kind), 'content/lines.json: portable kind missing: ' + kind);
  expect(selection.customAvoid && selection.customAvoid.allowed === true, 'content/lines.json: custom avoid portability missing');
  expect(/Round 7/i.test(selection.namedConsumer || ''), 'content/lines.json: named consumer must identify Round 7');

  const sandbox = {};
  vm.runInNewContext(read('app/lines.js'), sandbox, { filename: 'app/lines.js' });
  expect(JSON.stringify(sandbox.CC && sandbox.CC.LINE_SELECTION) === JSON.stringify(selection), 'app/lines.js: portable selection contract drifted from content source');

  const decisions = json('content/decisions.json');
  expect(/Round 7/i.test((decisions.consumer || {}).page || ''), 'content/decisions.json: decision-page consumer must name Round 7');
}

function bankingReceipt() {
  const registry = json('content/lines.json');
  const banking = json('app/data/banking.json');
  const floor = (registry.sets || []).find((set) => set.tier === 'floor' && set.defaultOn);
  const rules = (floor.rules || []).filter((rule) => (rule.scope && rule.scope.categories || []).includes('banking'));
  const floorFolded = banking.products.filter((product) => rules.some((rule) => floorMatches(product, rule, 'banking')));
  const afterFloor = banking.products.filter((product) => !floorFolded.includes(product));
  const bCorp = (registry.lines || []).find((line) => line.id === 'require:b-corp');
  const accepts = bCorp.accept || [];
  const eligible = afterFloor.filter((product) => (product.focuses || product.labels || []).some((focus) => accepts.includes(focus)));
  const personalFolded = afterFloor.filter((product) => !eligible.includes(product));
  expect(banking.products.length === 25, 'banking receipt: expected 25 pilot options');
  expect(floorFolded.length === 6, 'banking receipt: shared floor must fold 6 first');
  expect(personalFolded.length === 15, 'banking receipt: B Corp line must then filter 15 of the remainder');
  expect(eligible.length === 4, 'banking receipt: four B Corp options must remain dial-eligible');
  expect(floorFolded.length + personalFolded.length + eligible.length === banking.products.length, 'banking receipt: precedence partitions must be complete and non-overlapping');
}

function appChecks() {
  const app = read('app/app.js');
  const shared = read('app/decision.js');
  const styles = read('app/styles.css');
  const index = read('app/index.html');
  for (const cue of [
    'function decisionActivePersonalLines()',
    'function decisionPersonalFilter(entries)',
    'personalFolded:personal.folded',
    'function decisionPersonalFoldHTML(pool)',
    'function decisionPopulatePersonalFold(contract,pool,values)',
    'Filtered by your rules:',
    'function decisionPrecedenceHTML(pool,result)',
    'Advanced: Close-call priorities',
    'Rules decide eligibility. Your choices decide order.',
    'data-decision-leaning',
    'function personalLineSelection()',
    'function applyPersonalLineSelection(selection)',
    'p.lines=personalLineSelection()',
    'unknown rule id',
    'function loadFullDataBundle()',
    "const categoryRoute=['decide','explore','rank','item','card'].includes(routeView)"
  ]) expect(app.includes(cue), 'app/app.js: missing Round 7 cue: ' + cue);

  const candidateStart = app.indexOf('function decisionCandidatePool');
  const candidateEnd = app.indexOf('function decisionWeights', candidateStart);
  const candidate = app.slice(candidateStart, candidateEnd);
  expect(candidate.indexOf('floorFolded') < candidate.indexOf('decisionPersonalFilter(afterFloor)'), 'app/app.js: personal lines must run after the shared floor');
  expect(app.includes('CC.decisionPage.ranked') && /b\.score\.score-a\.score\.score\|\|\s*\(\(b\.tie&&b\.tie\.score\)\|\|0\)-\(\(a\.tie&&a\.tie\.score\)\|\|0\)/.test(shared), 'app/decision.js: dial score must sort before leaning tie score');

  const renderHome = app.slice(app.indexOf('function renderHome()'), app.indexOf('// The starter lines on home'));
  expect(renderHome.includes('const hasLines=decisionActivePersonalLines().length>0;'), 'app/app.js: data-free Home must derive its line state before rendering');
  expect(renderHome.includes('id="starterlines"'), 'app/app.js: home must expose optional starter lines');
  expect(!renderHome.includes('Find my values'), 'app/app.js: home must not lead with an identity quiz');
  expect(!renderHome.includes('href="#values/quiz"'), 'app/app.js: home identity quiz must not be a primary or secondary action');
  expect(renderHome.includes('<details class="homedemo"'), 'app/app.js: legacy value demo must stay behind fine-tune disclosure');

  const boot = app.slice(app.indexOf('function boot()'), app.indexOf('boot().then'));
  expect(boot.includes("const startId=requested||(categoryRoute&&sv&&sv.category"), 'app/app.js: non-category routes must not preload a remembered category');
  expect(boot.includes('return start?loadCategory(start):Promise.resolve();'), 'app/app.js: Home and You must boot without a product dataset');

  const renderYou = app.slice(app.indexOf('function renderYou()'), app.indexOf('function renderSaved()', app.indexOf('function renderYou()')));
  expect(renderYou.indexOf('My rules') < renderYou.indexOf('Advanced: Close-call priorities'), 'app/app.js: You page must lead with rules before Advanced');
  expect(renderYou.includes('Older compatible files still upload safely.'), 'app/app.js: file backward compatibility must be explained');
  expect(index.includes('aria-label="Advanced: close-call priorities"'), 'app/index.html: values utility must point to Advanced');
  expect(index.includes('You: my rules and data'), 'app/index.html: You utility must name rules, not a value identity');

  for (const cue of [
    '.decision-personal>summary',
    '.decision-personal-rule',
    '.decision-personal-fold>summary',
    '.decision-personal-fold-list',
    '.decision-finetune>summary',
    '.decision-precedence ol',
    '.decision-leanings .themechip',
    '.youleanings>summary',
    '.home-lines .themechip',
    '@media(max-width:760px)'
  ]) expect(styles.includes(cue), 'app/styles.css: missing Round 7 cue: ' + cue);
  expect(/decision-personal>summary[^}]*min-height:44px/.test(styles), 'app/styles.css: personal-line receipt door needs a 44px target');
  expect(/decision-leanings \.themechip\{min-height:44px/.test(styles), 'app/styles.css: leaning chips need 44px targets');
}

contractChecks();
bankingReceipt();
appChecks();

if (failures.length) {
  console.error('personal_precedence_audit FAILED (' + failures.length + ')');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}

console.log('personal_precedence_audit PASS — banking partitions 6 baseline + 15 personal + 4 choice-eligible; rules travel; close-call priorities break ties last');
