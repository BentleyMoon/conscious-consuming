#!/usr/bin/env node
/* Round 11 Explore audit.

   Proves the public Explore entry path is Ask -> Decide -> needs map, every
   live category remains reachable through exactly one need, practical errands
   are real generated nodes, and legacy domain/category deep links still land.
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const NEEDS = ['nourish', 'care', 'keep-a-home', 'connect', 'move', 'learn', 'give-and-act', 'protect'];
const DECISION_LABELS = ['Buying groceries', 'Switching banks', 'Setting up a kitchen', 'Learning something', 'Want to help'];
const FEATURED_ERRANDS = ['weekly-groceries', 'pick-a-bank'];

function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
  catch (error) { failures.push(`${rel}: cannot read (${error.message})`); return ''; }
}
function json(rel) {
  try { return JSON.parse(read(rel)); }
  catch (error) { failures.push(`${rel}: invalid JSON (${error.message})`); return null; }
}
function expect(condition, message) { if (!condition) failures.push(message); }
function segment(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) return '';
  return source.slice(a, b);
}

const source = json('content/ontology.json');
const index = json('app/data/index.json');
const errands = json('app/data/nodes/errands.json');
const app = read('app/app.js');
const css = read('app/styles.css');
const html = read('app/index.html');

if (source && index && errands) {
  const needs = source.needs || [];
  const ids = needs.map((need) => need.id);
  expect(JSON.stringify(ids) === JSON.stringify(NEEDS), 'ontology: exact eight-need order changed');
  const liveByNeed = new Map(NEEDS.map((id) => [id, []]));
  for (const category of index.categories || []) {
    expect(NEEDS.includes(category.need), `index: ${category.id} has no valid need`);
    expect(typeof category.domain === 'string' && category.domain, `index: ${category.id} lost its legacy domain`);
    if (liveByNeed.has(category.need)) liveByNeed.get(category.need).push(category.id);
  }
  for (const id of NEEDS) expect(liveByNeed.get(id).length > 0, `need route #need/${id} would be orphaned`);

  const errandIds = new Set((errands.nodes || []).map((node) => String(node.id || '').replace(/^ovs:errand\//, '')));
  expect(errands.format === 'ovs-node-index' && errands.type === 'errand', 'errands: generated node index missing');
  expect(errandIds.size === 12, `errands: expected 12 generated errands, found ${errandIds.size}`);
  for (const id of FEATURED_ERRANDS) expect(errandIds.has(id), `Explore featured errand is not generated: ${id}`);

  for (const domain of source.domains || []) {
    const mapped = (domain.categories || []).filter((row) => NEEDS.includes(row.need));
    expect(mapped.length === (domain.categories || []).length, `legacy domain ${domain.label}: cannot derive a need redirect`);
  }
}

// 2026-07-19: the Explore surface grew recursive-index helpers (indexTreeHTML and the light
// rail) that render the needs map; the segment starts at the index block so the canonical-route
// and ontology cues are checked where they now live.
const map = segment(app, '/* THE INDEX', '// THE GARDEN');
expect(map, 'app: renderMap segment missing');
// Door order amended 2026-07-17 on the founder's Explore revamp instruction ("eight needs, one
// commons... prioritizing people's needs"): the needs atlas is now the hero and sits directly
// after Ask; Tasks follow it. Ask -> map -> decide is the enforced source order.
const doorMarkers = ['data-door="ask"', 'data-door="map"', 'data-door="decide"'];
let previous = -1;
for (const marker of doorMarkers) {
  const at = map.indexOf(marker);
  expect(at > previous, `Explore door missing or out of order: ${marker}`);
  previous = at;
}
expect(map.includes('id="mapask"') && map.includes('wireSuggest'), 'Ask door: local Ask form or suggestions missing');
for (const label of DECISION_LABELS) expect(app.includes(`label:'${label}'`), `Decide door missing: ${label}`);
expect(map.includes('EXPLORE_DECISION_DOORS.map'), 'Decide door is not driven by its decision config');
expect(map.includes('exploreAllErrandsHTML()'), 'Decide door does not expose the generated errand index');
expect(map.includes('(B.ontology&&B.ontology.needs)||[]'), 'needs map is not driven by ontology.needs');
expect(map.includes('href="#need/${encodeURIComponent(n.id)}"'), 'needs map does not link to canonical need routes');
expect(!map.includes('#domain/'), 'Explore still exposes a retail/domain-first primary link');
const decorativeInventoryCount = /\b\d[\d,]*\s+(?:products?|categories|entries|matches|options?|items?)\b/i;
expect(!decorativeInventoryCount.test(map), 'Explore contains a decorative product, category, entry, match, option, or item count');

const needPage = segment(app, 'function needExtensionHTML(need){', '// ── THE DECISION COMPANION');
expect(needPage, 'app: need-page component missing');
expect(html.includes('id="view-need"'), 'app shell: #view-need missing');
expect(app.includes("else if(view==='need'){renderNeed(arg);showView('need');}"), 'router: #need/:id route missing');
expect(needPage.includes('domainDifferencesSentence(cats)'), 'need page: differences sentence missing');
expect(needPage.includes('categoryMatterLine(c)'), 'need page: category cards lack what-matters copy');
expect(needPage.includes('need.illustrative') && needPage.includes('need.surfaces'), 'need page: ontology extensions are not config-driven');

expect(app.includes("else if(view==='domain'){const target=legacyDomainNeedId(arg);"), 'router: legacy #domain route is not redirected');
expect(app.includes("location.replace('#need/'"), 'router: domain redirect does not land on a need route');
expect(app.includes("else if(view==='explore')"), 'router: legacy category Explore route missing');
expect(app.includes('decisionPrimaryCategory(cid)'), 'router: category deep links no longer reach decision pages');
expect(app.includes("const byNeed={};idx.categories.forEach"), 'category sidebar is not organized by need');
expect(app.includes("'data-need':id"), 'category sidebar lacks need identity');

for (const selector of ['.explore-door', '.decision-doors', '.needs-map', '.need-cats']) {
  expect(css.includes(selector), `styles: ${selector} missing`);
}
expect(css.includes('@media(max-width:600px)') && css.includes('.decision-doors,.needs-map,.need-cats'), 'styles: mobile one-column Explore/need contract missing');
expect(css.includes('focus-visible'), 'styles: keyboard focus contract missing');

if (failures.length) {
  console.error('\nROUND 11 EXPLORE AUDIT FAIL');
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}

const distribution = NEEDS.map((id) => `${id} ${(index.categories || []).filter((c) => c.need === id).length}`).join(' · ');
console.log('\nRound 11 Explore audit');
console.log('  doors: Ask first -> the eight-need atlas -> tasks');
console.log(`  need routes: ${distribution}`);
console.log('  compatibility: legacy domain links redirect; category, facet, rank, item, and card routes remain');
console.log('  map copy: no product, category, entry, match, option, or item inventory counts');
console.log('EXPLORE THREE DOORS AUDIT PASS');
