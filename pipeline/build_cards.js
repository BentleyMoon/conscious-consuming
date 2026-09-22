/* build_cards.js — pre-render shareable VERDICT CARD pages: one static, Open-Graph-tagged HTML page per entity,
   for the hand-curated lenses that carry sourced provenance. A hash route (#card/...) can't show a social preview
   when shared; these static pages can — with a VISUAL card image (build_card_images.py renders the PNGs from the
   _cards.json manifest this writes). The "wow artifact" the first-users research says every launch needs.
   Uses the REAL engine (app/engine.js) — one source of truth. Run: node pipeline/build_cards.js */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const engine = require('../app/engine.js');

const APP = path.join(__dirname, '..', 'app');
const DATA = path.join(APP, 'data');
const CDIR = path.join(APP, 'c');
const SITE_BASE = (process.env.CC_SITE_BASE || 'https://valuescommons.org/app').replace(/\/+$/, '');
const STYLE_VERSION = crypto.createHash('sha256').update(fs.readFileSync(path.join(APP, 'styles.css'))).digest('hex').slice(0, 8);
// The one mark, read rather than copied. pipeline/build_icon.py generates it.
const FAVICON = "data:image/svg+xml," +
  encodeURIComponent(fs.readFileSync(path.join(APP, 'icon.svg'), 'utf8').trim());

const attr = s => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const safe = s => String(s).replace(/[^a-zA-Z0-9._-]/g, '-');
const jsonLdScript = obj => '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function writeFileSyncRetry(file, body, attempts = 6) {
  const retryable = new Set(['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN']);
  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    try {
      fs.writeFileSync(file, body);
      return;
    } catch (err) {
      lastError = err;
      if (!retryable.has(err && err.code) || i === attempts - 1) throw err;
      sleep(100 * (i + 1));
    }
  }
  throw lastError;
}

function removeOrphanedCardOutputs(manifest) {
  const expected = new Set(['_cards.json', 'index.html']);
  for (const card of manifest) {
    expected.add(`${card.cid}/${card.code}.html`);
    expected.add(`${card.cid}/${card.code}.png`);
  }

  const removed = [];
  if (!fs.existsSync(CDIR)) return removed;
  function walk(dir, relativeDir = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      const relative = path.join(relativeDir, entry.name).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        walk(target, relative);
        if (fs.readdirSync(target).length === 0) fs.rmdirSync(target);
      } else if (!expected.has(relative)) {
        fs.unlinkSync(target);
        removed.push(relative);
      }
    }
  }
  walk(CDIR);
  if (removed.length) {
    console.log('Removed ' + removed.length + ' orphaned verdict output(s): '
      + removed.slice(0, 8).join(', ') + (removed.length > 8 ? ' ...' : ''));
  }
  return removed;
}

function hasSourced(ds) {
  return ds.products.some(p => p.provenance && Object.values(p.provenance).some(v => v && typeof v === 'object' && v.source));
}
function headlineReason(p, ds, s) {
  const src = [];
  for (const cr of ds.criteria) {
    const v = p.scores && p.scores[cr.key]; if (v == null) continue;
    const pr = engine.provOf(p, cr.key);
    if (pr.source) src.push({ label: cr.label, v, note: pr.note, source: pr.source, asof: pr.asof, band: engine.band(v) });
  }
  if (!src.length) return null;
  if (s && s.cap) { const c = src.find(x => x.label === s.cap.label); if (c) return c; }
  src.sort((a, b) => Math.abs(b.v - 50) - Math.abs(a.v - 50));
  return src[0];
}
function cardData(p, ds) {
  const w = {}; ds.criteria.forEach(c => w[c.key] = 3);
  const s = engine.score(p, { criteria: ds.criteria, weights: w, excludes: new Set() });
  const t = s ? engine.scoreTier(s.score) : null, r = s ? headlineReason(p, ds, s) : null;
  return { s, t, r };
}

function provenanceSourceCount(ps) {
  const n = ps && Number(ps.sourceDomainCount);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function provenanceParts(p) {
  const ps = p && p.provenanceSummary;
  if (!ps) return null;
  const n = provenanceSourceCount(ps);
  const labels = (ps.sourceLabels || []).filter(Boolean).map(String);
  if (n > 1) return {
    mode: 'multi',
    text: n + ' independent sources',
    sources: labels
  };
  const src = ps.primarySource || labels[0] || 'source listed';
  if (n === 1 || ps.singleSource) return {
    mode: 'held',
    text: 'One source: ' + src,
    sources: labels.length ? labels : [src]
  };
  return {
    mode: 'missing',
    text: 'Source links missing',
    sources: []
  };
}

function provenanceHTML(p) {
  const x = provenanceParts(p);
  if (!x) return '';
  const labels = x.sources && x.sources.length
    ? `<span class="vc-corr-src">${attr(x.sources.slice(0, 3).join(' · '))}</span>`
    : '';
  return `<div class="vc-corr"><span class="vc-corr-pill vc-corr-${x.mode}">${attr(x.text)}</span>${labels}</div>`;
}

function schemaType(type) {
  if (type === 'Products') return 'Product';
  if (type === 'Services') return 'Service';
  if (type === 'Organizations') return 'Organization';
  if (type === 'Media') return 'CreativeWork';
  return 'Thing';
}

function unique(xs) {
  return [...new Set(xs.filter(Boolean))];
}

function linkedDataContext(base) {
  return {
    ...(base || {}),
    dcat: 'http://www.w3.org/ns/dcat#',
    dcterms: 'http://purl.org/dc/terms/'
  };
}

function lensDatasetJSONLD(ds, cid) {
  const url = SITE_BASE + '/data/' + cid + '.json';
  const label = (ds.meta && ds.meta.label) || cid;
  return {
    '@type': 'Dataset',
    '@id': url + '#dataset',
    name: label + ' Open Values lens',
    description: 'Open Values Standard lens data for ' + label + '; sourced, forkable, ODbL-licensed, and never paid-to-rank.',
    url,
    license: 'https://opendatacommons.org/licenses/odbl/1-0/',
    creator: { '@type': 'Organization', name: 'Conscious Consuming', url: SITE_BASE + '/' },
    isAccessibleForFree: true,
    encodingFormat: 'application/json',
    keywords: (ds.criteria || []).map(cr => cr.label).filter(Boolean),
    'dcterms:license': 'https://opendatacommons.org/licenses/odbl/1-0/',
    'dcat:distribution': {
      '@type': 'DataDownload',
      contentUrl: url,
      encodingFormat: 'application/json'
    }
  };
}

/* Edge emission for card JSON-LD. The normalization trio is copied verbatim from
   build_nodes.js (stripMarks, slugify, isUsableBrand) so that made-by resolution is the same
   round-trip that created the brand nodes; scripts/../scratch cards_edges.py asserts the
   originals still exist so a drift in build_nodes turns this copy into a review, not a fork. */
function stripMarksForBrand(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}
function brandSlug(value) {
  return stripMarksForBrand(value)
    .replace(/&/g, ' and ')
    .replace(/[\u2018\u2019`]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}
const BRAND_EDGE = (() => {
  let brandIds = null, authored = null;
  return function edgesFor(nodeId, rawBrand) {
    if (brandIds === null) {
      brandIds = new Set();
      try {
        const b = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'nodes', 'brands.json'), 'utf8'));
        for (const n of b.nodes || []) brandIds.add(n.id);
      } catch (e) { brandIds = new Set(); }
      try {
        const ef = JSON.parse(fs.readFileSync(path.join(APP, 'edges.json'), 'utf8'));
        authored = (ef.edges || []).filter(e => e && e.from && e.rel && e.to);
      } catch (e) { authored = []; }
    }
    const out = authored.filter(e => e.from === nodeId);
    const slug = brandSlug(rawBrand || '');
    if (slug && brandIds.has('ovs:brand/' + slug)) {
      out.push({ from: nodeId, rel: 'made-by', to: 'ovs:brand/' + slug });
    }
    return out;
  };
})();

function entityJSONLD(p, ds, cid, cd) {
  const code = safe(p.code);
  const url = SITE_BASE + '/c/' + cid + '/' + code;
  const img = SITE_BASE + '/c/' + cid + '/' + code + '.png';
  const node = { id: 'ovs:' + cid + '/' + code, label: p.name || code, ids: p.ids || {} };
  const out = engine.toJSONLD(node, BRAND_EDGE(node.id, p.brand)) || {};
  const props = [];
  const citations = [];

  for (const cr of ds.criteria || []) {
    if (cr.key === 'price') continue;
    const v = p.scores && p.scores[cr.key];
    const pr = engine.provOf(p, cr.key);
    const hasEvidence = Boolean(pr.note || pr.source || pr.asof);
    if (v == null && !hasEvidence) continue;
    const prop = {
      '@type': 'PropertyValue',
      name: cr.label,
      propertyID: 'ovs:' + cr.key,
      value: v == null ? 'Not scored' : engine.band(v)[0]
    };
    if (pr.note) prop.description = pr.note;
    if (pr.source) { prop.citation = pr.source; citations.push(pr.source); }
    if (pr.asof) prop.dateModified = String(pr.asof);
    props.push(prop);
  }

  out['@type'] = schemaType(ds.meta && ds.meta.type);
  out['@context'] = linkedDataContext(out['@context']);
  out.name = p.name || code;
  if (p.brand) out.brand = p.brand;
  out.url = url;
  out.image = img;
  out.isPartOf = { '@type': 'WebApplication', name: 'Conscious Consuming', url: SITE_BASE + '/' };
  out.isBasedOn = lensDatasetJSONLD(ds, cid);
  out.license = 'https://opendatacommons.org/licenses/odbl/1-0/';
  out.identifier = 'ovs:' + cid + '/' + code;
  if (props.length) out.additionalProperty = props;
  if (citations.length) out.citation = unique(citations);
  if (cd && cd.t) {
    out['ovs:verdict'] = {
      '@type': 'PropertyValue',
      name: 'Balanced values fit',
      value: cd.t[0],
      description: 'Computed locally from the cited bands in the Conscious Consuming lens.'
    };
  }
  return out;
}

// WHAT A VERDICT PAGE HAS TO CARRY BEFORE IT IS OFFERED TO A SEARCH ENGINE.
//
// 3,428 of these pages existed on 2026-09-21, about 126 words each, and every one of them was in
// the sitemap. The commonest shape was a single source that was the maker's own website and a
// check date of "2026", on a page whose brand bar says "sourced, never sponsored". Publishing
// thousands of those is the sourcing theater the design document refuses, and it teaches a search
// engine that this domain is mostly thin pages.
//
// The bar is the two things that actually vary between these pages:
//   - more than one independent source domain, so the verdict does not rest on the seller's own
//     account of itself;
//   - a check date of at least month precision, because "2026" is a year, not a check.
// The other two things a reader needs, the decision this belongs to and its alternatives, are on
// every card by construction: the header links the comparison and the gallery.
//
// A page under the bar is still built, still linked, still readable, and still says exactly what it
// has. It is marked noindex and left out of the sitemap until its sourcing improves, at which point
// it enters search on the next build without anyone deciding again. The count is printed at build
// and rendered on the gallery, so the number is public rather than a quiet setting.
function verdictIsIndexable(p, cd) {
  const parts = provenanceParts(p);
  if (!parts || parts.mode !== 'multi') return false;
  const asof = cd.r && cd.r.asof ? String(cd.r.asof) : '';
  return /^\d{4}-\d{2}/.test(asof) && Boolean(cd.r.source);
}

function cardHTML(p, ds, cid, cd, titleName = p.name) {
  const { s, t, r } = cd;
  const code = safe(p.code);
  const url = SITE_BASE + '/c/' + cid + '/' + code;
  const img = SITE_BASE + '/c/' + cid + '/' + code + '.png';
  const desc = (r ? (r.label + ': ' + r.band[0] + '. ' + (r.note || '')) : (ds.meta.label + ' · sourced by your values, never sponsored')).slice(0, 200);
  const reason = r ? `<div class="vc-reason"><span class="vc-axis">${attr(r.label)}: <b>${attr(r.band[0])}</b>.</span> ${attr(r.note || '')} <a href="${attr(r.source)}" target="_blank" rel="noopener">source↗${r.asof ? ' ' + attr(r.asof) : ''}</a></div>` : '';
  const provenance = provenanceHTML(p);
  const ld = jsonLdScript(entityJSONLD(p, ds, cid, cd));
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${attr(titleName)} in ${attr(ds.meta.label)}: a values verdict · Conscious Consuming</title>
<meta name="description" content="${attr(desc)}">${verdictIsIndexable(p, cd) ? '' : '\n<meta name="robots" content="noindex,follow">'}
<link rel="canonical" href="${attr(url)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Conscious Consuming">
<meta property="og:title" content="${attr(titleName)} in ${attr(ds.meta.label)}: a values verdict">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:url" content="${attr(url)}">
<meta property="og:image" content="${attr(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(titleName)} in ${attr(ds.meta.label)}: a values verdict">
<meta name="twitter:description" content="${attr(desc)}">
<meta name="twitter:image" content="${attr(img)}">
${ld}
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#1d7a5a">
<link rel="icon" href="${FAVICON}">
<link rel="stylesheet" href="../../styles.css?v=${STYLE_VERSION}">
</head><body><a class="skip" href="#main">Skip to content</a><div class="wrap">
<nav class="nav"><a href="../../" class="wordmark">Conscious Consuming</a><span class="navlinks"><a href="../../#explore/${cid}">Compare ${attr(ds.meta.label)}</a><a href="../">All verdicts</a><a href="../../#guides">Guides</a></span></nav>
<main id="main">
<a class="back" href="../../#explore/${cid}">← all ${attr(ds.meta.label)}</a>
<div class="vcard">
  <div class="vc-brandbar">Conscious Consuming · sourced, never sponsored</div>
  <h1 class="vc-name">${attr(p.name)}</h1>${p.brand ? `<div class="vc-brand">${attr(p.brand)}</div>` : ''}
  ${s ? `<div class="vc-score"><span class="vc-num">${s.score}<small>/100</small></span><span class="stier ${t[1]}">${t[0]}</span></div><div class="vc-basis">on a balanced view of all values</div>` : ''}
  ${reason}
  ${provenance}
  <div class="vc-foot">No ads · No tracking · No brand pays us</div>
</div>
<div class="vc-actions"><a class="catbtn" href="../../#explore/${cid}">Compare ${attr(ds.meta.label)} by <b>your</b> values →</a><a class="savebtn" href="../../#card/${cid}/${encodeURIComponent(p.code)}">Open in the app →</a></div>
<p class="vc-hint">An honest, sourced verdict from <a href="../../">Conscious Consuming</a>. Choose by your values, not by who pays.</p>
</main>
<footer>An open, honest guide to consuming by your values: sourced, private, never sponsored.<br><a href="../../">Open the interactive app →</a></footer>
</div></body></html>
`;
}

// The "wall of verdicts" — a static, crawlable index of every sourced card, grouped by lens, best-first.
// Discoverability + proof-of-the-commons in one page; each tile links to its shareable OG card page.
function galleryHTML(manifest) {
  const byCid = {};
  for (const m of manifest) (byCid[m.cid] = byCid[m.cid] || { lens: m.lens, cid: m.cid, items: [] }).items.push(m);
  const groups = Object.values(byCid).sort((a, b) => b.items.length - a.items.length);
  for (const g of groups) g.items.sort((a, b) => (b.score == null ? -1 : b.score) - (a.score == null ? -1 : a.score));
  const total = manifest.length, lensCount = groups.length;
  // The bar, in public. A page that says "sourced, never sponsored" should say how many of these
  // rest on more than the seller's own account of itself, and those are exactly the ones offered
  // to a search engine (see verdictIsIndexable).
  const offered = manifest.filter(m => m.index).length;
  const nav = groups.map(g => `<a href="#${g.cid}">${attr(g.lens)} <span class="gn-n">${g.items.length}</span></a>`).join('');
  const tile = m => {
    const reason = m.reason ? `<span class="gt-reason">${attr(m.reason.label)}: <b>${attr(m.reason.band)}</b></span>` : '';
    const score = (m.score != null) ? `<span class="stier ${m.tier}">${m.score}</span>` : '';
    return `<a class="gt" href="${m.cid}/${safe(m.code)}"><span class="gt-top"><b class="gt-name">${attr(m.name)}</b>${score}</span>${m.brand ? `<span class="gt-brand">${attr(m.brand)}</span>` : ''}${reason}</a>`;
  };
  const sections = groups.map(g => `<section class="gsec" id="${g.cid}"><h2 class="gsec-h">${attr(g.lens)} <span class="gsec-n">${g.items.length} verdicts</span></h2><div class="ggrid">${g.items.map(tile).join('')}</div></section>`).join('');
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The wall of verdicts: every sourced judgment · Conscious Consuming</title>
<meta name="description" content="Every sourced verdict in Conscious Consuming: ${total} honest judgments across ${lensCount} lenses, each with its decisive reason and source. No ads, no tracking, no brand pays us.">
<link rel="canonical" href="${attr(SITE_BASE + '/c/')}">
<meta property="og:type" content="website"><meta property="og:title" content="The wall of verdicts · Conscious Consuming">
<meta property="og:description" content="${total} sourced verdicts across ${lensCount} lenses. Choose by your values, not by who pays.">
<meta property="og:image" content="${attr(SITE_BASE + '/og-home.png')}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${attr(SITE_BASE + '/og-home.png')}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#1d7a5a">
<link rel="icon" href="${FAVICON}">
<script>try{var _t=localStorage.getItem('cc.theme');if(_t==='dark'||_t==='light')document.documentElement.setAttribute('data-theme',_t);}catch(e){}</script>
<link rel="stylesheet" href="../styles.css?v=${STYLE_VERSION}">
</head><body><a class="skip" href="#main">Skip to content</a><div class="wrap">
<nav class="nav"><a href="../" class="wordmark">Conscious Consuming</a><span class="navlinks"><a href="../#guides">Guides</a><a href="../#home">Open the app</a></span></nav>
<main id="main">
<header class="ghead">
  <h1>The wall of verdicts</h1>
  <p class="ghead-sub">Every sourced judgment we've made: <b>${total}</b> verdicts across <b>${lensCount}</b> lenses, each with the single most decisive reason and where it comes from. No ads, no tracking, no brand pays us.</p>
  <p class="ghead-bar"><b>${offered}</b> of these ${total} rest on more than one independent source and carry a check dated to the month. Those are the ones offered to search engines. The rest are here, readable, and marked as not yet: most of them rest on a single source, and often that source is the maker's own website.</p>
  <nav class="gnav">${nav}</nav>
</header>
${sections}
<p class="gfoot">Scores here weigh every value equally, for honest sharing. Open the app to rank things <a href="../">by <b>your</b> values →</a></p>
</main>
<footer>An open, honest guide to consuming by your values: sourced, private, never sponsored.<br><a href="../">Open the interactive app →</a></footer>
</div></body></html>
`;
}

let lenses = 0, cards = 0;
const manifest = [];
for (const f of fs.readdirSync(DATA)) {
  if (!f.endsWith('.json') || f === 'index.json') continue;
  const ds = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
  if (ds.meta && ds.meta.productBase) continue;     // open-data lens (food/beauty) — skip
  if (!ds.criteria || !ds.products || !hasSourced(ds)) continue; // only lenses with real sourced claims
  const cid = ds.meta.id, dir = path.join(CDIR, cid);
  fs.mkdirSync(dir, { recursive: true });
  const nameCounts = new Map();
  for (const product of ds.products) nameCounts.set(product.name, (nameCounts.get(product.name) || 0) + 1);
  for (const p of ds.products) {
    const cd = cardData(p, ds);
    const titleName = nameCounts.get(p.name) > 1
      ? `${p.name} (${String(p.code).replace(/[-_]+/g, ' ')})`
      : p.name;
    writeFileSyncRetry(path.join(dir, safe(p.code) + '.html'), cardHTML(p, ds, cid, cd, titleName));
    manifest.push({
      cid, code: safe(p.code), name: p.name, brand: p.brand || '', lens: ds.meta.label,
      score: cd.s ? cd.s.score : null, tier: cd.t ? cd.t[1] : '', tierLabel: cd.t ? cd.t[0] : '',
      reason: cd.r ? { label: cd.r.label, band: cd.r.band[0], note: cd.r.note || '', asof: cd.r.asof || '' } : null,
      index: verdictIsIndexable(p, cd)
    });
    cards++;
  }
  lenses++;
  console.log('  ' + cid + ': ' + ds.products.length + ' verdict cards');
}
writeFileSyncRetry(path.join(CDIR, '_cards.json'), JSON.stringify(manifest));
removeOrphanedCardOutputs(manifest);
writeFileSyncRetry(path.join(CDIR, 'index.html'), galleryHTML(manifest));   // the wall of verdicts (crawlable gallery)
console.log('Pre-rendered ' + cards + ' shareable verdict cards + the wall-of-verdicts gallery across ' + lenses + ' sourced lenses → app/c/ (base ' + SITE_BASE + ')');
