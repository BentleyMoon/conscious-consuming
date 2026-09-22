#!/usr/bin/env node
// Every published route obeys its own format, and every route page shows what its file holds.
//
// WHY THIS EXISTS: the walker pages are static HTML rendered from route.json at authoring time,
// which is what the no-script contract requires, and it means the page and the file can drift if
// either is edited alone. And the format carries two rules that are promises rather than syntax:
// a counterpoint must come from outside whatever drafted the route (the decorrelation rule, with
// its measured reason at legibleai.org), and anything with no correcting and no active station is
// a reading list and must say so. Promises get audits, not comments.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROUTE_DIR = path.join(ROOT, 'kosplora', 'route');

let failures = 0;
const fail = (msg) => { failures += 1; console.log('  FAIL ' + msg); };

const CORRECTING = new Set(['counterpoint', 'person', 'practice']);
const ACTIVE = new Set(['person', 'place', 'practice', 'make']);
const TYPES = new Set(['orient', 'source', 'counterpoint', 'person', 'place', 'practice', 'make', 'reflect']);

const slugs = fs.existsSync(ROUTE_DIR)
  ? fs.readdirSync(ROUTE_DIR).filter((d) => fs.existsSync(path.join(ROUTE_DIR, d, 'route.json')))
  : [];
if (!slugs.length) fail('kosplora/route contains no routes, so there is nothing to check.');

let checked = 0;
for (const slug of slugs) {
  const jsonPath = path.join(ROUTE_DIR, slug, 'route.json');
  const pagePath = path.join(ROUTE_DIR, slug, 'index.html');
  let route;
  try { route = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); }
  catch (e) { fail(slug + '/route.json does not parse: ' + e.message); continue; }

  // 1. The format names a version this repository knows.
  if (route.format !== 'kosplora-route/0.1') fail(slug + ': unknown format ' + route.format);

  const st = route.stations || [];
  // 2. Three to nine stations; a correcting one and an active one, or the honest label.
  if (st.length < 3 || st.length > 9) fail(slug + ': ' + st.length + ' stations, outside 3 to 9');
  const hasCorrecting = st.some((s) => CORRECTING.has(s.type));
  const hasActive = st.some((s) => ACTIVE.has(s.type));
  if ((!hasCorrecting || !hasActive) && route.kind !== 'reading-list') {
    fail(slug + ': no ' + (!hasCorrecting ? 'correcting' : 'active') + ' station, and not labelled a reading list');
  }
  for (const s of st) if (!TYPES.has(s.type)) fail(slug + ': unknown station type ' + s.type);

  // 3. THE DECORRELATION RULE. A counterpoint cites an origin other than generated, with
  //    author and date, because an objection produced by whatever drafted the route is the
  //    same opinion asked twice.
  for (const s of st.filter((x) => x.type === 'counterpoint')) {
    const ok = (s.sources || []).some((src) =>
      src.origin && src.origin !== 'generated' && src.author && src.date);
    if (!ok) fail(slug + ': a counterpoint station has no independent, dated, attributed source');
  }

  // 4. Every source is dated. 5. The falsifier exists.
  for (const s of st) for (const src of s.sources || []) {
    if (!src.date) fail(slug + ': undated source "' + (src.title || '?') + '"');
  }
  if (!route.would_change || !route.would_change.trim()) fail(slug + ': would_change is missing');

  // 6. The receipt: the static page shows what the file holds.
  if (!fs.existsSync(pagePath)) { fail(slug + ': no rendered page beside route.json'); continue; }
  const page = fs.readFileSync(pagePath, 'utf8');
  const nSources = st.reduce((a, s) => a + (s.sources || []).length, 0);
  if (!page.includes(nSources + ' sources')) {
    fail(slug + ': page does not state its source count of ' + nSources);
  }
  if (route.drafted_with && !page.includes('drafted with')) {
    fail(slug + ': route was drafted with a model and the page does not say so');
  }
  for (const s of st) for (const src of s.sources || []) {
    if (!page.includes(src.date)) fail(slug + ': source date ' + src.date + ' is in the file and off the page');
  }
  if (!page.includes(route.question)) fail(slug + ': the page question differs from the file question');
  checked += 1;
}

// 7. The door lists exactly the walkable routes that exist, and the shelf wears its label.
const door = fs.readFileSync(path.join(ROOT, 'kosplora', 'index.html'), 'utf8');
for (const slug of slugs) {
  if (!door.includes('route/' + slug + '/index.html')) fail('door does not list route ' + slug);
}
const shelfPath = path.join(ROOT, 'kosplora', 'shelf', 'index.html');
if (!fs.existsSync(shelfPath)) fail('kosplora/shelf/index.html is missing');
else {
  const shelf = fs.readFileSync(shelfPath, 'utf8');
  if (!/reading shelf/i.test(shelf)) fail('the shelf page no longer calls itself a reading shelf');
}

// 8. The format page keeps its versioning promise on its face.
const fmt = fs.readFileSync(path.join(ROOT, 'kosplora', 'format', 'index.html'), 'utf8');
if (!fmt.includes('kosplora-route/0.1')) fail('the format page does not display its version');
if (!/published \d{4}-\d{2}-\d{2}/.test(fmt)) fail('the format page does not display a dated publication line');

console.log('Route protocol audit');
console.log('  routes checked: ' + checked + ' of ' + slugs.length);
console.log('  failures: ' + failures);
if (failures) { console.log('ROUTE PROTOCOL CHECKS FAIL'); process.exit(1); }
console.log('ROUTE PROTOCOL CHECKS PASS');
