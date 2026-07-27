#!/usr/bin/env node
/* Generated Ask readiness audit.

   This tests whether the generated ask-index has enough signal for the H4
   integration pass to resolve founder-style questions without a blank dead end,
   and keeps the app-owned resolver order aligned with the generated contract.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { askNormalize, itemId, resolveAskQuery } = require('../pipeline/build_nodes.js');

const ROOT = path.resolve(__dirname, '..');
const ASK_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'ask-index.json');
const ASK_CORE_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'ask-core.json');
const ASK_FIXTURES_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'ask-fixtures.json');
const ASK_TRACES_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'ask-traces.json');
const ASK_PRESENTATION_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'ask-presentation.json');
const BRAND_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'brands.json');
const COMPANY_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'companies.json');
const TAGS_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'tags.json');
const ERRANDS_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'errands.json');
const LINES_SRC = path.join(ROOT, 'content', 'lines.json');
const DATA_INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const GUIDES_OUT = path.join(ROOT, 'app', 'guides.js');
const APP_JS = path.join(ROOT, 'app', 'app.js');

const failures = [];
const warnings = [];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function loadGuides() {
  if (!fs.existsSync(GUIDES_OUT)) return [];
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(GUIDES_OUT, 'utf8'), sandbox, { filename: GUIDES_OUT });
  return Array.isArray(sandbox.window.CC_GUIDES) ? sandbox.window.CC_GUIDES : [];
}

function loadRefs() {
  const labels = new Map();

  function add(id, label) {
    if (id && label && !labels.has(id)) labels.set(id, String(label));
  }

  const index = readJson(DATA_INDEX);
  const itemsByCat = new Map();
  for (const cat of index.categories || []) {
    add(`ovs:cat/${cat.id}`, cat.label);
    const file = path.join(ROOT, 'app', 'data', cat.file || `${cat.id}.json`);
    if (!fs.existsSync(file)) continue;
    const data = readJson(file);
    for (const product of data.products || []) {
      const code = String(product.code || '').trim();
      if (!code) continue;
      const id = itemId(cat.id, code);
      add(id, product.name);
      itemsByCat.set(id, { cat: cat.id, product });
    }
  }

  for (const file of [BRAND_OUT, COMPANY_OUT, TAGS_OUT, ERRANDS_OUT]) {
    const indexData = readJson(file);
    for (const node of indexData.nodes || []) add(node.id, node.label);
  }

  const lines = readJson(LINES_SRC);
  for (const line of lines.lines || []) add(`ovs:line/${line.id}`, `${line.kind === 'avoid' ? 'Avoid ' : ''}${line.label}`);

  for (const guide of loadGuides()) add(`ovs:guide/${guide.slug}`, guide.title);

  return { labels, itemsByCat };
}

function loadFixtureCases(refs) {
  const fixtures = readJson(ASK_FIXTURES_OUT);
  expect(fixtures.format === 'ovs-ask-fixtures', 'app/data/nodes/ask-fixtures.json: wrong format');
  expect(fixtures.version === '0.1', 'app/data/nodes/ask-fixtures.json: wrong version');
  expect(Array.isArray(fixtures.resolverOrder), 'app/data/nodes/ask-fixtures.json: missing resolverOrder');
  const editIndex = (fixtures.resolverOrder || []).indexOf('edit-distance');
  const containmentIndex = (fixtures.resolverOrder || []).indexOf('token-containment');
  expect(editIndex >= 0 && containmentIndex >= 0 && editIndex < containmentIndex, 'app/data/nodes/ask-fixtures.json: resolverOrder should put edit-distance before token-containment');
  expect(Array.isArray(fixtures.cases) && fixtures.cases.length >= 13, 'app/data/nodes/ask-fixtures.json: expected at least 13 resolver cases');

  const cases = [];
  for (const test of fixtures.cases || []) {
    expect(typeof test.query === 'string' && test.query.trim(), 'app/data/nodes/ask-fixtures.json: case missing query');
    expect(test.normalized === askNormalize(test.query), `${test.query}: fixture normalized value is stale`);
    expect(['core', 'full'].includes(test.layer), `${test.query}: fixture layer must be core or full`);
    expect(Array.isArray(test.expectAny) && test.expectAny.length > 0, `${test.query}: fixture needs expectAny targets`);
    for (const id of test.expectAny || []) {
      expect(refs.labels.has(id), `${test.query}: fixture references unknown target ${id}`);
    }
    for (const assertion of test.orderingAssertions || []) {
      expect(typeof assertion.id === 'string' && assertion.id.trim(), `${test.query}: ordering assertion missing id`);
      expect(typeof assertion.winnerReason === 'string' && assertion.winnerReason.trim(), `${test.query}: ordering assertion missing winnerReason`);
      expect(typeof assertion.loserReason === 'string' && assertion.loserReason.trim(), `${test.query}: ordering assertion missing loserReason`);
      for (const id of assertion.winnerAny || []) expect(refs.labels.has(id), `${test.query}: ordering assertion references unknown winner ${id}`);
      for (const id of assertion.loserAny || []) expect(refs.labels.has(id), `${test.query}: ordering assertion references unknown loser ${id}`);
    }
    cases.push({
      query: test.query,
      expects: test.expectAny || [],
      label: test.intent || test.query,
      layer: test.layer,
      expectOneInTop: Number.isInteger(test.expectOneInTop) ? test.expectOneInTop : 3,
      orderingAssertions: test.orderingAssertions || []
    });
  }
  return cases;
}

function buildOrderingChecks(top, assertions = []) {
  return (assertions || []).map(assertion => {
    const winnerIds = new Set(assertion.winnerAny || []);
    const loserIds = new Set(assertion.loserAny || []);
    const winnerIndex = top.findIndex(hit => hit.reason === assertion.winnerReason
      && (!winnerIds.size || winnerIds.has(hit.id)));
    const loserIndex = top.findIndex(hit => hit.reason === assertion.loserReason
      && (!loserIds.size || loserIds.has(hit.id)));
    const winnerRank = winnerIndex >= 0 ? winnerIndex + 1 : null;
    const loserRank = loserIndex >= 0 ? loserIndex + 1 : null;
    return {
      id: assertion.id,
      note: assertion.note,
      winnerReason: assertion.winnerReason,
      loserReason: assertion.loserReason,
      winnerRank,
      loserRank,
      ok: Number.isInteger(winnerRank) && (!Number.isInteger(loserRank) || winnerRank < loserRank)
    };
  });
}

function checkCases(askIndex, refs, fixtureCases, options = {}) {
  const cases = fixtureCases
    .filter(test => options.includeFullOnly || test.layer !== 'full');
  let hits = 0;
  let dead = 0;
  const rows = [];

  for (const test of cases) {
    const resolved = resolveAskQuery(test.query, askIndex);
    const topIds = resolved.map(row => row.id);
    const matched = topIds.find(id => test.expects.includes(id));
    if (matched) hits += 1;
    if (!resolved.length) dead += 1;
    if (matched && topIds.indexOf(matched) >= test.expectOneInTop) {
      warnings.push(`${test.query}: expected target ${matched} is present but below the top ${test.expectOneInTop}`);
    }
    rows.push({ ...test, matched, resolved });
  }

  const label = options.label || 'Ask readiness';
  const minHits = options.minHits || Math.min(cases.length, 11);
  expect(dead === 0, `${label}: ${dead} founder-style query/queries resolved to no candidates`);
  expect(hits >= minHits, `${label}: expected at least ${minHits}/${cases.length} kill checks to hit, found ${hits}/${cases.length}`);
  warn(hits === cases.length, `${label}: ${cases.length - hits} kill check(s) need app-side disambiguation or synonym polish`);

  return { cases, rows, hits, dead };
}

function expectedRoute(id) {
  if (id.startsWith('ovs:item/')) return 'item';
  if (id.startsWith('ovs:cat/')) return 'explore';
  if (id.startsWith('ovs:guide/')) return 'guide';
  return 'node';
}

function expectedHashPattern(id) {
  if (id.startsWith('ovs:item/')) return /^#item\/[^/]+\/.+/;
  if (id.startsWith('ovs:cat/')) return /^#explore\/[^/]+$/;
  if (id.startsWith('ovs:guide/')) return /^#guide\/[^/]+$/;
  return /^#n\/[^/]+\/.+/;
}

function checkTraces(askIndex, askCoreIndex, refs, fixtureCases) {
  const tracesIndex = readJson(ASK_TRACES_OUT);
  expect(tracesIndex.format === 'ovs-ask-traces', 'app/data/nodes/ask-traces.json: wrong format');
  expect(tracesIndex.version === '0.1', 'app/data/nodes/ask-traces.json: wrong version');
  expect(/resolveAskQuery/.test(tracesIndex.resolverModel || ''), 'app/data/nodes/ask-traces.json: missing resolver model');
  expect(Array.isArray(tracesIndex.traces), 'app/data/nodes/ask-traces.json: traces must be an array');
  expect((tracesIndex.traces || []).length === fixtureCases.length, 'app/data/nodes/ask-traces.json: trace count should match fixture count');

  const fixtureKeys = new Set(fixtureCases.map(test => `${test.layer}\t${test.query}`));
  const fixtureByKey = new Map(fixtureCases.map(test => [`${test.layer}\t${test.query}`, test]));
  for (const trace of tracesIndex.traces || []) {
    const key = `${trace.layer}\t${trace.query}`;
    expect(fixtureKeys.has(key), `${trace.query}: trace has no matching fixture case`);
    const fixture = fixtureByKey.get(key);
    expect(trace.normalized === askNormalize(trace.query), `${trace.query}: trace normalized value is stale`);
    expect(['core', 'full'].includes(trace.layer), `${trace.query}: trace layer must be core or full`);
    expect(Array.isArray(trace.expectAny) && trace.expectAny.length > 0, `${trace.query}: trace missing expected targets`);
    expect(Array.isArray(trace.top) && trace.top.length > 0, `${trace.query}: trace has no top results`);

    const index = trace.layer === 'core' ? askCoreIndex : askIndex;
    const fresh = resolveAskQuery(trace.query, index, 12).slice(0, trace.top.length);
    const freshIds = fresh.map(hit => hit.id);
    const traceIds = (trace.top || []).map(hit => hit.id);
    expect(JSON.stringify(traceIds) === JSON.stringify(freshIds), `${trace.query}: trace top ids are stale`);

    for (let i = 0; i < (trace.top || []).length; i += 1) {
      const row = trace.top[i];
      const current = fresh[i];
      if (!current) continue;
      expect(row.score === current.score, `${trace.query}: trace score stale for ${row.id}`);
      expect(row.reason === current.reason, `${trace.query}: trace reason stale for ${row.id}`);
      expect(row.key === current.key, `${trace.query}: trace key stale for ${row.id}`);
      expect(refs.labels.has(row.id), `${trace.query}: trace target ${row.id} has no label reference`);
      expect(row.label === refs.labels.get(row.id), `${trace.query}: trace label stale for ${row.id}`);
      expect(row.route === expectedRoute(row.id), `${trace.query}: trace route stale for ${row.id}`);
      expect(expectedHashPattern(row.id).test(row.hash || ''), `${trace.query}: trace hash invalid for ${row.id}`);
    }

    const matched = traceIds.find(id => (trace.expectAny || []).includes(id)) || null;
    const matchedRank = matched ? traceIds.indexOf(matched) + 1 : null;
    expect(trace.matched === matched, `${trace.query}: trace matched id is stale`);
    expect(trace.matchedRank === matchedRank, `${trace.query}: trace matched rank is stale`);
    const expectedChecks = buildOrderingChecks(trace.top || [], fixture?.orderingAssertions || []);
    expect(JSON.stringify(trace.orderingAssertions || []) === JSON.stringify(fixture?.orderingAssertions || []), `${trace.query}: trace ordering assertions are stale`);
    expect(JSON.stringify(trace.orderingChecks || []) === JSON.stringify(expectedChecks), `${trace.query}: trace ordering checks are stale`);
    for (const check of expectedChecks) expect(check.ok, `${trace.query}: ordering check ${check.id} failed`);
    expect(trace.ok === (Number.isInteger(matchedRank) && matchedRank <= trace.expectOneInTop && expectedChecks.every(check => check.ok)), `${trace.query}: trace ok flag is stale`);
  }

  const typoTrace = (tracesIndex.traces || []).find(trace => trace.query === 'nestel');
  expect((typoTrace?.orderingChecks || []).some(check => check.id === 'typo-before-loose-containment' && check.ok), 'nestel: missing green typo-before-loose-containment ordering check');

  return tracesIndex;
}

function checkPresentationContract(tracesIndex) {
  const presentation = readJson(ASK_PRESENTATION_OUT);
  expect(presentation.format === 'ovs-ask-presentation-contract', 'app/data/nodes/ask-presentation.json: wrong format');
  expect(presentation.version === '0.1', 'app/data/nodes/ask-presentation.json: wrong version');
  expect(/dev contract/i.test(presentation.appLaneNote || ''), 'app/data/nodes/ask-presentation.json: missing dev-contract note');

  const sections = new Set((presentation.resultSections || []).map(section => section.id));
  expect(sections.has('places'), 'app/data/nodes/ask-presentation.json: missing places section');
  expect(sections.has('entries'), 'app/data/nodes/ask-presentation.json: missing entries section');

  for (const type of ['category', 'guide', 'brand', 'company', 'tag', 'line', 'errand', 'item']) {
    expect(presentation.typeCopy?.[type]?.badge, `app/data/nodes/ask-presentation.json: type copy missing badge for ${type}`);
    expect(presentation.typeCopy?.[type]?.action, `app/data/nodes/ask-presentation.json: type copy missing action for ${type}`);
    expect(presentation.typeCopy?.[type]?.route, `app/data/nodes/ask-presentation.json: type copy missing route for ${type}`);
  }

  for (const reason of ['alias', 'exact', 'query-token', 'fuzzy-1', 'token-containment']) {
    expect(presentation.matchReasons?.[reason], `app/data/nodes/ask-presentation.json: missing match reason ${reason}`);
  }
  expect(presentation.emptyState?.primary === '#contribute/want/<query>', 'app/data/nodes/ask-presentation.json: empty-state request route mismatch');
  expect(presentation.emptyState?.secondary === '#browse', 'app/data/nodes/ask-presentation.json: empty-state browse route mismatch');

  const traces = tracesIndex.traces || [];
  const qaCases = presentation.qaCases || [];
  expect(qaCases.length === traces.length, 'app/data/nodes/ask-presentation.json: QA case count should match traces');
  for (let i = 0; i < qaCases.length; i += 1) {
    const qa = qaCases[i];
    const trace = traces[i];
    if (!trace) continue;
    const firstHash = (trace.top && trace.top[0] && trace.top[0].hash) || null;
    const matchedHash = trace.matched
      ? ((trace.top || []).find(row => row.id === trace.matched)?.hash || null)
      : null;
    expect(qa.query === trace.query, `${trace.query}: presentation QA query is stale`);
    expect(qa.section === (trace.layer === 'full' ? 'entries' : 'places'), `${trace.query}: presentation QA section is stale`);
    expect(qa.expectFirstHash === firstHash, `${trace.query}: presentation QA first hash is stale`);
    expect(qa.expectMatchedHash === matchedHash, `${trace.query}: presentation QA matched hash is stale`);
    expect(JSON.stringify(qa.orderingChecks || []) === JSON.stringify(trace.orderingChecks || []), `${trace.query}: presentation QA ordering checks are stale`);
    expect(qa.ok === trace.ok, `${trace.query}: presentation QA ok flag is stale`);
  }
}

function checkCoreStartupContract(askCoreIndex, refs, fixtureCases) {
  const contract = askCoreIndex.startupContract || {};
  expect(/startup Ask contract/i.test(contract.purpose || ''), 'app/data/nodes/ask-core.json: startupContract missing startup Ask purpose');
  expect(/app-owned/i.test(contract.appLaneNote || ''), 'app/data/nodes/ask-core.json: startupContract missing app-owned note');
  expect(contract.loadHint === 'eager-search', 'app/data/nodes/ask-core.json: startupContract loadHint should be eager-search');
  expect(contract.lazyBoundary?.file === 'ask-index.json', 'app/data/nodes/ask-core.json: startupContract lazy boundary should point to ask-index.json');
  expect(contract.lazyBoundary?.loadHint === 'lazy-product-search', 'app/data/nodes/ask-core.json: startupContract lazy boundary loadHint mismatch');
  expect(contract.lazyBoundary?.keepCoreIfLazyFails === true, 'app/data/nodes/ask-core.json: startupContract should keep core results when lazy Ask fails');
  expect((contract.covers?.targetTypes || []).includes('category'), 'app/data/nodes/ask-core.json: startupContract should cover categories');
  expect((contract.covers?.targetTypes || []).includes('brand'), 'app/data/nodes/ask-core.json: startupContract should cover brands');
  expect((contract.covers?.targetTypes || []).includes('company'), 'app/data/nodes/ask-core.json: startupContract should cover companies');
  expect((contract.covers?.deferredTargetTypes || []).includes('item'), 'app/data/nodes/ask-core.json: startupContract should defer item/product targets');
  const rankOrder = contract.resolver?.rankOrder || [];
  expect(rankOrder.indexOf('fuzzy-1') >= 0 && rankOrder.indexOf('token-containment') >= 0 && rankOrder.indexOf('fuzzy-1') < rankOrder.indexOf('token-containment'), 'app/data/nodes/ask-core.json: startupContract should rank typo before loose containment');

  const coreCases = fixtureCases.filter(test => test.layer !== 'full');
  const goldenByQuery = new Map((contract.goldenQueries || []).map(test => [test.query, test]));
  expect(goldenByQuery.size === coreCases.length, 'app/data/nodes/ask-core.json: startupContract golden query count mismatch');

  for (const test of coreCases) {
    const golden = goldenByQuery.get(test.query);
    expect(!!golden, `${test.query}: startupContract missing golden query`);
    if (!golden) continue;
    expect(golden.normalized === askNormalize(test.query), `${test.query}: startupContract normalized value stale`);
    expect(golden.intent === test.label, `${test.query}: startupContract intent stale`);
    expect(JSON.stringify(golden.expectAny || []) === JSON.stringify(test.expects || []), `${test.query}: startupContract expected targets stale`);
    expect(golden.expectOneInTop === test.expectOneInTop, `${test.query}: startupContract top expectation stale`);

    const fresh = resolveAskQuery(test.query, askCoreIndex, Math.max(5, test.expectOneInTop || 5)).slice(0, Math.max(5, test.expectOneInTop || 5));
    const top = golden.top || [];
    expect(top.length === fresh.length, `${test.query}: startupContract top length stale`);
    for (let i = 0; i < Math.min(top.length, fresh.length); i += 1) {
      const row = top[i];
      const current = fresh[i];
      expect(row.id === current.id, `${test.query}: startupContract top id stale at rank ${i + 1}`);
      expect(row.score === current.score, `${test.query}: startupContract score stale for ${row.id}`);
      expect(row.reason === current.reason, `${test.query}: startupContract reason stale for ${row.id}`);
      expect(row.key === current.key, `${test.query}: startupContract key stale for ${row.id}`);
      expect(row.label === refs.labels.get(row.id), `${test.query}: startupContract label stale for ${row.id}`);
      expect(expectedHashPattern(row.id).test(row.hash || ''), `${test.query}: startupContract hash invalid for ${row.id}`);
    }

    const topIds = top.map(row => row.id);
    const matched = topIds.find(id => test.expects.includes(id)) || null;
    const matchedRank = matched ? topIds.indexOf(matched) + 1 : null;
    const matchedRow = matched ? top.find(row => row.id === matched) : null;
    const expectedChecks = buildOrderingChecks(top, test.orderingAssertions || []);
    expect(golden.matched === matched, `${test.query}: startupContract matched id stale`);
    expect(golden.matchedRank === matchedRank, `${test.query}: startupContract matched rank stale`);
    expect(golden.expectFirstHash === top[0]?.hash, `${test.query}: startupContract first hash stale`);
    expect(golden.expectMatchedHash === (matchedRow?.hash || null), `${test.query}: startupContract matched hash stale`);
    expect(JSON.stringify(golden.orderingAssertions || []) === JSON.stringify(test.orderingAssertions || []), `${test.query}: startupContract ordering assertions stale`);
    expect(JSON.stringify(golden.orderingChecks || []) === JSON.stringify(expectedChecks), `${test.query}: startupContract ordering checks stale`);
    for (const check of expectedChecks) expect(check.ok, `${test.query}: startupContract ordering check ${check.id} failed`);
    expect(golden.ok === (Number.isInteger(matchedRank) && matchedRank <= test.expectOneInTop && expectedChecks.every(check => check.ok)), `${test.query}: startupContract ok flag stale`);
  }

  expect((goldenByQuery.get('nestel')?.orderingChecks || []).some(check => check.id === 'typo-before-loose-containment' && check.ok), 'nestel: startupContract missing green typo-before-loose-containment check');
}

function checkAppResolverOrdering() {
  const app = fs.readFileSync(APP_JS, 'utf8');
  let start = app.indexOf('function resolveAskIndexRows(');
  let end = app.indexOf('function resolveAskCoreRows(', start);
  if (start < 0) {
    start = app.indexOf('function resolveAskCoreRows(');
    end = app.indexOf('function askEntries()', start);
    if (start < 0) {
      start = app.indexOf('function resolveAsk(q)');
      end = app.indexOf('function renderWorkbench()', start);
    }
  }
  expect(start >= 0, 'app/app.js: missing resolveAsk(q), resolveAskCoreRows(q), or resolveAskIndexRows(q)');
  expect(end > start, 'app/app.js: could not isolate Ask resolver body');
  if (start < 0 || end <= start) return;

  const body = app.slice(start, end);
  const fuzzyIndex = body.indexOf('_dist1');
  const containmentIndex = body.indexOf('_tokContains');
  expect(fuzzyIndex >= 0, 'app/app.js: resolveAsk(q) no longer checks edit-distance typo matches');
  expect(containmentIndex >= 0, 'app/app.js: resolveAsk(q) no longer checks token containment');
  expect(fuzzyIndex < containmentIndex, 'app/app.js: resolveAsk(q) must rank edit-distance typo matches before loose token containment');
  expect(/nqT\.length===1&&kt\.length===1&&_dist1/.test(body), 'app/app.js: edit-distance typo matches should stay scoped to single-token queries and keys');
}

function checkAppLazyProductAsk() {
  const app = fs.readFileSync(APP_JS, 'utf8');
  expect(/function loadAskIndex\(\)/.test(app), 'app/app.js: missing lazy ask-index loader');
  expect(/fetchNodeJson\('ask-index\.json'/.test(app), 'app/app.js: lazy Ask loader should fetch ask-index.json');
  expect(/function resolveAskFullRows\(/.test(app), 'app/app.js: missing full Ask item resolver');
  expect(!/boot\(\)\.then\(\(\)=>\{[\s\S]{0,300}loadAskIndex\(\)/.test(app), 'app/app.js: ask-index.json must not load during boot');
  const start = app.indexOf('function resolveAsk(q)');
  const end = app.indexOf('function renderWorkbench()', start);
  expect(start >= 0 && end > start, 'app/app.js: could not isolate resolveAsk(q) for lazy Ask check');
  if (start >= 0 && end > start) {
    const body = app.slice(start, end);
    expect(/digits\.length>=6[\s\S]{0,300}loadAskIndex\(\)\.then/.test(body), 'app/app.js: typed barcode Ask should use the lazy ask-index path');
    expect(/resolveAskCoreRows\(q,6,false\)[\s\S]{0,500}loadAskIndex\(\)\.then/.test(body), 'app/app.js: product Ask should load ask-index only after compact core misses');
    expect(/resolveAskFullRows\(q,6,false\)/.test(body), 'app/app.js: resolveAsk(q) should read full Ask item hits after lazy load');
    expect(/catch\(\(\)=>resolveAskLegacy\(q\)\)/.test(body), 'app/app.js: lazy Ask failure should leave legacy/core search usable');
  }
}

function main() {
  console.log('Ask readiness audit');
  const askIndex = readJson(ASK_OUT);
  const askCoreIndex = readJson(ASK_CORE_OUT);
  const refs = loadRefs();
  const fixtureCases = loadFixtureCases(refs);
  const result = checkCases(askIndex, refs, fixtureCases, {
    label: 'Full Ask readiness',
    includeFullOnly: true,
    minHits: 11
  });
  const coreResult = checkCases(askCoreIndex, refs, fixtureCases, {
    label: 'Ask core readiness',
    includeFullOnly: false,
    minHits: 11
  });
  checkCoreStartupContract(askCoreIndex, refs, fixtureCases);
  checkAppResolverOrdering();
  checkAppLazyProductAsk();
  const tracesIndex = checkTraces(askIndex, askCoreIndex, refs, fixtureCases);
  checkPresentationContract(tracesIndex);

  for (const row of result.rows) {
    const status = row.matched ? 'PASS' : 'WARN';
    const top = row.resolved.slice(0, 5)
      .map(hit => `${hit.id}${refs.labels.get(hit.id) ? ` (${refs.labels.get(hit.id)})` : ''}`)
      .join('; ');
    console.log(`  ${status} ${row.query} -> ${top || '(no candidates)'}`);
  }

  console.log(`  kill checks: ${result.hits}/${result.cases.length}`);
  console.log(`  core checks: ${coreResult.hits}/${coreResult.cases.length}`);
  console.log(`  dead ends: ${result.dead}`);
  console.log(`  core dead ends: ${coreResult.dead}`);
  console.log(`  warnings: ${warnings.length}`);
  for (const warning of warnings) console.log(`  WARN ${warning}`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('ASK READINESS CHECKS PASS');
}

main();
