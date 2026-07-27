#!/usr/bin/env node
/* Maintainer freshness report for sourced lenses.

   This is deliberately a calm operating queue, not a user-facing stale badge.
   It reads provenance dates from content/lenses/*.json, prioritizes older
   claims in high-change and first-user lenses, and exits nonzero only for
   malformed local data. Old evidence is a work queue, not a release blocker.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LENSES = path.join(ROOT, 'content', 'lenses');
const CURRENT_YEAR = new Date().getUTCFullYear();
const failures = [];

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

const DESIGN_OWNED = new Set(['banking']);
const NOTE_OK = new Set(['fees', 'accessibility', 'price', 'economical', 'catalog', 'selection']);

function rel(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, '/');
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    failures.push(`${rel(file)}: JSON parse failed (${err.message})`);
    return null;
  }
}

function yearFrom(value) {
  const match = String(value || '').match(/\b(20\d{2}|19\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function truncate(value, n = 100) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > n ? `${text.slice(0, n - 3)}...` : text;
}

function categoryThreshold(id) {
  return HIGH_CHANGE.has(id) ? CURRENT_YEAR - 2 : CURRENT_YEAR - 3;
}

function lensFlags(id) {
  return [
    HIGH_CHANGE.has(id) ? 'high-change' : '',
    FIRST_USER.has(id) ? 'first-user' : '',
    DESIGN_OWNED.has(id) ? 'design-owned' : ''
  ].filter(Boolean);
}

function claimRows(file, ds) {
  const id = ds.meta?.id || path.basename(file, '.json');
  const threshold = categoryThreshold(id);
  const criteria = new Map((ds.criteria || []).map(c => [c.key, c]));
  const rows = [];
  const missing = [];
  const noteOnly = [];
  const dated = [];

  for (const product of ds.products || []) {
    const scores = product.scores || {};
    const provenance = product.provenance || {};
    for (const [key, value] of Object.entries(scores)) {
      if (value == null || !criteria.has(key)) continue;
      const pv = provenance[key];
      const base = {
        lens: id,
        file: rel(file),
        product: product.code || product.name || '(unknown)',
        criterion: key,
        label: criteria.get(key)?.label || key
      };

      if (pv && typeof pv === 'object') {
        const year = yearFrom(pv.asof);
        const row = {
          ...base,
          year,
          source: pv.source || '',
          note: pv.note || '',
          stale: year != null && year <= threshold
        };
        if (!pv.source || year == null) missing.push(row);
        else dated.push(row);
        if (row.stale) rows.push(row);
      } else if (typeof pv === 'string' && pv.trim()) {
        noteOnly.push({ ...base, note: pv, expected: NOTE_OK.has(key) ? 'accepted-note' : 'needs-dated-source' });
      } else {
        missing.push({ ...base, year: null, source: '', note: '', stale: false });
      }
    }
  }

  return { id, threshold, dated, stale: rows, missing, noteOnly };
}

function summarizeLens(scan) {
  const oldest = scan.dated.reduce((min, row) => row.year && (!min || row.year < min) ? row.year : min, null);
  return {
    id: scan.id,
    threshold: scan.threshold,
    dated: scan.dated.length,
    stale: scan.stale.length,
    missing: scan.missing.length,
    noteOnly: scan.noteOnly.length,
    oldest
  };
}

function printRows(rows, limit = 10) {
  if (!rows.length) {
    console.log('  none');
    return;
  }
  for (const row of rows.slice(0, limit)) {
    const flags = lensFlags(row.lens);
    const suffix = flags.length ? ` [${flags.join(', ')}]` : '';
    const age = row.year ? `${row.year}` : 'undated';
    console.log(`  ${row.file} :: ${row.product}.${row.criterion} (${age})${suffix}`);
    if (row.note) console.log(`    ${truncate(row.note)}`);
    if (row.source) console.log(`    ${truncate(row.source, 120)}`);
  }
  if (rows.length > limit) console.log(`  ... ${rows.length - limit} more`);
}

function main() {
  console.log('Freshness report');
  console.log('  Maintainer-only source-date queue; no user-facing stale counters.');
  console.log(`  reference year: ${CURRENT_YEAR}`);

  if (!fs.existsSync(LENSES)) {
    failures.push('content/lenses: missing directory');
  }
  if (failures.length) finish([]);

  const scans = [];
  let generatedSkipped = 0;
  for (const name of fs.readdirSync(LENSES).sort()) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(LENSES, name);
    const ds = readJson(file);
    if (!ds) continue;
    if (ds.meta?.productBase) {
      generatedSkipped += 1;
      continue;
    }
    scans.push(claimRows(file, ds));
  }

  finish(scans, generatedSkipped);
}

function finish(scans, generatedSkipped = 0) {
  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  const summaries = scans.map(summarizeLens);
  const stale = scans.flatMap(scan => scan.stale)
    .sort((a, b) =>
      (Number(FIRST_USER.has(b.lens)) - Number(FIRST_USER.has(a.lens)))
      || (a.year || 9999) - (b.year || 9999)
      || a.file.localeCompare(b.file)
      || a.product.localeCompare(b.product)
    );
  const missing = scans.flatMap(scan => scan.missing)
    .sort((a, b) => a.file.localeCompare(b.file) || a.product.localeCompare(b.product));
  const noteOnly = scans.flatMap(scan => scan.noteOnly)
    .sort((a, b) =>
      (Number(b.expected === 'needs-dated-source') - Number(a.expected === 'needs-dated-source'))
      || a.file.localeCompare(b.file)
      || a.product.localeCompare(b.product)
    );

  const lensesWithStale = summaries.filter(row => row.stale > 0)
    .sort((a, b) =>
      (Number(FIRST_USER.has(b.id)) - Number(FIRST_USER.has(a.id)))
      || (a.oldest || 9999) - (b.oldest || 9999)
      || a.id.localeCompare(b.id)
    );

  console.log(`  sourced lenses scanned: ${scans.length}`);
  console.log(`  generated/open-data lenses skipped: ${generatedSkipped}`);
  console.log(`  dated assessed claims: ${summaries.reduce((n, row) => n + row.dated, 0)}`);
  console.log(`  stale-source lenses: ${lensesWithStale.length}`);
  console.log(`  missing dated provenance: ${missing.length}`);
  console.log(`  note-only convenience provenance: ${noteOnly.length}`);

  console.log('\nLens refresh queue');
  if (!lensesWithStale.length) {
    console.log('  none');
  } else {
    for (const row of lensesWithStale.slice(0, 12)) {
      const flags = lensFlags(row.id);
      const suffix = flags.length ? ` [${flags.join(', ')}]` : '';
      console.log(`  ${row.id}: oldest ${row.oldest}, ${row.stale} claim(s) at or before ${row.threshold}${suffix}`);
    }
  }

  console.log('\nOldest claim refreshes');
  printRows(stale, 12);

  console.log('\nUndated object provenance');
  printRows(missing, 8);

  console.log('\nNote-only provenance to revisit when relevant');
  printRows(noteOnly.filter(row => row.expected === 'needs-dated-source'), 8);

  console.log('\nFRESHNESS REPORT COMPLETE');
}

main();
