#!/usr/bin/env node
/* Data-side N1 walkthrough audit.

   This proves the generated node graph can support one real first-use path:
   Ask -> company/brand -> receipts -> products -> avoid line. The app-owned
   UI still has to render it, but this keeps the underlying path from rotting.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const { askNormalize } = require('../pipeline/build_nodes.js');

const ROOT = path.resolve(__dirname, '..');
const BRAND_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'brands.json');
const COMPANY_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'companies.json');
const ASK_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'ask-index.json');
const NODE_WALKTHROUGHS_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'node-walkthroughs.json');
const LINES_SRC = path.join(ROOT, 'content', 'lines.json');
const DATA_INDEX = path.join(ROOT, 'app', 'data', 'index.json');

const failures = [];

const WALKTHROUGHS = [
  {
    label: 'Nestle concern path',
    query: 'is nestle bad',
    company: 'ovs:company/nestle',
    line: 'avoid:nestle',
    brands: ['ovs:brand/nestle', 'ovs:brand/nescafe'],
    minCompanyBrands: 10,
    minCategories: 8,
    requiredLineTokens: ['nestle', 'nescafe', 'kitkat', 'maggi']
  },
  {
    label: 'Coke concern path',
    query: 'coke',
    company: 'ovs:company/coca-cola',
    line: 'avoid:coca-cola',
    brands: ['ovs:brand/coca-cola'],
    minCompanyBrands: 8,
    minCategories: 2,
    requiredLineTokens: ['coca-cola', 'coke', 'sprite', 'fanta']
  },
  {
    label: 'Amazon concern path',
    query: 'avoid amazon',
    company: 'ovs:company/amazon',
    line: 'avoid:amazon',
    brands: ['ovs:brand/amazon'],
    minCompanyBrands: 8,
    minCategories: 3,
    requiredLineTokens: ['amazon', 'aws', 'audible', 'twitch']
  }
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function byId(nodes) {
  return new Map((nodes || []).map(node => [node.id, node]));
}

function itemMap() {
  const index = readJson(DATA_INDEX);
  const out = new Map();
  for (const cat of index.categories || []) {
    const file = path.join(ROOT, 'app', 'data', cat.file || `${cat.id}.json`);
    if (!fs.existsSync(file)) continue;
    const data = readJson(file);
    for (const product of data.products || []) {
      const code = String(product.code || '').trim();
      if (code) out.set(`${cat.id}/${code}`, { cat: cat.id, product });
    }
  }
  return out;
}

function resolveAskIds(query, askIndex) {
  const key = askNormalize(query);
  const ids = new Set();
  if (askIndex.aliases && askIndex.aliases[key]) ids.add(askIndex.aliases[key]);
  for (const id of (askIndex.tokens && askIndex.tokens[key]) || []) ids.add(id);
  for (const token of key.split(' ').filter(Boolean)) {
    for (const id of (askIndex.tokens && askIndex.tokens[token]) || []) ids.add(id);
  }
  return ids;
}

function productExists(top, items) {
  return items.has(`${top.cat}/${top.code}`);
}

function lineTokens(line) {
  return new Set((line.brands || []).map(token => String(token).toLowerCase()));
}

function checkWalkthrough(w, refs, generated) {
  const { brands, companies, askIndex, lines, items } = refs;
  const company = companies.get(w.company);
  const line = lines.get(w.line);
  const askIds = resolveAskIds(w.query, askIndex);
  const generatedLine = `ovs:line/${w.line}`;

  expect(!!company, `${w.label}: missing company ${w.company}`);
  expect(!!line, `${w.label}: missing line ${w.line}`);
  expect(askIds.has(w.company) || askIds.has(`ovs:line/${w.line}`) || w.brands.some(id => askIds.has(id)), `${w.label}: Ask query "${w.query}" does not resolve to company, line, or brand`);
  expect(!!generated, `${w.label}: missing generated walkthrough contract`);
  if (generated) {
    expect(generated.query === w.query, `${w.label}: generated query mismatch`);
    expect(generated.expected?.company === w.company, `${w.label}: generated company expectation mismatch`);
    expect(generated.expected?.line === generatedLine, `${w.label}: generated line expectation mismatch`);
    expect(JSON.stringify(generated.expected?.brands || []) === JSON.stringify(w.brands), `${w.label}: generated brand expectation mismatch`);
    expect(generated.pages?.company?.id === w.company, `${w.label}: generated company page mismatch`);
    expect(generated.pages?.line?.id === generatedLine, `${w.label}: generated line page mismatch`);
    expect(typeof generated.matchedTop === 'string' && generated.matchedTop.startsWith('ovs:'), `${w.label}: generated Ask match missing`);
    for (const [key, value] of Object.entries(generated.checks || {})) {
      expect(value === true, `${w.label}: generated walkthrough check failed: ${key}`);
    }
  }
  if (!company || !line) return;

  expect(company.line === w.line, `${w.label}: company line should be ${w.line}, found ${company.line || '(none)'}`);
  expect((company.brandNames || []).length >= w.minCompanyBrands, `${w.label}: company knows too few brand names`);
  expect((company.categories || []).length >= w.minCategories, `${w.label}: company touches too few categories for a real path`);
  expect(Array.isArray(company.ownershipSources) && company.ownershipSources.length >= w.minCompanyBrands, `${w.label}: company lacks per-relation ownership receipts`);
  for (const source of company.ownershipSources || []) {
    expect(typeof source.source === 'string' && source.source.trim(), `${w.label}: ownership source missing receipt`);
    expect(typeof source.asof === 'string' && source.asof.trim(), `${w.label}: ownership source missing asof`);
  }

  const tokens = lineTokens(line);
  for (const token of w.requiredLineTokens) expect(tokens.has(token), `${w.label}: line missing brand token ${token}`);
  expect(/^https?:\/\//.test(String(line.why || '')), `${w.label}: line why must be an http(s) URL`);

  for (const brandId of w.brands) {
    const brand = brands.get(brandId);
    expect(!!brand, `${w.label}: missing generated brand ${brandId}`);
    if (!brand) continue;
    expect(brand.ownedBy === w.company, `${w.label}: ${brandId} ownedBy should be ${w.company}`);
    expect((brand.items || 0) >= 2, `${w.label}: ${brandId} needs at least two items`);
    expect(Array.isArray(brand.categories) && brand.categories.length > 0, `${w.label}: ${brandId} missing categories`);
    expect(Array.isArray(brand.top) && brand.top.length > 0, `${w.label}: ${brandId} missing balanced top picks`);
    for (const top of brand.top || []) {
      expect(productExists(top, items), `${w.label}: ${brandId} top pick ${top.cat}/${top.code} does not resolve`);
      expect(Number.isFinite(top.score) && top.score >= 0 && top.score <= 100, `${w.label}: ${brandId} top score out of range`);
    }
  }
}

function main() {
  console.log('Node walkthrough audit');
  const generated = readJson(NODE_WALKTHROUGHS_OUT);
  expect(generated.format === 'ovs-node-walkthroughs', 'node-walkthroughs.json: wrong format');
  expect(generated.version === '0.1', 'node-walkthroughs.json: wrong version');
  expect(Array.isArray(generated.walkthroughs), 'node-walkthroughs.json: walkthroughs must be an array');
  expect(generated.walkthroughs.length === WALKTHROUGHS.length, 'node-walkthroughs.json: walkthrough count mismatch');
  const generatedByQuery = new Map((generated.walkthroughs || []).map(walkthrough => [walkthrough.query, walkthrough]));

  const refs = {
    brands: byId(readJson(BRAND_OUT).nodes),
    companies: byId(readJson(COMPANY_OUT).nodes),
    askIndex: readJson(ASK_OUT),
    lines: new Map((readJson(LINES_SRC).lines || []).map(line => [line.id, line])),
    items: itemMap()
  };

  for (const walkthrough of WALKTHROUGHS) checkWalkthrough(walkthrough, refs, generatedByQuery.get(walkthrough.query));

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log(`  walkthroughs: ${WALKTHROUGHS.length}`);
  console.log('  flagship paths: Nestle, Coca-Cola, Amazon');
  console.log('NODE WALKTHROUGH CHECKS PASS');
}

main();
