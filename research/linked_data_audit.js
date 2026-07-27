#!/usr/bin/env node
/* Linked-data export audit for Values Commons.

   This checks the generated verdict-card JSON-LD as a corpus-level contract:
   every build-card entity has an entity node, cited band properties preserve
   provenance URLs/dates, each node points back to an ODbL/DCAT-ish lens Dataset,
   and no structural price fields leak into the public linked data.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'app');
const DATA = path.join(APP, 'data');
const CARDS = path.join(APP, 'c');
const ODBL = 'https://opendatacommons.org/licenses/odbl/1-0/';
const BAND_VALUES = new Set(['Strong', 'Good', 'Fair', 'Limited', 'Poor']);
const failures = [];
const warnings = [];

function rel(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/');
}

function safe(value) {
  return String(value || '').replace(/[^a-zA-Z0-9._-]/g, '-');
}

function readJson(abs, label) {
  if (!fs.existsSync(abs)) {
    failures.push(`${label}: missing file`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    failures.push(`${label}: invalid JSON (${err.message})`);
    return null;
  }
}

function jsonLdBlocks(cardFile) {
  if (!fs.existsSync(cardFile)) {
    failures.push(`${rel(cardFile)}: missing verdict-card HTML`);
    return [];
  }
  const text = fs.readFileSync(cardFile, 'utf8');
  const blocks = [];
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of text.matchAll(re)) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch (err) {
      failures.push(`${rel(cardFile)}: invalid JSON-LD (${err.message})`);
    }
  }
  if (!blocks.length) failures.push(`${rel(cardFile)}: missing JSON-LD block`);
  return blocks;
}

function hasSourced(ds) {
  return (ds.products || []).some(p => p.provenance && Object.values(p.provenance).some(v => v && typeof v === 'object' && v.source));
}

function expectedType(ds) {
  const type = ds.meta && ds.meta.type;
  if (type === 'Products') return 'Product';
  if (type === 'Services') return 'Service';
  if (type === 'Organizations') return 'Organization';
  if (type === 'Media') return 'CreativeWork';
  return 'Thing';
}

function hasForbiddenPriceField(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) return obj.some(hasForbiddenPriceField);
  for (const [key, value] of Object.entries(obj)) {
    if (/^(price|lowPrice|highPrice|priceSpecification|priceCurrency|offers)$/i.test(key)) return true;
    if (key === 'propertyID' && /(^|:)price$/i.test(String(value))) return true;
    if (hasForbiddenPriceField(value)) return true;
  }
  return false;
}

function contextHas(context, key) {
  if (!context) return false;
  if (Array.isArray(context)) return context.some(item => contextHas(item, key));
  return typeof context === 'object' && Object.prototype.hasOwnProperty.call(context, key);
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function loadExpectedCards() {
  const datasets = new Map();
  const expected = [];
  for (const name of fs.readdirSync(DATA)) {
    if (!name.endsWith('.json') || name === 'index.json') continue;
    const dataFile = path.join(DATA, name);
    const ds = readJson(dataFile, rel(dataFile));
    if (!ds || !ds.meta || ds.meta.productBase) continue;
    if (!Array.isArray(ds.criteria) || !Array.isArray(ds.products) || !hasSourced(ds)) continue;
    const cid = ds.meta.id || path.basename(name, '.json');
    datasets.set(cid, ds);
    for (const product of ds.products) {
      expected.push({ cid, code: safe(product.code), product, ds });
    }
  }
  return { datasets, expected };
}

function checkDatasetNode(entity, item) {
  const dataset = entity.isBasedOn;
  const cardLabel = `${item.cid}/${item.code}`;
  if (!dataset || typeof dataset !== 'object') {
    failures.push(`${cardLabel}: JSON-LD missing isBasedOn Dataset`);
    return false;
  }
  if (dataset['@type'] !== 'Dataset') failures.push(`${cardLabel}: isBasedOn should be a Dataset`);
  if (!String(dataset['@id'] || '').endsWith(`/data/${item.cid}.json#dataset`)) {
    failures.push(`${cardLabel}: Dataset @id should point at /data/${item.cid}.json#dataset`);
  }
  if (!dataset.name || !dataset.description) failures.push(`${cardLabel}: Dataset missing name or description`);
  if (!String(dataset.description || '').includes('ODbL')) failures.push(`${cardLabel}: Dataset description should name ODbL`);
  if (dataset.license !== ODBL || dataset['dcterms:license'] !== ODBL) {
    failures.push(`${cardLabel}: Dataset should carry ODbL license and dcterms:license`);
  }
  if (!dataset['dcat:distribution'] || !dataset['dcat:distribution'].contentUrl) {
    failures.push(`${cardLabel}: Dataset missing dcat:distribution contentUrl`);
  }
  if (!String(dataset.url || '').startsWith('http') || !String(dataset['dcat:distribution']?.contentUrl || '').startsWith('http')) {
    failures.push(`${cardLabel}: Dataset URLs should be absolute`);
  }
  if (dataset.encodingFormat !== 'application/json') failures.push(`${cardLabel}: Dataset encodingFormat should be application/json`);
  return true;
}

function checkEntity(item) {
  const cardFile = path.join(CARDS, item.cid, `${item.code}.html`);
  const entityId = `ovs:${item.cid}/${item.code}`;
  const blocks = jsonLdBlocks(cardFile);
  const entity = blocks.find(obj => obj && obj['@id'] === entityId);
  if (!entity) {
    failures.push(`${rel(cardFile)}: missing entity JSON-LD @id ${entityId}`);
    return { props: 0, cited: 0, dated: 0, dataset: 0 };
  }

  if (!contextHas(entity['@context'], '@vocab')) failures.push(`${item.cid}/${item.code}: JSON-LD context missing @vocab`);
  if (!contextHas(entity['@context'], 'ovs')) failures.push(`${item.cid}/${item.code}: JSON-LD context missing ovs prefix`);
  if (!contextHas(entity['@context'], 'dcat')) failures.push(`${item.cid}/${item.code}: JSON-LD context missing dcat prefix`);
  if (!contextHas(entity['@context'], 'dcterms')) failures.push(`${item.cid}/${item.code}: JSON-LD context missing dcterms prefix`);

  if (entity['@type'] !== expectedType(item.ds)) {
    failures.push(`${item.cid}/${item.code}: expected @type ${expectedType(item.ds)}, found ${entity['@type'] || '(missing)'}`);
  }
  if (entity.name !== item.product.name) failures.push(`${item.cid}/${item.code}: JSON-LD name should match source entity`);
  if (entity.identifier !== entityId) failures.push(`${item.cid}/${item.code}: identifier should preserve ${entityId}`);
  if (!String(entity.url || '').startsWith('http') || !String(entity.image || '').startsWith('http')) {
    failures.push(`${item.cid}/${item.code}: entity url and image should be absolute`);
  }
  if (entity.license !== ODBL) failures.push(`${item.cid}/${item.code}: entity should carry ODbL license`);
  if (!entity.isPartOf || entity.isPartOf['@type'] !== 'WebApplication') {
    failures.push(`${item.cid}/${item.code}: entity should declare WebApplication parent`);
  }
  const hasDataset = checkDatasetNode(entity, item) ? 1 : 0;
  if (hasForbiddenPriceField(entity)) failures.push(`${item.cid}/${item.code}: JSON-LD must not contain structural price fields`);

  const props = asArray(entity.additionalProperty);
  if (!props.length) failures.push(`${item.cid}/${item.code}: missing additionalProperty band exports`);
  const byKey = new Map();
  for (const prop of props) {
    const key = String(prop.propertyID || '').replace(/^ovs:/, '');
    if (!key) failures.push(`${item.cid}/${item.code}: PropertyValue missing propertyID`);
    if (byKey.has(key)) failures.push(`${item.cid}/${item.code}: duplicate PropertyValue for ${key}`);
    byKey.set(key, prop);
    if (prop['@type'] !== 'PropertyValue') failures.push(`${item.cid}/${item.code}.${key}: should be PropertyValue`);
    if (!BAND_VALUES.has(prop.value)) failures.push(`${item.cid}/${item.code}.${key}: should export a band value, found ${prop.value || '(missing)'}`);
  }

  let cited = 0;
  let dated = 0;
  const citations = new Set(asArray(entity.citation));
  for (const [key, value] of Object.entries(item.product.scores || {})) {
    if (key === 'price' || value == null) continue;
    const prop = byKey.get(key);
    if (!prop) {
      failures.push(`${item.cid}/${item.code}.${key}: missing PropertyValue export`);
      continue;
    }
    const prov = item.product.provenance && item.product.provenance[key];
    if (prov && typeof prov === 'object') {
      if (prov.source) {
        cited += 1;
        if (prop.citation !== prov.source) failures.push(`${item.cid}/${item.code}.${key}: citation URL did not round-trip`);
        if (!citations.has(prov.source)) failures.push(`${item.cid}/${item.code}.${key}: top-level citation list missing source`);
      }
      if (prov.asof) {
        dated += 1;
        if (String(prop.dateModified || '') !== String(prov.asof)) failures.push(`${item.cid}/${item.code}.${key}: asof date did not round-trip`);
      }
      if (prov.note && prop.description !== prov.note) failures.push(`${item.cid}/${item.code}.${key}: provenance note did not round-trip`);
    }
  }

  return { props: props.length, cited, dated, dataset: hasDataset };
}

function main() {
  console.log('Linked-data export audit');
  const manifestFile = path.join(CARDS, '_cards.json');
  const manifest = readJson(manifestFile, rel(manifestFile));
  const { expected } = loadExpectedCards();
  if (!manifest || !Array.isArray(manifest)) {
    failures.push('app/c/_cards.json: expected an array manifest');
  } else {
    const expectedIds = new Set(expected.map(item => `${item.cid}/${item.code}`));
    const manifestIds = new Set(manifest.map(item => `${item.cid}/${item.code}`));
    for (const id of expectedIds) if (!manifestIds.has(id)) failures.push(`app/c/_cards.json: missing expected card ${id}`);
    for (const id of manifestIds) if (!expectedIds.has(id)) warnings.push(`app/c/_cards.json: stale or extra card ${id}`);
  }

  let properties = 0;
  let cited = 0;
  let dated = 0;
  let datasetNodes = 0;
  for (const item of expected) {
    const result = checkEntity(item);
    properties += result.props;
    cited += result.cited;
    dated += result.dated;
    datasetNodes += result.dataset;
  }

  const lensCount = new Set(expected.map(item => item.cid)).size;
  console.log(`  lenses: ${lensCount}`);
  console.log(`  entity cards: ${expected.length}`);
  console.log(`  band properties: ${properties}`);
  console.log(`  cited properties: ${cited}`);
  console.log(`  dated properties: ${dated}`);
  console.log(`  Dataset nodes: ${datasetNodes}`);
  console.log(`  warnings: ${warnings.length}`);
  for (const warning of warnings.slice(0, 20)) console.log(`  WARN ${warning}`);
  if (warnings.length > 20) console.log(`  ... ${warnings.length - 20} more warnings omitted`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures.slice(0, 80)) console.log(`  FAIL ${failure}`);
    if (failures.length > 80) console.log(`  ... ${failures.length - 80} more failures omitted`);
    process.exit(1);
  }

  console.log('LINKED-DATA EXPORT CHECKS PASS');
}

main();
