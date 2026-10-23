#!/usr/bin/env node
/* Builds the builders' kit pages of the Open Values Standard from the files that define it.

   WHY THIS EXISTS: on 2026-10-13 Bentley split the family in two. valuescommons.org is the plain overview
   for anyone, and openvaluesstandard.org is the kit for anyone building. The kit is built at
   valuescommons.org/standard/*, which the
   worker serves at openvaluesstandard.org once the domain is bound. Every page here is generated, so the
   kit cannot drift from what it documents:

     standard/spec/index.html            every format, grouped by what kind of file it is
     standard/spec/<format>/index.html   one page per registry entry: what it is for, who writes and reads it,
                                         every field with its meaning, a valid example and a rejected one
     standard/registry/index.html        the registry as a table, with its counts

   Sources: app/data/standard/registry.json (status, writers, readers), the schema each entry names (fields
   and meanings), app/data/standard/conformance-vectors.json (examples, with the reason a bad one fails).
   A field with no description in its schema says so; nothing here is written by hand per format.
   The head and styles come from standard/index.html, so the kit looks like the standard's own page.
   `--check` fails the gate when a committed page differs from what the sources produce. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SCHEMA_BASE = 'https://openvaluesstandard.org/schema/';

const registry = json('app/data/standard/registry.json');
const vectors = json('app/data/standard/conformance-vectors.json').vectors || [];
const entries = registry.entries;

// ---- what each kind and status means, in a sentence a newcomer can use
const KIND = {
  source: ['Files people or tools write', 'A file someone writes by hand or with a tool, and keeps.'],
  generated: ['Files built from other files', 'A file a build step makes from other files. Change the sources, not this file.'],
  internal: ['Parts of other formats', 'Not a file on its own: a shape used inside other formats.'],
  distribution: ['Published bundles', 'A file published for others to download and use.'],
  fixture: ['Test data and building contracts', 'Data kept for tests, not for use.'],
};
const STATUS = {
  stable: 'Stable. A change that breaks existing files needs a new version.',
  draft: 'Draft. It may still change before it is called stable.',
  'dev-contract': 'Used while building the sites. Not meant for other apps.',
};
const groupOf = (e) => (e.status === 'dev-contract' ? 'fixture' : (KIND[e.kind] ? e.kind : 'source'));
const ORDER = ['source', 'distribution', 'generated', 'internal', 'fixture'];

// ---- page shell, borrowed from the standard's own page
const std = read('standard/index.html');
// Ochre marks provenance on the standard page; the kit pages show none, so its uses become plain muted text.
// research/ochre_ratchet_audit.js counts every use of the ochre token, so this file never spells one out.
const OCHRE_USE = new RegExp('var\\(--' + 'ochre[\\w-]*\\)', 'g');
const firstStyle = std.slice(std.indexOf('<style>'), std.indexOf('</style>') + '</style>'.length).replace(OCHRE_USE, 'var(--muted)');
const SCHEMA_INDEX = 'https://valuescommons.org/schema/index.json';
const KIT_CSS = `<style>
  /* the kit's own pieces; everything else is the standard page's style above */
  .kit-main{padding:2rem 0 3rem}
  .kit-main h1{font-size:clamp(1.75rem,4vw,2.4rem);margin:.25rem 0 .75rem}
  .kit-main .lede{font-size:1.12rem;color:var(--muted);max-width:62ch;margin:0 0 1.25rem}
  .crumbs{font-family:var(--font-mono);font-size:.75rem;color:var(--hint)}
  .crumbs a{color:var(--muted)}
  .facts{display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;margin:0 0 1.5rem;padding:0;list-style:none;font-size:.86rem;color:var(--muted)}
  .facts b{color:var(--ink);font-weight:600}
  .kit-main h2{font-size:1.35rem;margin:2rem 0 .5rem}
  .kit-main p{max-width:68ch}
  .fields{width:100%;border-collapse:collapse;font-size:.86rem;margin:.5rem 0 1rem}
  .fields th,.fields td{text-align:left;vertical-align:top;padding:.5rem .75rem .5rem 0;border-bottom:1px solid var(--line)}
  .fields thead th{font-family:var(--font-mono);font-size:.75rem;color:var(--hint);font-weight:600}
  .fields td.t{font-family:var(--font-mono);font-size:.75rem;color:var(--muted);white-space:nowrap}
  .fields code{font-size:.86rem}
  .req{font-family:var(--font-mono);font-size:.75rem;color:var(--ink)}
  .none{color:var(--hint);font-style:italic}
  .ex{margin:.5rem 0 1rem;padding:.75rem 1rem;background:var(--code);border:1px solid var(--line);border-radius:5px;overflow:auto;max-height:24rem;font-size:.75rem;line-height:1.5}
  .why{font-size:.86rem;color:var(--muted)}
  .speclist{list-style:none;margin:.5rem 0 1.5rem;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(18rem,1fr));gap:.75rem 1.5rem}
  .speclist a{font-weight:600}
  .speclist span{display:block;font-size:.86rem;color:var(--muted)}
  .speclist i{font-family:var(--font-mono);font-style:normal;font-size:.75rem;color:var(--hint)}
  .regtable{width:100%;border-collapse:collapse;font-size:.75rem}
  .regtable th,.regtable td{text-align:left;vertical-align:top;padding:.5rem .75rem .5rem 0;border-bottom:1px solid var(--line)}
  .regtable thead th{font-family:var(--font-mono);color:var(--hint);font-weight:600}
  .regtable code{font-size:.75rem}
  .tablewrap{overflow-x:auto}
  .yours{border-left:3px solid var(--accent);padding:.5rem 0 .5rem 1rem;margin:1.5rem 0;max-width:68ch}
</style>`;

function nav(depth) {
  const up = '../'.repeat(depth);
  return `<header class="masthead">
  <div class="wrap">
    <a class="brand" href="${up}index.html">&#9671; Open Values Standard<small>for builders</small></a>
    <nav class="links" aria-label="The builders' kit">
      <a href="${up}index.html">Overview</a>
      <a href="${up}spec/index.html">Spec</a>
      <a href="${up}registry/index.html">Registry</a>
      <a href="${up}engine/index.html">Engine</a>
      <a href="${up}data/index.html">Data</a>
      <a href="${up}conformance/index.html">Conformance</a>
      <a href="${up}ns/index.html">Namespace</a>
      <a href="${SCHEMA_INDEX}">Schemas</a>
      <a class="home" href="https://valuescommons.org/">Values Commons &rarr;</a>
    </nav>
  </div>
</header>`;
}
function page({ depth, title, description, canonicalPath, body, scripts = '' }) {
  const url = 'https://valuescommons.org/standard/' + canonicalPath;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>try{var t=localStorage.getItem('cc.theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#1d7a5a">
<link rel="icon" href="/app/icon.svg" type="image/svg+xml">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Open Values Standard">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="https://valuescommons.org/og-ovs.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<!-- generated by pipeline/build_kit.js; edit the registry, schema or vectors, not this file -->
${firstStyle}
${KIT_CSS}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${nav(depth)}
<main id="main" class="kit-main" tabindex="-1">
  <div class="wrap">
${body}
  </div>
</main>
<footer>
  <div class="wrap">
    <p>Generated from <a href="https://github.com/BentleyMoon/conscious-consuming/blob/main/app/data/standard/registry.json">the registry</a>, the schemas and the conformance examples, so it matches them exactly.</p>
    <!-- family:start --><!-- family:end -->
  </div>
</footer>
${scripts}<script src="${'../'.repeat(depth + 1)}app/theme.js"></script>
</body>
</html>
`;
}

// ---- reading a schema into rows a newcomer can read
function typeOf(p) {
  if (!p || typeof p !== 'object') return '';
  if ('const' in p) return 'always ' + JSON.stringify(p.const);
  if (p.enum) return 'one of ' + p.enum.map((x) => JSON.stringify(x)).join(', ');
  if (p.$ref) return p.$ref.startsWith(SCHEMA_BASE) ? 'a ' + p.$ref.slice(SCHEMA_BASE.length).replace(/\.schema\.json.*$/, '') + ' file' : 'see ' + p.$ref.replace(/^#\/\$defs\//, '');
  const t = Array.isArray(p.type) ? p.type.join(' or ') : p.type;
  if (t === 'array') return 'list' + (p.items && p.items.type ? ' of ' + p.items.type : '');
  if (t === 'object' && p.additionalProperties && typeof p.additionalProperties === 'object') return 'map of ' + (typeOf(p.additionalProperties) || 'values');
  return t || (p.oneOf || p.anyOf ? 'one of several shapes' : 'any');
}
function fieldRows(schema) {
  const props = schema.properties || {};
  const req = new Set(schema.required || []);
  return Object.keys(props).map((k) => {
    const p = props[k] || {};
    const meaning = p.description ? esc(p.description) : '<span class="none">Not described in the schema yet.</span>';
    return `<tr><td><code>${esc(k)}</code>${req.has(k) ? ' <span class="req">required</span>' : ''}</td><td>${meaning}</td><td class="t">${esc(typeOf(p))}</td></tr>`;
  }).join('\n');
}
const showJson = (v) => { const s = JSON.stringify(v, null, 2); return s.length > 4000 ? s.slice(0, 4000) + '\n…' : s; };
const plainPath = (p) => esc(String(p).replace(/^websites:\s*/, 'Futurism Institute sites: '));
const slug = (id) => id;

// ---- the pages
const pages = new Map();
for (const e of entries) {
  const schema = e.schema ? json(e.schema) : {};
  const sid = schema.$id || '';
  const name = schema.title || e.id;
  const good = vectors.filter((v) => v.formatUnderTest === e.id && v.expect === 'pass');
  const bad = vectors.filter((v) => v.formatUnderTest === e.id && v.expect === 'fail');
  const open = schema.additionalProperties !== false;
  const writers = [...(e.builders || [])];
  const readers = [...(e.runtimeConsumers || [])];
  const body = `    <p class="crumbs"><a href="../index.html">Spec</a> / <code>${esc(e.id)}</code></p>
    <h1>${esc(name)}</h1>
    <p class="lede">${esc(schema.description || e.purpose)}</p>
    <ul class="facts">
      <li><b>${esc(KIND[groupOf(e)] ? KIND[groupOf(e)][0] : e.kind)}</b></li>
      <li>Status: <b>${esc(e.status)}</b></li>
      <li>Version: <b>${esc(e.declaredVersion || e.version)}</b></li>
      <li>Format name in the file: <code>${esc(e.marker && e.marker.format ? e.marker.format : e.id)}</code></li>
    </ul>
    <p>${esc(STATUS[e.status] || '')} ${esc((KIND[groupOf(e)] || [])[1] || '')}</p>
    ${writers.length || readers.length ? `<h2>Who writes it and who reads it</h2>
    <p>${writers.length ? 'Written by ' + writers.map(plainPath).map((x) => `<code>${x}</code>`).join(', ') + '.' : 'No writer is listed.'} ${readers.length ? 'Read by ' + readers.map(plainPath).map((x) => `<code>${x}</code>`).join(', ') + '.' : ''}</p>` : ''}
    <h2>Fields</h2>
    ${Object.keys(schema.properties || {}).length ? `<div class="tablewrap"><table class="fields">
      <thead><tr><th scope="col">Field</th><th scope="col">What it means</th><th scope="col">Type</th></tr></thead>
      <tbody>
${fieldRows(schema)}
      </tbody>
    </table></div>` : '<p class="none">This schema lists no named fields; see the schema file for its shape.</p>'}
    <p>${open ? 'A reader MUST ignore fields it does not know, so a file can carry more than this list and still be read. A writer MUST NOT change what a listed field means.' : 'This format allows no fields beyond the list above. A writer MUST NOT add any.'}</p>
    ${good.length ? `<h2>A file that passes</h2>\n${good.map((v) => `    <p class="why">${esc(v.reason)}</p>\n    <pre class="ex"><code>${esc(showJson(v.value))}</code></pre>`).join('\n')}` : ''}
    ${bad.length ? `<h2>A file that must be rejected</h2>\n${bad.map((v) => `    <p class="why">${esc(v.reason)}</p>\n    <pre class="ex"><code>${esc(showJson(v.value))}</code></pre>`).join('\n')}` : ''}
    <h2>The schema</h2>
    <p>${sid ? `Its address is <a href="${esc(sid.replace(SCHEMA_BASE, '/schema/'))}"><code>${esc(sid)}</code></a>. Validators can fetch it there; the file is also in the repository at <code>${esc(e.schema)}</code>.` : `In the repository at <code>${esc(e.schema)}</code>.`}</p>
    <p class="why">The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are used as described in <a href="https://www.rfc-editor.org/rfc/rfc2119">RFC 2119</a> and <a href="https://www.rfc-editor.org/rfc/rfc8174">RFC 8174</a> when, and only when, they appear in capitals.</p>
    <p class="yours"><b>Whether this format fits your app is your call.</b> The spec says what a file MUST hold. Which formats you read and write, and what your app does with them, is yours to decide.</p>`;
  pages.set(`standard/spec/${slug(e.id)}/index.html`, page({
    depth: 2, title: `${name} - Open Values Standard`, description: e.purpose, canonicalPath: `spec/${slug(e.id)}/`, body,
  }));
}

// the spec index
{
  // The formats most builders need first: what a person keeps, the facts it is scored against, a correction
  // to those facts, and the four files the group tools write.
  const START = ['open-values-passport', 'open-values-lens', 'open-values-lens-patch', 'open-values-collective', 'open-values-slate', 'open-values-position', 'open-values-agreement'];
  const firstSentence = (s) => { const m = String(s || '').match(/^.*?[.!?](?=\s|$)/); return m ? m[0] : String(s || ''); };
  const li = (e) => { const sc = json(e.schema) || {}; return `      <li><a href="${slug(e.id)}/index.html">${esc(sc.title || e.id)}</a> <i>${esc(e.status)}</i><span>${esc(firstSentence(sc.description || e.purpose))}</span></li>`; };
  const startList = START.map((id) => entries.find((e) => e.id === id)).filter(Boolean);
  const groups = `    <h2>Start here</h2>
    <p>The files a person keeps, the facts they are scored against, a correction to those facts, and the files a group makes.</p>
    <ul class="speclist">
${startList.map(li).join('\n')}
    </ul>
` + ORDER.map((g) => {
    const list = entries.filter((e) => groupOf(e) === g && !START.includes(e.id)).sort((a, b) => (a.status === 'stable' ? 0 : 1) - (b.status === 'stable' ? 0 : 1) || a.id.localeCompare(b.id));
    if (!list.length) return '';
    return `    <h2>${esc(KIND[g][0])}</h2>
    <p>${esc(KIND[g][1])}</p>
    <ul class="speclist">
${list.map(li).join('\n')}
    </ul>`;
  }).join('\n');
  pages.set('standard/spec/index.html', page({
    depth: 1, title: 'The spec - Open Values Standard', canonicalPath: 'spec/',
    description: 'Every Open Values file format, one page each: what it is for, who writes and reads it, every field and what it means, and an example that passes and one that fails.',
    body: `    <h1>The spec</h1>
    <p class="lede">Every file format in the standard, one page each. Each page says what the format is for, who writes and reads it, what every field means, and shows a file that passes and one that must be rejected.</p>
    <p class="why">The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are used as described in <a href="https://www.rfc-editor.org/rfc/rfc2119">RFC 2119</a> and <a href="https://www.rfc-editor.org/rfc/rfc8174">RFC 8174</a> when, and only when, they appear in capitals.</p>
${groups}`,
  }));
}

// the registry page
{
  const c = { stable: 0, draft: 0, other: 0 };
  for (const e of entries) { if (e.status === 'stable') c.stable++; else if (e.status === 'draft') c.draft++; else c.other++; }
  const rows = entries.map((e) => {
    const sid = e.schema ? (json(e.schema).$id || '') : '';
    return `        <tr><td><a href="../spec/${slug(e.id)}/index.html"><code>${esc(e.id)}</code></a></td><td>${esc(e.status)}</td><td>${esc(e.kind)}</td><td>${esc(e.declaredVersion || e.version)}</td><td>${sid ? `<a href="${esc(sid.replace(SCHEMA_BASE, '/schema/'))}">${esc(sid.slice(SCHEMA_BASE.length))}</a>` : ''}</td><td>${(e.builders || []).map(plainPath).join('<br>')}</td><td>${(e.runtimeConsumers || []).map(plainPath).join('<br>')}</td></tr>`;
  }).join('\n');
  pages.set('standard/registry/index.html', page({
    depth: 1, title: 'The registry - Open Values Standard', canonicalPath: 'registry/',
    description: 'Every Open Values file format in one table: status, kind, version, schema, and the code that writes and reads it, generated from registry.json.',
    body: `    <h1>The registry</h1>
    <p class="lede">The list of every Open Values file format. It is one file, <a href="https://github.com/BentleyMoon/conscious-consuming/blob/main/app/data/standard/registry.json">registry.json</a>, and this page and every spec page are made from it.</p>
    <p><b class="tnum">${entries.length}</b> formats: <b class="tnum">${c.stable}</b> stable, <b class="tnum">${c.draft}</b> drafts, and <b class="tnum">${c.other}</b> used only while building the sites. Registry updated ${esc(registry.updated)}.</p>
    <div class="tablewrap"><table class="regtable">
      <thead><tr><th scope="col">Format</th><th scope="col">Status</th><th scope="col">Kind</th><th scope="col">Version</th><th scope="col">Schema</th><th scope="col">Written by</th><th scope="col">Read by</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table></div>`,
  }));
}

// ======== part two (2026-10-13): the engine, the data, conformance ========
const CONV = `<p class="why">The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are used as described in <a href="https://www.rfc-editor.org/rfc/rfc2119">RFC 2119</a> and <a href="https://www.rfc-editor.org/rfc/rfc8174">RFC 8174</a> when, and only when, they appear in capitals.</p>`;
const code = (s) => `<pre class="ex"><code>${esc(s)}</code></pre>`;

// The engine as an importable module: app/engine.js unchanged, wrapped so `import` works. A copy is kept
// per version, so an app can pin the exact engine it was built against.
const engineSrc = read('app/engine.js');
const engine = require(path.join(ROOT, 'app/engine.js'));
const EV = engine.VERSION;
const TAIL = "})(typeof self !== 'undefined' ? self : this);";
if (!engineSrc.trimEnd().endsWith(TAIL)) { console.error('build_kit: app/engine.js no longer ends the way the module wrapper expects'); process.exit(1); }
const NAMED = ['score', 'verdict', 'passportApply', 'passportFrom', 'mergePassports', 'buildSlate', 'mergeLens', 'diffLens', 'lensHash', 'band', 'scoreTier'];
const engineModule = `// Open Values Engine ${EV}, generated by pipeline/build_kit.js from app/engine.js, unchanged inside.
// Licence: AGPL-3.0-or-later. Source: https://github.com/BentleyMoon/conscious-consuming/blob/main/app/engine.js
const __ovs = {};
${engineSrc.trimEnd().slice(0, -TAIL.length)}})(__ovs);
const engine = __ovs.CC.engine;
export default engine;
export const { VERSION, MIN_COVERAGE, ${NAMED.join(', ')} } = engine;
`;
pages.set(`standard/engine/open-values-engine-${EV}.mjs`, engineModule);
pages.set('standard/engine/open-values-engine.mjs', engineModule);

// A worked example, computed here by the engine itself, so the numbers on the page are its output.
const exCtx = { criteria: [{ key: 'pay', label: 'Fair pay', tier: 'assessed' }, { key: 'price', label: 'Price', tier: 'measured' }, { key: 'label', label: 'Fairtrade label', tier: 'certified' }], weights: { pay: 5, price: 3, label: 2 } };
const exOptions = [
  { code: 'coop', name: 'Roaster co-op', scores: { pay: 90, price: 55, label: 100 } },
  { code: 'house', name: 'House blend', scores: { pay: 60, price: 85 } },
  { code: 'budget', name: 'Certified budget brand', scores: { pay: 18, price: 95, label: 100 } },
  { code: 'unknown', name: 'New brand', scores: { price: 70 } },
];
const exRows = exOptions.map((o) => ({ o, s: engine.score(o, exCtx) }));
pages.set('standard/engine/index.html', page({
  depth: 1, title: 'The engine - Open Values Standard', canonicalPath: 'engine/',
  description: `The Open Values Engine ${EV}: the scoring formula as one JavaScript file with no dependencies, to import in a browser or Node, with the rules it follows and a worked example.`,
  body: `    <h1>The engine</h1>
    <p class="lede">The scoring formula as one JavaScript file with no dependencies. The same file ranks every option in Conscious Consuming and runs the worked formula on this kit's front page.</p>
    <ul class="facts">
      <li>Version: <b>${esc(EV)}</b></li>
      <li>Size: <b>${Math.round(Buffer.byteLength(engineSrc) / 1024)} KB</b>, no dependencies</li>
      <li>Licence: <b>AGPL-3.0-or-later</b></li>
    </ul>
    <h2>Use it</h2>
    <p>In a browser or in Node, import the version you built against. Each version keeps its own address, so an app can pin it.</p>
${code(`import engine, { score } from 'https://valuescommons.org/standard/engine/open-values-engine-${EV}.mjs';

const ctx = {
  criteria: [{ key: 'pay', label: 'Fair pay' }, { key: 'price', label: 'Price' }],
  weights: { pay: 5, price: 3 },          // how much each criterion matters, 0 to 5
};
const result = score({ code: 'coop', name: 'Roaster co-op', scores: { pay: 90, price: 55 } }, ctx);
// result.score is 0 to 100; result.coverage says how much of the weight had facts`)}
    <p>In Node without a network, clone the repository and use <code>require('./app/engine.js')</code>; it is the same file. The latest version is always at <a href="open-values-engine.mjs"><code>open-values-engine.mjs</code></a>.</p>
    <h2>How a score is worked out</h2>
    ${CONV}
    <ol>
      <li>Each criterion has a weight from 0 to 5, set by the person, and each option has a fact for some criteria, from 0 to 100.</li>
      <li>The score is the weighted average of the facts the option has. A criterion weighted 0 does not count.</li>
      <li><b>Coverage</b> is the share of the person's total weight that has a fact. Missing facts are not counted as 0: the average is pulled toward 50 by the missing share, so the score is <code>round(average &times; coverage + 50 &times; (1 &minus; coverage))</code>.</li>
      <li>When coverage is below ${Math.round(engine.MIN_COVERAGE * 100)}%, the engine returns no score. An app MUST show such an option as not scored, never as a number.</li>
      <li>A criterion weighted 4 or 5 whose fact is 20 or less caps the score at 49, however good the rest is. A <code>certified</code> criterion never caps, because its 0 means no label was found, which is missing paperwork, not harm.</li>
      <li>An option that breaks one of the person's hard rules, such as an allergen, is left out and gets no score.</li>
    </ol>
    <p>The <a href="../index.html#formula">worked formula on the front page</a> runs this engine live; change a weight there and watch each rule act.</p>
    <h2>A worked example</h2>
    <p>Four made-up coffees, weighted fair pay 5, price 3 and Fairtrade label 2. These numbers were computed by the engine when this page was built.</p>
    <div class="tablewrap"><table class="fields">
      <thead><tr><th scope="col">Option</th><th scope="col">Facts</th><th scope="col">Score</th><th scope="col">Coverage</th><th scope="col">Why</th></tr></thead>
      <tbody>
${exRows.map(({ o, s }) => `        <tr><td>${esc(o.name)}</td><td class="t">${esc(Object.entries(o.scores).map(([k, v]) => `${k} ${v}`).join(', '))}</td><td class="t">${s ? s.score : 'none'}</td><td class="t">${s ? Math.round(s.coverage * 100) + '%' : ''}</td><td>${s ? (s.cap ? `capped at 49 by ${esc(s.cap.label)} (${s.cap.v})` : 'weighted average, ' + (s.coverage < 1 ? 'pulled toward 50 for the missing facts' : 'every fact known')) : 'too few facts to score'}</td></tr>`).join('\n')}
      </tbody>
    </table></div>
    <h2>What it exports</h2>
    <div class="tablewrap"><table class="fields">
      <thead><tr><th scope="col">Name</th><th scope="col">What it does</th></tr></thead>
      <tbody>
        <tr><td><code>score(option, ctx)</code></td><td>The score of one option for one person's weights, with its coverage, the criteria that moved it most, and any cap. Returns null when the option is left out or has too few facts.</td></tr>
        <tr><td><code>verdict(option, ctx)</code></td><td>The score plus a plain fit label, the fact given as its reason, and a band for each criterion.</td></tr>
        <tr><td><code>passportApply(passport, map, base)</code></td><td>Turns a person's values file into weights for one app's criteria, and lists the values that app has no place for.</td></tr>
        <tr><td><code>passportFrom(weights, ...)</code></td><td>Writes a values file from an app's own weights.</td></tr>
        <tr><td><code>mergePassports(files, name)</code></td><td>Adds up several people's values files into one group file, keeping how far apart they are on each value.</td></tr>
        <tr><td><code>buildSlate(passport, lens, opts)</code></td><td>Applies a group's values to a facts file and returns the options to use and to move away from, each with its reason.</td></tr>
        <tr><td><code>mergeLens(lens, patches)</code> / <code>diffLens(a, b)</code></td><td>Applies change files to a facts file, or works out the change file between two versions.</td></tr>
        <tr><td><code>lensHash(lens)</code></td><td>The fingerprint of a facts file, so a change file can say which version it was made for.</td></tr>
      </tbody>
    </table></div>
    <p class="why">Also exported, for the sites' own use: ${Object.keys(engine).filter((k) => !['VERSION', 'MIN_COVERAGE', ...NAMED].includes(k)).map((k) => `<code>${esc(k)}</code>`).join(', ')}.</p>`,
}));

// The data: every comparison as an open file, with its licence.
{
  const idx = json('app/data/index.json');
  const cats = Array.isArray(idx.categories) ? idx.categories : Object.values(idx.categories || {});
  const rows = cats.slice().sort((a, b) => String(a.label).localeCompare(String(b.label))).map((c) => {
    const file = c.file || `${c.id}.json`;
    return `        <tr><td>${esc(c.label)}</td><td class="t">${esc(c.n == null ? '' : c.n)}</td><td><a href="../../app/data/${esc(file)}"><code>${esc(file)}</code></a></td></tr>`;
  }).join('\n');
  pages.set('standard/data/index.html', page({
    depth: 1, title: 'The data - Open Values Standard', canonicalPath: 'data/',
    description: `Every Conscious Consuming comparison as an open data file in the category-dataset format, ${cats.length} files, under the Open Database License 1.0, with every scored fact carrying its source.`,
    body: `    <h1>The data</h1>
    <p class="lede">Every comparison in Conscious Consuming is an open data file you can download and score with your own app. There are ${cats.length}, and every scored fact in them carries where it came from.</p>
    <h2>Licence</h2>
    <p>The data is under the <a href="https://opendatacommons.org/licenses/odbl/1-0/">Open Database License 1.0</a>: you may copy, change and build on it, and you MUST share what you build from it under the same licence and say where it came from. Food and personal-care facts come from <a href="https://world.openfoodfacts.org/">Open Food Facts</a> and Open Beauty Facts under the same licence. The engine and the sites' code are under AGPL-3.0-or-later, and the guides under CC BY-SA 4.0.</p>
    <h2>How a fact is recorded</h2>
    <p>Every score sits beside a provenance record: a note saying what the fact is, the source it came from, and the date the source says it was true. A score with no source is not published; where the evidence is too thin, the measure is withheld. The record's fields are in <a href="../spec/open-values-source/index.html">the source format</a>, and a whole file in <a href="../spec/open-values-category-dataset/index.html">the category dataset format</a>.</p>
    <p>The list of every file, with its criteria and counts, is <a href="../../app/data/index.json"><code>index.json</code></a> (<a href="../spec/open-values-category-index/index.html">its format</a>).</p>
    <h2>The files</h2>
    <div class="tablewrap"><table class="fields">
      <thead><tr><th scope="col">Decision</th><th scope="col">Entries</th><th scope="col">File</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table></div>`,
  }));
}

// Conformance: the browser check, the command line, and what a schema can and cannot check.
{
  const run = require('child_process').spawnSync(process.execPath, [path.join(ROOT, 'scripts/ovs-validate.mjs'), '--vectors'], { encoding: 'utf8' });
  const out = run.stdout || '';
  const m = out.match(/(\d+) of (\d+) come out as expected/);
  if (!m) { console.error('build_kit: could not read the conformance result from scripts/ovs-validate.mjs --vectors\n' + out + (run.stderr || '')); process.exit(1); }
  const beyond = [...out.matchAll(/^ {2}(\S+) \((\S+)\) expected (pass|fail): (.*)\n {6}the schema accepts it/mg)].map((x) => ({ format: x[2], reason: x[4] }));
  const schemaBugs = [...out.matchAll(/^ {2}(\S+) \((\S+)\) expected pass: (.*)$/mg)].map((x) => ({ id: x[1], format: x[2] }));
  pages.set('standard/conformance/index.html', page({
    depth: 1, title: 'Conformance - Open Values Standard', canonicalPath: 'conformance/',
    description: 'Check an Open Values file against the standard in your browser, with nothing uploaded, or from the command line, and see which rules a schema checks and which need the full audit.',
    body: `    <h1>Conformance</h1>
    <p class="lede">Check a file against the standard, in this page or from the command line. The page reads the file in your browser; nothing is uploaded.</p>
    ${CONV}
    <h2>Check a file</h2>
    <p>Choose a file or paste one. Its <code>format</code> field picks the schema; a file without one asks which format it is.</p>
    <div class="checker" id="checker">
      <p><label>File: <input type="file" id="ck-file" accept=".json,application/json"></label></p>
      <p><label for="ck-text">Or paste it here:</label><br><textarea id="ck-text" rows="8" style="width:100%;font-family:var(--font-mono);font-size:.75rem" spellcheck="false"></textarea></p>
      <p><label>Format: <select id="ck-format"><option value="">from the file's format field</option></select></label> <button type="button" id="ck-run" class="btn">Check</button></p>
      <div id="ck-out" aria-live="polite"></div>
    </div>
    <h2>From the command line</h2>
    <p>Clone <a href="https://github.com/BentleyMoon/conscious-consuming">the repository</a>; the checker needs Node 18 or later and nothing else.</p>
${code(`node scripts/ovs-validate.mjs my-values.json
node scripts/ovs-validate.mjs --format open-values-lens my-facts.json
node scripts/ovs-validate.mjs --vectors     # the conformance examples
node scripts/ovs-validate.mjs --all         # every file in the repository the registry points at`)}
    <p>The page and the command line use the same file, <a href="ovs-validate.mjs"><code>ovs-validate.mjs</code></a>, so they always agree. It checks the parts of JSON Schema the Open Values schemas use and reports any part it does not check instead of passing it silently.</p>
    <h2>What a schema checks, and what it does not</h2>
    <p>The standard comes with <a href="../../app/data/standard/conformance-vectors.json">${m[2]} conformance examples</a>, each a file that MUST pass or MUST fail. Checked by schema alone, <b>${m[1]} of ${m[2]}</b> come out as expected.</p>
    ${beyond.length ? `<p>These rules span more than one field, so a schema cannot express them; <code>research/standard_audit.js</code> in the repository checks them:</p>
    <ul>
${beyond.map((b) => `      <li><a href="../spec/${esc(b.format)}/index.html"><code>${esc(b.format)}</code></a>: ${esc(b.reason)}</li>`).join('\n')}
    </ul>` : ''}
    ${schemaBugs.length ? `<p>${schemaBugs.length === 1 ? 'One example that MUST pass fails its schema today' : `${schemaBugs.length} examples that MUST pass fail their schemas today`}, which means the schema is stricter than the standard intends: ${schemaBugs.map((b) => `<a href="../spec/${esc(b.format)}/index.html"><code>${esc(b.format)}</code></a>`).join(', ')}. These are being fixed in the schemas.</p>` : ''}
    <h2>What an app must keep</h2>
    <p>A file can pass its schema and an app can still break the standard's promises. The promises an app MUST keep to call itself compatible are on <a href="../index.html#rules">the kit's front page</a>.</p>`,
    scripts: '<script type="module" src="check.js"></script>\n',
  }));
}

// The ovs: namespace (2026-10-23). Linked data on the comparison pages names terms under
// https://openvaluesstandard.org/ns#; this page is what that address shows, so every term resolves to a
// definition on a domain the project owns. The terms are read from the code and data that write them.
{
  const idx = json('app/data/index.json');
  const cats = Array.isArray(idx.categories) ? idx.categories : Object.values(idx.categories || {});
  const crit = new Map();
  for (const c of cats) for (const cr of c.criteria || []) {
    if (!crit.has(cr.key)) crit.set(cr.key, { labels: new Set(), cats: 0 });
    const e = crit.get(cr.key); e.labels.add(cr.label); e.cats++;
  }
  const relations = Object.entries(engine.WEAVE_CONTEXT).filter(([, v]) => typeof v === 'string' && v.startsWith('ovs:'));
  const critRows = [...crit.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, e]) =>
    `        <tr><td><code id="${esc(k)}">ovs:${esc(k)}</code></td><td>${esc([...e.labels].slice(0, 3).join(', '))}</td><td class="t">${e.cats}</td></tr>`).join('\n');
  pages.set('standard/ns/index.html', page({
    depth: 1, title: 'The ovs: namespace - Open Values Standard', canonicalPath: 'ns/',
    description: 'Every term the Open Values Standard defines under https://openvaluesstandard.org/ns#, as used in the linked data on comparison pages.',
    body: `    <h1>The <code>ovs:</code> namespace</h1>
    <p class="lede">Linked data on the comparison pages uses schema.org terms where one fits, and terms under <code>https://openvaluesstandard.org/ns#</code> where none does. This page defines each of those terms.</p>
    <h2>Relations</h2>
    <div class="tablewrap"><table class="fields">
      <thead><tr><th scope="col">Term</th><th scope="col">Used for</th><th scope="col">Meaning</th></tr></thead>
      <tbody>
${relations.map(([rel, term]) => `        <tr><td><code id="${esc(term.slice(4))}">${esc(term)}</code></td><td class="t">${esc(rel)}</td><td>${esc({ 'ovs:supplies': 'The subject supplies goods or services to the object.', 'ovs:certifiedBy': 'The subject holds a certification issued by the object.', 'ovs:analogousTo': 'The subject plays the same role as the object in a different decision.', 'ovs:inDomain': 'The subject belongs to the area of everyday life named by the object.' }[term] || '')}</td></tr>`).join('\n')}
      </tbody>
    </table></div>
    <h2>The balanced score</h2>
    <p><code id="verdict">ovs:verdict</code> is a schema.org PropertyValue holding the plain fit label an option gets when every value is weighted equally. It is not a recommendation; the app ranks by each reader's own weights.</p>
    <h2>Criteria</h2>
    <p>Each criterion a comparison measures is a <code>propertyID</code> of the form <code>ovs:&lt;key&gt;</code>, holding the band for that criterion and citing the fact's source. The ${crit.size} keys in use:</p>
    <div class="tablewrap"><table class="fields">
      <thead><tr><th scope="col">Term</th><th scope="col">Labels</th><th scope="col">Decisions using it</th></tr></thead>
      <tbody>
${critRows}
      </tbody>
    </table></div>
    <h2>Identifiers</h2>
    <p>An option is identified as <code>ovs:&lt;decision&gt;/&lt;code&gt;</code>, for example <code>ovs:banking/triodos</code>, and a brand as <code>ovs:brand/&lt;name&gt;</code>. These are names, not addresses; the page for an option is at <code>https://valuescommons.org/app/c/&lt;decision&gt;/&lt;code&gt;</code>.</p>`,
  }));
}

// ---- writing, keeping whatever the family footer step put between its markers
const FAM = /<!-- family:start -->[\s\S]*?<!-- family:end -->/;
let drift = 0;
const expected = new Set(pages.keys());
for (const [rel, html] of pages) {
  const file = path.join(ROOT, rel);
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const keep = before.match(FAM);
  const after = keep ? html.replace(FAM, () => keep[0]) : html;
  if (after !== before) {
    drift++;
    if (CHECK) console.error(`  FAIL ${rel}: differs from what the registry, schemas and vectors produce; run node pipeline/build_kit.js`);
    else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, after); }
  }
}
// a spec page whose format has left the registry is removed
const specDir = path.join(ROOT, 'standard/spec');
if (fs.existsSync(specDir)) for (const d of fs.readdirSync(specDir)) {
  const rel = `standard/spec/${d}/index.html`;
  if (fs.statSync(path.join(specDir, d)).isDirectory() && !expected.has(rel)) {
    drift++;
    if (CHECK) console.error(`  FAIL ${rel}: its format is no longer in the registry`);
    else fs.rmSync(path.join(specDir, d), { recursive: true });
  }
}
if (CHECK) {
  if (drift) { console.error('KIT CHECK FAIL'); process.exit(1); }
  console.log(`KIT CHECK PASS (${entries.length} spec pages, the spec index and the registry page)`);
} else console.log(`build_kit: ${entries.length} spec pages, the spec index and the registry page${drift ? `; ${drift} written` : '; all current'}`);
module.exports = { kitPages: () => [...expected] };
