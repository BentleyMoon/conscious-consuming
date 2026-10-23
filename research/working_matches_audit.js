#!/usr/bin/env node
/* Every number opens its working, and the working reproduces the number.

   Until 2026-09-28 the decision table's working ("Weighted result N / 100") divided plainly while
   the engine pulls a result toward 50 when facts are missing and caps it at 49 when a fact the reader
   weighs heavily scores 20 or below, so any row with a gap or a veto explained a number it did not
   show. This lifts the shipped decisionDerivationHTML out of app/app.js (not a copy of it) and runs it
   against the engine for every entry in every decision, under an even weighting and under "weigh this
   most" on each visible column, and fails on any difference.

   Proved to fail: with the 2026-09-28 fix reverted to Math.round(acc/sw) it reports thousands of
   mismatches (run with --prove to see the reverted version fail). */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engine = require(path.join(ROOT, 'app', 'engine.js'));
const app = fs.readFileSync(path.join(ROOT, 'app', 'app.js'), 'utf8');

function lift(name) {
  const start = app.indexOf('function ' + name + '(');
  if (start < 0) throw new Error(name + ' not found in app/app.js');
  const rest = app.slice(start + 1);
  const next = rest.search(/\n(\/\*|function |const |var |let )/);
  return app.slice(start, start + 1 + next);
}

let src = lift('decisionDerivationHTML');
if (process.argv.includes('--prove')) {
  src = src.replace(/Weighted result '\+\(eng\?eng\.score:\(sw\?Math\.round\(plain\):0\)\)/, "Weighted result '+(sw?Math.round(acc/sw):'0')");
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const build = new Function('DATA', 'CC', 'esc', 'decisionCriterionName', src + '\nreturn decisionDerivationHTML;');

const dataDir = path.join(ROOT, 'app', 'data');
const index = JSON.parse(fs.readFileSync(path.join(dataDir, 'index.json'), 'utf8'));
let checked = 0, rowsWithGap = 0, capped = 0, categories = 0;
const failures = [];

for (const cat of index.categories || []) {
  const file = path.join(dataDir, cat.file || (cat.id + '.json'));
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const criteria = data.criteria || [];
  const products = data.products || [];
  if (!criteria.length || !products.length) continue;
  categories++;
  const DATA = { criteria };
  const derive = build(DATA, { engine }, esc, k => k);
  const shown = criteria.slice(0, 5).map(c => c.key);
  const weightings = [null].concat(shown);
  for (const emph of weightings) {
    const weights = {};
    for (const c of criteria) weights[c.key] = c.key === emph ? 5 : 1;
    for (const p of products) {
      const s = engine.score(p, { criteria, weights, excludes: new Set() });
      if (!s) continue;
      const html = derive(p, weights);
      const m = html.match(/Weighted result (\d+) \/ 100/);
      checked++;
      if (s.coverage < 1) rowsWithGap++;
      if (s.cap) capped++;
      if (!m || +m[1] !== s.score) {
        if (failures.length < 12) failures.push(`${cat.id} / ${p.code} (${emph || 'even'}): table ${s.score}, working ${m ? m[1] : 'none'}`);
        else failures.length++;
      }
    }
  }
}

if (failures.length) {
  console.error(`WORKING MATCHES AUDIT FAILED: ${failures.length} working(s) show a different number from the table`);
  for (const f of failures.filter(Boolean)) console.error('  - ' + f);
  process.exit(1);
}
console.log(`WORKING MATCHES AUDIT PASS: ${checked} workings across ${categories} decisions reproduce their number (${rowsWithGap} with missing facts, ${capped} capped)`);
