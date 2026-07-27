#!/usr/bin/env node
// Checks project-maturity invariants that are easy to regress during large
// content/build passes. This is intentionally narrower than verify_run.js:
// it audits reviewability, current-doc drift, guide navigation, and dist shape.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];
const NON_DATA_JSON = new Set(['index.json', 'barcodes.json', 'pulse.json']);

function p(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(p(rel));
}

function read(rel) {
  return fs.readFileSync(p(rel), 'utf8');
}

function json(rel) {
  return JSON.parse(read(rel));
}

function jsonMaybe(rel) {
  if (!exists(rel)) return null;
  try {
    return json(rel);
  } catch (err) {
    failures.push(`${rel} is invalid JSON (${err.message}).`);
    return null;
  }
}

function walk(dirRel, pred, out = []) {
  const dir = p(dirRel);
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(dirRel, ent.name);
    if (ent.isDirectory()) walk(rel, pred, out);
    else if (!pred || pred(rel)) out.push(rel);
  }
  return out;
}

function sectionBetween(text, start, end) {
  const a = text.indexOf(start);
  if (a < 0) return '';
  const b = text.indexOf(end, a + start.length);
  return text.slice(a, b < 0 ? text.length : b);
}

function distMode() {
  if (!exists('dist/robots.txt')) return 'missing';
  const meta = jsonMaybe('dist/build-meta.json');
  if (!meta) {
    failures.push('dist/build-meta.json is missing; rebuild with npm run build or npm run build:preview.');
    return 'unknown';
  }
  if (!['private-preview', 'public-production'].includes(meta.mode)) {
    failures.push(`dist/build-meta.json has unsupported mode: ${meta.mode || '(missing)'}.`);
    return 'unknown';
  }
  const robots = read('dist/robots.txt');
  const netlify = exists('dist/netlify.toml') ? read('dist/netlify.toml') : '';
  const preview = /Disallow:\s*\//.test(robots) || /Private grant preview/i.test(netlify);
  const pub = /Allow:\s*\//.test(robots) && /Sitemap:/i.test(robots);
  if (preview && pub) {
    failures.push('dist/robots.txt has conflicting preview/public markers.');
    return 'conflict';
  }
  if (meta.mode === 'private-preview' && !preview) {
    failures.push('dist/build-meta.json says private-preview, but robots/netlify do not match preview posture.');
  }
  if (meta.mode === 'public-production' && !pub) {
    failures.push('dist/build-meta.json says public-production, but robots.txt does not match public posture.');
  }
  if (meta.mode === 'private-preview' && meta.appDataFallback !== true) {
    failures.push('dist/build-meta.json says private-preview but appDataFallback is not true.');
  }
  if (meta.mode === 'public-production' && meta.appDataFallback !== false) {
    failures.push('dist/build-meta.json says public-production but appDataFallback is not false.');
  }
  if (preview) return 'private-preview';
  if (pub) return 'public-production';
  failures.push('dist/robots.txt does not declare a recognizable preview or public build mode.');
  return 'unknown';
}

let cids = new Set();
let dataFiles = [];
let entryTotal = 0;

if (!exists('app/data/index.json')) {
  failures.push('Missing app/data/index.json; run python pipeline/build_datasets.py.');
} else {
  const idx = json('app/data/index.json');
  cids = new Set((idx.categories || []).map(c => c.id));
  dataFiles = fs.readdirSync(p('app/data'))
    .filter(f => f.endsWith('.json') && !NON_DATA_JSON.has(f));
  for (const f of dataFiles) {
    const d = json(path.join('app/data', f));
    entryTotal += ((d.products || d.items || []).length);
  }
}

const guideFiles = walk('content/guides', rel => rel.endsWith('.md'));
const guideSlugs = new Set(guideFiles.map(rel => path.basename(rel, '.md')));
const guideStatus = { published: 0, draft: 0, other: 0 };

for (const rel of guideFiles) {
  const text = read(rel);
  const status = (text.match(/^status:\s*(.+)$/m) || [])[1];
  if (status === 'published') guideStatus.published += 1;
  else if (status === 'draft') {
    guideStatus.draft += 1;
    failures.push(`${rel} is still draft; publish it, keep it out of the public build, or log a new explicit handoff.`);
  } else {
    guideStatus.other += 1;
    failures.push(`${rel} has missing or unknown status: ${status || '(missing)'}`);
  }

  for (const m of text.matchAll(/\(#(guide|explore)\/([^)]+)\)/g)) {
    const kind = m[1], target = m[2];
    if (kind === 'guide' && !guideSlugs.has(target)) {
      failures.push(`${rel} links to missing guide target #guide/${target}`);
    }
    if (kind === 'explore' && !cids.has(target)) {
      failures.push(`${rel} links to missing category target #explore/${target}`);
    }
  }
}

if (exists('docs/CONTENT-HANDOFF.md')) {
  const handoff = read('docs/CONTENT-HANDOFF.md');
  const guideSection = sectionBetween(handoff, '## ② Guide', '## ③ Categories');
  if (/Guide banners to wire in `CAT_GUIDE`/.test(guideSection)) {
    failures.push('CONTENT-HANDOFF still has active guide-banner wiring items; drain resolved CAT_GUIDE work.');
  }
}

if (exists('app/app.js')) {
  const app = read('app/app.js');
  const catGuidePairs = new Map();
  for (const m of app.matchAll(/['"]([a-z0-9-]+)['"]\s*:\s*['"]([a-z0-9-]+)['"]/g)) {
    catGuidePairs.set(m[1], m[2]);
  }
  for (const cid of ['dish-soap', 'fish-seafood', 'ready-meals', 'spices-seasoning', 'flour-baking']) {
    if (!catGuidePairs.has(cid)) {
      failures.push(`CAT_GUIDE appears to be missing ${cid}.`);
    }
  }
}

const currentDocs = [
  'docs/MASTERPLAN.md',
  'content/MAJOR-CONTENT-ADDITION-PREP.md',
  'docs/GRANT-ONE-PAGER.md',
  'docs/CODEX-CONTENT-BRIEF.md'
];
const stalePatterns = [
  /~57 categories/,
  /80 built datasets/,
  /Live categories:\s*80\b/,
  /18,658/,
  /18,644/,
  /18,500/,
  /92 guides/,
  /1,336/,
  /1,300 shareable/,
  /11032\/11066/,
  /categories = 57/
];
for (const rel of currentDocs) {
  if (!exists(rel)) continue;
  const text = read(rel);
  for (const pattern of stalePatterns) {
    if (pattern.test(text)) failures.push(`${rel} still contains stale current-count text matching ${pattern}.`);
  }
}

const distBuildMode = distMode();
if (exists('dist/app/index.html')) {
  if (!exists('dist/app/data/index.json')) {
    failures.push('dist/app/data/index.json is missing; hosted preview cannot boot.');
  }
  if (distBuildMode === 'private-preview' && !exists('dist/app/data.js')) {
    failures.push('dist/app/data.js is missing; file:// fallback is broken in the preview package.');
  }
  if (distBuildMode === 'public-production' && exists('dist/app/data.js')) {
    failures.push('dist/app/data.js should be omitted from the public production package.');
  }
} else {
  warnings.push('dist/app/index.html not found; run npm run build or npm run build:preview before deploy.');
}

const cardHtml = walk('app/c', rel => rel.endsWith('.html') && rel.replace(/\\/g, '/') !== 'app/c/index.html');

console.log('Maturity audit');
console.log(`  datasets: ${dataFiles.length} (${entryTotal} entries)`);
console.log(`  guides: ${guideFiles.length} (${guideStatus.published} published, ${guideStatus.draft} draft, ${guideStatus.other} other)`);
console.log(`  shareable verdict pages: ${cardHtml.length}`);
console.log(`  dist mode: ${distBuildMode}`);
console.log(`  warnings: ${warnings.length}`);
for (const w of warnings) console.log(`  WARN ${w}`);

if (failures.length) {
  console.log(`  failures: ${failures.length}`);
  for (const f of failures) console.log(`  FAIL ${f}`);
  process.exit(1);
}

console.log('ALL MATURITY CHECKS PASS');
