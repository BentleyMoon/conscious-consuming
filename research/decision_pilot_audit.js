#!/usr/bin/env node
/* Round 5 decision-page kill-test preflight.

   This proves the parts a machine can prove: coffee and banking remain the
   founder-approved category-page pilots, useful answers exist before setup, no value
   slider is required, and a different best-for-most answer is reachable in at
   most two practical dial moves. The founder's timed language/model/answer
   judgment remains deliberately human and pending.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../app/engine.js');

const ROOT = path.resolve(__dirname, '..');
const PILOTS = ['coffee', 'banking'];
const failures = [];

function read(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch (err) {
    failures.push(`${rel}: cannot read (${err.message})`);
    return '';
  }
}

function json(rel) {
  try {
    return JSON.parse(read(rel));
  } catch (err) {
    failures.push(`${rel}: invalid JSON (${err.message})`);
    return null;
  }
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function floorMatches(product, rule, category) {
  if (!product || !rule || !rule.scope || !(rule.scope.categories || []).includes(category)) return false;
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
  const rules = (floor.rules || []).filter(rule => (rule.scope && rule.scope.categories || []).includes(dataset.meta.id));
  const entries = [];
  const folded = [];
  for (const product of dataset.products || []) {
    (rules.some(rule => floorMatches(product, rule, dataset.meta.id)) ? folded : entries).push(product);
  }
  return { entries, folded };
}

function dialWeights(dataset, values) {
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
    } else {
      contributions[axis.criteria[0]].push(1 + 4 * (value / 100));
    }
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
  return entries.map(product => ({
    product,
    score: engine.score(product, { criteria: dataset.criteria, weights, excludes: new Set() }),
    tie: engine.score(product, { criteria: dataset.criteria, weights: tieWeights, excludes: new Set() })
  })).filter(row => row.score).sort((a, b) =>
    b.score.score - a.score.score ||
    ((b.tie && b.tie.score) || 0) - ((a.tie && a.tie.score) || 0) ||
    a.product.name.localeCompare(b.product.name)
  );
}

function strictMetric(dataset, product) {
  const keys = [...new Set((dataset.meta.decision.reads.basis || []).map(item => item.criterion).filter(Boolean))];
  const values = keys.map(key => product.scores && product.scores[key]);
  return values.length && values.every(Number.isFinite) ? Math.min(...values) : -1;
}

function recipes(dataset, entries, values) {
  const contract = dataset.meta.decision;
  const weights = dialWeights(dataset, values);
  const primary = ranked(dataset, entries, weights);
  const result = [];
  if (contract.archetypes.includes('best-for-most') && primary[0]) result.push({ id: 'best-for-most', product: primary[0].product });
  if (contract.archetypes.includes('strictest-match') && primary.length) {
    const strict = primary.slice().sort((a, b) => strictMetric(dataset, b.product) - strictMetric(dataset, a.product) || b.score.score - a.score.score)[0];
    if (strict) result.push({ id: 'strictest-match', product: strict.product });
  }
  if (contract.archetypes.includes('budget-honest') && contract.budget.available) {
    const known = entries.filter(product => Number.isFinite(product.scores && product.scores[contract.budget.criterion]));
    const budget = ranked(dataset, known, budgetWeights(dataset, weights));
    if (budget[0]) result.push({ id: 'budget-honest', product: budget[0].product });
  }
  return result;
}

function combinations(items, size, start = 0, prefix = [], out = []) {
  if (prefix.length === size) { out.push(prefix.slice()); return out; }
  for (let i = start; i < items.length; i += 1) combinations(items, size, i + 1, prefix.concat(items[i]), out);
  return out;
}

function changedPath(dataset, entries, defaultCode) {
  const axes = dataset.meta.decision.axes || [];
  for (let touches = 1; touches <= Math.min(2, axes.length); touches += 1) {
    for (const selected of combinations(axes, touches)) {
      const variants = 2 ** selected.length;
      for (let mask = 0; mask < variants; mask += 1) {
        const values = {};
        selected.forEach((axis, index) => { values[axis.id] = (mask & (1 << index)) ? 100 : 0; });
        const top = ranked(dataset, entries, dialWeights(dataset, values))[0];
        if (top && top.product.code !== defaultCode) return { touches, values, product: top.product };
      }
    }
  }
  return null;
}

function appContractChecks() {
  const app = read('app/app.js');
  const styles = read('app/styles.css');
  const start = app.indexOf('// J4 / Round 4. The signed decision contract is the only category configuration here.');
  const end = app.indexOf('function renderLegacyDecide(cid,facet)', start);
  const surface = start >= 0 && end > start ? app.slice(start, end) : '';
  for (const cue of [
    'function rankingHref',
    'function decisionPrimaryCategory',
    "if(cid&&decisionPrimaryCategory(cid)){location.hash=decideHref(cid,facet);return;}",
    "else if(view==='rank')",
    'listHref=rankingHref(cid,query)',
    'function decisionNextHTML',
    'decision-review-links',
  ]) expect(app.includes(cue), `app/app.js: missing Round 5 cue ${cue}`);
  // Round 5's intent: the decision dial and floor keys ride in the one key registry that export and
  // delete-all walk. The registry became multi-line on 2026-07-17 (it gained the six keys the audit
  // found unregistered), so this pins membership rather than the old single-line formatting.
  const keyRegistry = app.match(/const CC_KEYS=\[[\s\S]*?\];/);
  expect(!!keyRegistry, 'app/app.js: CC_KEYS registry missing');
  if (keyRegistry) for (const key of ['DECISION_DIAL_KEY', 'DECISION_FLOOR_KEY', 'THEMES_KEY', 'YOU_KEY', 'SAVED_KEY']) {
    expect(keyRegistry[0].includes(key), `app/app.js: CC_KEYS must register ${key}`);
  }
  expect(surface && !/how much do you care|your values/i.test(surface), 'app/app.js: pilot decision surface returned to identity-performance weighting');
  expect(styles.includes('.decision-review-links') && styles.includes('@media(max-width:600px)'), 'app/styles.css: pilot follow-through must be responsive');
  expect(read('docs/DECISION-PILOT-REVIEW.md').includes('Founder decision: approved'), 'docs/DECISION-PILOT-REVIEW.md: founder continuation approval is not recorded');
}

function main() {
  const registry = json('content/decisions.json');
  const lineRegistry = json('content/lines.json');
  const floor = lineRegistry && (lineRegistry.sets || []).find(set => set.tier === 'floor' && set.defaultOn);
  expect(!!floor, 'content/lines.json: missing default-on shared floor');
  if (!registry || !floor) return finish([]);

  const pilotPages = (registry.contracts || []).filter(contract => contract.page && contract.page.stage === 'approved-pilot').map(contract => contract.category);
  expect(pilotPages.join('|') === PILOTS.join('|'), `content/decisions.json: founder-approved page pilots must remain ${PILOTS.join(', ')}`);
  expect(registry.status === 'founder-approved', 'content/decisions.json: Round 5 founder approval must be recorded before Round 6');

  const receipts = [];
  for (const category of PILOTS) {
    const dataset = json(`app/data/${category}.json`);
    if (!dataset || !dataset.meta || !dataset.meta.decision) continue;
    const contract = dataset.meta.decision;
    expect(contract.page && contract.page.primaryRoute && contract.page.stage === 'approved-pilot', `${category}: generated page has not recorded founder approval`);
    expect((contract.axes || []).length >= 1 && (contract.axes || []).length <= 3, `${category}: needs 1-3 practical dials`);
    expect(!(contract.axes || []).some(axis => /your values|care about ethics/i.test(String(axis.question || ''))), `${category}: practical dials contain identity-performance copy`);

    const pool = candidatePool(dataset, floor);
    const defaults = recipes(dataset, pool.entries, {});
    const best = defaults.find(recipe => recipe.id === 'best-for-most');
    expect(defaults.length === 3, `${category}: zero setup must compute all three eligible recipes`);
    expect(!!best, `${category}: zero setup produced no best-for-most answer`);
    if (!best) continue;
    const groups = new Set(defaults.map(recipe => recipe.product.code));
    const changed = changedPath(dataset, pool.entries, best.product.code);
    expect(!!changed, `${category}: no changed best-for-most answer is reachable within two dial moves`);
    receipts.push({ category, best: best.product.name, groups: groups.size, folded: pool.folded.length, changed });
  }

  const banking = receipts.find(receipt => receipt.category === 'banking');
  expect(banking && banking.folded === 6, `banking: expected the bounded floor receipt of 6 folded options, found ${banking ? banking.folded : 'none'}`);
  appContractChecks();
  finish(receipts);
}

function finish(receipts) {
  console.log('Decision pilot kill-test preflight');
  for (const receipt of receipts) {
    const moves = receipt.changed ? Object.entries(receipt.changed.values).map(([axis, value]) => `${axis}=${value}`).join(', ') : 'none';
    console.log(`  ${receipt.category}: zero-setup ${receipt.best}; ${receipt.groups} distinct answer card(s); ${receipt.folded} floor fold(s)`);
    if (receipt.changed) console.log(`    changed to ${receipt.changed.product.name} in ${receipt.changed.touches} dial move(s): ${moves}`);
  }
  console.log('  machine boundary: interaction path only; founder continuation records the human pilot approval');
  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }
  console.log('DECISION PILOT PREFLIGHT PASS');
}

main();
