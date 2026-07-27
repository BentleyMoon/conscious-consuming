#!/usr/bin/env node
/* Audit generated brand, company, and Ask node indexes. */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildAll, askNormalize, itemId, coreAskTarget, resolveAskQuery } = require('../pipeline/build_nodes.js');

const ROOT = path.resolve(__dirname, '..');
const DATA_INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const APP_JS = path.join(ROOT, 'app', 'app.js');
const EDGES_SRC = path.join(ROOT, 'app', 'edges.json');
const LINES_SRC = path.join(ROOT, 'content', 'lines.json');
const BRAND_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'brands.json');
const COMPANY_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'companies.json');
const ASK_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'ask-index.json');
const ASK_CORE_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'ask-core.json');
const AVOID_TOKENS_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'avoid-tokens.json');
const ASK_FIXTURES_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'ask-fixtures.json');
const ASK_TRACES_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'ask-traces.json');
const ASK_PRESENTATION_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'ask-presentation.json');
const NODE_WALKTHROUGHS_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'node-walkthroughs.json');
const NODE_PAGE_CONTRACTS_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'node-page-contracts.json');
const NODE_ROUTE_FIXTURES_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'node-route-fixtures.json');
const NODE_ROUTE_GUARDRAILS_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'node-route-guardrails.json');
const NODE_INTEGRATION_CHECKLIST_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'node-integration-checklist.json');
const NODE_LOAD_PLAN_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'node-load-plan.json');
const NODE_RUNTIME_STATES_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'node-runtime-states.json');
const NODE_PREVIEW_MATRIX_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'node-preview-matrix.json');
const READINESS_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'readiness.json');
const MANIFEST_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'manifest.json');
const TAGS_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'tags.json');
const ERRANDS_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'errands.json');
const GUIDES_OUT = path.join(ROOT, 'app', 'guides.js');

const failures = [];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function formatJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function loadCategories() {
  const index = readJson(DATA_INDEX);
  const cats = new Map();
  const items = new Map();
  for (const cat of index.categories || []) {
    const file = path.join(ROOT, 'app', 'data', cat.file || `${cat.id}.json`);
    if (!fs.existsSync(file)) continue;
    const data = readJson(file);
    cats.set(cat.id, cat);
    for (const product of data.products || []) {
      const code = String(product.code || '').trim();
      if (code) items.set(itemId(cat.id, code), { cat: cat.id, code, product });
    }
  }
  return { cats, items };
}

function parseGuides() {
  if (!fs.existsSync(GUIDES_OUT)) return new Set();
  const text = fs.readFileSync(GUIDES_OUT, 'utf8');
  const ids = new Set();
  for (const match of text.matchAll(/"slug":\s*"([^"]+)"/g)) ids.add(`ovs:guide/${match[1]}`);
  return ids;
}

function checkGeneratedSync(outputs) {
  const expected = new Map([
    [BRAND_OUT, formatJson(outputs.brandIndex)],
    [COMPANY_OUT, formatJson(outputs.companyIndex)],
    [ASK_OUT, formatJson(outputs.askIndex)],
    [ASK_CORE_OUT, formatJson(outputs.askCoreIndex)],
    [AVOID_TOKENS_OUT, formatJson(outputs.avoidTokensIndex)],
    [ASK_FIXTURES_OUT, formatJson(outputs.askFixturesIndex)],
    [ASK_TRACES_OUT, formatJson(outputs.askTracesIndex)],
    [ASK_PRESENTATION_OUT, formatJson(outputs.askPresentationIndex)],
    [NODE_WALKTHROUGHS_OUT, formatJson(outputs.nodeWalkthroughsIndex)],
    [NODE_PAGE_CONTRACTS_OUT, formatJson(outputs.nodePageContractsIndex)],
    [NODE_ROUTE_FIXTURES_OUT, formatJson(outputs.nodeRouteFixturesIndex)],
    [NODE_ROUTE_GUARDRAILS_OUT, formatJson(outputs.nodeRouteGuardrailsIndex)],
    [NODE_INTEGRATION_CHECKLIST_OUT, formatJson(outputs.nodeIntegrationChecklistIndex)],
    [NODE_LOAD_PLAN_OUT, formatJson(outputs.nodeLoadPlanIndex)],
    [NODE_RUNTIME_STATES_OUT, formatJson(outputs.nodeRuntimeStatesIndex)],
    [NODE_PREVIEW_MATRIX_OUT, formatJson(outputs.nodePreviewMatrixIndex)],
    [READINESS_OUT, formatJson(outputs.readinessIndex)],
    [MANIFEST_OUT, formatJson(outputs.manifestIndex)]
  ]);
  for (const [file, body] of expected.entries()) {
    expect(fs.existsSync(file), `${rel(file)}: missing generated output`);
    if (fs.existsSync(file)) expect(fs.readFileSync(file, 'utf8') === body, `${rel(file)}: generated output is stale`);
  }
}

function checkBrandIndex(index, cats, companies) {
  expect(index.format === 'ovs-node-index', 'app/data/nodes/brands.json: wrong format');
  expect(index.type === 'brand', 'app/data/nodes/brands.json: wrong type');
  expect(index.minItems === 2, 'app/data/nodes/brands.json: minItems should be 2');
  expect((index.nodes || []).length >= 2000, `app/data/nodes/brands.json: expected at least 2000 brands, found ${(index.nodes || []).length}`);
  expect(index.longTail >= 4000, `app/data/nodes/brands.json: expected a visible singleton long tail, found ${index.longTail}`);

  const ids = new Set();
  for (const node of index.nodes || []) {
    expect(/^ovs:brand\/[a-z0-9-]+$/.test(node.id || ''), `${node.id}: bad brand id`);
    expect(!ids.has(node.id), `${node.id}: duplicate brand id`);
    ids.add(node.id);
    expect(node.type === 'brand', `${node.id}: wrong node type`);
    expect(typeof node.label === 'string' && node.label.trim(), `${node.id}: missing label`);
    expect(Number.isInteger(node.items) && node.items >= 2, `${node.id}: brand below minItems`);
    expect(Array.isArray(node.categories) && node.categories.length > 0, `${node.id}: missing categories`);
    for (const cid of node.categories || []) expect(cats.has(cid), `${node.id}: unknown category ${cid}`);
    if (node.ownedBy) expect(companies.has(node.ownedBy), `${node.id}: ownedBy ${node.ownedBy} has no company node`);
    expect(Array.isArray(node.top) && node.top.length <= 3, `${node.id}: top must be an array of at most 3`);
    for (const top of node.top || []) {
      expect(cats.has(top.cat), `${node.id}: top references unknown category ${top.cat}`);
      expect(typeof top.code === 'string' && top.code.trim(), `${node.id}: top missing code`);
      expect(typeof top.name === 'string' && top.name.trim(), `${node.id}: top missing name`);
      expect(Number.isFinite(top.score) && top.score >= 0 && top.score <= 100, `${node.id}: top score out of range`);
    }
  }

  for (const required of ['ovs:brand/nestle', 'ovs:brand/coca-cola', 'ovs:brand/google']) {
    expect(ids.has(required), `${required}: expected generated brand node`);
  }
}

function ownedByEdges() {
  return (readJson(EDGES_SRC).edges || []).filter(edge => edge.rel === 'owned-by');
}

function checkCompanyIndex(index, brands) {
  expect(index.format === 'ovs-node-index', 'app/data/nodes/companies.json: wrong format');
  expect(index.type === 'company', 'app/data/nodes/companies.json: wrong type');

  const edgeCounts = new Map();
  for (const edge of ownedByEdges()) {
    const slug = String(edge.to || '').slice(String(edge.to || '').lastIndexOf('/') + 1);
    const companyId = `ovs:company/${slug}`;
    edgeCounts.set(companyId, (edgeCounts.get(companyId) || 0) + 1);
  }

  const ids = new Set();
  for (const node of index.nodes || []) {
    expect(/^ovs:company\/[a-z0-9-]+$/.test(node.id || ''), `${node.id}: bad company id`);
    expect(!ids.has(node.id), `${node.id}: duplicate company id`);
    ids.add(node.id);
    expect(node.type === 'company', `${node.id}: wrong node type`);
    expect(typeof node.label === 'string' && node.label.trim(), `${node.id}: missing label`);
    expect(typeof node.reads === 'string' && node.reads.split(/\s+/).length >= 8, `${node.id}: reads should be a useful sentence`);
    expect(node.reads.includes('Our ownership map links'), `${node.id}: company reads should name the ownership map`);
    expect(/Our ownership map links .+ to \d+ brands?\. (None is|[1-9]\d* appears?|[1-9]\d* appear) in the current comparisons/.test(node.reads), `${node.id}: company reads should state mapped and compared coverage`);
    expect(!/\bshow up in the commons\b/i.test(node.reads), `${node.id}: company reads should avoid casual inventory wording`);
    expect(Array.isArray(node.brands), `${node.id}: brands must be an array`);
    expect(Array.isArray(node.brandNames) && node.brandNames.length > 0, `${node.id}: missing brandNames`);
    for (const brandId of node.brands || []) expect(brands.has(brandId), `${node.id}: unknown brand edge ${brandId}`);
    expect(Array.isArray(node.ownershipSources), `${node.id}: ownershipSources must be an array`);
    expect(node.ownershipSources.length === (edgeCounts.get(node.id) || 0), `${node.id}: ownershipSources count does not match owned-by edges`);
    for (const source of node.ownershipSources || []) {
      expect(/^ovs:[a-z0-9-]+\//.test(source.from || ''), `${node.id}: ownership source missing edge id`);
      expect(source.brand === null || brands.has(source.brand), `${node.id}: ownership source references unknown generated brand ${source.brand}`);
      expect(typeof source.brandName === 'string' && source.brandName.trim(), `${node.id}: ownership source missing brandName`);
      expect(typeof source.source === 'string' && source.source.trim(), `${node.id}: ownership source missing receipt`);
      expect(typeof source.asof === 'string' && source.asof.trim(), `${node.id}: ownership source missing asof`);
    }
    expect(node.source === null || typeof node.source === 'string', `${node.id}: source must be string|null`);
    expect(node.asof === null || typeof node.asof === 'string', `${node.id}: asof must be string|null`);
  }

  for (const edge of ownedByEdges()) {
    const slug = String(edge.to || '').slice(String(edge.to || '').lastIndexOf('/') + 1);
    expect(ids.has(`ovs:company/${slug}`), `${edge.to}: ownership edge missing generated company node`);
  }
  for (const required of ['ovs:company/nestle', 'ovs:company/pepsico', 'ovs:company/coca-cola', 'ovs:company/unilever']) {
    expect(ids.has(required), `${required}: expected company node`);
  }
}

function targetExists(id, refs) {
  if (refs.brands.has(id) || refs.companies.has(id) || refs.tags.has(id) || refs.errands.has(id) || refs.guides.has(id)) return true;
  if (refs.lines.has(id)) return true;
  if (id.startsWith('ovs:cat/')) return refs.cats.has(id.slice('ovs:cat/'.length));
  if (id.startsWith('ovs:item/')) return refs.items.has(id);
  return false;
}

function checkRouteHint(id, target, label) {
  expect(typeof target.hash === 'string' && target.hash.startsWith('#'), `${label}: missing hash hint`);
  if (id.startsWith('ovs:cat/')) expect(target.hash === `#explore/${id.slice('ovs:cat/'.length)}`, `${label}: bad category hash`);
  if (id.startsWith('ovs:guide/')) expect(target.hash === `#guide/${id.slice('ovs:guide/'.length)}`, `${label}: bad guide hash`);
  if (id.startsWith('ovs:item/')) expect(/^#item\/[^/]+\/.+/.test(target.hash), `${label}: bad item hash`);
  if (!id.startsWith('ovs:cat/') && !id.startsWith('ovs:guide/') && !id.startsWith('ovs:item/')) {
    expect(/^#n\/[^/]+\/.+/.test(target.hash), `${label}: bad node hash`);
  }
}

function checkAskIndex(index, refs) {
  expect(index.format === 'ovs-ask-index', 'app/data/nodes/ask-index.json: wrong format');
  expect(index.version === '0.1', 'app/data/nodes/ask-index.json: wrong version');
  expect(index.loadHint === 'lazy-product-search', 'app/data/nodes/ask-index.json: loadHint should be lazy-product-search');
  const indexBytes = Buffer.byteLength(formatJson(index), 'utf8');
  expect(index.budget?.maxBytes === 6000000, 'app/data/nodes/ask-index.json: max byte budget should be 6,000,000');
  expect(index.budget?.currentBytes === indexBytes, 'app/data/nodes/ask-index.json: budget currentBytes must match serialized file size');
  expect(index.budget?.withinBudget === (indexBytes <= index.budget?.maxBytes), 'app/data/nodes/ask-index.json: withinBudget mismatch');
  expect(indexBytes <= 6000000, `app/data/nodes/ask-index.json: lazy index exceeded 6 MB budget (${indexBytes} bytes)`);
  expect(index.shards?.count === 1, 'app/data/nodes/ask-index.json: single-file shard count should be 1 while under budget');
  expect((index.shards?.files || []).includes('ask-index.json'), 'app/data/nodes/ask-index.json: shard files should include ask-index.json');
  expect(index.shards?.status === 'not-needed', 'app/data/nodes/ask-index.json: shards should not be required while under budget');
  expect(/lazy file/i.test(index.shards?.hint || ''), 'app/data/nodes/ask-index.json: shards hint should explain lazy single-file posture');
  const tokens = index.tokens || {};
  const aliases = index.aliases || {};
  const barcodeLikeItems = [...refs.items.entries()].filter(([, item]) => /^\d{8,14}$/.test(item.code || ''));
  expect(Object.keys(tokens).length >= 20000, `app/data/nodes/ask-index.json: expected at least 20000 token keys, found ${Object.keys(tokens).length}`);
  expect(Object.keys(aliases).length >= 2500, `app/data/nodes/ask-index.json: expected at least 2500 aliases, found ${Object.keys(aliases).length}`);
  expect(index.stats?.barcodeLikeItems === barcodeLikeItems.length, 'app/data/nodes/ask-index.json: barcodeLikeItems stat mismatch');
  expect(barcodeLikeItems.length >= 20000, `app/data/nodes/ask-index.json: expected at least 20000 barcode-like item codes, found ${barcodeLikeItems.length}`);

  for (const [key, ids] of Object.entries(tokens)) {
    expect(/^[a-z0-9 ]+$/.test(key) && key.trim() === key && !/\s{2,}/.test(key), `Ask token key is not normalized: ${key}`);
    expect(Array.isArray(ids) && ids.length > 0, `${key}: token value must be nonempty array`);
    for (const id of ids) expect(targetExists(id, refs), `${key}: unknown target ${id}`);
  }
  for (const [key, id] of Object.entries(aliases)) {
    expect(/^[a-z0-9 ]+$/.test(key) && key.trim() === key && !/\s{2,}/.test(key), `Ask alias key is not normalized: ${key}`);
    expect(typeof id === 'string' && targetExists(id, refs), `${key}: unknown alias target ${id}`);
  }
  for (const [id, item] of barcodeLikeItems) {
    const hits = tokens[item.code] || [];
    expect(hits.includes(id), `${item.code}: barcode-like item code missing Ask token for ${id}`);
  }

  const killChecks = new Map([
    ['is nestle bad', 'ovs:company/nestle'],
    ['pop', 'ovs:cat/soda'],
    ['sneakers', 'ovs:cat/shoes'],
    ['cell phone', 'ovs:cat/phones'],
    ['pick a bank', 'ovs:errand/pick-a-bank']
  ]);
  for (const [query, target] of killChecks.entries()) {
    const key = askNormalize(query);
    const ids = tokens[key] || (aliases[key] ? [aliases[key]] : []);
    expect(ids.includes(target), `${query}: Ask index does not include ${target}`);
  }
}

function buildAskOrderingChecks(top, assertions = []) {
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

function checkAskCoreIndex(index, fullIndex, refs) {
  expect(index.format === 'ovs-ask-core-index', 'app/data/nodes/ask-core.json: wrong format');
  expect(index.type === 'ask-core', 'app/data/nodes/ask-core.json: wrong type');
  expect(index.version === '0.1', 'app/data/nodes/ask-core.json: wrong version');
  expect(/Startup-friendly/.test(index.strategy || ''), 'app/data/nodes/ask-core.json: missing startup strategy note');
  expect(JSON.stringify(index.targetFields || []) === JSON.stringify(['type', 'label', 'hash']), 'app/data/nodes/ask-core.json: targetFields should stay lean');

  const tokens = index.tokens || {};
  const aliases = index.aliases || {};
  const targets = index.targets || {};
  const fullTokens = Object.keys(fullIndex.tokens || {}).length;
  const fullAliases = Object.keys(fullIndex.aliases || {}).length;
  const coreTokens = Object.keys(tokens).length;
  const coreAliases = Object.keys(aliases).length;
  const coreTargets = Object.keys(targets).length;

  expect(coreTokens >= 2500, `app/data/nodes/ask-core.json: expected at least 2500 token keys, found ${coreTokens}`);
  expect(coreTokens < fullTokens / 10, `app/data/nodes/ask-core.json: should stay much smaller than full Ask (${coreTokens}/${fullTokens})`);
  expect(coreAliases >= Math.min(2500, fullAliases - 100), `app/data/nodes/ask-core.json: unexpectedly low alias count (${coreAliases}/${fullAliases})`);
  expect(coreTargets >= 2000, `app/data/nodes/ask-core.json: expected visible target label coverage, found ${coreTargets}`);
  const coreBytes = Buffer.byteLength(formatJson(index), 'utf8');
  expect(coreBytes < 700000, 'app/data/nodes/ask-core.json: compact index exceeded 700 KB budget');
  expect(700000 - coreBytes >= 50000, 'app/data/nodes/ask-core.json: compact index has less than 50 KB startup headroom');

  const contract = index.startupContract || {};
  expect(/startup Ask contract/i.test(contract.purpose || ''), 'app/data/nodes/ask-core.json: startupContract missing purpose');
  expect(/app-owned/i.test(contract.appLaneNote || ''), 'app/data/nodes/ask-core.json: startupContract missing app-owned note');
  expect(contract.loadHint === 'eager-search', 'app/data/nodes/ask-core.json: startupContract loadHint should be eager-search');
  expect(contract.budget?.maxBytes === 700000, 'app/data/nodes/ask-core.json: startupContract max byte budget mismatch');
  expect(contract.budget?.currentBytes === coreBytes, 'app/data/nodes/ask-core.json: startupContract currentBytes must match serialized file size');
  expect(contract.budget?.minimumHeadroomBytes === 50000, 'app/data/nodes/ask-core.json: startupContract minimum headroom mismatch');
  expect(contract.budget?.headroomBytes === 700000 - coreBytes, 'app/data/nodes/ask-core.json: startupContract headroom mismatch');
  expect(contract.budget?.withinBudget === (coreBytes < 700000), 'app/data/nodes/ask-core.json: startupContract withinBudget mismatch');
  expect(contract.budget?.hasMinimumHeadroom === (700000 - coreBytes >= 50000), 'app/data/nodes/ask-core.json: startupContract hasMinimumHeadroom mismatch');
  expect(JSON.stringify(contract.covers?.targetFields || []) === JSON.stringify(index.targetFields || []), 'app/data/nodes/ask-core.json: startupContract targetFields mismatch');
  expect(JSON.stringify(contract.covers?.targetTypes || []) === JSON.stringify(['category', 'brand', 'company', 'tag', 'guide', 'errand', 'line']), 'app/data/nodes/ask-core.json: startupContract target type coverage mismatch');
  expect(JSON.stringify(contract.covers?.deferredTargetTypes || []) === JSON.stringify(['item']), 'app/data/nodes/ask-core.json: startupContract should defer item targets');
  const rankOrder = contract.resolver?.rankOrder || [];
  expect(rankOrder.includes('alias') && rankOrder.includes('exact') && rankOrder.includes('query-token'), 'app/data/nodes/ask-core.json: startupContract rankOrder missing direct match phases');
  expect(rankOrder.indexOf('fuzzy-1') >= 0 && rankOrder.indexOf('token-containment') >= 0 && rankOrder.indexOf('fuzzy-1') < rankOrder.indexOf('token-containment'), 'app/data/nodes/ask-core.json: startupContract should rank typo before containment');
  expect(contract.lazyBoundary?.file === 'ask-index.json', 'app/data/nodes/ask-core.json: startupContract lazyBoundary should name ask-index.json');
  expect(contract.lazyBoundary?.loadHint === 'lazy-product-search', 'app/data/nodes/ask-core.json: startupContract lazyBoundary loadHint mismatch');
  expect(contract.lazyBoundary?.keepCoreIfLazyFails === true, 'app/data/nodes/ask-core.json: startupContract should keep core results if lazy index fails');
  expect(contract.emptyState?.primary === '#contribute/want/<query>', 'app/data/nodes/ask-core.json: startupContract empty-state request route mismatch');
  expect(contract.emptyState?.secondary === '#browse', 'app/data/nodes/ask-core.json: startupContract empty-state browse route mismatch');

  const coreFixtures = (readJson(ASK_FIXTURES_OUT).cases || []).filter(test => test.layer === 'core');
  const goldenByQuery = new Map((contract.goldenQueries || []).map(test => [test.query, test]));
  expect(goldenByQuery.size === coreFixtures.length, 'app/data/nodes/ask-core.json: startupContract golden query count mismatch');
  for (const fixture of coreFixtures) {
    const golden = goldenByQuery.get(fixture.query);
    expect(!!golden, `app/data/nodes/ask-core.json: startupContract missing golden query ${fixture.query}`);
    if (!golden) continue;
    expect(golden.normalized === askNormalize(fixture.query), `${fixture.query}: startupContract normalized value stale`);
    expect(golden.intent === fixture.intent, `${fixture.query}: startupContract intent stale`);
    expect(JSON.stringify(golden.expectAny || []) === JSON.stringify(fixture.expectAny || []), `${fixture.query}: startupContract expected targets stale`);
    expect(golden.expectOneInTop === fixture.expectOneInTop, `${fixture.query}: startupContract top expectation stale`);
    const limit = Math.max(5, fixture.expectOneInTop || 5);
    const fresh = resolveAskQuery(fixture.query, index, limit).slice(0, limit);
    const top = golden.top || [];
    expect(top.length === fresh.length, `${fixture.query}: startupContract top length stale`);
    for (let i = 0; i < Math.min(top.length, fresh.length); i += 1) {
      const row = top[i];
      const current = fresh[i];
      const target = targets[current.id];
      expect(row.id === current.id, `${fixture.query}: startupContract top id stale at rank ${i + 1}`);
      expect(row.score === current.score, `${fixture.query}: startupContract score stale for ${row.id}`);
      expect(row.reason === current.reason, `${fixture.query}: startupContract reason stale for ${row.id}`);
      expect(row.key === current.key, `${fixture.query}: startupContract key stale for ${row.id}`);
      expect(row.label === target?.label, `${fixture.query}: startupContract label stale for ${row.id}`);
      expect(row.type === target?.type, `${fixture.query}: startupContract type stale for ${row.id}`);
      expect(row.hash === target?.hash, `${fixture.query}: startupContract hash stale for ${row.id}`);
    }
    const topIds = top.map(row => row.id);
    const matched = topIds.find(id => (fixture.expectAny || []).includes(id)) || null;
    const matchedRank = matched ? topIds.indexOf(matched) + 1 : null;
    const matchedRow = matched ? top.find(row => row.id === matched) : null;
    const expectedChecks = buildAskOrderingChecks(top, fixture.orderingAssertions || []);
    expect(golden.matched === matched, `${fixture.query}: startupContract matched id stale`);
    expect(golden.matchedRank === matchedRank, `${fixture.query}: startupContract matched rank stale`);
    expect(golden.expectFirstHash === top[0]?.hash, `${fixture.query}: startupContract first hash stale`);
    expect(golden.expectMatchedHash === (matchedRow?.hash || null), `${fixture.query}: startupContract matched hash stale`);
    expect(JSON.stringify(golden.orderingAssertions || []) === JSON.stringify(fixture.orderingAssertions || []), `${fixture.query}: startupContract ordering assertions stale`);
    expect(JSON.stringify(golden.orderingChecks || []) === JSON.stringify(expectedChecks), `${fixture.query}: startupContract ordering checks stale`);
    expect(golden.ok === (Number.isInteger(matchedRank) && matchedRank <= fixture.expectOneInTop && expectedChecks.every(check => check.ok)), `${fixture.query}: startupContract ok flag stale`);
  }
  expect((goldenByQuery.get('nestel')?.orderingChecks || []).some(check => check.id === 'typo-before-loose-containment' && check.ok), 'app/data/nodes/ask-core.json: startupContract missing green nestel ordering check');

  const referenced = new Set();
  for (const [key, ids] of Object.entries(tokens)) {
    expect(/^[a-z0-9 ]+$/.test(key) && key.trim() === key && !/\s{2,}/.test(key), `Ask core token key is not normalized: ${key}`);
    expect(Array.isArray(ids) && ids.length > 0, `${key}: core token value must be nonempty array`);
    for (const id of ids) {
      referenced.add(id);
      expect(coreAskTarget(id), `${key}: core token includes product/item target ${id}`);
      expect(targetExists(id, refs), `${key}: unknown core target ${id}`);
    }
  }
  for (const [key, id] of Object.entries(aliases)) {
    referenced.add(id);
    expect(/^[a-z0-9 ]+$/.test(key) && key.trim() === key && !/\s{2,}/.test(key), `Ask core alias key is not normalized: ${key}`);
    expect(coreAskTarget(id), `${key}: core alias includes product/item target ${id}`);
    expect(targetExists(id, refs), `${key}: unknown core alias target ${id}`);
  }
  for (const id of referenced) {
    const target = targets[id];
    expect(target && typeof target.label === 'string' && target.label.trim(), `${id}: core target missing label metadata`);
    expect(target && typeof target.type === 'string' && target.type.trim(), `${id}: core target missing type metadata`);
    expect(target && JSON.stringify(Object.keys(target).sort()) === JSON.stringify(['hash', 'label', 'type']), `${id}: core target should stay lean (type,label,hash only)`);
    if (target) checkRouteHint(id, target, id);
  }

  for (const required of [
    'ovs:company/nestle',
    'ovs:line/avoid:nestle',
    'ovs:brand/coca-cola',
    'ovs:cat/banking',
    'ovs:guide/password-managers',
    'ovs:errand/pick-a-bank'
  ]) {
    expect(referenced.has(required), `${required}: expected in compact Ask core`);
  }
}

function checkAvoidTokens(index, outputs, refs) {
  expect(index.format === 'ovs-avoid-token-index', 'app/data/nodes/avoid-tokens.json: wrong format');
  expect(index.version === '0.1', 'app/data/nodes/avoid-tokens.json: wrong version');
  expect(/browser-extension/i.test(index.purpose || ''), 'app/data/nodes/avoid-tokens.json: missing browser-extension purpose');
  expect(/word boundaries/i.test(index.matching?.boundary || ''), 'app/data/nodes/avoid-tokens.json: missing boundary matching note');
  expect(/app-owned/i.test(index.matching?.appLaneNote || ''), 'app/data/nodes/avoid-tokens.json: missing app-owned note');

  const bytes = Buffer.byteLength(formatJson(index), 'utf8');
  expect(bytes < 30000, `app/data/nodes/avoid-tokens.json: compact export exceeded 30 KB (${bytes})`);
  expect(index.stats?.bytes === bytes, 'app/data/nodes/avoid-tokens.json: byte count mismatch');

  const linesSource = readJson(LINES_SRC);
  const avoidLines = (linesSource.lines || []).filter(line => line.kind === 'avoid');
  const families = index.families || [];
  expect(families.length === avoidLines.length, 'app/data/nodes/avoid-tokens.json: family count should match avoid lines');
  expect(index.stats?.families === families.length, 'app/data/nodes/avoid-tokens.json: stats family count mismatch');

  const byLine = new Map(avoidLines.map(line => [line.id, line]));
  const companiesByLine = new Map((outputs.companyIndex.nodes || []).filter(node => node.line).map(node => [node.line, node]));
  const allTokens = new Set();
  let tokenTotal = 0;

  for (const family of families) {
    const line = byLine.get(family.id);
    expect(Boolean(line), `${family.id}: avoid token family has no source line`);
    expect(family.line === `ovs:line/${family.id}`, `${family.id}: line id mismatch`);
    expect(refs.lines.has(family.line), `${family.id}: unknown line target`);
    expect(typeof family.label === 'string' && family.label.trim(), `${family.id}: missing label`);
    expect(/^[a-z0-9 ]+$/.test(family.entity || ''), `${family.id}: entity token is not extension-safe`);
    expect(Array.isArray(family.tokens) && family.tokens.length >= 3, `${family.id}: expected at least three avoid tokens`);
    expect(family.tokenCount === family.tokens.length, `${family.id}: tokenCount mismatch`);
    expect(family.sourceLineBrands === (line?.brands || []).length, `${family.id}: sourceLineBrands mismatch`);
    const company = companiesByLine.get(family.id);
    expect(family.sourceCompanyBrands === (company?.brandNames || []).length, `${family.id}: sourceCompanyBrands mismatch`);

    const seen = new Set();
    for (const token of family.tokens || []) {
      expect(/^[a-z0-9 ]+$/.test(token), `${family.id}: token is not plain ascii lowercase: ${token}`);
      expect(token.trim() === token && !/\s{2,}/.test(token), `${family.id}: token is not space-normalized: ${token}`);
      expect(!seen.has(token), `${family.id}: duplicate token ${token}`);
      seen.add(token);
      allTokens.add(token);
    }
    expect([...seen].join('\n') === (family.tokens || []).join('\n'), `${family.id}: tokens should be sorted`);
    tokenTotal += family.tokens.length;
  }

  const byId = new Map(families.map(family => [family.id, family]));
  for (const [id, tokens] of Object.entries({
    'avoid:nestle': ['nestle', 'nescafe', 'kitkat', 'maggi'],
    'avoid:coca-cola': ['coca cola', 'coke', 'sprite', 'fanta'],
    'avoid:amazon': ['amazon', 'aws', 'audible', 'twitch'],
    'avoid:alphabet': ['google', 'youtube', 'android', 'nest'],
    'avoid:meta': ['meta', 'facebook', 'instagram', 'whatsapp']
  })) {
    const family = byId.get(id);
    expect(Boolean(family), `${id}: missing expected avoid token family`);
    for (const token of tokens) expect((family?.tokens || []).includes(token), `${id}: missing token ${token}`);
  }

  expect(index.stats?.tokens === tokenTotal, 'app/data/nodes/avoid-tokens.json: stats token count mismatch');
  expect(index.stats?.uniqueTokens === allTokens.size, 'app/data/nodes/avoid-tokens.json: stats unique token count mismatch');
}

function checkPresentation(presentation, outputs) {
  expect(presentation.format === 'ovs-ask-presentation-contract', 'app/data/nodes/ask-presentation.json: wrong format');
  expect(presentation.version === '0.1', 'app/data/nodes/ask-presentation.json: wrong version');
  expect(Array.isArray(presentation.source), 'app/data/nodes/ask-presentation.json: missing source list');
  for (const file of ['app/data/nodes/ask-core.json', 'app/data/nodes/ask-index.json', 'app/data/nodes/ask-traces.json']) {
    expect((presentation.source || []).includes(file), `app/data/nodes/ask-presentation.json: source list missing ${file}`);
  }
  expect(/app-owned/i.test(presentation.purpose || ''), 'app/data/nodes/ask-presentation.json: missing app-owned purpose note');
  expect(/dev contract/i.test(presentation.appLaneNote || ''), 'app/data/nodes/ask-presentation.json: missing dev-contract app-lane note');
  expect(/not a hard UI mandate/i.test(presentation.appLaneNote || ''), 'app/data/nodes/ask-presentation.json: should not mandate app UI');

  const sections = new Map((presentation.resultSections || []).map(section => [section.id, section]));
  const places = sections.get('places');
  const entries = sections.get('entries');
  expect(places, 'app/data/nodes/ask-presentation.json: missing places section');
  expect(entries, 'app/data/nodes/ask-presentation.json: missing entries section');

  function requireAll(actual, expected, label) {
    const values = new Set(actual || []);
    for (const value of expected) expect(values.has(value), `app/data/nodes/ask-presentation.json: ${label} missing ${value}`);
  }

  if (places) {
    expect(typeof places.label === 'string' && places.label.trim(), 'app/data/nodes/ask-presentation.json: places section missing label');
    requireAll(places.layers, ['core'], 'places layers');
    requireAll(places.targetTypes, ['category', 'brand', 'company', 'tag', 'guide', 'errand', 'line'], 'places targetTypes');
    expect(Number.isInteger(places.maxItems) && places.maxItems > 0, 'app/data/nodes/ask-presentation.json: places maxItems invalid');
  }
  if (entries) {
    expect(typeof entries.label === 'string' && entries.label.trim(), 'app/data/nodes/ask-presentation.json: entries section missing label');
    requireAll(entries.layers, ['full'], 'entries layers');
    requireAll(entries.targetTypes, ['item'], 'entries targetTypes');
    expect(Number.isInteger(entries.maxItems) && entries.maxItems > 0, 'app/data/nodes/ask-presentation.json: entries maxItems invalid');
  }

  const expectedTypeRoutes = {
    category: '#explore/<cid>',
    guide: '#guide/<slug>',
    brand: '#n/brand/<slug>',
    company: '#n/company/<slug>',
    tag: '#n/tag/<slug>',
    line: '#n/line/<slug>',
    errand: '#n/errand/<slug>',
    item: '#item/<cid>/<code>'
  };
  for (const [type, route] of Object.entries(expectedTypeRoutes)) {
    const copy = presentation.typeCopy?.[type];
    expect(copy, `app/data/nodes/ask-presentation.json: typeCopy missing ${type}`);
    expect(typeof copy?.badge === 'string' && copy.badge.trim(), `app/data/nodes/ask-presentation.json: ${type} missing badge copy`);
    expect(typeof copy?.action === 'string' && copy.action.trim(), `app/data/nodes/ask-presentation.json: ${type} missing action copy`);
    expect(copy?.route === route, `app/data/nodes/ask-presentation.json: ${type} route copy mismatch`);
  }

  for (const reason of ['alias', 'exact', 'query-token', 'fuzzy-1', 'token-containment']) {
    expect(typeof presentation.matchReasons?.[reason] === 'string' && presentation.matchReasons[reason].trim(), `app/data/nodes/ask-presentation.json: missing ${reason} match reason copy`);
  }

  expect(presentation.emptyState?.primary === '#contribute/want/<query>', 'app/data/nodes/ask-presentation.json: empty-state primary route mismatch');
  expect(presentation.emptyState?.secondary === '#browse', 'app/data/nodes/ask-presentation.json: empty-state secondary route mismatch');
  expect(typeof presentation.emptyState?.title === 'string' && presentation.emptyState.title.trim(), 'app/data/nodes/ask-presentation.json: empty-state title missing');
  expect(typeof presentation.emptyState?.primaryAction === 'string' && presentation.emptyState.primaryAction.trim(), 'app/data/nodes/ask-presentation.json: empty-state primary action missing');
  expect(typeof presentation.emptyState?.secondaryAction === 'string' && presentation.emptyState.secondaryAction.trim(), 'app/data/nodes/ask-presentation.json: empty-state secondary action missing');

  const traces = outputs.askTracesIndex.traces || [];
  const qaCases = presentation.qaCases || [];
  expect(qaCases.length === traces.length, 'app/data/nodes/ask-presentation.json: QA case count should match traces');
  for (let i = 0; i < qaCases.length; i += 1) {
    const qa = qaCases[i];
    const trace = traces[i];
    if (!trace) continue;
    const expectedSection = trace.layer === 'full' ? 'entries' : 'places';
    const expectedFirstHash = (trace.top && trace.top[0] && trace.top[0].hash) || null;
    const expectedMatchedHash = trace.matched
      ? ((trace.top || []).find(row => row.id === trace.matched)?.hash || null)
      : null;
    expect(qa.query === trace.query, `${trace.query}: presentation QA query is stale`);
    expect(qa.section === expectedSection, `${trace.query}: presentation QA section mismatch`);
    expect(qa.expectFirstHash === expectedFirstHash, `${trace.query}: presentation first hash mismatch`);
    expect(typeof qa.expectFirstHash === 'string' && qa.expectFirstHash.startsWith('#'), `${trace.query}: presentation first hash missing route`);
    expect(qa.expectMatchedHash === expectedMatchedHash, `${trace.query}: presentation matched hash mismatch`);
    expect(typeof qa.expectMatchedHash === 'string' && qa.expectMatchedHash.startsWith('#'), `${trace.query}: presentation matched hash missing route`);
    expect(JSON.stringify(qa.orderingChecks || []) === JSON.stringify(trace.orderingChecks || []), `${trace.query}: presentation ordering checks mismatch`);
    for (const check of qa.orderingChecks || []) expect(check.ok === true, `${trace.query}: presentation ordering check ${check.id} should be green`);
    expect(qa.ok === trace.ok, `${trace.query}: presentation ok flag mismatch`);
    expect(qa.ok === true, `${trace.query}: presentation QA should only ship green fixture cases`);
  }
  const typoCase = qaCases.find(qa => qa.query === 'nestel');
  expect((typoCase?.orderingChecks || []).some(check => check.id === 'typo-before-loose-containment' && check.ok), 'app/data/nodes/ask-presentation.json: nestel needs typo-before-loose-containment ordering check');
}

function checkNodeWalkthroughs(walkthroughs, outputs) {
  expect(walkthroughs.format === 'ovs-node-walkthroughs', 'app/data/nodes/node-walkthroughs.json: wrong format');
  expect(walkthroughs.version === '0.1', 'app/data/nodes/node-walkthroughs.json: wrong version');
  expect(/app-owned/i.test(walkthroughs.purpose || ''), 'app/data/nodes/node-walkthroughs.json: missing app-owned purpose note');
  expect(/dev-contract/i.test(walkthroughs.appLaneNote || ''), 'app/data/nodes/node-walkthroughs.json: missing dev-contract app-lane note');
  for (const file of ['app/data/nodes/ask-core.json', 'app/data/nodes/brands.json', 'app/data/nodes/companies.json', 'content/lines.json']) {
    expect((walkthroughs.source || []).includes(file), `app/data/nodes/node-walkthroughs.json: source list missing ${file}`);
  }

  const rows = walkthroughs.walkthroughs || [];
  expect(rows.length >= 3, 'app/data/nodes/node-walkthroughs.json: expected at least three flagship walkthroughs');
  const ids = new Set();
  const brands = new Set((outputs.brandIndex.nodes || []).map(node => node.id));
  const companies = new Set((outputs.companyIndex.nodes || []).map(node => node.id));

  for (const row of rows) {
    expect(/^[-a-z0-9]+$/.test(row.id || ''), `${row.id}: walkthrough id should be slug-like`);
    expect(!ids.has(row.id), `${row.id}: duplicate walkthrough id`);
    ids.add(row.id);
    expect(typeof row.label === 'string' && row.label.trim(), `${row.id}: walkthrough missing label`);
    expect(typeof row.query === 'string' && row.query.trim(), `${row.id}: walkthrough missing query`);
    expect(Array.isArray(row.askTop) && row.askTop.length > 0, `${row.id}: walkthrough missing Ask top results`);
    expect(typeof row.matchedTop === 'string' && row.matchedTop.startsWith('ovs:'), `${row.id}: walkthrough did not match an expected top result`);

    const expected = row.expected || {};
    expect(companies.has(expected.company), `${row.id}: expected company is not generated`);
    expect(typeof expected.line === 'string' && expected.line.startsWith('ovs:line/'), `${row.id}: expected line missing`);
    expect(Array.isArray(expected.brands) && expected.brands.length > 0, `${row.id}: expected brands missing`);
    for (const brand of expected.brands || []) expect(brands.has(brand), `${row.id}: expected brand is not generated: ${brand}`);

    for (const hit of row.askTop || []) {
      expect(typeof hit.id === 'string' && hit.id.startsWith('ovs:'), `${row.id}: Ask hit missing id`);
      expect(typeof hit.label === 'string' && hit.label.trim(), `${row.id}: Ask hit missing label`);
      expect(typeof hit.hash === 'string' && hit.hash.startsWith('#'), `${row.id}: Ask hit missing hash`);
      expect(typeof hit.reason === 'string' && hit.reason.trim(), `${row.id}: Ask hit missing reason`);
      expect(Number.isFinite(hit.score), `${row.id}: Ask hit missing score`);
    }

    const company = row.pages?.company;
    expect(company?.id === expected.company, `${row.id}: company page mismatch`);
    expect(typeof company?.hash === 'string' && company.hash.startsWith('#n/company/'), `${row.id}: company hash invalid`);
    expect(Number.isInteger(company?.brandNameCount) && company.brandNameCount >= expected.minCompanyBrands, `${row.id}: company brand count too low`);
    expect(Array.isArray(company?.categories) && company.categories.length >= expected.minCategories, `${row.id}: company categories too thin`);
    expect(Number.isInteger(company?.ownershipReceiptCount) && company.ownershipReceiptCount >= expected.minCompanyBrands, `${row.id}: company receipt count too low`);
    expect(Array.isArray(company?.receiptSamples) && company.receiptSamples.length > 0, `${row.id}: missing receipt samples`);
    for (const receipt of company?.receiptSamples || []) {
      expect(typeof receipt.brandName === 'string' && receipt.brandName.trim(), `${row.id}: receipt missing brandName`);
      expect(typeof receipt.source === 'string' && /^https?:\/\//.test(receipt.source), `${row.id}: receipt missing source URL`);
      expect(typeof receipt.asof === 'string' && receipt.asof.trim(), `${row.id}: receipt missing asof`);
    }

    const line = row.pages?.line;
    expect(line?.id === expected.line, `${row.id}: line page mismatch`);
    expect(typeof line?.hash === 'string' && line.hash.startsWith('#n/line/'), `${row.id}: line hash invalid`);
    expect(/^https?:\/\//.test(String(line?.why || '')), `${row.id}: line why must be a URL`);
    const found = new Set(line?.requiredTokensFound || []);
    for (const token of expected.requiredLineTokens || []) expect(found.has(token), `${row.id}: missing line token ${token}`);

    expect(Array.isArray(row.pages?.brands) && row.pages.brands.length === expected.brands.length, `${row.id}: brand page count mismatch`);
    for (const brand of row.pages?.brands || []) {
      expect(!brand.missing, `${row.id}: missing brand ${brand.id}`);
      expect(expected.brands.includes(brand.id), `${row.id}: unexpected brand ${brand.id}`);
      expect(brand.ownedBy === expected.company, `${row.id}: brand ${brand.id} ownedBy mismatch`);
      expect(typeof brand.hash === 'string' && brand.hash.startsWith('#n/brand/'), `${row.id}: brand ${brand.id} hash invalid`);
      expect(Number.isInteger(brand.items) && brand.items >= 2, `${row.id}: brand ${brand.id} has too few items`);
      expect(Array.isArray(brand.categories) && brand.categories.length > 0, `${row.id}: brand ${brand.id} missing categories`);
      expect(Array.isArray(brand.top) && brand.top.length > 0, `${row.id}: brand ${brand.id} missing top products`);
      for (const top of brand.top || []) {
        expect(typeof top.hash === 'string' && top.hash.startsWith('#item/'), `${row.id}: brand ${brand.id} top product hash invalid`);
        expect(Number.isFinite(top.score) && top.score >= 0 && top.score <= 100, `${row.id}: brand ${brand.id} top product score invalid`);
      }
    }

    for (const [key, value] of Object.entries(row.checks || {})) {
      expect(value === true, `${row.id}: walkthrough check failed: ${key}`);
    }
  }

  for (const required of ['nestle-concern-path', 'coke-concern-path', 'amazon-concern-path']) {
    expect(ids.has(required), `app/data/nodes/node-walkthroughs.json: missing ${required}`);
  }
}

function routePatternForType(type) {
  return {
    category: /^#explore\/[^/]+$/,
    item: /^#item\/[^/]+\/.+/,
    guide: /^#guide\/[^/]+$/,
    brand: /^#n\/brand\/[^/]+$/,
    company: /^#n\/company\/[^/]+$/,
    tag: /^#n\/tag\/[^/]+$/,
    errand: /^#n\/errand\/[^/]+$/,
    line: /^#n\/line\/.+/
  }[type];
}

function checkNodePageContracts(pageContracts, outputs, refs) {
  expect(pageContracts.format === 'ovs-node-page-contracts', 'app/data/nodes/node-page-contracts.json: wrong format');
  expect(pageContracts.version === '0.1', 'app/data/nodes/node-page-contracts.json: wrong version');
  expect(/app-owned/i.test(pageContracts.purpose || ''), 'app/data/nodes/node-page-contracts.json: missing app-owned purpose note');
  expect(/Contract only/i.test(pageContracts.appLaneNote || ''), 'app/data/nodes/node-page-contracts.json: missing contract-only lane note');
  for (const file of ['app/data/index.json', 'app/data/nodes/brands.json', 'app/data/nodes/companies.json', 'app/data/nodes/tags.json', 'app/data/nodes/errands.json', 'content/lines.json', 'app/guides.js', 'app/data/*.json']) {
    expect((pageContracts.source || []).includes(file), `app/data/nodes/node-page-contracts.json: source list missing ${file}`);
  }

  const contracts = pageContracts.contracts || [];
  const byType = new Map(contracts.map(contract => [contract.type, contract]));
  const expectedRoutePatterns = {
    category: '#explore/<cid>',
    item: '#item/<cid>/<code>',
    guide: '#guide/<slug>',
    brand: '#n/brand/<slug>',
    company: '#n/company/<slug>',
    tag: '#n/tag/<slug>',
    errand: '#n/errand/<slug>',
    line: '#n/line/<encoded-line-id>'
  };

  expect(contracts.length === Object.keys(expectedRoutePatterns).length, 'app/data/nodes/node-page-contracts.json: unexpected contract count');
  for (const [type, routePattern] of Object.entries(expectedRoutePatterns)) {
    const contract = byType.get(type);
    expect(!!contract, `app/data/nodes/node-page-contracts.json: missing ${type} contract`);
    if (!contract) continue;
    expect(contract.routePattern === routePattern, `app/data/nodes/node-page-contracts.json: ${type} route pattern mismatch`);
    expect(typeof contract.source === 'string' && contract.source.trim(), `app/data/nodes/node-page-contracts.json: ${type} missing source`);
    expect(Array.isArray(contract.requiredFields) && contract.requiredFields.length > 0, `app/data/nodes/node-page-contracts.json: ${type} missing required fields`);
    expect(Array.isArray(contract.optionalFields), `app/data/nodes/node-page-contracts.json: ${type} optionalFields should be an array`);
    expect(Array.isArray(contract.sections) && contract.sections.length >= 3, `app/data/nodes/node-page-contracts.json: ${type} missing page sections`);
    expect(Array.isArray(contract.examples) && contract.examples.length > 0, `app/data/nodes/node-page-contracts.json: ${type} missing examples`);

    const pattern = routePatternForType(type);
    for (const example of contract.examples || []) {
      expect(typeof example.id === 'string' && example.id.startsWith('ovs:'), `app/data/nodes/node-page-contracts.json: ${type} example missing id`);
      expect(typeof example.label === 'string' && example.label.trim(), `app/data/nodes/node-page-contracts.json: ${type} example missing label`);
      expect(pattern.test(example.hash || ''), `app/data/nodes/node-page-contracts.json: ${type} example hash invalid: ${example.hash || '(missing)'}`);
      if (type === 'category') expect(refs.cats.has(example.id.slice('ovs:cat/'.length)), `app/data/nodes/node-page-contracts.json: category example unknown ${example.id}`);
      if (type === 'item') expect(refs.items.has(example.id), `app/data/nodes/node-page-contracts.json: item example unknown ${example.id}`);
      if (type === 'guide') expect(refs.guides.has(example.id), `app/data/nodes/node-page-contracts.json: guide example unknown ${example.id}`);
      if (type === 'brand') expect(refs.brands.has(example.id), `app/data/nodes/node-page-contracts.json: brand example unknown ${example.id}`);
      if (type === 'company') expect(refs.companies.has(example.id), `app/data/nodes/node-page-contracts.json: company example unknown ${example.id}`);
      if (type === 'tag') expect(refs.tags.has(example.id), `app/data/nodes/node-page-contracts.json: tag example unknown ${example.id}`);
      if (type === 'errand') expect(refs.errands.has(example.id), `app/data/nodes/node-page-contracts.json: errand example unknown ${example.id}`);
      if (type === 'line') expect(refs.lines.has(example.id), `app/data/nodes/node-page-contracts.json: line example unknown ${example.id}`);
    }
  }

  expect(pageContracts.totals?.categories === refs.cats.size, 'app/data/nodes/node-page-contracts.json: category total mismatch');
  expect(pageContracts.totals?.brands === (outputs.brandIndex.nodes || []).length, 'app/data/nodes/node-page-contracts.json: brand total mismatch');
  expect(pageContracts.totals?.companies === (outputs.companyIndex.nodes || []).length, 'app/data/nodes/node-page-contracts.json: company total mismatch');
  expect(pageContracts.totals?.tags === refs.tags.size, 'app/data/nodes/node-page-contracts.json: tag total mismatch');
  expect(pageContracts.totals?.errands === refs.errands.size, 'app/data/nodes/node-page-contracts.json: errand total mismatch');
  expect(pageContracts.totals?.lines === refs.lines.size, 'app/data/nodes/node-page-contracts.json: line total mismatch');
  expect(pageContracts.totals?.guides === refs.guides.size, 'app/data/nodes/node-page-contracts.json: guide total mismatch');
}

function parseFixtureHash(hash) {
  const text = String(hash || '');
  let match = text.match(/^#explore\/([^/]+)$/);
  if (match) {
    const cid = decodeURIComponent(match[1]);
    return { route: 'explore', type: 'category', id: `ovs:cat/${cid}`, params: { cid } };
  }
  match = text.match(/^#item\/([^/]+)\/(.+)$/);
  if (match) {
    const cid = decodeURIComponent(match[1]);
    const code = decodeURIComponent(match[2]);
    return { route: 'item', type: 'item', id: itemId(cid, code), params: { cid, code } };
  }
  match = text.match(/^#guide\/([^/]+)$/);
  if (match) {
    const slug = decodeURIComponent(match[1]);
    return { route: 'guide', type: 'guide', id: `ovs:guide/${slug}`, params: { slug } };
  }
  match = text.match(/^#n\/([^/]+)\/(.+)$/);
  if (match) {
    const type = decodeURIComponent(match[1]);
    const slug = decodeURIComponent(match[2]);
    return { route: 'node', type, id: `ovs:${type}/${slug}`, params: { type, slug } };
  }
  return null;
}

function fixtureTargetExists(type, id, refs) {
  if (type === 'category') return id.startsWith('ovs:cat/') && refs.cats.has(id.slice('ovs:cat/'.length));
  if (type === 'item') return refs.items.has(id);
  if (type === 'guide') return refs.guides.has(id);
  if (type === 'brand') return refs.brands.has(id);
  if (type === 'company') return refs.companies.has(id);
  if (type === 'tag') return refs.tags.has(id);
  if (type === 'errand') return refs.errands.has(id);
  if (type === 'line') return refs.lines.has(id);
  return false;
}

function checkNodeRouteFixtures(routeFixtures, pageContracts, outputs, refs) {
  expect(routeFixtures.format === 'ovs-node-route-fixtures', 'app/data/nodes/node-route-fixtures.json: wrong format');
  expect(routeFixtures.version === '0.1', 'app/data/nodes/node-route-fixtures.json: wrong version');
  expect(/app-owned/i.test(routeFixtures.purpose || ''), 'app/data/nodes/node-route-fixtures.json: missing app-owned purpose note');
  expect(/Parse fixtures only/i.test(routeFixtures.appLaneNote || ''), 'app/data/nodes/node-route-fixtures.json: missing parse-only lane note');
  expect((routeFixtures.source || []).includes('app/data/nodes/node-page-contracts.json'), 'app/data/nodes/node-route-fixtures.json: source list missing node-page-contracts.json');
  expect(routeFixtures.parserRules?.hashOnly === true, 'app/data/nodes/node-route-fixtures.json: parserRules.hashOnly should be true');
  expect(routeFixtures.parserRules?.decodeParamsWith === 'decodeURIComponent', 'app/data/nodes/node-route-fixtures.json: decode rule mismatch');
  for (const pattern of ['#explore/<cid>', '#item/<cid>/<code>', '#guide/<slug>', '#n/<type>/<slug>']) {
    expect((routeFixtures.parserRules?.acceptedPatterns || []).includes(pattern), `app/data/nodes/node-route-fixtures.json: missing accepted pattern ${pattern}`);
  }

  const examples = [];
  for (const contract of pageContracts.contracts || []) {
    for (const example of contract.examples || []) examples.push({ type: contract.type, source: contract.source, example });
  }
  const exampleKeys = new Set(examples.map(({ type, example }) => `${type}\t${example.hash}`));
  const cases = routeFixtures.cases || [];
  expect(cases.length === examples.length, 'app/data/nodes/node-route-fixtures.json: fixture count should match page-contract examples');
  expect(routeFixtures.totals?.cases === cases.length, 'app/data/nodes/node-route-fixtures.json: total case count mismatch');

  const seen = new Set();
  const typeCounts = {};
  for (const fixture of cases) {
    expect(/^[-a-z0-9]+$/.test(fixture.id || ''), `${fixture.id}: route fixture id should be slug-like`);
    expect(!seen.has(fixture.id), `${fixture.id}: duplicate route fixture id`);
    seen.add(fixture.id);
    expect(exampleKeys.has(`${fixture.type}\t${fixture.hash}`), `${fixture.id}: route fixture does not match a page-contract example`);
    expect(typeof fixture.label === 'string' && fixture.label.trim(), `${fixture.id}: route fixture missing label`);
    expect(typeof fixture.source === 'string' && fixture.source.trim(), `${fixture.id}: route fixture missing source`);
    typeCounts[fixture.type] = (typeCounts[fixture.type] || 0) + 1;

    const parsed = parseFixtureHash(fixture.hash);
    expect(!!parsed, `${fixture.id}: route fixture hash does not parse`);
    if (!parsed) continue;
    expect(fixture.expect?.route === parsed.route, `${fixture.id}: expected route mismatch`);
    expect(fixture.expect?.type === parsed.type, `${fixture.id}: expected type mismatch`);
    expect(fixture.expect?.id === parsed.id, `${fixture.id}: expected id mismatch`);
    expect(JSON.stringify(fixture.expect?.params || {}) === JSON.stringify(parsed.params), `${fixture.id}: expected params mismatch`);
    expect(parsed.type === fixture.type, `${fixture.id}: parsed type should match fixture type`);
    expect(fixtureTargetExists(parsed.type, parsed.id, refs), `${fixture.id}: parsed target does not exist: ${parsed.id}`);
  }

  for (const [type, count] of Object.entries(typeCounts)) {
    expect(routeFixtures.totals?.typeCounts?.[type] === count, `app/data/nodes/node-route-fixtures.json: type count mismatch for ${type}`);
  }
  for (const required of ['category', 'item', 'guide', 'brand', 'company', 'tag', 'errand', 'line']) {
    expect((routeFixtures.totals?.typeCounts?.[required] || 0) > 0, `app/data/nodes/node-route-fixtures.json: missing ${required} route fixture`);
  }
  expect(cases.some(fixture => fixture.hash === '#n/line/avoid%3Anestle' && fixture.expect?.params?.slug === 'avoid:nestle'), 'app/data/nodes/node-route-fixtures.json: missing encoded line-id fixture');
  expect((outputs.nodeRouteFixturesIndex.cases || []).length === cases.length, 'app/data/nodes/node-route-fixtures.json: build output case count mismatch');
}

function checkNodeRouteGuardrails(guardrails, refs) {
  expect(guardrails.format === 'ovs-node-route-guardrails', 'app/data/nodes/node-route-guardrails.json: wrong format');
  expect(guardrails.version === '0.1', 'app/data/nodes/node-route-guardrails.json: wrong version');
  expect(/app-owned/i.test(guardrails.purpose || ''), 'app/data/nodes/node-route-guardrails.json: missing app-owned purpose note');
  expect(/Guardrail data only/i.test(guardrails.appLaneNote || ''), 'app/data/nodes/node-route-guardrails.json: missing guardrail-only lane note');
  for (const file of ['app/data/nodes/node-route-fixtures.json', 'app/data/nodes/node-page-contracts.json']) {
    expect((guardrails.source || []).includes(file), `app/data/nodes/node-route-guardrails.json: source list missing ${file}`);
  }
  for (const key of ['malformed', 'unsupported', 'unknownTarget', 'canonicalize']) {
    expect(typeof guardrails.fallbackGuidance?.[key] === 'string' && guardrails.fallbackGuidance[key].trim(), `app/data/nodes/node-route-guardrails.json: missing fallback guidance for ${key}`);
  }

  const cases = guardrails.cases || [];
  expect(cases.length >= 10, 'app/data/nodes/node-route-guardrails.json: expected at least ten guardrail cases');
  expect(guardrails.totals?.cases === cases.length, 'app/data/nodes/node-route-guardrails.json: total case count mismatch');
  const kinds = new Set(cases.map(test => test.kind));
  for (const kind of ['malformed', 'unsupported', 'unknown-target', 'canonicalize']) {
    expect(kinds.has(kind), `app/data/nodes/node-route-guardrails.json: missing ${kind} case`);
  }

  const byKind = {};
  const ids = new Set();
  for (const test of cases) {
    expect(/^[-a-z0-9]+$/.test(test.id || ''), `${test.id}: guardrail id should be slug-like`);
    expect(!ids.has(test.id), `${test.id}: duplicate guardrail id`);
    ids.add(test.id);
    expect(typeof test.hash === 'string', `${test.id}: guardrail hash should be a string`);
    expect(typeof test.reason === 'string' && test.reason.trim(), `${test.id}: guardrail missing reason`);
    byKind[test.kind] = (byKind[test.kind] || 0) + 1;

    const parsed = parseFixtureHash(test.hash);
    const exists = parsed ? fixtureTargetExists(parsed.type, parsed.id, refs) : false;
    const canonicalHash = parsed
      ? (parsed.route === 'explore'
        ? `#explore/${encodeURIComponent(parsed.params.cid)}`
        : parsed.route === 'item'
          ? `#item/${encodeURIComponent(parsed.params.cid)}/${encodeURIComponent(parsed.params.code)}`
          : parsed.route === 'guide'
            ? `#guide/${encodeURIComponent(parsed.params.slug)}`
            : `#n/${encodeURIComponent(parsed.params.type)}/${encodeURIComponent(parsed.params.slug)}`)
      : null;

    expect(test.expect?.parseable === !!parsed, `${test.id}: parseable expectation mismatch`);
    expect(test.expect?.targetExists === exists, `${test.id}: target existence expectation mismatch`);
    expect(test.expect?.canonicalHash === canonicalHash, `${test.id}: canonical hash expectation mismatch`);

    if (test.kind === 'malformed' || test.kind === 'unsupported') {
      expect(!parsed, `${test.id}: malformed/unsupported guardrail should not parse`);
      expect(test.expect?.targetExists === false, `${test.id}: malformed/unsupported guardrail should not target a page`);
    } else {
      expect(!!parsed, `${test.id}: ${test.kind} guardrail should parse`);
      if (!parsed) continue;
      expect(test.expect?.route === parsed.route, `${test.id}: route expectation mismatch`);
      expect(test.expect?.type === parsed.type, `${test.id}: type expectation mismatch`);
      expect(test.expect?.id === parsed.id, `${test.id}: id expectation mismatch`);
      expect(JSON.stringify(test.expect?.params || {}) === JSON.stringify(parsed.params), `${test.id}: params expectation mismatch`);
    }

    if (test.kind === 'unknown-target') {
      expect(parsed && !exists, `${test.id}: unknown-target guardrail should parse to a missing target`);
    }
    if (test.kind === 'canonicalize') {
      expect(parsed && exists, `${test.id}: canonicalize guardrail should parse to a real target`);
      expect(test.hash !== test.expect?.canonicalHash, `${test.id}: canonicalize guardrail should differ from canonical hash`);
    }
  }

  for (const [kind, count] of Object.entries(byKind)) {
    expect(guardrails.totals?.byKind?.[kind] === count, `app/data/nodes/node-route-guardrails.json: kind count mismatch for ${kind}`);
  }
  expect(cases.some(test => test.id === 'line-id-canonicalization' && test.expect?.canonicalHash === '#n/line/avoid%3Anestle'), 'app/data/nodes/node-route-guardrails.json: missing line canonicalization guardrail');
}

function checkNodeLoadPlan(loadPlan, outputs) {
  expect(loadPlan.format === 'ovs-node-load-plan', 'app/data/nodes/node-load-plan.json: wrong format');
  expect(loadPlan.version === '0.1', 'app/data/nodes/node-load-plan.json: wrong version');
  expect(/runtime loading contract/i.test(loadPlan.purpose || ''), 'app/data/nodes/node-load-plan.json: missing runtime loading purpose');
  expect(/app-owned/i.test(loadPlan.appLaneNote || ''), 'app/data/nodes/node-load-plan.json: missing app-owned lane note');
  for (const file of ['pipeline/build_nodes.js', 'app/data/nodes/manifest.json', 'app/data/nodes/readiness.json']) {
    expect((loadPlan.source || []).includes(file), `app/data/nodes/node-load-plan.json: source list missing ${file}`);
  }

  expect(loadPlan.integrityContract?.algorithm === 'sha256', 'app/data/nodes/node-load-plan.json: integrity algorithm should be sha256');
  expect(/<file>:<sha256>/.test(loadPlan.integrityContract?.cacheKey || ''), 'app/data/nodes/node-load-plan.json: cache key should include file + sha256');
  expect(/refetch/i.test(loadPlan.integrityContract?.retry || ''), 'app/data/nodes/node-load-plan.json: retry policy should mention refetch');
  expect(/Never fabricate/i.test(loadPlan.integrityContract?.fallback || ''), 'app/data/nodes/node-load-plan.json: fallback should forbid fabricated results');

  const budgets = loadPlan.budgets || {};
  const askCoreBytes = Buffer.byteLength(formatJson(outputs.askCoreIndex), 'utf8');
  const fullAskBytes = Buffer.byteLength(formatJson(outputs.askIndex), 'utf8');
  const pageNodeBytes = Buffer.byteLength(formatJson(outputs.brandIndex), 'utf8') + Buffer.byteLength(formatJson(outputs.companyIndex), 'utf8');
  expect(budgets.startupBudgetBytes === 700000, 'app/data/nodes/node-load-plan.json: startup budget mismatch');
  expect(budgets.minimumHeadroomBytes === 50000, 'app/data/nodes/node-load-plan.json: minimum headroom mismatch');
  expect(budgets.askCoreBytes === askCoreBytes, 'app/data/nodes/node-load-plan.json: ask-core bytes mismatch');
  expect(budgets.askCoreHeadroomBytes === budgets.startupBudgetBytes - budgets.askCoreBytes, 'app/data/nodes/node-load-plan.json: ask-core headroom mismatch');
  expect(budgets.askCoreWithinBudget === true, 'app/data/nodes/node-load-plan.json: ask-core should be within budget');
  expect(budgets.askCoreHasHeadroom === true, 'app/data/nodes/node-load-plan.json: ask-core should keep headroom');
  expect(budgets.fullAskBytes === fullAskBytes, 'app/data/nodes/node-load-plan.json: full Ask bytes mismatch');
  expect(budgets.pageNodeBytes === pageNodeBytes, 'app/data/nodes/node-load-plan.json: page node bytes mismatch');
  expect(Number.isInteger(budgets.establishedEagerBytes) && budgets.establishedEagerBytes > 0, 'app/data/nodes/node-load-plan.json: established eager bytes missing');

  const stages = loadPlan.stages || [];
  const requiredStages = [
    'bootstrap-metadata',
    'established-node-primitives',
    'startup-ask-core',
    'defer-page-nodes',
    'lazy-product-ask',
    'dev-contracts'
  ];
  expect(stages.length === requiredStages.length, 'app/data/nodes/node-load-plan.json: unexpected stage count');
  expect(loadPlan.totals?.stages === stages.length, 'app/data/nodes/node-load-plan.json: stage total mismatch');
  expect(loadPlan.totals?.runtimeStages === 5, 'app/data/nodes/node-load-plan.json: runtime stage total mismatch');
  expect(loadPlan.totals?.devContractStages === 1, 'app/data/nodes/node-load-plan.json: dev-contract stage total mismatch');

  for (let i = 0; i < requiredStages.length; i += 1) {
    const stage = stages[i];
    expect(stage?.id === requiredStages[i], `app/data/nodes/node-load-plan.json: stage ${i + 1} should be ${requiredStages[i]}`);
    if (!stage) continue;
    expect(typeof stage.label === 'string' && stage.label.trim(), `${stage.id}: stage missing label`);
    expect(typeof stage.loadHint === 'string' && stage.loadHint.trim(), `${stage.id}: stage missing loadHint`);
    expect(Array.isArray(stage.files) && stage.files.length > 0, `${stage.id}: stage missing files`);
    expect(typeof stage.trigger === 'string' && stage.trigger.trim(), `${stage.id}: stage missing trigger`);
    expect(Array.isArray(stage.acceptanceCriteria) && stage.acceptanceCriteria.length >= 3, `${stage.id}: stage needs at least three acceptance criteria`);
    expect(typeof stage.failureMode === 'string' && stage.failureMode.trim(), `${stage.id}: stage missing failure mode`);
  }

  const byId = new Map(stages.map(stage => [stage.id, stage]));
  expect((byId.get('bootstrap-metadata')?.files || []).includes('manifest.json'), 'app/data/nodes/node-load-plan.json: bootstrap should include manifest.json');
  expect((byId.get('bootstrap-metadata')?.files || []).includes('node-load-plan.json'), 'app/data/nodes/node-load-plan.json: bootstrap should include node-load-plan.json');
  for (const file of ['tags.json', 'errands.json', 'synonyms.json']) {
    expect((byId.get('established-node-primitives')?.files || []).includes(file), `app/data/nodes/node-load-plan.json: eager primitives should include ${file}`);
  }
  expect(!(byId.get('established-node-primitives')?.files || []).includes('sample.json'), 'app/data/nodes/node-load-plan.json: sample.json must stay out of runtime eager primitives');
  expect(byId.get('startup-ask-core')?.loadHint === 'eager-search', 'app/data/nodes/node-load-plan.json: ask-core stage should be eager-search');
  expect(byId.get('startup-ask-core')?.bytes === askCoreBytes, 'app/data/nodes/node-load-plan.json: ask-core stage byte mismatch');
  expect(byId.get('startup-ask-core')?.hasMinimumHeadroom === true, 'app/data/nodes/node-load-plan.json: ask-core stage should have headroom');
  expect((byId.get('startup-ask-core')?.acceptanceCriteria || []).some(line => /typo before loose containment/i.test(line)), 'app/data/nodes/node-load-plan.json: ask-core stage should preserve typo ordering');
  expect(byId.get('lazy-product-ask')?.loadHint === 'lazy-product-search', 'app/data/nodes/node-load-plan.json: product Ask should be lazy');
  expect((byId.get('lazy-product-ask')?.files || []).includes('ask-index.json'), 'app/data/nodes/node-load-plan.json: lazy stage should include ask-index.json');
  expect(byId.get('lazy-product-ask')?.bytes === fullAskBytes, 'app/data/nodes/node-load-plan.json: lazy stage byte mismatch');
  expect((byId.get('defer-page-nodes')?.files || []).includes('brands.json'), 'app/data/nodes/node-load-plan.json: page-node stage should include brands.json');
  expect((byId.get('defer-page-nodes')?.files || []).includes('companies.json'), 'app/data/nodes/node-load-plan.json: page-node stage should include companies.json');
  expect(byId.get('defer-page-nodes')?.bytes === pageNodeBytes, 'app/data/nodes/node-load-plan.json: page-node byte mismatch');
  expect((byId.get('dev-contracts')?.files || []).includes('node-integration-checklist.json'), 'app/data/nodes/node-load-plan.json: dev stage should include integration checklist');
  expect((byId.get('dev-contracts')?.files || []).includes('node-runtime-states.json'), 'app/data/nodes/node-load-plan.json: dev stage should include runtime states');
  expect((byId.get('dev-contracts')?.files || []).includes('node-preview-matrix.json'), 'app/data/nodes/node-load-plan.json: dev stage should include preview matrix');
}

function checkNodeRuntimeStates(states, outputs) {
  expect(states.format === 'ovs-node-runtime-states', 'app/data/nodes/node-runtime-states.json: wrong format');
  expect(states.version === '0.1', 'app/data/nodes/node-runtime-states.json: wrong version');
  expect(/failure-mode fixtures/i.test(states.purpose || ''), 'app/data/nodes/node-runtime-states.json: missing failure-mode purpose');
  expect(/app-owned/i.test(states.appLaneNote || ''), 'app/data/nodes/node-runtime-states.json: missing app-owned lane note');
  for (const file of ['app/data/nodes/node-load-plan.json', 'app/data/nodes/ask-presentation.json', 'app/data/nodes/node-route-guardrails.json', 'app/data/nodes/manifest.json']) {
    expect((states.source || []).includes(file), `app/data/nodes/node-runtime-states.json: source list missing ${file}`);
  }

  for (const field of ['id', 'family', 'stage', 'trigger', 'requiredBehavior', 'mustNot', 'sourceFiles']) {
    expect((states.caseFields || []).includes(field), `app/data/nodes/node-runtime-states.json: caseFields missing ${field}`);
  }

  const cases = states.cases || [];
  expect(cases.length >= 12, 'app/data/nodes/node-runtime-states.json: too few state cases');
  expect(states.totals?.cases === cases.length, 'app/data/nodes/node-runtime-states.json: case total mismatch');

  const loadStages = new Set((outputs.nodeLoadPlanIndex.stages || []).map(stage => stage.id));
  const byId = new Map();
  const byFamily = {};
  for (const test of cases) {
    expect(typeof test.id === 'string' && /^[a-z0-9-]+$/.test(test.id), 'app/data/nodes/node-runtime-states.json: bad state id');
    expect(!byId.has(test.id), `${test.id}: duplicate runtime state id`);
    byId.set(test.id, test);
    expect(['loading', 'unavailable', 'integrity', 'empty', 'route', 'offline'].includes(test.family), `${test.id}: unexpected family ${test.family}`);
    byFamily[test.family] = (byFamily[test.family] || 0) + 1;
    expect(loadStages.has(test.stage), `${test.id}: state references unknown load-plan stage ${test.stage}`);
    expect(typeof test.trigger === 'string' && test.trigger.trim(), `${test.id}: missing trigger`);
    expect(Array.isArray(test.requiredBehavior) && test.requiredBehavior.length >= 3, `${test.id}: needs at least three required behaviors`);
    expect(Array.isArray(test.mustNot) && test.mustNot.length >= 2, `${test.id}: needs at least two must-not clauses`);
    expect(Array.isArray(test.sourceFiles) && test.sourceFiles.length > 0, `${test.id}: missing source files`);
    expect(/app|copy|UI|visual|treatment|unavailable|honest/i.test(test.appOwnedCopyIntent || ''), `${test.id}: missing app-owned copy intent`);
  }

  for (const [family, count] of Object.entries(byFamily)) {
    expect(states.totals?.byFamily?.[family] === count, `app/data/nodes/node-runtime-states.json: family count mismatch for ${family}`);
  }
  for (const family of ['loading', 'unavailable', 'integrity', 'empty', 'route', 'offline']) {
    expect((byFamily[family] || 0) > 0, `app/data/nodes/node-runtime-states.json: missing ${family} family`);
  }

  for (const id of [
    'metadata-loading',
    'metadata-unavailable',
    'hash-mismatch-retry',
    'hash-mismatch-unavailable',
    'ask-core-loading',
    'ask-core-unavailable',
    'ask-no-results',
    'page-node-loading',
    'page-node-unavailable',
    'unknown-target-route',
    'malformed-route',
    'canonical-route-rewrite',
    'lazy-product-loading',
    'lazy-product-unavailable',
    'offline-core-available'
  ]) {
    expect(byId.has(id), `app/data/nodes/node-runtime-states.json: missing ${id}`);
  }

  const qa = states.qaContract || {};
  expect(/runtime QA contract/i.test(qa.purpose || ''), 'app/data/nodes/node-runtime-states.json: qaContract missing runtime QA purpose');
  expect(qa.status === 'pending-app-integration', 'app/data/nodes/node-runtime-states.json: qaContract should remain pending app integration');
  expect(qa.h4DrainableFromDataAlone === false, 'app/data/nodes/node-runtime-states.json: qaContract should not drain H4 from data alone');
  expect(/app-owned/i.test(qa.drainRule || ''), 'app/data/nodes/node-runtime-states.json: qaContract drain rule should name app-owned checks');
  const qaModes = qa.modes || [];
  expect(qaModes.length >= 4, 'app/data/nodes/node-runtime-states.json: qaContract should expose at least four QA modes');
  const modeById = new Map();
  const coveredCases = new Set();
  for (const mode of qaModes) {
    expect(typeof mode.id === 'string' && /^[a-z0-9-]+$/.test(mode.id), 'app/data/nodes/node-runtime-states.json: qaContract mode has bad id');
    expect(!modeById.has(mode.id), `${mode.id}: duplicate runtime QA mode`);
    modeById.set(mode.id, mode);
    expect(mode.owner === 'app/design', `${mode.id}: runtime QA mode owner should remain app/design`);
    expect(Array.isArray(mode.caseIds) && mode.caseIds.length > 0, `${mode.id}: runtime QA mode missing case ids`);
    expect(Array.isArray(mode.sourceFiles) && mode.sourceFiles.length > 0, `${mode.id}: runtime QA mode missing source files`);
    expect(Array.isArray(mode.passWhen) && mode.passWhen.length >= 2, `${mode.id}: runtime QA mode needs pass criteria`);
    expect(Array.isArray(mode.mustNot) && mode.mustNot.length >= 2, `${mode.id}: runtime QA mode needs must-not clauses`);
    for (const id of mode.caseIds || []) {
      expect(byId.has(id), `${mode.id}: runtime QA mode references unknown case ${id}`);
      coveredCases.add(id);
    }
  }
  for (const id of byId.keys()) expect(coveredCases.has(id), `app/data/nodes/node-runtime-states.json: qaContract does not cover case ${id}`);
  for (const id of ['startup-smoke', 'route-page-smoke', 'lazy-product-smoke', 'copy-failure-review']) {
    expect(modeById.has(id), `app/data/nodes/node-runtime-states.json: qaContract missing ${id}`);
  }
  for (const id of ['metadata-loading', 'metadata-unavailable', 'hash-mismatch-retry', 'ask-core-loading', 'ask-core-unavailable', 'ask-no-results', 'offline-core-available']) {
    expect((modeById.get('startup-smoke')?.caseIds || []).includes(id), `startup-smoke: missing ${id}`);
  }
  for (const id of ['unknown-target-route', 'malformed-route', 'canonical-route-rewrite', 'page-node-loading', 'page-node-unavailable']) {
    expect((modeById.get('route-page-smoke')?.caseIds || []).includes(id), `route-page-smoke: missing ${id}`);
  }
  for (const id of ['lazy-product-loading', 'lazy-product-unavailable']) {
    expect((modeById.get('lazy-product-smoke')?.caseIds || []).includes(id), `lazy-product-smoke: missing ${id}`);
  }
  expect((modeById.get('copy-failure-review')?.caseIds || []).length === cases.length, 'copy-failure-review: should cover every runtime case');

  const stageCases = {};
  for (const test of cases) {
    if (!stageCases[test.stage]) stageCases[test.stage] = [];
    stageCases[test.stage].push(test.id);
  }
  const coverage = qa.loadStageCoverage || {};
  for (const [stage, ids] of Object.entries(stageCases)) {
    const row = coverage[stage];
    expect(!!row, `app/data/nodes/node-runtime-states.json: qaContract missing stage coverage for ${stage}`);
    const stagePlan = (outputs.nodeLoadPlanIndex.stages || []).find(item => item.id === stage) || {};
    expect(row.loadHint === stagePlan.loadHint, `${stage}: qaContract loadHint mismatch`);
    expect(row.runtime === (stagePlan.loadHint !== 'dev-contract'), `${stage}: qaContract runtime flag mismatch`);
    expect(formatJson([...(row.caseIds || [])].sort()) === formatJson([...ids].sort()), `${stage}: qaContract case coverage mismatch`);
  }
  expect(qa.coverage?.caseCount === cases.length, 'app/data/nodes/node-runtime-states.json: qaContract caseCount mismatch');
  expect(qa.coverage?.modeCount === qaModes.length, 'app/data/nodes/node-runtime-states.json: qaContract modeCount mismatch');
  expect(qa.coverage?.stagesCovered === Object.keys(coverage).length, 'app/data/nodes/node-runtime-states.json: qaContract stagesCovered mismatch');
  expect(qa.coverage?.allCasesCovered === true, 'app/data/nodes/node-runtime-states.json: qaContract should report all cases covered');
  expect((qa.coverage?.runtimeModeIds || []).includes('lazy-product-smoke'), 'app/data/nodes/node-runtime-states.json: qaContract should name lazy runtime mode');
  expect((qa.coverage?.manualReviewModeIds || []).includes('copy-failure-review'), 'app/data/nodes/node-runtime-states.json: qaContract should name manual review mode');

  const noResults = byId.get('ask-no-results');
  expect(noResults?.recovery?.primary === outputs.askPresentationIndex.emptyState?.primary, 'app/data/nodes/node-runtime-states.json: no-results primary recovery mismatch');
  expect(noResults?.recovery?.secondary === outputs.askPresentationIndex.emptyState?.secondary, 'app/data/nodes/node-runtime-states.json: no-results secondary recovery mismatch');

  const mismatch = byId.get('hash-mismatch-retry');
  expect(mismatch?.cacheKey === outputs.nodeLoadPlanIndex.integrityContract?.cacheKey, 'app/data/nodes/node-runtime-states.json: hash mismatch cache key mismatch');
  expect((mismatch?.requiredBehavior || []).some(line => /refetch/i.test(line)), 'app/data/nodes/node-runtime-states.json: hash mismatch retry should mention refetch');

  const unknown = byId.get('unknown-target-route');
  expect(unknown?.fixture?.kind === 'unknown-target', 'app/data/nodes/node-runtime-states.json: unknown route fixture missing');
  expect(unknown?.fixture?.parseable === true && unknown?.fixture?.targetExists === false, 'app/data/nodes/node-runtime-states.json: unknown route fixture expectation mismatch');
  const malformed = byId.get('malformed-route');
  expect(malformed?.fixture?.kind === 'malformed', 'app/data/nodes/node-runtime-states.json: malformed route fixture missing');
  expect(malformed?.fixture?.parseable === false, 'app/data/nodes/node-runtime-states.json: malformed route should not parse');
  const canonical = byId.get('canonical-route-rewrite');
  expect(canonical?.fixture?.kind === 'canonicalize', 'app/data/nodes/node-runtime-states.json: canonical route fixture missing');
  expect(canonical?.fixture?.canonicalHash === '#n/line/avoid%3Anestle', 'app/data/nodes/node-runtime-states.json: canonical route should preserve encoded line id');

  const lazyUnavailable = byId.get('lazy-product-unavailable');
  expect((lazyUnavailable?.requiredBehavior || []).some(line => /core results/i.test(line)), 'app/data/nodes/node-runtime-states.json: lazy failure should keep core results');
  expect((lazyUnavailable?.mustNot || []).some(line => /product\/barcode coverage/i.test(line)), 'app/data/nodes/node-runtime-states.json: lazy failure should not claim product coverage');
}

function checkNodePreviewMatrix(matrix, outputs) {
  expect(matrix.format === 'ovs-node-preview-matrix', 'app/data/nodes/node-preview-matrix.json: wrong format');
  expect(matrix.version === '0.1', 'app/data/nodes/node-preview-matrix.json: wrong version');
  expect(/H4-drain QA matrix/i.test(matrix.purpose || ''), 'app/data/nodes/node-preview-matrix.json: missing H4 drain purpose');
  expect(/app-owned/i.test(matrix.appLaneNote || ''), 'app/data/nodes/node-preview-matrix.json: missing app-owned lane note');
  expect(matrix.status === 'pending-app-integration', 'app/data/nodes/node-preview-matrix.json: status should remain pending app integration');
  expect(matrix.h4DrainableFromDataAlone === false, 'app/data/nodes/node-preview-matrix.json: data alone must not drain H4');
  for (const file of [
    'app/data/nodes/ask-traces.json',
    'app/data/nodes/ask-presentation.json',
    'app/data/nodes/node-walkthroughs.json',
    'app/data/nodes/node-route-fixtures.json',
    'app/data/nodes/node-route-guardrails.json',
    'app/data/nodes/node-load-plan.json',
    'app/data/nodes/node-runtime-states.json',
    'app/data/nodes/node-integration-checklist.json',
    'app/data/nodes/readiness.json',
    'app/data/nodes/manifest.json'
  ]) {
    expect((matrix.source || []).includes(file), `app/data/nodes/node-preview-matrix.json: source list missing ${file}`);
  }

  const scenarios = matrix.scenarios || [];
  expect(scenarios.length >= 18, 'app/data/nodes/node-preview-matrix.json: too few preview scenarios');
  expect(matrix.totals?.scenarios === scenarios.length, 'app/data/nodes/node-preview-matrix.json: scenario total mismatch');

  const expectedGroups = ['startup-search', 'lazy-product', 'route', 'route-guardrail', 'runtime-state', 'flagship-walkthrough', 'handoff-drain'];
  for (const group of expectedGroups) expect((matrix.groups || []).includes(group), `app/data/nodes/node-preview-matrix.json: missing group ${group}`);

  const byId = new Map();
  const byGroup = {};
  for (const scenario of scenarios) {
    expect(typeof scenario.id === 'string' && /^[a-z0-9-]+$/.test(scenario.id), 'app/data/nodes/node-preview-matrix.json: bad scenario id');
    expect(!byId.has(scenario.id), `${scenario.id}: duplicate preview scenario id`);
    byId.set(scenario.id, scenario);
    expect((matrix.groups || []).includes(scenario.group), `${scenario.id}: unknown preview group ${scenario.group}`);
    byGroup[scenario.group] = (byGroup[scenario.group] || 0) + 1;
    expect(scenario.owner === 'app/design', `${scenario.id}: preview scenario owner should remain app/design`);
    expect(typeof scenario.title === 'string' && scenario.title.trim(), `${scenario.id}: missing title`);
    expect(Array.isArray(scenario.sourceFiles) && scenario.sourceFiles.length > 0, `${scenario.id}: missing source files`);
    expect(Array.isArray(scenario.steps) && scenario.steps.length >= 2, `${scenario.id}: missing steps`);
    expect(Array.isArray(scenario.acceptanceCriteria) && scenario.acceptanceCriteria.length >= 2, `${scenario.id}: missing acceptance criteria`);
    expect(Array.isArray(scenario.mustNot) && scenario.mustNot.length >= 2, `${scenario.id}: missing must-not criteria`);
  }
  for (const [group, count] of Object.entries(byGroup)) {
    expect(matrix.totals?.byGroup?.[group] === count, `app/data/nodes/node-preview-matrix.json: group count mismatch for ${group}`);
  }
  for (const group of expectedGroups) expect((byGroup[group] || 0) > 0, `app/data/nodes/node-preview-matrix.json: no scenarios for ${group}`);

  const run = matrix.runContract || {};
  expect(/private-preview run contract/i.test(run.purpose || ''), 'app/data/nodes/node-preview-matrix.json: runContract missing private-preview purpose');
  expect(run.status === 'pending-app-integration', 'app/data/nodes/node-preview-matrix.json: runContract should remain pending app integration');
  expect(run.h4DrainableFromDataAlone === false, 'app/data/nodes/node-preview-matrix.json: runContract should not drain H4 from data alone');
  expect(/Claude H4/i.test(run.namedConsumer || ''), 'app/data/nodes/node-preview-matrix.json: runContract should name Claude H4 consumer');
  expect(/H4 drains only after/i.test(run.drainRule || ''), 'app/data/nodes/node-preview-matrix.json: runContract drain rule should be explicit');
  expect(Array.isArray(run.evidenceRequired) && run.evidenceRequired.length >= 3, 'app/data/nodes/node-preview-matrix.json: runContract needs evidence requirements');
  expect(Array.isArray(run.exitCriteria) && run.exitCriteria.length >= 3, 'app/data/nodes/node-preview-matrix.json: runContract needs exit criteria');
  const runOrder = run.runOrder || [];
  expect(runOrder.length === expectedGroups.length, 'app/data/nodes/node-preview-matrix.json: runContract run order should cover expected groups');
  const coveredScenarioIds = new Map();
  for (let i = 0; i < runOrder.length; i += 1) {
    const step = runOrder[i];
    expect(step.step === i + 1, `${step.group || `step-${i + 1}`}: runContract step should be sequential`);
    expect(step.group === expectedGroups[i], `${step.group || `step-${i + 1}`}: runContract group order mismatch`);
    expect(Array.isArray(step.scenarioIds) && step.scenarioIds.length === (byGroup[step.group] || 0), `${step.group}: runContract scenario count mismatch`);
    expect(Array.isArray(step.passWhen) && step.passWhen.length >= 3, `${step.group}: runContract passWhen too thin`);
    expect(Array.isArray(step.mustNot) && step.mustNot.length >= 2, `${step.group}: runContract mustNot too thin`);
    for (const id of step.scenarioIds || []) {
      const scenario = byId.get(id);
      expect(!!scenario, `${step.group}: runContract references unknown scenario ${id}`);
      expect(scenario?.group === step.group, `${step.group}: runContract scenario ${id} belongs to ${scenario?.group}`);
      coveredScenarioIds.set(id, (coveredScenarioIds.get(id) || 0) + 1);
    }
  }
  for (const id of byId.keys()) expect(coveredScenarioIds.get(id) === 1, `app/data/nodes/node-preview-matrix.json: runContract should cover ${id} exactly once`);
  expect(run.coverage?.scenarioCount === scenarios.length, 'app/data/nodes/node-preview-matrix.json: runContract scenario count mismatch');
  expect(run.coverage?.groupCount === expectedGroups.length, 'app/data/nodes/node-preview-matrix.json: runContract group count mismatch');
  expect(run.coverage?.allScenariosCovered === true, 'app/data/nodes/node-preview-matrix.json: runContract should report all scenarios covered');
  expect(run.coverage?.allGroupsCovered === true, 'app/data/nodes/node-preview-matrix.json: runContract should report all groups covered');
  expect(formatJson(run.coverage?.orderedGroups || []) === formatJson(expectedGroups), 'app/data/nodes/node-preview-matrix.json: runContract ordered groups mismatch');
  expect(run.coverage?.drainScenarioId === 'h4-drain-decision', 'app/data/nodes/node-preview-matrix.json: runContract drain scenario mismatch');
  expect((runOrder[runOrder.length - 1]?.scenarioIds || []).includes('h4-drain-decision'), 'app/data/nodes/node-preview-matrix.json: h4 drain scenario should be in final run step');
  expect((runOrder[runOrder.length - 1]?.mustNot || []).some(line => /data/i.test(line) && /alone/i.test(line)), 'app/data/nodes/node-preview-matrix.json: final run step should forbid data-only drain');

  const traceByQuery = new Map((outputs.askTracesIndex.traces || []).map(trace => [trace.query, trace]));
  function expectAskScenario(id, query) {
    const scenario = byId.get(id);
    const trace = traceByQuery.get(query);
    expect(!!scenario, `app/data/nodes/node-preview-matrix.json: missing ${id}`);
    expect(!!trace, `app/data/nodes/node-preview-matrix.json: missing trace for ${query}`);
    if (!scenario || !trace) return;
    const firstHash = trace.top?.[0]?.hash || null;
    const matchedHash = trace.matched ? ((trace.top || []).find(row => row.id === trace.matched)?.hash || null) : null;
    expect(scenario.fixtures?.query === query, `${id}: query mismatch`);
    expect(scenario.fixtures?.layer === trace.layer, `${id}: layer mismatch`);
    expect(scenario.fixtures?.matched === trace.matched, `${id}: matched id mismatch`);
    expect(scenario.fixtures?.expectFirstHash === firstHash, `${id}: first hash mismatch`);
    expect(scenario.fixtures?.expectMatchedHash === matchedHash, `${id}: matched hash mismatch`);
  }
  expectAskScenario('startup-nestle-concern', 'is nestle bad');
  expectAskScenario('startup-best-bank', 'best bank');
  expectAskScenario('startup-password-manager', 'best password manager');
  expectAskScenario('startup-private-messaging', 'private messaging app');
  expectAskScenario('startup-typo-nestel', 'nestel');
  expect((byId.get('startup-typo-nestel')?.mustNot || []).some(line => /loose token containment/i.test(line)), 'startup-typo-nestel should guard typo ordering');

  const barcode = byId.get('lazy-barcode-lookup');
  const barcodeTrace = traceByQuery.get('5449000054227');
  expect(barcode?.fixtures?.layer === 'full', 'lazy barcode scenario should use full Ask layer');
  expect(barcode?.fixtures?.expectMatchedHash === (barcodeTrace?.top || []).find(row => row.id === barcodeTrace?.matched)?.hash, 'lazy barcode matched hash mismatch');

  for (const id of ['route-category', 'route-item', 'route-guide', 'route-brand']) {
    const scenario = byId.get(id);
    expect(!!scenario, `app/data/nodes/node-preview-matrix.json: missing ${id}`);
    expect(typeof scenario?.fixtures?.hash === 'string' && scenario.fixtures.hash.startsWith('#'), `${id}: missing route hash`);
    expect(scenario?.fixtures?.expect?.route, `${id}: missing route expectation`);
  }

  expect(byId.get('guardrail-unknown-target')?.fixtures?.expect?.targetExists === false, 'unknown-target scenario should point at missing target');
  expect(byId.get('guardrail-malformed')?.fixtures?.expect?.parseable === false, 'malformed scenario should not parse');
  expect(byId.get('guardrail-canonicalize')?.fixtures?.expect?.canonicalHash === '#n/line/avoid%3Anestle', 'canonicalize scenario should preserve encoded line hash');

  const runtimeIds = new Set((outputs.nodeRuntimeStatesIndex.cases || []).map(test => test.id));
  for (const id of ['runtime-hash-mismatch-retry', 'runtime-ask-no-results', 'runtime-lazy-product-unavailable', 'runtime-offline-core-available']) {
    const scenario = byId.get(id);
    expect(!!scenario, `app/data/nodes/node-preview-matrix.json: missing ${id}`);
    expect(runtimeIds.has(scenario?.fixtures?.stateId), `${id}: references unknown runtime state`);
  }

  for (const walkthrough of outputs.nodeWalkthroughsIndex.walkthroughs || []) {
    const scenario = byId.get(`flagship-${walkthrough.id}`);
    expect(!!scenario, `app/data/nodes/node-preview-matrix.json: missing flagship ${walkthrough.id}`);
    expect(scenario?.fixtures?.query === walkthrough.query, `${walkthrough.id}: flagship query mismatch`);
    expect(scenario?.fixtures?.matchedTop === walkthrough.matchedTop, `${walkthrough.id}: flagship matchedTop mismatch`);
  }

  const drain = byId.get('h4-drain-decision');
  expect(drain?.fixtures?.activeHandoff === 'H4', 'h4 drain scenario should reference H4');
  expect(drain?.fixtures?.expectedStatusBeforeAppWork === 'pending-app-integration', 'h4 drain scenario should remain pending before app work');
  expect((drain?.mustNot || []).some(line => /data generation alone/i.test(line)), 'h4 drain scenario should forbid data-only drain');
}

function checkPublicGates(publicGates, label, outputs) {
  expect(publicGates?.status === 'ready-for-app-public-gates', `${label}: public gates status mismatch`);
  expect(/Claude I5/i.test(publicGates?.namedConsumer || ''), `${label}: public gates should name Claude I5 consumer`);
  expect(/c8-voice-pass-status/i.test(publicGates?.voiceSource || ''), `${label}: public gates should point to C8 voice signoff`);
  expect((publicGates?.appOwnedBeforePublic || []).length >= 3, `${label}: public gates need app-owned pre-public rules`);
  const surfaces = publicGates?.surfaces || [];
  const byId = new Map(surfaces.map(surface => [surface.id, surface]));
  const required = ['brand-pages', 'company-pages', 'tag-pages', 'errand-pages', 'pulse-strip'];
  const expectedReleaseOrder = ['company-pages', 'tag-pages', 'errand-pages', 'pulse-strip', 'brand-pages'];
  expect(surfaces.length === required.length, `${label}: unexpected public gate surface count`);
  for (const id of required) {
    const surface = byId.get(id);
    expect(!!surface, `${label}: missing public gate ${id}`);
    if (!surface) continue;
    expect(surface.owner === 'app/design', `${id}: public gate owner should remain app/design`);
    expect(surface.status === 'voice-signed-app-gate', `${id}: public gate status mismatch`);
    expect(Array.isArray(surface.sourceFiles) && surface.sourceFiles.length >= 3, `${id}: public gate needs source files`);
    expect(surface.voice?.signedAt === '2026-07-08', `${id}: public gate signed date mismatch`);
    expect(/codex\.md#c8-voice-pass-status/i.test(surface.voice?.signoffBlock || ''), `${id}: public gate should point to C8 signoff`);
    expect(typeof surface.appOwnedGate === 'string' && surface.appOwnedGate.trim(), `${id}: public gate missing app-owned release note`);
    expect((surface.mustNot || []).length >= 2, `${id}: public gate needs must-not rules`);
  }

  const release = publicGates?.releaseContract || {};
  expect(/public release contract/i.test(release.purpose || ''), `${label}: release contract should name public release purpose`);
  expect(release.status === 'ready-for-app-public-gates', `${label}: release contract status mismatch`);
  expect(/Claude I5/i.test(release.namedConsumer || ''), `${label}: release contract should name Claude I5 consumer`);
  expect(/one surface/i.test(release.releaseRule || ''), `${label}: release contract should require one-surface release`);
  expect(release.voiceSource === publicGates?.voiceSource, `${label}: release contract voice source should mirror public gates`);
  expect((release.sharedEvidenceRequired || []).length >= 3, `${label}: release contract needs shared evidence requirements`);
  expect(/rollback|workbench/i.test(release.rollbackRule || ''), `${label}: release contract needs rollback/workbench rule`);
  const releaseOrder = release.releaseOrder || [];
  expect(releaseOrder.length === expectedReleaseOrder.length, `${label}: release order should cover every public gate surface`);
  const covered = new Set();
  releaseOrder.forEach((step, index) => {
    const expectedId = expectedReleaseOrder[index];
    const surface = byId.get(step?.surfaceId);
    expect(step?.step === index + 1, `${label}: release step ${index + 1} should be sequential`);
    expect(step?.surfaceId === expectedId, `${label}: release step ${index + 1} should be ${expectedId}`);
    expect(!!surface, `${label}: release step ${index + 1} references unknown surface`);
    if (!surface) return;
    covered.add(step.surfaceId);
    expect(step.label === surface.label, `${label}: release step ${step.surfaceId} label should mirror surface`);
    expect(step.voiceStatus === surface.voice?.status, `${label}: release step ${step.surfaceId} voice status should mirror surface`);
    expect(formatJson([...(step.sourceFiles || [])].sort()) === formatJson([...(surface.sourceFiles || [])].sort()), `${label}: release step ${step.surfaceId} source files should mirror surface`);
    expect((step.evidenceRequired || []).length >= 3, `${label}: release step ${step.surfaceId} needs evidence requirements`);
    expect((step.releaseWhen || []).length >= 3, `${label}: release step ${step.surfaceId} needs release conditions`);
    expect((step.mustNot || []).length >= 2, `${label}: release step ${step.surfaceId} needs must-not rules`);
  });
  for (const id of required) expect(covered.has(id), `${label}: release contract should cover ${id}`);
  expect(releaseOrder[releaseOrder.length - 1]?.surfaceId === 'brand-pages', `${label}: brand pages should release last while they remain minimal generated copy`);
  expect(release.coverage?.surfaces === required.length, `${label}: release coverage surface count mismatch`);
  expect(release.coverage?.releaseSteps === releaseOrder.length, `${label}: release coverage step count mismatch`);
  expect(release.coverage?.allSurfacesCovered === true, `${label}: release coverage should be complete`);
  expect(formatJson(release.coverage?.minimalGeneratedCopy || []) === formatJson(['brand-pages']), `${label}: release coverage should isolate minimal generated copy surface`);
  for (const id of ['company-pages', 'tag-pages', 'errand-pages', 'pulse-strip']) {
    expect((release.coverage?.signedSurfaces || []).includes(id), `${label}: release coverage signed surfaces missing ${id}`);
  }

  expect(byId.get('brand-pages')?.voice?.status === 'minimal-generated-copy', 'brand public gate should stay honest about minimal generated copy');
  expect(byId.get('brand-pages')?.voice?.pilotSamples === 0, 'brand public gate should not claim signed prose pilots');
  expect(byId.get('brand-pages')?.generatedCount === (outputs.brandIndex.nodes || []).length, 'brand public gate generated count mismatch');
  for (const id of ['company-pages', 'tag-pages', 'errand-pages', 'pulse-strip']) {
    expect(byId.get(id)?.voice?.status === 'signed', `${id}: public gate should be voice signed`);
    expect(byId.get(id)?.voice?.pilotSamples === 5, `${id}: public gate should point to five signed pilots`);
  }
  expect(byId.get('company-pages')?.generatedCount === (outputs.companyIndex.nodes || []).length, 'company public gate generated count mismatch');
  expect(byId.get('errand-pages')?.generatedCount === 12, 'errand public gate generated count mismatch');
  expect((byId.get('pulse-strip')?.sourceFiles || []).includes('app/data/pulse.json'), 'pulse public gate should include app/data/pulse.json');
}

function checkH4DrainContract(contract, label, outputs, phases, publicGates) {
  expect(/H4 drain/i.test(contract?.purpose || ''), `${label}: H4 drain contract should name H4 drain purpose`);
  expect(contract?.status === 'pending-app-integration', `${label}: H4 drain contract status mismatch`);
  expect(contract?.activeHandoff === 'H4', `${label}: H4 drain contract should point to H4`);
  expect(/Claude H4/i.test(contract?.namedConsumer || ''), `${label}: H4 drain contract should name Claude H4 consumer`);
  expect(contract?.h4DrainableFromDataAlone === false, `${label}: H4 drainable-from-data-alone should be false`);
  expect(/app-owned/i.test(contract?.drainRule || '') && /generated data alone/i.test(contract?.drainRule || ''), `${label}: H4 drain rule should name app-owned/data-alone boundary`);

  const expectedStepOrder = [
    'manifest-loader',
    'startup-ask-core',
    'lazy-product-ask',
    'route-and-page-rendering',
    'runtime-state-qa',
    'flagship-walkthroughs',
    'private-preview-run',
    'public-gate-release',
    'final-h4-drain-decision'
  ];
  const phaseIds = new Set((phases || []).map(phase => phase.id));
  const coveredPhases = new Set();
  const steps = contract?.steps || [];
  expect(steps.length === expectedStepOrder.length, `${label}: unexpected H4 drain step count`);
  steps.forEach((step, index) => {
    const expectedId = expectedStepOrder[index];
    expect(step?.step === index + 1, `${label}: H4 drain step ${index + 1} should be sequential`);
    expect(step?.id === expectedId, `${label}: H4 drain step ${index + 1} should be ${expectedId}`);
    expect(typeof step?.label === 'string' && step.label.trim(), `${label}: ${expectedId} missing label`);
    expect(Array.isArray(step?.phaseIds) && step.phaseIds.length > 0, `${label}: ${expectedId} needs phase ids`);
    for (const phaseId of step?.phaseIds || []) {
      expect(phaseIds.has(phaseId), `${label}: ${expectedId} references unknown phase ${phaseId}`);
      coveredPhases.add(phaseId);
    }
    expect(Array.isArray(step?.sourceFiles) && step.sourceFiles.length > 0, `${label}: ${expectedId} needs source files`);
    expect(typeof step?.contractPointer === 'string' && step.contractPointer.includes('#'), `${label}: ${expectedId} needs file#contract pointer`);
    expect((step?.appOwnedEvidence || []).length >= 2, `${label}: ${expectedId} needs app-owned evidence requirements`);
    expect((step?.passWhen || []).length >= 2, `${label}: ${expectedId} needs pass conditions`);
    expect((step?.mustNot || []).length >= 2, `${label}: ${expectedId} needs must-not rules`);
  });
  for (const phaseId of phaseIds) expect(coveredPhases.has(phaseId), `${label}: H4 drain contract should cover phase ${phaseId}`);

  for (const pointer of [
    'manifest.json#loaderPlan',
    'ask-core.json#startupContract',
    'ask-index.json#loadHint',
    'node-runtime-states.json#qaContract',
    'node-preview-matrix.json#runContract',
    'node-integration-checklist.json#publicGates.releaseContract',
    'node-integration-checklist.json#h4DrainContract'
  ]) {
    expect(steps.some(step => step.contractPointer === pointer), `${label}: H4 drain contract missing pointer ${pointer}`);
  }

  expect(contract?.finalDecision?.expectedStatusBeforeAppWork === 'pending-app-integration', `${label}: H4 final decision expected status mismatch`);
  expect(contract?.finalDecision?.dataAloneIsInsufficient === true, `${label}: H4 final decision should reject data-only drain`);
  expect((contract?.finalDecision?.drainOnlyWhen || []).length >= 3, `${label}: H4 final decision needs drain conditions`);
  expect((contract?.finalDecision?.mustNot || []).some(line => /data generation alone/i.test(line)), `${label}: H4 final decision should forbid data-only drain`);
  expect(contract?.coverage?.steps === steps.length, `${label}: H4 coverage step count mismatch`);
  expect(contract?.coverage?.phaseCount === phaseIds.size, `${label}: H4 coverage phase count mismatch`);
  expect(contract?.coverage?.coveredPhaseCount === phaseIds.size, `${label}: H4 coverage covered phase count mismatch`);
  expect(contract?.coverage?.allPhasesCovered === true, `${label}: H4 coverage should cover all phases`);
  expect(contract?.coverage?.previewScenarios === (outputs.nodePreviewMatrixIndex.scenarios || []).length, `${label}: H4 preview scenario count mismatch`);
  expect(contract?.coverage?.publicGateSurfaces === (publicGates?.surfaces || []).length, `${label}: H4 public gate surface count mismatch`);
  expect(contract?.coverage?.dataAloneDrainable === false, `${label}: H4 coverage should mark data-alone drain false`);
  expect(contract?.coverage?.finalStepId === 'final-h4-drain-decision', `${label}: H4 coverage final step id mismatch`);
}

function checkH4ClosureManifest(closure, label, outputs, checklist) {
  const drainContract = checklist?.h4DrainContract || {};
  const finalStepId = drainContract.coverage?.finalStepId || 'final-h4-drain-decision';
  expect(closure?.status === 'h4-generated-node-review-stack-closure', `${label}: H4 closure status mismatch`);
  expect(/generated H4 node and Ask review stack/i.test(closure?.purpose || ''), `${label}: H4 closure should name generated node and Ask stack`);
  expect(closure?.schema === 'h4-generated-node-review-stack-closure-v1', `${label}: H4 closure schema mismatch`);
  expect(closure?.appOwned === true, `${label}: H4 closure should remain app-owned`);
  expect(closure?.activeHandoff === 'H4', `${label}: H4 closure should point to H4`);
  expect(closure?.localOnly === true, `${label}: H4 closure should be local-only`);
  expect(closure?.noServerAuthority === true, `${label}: H4 closure should keep no-server authority`);
  expect(closure?.h4DrainableFromClosureAlone === false, `${label}: H4 closure alone must not drain H4`);
  expect(closure?.generatedRecursionClosed === true, `${label}: H4 generated recursion should be closed`);

  const expectedLayers = [
    ['manifest-index', 'app/data/nodes/manifest.json', 'ovs-node-manifest'],
    ['manifest-loader-plan', 'app/data/nodes/manifest.json#loaderPlan', 'manifest-loader-plan'],
    ['node-load-plan', 'app/data/nodes/node-load-plan.json', 'ovs-node-load-plan'],
    ['ask-core-startup-contract', 'app/data/nodes/ask-core.json#startupContract', 'ovs-ask-core-index'],
    ['ask-index-lazy-boundary', 'app/data/nodes/ask-index.json#loadHint', 'ovs-ask-index'],
    ['ask-fixtures', 'app/data/nodes/ask-fixtures.json', 'ovs-ask-fixtures'],
    ['ask-traces', 'app/data/nodes/ask-traces.json', 'ovs-ask-traces'],
    ['ask-presentation', 'app/data/nodes/ask-presentation.json', 'ovs-ask-presentation-contract'],
    ['node-page-contracts', 'app/data/nodes/node-page-contracts.json', 'ovs-node-page-contracts'],
    ['node-route-fixtures', 'app/data/nodes/node-route-fixtures.json', 'ovs-node-route-fixtures'],
    ['node-route-guardrails', 'app/data/nodes/node-route-guardrails.json', 'ovs-node-route-guardrails'],
    ['node-runtime-states', 'app/data/nodes/node-runtime-states.json', 'ovs-node-runtime-states'],
    ['node-walkthroughs', 'app/data/nodes/node-walkthroughs.json', 'ovs-node-walkthroughs'],
    ['node-preview-matrix', 'app/data/nodes/node-preview-matrix.json', 'ovs-node-preview-matrix'],
    ['node-preview-run-contract', 'app/data/nodes/node-preview-matrix.json#runContract', 'h4-preview-run-contract'],
    ['public-gates', 'app/data/nodes/node-integration-checklist.json#publicGates', 'h4-public-gates'],
    ['public-release-contract', 'app/data/nodes/node-integration-checklist.json#publicGates.releaseContract', 'h4-public-release-contract'],
    ['h4-drain-contract', 'app/data/nodes/node-integration-checklist.json#h4DrainContract', 'h4-drain-contract'],
    ['node-integration-checklist', 'app/data/nodes/node-integration-checklist.json', 'ovs-node-integration-checklist'],
    ['readiness-report', 'app/data/nodes/readiness.json', 'ovs-node-readiness']
  ];
  const layers = closure?.stackLayers || [];
  expect(formatJson(layers.map(layer => layer.id)) === formatJson(expectedLayers.map(layer => layer[0])), `${label}: H4 closure layer ids mismatch`);
  expectedLayers.forEach(([id, pointer, format], index) => {
    const layer = layers[index] || {};
    expect(layer.id === id, `${label}: ${id} closure layer id mismatch`);
    expect(layer.pointer === pointer, `${label}: ${id} closure layer pointer mismatch`);
    expect(layer.format === format, `${label}: ${id} closure layer format mismatch`);
    expect(layer.drainableFromLayerAlone === false, `${label}: ${id} closure layer must not drain alone`);
    expect(typeof layer.reviewRole === 'string' && layer.reviewRole.length > 30, `${label}: ${id} closure layer reviewRole missing`);
  });
  expect(layers.find(layer => layer.id === 'ask-index-lazy-boundary')?.loadHint === 'lazy-product-search', `${label}: H4 closure should preserve lazy Ask load hint`);
  expect(layers.find(layer => layer.id === 'node-preview-matrix')?.status === outputs.nodePreviewMatrixIndex.status, `${label}: H4 closure preview matrix status mismatch`);
  expect(layers.find(layer => layer.id === 'node-preview-run-contract')?.status === outputs.nodePreviewMatrixIndex.runContract?.status, `${label}: H4 closure run contract status mismatch`);
  expect(layers.find(layer => layer.id === 'public-gates')?.status === checklist.publicGates?.status, `${label}: H4 closure public gates status mismatch`);
  expect(layers.find(layer => layer.id === 'public-release-contract')?.status === checklist.publicGates?.releaseContract?.status, `${label}: H4 closure public release status mismatch`);
  expect(layers.find(layer => layer.id === 'h4-drain-contract')?.status === drainContract.status, `${label}: H4 closure drain status mismatch`);

  const gates = closure?.appOwnedGates || [];
  const steps = drainContract.steps || [];
  expect(gates.length === steps.length, `${label}: H4 closure appOwnedGates count mismatch`);
  steps.forEach((step, index) => {
    const gate = gates[index] || {};
    expect(gate.stepId === step.id, `${label}: ${step.id} closure gate stepId mismatch`);
    expect(gate.label === step.label, `${label}: ${step.id} closure gate label mismatch`);
    expect(gate.trackedBy === 'app/data/nodes/node-integration-checklist.json#h4DrainContract.steps', `${label}: ${step.id} closure gate trackedBy mismatch`);
    expect(gate.requiresRunningAppEvidence === (step.id !== finalStepId), `${label}: ${step.id} closure gate running-app requirement mismatch`);
    expect(gate.finalDecision === (step.id === finalStepId), `${label}: ${step.id} closure gate finalDecision mismatch`);
    expect(gate.phaseCount === (step.phaseIds || []).length, `${label}: ${step.id} closure gate phaseCount mismatch`);
    expect(gate.sourceFileCount === (step.sourceFiles || []).length, `${label}: ${step.id} closure gate sourceFileCount mismatch`);
  });

  const previewGroups = closure?.previewGroups || [];
  const runOrder = outputs.nodePreviewMatrixIndex.runContract?.runOrder || [];
  expect(previewGroups.length === runOrder.length, `${label}: H4 closure preview group count mismatch`);
  runOrder.forEach((step, index) => {
    const group = previewGroups[index] || {};
    expect(group.step === step.step, `${label}: H4 closure preview group step mismatch`);
    expect(group.group === step.group, `${label}: H4 closure preview group name mismatch`);
    expect(group.scenarioCount === (step.scenarioIds || []).length, `${label}: H4 closure preview group scenario count mismatch`);
    expect(group.finalGroup === (step.scenarioIds || []).includes('h4-drain-decision'), `${label}: H4 closure preview finalGroup mismatch`);
  });

  const releaseOrder = checklist.publicGates?.releaseContract?.releaseOrder || [];
  const publicGateSurfaces = closure?.publicGateSurfaces || [];
  expect(publicGateSurfaces.length === releaseOrder.length, `${label}: H4 closure public gate surface count mismatch`);
  releaseOrder.forEach((step, index) => {
    const surface = publicGateSurfaces[index] || {};
    expect(surface.step === step.step, `${label}: H4 closure public gate step mismatch`);
    expect(surface.surfaceId === step.surfaceId, `${label}: H4 closure public gate surface mismatch`);
    expect(surface.label === step.label, `${label}: H4 closure public gate label mismatch`);
    expect(surface.voiceStatus === step.voiceStatus, `${label}: H4 closure public gate voice mismatch`);
  });
  expect(formatJson(closure?.smokeCommands || []) === formatJson(checklist.smokeCommands || []), `${label}: H4 closure smoke commands mismatch`);

  expect((closure?.completionRules || []).some(line => /running app/i.test(line)), `${label}: H4 closure completion rules should require running app`);
  expect((closure?.completionRules || []).some(line => /h4-local-evidence-v1/i.test(line)), `${label}: H4 closure completion rules should name local receipt`);
  expect((closure?.completionRules || []).some(line => /sample\.json/i.test(line)), `${label}: H4 closure completion rules should keep sample boundary`);
  expect((closure?.completionRules || []).some(line => /docs\/CONTENT-HANDOFF\.md/i.test(line)), `${label}: H4 closure completion rules should name handoff`);
  expect((closure?.completionRules || []).some(line => /screenshots/i.test(line) && /analytics identifiers/i.test(line)), `${label}: H4 closure completion rules should preserve privacy`);
  expect((closure?.stopRules || []).some(line => /another generated node validator layer/i.test(line)), `${label}: H4 closure stop rules should stop validator recursion`);
  expect((closure?.stopRules || []).some(line => /green builds/i.test(line) && /running-app evidence/i.test(line)), `${label}: H4 closure stop rules should reject audit-only drain`);
  expect((closure?.stopRules || []).some(line => /sample\.json/i.test(line) && /in-memory/i.test(line)), `${label}: H4 closure stop rules should reject legacy/sample evidence`);
  expect((closure?.stopRules || []).some(line => /one-surface-at-a-time/i.test(line)), `${label}: H4 closure stop rules should keep one-surface release`);
  expect((closure?.stopRules || []).some(line => /upload/i.test(line) && /automatically/i.test(line)), `${label}: H4 closure stop rules should reject auto upload`);
  expect((closure?.nextAppActions || []).some(line => /H4 workbench/i.test(line)), `${label}: H4 closure next actions should name workbench`);
  expect((closure?.nextAppActions || []).some(line => /lazy Ask/i.test(line) && /ask-index\.json/i.test(line)), `${label}: H4 closure next actions should name lazy Ask`);
  expect((closure?.nextAppActions || []).some(line => /public gates/i.test(line) && /one surface/i.test(line)), `${label}: H4 closure next actions should name public gates`);
  expect((closure?.nextAppActions || []).some(line => /drain H4/i.test(line) && /remaining blocker/i.test(line)), `${label}: H4 closure next actions should name final decision`);

  expect(closure?.coverage?.stackLayerCount === layers.length, `${label}: H4 closure stack layer count mismatch`);
  expect(closure?.coverage?.appOwnedGateCount === gates.length, `${label}: H4 closure app gate count mismatch`);
  expect(closure?.coverage?.finalGateId === finalStepId, `${label}: H4 closure final gate mismatch`);
  expect(closure?.coverage?.phaseCount === (checklist.phases || []).length, `${label}: H4 closure phase count mismatch`);
  expect(closure?.coverage?.previewScenarioCount === (outputs.nodePreviewMatrixIndex.scenarios || []).length, `${label}: H4 closure preview scenario count mismatch`);
  expect(closure?.coverage?.previewGroupCount === runOrder.length, `${label}: H4 closure preview group count mismatch`);
  expect(closure?.coverage?.publicGateSurfaceCount === (checklist.publicGates?.surfaces || []).length, `${label}: H4 closure public gate count mismatch`);
  expect(closure?.coverage?.smokeCommandCount === (checklist.smokeCommands || []).length, `${label}: H4 closure smoke command count mismatch`);
  expect(closure?.coverage?.generatedRecursionClosed === true, `${label}: H4 closure generatedRecursionClosed should be true`);
  expect(closure?.coverage?.closureAloneDrainable === false, `${label}: H4 closure closureAloneDrainable should be false`);
}

function checkNodeIntegrationChecklist(checklist, outputs) {
  expect(checklist.format === 'ovs-node-integration-checklist', 'app/data/nodes/node-integration-checklist.json: wrong format');
  expect(checklist.version === '0.1', 'app/data/nodes/node-integration-checklist.json: wrong version');
  expect(/app-owned/i.test(checklist.purpose || ''), 'app/data/nodes/node-integration-checklist.json: missing app-owned purpose note');
  expect(/Checklist only/i.test(checklist.appLaneNote || ''), 'app/data/nodes/node-integration-checklist.json: missing checklist-only lane note');

  for (const file of [
    'pipeline/build_nodes.js',
    'app/data/nodes/manifest.json',
    'app/data/nodes/node-load-plan.json',
    'app/data/nodes/readiness.json',
    'app/data/nodes/ask-core.json',
    'app/data/nodes/ask-index.json',
    'app/data/nodes/ask-fixtures.json',
    'app/data/nodes/ask-traces.json',
    'app/data/nodes/ask-presentation.json',
    'app/data/nodes/node-walkthroughs.json',
    'app/data/nodes/node-page-contracts.json',
    'app/data/nodes/node-route-fixtures.json',
    'app/data/nodes/node-route-guardrails.json',
    'app/data/nodes/node-runtime-states.json',
    'app/data/nodes/node-preview-matrix.json'
  ]) {
    expect((checklist.source || []).includes(file), `app/data/nodes/node-integration-checklist.json: source list missing ${file}`);
  }

  const target = checklist.readinessTargets || {};
  expect(target.startupBudgetBytes === 700000, 'app/data/nodes/node-integration-checklist.json: startup budget mismatch');
  expect(target.minimumHeadroomBytes === 50000, 'app/data/nodes/node-integration-checklist.json: minimum headroom mismatch');
  expect(target.askCoreBytes === Buffer.byteLength(formatJson(outputs.askCoreIndex), 'utf8'), 'app/data/nodes/node-integration-checklist.json: ask-core bytes mismatch');
  expect(target.askCoreHeadroomBytes === target.startupBudgetBytes - target.askCoreBytes, 'app/data/nodes/node-integration-checklist.json: ask-core headroom mismatch');
  expect(target.askCoreWithinBudget === true, 'app/data/nodes/node-integration-checklist.json: ask-core should be within budget');
  expect(target.askCoreHasHeadroom === true, 'app/data/nodes/node-integration-checklist.json: ask-core should keep headroom');
  expect(target.fullAskBytes === Buffer.byteLength(formatJson(outputs.askIndex), 'utf8'), 'app/data/nodes/node-integration-checklist.json: full Ask bytes mismatch');
  expect(target.nodeLoadPlanStages === (outputs.nodeLoadPlanIndex.stages || []).length, 'app/data/nodes/node-integration-checklist.json: node-load-plan stage count mismatch');
  expect(target.nodeRuntimeStateCases === (outputs.nodeRuntimeStatesIndex.cases || []).length, 'app/data/nodes/node-integration-checklist.json: runtime state case count mismatch');
  expect(target.nodePreviewScenarios === (outputs.nodePreviewMatrixIndex.scenarios || []).length, 'app/data/nodes/node-integration-checklist.json: preview matrix scenario count mismatch');
  for (const file of ['manifest.json', 'node-load-plan.json', 'tags.json', 'errands.json', 'synonyms.json', 'ask-core.json']) {
    expect((target.eagerRuntimeFiles || []).includes(file), `app/data/nodes/node-integration-checklist.json: eager files missing ${file}`);
  }
  expect(!(target.eagerRuntimeFiles || []).includes('sample.json'), 'app/data/nodes/node-integration-checklist.json: sample.json must not be eager runtime evidence');
  for (const file of ['brands.json', 'companies.json']) {
    expect((target.deferredRuntimeFiles || []).includes(file), `app/data/nodes/node-integration-checklist.json: deferred files missing ${file}`);
  }
  for (const file of ['ask-index.json']) {
    expect((target.lazyRuntimeFiles || []).includes(file), `app/data/nodes/node-integration-checklist.json: lazy files missing ${file}`);
  }
  expect((target.legacyNonRuntimeFiles || []).includes('sample.json'), 'app/data/nodes/node-integration-checklist.json: legacy files should name sample.json');
  for (const file of ['ask-fixtures.json', 'ask-traces.json', 'ask-presentation.json', 'node-walkthroughs.json', 'node-page-contracts.json', 'node-route-fixtures.json', 'node-route-guardrails.json', 'node-runtime-states.json', 'node-preview-matrix.json', 'node-integration-checklist.json']) {
    expect((target.devContractFiles || []).includes(file), `app/data/nodes/node-integration-checklist.json: dev contract list missing ${file}`);
  }

  const counts = checklist.counts || {};
  expect(counts.brands === (outputs.brandIndex.nodes || []).length, 'app/data/nodes/node-integration-checklist.json: brand count mismatch');
  expect(counts.companies === (outputs.companyIndex.nodes || []).length, 'app/data/nodes/node-integration-checklist.json: company count mismatch');
  expect(counts.askCoreTokens === Object.keys(outputs.askCoreIndex.tokens || {}).length, 'app/data/nodes/node-integration-checklist.json: askCoreTokens mismatch');
  expect(counts.askCoreTargets === Object.keys(outputs.askCoreIndex.targets || {}).length, 'app/data/nodes/node-integration-checklist.json: askCoreTargets mismatch');
  expect(counts.askTokens === Object.keys(outputs.askIndex.tokens || {}).length, 'app/data/nodes/node-integration-checklist.json: askTokens mismatch');
  expect(counts.askFixtures === (outputs.askFixturesIndex.cases || []).length, 'app/data/nodes/node-integration-checklist.json: askFixtures mismatch');
  expect(counts.askTraces === (outputs.askTracesIndex.traces || []).length, 'app/data/nodes/node-integration-checklist.json: askTraces mismatch');
  expect(counts.askPresentationCases === (outputs.askPresentationIndex.qaCases || []).length, 'app/data/nodes/node-integration-checklist.json: askPresentationCases mismatch');
  expect(counts.nodeWalkthroughs === (outputs.nodeWalkthroughsIndex.walkthroughs || []).length, 'app/data/nodes/node-integration-checklist.json: nodeWalkthroughs mismatch');
  expect(counts.nodePageContracts === (outputs.nodePageContractsIndex.contracts || []).length, 'app/data/nodes/node-integration-checklist.json: nodePageContracts mismatch');
  expect(counts.nodeRouteFixtures === (outputs.nodeRouteFixturesIndex.cases || []).length, 'app/data/nodes/node-integration-checklist.json: nodeRouteFixtures mismatch');
  expect(counts.nodeRouteGuardrails === (outputs.nodeRouteGuardrailsIndex.cases || []).length, 'app/data/nodes/node-integration-checklist.json: nodeRouteGuardrails mismatch');
  expect(counts.nodeLoadPlanStages === (outputs.nodeLoadPlanIndex.stages || []).length, 'app/data/nodes/node-integration-checklist.json: nodeLoadPlanStages mismatch');
  expect(counts.nodeRuntimeStateCases === (outputs.nodeRuntimeStatesIndex.cases || []).length, 'app/data/nodes/node-integration-checklist.json: nodeRuntimeStateCases mismatch');
  expect(counts.nodePreviewScenarios === (outputs.nodePreviewMatrixIndex.scenarios || []).length, 'app/data/nodes/node-integration-checklist.json: nodePreviewScenarios mismatch');

  for (const command of ['node pipeline/build_nodes.js --check', 'node research/node_index_audit.js', 'node research/ask_readiness_audit.js', 'node research/node_walkthrough_audit.js', 'npm run audit:handoff', 'npm run verify']) {
    expect((checklist.smokeCommands || []).includes(command), `app/data/nodes/node-integration-checklist.json: smoke command missing ${command}`);
  }
  checkPublicGates(checklist.publicGates, 'app/data/nodes/node-integration-checklist.json', outputs);

  const phases = checklist.phases || [];
  const byId = new Map(phases.map(phase => [phase.id, phase]));
  const requiredPhases = [
    'discover-load-plan',
    'startup-ask',
    'lazy-product-ask',
    'ask-presentation',
    'route-parser',
    'runtime-states',
    'page-rendering',
    'flagship-walkthroughs',
    'workbench-public-gates',
    'final-h4-drain'
  ];
  expect(phases.length === requiredPhases.length, 'app/data/nodes/node-integration-checklist.json: unexpected phase count');
  for (const id of requiredPhases) {
    const phase = byId.get(id);
    expect(!!phase, `app/data/nodes/node-integration-checklist.json: missing phase ${id}`);
    if (!phase) continue;
    expect(phase.owner === 'app/design', `${id}: phase owner should remain app/design`);
    expect(phase.status === 'pending-app-integration', `${id}: phase status should remain pending app integration`);
    expect(typeof phase.label === 'string' && phase.label.trim(), `${id}: phase missing label`);
    expect(Array.isArray(phase.sourceFiles) && phase.sourceFiles.length > 0, `${id}: phase missing source files`);
    expect(Array.isArray(phase.acceptanceCriteria) && phase.acceptanceCriteria.length >= 3, `${id}: phase needs at least three acceptance criteria`);
    expect(typeof phase.risk === 'string' && phase.risk.trim(), `${id}: phase missing risk note`);
  }
  expect((byId.get('discover-load-plan')?.acceptanceCriteria || []).some(line => /sha256/i.test(line)), 'app/data/nodes/node-integration-checklist.json: load-plan phase should mention sha256 cache checks');
  expect((byId.get('discover-load-plan')?.sourceFiles || []).includes('node-load-plan.json'), 'app/data/nodes/node-integration-checklist.json: load-plan phase should include node-load-plan.json');
  expect((byId.get('discover-load-plan')?.acceptanceCriteria || []).some(line => /node-load-plan\.json/i.test(line)), 'app/data/nodes/node-integration-checklist.json: load-plan phase should mention node-load-plan stages');
  expect((byId.get('runtime-states')?.sourceFiles || []).includes('node-runtime-states.json'), 'app/data/nodes/node-integration-checklist.json: runtime-states phase should include node-runtime-states.json');
  expect((byId.get('runtime-states')?.acceptanceCriteria || []).some(line => /Hash mismatch/i.test(line)), 'app/data/nodes/node-integration-checklist.json: runtime-states phase should mention hash mismatch');
  expect((byId.get('workbench-public-gates')?.sourceFiles || []).includes('app/data/pulse.json'), 'app/data/nodes/node-integration-checklist.json: public gate phase should include pulse source');
  expect((byId.get('workbench-public-gates')?.acceptanceCriteria || []).some(line => /publicGates\.surfaces/.test(line)), 'app/data/nodes/node-integration-checklist.json: public gate phase should mention publicGates.surfaces');
  expect((byId.get('final-h4-drain')?.acceptanceCriteria || []).some(line => /H4/.test(line)), 'app/data/nodes/node-integration-checklist.json: final phase should mention H4');
  checkH4DrainContract(checklist.h4DrainContract, 'app/data/nodes/node-integration-checklist.json', outputs, phases, checklist.publicGates);
  checkH4ClosureManifest(checklist.h4ClosureManifest, 'app/data/nodes/node-integration-checklist.json', outputs, checklist);
}

function checkReadiness(readiness, outputs) {
  expect(readiness.format === 'ovs-node-readiness', 'app/data/nodes/readiness.json: wrong format');
  expect(readiness.version === '0.1', 'app/data/nodes/readiness.json: wrong version');
  expect(readiness.status === 'ready-for-app-integration', 'app/data/nodes/readiness.json: wrong status');
  expect(readiness.appLaneNote && /app-owned/i.test(readiness.appLaneNote), 'app/data/nodes/readiness.json: missing app-lane note');

  const runtimeFiles = new Set();
  for (const step of readiness.runtimePlan || []) {
    if (step.file) runtimeFiles.add(step.file);
    for (const file of step.files || []) runtimeFiles.add(file);
    expect(Number.isInteger(step.step) && step.step > 0, 'app/data/nodes/readiness.json: runtime step missing order');
    expect(typeof step.purpose === 'string' && step.purpose.trim(), 'app/data/nodes/readiness.json: runtime step missing purpose');
  }
  for (const file of ['manifest.json', 'node-load-plan.json', 'tags.json', 'errands.json', 'synonyms.json', 'ask-core.json', 'brands.json', 'companies.json', 'ask-index.json']) {
    expect(runtimeFiles.has(file), `app/data/nodes/readiness.json: runtime plan missing ${file}`);
  }
  expect(!runtimeFiles.has('sample.json'), 'app/data/nodes/readiness.json: runtime plan must not include sample.json');

  const devFiles = new Set((readiness.devContracts || []).map(item => item.file));
  for (const file of ['ask-fixtures.json', 'ask-traces.json', 'ask-presentation.json', 'node-walkthroughs.json', 'node-page-contracts.json', 'node-route-fixtures.json', 'node-route-guardrails.json', 'node-runtime-states.json', 'node-preview-matrix.json', 'node-integration-checklist.json', 'node-load-plan.json']) {
    expect(devFiles.has(file), `app/data/nodes/readiness.json: dev contracts missing ${file}`);
  }

  expect(readiness.routeContract?.category === '#explore/<cid>', 'app/data/nodes/readiness.json: category route contract mismatch');
  expect(readiness.routeContract?.guide === '#guide/<slug>', 'app/data/nodes/readiness.json: guide route contract mismatch');
  expect(readiness.routeContract?.item === '#item/<cid>/<code>', 'app/data/nodes/readiness.json: item route contract mismatch');
  expect(readiness.routeContract?.node === '#n/<type>/<slug>', 'app/data/nodes/readiness.json: node route contract mismatch');

  expect(readiness.counts?.brands === (outputs.brandIndex.nodes || []).length, 'app/data/nodes/readiness.json: brand count mismatch');
  expect(readiness.counts?.companies === (outputs.companyIndex.nodes || []).length, 'app/data/nodes/readiness.json: company count mismatch');
  expect(readiness.counts?.askCoreTokens === Object.keys(outputs.askCoreIndex.tokens || {}).length, 'app/data/nodes/readiness.json: Ask core token count mismatch');
  expect(readiness.counts?.askCoreTargets === Object.keys(outputs.askCoreIndex.targets || {}).length, 'app/data/nodes/readiness.json: Ask core target count mismatch');
  expect(readiness.counts?.askTokens === Object.keys(outputs.askIndex.tokens || {}).length, 'app/data/nodes/readiness.json: Ask token count mismatch');
  expect(readiness.counts?.goldenQueries === (outputs.askFixturesIndex.cases || []).length, 'app/data/nodes/readiness.json: golden query count mismatch');
  expect(readiness.budgets?.askCoreWithinBudget === true, 'app/data/nodes/readiness.json: Ask core should be within startup budget');
  expect(readiness.budgets?.askCoreHasHeadroom === true, 'app/data/nodes/readiness.json: Ask core should keep minimum startup headroom');
  expect(readiness.budgets?.askCoreBytes === Buffer.byteLength(formatJson(outputs.askCoreIndex), 'utf8'), 'app/data/nodes/readiness.json: Ask core byte count mismatch');
  expect(readiness.budgets?.startupBudgetBytes === 700000, 'app/data/nodes/readiness.json: startup budget mismatch');
  expect(readiness.budgets?.minimumHeadroomBytes === 50000, 'app/data/nodes/readiness.json: minimum headroom mismatch');
  expect(readiness.budgets?.askCoreHeadroomBytes === readiness.budgets.startupBudgetBytes - readiness.budgets.askCoreBytes, 'app/data/nodes/readiness.json: Ask core headroom mismatch');
  expect(readiness.budgets?.nodeLoadPlanStages === (outputs.nodeLoadPlanIndex.stages || []).length, 'app/data/nodes/readiness.json: node-load-plan stage count mismatch');
  expect(readiness.budgets?.nodeRuntimeStateCases === (outputs.nodeRuntimeStatesIndex.cases || []).length, 'app/data/nodes/readiness.json: runtime state case count mismatch');
  expect(readiness.budgets?.nodePreviewScenarios === (outputs.nodePreviewMatrixIndex.scenarios || []).length, 'app/data/nodes/readiness.json: preview scenario count mismatch');
  checkPublicGates(readiness.publicGates, 'app/data/nodes/readiness.json', outputs);
  expect(formatJson(readiness.publicGates) === formatJson(outputs.nodeIntegrationChecklistIndex.publicGates), 'app/data/nodes/readiness.json: public gates should mirror node-integration-checklist');
  checkH4DrainContract(readiness.h4DrainContract, 'app/data/nodes/readiness.json', outputs, outputs.nodeIntegrationChecklistIndex.phases || [], readiness.publicGates);
  expect(formatJson(readiness.h4DrainContract) === formatJson(outputs.nodeIntegrationChecklistIndex.h4DrainContract), 'app/data/nodes/readiness.json: H4 drain contract should mirror node-integration-checklist');
  checkH4ClosureManifest(readiness.h4ClosureManifest, 'app/data/nodes/readiness.json', outputs, outputs.nodeIntegrationChecklistIndex);
  expect(formatJson(readiness.h4ClosureManifest) === formatJson(outputs.nodeIntegrationChecklistIndex.h4ClosureManifest), 'app/data/nodes/readiness.json: H4 closure manifest should mirror node-integration-checklist');

  const fixtureQueries = new Set((outputs.askFixturesIndex.cases || []).map(test => `${test.layer}\t${test.query}`));
  expect((readiness.goldenQueries || []).length === fixtureQueries.size, 'app/data/nodes/readiness.json: golden query summary length mismatch');
  for (const query of readiness.goldenQueries || []) {
    expect(fixtureQueries.has(`${query.layer}\t${query.query}`), `${query.query}: readiness query missing fixture case`);
    expect(query.ok === true, `${query.query}: readiness query should be ok`);
    expect(Number.isInteger(query.matchedRank) && query.matchedRank >= 1 && query.matchedRank <= 5, `${query.query}: readiness matchedRank should be in top 5`);
    expect(Array.isArray(query.top) && query.top.length > 0 && query.top.length <= 3, `${query.query}: readiness top summary should have 1-3 items`);
    for (const row of query.top || []) {
      expect(typeof row.id === 'string' && row.id.startsWith('ovs:'), `${query.query}: readiness top row missing id`);
      expect(typeof row.label === 'string' && row.label.trim(), `${query.query}: readiness top row missing label`);
      expect(typeof row.hash === 'string' && row.hash.startsWith('#'), `${query.query}: readiness top row missing hash`);
    }
  }
}

function checkManifest(manifest, outputs) {
  expect(manifest.format === 'ovs-node-manifest', 'app/data/nodes/manifest.json: wrong format');
  expect(manifest.version === '0.1', 'app/data/nodes/manifest.json: wrong version');
  expect(manifest.integrity?.algorithm === 'sha256', 'app/data/nodes/manifest.json: integrity algorithm should be sha256');
  expect(/does not hash itself/i.test(manifest.integrity?.scope || ''), 'app/data/nodes/manifest.json: integrity scope should exclude manifest self-hash');
  expect(Array.isArray(manifest.indexes), 'app/data/nodes/manifest.json: indexes must be an array');
  expect(Array.isArray(manifest.loadOrder), 'app/data/nodes/manifest.json: loadOrder must be an array');
  for (const fileName of ['sample.json', 'tags.json', 'errands.json', 'synonyms.json', 'node-load-plan.json', 'brands.json', 'companies.json', 'avoid-tokens.json', 'ask-core.json', 'ask-index.json']) {
    expect(manifest.loadOrder.includes(fileName), `app/data/nodes/manifest.json: loadOrder missing ${fileName}`);
    expect(fs.existsSync(path.join(ROOT, 'app', 'data', 'nodes', fileName)), `app/data/nodes/manifest.json: listed file missing ${fileName}`);
  }

  const byFile = new Map((manifest.indexes || []).map(item => [item.file, item]));
  const loaderPlan = manifest.loaderPlan || {};
  expect(/runtime fetch plan/i.test(loaderPlan.purpose || ''), 'app/data/nodes/manifest.json: loaderPlan missing runtime fetch purpose');
  expect(loaderPlan.source === 'app/data/nodes/node-load-plan.json', 'app/data/nodes/manifest.json: loaderPlan source should be node-load-plan');
  expect(loaderPlan.integrity?.algorithm === outputs.nodeLoadPlanIndex.integrityContract?.algorithm, 'app/data/nodes/manifest.json: loaderPlan integrity algorithm mismatch');
  expect(loaderPlan.integrity?.cacheKey === outputs.nodeLoadPlanIndex.integrityContract?.cacheKey, 'app/data/nodes/manifest.json: loaderPlan cache key mismatch');
  expect(loaderPlan.integrity?.validate === outputs.nodeLoadPlanIndex.integrityContract?.validate, 'app/data/nodes/manifest.json: loaderPlan validate policy mismatch');
  expect(loaderPlan.integrity?.retry === outputs.nodeLoadPlanIndex.integrityContract?.retry, 'app/data/nodes/manifest.json: loaderPlan retry policy mismatch');
  expect(loaderPlan.integrity?.fallback === outputs.nodeLoadPlanIndex.integrityContract?.fallback, 'app/data/nodes/manifest.json: loaderPlan fallback policy mismatch');
  expect(loaderPlan.totals?.stages === outputs.nodeLoadPlanIndex.totals?.stages, 'app/data/nodes/manifest.json: loaderPlan stage total mismatch');
  expect(loaderPlan.totals?.runtimeStages === outputs.nodeLoadPlanIndex.totals?.runtimeStages, 'app/data/nodes/manifest.json: loaderPlan runtime stage total mismatch');
  expect(loaderPlan.totals?.devContractStages === outputs.nodeLoadPlanIndex.totals?.devContractStages, 'app/data/nodes/manifest.json: loaderPlan dev-contract stage total mismatch');

  const sourceStages = outputs.nodeLoadPlanIndex.stages || [];
  const loaderStages = loaderPlan.stages || [];
  expect(loaderStages.length === sourceStages.length, 'app/data/nodes/manifest.json: loaderPlan stage count mismatch');
  for (let i = 0; i < sourceStages.length; i += 1) {
    const sourceStage = sourceStages[i];
    const loaderStage = loaderStages[i];
    expect(loaderStage?.step === i + 1, `app/data/nodes/manifest.json: loaderPlan stage ${i + 1} step mismatch`);
    expect(loaderStage?.id === sourceStage?.id, `app/data/nodes/manifest.json: loaderPlan stage ${i + 1} id mismatch`);
    expect(loaderStage?.label === sourceStage?.label, `${sourceStage?.id || i}: loaderPlan label mismatch`);
    expect(loaderStage?.loadHint === sourceStage?.loadHint, `${sourceStage?.id || i}: loaderPlan loadHint mismatch`);
    expect(loaderStage?.runtime === (sourceStage?.loadHint !== 'dev-contract'), `${sourceStage?.id || i}: loaderPlan runtime flag mismatch`);
    expect(loaderStage?.trigger === sourceStage?.trigger, `${sourceStage?.id || i}: loaderPlan trigger mismatch`);
    expect(loaderStage?.failureMode === sourceStage?.failureMode, `${sourceStage?.id || i}: loaderPlan failure mode mismatch`);
    if (Number.isInteger(sourceStage?.bytes)) {
      expect(loaderStage?.bytes === sourceStage.bytes, `${sourceStage.id}: loaderPlan byte total mismatch`);
    }
    const loaderFiles = loaderStage?.files || [];
    expect(loaderFiles.length === (sourceStage?.files || []).length, `${sourceStage?.id || i}: loaderPlan file count mismatch`);
    for (const fileName of sourceStage?.files || []) {
      const detail = loaderFiles.find(item => item.file === fileName);
      expect(!!detail, `${sourceStage.id}: loaderPlan missing file ${fileName}`);
      if (!detail) continue;
      if (fileName === 'manifest.json') {
        expect(detail.type === 'manifest', 'app/data/nodes/manifest.json: loaderPlan should mark manifest self entry');
        expect(detail.loadHint === 'eager-metadata', 'app/data/nodes/manifest.json: loaderPlan manifest loadHint mismatch');
        expect(detail.integrity === 'self-unhashed', 'app/data/nodes/manifest.json: loaderPlan manifest should be self-unhashed');
        expect(detail.cacheKey === null, 'app/data/nodes/manifest.json: loaderPlan manifest cacheKey should be null');
        expect(detail.sha256 == null, 'app/data/nodes/manifest.json: loaderPlan manifest should not carry self sha256');
        continue;
      }
      const summary = byFile.get(fileName);
      expect(!!summary, `app/data/nodes/manifest.json: loaderPlan file ${fileName} missing from manifest indexes`);
      if (!summary) continue;
      expect(detail.type === summary.type, `app/data/nodes/manifest.json: loaderPlan ${fileName} type mismatch`);
      expect(detail.loadHint === summary.loadHint, `app/data/nodes/manifest.json: loaderPlan ${fileName} loadHint mismatch`);
      expect(detail.bytes === summary.bytes, `app/data/nodes/manifest.json: loaderPlan ${fileName} byte mismatch`);
      expect(detail.sha256 === summary.sha256, `app/data/nodes/manifest.json: loaderPlan ${fileName} sha256 mismatch`);
      expect(detail.cacheKey === `${fileName}:${summary.sha256}`, `app/data/nodes/manifest.json: loaderPlan ${fileName} cache key mismatch`);
    }
  }

  const loaderById = new Map(loaderStages.map(stage => [stage.id, stage]));
  expect((loaderById.get('bootstrap-metadata')?.files || []).some(item => item.file === 'manifest.json' && item.integrity === 'self-unhashed'), 'app/data/nodes/manifest.json: loaderPlan bootstrap should include self-unhashed manifest');
  expect((loaderById.get('bootstrap-metadata')?.files || []).some(item => item.file === 'node-load-plan.json' && item.cacheKey === `node-load-plan.json:${byFile.get('node-load-plan.json')?.sha256}`), 'app/data/nodes/manifest.json: loaderPlan bootstrap should include hashed node-load-plan');
  expect((loaderById.get('startup-ask-core')?.files || []).some(item => item.file === 'ask-core.json' && item.cacheKey === `ask-core.json:${byFile.get('ask-core.json')?.sha256}`), 'app/data/nodes/manifest.json: loaderPlan startup should include hashed ask-core');
  expect((loaderById.get('lazy-product-ask')?.files || []).some(item => item.file === 'ask-index.json' && item.cacheKey === `ask-index.json:${byFile.get('ask-index.json')?.sha256}`), 'app/data/nodes/manifest.json: loaderPlan lazy stage should include hashed ask-index');
  expect(loaderById.get('dev-contracts')?.runtime === false, 'app/data/nodes/manifest.json: loaderPlan dev-contracts should not be a runtime stage');
  expect(byFile.get('brands.json')?.nodes === (outputs.brandIndex.nodes || []).length, 'app/data/nodes/manifest.json: brand count mismatch');
  expect(byFile.get('companies.json')?.nodes === (outputs.companyIndex.nodes || []).length, 'app/data/nodes/manifest.json: company count mismatch');
  expect(byFile.get('avoid-tokens.json')?.families === (outputs.avoidTokensIndex.families || []).length, 'app/data/nodes/manifest.json: avoid-token family count mismatch');
  expect(byFile.get('avoid-tokens.json')?.tokens === outputs.avoidTokensIndex.stats?.tokens, 'app/data/nodes/manifest.json: avoid-token count mismatch');
  expect(byFile.get('avoid-tokens.json')?.uniqueTokens === outputs.avoidTokensIndex.stats?.uniqueTokens, 'app/data/nodes/manifest.json: avoid unique-token count mismatch');
  expect(byFile.get('ask-core.json')?.tokens === Object.keys(outputs.askCoreIndex.tokens || {}).length, 'app/data/nodes/manifest.json: Ask core token count mismatch');
  expect(byFile.get('ask-core.json')?.targets === Object.keys(outputs.askCoreIndex.targets || {}).length, 'app/data/nodes/manifest.json: Ask core target count mismatch');
  expect(byFile.get('ask-index.json')?.tokens === Object.keys(outputs.askIndex.tokens || {}).length, 'app/data/nodes/manifest.json: Ask token count mismatch');
  expect(byFile.get('ask-index.json')?.aliases === Object.keys(outputs.askIndex.aliases || {}).length, 'app/data/nodes/manifest.json: Ask alias count mismatch');
  expect(byFile.get('ask-index.json')?.barcodeLikeItems === outputs.askIndex.stats?.barcodeLikeItems, 'app/data/nodes/manifest.json: Ask barcode-like item count mismatch');
  expect(byFile.get('ask-fixtures.json')?.cases === (outputs.askFixturesIndex.cases || []).length, 'app/data/nodes/manifest.json: Ask fixture count mismatch');
  expect(byFile.get('ask-traces.json')?.traces === (outputs.askTracesIndex.traces || []).length, 'app/data/nodes/manifest.json: Ask trace count mismatch');
  expect(byFile.get('ask-presentation.json')?.qaCases === (outputs.askPresentationIndex.qaCases || []).length, 'app/data/nodes/manifest.json: Ask presentation QA count mismatch');
  expect(byFile.get('node-walkthroughs.json')?.walkthroughs === (outputs.nodeWalkthroughsIndex.walkthroughs || []).length, 'app/data/nodes/manifest.json: node walkthrough count mismatch');
  expect(byFile.get('node-page-contracts.json')?.contracts === (outputs.nodePageContractsIndex.contracts || []).length, 'app/data/nodes/manifest.json: node page contract count mismatch');
  expect(byFile.get('node-route-fixtures.json')?.cases === (outputs.nodeRouteFixturesIndex.cases || []).length, 'app/data/nodes/manifest.json: node route fixture count mismatch');
  expect(byFile.get('node-route-guardrails.json')?.cases === (outputs.nodeRouteGuardrailsIndex.cases || []).length, 'app/data/nodes/manifest.json: node route guardrail count mismatch');
  expect(byFile.get('node-runtime-states.json')?.cases === (outputs.nodeRuntimeStatesIndex.cases || []).length, 'app/data/nodes/manifest.json: runtime state case count mismatch');
  expect(byFile.get('node-preview-matrix.json')?.scenarios === (outputs.nodePreviewMatrixIndex.scenarios || []).length, 'app/data/nodes/manifest.json: preview matrix scenario count mismatch');
  expect(byFile.get('node-integration-checklist.json')?.phases === (outputs.nodeIntegrationChecklistIndex.phases || []).length, 'app/data/nodes/manifest.json: node integration phase count mismatch');
  expect(byFile.get('node-load-plan.json')?.stages === (outputs.nodeLoadPlanIndex.stages || []).length, 'app/data/nodes/manifest.json: node load plan stage count mismatch');
  expect(byFile.get('readiness.json')?.status === outputs.readinessIndex.status, 'app/data/nodes/manifest.json: readiness status mismatch');
  for (const [fileName, summary] of byFile.entries()) {
    expect(Number.isInteger(summary.bytes) && summary.bytes > 0, `app/data/nodes/manifest.json: ${fileName} missing byte size`);
    expect(/^[a-f0-9]{64}$/.test(summary.sha256 || ''), `app/data/nodes/manifest.json: ${fileName} missing sha256`);
    const file = path.join(ROOT, 'app', 'data', 'nodes', fileName);
    if (fs.existsSync(file)) {
      expect(summary.sha256 === sha256Text(fs.readFileSync(file, 'utf8')), `app/data/nodes/manifest.json: ${fileName} sha256 mismatch`);
    }
    expect(typeof summary.loadHint === 'string' && summary.loadHint.trim(), `app/data/nodes/manifest.json: ${fileName} missing loadHint`);
  }
  expect(byFile.get('avoid-tokens.json')?.loadHint === 'extension-data', 'app/data/nodes/manifest.json: avoid-tokens should be extension-data');
  expect(byFile.get('ask-core.json')?.loadHint === 'eager-search', 'app/data/nodes/manifest.json: ask-core should be eager-search');
  expect(byFile.get('ask-index.json')?.loadHint === 'lazy-product-search', 'app/data/nodes/manifest.json: ask-index should be lazy-product-search');
  expect(byFile.get('sample.json')?.loadHint === 'legacy-sample', 'app/data/nodes/manifest.json: sample.json should be marked legacy-sample');
  expect(byFile.get('ask-fixtures.json')?.loadHint === 'dev-contract', 'app/data/nodes/manifest.json: ask-fixtures should be dev-contract');
  expect(byFile.get('ask-traces.json')?.loadHint === 'dev-contract', 'app/data/nodes/manifest.json: ask-traces should be dev-contract');
  expect(byFile.get('ask-presentation.json')?.loadHint === 'dev-contract', 'app/data/nodes/manifest.json: ask-presentation should be dev-contract');
  expect(byFile.get('node-walkthroughs.json')?.loadHint === 'dev-contract', 'app/data/nodes/manifest.json: node-walkthroughs should be dev-contract');
  expect(byFile.get('node-page-contracts.json')?.loadHint === 'dev-contract', 'app/data/nodes/manifest.json: node-page-contracts should be dev-contract');
  expect(byFile.get('node-route-fixtures.json')?.loadHint === 'dev-contract', 'app/data/nodes/manifest.json: node-route-fixtures should be dev-contract');
  expect(byFile.get('node-route-guardrails.json')?.loadHint === 'dev-contract', 'app/data/nodes/manifest.json: node-route-guardrails should be dev-contract');
  expect(byFile.get('node-runtime-states.json')?.loadHint === 'dev-contract', 'app/data/nodes/manifest.json: node-runtime-states should be dev-contract');
  expect(byFile.get('node-preview-matrix.json')?.loadHint === 'dev-contract', 'app/data/nodes/manifest.json: node-preview-matrix should be dev-contract');
  expect(byFile.get('node-integration-checklist.json')?.loadHint === 'dev-contract', 'app/data/nodes/manifest.json: node-integration-checklist should be dev-contract');
  expect(byFile.get('node-load-plan.json')?.loadHint === 'eager-metadata', 'app/data/nodes/manifest.json: node-load-plan should be eager-metadata');
  expect(byFile.get('readiness.json')?.loadHint === 'dev-contract', 'app/data/nodes/manifest.json: readiness should be dev-contract');
  expect(manifest.totals?.generatedPageNodes >= 2000, 'app/data/nodes/manifest.json: generatedPageNodes total too low');
  expect(manifest.totals?.askCoreTokens === Object.keys(outputs.askCoreIndex.tokens || {}).length, 'app/data/nodes/manifest.json: askCoreTokens mismatch');
  expect(manifest.totals?.askCoreTargets === Object.keys(outputs.askCoreIndex.targets || {}).length, 'app/data/nodes/manifest.json: askCoreTargets mismatch');
  expect(manifest.totals?.askBarcodeLikeItems === outputs.askIndex.stats?.barcodeLikeItems, 'app/data/nodes/manifest.json: askBarcodeLikeItems mismatch');
  expect(manifest.totals?.avoidTokenFamilies === (outputs.avoidTokensIndex.families || []).length, 'app/data/nodes/manifest.json: avoidTokenFamilies mismatch');
  expect(manifest.totals?.avoidTokens === outputs.avoidTokensIndex.stats?.tokens, 'app/data/nodes/manifest.json: avoidTokens mismatch');
  expect(manifest.totals?.avoidUniqueTokens === outputs.avoidTokensIndex.stats?.uniqueTokens, 'app/data/nodes/manifest.json: avoidUniqueTokens mismatch');
  expect(manifest.totals?.askFixtures === (outputs.askFixturesIndex.cases || []).length, 'app/data/nodes/manifest.json: askFixtures mismatch');
  expect(manifest.totals?.askTraces === (outputs.askTracesIndex.traces || []).length, 'app/data/nodes/manifest.json: askTraces mismatch');
  expect(manifest.totals?.askPresentationCases === (outputs.askPresentationIndex.qaCases || []).length, 'app/data/nodes/manifest.json: askPresentationCases mismatch');
  expect(manifest.totals?.nodeWalkthroughs === (outputs.nodeWalkthroughsIndex.walkthroughs || []).length, 'app/data/nodes/manifest.json: nodeWalkthroughs mismatch');
  expect(manifest.totals?.nodePageContracts === (outputs.nodePageContractsIndex.contracts || []).length, 'app/data/nodes/manifest.json: nodePageContracts mismatch');
  expect(manifest.totals?.nodeRouteFixtures === (outputs.nodeRouteFixturesIndex.cases || []).length, 'app/data/nodes/manifest.json: nodeRouteFixtures mismatch');
  expect(manifest.totals?.nodeRouteGuardrails === (outputs.nodeRouteGuardrailsIndex.cases || []).length, 'app/data/nodes/manifest.json: nodeRouteGuardrails mismatch');
  expect(manifest.totals?.nodeRuntimeStateCases === (outputs.nodeRuntimeStatesIndex.cases || []).length, 'app/data/nodes/manifest.json: nodeRuntimeStateCases mismatch');
  expect(manifest.totals?.nodePreviewScenarios === (outputs.nodePreviewMatrixIndex.scenarios || []).length, 'app/data/nodes/manifest.json: nodePreviewScenarios mismatch');
  expect(manifest.totals?.nodeIntegrationPhases === (outputs.nodeIntegrationChecklistIndex.phases || []).length, 'app/data/nodes/manifest.json: nodeIntegrationPhases mismatch');
  expect(manifest.totals?.nodeLoadPlanStages === (outputs.nodeLoadPlanIndex.stages || []).length, 'app/data/nodes/manifest.json: nodeLoadPlanStages mismatch');
  expect(manifest.totals?.readinessReports === 1, 'app/data/nodes/manifest.json: readinessReports mismatch');
  expect(manifest.appLaneNote && /App-owned/.test(manifest.appLaneNote), 'app/data/nodes/manifest.json: missing app-lane note');
}

function checkAppRuntimeIntegration() {
  const text = fs.readFileSync(APP_JS, 'utf8');
  expect(/function loadAskCore\(\)/.test(text), 'app/app.js: missing H4 compact Ask loader');
  expect(/fetchNodeJson\('ask-core\.json'/.test(text), 'app/app.js: startup Ask should load generated ask-core.json');
  expect(/function loadAskIndex\(\)/.test(text), 'app/app.js: missing H4 lazy product Ask loader');
  expect(/fetchNodeJson\('ask-index\.json'/.test(text), 'app/app.js: lazy product Ask should load generated ask-index.json');
  expect(/function resolveAskCoreRows\(/.test(text), 'app/app.js: missing generated Ask core resolver');
  expect(/function resolveAskFullRows\(/.test(text), 'app/app.js: missing generated full Ask item resolver');
  expect(/function resolveAskLegacy\(/.test(text), 'app/app.js: missing explicit legacy Ask fallback boundary');
  for (const file of ['brands.json', 'companies.json', 'tags.json', 'errands.json', 'synonyms.json']) {
    expect(text.includes(`'${file}'`), `app/app.js: generated node loader missing ${file}`);
  }
  expect(!/fetchNodeJson\('sample\.json'/.test(text), 'app/app.js: sample.json must not be a runtime generated-node fallback');
  expect(!/get\('sample\.json'\)/.test(text), 'app/app.js: stale sample.json runtime fallback still present');
  expect(!/sample\.json remains the fallback/i.test(text), 'app/app.js: stale sample fallback comment still present');
  expect(!/C1's generated indexes later/i.test(text), 'app/app.js: stale generated-index-later comment still present');
  expect(/Company and brand index unavailable/.test(text), 'app/app.js: missing visible company-and-brand failure state');
  expect(/ask-index\.json stays lazy/.test(text), 'app/app.js: lazy ask-index boundary should remain documented in runtime code');
  expect(/loadAskIndex\(\)\.then/.test(text), 'app/app.js: ask-index should be loaded only behind a lazy resolver path');
  expect(!/boot\(\)\.then\(\(\)=>\{[\s\S]{0,300}loadAskIndex\(\)/.test(text), 'app/app.js: ask-index must not be eager-loaded at boot');
  expect(/function loadNodeQaContracts\(\)/.test(text), 'app/app.js: missing H4 workbench QA contract loader');
  for (const file of ['node-preview-matrix.json', 'node-runtime-states.json', 'node-integration-checklist.json']) {
    expect(text.includes(`'${file}'`), `app/app.js: H4 workbench QA panel missing ${file}`);
  }
  for (const file of ['node-route-fixtures.json', 'node-route-guardrails.json']) {
    expect(text.includes(`'${file}'`), `app/app.js: H4 workbench QA panel missing route contract ${file}`);
  }
  expect(text.includes(`'ask-fixtures.json'`), 'app/app.js: H4 workbench QA panel missing Ask fixture contract');
  expect(text.includes(`'node-walkthroughs.json'`), 'app/app.js: H4 workbench QA panel missing flagship walkthrough contract');
  expect(/function initH4WorkbenchQA\(\)/.test(text), 'app/app.js: missing H4 workbench QA renderer');
  expect(/function h4NodeRouteSelfCheck\(/.test(text), 'app/app.js: missing H4 node route self-check helper');
  expect(/function h4NodeRouteSelfCheckPassed\(/.test(text), 'app/app.js: missing H4 node route self-check pass helper');
  expect(/function h4LoaderPlanSelfCheck\(/.test(text), 'app/app.js: missing H4 loader-plan self-check helper');
  expect(/function h4AskCoreSelfCheck\(/.test(text), 'app/app.js: missing H4 core Ask self-check helper');
  expect(/function h4RunLazyAskSelfCheck\(/.test(text), 'app/app.js: missing H4 lazy Ask self-check helper');
  expect(/Promise\.all\(\[loadNodeQaContracts\(\),loadNodes\(\),loadAskCore\(\)\]\)/.test(text), 'app/app.js: workbench self-check should load generated nodes and ask-core');
  expect(/id="h4qa"/.test(text), 'app/app.js: workbench should expose an H4 QA mount');
  expect(/h4-drain-decision/.test(text), 'app/app.js: workbench QA should name the final H4 drain gate');
  expect(/named routes/.test(text), 'app/app.js: workbench QA should surface named route count');
  expect(/failure cases/.test(text), 'app/app.js: workbench QA should surface route failure count');
  expect(/malformed, unsupported, unknown-target, and corrected routes/.test(text), 'app/app.js: workbench QA should name route failure kinds');
  expect(/Route smoke links/.test(text), 'app/app.js: workbench QA should expose clickable route smoke links');
  expect(/routeCases\.filter\(c=>c\.hash&&c\.expect&&c\.expect\.route==='node'\)/.test(text), 'app/app.js: workbench QA route smoke links should come from node route fixtures');
  expect(/Route check/.test(text), 'app/app.js: workbench QA should show a route-check result');
  expect(/This confirms the route, not the final review/.test(text), 'app/app.js: route check must not imply final approval');
  expect(/function h4RouteCaseDetail\(/.test(text), 'app/app.js: workbench QA should render route fixture details');
  expect(/function h4RouteGuardrailDetail\(/.test(text), 'app/app.js: workbench QA should render route guardrail details');
  expect(/Route contract checklist/.test(text), 'app/app.js: workbench QA should show the route contract checklist');
  expect(/class="h4-route-case"/.test(text) && /class="h4-route-guardrail"/.test(text), 'app/app.js: route checklist should expose positive and guardrail cases');
  expect(/Expected route/.test(text) && /parseable/.test(text), 'app/app.js: route details should include expected route and parseable guardrail state');
  expect(/function h4WalkthroughDetail\(/.test(text), 'app/app.js: workbench QA should render flagship walkthrough details');
  expect(/Flagship walkthrough checklist/.test(text), 'app/app.js: workbench QA should show the flagship walkthrough checklist');
  expect(/class="h4-walkthrough"/.test(text), 'app/app.js: flagship walkthrough checklist should expose individual walkthroughs');
  expect(/Expected pages/.test(text) && /Generated checks/.test(text), 'app/app.js: walkthrough details should include expected pages and generated checks');
  expect(/H4_EVIDENCE_KEY/.test(text), 'app/app.js: workbench QA should keep a local H4 evidence key');
  expect(/function h4EvidenceChecklist\(/.test(text) && /function h4BindEvidence\(/.test(text), 'app/app.js: workbench QA should render and bind the local evidence tracker');
  expect(/Local evidence tracker/.test(text), 'app/app.js: workbench QA should show the local evidence tracker');
  expect(/Stored only on this device/.test(text), 'app/app.js: local evidence tracker should state its device-local storage boundary');
  expect(/does not drain H4 by itself/.test(text), 'app/app.js: evidence tracker must not imply local checks drain H4');
  expect(/Copy evidence summary/.test(text), 'app/app.js: evidence tracker should expose a copyable handoff summary');
  expect(/Download JSON receipt/.test(text), 'app/app.js: evidence tracker should expose a downloadable JSON receipt');
  expect(/Channel:/.test(text) && /Hash:/.test(text), 'app/app.js: copied evidence summary should include channel and hash context');
  expect(/function h4EvidenceTimestamp\(/.test(text) && /function h4EvidenceContext\(/.test(text), 'app/app.js: evidence tracker should expose timestamp and context helpers');
  expect(/function h4EvidenceRecord\(/.test(text) && /function h4EvidenceStamp\(/.test(text), 'app/app.js: evidence tracker should store per-item context records and render them');
  expect(/function h4EvidenceReceipt\(/.test(text) && /h4-local-evidence-v1/.test(text), 'app/app.js: evidence tracker should build a versioned JSON receipt');
  expect(/function h4DownloadEvidence\(/.test(text) && /CC_BUILD/.test(text), 'app/app.js: evidence receipt should include the running build stamp');
  expect(/function h4EvidenceMissing\(/.test(text) && /Missing before final/.test(text), 'app/app.js: evidence summary should spell out missing prereqs before final review');
  expect(/readyForFinalDecision/.test(text) && /missingPrerequisites/.test(text) && /checkedIds/.test(text), 'app/app.js: evidence receipt should expose readiness, missing prereqs, and checked ids');
  expect(/channel:ctx\.channel/.test(text) && /hash:ctx\.hash/.test(text), 'app/app.js: evidence records should carry per-item channel and hash context');
  expect(/h4-evidence-stamp/.test(text) && /Recorded /.test(text), 'app/app.js: evidence tracker should show per-item recorded timestamps');
  expect(/H4_FINAL_EVIDENCE_ID/.test(text), 'app/app.js: evidence tracker should name the final H4 decision id');
  expect(/function h4EvidenceReady\(/.test(text) && /function h4EvidenceStatus\(/.test(text), 'app/app.js: evidence tracker should gate final H4 decision readiness');
  expect(/The final H4 decision stays locked until the preceding checks are recorded/.test(text), 'app/app.js: evidence tracker should explain the final-decision lock');
  expect(/Record the preceding evidence before the final decision/.test(text), 'app/app.js: evidence tracker should block premature final decisions');
  expect(/function h4MarkEvidence\(/.test(text) && /function h4EvidenceInput\(/.test(text), 'app/app.js: evidence tracker should support checked evidence from runtime self-checks');
  expect(/Startup Ask evidence recorded from the self-check/.test(text), 'app/app.js: startup Ask self-check should auto-record local evidence');
  expect(/Lazy product Ask evidence recorded from the self-check/.test(text), 'app/app.js: lazy Ask self-check should auto-record local evidence');
  expect(/Node route evidence recorded from the route self-check/.test(text), 'app/app.js: node route self-check should auto-record local evidence');
  expect(/Loader-plan evidence recorded from the manifest loader-plan self-check/.test(text), 'app/app.js: loader-plan self-check should auto-record local evidence');
  expect(/function h4RuntimeContractSelfCheck\(/.test(text) && /function h4PreviewContractSelfCheck\(/.test(text), 'app/app.js: workbench evidence shortcuts should preflight runtime and preview contracts');
  expect(/function h4WalkthroughContractSelfCheck\(/.test(text) && /function h4PublicGateContractSelfCheck\(/.test(text), 'app/app.js: workbench evidence shortcuts should preflight walkthrough and public-gate contracts');
  expect(/function h4MarkEvidenceMany\(/.test(text) && /function h4BindEvidenceBulkButton\(/.test(text), 'app/app.js: evidence tracker should support review-group recording');
  expect(/Evidence shortcuts/.test(text) && /use these only after walking the visible details above/.test(text), 'app/app.js: evidence shortcuts should preserve review-before-recording language');
  expect(/do not touch the lazy Ask check or the final H4 decision/.test(text), 'app/app.js: evidence shortcuts must not record lazy Ask or the final H4 decision');
  for (const id of ['h4recordruntime', 'h4recordpreview', 'h4recordwalkthroughs', 'h4recordgates']) {
    expect(text.includes(id), `app/app.js: missing H4 evidence shortcut button ${id}`);
  }
  expect(/Runtime mode reviewed/.test(text) && /Preview group reviewed/.test(text), 'app/app.js: shortcut-backed evidence labels should name review rather than data existence');
  expect(/h4EvidenceIds\(evidenceItems,'runtime:'\)/.test(text) && /h4EvidenceIds\(evidenceItems,'preview:'\)/.test(text), 'app/app.js: bulk evidence buttons should target scoped runtime and preview ids');
  expect(/h4EvidenceIds\(evidenceItems,'walkthrough:'\)/.test(text) && /h4EvidenceIds\(evidenceItems,'gate:'\)/.test(text), 'app/app.js: bulk evidence buttons should target scoped walkthrough and gate ids');
  expect(/h4RunLazyAskSelfCheck\(qa,out,evidenceItems\)/.test(text), 'app/app.js: lazy Ask self-check should receive the evidence item list');
  expect(/Start-page search/.test(text), 'app/app.js: workbench QA should show start-page search result');
  expect(/id="h4asklazy"/.test(text), 'app/app.js: workbench QA should expose a lazy Ask self-check button');
  expect(/larger index loads only when this button is pressed/.test(text), 'app/app.js: larger product search should remain button-gated');
  expect(/loadAskIndex\(\)\.then/.test(text), 'app/app.js: lazy Ask self-check should call loadAskIndex behind the button');
  expect(/Runtime QA modes/.test(text), 'app/app.js: workbench QA should show runtime QA mode order');
  expect(/function h4LoaderStageDetail\(/.test(text), 'app/app.js: workbench QA should render manifest loader stage details');
  expect(/Loader-plan checklist/.test(text), 'app/app.js: workbench QA should show the loader-plan checklist');
  expect(/class="h4-loader-stage"/.test(text), 'app/app.js: loader-plan checklist should expose individual stages');
  expect(/manifest\.loaderPlan/.test(text) && /Cache key/.test(text), 'app/app.js: loader-plan checklist should name manifest.loaderPlan and cache keys');
  expect(/Failure mode/.test(text) && /Load hint/.test(text), 'app/app.js: loader stages should include load hints and failure modes');
  expect(/askCoreOk=askCore&&askCore\.format==='ovs-ask-core-index'/.test(text), 'app/app.js: loader-plan self-check should include loaded ask-core index evidence');
  expect(/lazyBoundaryOk=!\s*loaded\.has\('ask-index\.json'\)&&!\s*loaded\.has\('sample\.json'\)/.test(text), 'app/app.js: loader-plan self-check should preserve lazy Ask and no-sample boundaries');
  expect(/eagerOk=.*'manifest\.json'.*'tags\.json'.*'errands\.json'.*'synonyms\.json'/.test(text), 'app/app.js: loader-plan self-check should name the eager runtime node files');
  expect(/pageNodeOk=.*'brands\.json'.*'companies\.json'/.test(text), 'app/app.js: loader-plan self-check should name deferred page-node files');
  expect(/function h4RuntimeModeDetail\(/.test(text), 'app/app.js: workbench QA should render runtime mode details');
  expect(/function h4RuntimeCaseDetail\(/.test(text), 'app/app.js: workbench QA should render runtime case details');
  expect(/Runtime-state checklist/.test(text), 'app/app.js: workbench QA should show the runtime-state checklist');
  expect(/class="h4-runtime-mode"/.test(text) && /class="h4-runtime-case"/.test(text), 'app/app.js: runtime checklist should expose modes and cases');
  expect(/Required behavior/.test(text) && /Trigger/.test(text), 'app/app.js: runtime case details should include trigger and required behavior');
  expect(/Public-gate order/.test(text), 'app/app.js: workbench QA should show public-gate release order');
  expect(/Move one surface at a time/.test(text), 'app/app.js: public-gate copy should preserve one-surface-at-a-time rule');
  expect(/function h4PublicGateDetail\(/.test(text), 'app/app.js: workbench QA should render public-gate details');
  expect(/Public-gate checklist/.test(text), 'app/app.js: workbench QA should show the public-gate checklist');
  expect(/class="h4-public-gate"/.test(text), 'app/app.js: public-gate checklist should expose individual surface gates');
  expect(/Evidence required/.test(text) && /Release when/.test(text), 'app/app.js: public-gate details should include evidence and release clauses');
  expect(/function h4DrainStepDetail\(/.test(text), 'app/app.js: workbench QA should render H4 drain step details');
  expect(/Final review/.test(text), 'app/app.js: workbench QA should show the final review checklist');
  expect(/class="h4-drain-step"/.test(text), 'app/app.js: H4 drain checklist should expose individual drain steps');
  expect(/A data file alone is/.test(text), 'app/app.js: final review should show the data-alone boundary');
  expect(/App-owned evidence/.test(text) && /Pass when/.test(text), 'app/app.js: H4 drain steps should include evidence and pass clauses');
  expect(/scenarioById/.test(text), 'app/app.js: workbench QA should map preview scenarios by id');
  expect(/Preview scenario checklist/.test(text), 'app/app.js: workbench QA should show the preview scenario checklist');
  expect(/class="h4-run-group"/.test(text), 'app/app.js: workbench QA should group preview scenarios by runContract group');
  expect(/function h4ScenarioDetail\(/.test(text), 'app/app.js: workbench QA should render scenario-level details');
  expect(/class="h4-scenario"/.test(text), 'app/app.js: workbench QA should expose individual scenario detail blocks');
  expect(/Acceptance/.test(text) && /Must not/.test(text), 'app/app.js: scenario details should include acceptance and must-not clauses');
  expect(/failed searches, misspellings, and offline use/.test(text), 'app/app.js: workbench product search copy should name the remaining checks');
  const showViewMatch = text.match(/function showView\(name\)\{([\s\S]*?)\}\s*\n/);
  expect(!!showViewMatch, 'app/app.js: missing showView(name)');
  if (showViewMatch) {
    expect(/'node'/.test(showViewMatch[1]), 'app/app.js: showView registry must include node routes');
    expect(/'workbench'/.test(showViewMatch[1]), 'app/app.js: showView registry must include workbench routes');
  }
  expect(/else if\(view==='n'\)\{renderNode\(arg\);showView\('node'\);\}/.test(text), 'app/app.js: node route should render and show the node view');
  expect(/else if\(view==='workbench'\)\{if\(!chDev\(\)\)\{location\.replace\('#you'\);return;\}renderWorkbench\(\);showView\('workbench'\);\}/.test(text), 'app/app.js: workbench route should redirect publicly and render only in developer mode');
}

function main() {
  console.log('Node index audit');
  const outputs = buildAll();
  checkGeneratedSync(outputs);

  const { cats, items } = loadCategories();
  const brands = new Set((outputs.brandIndex.nodes || []).map(node => node.id));
  const companies = new Set((outputs.companyIndex.nodes || []).map(node => node.id));
  const tags = fs.existsSync(TAGS_OUT) ? new Set((readJson(TAGS_OUT).nodes || []).map(node => node.id)) : new Set();
  const errands = fs.existsSync(ERRANDS_OUT) ? new Set((readJson(ERRANDS_OUT).nodes || []).map(node => node.id)) : new Set();
  const lines = new Set((readJson(LINES_SRC).lines || []).map(line => `ovs:line/${line.id}`));
  const guides = parseGuides();

  checkBrandIndex(outputs.brandIndex, cats, companies);
  checkCompanyIndex(outputs.companyIndex, brands);
  checkAskIndex(outputs.askIndex, { cats, items, brands, companies, tags, errands, lines, guides });
  checkAskCoreIndex(outputs.askCoreIndex, outputs.askIndex, { cats, items, brands, companies, tags, errands, lines, guides });
  checkAvoidTokens(outputs.avoidTokensIndex, outputs, { lines });
  checkPresentation(outputs.askPresentationIndex, outputs);
  checkNodeWalkthroughs(outputs.nodeWalkthroughsIndex, outputs);
  checkNodePageContracts(outputs.nodePageContractsIndex, outputs, { cats, items, brands, companies, tags, errands, lines, guides });
  checkNodeRouteFixtures(outputs.nodeRouteFixturesIndex, outputs.nodePageContractsIndex, outputs, { cats, items, brands, companies, tags, errands, lines, guides });
  checkNodeRouteGuardrails(outputs.nodeRouteGuardrailsIndex, { cats, items, brands, companies, tags, errands, lines, guides });
  checkNodeLoadPlan(outputs.nodeLoadPlanIndex, outputs);
  checkNodeRuntimeStates(outputs.nodeRuntimeStatesIndex, outputs);
  checkNodePreviewMatrix(outputs.nodePreviewMatrixIndex, outputs);
  checkNodeIntegrationChecklist(outputs.nodeIntegrationChecklistIndex, outputs);
  checkReadiness(outputs.readinessIndex, outputs);
  checkManifest(outputs.manifestIndex, outputs);
  checkAppRuntimeIntegration();

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log(`  brands: ${(outputs.brandIndex.nodes || []).length}`);
  console.log(`  brand long tail: ${outputs.brandIndex.longTail}`);
  console.log(`  companies: ${(outputs.companyIndex.nodes || []).length}`);
  console.log(`  Ask tokens: ${Object.keys(outputs.askIndex.tokens || {}).length}`);
  console.log(`  Ask barcode-like item codes: ${outputs.askIndex.stats?.barcodeLikeItems || 0}`);
  console.log(`  Ask core tokens: ${Object.keys(outputs.askCoreIndex.tokens || {}).length}`);
  console.log(`  Avoid token families: ${(outputs.avoidTokensIndex.families || []).length}`);
  console.log(`  Avoid tokens: ${outputs.avoidTokensIndex.stats?.tokens || 0}`);
  console.log(`  Ask aliases: ${Object.keys(outputs.askIndex.aliases || {}).length}`);
  console.log(`  Ask presentation QA cases: ${(outputs.askPresentationIndex.qaCases || []).length}`);
  console.log(`  Node walkthroughs: ${(outputs.nodeWalkthroughsIndex.walkthroughs || []).length}`);
  console.log(`  Node page contracts: ${(outputs.nodePageContractsIndex.contracts || []).length}`);
  console.log(`  Node route fixtures: ${(outputs.nodeRouteFixturesIndex.cases || []).length}`);
  console.log(`  Node route guardrails: ${(outputs.nodeRouteGuardrailsIndex.cases || []).length}`);
  console.log(`  Node integration phases: ${(outputs.nodeIntegrationChecklistIndex.phases || []).length}`);
  console.log(`  Node load plan stages: ${(outputs.nodeLoadPlanIndex.stages || []).length}`);
  console.log(`  Node runtime state cases: ${(outputs.nodeRuntimeStatesIndex.cases || []).length}`);
  console.log(`  Node preview scenarios: ${(outputs.nodePreviewMatrixIndex.scenarios || []).length}`);
  console.log('NODE INDEX CHECKS PASS');
}

main();
