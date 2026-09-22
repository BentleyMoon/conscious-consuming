#!/usr/bin/env node
/* Audit the relation layer of app/edges.json: predicates, endpoints, stubs and debt.

   research/ownership_edges_audit.js already governs the brand and company ownership pairs. This
   audit governs what that one does not: that every relation used is a predicate the engine
   declares, that every declared predicate is either used or stands empty with a written reason,
   that every endpoint resolves to something real or is a declared stub, and that the edges
   without a source URL are a counted debt that cannot grow quietly.

   The stub rule is the one idea adopted whole from the ontology study (docs/ONTOLOGY-RESEARCH.md
   section 1): when an edge needs an endpoint the catalogue has not built, the endpoint is
   declared as a stub with a label rather than dropped or invented. The gap stays visible and
   addressable.

   Every check is proved able to fail by a surgical break, because a check that cannot fail is
   how three regexes in this repository passed while blind. */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EDGES = path.join(ROOT, 'app', 'edges.json');
const ENGINE = path.join(ROOT, 'app', 'engine.js');
const BRANDS = path.join(ROOT, 'app', 'data', 'nodes', 'brands.json');
const COMPANIES = path.join(ROOT, 'app', 'data', 'nodes', 'companies.json');
const INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const REASON_MIN = 24; // matches the taxonomy rule: shorter is a shrug, not a reason

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

/* The predicate list is parsed from the engine rather than copied here, so the two cannot
   drift: the engine is the declared single source of truth for the JSON-LD vocabulary. */
function declaredPredicates(engineSource) {
  const at = engineSource.indexOf("'alternative-to': 'schema:isSimilarTo'");
  if (at < 0) return null;
  const block = engineSource.slice(at, engineSource.indexOf('};', at));
  const names = [...block.matchAll(/'([a-z-]+)':\s*'(?:schema|ovs):/g)].map((m) => m[1]);
  return names.length >= 8 ? names : null;
}

function buildUniverse() {
  const ids = new Set();
  const brands = readJson(BRANDS);
  // longTail and longTailItems are counts in this file, not lists; only nodes carries records,
  // so a long-tail brand is not an edge endpoint until it earns a node. That is correct: an
  // edge should not be able to point at a brand the node index cannot render.
  for (const node of brands.nodes || []) ids.add(node.id);
  const companies = readJson(COMPANIES);
  for (const node of companies.nodes || []) ids.add(node.id);
  const index = readJson(INDEX);
  const datasets = new Map();
  for (const cat of index.categories || []) datasets.set(cat.id, cat.file);
  return { ids, datasets, entryCache: new Map() };
}

/* Endpoint classes differ on purpose. A company must have a node, because companies are curated
   and few. A category entry must exist in its shipped dataset. An org is terminal ground and
   must be a declared stub. A brand may stand without a node: the node index only builds nodes
   for brands with catalogue entries, and a sourced ownership fact legitimately runs ahead of
   catalogue coverage. Those are counted and reported as graph-only brands rather than failed,
   which is the unresolved-stub idea applied to the class where growth is healthy. */
function classify(endpoint, universe, stubs, tally) {
  const m = /^ovs:([a-z0-9-]+)\/([a-z0-9][a-z0-9._-]*)$/.exec(endpoint);
  if (!m) return 'malformed';
  if (universe.ids.has(endpoint)) return 'node';
  const kind = m[1];
  if (kind === 'brand') { tally.graphOnlyBrands.add(endpoint); return 'graph-only-brand'; }
  if (kind === 'org') {
    return stubs && Object.prototype.hasOwnProperty.call(stubs, endpoint) ? 'stub' : 'undeclared-org';
  }
  if (kind === 'company') return 'unknown-company';
  if (!universe.datasets.has(kind)) return 'unknown-kind';
  if (!universe.entryCache.has(kind)) {
    const ds = readJson(path.join(ROOT, 'app', 'data', universe.datasets.get(kind)));
    universe.entryCache.set(kind, new Set((ds.products || ds.resources || []).map((p) => p.code)));
  }
  return universe.entryCache.get(kind).has(m[2]) ? 'entry' : 'unknown-entry';
}

function inspect(doc, predicates, universe) {
  const errors = [];
  const say = (m) => errors.push(m);
  const declared = new Set(predicates);
  const stubs = doc.stubs || {};
  const used = new Set();
  const tally = { graphOnlyBrands: new Set() };
  let noUrl = 0;

  for (const [id, label] of Object.entries(stubs)) {
    if (!/^ovs:org\/[a-z0-9-]+$/.test(id)) say(`stubs.${id}: only ovs:org endpoints may be stubs`);
    if (!label || String(label).trim().length < 2) say(`stubs.${id}: a stub needs a human label`);
  }

  for (const edge of doc.edges || []) {
    const at = `${edge.from} ${edge.rel} ${edge.to}`;
    if (!declared.has(edge.rel)) say(`${at}: relation is not a predicate the engine declares`);
    used.add(edge.rel);
    if (!/^\d{4}/.test(String(edge.asof || ''))) say(`${at}: missing asof year`);
    if (!/https?:\/\//.test(String(edge.source || ''))) noUrl += 1;
    for (const end of [edge.from, edge.to]) {
      const cls = classify(end, universe, stubs, tally);
      if (cls === 'malformed') say(`${at}: endpoint ${end} is not a well-formed ovs id`);
      else if (cls === 'undeclared-org') say(`${at}: org endpoint ${end} is not a declared stub`);
      else if (cls === 'unknown-company') say(`${at}: company endpoint ${end} has no node`);
      else if (cls === 'unknown-kind') say(`${at}: endpoint ${end} names a kind that is neither a node type nor a dataset`);
      else if (cls === 'unknown-entry') say(`${at}: endpoint ${end} names an entry its dataset does not hold`);
    }
  }

  const standing = doc.standing || {};
  for (const name of declared) {
    if (used.has(name)) continue;
    const reason = standing[name];
    if (!reason || String(reason).trim().length < REASON_MIN) {
      say(`predicate ${name}: declared, unused, and standing without a written reason of at least ${REASON_MIN} characters`);
    }
  }
  for (const name of Object.keys(standing)) {
    if (used.has(name)) say(`standing.${name}: carries an empty-predicate reason but the predicate is in use; delete the reason`);
    if (!declared.has(name)) say(`standing.${name}: not a declared predicate`);
  }

  const debt = (doc.debt || {}).noUrlEdges || {};
  if (typeof debt.count !== 'number' || !debt.reason || String(debt.reason).trim().length < REASON_MIN) {
    say('debt.noUrlEdges: the no-URL edge debt must be declared with a count and a written reason');
  } else {
    if (noUrl > debt.count) say(`debt.noUrlEdges: ${noUrl} edges carry no source URL, more than the declared ${debt.count}; new edges must cite`);
  }
  return { errors, noUrl, usedCount: used.size, declaredCount: declared.size,
           graphOnlyBrands: tally.graphOnlyBrands.size };
}

function clone(x) { return JSON.parse(JSON.stringify(x)); }

const BITES = [
  { what: 'used a relation the engine never declared', pattern: /not a predicate the engine declares/,
    break: (d) => { d.edges[0] = { ...d.edges[0], rel: 'sponsored-by' }; } },
  { what: 'pointed an edge at a company that has no node', pattern: /company endpoint .* has no node/,
    break: (d) => { d.edges[0] = { ...d.edges[0], to: 'ovs:company/not-a-real-company' }; } },
  { what: 'left an org endpoint undeclared', pattern: /is not a declared stub/,
    break: (d) => { const k = Object.keys(d.stubs || {})[0]; if (!k) throw new Error('no stub to bite'); delete d.stubs[k]; } },
  { what: 'wrote an endpoint that is not an ovs id', pattern: /not a well-formed ovs id/,
    break: (d) => { d.edges[0] = { ...d.edges[0], from: 'brand:Purina!' }; } },
  { what: 'dropped the year from an edge', pattern: /missing asof year/,
    break: (d) => { d.edges[0] = { ...d.edges[0], asof: '' }; } },
  { what: 'left a stub without a label', pattern: /stub needs a human label/,
    break: (d) => { const k = Object.keys(d.stubs || {})[0]; if (!k) throw new Error('no stub to bite'); d.stubs[k] = ''; } },
  { what: 'grew the uncited-edge debt', pattern: /more than the declared/,
    break: (d) => { d.edges.push({ from: d.edges[0].from, rel: d.edges[0].rel, to: d.edges[0].to, source: 'told to me', asof: '2026' }); } },
  { what: 'erased the reason a predicate stands empty', pattern: /standing without a written reason/,
    break: (d) => { const k = Object.keys(d.standing || {})[0]; if (!k) throw new Error('no standing to bite'); delete d.standing[k]; } }
];

function main() {
  console.log('Relation audit');
  const doc = readJson(EDGES);
  const engine = fs.readFileSync(ENGINE, 'utf8');
  const predicates = declaredPredicates(engine);
  if (!predicates) {
    console.log('RELATION AUDIT FAILED (the predicate map in app/engine.js could not be parsed; a parser that finds nothing is a blind audit)');
    process.exit(1);
  }
  const universe = buildUniverse();

  const result = inspect(doc, predicates, universe);
  if (result.errors.length) {
    console.log(`  failures: ${result.errors.length}`);
    for (const e of result.errors.slice(0, 15)) console.log(`  FAIL ${e}`);
    console.log('RELATION AUDIT FAILED');
    process.exit(1);
  }

  for (const bite of BITES) {
    const broken = clone(doc);
    try { bite.break(broken); } catch (err) {
      console.log(`RELATION AUDIT FAILED (bite "${bite.what}" could not be applied: ${err.message})`);
      process.exit(1);
    }
    const caught = inspect(broken, predicates, universe).errors.filter((e) => bite.pattern.test(e));
    if (!caught.length) {
      console.log(`RELATION AUDIT FAILED (bite "${bite.what}" produced no matching error)`);
      process.exit(1);
    }
    console.log(`  bite proof: ${bite.what} -> caught`);
  }

  console.log(`  ${doc.edges.length} edges, ${result.usedCount} of ${result.declaredCount} predicates in use, ` +
              `${Object.keys(doc.stubs || {}).length} declared stubs, ${result.noUrl} uncited edges within declared debt`);
  console.log(`  graph-only brands: ${result.graphOnlyBrands} (sourced ownership recorded ahead of catalogue coverage)`);
  console.log(`  ${BITES.length} of ${BITES.length} checks proved able to fail`);
  console.log('RELATION AUDIT PASS');
}

main();
