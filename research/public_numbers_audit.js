#!/usr/bin/env node
/* Public numbers audit: every count the project states in public is recounted from the data.

   research/maturity_audit.js catches stale counts by matching a list of old values, so it can only
   ever catch the staleness someone already noticed. In September 2026 llms.txt, the file written for
   AI summarisers, still said 88 categories, 23,689 entries, 100 guides, 2,919 pages and 220 withheld
   measures, two months after every one of them had moved, and the grant one-pager repeated four of
   them. Nothing matched, because none of those values was on the list.

   This audit derives the current numbers and checks each stated number against them. An exact
   figure must equal the count. A figure written as a floor ("120+", "more than 120") must not exceed
   it. "about" or "~" allows five per cent. Run: node research/public_numbers_audit.js */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(ROOT, rel));

// The documents that state current counts to the public. The working repository keeps the public
// README at docs/README-public.md and its own README.md is a working note, so the public one is read
// from wherever it is.
const PUBLIC_README = exists('docs/README-public.md') ? 'docs/README-public.md' : 'README.md';
const CLAIM_FILES = ['llms.txt', PUBLIC_README, 'docs/GRANT-ONE-PAGER.md', 'docs/GRANT-PREVIEW-PATH.md',
  'index.html', 'funders/index.html', 'standard/index.html'].filter(exists);

function derive() {
  const index = JSON.parse(read('app/data/index.json'));
  const cats = index.categories || [];
  let entries = 0, multi = 0, single = 0;
  for (const c of cats) {
    const data = JSON.parse(read(path.join('app/data', c.file)));
    for (const p of data.products || []) {
      entries++;
      const n = p.provenanceSummary && p.provenanceSummary.sourceDomainCount;
      if (n > 1) multi++; else single++;
    }
  }
  const guidesText = read('app/guides.js');
  const guides = (guidesText.match(/"slug":\s*"/g) || []).length;
  const awards = exists('awards/index.html') ? read('awards/index.html') : '';
  const num = s => (s ? Number(s.replace(/,/g, '')) : null);
  const withheld = num((awards.match(/([\d,]+) measures below the evidence bar/) || [])[1]);
  const awarded = num((awards.match(/([\d,]+)<\/b> awarded measures/) || [])[1]);
  // Verdict pages are generated, so they are counted only when present (verify builds them first).
  let pages = null;
  if (exists('app/c')) {
    pages = 0;
    for (const d of fs.readdirSync(path.join(ROOT, 'app/c'), { withFileTypes: true })) {
      if (d.isDirectory()) pages += fs.readdirSync(path.join(ROOT, 'app/c', d.name)).filter(f => f.endsWith('.html')).length;
    }
  }
  return { categories: cats.length, entries: [entries, multi, single], guides, withheld, awarded, pages };
}

const facts = derive();
const RULES = [
  { what: 'categories', re: /(\d[\d,]*)(\+?)\s+(?:decision\s+)?categories/g, actual: () => [facts.categories] },
  { what: 'entries', re: /(\d[\d,]*)(\+?)\s+entries/g, actual: () => facts.entries },
  { what: 'guides', re: /(\d[\d,]*)(\+?)\s+(?:published\s+)?guides/g, actual: () => [facts.guides] },
  { what: 'withheld measures', re: /(\d[\d,]*)(\+?)\s+measures\s+(?:are\s+)?(?:published\s+as\s+)?withheld/gi, actual: () => [facts.withheld] },
  { what: 'withheld measures', re: /(\d[\d,]*)(\+?)\s+measures\s+(?:are\s+)?(?:published\s+as\s+)?WITHHELD/g, actual: () => [facts.withheld] },
  { what: 'top marks', re: /(\d[\d,]*)(\+?)\s+top marks/g, actual: () => [facts.awarded] },
  { what: 'comparison pages', re: /(\d[\d,]*)(\+?)\s+(?:shareable\s+)?(?:comparison|verdict)\s+pages/g, actual: () => (facts.pages == null ? null : [facts.pages]) },
];

const seen = new Set();
let checked = 0, skipped = 0;
for (const rel of CLAIM_FILES) {
  // Tags out, whitespace collapsed, so a figure broken across a line or wrapped in markup still reads.
  const text = read(rel).replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.re)) {
      const key = `${rel}|${rule.what}|${m.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const actual = rule.actual();
      if (!actual || actual[0] == null) { skipped++; continue; }
      const stated = Number(m[1].replace(/,/g, ''));
      const before = text.slice(Math.max(0, m.index - 16), m.index).toLowerCase();
      const floor = m[2] === '+' || /(more than|over|at least)\s*$/.test(before);
      const approx = /(about|around|roughly|~)\s*$/.test(before);
      let ok;
      if (floor) ok = actual.some(a => stated <= a);
      else if (approx) ok = actual.some(a => Math.abs(stated - a) <= a * 0.05);
      else ok = actual.includes(stated);
      checked++;
      if (!ok) failures.push(`${rel}: says ${m[0].trim()}${floor ? ' (a floor)' : approx ? ' (approximate)' : ''}; the data says ${actual.join(' or ')}`);
    }
  }
}

console.log('Public numbers audit');
console.log(`  derived: ${facts.categories} categories, ${facts.entries[0]} entries (${facts.entries[1]} multi-source), ${facts.guides} guides, ${facts.withheld} withheld, ${facts.awarded} awarded, ${facts.pages == null ? 'pages not built' : facts.pages + ' pages'}`);
console.log(`  claims checked: ${checked} in ${CLAIM_FILES.length} public files${skipped ? `; ${skipped} page count(s) not checked because the verdict pages are not built` : ''}`);
if (failures.length) {
  console.log(`  failures: ${failures.length}`);
  for (const f of failures) console.log(`  FAIL ${f}`);
  process.exit(1);
}
console.log('PUBLIC NUMBERS CHECKS PASS');
