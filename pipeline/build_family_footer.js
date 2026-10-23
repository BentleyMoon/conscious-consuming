#!/usr/bin/env node
/* Writes the Futurism Institute family footer into every hand-written Values Commons page, from
   content/family.json (the copy scripts/import-family.mjs saves of futurisminstitute.org/family.json).

   WHY THIS EXISTS: the outside review of 2026-10-12 found that no Values Commons page used the family
   footer; each page had its own list, and the sites disagreed on what the family holds. The Institute
   now builds one list, and its footer and this one are both drawn from it: Start here, Research, then
   every public project once under Records, Groups and Places, in the list's order. Conscious Consuming
   is this site's project, so it is marked as the one you are on.

   Each page carries the markers <!-- family:start --> and <!-- family:end -->; everything between them
   is replaced. `--check` fails the gate when a page's footer differs from the list. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');
const PAGES = [
  'index.html', 'standard/index.html', 'tour/index.html', 'passport/index.html', 'weave/index.html',
  'assembly/index.html', 'slate/index.html', 'workshop/index.html', 'contribute/index.html',
  'instances/index.html', 'instances/messages/index.html', 'instances/new/index.html',
  'funders/index.html', 'awards/index.html', 'kosplora/shelf/index.html',
];
// The builders' kit pages (pipeline/build_kit.js, run before this step) carry the markers too.
for (const dir of ['standard/spec', 'standard/registry', 'standard/engine', 'standard/data', 'standard/conformance', 'standard/ns']) {
  const abs = path.join(__dirname, '..', dir);
  if (!fs.existsSync(abs)) continue;
  if (fs.existsSync(path.join(abs, 'index.html'))) PAGES.push(`${dir}/index.html`);
  for (const d of fs.readdirSync(abs)) if (fs.existsSync(path.join(abs, d, 'index.html'))) PAGES.push(`${dir}/${d}/index.html`);
}
const HERE = 'cc';
const START = '<!-- family:start -->';
const END = '<!-- family:end -->';

const family = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/family.json'), 'utf8'));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function item(p, desc) {
  const here = p.key === HERE;
  return `<li${here ? ' class="fam-here"' : ''}><a href="${esc(p.url)}"><span class="fam-name">${esc(p.name)}</span>` +
    `<span class="fam-desc">${esc(desc)}</span>${here ? '<span class="fam-you">You are here</span>' : ''}</a></li>`;
}
function col(head, items) {
  return items.length ? `<div><p class="fam-head">${esc(head)}</p><ul>${items.join('')}</ul></div>` : '';
}
const [start, research] = [family.homes.find((h) => h.key === 'futurism'), family.homes.find((h) => h.key === 'bentley')];
const pub = family.projects.filter((p) => p.public && p.url);
const cols = [
  col('Start here', start ? [item(start, start.line)] : []),
  col('Research', research ? [item(research, research.line)] : []),
  ...Object.entries(family.groups).map(([key, label]) => col(label, pub.filter((p) => p.group === key).map((p) => item(p, p.short || p.line)))),
].join('');

const block = `${START}
<style>
  /* sizes, spacing and case follow research/design_system_audit.js: the eight-step scale, the 0.25rem grid, no uppercase */
  .fam{border-top:1px solid var(--line,#e3e7e5);margin-top:1.5rem;padding-top:1.25rem;grid-column:1/-1;flex-basis:100%;width:100%}
  .fam-foot{border-top:1px solid var(--line,#e3e7e5);padding:1.25rem 0 2.5rem}
  .fam-foot .fam,.fam-after .fam{border-top:0;margin-top:0}
  .fam>p{margin:0 0 1rem;font-family:var(--font-mono,ui-monospace,monospace);font-size:.75rem;color:var(--hint,var(--muted,#566560))}
  .fam-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(10.5rem,1fr));gap:1rem 1.5rem}
  .fam-head{margin:0 0 .5rem;font-size:.86rem;font-weight:700;color:var(--ink,#18211d)}
  .fam ul{list-style:none;margin:0;padding:0}
  .fam li{margin:0 0 .5rem}
  .fam a{display:block;text-decoration:none;color:inherit;border:0;box-shadow:none}
  .fam a:hover .fam-name{text-decoration:underline}
  .fam-name{display:block;font-size:.86rem;font-weight:600;color:var(--accent,#1d7a5a)}
  .fam-desc{display:block;font-size:.75rem;line-height:1.4;color:var(--muted,#566560)}
  .fam-you{display:inline-block;margin-top:.25rem;font-family:var(--font-mono,ui-monospace,monospace);font-size:.64rem;color:var(--ink,#18211d)}
</style>
<nav class="fam" aria-label="The Futurism Institute family">
  <p>The Futurism Institute family</p>
  <div class="fam-cols">${cols}</div>
</nav>
${END}`;

let drift = 0;
for (const rel of PAGES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.error(`build_family_footer: ${rel} is missing`); process.exit(1); }
  const before = fs.readFileSync(file, 'utf8');
  const a = before.indexOf(START), b = before.indexOf(END);
  if (a < 0 || b < a) { console.error(`build_family_footer: ${rel} has no family markers`); process.exit(1); }
  // The builders' kit is the standard's own site, not Conscious Consuming, so it marks no project as "here".
  const own = rel.startsWith('standard/') ? block.split('<span class="fam-you">You are here</span>').join('').split(' class="fam-here"').join('') : block;
  const after = before.slice(0, a) + own + before.slice(b + END.length);
  if (after !== before) {
    drift++;
    if (CHECK) console.error(`  FAIL ${rel}: its family footer differs from content/family.json; run node pipeline/build_family_footer.js`);
    else { fs.writeFileSync(file, after); console.log(`  wrote ${rel}`); }
  }
}
if (CHECK) {
  if (drift) { console.error('FAMILY FOOTER CHECK FAIL'); process.exit(1); }
  console.log(`FAMILY FOOTER CHECK PASS (${PAGES.length} pages, ${pub.length} public projects, list of ${family.built})`);
} else console.log(`build_family_footer: ${PAGES.length} pages, ${pub.length} public projects, list of ${family.built}`);
