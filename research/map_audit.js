#!/usr/bin/env node
/* Audit app/data/map.json: the whole map, published for the spatial view.

   The map is the one artefact that describes what the catalogue does NOT have. That makes it
   easy to get quietly wrong in the flattering direction: drop the open decisions and the map
   looks finished, count a held decision as built and coverage climbs. So every number here is
   checked against content/taxonomy.json, which is itself compiled from the realm outlines and
   gated by research/taxonomy_audit.js.

   Every check is proved able to fail by a surgical break, because a check that cannot fail is
   how three regexes in this repo passed while blind. */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAP = path.join(ROOT, 'app', 'data', 'map.json');
const TAXONOMY = path.join(ROOT, 'content', 'taxonomy.json');
const ONTOLOGY = path.join(ROOT, 'content', 'ontology.json');
const INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const HOMELENS = path.join(ROOT, 'app', 'homelens.js');

const STATE = { covered: 'built', open: 'open', hold: 'held', out: 'refused' };

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function flatten(map) {
  const rows = [];
  for (const realm of map.realms || []) {
    for (const field of realm.fields || []) {
      for (const family of field.families || []) {
        for (const decision of family.decisions || []) {
          rows.push({ realm: realm, field: field, family: family, decision: decision });
        }
      }
    }
  }
  return rows;
}

function inspect(map, taxonomy, navigable, live) {
  const errors = [];
  const say = (m) => errors.push(m);

  if (map.format !== 'open-values-map') say(`format: expected open-values-map, found ${map.format}`);
  if (!/^\d+\.\d+\.\d+$/.test(map.version || '')) say('version: expected semver');

  const source = [];
  for (const realm of taxonomy.realms || []) {
    for (const field of realm.fields || []) {
      for (const family of field.families || []) {
        for (const decision of family.decisions || []) source.push(decision);
      }
    }
  }
  const rows = flatten(map);

  if (rows.length !== source.length) {
    say(`decisions: map publishes ${rows.length}, the taxonomy holds ${source.length}`);
  }

  const byId = new Map(source.map((d) => [d.id + '|' + d.family, d]));
  const counts = { built: 0, open: 0, held: 0, refused: 0 };
  for (const row of rows) {
    const key = row.decision.id + '|' + row.family.id;
    const from = byId.get(key);
    if (!from) { say(`${key}: not in the taxonomy at this family`); continue; }
    const want = STATE[from.scope];
    if (row.decision.state !== want) {
      say(`${key}: published as ${row.decision.state}, the taxonomy says ${want}`);
    }
    if (counts[row.decision.state] === undefined) say(`${key}: unknown state ${row.decision.state}`);
    else counts[row.decision.state] += 1;
    if (from.cid && row.decision.cid !== from.cid) say(`${key}: cid mismatch`);
    if (!from.cid && row.decision.cid) say(`${key}: carries a cid the taxonomy does not give it`);
    if (row.decision.state === 'built' && !row.decision.cid) say(`${key}: built with no cid to route to`);
    if (row.decision.need !== from.need) say(`${key}: need mismatch`);
  }

  for (const key of Object.keys(counts)) {
    if ((map.totals || {})[key] !== counts[key]) {
      say(`totals.${key}: declares ${(map.totals || {})[key]}, the rows hold ${counts[key]}`);
    }
  }
  for (const [key, n] of [['realms', (map.realms || []).length],
                          ['decisions', rows.length]]) {
    if ((map.totals || {})[key] !== n) say(`totals.${key}: declares ${(map.totals || {})[key]}, found ${n}`);
  }

  // A built decision a reader cannot reach is worse than an open one, because the map promises an
  // answer that the navigation cannot deliver.
  for (const row of rows) {
    if (row.decision.state !== 'built') continue;
    if (!navigable.has(row.decision.cid)) say(`${row.decision.id}: built, but ${row.decision.cid} is not in the navigation`);
    if (!live.has(row.decision.cid)) say(`${row.decision.id}: built, but ${row.decision.cid} has no shipped dataset`);
  }

  // The states block is reader-facing text, and every state used must be described in it.
  for (const key of Object.keys(counts)) {
    if (!(map.states || {})[key]) say(`states.${key}: a state is published with no description`);
  }

  if (!/lazil|never part of the boot payload/i.test(map.consumer || '')) {
    say('consumer: must record that this file is not part of the boot payload');
  }
  return errors;
}

function inspectConsumer(source) {
  const errors = [];
  const say = (m) => errors.push(m);
  const fetchAt = source.indexOf("global.fetch('./data/map.json')");
  const mountAt = source.indexOf('function mount(');
  if (fetchAt < 0) say('consumer code: the whole map is never fetched');
  else if (mountAt < 0 || fetchAt < mountAt) say('consumer code: map.json entered the boot path');
  if (!/FISH_DEPTHS\s*=\s*\['domains', 'needs', 'fields', 'families', 'decisions', 'evidence'\]/.test(source)) {
    say('consumer code: fisheye categorical rungs drifted');
  }
  if (!/fishDepth\s*>=\s*5/.test(source) || !/clamp\(v, 0, 5\)/.test(source)) {
    say('consumer code: the wheel cannot traverse all six rungs');
  }
  for (const state of ['open', 'held', 'refused']) {
    if (!source.includes(`cell.state === '${state}'`)) say(`consumer code: ${state} ground has no visual state`);
  }
  if (!/if \(hit\.cell\.route\)/.test(source)) {
    say('consumer code: clicks are not gated by whether a decision has a route');
  }
  return errors;
}

function clone(x) { return JSON.parse(JSON.stringify(x)); }

const BITES = [
  { what: 'hid the open decisions, so the map looks finished',
    pattern: /decisions: map publishes/,
    break: (m) => { for (const r of m.realms) for (const f of r.fields) for (const fam of f.families)
      fam.decisions = fam.decisions.filter((d) => d.state !== 'open'); } },
  { what: 'called a held decision built',
    pattern: /published as built, the taxonomy says held/,
    break: (m) => { const row = flatten(m).find((r) => r.decision.state === 'held');
      if (!row) throw new Error('no held decision to bite'); row.decision.state = 'built'; } },
  { what: 'overstated the built total',
    pattern: /totals\.built: declares/,
    break: (m) => { m.totals.built += 7; } },
  { what: 'left a built decision with no route',
    pattern: /built with no cid to route to/,
    break: (m) => { const row = flatten(m).find((r) => r.decision.state === 'built');
      delete row.decision.cid; } },
  { what: 'pointed a built decision at a dataset that does not ship',
    pattern: /has no shipped dataset/,
    break: (m) => { const row = flatten(m).find((r) => r.decision.state === 'built');
      row.decision.cid = 'not-a-real-dataset'; } },
  { what: 'dropped the description of a published state',
    pattern: /a state is published with no description/,
    break: (m) => { delete m.states.open; } },
  { what: 'forgot that the file must stay out of the boot payload',
    pattern: /not part of the boot payload/,
    break: (m) => { m.consumer = 'anything at all'; } }
];

const CONSUMER_BITES = [
  { what: 'loaded no whole-map source', pattern: /whole map is never fetched/,
    break: (s) => s.replace("global.fetch('./data/map.json')", "global.fetch('./data/missing.json')") },
  { what: 'collapsed the categorical rungs back to presentation detail', pattern: /categorical rungs drifted/,
    break: (s) => s.replace("['domains', 'needs', 'fields', 'families', 'decisions', 'evidence']", "['names', 'evidence']") },
  { what: 'made refused decisions visually indistinguishable', pattern: /refused ground has no visual state/,
    break: (s) => s.replaceAll("cell.state === 'refused'", "cell.state === 'out-of-scope'") },
  { what: 'let unbuilt decisions pretend to be links', pattern: /clicks are not gated/,
    break: (s) => s.replace('if (hit.cell.route)', 'if (true)') }
];

function main() {
  console.log('Map audit');
  const map = readJson(MAP);
  const taxonomy = readJson(TAXONOMY);
  const ontology = readJson(ONTOLOGY);
  const index = readJson(INDEX);
  const consumer = fs.readFileSync(HOMELENS, 'utf8');
  const navigable = new Set();
  for (const domain of ontology.domains || []) {
    for (const category of domain.categories || []) if (category.cid) navigable.add(category.cid);
  }
  const live = new Set((index.categories || []).map((c) => c.id));

  const errors = inspect(map, taxonomy, navigable, live).concat(inspectConsumer(consumer));
  if (errors.length) {
    console.log(`  failures: ${errors.length}`);
    for (const e of errors.slice(0, 12)) console.log(`  FAIL ${e}`);
    console.log('MAP AUDIT FAILED');
    process.exit(1);
  }

  for (const bite of BITES) {
    const broken = clone(map);
    try { bite.break(broken); } catch (err) {
      console.log(`MAP AUDIT FAILED (bite "${bite.what}" could not be applied: ${err.message})`);
      process.exit(1);
    }
    const caught = inspect(broken, taxonomy, navigable, live).filter((e) => bite.pattern.test(e));
    if (!caught.length) {
      console.log(`MAP AUDIT FAILED (bite "${bite.what}" produced no matching error)`);
      process.exit(1);
    }
    console.log(`  bite proof: ${bite.what} -> ${caught.length} matching error${caught.length === 1 ? '' : 's'}`);
  }

  for (const bite of CONSUMER_BITES) {
    const broken = bite.break(consumer);
    const caught = inspectConsumer(broken).filter((e) => bite.pattern.test(e));
    if (!caught.length) {
      console.log(`MAP AUDIT FAILED (consumer bite "${bite.what}" produced no matching error)`);
      process.exit(1);
    }
    console.log(`  bite proof: ${bite.what} -> ${caught.length} matching error${caught.length === 1 ? '' : 's'}`);
  }

  const t = map.totals;
  console.log(`  ${t.realms} domains, ${t.fields} fields, ${t.families} families, ${t.decisions} decisions`);
  console.log(`  built ${t.built}, open ${t.open}, held ${t.held}, refused ${t.refused}`);
  console.log(`  ${BITES.length + CONSUMER_BITES.length} of ${BITES.length + CONSUMER_BITES.length} checks proved able to fail`);
  console.log('MAP AUDIT PASS');
}

main();
