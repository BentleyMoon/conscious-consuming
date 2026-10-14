/* build_browse.js — the catalogue as plain, linked pages that work without JavaScript.

   WHY THIS EXISTS. The app is a hash-routed single page, which is a fine tool and a poor reference
   work: a reader cannot follow an ordinary link from a category to its entries without the script
   running, and a search engine sees one page. This writes the familiar alternative, the way a wiki
   or a library catalogue is laid out:

     app/browse/index.html   every category, A to Z, and again by everyday need
     app/browse/<cid>.html   one page per category: where it sits (breadcrumbs), every entry in it as
                             a plain link, the guide if there is one, and "see also" categories

   An entry links to its verdict page under app/c/ when build_cards.js wrote one (so this step runs
   after it), and otherwise to the entry inside the app. Nothing here scores anything: the pages list
   and link, and the comparison itself stays in the app, where the reader's own values apply.

   Inputs: app/data/index.json, app/data/presentation.json, app/data/<category>.json,
   app/c/_cards.json (optional), content/guides/*.md. Run: node pipeline/build_browse.js */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'app');
const DATA = path.join(APP, 'data');
const OUT = path.join(APP, 'browse');
const SITE_BASE = (process.env.CC_SITE_BASE || 'https://valuescommons.org/app').replace(/\/+$/, '');
const STYLE_VERSION = crypto.createHash('sha256').update(fs.readFileSync(path.join(APP, 'styles.css'))).digest('hex').slice(0, 8);
const FAVICON = 'data:image/svg+xml,' + encodeURIComponent(fs.readFileSync(path.join(APP, 'icon.svg'), 'utf8').trim());

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const safe = s => String(s).replace(/[^a-zA-Z0-9._-]/g, '-');   // the same rule build_cards.js names files by
const num = n => Number(n || 0).toLocaleString('en-GB');
const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The plain names the app shows for the eight everyday needs (app/presentation.js, DISPLAY_NEED).
// Read from that file rather than copied, so the app and these pages cannot drift apart.
const DISPLAY_NEED = (() => {
  const src = fs.readFileSync(path.join(APP, 'presentation.js'), 'utf8');
  const m = /const DISPLAY_NEED=(\{[^}]*\});/.exec(src);
  if (!m) throw new Error('build_browse: DISPLAY_NEED not found in app/presentation.js');
  return JSON.parse(m[1].replace(/'/g, '"'));
})();

const index = JSON.parse(fs.readFileSync(path.join(DATA, 'index.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(DATA, 'presentation.json'), 'utf8'));
const tax = pkg.taxonomy || {};
const needs = (index.ontology && index.ontology.needs) || [];
const needName = need => DISPLAY_NEED[String(need && need.label || '').toUpperCase()] || (need && need.label) || '';
const categories = index.categories.slice().sort((a, b) => a.label.localeCompare(b.label, 'en'));
const byId = new Map(categories.map(c => [c.id, c]));

const cardsFile = path.join(APP, 'c', '_cards.json');
const cards = new Set(fs.existsSync(cardsFile) ? JSON.parse(fs.readFileSync(cardsFile, 'utf8')).map(c => c.cid + '/' + c.code) : []);
const guides = new Set(fs.readdirSync(path.join(ROOT, 'content', 'guides')).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3)));

// Where each category sits: need -> area (the presentation package's categories) -> category.
const place = new Map();
for (const d of tax.decisions || []) {
  if (!d.cid || place.has(d.cid)) continue;
  const n = needs.find(x => x.id === d.need);
  const tn = (tax.needs || []).find(x => x.id === d.need);
  const area = tn && (tn.categories || []).find(x => x.id === d.category);
  place.set(d.cid, { need: n, area: area ? { id: area.id, label: area.label } : null });
}
for (const c of categories) if (!place.has(c.id)) place.set(c.id, { need: needs.find(x => x.id === c.need), area: null });

function page({ title, description, canonical, body, crumbs }) {
  const crumbHTML = crumbs && crumbs.length
    ? `<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => i === crumbs.length - 1
      ? `<span class="crumb cur" aria-current="page">${esc(c.label)}</span>`
      : `<a class="crumb" href="${esc(c.href)}">${esc(c.label)}</a>`).join('<span class="crumb-sep" aria-hidden="true">›</span>')}</nav>`
    : '';
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Conscious Consuming">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#1d7a5a">
<link rel="icon" href="${FAVICON}">
<script>try{var _t=localStorage.getItem('cc.theme');if(_t==='dark'||_t==='light')document.documentElement.setAttribute('data-theme',_t);}catch(e){}</script>
<link rel="stylesheet" href="../styles.css?v=${STYLE_VERSION}">
</head><body><a class="skip" href="#main">Skip to content</a><div class="wrap">
<nav class="nav nav-static" aria-label="Site"><a href="../" class="wordmark">Conscious Consuming</a><span class="navlinks"><a href="./">All categories</a><a href="../#guides">Guides</a><a href="../#search">Search</a></span></nav>
${crumbHTML}
<main id="main" class="wiki">
${body}
</main>
<footer>An open, honest guide to consuming by your values: sourced, private, never sponsored.<br><a href="../">Open the interactive app →</a></footer>
</div></body></html>
`;
}

function categoryLine(c) {
  const p = place.get(c.id) || {};
  const where = [needName(p.need), p.area && p.area.label].filter(Boolean).join(' › ');
  return `<li><a href="${esc(c.id)}">${esc(c.label)}</a> <span class="browse-n">${num(c.n)} ${c.n === 1 ? 'entry' : 'entries'}</span>${where ? ` <span class="browse-where">${esc(where)}</span>` : ''}</li>`;
}

function indexPage() {
  const total = categories.reduce((n, c) => n + (Number(c.n) || 0), 0);
  const letters = {};
  for (const c of categories) (letters[c.label[0].toUpperCase()] = letters[c.label[0].toUpperCase()] || []).push(c);
  const L = Object.keys(letters).sort();
  const az = `<nav class="browse-letters" aria-label="Jump to a letter">${L.map(l => `<a href="#letter-${l.toLowerCase()}">${l}</a>`).join('')}</nav>`
    + L.map(l => `<section class="browse-letter" id="letter-${l.toLowerCase()}"><h3>${l}</h3><ul class="browse-list">${letters[l].map(categoryLine).join('')}</ul></section>`).join('');
  const byNeed = needs.map(n => {
    const tn = (tax.needs || []).find(x => x.id === n.id);
    const placed = new Set();
    const areas = ((tn && tn.categories) || []).map(a => {
      const ids = [];
      for (const s of a.subcategories || []) for (const did of s.decisionIds || []) {
        const d = (tax.decisions || []).find(x => x.id === did);
        if (d && d.cid && byId.has(d.cid) && !placed.has(d.cid)) { placed.add(d.cid); ids.push(d.cid); }
      }
      if (!ids.length) return '';
      return `<h4 id="${esc(slug(a.id))}">${esc(a.label)}</h4><ul class="browse-list">${ids.map(id => byId.get(id)).sort((x, y) => x.label.localeCompare(y.label, 'en')).map(categoryLine).join('')}</ul>`;
    }).join('');
    const rest = categories.filter(c => c.need === n.id && !placed.has(c.id));
    if (!areas && !rest.length) return '';
    return `<section class="browse-need" id="${esc(n.id)}"><h3>${esc(needName(n))}</h3><p class="browse-need-reads">${esc(n.reads || '')}</p>${areas}${rest.length ? `<ul class="browse-list">${rest.map(categoryLine).join('')}</ul>` : ''}</section>`;
  }).join('');
  const body = `<header class="browse-head"><h1 class="sectionh">Every category, A to Z</h1>
<p class="sectionsub">${num(categories.length)} categories and ${num(total)} products, services and brands. Each category page lists every entry with a link to it; open the app to compare them by your own values. Further down, the same categories by everyday need.</p></header>
${az}
<h2 class="browse-part">By everyday need</h2>
<nav class="browse-letters" aria-label="Jump to an everyday need">${needs.map(n => `<a href="#${esc(n.id)}">${esc(needName(n))}</a>`).join('')}</nav>
${byNeed}
<p class="browse-plain">Something missing? <a href="../#contribute">Ask for a category</a>. The data behind every page is open: <a href="../data/index.json">index.json</a>.</p>`;
  return page({
    title: 'Every category, A to Z · Conscious Consuming',
    description: `An index of all ${categories.length} categories in Conscious Consuming, from ${categories[0].label} to ${categories[categories.length - 1].label}, with every product, service and brand listed and sourced.`,
    canonical: SITE_BASE + '/browse/',
    crumbs: [{ label: 'Home', href: '../' }, { label: 'All categories', href: './' }],
    body,
  });
}

function categoryPage(c) {
  const ds = JSON.parse(fs.readFileSync(path.join(DATA, c.file), 'utf8'));
  const p = place.get(c.id) || {};
  const products = (ds.products || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'en'));
  const crumbs = [{ label: 'Home', href: '../' }];
  if (p.need) crumbs.push({ label: needName(p.need), href: './#' + p.need.id });
  if (p.area) crumbs.push({ label: p.area.label, href: './#' + slug(p.area.id) });
  crumbs.push({ label: c.label, href: c.id });
  const entry = e => {
    const code = safe(e.code);
    const href = cards.has(c.id + '/' + code) ? `../c/${esc(c.id)}/${esc(code)}` : `../#item/${esc(c.id)}/${esc(encodeURIComponent(e.code))}`;
    return `<li><a href="${href}">${esc(e.name)}</a>${e.brand && e.brand !== e.name ? ` <span class="browse-n">${esc(e.brand)}</span>` : ''}</li>`;
  };
  const reads = c.decision && c.decision.reads && (c.decision.reads.text || c.decision.reads);
  const criteria = (c.criteria || []).map(x => x.label).filter(Boolean);
  const siblings = categories.filter(x => x.id !== c.id && p.area && (place.get(x.id) || {}).area && place.get(x.id).area.id === p.area.id);
  const cousins = siblings.length < 4 ? categories.filter(x => x.id !== c.id && !siblings.includes(x) && x.need === c.need).slice(0, 6 - siblings.length) : [];
  const seeAlso = siblings.concat(cousins).slice(0, 8);
  const guide = guides.has(c.id) ? `<li><a href="../g/${esc(c.id)}">Guide: how to choose ${esc(c.label.toLowerCase())}</a></li>` : '';
  const body = `<header class="browse-head"><h1 class="sectionh">${esc(c.label)}</h1>
<p class="sectionsub">${typeof reads === 'string' && reads ? esc(reads) + ' ' : ''}${num(products.length)} ${products.length === 1 ? 'entry' : 'entries'}${criteria.length ? `, compared on ${esc(criteria.slice(0, 6).join(', ').toLowerCase())}` : ''}.</p>
<p class="wiki-actions"><a class="catbtn" href="../#decide/${esc(c.id)}">Compare ${esc(c.label.toLowerCase())} by your values →</a></p></header>
<section><h2 class="browse-part">Every entry</h2><ul class="browse-list">${products.map(entry).join('')}</ul></section>
<section><h2 class="browse-part">See also</h2><ul class="browse-list">${guide}${seeAlso.map(categoryLine).join('')}<li><a href="./">Every category, A to Z</a></li></ul></section>
<p class="browse-plain">Every rating carries its source and the date it was checked; the full data is open at <a href="../data/${esc(c.file)}">${esc(c.file)}</a>. Something wrong or missing? <a href="../#contribute">Suggest a correction</a>.</p>`;
  return page({
    title: `${c.label}: every entry · Conscious Consuming`,
    description: `All ${products.length} ${c.label.toLowerCase()} in Conscious Consuming, each with sourced facts${criteria.length ? ' on ' + criteria.slice(0, 4).join(', ').toLowerCase() : ''}. Compare them by your own values; nobody pays to be ranked.`,
    canonical: SITE_BASE + '/browse/' + c.id,
    crumbs,
    body,
  });
}

fs.mkdirSync(OUT, { recursive: true });
const want = new Set(['index.html', ...categories.map(c => c.id + '.html')]);
for (const f of fs.readdirSync(OUT)) if (!want.has(f)) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
const write = (f, body) => fs.writeFileSync(path.join(OUT, f), body.replace(/\r\n/g, '\n'));
write('index.html', indexPage());
for (const c of categories) write(c.id + '.html', categoryPage(c));
console.log(`Browse index: ${categories.length} category pages + the A to Z index → app/browse/ (entries linked to ${cards.size} verdict pages; base ${SITE_BASE})`);
