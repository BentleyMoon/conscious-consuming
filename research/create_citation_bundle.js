#!/usr/bin/env node
/* Create a worked citation bundle from a current generated lens.

   This is intentionally narrow: one bundle, one query, one frozen snapshot.
   The audit is the contract; this helper just prevents hand-copy mistakes.
*/
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const engine = require('../app/engine.js');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'content', 'citation-bundles');
const OUT = path.join(OUT_DIR, 'banking-fossil-free-green.json');
const LENS_PATH = path.join(ROOT, 'app', 'data', 'banking.json');

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(canonical(value)).digest('hex');
}

function safeReason(reason) {
  if (!reason) return null;
  return {
    label: reason.label || '',
    value: reason.v,
    band: Array.isArray(reason.band) ? reason.band[0] : reason.band,
    note: reason.note || '',
    source: reason.source || '',
    asof: reason.asof || ''
  };
}

function rank(lens, weights, minCoverage = engine.MIN_COVERAGE) {
  const ctx = { criteria: lens.criteria, weights, minCoverage };
  return (lens.products || [])
    .map(product => {
      const score = engine.score(product, ctx);
      const verdict = score ? engine.verdict(product, ctx) : null;
      return { product, score, verdict };
    })
    .filter(row => row.score && row.verdict)
    .sort((a, b) => b.score.score - a.score.score || String(a.product.name || '').localeCompare(String(b.product.name || '')))
    .map((row, index) => ({
      rank: index + 1,
      code: row.product.code,
      name: row.product.name,
      score: row.score.score,
      tier: row.verdict.tier[0],
      why: row.score.why,
      coverage: row.score.coverage,
      reason: safeReason(row.verdict.reason),
      weakestAxis: engine.weakestAxis(row.product, ctx)
    }));
}

function targetMap(rows, codes) {
  const out = {};
  for (const code of codes) {
    const row = rows.find(item => item.code === code);
    if (row) out[code] = row;
  }
  return out;
}

function main() {
  const lens = JSON.parse(fs.readFileSync(LENS_PATH, 'utf8'));
  const weights = lens.meta.presets['Fossil-free & green'].w;
  const rows = rank(lens, weights);
  const snapshot = JSON.parse(JSON.stringify({
    meta: lens.meta,
    criteria: lens.criteria,
    products: lens.products
  }));
  const lensHash = engine.lensHash(snapshot);
  const snapshotSha256 = sha256(snapshot);

  const bundle = {
    format: 'open-values-citation-bundle',
    version: '0.1',
    id: 'banking-fossil-free-green',
    title: 'Ethical banking, fossil-free and green ranking',
    createdAt: '2026-07-04',
    maintainer: 'Values Commons',
    license: 'ODbL-1.0 data snapshot; CC BY-SA 4.0 explanatory text',
    purpose: 'A self-contained, re-runnable citation bundle for the reviewer question: which banking options rank highest when green financing is weighted heavily?',
    rerunCommand: 'npm run audit:citations',
    source: {
      lensPath: 'app/data/banking.json',
      lensId: 'banking',
      lensHash,
      snapshotSha256,
      engineVersion: engine.VERSION,
      generatedFromBuild: '2026-07-04T23:14:17Z'
    },
    lensAssumptions: {
      label: lens.meta.label,
      type: lens.meta.type,
      valueFrame: 'Values-relative ranking, not a universal verdict.',
      disclaimer: 'Banking comparisons are general information, not financial advice.',
      preset: 'Fossil-free & green',
      weights,
      minCoverage: engine.MIN_COVERAGE,
      criteria: lens.criteria.map(criterion => ({
        key: criterion.key,
        label: criterion.label,
        tier: criterion.tier || 'assessed'
      })),
      sort: 'score descending, then name ascending',
      caveat: 'The bundle freezes a source lens and query so the result can be rerun. Later live data may differ.'
    },
    query: {
      kind: 'rank-lens',
      focus: 'Show how the banking lens ranks when green financing and ethics are the strongest weights.',
      targetCodes: ['triodos', 'beneficial-state', 'credit-union', 'chase'],
      topN: 10
    },
    lensSnapshot: snapshot,
    expected: {
      engineVersion: engine.VERSION,
      lensHash,
      snapshotSha256,
      rankedCount: rows.length,
      top: rows.slice(0, 10),
      targets: targetMap(rows, ['triodos', 'beneficial-state', 'credit-union', 'chase'])
    }
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(bundle, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUT).replace(/\\/g, '/')}`);
  console.log(`  lens hash: ${lensHash}`);
  console.log(`  ranked: ${rows.length}`);
  console.log(`  top: ${rows[0].code} (${rows[0].score})`);
}

main();
