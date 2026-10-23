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

// Everything below is presentation. It reads cats, withheld and the counts above and never
// changes which measure gets a top mark. Every number the page states is computed here, at build
// time, so the copy cannot drift from the data.
const BAR = Math.round(MIN_COVERAGE * 100);
const withheldBy = {};
for (const w of withheld) (withheldBy[w.cat] = withheldBy[w.cat] || []).push(w);
const awardedLabels = new Set(cats.map(c => c.label));
const onlyWithheld = Object.keys(withheldBy).filter(l => !awardedLabels.has(l)).sort((a, b) => a.localeCompare(b));
const totalCats = cats.length + onlyWithheld.length;
const totalMeasures = awarded + withheld.length;
const handCats = TYPE_ORDER.filter(t => t !== 'Products' && byType[t]).reduce((s, t) => s + byType[t].length, 0);
const productCats = byType.Products ? byType.Products.length : 0;
const allAwards = [];
for (const c of cats) for (const a of c.awards) allAwards.push({ a, c });
const crowd = allAwards.filter(x => x.a.holders.length >= 10).length;
const busiest = allAwards.reduce((m, x) => (!m || x.a.holders.length > m.a.holders.length ? x : m), null);
const bigEmpty = onlyWithheld.map(l => ({ label: l, n: withheldBy[l][0].n })).sort((a, b) => b.n - a.n)[0] || null;
const gotPct = totalMeasures ? (awarded / totalMeasures * 100).toFixed(1) : '0';
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

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
// One row per awarded measure. The receipt, where the page shows one, sits in the row under it.
function awardRow(a, withReceipt) {
  const meet = a.top >= HIGH ? a.high : 0;
  const rc = withReceipt ? receiptLine(a) : '';
  return '<tr><th scope="row">' + esc(a.axis) +
    (withReceipt && a.basis ? '<span class="basis">' + esc(a.basis) + '</span>' : '') + '</th>' +
    '<td data-th="Top mark">' + holderLine(a) + '</td>' +
    '<td class="n tnum" data-th="Score">' + a.top + '/100</td>' +
    '<td class="n tnum" data-th="Meet ' + HIGH + '">' + meet + '</td></tr>' +
    (rc ? '<tr class="rrow"><td colspan="4">' + rc + '</td></tr>' : '');
}
// A withheld measure is drawn as what it is: the solid part is the share of entries with a sourced
// score, the hatched part is the share nobody has scored, and the tick is the bar.
function whyText(w) {
  if (w.why === 'small-n') return 'Withheld: ' + w.n + ' entries, ' + MIN_N + ' needed.';
  const got = w.coverage >= BAR ? 'just under ' + BAR : String(w.coverage);
  return 'Withheld: ' + got + '% scored, ' + BAR + '% needed.';
}
function withheldRow(w) {
  const cov = w.why === 'small-n' ? w.coverage : Math.min(w.coverage, BAR - 1);
  return '<tr class="wh"><th scope="row">' + esc(w.axis) + '</th>' +
    '<td colspan="3"><span class="cov" aria-hidden="true"><i style="width:' + cov + '%"></i><u style="left:' + BAR + '%"></u></span>' +
    '<span class="covt">' + whyText(w) + '</span></td></tr>';
}
function table(awards, held, withReceipt) {
  return '<div class="tw"><table class="lt"><thead><tr><th scope="col">Measure</th><th scope="col">Top mark held by</th>' +
    '<th scope="col" class="n">Score</th><th scope="col" class="n">Meet ' + HIGH + '</th></tr></thead><tbody>' +
    awards.map(a => awardRow(a, withReceipt)).join('') + held.map(withheldRow).join('') + '</tbody></table></div>';
}
function tally(got, held) {
  let s = '<span class="tally" aria-hidden="true">';
  for (let i = 0; i < got; i++) s += '<i></i>';
  for (let i = 0; i < held; i++) s += '<i class="h"></i>';
  return s + '</span>';
}
function handSection(cs) {
  return cs.map(c => {
    const held = withheldBy[c.label] || [];
    return '<article class="cat" id="' + esc(c.id) + '">' +
      '<h3>' + esc(c.label) + '</h3>' +
      '<p class="catline">' + tally(c.awards.length, held.length) + '<span class="tnum">' + plural(c.n, 'entry', 'entries') + ' &middot; ' +
      plural(c.awards.length, 'top mark', 'top marks') + (held.length ? ' &middot; ' + held.length + ' withheld' : '') + '</span></p>' +
      table(c.awards, held, true) + '</article>';
  }).join('\n');
}
function productDetails(cs) {
  return cs.map(c => {
    const held = withheldBy[c.label] || [];
    const best = c.awards.reduce((m, a) => (a.top > m.top ? a : m), c.awards[0]);
    return '<details class="pcat" id="' + esc(c.id) + '"><summary><span class="pname">' + esc(c.label) + '</span>' +
      '<span class="sumline">' + tally(c.awards.length, held.length) + '<span class="tnum">' + plural(c.awards.length, 'top mark', 'top marks') +
      (held.length ? ' &middot; ' + held.length + ' withheld' : '') + ' &middot; best: ' + esc(best.axis) + ' ' + best.top + '/100</span></span></summary>' +
      table(c.awards, held, false) + '</details>';
  }).join('\n');
}
function emptyDetails(labels) {
  return labels.map(l => {
    const held = withheldBy[l];
    return '<details class="pcat" id="w-' + esc(slug(l)) + '"><summary><span class="pname">' + esc(l) + '</span>' +
      '<span class="sumline">' + tally(0, held.length) + '<span class="tnum">' + plural(held[0].n, 'entry', 'entries') + ' &middot; ' +
      held.length + ' withheld &middot; no top mark</span></span></summary>' +
      table([], held, false) + '</details>';
  }).join('\n');
}
function plate(n, fig) {
  return '<p class="plate-id"><span class="pn">Plate ' + ROMAN[n - 1] + '</span><span class="fig">Fig. ' + n + '. ' + fig +
    '.</span></p>';
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Awards: top marks and withheld measures</title>
<meta name="description" content="The top mark on every measure with enough sourced evidence, with the source behind it, and every measure withheld because the evidence is too thin. Your own weights decide what is best, in the app.">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#1d7a5a">
<script>try{var t=localStorage.getItem('cc.theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>
<link rel="icon" href="/app/icon.svg" type="image/svg+xml"><link rel="alternate icon" href="/favicon.ico" sizes="16x16 32x32 48x48 64x64"><link rel="apple-touch-icon" href="/app/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:title" content="Values Commons: top marks and withheld measures">
<meta property="og:description" content="Where the evidence is good enough, a top mark with its source. Where it is too thin, the measure is withheld and listed. Nobody pays for a place.">
<meta property="og:image" content="https://valuescommons.org/og-standard.png">
<style>
  /* The awards ledger, in the lab-notebook register of the front page and the tour. Solid is what
     was observed and awarded; hatched is what nobody has scored, so the award is withheld. Ochre
     marks a top mark's source and nothing else. */
  :root{--bg:#f8f5ee;--surface:#ffffff;--sunk:#eef1ef;--ink:#18211d;--muted:#566560;--hint:#607068;
    --line:#e3e7e5;--line-strong:#cfd8d3;--accent:#1d7a5a;--accent-bright:#17936a;--accent-soft:#e9f3ee;
    --track:#eef1ef;--warn:#a8432f;--ochre:#8a5514;--band:#eef2f0;--on-accent:#ffffff;--graphite:#4d5357;--hatch:rgba(24,33,29,.36);
    --e1:0 1px 2px rgba(24,38,30,.05),0 3px 10px rgba(24,38,30,.05);
    --font-display:"Iowan Old Style","Palatino Linotype",Palatino,"Hoefler Text",Georgia,ui-serif,serif;
    --font-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--max:1040px}
  @media (prefers-color-scheme:dark){:root{--bg:#11140f;--surface:#161d18;--sunk:#0b100d;--ink:#e6ece8;--muted:#9aa8a1;--hint:#87968e;
    --line:rgba(255,255,255,.10);--line-strong:rgba(255,255,255,.17);--accent:#5dcaa5;--accent-bright:#6ad9ab;--accent-soft:#16241d;
    --track:#1b241f;--warn:#e3a594;--ochre:#cc9c5e;--band:#131b16;--on-accent:#0b100d;--graphite:#b6bcc0;--hatch:rgba(230,236,232,.32);
    --e1:0 1px 2px rgba(0,0,0,.3),0 3px 10px rgba(0,0,0,.3)}}
  :root[data-theme="dark"]{--bg:#11140f;--surface:#161d18;--sunk:#0b100d;--ink:#e6ece8;--muted:#9aa8a1;--hint:#87968e;--line:rgba(255,255,255,.10);--line-strong:rgba(255,255,255,.17);--accent:#5dcaa5;--accent-bright:#6ad9ab;--accent-soft:#16241d;--track:#1b241f;--warn:#e3a594;--ochre:#cc9c5e;--band:#131b16;--on-accent:#0b100d;--graphite:#b6bcc0;--hatch:rgba(230,236,232,.32);--e1:0 1px 2px rgba(0,0,0,.3),0 3px 10px rgba(0,0,0,.3);color-scheme:dark}
  :root[data-theme="light"]{--bg:#f8f5ee;--surface:#ffffff;--sunk:#eef1ef;--ink:#18211d;--muted:#566560;--hint:#607068;--line:#e3e7e5;--line-strong:#cfd8d3;--accent:#1d7a5a;--accent-bright:#17936a;--accent-soft:#e9f3ee;--track:#eef1ef;--warn:#a8432f;--ochre:#8a5514;--band:#eef2f0;--on-accent:#ffffff;--graphite:#4d5357;--hatch:rgba(24,33,29,.36);--e1:0 1px 2px rgba(24,38,30,.05),0 3px 10px rgba(24,38,30,.05);color-scheme:light}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font-display);font-size:1.08rem;line-height:1.58;-webkit-font-smoothing:antialiased}
  a{color:var(--accent);text-decoration:none} a:hover{text-decoration:underline}
  a:focus-visible,button:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:3px}
  .skip{position:absolute;left:-999px;top:0;background:var(--accent);color:#fff;padding:.55rem .9rem;z-index:30}
  .skip:focus{left:0}
  @media (prefers-reduced-motion:reduce){html{scroll-behavior:auto} *{transition:none!important;animation:none!important}}
  html{scroll-behavior:smooth}
  .wrap{max-width:var(--max);margin:0 auto;padding:0 clamp(1rem,4vw,2.2rem)}
  h1,h2,h3{font-weight:550;letter-spacing:-.01em;text-wrap:balance}
  .tnum{font-variant-numeric:tabular-nums}

  .masthead{border-bottom:1px solid var(--line-strong)}
  .masthead .wrap{display:flex;align-items:baseline;justify-content:space-between;gap:.6rem 1rem;flex-wrap:wrap;padding-top:1.1rem;padding-bottom:.95rem}
  .brand{font-weight:700;font-size:1.25rem;letter-spacing:-.015em;color:var(--ink)}
  .brand:hover{text-decoration:none}
  .exits{display:flex;align-items:center;gap:.4rem 1.1rem;flex-wrap:wrap;font-family:var(--font-mono);font-size:0.75rem}
  .exits a{color:var(--muted);padding:.35rem 0}
  .exits a:hover{color:var(--ink)}
  .exits .go{color:var(--accent);font-weight:600}

  .plate-id{display:flex;justify-content:space-between;align-items:baseline;gap:.3rem 1rem;flex-wrap:wrap;margin:0 0 1rem;padding-bottom:.4rem;border-bottom:1px solid color-mix(in srgb,var(--ink) 55%,transparent)}
  .plate-id .pn{font-family:var(--font-mono);font-size:0.75rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink)}
  .plate-id .fig{font-style:italic;font-size:0.92rem;color:var(--muted)}

  .hero{padding:clamp(1.6rem,4vw,2.6rem) 0 clamp(1.6rem,4vw,2.4rem)}
  .hero h1{font-size:clamp(1.85rem,3.8vw,2.75rem);line-height:1.08;margin:0 0 .9rem;max-width:26ch}
  .lede{font-size:1.1rem;color:var(--muted);max-width:60ch;margin:0}
  .lede b{color:var(--ink);font-weight:650}

  /* Fig. 1: every measure in the data, as one bar */
  .fig1{margin:1.6rem 0 0}
  .splitlab{display:flex;justify-content:space-between;gap:1rem;font-family:var(--font-mono);font-size:0.75rem;color:var(--muted);margin:0 0 .35rem}
  .splitlab b{color:var(--ink);font-size:1rem}
  .split{display:flex;height:2.2rem;border:1px solid color-mix(in srgb,var(--ink) 70%,transparent)}
  .split .got{background:color-mix(in srgb,var(--ink) 80%,transparent)}
  .split .held{flex:1;background:repeating-linear-gradient(-45deg,var(--hatch) 0 1px,transparent 1px 5px)}
  .legend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.4rem 2rem;margin:.7rem 0 0;font-size:0.92rem;color:var(--muted)}
  .legend p{margin:0}
  .legend b{color:var(--ink);font-weight:650}
  .sw{display:inline-block;width:1.1rem;height:.75rem;border:1px solid color-mix(in srgb,var(--ink) 70%,transparent);vertical-align:-.05rem;margin-right:.4rem}
  .sw.s{background:color-mix(in srgb,var(--ink) 80%,transparent)}
  .sw.h{background:repeating-linear-gradient(-45deg,var(--hatch) 0 1px,transparent 1px 4px)}
  .receipt{display:flex;flex-wrap:wrap;gap:.2rem 1.2rem;margin:1.1rem 0 0;padding:.45rem 0;border-top:1px solid color-mix(in srgb,var(--ink) 55%,transparent);border-bottom:1px dotted color-mix(in srgb,var(--ink) 55%,transparent);font-family:var(--font-mono);font-size:0.75rem;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
  .hand{font-family:"Segoe Print","Ink Free","Bradley Hand","Chalkboard SE","Marker Felt",cursive;color:var(--graphite);font-size:0.98rem;line-height:1.4;transform:rotate(-1.4deg);transform-origin:left top;margin:1.2rem 0 0;max-width:40ch}
  .toc{display:flex;flex-wrap:wrap;gap:.3rem 1.4rem;margin:1.4rem 0 0;padding:0;list-style:none;font-family:var(--font-mono);font-size:0.75rem}
  .toc a{color:var(--muted);border-bottom:1px solid var(--line-strong)}
  .toc a:hover{color:var(--ink);text-decoration:none;border-bottom-color:var(--ink)}

  section.sec{padding:clamp(2rem,5vw,3.2rem) 0;border-top:1px solid var(--line);scroll-margin-top:1rem}
  section.sec.band{background:var(--band)}
  .sec h2{font-size:clamp(1.45rem,2.5vw,1.9rem);font-style:italic;font-weight:500;margin:0 0 .5rem}
  .sec .lead{color:var(--muted);max-width:62ch;margin:0 0 1.4rem}

  /* how to read it */
  .key{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem 2rem;margin:0}
  .key div{border-top:1px solid color-mix(in srgb,var(--ink) 55%,transparent);padding-top:.6rem}
  .key dt{font-weight:650;margin:0 0 .3rem}
  .key dd{margin:0;font-size:0.95rem;color:var(--muted);line-height:1.5}
  .key dd + dd{margin-top:.45rem}
  .notes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.9rem 2.2rem;margin:2rem 0 0;padding-top:1.1rem;border-top:1px dashed color-mix(in srgb,var(--ink) 30%,transparent)}
  .notes p{margin:0;font-size:0.95rem;line-height:1.55;color:var(--muted)}
  .notes b{color:var(--ink);font-weight:650}

  /* the ledger tables */
  .cat{margin:0 0 2rem}
  .cat h3{margin:0;font-size:1.2rem}
  .catline{margin:.15rem 0 .6rem;font-family:var(--font-mono);font-size:0.75rem;color:var(--hint);display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
  .tally{display:inline-flex;gap:2px;flex-wrap:wrap;vertical-align:middle}
  .tally i{display:block;width:.6rem;height:.6rem;background:color-mix(in srgb,var(--ink) 80%,transparent)}
  .tally i.h{background:repeating-linear-gradient(-45deg,var(--hatch) 0 1px,transparent 1px 3px);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 45%,transparent)}
  .tw{background:var(--surface);border:1px solid var(--line-strong);border-radius:4px}
  .lt{width:100%;border-collapse:collapse;font-size:0.92rem}
  .lt thead th{font-family:var(--font-mono);font-size:0.75rem;letter-spacing:.03em;color:var(--hint);text-align:left;font-weight:600;padding:.5rem .8rem;border-bottom:1px solid var(--line-strong)}
  .lt tbody th{text-align:left;font-weight:650;width:30%}
  .lt tbody th,.lt td{padding:.5rem .8rem;border-top:1px solid var(--line);vertical-align:top}
  .lt tbody tr:first-child th,.lt tbody tr:first-child td{border-top:0}
  .lt .n{text-align:right;white-space:nowrap}
  .lt td.n{font-family:var(--font-mono);font-weight:700}
  .basis{display:block;font-family:var(--font-mono);font-size:0.75rem;font-weight:400;color:var(--hint)}
  .more{color:var(--hint);font-size:.88em}
  .lt tr.rrow td{border-top:0;padding-top:0}
  .rcpt{margin:0;font-family:var(--font-mono);font-size:0.75rem;line-height:1.5}
  .rcpt .src,.rcpt a{color:var(--ochre)}
  .rcpt a{border-bottom:1px dotted currentColor}
  .rcpt a:hover{text-decoration:none}
  .asof{color:var(--hint)}
  .lt tr.wh th{font-weight:500;color:var(--muted)}
  .lt tr.wh td{font-family:var(--font-mono);font-size:0.75rem;color:var(--muted)}
  .cov{position:relative;display:inline-block;width:7rem;height:.7rem;margin-right:.7rem;vertical-align:-.08rem;border:1px solid color-mix(in srgb,var(--ink) 45%,transparent);background:repeating-linear-gradient(-45deg,var(--hatch) 0 1px,transparent 1px 4px)}
  .cov i{position:absolute;left:0;top:0;bottom:0;background:color-mix(in srgb,var(--ink) 60%,transparent)}
  .cov u{position:absolute;top:-.25rem;bottom:-.25rem;width:1px;background:var(--ink)}

  .pcat{background:var(--surface);border:1px solid var(--line-strong);border-radius:4px;margin:0 0 .5rem}
  .pcat summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:.3rem .8rem;align-items:center;padding:.55rem .9rem;flex-wrap:wrap}
  .pcat summary::-webkit-details-marker{display:none}
  .pcat summary::before{content:"+";font-family:var(--font-mono);color:var(--hint);margin-right:-.3rem}
  .pcat[open] summary::before{content:"\\2212"}
  .pcat .pname{font-weight:650;flex:1}
  .pcat summary:hover .pname{color:var(--accent)}
  .sumline{font-family:var(--font-mono);font-size:0.75rem;color:var(--hint);display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
  .pcat .tw{border:0;border-top:1px solid var(--line-strong);border-radius:0 0 4px 4px}
  .more-to-do{color:var(--muted);max-width:62ch;margin:1.4rem 0 0}

  footer{border-top:1px solid var(--line-strong)}
  footer .wrap{padding:1.4rem clamp(1rem,4vw,2.2rem);display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;font-family:var(--font-mono);font-size:0.75rem;color:var(--hint)}
  footer a{color:var(--muted)}

  @media (max-width:760px){
    .key,.notes,.legend{grid-template-columns:1fr}
  }
  /* Four columns on a phone gave the names of the top-marked products a 95px column, and a list
     of product names set in 95px runs to 220px for every row of every category. Below 34rem a row
     stacks: the measure names it, and the other cells say which column they came from. */
  @media (max-width:34rem){
    body{font-size:1rem}
    .lt thead{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
    .lt,.lt tbody,.lt tr,.lt th,.lt td{display:block;width:100%}
    .lt tbody tr{padding:.45rem 0;border-top:1px solid var(--line)}
    .lt tbody tr:first-child,.lt tr.rrow{border-top:0}
    .lt tr.rrow{padding-top:0}
    .lt tbody th,.lt td{border:0;padding:.1rem .8rem}
    .lt td[data-th]::before{content:attr(data-th) ": ";font-family:var(--font-mono);font-size:0.75rem;font-weight:400;color:var(--hint)}
    .lt tbody th{width:100%}
    .lt .n{text-align:left}
    .lt td.n{display:inline-block;width:auto;padding-right:.2rem}
    .cov{display:block;margin:.3rem 0 .25rem}
  }
</style>
</head>
<body>
<a class="skip" href="#content">Skip to content</a>
<header class="masthead">
  <div class="wrap">
    <a class="brand" href="../index.html">&#9671; Values Commons</a>
    <nav class="exits" aria-label="Primary">
      <a href="../passport/index.html">Your values</a>
      <a href="../standard/index.html">For builders</a>
      <a class="go" href="../app/index.html">Open the app &rarr;</a>
    </nav>
  </div>
</header>
<main id="content" tabindex="-1">
  <header class="hero">
    <div class="wrap">
      ${plate(1, 'Every measure in the data as one bar. The solid part is measures with a top mark, and the hatched part is measures withheld')}
      <h1>${awarded} top marks, and ${wCov + wN} measures withheld because the evidence is too thin</h1>
      <p class="lede">A top mark is the highest sourced score on one measure in one category, out of 100. I only give one where the category has <b>${MIN_N} or more entries</b> and <b>at least ${BAR}% of them</b> have a sourced score on that measure. Where the data falls short, the measure gets no mark. It stays on this page, hatched, with how much of it is scored.</p>
      <div class="fig1">
        <p class="splitlab"><span><b class="tnum">${awarded}</b> given</span><span><b class="tnum">${wCov + wN}</b> withheld</span></p>
        <div class="split" role="img" aria-label="${awarded} of ${totalMeasures} measures have a top mark and ${wCov + wN} are withheld"><span class="got" style="width:${gotPct}%"></span><span class="held"></span></div>
        <div class="legend">
          <p><span class="sw s" aria-hidden="true"></span>Solid. Today that is <b class="tnum">${awarded}</b> awarded measures, in <span class="tnum">${cats.length}</span> categories. <span class="tnum">${perfect}</span> of the top marks are a perfect 100.</p>
          <p><span class="sw h" aria-hidden="true"></span>Hatched. ${wCov + wN} measures below the evidence bar. ${onlyWithheld.length ? `In <span class="tnum">${onlyWithheld.length}</span> categories every measure is withheld.` : ''}</p>
        </div>
        <p class="receipt"><span>Computed ${today}</span><span>${totalCats} categories</span><span>${totalMeasures} measures</span><span>Bar: ${MIN_N}+ entries, ${BAR}% scored</span></p>
        ${bigEmpty ? `<p class="hand">${esc(bigEmpty.label)} has ${bigEmpty.n} entries and not one top mark, because ${bigEmpty.n >= MIN_N ? 'too few of them have a sourced score' : 'it has fewer than ' + MIN_N + ' entries'}.</p>` : ''}
      </div>
      <ul class="toc" aria-label="On this page">
        <li><a href="#read">How to read it</a></li>
        <li><a href="#hand-checked">Checked by hand, ${handCats}</a></li>
        <li><a href="#products">From open data, ${productCats}</a></li>
        ${onlyWithheld.length ? `<li><a href="#withheld">Nothing awarded yet, ${onlyWithheld.length}</a></li>` : ''}
      </ul>
    </div>
  </header>

  <section class="sec band" id="read">
    <div class="wrap">
      <h2>How to read it</h2>
      <dl class="key">
        <div><dt>A top mark</dt><dd>The highest score on one measure in one category, from a source you can check. Ties share it. It is one fact about one option. Which option is best for you depends on your weights, and <a href="../app/index.html">the app</a> works that out.</dd></div>
        <div><dt>Withheld</dt><dd>Too few entries have a sourced score to say who is highest, so there is no mark. The small bar shows the scored share in solid, the unscored share hatched, and a tick at ${BAR}%.</dd></div>
        <div><dt>A row</dt><dd>Measure, then who holds the top mark (&ldquo;+N co-holders&rdquo; counts the rest of a tie), then the score out of 100. Meet ${HIGH} counts the entries scoring ${HIGH} or more.</dd><dd>In the hand-checked tables, the line under a row is the source for the top score, in brown, with its date.</dd></div>
      </dl>
      <div class="notes">
        <p><b>What's happening.</b> A script reads every dataset in the app, finds the highest sourced score on each measure, and gives it the top mark. It rewrites this page whenever the data changes, so nobody picks a winner by hand.</p>
        <p><b>Why it matters.</b> A top mark is only worth as much as the evidence behind it. The withheld list shows that the bar turns measures away. If it never withheld one, it would not be checking anything.</p>
        <p><b>Devil's advocate.</b> A top mark is often shared by many entries. Many scores come from a grade or a label, and every entry with the same grade gets the same score. Every product with a Nutri-Score of A gets 100, for example. So ${crowd} top marks are shared by ten or more entries${busiest ? `, and the most shared one, ${esc(busiest.a.axis)} in ${esc(busiest.c.label)}, is shared by ${busiest.a.holders.length}` : ''}. A top mark also means the best in this dataset, and this dataset does not hold every product in the shops.</p>
        <p><b>Rabbit hole.</b> The evidence bar is two constants near the top of <a href="https://github.com/BentleyMoon/conscious-consuming/blob/main/pipeline/build_awards.js">pipeline/build_awards.js</a>. Or open a hatched row below and fill the gap in <a href="../workshop/index.html">fact repair</a>.</p>
      </div>
    </div>
  </section>

  <section class="sec" id="hand-checked">
    <div class="wrap">
      ${plate(2, 'Categories checked by hand, one table each')}
      <h2>Services, media, organizations and causes, checked by hand</h2>
      <p class="lead">${handCats} categories where every measure is hand-checked. Each top mark shows its source note and link.</p>
      ${TYPE_ORDER.filter(t => t !== 'Products' && byType[t]).map(t => handSection(byType[t])).join('\n')}
    </div>
  </section>

  <section class="sec band" id="products">
    <div class="wrap">
      ${plate(3, 'Product categories scored from open data')}
      <h2>Products, from the open food and care datasets</h2>
      <p class="lead">${productCats} bigger categories scored from open data such as Green-Score, NOVA, Nutri-Score and certification labels. Open one for its table. Each solid square beside a name is a measure with a top mark, and each hatched square is a measure withheld.</p>
      ${byType.Products ? productDetails(byType.Products) : ''}
    </div>
  </section>

  ${onlyWithheld.length ? `<section class="sec" id="withheld">
    <div class="wrap">
      ${plate(4, 'Categories where every measure is withheld')}
      <h2>Nothing awarded yet</h2>
      <p class="lead">In these ${onlyWithheld.length} categories no measure clears the bar, so there is no top mark at all. They are listed so you can see what is missing.</p>
      ${emptyDetails(onlyWithheld)}
      <p class="more-to-do">Every hatched row on this page is a gap anyone can fill. Add a sourced score in <a href="../workshop/index.html">fact repair</a>, and once a measure reaches the bar, the next build gives it a top mark. <a href="../contribute/index.html">Other ways to help</a>.</p>
    </div>
  </section>` : ''}
</main>
<footer>
  <div class="wrap">
    <span>Computed ${today} from the live dataset by pipeline/build_awards.js, and rewritten when the data changes.</span>
    <span><a href="../index.html">Home</a> &middot; <a href="../app/index.html">Open the app</a></span>
    <!-- family:start --><!-- family:end -->
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
