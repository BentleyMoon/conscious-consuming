#!/usr/bin/env node
/* Theme coverage contract.

   Every user-facing page must carry the light/dark switch: the no-flash head
   line that reads localStorage 'cc.theme', the shared theme.js control, and
   explicit :root[data-theme] palette blocks for both modes. That is what makes
   a person's theme choice hold on every navigation across the constellation.

   kosplora is the single deliberate exception: a dark-only learning atlas with
   no light palette. It must NOT load the toggle (a switch with nowhere to go
   reads as broken), so it is allowlisted and checked to stay that way. */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

const PAGES = [
  'index.html',
  'instances/new/index.html',
  'passport/index.html',
  'contribute/index.html',
  'weave/index.html',
  'instances/index.html',
  'standard/index.html',
  'tour/index.html',
  'funders/index.html',
  'assembly/index.html',
  'workshop/index.html',
  'slate/index.html',
  'instances/messages/index.html',
];
const DARK_ONLY = ['kosplora/index.html'];

function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { failures.push(`${rel}: missing file`); return ''; }
  return fs.readFileSync(p, 'utf8');
}

for (const rel of PAGES) {
  const t = read(rel);
  if (!t) continue;
  if (!/localStorage\.getItem\('cc\.theme'\)/.test(t)) failures.push(`${rel}: missing no-flash cc.theme head script`);
  if (!/theme\.js/.test(t)) failures.push(`${rel}: missing theme.js control include`);
  if (!/\[data-theme="dark"\]/.test(t)) failures.push(`${rel}: missing :root[data-theme="dark"] palette block`);
  if (!/\[data-theme="light"\]/.test(t)) failures.push(`${rel}: missing :root[data-theme="light"] palette block`);
}

for (const rel of DARK_ONLY) {
  const t = read(rel);
  if (!t) continue;
  if (/theme\.js/.test(t)) failures.push(`${rel}: dark-only page must not load the toggle (no light palette to switch to)`);
}

if (failures.length) {
  console.log('Theme coverage audit failures:');
  for (const f of failures) console.log(`  FAIL ${f}`);
  process.exit(1);
}
console.log('Theme coverage audit');
console.log(`  switch present on: ${PAGES.length} pages`);
console.log(`  dark-only (allowlisted): ${DARK_ONLY.join(', ')}`);
console.log('THEME COVERAGE CHECKS PASS');
