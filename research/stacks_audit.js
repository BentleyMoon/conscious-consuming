#!/usr/bin/env node
/* Stacks audit for Values Commons.

   The Stacks are content-addressed lens copies in dist/stacks/lens/<id>/<sha>.json.
   They let a cited lens hash remain fetchable and verifiable even if a friendly
   route changes later. This audit checks the copies, not trust in any mirror.
*/
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DIST_ARG = process.argv.find(arg => arg.startsWith('--dist-dir='));
const DIST = DIST_ARG ? path.resolve(ROOT, DIST_ARG.slice('--dist-dir='.length)) : path.join(ROOT, 'dist');
const DIST_LABEL = path.relative(ROOT, DIST).replace(/\\/g, '/') || 'dist';
const ODBL = 'https://opendatacommons.org/licenses/odbl/1-0/';
const failures = [];
const warnings = [];

function rel(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/');
}

function exists(abs) {
  return fs.existsSync(abs);
}

function read(abs, label = rel(abs)) {
  if (!exists(abs)) {
    failures.push(`${label}: missing file`);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}

function readJson(abs, label = rel(abs)) {
  const text = read(abs, label);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    failures.push(`${label}: invalid JSON (${err.message})`);
    return null;
  }
}

function sha256File(abs) {
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
}

function siteOrigin(siteBase) {
  try {
    return new URL(siteBase).origin;
  } catch {
    return '';
  }
}

function byId(items) {
  return new Map((items || []).map(item => [item.id, item]));
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function walkJson(abs, out = []) {
  if (!exists(abs)) return out;
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const next = path.join(abs, ent.name);
    if (ent.isDirectory()) walkJson(next, out);
    else if (ent.name.endsWith('.json')) out.push(next);
  }
  return out;
}

function checkBuildWiring() {
  const buildSite = read(path.join(ROOT, 'pipeline', 'build_site.py'));
  for (const needle of [
    '_write_stack_files',
    'open-values-stack-index',
    'stacks/lens/',
    'Content-addressed Open Values lens copies',
    "'stacks'",
  ]) {
    expect(buildSite.includes(needle), `pipeline/build_site.py: missing Stacks wiring ${needle}`);
  }
}

function checkStacks(root) {
  const meta = readJson(path.join(root, 'build-meta.json'), `${rel(root)}/build-meta.json`);
  if (!meta) return { checked: false, lenses: 0 };
  const origin = siteOrigin(meta.siteBase);
  const dataRoot = path.join(root, 'app', 'data');
  const appIndex = readJson(path.join(dataRoot, 'index.json'), `${rel(dataRoot)}/index.json`);
  const door = readJson(path.join(root, '.well-known', 'open-values.json'), `${rel(root)}/.well-known/open-values.json`);
  const stackIndex = readJson(path.join(root, 'stacks', 'index.json'), `${rel(root)}/stacks/index.json`);
  if (!appIndex || !door || !stackIndex) return { checked: false, lenses: 0 };

  const categories = appIndex.categories || [];
  const doorLenses = byId(door.lenses);
  const stackLenses = byId(stackIndex.lenses);
  expect(stackIndex.format === 'open-values-stack-index', `${rel(root)}/stacks/index.json: format should be open-values-stack-index`);
  expect(stackIndex.version === '0.1', `${rel(root)}/stacks/index.json: version should be 0.1`);
  expect(stackIndex.generatedAt === meta.generatedAt, `${rel(root)}/stacks/index.json: generatedAt should match build-meta`);
  expect(stackIndex.sourceDoor === `${origin}/.well-known/open-values.json`, `${rel(root)}/stacks/index.json: sourceDoor should match origin`);
  expect(stackIndex.hash === 'sha256', `${rel(root)}/stacks/index.json: hash should be sha256`);
  expect(door.stacks && door.stacks.index === `${origin}/stacks/index.json`, `${rel(root)}/.well-known/open-values.json: stacks.index should point at stack index`);
  expect(door.stacks && door.stacks.pattern === `${origin}/stacks/lens/{id}/{sha256}.json`, `${rel(root)}/.well-known/open-values.json: stacks.pattern should be content-addressed`);
  expect(stackLenses.size === categories.length, `${rel(root)}/stacks/index.json: expected ${categories.length} stack lenses, found ${stackLenses.size}`);

  for (const category of categories) {
    const cid = category.id;
    const dataFile = path.join(dataRoot, category.file || `${cid}.json`);
    const digest = sha256File(dataFile);
    const doorLens = doorLenses.get(cid);
    const stackLens = stackLenses.get(cid);
    const stackFile = path.join(root, 'stacks', 'lens', cid, `${digest}.json`);

    if (!doorLens) failures.push(`${cid}: missing Well-Known Door lens`);
    if (!stackLens) {
      failures.push(`${cid}: missing Stacks index lens`);
      continue;
    }

    expect(stackLens.sha256 === digest, `${cid}: stack sha256 should match app/data JSON`);
    expect(stackLens.integrity === `sha256-${digest}`, `${cid}: stack integrity should match sha256`);
    expect(stackLens.path === `/stacks/lens/${cid}/${digest}.json`, `${cid}: stack path should be content-addressed`);
    expect(stackLens.url === `${origin}/stacks/lens/${cid}/${digest}.json`, `${cid}: stack url should match origin`);
    expect(stackLens.canonicalData === `${meta.siteBase}/data/${category.file}`, `${cid}: canonicalData should match siteBase`);
    expect(stackLens.license === ODBL, `${cid}: stack license should be ODbL`);
    if (doorLens) {
      expect(doorLens.stack === stackLens.url, `${cid}: Well-Known Door stack URL should match Stacks index`);
      expect(doorLens.sha256 === stackLens.sha256, `${cid}: Well-Known Door hash should match Stacks index`);
    }
    if (!exists(stackFile)) {
      failures.push(`${cid}: missing content-addressed stack file ${rel(stackFile)}`);
      continue;
    }
    const stackDigest = sha256File(stackFile);
    expect(stackDigest === digest, `${cid}: stack file hash should match app/data JSON`);
  }

  const stackJsonFiles = walkJson(path.join(root, 'stacks', 'lens'));
  expect(stackJsonFiles.length === categories.length, `${rel(root)}/stacks/lens: expected ${categories.length} JSON files, found ${stackJsonFiles.length}`);

  return { checked: true, lenses: categories.length };
}

function main() {
  console.log('Stacks audit');
  checkBuildWiring();
  let result = { checked: false, lenses: 0 };
  if (exists(path.join(DIST, 'build-meta.json'))) {
    result = checkStacks(DIST);
  } else {
    warnings.push(`${DIST_LABEL}/build-meta.json missing; build wiring checked only`);
  }

  console.log(`  packaged: ${result.checked ? 'present' : 'not checked'}`);
  console.log(`  content-addressed lenses: ${result.lenses}`);
  console.log(`  warnings: ${warnings.length}`);
  for (const warning of warnings.slice(0, 20)) console.log(`  WARN ${warning}`);
  if (warnings.length > 20) console.log(`  ... ${warnings.length - 20} more warnings omitted`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures.slice(0, 80)) console.log(`  FAIL ${failure}`);
    if (failures.length > 80) console.log(`  ... ${failures.length - 80} more failures omitted`);
    process.exit(1);
  }

  console.log('STACKS CHECKS PASS');
}

main();
