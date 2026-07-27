#!/usr/bin/env node
/* Open Values Standard v0.1 conformance validator.

   This is a repo-local validator, not a certification authority. It checks the
   practical contract from docs/STANDARD-v0.md: lens shape, criteria integrity,
   sparse scores, provenance preservation, region hygiene, and passport shape.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LENS_DIR = path.join(ROOT, 'content', 'lenses');
const SCHEMA_DIR = path.join(ROOT, 'research', 'schema');
const failures = [];
const warnings = [];

const TYPE_ENUM = new Set(['Products', 'Services', 'Media', 'Organizations', 'Initiatives']);
const TIER_ENUM = new Set(['measured', 'certified', 'assessed']);
const REGION_ENUM = new Set(['US', 'UK', 'EU', 'global']);
const UNIVERSAL_VALUES = new Set(['planet', 'people', 'openness', 'access', 'wellbeing', 'autonomy', 'animals', 'community', 'quality', 'joy']);
const NOTE_OK = new Set(['fees', 'accessibility', 'price', 'economical', 'catalog', 'selection']);
const FORBIDDEN_FIELDS = new Set([
  'sponsored',
  'sponsorship',
  'paidPlacement',
  'paid_placement',
  'paidRank',
  'paid_rank',
  'advertiser',
  'adRank',
  'ad_rank'
]);

function rel(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, '/');
}

function parseJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    failures.push(`${rel(file)}: invalid JSON (${err.message})`);
    return null;
  }
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isNonemptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasYear(value) {
  return /\b(19|20)\d{2}\b/.test(String(value || ''));
}

function isUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function at(file, message) {
  return `${rel(file)}: ${message}`;
}

function pushFailure(file, message) {
  failures.push(at(file, message));
}

function pushWarning(file, message) {
  warnings.push(at(file, message));
}

function checkForbiddenFields(file, value, where = '') {
  if (!isObject(value) && !Array.isArray(value)) return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => checkForbiddenFields(file, item, `${where}[${i}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(key)) pushFailure(file, `${where || 'object'} uses forbidden ranking/capture field ${key}`);
    checkForbiddenFields(file, child, where ? `${where}.${key}` : key);
  }
}

function entityArray(ds) {
  const hasProducts = Array.isArray(ds.products);
  const hasResources = Array.isArray(ds.resources);
  if (hasProducts === hasResources) return { name: '', items: [] };
  return hasProducts ? { name: 'products', items: ds.products } : { name: 'resources', items: ds.resources };
}

function criterionTier(criterion, ds) {
  if (criterion.tier) return criterion.tier;
  return ds.meta && ds.meta.productBase ? 'measured' : 'assessed';
}

function validatePreset(file, ds, criteriaKeys) {
  const presets = ds.meta && ds.meta.presets;
  if (presets == null) return;
  if (!isObject(presets)) {
    pushFailure(file, 'meta.presets must be an object when present');
    return;
  }
  if (!Object.keys(presets).some(name => name.toLowerCase() === 'balanced')) {
    pushWarning(file, 'meta.presets has no Balanced preset');
  }
  for (const [name, preset] of Object.entries(presets)) {
    if (!isObject(preset)) {
      pushFailure(file, `preset ${name} must be an object`);
      continue;
    }
    if (!isObject(preset.w)) {
      pushFailure(file, `preset ${name} missing weight map w`);
      continue;
    }
    for (const [key, value] of Object.entries(preset.w)) {
      if (!criteriaKeys.has(key)) pushFailure(file, `preset ${name} weights undeclared criterion ${key}`);
      if (!Number.isFinite(value) || value < 0 || value > 5) pushFailure(file, `preset ${name}.${key} weight must be 0..5`);
    }
    if (preset.x != null && !Array.isArray(preset.x)) pushFailure(file, `preset ${name}.x must be an array when present`);
  }
}

function validateProvenance(file, ds, entity, key, criterion) {
  const provenance = entity.provenance || {};
  if (!Object.prototype.hasOwnProperty.call(provenance, key)) {
    pushFailure(file, `${entity.code}.${key} has a score without provenance`);
    return;
  }
  const pv = provenance[key];
  if (typeof pv === 'string') {
    if (!pv.trim()) pushFailure(file, `${entity.code}.${key} provenance note is empty`);
    const tier = criterionTier(criterion, ds);
    if (tier === 'assessed' && !NOTE_OK.has(key)) {
      pushWarning(file, `${entity.code}.${key} assessed claim uses legacy plain-string provenance`);
    }
    return;
  }
  if (!isObject(pv)) {
    pushFailure(file, `${entity.code}.${key} provenance must be a string or citation object`);
    return;
  }
  if (!isNonemptyString(pv.note)) pushFailure(file, `${entity.code}.${key} provenance object missing note`);
  if (!isUrl(pv.source)) pushFailure(file, `${entity.code}.${key} provenance object missing http(s) source`);
  if (!hasYear(pv.asof)) pushFailure(file, `${entity.code}.${key} provenance object missing asof year`);
}

function validateEntity(file, ds, entity, index, criteriaByKey, entityCodes, stats) {
  if (!isObject(entity)) {
    pushFailure(file, `entity #${index + 1} must be an object`);
    return;
  }
  if (!isNonemptyString(entity.code)) pushFailure(file, `entity #${index + 1} missing stable code`);
  else if (entityCodes.has(entity.code)) pushFailure(file, `duplicate entity code ${entity.code}`);
  else entityCodes.add(entity.code);

  if (!isNonemptyString(entity.name)) pushFailure(file, `${entity.code || `entity #${index + 1}`} missing display name`);
  if (!isObject(entity.scores)) {
    pushFailure(file, `${entity.code || `entity #${index + 1}`} missing scores object`);
    return;
  }
  if (!isObject(entity.provenance)) pushFailure(file, `${entity.code || `entity #${index + 1}`} missing provenance object`);

  for (const [key, value] of Object.entries(entity.scores)) {
    if (!criteriaByKey.has(key)) {
      pushFailure(file, `${entity.code}.${key} score key is not declared in criteria`);
      continue;
    }
    if (value == null) {
      stats.nullScores += 1;
      continue;
    }
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      pushFailure(file, `${entity.code}.${key} score must be a number from 0 to 100`);
      continue;
    }
    stats.scores += 1;
    validateProvenance(file, ds, entity, key, criteriaByKey.get(key));
  }

  if (entity.region != null) {
    if (!Array.isArray(entity.region)) pushFailure(file, `${entity.code}.region must be an array`);
    else {
      for (const region of entity.region) {
        if (!REGION_ENUM.has(region)) pushFailure(file, `${entity.code}.region uses unsupported value ${region}`);
      }
      if (new Set(entity.region).size !== entity.region.length) pushWarning(file, `${entity.code}.region has duplicate values`);
    }
  }
  if (entity.links != null) {
    if (!Array.isArray(entity.links)) pushFailure(file, `${entity.code}.links must be an array`);
    else {
      entity.links.forEach((link, i) => {
        if (!isObject(link)) pushFailure(file, `${entity.code}.links[${i}] must be an object`);
        else {
          if (!isNonemptyString(link.label)) pushFailure(file, `${entity.code}.links[${i}] missing label`);
          if (!isNonemptyString(link.url)) pushFailure(file, `${entity.code}.links[${i}] missing url`);
        }
      });
    }
  }
  if (entity.focuses != null && !Array.isArray(entity.focuses)) pushFailure(file, `${entity.code}.focuses must be an array`);
  if (entity.allergens != null && !Array.isArray(entity.allergens)) pushFailure(file, `${entity.code}.allergens must be an array`);
  if (entity.allergensDeclared != null && typeof entity.allergensDeclared !== 'boolean') {
    pushFailure(file, `${entity.code}.allergensDeclared must be boolean`);
  }
}

function validateLens(file) {
  const ds = parseJson(file);
  const stats = { lenses: 0, entities: 0, criteria: 0, scores: 0, nullScores: 0 };
  if (!ds) return stats;
  stats.lenses = 1;
  checkForbiddenFields(file, ds);

  if (!isObject(ds.meta)) {
    pushFailure(file, 'missing meta object');
    return stats;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(ds.meta.id || ''))) pushFailure(file, 'meta.id must be stable kebab-case');
  if (!isNonemptyString(ds.meta.label)) pushFailure(file, 'meta.label is required');
  if (!TYPE_ENUM.has(ds.meta.type)) pushFailure(file, `meta.type must be one of ${[...TYPE_ENUM].join(', ')}`);
  if (!isNonemptyString(ds.meta.source)) pushFailure(file, 'meta.source is required');

  if (!Array.isArray(ds.criteria) || !ds.criteria.length) {
    pushFailure(file, 'criteria must be a non-empty array');
    return stats;
  }
  const criteriaByKey = new Map();
  for (const [i, criterion] of ds.criteria.entries()) {
    if (!isObject(criterion)) {
      pushFailure(file, `criteria[${i}] must be an object`);
      continue;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(String(criterion.key || ''))) pushFailure(file, `criteria[${i}] has invalid key`);
    else if (criteriaByKey.has(criterion.key)) pushFailure(file, `duplicate criterion key ${criterion.key}`);
    else criteriaByKey.set(criterion.key, criterion);
    if (!isNonemptyString(criterion.label)) pushFailure(file, `criterion ${criterion.key || i} missing label`);
    if (criterion.tier != null && !TIER_ENUM.has(criterion.tier)) pushFailure(file, `criterion ${criterion.key || i} has unsupported tier ${criterion.tier}`);
    stats.criteria += 1;
  }

  validatePreset(file, ds, new Set(criteriaByKey.keys()));

  const arr = entityArray(ds);
  if (!arr.name) {
    pushFailure(file, 'must contain exactly one entity array: products or resources');
    return stats;
  }
  if (!arr.items.length) pushFailure(file, `${arr.name} must not be empty`);
  const entityCodes = new Set();
  arr.items.forEach((entity, i) => validateEntity(file, ds, entity, i, criteriaByKey, entityCodes, stats));
  stats.entities += arr.items.length;

  return stats;
}

function validatePassportObject(passport, label) {
  if (!isObject(passport)) {
    failures.push(`${label}: passport must be an object`);
    return;
  }
  if (passport.format !== 'open-values-passport') failures.push(`${label}: format must be open-values-passport`);
  if (!/^0\.1/.test(String(passport.version || ''))) failures.push(`${label}: version must start with 0.1`);
  if (!isObject(passport.values) || !Object.keys(passport.values).length) {
    failures.push(`${label}: values must be a non-empty object`);
    return;
  }
  for (const [key, value] of Object.entries(passport.values)) {
    if (!UNIVERSAL_VALUES.has(key)) failures.push(`${label}: unsupported universal value ${key}`);
    if (!Number.isFinite(value) || value < 0 || value > 5) failures.push(`${label}: ${key} weight must be 0..5`);
  }
}

function validateSchemas() {
  for (const name of ['lens.schema.json', 'passport.schema.json']) {
    const file = path.join(SCHEMA_DIR, name);
    const schema = parseJson(file);
    if (!schema) continue;
    if (schema['$schema'] !== 'https://json-schema.org/draft/2020-12/schema') {
      pushFailure(file, 'schema should declare JSON Schema 2020-12');
    }
    if (!isNonemptyString(schema['$id'])) pushFailure(file, 'schema missing $id');
    if (!isNonemptyString(schema.title)) pushFailure(file, 'schema missing title');
  }
}

function lensFilesFromArgs(args) {
  const explicit = args.filter(arg => !arg.startsWith('--'));
  if (explicit.length) return explicit.map(arg => path.resolve(ROOT, arg));
  if (!fs.existsSync(LENS_DIR)) {
    failures.push('content/lenses: missing directory');
    return [];
  }
  return fs.readdirSync(LENS_DIR)
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => path.join(LENS_DIR, name));
}

function main() {
  const args = process.argv.slice(2);
  const passportArgs = args.filter(arg => arg.startsWith('--passport=')).map(arg => arg.slice('--passport='.length));
  const lensArgs = args.filter(arg => !arg.startsWith('--passport='));
  console.log('Open Values Standard conformance');

  validateSchemas();
  const totals = { lenses: 0, entities: 0, criteria: 0, scores: 0, nullScores: 0 };
  for (const file of lensFilesFromArgs(lensArgs)) {
    const stats = validateLens(file);
    totals.lenses += stats.lenses;
    totals.entities += stats.entities;
    totals.criteria += stats.criteria;
    totals.scores += stats.scores;
    totals.nullScores += stats.nullScores;
  }

  validatePassportObject({
    format: 'open-values-passport',
    version: '0.1',
    source: 'validator-smoke',
    values: { planet: 5, openness: 4, access: 3, autonomy: 0 }
  }, 'passport smoke fixture');

  for (const raw of passportArgs) {
    const file = path.resolve(ROOT, raw);
    const passport = parseJson(file);
    if (passport) validatePassportObject(passport, rel(file));
  }

  console.log(`  schemas: 2`);
  console.log(`  lenses: ${totals.lenses}`);
  console.log(`  entities: ${totals.entities}`);
  console.log(`  criteria: ${totals.criteria}`);
  console.log(`  scored claims: ${totals.scores}`);
  console.log(`  null score placeholders: ${totals.nullScores}`);
  console.log(`  warnings: ${warnings.length}`);
  for (const warning of warnings.slice(0, 20)) console.log(`  WARN ${warning}`);
  if (warnings.length > 20) console.log(`  ... ${warnings.length - 20} more warnings`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures.slice(0, 80)) console.log(`  FAIL ${failure}`);
    if (failures.length > 80) console.log(`  ... ${failures.length - 80} more failures`);
    process.exit(1);
  }

  console.log('OVS CONFORMANCE PASS');
  console.log('  compatible with Open Values Standard v0.1');
}

main();
