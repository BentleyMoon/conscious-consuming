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
/* 2026-08-12, swarm wave one. CARE 15 -> 17 (over-the-counter medicine, dog food) and MOVE 1 -> 2
   (used cars). MOVE had exactly one live category before this, which is why the front page showed
   a single cell for the whole of getting around. */
/* 2026-08-13, swarm waves two and three. CARE 17 -> 23 (nappies, reusable nappies, mattresses,
   vitamins and supplements, glasses and contact lenses, secondhand and resale, clothing rental,
   less the ones already counted), KEEP A HOME 5 -> 7 (electricity suppliers, mattresses), MOVE
   2 -> 3 (airlines), PROTECT 5 -> 7 (mortgages, credit cards). NOURISH is untouched at 50, which
   is the point: the catalogue stopped being a grocery list tonight. */
const EXPECTED_LIVE_BY_NEED = {
  nourish: 50,
  care: 26,
  'keep-a-home': 10,
  connect: 10,  // 2026-08-26: messaging and browsers gained their own datasets in the split
  move: 6,
  learn: 9,
  'give-and-act': 6,
  protect: 7,
};
/* The compatibility index is pinned by hash so it cannot drift by accident. Moving this constant
   is meant to be an act somebody performs on purpose and explains, which is what this comment is.

   2026-08-12, c655f023 -> 60f61692. Group labels only. No domain, category, cid, facet or type
   moved, and the row count is unchanged at 206. Forty-seven group labels were rewritten from a
   verb-and-ampersand register ("Bank & spend", "Give time & voice", "Stay informed", "Wear") into
   the noun phrases used by content/taxonomy.json, so the middle rung of the home lens reads like a
   reference work instead of a programme of activities. The rename also separated two groups that
   were both called "Care", one meaning childcare and one meaning veterinary care: they share the
   CARE need, and the lens groups by label within a need, so the front page had been merging them
   into a single row. The one row that carried no group at all, Podcasts, joined "Music and audio",
   and the label selector that used to reach it was removed so it is not matched twice.

   2026-08-12, 60f61692 -> 6f4e7a0a. Swarm wave one. Three rows gained a cid and nothing else
   changed: Over-the-counter medicine, Used cars and Dog food were gaps and are now built. No row
   was added, removed, relabelled or regrouped, so the projection moved by exactly three cid
   fields. Each dataset was checked against its sources by hand before promotion; the dog food
   lens was rejected once and rebuilt on FDA records after a note was found that did not match the
   page it cited.

   2026-08-13, 6f4e7a0a -> 4c57a2a7. Waves two and three. Ten rows gained a cid, and two rows were
   added: Reusable nappies under Kids & family, and Clothing rental under Clothing, each being the
   reuse route beside the thing it replaces. Nothing was relabelled or regrouped. Each dataset was
   read against its sources by hand before promotion; hotels was refused in writing rather than
   published, and four datasets are built but held out of the navigation because the legacy tree has
   nowhere to put them. See content/lenses-pending/README.md.

   2026-08-13, 4c57a2a7 -> 096ae098. Clothing rental was promoted and then withdrawn in the same
   session. Two of its twelve options were Australia-only, and the Open Values region vocabulary
   has only US, UK, EU and global, so marking them global would have told a reader elsewhere they
   could rent from them. Dropping both left the roster at ten, below the floor of twelve, so the
   row came back out and the dataset waits in content/lenses-pending. Nine rows promoted this
   round, one row added, Reusable nappies.

   2026-08-13, 096ae098 -> d282b563. Wave four. Six decisions promoted and three rows added for
   decisions the legacy tree had never named at all: Electric toothbrushes, Menstrual cups and
   discs, and Podcast apps and players. Each sits in a group already reached by a selector with no
   label narrowing, so it places itself. Nothing relabelled or regrouped.

   2026-08-13, d282b563 -> 60a73c1d. Wave five. Online courses, language learning and volunteering
   filled gap rows that were already waiting; crowdfunding platforms needed a new row under Giving
   & causes. GIVE & ACT doubles from two built decisions to four, which matters because it was the
   thinnest need on the map and the one the catalogue's own argument leans on hardest.

   2026-08-13, 60a73c1d -> 5be94bb2. Wave six. Bicycles, e-bikes, B Corporations and a new row for
   secondhand marketplaces. MOVE 3 -> 5 and GIVE & ACT 4 -> 6. The B Corporations lens carries the
   night's sharpest finding: Divine Chocolate's own page still says Ghanaian farmers hold 45 per
   cent, and the UK statutory register shows the cooperative ceased being a person with significant
   control on 29 May 2020, with a German holding vehicle now at 75 per cent or more. Verified
   against Companies House directly before promotion.

   2026-08-13, 5be94bb2 -> b4c539c5. Wave seven, aimed at the three thinnest needs rather than the
   easiest wins. Washing machines needed a new row under Home / Appliances; headphones and earbuds
   and ride-hailing filled gap rows already waiting. KEEP A HOME 7 -> 8, CONNECT 5 -> 6, MOVE 5 -> 6.
   Washing machines is the best-sourced lens in the catalogue at 93 per cent institutional, built on
   the EU energy label register and France mandatory durability index.

   2026-08-14, b4c539c5 -> 94c56b56. Phase 10 serial promotion added four source rows for four
   already-built decisions: off-grid power systems and direct-drive solar under KEEP A HOME, plus
   self-hosting platforms and federated social servers under CONNECT. Existing rows did not move. */
// Re-pinned 2026-08-26: messaging and browsers flipped from digital-services facets to their
// own cids in the split. The signature moves with the recorded change; it exists to catch
// silent drift, and a cid flip carried by a commit with written reasons is the opposite.
const ROUND9_DOMAIN_SIGNATURE = '9cd9e68334531993fc23d5cc1de44990bdd2cab0a0c434aecb70f9b06416501f';

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

  expect(rows === 217, `content/ontology.json: expected 217 category rows, found ${rows}`);
  expect(liveRows === 130, `content/ontology.json: expected 130 live rows including facets, found ${liveRows}`);
  // Moved 2026-08-26: messaging and browsers flipped from digital-services facets to their own
  // datasets, the first two of the nine-way split in docs/ONTOLOGY-RESEARCH.md 4.1.
  expect(facets === 7, `content/ontology.json: expected 7 preserved facets, found ${facets}`);
  // 124 on 2026-08-26: messaging and browsers left the shared digital-services dataset, the
  // first two of the nine-way split recorded in docs/ONTOLOGY-RESEARCH.md 4.1.
  expect(cidRecords.size === 124, `content/ontology.json: expected 124 unique live categories, found ${cidRecords.size}`);
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

  expect(Array.isArray(index.categories) && index.categories.length === 124, `app/data/index.json: expected 124 live categories, found ${(index.categories || []).length}`);
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
