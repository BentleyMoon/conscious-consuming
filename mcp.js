// The Values Commons MCP server (Season 2, codex.md §I): the commons as a first-class connector
// for AI agents. Two read-only tools, search + fetch, over the SAME static JSON the app ships —
// no database, no accounts, no query logging, no state about any person. Facts, never profiles.
//
// Transport: MCP streamable HTTP (JSON-RPC 2.0 over POST /mcp, JSON response mode; no SSE in v1;
// stateless, so no session ids). Works as a remote connector in Claude, ChatGPT, and any MCP client.
//
// Honesty rules carried into the protocol surface:
//   - No overall score is computed here. Per-criterion sourced facts are data; a ranking depends on
//     a PERSON's values and is computed on their device. fetch says so and links the app.
//   - Category listings are ordered by evidence strength (source independence, then sourced-fact
//     count), stated as such — never presented as a values ranking.
//   - Every fact travels with its source and as-of date; provenance summaries travel whole.

const PROTOCOL = '2025-03-26';
const SERVER_INFO = {
  name: 'values-commons',
  title: 'Values Commons, open sourced values facts',
  version: '1.0.0',
};
const INSTRUCTIONS =
  'Read-only open data on the values behind products, brands, companies, categories, and ' +
  'certifications. Use search to find ids, then fetch for the sourced facts. Every fact carries ' +
  'its source URL and an as-of date; source independence is counted by registrable domain. No ' +
  'sponsorship, no tracking, no profiles: queries are answered and forgotten.';

const TOOLS = [
  {
    name: 'search',
    description:
      'Search the Values Commons for products, brands, companies, categories, and certifications. ' +
      'Returns matches with ids to pass to fetch. Sourced, never sponsored.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'What to look for, e.g. "ethical banking" or "Nestlé".' } },
      required: ['query'],
    },
  },
  {
    name: 'fetch',
    description:
      'Fetch a Values Commons record by id (from search). A category returns its entries listed by ' +
      'evidence strength with per-entry ids; an item returns per-criterion sourced facts with dates ' +
      'and a source-independence summary. Facts, not rankings: a ranking depends on a person\'s own ' +
      'values, computed on their device at the linked app URL.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'A Values Commons id, e.g. "ovs:cat/banking", "ovs:brand/fairphone", or "ovs:item/banking/triodos".' } },
      required: ['id'],
    },
  },
];

const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version',
  };
}
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id: id === undefined ? null : id, error: { code, message } });

// --- search: the compact ask-core index first (brands/companies/categories/tags), then the full
// item index (food names + barcodes) lazily, cached at module level across requests in the same
// isolate — the worker-side mirror of the app's compact-core → lazy-full pattern. Service-lens
// entries (banks, apps) are not name-indexed yet (queued to the data lane); the honest path there
// is category → entries, and a zero-result search says so instead of returning nothing mutely.
let _fullIndex; // Promise<parsed ask-index.json | null>
const _lensCache = new Map(); // small per-isolate cache for lens files touched by title resolution
async function _lens(cid, loadJson) {
  if (!_lensCache.has(cid)) _lensCache.set(cid, loadJson('/app/data/' + cid + '.json'));
  return _lensCache.get(cid);
}
function scoreTokens(tokens, q, words, scores) {
  const bump = (ids, pts) => { for (const id of ids || []) scores.set(id, (scores.get(id) || 0) + pts); };
  for (const [token, ids] of Object.entries(tokens)) {
    const t = fold(token);
    if (t === q) bump(ids, 5);
    else if (words.includes(t)) bump(ids, 3);
    else {
      for (const w of words) {
        if (w.length >= 3 && t.startsWith(w)) { bump(ids, 1.5); break; }
        if (w.length >= 4 && t.includes(w)) { bump(ids, 1); break; }
      }
    }
  }
}
async function doSearch(query, loadJson, appBase) {
  const core = await loadJson('/app/data/nodes/ask-core.json');
  if (!core || !core.tokens || !core.targets) return { results: [], note: 'index unavailable' };
  const q = fold(query).trim();
  if (!q) return { results: [] };
  const words = q.split(/\s+/).filter((w) => w.length >= 2);
  const scores = new Map();
  scoreTokens(core.tokens, q, words, scores);
  // whole-phrase aliases in either index resolve exactly ("2fa app" → password-managers)
  if (core.aliases && core.aliases[q]) scores.set(core.aliases[q], (scores.get(core.aliases[q]) || 0) + 5);
  // the lazy full item index (food names + barcodes); degrade silently if unavailable
  try {
    if (!_fullIndex) _fullIndex = loadJson('/app/data/nodes/ask-index.json');
    const full = await _fullIndex;
    if (full && full.tokens) {
      scoreTokens(full.tokens, q, words, scores);
      if (full.aliases && full.aliases[q]) scores.set(full.aliases[q], (scores.get(full.aliases[q]) || 0) + 5);
    }
  } catch (e) { /* core-only is still a real answer */ }
  const top = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const results = [];
  for (const [id, score] of top) {
    const t = core.targets[id];
    if (t) {
      results.push({
        id,
        title: t.label || id,
        url: appBase + '/' + (t.hash || '#search/' + encodeURIComponent(query)),
        snippet: (t.type || 'entry') + ' in the Values Commons',
        score: Math.round(score * 10) / 10,
      });
      continue;
    }
    const m = id.match(/^ovs:item\/([a-z0-9-]+)\/(.+)$/); // item ids: resolve the title from its lens
    if (m && results.length < 8) {
      const ds = await _lens(m[1], loadJson);
      const p = ds && ds.products && ds.products.find((x) => String(x.code) === m[2]);
      if (p) results.push({
        id,
        title: p.name + (p.brand ? ' (' + p.brand + ')' : ''),
        url: appBase + '/#card/' + m[1] + '/' + encodeURIComponent(m[2]),
        snippet: 'item in ' + ((ds.meta && ds.meta.label) || m[1]),
        score: Math.round(score * 10) / 10,
      });
    }
  }
  const out = { results };
  if (!results.length) {
    out.hint =
      'No direct name match. Services (banks, apps, tools) are found through their category: ' +
      'search the category (for example "banking" or "vpn"), then fetch it to list entries with ids.';
  }
  return out;
}

// --- fetch: compose an honest document for an id ---
function provLine(ps) {
  if (!ps) return null;
  if (ps.singleSource) return 'One source: ' + (ps.primarySource || 'unnamed') + '. Confidence held: repeated criteria from one source are not independent corroboration.';
  const n = ps.sourceDomainCount || (ps.sourceLabels || []).length;
  return n + ' independent source domains' + ((ps.sourceLabels && ps.sourceLabels.length) ? ' (' + ps.sourceLabels.slice(0, 4).join(', ') + ')' : '') + '.';
}
function itemDoc(cat, p, ds, appBase) {
  const facts = [];
  const provenance = p.provenance || {};
  for (const cr of ds.criteria || []) {
    const pv = provenance[cr.key];
    const sc = (p.scores || {})[cr.key];
    if (sc == null && !pv) continue;
    facts.push({
      criterion: cr.label || cr.key,
      score: sc == null ? null : sc,
      note: pv && pv.note ? pv.note : undefined,
      source: pv && pv.source ? pv.source : undefined,
      asOf: pv && pv.asof ? pv.asof : undefined,
    });
  }
  const ps = p.provenanceSummary || null;
  return {
    id: 'ovs:item/' + cat + '/' + p.code,
    title: p.name + (p.brand ? ' (' + p.brand + ')' : ''),
    url: appBase + '/#card/' + cat + '/' + encodeURIComponent(p.code),
    text: [
      p.name + (p.brand ? ', by ' + p.brand : '') + ', in ' + (ds.meta && ds.meta.label ? ds.meta.label : cat) + '.',
      p.description || '',
      'Source independence: ' + (provLine(ps) || 'no summary available.'),
      'Per-criterion sourced facts follow in metadata.facts. These are facts, not a ranking: a ranking depends on a person\'s own values, computed on their device at the URL above.',
    ].filter(Boolean).join(' '),
    metadata: { category: cat, facts, provenanceSummary: ps, region: p.region || undefined },
  };
}
async function doFetch(rawId, loadJson, appBase) {
  const id = String(rawId || '').trim().replace(/^#n\//, 'ovs:').replace(/^ovs:/, '');
  // forms: cat/<cid> · item/<cid>/<code> · brand/<slug> · company/<slug> · tag/<slug> · errand/<slug> · <cid>/<code>
  const parts = id.split('/').filter(Boolean);
  if (parts[0] === 'item' && parts.length >= 3) return fetchItem(parts[1], parts.slice(2).join('/'), loadJson, appBase);
  if (parts[0] === 'cat' && parts[1]) return fetchCategory(parts[1], loadJson, appBase);
  if (['brand', 'company', 'tag', 'errand'].includes(parts[0]) && parts[1]) return fetchNode(parts[0], id, loadJson, appBase);
  if (parts.length === 2) return fetchItem(parts[0], parts[1], loadJson, appBase); // bare cat/code
  if (parts.length === 1 && parts[0]) return fetchCategory(parts[0], loadJson, appBase);
  return { error: 'unrecognized id form: ' + rawId };
}
async function fetchCategory(cid, loadJson, appBase) {
  const ds = await loadJson('/app/data/' + cid + '.json');
  if (!ds || !Array.isArray(ds.products)) return { error: 'unknown category: ' + cid };
  const strength = (p) => {
    const ps = p.provenanceSummary || {};
    return (ps.sourceDomainCount || 0) * 1000 + (ps.sourcedFactCount || 0);
  };
  const entries = [...ds.products].sort((a, b) => strength(b) - strength(a)).slice(0, 12).map((p) => ({
    id: 'ovs:item/' + cid + '/' + p.code,
    title: p.name + (p.brand ? ' (' + p.brand + ')' : ''),
    sourceIndependence: provLine(p.provenanceSummary),
  }));
  return {
    id: 'ovs:cat/' + cid,
    title: (ds.meta && ds.meta.label) || cid,
    url: appBase + '/#explore/' + cid,
    text:
      ((ds.meta && ds.meta.label) || cid) + ': ' + ds.products.length + ' entries, criteria: ' +
      (ds.criteria || []).map((c) => c.label || c.key).join(', ') +
      '. Entries below are listed by evidence strength (source independence, then sourced-fact count), ' +
      'not ranked by values; rankings are personal and computed on-device at the URL above. Fetch an entry id for its sourced facts.',
    metadata: { entryCount: ds.products.length, entries },
  };
}
async function fetchItem(cid, code, loadJson, appBase) {
  const ds = await loadJson('/app/data/' + cid + '.json');
  if (!ds || !Array.isArray(ds.products)) return { error: 'unknown category: ' + cid };
  const p = ds.products.find((x) => String(x.code) === String(code));
  if (!p) return { error: 'unknown entry: ' + cid + '/' + code };
  return itemDoc(cid, p, ds, appBase);
}
async function fetchNode(kind, id, loadJson, appBase) {
  const file = { brand: 'brands', company: 'companies', tag: 'tags', errand: 'errands' }[kind];
  const idx = await loadJson('/app/data/nodes/' + file + '.json');
  const nodes = (idx && (idx.nodes || idx[file])) || [];
  const node = nodes.find((n) => n.id === 'ovs:' + id);
  if (!node) return { error: 'unknown ' + kind + ': ' + id };
  return {
    id: 'ovs:' + id,
    title: node.label || id,
    url: appBase + '/' + (node.hash || '#n/' + id),
    text: [node.reads || '', node.blurb || ''].filter(Boolean).join(' ') || (node.label + ', a ' + kind + ' in the Values Commons.'),
    metadata: { type: kind, brands: node.brandNames || undefined, aliases: node.aliases || undefined },
  };
}

// --- the JSON-RPC dispatcher ---
async function dispatch(msg, loadJson, appBase) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return rpcError(msg && msg.id, -32600, 'invalid request');
  const { id, method, params } = msg;
  const isNotification = id === undefined;
  try {
    if (method === 'initialize') {
      return rpcResult(id, {
        protocolVersion: (params && params.protocolVersion) || PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    if (method.startsWith('notifications/')) return null; // acknowledged, nothing to say
    if (method === 'ping') return rpcResult(id, {});
    if (method === 'tools/list') return rpcResult(id, { tools: TOOLS });
    if (method === 'tools/call') {
      const name = params && params.name;
      const args = (params && params.arguments) || {};
      let payload;
      if (name === 'search') payload = await doSearch(args.query, loadJson, appBase);
      else if (name === 'fetch') payload = await doFetch(args.id, loadJson, appBase);
      else return rpcError(id, -32602, 'unknown tool: ' + name);
      const isErr = !!(payload && payload.error);
      return rpcResult(id, {
        content: [{ type: 'text', text: JSON.stringify(payload) }],
        structuredContent: payload,
        isError: isErr,
      });
    }
    if (isNotification) return null;
    return rpcError(id, -32601, 'method not found: ' + method);
  } catch (e) {
    return rpcError(id, -32603, 'internal error: ' + (e && e.message));
  }
}

// The entry the worker (or a test) calls. loadJson(path) -> parsed JSON or null.
export async function handleMcp(request, loadJson, appBase) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  if (request.method === 'GET') {
    return json({ name: SERVER_INFO.name, transport: 'streamable-http (POST JSON-RPC)', tools: TOOLS.map((t) => t.name), instructions: INSTRUCTIONS }, 200);
  }
  if (request.method !== 'POST') return json(rpcError(null, -32600, 'POST JSON-RPC to this endpoint'), 405);
  let body;
  try { body = await request.json(); } catch (e) { return json(rpcError(null, -32700, 'parse error'), 400); }
  if (Array.isArray(body)) {
    const out = [];
    for (const m of body) { const r = await dispatch(m, loadJson, appBase); if (r) out.push(r); }
    return out.length ? json(out) : new Response(null, { status: 202, headers: corsHeaders() });
  }
  const res = await dispatch(body, loadJson, appBase);
  return res ? json(res) : new Response(null, { status: 202, headers: corsHeaders() });
}
