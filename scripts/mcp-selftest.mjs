#!/usr/bin/env node
// Self-test for the /mcp Worker endpoint (mcp.js) against the REAL app data on disk — the same
// JSON the ASSETS binding serves in production, so this exercises the true payloads without
// wrangler. Run: node scripts/mcp-selftest.mjs
import { handleMcp, MCP_LIMITS } from '../mcp.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_BASE = 'https://valuescommons.org/app';
const loadCounts = new Map();
const loadJson = async (p) => {
  loadCounts.set(p, (loadCounts.get(p) || 0) + 1);
  try { return JSON.parse(await readFile(path.join(ROOT, p.replace(/^\//, '')), 'utf8')); }
  catch (e) { return null; }
};

let failures = 0;
const expect = (cond, label) => { console.log((cond ? '  ok   ' : '  FAIL ') + label); if (!cond) failures++; };
const post = (body) => handleMcp(new Request('https://x/mcp', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }), loadJson, APP_BASE);
const rpc = async (method, params, id = 1) => (await (await post({ jsonrpc: '2.0', id, method, params })).json());

console.log('MCP self-test (real data)');

const init = await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't' } });
expect(init.result && init.result.serverInfo && init.result.serverInfo.name === 'values-commons', 'initialize returns serverInfo');
expect(!!(init.result && init.result.instructions), 'initialize carries instructions');

const list = await rpc('tools/list');
expect(list.result && list.result.tools && list.result.tools.length === 2, 'tools/list has 2 tools');
expect(list.result.tools.map((t) => t.name).join(',') === 'search,fetch', 'tools are search,fetch');

const s1 = await rpc('tools/call', { name: 'search', arguments: { query: 'nescafe' } });
const s1p = s1.result && s1.result.structuredContent;
expect(s1p && s1p.results.some((r) => r.id.startsWith('ovs:item/')), 'search "nescafe" reaches items via the lazy full index');
if (s1p && s1p.results[0]) console.log('       top: ' + s1p.results[0].id + ' · ' + s1p.results[0].title);

const s2 = await rpc('tools/call', { name: 'search', arguments: { query: 'ethical banking' } });
const s2p = s2.result && s2.result.structuredContent;
expect(s2p && s2p.results.some((r) => r.id.includes('banking')), 'search "ethical banking" surfaces the banking category');

const s3 = await rpc('tools/call', { name: 'search', arguments: { query: 'zzqxv wwqqz' } });
const s3p = s3.result && s3.result.structuredContent;
expect(s3p && s3p.results.length === 0 && /category/.test(s3p.hint || ''), 'a miss returns the honest category hint, never silence');
expect(loadCounts.get('/app/data/nodes/ask-core.json') === 1, 'compact search index is loaded once per isolate');
expect(loadCounts.get('/app/data/nodes/ask-index.json') === 1, 'full search index is loaded once per isolate');

// the real agent journey for a service entry: category search → fetch → entry ids include it
const j1 = await rpc('tools/call', { name: 'fetch', arguments: { id: 'ovs:cat/banking' } });
const j1p = j1.result && j1.result.structuredContent;
expect(j1p && j1p.metadata.entries.some((e) => /triodos/i.test(e.id + e.title)), 'journey: banking entries include Triodos by evidence strength');

const cat = await rpc('tools/call', { name: 'fetch', arguments: { id: 'ovs:cat/banking' } });
const catp = cat.result && cat.result.structuredContent;
expect(catp && catp.metadata && catp.metadata.entryCount === 25, 'fetch category: banking has 25 entries');
expect(catp && catp.metadata.entries.length > 0 && catp.metadata.entries[0].id.startsWith('ovs:item/banking/'), 'category entries carry item ids');
expect(catp && /evidence strength/.test(catp.text) && /not ranked by values/.test(catp.text), 'category text states honest ordering');

const item = await rpc('tools/call', { name: 'fetch', arguments: { id: 'ovs:item/banking/triodos' } });
const ip = item.result && item.result.structuredContent;
expect(ip && /Triodos/.test(ip.title), 'fetch item: triodos resolves');
expect(ip && Array.isArray(ip.metadata.facts) && ip.metadata.facts.some((f) => f.source && f.asOf), 'item facts carry source + asOf');
expect(ip && /independent source domains/.test(ip.text), 'item text carries the independence line');
expect(ip && /not a ranking/.test(ip.text), 'item text states facts-not-ranking');
expect(ip && ip.url.includes('#card/banking/triodos'), 'item url points at the verdict card');

const soap = await rpc('tools/call', { name: 'fetch', arguments: { id: 'banking/gls-bank' } });
expect(soap.result && !soap.result.isError, 'bare cat/code id form resolves');

const bad = await rpc('tools/call', { name: 'fetch', arguments: { id: 'ovs:item/banking/zzz-nope' } });
expect(bad.result && bad.result.isError === true, 'unknown entry reports isError, never invents');

const unk = await rpc('nonsense/method');
expect(unk.error && unk.error.code === -32601, 'unknown method → -32601');

const note = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
expect(note.status === 202, 'notification → 202');

const longQuery = await rpc('tools/call', { name: 'search', arguments: { query: 'q'.repeat(MCP_LIMITS.queryChars + 1) } });
expect(longQuery.error && longQuery.error.code === -32602, 'overlong search query is rejected before search work');

const longId = await rpc('tools/call', { name: 'fetch', arguments: { id: 'i'.repeat(MCP_LIMITS.idChars + 1) } });
expect(longId.error && longId.error.code === -32602, 'overlong fetch id is rejected before data loading');

const batch = Array.from({ length: MCP_LIMITS.batchItems + 1 }, (_, i) => ({ jsonrpc: '2.0', id: i + 1, method: 'ping' }));
const batchResponse = await post(batch);
expect(batchResponse.status === 413, 'oversized JSON-RPC batch is rejected with 413');

const emptyBatchResponse = await post([]);
expect(emptyBatchResponse.status === 400, 'empty JSON-RPC batch is rejected as invalid');

const oversizedResponse = await post({ jsonrpc: '2.0', id: 99, method: 'ping', padding: 'x'.repeat(MCP_LIMITS.bodyBytes) });
expect(oversizedResponse.status === 413, 'oversized request body is rejected with 413');

const get = await handleMcp(new Request('https://x/mcp', { method: 'GET' }), loadJson, APP_BASE);
expect(get.status === 200 && /search/.test(await get.text()), 'GET returns a friendly descriptor');

console.log(failures ? 'MCP SELF-TEST: ' + failures + ' FAILURES' : 'MCP SELF-TEST PASS');
process.exit(failures ? 1 : 0);
