#!/usr/bin/env node
/* Citation bundle audit.

   A citation bundle is a frozen lens snapshot + values query + expected
   output. This audit reruns the bundle with the Open Values Engine and checks
   that the result still matches the expected object. It is deliberately about
   re-runnability, not app rendering.
*/
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const engine = require('../app/engine.js');

const ROOT = path.resolve(__dirname, '..');
const BUNDLE_DIR = path.join(ROOT, 'content', 'citation-bundles');
const DIST_DIR = path.join(ROOT, 'dist', 'citation-bundles');
const DIST_META = path.join(ROOT, 'dist', 'build-meta.json');
const BUILD_SITE = path.join(ROOT, 'pipeline', 'build_site.py');
const failures = [];
const warnings = [];

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

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

function read(file, required = true) {
  if (!fs.existsSync(file)) {
    if (required) failures.push(`${rel(file)}: missing file`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function readJson(file, required = true) {
  const text = read(file, required);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    failures.push(`${rel(file)}: invalid JSON (${err.message})`);
    return null;
  }
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isString(value) {
  return typeof value === 'string' && value.trim().length > 0;
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

function comparableRow(row) {
  return {
    rank: row.rank,
    code: row.code,
    name: row.name,
    score: row.score,
    tier: row.tier,
    why: row.why,
    coverage: row.coverage,
    reason: row.reason,
    weakestAxis: row.weakestAxis
  };
}

function rank(bundle) {
  const lens = bundle.lensSnapshot || {};
  const weights = bundle.lensAssumptions && bundle.lensAssumptions.weights;
  const minCoverage = bundle.lensAssumptions && bundle.lensAssumptions.minCoverage;
  const ctx = { criteria: lens.criteria || [], weights: weights || {}, minCoverage };
  return (lens.products || [])
    .map(product => {
      const score = engine.score(product, ctx);
      const verdict = score ? engine.verdict(product, ctx) : null;
      return { product, score, verdict };
    })
    .filter(row => row.score && row.verdict)
    .sort((a, b) => b.score.score - a.score.score || String(a.product.name || '').localeCompare(String(b.product.name || '')))
    .map((row, index) => comparableRow({
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
  for (const code of codes || []) {
    const row = rows.find(item => item.code === code);
    if (row) out[code] = row;
  }
  return out;
}

function same(a, b) {
  return canonical(a) === canonical(b);
}

function checkBundle(file, bundle) {
  if (!bundle) return { entities: 0 };
  expect(bundle.format === 'open-values-citation-bundle', `${rel(file)}: format must be open-values-citation-bundle`);
  expect(String(bundle.version || '').startsWith('0.1'), `${rel(file)}: version must start with 0.1`);
  expect(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(bundle.id || '')), `${rel(file)}: id must be stable kebab-case`);
  expect(isString(bundle.title), `${rel(file)}: title is required`);
  expect(isString(bundle.purpose), `${rel(file)}: purpose is required`);
  expect(bundle.rerunCommand === 'npm run audit:citations', `${rel(file)}: rerunCommand should be npm run audit:citations`);

  const lens = bundle.lensSnapshot;
  expect(isObject(lens), `${rel(file)}: missing lensSnapshot`);
  expect(isObject(lens && lens.meta), `${rel(file)}: lensSnapshot.meta is required`);
  expect(Array.isArray(lens && lens.criteria) && lens.criteria.length > 0, `${rel(file)}: lensSnapshot.criteria must be non-empty`);
  expect(Array.isArray(lens && lens.products) && lens.products.length > 0, `${rel(file)}: lensSnapshot.products must be non-empty`);

  const assumptions = bundle.lensAssumptions || {};
  expect(isObject(assumptions), `${rel(file)}: missing lensAssumptions`);
  expect(isString(assumptions.valueFrame) && /values-relative/i.test(assumptions.valueFrame), `${rel(file)}: lensAssumptions.valueFrame should state values-relative ranking`);
  expect(isString(assumptions.disclaimer), `${rel(file)}: lensAssumptions.disclaimer is required`);
  expect(isObject(assumptions.weights), `${rel(file)}: lensAssumptions.weights is required`);
  expect(Array.isArray(assumptions.criteria) && assumptions.criteria.length === (lens.criteria || []).length, `${rel(file)}: lensAssumptions.criteria should mirror lens criteria`);

  const keys = new Set((lens.criteria || []).map(criterion => criterion.key));
  for (const [key, value] of Object.entries(assumptions.weights || {})) {
    expect(keys.has(key), `${rel(file)}: weight ${key} is not declared in criteria`);
    expect(Number.isFinite(value) && value >= 0 && value <= 5, `${rel(file)}: weight ${key} must be 0..5`);
  }

  const source = bundle.source || {};
  const expected = bundle.expected || {};
  const lensHash = engine.lensHash(lens);
  const snapshotSha256 = sha256(lens);
  expect(source.engineVersion === engine.VERSION, `${rel(file)}: source.engineVersion should match current engine`);
  expect(expected.engineVersion === engine.VERSION, `${rel(file)}: expected.engineVersion should match current engine`);
  expect(source.lensHash === lensHash, `${rel(file)}: source.lensHash should match lensSnapshot`);
  expect(expected.lensHash === lensHash, `${rel(file)}: expected.lensHash should match lensSnapshot`);
  expect(source.snapshotSha256 === snapshotSha256, `${rel(file)}: source.snapshotSha256 should match lensSnapshot`);
  expect(expected.snapshotSha256 === snapshotSha256, `${rel(file)}: expected.snapshotSha256 should match lensSnapshot`);

  const rows = rank(bundle);
  expect(expected.rankedCount === rows.length, `${rel(file)}: expected.rankedCount should match rerun`);
  const topN = Math.max(0, Number(bundle.query && bundle.query.topN) || 0);
  const top = rows.slice(0, topN);
  expect(same(expected.top, top), `${rel(file)}: expected.top does not match rerun`);
  const targets = targetMap(rows, bundle.query && bundle.query.targetCodes);
  expect(same(expected.targets, targets), `${rel(file)}: expected.targets does not match rerun`);
  expect(top.length > 0 && top[0].score >= 60, `${rel(file)}: top result should be meaningfully ranked`);
  expect(Object.values(targets).every(row => row.reason && (row.reason.source || row.reason.note)), `${rel(file)}: target rows should carry reasons`);

  return { entities: (lens.products || []).length };
}

function bundleFiles() {
  if (!fs.existsSync(BUNDLE_DIR)) {
    failures.push('content/citation-bundles: missing directory');
    return [];
  }
  return fs.readdirSync(BUNDLE_DIR)
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => path.join(BUNDLE_DIR, name));
}

function checkPackaging(files) {
  const buildSite = read(BUILD_SITE);
  expect(buildSite.includes('citation-bundles'), 'pipeline/build_site.py: should package citation bundles');
  if (!fs.existsSync(DIST_META)) {
    warnings.push('dist/build-meta.json missing; source citation bundles checked only');
    return 0;
  }
  let packaged = 0;
  for (const sourceFile of files) {
    const distFile = path.join(DIST_DIR, path.basename(sourceFile));
    if (!fs.existsSync(distFile)) {
      failures.push(`${rel(distFile)}: missing packaged citation bundle`);
      continue;
    }
    packaged += 1;
    const sourceText = fs.readFileSync(sourceFile, 'utf8').trim();
    const distText = fs.readFileSync(distFile, 'utf8').trim();
    if (sourceText !== distText) failures.push(`${rel(distFile)}: does not match ${rel(sourceFile)}`);
  }
  return packaged;
}

function main() {
  console.log('Citation bundle audit');
  const files = bundleFiles();
  let entities = 0;
  for (const file of files) {
    const result = checkBundle(file, readJson(file));
    entities += result.entities;
  }
  const packaged = checkPackaging(files);

  console.log(`  bundles: ${files.length}`);
  console.log(`  frozen entities: ${entities}`);
  console.log(`  packaged: ${packaged}`);
  console.log(`  warnings: ${warnings.length}`);
  for (const warning of warnings) console.log(`  WARN ${warning}`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('CITATION BUNDLE CHECKS PASS');
}

main();
