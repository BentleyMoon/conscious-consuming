#!/usr/bin/env node
/* The design system is a property, not a snapshot.

   WHY THIS EXISTS: on 2026-07-27 the Kosplora surface was measured at 34 distinct font sizes,
   four h2 sizes, an h3 rendering larger than the h1, and 26 ad-hoc top margins. That was
   diagnosed, fixed by hand down to 10 sizes on an eight-step scale, and written up. Six hours
   later an external research round landed, brought its own style block, and the count was back
   to 20 with nine unrelated border radii and an uppercase badge.

   The round was not at fault. It was authored five days before the scale existed and could not
   have conformed to it. The fault was that every other invariant here is pinned by a receipt and
   this one was not, so it survived exactly as long as nothing touched it.

   A receipt turns "this feels off" into "this adds nine radii to a system that declares three",
   which is a sentence a contributor can act on without anyone arguing about taste.

   WHAT THIS CANNOT DO, stated rather than papered over: it reads DECLARED css out of source,
   including css injected from javascript template strings, because that is where this drift
   actually arrives. It does not compute styles, so it cannot see values produced by cascade,
   inheritance, or arithmetic. Computed-style checks need a real browser; the manual step is
   printed every run rather than letting silence imply coverage.
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const notes = [];

// The declared system. Changing these is a design decision and should read like one.
const TOKENS = {
  // Eight steps built around the 1rem body so body copy never moves.
  fontRem: [2.4, 1.75, 1.35, 1.12, 1.0, 0.86, 0.75, 0.64],
  radiusPx: [0, 5, 8, 14, 999],
  spacingRem: 0.25,          // everything lands on a 4px grid
  uppercaseBudget: 0,        // the badge tell has returned twice; the budget is zero
};

// Surfaces that are designed rather than generated. Narrow on purpose: a budget nobody can meet
// is a budget everybody ignores.
const SURFACES = [
  'kosplora/shelf/index.html',
  'kosplora/curriculum.js',
  'instances/messages/index.html',
  'app/shell.js',
];

const near = (v, list) => list.some((t) => Math.abs(t - v) < 0.005);

function cssFrom(rel) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (rel.endsWith('.html')) {
    return (text.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []).join('\n');
  }
  // JS files inject css as template strings. Take the whole file: declarations only match
  // inside css-shaped text anyway, and this is where the drift actually hides.
  return text;
}

function audit(rel) {
  if (!fs.existsSync(path.join(ROOT, rel))) { failures.push(`${rel}: designed surface is missing`); return; }
  const css = cssFrom(rel);

  const sizes = new Set();
  for (const m of css.matchAll(/font-size:\s*([0-9.]+)(rem|em|px)/g)) {
    const v = m[2] === 'px' ? Number(m[1]) / 16 : Number(m[1]);
    if (m[2] === 'em') continue;                       // relative to context, not the scale
    if (!near(v, TOKENS.fontRem)) sizes.add(`${m[1]}${m[2]}`);
  }
  if (sizes.size) failures.push(`${rel}: ${sizes.size} font size(s) off the declared scale: ${[...sizes].sort().join(', ')}`);

  const radii = new Set();
  for (const m of css.matchAll(/border-radius:\s*([^;}\n]+)/g)) {
    for (const tok of m[1].trim().split(/\s+/)) {
      const px = /^([0-9.]+)px$/.exec(tok);
      if (!px) continue;
      if (!near(Number(px[1]), TOKENS.radiusPx)) radii.add(tok);
    }
  }
  if (radii.size) failures.push(`${rel}: ${radii.size} border radius value(s) off the declared scale: ${[...radii].sort().join(', ')}`);

  const upper = (css.match(/text-transform:\s*uppercase/g) || []).length;
  if (upper > TOKENS.uppercaseBudget) {
    failures.push(`${rel}: ${upper} uppercase rule(s) against a budget of ${TOKENS.uppercaseBudget}. The badge-above-a-heading tell has returned twice; if one is genuinely wanted, raise the budget deliberately.`);
  }

  const offGrid = new Set();
  for (const m of css.matchAll(/\b(?:margin|padding)(?:-top|-bottom|-left|-right)?:\s*([^;}\n]+)/g)) {
    if (/calc\(|var\(/.test(m[1])) continue;
    for (const tok of m[1].trim().split(/\s+/)) {
      const rem = /^([0-9.]+)rem$/.exec(tok);
      if (!rem) continue;
      const v = Number(rem[1]);
      if (v > 0 && Math.abs(v / TOKENS.spacingRem - Math.round(v / TOKENS.spacingRem)) > 0.01) offGrid.add(tok);
    }
  }
  if (offGrid.size) failures.push(`${rel}: ${offGrid.size} spacing value(s) off the ${TOKENS.spacingRem}rem grid: ${[...offGrid].sort().slice(0, 8).join(', ')}`);

  notes.push(`  ${rel}: ${(css.match(/font-size:/g) || []).length} font-size, ${(css.match(/border-radius:/g) || []).length} radius, ${upper} uppercase`);
}

function main() {
  console.log('Design system audit');
  console.log(`  scale: ${TOKENS.fontRem.join(', ')}rem · radii ${TOKENS.radiusPx.join(', ')}px · ${TOKENS.spacingRem}rem grid`);
  for (const rel of SURFACES) audit(rel);
  for (const line of notes) console.log(line);

  console.log('\nMANUAL, and not optional: this reads declared css, not computed style.');
  console.log('Cascade-derived sizes and js-set inline styles are invisible to it. In a browser:');
  console.log("  new Set([...document.querySelectorAll('body *')].map(e=>getComputedStyle(e).fontSize)).size");
  console.log('Expect a number at or near the scale length.\n');

  if (failures.length) {
    console.error(`DESIGN SYSTEM AUDIT FAIL (${failures.length})`);
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log('DESIGN SYSTEM AUDIT PASS');
}

main();
