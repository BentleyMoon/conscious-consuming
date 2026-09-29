#!/usr/bin/env node
/* Ochre means provenance and nothing else, and this check keeps the count of ochre uses from growing.

   The contract is written in the valuescommons.org design document: "ochre for anything but
   provenance" is on the list of what this site refuses. It is broken in roughly ten places (the
   front page hero gradient and footer links among them), and those are parked as Bentley's
   decisions. Nothing checked the contract, so a new ochre use could land anywhere.

   This is a ratchet, not a judge. It does not decide which of today's uses are provenance and which
   are the parked violations. It pins how many uses each file holds on 2026-09-23 and fails when:
     - a pinned file holds more than its pin,
     - a file with no pin starts using ochre,
     - ochre is written as a raw hex colour instead of the token, which would slip past the count,
     - a pinned file holds fewer than its pin (fixed or moved: lower the pin in the same commit, so
       the ratchet only ever tightens).

   A new ochre use that really is provenance raises its file's pin in the same commit, with the
   reason in the commit message. That keeps each addition a written decision instead of a drift.

   Run: node research/ochre_ratchet_audit.js */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Authored surfaces only. Generated pages (app/c, app/g, dist) inherit from these; audits and docs
// quote the token without using it.
const SKIP_DIRS = new Set(['node_modules', 'dist', 'docs', 'research', 'content',
  'screenshots', 'tmp']);
const SKIP_PATHS = new Set(['app/c', 'app/g']);
const EXT = /\.(html|css|js|mjs)$/i;

// Every ochre value any page defines: the catalogue's pair and Kosplora's pair.
const OCHRE_HEX = ['#8a5514', '#cc9c5e', '#7a5f18', '#c9a227'];

// var(--ochre) uses per file on 2026-09-23: 36 in 14 files.
const PINS = new Map([
  ['index.html', 9],
  ['kosplora/shelf/index.html', 4],
  ['funders/index.html', 3],
  ['instances/new/index.html', 3],
  ['contribute/index.html', 2],
  ['instances/index.html', 2],
  ['kosplora/route.css', 2],
  ['passport/index.html', 2],
  ['standard/index.html', 2],
  ['tour/index.html', 2],
  ['weave/index.html', 2],
  ['awards/index.html', 1],
  ['kosplora/curriculum.js', 1],
  ['pipeline/build_awards.js', 1]
]);

function countUses(text) {
  const vars = (text.match(/var\(--ochre[\w-]*\)/g) || []).length;
  let rawHex = 0;
  for (const line of text.split('\n')) {
    // A definition names the token; strip those so only a hex used as a colour remains.
    const stripped = line.replace(/--ochre[\w-]*\s*:\s*#[0-9a-f]{3,8}/gi, '');
    for (const hex of OCHRE_HEX) rawHex += stripped.toLowerCase().split(hex).length - 1;
  }
  return { vars, rawHex };
}

function walk(rel, out) {
  const abs = path.join(ROOT, rel);
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const child = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      // Dot-directories (.git, editor and tool state) are never shipped styles.
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name) || SKIP_PATHS.has(child)) continue;
      walk(child, out);
    } else if (entry.isFile() && EXT.test(entry.name)) {
      const counts = countUses(fs.readFileSync(path.join(ROOT, child), 'utf8'));
      if (counts.vars || counts.rawHex) out.set(child, counts);
    }
  }
  return out;
}

function inspect(found) {
  const errors = [];
  for (const [file, { vars, rawHex }] of found) {
    if (rawHex) errors.push(`raw hex: ${file} writes ochre as a hex colour ${rawHex} time(s); use var(--ochre) so it is counted`);
    if (!PINS.has(file)) { if (vars) errors.push(`new file: ${file} uses ochre ${vars} time(s) and has no pin`); continue; }
    const pin = PINS.get(file);
    if (vars > pin) errors.push(`grew: ${file} uses ochre ${vars} times; its pin is ${pin}`);
    if (vars < pin) errors.push(`tighten: ${file} uses ochre ${vars} times; lower its pin from ${pin} to ${vars}`);
  }
  for (const [file, pin] of PINS) {
    if (!found.has(file)) errors.push(`tighten: ${file} no longer uses ochre; remove its pin of ${pin}`);
  }
  return errors;
}

function withText(found, file, text) {
  const copy = new Map(found);
  const counts = countUses(text);
  if (counts.vars || counts.rawHex) copy.set(file, counts); else copy.delete(file);
  return copy;
}

const BITES = [
  { what: 'a pinned page adds an ochre use',
    pattern: /^grew: index\.html /,
    make: (found, read) => withText(found, 'index.html', read('index.html') + '\n<b style="color:var(--ochre)">x</b>') },
  { what: 'a page with no pin starts using ochre',
    pattern: /^new file: app\/styles\.css /,
    make: (found, read) => withText(found, 'app/styles.css', read('app/styles.css') + '\n.x{color:var(--ochre)}') },
  { what: 'ochre written as a hex colour, around the token',
    pattern: /^raw hex: weave\/index\.html /,
    make: (found, read) => withText(found, 'weave/index.html', read('weave/index.html') + '\n<i style="color:#8A5514">x</i>') },
  { what: 'a fixed use leaves its pin standing',
    pattern: /^tighten: tour\/index\.html .* from 2 to 1/,
    make: (found, read) => withText(found, 'tour/index.html', read('tour/index.html').replace('var(--ochre)', 'var(--muted)')) }
];

function main() {
  console.log('Ochre ratchet audit');
  const found = walk('', new Map());
  const errors = inspect(found);
  if (errors.length) {
    console.log(`  failures: ${errors.length}`);
    for (const e of errors) console.log(`  FAIL ${e}`);
    console.log('OCHRE RATCHET AUDIT FAILED');
    process.exit(1);
  }
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const bite of BITES) {
    const caught = inspect(bite.make(found, read)).filter((e) => bite.pattern.test(e));
    if (!caught.length) {
      console.log(`OCHRE RATCHET AUDIT FAILED (bite "${bite.what}" produced no matching error)`);
      process.exit(1);
    }
    console.log(`  bite proof: ${bite.what} -> caught`);
  }
  const total = [...found.values()].reduce((n, c) => n + c.vars, 0);
  console.log(`  ${total} ochre uses in ${found.size} files, each at its pin; 0 raw hex colours`);
  console.log(`  ${BITES.length} of ${BITES.length} checks proved able to fail`);
  console.log('OCHRE RATCHET AUDIT PASS');
}

main();
