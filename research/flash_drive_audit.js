#!/usr/bin/env node
/* Flash-drive edition audit.

   The goal is modest and important: keep the physical-copy instructions
   honest. The source file must explain file://, localhost, and HTTPS without
   implying that service-worker installability works from a double-clicked file.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'content', 'flash-drive-README.md');
const DIST = path.join(ROOT, 'dist', 'README-FLASH-DRIVE.txt');
const META = path.join(ROOT, 'dist', 'build-meta.json');
const failures = [];
const warnings = [];

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function read(file, required = true) {
  if (!fs.existsSync(file)) {
    if (required) failures.push(`${rel(file)}: missing file`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function expect(text, needle, label) {
  if (!text.toLowerCase().includes(needle.toLowerCase())) failures.push(`${label}: missing "${needle}"`);
}

function forbidPositiveLine(text, pattern, label, reason) {
  for (const line of text.split(/\r?\n/)) {
    if (!pattern.test(line)) continue;
    if (/\b(do not|not|cannot|can't|requires?|rather than|instead of)\b/i.test(line)) continue;
    failures.push(`${label}: forbidden wording (${reason}): ${line.trim()}`);
  }
}

function normalize(text) {
  return text.replace(/\r\n/g, '\n').trim();
}

function checkWording(text, label) {
  expect(text, 'index.html', label);
  expect(text, 'run.py', label);
  expect(text, 'run.cmd', label);
  expect(text, 'file://', label);
  expect(text, 'localhost', label);
  expect(text, 'HTTPS', label);
  expect(text, 'service worker', label);
  expect(text, 'Do not claim `file://` is installable as an offline PWA', label);
  expect(text, 'Do not claim the service worker runs from `file://`', label);
  expect(text, 'no account', label);
  expect(text, 'no backend', label);
  expect(text, 'no tracking', label);
  expect(text, 'Nothing here uploads your values', label);
  expect(text, 'Public production builds omit', label);

  forbidPositiveLine(text, /file:\/\/[^.\n]*(is|as|=)[^.\n]*(installable|offline PWA|service worker)/i, label, 'file:// cannot be promised as installable');
  forbidPositiveLine(text, /(installable|offline PWA|service worker)[^.\n]*(from|on|via)[^.\n]*file:\/\//i, label, 'service-worker installability cannot come from file://');
  forbidPositiveLine(text, /localhost[^.\n]*(is|as|=)[^.\n]*(public installable|offline PWA)/i, label, 'localhost is only a local helper');
}

function checkDist(sourceText) {
  if (!fs.existsSync(META)) {
    warnings.push('dist/build-meta.json missing; source wording checked only');
    return;
  }
  const distText = read(DIST);
  if (!distText) return;
  checkWording(distText, rel(DIST));
  if (normalize(sourceText) !== normalize(distText)) {
    failures.push('dist/README-FLASH-DRIVE.txt: does not match content/flash-drive-README.md');
  }
}

function main() {
  console.log('Flash-drive edition audit');
  const sourceText = read(SOURCE);
  if (sourceText) checkWording(sourceText, rel(SOURCE));
  checkDist(sourceText);

  console.log(`  source: ${sourceText ? 'present' : 'missing'}`);
  console.log(`  packaged: ${fs.existsSync(DIST) ? 'present' : 'not built'}`);
  console.log(`  warnings: ${warnings.length}`);
  for (const warning of warnings) console.log(`  WARN ${warning}`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('FLASH-DRIVE EDITION CHECKS PASS');
}

main();
