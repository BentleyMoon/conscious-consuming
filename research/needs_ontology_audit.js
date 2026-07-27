#!/usr/bin/env node
/* Round 10 needs-ontology audit.

   Proves full live + growing coverage, one need per category, no orphan needs,
   exact preservation of the v3 domain projection, and generated-index parity.
*/
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const EXPECTED_NEEDS = [
  ['nourish', 'NOURISH'],
  ['care', 'CARE'],
  ['keep-a-home', 'KEEP A HOME'],
  ['connect', 'CONNECT'],
  ['move', 'MOVE'],
  ['learn', 'LEARN'],
  ['give-and-act', 'GIVE & ACT'],
  ['protect', 'PROTECT'],
];
const EXPECTED_DOMAINS = [
  'Food & drink',
  'Home',
  'Personal care',
  'Health & wellness',
  'Clothing',
  'Tech & digital',
  'Money',
  'Transport & mobility',
  'Energy & connectivity',
  'Travel & leisure',
  'Learning & media',
  'Kids & family',
  'Pets',
  'Garden & outdoors',
  'Giving & causes',
  'Companies & makers',
];
const EXPECTED_LIVE_BY_NEED = {
  nourish: 50,
  care: 15,
  'keep-a-home': 5,
  connect: 5,
  move: 1,
  learn: 5,
  'give-and-act': 2,
  protect: 5,
};
const ROUND9_DOMAIN_SIGNATURE = 'c655f023c5888b64ff2985e132b0328d6cc8b1f2e7053a85cec042a41002b51d';

function read(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch (error) {
    failures.push(`${rel}: cannot read (${error.message})`);
    return '';
  }
}

function json(rel) {
  try {
    return JSON.parse(read(rel));
  } catch (error) {
    failures.push(`${rel}: invalid JSON (${error.message})`);
    return null;
  }
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function legacyProjection(ontology) {
  return (ontology.domains || []).map((domain) => ({
    label: domain.label,
    categories: (domain.categories || []).map((category) => Object.fromEntries(
      ['label', 'cid', 'facet', 'type', 'group']
        .filter((key) => category[key] !== undefined)
        .map((key) => [key, category[key]])
    )),
  }));
}

function signature(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function main() {
  const ontology = json('content/ontology.json');
  const index = json('app/data/index.json');
  if (!ontology || !index) return finish({});

  expect(ontology.version === 4, `content/ontology.json: expected version 4, found ${ontology.version}`);
  expect(/domain.*compatibility|compatibility.*domain/i.test(String(ontology.note || '')), 'content/ontology.json: note must state domain compatibility');
  expect(JSON.stringify((ontology.needs || []).map((need) => [need.id, need.label])) === JSON.stringify(EXPECTED_NEEDS), 'content/ontology.json: eight needs must use the approved ids, labels, and order');
  expect(JSON.stringify((ontology.domains || []).map((domain) => domain.label)) === JSON.stringify(EXPECTED_DOMAINS), 'content/ontology.json: legacy domain order changed');
  expect(signature(legacyProjection(ontology)) === ROUND9_DOMAIN_SIGNATURE, 'content/ontology.json: a Round 9 domain, category, cid, facet, type, or group changed');

  const validNeeds = new Set(EXPECTED_NEEDS.map(([id]) => id));
  const rowCounts = Object.fromEntries([...validNeeds].map((id) => [id, 0]));
  const liveSets = Object.fromEntries([...validNeeds].map((id) => [id, new Set()]));
  const cidRecords = new Map();
  let rows = 0;
  let liveRows = 0;
  let facets = 0;

  for (const domain of ontology.domains || []) {
    for (const category of domain.categories || []) {
      rows += 1;
      if (category.facet) facets += 1;
      expect(Object.prototype.hasOwnProperty.call(category, 'need'), `${domain.label} / ${category.label}: need field missing`);
      expect(typeof category.need === 'string' && validNeeds.has(category.need), `${domain.label} / ${category.label}: invalid need ${category.need || '(missing)'}`);
      if (validNeeds.has(category.need)) rowCounts[category.need] += 1;
      if (!category.cid) continue;
      liveRows += 1;
      if (validNeeds.has(category.need)) liveSets[category.need].add(category.cid);
      const record = { need: category.need, domain: domain.label, group: category.group, type: category.type };
      if (cidRecords.has(category.cid)) {
        const previous = cidRecords.get(category.cid);
        expect(previous.need === record.need, `${category.cid}: repeated facet rows disagree on need`);
        expect(previous.domain === record.domain, `${category.cid}: repeated facet rows disagree on domain`);
        expect(previous.group === record.group, `${category.cid}: repeated facet rows disagree on group`);
        expect(previous.type === record.type, `${category.cid}: repeated facet rows disagree on type`);
      } else cidRecords.set(category.cid, record);
    }
  }

  expect(rows === 206, `content/ontology.json: expected 206 category rows, found ${rows}`);
  expect(liveRows === 96, `content/ontology.json: expected 96 live rows including facets, found ${liveRows}`);
  expect(facets === 9, `content/ontology.json: expected 9 preserved facets, found ${facets}`);
  expect(cidRecords.size === 88, `content/ontology.json: expected 88 unique live categories, found ${cidRecords.size}`);
  for (const id of validNeeds) {
    expect(rowCounts[id] > 0, `content/ontology.json: ${id} is an orphan need`);
    expect(liveSets[id].size === EXPECTED_LIVE_BY_NEED[id], `content/ontology.json: ${id} expected ${EXPECTED_LIVE_BY_NEED[id]} live categories, found ${liveSets[id].size}`);
  }

  const learn = (ontology.needs || []).find((need) => need.id === 'learn') || {};
  const kosplora = (learn.illustrative || []).find((item) => item.id === 'kosplora') || {};
  expect(kosplora.status === 'illustrative' && kosplora.href === '/kosplora/', 'content/ontology.json: LEARN must carry the explicitly illustrative Kosplora door');
  expect(/illustrative/i.test(read('kosplora/lens.js')), 'kosplora/lens.js: illustrative evidence label missing');
  const give = (ontology.needs || []).find((need) => need.id === 'give-and-act') || {};
  const board = (give.surfaces || []).find((item) => item.id === 'mutual-aid-board') || {};
  expect(board.category === 'causes-to-support', 'content/ontology.json: GIVE & ACT must attach the mutual-aid board to causes-to-support');
  expect(/function asksOffersBoardHTML/.test(read('app/app.js')), 'app/app.js: existing mutual-aid board consumer missing');

  expect(Array.isArray(index.categories) && index.categories.length === 88, `app/data/index.json: expected 88 live categories, found ${(index.categories || []).length}`);
  expect(JSON.stringify(index.ontology) === JSON.stringify(ontology), 'app/data/index.json: embedded ontology differs from content/ontology.json');
  const generatedIds = new Set();
  for (const category of index.categories || []) {
    generatedIds.add(category.id);
    const source = cidRecords.get(category.id);
    expect(!!source, `app/data/index.json: ${category.id} has no source ontology row`);
    if (!source) continue;
    expect(category.need === source.need, `app/data/index.json: ${category.id} need drift`);
    expect(category.domain === source.domain, `app/data/index.json: ${category.id} domain compatibility drift`);
    expect(category.group === source.group, `app/data/index.json: ${category.id} group compatibility drift`);
    expect(category.type === source.type, `app/data/index.json: ${category.id} type compatibility drift`);
  }
  for (const id of cidRecords.keys()) expect(generatedIds.has(id), `app/data/index.json: live ontology category ${id} is missing`);

  const app = read('app/app.js');
  for (const cue of ['function renderDomain(arg)', "case 'domain'", '#domain/', 'ont.domains']) {
    expect(app.includes(cue), `app/app.js: legacy domain route cue missing (${cue})`);
  }
  const builder = read('pipeline/build_datasets.py');
  for (const cue of ["e['need'] = cid_need[e['id']]", "e['domain'] = cid_domain.get(e['id'], 'Other')", 'previous_need']) {
    expect(builder.includes(cue), `pipeline/build_datasets.py: generated compatibility cue missing (${cue})`);
  }
  const bundle = read('app/data.js');
  for (const id of validNeeds) expect(bundle.includes(`"need": "${id}"`) || bundle.includes(`"need":"${id}"`), `app/data.js: generated bundle does not expose ${id}`);

  finish({ rows, liveRows, categories: cidRecords.size, rowCounts, liveSets });
}

function finish(receipt) {
  console.log('Round 10 needs ontology audit');
  console.log(`  needs: ${EXPECTED_NEEDS.length}; category rows: ${receipt.rows || 0} (${receipt.liveRows || 0} live rows + ${(receipt.rows || 0) - (receipt.liveRows || 0)} growing)`);
  console.log(`  unique live categories: ${receipt.categories || 0}; each carries one need and its legacy domain`);
  if (receipt.liveSets) {
    console.log('  live need coverage: ' + EXPECTED_NEEDS.map(([id, label]) => `${label} ${receipt.liveSets[id].size}`).join(' · '));
  }
  console.log('  compatibility: Round 9 domain projection unchanged; #domain data and route cues retained');
  console.log('  extensions: Kosplora marked illustrative under LEARN; mutual-aid board attached under GIVE & ACT');
  if (failures.length) {
    console.log(`NEEDS ONTOLOGY AUDIT FAILED (${failures.length})`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }
  console.log('NEEDS ONTOLOGY AUDIT PASS');
}

main();
