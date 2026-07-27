#!/usr/bin/env node
/* Cache-busting audit.

   Guards the per-asset hash contract: the app shell should fetch changed
   assets, while prerendered guide pages should only change when their actual
   stylesheet dependency changes.
*/
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'app');
const ASSETS = ['styles.css', 'data.js', 'i18n.js', 'guides.js', 'engine.js', 'decision.js', 'sigil.js', 'lines.js', 'presentation.js', 'app.js'];
const INDEX_REQUIRED = ['styles.css', 'i18n.js', 'guides.js', 'engine.js', 'decision.js', 'sigil.js', 'lines.js', 'presentation.js', 'app.js'];
const failures = [];

function rel(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/');
}

function read(abs) {
  return fs.readFileSync(abs, 'utf8');
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sha8(abs) {
  return crypto.createHash('sha1').update(fs.readFileSync(abs)).digest('hex').slice(0, 8);
}

function assetVersions() {
  const versions = {};
  for (const asset of ASSETS) {
    const abs = path.join(APP, asset);
    expect(fs.existsSync(abs), `${rel(abs)}: missing cache-busted asset`);
    if (fs.existsSync(abs)) versions[asset] = sha8(abs);
  }
  return versions;
}

function refsFor(text, prefix) {
  const assetPattern = ASSETS.map(escapeRegExp).join('|');
  const re = new RegExp(`(?:href|src)=["']${escapeRegExp(prefix)}(${assetPattern})(?:\\?v=([0-9a-f]{8}))?["']`, 'g');
  return [...text.matchAll(re)].map(m => ({ asset: m[1], version: m[2] || '' }));
}

function checkIndex(versions) {
  const indexPath = path.join(APP, 'index.html');
  expect(fs.existsSync(indexPath), 'app/index.html: missing app shell');
  if (!fs.existsSync(indexPath)) return;

  const refs = refsFor(read(indexPath), './');
  const byAsset = new Map();
  for (const ref of refs) {
    if (!byAsset.has(ref.asset)) byAsset.set(ref.asset, []);
    byAsset.get(ref.asset).push(ref.version);
  }

  for (const asset of INDEX_REQUIRED) {
    const seen = byAsset.get(asset) || [];
    expect(seen.length === 1, `app/index.html: expected exactly one ./${asset}?v=... reference, found ${seen.length}`);
    if (seen[0]) {
      expect(seen[0] === versions[asset], `app/index.html: ./${asset} uses v=${seen[0]}, expected ${versions[asset]}`);
    }
  }

  for (const ref of refs) {
    expect(Boolean(ref.version), `app/index.html: ./${ref.asset} should carry an 8-char cache-bust hash`);
    if (ref.version && versions[ref.asset]) {
      expect(ref.version === versions[ref.asset], `app/index.html: ./${ref.asset} uses v=${ref.version}, expected ${versions[ref.asset]}`);
    }
  }
}

function checkGuides(versions) {
  const guideDir = path.join(APP, 'g');
  expect(fs.existsSync(guideDir), 'app/g: missing prerendered guide directory');
  if (!fs.existsSync(guideDir)) return;

  const guideFiles = fs.readdirSync(guideDir).filter(name => name.endsWith('.html')).sort();
  expect(guideFiles.length > 0, 'app/g: expected prerendered guide HTML files');

  for (const file of guideFiles) {
    const guidePath = path.join(guideDir, file);
    const html = read(guidePath);
    const refs = refsFor(html, '../');
    const styleRefs = refs.filter(ref => ref.asset === 'styles.css');
    expect(styleRefs.length === 1, `${rel(guidePath)}: expected exactly one ../styles.css?v=... reference, found ${styleRefs.length}`);
    if (styleRefs[0]) {
      expect(styleRefs[0].version === versions['styles.css'], `${rel(guidePath)}: stylesheet uses v=${styleRefs[0].version || '(missing)'}, expected ${versions['styles.css']}`);
    }

    for (const ref of refs) {
      if (ref.asset !== 'styles.css') {
        failures.push(`${rel(guidePath)}: guide HTML should not depend on ../${ref.asset}?v=...`);
      }
    }
  }
}

function filesUnder(dir, pattern) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(target, pattern));
    else if (entry.isFile() && pattern.test(entry.name)) files.push(target);
  }
  return files;
}

function checkTrackedLineEndings() {
  const files = [...new Set([
    path.join(APP, 'index.html'),
    path.join(APP, 'data.js'),
    path.join(APP, 'guides.js'),
    path.join(APP, 'sitemap.xml'),
    path.join(APP, 'robots.txt'),
    path.join(ROOT, 'content', 'ontology.json'),
    ...filesUnder(path.join(APP, 'data'), /\.json$/),
    ...filesUnder(path.join(APP, 'g'), /\.html$/),
    ...filesUnder(path.join(ROOT, 'content', 'lenses'), /\.json$/),
    ...filesUnder(path.join(ROOT, 'pipeline', 'prices'), /\.json$/),
    ...filesUnder(path.join(ROOT, 'pipeline', 'raw'), /\.jsonl$/),
    ...filesUnder(path.join(ROOT, 'pipeline', 'raw_beauty'), /\.jsonl$/),
    ...filesUnder(path.join(ROOT, 'pipeline', 'raw_safer_choice'), /\.jsonl$/),
  ])];
  for (const file of files) {
    expect(!fs.readFileSync(file).includes(Buffer.from('\r\n')), `${rel(file)}: tracked pipeline text must use LF endings`);
  }
  return files.length;
}

function checkBarcodeSync() {
  const dataDir = path.join(APP, 'data');
  const actual = JSON.parse(read(path.join(dataDir, 'barcodes.json')));
  const catalog = JSON.parse(read(path.join(dataDir, 'index.json')));
  const expected = {};
  let duplicates = 0;

  const categories = [...(catalog.categories || [])].sort((a, b) => a.file.localeCompare(b.file));
  for (const catalogEntry of categories) {
    const file = catalogEntry.file;
    const dataset = JSON.parse(read(path.join(dataDir, file)));
    expect(Array.isArray(dataset.products), `app/data/${file}: catalogue dataset has no products array`);
    expect(dataset.meta?.id === catalogEntry.id, `app/data/${file}: category id does not match app/data/index.json`);
    const category = catalogEntry.id;
    for (const product of dataset.products) {
      const code = String(product?.code || '');
      if (!/^\d{6,14}$/.test(code)) continue;
      if (Object.prototype.hasOwnProperty.call(expected, code)) {
        duplicates += 1;
        continue;
      }
      expected[code] = category;
    }
  }

  const actualKeys = Object.keys(actual);
  const expectedKeys = Object.keys(expected);
  expect(actualKeys.length === expectedKeys.length, `app/data/barcodes.json: ${actualKeys.length} mappings, expected ${expectedKeys.length}`);
  for (const code of expectedKeys) {
    expect(actual[code] === expected[code], `app/data/barcodes.json: ${code} maps to ${actual[code] || '(missing)'}, expected ${expected[code]}`);
  }
  return { mappings: expectedKeys.length, duplicates };
}

function checkSourceWiring() {
  const stampPath = path.join(ROOT, 'pipeline', 'stamp.py');
  const guidesPath = path.join(ROOT, 'pipeline', 'build_guides.py');
  const datasetsPath = path.join(ROOT, 'pipeline', 'build_datasets.py');
  const trackedIoPath = path.join(ROOT, 'pipeline', 'tracked_io.py');
  const cardsPath = path.join(ROOT, 'pipeline', 'build_cards.js');
  const barcodesPath = path.join(ROOT, 'pipeline', 'build_barcodes.py');
  const nodesPath = path.join(ROOT, 'pipeline', 'build_nodes.js');
  const generatedDriftPath = path.join(ROOT, 'scripts', 'check-generated-drift.mjs');
  const stampText = read(stampPath);
  const guidesText = read(guidesPath);
  const datasetsText = read(datasetsPath);
  const trackedIoText = read(trackedIoPath);
  const cardsText = read(cardsPath);
  const barcodesText = read(barcodesPath);
  const nodesText = read(nodesPath);
  const generatedDriftText = read(generatedDriftPath);

  expect(/def asset_versions\(\):/.test(stampText), 'pipeline/stamp.py: should expose per-asset version calculation');
  expect(/def asset_version\(asset, versions=None\):/.test(stampText), 'pipeline/stamp.py: should expose single asset version lookup');
  expect(/versions\.get\(m\.group\(2\), bundle\)/.test(stampText), 'pipeline/stamp.py: stamp() should apply each matched asset hash');
  expect(/style_ver\s*=\s*stamp\.asset_version\(['"]styles\.css['"]\)/.test(guidesText), 'pipeline/build_guides.py: guide pages should use the styles.css hash, not the bundle hash');
  expect(/build_static_pages\(guides,\s*style_ver\)/.test(guidesText), 'pipeline/build_guides.py: build_static_pages should receive style_ver');
  expect(/per-file hashes/.test(datasetsText) && /stamp\.stamp\(\)/.test(datasetsText), 'pipeline/build_datasets.py: dataset build should stamp per-file hashes');
  expect(/def open_text\(path, mode=['"]w['"]\):/.test(trackedIoText) && /newline=['"]\\n['"]/.test(trackedIoText), 'pipeline/tracked_io.py: shared tracked writer should force LF endings');
  expect(/CC_SKIP_GUIDE_IMAGES/.test(guidesText), 'pipeline/build_guides.py: drift mode should be able to skip platform-dependent guide images');
  expect(/CC_SKIP_GUIDE_IMAGES:\s*["']1["']/.test(generatedDriftText), 'scripts/check-generated-drift.mjs: drift audit should suppress platform-dependent guide image writes');
  expect(!/run\(["']node["'],\s*\[["']pipeline\/build_pulse\.js["']\]\)/.test(generatedDriftText), 'scripts/check-generated-drift.mjs: drift audit must not rewrite ignored pulse history');
  expect(/run\(["']node["'],\s*\[["']research\/pulse_audit\.js["'],\s*["']--allow-derived-drift["']\]\)/.test(generatedDriftText), 'scripts/check-generated-drift.mjs: ignored pulse history should still receive its read-only semantic audit');
  expect(/def remove_orphaned_guide_outputs\(gdir, guides\):/.test(guidesText), 'pipeline/build_guides.py: retired guide-directory files should be removed');
  expect(/function removeOrphanedCardOutputs\(manifest\)/.test(cardsText), 'pipeline/build_cards.js: retired verdict-directory files should be removed');
  expect(/compareClosure\(["']guide directory outputs["']/.test(generatedDriftText) && /compareClosure\(["']verdict directory outputs["']/.test(generatedDriftText) && /ignoredNameSnapshot\(\)/.test(generatedDriftText), 'scripts/check-generated-drift.mjs: guide/verdict directories should have exact all-file closure, including ignored images');
  expect(/function inspectGeneratedPng\(file, errors\)/.test(generatedDriftText) && /pngCrc32\(buffer, offset \+ 4, dataEnd\)/.test(generatedDriftText), 'scripts/check-generated-drift.mjs: ignored PNG bytes should still receive structural and CRC validation');
  expect(/TOP_LEVEL_DATA_CONTRACT_FILES\s*=\s*\{/.test(datasetsText) && /expected_data_files\s*=\s*expected_dataset_files\s*\|\s*TOP_LEVEL_DATA_CONTRACT_FILES/.test(datasetsText), 'pipeline/build_datasets.py: app/data top-level JSON should be closed over the category catalogue and named contracts');
  expect(/catalog\s*=\s*json\.load\(open\(os\.path\.join\(DATA,\s*['"]index\.json['"]\)/.test(barcodesText), 'pipeline/build_barcodes.py: barcode inputs should come from the category catalogue');
  expect(/function removeOrphanedNodeOutputs\(manifestIndex\)/.test(nodesText), 'pipeline/build_nodes.js: retired node JSON should be removed from app/data/nodes');
  expect(/compareClosure\(["']node outputs["']/.test(generatedDriftText), 'scripts/check-generated-drift.mjs: node filenames should have exact manifest closure');
  expect(/compareClosure\(["']top-level data outputs["']/.test(generatedDriftText), 'scripts/check-generated-drift.mjs: top-level data filenames should have exact catalogue-and-contract closure');
  expect(/function assertBuildGraphParity\(\)/.test(generatedDriftText) && /const buildGraph = assertBuildGraphParity\(\)/.test(generatedDriftText), 'scripts/check-generated-drift.mjs: drift producers should fail closed against the canonical build graph');
  expect(/step === pulseBuild \? pulseAudit : step/.test(generatedDriftText) && /step !== siteBuild/.test(generatedDriftText), 'scripts/check-generated-drift.mjs: graph parity should preserve the read-only pulse substitution and site-build boundary');

  const trackedWriters = [
    'add_economical.py', 'build_barcodes.py', 'build_datasets.py', 'build_guides.py',
    'enrich_lenses.py', 'fetch_beauty.py', 'fetch_prices.py', 'fetch_raw.py',
    'fetch_safer_choice.py', 'ingest_dump.py', 'mature_ontology.py', 'stamp.py',
  ];
  for (const file of trackedWriters) {
    const source = read(path.join(ROOT, 'pipeline', file));
    expect(/from tracked_io import /.test(source), `pipeline/${file}: tracked writes should use tracked_io`);
    expect(!/open\([^\n]*,\s*['"]w['"]/.test(source), `pipeline/${file}: direct platform-dependent text writer remains`);
  }
}

function main() {
  console.log('Cache-bust audit');
  const versions = assetVersions();
  checkIndex(versions);
  checkGuides(versions);
  const trackedTextCount = checkTrackedLineEndings();
  const barcodeSync = checkBarcodeSync();
  checkSourceWiring();

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log(`  app assets checked: ${Object.keys(versions).length}`);
  console.log(`  guide pages checked: ${fs.readdirSync(path.join(APP, 'g')).filter(name => name.endsWith('.html')).length}`);
  console.log(`  LF-stable tracked text files: ${trackedTextCount}`);
  console.log(`  barcode mappings checked: ${barcodeSync.mappings} (${barcodeSync.duplicates} duplicate rows kept first)`);
  console.log('CACHE-BUST CHECKS PASS');
}

main();
