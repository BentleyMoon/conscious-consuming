#!/usr/bin/env node
/* Build brand, company, and Ask node indexes from generated datasets and the
   sourced ownership graph. This is data-only: the app decides when to load it. */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const engine = require('../app/engine.js');

const ROOT = path.resolve(__dirname, '..');
const DATA_INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const EDGES_SRC = path.join(ROOT, 'app', 'edges.json');
const LINES_SRC = path.join(ROOT, 'content', 'lines.json');
const SYN_SRC = path.join(ROOT, 'content', 'synonyms.json');
const GUIDES_OUT = path.join(ROOT, 'app', 'guides.js');
const TAGS_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'tags.json');
const ERRANDS_OUT = path.join(ROOT, 'app', 'data', 'nodes', 'errands.json');
const OUT_DIR = path.join(ROOT, 'app', 'data', 'nodes');
const BRAND_OUT = path.join(OUT_DIR, 'brands.json');
const COMPANY_OUT = path.join(OUT_DIR, 'companies.json');
const ASK_OUT = path.join(OUT_DIR, 'ask-index.json');
const ASK_CORE_OUT = path.join(OUT_DIR, 'ask-core.json');
const AVOID_TOKENS_OUT = path.join(OUT_DIR, 'avoid-tokens.json');
const ASK_FIXTURES_OUT = path.join(OUT_DIR, 'ask-fixtures.json');
const ASK_TRACES_OUT = path.join(OUT_DIR, 'ask-traces.json');
const ASK_PRESENTATION_OUT = path.join(OUT_DIR, 'ask-presentation.json');
const NODE_WALKTHROUGHS_OUT = path.join(OUT_DIR, 'node-walkthroughs.json');
const NODE_PAGE_CONTRACTS_OUT = path.join(OUT_DIR, 'node-page-contracts.json');
const NODE_ROUTE_FIXTURES_OUT = path.join(OUT_DIR, 'node-route-fixtures.json');
const NODE_ROUTE_GUARDRAILS_OUT = path.join(OUT_DIR, 'node-route-guardrails.json');
const NODE_INTEGRATION_CHECKLIST_OUT = path.join(OUT_DIR, 'node-integration-checklist.json');
const NODE_LOAD_PLAN_OUT = path.join(OUT_DIR, 'node-load-plan.json');
const NODE_RUNTIME_STATES_OUT = path.join(OUT_DIR, 'node-runtime-states.json');
const NODE_PREVIEW_MATRIX_OUT = path.join(OUT_DIR, 'node-preview-matrix.json');
const READINESS_OUT = path.join(OUT_DIR, 'readiness.json');
const MANIFEST_OUT = path.join(OUT_DIR, 'manifest.json');
const ASK_INDEX_MAX_BYTES = 6000000;
const ASK_CORE_MAX_BYTES = 700000;
const ASK_CORE_MIN_HEADROOM_BYTES = 50000;

const ASK_STOP = new Set([
  'is', 'are', 'the', 'a', 'an', 'best', 'good', 'bad', 'cheapest', 'most',
  'more', 'should', 'i', 'my', 'me', 'for', 'to', 'of', 'in', 'on', 'near',
  'ethical', 'okay', 'ok', 'what', 'which', 'how', 'buy', 'get', 'find'
]);

const NON_BRAND_VALUES = new Set([
  '2fa authenticator',
  'browser',
  'browser defense',
  'browsing',
  'coding agent',
  'cloud storage',
  'commercial',
  'data broker removal',
  'email',
  'email aliases',
  'encrypted cloud storage',
  'file transfer',
  'generic',
  'local',
  'local first',
  'local-first',
  'mainstream',
  'major streaming',
  'maps',
  'messaging',
  'none',
  'not applicable',
  'official repair route',
  'open source',
  'open-source',
  'open-source coding agent',
  'open weights',
  'open web',
  'public library',
  'reusable',
  'reuse os',
  'search',
  'security-suite vpn',
  'self hosted',
  'self-hosted',
  'share',
  'unknown',
  'various',
  'workflow automation'
]);

const COMPANY_LABELS = new Map([
  ['alphabet', 'Alphabet / Google'],
  ['amazon', 'Amazon'],
  ['beneficial-state-foundation', 'Beneficial State Foundation'],
  ['colgate-palmolive', 'Colgate-Palmolive'],
  ['coca-cola', 'The Coca-Cola Company'],
  ['cvc-capital-partners', 'CVC Capital Partners'],
  ['gen-digital', 'Gen Digital'],
  ['jpmorgan-chase', 'JPMorgan Chase'],
  ['kape-technologies', 'Kape Technologies'],
  ['kellanova', 'Kellanova'],
  ['loreal', "L'Oreal"],
  ['lipton-teas-and-infusions', 'Lipton Teas and Infusions'],
  ['mars', 'Mars'],
  ['mcafee', 'McAfee'],
  ['meta', 'Meta'],
  ['microsoft', 'Microsoft'],
  ['mondelez', 'Mondelez International'],
  ['nestle', 'Nestle'],
  ['nord-security', 'Nord Security'],
  ['pepsico', 'PepsiCo'],
  ['procter-and-gamble', 'Procter & Gamble'],
  ['unilever', 'Unilever'],
  ['ziff-davis', 'Ziff Davis']
]);

const BRAND_LABELS = new Map([
  ['jpmorgan', 'JPMorgan'],
  ['jpmorgan-chase', 'JPMorgan Chase'],
  ['lipton-teas-and-infusions', 'Lipton Teas and Infusions']
]);

const ASK_TYPE_PRIORITY = new Map([
  ['company', 9],
  ['line', 8],
  ['category', 7],
  ['brand', 6],
  ['tag', 5],
  ['errand', 4],
  ['guide', 3],
  ['item', 2]
]);

const NODE_WALKTHROUGH_SPECS = [
  {
    id: 'nestle-concern-path',
    label: 'Nestle concern path',
    query: 'is nestle bad',
    company: 'ovs:company/nestle',
    line: 'ovs:line/avoid:nestle',
    brands: ['ovs:brand/nestle', 'ovs:brand/nescafe'],
    minCompanyBrands: 10,
    minCategories: 8,
    requiredLineTokens: ['nestle', 'nescafe', 'kitkat', 'maggi']
  },
  {
    id: 'coke-concern-path',
    label: 'Coke concern path',
    query: 'coke',
    company: 'ovs:company/coca-cola',
    line: 'ovs:line/avoid:coca-cola',
    brands: ['ovs:brand/coca-cola'],
    minCompanyBrands: 8,
    minCategories: 2,
    requiredLineTokens: ['coca-cola', 'coke', 'sprite', 'fanta']
  },
  {
    id: 'amazon-concern-path',
    label: 'Amazon concern path',
    query: 'avoid amazon',
    company: 'ovs:company/amazon',
    line: 'ovs:line/avoid:amazon',
    brands: ['ovs:brand/amazon'],
    minCompanyBrands: 8,
    minCategories: 3,
    requiredLineTokens: ['amazon', 'aws', 'audible', 'twitch']
  }
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function formatJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function jsonBytes(value) {
  return Buffer.byteLength(formatJson(value), 'utf8');
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function jsonSha256(value) {
  return sha256Text(formatJson(value));
}

function withAskIndexBudget(index) {
  const out = {
    ...index,
    loadHint: 'lazy-product-search',
    budget: {
      maxBytes: ASK_INDEX_MAX_BYTES,
      currentBytes: 0,
      withinBudget: false,
      measurement: 'UTF-8 bytes of the generated pretty JSON file',
      actionWhenExceeded: 'Shard the token and alias tables before app-owned code treats this as a single lazy fetch.'
    },
    shards: {
      status: 'not-needed',
      count: 1,
      files: ['ask-index.json'],
      hint: 'Single lazy file is allowed while currentBytes stays under maxBytes; add shard files only after the budget is exceeded.'
    }
  };
  for (let i = 0; i < 5; i += 1) {
    const currentBytes = jsonBytes(out);
    if (out.budget.currentBytes === currentBytes) break;
    out.budget.currentBytes = currentBytes;
    out.budget.withinBudget = currentBytes <= out.budget.maxBytes;
    out.shards.status = out.budget.withinBudget ? 'not-needed' : 'required';
    out.shards.hint = out.budget.withinBudget
      ? 'Single lazy file is allowed while currentBytes stays under maxBytes; add shard files only after the budget is exceeded.'
      : 'Budget exceeded: split token/alias tables into deterministic shard files and load only the matching shard.';
  }
  return out;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stripMarks(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeLoose(value) {
  return stripMarks(value)
    .replace(/&/g, ' and ')
    .replace(/[''`]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function askNormalize(value) {
  let text = String(value || '').toLowerCase();
  try {
    text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (err) {
    // Keep the raw lowercase string if normalization is unavailable.
  }
  const words = text
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(word => word && !ASK_STOP.has(word))
    .map(word => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) ? word.slice(0, -1) : word);
  return words.join(' ');
}

function askTypeOf(id) {
  if (String(id || '').startsWith('ovs:item/')) return 'item';
  if (String(id || '').startsWith('ovs:cat/')) return 'category';
  const match = String(id || '').match(/^ovs:([^/]+)\//);
  return match ? match[1] : 'unknown';
}

function askDist1(a, b) {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    const diff = [];
    for (let i = 0; i < la; i += 1) if (a[i] !== b[i]) diff.push(i);
    if (diff.length === 1) return true;
    return diff.length === 2
      && diff[1] === diff[0] + 1
      && a[diff[0]] === b[diff[1]]
      && a[diff[1]] === b[diff[0]];
  }
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (la > lb) i += 1;
    else j += 1;
  }
  return edits + (la - i) + (lb - j) <= 1;
}

function askTokenEqual(a, b) {
  return a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));
}

function askTokenContains(queryTokens, keyTokens) {
  if (!queryTokens.length || !keyTokens.length) return false;
  return keyTokens.every(kt => queryTokens.some(qt => askTokenEqual(qt, kt)))
    || queryTokens.every(qt => keyTokens.some(kt => askTokenEqual(qt, kt)));
}

function addAskCandidate(candidates, id, score, reason, key) {
  if (!id) return;
  const prior = candidates.get(id);
  if (!prior || score > prior.score) candidates.set(id, { id, score, reason, key });
}

function resolveAskQuery(query, askIndex, limit = 12) {
  const normalized = askNormalize(query);
  const queryTokens = normalized ? normalized.split(' ') : [];
  const candidates = new Map();
  const tokens = askIndex.tokens || {};
  const aliases = askIndex.aliases || {};

  if (aliases[normalized]) addAskCandidate(candidates, aliases[normalized], 120, 'alias', normalized);
  for (const id of tokens[normalized] || []) addAskCandidate(candidates, id, 110, 'exact', normalized);

  for (const token of queryTokens) {
    for (const id of tokens[token] || []) addAskCandidate(candidates, id, 95, 'query-token', token);
  }

  for (const [key, ids] of Object.entries(tokens)) {
    const keyTokens = key.split(' ').filter(Boolean);
    if (!keyTokens.length) continue;
    let score = 0;
    let reason = '';
    if (queryTokens.length === 1 && keyTokens.length === 1 && askDist1(queryTokens[0], keyTokens[0])) {
      score = 86;
      reason = 'fuzzy-1';
    } else if (askTokenContains(queryTokens, keyTokens)) {
      score = 76 - Math.abs(queryTokens.length - keyTokens.length);
      reason = 'token-containment';
    }
    if (!score) continue;
    for (const id of ids) addAskCandidate(candidates, id, score, reason, key);
  }

  return [...candidates.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const tp = (ASK_TYPE_PRIORITY.get(askTypeOf(b.id)) || 0) - (ASK_TYPE_PRIORITY.get(askTypeOf(a.id)) || 0);
      if (tp) return tp;
      return a.id.localeCompare(b.id);
    })
    .slice(0, limit);
}

function slugify(value) {
  return stripMarks(value)
    .replace(/&/g, ' and ')
    .replace(/[''`]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function titleFromSlug(slug, kind = 'company') {
  const mapped = kind === 'brand' ? BRAND_LABELS.get(slug) : COMPANY_LABELS.get(slug);
  if (mapped) return mapped;
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map(part => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(' ');
}

function stableBuiltDate() {
  const dates = [];
  for (const file of [LINES_SRC, TAGS_OUT, ERRANDS_OUT]) {
    if (!fs.existsSync(file)) continue;
    const data = readJson(file);
    if (typeof data.updated === 'string') dates.push(data.updated);
    if (typeof data.built === 'string') dates.push(data.built);
  }
  dates.sort();
  return dates[dates.length - 1] || '2026-07-07';
}

function sortedUnique(values) {
  return [...new Set(values.filter(value => value !== undefined && value !== null && String(value).trim() !== ''))]
    .map(value => String(value).trim())
    .sort((a, b) => a.localeCompare(b));
}

function bestDisplayLabel(counts, fallbackSlug) {
  const candidates = [...counts.entries()].filter(([label]) => label.trim());
  if (!candidates.length) return titleFromSlug(fallbackSlug);
  candidates.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    const scoreA = displayScore(a[0]);
    const scoreB = displayScore(b[0]);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a[0].localeCompare(b[0]);
  });
  return candidates[0][0].trim();
}

function displayScore(label) {
  let score = 0;
  if (/[A-Z]/.test(label)) score += 2;
  if (/[^\x00-\x7F]/.test(label)) score += 1;
  if (/[&.'-]/.test(label)) score += 1;
  if (label === label.toUpperCase() && label.length > 4) score -= 1;
  return score;
}

function loadCategories() {
  const index = readJson(DATA_INDEX);
  const categories = [];
  for (const [order, cat] of (index.categories || []).entries()) {
    const file = path.join(ROOT, 'app', 'data', cat.file || `${cat.id}.json`);
    if (!fs.existsSync(file)) continue;
    const data = readJson(file);
    categories.push({ ...cat, order, file, data, products: data.products || [] });
  }
  return categories;
}

function balancedScore(product, data) {
  const criteria = data.criteria || [];
  if (!criteria.length) return null;
  const weights = engine.themeDefaults(criteria, {}, data.key2theme || engine.KEY2THEME);
  const result = engine.score(product, { criteria, weights, excludes: new Set() });
  return result && Number.isFinite(result.score) ? result.score : null;
}

function isUsableBrand(raw) {
  const label = String(raw || '').trim();
  if (label.length < 2) return false;
  const norm = normalizeLoose(label);
  if (!norm || NON_BRAND_VALUES.has(norm)) return false;
  if (/^(n\/a|na|null|undefined)$/i.test(label)) return false;
  return true;
}

function itemId(cid, code) {
  return `ovs:item/${cid}/${String(code || '').trim()}`;
}

function routeForId(id) {
  const text = String(id || '');
  let match = text.match(/^ovs:item\/([^/]+)\/(.+)$/);
  if (match) {
    return {
      route: 'item',
      hash: `#item/${match[1]}/${encodeURIComponent(match[2])}`
    };
  }

  match = text.match(/^ovs:cat\/(.+)$/);
  if (match) {
    return {
      route: 'explore',
      hash: `#explore/${match[1]}`
    };
  }

  match = text.match(/^ovs:guide\/(.+)$/);
  if (match) {
    return {
      route: 'guide',
      hash: `#guide/${match[1]}`
    };
  }

  match = text.match(/^ovs:([^/]+)\/(.+)$/);
  if (match) {
    return {
      route: 'node',
      hash: `#n/${match[1]}/${encodeURIComponent(match[2])}`
    };
  }

  return null;
}

function edgeTail(id) {
  const text = String(id || '');
  const idx = text.lastIndexOf('/');
  return idx >= 0 ? text.slice(idx + 1) : text;
}

function companyIdFromEdge(id) {
  const slug = edgeTail(id);
  return slug ? `ovs:company/${slug}` : null;
}

function lineMap(linesSource) {
  const out = new Map();
  for (const line of linesSource.lines || []) {
    if (line.kind !== 'avoid') continue;
    const slug = slugify(line.entity || String(line.id || '').replace(/^avoid:/, ''));
    if (slug) out.set(slug, line.id);
  }
  return out;
}

function ownershipGraph(edgesSource) {
  const byBrand = new Map();
  const byCompany = new Map();

  for (const edge of edgesSource.edges || []) {
    if (edge.rel !== 'owned-by') continue;
    const fromSlug = edgeTail(edge.from);
    const companyId = companyIdFromEdge(edge.to);
    if (!fromSlug || !companyId) continue;
    const companySlug = edgeTail(companyId);
    const record = {
      from: edge.from,
      brandSlug: slugify(fromSlug),
      companyId,
      companySlug,
      source: edge.source || null,
      asof: edge.asof || null
    };
    if (record.brandSlug && !byBrand.has(record.brandSlug)) byBrand.set(record.brandSlug, record);
    if (!byCompany.has(companyId)) byCompany.set(companyId, []);
    byCompany.get(companyId).push(record);
  }

  return { byBrand, byCompany };
}

function collectBrands(categories) {
  const groups = new Map();
  let descriptorItems = 0;

  for (const cat of categories) {
    for (const product of cat.products) {
      const rawBrand = String(product.brand || '').trim();
      if (!isUsableBrand(rawBrand)) {
        if (rawBrand) descriptorItems += 1;
        continue;
      }
      const slug = slugify(rawBrand);
      if (!slug) continue;
      if (!groups.has(slug)) {
        groups.set(slug, {
          slug,
          rawCounts: new Map(),
          categories: new Set(),
          products: []
        });
      }
      const group = groups.get(slug);
      group.rawCounts.set(rawBrand, (group.rawCounts.get(rawBrand) || 0) + 1);
      group.categories.add(cat.id);
      group.products.push({ cat, product });
    }
  }

  return { groups, descriptorItems };
}

function brandAliases(group, label) {
  const labelNorm = normalizeLoose(label);
  const aliases = [];
  for (const raw of group.rawCounts.keys()) {
    if (raw !== label) aliases.push(raw);
  }
  const stripped = stripMarks(label).trim();
  if (stripped && normalizeLoose(stripped) === labelNorm && stripped !== label) aliases.push(stripped);
  const spacedSlug = group.slug.replace(/-/g, ' ');
  if (spacedSlug && normalizeLoose(spacedSlug) === labelNorm && normalizeLoose(spacedSlug) !== labelNorm) aliases.push(spacedSlug);
  return sortedUnique(aliases).slice(0, 12);
}

function buildBrandIndex(categories, ownership, built) {
  const { groups, descriptorItems } = collectBrands(categories);
  const orderByCat = new Map(categories.map(cat => [cat.id, cat.order]));
  const nodes = [];
  let longTail = 0;
  let longTailItems = 0;

  for (const group of groups.values()) {
    const itemCount = group.products.length;
    if (itemCount < 2) {
      longTail += 1;
      longTailItems += itemCount;
      continue;
    }

    const label = bestDisplayLabel(group.rawCounts, group.slug);
    const ranked = group.products
      .map(({ cat, product }) => ({
        cat: cat.id,
        code: String(product.code || ''),
        name: String(product.name || '').trim(),
        score: balancedScore(product, cat.data)
      }))
      .filter(top => top.code && top.name && top.score !== null)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name) || a.cat.localeCompare(b.cat))
      .slice(0, 3);

    nodes.push({
      id: `ovs:brand/${group.slug}`,
      type: 'brand',
      label,
      aliases: brandAliases(group, label),
      items: itemCount,
      categories: [...group.categories].sort((a, b) => (orderByCat.get(a) || 9999) - (orderByCat.get(b) || 9999) || a.localeCompare(b)),
      ownedBy: ownership.byBrand.get(group.slug)?.companyId || null,
      top: ranked
    });
  }

  nodes.sort((a, b) => b.items - a.items || a.label.localeCompare(b.label));

  return {
    format: 'ovs-node-index',
    type: 'brand',
    version: '0.1',
    built,
    minItems: 2,
    source: 'app/data/*.json',
    nodes,
    longTail,
    longTailItems,
    descriptorItems
  };
}

function chooseSource(records) {
  const counts = new Map();
  for (const record of records) {
    if (!record.source) continue;
    counts.set(record.source, (counts.get(record.source) || 0) + 1);
  }
  if (!counts.size) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function chooseAsof(records, source) {
  const dates = records
    .filter(record => !source || record.source === source)
    .map(record => record.asof)
    .filter(Boolean)
    .sort();
  return dates[dates.length - 1] || null;
}

function companyAliases(slug, label, line) {
  const aliases = new Set();
  const slugLabel = titleFromSlug(slug);
  if (normalizeLoose(slugLabel) !== normalizeLoose(label)) aliases.add(slugLabel);
  aliases.add(slug.replace(/-/g, ' '));
  if (line && normalizeLoose(line.label) !== normalizeLoose(label)) aliases.add(line.label);
  if (slug === 'alphabet') aliases.add('Google');
  if (slug === 'coca-cola') aliases.add('Coca Cola');
  if (slug === 'loreal') aliases.add("L'Oreal");
  if (slug === 'nestle') aliases.add('Nestle');
  return sortedUnique([...aliases].filter(alias => normalizeLoose(alias) !== normalizeLoose(label))).slice(0, 12);
}

function ownershipSources(records, brandsById) {
  return records
    .map(record => {
      const brandId = `ovs:brand/${record.brandSlug}`;
      const brandNode = brandsById.get(brandId);
      return {
        from: record.from,
        brand: brandNode ? brandId : null,
        brandName: brandNode ? brandNode.label : titleFromSlug(record.brandSlug, 'brand'),
        source: record.source || null,
        asof: record.asof || null
      };
    })
    .sort((a, b) => a.brandName.localeCompare(b.brandName) || a.from.localeCompare(b.from));
}

function companyReads(label, known, inCommons) {
  const knownWord = known === 1 ? 'brand' : 'brands';
  if (inCommons === 0) {
    return `Our ownership map links ${label} to ${known} ${knownWord}. None is in the current comparisons yet.`;
  }
  const appearWord = inCommons === 1 ? 'appears' : 'appear';
  return `Our ownership map links ${label} to ${known} ${knownWord}. ${inCommons} ${appearWord} in the current comparisons.`;
}

function buildCompanyIndex(ownership, brandIndex, linesSource, built) {
  const brandsById = new Map((brandIndex.nodes || []).map(node => [node.id, node]));
  const linesBySlug = lineMap(linesSource);
  const linesById = new Map((linesSource.lines || []).map(line => [line.id, line]));
  const nodes = [];

  for (const [companyId, records] of ownership.byCompany.entries()) {
    const slug = edgeTail(companyId);
    const lineId = linesBySlug.get(slug) || null;
    const line = lineId ? linesById.get(lineId) : null;
    const label = line?.label || titleFromSlug(slug);
    const brandIds = [];
    const brandNames = [];
    const categories = new Set();

    for (const record of records) {
      const brandId = `ovs:brand/${record.brandSlug}`;
      const brandNode = brandsById.get(brandId);
      if (brandNode) {
        brandIds.push(brandId);
        brandNames.push(brandNode.label);
        for (const cid of brandNode.categories || []) categories.add(cid);
      } else {
        brandNames.push(titleFromSlug(record.brandSlug, 'brand'));
      }
    }

    const source = chooseSource(records);
    const asof = chooseAsof(records, source);
    const inCommons = sortedUnique(brandIds).length;
    const known = sortedUnique(brandNames).length;

    nodes.push({
      id: companyId,
      type: 'company',
      label,
      aliases: companyAliases(slug, label, line),
      reads: companyReads(label, known, inCommons),
      brands: sortedUnique(brandIds),
      brandNames: sortedUnique(brandNames),
      ownershipSources: ownershipSources(records, brandsById),
      categories: sortedUnique([...categories]),
      line: lineId,
      source,
      asof
    });
  }

  nodes.sort((a, b) => a.label.localeCompare(b.label));

  return {
    format: 'ovs-node-index',
    type: 'company',
    version: '0.1',
    built,
    source: 'app/edges.json',
    nodes
  };
}

function loadGuides() {
  if (!fs.existsSync(GUIDES_OUT)) return [];
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(GUIDES_OUT, 'utf8'), sandbox, { filename: GUIDES_OUT });
  return Array.isArray(sandbox.window.CC_GUIDES) ? sandbox.window.CC_GUIDES : [];
}

function addToken(tokens, raw, id) {
  const key = askNormalize(raw);
  if (!key || !id) return;
  if (!tokens[key]) tokens[key] = [];
  if (!tokens[key].includes(id)) tokens[key].push(id);
}

function addAlias(aliases, raw, id) {
  const key = askNormalize(raw);
  if (!key || !id) return;
  if (!aliases[key]) aliases[key] = id;
}

function finalizeTokenTable(tokens) {
  const out = {};
  for (const key of Object.keys(tokens).sort()) {
    out[key] = tokens[key].sort((a, b) => a.localeCompare(b)).slice(0, 24);
  }
  return out;
}

function buildAskIndex(categories, brandIndex, companyIndex, linesSource, built) {
  const tokens = {};
  const aliases = {};
  let barcodeLikeItems = 0;
  const add = (raw, id, exact = true) => {
    addToken(tokens, raw, id);
    if (exact) addAlias(aliases, raw, id);
  };
  const addTerms = (terms, id) => {
    for (const term of terms || []) add(term, id);
  };

  for (const cat of categories) {
    const id = `ovs:cat/${cat.id}`;
    add(cat.label, id);
    add(cat.id.replace(/-/g, ' '), id);
  }

  if (fs.existsSync(SYN_SRC)) {
    const synonyms = readJson(SYN_SRC).synonyms || {};
    for (const [term, target] of Object.entries(synonyms)) add(term, target);
  }

  for (const cat of categories) {
    for (const product of cat.products) {
      const code = String(product.code || '').trim();
      const name = String(product.name || '').trim();
      if (!code || !name) continue;
      if (/^\d{8,14}$/.test(code)) barcodeLikeItems += 1;
      const id = itemId(cat.id, code);
      addToken(tokens, name, id);
      addToken(tokens, code, id);
      if (product.brand) addToken(tokens, `${product.brand} ${name}`, id);
    }
  }

  for (const node of brandIndex.nodes || []) {
    add(node.label, node.id);
    addTerms(node.aliases, node.id);
  }

  for (const node of companyIndex.nodes || []) {
    add(node.label, node.id);
    addTerms(node.aliases, node.id);
    for (const brandName of node.brandNames || []) addToken(tokens, brandName, node.id);
  }

  if (fs.existsSync(TAGS_OUT)) {
    const tags = readJson(TAGS_OUT);
    for (const node of tags.nodes || []) {
      add(node.label, node.id);
      addTerms(node.aliases, node.id);
    }
  }

  for (const line of linesSource.lines || []) {
    const id = `ovs:line/${line.id}`;
    add(line.label, id);
    add(String(line.id).replace(/^.*?:/, '').replace(/-/g, ' '), id);
    addTerms(line.accept, id);
    if (line.kind === 'avoid') {
      for (const brand of line.brands || []) addToken(tokens, brand, id);
    }
  }

  if (fs.existsSync(ERRANDS_OUT)) {
    const errands = readJson(ERRANDS_OUT);
    for (const node of errands.nodes || []) {
      add(node.label, node.id);
      addTerms(node.aliases, node.id);
    }
  }

  const guides = loadGuides();
  for (const guide of guides) {
    const id = `ovs:guide/${guide.slug}`;
    add(guide.title, id);
    add(String(guide.slug || '').replace(/-/g, ' '), id);
    if (guide.category) addToken(tokens, guide.category, id);
  }

  const tokenTable = finalizeTokenTable(tokens);
  const aliasTable = {};
  for (const key of Object.keys(aliases).sort()) aliasTable[key] = aliases[key];

  return {
    format: 'ovs-ask-index',
    version: '0.1',
    built,
    source: [
      'app/data/index.json',
      'app/data/*.json',
      'app/data/nodes/brands.json',
      'app/data/nodes/companies.json',
      'app/data/nodes/tags.json',
      'app/data/nodes/errands.json',
      'content/lines.json',
      'content/synonyms.json',
      'app/guides.js'
    ],
    tokens: tokenTable,
    aliases: aliasTable,
    stats: {
      tokens: Object.keys(tokenTable).length,
      aliases: Object.keys(aliasTable).length,
      categories: categories.length,
      items: categories.reduce((sum, cat) => sum + cat.products.length, 0),
      barcodeLikeItems,
      brands: (brandIndex.nodes || []).length,
      companies: (companyIndex.nodes || []).length,
      guides: guides.length
    }
  };
}

function extensionToken(value) {
  return normalizeLoose(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function safeExtensionTokens(values) {
  const out = new Set();
  for (const value of values || []) {
    const token = extensionToken(value);
    if (!token) continue;
    if (!/^[a-z0-9 ]+$/.test(token)) continue;
    if (token.length < 2 || token.length > 64) continue;
    out.add(token);
  }
  return [...out].sort((a, b) => a.localeCompare(b));
}

function buildAvoidTokens(linesSource, companyIndex, built) {
  const companiesByLine = new Map();
  for (const company of companyIndex.nodes || []) {
    if (company.line) companiesByLine.set(company.line, company);
  }

  const families = [];
  for (const line of linesSource.lines || []) {
    if (line.kind !== 'avoid') continue;
    const company = companiesByLine.get(line.id);
    const rawTokens = [
      line.entity,
      line.label,
      ...(line.brands || []),
      ...(company?.brandNames || []),
      ...(company?.aliases || [])
    ];
    const tokens = safeExtensionTokens(rawTokens);
    families.push({
      id: line.id,
      line: `ovs:line/${line.id}`,
      label: stripMarks(line.label || line.id),
      entity: extensionToken(line.entity || String(line.id).replace(/^avoid:/, '')),
      tokens,
      tokenCount: tokens.length,
      source: 'content/lines.json + app/data/nodes/companies.json',
      sourceLineBrands: (line.brands || []).length,
      sourceCompanyBrands: (company?.brandNames || []).length
    });
  }

  families.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
  const tokenTotal = families.reduce((sum, family) => sum + family.tokens.length, 0);
  const uniqueTokens = new Set(families.flatMap(family => family.tokens));

  return {
    format: 'ovs-avoid-token-index',
    version: '0.1',
    built,
    source: [
      'content/lines.json',
      'app/data/nodes/companies.json'
    ],
    purpose: 'Compact avoid-line token export for browser-extension and line tooling. Tokens are plain ASCII, lowercase, deduped per family, and drawn from the same line/company truth the app audits.',
    matching: {
      normalization: 'lowercase, strip accents, remove punctuation, collapse spaces',
      boundary: 'Consumers should match tokens on word boundaries or equivalent folded-token boundaries.',
      appLaneNote: 'Data contract only; app-owned code or extensions decide runtime matching UI and failure states.'
    },
    families,
    stats: {
      families: families.length,
      tokens: tokenTotal,
      uniqueTokens: uniqueTokens.size,
      bytes: 0
    }
  };
}

function coreAskTarget(id) {
  return typeof id === 'string' && !id.startsWith('ovs:item/');
}

function addCoreTarget(targets, wanted, id, type, label) {
  if (!coreAskTarget(id) || !wanted.has(id) || targets[id]) return;
  const target = {
    type,
    label: String(label || '').trim() || id
  };
  const route = routeForId(id);
  if (route) {
    target.hash = route.hash;
  }
  targets[id] = target;
}

function buildAskCoreIndex(askIndex, categories, brandIndex, companyIndex, linesSource, built) {
  const tokens = {};
  const aliases = {};
  const wanted = new Set();

  for (const [key, ids] of Object.entries(askIndex.tokens || {})) {
    const filtered = (ids || []).filter(coreAskTarget);
    if (!filtered.length) continue;
    tokens[key] = filtered;
    for (const id of filtered) wanted.add(id);
  }

  for (const [key, id] of Object.entries(askIndex.aliases || {})) {
    if (!coreAskTarget(id)) continue;
    aliases[key] = id;
    wanted.add(id);
  }

  // Store each exact line term only once. A line-only term keeps its direct
  // alias; a shared word such as "milk" keeps its multi-target token posting.
  // Either representation resolves the line, without duplicating the route.
  for (const [key, id] of Object.entries(aliases)) {
    const hits = tokens[key] || [];
    if (!id.startsWith('ovs:line/') || !hits.includes(id)) continue;
    if (hits.length === 1) delete tokens[key];
    else delete aliases[key];
  }

  const targets = {};

  for (const cat of categories) {
    addCoreTarget(targets, wanted, `ovs:cat/${cat.id}`, 'category', cat.label);
  }

  for (const node of brandIndex.nodes || []) {
    addCoreTarget(targets, wanted, node.id, 'brand', node.label);
  }

  for (const node of companyIndex.nodes || []) {
    addCoreTarget(targets, wanted, node.id, 'company', node.label);
  }

  if (fs.existsSync(TAGS_OUT)) {
    const tags = readJson(TAGS_OUT);
    for (const node of tags.nodes || []) {
      addCoreTarget(targets, wanted, node.id, 'tag', node.label);
    }
  }

  if (fs.existsSync(ERRANDS_OUT)) {
    const errands = readJson(ERRANDS_OUT);
    for (const node of errands.nodes || []) {
      addCoreTarget(targets, wanted, node.id, 'errand', node.label);
    }
  }

  for (const line of linesSource.lines || []) {
    const id = `ovs:line/${line.id}`;
    addCoreTarget(targets, wanted, id, 'line', `${line.kind === 'avoid' ? 'Avoid ' : ''}${line.label}`);
  }

  for (const guide of loadGuides()) {
    addCoreTarget(targets, wanted, `ovs:guide/${guide.slug}`, 'guide', guide.title);
  }

  const orderedTargets = {};
  for (const id of Object.keys(targets).sort()) orderedTargets[id] = targets[id];

  const coreIndex = {
    format: 'ovs-ask-core-index',
    type: 'ask-core',
    version: '0.1',
    built,
    source: [
      'app/data/nodes/ask-index.json',
      'app/data/index.json',
      'app/data/nodes/brands.json',
      'app/data/nodes/companies.json',
      'app/data/nodes/tags.json',
      'app/data/nodes/errands.json',
      'content/lines.json',
      'app/guides.js'
    ],
    strategy: 'Startup-friendly search.',
    targetFields: ['type', 'label', 'hash'],
    tokens,
    aliases,
    targets: orderedTargets,
    stats: {
      tokens: Object.keys(tokens).length,
      aliases: Object.keys(aliases).length,
      targets: Object.keys(orderedTargets).length,
      fullTokens: Object.keys(askIndex.tokens || {}).length,
      fullAliases: Object.keys(askIndex.aliases || {}).length
    }
  };

  return withAskCoreStartupContract(coreIndex, categories, brandIndex, companyIndex, linesSource);
}

function withAskCoreStartupContract(coreIndex, categories, brandIndex, companyIndex, linesSource) {
  let out = { ...coreIndex };
  for (let i = 0; i < 5; i += 1) {
    const currentBytes = jsonBytes(out);
    const next = {
      ...coreIndex,
      startupContract: buildAskCoreStartupContract(out, categories, brandIndex, companyIndex, linesSource, currentBytes)
    };
    if (jsonBytes(next) === currentBytes && formatJson(next.startupContract) === formatJson(out.startupContract || {})) return next;
    out = next;
  }
  return out;
}

function buildAskCoreStartupContract(coreIndex, categories, brandIndex, companyIndex, linesSource, currentBytes) {
  const labels = buildAskTraceLabels(categories, brandIndex, companyIndex, linesSource);
  const coreCases = askFixtureCases(categories).filter(test => test.layer === 'core');
  const headroomBytes = ASK_CORE_MAX_BYTES - currentBytes;

  function compactHit(hit) {
    const route = routeForId(hit.id);
    return {
      id: hit.id,
      label: labels.get(hit.id) || hit.id,
      type: askTypeOf(hit.id),
      hash: route ? route.hash : null,
      score: hit.score,
      reason: hit.reason,
      key: hit.key
    };
  }

  const goldenQueries = coreCases.map(test => {
    const limit = Math.max(5, test.expectOneInTop || 5);
    const top = resolveAskQuery(test.query, coreIndex, limit).slice(0, limit).map(compactHit);
    const matched = top.find(hit => (test.expectAny || []).includes(hit.id)) || null;
    const matchedRank = matched ? top.findIndex(hit => hit.id === matched.id) + 1 : null;
    const orderingAssertions = test.orderingAssertions || [];
    const orderingChecks = buildAskOrderingChecks(top, orderingAssertions);
    const ok = Number.isInteger(matchedRank) && matchedRank <= (test.expectOneInTop || 5) && orderingChecks.every(check => check.ok);
    return {
      query: test.query,
      normalized: test.normalized,
      intent: test.intent,
      expectAny: test.expectAny || [],
      expectOneInTop: test.expectOneInTop || 5,
      matched: matched ? matched.id : null,
      matchedRank,
      expectFirstHash: top[0]?.hash || null,
      expectMatchedHash: matched?.hash || null,
      orderingAssertions,
      orderingChecks,
      ok,
      top
    };
  });

  return {
    purpose: 'Startup Ask contract.',
    appLaneNote: 'App-owned.',
    loadHint: 'eager-search',
    budget: {
      maxBytes: ASK_CORE_MAX_BYTES,
      currentBytes,
      minimumHeadroomBytes: ASK_CORE_MIN_HEADROOM_BYTES,
      headroomBytes,
      withinBudget: currentBytes < ASK_CORE_MAX_BYTES,
      hasMinimumHeadroom: headroomBytes >= ASK_CORE_MIN_HEADROOM_BYTES,
      measurement: 'UTF-8.'
    },
    covers: {
      layer: 'core',
      targetTypes: ['category', 'brand', 'company', 'tag', 'guide', 'errand', 'line'],
      deferredTargetTypes: ['item'],
      targetFields: ['type', 'label', 'hash']
    },
    resolver: {
      normalization: 'lowercase, unaccent, strip punctuation, collapse spaces',
      stopWords: [...ASK_STOP].sort((a, b) => a.localeCompare(b)),
      rankOrder: ['alias', 'exact', 'query-token', 'fuzzy-1', 'token-containment', 'type-priority'],
      maxStartupResults: 5
    },
    lazyBoundary: {
      file: 'ask-index.json',
      loadHint: 'lazy-product-search',
      use: 'Products/barcodes.',
      trigger: 'Product/barcode/deeper search.',
      keepCoreIfLazyFails: true,
      failureMode: 'Keep core on lazy failure.'
    },
    emptyState: {
      when: 'No core results.',
      primary: '#contribute/want/<query>',
      secondary: '#browse',
      mustNot: 'No invention or eager ask-index.'
    },
    goldenQueries
  };
}

function askFixtureCases(categories) {
  const cases = [
    {
      query: 'is nestle bad',
      intent: 'company/brand concern',
      layer: 'core',
      expectAny: ['ovs:company/nestle', 'ovs:line/avoid:nestle', 'ovs:brand/nestle']
    },
    {
      query: 'vegan cheese',
      intent: 'multi-intent food query',
      layer: 'core',
      expectAny: ['ovs:cat/cheese', 'ovs:tag/vegan']
    },
    {
      query: 'best bank',
      intent: 'plain category question',
      layer: 'core',
      expectAny: ['ovs:cat/banking', 'ovs:errand/pick-a-bank']
    },
    {
      query: 'coke',
      intent: 'everyday brand alias',
      layer: 'core',
      expectAny: ['ovs:company/coca-cola', 'ovs:line/avoid:coca-cola', 'ovs:brand/coca-cola']
    },
    {
      query: 'nestel',
      intent: 'single-edit typo',
      layer: 'core',
      expectAny: ['ovs:company/nestle', 'ovs:brand/nestle', 'ovs:line/avoid:nestle'],
      orderingAssertions: [
        {
          id: 'typo-before-loose-containment',
          winnerReason: 'fuzzy-1',
          winnerAny: ['ovs:company/nestle', 'ovs:brand/nestle', 'ovs:line/avoid:nestle'],
          loserReason: 'token-containment',
          note: 'Single-edit typo results must rank before loose containment matches such as Nest.'
        }
      ]
    },
    {
      query: 'is oatly ethical',
      intent: 'question scaffolding strips away',
      layer: 'core',
      expectAny: ['ovs:brand/oatly']
    },
    {
      query: 'best password manager',
      intent: 'digital category',
      layer: 'core',
      expectAny: ['ovs:cat/password-managers']
    },
    {
      query: 'avoid amazon',
      intent: 'line/company action intent',
      layer: 'core',
      expectAny: ['ovs:company/amazon', 'ovs:line/avoid:amazon', 'ovs:brand/amazon']
    },
    {
      query: 'b corp toilet paper',
      intent: 'tag plus household language',
      layer: 'core',
      expectAny: ['ovs:tag/b-corp', 'ovs:cat/paper-goods']
    },
    {
      query: 'washing up liquid',
      intent: 'regional synonym',
      layer: 'core',
      expectAny: ['ovs:cat/dish-soap']
    },
    {
      query: 'cell phone',
      intent: 'common synonym',
      layer: 'core',
      expectAny: ['ovs:cat/phones']
    },
    {
      query: 'private messaging app',
      intent: 'guide-style question',
      layer: 'core',
      expectAny: ['ovs:guide/private-messaging', 'ovs:cat/digital-services']
    }
  ];

  const sodaCat = categories.find(cat => cat.id === 'soda');
  const sodaProduct = sodaCat && (
    (sodaCat.products || []).find(product => /coca|coke/i.test(`${product.brand || ''} ${product.name || ''}`))
    || (sodaCat.products || [])[0]
  );
  if (sodaCat && sodaProduct?.code) {
    cases.push({
      query: String(sodaProduct.code),
      intent: 'barcode routes to an item',
      layer: 'full',
      expectAny: [itemId(sodaCat.id, sodaProduct.code)]
    });
  }

  return cases.map(test => ({
    ...test,
    normalized: askNormalize(test.query),
    expectOneInTop: 5
  }));
}

function buildAskFixtures(categories, built) {
  const cases = askFixtureCases(categories);
  return {
    format: 'ovs-ask-fixtures',
    version: '0.1',
    built,
    source: 'pipeline/build_nodes.js',
    purpose: 'Golden resolver contract for app-owned Ask integration; not a runtime dataset.',
    resolverOrder: [
      'exact-alias',
      'exact-token',
      'query-token',
      'edit-distance',
      'token-containment',
      'type-priority'
    ],
    layers: [
      {
        layer: 'core',
        file: 'ask-core.json',
        use: 'startup/category-brand-company-guide search'
      },
      {
        layer: 'full',
        file: 'ask-index.json',
        use: 'lazy product-name and barcode search'
      }
    ],
    cases
  };
}

function buildAskTraceLabels(categories, brandIndex, companyIndex, linesSource) {
  const labels = new Map();
  const add = (id, label) => {
    if (id && label && !labels.has(id)) labels.set(id, String(label));
  };

  for (const cat of categories) {
    add(`ovs:cat/${cat.id}`, cat.label);
    for (const product of cat.products || []) {
      const code = String(product.code || '').trim();
      if (code) add(itemId(cat.id, code), product.name);
    }
  }

  for (const node of brandIndex.nodes || []) add(node.id, node.label);
  for (const node of companyIndex.nodes || []) add(node.id, node.label);

  if (fs.existsSync(TAGS_OUT)) {
    const tags = readJson(TAGS_OUT);
    for (const node of tags.nodes || []) add(node.id, node.label);
  }

  if (fs.existsSync(ERRANDS_OUT)) {
    const errands = readJson(ERRANDS_OUT);
    for (const node of errands.nodes || []) add(node.id, node.label);
  }

  for (const line of linesSource.lines || []) {
    add(`ovs:line/${line.id}`, `${line.kind === 'avoid' ? 'Avoid ' : ''}${line.label}`);
  }

  for (const guide of loadGuides()) add(`ovs:guide/${guide.slug}`, guide.title);

  return labels;
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

function buildAskTraces(askFixturesIndex, askIndex, askCoreIndex, categories, brandIndex, companyIndex, linesSource, built) {
  const labels = buildAskTraceLabels(categories, brandIndex, companyIndex, linesSource);
  const traces = [];

  for (const test of askFixturesIndex.cases || []) {
    const index = test.layer === 'core' ? askCoreIndex : askIndex;
    const file = test.layer === 'core' ? 'ask-core.json' : 'ask-index.json';
    const top = resolveAskQuery(test.query, index, 12)
      .slice(0, Math.max(5, test.expectOneInTop || 5))
      .map(hit => ({
        id: hit.id,
        label: labels.get(hit.id) || hit.id,
        type: askTypeOf(hit.id),
        route: routeForId(hit.id)?.route || null,
        hash: routeForId(hit.id)?.hash || null,
        score: hit.score,
        reason: hit.reason,
        key: hit.key
      }));
    const matched = top.find(hit => (test.expectAny || []).includes(hit.id)) || null;
    const matchedRank = matched ? top.findIndex(hit => hit.id === matched.id) + 1 : null;
    const orderingAssertions = test.orderingAssertions || [];
    const orderingChecks = buildAskOrderingChecks(top, orderingAssertions);
    const orderingOk = orderingChecks.every(check => check.ok);

    traces.push({
      query: test.query,
      normalized: test.normalized,
      intent: test.intent,
      layer: test.layer,
      file,
      expectAny: test.expectAny || [],
      expectOneInTop: test.expectOneInTop || 5,
      orderingAssertions,
      matched: matched ? matched.id : null,
      matchedRank,
      orderingChecks,
      ok: Number.isInteger(matchedRank) && matchedRank <= (test.expectOneInTop || 5) && orderingOk,
      top
    });
  }

  return {
    format: 'ovs-ask-traces',
    version: '0.1',
    built,
    source: [
      'app/data/nodes/ask-fixtures.json',
      'app/data/nodes/ask-core.json',
      'app/data/nodes/ask-index.json'
    ],
    purpose: 'Deterministic resolver traces for app-owned Ask integration and visual QA.',
    resolverModel: 'pipeline/build_nodes.js resolveAskQuery',
    traces
  };
}

function buildAskPresentation(askTracesIndex, built) {
  return {
    format: 'ovs-ask-presentation-contract',
    version: '0.1',
    built,
    source: [
      'app/data/nodes/ask-core.json',
      'app/data/nodes/ask-index.json',
      'app/data/nodes/ask-traces.json'
    ],
    purpose: 'Suggested presentation contract for app-owned Ask integration; copy, layout, and interaction remain app-owned.',
    appLaneNote: 'Use as a dev contract, not a hard UI mandate.',
    resultSections: [
      {
        id: 'places',
        label: 'Places this could mean',
        layers: ['core'],
        targetTypes: ['category', 'brand', 'company', 'tag', 'guide', 'errand', 'line'],
        maxItems: 5
      },
      {
        id: 'entries',
        label: 'Entries and barcodes',
        layers: ['full'],
        targetTypes: ['item'],
        maxItems: 5
      }
    ],
    typeCopy: {
      category: { badge: 'Category', action: 'Compare options', route: '#explore/<cid>' },
      guide: { badge: 'Guide', action: 'Read guide', route: '#guide/<slug>' },
      brand: { badge: 'Brand', action: 'Open brand page', route: '#n/brand/<slug>' },
      company: { badge: 'Company', action: 'Open company page', route: '#n/company/<slug>' },
      tag: { badge: 'Label', action: 'Open label page', route: '#n/tag/<slug>' },
      line: { badge: 'Line', action: 'Open line', route: '#n/line/<slug>' },
      errand: { badge: 'Errand', action: 'Open errand', route: '#n/errand/<slug>' },
      item: { badge: 'Entry', action: 'Open verdict', route: '#item/<cid>/<code>' }
    },
    matchReasons: {
      alias: 'direct alias',
      exact: 'exact match',
      'query-token': 'word match',
      'fuzzy-1': 'typo match',
      'token-containment': 'related phrase'
    },
    emptyState: {
      title: 'We do not cover this yet.',
      primary: '#contribute/want/<query>',
      primaryAction: 'Request this',
      secondary: '#browse',
      secondaryAction: 'Browse the commons'
    },
    qaCases: (askTracesIndex.traces || []).map(trace => ({
      query: trace.query,
      section: trace.layer === 'full' ? 'entries' : 'places',
      expectFirstHash: (trace.top && trace.top[0] && trace.top[0].hash) || null,
      expectMatchedHash: trace.matched
        ? ((trace.top || []).find(row => row.id === trace.matched)?.hash || null)
        : null,
      orderingChecks: trace.orderingChecks || [],
      ok: trace.ok
    }))
  };
}

function lineTokens(line) {
  return new Set((line?.brands || []).map(token => String(token).toLowerCase()));
}

function compactRoute(id) {
  const route = routeForId(id);
  return route ? route.hash : null;
}

function walkTopResults(query, askCoreIndex, labels) {
  return resolveAskQuery(query, askCoreIndex, 8).map(hit => ({
    id: hit.id,
    label: labels.get(hit.id) || hit.id,
    type: askTypeOf(hit.id),
    hash: compactRoute(hit.id),
    score: hit.score,
    reason: hit.reason
  }));
}

function buildNodeWalkthroughs(categories, askCoreIndex, brandIndex, companyIndex, linesSource, built) {
  const labels = buildAskTraceLabels(categories, brandIndex, companyIndex, linesSource);
  const categoryLabels = new Map(categories.map(cat => [cat.id, cat.label]));
  const brandsById = new Map((brandIndex.nodes || []).map(node => [node.id, node]));
  const companiesById = new Map((companyIndex.nodes || []).map(node => [node.id, node]));
  const linesById = new Map((linesSource.lines || []).map(line => [`ovs:line/${line.id}`, line]));

  const walkthroughs = NODE_WALKTHROUGH_SPECS.map(spec => {
    const company = companiesById.get(spec.company) || null;
    const line = linesById.get(spec.line) || null;
    const tokens = lineTokens(line);
    const askTop = walkTopResults(spec.query, askCoreIndex, labels);
    const expectedAskIds = new Set([spec.company, spec.line, ...(spec.brands || [])]);
    const matchedTop = askTop.find(row => expectedAskIds.has(row.id)) || null;
    const brands = (spec.brands || []).map(id => {
      const brand = brandsById.get(id);
      if (!brand) return { id, missing: true };
      return {
        id: brand.id,
        label: brand.label,
        hash: compactRoute(brand.id),
        ownedBy: brand.ownedBy || null,
        items: brand.items || 0,
        categories: (brand.categories || []).map(cid => ({
          id: cid,
          label: categoryLabels.get(cid) || cid,
          hash: `#explore/${cid}`
        })),
        top: (brand.top || []).map(item => ({
          cat: item.cat,
          category: categoryLabels.get(item.cat) || item.cat,
          code: item.code,
          name: item.name,
          score: item.score,
          hash: `#item/${item.cat}/${encodeURIComponent(item.code)}`
        }))
      };
    });

    const sourceBrands = new Set(spec.brands || []);
    const receiptSamples = (company?.ownershipSources || [])
      .filter(source => sourceBrands.has(source.brand))
      .slice(0, 6)
      .map(source => ({
        brand: source.brand,
        brandName: source.brandName,
        source: source.source,
        asof: source.asof
      }));

    const companyCategories = (company?.categories || []).map(cid => ({
      id: cid,
      label: categoryLabels.get(cid) || cid,
      hash: `#explore/${cid}`
    }));

    const foundLineTokens = (spec.requiredLineTokens || []).filter(token => tokens.has(token));
    const checks = {
      askHitsExpectedTarget: !!matchedTop,
      companyPresent: !!company,
      linePresent: !!line,
      requiredBrandsPresent: brands.every(brand => !brand.missing),
      brandsOwnedByCompany: brands.every(brand => brand.missing || brand.ownedBy === spec.company),
      companyBrandNamesAtLeast: company ? (company.brandNames || []).length >= spec.minCompanyBrands : false,
      companyCategoriesAtLeast: company ? (company.categories || []).length >= spec.minCategories : false,
      ownershipReceiptsPresent: company ? (company.ownershipSources || []).length >= spec.minCompanyBrands : false,
      lineTokensPresent: foundLineTokens.length === (spec.requiredLineTokens || []).length,
      lineHasWhyUrl: /^https?:\/\//.test(String(line?.why || '')),
      brandTopProductsPresent: brands.every(brand => brand.missing || (brand.top || []).length > 0)
    };

    return {
      id: spec.id,
      label: spec.label,
      query: spec.query,
      purpose: 'First-use QA path: Ask concern query -> company/brand node -> ownership receipts -> product examples -> optional avoid line.',
      expected: {
        company: spec.company,
        line: spec.line,
        brands: spec.brands,
        minCompanyBrands: spec.minCompanyBrands,
        minCategories: spec.minCategories,
        requiredLineTokens: spec.requiredLineTokens
      },
      askTop,
      matchedTop: matchedTop ? matchedTop.id : null,
      pages: {
        company: company ? {
          id: company.id,
          label: company.label,
          hash: compactRoute(company.id),
          reads: company.reads,
          brandNames: (company.brandNames || []).slice(0, 18),
          brandNameCount: (company.brandNames || []).length,
          brandsInCommons: (company.brands || []).length,
          categories: companyCategories,
          line: company.line ? `ovs:line/${company.line}` : null,
          source: company.source || null,
          asof: company.asof || null,
          ownershipReceiptCount: (company.ownershipSources || []).length,
          receiptSamples
        } : null,
        line: line ? {
          id: spec.line,
          label: labels.get(spec.line) || line.label,
          hash: compactRoute(spec.line),
          reads: line.reads || null,
          why: line.why || null,
          requiredTokensFound: foundLineTokens,
          knownBrandTokenCount: (line.brands || []).length
        } : null,
        brands
      },
      checks
    };
  });

  return {
    format: 'ovs-node-walkthroughs',
    version: '0.1',
    built,
    source: [
      'app/data/nodes/ask-core.json',
      'app/data/nodes/brands.json',
      'app/data/nodes/companies.json',
      'content/lines.json'
    ],
    purpose: 'Generated flagship node/Ask walkthrough contracts for app-owned QA and preview demos.',
    appLaneNote: 'Use as dev-contract test data; app-owned code decides rendering and interaction.',
    walkthroughs
  };
}

function sampleByIds(nodes, ids, limit = 3) {
  const byId = new Map((nodes || []).map(node => [node.id || node.slug || node.code || node.id, node]));
  const out = [];
  for (const id of ids || []) {
    const node = byId.get(id);
    if (node) out.push(node);
  }
  for (const node of nodes || []) {
    if (out.length >= limit) break;
    if (!out.includes(node)) out.push(node);
  }
  return out.slice(0, limit);
}

function compactNodeExample(node) {
  if (!node) return null;
  const id = node.id || (node.slug ? `ovs:guide/${node.slug}` : null);
  return {
    id,
    label: node.label || node.title || node.name || id,
    hash: id ? compactRoute(id) : null
  };
}

function compactCategoryExample(cat) {
  return {
    id: `ovs:cat/${cat.id}`,
    label: cat.label,
    hash: `#explore/${cat.id}`,
    count: cat.n || (cat.products || []).length || 0,
    domain: cat.domain || null
  };
}

function compactItemExample(cat, product) {
  const code = String(product?.code || '').trim();
  if (!cat || !code) return null;
  return {
    id: itemId(cat.id, code),
    label: product.name || code,
    hash: `#item/${cat.id}/${encodeURIComponent(code)}`,
    category: cat.label,
    categoryId: cat.id,
    brand: product.brand || null
  };
}

function buildNodePageContracts(categories, brandIndex, companyIndex, linesSource, built) {
  const tags = fs.existsSync(TAGS_OUT) ? readJson(TAGS_OUT) : { nodes: [] };
  const errands = fs.existsSync(ERRANDS_OUT) ? readJson(ERRANDS_OUT) : { nodes: [] };
  const guides = loadGuides();
  const lines = linesSource.lines || [];
  const categoryExamples = sampleByIds(categories.map(cat => ({ ...cat, id: cat.id })), ['banking', 'password-managers', 'soda'])
    .map(compactCategoryExample);
  const itemCategory = categories.find(cat => cat.id === 'soda') || categories.find(cat => (cat.products || []).length);
  const itemProduct = itemCategory && (
    (itemCategory.products || []).find(product => /coca|coke/i.test(`${product.brand || ''} ${product.name || ''}`))
    || (itemCategory.products || [])[0]
  );
  const itemExamples = [compactItemExample(itemCategory, itemProduct)].filter(Boolean);

  function contract({ type, routePattern, source, requiredFields, optionalFields = [], sections, examples, notes = [] }) {
    return {
      type,
      routePattern,
      source,
      requiredFields,
      optionalFields,
      sections,
      examples: examples
        .filter(Boolean)
        .map(example => ({
          id: example.id,
          label: example.label,
          hash: example.hash,
          count: example.count,
          domain: example.domain,
          category: example.category,
          categoryId: example.categoryId,
          brand: example.brand
        }))
        .map(example => Object.fromEntries(Object.entries(example).filter(([, value]) => value !== undefined && value !== null))),
      notes
    };
  }

  const brandExamples = sampleByIds(brandIndex.nodes || [], ['ovs:brand/nestle', 'ovs:brand/coca-cola', 'ovs:brand/amazon'])
    .map(compactNodeExample);
  const companyExamples = sampleByIds(companyIndex.nodes || [], ['ovs:company/nestle', 'ovs:company/coca-cola', 'ovs:company/amazon'])
    .map(compactNodeExample);
  const tagExamples = sampleByIds(tags.nodes || [], ['ovs:tag/organic', 'ovs:tag/vegan', 'ovs:tag/open-source'])
    .map(compactNodeExample);
  const errandExamples = sampleByIds(errands.nodes || [], ['ovs:errand/pick-a-bank', 'ovs:errand/new-phone-sanely', 'ovs:errand/private-digital-life'])
    .map(compactNodeExample);
  const lineExamples = sampleByIds(lines.map(line => ({ ...line, id: `ovs:line/${line.id}` })), ['ovs:line/avoid:nestle', 'ovs:line/avoid:coca-cola', 'ovs:line/require:open-source'])
    .map(line => ({
      id: line.id,
      label: `${line.kind === 'avoid' ? 'Avoid ' : ''}${line.label}`,
      hash: compactRoute(line.id)
    }));
  const guideExamples = sampleByIds(guides.map(guide => ({ ...guide, id: `ovs:guide/${guide.slug}`, label: guide.title })), ['ovs:guide/ethical-banking', 'ovs:guide/password-managers', 'ovs:guide/private-messaging'])
    .map(compactNodeExample);

  return {
    format: 'ovs-node-page-contracts',
    version: '0.1',
    built,
    source: [
      'app/data/index.json',
      'app/data/nodes/brands.json',
      'app/data/nodes/companies.json',
      'app/data/nodes/tags.json',
      'app/data/nodes/errands.json',
      'content/lines.json',
      'app/guides.js',
      'app/data/*.json'
    ],
    purpose: 'Generated page-type and route contracts for app-owned node, category, guide, and item rendering.',
    appLaneNote: 'Contract only; app-owned code decides layout, copy, and interaction.',
    contracts: [
      contract({
        type: 'category',
        routePattern: '#explore/<cid>',
        source: 'app/data/index.json + app/data/<cid>.json',
        requiredFields: ['id', 'label', 'file', 'n', 'type', 'criteria'],
        optionalFields: ['domain', 'group'],
        sections: ['summary', 'presets', 'criteria', 'ranked entries', 'filters', 'guide banner if mapped'],
        examples: categoryExamples
      }),
      contract({
        type: 'item',
        routePattern: '#item/<cid>/<code>',
        source: 'app/data/<cid>.json products[]',
        requiredFields: ['code', 'name', 'scores'],
        optionalFields: ['brand', 'links', 'region', 'focuses', 'provenance', 'allergens', 'description'],
        sections: ['verdict', 'score breakdown', 'provenance', 'labels', 'category return link'],
        examples: itemExamples
      }),
      contract({
        type: 'guide',
        routePattern: '#guide/<slug>',
        source: 'app/guides.js',
        requiredFields: ['slug', 'title', 'html', 'status'],
        optionalFields: ['category', 'last_updated', 'disclosure'],
        sections: ['title', 'disclosure', 'body', 'related category link'],
        examples: guideExamples
      }),
      contract({
        type: 'brand',
        routePattern: '#n/brand/<slug>',
        source: 'app/data/nodes/brands.json',
        requiredFields: ['id', 'type', 'label', 'items', 'categories', 'top'],
        optionalFields: ['aliases', 'ownedBy'],
        sections: ['summary', 'categories', 'ownership link', 'top product examples'],
        examples: brandExamples
      }),
      contract({
        type: 'company',
        routePattern: '#n/company/<slug>',
        source: 'app/data/nodes/companies.json',
        requiredFields: ['id', 'type', 'label', 'reads', 'brandNames', 'ownershipSources'],
        optionalFields: ['brands', 'categories', 'line', 'source', 'asof', 'aliases'],
        sections: ['summary', 'known brands', 'brands in commons', 'ownership receipts', 'avoid line link'],
        examples: companyExamples
      }),
      contract({
        type: 'tag',
        routePattern: '#n/tag/<slug>',
        source: 'app/data/nodes/tags.json',
        requiredFields: ['id', 'type', 'label', 'kind', 'reads', 'items', 'categories'],
        optionalFields: ['aliases', 'receipt'],
        sections: ['summary', 'what this label means', 'categories where it appears', 'receipt if available'],
        examples: tagExamples
      }),
      contract({
        type: 'errand',
        routePattern: '#n/errand/<slug>',
        source: 'app/data/nodes/errands.json',
        requiredFields: ['id', 'type', 'label', 'reads', 'categories', 'steps'],
        optionalFields: ['aliases', 'tradeoff', 'output'],
        sections: ['summary', 'steps', 'category links', 'tradeoff hints'],
        examples: errandExamples
      }),
      contract({
        type: 'line',
        routePattern: '#n/line/<encoded-line-id>',
        source: 'content/lines.json',
        requiredFields: ['id', 'kind', 'label', 'reads'],
        optionalFields: ['tag', 'accept', 'brands', 'why'],
        sections: ['summary', 'rule behavior', 'known reach', 'source link when present'],
        examples: lineExamples,
        notes: ['Line ids contain a colon and are URL-encoded in route hashes, for example #n/line/avoid%3Anestle.']
      })
    ],
    totals: {
      categories: categories.length,
      brands: (brandIndex.nodes || []).length,
      companies: (companyIndex.nodes || []).length,
      tags: (tags.nodes || []).length,
      errands: (errands.nodes || []).length,
      lines: lines.length,
      guides: guides.length
    }
  };
}

function parseRouteHash(hash) {
  const text = String(hash || '');
  let match = text.match(/^#explore\/([^/]+)$/);
  if (match) {
    const cid = decodeURIComponent(match[1]);
    return {
      route: 'explore',
      type: 'category',
      id: `ovs:cat/${cid}`,
      params: { cid }
    };
  }

  match = text.match(/^#item\/([^/]+)\/(.+)$/);
  if (match) {
    const cid = decodeURIComponent(match[1]);
    const code = decodeURIComponent(match[2]);
    return {
      route: 'item',
      type: 'item',
      id: itemId(cid, code),
      params: { cid, code }
    };
  }

  match = text.match(/^#guide\/([^/]+)$/);
  if (match) {
    const slug = decodeURIComponent(match[1]);
    return {
      route: 'guide',
      type: 'guide',
      id: `ovs:guide/${slug}`,
      params: { slug }
    };
  }

  match = text.match(/^#n\/([^/]+)\/(.+)$/);
  if (match) {
    const type = decodeURIComponent(match[1]);
    const slug = decodeURIComponent(match[2]);
    return {
      route: 'node',
      type,
      id: `ovs:${type}/${slug}`,
      params: { type, slug }
    };
  }

  return null;
}

function fixtureIdForRoute(type, hash, index) {
  return `${type}-${index + 1}-${slugify(String(hash || '').replace(/^#/, '').replace(/%3A/gi, ':'))}`;
}

function buildNodeRouteFixtures(nodePageContractsIndex, built) {
  const cases = [];
  const typeCounts = {};
  for (const contract of nodePageContractsIndex.contracts || []) {
    for (const example of contract.examples || []) {
      const parsed = parseRouteHash(example.hash);
      const index = cases.length;
      typeCounts[contract.type] = (typeCounts[contract.type] || 0) + 1;
      cases.push({
        id: fixtureIdForRoute(contract.type, example.hash, index),
        type: contract.type,
        label: example.label,
        hash: example.hash,
        source: contract.source,
        expect: parsed ? {
          route: parsed.route,
          type: parsed.type,
          id: parsed.id,
          params: parsed.params
        } : null
      });
    }
  }

  return {
    format: 'ovs-node-route-fixtures',
    version: '0.1',
    built,
    source: [
      'app/data/nodes/node-page-contracts.json'
    ],
    purpose: 'Generated positive route parser fixtures for app-owned router integration and QA.',
    appLaneNote: 'Parse fixtures only; app-owned code decides rendering, navigation timing, and fallback behavior.',
    parserRules: {
      hashOnly: true,
      decodeParamsWith: 'decodeURIComponent',
      acceptedPatterns: [
        '#explore/<cid>',
        '#item/<cid>/<code>',
        '#guide/<slug>',
        '#n/<type>/<slug>'
      ],
      nodeSlugNote: 'The <slug> segment for #n routes may be URL-encoded; line ids use encoded colons, e.g. avoid%3Anestle.'
    },
    cases,
    totals: {
      cases: cases.length,
      typeCounts
    }
  };
}

function routeGuardrailCanonicalHash(parsed) {
  if (!parsed) return null;
  if (parsed.route === 'explore') return `#explore/${encodeURIComponent(parsed.params.cid)}`;
  if (parsed.route === 'item') return `#item/${encodeURIComponent(parsed.params.cid)}/${encodeURIComponent(parsed.params.code)}`;
  if (parsed.route === 'guide') return `#guide/${encodeURIComponent(parsed.params.slug)}`;
  if (parsed.route === 'node') return `#n/${encodeURIComponent(parsed.params.type)}/${encodeURIComponent(parsed.params.slug)}`;
  return null;
}

function routeGuardrailTargetExists(parsed, refs) {
  if (!parsed) return false;
  if (parsed.type === 'category') return refs.categories.has(parsed.id.slice('ovs:cat/'.length));
  if (parsed.type === 'item') return refs.items.has(parsed.id);
  if (parsed.type === 'guide') return refs.guides.has(parsed.id);
  if (parsed.type === 'brand') return refs.brands.has(parsed.id);
  if (parsed.type === 'company') return refs.companies.has(parsed.id);
  if (parsed.type === 'tag') return refs.tags.has(parsed.id);
  if (parsed.type === 'errand') return refs.errands.has(parsed.id);
  if (parsed.type === 'line') return refs.lines.has(parsed.id);
  return false;
}

function buildRouteGuardrailRefs(categories, brandIndex, companyIndex, linesSource) {
  const refs = {
    categories: new Set(categories.map(cat => cat.id)),
    items: new Set(),
    guides: new Set(loadGuides().map(guide => `ovs:guide/${guide.slug}`)),
    brands: new Set((brandIndex.nodes || []).map(node => node.id)),
    companies: new Set((companyIndex.nodes || []).map(node => node.id)),
    tags: new Set(),
    errands: new Set(),
    lines: new Set((linesSource.lines || []).map(line => `ovs:line/${line.id}`))
  };
  for (const cat of categories) {
    for (const product of cat.products || []) {
      const code = String(product.code || '').trim();
      if (code) refs.items.add(itemId(cat.id, code));
    }
  }
  if (fs.existsSync(TAGS_OUT)) {
    for (const node of (readJson(TAGS_OUT).nodes || [])) refs.tags.add(node.id);
  }
  if (fs.existsSync(ERRANDS_OUT)) {
    for (const node of (readJson(ERRANDS_OUT).nodes || [])) refs.errands.add(node.id);
  }
  return refs;
}

function buildNodeRouteGuardrails(categories, brandIndex, companyIndex, linesSource, built) {
  const refs = buildRouteGuardrailRefs(categories, brandIndex, companyIndex, linesSource);
  const rawCases = [
    {
      id: 'empty-hash',
      kind: 'malformed',
      hash: '',
      reason: 'Empty hashes should not be parsed as a content route.'
    },
    {
      id: 'unsupported-family',
      kind: 'unsupported',
      hash: '#search/nestle',
      reason: 'Only the documented route families should be parsed by this generated contract.'
    },
    {
      id: 'missing-category-id',
      kind: 'malformed',
      hash: '#explore/',
      reason: 'Explore routes need a category id.'
    },
    {
      id: 'missing-item-code',
      kind: 'malformed',
      hash: '#item/soda/',
      reason: 'Item routes need both category id and item code.'
    },
    {
      id: 'missing-node-slug',
      kind: 'malformed',
      hash: '#n/company/',
      reason: 'Node routes need both type and slug.'
    },
    {
      id: 'unknown-category',
      kind: 'unknown-target',
      hash: '#explore/not-a-real-category',
      reason: 'A syntactically valid category route can still point at no known category.'
    },
    {
      id: 'unknown-item',
      kind: 'unknown-target',
      hash: '#item/soda/0000000000000',
      reason: 'A syntactically valid item route can still point at no known entry.'
    },
    {
      id: 'unknown-guide',
      kind: 'unknown-target',
      hash: '#guide/not-a-real-guide',
      reason: 'A syntactically valid guide route can still point at no known guide.'
    },
    {
      id: 'unknown-brand',
      kind: 'unknown-target',
      hash: '#n/brand/not-a-real-brand',
      reason: 'A syntactically valid brand node route can still point at no known brand.'
    },
    {
      id: 'unknown-line',
      kind: 'unknown-target',
      hash: '#n/line/avoid%3Anot-a-real-company',
      reason: 'A syntactically valid line node route can still point at no known line.'
    },
    {
      id: 'line-id-canonicalization',
      kind: 'canonicalize',
      hash: '#n/line/avoid:nestle',
      reason: 'Unencoded line ids may parse, but the canonical route hash uses an encoded colon.'
    }
  ];

  const cases = rawCases.map(test => {
    const parsed = parseRouteHash(test.hash);
    const canonicalHash = routeGuardrailCanonicalHash(parsed);
    const targetExists = routeGuardrailTargetExists(parsed, refs);
    const expect = {
      parseable: !!parsed,
      targetExists,
      canonicalHash
    };
    if (parsed) {
      expect.route = parsed.route;
      expect.type = parsed.type;
      expect.id = parsed.id;
      expect.params = parsed.params;
    }
    if (test.kind === 'malformed' || test.kind === 'unsupported') {
      expect.parseable = false;
      expect.targetExists = false;
      expect.canonicalHash = null;
    }
    if (test.kind === 'unknown-target') {
      expect.parseable = true;
      expect.targetExists = false;
    }
    if (test.kind === 'canonicalize') {
      expect.parseable = true;
      expect.targetExists = true;
      expect.canonicalHash = '#n/line/avoid%3Anestle';
    }
    return {
      id: test.id,
      kind: test.kind,
      hash: test.hash,
      reason: test.reason,
      expect
    };
  });

  return {
    format: 'ovs-node-route-guardrails',
    version: '0.1',
    built,
    source: [
      'app/data/nodes/node-route-fixtures.json',
      'app/data/nodes/node-page-contracts.json'
    ],
    purpose: 'Generated negative and canonicalization route guardrails for app-owned router integration.',
    appLaneNote: 'Guardrail data only; app-owned code decides exact not-found UI and recovery copy.',
    fallbackGuidance: {
      malformed: 'Do not load a content page; recover to a neutral browse or not-found state.',
      unsupported: 'Ignore as an unknown route family unless app-owned code claims it elsewhere.',
      unknownTarget: 'Show a not-covered/not-found state rather than fabricating a page.',
      canonicalize: 'Prefer replacing equivalent non-canonical hashes with the canonical encoded hash.'
    },
    cases,
    totals: {
      cases: cases.length,
      byKind: cases.reduce((acc, item) => {
        acc[item.kind] = (acc[item.kind] || 0) + 1;
        return acc;
      }, {})
    }
  };
}

function buildNodeLoadPlan(brandIndex, companyIndex, askIndex, askCoreIndex, built) {
  const startupBudgetBytes = 700000;
  const minimumHeadroomBytes = 50000;
  const askCoreBytes = jsonBytes(askCoreIndex);
  const askCoreHeadroomBytes = startupBudgetBytes - askCoreBytes;
  const fullAskBytes = jsonBytes(askIndex);
  const pageNodeBytes = jsonBytes(brandIndex) + jsonBytes(companyIndex);
  const establishedEagerFiles = ['tags.json', 'errands.json', 'synonyms.json'];

  function existingBytes(fileName) {
    const file = path.join(OUT_DIR, fileName);
    return fs.existsSync(file) ? fs.statSync(file).size : null;
  }

  const establishedEagerBytes = establishedEagerFiles
    .map(existingBytes)
    .filter(value => Number.isInteger(value))
    .reduce((sum, value) => sum + value, 0);

  function stage(id, label, loadHint, files, trigger, acceptanceCriteria, failureMode, extra = {}) {
    return {
      id,
      label,
      loadHint,
      files,
      trigger,
      acceptanceCriteria,
      failureMode,
      ...extra
    };
  }

  const stages = [
    stage(
      'bootstrap-metadata',
      'Bootstrap node metadata',
      'eager-metadata',
      ['manifest.json', 'node-load-plan.json'],
      'App startup, before node or Ask features claim generated-index coverage.',
      [
        'Load metadata before generated node search or node pages are enabled.',
        'Treat manifest.json as the file inventory and node-load-plan.json as the runtime sequence.',
        'Do not block the first usable app view on lazy product or page-node indexes.'
      ],
      'Keep existing app search/data paths usable and mark generated node features as unavailable if metadata cannot load.'
    ),
    stage(
      'established-node-primitives',
      'Keep established node primitives eager',
      'eager',
      establishedEagerFiles,
      'Startup, using the existing small node files already produced by other pipelines.',
      [
        'Keep tag, errand, and synonym node helpers available without waiting for full Ask.',
        'If a helper file is absent, degrade only the dependent helper surface.',
        'Do not infer missing tag, errand, or synonym coverage from generated brand/company data.'
      ],
      'Disable the affected helper surface rather than fabricating labels or routes.',
      { bytes: establishedEagerBytes }
    ),
    stage(
      'startup-ask-core',
      'Load compact Ask core for startup search',
      'eager-search',
      ['ask-core.json'],
      'Startup search box, command palette, or any first-use Ask entry point.',
      [
        'Keep ask-core.json under the startup budget with minimum headroom.',
        'Use ask-core hash targets directly; do not require ask-index.json for category, brand, company, guide, line, tag, or errand results.',
        'Preserve resolver ordering from the generated traces, including typo before loose containment.'
      ],
      'Show a search-unavailable state or fall back to existing in-memory search; do not eagerly pull ask-index.json as a rescue path.',
      {
        bytes: askCoreBytes,
        budgetBytes: startupBudgetBytes,
        headroomBytes: askCoreHeadroomBytes,
        withinBudget: askCoreBytes < startupBudgetBytes,
        hasMinimumHeadroom: askCoreHeadroomBytes >= minimumHeadroomBytes
      }
    ),
    stage(
      'defer-page-nodes',
      'Defer full brand and company page nodes',
      'defer-page-nodes',
      ['brands.json', 'companies.json'],
      'First visit to a brand or company node page, ownership view, or flagship walkthrough that needs full node context.',
      [
        'Do not load brand/company page indexes before startup search is usable.',
        'Use node page contracts to check required fields before rendering.',
        'If the target node is unknown, render a not-covered state instead of a blank or fabricated page.'
      ],
      'Brand/company node pages can be unavailable while category and guide routes remain usable.',
      { bytes: pageNodeBytes }
    ),
    stage(
      'lazy-product-ask',
      'Lazy-load full product and barcode Ask',
      'lazy-product-search',
      ['ask-index.json'],
      'Product-name search, barcode lookup, or an explicit deeper-results action.',
      [
        'Never require the full Ask index for the first usable search result list.',
        'Load once and cache by manifest sha256 when a product/barcode path asks for it.',
        'If the lazy index fails, keep core results visible and label product lookup as unavailable.'
      ],
      'Product lookup can fail independently without breaking startup Ask or generated node pages.',
      { bytes: fullAskBytes }
    ),
    stage(
      'dev-contracts',
      'Use generated contracts for integration QA',
      'dev-contract',
      [
        'ask-fixtures.json',
        'ask-traces.json',
        'ask-presentation.json',
        'node-walkthroughs.json',
        'node-page-contracts.json',
        'node-route-fixtures.json',
        'node-route-guardrails.json',
        'node-runtime-states.json',
        'node-preview-matrix.json',
        'node-integration-checklist.json'
      ],
      'Development, preview QA, and H4 drain checks; not needed for normal runtime.',
      [
        'Run contract audits before claiming node/Ask integration complete.',
        'Use positive route fixtures and guardrails together.',
        'Keep H4 active until the app consumes these contracts or documents equivalent coverage.'
      ],
      'A green build is not enough to drain H4 if the app has no matching integration behavior.'
    )
  ];

  return {
    format: 'ovs-node-load-plan',
    version: '0.1',
    built,
    source: [
      'pipeline/build_nodes.js',
      'app/data/nodes/manifest.json',
      'app/data/nodes/readiness.json'
    ],
    purpose: 'Generated runtime loading contract for app-owned node and Ask integration.',
    appLaneNote: 'Data contract only; app-owned code chooses fetch, cache, UI states, and error presentation.',
    integrityContract: {
      algorithm: 'sha256',
      cacheKey: '<file>:<sha256>',
      validate: 'Use the sha256 value from manifest.json for each loaded node file when the runtime supports digest checks.',
      retry: 'On a hash mismatch or parse failure, refetch the file once before marking that stage unavailable.',
      fallback: 'Never fabricate results from a failed generated index; keep already-loaded stages usable.'
    },
    budgets: {
      startupBudgetBytes,
      minimumHeadroomBytes,
      askCoreBytes,
      askCoreHeadroomBytes,
      askCoreWithinBudget: askCoreBytes < startupBudgetBytes,
      askCoreHasHeadroom: askCoreHeadroomBytes >= minimumHeadroomBytes,
      fullAskBytes,
      pageNodeBytes,
      establishedEagerBytes
    },
    stages,
    totals: {
      stages: stages.length,
      runtimeStages: stages.filter(item => item.loadHint !== 'dev-contract').length,
      devContractStages: stages.filter(item => item.loadHint === 'dev-contract').length
    }
  };
}

function buildNodeRuntimeStates(nodeLoadPlanIndex, askPresentationIndex, nodeRouteGuardrailsIndex, built) {
  const stageById = new Map((nodeLoadPlanIndex.stages || []).map(stage => [stage.id, stage]));
  const guardByKind = new Map();
  for (const test of nodeRouteGuardrailsIndex.cases || []) {
    if (!guardByKind.has(test.kind)) guardByKind.set(test.kind, test);
  }

  function filesFor(stageId, extra = []) {
    return [...(stageById.get(stageId)?.files || []), ...extra];
  }

  function routeFixture(kind) {
    const fixture = guardByKind.get(kind);
    if (!fixture) return null;
    return {
      kind: fixture.kind,
      hash: fixture.hash,
      parseable: fixture.expect?.parseable === true,
      targetExists: fixture.expect?.targetExists === true,
      canonicalHash: fixture.expect?.canonicalHash || null
    };
  }

  function state(id, family, stage, trigger, requiredBehavior, mustNot, extra = {}) {
    return {
      id,
      family,
      stage,
      trigger,
      requiredBehavior,
      mustNot,
      appOwnedCopyIntent: extra.appOwnedCopyIntent || 'Use calm, honest copy that names what is unavailable without implying total app failure.',
      ...extra
    };
  }

  const cases = [
    state(
      'metadata-loading',
      'loading',
      'bootstrap-metadata',
      'manifest.json and node-load-plan.json are being fetched or parsed.',
      [
        'Keep the base app usable while generated node features initialize.',
        'Avoid claiming generated node or Ask coverage before metadata is known.',
        'Prepare cache keys from manifest sha256 values once metadata is available.'
      ],
      [
        'Do not block category browsing on full generated node indexes.',
        'Do not start loading ask-index.json before the load plan is known.'
      ],
      { sourceFiles: filesFor('bootstrap-metadata') }
    ),
    state(
      'metadata-unavailable',
      'unavailable',
      'bootstrap-metadata',
      'Metadata fetch, JSON parse, or required field validation fails.',
      [
        'Keep existing app search and browse paths available.',
        'Mark generated node features as unavailable for this session or until retry.',
        'Offer a neutral recovery path such as browse or reload.'
      ],
      [
        'Do not fabricate generated node coverage.',
        'Do not continue into generated Ask integration without a usable manifest.'
      ],
      { sourceFiles: filesFor('bootstrap-metadata') }
    ),
    state(
      'hash-mismatch-retry',
      'integrity',
      'bootstrap-metadata',
      'A loaded generated node file does not match the sha256 value in manifest.json.',
      [
        'Treat the cached copy as stale or corrupted.',
        'Refetch the mismatched file once using the manifest cache key shape.',
        'Keep already-valid stages usable while the retry happens.'
      ],
      [
        'Do not silently use a mismatched generated file.',
        'Do not invalidate unrelated files whose hashes match.'
      ],
      {
        sourceFiles: ['manifest.json', 'node-load-plan.json'],
        cacheKey: nodeLoadPlanIndex.integrityContract?.cacheKey || '<file>:<sha256>'
      }
    ),
    state(
      'hash-mismatch-unavailable',
      'integrity',
      'bootstrap-metadata',
      'A generated node file still fails sha256 validation after one refetch.',
      [
        'Mark only the affected stage unavailable.',
        'Keep previously loaded valid stages visible.',
        'Expose a calm retry/reload path.'
      ],
      [
        'Do not fabricate results from the failed index.',
        'Do not fall through to stale cached data after a confirmed mismatch.'
      ],
      { sourceFiles: ['manifest.json', 'node-load-plan.json'] }
    ),
    state(
      'ask-core-loading',
      'loading',
      'startup-ask-core',
      'Startup Ask core is being fetched or parsed.',
      [
        'Keep navigation and browse routes usable.',
        'Delay generated Ask results until ask-core.json is ready.',
        'Keep the full Ask index out of the startup path.'
      ],
      [
        'Do not load ask-index.json merely to fill the startup search slot.',
        'Do not show product/barcode lookup as ready before the lazy index loads.'
      ],
      { sourceFiles: filesFor('startup-ask-core') }
    ),
    state(
      'ask-core-unavailable',
      'unavailable',
      'startup-ask-core',
      'ask-core.json fails fetch, parse, budget, or integrity checks.',
      [
        'Fall back to existing in-memory search if present, or show generated Ask unavailable.',
        'Keep category and guide browsing usable.',
        'Do not require the lazy full Ask index as a recovery path.'
      ],
      [
        'Do not claim generated Ask coverage.',
        'Do not hide the rest of the app because compact Ask failed.'
      ],
      { sourceFiles: filesFor('startup-ask-core') }
    ),
    state(
      'ask-no-results',
      'empty',
      'startup-ask-core',
      'A generated Ask query returns no core or full-index hits.',
      [
        'Use the Ask presentation empty-state route shape.',
        'Offer a request path that preserves the query.',
        'Offer browse as a secondary recovery path.'
      ],
      [
        'Do not invent a close result.',
        'Do not imply that the entire commons has been searched if lazy product lookup was not loaded.'
      ],
      {
        sourceFiles: ['ask-presentation.json', 'ask-core.json'],
        recovery: {
          primary: askPresentationIndex.emptyState?.primary || '#contribute/want/<query>',
          secondary: askPresentationIndex.emptyState?.secondary || '#browse'
        }
      }
    ),
    state(
      'page-node-loading',
      'loading',
      'defer-page-nodes',
      'A brand or company node route is visited before brands.json or companies.json has loaded.',
      [
        'Render the route as pending while the needed page-node index loads.',
        'Keep category and guide routes usable.',
        'Check node-page-contracts.json required fields before final render.'
      ],
      [
        'Do not render a partial brand/company page as complete.',
        'Do not block unrelated node types on brand/company page-node loading.'
      ],
      { sourceFiles: filesFor('defer-page-nodes', ['node-page-contracts.json']) }
    ),
    state(
      'page-node-unavailable',
      'unavailable',
      'defer-page-nodes',
      'The requested brand/company page-node index fails to load or validate.',
      [
        'Keep the route addressable but mark the node page unavailable.',
        'Provide a route back to search or browse.',
        'Allow retry without reloading unrelated generated indexes.'
      ],
      [
        'Do not fabricate ownership or brand lists.',
        'Do not use long-tail brand text as if it were a full node.'
      ],
      { sourceFiles: filesFor('defer-page-nodes') }
    ),
    state(
      'unknown-target-route',
      'route',
      'defer-page-nodes',
      'A syntactically valid route points at no known generated target.',
      [
        'Parse the route, then render a not-covered/not-found state.',
        'Keep the original hash visible enough for QA/debugging.',
        'Offer search or browse as recovery.'
      ],
      [
        'Do not fabricate a node page for the missing target.',
        'Do not redirect silently to a different real node.'
      ],
      {
        sourceFiles: ['node-route-guardrails.json', 'node-page-contracts.json'],
        fixture: routeFixture('unknown-target')
      }
    ),
    state(
      'malformed-route',
      'route',
      'bootstrap-metadata',
      'A hash cannot be parsed as one of the generated content route families.',
      [
        'Treat it as malformed or unsupported generated-node input.',
        'Recover to a neutral not-found, browse, or existing app route.',
        'Avoid fetching generated node indexes solely for an unparseable hash.'
      ],
      [
        'Do not load a content page from malformed route text.',
        'Do not coerce arbitrary hashes into node ids.'
      ],
      {
        sourceFiles: ['node-route-guardrails.json'],
        fixture: routeFixture('malformed')
      }
    ),
    state(
      'canonical-route-rewrite',
      'route',
      'defer-page-nodes',
      'A route parses to a real target but has a non-canonical generated hash.',
      [
        'Prefer the canonical hash from the route guardrail fixture.',
        'Render the same target after canonicalization.',
        'Preserve encoded line ids, including encoded colons.'
      ],
      [
        'Do not treat the non-canonical hash as a separate node.',
        'Do not drop encoded line ids during route round-trip.'
      ],
      {
        sourceFiles: ['node-route-guardrails.json'],
        fixture: routeFixture('canonicalize')
      }
    ),
    state(
      'lazy-product-loading',
      'loading',
      'lazy-product-ask',
      'A product-name or barcode lookup requests the full Ask index.',
      [
        'Keep core search results visible while full product lookup loads.',
        'Load ask-index.json once and cache by manifest sha256.',
        'Keep product lookup clearly separate from startup Ask readiness.'
      ],
      [
        'Do not blank core Ask results while lazy product lookup is pending.',
        'Do not load ask-index.json before the user path asks for product/barcode depth.'
      ],
      { sourceFiles: filesFor('lazy-product-ask') }
    ),
    state(
      'lazy-product-unavailable',
      'unavailable',
      'lazy-product-ask',
      'ask-index.json fails fetch, parse, integrity, or memory checks.',
      [
        'Keep compact core results visible.',
        'Label product/barcode lookup as unavailable for the moment.',
        'Allow retry without restarting the whole app.'
      ],
      [
        'Do not claim product/barcode coverage if ask-index.json failed.',
        'Do not treat a lazy product failure as a failure of categories, guides, or node pages.'
      ],
      { sourceFiles: filesFor('lazy-product-ask') }
    ),
    state(
      'offline-core-available',
      'offline',
      'startup-ask-core',
      'The app is offline but manifest and ask-core.json are already valid in cache.',
      [
        'Use cached core results only if their manifest sha256 values match.',
        'Keep lazy product lookup unavailable until the full index is cached and valid.',
        'Avoid implying live freshness while offline.'
      ],
      [
        'Do not skip integrity validation because data came from cache.',
        'Do not fetch or require lazy indexes while offline.'
      ],
      { sourceFiles: ['manifest.json', 'ask-core.json'] }
    )
  ];

  const caseIds = cases.map(item => item.id);
  const caseByStage = cases.reduce((acc, item) => {
    if (!acc[item.stage]) acc[item.stage] = [];
    acc[item.stage].push(item.id);
    return acc;
  }, {});
  const loadStageCoverage = Object.fromEntries(
    Object.entries(caseByStage)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([stageId, ids]) => {
        const stage = stageById.get(stageId) || {};
        return [stageId, {
          loadHint: stage.loadHint || null,
          runtime: stage.loadHint !== 'dev-contract',
          sourceFiles: stage.files || [],
          caseIds: ids
        }];
      })
  );
  const qaModes = [
    {
      id: 'startup-smoke',
      owner: 'app/design',
      caseIds: [
        'metadata-loading',
        'metadata-unavailable',
        'hash-mismatch-retry',
        'hash-mismatch-unavailable',
        'ask-core-loading',
        'ask-core-unavailable',
        'ask-no-results',
        'offline-core-available'
      ],
      sourceFiles: ['manifest.json', 'node-load-plan.json', 'ask-core.json', 'ask-presentation.json'],
      passWhen: [
        'The base app remains usable while metadata and ask-core.json load.',
        'Startup Ask never requires ask-index.json for core category, brand, company, guide, line, tag, or errand results.',
        'Empty and unavailable states route to the generated recovery hashes.'
      ],
      mustNot: [
        'Do not block category browsing on generated-node startup work.',
        'Do not claim product or barcode coverage before ask-index.json is loaded and valid.'
      ]
    },
    {
      id: 'route-page-smoke',
      owner: 'app/design',
      caseIds: [
        'page-node-loading',
        'page-node-unavailable',
        'unknown-target-route',
        'malformed-route',
        'canonical-route-rewrite'
      ],
      sourceFiles: ['brands.json', 'companies.json', 'node-page-contracts.json', 'node-route-guardrails.json'],
      passWhen: [
        'Known brand and company routes can wait for their lazy indexes without breaking unrelated routes.',
        'Unknown and malformed hashes recover without fabricating node pages.',
        'Canonical route rewrites preserve encoded generated ids.'
      ],
      mustNot: [
        'Do not render partial brand or company data as a complete page.',
        'Do not redirect an unknown generated route to a different real node.'
      ]
    },
    {
      id: 'lazy-product-smoke',
      owner: 'app/design',
      caseIds: [
        'lazy-product-loading',
        'lazy-product-unavailable'
      ],
      sourceFiles: ['ask-index.json', 'manifest.json', 'node-load-plan.json'],
      passWhen: [
        'ask-index.json loads only after a product-name or barcode path asks for it.',
        'Core Ask results stay visible while the lazy product index loads.',
        'A lazy index failure disables only product and barcode lookup.'
      ],
      mustNot: [
        'Do not eagerly load ask-index.json at startup.',
        'Do not treat lazy product failure as failure of categories, guides, or node pages.'
      ]
    },
    {
      id: 'copy-failure-review',
      owner: 'app/design',
      caseIds,
      sourceFiles: ['node-runtime-states.json'],
      passWhen: [
        'Every visible loading, unavailable, empty, route, integrity, and offline state names the affected capability plainly.',
        'Recovery copy offers browse, search, reload, retry, or request paths already named by the fixture.',
        'No state implies the whole app failed when only one generated-node capability is unavailable.'
      ],
      mustNot: [
        'Do not add urgency, blame, or engagement copy to runtime failure states.',
        'Do not hide the app-owned copy decision behind generated placeholder prose.'
      ]
    }
  ];

  return {
    format: 'ovs-node-runtime-states',
    version: '0.1',
    built,
    source: [
      'app/data/nodes/node-load-plan.json',
      'app/data/nodes/ask-presentation.json',
      'app/data/nodes/node-route-guardrails.json',
      'app/data/nodes/manifest.json'
    ],
    purpose: 'Generated runtime state and failure-mode fixtures for app-owned node and Ask integration.',
    appLaneNote: 'State contract only; app-owned code chooses visual treatment, exact copy, interaction timing, and telemetry policy.',
    caseFields: ['id', 'family', 'stage', 'trigger', 'requiredBehavior', 'mustNot', 'sourceFiles'],
    qaContract: {
      purpose: 'App-owned runtime QA contract for generated node and Ask loading states.',
      status: 'pending-app-integration',
      h4DrainableFromDataAlone: false,
      drainRule: 'H4 runtime-state QA drains only after app-owned behavior is checked against each referenced case requiredBehavior and mustNot clause.',
      modes: qaModes,
      loadStageCoverage,
      coverage: {
        caseCount: cases.length,
        modeCount: qaModes.length,
        stagesCovered: Object.keys(loadStageCoverage).length,
        allCasesCovered: qaModes.some(mode => mode.caseIds.length === caseIds.length),
        runtimeModeIds: ['startup-smoke', 'route-page-smoke', 'lazy-product-smoke'],
        manualReviewModeIds: ['copy-failure-review']
      }
    },
    cases,
    totals: {
      cases: cases.length,
      byFamily: cases.reduce((acc, item) => {
        acc[item.family] = (acc[item.family] || 0) + 1;
        return acc;
      }, {})
    }
  };
}

function buildNodePreviewMatrix(askTracesIndex, askPresentationIndex, nodeWalkthroughsIndex, nodeRouteFixturesIndex, nodeRouteGuardrailsIndex, nodeLoadPlanIndex, nodeRuntimeStatesIndex, built) {
  const tracesByQuery = new Map((askTracesIndex.traces || []).map(trace => [trace.query, trace]));
  const routeByType = new Map();
  for (const test of nodeRouteFixturesIndex.cases || []) {
    if (!routeByType.has(test.type)) routeByType.set(test.type, test);
  }
  const guardrailByKind = new Map();
  for (const test of nodeRouteGuardrailsIndex.cases || []) {
    if (!guardrailByKind.has(test.kind)) guardrailByKind.set(test.kind, test);
  }
  const runtimeById = new Map((nodeRuntimeStatesIndex.cases || []).map(test => [test.id, test]));

  function matchedHash(trace) {
    if (!trace?.matched) return null;
    return (trace.top || []).find(row => row.id === trace.matched)?.hash || null;
  }

  function scenario(id, group, title, sourceFiles, steps, acceptanceCriteria, mustNot, fixtures = {}) {
    return {
      id,
      group,
      title,
      owner: 'app/design',
      sourceFiles,
      steps,
      acceptanceCriteria,
      mustNot,
      fixtures
    };
  }

  function askScenario(id, query, title, group = 'startup-search') {
    const trace = tracesByQuery.get(query);
    const first = trace?.top?.[0] || null;
    return scenario(
      id,
      group,
      title,
      ['ask-core.json', 'ask-traces.json', 'ask-presentation.json'],
      [
        `Enter Ask query: ${query}`,
        'Render the generated top results with labels, type badges, match reasons, and route hashes.',
        'Open the matched result hash and confirm the route parser/page contract handles it.'
      ],
      [
        'The expected matched result appears within the fixture rank window.',
        'The first result hash and matched result hash match the generated trace.',
        'The result list preserves the generated match reason.'
      ],
      [
        'Do not reorder typo matches behind loose token containment.',
        'Do not strip route hashes from rendered results.'
      ],
      {
        query,
        layer: trace?.layer || null,
        matched: trace?.matched || null,
        matchedRank: trace?.matchedRank || null,
        expectFirstHash: first?.hash || null,
        expectMatchedHash: matchedHash(trace),
        expectReason: first?.reason || null
      }
    );
  }

  function lazyProductScenario() {
    const trace = tracesByQuery.get('5449000054227');
    return scenario(
      'lazy-barcode-lookup',
      'lazy-product',
      'Barcode lookup uses the lazy full Ask index',
      ['ask-index.json', 'ask-fixtures.json', 'ask-traces.json', 'node-load-plan.json'],
      [
        'Start with compact Ask available.',
        'Enter barcode query: 5449000054227.',
        'Load ask-index.json only for the barcode/product path and route to the expected item.'
      ],
      [
        'Barcode result resolves from the full index.',
        'The expected item hash matches the generated trace.',
        'Compact core Ask remains usable while lazy lookup loads.'
      ],
      [
        'Do not eagerly load ask-index.json at startup.',
        'Do not hide core results if lazy product lookup fails.'
      ],
      {
        query: trace?.query || '5449000054227',
        layer: trace?.layer || null,
        matched: trace?.matched || null,
        expectFirstHash: trace?.top?.[0]?.hash || null,
        expectMatchedHash: matchedHash(trace)
      }
    );
  }

  function routeScenario(type, title) {
    const fixture = routeByType.get(type);
    return scenario(
      `route-${type}`,
      'route',
      title,
      ['node-route-fixtures.json', 'node-page-contracts.json'],
      [
        `Open generated hash: ${fixture?.hash || '<missing>'}.`,
        'Parse only documented route families.',
        'Confirm the rendered page uses the matching page contract.'
      ],
      [
        'The route parses to the expected route, type, id, and params.',
        'The target exists before a content page is rendered.',
        'Required page-contract fields are present before display.'
      ],
      [
        'Do not infer a different target when the fixture hash is exact.',
        'Do not render a page without required contract fields.'
      ],
      {
        fixtureId: fixture?.id || null,
        hash: fixture?.hash || null,
        expect: fixture?.expect || null
      }
    );
  }

  function guardrailScenario(kind, title) {
    const fixture = guardrailByKind.get(kind);
    return scenario(
      `guardrail-${kind}`,
      'route-guardrail',
      title,
      ['node-route-guardrails.json'],
      [
        `Open or parse guardrail hash: ${fixture?.hash || '<missing>'}.`,
        'Apply the generated parseability and target-existence expectations.',
        'Use the documented fallback/canonicalization behavior.'
      ],
      [
        'The parseable, targetExists, and canonicalHash expectations match the guardrail fixture.',
        'Unknown or malformed targets recover without fabricated pages.',
        'Canonical routes preserve encoded line ids.'
      ],
      [
        'Do not coerce unsupported hashes into generated node routes.',
        'Do not silently redirect unknown targets to nearby real nodes.'
      ],
      {
        fixtureId: fixture?.id || null,
        kind,
        hash: fixture?.hash || null,
        expect: fixture?.expect || null
      }
    );
  }

  function runtimeScenario(stateId, title) {
    const state = runtimeById.get(stateId);
    return scenario(
      `runtime-${stateId}`,
      'runtime-state',
      title,
      ['node-runtime-states.json', 'node-load-plan.json'],
      [
        `Force or simulate runtime state: ${stateId}.`,
        'Render the app-owned treatment for the generated state family.',
        'Confirm already-valid stages keep working when the state is partial failure.'
      ],
      [
        'Required behavior clauses from node-runtime-states.json are satisfied.',
        'Must-not clauses are not violated.',
        'The recovery path keeps the rest of the app honest and usable.'
      ],
      state?.mustNot || [
        'Do not fabricate generated node data.',
        'Do not collapse unrelated app features into the failed state.'
      ],
      {
        stateId,
        family: state?.family || null,
        stage: state?.stage || null,
        sourceFiles: state?.sourceFiles || []
      }
    );
  }

  const flagshipScenarios = (nodeWalkthroughsIndex.walkthroughs || []).map(walkthrough => scenario(
    `flagship-${walkthrough.id}`,
    'flagship-walkthrough',
    walkthrough.label,
    ['node-walkthroughs.json', 'ask-core.json', 'brands.json', 'companies.json', 'content/lines.json'],
    [
      `Enter Ask query: ${walkthrough.query}.`,
      'Open the generated brand/company/line route from the top results.',
      'Confirm ownership receipts, known brands, categories, and product examples are visible without overclaiming coverage.'
    ],
    [
      'The walkthrough matchedTop appears in generated Ask results.',
      'The company or brand page exposes generated ownership context.',
      'The path can be followed end to end in a private-preview demo.'
    ],
    [
      'Do not imply complete market coverage.',
      'Do not show ownership facts without generated receipts or source context.'
    ],
    {
      walkthroughId: walkthrough.id,
      query: walkthrough.query,
      matchedTop: walkthrough.matchedTop,
      companyHash: walkthrough.pages?.company?.hash || null,
      brandHashes: (walkthrough.pages?.brands || []).map(row => row.hash).filter(Boolean).slice(0, 3)
    }
  ));

  const scenarios = [
    askScenario('startup-nestle-concern', 'is nestle bad', 'Concern query finds Nestle brand/company/avoid line'),
    askScenario('startup-best-bank', 'best bank', 'Money query finds ethical banking'),
    askScenario('startup-password-manager', 'best password manager', 'Digital security query finds password managers'),
    askScenario('startup-private-messaging', 'private messaging app', 'Privacy query finds private messaging guidance'),
    askScenario('startup-typo-nestel', 'nestel', 'Typo query ranks Nestle before loose containment'),
    lazyProductScenario(),
    routeScenario('category', 'Category route opens a category page'),
    routeScenario('item', 'Item route opens a verdict page'),
    routeScenario('guide', 'Guide route opens a guide page'),
    routeScenario('brand', 'Brand node route opens a brand page'),
    guardrailScenario('unknown-target', 'Unknown generated target routes to not-covered'),
    guardrailScenario('malformed', 'Malformed generated hash does not create a page'),
    guardrailScenario('canonicalize', 'Non-canonical line hash rewrites to encoded canonical hash'),
    runtimeScenario('hash-mismatch-retry', 'Hash mismatch triggers bounded refetch'),
    runtimeScenario('ask-no-results', 'No-results state offers request and browse recovery'),
    runtimeScenario('lazy-product-unavailable', 'Lazy product failure leaves compact Ask usable'),
    runtimeScenario('offline-core-available', 'Offline cached core requires manifest integrity'),
    ...flagshipScenarios,
    scenario(
      'h4-drain-decision',
      'handoff-drain',
      'Final H4 drain decision',
      ['node-integration-checklist.json', 'node-preview-matrix.json', 'readiness.json', 'manifest.json'],
      [
        'Run all smoke commands listed in node-integration-checklist.json.',
        'Walk this preview matrix across startup search, lazy product lookup, routes, runtime states, and flagship paths.',
        'Drain H4 only after app-owned implementation consumes these files or documents equivalent coverage.'
      ],
      [
        'Generated audits pass.',
        'App-owned behavior covers all matrix groups.',
        'H4 remains active until generated node/Ask behavior no longer depends only on sample.json or live in-memory entries.'
      ],
      [
        'Do not mark H4 drained from data generation alone.',
        'Do not skip runtime failure states when testing the preview path.'
      ],
      {
        activeHandoff: 'H4',
        expectedStatusBeforeAppWork: 'pending-app-integration',
        loadPlanStages: (nodeLoadPlanIndex.stages || []).length,
        runtimeStateCases: (nodeRuntimeStatesIndex.cases || []).length
      }
    )
  ];
  const scenarioIds = scenarios.map(item => item.id);
  const scenarioIdsByGroup = scenarios.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item.id);
    return acc;
  }, {});
  const previewGroupOrder = [
    'startup-search',
    'lazy-product',
    'route',
    'route-guardrail',
    'runtime-state',
    'flagship-walkthrough',
    'handoff-drain'
  ];
  const runOrder = previewGroupOrder.map((group, index) => ({
    step: index + 1,
    group,
    scenarioIds: scenarioIdsByGroup[group] || [],
    passWhen: [
      `All ${group} scenarios pass against the app-owned implementation.`,
      'Required acceptance criteria are observed in the running app or documented equivalent QA.',
      'No must-not clause is violated.'
    ],
    mustNot: group === 'handoff-drain'
      ? [
        'Do not drain H4 from generated data alone.',
        'Do not skip evidence from startup, lazy product, route, runtime, and flagship groups.'
      ]
      : [
        'Do not mark this group passed from source-file existence alone.',
        'Do not hide app-owned failures behind generated fixture success.'
      ]
  }));

  return {
    format: 'ovs-node-preview-matrix',
    version: '0.1',
    built,
    source: [
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
    ],
    purpose: 'Generated private-preview and H4-drain QA matrix for app-owned node and Ask integration.',
    appLaneNote: 'Preview QA contract only; app-owned code owns UI details, copy, implementation, and the final drain decision.',
    status: 'pending-app-integration',
    h4DrainableFromDataAlone: false,
    groups: ['startup-search', 'lazy-product', 'route', 'route-guardrail', 'runtime-state', 'flagship-walkthrough', 'handoff-drain'],
    runContract: {
      purpose: 'App-owned private-preview run contract for generated node and Ask integration.',
      status: 'pending-app-integration',
      h4DrainableFromDataAlone: false,
      namedConsumer: 'Claude H4 private-preview and generated-node integration QA.',
      drainRule: 'H4 drains only after the app-owned implementation walks this run order or records equivalent coverage for every scenario group.',
      evidenceRequired: [
        'Running-app behavior, screenshot, or manual QA note for each runOrder group.',
        'Explicit pass/fail note for lazy ask-index loading and failure behavior.',
        'Explicit pass/fail note for the final h4-drain-decision scenario.'
      ],
      runOrder,
      exitCriteria: [
        'Every scenario id appears in exactly one runOrder group.',
        'Every matrix group has at least one app-owned pass/fail note.',
        'The h4-drain-decision scenario remains last and cannot pass from data generation alone.'
      ],
      coverage: {
        scenarioCount: scenarios.length,
        groupCount: previewGroupOrder.length,
        allScenariosCovered: runOrder.flatMap(item => item.scenarioIds).length === scenarioIds.length,
        allGroupsCovered: previewGroupOrder.every(group => (scenarioIdsByGroup[group] || []).length > 0),
        orderedGroups: previewGroupOrder,
        drainScenarioId: 'h4-drain-decision'
      }
    },
    scenarios,
    totals: {
      scenarios: scenarios.length,
      byGroup: scenarios.reduce((acc, item) => {
        acc[item.group] = (acc[item.group] || 0) + 1;
        return acc;
      }, {})
    }
  };
}

function buildWorkbenchPublicGates(brandIndex, companyIndex) {
  function surface(id, label, proseClass, sourceFiles, voice, generatedCount, appOwnedGate, mustNot) {
    const out = {
      id,
      label,
      owner: 'app/design',
      status: 'voice-signed-app-gate',
      proseClass,
      sourceFiles,
      voice,
      appOwnedGate,
      mustNot
    };
    if (Number.isInteger(generatedCount)) out.generatedCount = generatedCount;
    return out;
  }

  const signedVoice = {
    status: 'signed',
    signedAt: '2026-07-08',
    signoffBlock: 'codex.md#c8-voice-pass-status',
    pilotSamples: 5
  };

  const surfaces = [
    surface(
      'brand-pages',
      'Brand pages',
      'minimal-generated-copy',
      ['app/data/nodes/brands.json', 'app/data/nodes/node-page-contracts.json', 'pipeline/build_nodes.js', 'codex.md'],
      {
        status: 'minimal-generated-copy',
        signedAt: '2026-07-08',
        signoffBlock: 'codex.md#c8-voice-pass-status',
        pilotSamples: 0,
        note: 'Brand nodes expose labels, categories, owners, and top examples; app copy must name coverage without adding a fabricated brand read.'
      },
      (brandIndex.nodes || []).length,
      'A brand page can go public when it renders labels, categories, owner links when present, and top examples without inventing coverage.',
      [
        'Do not turn item counts into importance claims.',
        'Do not imply every brand product is covered.'
      ]
    ),
    surface(
      'company-pages',
      'Company pages',
      'company-reads',
      ['app/data/nodes/companies.json', 'app/data/nodes/node-page-contracts.json', 'pipeline/build_nodes.js', 'codex.md'],
      signedVoice,
      (companyIndex.nodes || []).length,
      'A company page can go public when its signed read, owned brands, visible-shelf count, and ownership receipts render together.',
      [
        'Do not publish a company page without its ownership receipt list.',
        'Do not claim unobserved brands appear in the commons.'
      ]
    ),
    surface(
      'tag-pages',
      'Tag pages',
      'tag-reads',
      ['app/data/nodes/tags.json', 'content/tags.json', 'pipeline/build_tags.js', 'codex.md'],
      signedVoice,
      null,
      'A tag page can go public when certification reads name who checks the claim and property tags do not pretend to be certifications.',
      [
        'Do not show an unsourced certification as if it had a receipt.',
        'Do not collapse property tags and third-party certification tags into one promise.'
      ]
    ),
    surface(
      'errand-pages',
      'Errand pages',
      'errand-step-notes',
      ['app/data/nodes/errands.json', 'content/errands.json', 'pipeline/build_errands.js', 'codex.md'],
      signedVoice,
      12,
      'An errand can go public when every step ends in a list-ready choice and the runner keeps output:list visible.',
      [
        'Do not turn errands into a feed or checklist streak.',
        'Do not hide why each stop belongs in the errand.'
      ]
    ),
    surface(
      'pulse-strip',
      'Pulse strip',
      'pulse-ledger-lines',
      ['app/data/pulse.json', 'pipeline/build_pulse.js', 'codex.md'],
      signedVoice,
      null,
      'The pulse strip can go public when entries read as a maintenance ledger: what changed, the count, and the source.',
      [
        'Do not add streaks, likes, or urgency language.',
        'Do not show a pulse row without a source URL or commit.'
      ]
    )
  ];
  const releaseOrderIds = ['company-pages', 'tag-pages', 'errand-pages', 'pulse-strip', 'brand-pages'];
  const surfaceById = new Map(surfaces.map(item => [item.id, item]));
  const releaseOrder = releaseOrderIds.map((id, index) => {
    const item = surfaceById.get(id);
    return {
      step: index + 1,
      surfaceId: id,
      label: item?.label || id,
      voiceStatus: item?.voice?.status || null,
      sourceFiles: item?.sourceFiles || [],
      evidenceRequired: [
        'Running-app route or surface evidence that the named generated files are consumed or an equivalent merge path is documented.',
        'Voice check against codex.md#c8-voice-pass-status.',
        'A pass/fail note for each appOwnedGate and mustNot clause before public release.'
      ],
      releaseWhen: [
        item?.appOwnedGate || 'The app-owned gate is satisfied.',
        'The surface has no engagement mechanics, inflated coverage, or unsourced claims.',
        'The public release keeps rollback simple by moving this surface one at a time.'
      ],
      mustNot: item?.mustNot || []
    };
  });

  return {
    status: 'ready-for-app-public-gates',
    namedConsumer: 'Claude I5 workbench graduation',
    voiceSource: 'codex.md#c8-voice-pass-status',
    rule: 'Move one surface public at a time only after the app renders the generated file or documents equivalent coverage.',
    appOwnedBeforePublic: [
      'Render the surface from generated data or document an equivalent app-owned merge path.',
      'Keep app-added copy in the signed voice; do not add engagement mechanics or inflated coverage.',
      'Run the smoke commands before moving the surface out of the workbench.'
    ],
    releaseContract: {
      purpose: 'App-owned public release contract for graduating workbench surfaces one at a time.',
      status: 'ready-for-app-public-gates',
      namedConsumer: 'Claude I5 workbench graduation',
      releaseRule: 'Release one surface at a time, after app-owned rendering evidence satisfies that surface gate and the shared pre-public rules.',
      voiceSource: 'codex.md#c8-voice-pass-status',
      releaseOrder,
      sharedEvidenceRequired: [
        'The surface renders from generated data or a documented equivalent app-owned merge path.',
        'The public copy stays in the signed voice and does not add engagement mechanics.',
        'The relevant smoke commands pass before release.'
      ],
      rollbackRule: 'If a surface misses its gate in app QA, leave only that surface in the workbench and keep the others on their previous public/workbench status.',
      coverage: {
        surfaces: surfaces.length,
        releaseSteps: releaseOrder.length,
        allSurfacesCovered: releaseOrder.length === surfaces.length,
        minimalGeneratedCopy: releaseOrder.filter(item => item.voiceStatus === 'minimal-generated-copy').map(item => item.surfaceId),
        signedSurfaces: releaseOrder.filter(item => item.voiceStatus === 'signed').map(item => item.surfaceId)
      }
    },
    surfaces
  };
}

function buildH4DrainContract(phases, publicGates, nodePreviewMatrixIndex) {
  const phaseIds = phases.map(phase => phase.id);

  function step(id, label, phaseIdsForStep, sourceFiles, contractPointer, appOwnedEvidence, passWhen, mustNot) {
    return {
      step: 0,
      id,
      label,
      phaseIds: phaseIdsForStep,
      sourceFiles,
      contractPointer,
      appOwnedEvidence,
      passWhen,
      mustNot
    };
  }

  const steps = [
    step(
      'manifest-loader',
      'Consume manifest loader plan',
      ['discover-load-plan'],
      ['app/data/nodes/manifest.json', 'app/data/nodes/node-load-plan.json', 'app/data/nodes/readiness.json'],
      'manifest.json#loaderPlan',
      [
        'Running-app loader reads the manifest loaderPlan or documents an equivalent ordered load table.',
        'Cache keys or integrity checks use the generated sha256 values before trusting cached node files.'
      ],
      [
        'Startup loads only eager runtime files before optional node depth.',
        'The app has a visible recovery path for missing or stale generated node files.'
      ],
      [
        'Do not eager-load ask-index.json just to make startup search work.',
        'Do not ignore sha256/hash-mismatch behavior in the loader path.'
      ]
    ),
    step(
      'startup-ask-core',
      'Wire compact startup Ask',
      ['startup-ask', 'ask-presentation'],
      ['app/data/nodes/ask-core.json', 'app/data/nodes/ask-fixtures.json', 'app/data/nodes/ask-traces.json', 'app/data/nodes/ask-presentation.json'],
      'ask-core.json#startupContract',
      [
        'Running-app Ask resolves the compact golden queries before loading the full product index.',
        'Rendered result rows preserve type labels, route hashes, match reasons, and empty-state recovery from the presentation contract.'
      ],
      [
        'The compact core works for category, guide, brand, company, tag, errand, and line targets.',
        'The nestel typo case ranks edit-distance Nestle matches before loose containment hits.'
      ],
      [
        'Do not treat a green data resolver as enough without checking rendered result order.',
        'Do not hide no-results states behind a silent empty panel.'
      ]
    ),
    step(
      'lazy-product-ask',
      'Keep product Ask lazy and bounded',
      ['lazy-product-ask'],
      ['app/data/nodes/ask-index.json', 'app/data/nodes/ask-fixtures.json', 'app/data/nodes/ask-traces.json'],
      'ask-index.json#loadHint',
      [
        'Running-app product-name or barcode lookup loads ask-index.json only after compact startup Ask is usable.',
        'Failure to load ask-index.json leaves compact Ask, browse, and route behavior available.'
      ],
      [
        'Barcode fixtures resolve to the expected item hashes after lazy load.',
        'The full Ask index remains outside the eager startup path unless a later budget decision explicitly changes that contract.'
      ],
      [
        'Do not block startup search on the full product/barcode index.',
        'Do not make lazy product failure look like the whole app has failed.'
      ]
    ),
    step(
      'route-and-page-rendering',
      'Render generated routes and page types',
      ['route-parser', 'page-rendering'],
      ['app/data/nodes/node-page-contracts.json', 'app/data/nodes/node-route-fixtures.json', 'app/data/nodes/node-route-guardrails.json', 'app/data/nodes/brands.json', 'app/data/nodes/companies.json', 'app/data/nodes/tags.json', 'app/data/nodes/errands.json'],
      'node-page-contracts.json#contracts',
      [
        'Running-app route parser passes positive fixtures and guardrail fixtures.',
        'Category, item, guide, brand, company, tag, errand, and line routes render from generated contracts or documented equivalent page data.'
      ],
      [
        'Malformed or unsupported hashes never fabricate content pages.',
        'Known generated page types expose required fields and check optional fields before display.'
      ],
      [
        'Do not invent page copy when generated fields are absent.',
        'Do not collapse unknown generated targets into unrelated real pages.'
      ]
    ),
    step(
      'runtime-state-qa',
      'Walk runtime loading and failure states',
      ['runtime-states'],
      ['app/data/nodes/node-runtime-states.json', 'app/data/nodes/node-load-plan.json', 'app/data/nodes/node-route-guardrails.json'],
      'node-runtime-states.json#qaContract',
      [
        'Running-app QA covers startup, route/page, lazy product, and copy/failure modes from qaContract.',
        'Hash mismatch, offline, parse failure, no-results, and lazy-unavailable states have visible treatments.'
      ],
      [
        'Partial data failure degrades to the scoped state named by qaContract.',
        'Compact Ask and browse recovery remain available when lazy product lookup fails.'
      ],
      [
        'Do not replace integrity failures with stale generated data.',
        'Do not leave blank panes for missing node or Ask files.'
      ]
    ),
    step(
      'flagship-walkthroughs',
      'Walk first-use concern paths',
      ['flagship-walkthroughs'],
      ['app/data/nodes/node-walkthroughs.json', 'app/data/nodes/ask-core.json', 'app/data/nodes/brands.json', 'app/data/nodes/companies.json'],
      'node-walkthroughs.json#walkthroughs',
      [
        'A person can follow the Nestle, Coca-Cola, and Amazon concern paths from Ask result to generated node context.',
        'Company and brand pages expose ownership receipts, known brands, categories, and top examples without overclaiming coverage.'
      ],
      [
        'Every flagship walkthrough reaches its expected company, line, and brand targets.',
        'The page language stays in the signed C8 voice or explicitly names minimal generated copy.'
      ],
      [
        'Do not pass flagship QA from isolated fixture success alone.',
        'Do not imply complete brand/product coverage from generated node examples.'
      ]
    ),
    step(
      'private-preview-run',
      'Walk the private-preview run contract',
      ['startup-ask', 'lazy-product-ask', 'route-parser', 'runtime-states', 'flagship-walkthroughs', 'final-h4-drain'],
      ['app/data/nodes/node-preview-matrix.json', 'app/data/nodes/node-integration-checklist.json', 'app/data/nodes/readiness.json'],
      'node-preview-matrix.json#runContract',
      [
        'Running-app private-preview notes cover every ordered runContract group.',
        'The h4-drain-decision scenario is walked last and records whether app behavior still depends on sample-only paths.'
      ],
      [
        'Every preview scenario id appears in exactly one runContract group.',
        'Each group has a pass/fail note from the app-owned implementation or a documented equivalent QA path.'
      ],
      [
        'Do not drain H4 from generated fixture existence alone.',
        'Do not skip runtime failure states during preview QA.'
      ]
    ),
    step(
      'public-gate-release',
      'Walk public gate release contract',
      ['workbench-public-gates'],
      ['app/data/nodes/node-integration-checklist.json', 'app/data/nodes/readiness.json', 'app/data/nodes/brands.json', 'app/data/nodes/companies.json', 'app/data/nodes/tags.json', 'app/data/nodes/errands.json', 'app/data/pulse.json'],
      'node-integration-checklist.json#publicGates.releaseContract',
      [
        'App-owned release notes walk company, tag, errand, pulse, then brand pages one surface at a time.',
        'Each surface records rendered evidence, voice status, source-file consumption, and must-not checks before public release.'
      ],
      [
        'Signed surfaces use the C8 voice source.',
        'Brand pages remain last while they are minimal generated copy.'
      ],
      [
        'Do not move every workbench surface public in one batch without per-surface rollback.',
        'Do not publish brand pages as signed prose while their voice status is minimal-generated-copy.'
      ]
    ),
    step(
      'final-h4-drain-decision',
      'Decide whether H4 can drain',
      ['final-h4-drain'],
      ['app/data/nodes/node-integration-checklist.json', 'app/data/nodes/node-preview-matrix.json', 'app/data/nodes/readiness.json', 'docs/CONTENT-HANDOFF.md'],
      'node-integration-checklist.json#h4DrainContract',
      [
        'All generated smoke commands pass and app-owned evidence covers every prior drain step.',
        'H4 remains active if any generated node/Ask behavior still depends only on sample.json, in-memory entries, or unwalked preview groups.'
      ],
      [
        'The final decision records either H4 drained by app/design or the exact remaining app-owned blocker.',
        'No Codex data-only change is treated as sufficient to drain H4.'
      ],
      [
        'Do not mark H4 drained from data generation alone.',
        'Do not bury remaining app-owned blockers in a generic "integration done" note.'
      ]
    )
  ].map((item, index) => ({ ...item, step: index + 1 }));

  const coveredPhases = new Set(steps.flatMap(item => item.phaseIds));

  return {
    purpose: 'App-owned H4 drain contract for generated node and Ask integration.',
    status: 'pending-app-integration',
    activeHandoff: 'H4',
    namedConsumer: 'Claude H4 generated-node integration drain pass',
    h4DrainableFromDataAlone: false,
    drainRule: 'H4 drains only after app-owned implementation evidence covers every step here or documents equivalent coverage; generated data alone is insufficient.',
    steps,
    finalDecision: {
      expectedStatusBeforeAppWork: 'pending-app-integration',
      dataAloneIsInsufficient: true,
      drainOnlyWhen: [
        'The app-owned implementation has evidence for every h4DrainContract step.',
        'node-preview-matrix.json#runContract has been walked or equivalent app QA is documented for every group.',
        'publicGates.releaseContract has been walked surface by surface before public workbench graduation.',
        'docs/CONTENT-HANDOFF.md moves H4 to drained only after app/design makes that decision.'
      ],
      mustNot: [
        'Do not drain H4 from data generation alone.',
        'Do not drain H4 while generated node/Ask behavior still relies only on sample.json or in-memory fallback paths.'
      ]
    },
    coverage: {
      steps: steps.length,
      phaseCount: phaseIds.length,
      coveredPhaseCount: phaseIds.filter(id => coveredPhases.has(id)).length,
      allPhasesCovered: phaseIds.every(id => coveredPhases.has(id)),
      previewScenarios: (nodePreviewMatrixIndex.scenarios || []).length,
      publicGateSurfaces: (publicGates.surfaces || []).length,
      dataAloneDrainable: false,
      finalStepId: 'final-h4-drain-decision'
    }
  };
}

function buildH4ClosureManifest(checklist, nodePreviewMatrixIndex) {
  const drainContract = checklist.h4DrainContract || {};
  const finalStepId = drainContract.coverage?.finalStepId || 'final-h4-drain-decision';

  function layer(id, pointer, format, reviewRole, extra = {}) {
    return {
      id,
      pointer,
      format,
      reviewRole,
      drainableFromLayerAlone: false,
      ...extra
    };
  }

  const stackLayers = [
    layer(
      'manifest-index',
      'app/data/nodes/manifest.json',
      'ovs-node-manifest',
      'Lists generated node files, byte sizes, sha256 values, and load hints.'
    ),
    layer(
      'manifest-loader-plan',
      'app/data/nodes/manifest.json#loaderPlan',
      'manifest-loader-plan',
      'App-facing copy of the ordered runtime loader plan and cache-key policy.'
    ),
    layer(
      'node-load-plan',
      'app/data/nodes/node-load-plan.json',
      'ovs-node-load-plan',
      'Runtime loading stages, integrity behavior, budgets, and failure boundaries.'
    ),
    layer(
      'ask-core-startup-contract',
      'app/data/nodes/ask-core.json#startupContract',
      'ovs-ask-core-index',
      'Compact startup Ask contract, covered target types, and golden query order.'
    ),
    layer(
      'ask-index-lazy-boundary',
      'app/data/nodes/ask-index.json#loadHint',
      'ovs-ask-index',
      'Lazy product and barcode Ask boundary for the large full index.',
      { loadHint: 'lazy-product-search' }
    ),
    layer(
      'ask-fixtures',
      'app/data/nodes/ask-fixtures.json',
      'ovs-ask-fixtures',
      'Golden resolver cases for app-owned Ask integration checks.'
    ),
    layer(
      'ask-traces',
      'app/data/nodes/ask-traces.json',
      'ovs-ask-traces',
      'Deterministic top-result traces, ranks, hashes, and match reasons.'
    ),
    layer(
      'ask-presentation',
      'app/data/nodes/ask-presentation.json',
      'ovs-ask-presentation-contract',
      'Suggested Ask result labels, sections, actions, reasons, and empty states.'
    ),
    layer(
      'node-page-contracts',
      'app/data/nodes/node-page-contracts.json',
      'ovs-node-page-contracts',
      'Page-type route patterns, required fields, optional fields, and sample hashes.'
    ),
    layer(
      'node-route-fixtures',
      'app/data/nodes/node-route-fixtures.json',
      'ovs-node-route-fixtures',
      'Positive route parser fixtures for category, item, guide, and node hashes.'
    ),
    layer(
      'node-route-guardrails',
      'app/data/nodes/node-route-guardrails.json',
      'ovs-node-route-guardrails',
      'Malformed, unsupported, unknown-target, and canonicalization route guardrails.'
    ),
    layer(
      'node-runtime-states',
      'app/data/nodes/node-runtime-states.json',
      'ovs-node-runtime-states',
      'Loading, empty, unavailable, integrity, route, and offline state fixtures.'
    ),
    layer(
      'node-walkthroughs',
      'app/data/nodes/node-walkthroughs.json',
      'ovs-node-walkthroughs',
      'First-use concern-path walkthroughs from Ask result to generated node context.'
    ),
    layer(
      'node-preview-matrix',
      'app/data/nodes/node-preview-matrix.json',
      'ovs-node-preview-matrix',
      'Private-preview matrix covering startup, lazy, route, runtime, and flagship groups.',
      { status: nodePreviewMatrixIndex.status }
    ),
    layer(
      'node-preview-run-contract',
      'app/data/nodes/node-preview-matrix.json#runContract',
      'h4-preview-run-contract',
      'Ordered run groups and final h4-drain-decision scenario for app-owned QA.',
      { status: nodePreviewMatrixIndex.runContract?.status }
    ),
    layer(
      'public-gates',
      'app/data/nodes/node-integration-checklist.json#publicGates',
      'h4-public-gates',
      'Workbench surface gates for company, tag, errand, pulse, and brand pages.',
      { status: checklist.publicGates?.status }
    ),
    layer(
      'public-release-contract',
      'app/data/nodes/node-integration-checklist.json#publicGates.releaseContract',
      'h4-public-release-contract',
      'One-surface-at-a-time public release order and rollback boundary.',
      { status: checklist.publicGates?.releaseContract?.status }
    ),
    layer(
      'h4-drain-contract',
      'app/data/nodes/node-integration-checklist.json#h4DrainContract',
      'h4-drain-contract',
      'App-owned evidence steps and final H4 drain decision boundary.',
      { status: drainContract.status }
    ),
    layer(
      'node-integration-checklist',
      'app/data/nodes/node-integration-checklist.json',
      'ovs-node-integration-checklist',
      'Acceptance phases, smoke commands, public gates, and H4 drain contract.'
    ),
    layer(
      'readiness-report',
      'app/data/nodes/readiness.json',
      'ovs-node-readiness',
      'App-facing readiness summary that mirrors public gates, H4 drain, and closure.'
    )
  ];

  return {
    status: 'h4-generated-node-review-stack-closure',
    purpose: 'Close the generated H4 node and Ask review stack by naming every generated layer, the remaining app-owned gates, and the no-data-only drain boundary.',
    schema: 'h4-generated-node-review-stack-closure-v1',
    appOwned: true,
    activeHandoff: 'H4',
    localOnly: true,
    noServerAuthority: true,
    h4DrainableFromClosureAlone: false,
    generatedRecursionClosed: true,
    stackLayers,
    appOwnedGates: (drainContract.steps || []).map(step => ({
      stepId: step.id,
      label: step.label,
      trackedBy: 'app/data/nodes/node-integration-checklist.json#h4DrainContract.steps',
      requiresRunningAppEvidence: step.id !== finalStepId,
      finalDecision: step.id === finalStepId,
      phaseCount: (step.phaseIds || []).length,
      sourceFileCount: (step.sourceFiles || []).length
    })),
    previewGroups: (nodePreviewMatrixIndex.runContract?.runOrder || []).map(step => ({
      step: step.step,
      group: step.group,
      scenarioCount: (step.scenarioIds || []).length,
      finalGroup: (step.scenarioIds || []).includes('h4-drain-decision')
    })),
    publicGateSurfaces: (checklist.publicGates?.releaseContract?.releaseOrder || []).map(step => ({
      step: step.step,
      surfaceId: step.surfaceId,
      label: step.label,
      voiceStatus: step.voiceStatus
    })),
    smokeCommands: checklist.smokeCommands || [],
    completionRules: [
      'Run the H4 smoke commands, then walk the generated contracts in the running app or document equivalent app QA.',
      'Record local h4-local-evidence-v1 observations through the workbench evidence path before the final decision.',
      'Keep sample.json as legacy/non-runtime evidence; it cannot stand in for generated Ask or node integration.',
      'Move H4 in docs/CONTENT-HANDOFF.md only after app/design records the final drain or remaining blocker decision.',
      'Keep screenshots, typed queries, tester notes, browsing history, analytics identifiers, and local receipts out of automatic upload paths.'
    ],
    stopRules: [
      'Do not add another generated node validator layer to drain H4.',
      'Do not treat green builds, generated closure, or file existence as running-app evidence.',
      'Do not mark sample.json or in-memory legacy search as generated node/Ask integration evidence.',
      'Do not move public gates in one batch; keep the one-surface-at-a-time release rule.',
      'Do not upload local H4 receipts, tester notes, screenshots, or evidence summaries automatically.'
    ],
    nextAppActions: [
      'Open the H4 workbench in the running app and walk loader, Ask, route, runtime, preview, walkthrough, and public-gate sections.',
      'Run the button-gated lazy Ask check and confirm ask-index.json stays out of startup.',
      'Walk public gates one surface at a time in the release order before graduating any workbench surface.',
      'Either drain H4 in docs/CONTENT-HANDOFF.md with app/design evidence or name the exact remaining blocker.'
    ],
    coverage: {
      stackLayerCount: stackLayers.length,
      appOwnedGateCount: (drainContract.steps || []).length,
      finalGateId: finalStepId,
      phaseCount: (checklist.phases || []).length,
      previewScenarioCount: (nodePreviewMatrixIndex.scenarios || []).length,
      previewGroupCount: (nodePreviewMatrixIndex.runContract?.runOrder || []).length,
      publicGateSurfaceCount: (checklist.publicGates?.surfaces || []).length,
      smokeCommandCount: (checklist.smokeCommands || []).length,
      generatedRecursionClosed: true,
      closureAloneDrainable: false
    }
  };
}

function buildNodeIntegrationChecklist(brandIndex, companyIndex, askIndex, askCoreIndex, askFixturesIndex, askTracesIndex, askPresentationIndex, nodeWalkthroughsIndex, nodePageContractsIndex, nodeRouteFixturesIndex, nodeRouteGuardrailsIndex, nodeLoadPlanIndex, nodeRuntimeStatesIndex, nodePreviewMatrixIndex, built) {
  const askCoreBytes = jsonBytes(askCoreIndex);
  const startupBudgetBytes = 700000;
  const minimumHeadroomBytes = 50000;
  const devContractFiles = [
    'ask-fixtures.json',
    'ask-traces.json',
    'ask-presentation.json',
    'node-walkthroughs.json',
    'node-page-contracts.json',
    'node-route-fixtures.json',
    'node-route-guardrails.json',
    'node-runtime-states.json',
    'node-preview-matrix.json',
    'node-integration-checklist.json'
  ];

  function phase(id, label, sourceFiles, acceptanceCriteria, risk) {
    return {
      id,
      label,
      owner: 'app/design',
      status: 'pending-app-integration',
      sourceFiles,
      acceptanceCriteria,
      risk
    };
  }

  const phases = [
    phase(
      'discover-load-plan',
      'Discover load plan and budgets',
      ['manifest.json', 'node-load-plan.json', 'readiness.json', 'ask-core.json', 'ask-index.json'],
      [
        'Load manifest/readiness first or embed equivalent file metadata.',
        'Follow node-load-plan.json stages for eager, deferred, lazy, and dev-contract files.',
        'Keep ask-core.json eager and below the startup budget with minimum headroom.',
        'Keep ask-index.json lazy for product-name and barcode lookup.',
        'Use manifest sha256 fields to detect stale or corrupted cached node files.'
      ],
      'Startup latency or stale cache behavior if all indexes are loaded eagerly.'
    ),
    phase(
      'startup-ask',
      'Wire startup Ask against compact core',
      ['ask-core.json', 'ask-fixtures.json', 'ask-traces.json'],
      [
        'Core golden queries resolve without dead ends.',
        'Rendered top results preserve labels, hashes, match reasons, and matched rank expectations.',
        'Typo matches rank before loose containment for cases such as nestel.'
      ],
      'Search may feel clever in data audits but confusing in UI if rank/reason order drifts.'
    ),
    phase(
      'lazy-product-ask',
      'Add lazy product and barcode lookup',
      ['ask-index.json', 'ask-fixtures.json', 'ask-traces.json'],
      [
        'Full Ask loads only when product or barcode lookup is needed.',
        'Barcode fixture routes to the expected item hash.',
        'No UI path requires ask-index.json before startup search is usable.'
      ],
      'Large full index can dominate startup if accidentally eager-loaded.'
    ),
    phase(
      'ask-presentation',
      'Render Ask result presentation states',
      ['ask-presentation.json', 'ask-traces.json'],
      [
        'Places and entries sections are both represented.',
        'Every target type has badge/action/route copy available.',
        'Empty state offers request and browse routes without implying coverage.'
      ],
      'Search can resolve correctly while still feeling like a dead end.'
    ),
    phase(
      'route-parser',
      'Implement route parser and guardrails',
      ['node-page-contracts.json', 'node-route-fixtures.json', 'node-route-guardrails.json'],
      [
        'All positive route fixtures parse to expected ids and params.',
        'Malformed and unsupported hashes do not fabricate content pages.',
        'Unknown targets parse but route to a not-found/not-covered state.',
        'Non-canonical line hashes canonicalize to encoded line ids.'
      ],
      'Router edge cases can create blank panes or fabricated pages.'
    ),
    phase(
      'runtime-states',
      'Render loading, empty, and failure states',
      ['node-runtime-states.json', 'node-load-plan.json', 'node-route-guardrails.json', 'ask-presentation.json'],
      [
        'Loading, unavailable, empty, integrity, route, and offline state families have app-owned treatments.',
        'Hash mismatch and parse failure paths never use stale or fabricated generated data.',
        'Lazy product lookup can fail without hiding compact core Ask results.'
      ],
      'A correct data loader can still feel broken if partial failure states collapse into blank panes.'
    ),
    phase(
      'page-rendering',
      'Render page types from generated contracts',
      ['node-page-contracts.json', 'brands.json', 'companies.json', 'tags.json', 'errands.json', 'app/guides.js', 'app/data/*.json'],
      [
        'Category, item, guide, brand, company, tag, errand, and line examples render.',
        'Required fields are treated as hard assumptions; optional fields are checked before display.',
        'Line ids with encoded colons round-trip from route to page data.'
      ],
      'Node pages may render inconsistently if each page type invents its own data assumptions.'
    ),
    phase(
      'flagship-walkthroughs',
      'Run first-use flagship walkthroughs',
      ['node-walkthroughs.json', 'ask-core.json', 'brands.json', 'companies.json', 'content/lines.json'],
      [
        'Nestle, Coca-Cola, and Amazon concern paths can be followed end to end.',
        'Company pages expose ownership receipts and known brands without overclaiming coverage.',
        'Brand pages expose categories and top product examples.'
      ],
      'The launch demo may pass isolated tests but fail as a human path.'
    ),
    phase(
      'workbench-public-gates',
      'Graduate workbench surfaces one at a time',
      ['brands.json', 'companies.json', 'tags.json', 'errands.json', 'app/data/pulse.json', 'codex.md'],
      [
        'Use publicGates.surfaces as the release checklist for brand, company, tag, errand, and pulse surfaces.',
        'Move a surface public only after app-owned rendering consumes the named generated files or documents equivalent coverage.',
        'Keep brand pages in the minimal-generated-copy posture unless app/design writes and signs brand-specific page copy.'
      ],
      'The workbench can shrink unevenly if a surface is moved public before its generated prose and receipts are actually rendered.'
    ),
    phase(
      'final-h4-drain',
      'Decide whether H4 is drainable',
      devContractFiles,
      [
        'All generated contract audits pass.',
        'App-owned implementation either consumes these files or documents an equivalent merge strategy.',
        'H4 remains active until app code no longer depends only on sample.json for node/Ask behavior.'
      ],
      'The handoff can look solved in data while the app still uses the old in-memory path.'
    )
  ];
  const publicGates = buildWorkbenchPublicGates(brandIndex, companyIndex);
  const h4DrainContract = buildH4DrainContract(phases, publicGates, nodePreviewMatrixIndex);

  const checklist = {
    format: 'ovs-node-integration-checklist',
    version: '0.1',
    built,
    source: [
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
    ],
    purpose: 'Generated acceptance checklist for app-owned node/Ask integration, tying load plan, search, routes, pages, and flagship walkthroughs together.',
    appLaneNote: 'Checklist only; app-owned code decides implementation details, UI copy, visual design, and when H4 can be drained.',
    readinessTargets: {
      startupBudgetBytes,
      minimumHeadroomBytes,
      askCoreBytes,
      askCoreHeadroomBytes: startupBudgetBytes - askCoreBytes,
      askCoreWithinBudget: askCoreBytes < startupBudgetBytes,
      askCoreHasHeadroom: startupBudgetBytes - askCoreBytes >= minimumHeadroomBytes,
      fullAskBytes: jsonBytes(askIndex),
      nodeLoadPlanStages: (nodeLoadPlanIndex.stages || []).length,
      nodeRuntimeStateCases: (nodeRuntimeStatesIndex.cases || []).length,
      nodePreviewScenarios: (nodePreviewMatrixIndex.scenarios || []).length,
      eagerRuntimeFiles: ['manifest.json', 'node-load-plan.json', 'tags.json', 'errands.json', 'synonyms.json', 'ask-core.json'],
      deferredRuntimeFiles: ['brands.json', 'companies.json'],
      lazyRuntimeFiles: ['ask-index.json'],
      legacyNonRuntimeFiles: ['sample.json'],
      devContractFiles
    },
    counts: {
      brands: (brandIndex.nodes || []).length,
      companies: (companyIndex.nodes || []).length,
      askCoreTokens: Object.keys(askCoreIndex.tokens || {}).length,
      askCoreTargets: Object.keys(askCoreIndex.targets || {}).length,
      askTokens: Object.keys(askIndex.tokens || {}).length,
      askFixtures: (askFixturesIndex.cases || []).length,
      askTraces: (askTracesIndex.traces || []).length,
      askPresentationCases: (askPresentationIndex.qaCases || []).length,
      nodeWalkthroughs: (nodeWalkthroughsIndex.walkthroughs || []).length,
      nodePageContracts: (nodePageContractsIndex.contracts || []).length,
      nodeRouteFixtures: (nodeRouteFixturesIndex.cases || []).length,
      nodeRouteGuardrails: (nodeRouteGuardrailsIndex.cases || []).length,
      nodeLoadPlanStages: (nodeLoadPlanIndex.stages || []).length,
      nodeRuntimeStateCases: (nodeRuntimeStatesIndex.cases || []).length,
      nodePreviewScenarios: (nodePreviewMatrixIndex.scenarios || []).length
    },
    smokeCommands: [
      'node pipeline/build_nodes.js --check',
      'node research/node_index_audit.js',
      'node research/ask_readiness_audit.js',
      'node research/node_walkthrough_audit.js',
      'npm run audit:handoff',
      'npm run verify'
    ],
    publicGates,
    h4DrainContract,
    phases
  };
  checklist.h4ClosureManifest = buildH4ClosureManifest(checklist, nodePreviewMatrixIndex);
  return checklist;
}

function buildReadinessReport(brandIndex, companyIndex, askIndex, askCoreIndex, askFixturesIndex, askTracesIndex, askPresentationIndex, nodeWalkthroughsIndex, nodePageContractsIndex, nodeRouteFixturesIndex, nodeRouteGuardrailsIndex, nodeIntegrationChecklistIndex, nodeLoadPlanIndex, nodeRuntimeStatesIndex, nodePreviewMatrixIndex, built) {
  const askCoreBytes = jsonBytes(askCoreIndex);
  const fullAskBytes = jsonBytes(askIndex);
  const startupBudgetBytes = 700000;
  const minimumHeadroomBytes = 50000;
  const askCoreHeadroomBytes = startupBudgetBytes - askCoreBytes;
  const goldenQueries = (askTracesIndex.traces || []).map(trace => ({
    query: trace.query,
    layer: trace.layer,
    matched: trace.matched,
    matchedRank: trace.matchedRank,
    ok: trace.ok,
    top: (trace.top || []).slice(0, 3).map(row => ({
      id: row.id,
      label: row.label,
      type: row.type,
      hash: row.hash,
      reason: row.reason
    }))
  }));

  return {
    format: 'ovs-node-readiness',
    version: '0.1',
    built,
    source: 'pipeline/build_nodes.js',
    status: 'ready-for-app-integration',
    appLaneNote: 'Generated data only; app-owned code chooses when and how to load these files.',
    runtimePlan: [
      {
        step: 1,
        files: ['manifest.json', 'node-load-plan.json'],
        loadHint: 'eager-metadata',
        bytes: jsonBytes(nodeLoadPlanIndex),
        purpose: 'Discover available node indexes, byte sizes, integrity hashes, and runtime loading stages.'
      },
      {
        step: 2,
        files: ['tags.json', 'errands.json', 'synonyms.json'],
        loadHint: 'eager',
        bytes: (nodeLoadPlanIndex.budgets && nodeLoadPlanIndex.budgets.establishedEagerBytes) || 0,
        purpose: 'Small node helpers for tag, errand, and everyday-phrase routing; sample.json stays out of runtime evidence.'
      },
      {
        step: 3,
        file: 'ask-core.json',
        loadHint: 'eager-search',
        bytes: askCoreBytes,
        budgetBytes: startupBudgetBytes,
        headroomBytes: askCoreHeadroomBytes,
        purpose: 'Startup search over categories, brands, companies, tags, guides, errands, and lines.'
      },
      {
        step: 4,
        files: ['brands.json', 'companies.json'],
        loadHint: 'defer-page-nodes',
        bytes: jsonBytes(brandIndex) + jsonBytes(companyIndex),
        purpose: 'Full brand/company node pages and ownership context.'
      },
      {
        step: 5,
        file: 'ask-index.json',
        loadHint: 'lazy-product-search',
        bytes: fullAskBytes,
        purpose: 'Lazy product-name and barcode lookup.'
      }
    ],
    devContracts: [
      {
        file: 'ask-fixtures.json',
        loadHint: 'dev-contract',
        cases: (askFixturesIndex.cases || []).length,
        purpose: 'Golden resolver cases for app integration tests.'
      },
      {
        file: 'ask-traces.json',
        loadHint: 'dev-contract',
        traces: (askTracesIndex.traces || []).length,
        purpose: 'Expected top results, match ranks, labels, hashes, and reasons for visual QA.'
      },
      {
        file: 'ask-presentation.json',
        loadHint: 'dev-contract',
        qaCases: (askPresentationIndex.qaCases || []).length,
        purpose: 'Suggested type labels, actions, result sections, match-reason labels, and empty-state doors.'
      },
      {
        file: 'node-walkthroughs.json',
        loadHint: 'dev-contract',
        walkthroughs: (nodeWalkthroughsIndex.walkthroughs || []).length,
        purpose: 'Flagship Ask-to-node QA paths for preview demos and app integration checks.'
      },
      {
        file: 'node-page-contracts.json',
        loadHint: 'dev-contract',
        contracts: (nodePageContractsIndex.contracts || []).length,
        purpose: 'Page-type route patterns, required fields, sections, and sample hashes for app-owned rendering.'
      },
      {
        file: 'node-route-fixtures.json',
        loadHint: 'dev-contract',
        cases: (nodeRouteFixturesIndex.cases || []).length,
        purpose: 'Positive route parser fixtures covering category, item, guide, and node hashes.'
      },
      {
        file: 'node-route-guardrails.json',
        loadHint: 'dev-contract',
        cases: (nodeRouteGuardrailsIndex.cases || []).length,
        purpose: 'Malformed, unsupported, unknown-target, and canonicalization route guardrails.'
      },
      {
        file: 'node-runtime-states.json',
        loadHint: 'dev-contract',
        cases: (nodeRuntimeStatesIndex.cases || []).length,
        purpose: 'Loading, empty, unavailable, integrity, route, and offline state fixtures for app integration QA.'
      },
      {
        file: 'node-preview-matrix.json',
        loadHint: 'dev-contract',
        scenarios: (nodePreviewMatrixIndex.scenarios || []).length,
        purpose: 'Private-preview and H4-drain QA matrix tying search, routes, runtime states, and flagship walkthroughs together.'
      },
      {
        file: 'node-integration-checklist.json',
        loadHint: 'dev-contract',
        phases: (nodeIntegrationChecklistIndex.phases || []).length,
        purpose: 'Acceptance checklist tying load plan, Ask, routes, pages, guardrails, and flagship walkthroughs together.'
      },
      {
        file: 'node-load-plan.json',
        loadHint: 'runtime-contract',
        stages: (nodeLoadPlanIndex.stages || []).length,
        purpose: 'Runtime loading stages, integrity behavior, and failure-mode contract for app-owned integration.'
      }
    ],
    routeContract: {
      category: '#explore/<cid>',
      guide: '#guide/<slug>',
      item: '#item/<cid>/<code>',
      node: '#n/<type>/<slug>'
    },
    counts: {
      brands: (brandIndex.nodes || []).length,
      brandLongTail: brandIndex.longTail || 0,
      companies: (companyIndex.nodes || []).length,
      askCoreTokens: Object.keys(askCoreIndex.tokens || {}).length,
      askCoreTargets: Object.keys(askCoreIndex.targets || {}).length,
      askTokens: Object.keys(askIndex.tokens || {}).length,
      askAliases: Object.keys(askIndex.aliases || {}).length,
      goldenQueries: goldenQueries.length
    },
    budgets: {
      askCoreBytes,
      startupBudgetBytes,
      minimumHeadroomBytes,
      askCoreHeadroomBytes,
      askCoreWithinBudget: askCoreBytes < startupBudgetBytes,
      askCoreHasHeadroom: askCoreHeadroomBytes >= minimumHeadroomBytes,
      fullAskBytes,
      nodeLoadPlanStages: (nodeLoadPlanIndex.stages || []).length,
      nodeRuntimeStateCases: (nodeRuntimeStatesIndex.cases || []).length,
      nodePreviewScenarios: (nodePreviewMatrixIndex.scenarios || []).length
    },
    publicGates: nodeIntegrationChecklistIndex.publicGates,
    h4DrainContract: nodeIntegrationChecklistIndex.h4DrainContract,
    h4ClosureManifest: nodeIntegrationChecklistIndex.h4ClosureManifest,
    goldenQueries
  };
}

function summarizeExistingNodeFile(fileName, type, loadHint) {
  const file = path.join(OUT_DIR, fileName);
  if (!fs.existsSync(file)) return null;
  const data = readJson(file);
  const summary = {
    type,
    file: fileName,
    format: data.format || null,
    version: data.version || null,
    built: data.built || null,
    bytes: fs.statSync(file).size,
    sha256: sha256Text(fs.readFileSync(file, 'utf8'))
  };
  if (loadHint) summary.loadHint = loadHint;
  if (Array.isArray(data.nodes)) summary.nodes = data.nodes.length;
  if (Array.isArray(data.cases)) summary.cases = data.cases.length;
  if (Array.isArray(data.traces)) summary.traces = data.traces.length;
  if (data.aliases && typeof data.aliases === 'object') summary.aliases = Object.keys(data.aliases).length;
  if (data.normalized && typeof data.normalized === 'object') summary.normalized = Object.keys(data.normalized).length;
  return summary;
}

function buildManifestLoaderPlan(nodeLoadPlanIndex, indexes) {
  const byFile = new Map(indexes.map(item => [item.file, item]));

  function fileSummary(fileName) {
    if (fileName === 'manifest.json') {
      return {
        file: fileName,
        type: 'manifest',
        loadHint: 'eager-metadata',
        integrity: 'self-unhashed',
        cacheKey: null
      };
    }

    const entry = byFile.get(fileName);
    if (!entry) {
      return {
        file: fileName,
        type: 'unknown',
        loadHint: 'unknown',
        integrity: 'missing-from-manifest',
        cacheKey: null
      };
    }

    return {
      file: fileName,
      type: entry.type,
      loadHint: entry.loadHint,
      bytes: entry.bytes,
      sha256: entry.sha256,
      cacheKey: `${fileName}:${entry.sha256}`
    };
  }

  return {
    purpose: 'App-readable runtime fetch plan derived from node-load-plan.json and manifest hashes.',
    source: 'app/data/nodes/node-load-plan.json',
    integrity: {
      algorithm: nodeLoadPlanIndex.integrityContract?.algorithm || 'sha256',
      cacheKey: nodeLoadPlanIndex.integrityContract?.cacheKey || '<file>:<sha256>',
      validate: nodeLoadPlanIndex.integrityContract?.validate || '',
      retry: nodeLoadPlanIndex.integrityContract?.retry || '',
      fallback: nodeLoadPlanIndex.integrityContract?.fallback || ''
    },
    stages: (nodeLoadPlanIndex.stages || []).map((stage, index) => ({
      step: index + 1,
      id: stage.id,
      label: stage.label,
      loadHint: stage.loadHint,
      runtime: stage.loadHint !== 'dev-contract',
      trigger: stage.trigger,
      failureMode: stage.failureMode,
      bytes: Number.isInteger(stage.bytes) ? stage.bytes : undefined,
      files: (stage.files || []).map(fileSummary)
    })),
    totals: {
      stages: nodeLoadPlanIndex.totals?.stages || (nodeLoadPlanIndex.stages || []).length,
      runtimeStages: nodeLoadPlanIndex.totals?.runtimeStages || (nodeLoadPlanIndex.stages || []).filter(stage => stage.loadHint !== 'dev-contract').length,
      devContractStages: nodeLoadPlanIndex.totals?.devContractStages || (nodeLoadPlanIndex.stages || []).filter(stage => stage.loadHint === 'dev-contract').length
    }
  };
}

function buildManifest(brandIndex, companyIndex, askIndex, askCoreIndex, avoidTokensIndex, askFixturesIndex, askTracesIndex, askPresentationIndex, nodeWalkthroughsIndex, nodePageContractsIndex, nodeRouteFixturesIndex, nodeRouteGuardrailsIndex, nodeIntegrationChecklistIndex, nodeLoadPlanIndex, nodeRuntimeStatesIndex, nodePreviewMatrixIndex, readinessIndex, built) {
  const indexes = [];
  for (const item of [
    summarizeExistingNodeFile('sample.json', 'sample', 'legacy-sample'),
    summarizeExistingNodeFile('tags.json', 'tag', 'eager'),
    summarizeExistingNodeFile('errands.json', 'errand', 'eager')
  ]) {
    if (item) indexes.push(item);
  }

  indexes.push({
    type: 'brand',
    file: 'brands.json',
    format: brandIndex.format,
    version: brandIndex.version,
    built: brandIndex.built,
    bytes: jsonBytes(brandIndex),
    sha256: jsonSha256(brandIndex),
    loadHint: 'defer-page-nodes',
    nodes: (brandIndex.nodes || []).length,
    longTail: brandIndex.longTail || 0
  });
  indexes.push({
    type: 'company',
    file: 'companies.json',
    format: companyIndex.format,
    version: companyIndex.version,
    built: companyIndex.built,
    bytes: jsonBytes(companyIndex),
    sha256: jsonSha256(companyIndex),
    loadHint: 'defer-page-nodes',
    nodes: (companyIndex.nodes || []).length
  });

  const synonyms = summarizeExistingNodeFile('synonyms.json', 'synonym', 'eager');
  if (synonyms) indexes.push(synonyms);

  indexes.push({
    type: 'ask-core',
    file: 'ask-core.json',
    format: askCoreIndex.format,
    version: askCoreIndex.version,
    built: askCoreIndex.built,
    bytes: jsonBytes(askCoreIndex),
    sha256: jsonSha256(askCoreIndex),
    loadHint: 'eager-search',
    tokens: Object.keys(askCoreIndex.tokens || {}).length,
    aliases: Object.keys(askCoreIndex.aliases || {}).length,
    targets: Object.keys(askCoreIndex.targets || {}).length
  });

  indexes.push({
    type: 'ask',
    file: 'ask-index.json',
    format: askIndex.format,
    version: askIndex.version,
    built: askIndex.built,
    bytes: jsonBytes(askIndex),
    sha256: jsonSha256(askIndex),
    loadHint: 'lazy-product-search',
    tokens: Object.keys(askIndex.tokens || {}).length,
    aliases: Object.keys(askIndex.aliases || {}).length,
    barcodeLikeItems: askIndex.stats?.barcodeLikeItems || 0
  });

  indexes.push({
    type: 'avoid-token',
    file: 'avoid-tokens.json',
    format: avoidTokensIndex.format,
    version: avoidTokensIndex.version,
    built: avoidTokensIndex.built,
    bytes: jsonBytes(avoidTokensIndex),
    sha256: jsonSha256(avoidTokensIndex),
    loadHint: 'extension-data',
    families: (avoidTokensIndex.families || []).length,
    tokens: avoidTokensIndex.stats?.tokens || 0,
    uniqueTokens: avoidTokensIndex.stats?.uniqueTokens || 0
  });

  indexes.push({
    type: 'ask-fixtures',
    file: 'ask-fixtures.json',
    format: askFixturesIndex.format,
    version: askFixturesIndex.version,
    built: askFixturesIndex.built,
    bytes: jsonBytes(askFixturesIndex),
    sha256: jsonSha256(askFixturesIndex),
    loadHint: 'dev-contract',
    cases: (askFixturesIndex.cases || []).length
  });
  indexes.push({
    type: 'ask-traces',
    file: 'ask-traces.json',
    format: askTracesIndex.format,
    version: askTracesIndex.version,
    built: askTracesIndex.built,
    bytes: jsonBytes(askTracesIndex),
    sha256: jsonSha256(askTracesIndex),
    loadHint: 'dev-contract',
    traces: (askTracesIndex.traces || []).length
  });
  indexes.push({
    type: 'ask-presentation',
    file: 'ask-presentation.json',
    format: askPresentationIndex.format,
    version: askPresentationIndex.version,
    built: askPresentationIndex.built,
    bytes: jsonBytes(askPresentationIndex),
    sha256: jsonSha256(askPresentationIndex),
    loadHint: 'dev-contract',
    qaCases: (askPresentationIndex.qaCases || []).length
  });
  indexes.push({
    type: 'node-walkthroughs',
    file: 'node-walkthroughs.json',
    format: nodeWalkthroughsIndex.format,
    version: nodeWalkthroughsIndex.version,
    built: nodeWalkthroughsIndex.built,
    bytes: jsonBytes(nodeWalkthroughsIndex),
    sha256: jsonSha256(nodeWalkthroughsIndex),
    loadHint: 'dev-contract',
    walkthroughs: (nodeWalkthroughsIndex.walkthroughs || []).length
  });
  indexes.push({
    type: 'node-page-contracts',
    file: 'node-page-contracts.json',
    format: nodePageContractsIndex.format,
    version: nodePageContractsIndex.version,
    built: nodePageContractsIndex.built,
    bytes: jsonBytes(nodePageContractsIndex),
    sha256: jsonSha256(nodePageContractsIndex),
    loadHint: 'dev-contract',
    contracts: (nodePageContractsIndex.contracts || []).length
  });
  indexes.push({
    type: 'node-route-fixtures',
    file: 'node-route-fixtures.json',
    format: nodeRouteFixturesIndex.format,
    version: nodeRouteFixturesIndex.version,
    built: nodeRouteFixturesIndex.built,
    bytes: jsonBytes(nodeRouteFixturesIndex),
    sha256: jsonSha256(nodeRouteFixturesIndex),
    loadHint: 'dev-contract',
    cases: (nodeRouteFixturesIndex.cases || []).length
  });
  indexes.push({
    type: 'node-route-guardrails',
    file: 'node-route-guardrails.json',
    format: nodeRouteGuardrailsIndex.format,
    version: nodeRouteGuardrailsIndex.version,
    built: nodeRouteGuardrailsIndex.built,
    bytes: jsonBytes(nodeRouteGuardrailsIndex),
    sha256: jsonSha256(nodeRouteGuardrailsIndex),
    loadHint: 'dev-contract',
    cases: (nodeRouteGuardrailsIndex.cases || []).length
  });
  indexes.push({
    type: 'node-runtime-states',
    file: 'node-runtime-states.json',
    format: nodeRuntimeStatesIndex.format,
    version: nodeRuntimeStatesIndex.version,
    built: nodeRuntimeStatesIndex.built,
    bytes: jsonBytes(nodeRuntimeStatesIndex),
    sha256: jsonSha256(nodeRuntimeStatesIndex),
    loadHint: 'dev-contract',
    cases: (nodeRuntimeStatesIndex.cases || []).length,
    families: Object.keys(nodeRuntimeStatesIndex.totals?.byFamily || {}).length
  });
  indexes.push({
    type: 'node-preview-matrix',
    file: 'node-preview-matrix.json',
    format: nodePreviewMatrixIndex.format,
    version: nodePreviewMatrixIndex.version,
    built: nodePreviewMatrixIndex.built,
    bytes: jsonBytes(nodePreviewMatrixIndex),
    sha256: jsonSha256(nodePreviewMatrixIndex),
    loadHint: 'dev-contract',
    scenarios: (nodePreviewMatrixIndex.scenarios || []).length,
    groups: (nodePreviewMatrixIndex.groups || []).length
  });
  indexes.push({
    type: 'node-integration-checklist',
    file: 'node-integration-checklist.json',
    format: nodeIntegrationChecklistIndex.format,
    version: nodeIntegrationChecklistIndex.version,
    built: nodeIntegrationChecklistIndex.built,
    bytes: jsonBytes(nodeIntegrationChecklistIndex),
    sha256: jsonSha256(nodeIntegrationChecklistIndex),
    loadHint: 'dev-contract',
    phases: (nodeIntegrationChecklistIndex.phases || []).length
  });
  indexes.push({
    type: 'node-load-plan',
    file: 'node-load-plan.json',
    format: nodeLoadPlanIndex.format,
    version: nodeLoadPlanIndex.version,
    built: nodeLoadPlanIndex.built,
    bytes: jsonBytes(nodeLoadPlanIndex),
    sha256: jsonSha256(nodeLoadPlanIndex),
    loadHint: 'eager-metadata',
    stages: (nodeLoadPlanIndex.stages || []).length
  });
  indexes.push({
    type: 'readiness',
    file: 'readiness.json',
    format: readinessIndex.format,
    version: readinessIndex.version,
    built: readinessIndex.built,
    bytes: jsonBytes(readinessIndex),
    sha256: jsonSha256(readinessIndex),
    loadHint: 'dev-contract',
    status: readinessIndex.status
  });

  const generatedPageNodes = indexes
    .filter(item => ['tag', 'errand', 'brand', 'company'].includes(item.type))
    .reduce((sum, item) => sum + (item.nodes || 0), 0);
  const loaderPlan = buildManifestLoaderPlan(nodeLoadPlanIndex, indexes);

  return {
    format: 'ovs-node-manifest',
    version: '0.1',
    built,
    source: 'pipeline/build_nodes.js',
    appLaneNote: 'App-owned code chooses which node indexes to load and how to merge them.',
    integrity: {
      algorithm: 'sha256',
      scope: 'Each index entry hashes the canonical pretty-printed JSON body of that file; manifest.json does not hash itself.'
    },
    loadOrder: [
      'node-load-plan.json',
      'tags.json',
      'errands.json',
      'synonyms.json',
      'ask-core.json',
      'brands.json',
      'companies.json',
      'ask-index.json',
      'avoid-tokens.json',
      'sample.json'
    ],
    loaderPlan,
    indexes,
    totals: {
      generatedPageNodes,
      askCoreTokens: Object.keys(askCoreIndex.tokens || {}).length,
      askCoreTargets: Object.keys(askCoreIndex.targets || {}).length,
      askTokens: Object.keys(askIndex.tokens || {}).length,
      askAliases: Object.keys(askIndex.aliases || {}).length,
      askBarcodeLikeItems: askIndex.stats?.barcodeLikeItems || 0,
      avoidTokenFamilies: (avoidTokensIndex.families || []).length,
      avoidTokens: avoidTokensIndex.stats?.tokens || 0,
      avoidUniqueTokens: avoidTokensIndex.stats?.uniqueTokens || 0,
      askFixtures: (askFixturesIndex.cases || []).length,
      askTraces: (askTracesIndex.traces || []).length,
      askPresentationCases: (askPresentationIndex.qaCases || []).length,
      nodeWalkthroughs: (nodeWalkthroughsIndex.walkthroughs || []).length,
      nodePageContracts: (nodePageContractsIndex.contracts || []).length,
      nodeRouteFixtures: (nodeRouteFixturesIndex.cases || []).length,
      nodeRouteGuardrails: (nodeRouteGuardrailsIndex.cases || []).length,
      nodeRuntimeStateCases: (nodeRuntimeStatesIndex.cases || []).length,
      nodePreviewScenarios: (nodePreviewMatrixIndex.scenarios || []).length,
      nodeIntegrationPhases: (nodeIntegrationChecklistIndex.phases || []).length,
      nodeLoadPlanStages: (nodeLoadPlanIndex.stages || []).length,
      readinessReports: 1
    }
  };
}

function buildAll() {
  const categories = loadCategories();
  const edges = readJson(EDGES_SRC);
  const lines = readJson(LINES_SRC);
  const built = stableBuiltDate();
  const ownership = ownershipGraph(edges);
  const brandIndex = buildBrandIndex(categories, ownership, built);
  const companyIndex = buildCompanyIndex(ownership, brandIndex, lines, built);
  const askIndex = withAskIndexBudget(buildAskIndex(categories, brandIndex, companyIndex, lines, built));
  const askCoreIndex = buildAskCoreIndex(askIndex, categories, brandIndex, companyIndex, lines, built);
  const avoidTokensIndex = buildAvoidTokens(lines, companyIndex, built);
  let avoidBytes = -1;
  while (avoidTokensIndex.stats.bytes !== avoidBytes) {
    avoidBytes = avoidTokensIndex.stats.bytes;
    avoidTokensIndex.stats.bytes = jsonBytes(avoidTokensIndex);
  }
  const askFixturesIndex = buildAskFixtures(categories, built);
  const askTracesIndex = buildAskTraces(askFixturesIndex, askIndex, askCoreIndex, categories, brandIndex, companyIndex, lines, built);
  const askPresentationIndex = buildAskPresentation(askTracesIndex, built);
  const nodeWalkthroughsIndex = buildNodeWalkthroughs(categories, askCoreIndex, brandIndex, companyIndex, lines, built);
  const nodePageContractsIndex = buildNodePageContracts(categories, brandIndex, companyIndex, lines, built);
  const nodeRouteFixturesIndex = buildNodeRouteFixtures(nodePageContractsIndex, built);
  const nodeRouteGuardrailsIndex = buildNodeRouteGuardrails(categories, brandIndex, companyIndex, lines, built);
  const nodeLoadPlanIndex = buildNodeLoadPlan(brandIndex, companyIndex, askIndex, askCoreIndex, built);
  const nodeRuntimeStatesIndex = buildNodeRuntimeStates(nodeLoadPlanIndex, askPresentationIndex, nodeRouteGuardrailsIndex, built);
  const nodePreviewMatrixIndex = buildNodePreviewMatrix(askTracesIndex, askPresentationIndex, nodeWalkthroughsIndex, nodeRouteFixturesIndex, nodeRouteGuardrailsIndex, nodeLoadPlanIndex, nodeRuntimeStatesIndex, built);
  const nodeIntegrationChecklistIndex = buildNodeIntegrationChecklist(brandIndex, companyIndex, askIndex, askCoreIndex, askFixturesIndex, askTracesIndex, askPresentationIndex, nodeWalkthroughsIndex, nodePageContractsIndex, nodeRouteFixturesIndex, nodeRouteGuardrailsIndex, nodeLoadPlanIndex, nodeRuntimeStatesIndex, nodePreviewMatrixIndex, built);
  const readinessIndex = buildReadinessReport(brandIndex, companyIndex, askIndex, askCoreIndex, askFixturesIndex, askTracesIndex, askPresentationIndex, nodeWalkthroughsIndex, nodePageContractsIndex, nodeRouteFixturesIndex, nodeRouteGuardrailsIndex, nodeIntegrationChecklistIndex, nodeLoadPlanIndex, nodeRuntimeStatesIndex, nodePreviewMatrixIndex, built);
  const manifestIndex = buildManifest(brandIndex, companyIndex, askIndex, askCoreIndex, avoidTokensIndex, askFixturesIndex, askTracesIndex, askPresentationIndex, nodeWalkthroughsIndex, nodePageContractsIndex, nodeRouteFixturesIndex, nodeRouteGuardrailsIndex, nodeIntegrationChecklistIndex, nodeLoadPlanIndex, nodeRuntimeStatesIndex, nodePreviewMatrixIndex, readinessIndex, built);
  return { brandIndex, companyIndex, askIndex, askCoreIndex, avoidTokensIndex, askFixturesIndex, askTracesIndex, askPresentationIndex, nodeWalkthroughsIndex, nodePageContractsIndex, nodeRouteFixturesIndex, nodeRouteGuardrailsIndex, nodeIntegrationChecklistIndex, nodeLoadPlanIndex, nodeRuntimeStatesIndex, nodePreviewMatrixIndex, readinessIndex, manifestIndex };
}

function expectedNodeOutputFiles(manifestIndex) {
  const expected = new Set(['manifest.json']);
  for (const entry of manifestIndex.indexes || []) {
    const file = entry.file;
    if (typeof file !== 'string' || path.basename(file) !== file || !file.endsWith('.json')) {
      throw new Error('Invalid node output filename in manifest: ' + JSON.stringify(file));
    }
    if (expected.has(file)) throw new Error('Duplicate node output filename in manifest: ' + file);
    expected.add(file);
  }
  return expected;
}

function removeOrphanedNodeOutputs(manifestIndex) {
  const expected = expectedNodeOutputFiles(manifestIndex);
  const removed = [];
  for (const entry of fs.readdirSync(OUT_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json') || expected.has(entry.name)) continue;
    fs.unlinkSync(path.join(OUT_DIR, entry.name));
    removed.push(entry.name);
  }
  if (removed.length) console.log(`build_nodes: removed ${removed.length} orphaned node output(s): ${removed.sort().join(', ')}`);
}

function writeOutputs(outputs) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  removeOrphanedNodeOutputs(outputs.manifestIndex);
  fs.writeFileSync(BRAND_OUT, formatJson(outputs.brandIndex));
  fs.writeFileSync(COMPANY_OUT, formatJson(outputs.companyIndex));
  fs.writeFileSync(ASK_OUT, formatJson(outputs.askIndex));
  fs.writeFileSync(ASK_CORE_OUT, formatJson(outputs.askCoreIndex));
  fs.writeFileSync(AVOID_TOKENS_OUT, formatJson(outputs.avoidTokensIndex));
  fs.writeFileSync(ASK_FIXTURES_OUT, formatJson(outputs.askFixturesIndex));
  fs.writeFileSync(ASK_TRACES_OUT, formatJson(outputs.askTracesIndex));
  fs.writeFileSync(ASK_PRESENTATION_OUT, formatJson(outputs.askPresentationIndex));
  fs.writeFileSync(NODE_WALKTHROUGHS_OUT, formatJson(outputs.nodeWalkthroughsIndex));
  fs.writeFileSync(NODE_PAGE_CONTRACTS_OUT, formatJson(outputs.nodePageContractsIndex));
  fs.writeFileSync(NODE_ROUTE_FIXTURES_OUT, formatJson(outputs.nodeRouteFixturesIndex));
  fs.writeFileSync(NODE_ROUTE_GUARDRAILS_OUT, formatJson(outputs.nodeRouteGuardrailsIndex));
  fs.writeFileSync(NODE_INTEGRATION_CHECKLIST_OUT, formatJson(outputs.nodeIntegrationChecklistIndex));
  fs.writeFileSync(NODE_LOAD_PLAN_OUT, formatJson(outputs.nodeLoadPlanIndex));
  fs.writeFileSync(NODE_RUNTIME_STATES_OUT, formatJson(outputs.nodeRuntimeStatesIndex));
  fs.writeFileSync(NODE_PREVIEW_MATRIX_OUT, formatJson(outputs.nodePreviewMatrixIndex));
  fs.writeFileSync(READINESS_OUT, formatJson(outputs.readinessIndex));
  fs.writeFileSync(MANIFEST_OUT, formatJson(outputs.manifestIndex));
}

function checkOutputs(outputs) {
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
  const drift = [];
  for (const [file, body] of expected.entries()) {
    if (!fs.existsSync(file)) {
      drift.push(path.relative(ROOT, file).replace(/\\/g, '/') + ' is missing');
      continue;
    }
    if (fs.readFileSync(file, 'utf8') !== body) drift.push(path.relative(ROOT, file).replace(/\\/g, '/'));
  }
  const expectedFiles = expectedNodeOutputFiles(outputs.manifestIndex);
  for (const entry of fs.readdirSync(OUT_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json') || expectedFiles.has(entry.name)) continue;
    drift.push(path.relative(ROOT, path.join(OUT_DIR, entry.name)).replace(/\\/g, '/') + ' is orphaned');
  }
  return drift;
}

function main() {
  try {
    const outputs = buildAll();
    if (process.argv.includes('--check')) {
      const drift = checkOutputs(outputs);
      if (drift.length) {
        console.log('build_nodes: generated outputs are stale');
        for (const item of drift) console.log('  ' + item);
        process.exit(1);
      }
      console.log(`build_nodes: outputs current (${outputs.brandIndex.nodes.length} brands, ${outputs.companyIndex.nodes.length} companies, ${Object.keys(outputs.askIndex.tokens || {}).length} Ask tokens)`);
      return;
    }
    writeOutputs(outputs);
    console.log(`build_nodes: wrote app/data/nodes/brands.json (${outputs.brandIndex.nodes.length} brands; ${outputs.brandIndex.longTail} long-tail)`);
    console.log(`build_nodes: wrote app/data/nodes/companies.json (${outputs.companyIndex.nodes.length} companies)`);
    console.log(`build_nodes: wrote app/data/nodes/ask-index.json (${Object.keys(outputs.askIndex.tokens || {}).length} tokens)`);
    console.log(`build_nodes: wrote app/data/nodes/ask-core.json (${Object.keys(outputs.askCoreIndex.tokens || {}).length} tokens; ${Object.keys(outputs.askCoreIndex.targets || {}).length} targets)`);
    console.log(`build_nodes: wrote app/data/nodes/avoid-tokens.json (${outputs.avoidTokensIndex.families.length} families; ${outputs.avoidTokensIndex.stats.tokens} tokens)`);
    console.log(`build_nodes: wrote app/data/nodes/ask-fixtures.json (${outputs.askFixturesIndex.cases.length} cases)`);
    console.log(`build_nodes: wrote app/data/nodes/ask-traces.json (${outputs.askTracesIndex.traces.length} traces)`);
    console.log(`build_nodes: wrote app/data/nodes/ask-presentation.json (${outputs.askPresentationIndex.qaCases.length} QA cases)`);
    console.log(`build_nodes: wrote app/data/nodes/node-walkthroughs.json (${outputs.nodeWalkthroughsIndex.walkthroughs.length} walkthroughs)`);
    console.log(`build_nodes: wrote app/data/nodes/node-page-contracts.json (${outputs.nodePageContractsIndex.contracts.length} contracts)`);
    console.log(`build_nodes: wrote app/data/nodes/node-route-fixtures.json (${outputs.nodeRouteFixturesIndex.cases.length} cases)`);
    console.log(`build_nodes: wrote app/data/nodes/node-route-guardrails.json (${outputs.nodeRouteGuardrailsIndex.cases.length} cases)`);
    console.log(`build_nodes: wrote app/data/nodes/node-integration-checklist.json (${outputs.nodeIntegrationChecklistIndex.phases.length} phases)`);
    console.log(`build_nodes: wrote app/data/nodes/node-load-plan.json (${outputs.nodeLoadPlanIndex.stages.length} stages)`);
    console.log(`build_nodes: wrote app/data/nodes/node-runtime-states.json (${outputs.nodeRuntimeStatesIndex.cases.length} cases)`);
    console.log(`build_nodes: wrote app/data/nodes/node-preview-matrix.json (${outputs.nodePreviewMatrixIndex.scenarios.length} scenarios)`);
    console.log(`build_nodes: wrote app/data/nodes/readiness.json (${outputs.readinessIndex.status})`);
    console.log(`build_nodes: wrote app/data/nodes/manifest.json (${outputs.manifestIndex.indexes.length} indexes)`);
  } catch (err) {
    console.error('build_nodes FAILED:', err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  ASK_STOP,
  buildAll,
  normalizeLoose,
  askNormalize,
  resolveAskQuery,
  slugify,
  itemId,
  coreAskTarget
};
