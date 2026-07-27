#!/usr/bin/env node
/* Value-theme map drift audit.

   valueSignature is generated in Python but defined semantically by the JS
   engine. This gate keeps the duplicated build/audit maps aligned until the
   standard owns a single exported theme-map file.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../app/engine.js');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function readJson(relPath) {
  return JSON.parse(readText(relPath));
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function sortedEntries(map) {
  return Object.fromEntries(Object.entries(map || {}).sort(([a], [b]) => a.localeCompare(b)));
}

function sameObject(a, b) {
  return JSON.stringify(sortedEntries(a)) === JSON.stringify(sortedEntries(b));
}

function sameArray(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => item === b[i]);
}

function parsePythonDict(relPath, name) {
  const text = readText(relPath);
  const match = text.match(new RegExp(`${name}\\s*=\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match) {
    failures.push(`${relPath}: missing ${name} dictionary`);
    return {};
  }
  const out = {};
  for (const item of match[1].matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)) out[item[1]] = item[2];
  expect(Object.keys(out).length > 0, `${relPath}:${name} parsed as empty`);
  return out;
}

function parseJsObject(relPath, name) {
  const text = readText(relPath);
  const match = text.match(new RegExp(`const\\s+${name}\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!match) {
    failures.push(`${relPath}: missing ${name} object`);
    return {};
  }
  const out = {};
  for (const item of match[1].matchAll(/(?:^|[\s,])([A-Za-z0-9_]+|["'][^"']+["'])\s*:\s*["']([^"']+)["']/g)) {
    const key = item[1].replace(/^["']|["']$/g, '');
    out[key] = item[2];
  }
  expect(Object.keys(out).length > 0, `${relPath}:${name} parsed as empty`);
  return out;
}

function parseJsArray(relPath, name) {
  const text = readText(relPath);
  const match = text.match(new RegExp(`(?:const\\s+)?${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) {
    failures.push(`${relPath}: missing ${name} array`);
    return [];
  }
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map(item => item[1]);
}

function parsePythonTuple(relPath, name) {
  const text = readText(relPath);
  const match = text.match(new RegExp(`${name}\\s*=\\s*\\(([\\s\\S]*?)\\)`));
  if (!match) {
    failures.push(`${relPath}: missing ${name} tuple`);
    return [];
  }
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map(item => item[1]);
}

function compareMap(label, actual, expected) {
  if (sameObject(actual, expected)) return;
  const actualKeys = new Set(Object.keys(actual || {}));
  const expectedKeys = new Set(Object.keys(expected || {}));
  const missing = [...expectedKeys].filter(key => !actualKeys.has(key)).sort();
  const extra = [...actualKeys].filter(key => !expectedKeys.has(key)).sort();
  const changed = [...expectedKeys].filter(key => actualKeys.has(key) && actual[key] !== expected[key]).sort();
  failures.push(`${label}: KEY2THEME drift (missing=${missing.join(',') || '-'} extra=${extra.join(',') || '-'} changed=${changed.join(',') || '-'})`);
}

function main() {
  console.log('Value theme map audit');
  const expectedMap = sortedEntries(engine.KEY2THEME || {});
  const designTokens = readJson('content/design/tokens.json');
  const bloomOrder = designTokens.valueBloom && designTokens.valueBloom.order || [];

  expect(Object.keys(expectedMap).length >= 40, `app/engine.js: expected at least 40 mapped criteria, found ${Object.keys(expectedMap).length}`);
  expect(sameArray(bloomOrder, ['planet', 'people', 'health', 'honesty', 'privacy', 'animals', 'cost', 'local']), 'content/design/tokens.json:valueBloom.order changed unexpectedly');

  compareMap('pipeline/build_datasets.py', parsePythonDict('pipeline/build_datasets.py', 'KEY2THEME'), expectedMap);
  compareMap('research/verify_run.js', parseJsObject('research/verify_run.js', 'KEY2THEME'), expectedMap);

  const themeArrays = [
    ['pipeline/build_datasets.py:BLOOM_THEME_ORDER', parsePythonTuple('pipeline/build_datasets.py', 'BLOOM_THEME_ORDER')],
    ['research/verify_run.js:BLOOM_THEMES', parseJsArray('research/verify_run.js', 'BLOOM_THEMES')],
    ['research/design_tokens_audit.js:REQUIRED_BLOOM_THEMES', parseJsArray('research/design_tokens_audit.js', 'REQUIRED_BLOOM_THEMES')],
    ['research/standard_audit.js:DESIGN_BLOOM_THEMES', parseJsArray('research/standard_audit.js', 'DESIGN_BLOOM_THEMES')],
  ];
  for (const [label, actual] of themeArrays) {
    expect(sameArray(actual, bloomOrder), `${label}: expected ${JSON.stringify(bloomOrder)}, found ${JSON.stringify(actual)}`);
  }

  const mappedThemes = new Set(Object.values(expectedMap));
  for (const theme of mappedThemes) expect(bloomOrder.includes(theme), `app/engine.js: mapped theme ${theme} is absent from valueBloom.order`);

  console.log(`  mapped criteria: ${Object.keys(expectedMap).length}`);
  console.log(`  bloom themes: ${bloomOrder.join(', ')}`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('VALUE THEME MAP CHECKS PASS');
}

main();
