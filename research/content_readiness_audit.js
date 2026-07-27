#!/usr/bin/env node
/* Content readiness audit for the editorial program.

   This does not replace verify_run.js or evidence_audit.js. It turns the
   content brief into an operating queue: which categories are presentation
   ready, which need source freshness, which need metadata polish, and where
   the "honest floor" deserves a human review.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FAILURES = [];
const WARNINGS = [];

const NOTE_OK = {
  fees: true,
  accessibility: true,
  price: true,
  economical: true,
  catalog: true,
  selection: true
};

const DESIGN_OWNED_DRAFTS = new Set();
const DESIGN_OWNED_LENSES = new Set(['banking']);
const HIGH_CHANGE = new Set([
  'ai-assistants',
  'digital-services',
  'investing',
  'laptops',
  'news-sources',
  'password-managers',
  'payments',
  'phones',
  'vpn'
]);
const FIRST_USER = new Set([
  'ai-assistants',
  'banking',
  'clothing',
  'digital-services',
  'investing',
  'learning-resources',
  'news-sources',
  'password-managers',
  'payments',
  'phones',
  'vpn'
]);

function abs(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function read(rel) {
  return fs.readFileSync(abs(rel), 'utf8');
}

function json(rel) {
  try {
    return JSON.parse(read(rel));
  } catch (err) {
    FAILURES.push(`${rel}: JSON parse failed (${err.message})`);
    return null;
  }
}

function walk(dirRel, pred, out = []) {
  const dir = abs(dirRel);
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(dirRel, ent.name);
    if (ent.isDirectory()) walk(rel, pred, out);
    else if (!pred || pred(rel)) out.push(rel);
  }
  return out;
}

function pct(n, d) {
  return d ? Math.round((n / d) * 100) : 0;
}

function frontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end < 0) return {};
  const block = text.slice(3, end).trim();
  const out = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function evidenceCoverage(ds) {
  if (!ds || !ds.criteria || !ds.products) return { good: 0, total: 0, pct: 0, level: 'none' };
  const openDB = !!(ds.meta && ds.meta.productBase);
  const tier = {};
  for (const c of ds.criteria) tier[c.key] = c.tier || 'assessed';
  let good = 0;
  let total = 0;
  for (const product of ds.products) {
    for (const criterion of ds.criteria) {
      const value = product.scores && product.scores[criterion.key];
      if (value == null) continue;
      total += 1;
      const pv = product.provenance && product.provenance[criterion.key];
      if (
        openDB
        || (pv && typeof pv === 'object' && pv.source)
        || tier[criterion.key] === 'measured'
        || tier[criterion.key] === 'certified'
        || (NOTE_OK[criterion.key] && typeof pv === 'string' && pv.trim())
      ) {
        good += 1;
      }
    }
  }
  const ratio = total ? good / total : 0;
  return {
    good,
    total,
    pct: ratio,
    level: ratio >= 0.99 ? 'complete' : ratio >= 0.66 ? 'strong' : ratio >= 0.2 ? 'partial' : 'early'
  };
}

function sourceAge(ds, id) {
  const staleYear = HIGH_CHANGE.has(id) ? 2024 : 2023;
  let dated = 0;
  let stale = 0;
  let missing = 0;
  const examples = [];

  for (const product of ds.products || []) {
    for (const criterion of ds.criteria || []) {
      const value = product.scores && product.scores[criterion.key];
      if (value == null) continue;
      const pv = product.provenance && product.provenance[criterion.key];
      if (!pv || typeof pv !== 'object') {
        missing += 1;
        continue;
      }
      const year = String(pv.asof || '').match(/\b(20\d{2})\b/);
      if (!year) {
        missing += 1;
        continue;
      }
      dated += 1;
      const y = Number(year[1]);
      if (y <= staleYear) {
        stale += 1;
        if (examples.length < 3) examples.push(`${product.code}:${criterion.key}:${y}`);
      }
    }
  }

  return { dated, stale, missing, examples };
}

function productMeta(ds) {
  const products = ds.products || [];
  const total = products.length;
  const hasDescription = products.filter(p => typeof p.description === 'string' && p.description.trim()).length;
  const hasLinks = products.filter(p => Array.isArray(p.links) && p.links.length).length;
  const hasFocuses = products.filter(p => Array.isArray(p.focuses) && p.focuses.length).length;
  const hasRegion = products.filter(p => Array.isArray(p.region) && p.region.length).length;
  return { total, hasDescription, hasLinks, hasFocuses, hasRegion };
}

function averageScore(product, criteria) {
  const values = [];
  for (const criterion of criteria || []) {
    const v = product.scores && product.scores[criterion.key];
    if (Number.isFinite(v)) values.push(v);
  }
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function floorSignals(ds) {
  const scores = [];
  let labelledFloor = false;
  for (const product of ds.products || []) {
    const avg = averageScore(product, ds.criteria || []);
    if (avg != null) scores.push({ code: product.code, avg });
    const text = [
      product.name,
      product.brand,
      product.description,
      ...(product.focuses || [])
    ].join(' ').toLowerCase();
    if (/\bfloor\b|mainstream|consumer warning|surveillance|unscreened|fossil|closed source/.test(text)) {
      labelledFloor = true;
    }
  }
  scores.sort((a, b) => a.avg - b.avg);
  const min = scores[0] || null;
  const max = scores[scores.length - 1] || null;
  return {
    min,
    max,
    hasLowScore: !!(min && min.avg <= 45),
    labelledFloor
  };
}

function guideMap() {
  const bySlug = new Map();
  const byCid = new Map();
  for (const rel of walk('content/guides', f => f.endsWith('.md'))) {
    const slug = path.basename(rel, '.md');
    const text = read(rel);
    const fm = frontmatter(text);
    bySlug.set(slug, { slug, rel, status: fm.status || 'missing', title: fm.title || slug });
    byCid.set(slug, bySlug.get(slug));
    for (const m of text.matchAll(/\(#explore\/([a-z0-9-]+)\)/g)) {
      if (!byCid.has(m[1])) byCid.set(m[1], bySlug.get(slug));
    }
  }
  return { bySlug, byCid };
}

function statusFor(row) {
  if (row.failures.length) return 'blocked';
  if (row.generated) return row.entries >= 50 && row.guideStatus === 'published' ? 'open-data steady' : 'open-data review';
  if (!row.needs.length) return 'presentation-ready';
  if (row.needs.length <= 2) return 'editorial polish';
  return 'needs governance';
}

function main() {
  if (!exists('app/data/index.json')) FAILURES.push('app/data/index.json is missing; run the dataset build first.');
  if (!exists('content/lenses')) FAILURES.push('content/lenses is missing.');
  if (!exists('content/guides')) FAILURES.push('content/guides is missing.');
  if (FAILURES.length) finish([]);

  const index = json('app/data/index.json');
  const categoryById = new Map((index && index.categories || []).map(c => [c.id, c]));
  const guides = guideMap();
  const rows = [];

  for (const [id, category] of categoryById) {
    const dataRel = path.join('app/data', category.file || `${id}.json`);
    const sourceRel = path.join('content/lenses', `${id}.json`);
    const built = json(dataRel);
    const source = exists(sourceRel) ? json(sourceRel) : null;
    const ds = source || built;
    if (!ds) continue;

    const generated = !!(ds.meta && ds.meta.productBase);
    const guide = guides.byCid.get(id);
    const evidence = evidenceCoverage(ds);
    const age = sourceAge(ds, id);
    const meta = productMeta(ds);
    const floor = floorSignals(ds);
    const entries = (ds.products || ds.items || []).length;
    const needs = [];
    const failures = [];

    if (id === 'banking') {
      const creditUnion = (ds.products || []).find(product => product.code === 'credit-union');
      const environment = creditUnion && creditUnion.provenance && creditUnion.provenance.environment;
      if (!creditUnion) failures.push('Local credit union freshness fixture is missing');
      else {
        if (creditUnion.scores && creditUnion.scores.environment !== null) {
          failures.push('Local credit union must not carry a green-financing score without institution-specific evidence');
        }
        if (!environment || environment.source !== 'https://mycreditunion.gov/about/what-credit-union' || environment.asof !== '2025') {
          failures.push('Local credit union must carry the current NCUA limitation receipt');
        }
        if (/rarely finance fossil|can't invest in stock markets|largely absent from fossil/i.test(`${creditUnion.description || ''} ${environment && environment.note || ''}`)) {
          failures.push('Local credit union still carries the unsupported structural fossil-financing claim');
        }
      }
      const bankingGuide = guides.byCid.get('banking');
      if (bankingGuide && /credit unions[^\n.]*rarely finance fossil/i.test(read(bankingGuide.rel))) {
        failures.push('ethical-banking guide still treats member ownership as fossil-free evidence');
      }
    }

    if (generated && entries < 50) failures.push('generated category below 50 scorable products');
    if (!generated && evidence.pct < 0.99) needs.push('evidence completion');
    if (!generated && age.stale > 0) needs.push('source freshness');
    if (!generated && pct(meta.hasDescription, meta.total) < 90) needs.push('descriptions');
    if (!generated && pct(meta.hasLinks, meta.total) < 90) needs.push('links');
    if (!generated && pct(meta.hasFocuses, meta.total) < 75) needs.push('focus labels');
    if (!generated && pct(meta.hasRegion, meta.total) < 90) needs.push('region labels');
    if (!generated && !floor.hasLowScore && !floor.labelledFloor) needs.push('honest-floor review');
    if (!guide) needs.push('guide link');
    else if (guide.status !== 'published' && !DESIGN_OWNED_DRAFTS.has(guide.slug)) needs.push('guide publishability');

    rows.push({
      id,
      label: category.label || (ds.meta && ds.meta.label) || id,
      entries,
      type: category.type || (ds.meta && ds.meta.type) || '',
      domain: category.domain || '',
      generated,
      designOwned: DESIGN_OWNED_LENSES.has(id),
      firstUser: FIRST_USER.has(id),
      guide: guide ? guide.slug : '',
      guideStatus: guide ? guide.status : 'missing',
      evidence,
      age,
      meta,
      floor,
      needs,
      failures
    });
  }

  for (const row of rows) row.status = statusFor(row);
  finish(rows);
}

function printQueue(title, rows, format) {
  console.log(`\n${title}`);
  if (!rows.length) {
    console.log('  none');
    return;
  }
  for (const row of rows.slice(0, 12)) console.log(`  ${format(row)}`);
}

function finish(rows) {
  for (const row of rows) {
    for (const failure of row.failures || []) FAILURES.push(`${row.id}: ${failure}`);
  }

  const curated = rows.filter(r => !r.generated);
  const generated = rows.filter(r => r.generated);
  const byStatus = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const metadataReady = curated.filter(r =>
    pct(r.meta.hasDescription, r.meta.total) >= 90
    && pct(r.meta.hasLinks, r.meta.total) >= 90
    && pct(r.meta.hasFocuses, r.meta.total) >= 75
    && pct(r.meta.hasRegion, r.meta.total) >= 90
  ).length;
  const sourceRefresh = curated
    .filter(r => r.age.stale > 0)
    .sort((a, b) => (Number(b.firstUser) - Number(a.firstUser)) || b.age.stale - a.age.stale);
  const metadataQueue = curated
    .map(r => ({
      ...r,
      missingMeta:
        (r.meta.total - r.meta.hasDescription)
        + (r.meta.total - r.meta.hasLinks)
        + (r.meta.total - r.meta.hasFocuses)
        + (r.meta.total - r.meta.hasRegion)
    }))
    .filter(r => r.missingMeta > 0)
    .sort((a, b) => (Number(b.firstUser) - Number(a.firstUser)) || b.missingMeta - a.missingMeta);
  const floorQueue = curated
    .filter(r => !r.floor.hasLowScore && !r.floor.labelledFloor)
    .sort((a, b) => (Number(b.firstUser) - Number(a.firstUser)) || a.entries - b.entries);
  const guideQueue = rows
    .filter(r => r.guideStatus !== 'published' && !(r.guide && DESIGN_OWNED_DRAFTS.has(r.guide)))
    .sort((a, b) => (Number(b.firstUser) - Number(a.firstUser)) || a.entries - b.entries);

  console.log('Content readiness audit');
  console.log(`  categories: ${rows.length} (${curated.length} curated, ${generated.length} generated/open-data)`);
  console.log(`  readiness: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log(`  metadata-ready curated lenses: ${metadataReady}/${curated.length}`);
  console.log(`  source-refresh queue: ${sourceRefresh.length}`);
  console.log(`  honest-floor review queue: ${floorQueue.length}`);
  console.log(`  guide queue: ${guideQueue.length}`);

  printQueue('Source freshness queue', sourceRefresh, r =>
    `${r.id}: ${r.age.stale} older claim(s)${r.firstUser ? ' [first-user]' : ''}${r.designOwned ? ' [design-owned]' : ''}`
  );
  printQueue('Metadata polish queue', metadataQueue, r =>
    `${r.id}: desc ${pct(r.meta.hasDescription, r.meta.total)}%, links ${pct(r.meta.hasLinks, r.meta.total)}%, focuses ${pct(r.meta.hasFocuses, r.meta.total)}%, region ${pct(r.meta.hasRegion, r.meta.total)}%`
  );
  printQueue('Honest-floor review queue', floorQueue, r =>
    `${r.id}: lowest average ${r.floor.min ? r.floor.min.avg : 'n/a'}${r.floor.min ? ` (${r.floor.min.code})` : ''}`
  );
  printQueue('Guide queue', guideQueue, r =>
    `${r.id}: ${r.guide ? `${r.guide} is ${r.guideStatus}` : 'no guide mapping found'}`
  );

  if (WARNINGS.length) {
    console.log(`\nWarnings: ${WARNINGS.length}`);
    for (const warning of WARNINGS) console.log(`  WARN ${warning}`);
  }

  if (FAILURES.length) {
    console.log(`\nFailures: ${FAILURES.length}`);
    for (const failure of FAILURES) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('\nCONTENT READINESS AUDIT COMPLETE');
}

main();
