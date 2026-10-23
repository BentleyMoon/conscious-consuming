#!/usr/bin/env node
/* Writes the counts on the front page and /funders/ into their HTML from the data, at build time.

   WHY THIS EXISTS: the front page drew its coverage numbers in the browser from app/data/map.json,
   and the HTML it shipped held the numbers typed on 23 Sept 2026 (1,068 decisions, 130 answered).
   Search engines, curl and anyone with scripts off read those stale figures. The withheld count,
   the guide count and the hidden description were typed as floors that drifted too. The outside
   review of 2026-10-12 found all of it. Now every figure is computed here from the same files the
   page reads, the page's own script only refreshes them, and `--check` fails the gate when the
   committed HTML and the data disagree.

   Word choice, settled with the Institute on 2026-10-12: a "decision" is anything named on the map
   (taxonomy, 1,069); the ones the app can rank are "decisions with a ranking" (built datasets).

   Counting rules match C:\websites\scripts\corpus-figures-audit.mjs: entries are the products in
   each category file; guides and comparison pages are the built .html files other than index.html;
   withheld and awarded come from the sentences the awards builder writes about itself.

   Run after build_pulse.js, build_map.js, build_guides.py and build_awards.js, before build_site.py. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const num = (n) => Number(n).toLocaleString('en-GB');
const day = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const htmlIn = (dir) => (fs.existsSync(path.join(ROOT, dir))
  ? fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.html') && f !== 'index.html').length : 0);

// ---- the figures
const map = json('app/data/map.json');
const t = map.totals || {};
const idx = json('app/data/index.json');
const cats = Array.isArray(idx.categories) ? idx.categories : Object.values(idx.categories || {});
let entries = 0;
for (const c of cats) {
  const f = path.join('app/data', c.file || `${c.id || c.slug}.json`);
  if (fs.existsSync(path.join(ROOT, f))) entries += (json(f).products || []).length;
}
const guides = htmlIn('app/g');
const cardDirs = fs.readdirSync(path.join(ROOT, 'app/c')).filter((d) => fs.statSync(path.join(ROOT, 'app/c', d)).isDirectory());
const cards = cardDirs.reduce((n, d) => n + htmlIn(path.join('app/c', d)), 0);
const awardsHtml = read('awards/index.html').replace(/<[^>]+>/g, '');
const withheld = Number((awardsHtml.match(/([0-9,]+) measures below the evidence bar/) || [])[1]?.replace(/,/g, '') || NaN);
const awarded = Number((awardsHtml.match(/Today that is ([0-9,]+) awarded measures/) || [])[1]?.replace(/,/g, '') || NaN);
const counted = json('app/data/pulse.json').built;
for (const [k, v] of Object.entries({ decisions: t.decisions, ranked: t.built, entries, guides, cards, withheld, awarded })) {
  if (!Number.isFinite(v) || v <= 0) { console.error(`build_front_figures: could not derive ${k}`); process.exit(1); }
}
const fig = {
  decisions: num(t.decisions), ranked: num(cats.length), entries: num(entries), guides: num(guides),
  cards: num(cards), withheld: num(withheld), awarded: num(awarded), 'one-in': ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][Math.round(t.decisions / t.built) - 1] || String(Math.round(t.decisions / t.built)),
  counted: day(counted),
};

// ---- the map block, the same arithmetic as the page's own script
function count(n) { const c = { built: 0, total: 0 }; (function w(x) { if (x.state) { c.total++; if (x.state === 'built') c.built++; } (x.fields || x.families || x.decisions || []).forEach(w); })(n); return c; }
const rows = map.realms.map((r) => { const c = count(r); return { label: r.label, need: r.need, built: c.built, total: c.total }; })
  .filter((r) => r.total > 0).sort((a, b) => b.built - a.built || b.total - a.total);
const max = Math.max(...rows.map((r) => r.total));
const rowsHtml = '\n' + rows.map((r) => `          <tr><th scope="row"><a href="app/index.html#need/${encodeURIComponent(r.need)}">${esc(r.label)}</a></th>` +
  `<td class="cb"><span class="cbar" style="width:${(r.total / max * 100).toFixed(1)}%"><span class="cdone" style="width:${(r.built / r.total * 100).toFixed(1)}%"></span></span></td>` +
  `<td class="cn tnum">${r.built} of ${r.total}</td></tr>`).join('\n') + '\n            ';
const open = map.realms.map((r) => { let n = 0; (function w(x) { if (x.state === 'open') n++; (x.fields || x.families || x.decisions || []).forEach(w); })(r); return { label: r.label, open: n }; })
  .sort((a, b) => b.open - a.open)[0];
const receipt = [map.built ? 'Map of ' + day(map.built) : '', num(t.realms) + ' areas', num(t.decisions) + ' decisions', num(t.built) + ' with a ranking',
  num(t.open) + ' open', num(t.held) + ' held back', num(t.refused) + ' out of scope'].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('');
const say = `The map of everyday life names <b class="tnum">${num(t.decisions)}</b> decisions. <b class="tnum">${num(t.built)}</b> of them have a ranking you can use today. The rest are named and waiting to be built.`;

// ---- writing
let drift = 0;
// In the public copy of this repository (scripts/mirror-public.py writes .public-copy), docs/README-public.md
// is published as README.md, so the same figures live there under that name.
const PUBLIC_COPY = fs.existsSync(path.join(ROOT, '.public-copy'));
function apply(rel, edits) {
  if (PUBLIC_COPY && rel === 'docs/README-public.md') rel = 'README.md';
  const before = read(rel);
  let s = before;
  for (const [re, fn, what] of edits) {
    if (!re.test(s)) { console.error(`build_front_figures: ${rel} has no ${what}`); process.exit(1); }
    re.lastIndex = 0;
    s = s.replace(re, fn);
  }
  // every <span|b data-fig="key"> takes its figure
  s = s.replace(/(<(span|b)\b[^>]*\bdata-fig="([a-z-]+)"[^>]*>)([^<]*)(<\/\2>)/g, (m, open, tag, key, _old, close) => {
    if (!(key in fig)) { console.error(`build_front_figures: ${rel} asks for unknown figure ${key}`); process.exit(1); }
    return open + fig[key] + close;
  });
  if (s !== before) {
    drift++;
    if (CHECK) console.error(`  FAIL ${rel}: its typed figures differ from the data; run node pipeline/build_front_figures.js`);
    else { fs.writeFileSync(path.join(ROOT, rel), s); console.log(`  wrote ${rel}`); }
  }
}
const describe = `Sourced facts for ${fig.ranked} everyday decisions with a ranking, out of ${fig.decisions} named, from ${fig.entries} entries, covering food, personal care, home, clothing, learning and media, technology, money, and giving. Every rating carries its source and an as-of date. ${fig.withheld} measures are published as withheld because the evidence is too thin to score, rather than being quietly estimated.`;
apply('index.html', [
  [/(<tbody id="cover-rows">)[\s\S]*?(<\/tbody>)/, (m, a, b) => a + rowsHtml + b, 'cover rows'],
  [/(<p class="st-cap" id="cover-say">)[\s\S]*?(<\/p>)/, (m, a, b) => a + say + b, 'cover sentence'],
  [/(<p class="receipt" id="cover-receipt">)[\s\S]*?(<\/p>)/, (m, a, b) => a + receipt + b, 'map receipt'],
  [/(<p class="hand gap-hand" id="gap-hand">)[^<]*(<\/p>)/, (m, a, b) => a + esc(`Biggest hole in the map: ${open.label}, with ${open.open} decisions still unanswered.`) + b, 'gap note'],
  [/"description":"Sourced facts for [^"]*"/, () => `"description":"${describe}"`, 'dataset description'],
]);
apply('funders/index.html', []);
// The two plain-text documents that state the awards counts exactly.
// Comparison pages a search engine is offered: built pages without a noindex line (pipeline/build_cards.js).
let indexed = 0;
for (const d of cardDirs) for (const f of fs.readdirSync(path.join(ROOT, 'app/c', d))) {
  if (f.endsWith('.html') && f !== 'index.html' && !/name="robots" content="noindex/.test(read(path.join('app/c', d, f)))) indexed++;
}
apply('llms.txt', [
  [/## Current scale \(counted [0-9-]+\)/, () => `## Current scale (counted ${counted})`, 'count date'],
  [/of which [0-9,]+ are offered to search engines/, () => `of which ${num(indexed)} are offered to search engines`, 'search-engine count'],
  [/\b[0-9,]+ top marks awarded/, () => `${fig.awarded} top marks awarded`, 'awarded count'],
  [/^[0-9,]+ measures are published as WITHHELD/m, () => `${fig.withheld} measures are published as WITHHELD`, 'withheld count'],
]);
apply('docs/README-public.md', [
  [/\*\*[0-9,]+ measures are published as withheld\.\*\*/, () => `**${fig.withheld} measures are published as withheld.**`, 'withheld count'],
]);

// /standard/ types the registry counts the same way; the same arithmetic as its own script.
const reg = json('app/data/standard/registry.json').entries;
const rc = { stable: 0, draft: 0, other: 0 };
for (const e of reg) { if (e.status === 'stable') rc.stable++; else if (e.status === 'draft') rc.draft++; else rc.other++; }
const pct = (k) => `${(rc[k] / reg.length * 100).toFixed(1)}%`;
apply('standard/index.html', [
  [/(<p class="fine" id="reg-say"[^>]*>)[\s\S]*?(<\/p>)/, (m, a, b) => a + `<b class="tnum">${reg.length}</b> formats are registered: <b class="tnum">${rc.stable}</b> stable, <b class="tnum">${rc.draft}</b> drafts and <b class="tnum">${rc.other}</b> internal contracts used while building.` + b, 'registry sentence'],
  [/(<div class="reg" id="reg-bar"[^>]*>)[\s\S]*?(<\/div>)/, (m, a, b) => a + `<i class="s" style="width:${pct('stable')}"></i><i class="d" style="width:${pct('draft')}"></i><i class="c" style="width:${pct('other')}"></i>` + b, 'registry bar'],
]);

if (CHECK) {
  if (drift) { console.error('FRONT FIGURES CHECK FAIL'); process.exit(1); }
  console.log(`FRONT FIGURES CHECK PASS (${fig.decisions} decisions, ${fig.ranked} with a ranking, ${fig.entries} entries, ${fig.guides} guides, ${fig.withheld} withheld, ${fig.awarded} awarded)`);
} else {
  console.log(`build_front_figures: ${fig.decisions} decisions, ${fig.ranked} with a ranking, ${fig.entries} entries, ${fig.guides} guides, ${fig.cards} comparison pages, ${fig.withheld} withheld, ${fig.awarded} awarded`);
}
