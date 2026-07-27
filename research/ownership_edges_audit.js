#!/usr/bin/env node
/* C2 ownership edge audit.

   The Weave can only make company/brand ownership useful if the edge file is
   current, reciprocal, and line filters agree with the explicit graph. This
   audit checks the C2 company set plus the two stale ownership corrections
   discovered during the pass: Kellanova -> Mars and Unilever's ice-cream/tea
   exits.
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];

const REQUIRED_COMPANIES = [
  'nestle',
  'pepsico',
  'coca-cola',
  'unilever',
  'danone',
  'mondelez',
  'mars',
  'kraft-heinz',
  'general-mills',
  'kellanova',
  'procter-and-gamble',
  'colgate-palmolive',
  'loreal',
  'kenvue',
  'alphabet',
  'meta',
  'microsoft',
  'amazon',
  'apple',
  'jpmorgan-chase',
];

const LINE_EXPECTS = {
  nestle: {
    line: 'avoid:nestle',
    aliases: ['nescafe', 'kitkat', 'maggi', 'purina', 'perrier', 'digiorno'],
    forbidden: [],
  },
  pepsico: {
    line: 'avoid:pepsico',
    aliases: ['pepsi', 'doritos', 'gatorade', 'quaker', 'sodastream', 'pure leaf'],
    forbidden: [],
  },
  'coca-cola': {
    line: 'avoid:coca-cola',
    aliases: ['coke', 'sprite', 'fanta', 'minute maid', 'topo chico', 'bodyarmor'],
    forbidden: [],
  },
  unilever: {
    line: 'avoid:unilever',
    aliases: ['dove', 'hellmanns', 'knorr', 'domestos', 'vaseline', 'rexona'],
    forbidden: ['ben & jerry', "ben & jerry's", 'magnum', 'lipton'],
  },
};

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function isUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function slugFromNode(id) {
  return String(id || '').split('/').pop();
}

function edgeKey(edge) {
  return `${edge.from}\u0000${edge.rel}\u0000${edge.to}`;
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

const edgeFile = readJson('app/edges.json');
if (edgeFile.format !== 'open-values-edges') fail('app/edges.json: format must be open-values-edges');
const edges = Array.isArray(edgeFile.edges) ? edgeFile.edges : [];
const edgeMap = new Map();

for (const edge of edges) {
  const key = edgeKey(edge);
  if (edgeMap.has(key)) fail(`duplicate edge ${edge.from} ${edge.rel} ${edge.to}`);
  edgeMap.set(key, edge);
  if (!edge.from || !edge.rel || !edge.to) fail(`malformed edge ${JSON.stringify(edge)}`);
}

const ownershipEdges = edges.filter((edge) =>
  edge.rel === 'owned-by'
  && edge.from.startsWith('ovs:brand/')
  && edge.to.startsWith('ovs:company/')
);

for (const edge of ownershipEdges) {
  if (!isUrl(edge.source)) fail(`${edge.from} -> ${edge.to}: ownership edge source must be an http(s) URL`);
  if (!edge.asof) fail(`${edge.from} -> ${edge.to}: ownership edge missing asof`);
  const reverse = edgeMap.get(`${edge.to}\u0000parent-of\u0000${edge.from}`);
  if (!reverse) fail(`${edge.from} -> ${edge.to}: missing reverse parent-of edge`);
  else {
    if (reverse.source !== edge.source) warn(`${edge.to} -> ${edge.from}: reverse source differs`);
    if (reverse.asof !== edge.asof) warn(`${edge.to} -> ${edge.from}: reverse asof differs`);
  }
}

for (const company of REQUIRED_COMPANIES) {
  const node = `ovs:company/${company}`;
  const outgoing = edges.filter((edge) => edge.from === node && edge.rel === 'parent-of');
  const incoming = edges.filter((edge) => edge.to === node && edge.rel === 'owned-by');
  if (!outgoing.length && !incoming.length) fail(`${node}: no C2 ownership coverage`);
}

if (!edgeMap.has('ovs:company/kellanova\u0000owned-by\u0000ovs:company/mars')) {
  fail('Kellanova should be marked owned-by Mars after the Dec. 11, 2025 acquisition close');
}

for (const stale of ['ovs:brand/ben-and-jerrys', 'ovs:brand/magnum', 'ovs:brand/lipton-tea']) {
  if (edgeMap.has(`${stale}\u0000owned-by\u0000ovs:company/unilever`)) {
    fail(`${stale}: stale Unilever owned-by edge remains`);
  }
}

const lines = readJson('content/lines.json').lines || [];
const byLine = new Map(lines.map((line) => [line.id, line]));
for (const [company, spec] of Object.entries(LINE_EXPECTS)) {
  const line = byLine.get(spec.line);
  if (!line) {
    fail(`missing line ${spec.line}`);
    continue;
  }
  const brands = new Set((line.brands || []).map((brand) => String(brand).toLowerCase()));
  for (const alias of spec.aliases) {
    if (!brands.has(alias)) fail(`${spec.line}: missing brand alias ${alias}`);
  }
  for (const alias of spec.forbidden) {
    if (brands.has(alias)) fail(`${spec.line}: stale brand alias ${alias}`);
  }
  const companyEdges = ownershipEdges.filter((edge) => slugFromNode(edge.to) === company);
  if (companyEdges.length < 5) fail(`${spec.line}: expected at least 5 ownership-backed brand edges, found ${companyEdges.length}`);
}

for (const warning of warnings) console.log(`  ! ${warning}`);
if (failures.length) {
  console.log('OWNERSHIP EDGES AUDIT FAILED');
  for (const failure of failures) console.log(`  FAIL ${failure}`);
  process.exit(1);
}

console.log(`OWNERSHIP EDGES AUDIT PASS - ${ownershipEdges.length} brand ownership edges, ${warnings.length} warning(s)`);
