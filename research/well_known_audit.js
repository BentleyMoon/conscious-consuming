#!/usr/bin/env node
/* Well-known discovery audit for Values Commons.

   The Well-Known Door is the static protocol discovery file:
   /.well-known/open-values.json. It lets another site or tool discover the
   published Open Values lenses, verify their hashes, and find the standard
   without asking a central registry.
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

function provenanceYears(ds) {
  const years = [];
  for (const product of ds.products || []) {
    const provenance = product.provenance || {};
    if (!provenance || typeof provenance !== 'object') continue;
    for (const value of Object.values(provenance)) {
      if (value && typeof value === 'object' && value.asof) {
        const match = String(value.asof).match(/^(\d{4})/);
        if (match) years.push(Number(match[1]));
      }
    }
  }
  return years;
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function byId(items) {
  return new Map((items || []).map(item => [item.id, item]));
}

function checkBuildWiring() {
  const buildSite = read(path.join(ROOT, 'pipeline', 'build_site.py'));
  for (const needle of [
    '.well-known',
    'open-values.json',
    'open-values-door',
    'sha256',
    'ODBL_LICENSE',
    '_build_well_known_manifest'
  ]) {
    expect(buildSite.includes(needle), `pipeline/build_site.py: missing Well-Known Door wiring ${needle}`);
  }
}

function checkManifest(root) {
  const meta = readJson(path.join(root, 'build-meta.json'), `${rel(root)}/build-meta.json`);
  if (!meta) return { checked: false, lensCount: 0 };
  const dataRoot = path.join(root, 'app', 'data');
  const index = readJson(path.join(dataRoot, 'index.json'), `${rel(dataRoot)}/index.json`);
  const doorPath = path.join(root, '.well-known', 'open-values.json');
  const door = readJson(doorPath, rel(doorPath));
  if (!index || !door) return { checked: false, lensCount: 0 };

  const origin = siteOrigin(meta.siteBase);
  const lenses = byId(door.lenses);
  const categories = index.categories || [];

  expect(door.format === 'open-values-door', `${rel(doorPath)}: format should be open-values-door`);
  expect(door.version === '0.1', `${rel(doorPath)}: version should be 0.1`);
  expect(door.generatedAt === meta.generatedAt, `${rel(doorPath)}: generatedAt should match build-meta`);
  expect(door.self === `${origin}/.well-known/open-values.json`, `${rel(doorPath)}: self should match package origin`);
  expect(door.publisher && door.publisher.name === 'Values Commons', `${rel(doorPath)}: publisher should be Values Commons`);
  expect(door.standard && door.standard.name === 'Open Values Standard', `${rel(doorPath)}: standard should name Open Values Standard`);
  expect(door.standard && door.standard.version === '0.1', `${rel(doorPath)}: standard version should be 0.1`);
  expect(door.instance && door.instance.name === 'Conscious Consuming', `${rel(doorPath)}: instance should name Conscious Consuming`);
  expect(door.instance && door.instance.index === `${meta.siteBase}/data/index.json`, `${rel(doorPath)}: instance.index should match siteBase`);
  expect(door.licenses && door.licenses.data === ODBL, `${rel(doorPath)}: data license should be ODbL`);
  expect(door.privacy && door.privacy.accounts === false, `${rel(doorPath)}: privacy.accounts should be false`);
  expect(door.privacy && door.privacy.tracking === false, `${rel(doorPath)}: privacy.tracking should be false`);
  expect(door.privacy && door.privacy.payToRank === false, `${rel(doorPath)}: privacy.payToRank should be false`);
  expect(door.trustArtifacts && door.trustArtifacts.fundingLedger === `${origin}/funding-ledger.json`, `${rel(doorPath)}: funding ledger URL should match origin`);
  expect(door.trustArtifacts && door.trustArtifacts.citationBundles === `${origin}/citation-bundles/`, `${rel(doorPath)}: citation bundle URL should match origin`);
  expect(door.stacks && door.stacks.index === `${origin}/stacks/index.json`, `${rel(doorPath)}: stacks.index should match origin`);
  expect(door.stacks && door.stacks.pattern === `${origin}/stacks/lens/{id}/{sha256}.json`, `${rel(doorPath)}: stacks.pattern should be content-addressed`);
  expect(door.stacks && door.stacks.hash === 'sha256', `${rel(doorPath)}: stacks.hash should be sha256`);
  expect(Array.isArray(door.lenses), `${rel(doorPath)}: lenses should be an array`);
  expect(lenses.size === categories.length, `${rel(doorPath)}: expected ${categories.length} lenses, found ${lenses.size}`);

  for (const category of categories) {
    const lens = lenses.get(category.id);
    const dataFile = path.join(dataRoot, category.file || `${category.id}.json`);
    const ds = readJson(dataFile, rel(dataFile));
    if (!lens || !ds) {
      failures.push(`${rel(doorPath)}: missing lens ${category.id}`);
      continue;
    }
    const hash = sha256File(dataFile);
    const years = provenanceYears(ds);
    const criteria = (category.criteria || ds.criteria || []).map(c => c.key).filter(Boolean);

    expect(lens.title === category.label, `${category.id}: title should match app/data/index.json`);
    expect(lens.entries === category.n, `${category.id}: entries should match app/data/index.json`);
    expect(lens.type === category.type, `${category.id}: type should match app/data/index.json`);
    expect(lens.domain === category.domain, `${category.id}: domain should match app/data/index.json`);
    expect(lens.data === `${meta.siteBase}/data/${category.file}`, `${category.id}: data URL should match siteBase`);
    expect(lens.url === `${meta.siteBase}/#explore/${category.id}`, `${category.id}: route URL should match hash route`);
    expect(lens.sha256 === hash, `${category.id}: sha256 should match packaged JSON`);
    expect(lens.integrity === `sha256-${hash}`, `${category.id}: integrity should match sha256`);
    expect(lens.stack === `${origin}/stacks/lens/${category.id}/${hash}.json`, `${category.id}: stack URL should match content-addressed path`);
    expect(lens.license === ODBL, `${category.id}: license should be ODbL`);
    expect(Array.isArray(lens.criteria) && lens.criteria.join('|') === criteria.join('|'), `${category.id}: criteria keys should match index`);
    expect(Boolean(lens.source), `${category.id}: source should be present`);
    expect(Boolean(lens.attribution), `${category.id}: attribution should be present`);
    if (years.length) {
      const oldest = String(Math.min(...years));
      const newest = String(Math.max(...years));
      expect(lens.asof === newest, `${category.id}: asof should be newest provenance year`);
      expect(lens.sourceAsOf && lens.sourceAsOf.oldest === oldest, `${category.id}: sourceAsOf.oldest should be ${oldest}`);
      expect(lens.sourceAsOf && lens.sourceAsOf.newest === newest, `${category.id}: sourceAsOf.newest should be ${newest}`);
    } else {
      warnings.push(`${category.id}: no provenance years available for Well-Known Door asof`);
    }
  }

  return { checked: true, lensCount: categories.length };
}

function main() {
  console.log('Well-Known Door audit');
  checkBuildWiring();
  let result = { checked: false, lensCount: 0 };
  if (exists(path.join(DIST, 'build-meta.json'))) {
    result = checkManifest(DIST);
  } else {
    warnings.push(`${DIST_LABEL}/build-meta.json missing; build wiring checked only`);
  }

  console.log(`  packaged: ${result.checked ? 'present' : 'not checked'}`);
  console.log(`  lenses: ${result.lensCount}`);
  console.log(`  warnings: ${warnings.length}`);
  for (const warning of warnings.slice(0, 20)) console.log(`  WARN ${warning}`);
  if (warnings.length > 20) console.log(`  ... ${warnings.length - 20} more warnings omitted`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures.slice(0, 80)) console.log(`  FAIL ${failure}`);
    if (failures.length > 80) console.log(`  ... ${failures.length - 80} more failures omitted`);
    process.exit(1);
  }

  console.log('WELL-KNOWN DOOR CHECKS PASS');
}

main();
