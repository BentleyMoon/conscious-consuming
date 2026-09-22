#!/usr/bin/env node
/**
 * The sourcing promise must match the data.
 *
 * WHY THIS EXISTS: "Every fact shows its source" sat in the lines-it-will-not-cross list on the
 * home page, and 50 of 121,010 provenance records carry a note with no source URL. That is 0.041
 * per cent, and it was still a false absolute on the one claim this whole project rests on. The
 * same absolute had propagated to futurisminstitute.org and to both funder volumes, which is the
 * exact shape of the worst entry in the failure record: a claim repeated onto four pages.
 *
 * The software was never the dishonest part. engine.js normalises a note-only record, the product
 * panel prints "N scored notes have no source URL and do not count as independent sources", and the
 * verdict path emits "source not supplied". Only the headline overstated it.
 *
 * So this check ties the promise to the data. While any note-only record exists, the home page must
 * qualify the claim. If someone later sources all 50, the absolute becomes true and this check says
 * so rather than silently permitting either wording.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const expect = (cond, msg) => { if (!cond) failures.push(msg); };

// 1. Count note-only provenance across the whole corpus. A record is note-only when it carries no
//    source URL: either a bare string, or an object whose source is missing.
const idxPath = path.join(ROOT, 'app/data/index.json');
const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
const cats = Array.isArray(idx.categories) ? idx.categories : Object.values(idx.categories || {});

let total = 0;
let noteOnly = 0;
const where = [];
for (const c of cats) {
  const file = path.join(ROOT, 'app/data', c.file || `${c.id || c.slug}.json`);
  if (!fs.existsSync(file)) continue;
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const p of d.products || []) {
    for (const [key, pr] of Object.entries(p.provenance || {})) {
      if (pr === undefined || pr === null) continue;
      total += 1;
      const source = typeof pr === 'object' ? pr.source : undefined;
      if (!source) {
        noteOnly += 1;
        if (where.length < 200) where.push(`${c.id || c.slug} / ${p.name} / ${key}`);
      }
    }
  }
}

// 2. The home page must not claim an absolute while note-only records exist.
const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ABSOLUTE = /Every fact shows its source<\/b>/;
const QUALIFIED = /Every fact shows its source, or says it has none/;

if (noteOnly > 0) {
  expect(!ABSOLUTE.test(home),
    `index.html states "Every fact shows its source" as an absolute, but ${noteOnly} provenance record(s) carry a note with no source URL. Qualify the claim or source the facts.`);
  expect(QUALIFIED.test(home),
    'index.html should carry the qualified sourcing promise while note-only facts exist.');
} else {
  expect(!QUALIFIED.test(home),
    'Every fact now carries a source, so the home page no longer needs the qualifier. The absolute claim has become true and can be stated plainly.');
}

// 3. The app must keep disclosing the shortfall where a reader meets it.
const appJs = fs.readFileSync(path.join(ROOT, 'app/app.js'), 'utf8');
expect(appJs.includes('noteOnlyFactCount'),
  'app.js no longer surfaces noteOnlyFactCount; a reader would not be told which facts lack a source.');
expect(/do not count as independent sources/.test(appJs),
  'app.js no longer tells the reader that note-only facts are excluded from the independent-source count.');

const pct = total ? ((noteOnly / total) * 100).toFixed(3) : '0';
console.log(`  provenance records: ${total}`);
console.log(`  note-only (no source URL): ${noteOnly} (${pct}%)`);
if (noteOnly) {
  const cats = [...new Set(where.map((w) => w.split(' / ')[0]))];
  console.log(`  categories affected: ${cats.join(', ')}`);
  console.log(`  these are disclosed in the app and excluded from independent-source counts.`);
}

if (failures.length) {
  console.error('\nSOURCE PROMISE AUDIT FAIL');
  failures.forEach((f) => console.error(`  FAIL ${f}`));
  process.exit(1);
}
console.log('SOURCE PROMISE AUDIT PASS');
