#!/usr/bin/env node
/* The awards layer: single-measure honors computed from the sourced dataset.
   Why a generator: awards are claims, and claims here must be recomputable from
   data anyone can inspect. This script reads app/data/*.json, applies the
   evidence bar (n >= 8 entries, >= 90% of entries scored on the measure), and
   writes awards/index.html as a static, offline-capable ledger. No axis below
   the bar is awarded; withheld measures are listed, not hidden, so the awards
   page doubles as the public face of the data-truth work.
   Regenerate: node pipeline/build_awards.js */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'app', 'data');
const OUT = path.join(ROOT, 'awards', 'index.html');
const SKIP = new Set(['asks-offers-index.json', 'barcodes.json', 'challenge-index.json', 'pulse.json']);
const MIN_N = 8;         // fewer entries than this and a "top mark" is a coin toss
const MIN_COVERAGE = 0.9; // an award over unscored entries would be a claim without evidence
const HIGH = 90;          // the shared high standard, same 0..100 scale the app shows

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function host(u) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return null; }
}

const cats = [];
const withheld = [];
for (const f of fs.readdirSync(DATA).sort()) {
  if (!f.endsWith('.json') || SKIP.has(f)) continue;
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch (e) { continue; }
  if (!j || !j.meta || !Array.isArray(j.criteria)) continue;
  const prods = j.products || [];
  if (!prods.length) continue;
  const cat = { id: j.meta.id || f.replace('.json', ''), label: j.meta.label || j.meta.id, type: j.meta.type || 'Products', n: prods.length, awards: [] };
  for (const cr of j.criteria) {
    if (!cr || !cr.key) continue;
    const scored = prods.filter(p => p.scores && typeof p.scores[cr.key] === 'number');
    const coverage = scored.length / prods.length;
    if (prods.length < MIN_N || coverage < MIN_COVERAGE) {
      withheld.push({ cat: cat.label, axis: cr.label || cr.key, coverage: Math.round(coverage * 100), n: prods.length, why: prods.length < MIN_N ? 'small-n' : 'coverage' });
      continue;
    }
    const top = Math.max.apply(null, scored.map(p => p.scores[cr.key]));
    const holders = scored.filter(p => p.scores[cr.key] === top)
      .map(p => p.name).sort();
    const high = scored.filter(p => p.scores[cr.key] >= HIGH).length;
    // Display-only rename: the dataset's "curated" source label means hand-checked by a
    // person. Say that on the page; the data keeps its own vocabulary.
    const srcLabel = cr.source === 'curated' ? 'hand-checked' : cr.source;
    const first = scored.find(p => p.scores[cr.key] === top);
    const prov = (first && first.provenance && first.provenance[cr.key]) || null;
    cat.awards.push({
      axis: cr.label || cr.key, top, holders, high,
      basis: [srcLabel, cr.tier].filter(Boolean).join(' · '),
      receipt: prov ? { note: prov.note || '', url: prov.source || null, asof: prov.asof || null } : null
    });
  }
  if (cat.awards.length) cats.push(cat);
}

const TYPE_ORDER = ['Services', 'Media', 'Organizations', 'Initiatives', 'Products'];
const byType = {};
for (const c of cats) (byType[c.type] = byType[c.type] || []).push(c);
for (const t of Object.keys(byType)) byType[t].sort((a, b) => a.label.localeCompare(b.label));

const awarded = cats.reduce((s, c) => s + c.awards.length, 0);
const perfect = cats.reduce((s, c) => s + c.awards.filter(a => a.top === 100).length, 0);
const wCov = withheld.filter(w => w.why === 'coverage').length;
const wN = withheld.filter(w => w.why === 'small-n').length;
const today = new Date().toISOString().slice(0, 10);

function holderLine(a) {
  const shown = a.holders.slice(0, 2).map(esc).join('; ');
  const extra = a.holders.length > 2 ? ' <span class="more">+' + (a.holders.length - 2) + ' co-holders</span>' : (a.holders.length === 2 ? ' <span class="more">co-holders</span>' : '');
  return shown + extra;
}
function receiptLine(a) {
  if (!a.receipt || !a.receipt.note) return '';
  const h = a.receipt.url ? host(a.receipt.url) : null;
  let note = a.receipt.note;
  if (note.length > 150) note = note.slice(0, 149).trimEnd() + '…';
  return '<p class="rcpt"><span class="src">' + esc(note) + '</span>' +
    (h ? ' <a href="' + esc(a.receipt.url) + '" rel="noopener">' + esc(h) + '</a>' : '') +
    (a.receipt.asof ? ' <span class="asof">as of ' + esc(a.receipt.asof) + '</span>' : '') + '</p>';
}
function chip(t) { return '<span class="des">' + t + '</span>'; }
function awardBlock(a) {
  const chips = [chip('Top mark')];
  if (a.high > 0 && a.top >= HIGH) chips.push(chip(a.high + ' meet the ' + HIGH + ' standard'));
  if (a.basis) chips.push(chip('basis: ' + esc(a.basis)));
  return '<div class="aw">' +
    '<div class="awrow"><span class="axis">' + esc(a.axis) + '</span>' +
    '<span class="mark tnum">' + a.top + '/100</span></div>' +
    '<p class="holder">' + holderLine(a) + '</p>' +
    '<p class="chips">' + chips.join('') + '</p>' +
    receiptLine(a) + '</div>';
}
function cardSection(cs) {
  return cs.map(c =>
    '<article class="cat" id="' + esc(c.id) + '">' +
    '<h3>' + esc(c.label) + ' <span class="catn tnum">' + c.n + ' entries</span></h3>' +
    '<div class="awgrid">' + c.awards.map(awardBlock).join('') + '</div></article>'
  ).join('\n');
}
function productDetails(cs) {
  return cs.map(c => {
    const best = c.awards.reduce((m, a) => (a.top > m.top ? a : m), c.awards[0]);
    const rows = c.awards.map(a =>
      '<tr><td>' + esc(a.axis) + '</td><td>' + holderLine(a) + '</td>' +
      '<td class="n tnum">' + a.top + '/100</td>' +
      '<td class="n tnum">' + (a.top >= HIGH ? a.high : '—'.replace('—', '0')) + '</td></tr>'
    ).join('');
    return '<details class="pcat" id="' + esc(c.id) + '"><summary><span>' + esc(c.label) + '</span>' +
      '<span class="sumline"><span class="tnum">' + c.awards.length + '</span> measures awarded · best ' +
      esc(best.axis).toLowerCase() + ' <span class="tnum">' + best.top + '/100</span></span></summary>' +
      '<table><thead><tr><th>Measure</th><th>Top mark</th><th class="n">Score</th><th class="n">Meet ' + HIGH + '</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></details>';
  }).join('\n');
}
const worst = withheld.filter(w => w.why === 'coverage').sort((a, b) => a.coverage - b.coverage).slice(0, 12);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Awards: top marks with receipts, by measure</title>
<meta name="description" content="Single-measure awards computed from sourced scores: the top mark on each measure in each category, with the receipt behind it. Not a verdict; the app ranks by your weights.">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#1d7a5a">
<script>try{var t=localStorage.getItem('cc.theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%231d7a5a'/%3E%3Cpath d='M18 36c0-13 13-20 28-20-2 16-14 23-28 20z' fill='%23fff'/%3E%3Cpath d='M20 46c6-12 14-18 22-21' stroke='%231d7a5a' stroke-width='2.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E">
<meta property="og:type" content="website">
<meta property="og:title" content="Values Commons: the awards ledger">
<meta property="og:description" content="The top mark on every well-evidenced measure, with receipts. No pay-to-rank; withheld measures are listed, not hidden.">
<meta property="og:image" content="https://valuescommons.org/og-standard.png">
<style>
  :root{
    --bg:#f6f8f7; --surface:#ffffff; --sunk:#eef1ef; --ink:#18211d; --muted:#566560; --hint:#8a958f;
    --line:#e3e7e5; --line-strong:#cfd8d3; --accent:#1d7a5a; --accent-bright:#17936a;
    --accent-soft:#e9f3ee; --warn:#a8432f; --ochre:#8a5514; --band:#eef2f0;
    --font-display:"Iowan Old Style","Palatino Linotype",Palatino,"Hoefler Text",Georgia,ui-serif,serif;
    --font-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    --max:1120px; --e1:0 1px 2px rgba(24,38,30,.05),0 3px 10px rgba(24,38,30,.05);
  }
  @media (prefers-color-scheme:dark){ :root{
    --bg:#0f1512; --surface:#161d18; --sunk:#0b100d; --ink:#e6ece8; --muted:#9aa8a1; --hint:#6c7a72;
    --line:rgba(255,255,255,.10); --line-strong:rgba(255,255,255,.17); --accent:#5dcaa5; --accent-bright:#6ad9ab;
    --accent-soft:#16241d; --warn:#e3a594; --ochre:#cc9c5e; --band:#131b16;
    --e1:0 1px 2px rgba(0,0,0,.3),0 3px 10px rgba(0,0,0,.3); } }
  :root[data-theme="dark"]{--bg:#0f1512;--surface:#161d18;--sunk:#0b100d;--ink:#e6ece8;--muted:#9aa8a1;--hint:#6c7a72;--line:rgba(255,255,255,.10);--line-strong:rgba(255,255,255,.17);--accent:#5dcaa5;--accent-bright:#6ad9ab;--accent-soft:#16241d;--warn:#e3a594;--ochre:#cc9c5e;--band:#131b16;--e1:0 1px 2px rgba(0,0,0,.3),0 3px 10px rgba(0,0,0,.3);color-scheme:dark}
  :root[data-theme="light"]{--bg:#f6f8f7;--surface:#ffffff;--sunk:#eef1ef;--ink:#18211d;--muted:#566560;--hint:#8a958f;--line:#e3e7e5;--line-strong:#cfd8d3;--accent:#1d7a5a;--accent-bright:#17936a;--accent-soft:#e9f3ee;--warn:#a8432f;--ochre:#8a5514;--band:#eef2f0;--e1:0 1px 2px rgba(24,38,30,.05),0 3px 10px rgba(24,38,30,.05);color-scheme:light}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font-display);font-size:17.5px;line-height:1.58;-webkit-font-smoothing:antialiased}
  a{color:var(--accent);text-decoration:none} a:hover{text-decoration:underline}
  a:focus-visible,button:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
  .skip{position:absolute;left:-999px;top:0;background:var(--accent);color:#fff;padding:.55rem .9rem;border-radius:0 0 8px 0;z-index:20}
  .skip:focus{left:0}
  @media (prefers-reduced-motion:reduce){ *{transition:none!important;animation:none!important}}
  .wrap{max-width:var(--max);margin:0 auto;padding:0 clamp(1.1rem,4vw,2.2rem)}
  h1,h2,h3{font-weight:600;text-wrap:balance;letter-spacing:-.015em}
  .tnum{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1}
  .masthead{border-bottom:1px solid var(--line-strong)}
  .masthead .wrap{display:flex;align-items:baseline;justify-content:space-between;gap:.6rem 1rem;flex-wrap:wrap;padding-top:1.3rem;padding-bottom:1.05rem}
  .nameplate{display:flex;align-items:baseline;gap:.65rem}
  .nameplate .mark{font-weight:700;font-size:1.38rem;letter-spacing:-.015em;color:var(--ink)}
  .nameplate a{color:var(--ink)}
  .nameplate .vrule{width:1px;height:1rem;background:var(--line-strong);align-self:center}
  .nameplate .kind{font-family:var(--font-mono);font-size:.64rem;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)}
  .topnav{display:flex;align-items:center;gap:.45rem 1.05rem;flex-wrap:wrap;font-family:var(--font-mono);font-size:.75rem}
  .topnav a{color:var(--muted);padding-bottom:2px;border-bottom:1px solid transparent}
  .topnav a:hover{color:var(--ink);border-bottom-color:var(--accent);text-decoration:none}
  .topnav .open{color:var(--accent);font-weight:600}
  .hero .wrap{padding-top:clamp(2rem,4.5vw,3rem);padding-bottom:clamp(1.4rem,3vw,2rem);max-width:56rem}
  .hero h1{font-size:clamp(2rem,4.6vw,2.9rem);line-height:1.07;margin:0 0 1rem}
  .lede{font-size:1.08rem;color:var(--muted);max-width:62ch;margin:0 0 1rem}
  .lede b{color:var(--ink);font-weight:600}
  .bar{font-family:var(--font-mono);font-size:.72rem;color:var(--hint);letter-spacing:.02em;border:1px solid var(--line);border-radius:3px;padding:.6rem .8rem;background:var(--surface);max-width:62ch}
  .bar b{color:var(--muted)}
  section .wrap{padding-top:clamp(1.6rem,3.4vw,2.4rem);padding-bottom:clamp(1.6rem,3.4vw,2.4rem)}
  .sk{font-family:var(--font-mono);font-size:.7rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin:0 0 .55rem}
  .sd{color:var(--muted);max-width:62ch;margin:0 0 1.2rem}
  .cat{background:var(--surface);border:1px solid var(--line);border-radius:4px;box-shadow:var(--e1);padding:1rem 1.1rem;margin:0 0 1rem}
  .cat h3{margin:0 0 .7rem;font-size:1.1rem}
  .catn{font-family:var(--font-mono);font-size:.66rem;color:var(--hint);font-weight:400;letter-spacing:.04em;margin-left:.4rem}
  .awgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:.9rem}
  .aw{border-top:2px solid var(--line-strong);padding-top:.5rem;min-width:0}
  .awrow{display:flex;justify-content:space-between;align-items:baseline;gap:.5rem}
  .axis{font-family:var(--font-mono);font-size:.7rem;font-weight:600;letter-spacing:.11em;text-transform:uppercase;color:var(--accent)}
  .mark{font-family:var(--font-mono);font-weight:600;font-size:1.02rem}
  .holder{margin:.25rem 0 .3rem;font-weight:600}
  .more{color:var(--hint);font-weight:400;font-size:.85em}
  .chips{margin:0 0 .3rem;display:flex;flex-wrap:wrap;gap:.3rem}
  .des{font-family:var(--font-mono);font-size:.62rem;letter-spacing:.05em;color:var(--muted);border:1px solid var(--line);border-radius:3px;padding:.1rem .4rem;white-space:nowrap}
  .rcpt{margin:.2rem 0 0;font-size:.85rem;line-height:1.45}
  .src{font-family:var(--font-mono);font-size:.72rem;color:var(--ochre)}
  .asof{font-family:var(--font-mono);font-size:.66rem;color:var(--hint)}
  .rcpt a{font-family:var(--font-mono);font-size:.7rem}
  .pcat{background:var(--surface);border:1px solid var(--line);border-radius:4px;margin:0 0 .55rem;overflow:hidden}
  .pcat summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:.8rem;align-items:baseline;padding:.6rem .9rem;flex-wrap:wrap}
  .pcat summary::-webkit-details-marker{display:none}
  .pcat summary>span:first-child{font-weight:600}
  .pcat summary:hover{color:var(--accent)}
  .sumline{font-family:var(--font-mono);font-size:.68rem;color:var(--hint);letter-spacing:.02em}
  .pcat table{width:100%;border-collapse:collapse;font-size:.9rem}
  .pcat th{font-family:var(--font-mono);font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--hint);text-align:left;font-weight:600;padding:.45rem .9rem;border-top:1px solid var(--line)}
  .pcat td{padding:.45rem .9rem;border-top:1px solid var(--line);vertical-align:top}
  th.n,td.n{text-align:right}
  .withheld{border:1px solid var(--line);border-radius:4px;background:var(--band)}
  .withheld summary{cursor:pointer;list-style:none;padding:.7rem 1rem;font-family:var(--font-mono);font-size:.74rem;color:var(--muted)}
  .withheld summary::-webkit-details-marker{display:none}
  .withheld .inner{padding:.2rem 1rem 1rem;color:var(--muted);font-size:.92rem}
  .withheld table{border-collapse:collapse;font-size:.85rem;margin-top:.5rem}
  .withheld td,.withheld th{padding:.3rem .8rem .3rem 0;text-align:left;font-family:var(--font-mono);font-size:.72rem}
  footer{border-top:1px solid var(--line-strong);margin-top:1rem}
  footer .wrap{padding:1.4rem clamp(1.1rem,4vw,2.2rem);display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;font-family:var(--font-mono);font-size:.7rem;color:var(--hint)}
  footer a{color:var(--muted)}
</style>
</head>
<body>
<a class="skip" href="#content">Skip to content</a>
<header class="masthead">
  <div class="wrap">
    <div class="nameplate">
      <span class="mark"><a href="../index.html">&#9671; Values&nbsp;Commons</a></span>
      <span class="vrule" aria-hidden="true"></span>
      <span class="kind">Awards&nbsp;ledger</span>
    </div>
    <nav class="topnav" aria-label="Primary">
      <a href="../instances/index.html">Apps</a>
      <a href="../passport/index.html">Your values</a>
      <a href="../standard/index.html">For builders</a>
      <a class="open" href="../app/index.html">Open the app &rarr;</a>
    </nav>
  </div>
</header>
<main id="content" tabindex="-1">
  <section class="hero" style="border-top:none">
    <div class="wrap">
      <h1>Top marks, with receipts.</h1>
      <p class="lede">Every award here is a <b>single measure</b>: the highest sourced score on one thing, in one category, out of 100. It is a fact with a receipt, not a verdict on what is best. <b>Your weights decide best</b>, in <a href="../app/index.html">the app</a>. Where a measure rests on an existing certification or grade, the award names it, so prior honors stay visible.</p>
      <p class="bar"><b>The evidence bar:</b> a measure earns awards only where at least nine in ten entries carry a sourced score and the category holds ${MIN_N}+ entries. Today that is <b class="tnum">${awarded}</b> awarded measures across <b class="tnum">${cats.length}</b> categories, with <b class="tnum">${perfect}</b> perfect marks; <b class="tnum">${wCov + wN}</b> measures are withheld below the bar and listed at the end.</p>
    </div>
  </section>

  <section id="hand-checked">
    <div class="wrap">
      <p class="sk">Hand-checked categories</p>
      <h2 style="margin:0 0 .4rem;font-size:1.45rem">Services, media, organizations, causes</h2>
      <p class="sd">Small categories, checked by hand, every mark carrying its named receipt. This is the standard the whole ledger is being raised to.</p>
      ${TYPE_ORDER.filter(t => t !== 'Products' && byType[t]).map(t => cardSection(byType[t])).join('\n')}
    </div>
  </section>

  <section id="products">
    <div class="wrap">
      <p class="sk">Open-data categories</p>
      <h2 style="margin:0 0 .4rem;font-size:1.45rem">Products, from the open food and care datasets</h2>
      <p class="sd">Bigger categories scored from open data (Green-Score, NOVA, Nutri-Score, certification labels). Open a category for its full award table; the count beside each name says how many measures cleared the evidence bar.</p>
      ${byType.Products ? productDetails(byType.Products) : ''}
    </div>
  </section>

  <section id="withheld">
    <div class="wrap">
      <details class="withheld">
        <summary>Withheld: ${wCov + wN} measures below the evidence bar (open the list)</summary>
        <div class="inner">
          <p>${wCov} measures lack scores for at least nine in ten entries; ${wN} sit in categories smaller than ${MIN_N} entries. They earn no awards until the data does. The thinnest today:</p>
          <table><thead><tr><th>Category</th><th>Measure</th><th>Scored</th></tr></thead><tbody>
          ${worst.map(w => '<tr><td>' + esc(w.cat) + '</td><td>' + esc(w.axis) + '</td><td class="tnum">' + w.coverage + '%</td></tr>').join('')}
          </tbody></table>
          <p>Fixing these is open work: <a href="../workshop/index.html">repair a fact</a> or <a href="../contribute/index.html">help out</a>.</p>
        </div>
      </details>
    </div>
  </section>
</main>
<footer>
  <div class="wrap">
    <span>Computed ${today} from the live dataset by pipeline/build_awards.js; regenerated when the data changes.</span>
    <span><a href="../index.html">Home</a> &middot; <a href="../app/index.html">Open the app</a></span>
  </div>
</footer>
<script src="../app/theme.js"></script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');
console.log('Awards ledger');
console.log('  categories with at least one award:', cats.length);
console.log('  measures awarded:', awarded, '| perfect 100s:', perfect);
console.log('  withheld: ' + wCov + ' coverage, ' + wN + ' small-n');
console.log('  wrote', path.relative(ROOT, OUT));
