#!/usr/bin/env node
/* Open Values Standard v1 audit skeleton.

   This is the registry-first conformance wrapper from C12. It deliberately
   starts small: validate the standard registry surface, make sure every
   explicit open-values/ovs format in the repo is registered, and run the
   known-good/known-bad conformance vectors for the base data-model formats.
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STANDARD_DIR = path.join(ROOT, 'app', 'data', 'standard');
const SCHEMA_DIR = path.join(STANDARD_DIR, 'schemas');
const REGISTRY = path.join(STANDARD_DIR, 'registry.json');
const VECTORS = path.join(STANDARD_DIR, 'conformance-vectors.json');
const failures = [];
const warnings = [];

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const FORMAT_ID = /^(open-values|ovs)-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CRITERION_KEY = /^[a-z][a-z0-9_]*$/;
const ENTITY_CODE = /^[A-Za-z0-9._:-]+(?:-[A-Za-z0-9._:-]+)*$/;
const YEAR = /(19|20)\d{2}/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const URL = /^https?:\/\//i;
const SHA256 = /^[0-9a-f]{64}$/;
const SHORT_HASH = /^[0-9a-f]{8}$/;
const OVS_NODE_ID = /^ovs:[a-z0-9-]+\/[A-Za-z0-9._:-]+(?:-[A-Za-z0-9._:-]+)*$/;
const OVS_ANY_ID = /^ovs:[a-z0-9-]+\/[A-Za-z0-9._:/%-]+$/;
const ROUTE_HASH = /^#/;
const TYPE_ENUM = new Set(['Products', 'Services', 'Media', 'Organizations', 'Initiatives']);
const NEED_ENUM = new Set(['nourish', 'care', 'keep-a-home', 'connect', 'move', 'learn', 'give-and-act', 'protect']);
const TIER_ENUM = new Set(['measured', 'certified', 'assessed']);
const STATUS_ENUM = new Set(['stable', 'draft', 'experimental', 'dev-contract', 'legacy']);
const KIND_ENUM = new Set(['source', 'generated', 'fixture', 'distribution', 'internal']);
const MARKER_MODE_ENUM = new Set(['explicit-format', 'legacy-shape', 'schema', 'html-jsonld', 'test-fixture']);
const OWNER_ENUM = new Set(['codex-data', 'claude-app', 'generated', 'external', 'shared']);
const LINE_KIND_ENUM = new Set(['allergy', 'diet', 'require', 'avoid', 'cap', 'lean']);
const TAG_KIND_ENUM = new Set(['property', 'certification', 'topic']);
const PICK_ENUM = new Set(['one', 'several']);
const PULSE_KIND_ENUM = new Set(['added', 'corrected', 'contested', 'stale']);
const DECISION_AXIS_KIND_ENUM = new Set(['criterion', 'tradeoff', 'cost-values']);
const DECISION_BUDGET_MODE_ENUM = new Set(['none', 'observed-price-rank', 'assessed-fees-rank', 'assessed-affordability-rank']);
const DECISION_ARCHETYPE_ENUM = new Set(['best-for-most', 'strictest-match', 'budget-honest']);
const UNIVERSAL_VALUES = new Set(['planet', 'people', 'openness', 'access', 'wellbeing', 'autonomy', 'animals', 'community', 'quality', 'joy']);
const REGIONS = new Set(['US', 'UK', 'EU', 'global']);
const REGION_FILTERS = new Set(['everywhere', 'US', 'EU', 'UK']);
const H1_PAYMENT_REGION_LIMITATION_CODES = new Set([
  'upi',
  'pix',
  'mpesa',
  'interac-etransfer',
  'payid-osko',
  'paynow',
  'promptpay',
  'duitnow',
  'twint',
  'paytm',
  'phonepe',
  'mercado-pago',
  'mtn-momo',
  'airtel-money',
  'wave-mobile-money'
]);
const BARE_VERSION = /^\d+\.\d+$/;

function rel(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/');
}

function readJson(abs, label = rel(abs)) {
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

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validWeight(value) {
  return Number.isFinite(value) && value >= 0 && value <= 5;
}

function validScore(value) {
  return value === null || (Number.isFinite(value) && value >= 0 && value <= 100);
}

function push(list, condition, message) {
  if (!condition) list.push(message);
}

function validateSource(value, label = 'source') {
  const errors = [];
  if (typeof value === 'string') {
    push(errors, value.trim().length > 0, `${label}: legacy string source must not be empty`);
    return errors;
  }
  if (!isObject(value)) return [`${label}: must be a string note or citation object`];
  push(errors, isString(value.note), `${label}: citation missing note`);
  push(errors, isString(value.source) && URL.test(value.source), `${label}: citation missing http(s) source`);
  push(errors, isString(value.asof) && YEAR.test(value.asof), `${label}: citation missing asof year`);
  if (value.accessed != null) push(errors, isString(value.accessed) && DATE.test(value.accessed), `${label}: accessed must be YYYY-MM-DD`);
  return errors;
}

function validateChallengeRead(value, label) {
  const errors = [];
  push(errors, isString(value), `${label}: missing reads sentence`);
  if (isString(value)) {
    push(errors, value.startsWith('The strongest case the other way: '), `${label}: must use fair-opponent framing`);
    push(errors, value.length <= 140, `${label}: must be 140 characters or less`);
  }
  return errors;
}

function validateActPath(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing actPath object`];
  push(errors, value.kind === 'url' || value.kind === 'plain', `${label}.kind: must be url or plain`);
  push(errors, isString(value.label), `${label}.label: missing label`);
  if (value.kind === 'url') push(errors, isString(value.url) && URL.test(value.url), `${label}.url: missing http(s) url`);
  if (value.kind === 'plain') push(errors, isString(value.instruction), `${label}.instruction: missing instruction`);
  return errors;
}

function validateLegitimacy(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing legitimacy object`];
  push(errors, isString(value.line), `${label}.line: missing line`);
  errors.push(...validateSource(value.source, `${label}.source`));
  return errors;
}

function validateCriterion(value, label = 'criterion') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, CRITERION_KEY.test(String(value.key || '')), `${label}: invalid key`);
  push(errors, isString(value.label), `${label}: missing label`);
  if (value.tier != null) push(errors, TIER_ENUM.has(value.tier), `${label}: unknown tier ${value.tier}`);
  return errors;
}

function validateRating(value, label = 'rating') {
  const errors = [];
  if (typeof value === 'number' || value === null) {
    push(errors, validScore(value), `${label}: score must be 0..100 or null`);
    return errors;
  }
  if (!isObject(value)) return [`${label}: must be a score value or rating object`];
  push(errors, CRITERION_KEY.test(String(value.key || '')), `${label}: invalid key`);
  push(errors, Object.prototype.hasOwnProperty.call(value, 'value'), `${label}: missing value`);
  if (Object.prototype.hasOwnProperty.call(value, 'value')) {
    push(errors, validScore(value.value), `${label}: value must be 0..100 or null`);
  }
  if (value.provenance != null) errors.push(...validateSource(value.provenance, `${label}.provenance`));
  return errors;
}

function validateScoreMap(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: scores must be an object`];
  for (const [key, score] of Object.entries(value)) {
    push(errors, CRITERION_KEY.test(key), `${label}.${key}: invalid score key`);
    push(errors, validScore(score), `${label}.${key}: score must be 0..100 or null`);
  }
  return errors;
}

function validateEntity(value, label = 'entity') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, ENTITY_CODE.test(String(value.code || '')), `${label}: invalid or missing code`);
  push(errors, isString(value.name), `${label}: missing name`);
  errors.push(...validateScoreMap(value.scores, `${label}.scores`));
  if (value.provenance != null) {
    if (!isObject(value.provenance)) errors.push(`${label}.provenance: must be an object`);
    else {
      for (const [key, source] of Object.entries(value.provenance)) {
        push(errors, CRITERION_KEY.test(key), `${label}.provenance.${key}: invalid provenance key`);
        errors.push(...validateSource(source, `${label}.provenance.${key}`));
      }
    }
  }
  if (value.links != null) {
    if (!Array.isArray(value.links)) errors.push(`${label}.links: must be an array`);
    else value.links.forEach((link, i) => {
      if (!isObject(link)) errors.push(`${label}.links[${i}]: must be an object`);
      else {
        push(errors, isString(link.label), `${label}.links[${i}]: missing label`);
        push(errors, isString(link.url), `${label}.links[${i}]: missing url`);
      }
    });
  }
  if (value.region != null) {
    if (!Array.isArray(value.region)) errors.push(`${label}.region: must be an array`);
    else {
      for (const region of value.region) push(errors, REGIONS.has(region), `${label}.region: unknown region ${region}`);
      push(errors, new Set(value.region).size === value.region.length, `${label}.region: duplicate region`);
    }
  }
  if (value.focuses != null) push(errors, Array.isArray(value.focuses), `${label}.focuses: must be an array`);
  if (value.allergens != null) push(errors, Array.isArray(value.allergens), `${label}.allergens: must be an array`);
  if (value.allergensDeclared != null) push(errors, typeof value.allergensDeclared === 'boolean', `${label}.allergensDeclared: must be boolean`);
  return errors;
}

function entityArray(lens) {
  const hasProducts = Array.isArray(lens.products);
  const hasResources = Array.isArray(lens.resources);
  if (hasProducts === hasResources) return null;
  return hasProducts ? { name: 'products', items: lens.products } : { name: 'resources', items: lens.resources };
}

function validateDecisionConsumer(value, label = 'decision.consumer') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  for (const key of ['reads', 'axes', 'budget', 'archetypes', 'page']) {
    push(errors, isString(value[key]), `${label}.${key}: missing named consumer`);
  }
  return errors;
}

function validateDecision(value, label = 'decision') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, KEBAB.test(String(value.category || '')), `${label}.category: invalid category id`);
  if (value.consumer != null) errors.push(...validateDecisionConsumer(value.consumer, `${label}.consumer`));

  const reads = value.reads || {};
  push(errors, isObject(reads), `${label}.reads: missing object`);
  if (isObject(reads)) {
    push(errors, isString(reads.text) && reads.text.length <= 140, `${label}.reads.text: missing or over 140 characters`);
    if (isString(reads.text)) {
      push(errors, reads.text.trim().split(/\s+/).length <= 24, `${label}.reads.text: exceeds 24-word voice bar`);
      push(errors, !/[!—]/.test(reads.text), `${label}.reads.text: shouting or em dash`);
      push(errors, !/\b(?:your values|how much (?:do )?you care|ethical(?:ly)?|perfect|obviously|simply)\b/i.test(reads.text), `${label}.reads.text: identity-performance or overclaiming language`);
      push(errors, !/\b\d+[,.]?\d*\s+(?:products?|options?|items?)\b/i.test(reads.text), `${label}.reads.text: bare warehouse count`);
    }
    if (!Array.isArray(reads.basis) || reads.basis.length < 2 || reads.basis.length > 5) errors.push(`${label}.reads.basis: expected 2-5 rows`);
    else {
      const basisKeys = new Set();
      reads.basis.forEach((basis, i) => {
        const at = `${label}.reads.basis[${i}]`;
        push(errors, isObject(basis), `${at}: must be object`);
        if (!isObject(basis)) return;
        push(errors, CRITERION_KEY.test(String(basis.criterion || '')), `${at}.criterion: invalid key`);
        if (basisKeys.has(basis.criterion)) errors.push(`${at}.criterion: duplicate ${basis.criterion}`);
        basisKeys.add(basis.criterion);
        push(errors, isString(basis.readsAs), `${at}.readsAs: missing phrase`);
      });
    }
    const signature = reads.signature || {};
    push(errors, isObject(signature), `${label}.reads.signature: missing object`);
    if (isObject(signature)) {
      push(errors, isString(signature.by), `${label}.reads.signature.by: missing signer`);
      push(errors, DATE.test(String(signature.on || '')), `${label}.reads.signature.on: expected YYYY-MM-DD`);
      push(errors, signature.status === 'pilot' || signature.status === 'approved-batch', `${label}.reads.signature.status: expected pilot or approved batch`);
    }
    if (reads.receipt != null) {
      const receipt = reads.receipt;
      push(errors, isObject(receipt), `${label}.reads.receipt: must be object`);
      if (isObject(receipt)) {
        push(errors, KEBAB.test(String(receipt.dataset || '')), `${label}.reads.receipt.dataset: invalid id`);
        push(errors, Number.isInteger(receipt.entryCount) && receipt.entryCount >= 1, `${label}.reads.receipt.entryCount: invalid count`);
        if (!Array.isArray(receipt.criteria) || receipt.criteria.length < 2) errors.push(`${label}.reads.receipt.criteria: missing spread rows`);
        else receipt.criteria.forEach((spread, i) => {
          const at = `${label}.reads.receipt.criteria[${i}]`;
          push(errors, isObject(spread), `${at}: must be object`);
          if (!isObject(spread)) return;
          push(errors, CRITERION_KEY.test(String(spread.criterion || '')), `${at}.criterion: invalid key`);
          push(errors, isString(spread.readsAs), `${at}.readsAs: missing phrase`);
          push(errors, Number.isInteger(spread.known) && spread.known >= 1, `${at}.known: invalid count`);
          push(errors, Number.isFinite(spread.minimum) && spread.minimum >= 0 && spread.minimum <= 100, `${at}.minimum: invalid score`);
          push(errors, Number.isFinite(spread.maximum) && spread.maximum >= 0 && spread.maximum <= 100, `${at}.maximum: invalid score`);
          push(errors, Number.isFinite(spread.spread) && spread.spread > 0 && spread.spread <= 100, `${at}.spread: must be positive`);
        });
      }
    }
  }

  if (!Array.isArray(value.axes) || value.axes.length < 1 || value.axes.length > 3) errors.push(`${label}.axes: expected 1-3 rows`);
  else {
    const ids = new Set();
    value.axes.forEach((axis, i) => {
      const at = `${label}.axes[${i}]`;
      push(errors, isObject(axis), `${at}: must be object`);
      if (!isObject(axis)) return;
      push(errors, KEBAB.test(String(axis.id || '')), `${at}.id: invalid id`);
      if (ids.has(axis.id)) errors.push(`${at}.id: duplicate ${axis.id}`);
      ids.add(axis.id);
      push(errors, DECISION_AXIS_KIND_ENUM.has(axis.kind), `${at}.kind: unknown kind`);
      push(errors, isString(axis.label), `${at}.label: missing label`);
      push(errors, isString(axis.question) && axis.question.length <= 80, `${at}.question: missing or too long`);
      const criteria = Array.isArray(axis.criteria) ? axis.criteria : [];
      const expectedCriteria = axis.kind === 'tradeoff' ? criteria.length === 2 : (axis.kind === 'cost-values' ? criteria.length >= 2 : criteria.length === 1);
      push(errors, expectedCriteria, `${at}.criteria: wrong number of keys`);
      criteria.forEach((key, k) => push(errors, CRITERION_KEY.test(String(key || '')), `${at}.criteria[${k}]: invalid key`));
      push(errors, Array.isArray(axis.poles) && axis.poles.length === 2 && axis.poles.every(isString), `${at}.poles: expected two labels`);
      push(errors, Number.isInteger(axis.default) && axis.default >= 0 && axis.default <= 100, `${at}.default: expected 0-100 integer`);
    });
  }

  if (value.evidenceLimits != null) {
    const limits = value.evidenceLimits;
    push(errors, isObject(limits), `${label}.evidenceLimits: must be object`);
    if (isObject(limits)) {
      push(errors, limits.state === 'partial', `${label}.evidenceLimits.state: expected partial`);
      push(errors, Array.isArray(limits.scoredCriteria) && limits.scoredCriteria.length >= 1, `${label}.evidenceLimits.scoredCriteria: missing criteria`);
      if (Array.isArray(limits.scoredCriteria)) {
        limits.scoredCriteria.forEach((criterion, i) => push(errors, CRITERION_KEY.test(String(criterion || '')), `${label}.evidenceLimits.scoredCriteria[${i}]: invalid key`));
      }
      push(errors, Array.isArray(limits.unscoredTopics) && limits.unscoredTopics.length >= 1 && limits.unscoredTopics.every(isString), `${label}.evidenceLimits.unscoredTopics: missing topics`);
      push(errors, isString(limits.summary), `${label}.evidenceLimits.summary: missing summary`);
      push(errors, isString(limits.detail), `${label}.evidenceLimits.detail: missing detail`);
      const receipt = limits.receipt || {};
      push(errors, isObject(receipt), `${label}.evidenceLimits.receipt: missing object`);
      if (isObject(receipt)) {
        push(errors, isString(receipt.source), `${label}.evidenceLimits.receipt.source: missing source`);
        push(errors, /^20\d{2}$/.test(String(receipt.asOf || '')), `${label}.evidenceLimits.receipt.asOf: expected year`);
        push(errors, Number.isInteger(receipt.entryCount) && receipt.entryCount >= 1, `${label}.evidenceLimits.receipt.entryCount: invalid count`);
        push(errors, isString(receipt.missingRule), `${label}.evidenceLimits.receipt.missingRule: missing rule`);
        push(errors, isObject(receipt.criteria), `${label}.evidenceLimits.receipt.criteria: missing object`);
        if (isObject(receipt.criteria) && Array.isArray(limits.scoredCriteria)) {
          for (const criterion of limits.scoredCriteria) {
            const row = receipt.criteria[criterion] || {};
            const at = `${label}.evidenceLimits.receipt.criteria.${criterion}`;
            push(errors, isObject(row), `${at}: missing object`);
            push(errors, Number.isInteger(row.known) && row.known >= 1, `${at}.known: invalid count`);
            push(errors, Number.isInteger(row.positive) && row.positive >= 0 && row.positive <= row.known, `${at}.positive: invalid count`);
            push(errors, Number.isFinite(row.knownCoverage) && row.knownCoverage > 0 && row.knownCoverage <= 1, `${at}.knownCoverage: invalid share`);
            push(errors, Number.isFinite(row.positiveCoverage) && row.positiveCoverage >= 0 && row.positiveCoverage <= 1, `${at}.positiveCoverage: invalid share`);
          }
        }
      }
    }
  }

  const budget = value.budget || {};
  push(errors, isObject(budget), `${label}.budget: missing object`);
  if (isObject(budget)) {
    push(errors, typeof budget.available === 'boolean', `${label}.budget.available: must be boolean`);
    push(errors, DECISION_BUDGET_MODE_ENUM.has(budget.mode), `${label}.budget.mode: unknown mode`);
    if (budget.available) {
      push(errors, budget.mode !== 'none', `${label}.budget.mode: available budget cannot use none`);
      push(errors, CRITERION_KEY.test(String(budget.criterion || '')), `${label}.budget.criterion: invalid key`);
      push(errors, Number.isInteger(budget.minimumKnown) && budget.minimumKnown >= 1, `${label}.budget.minimumKnown: invalid count`);
    } else push(errors, budget.mode === 'none', `${label}.budget.mode: unavailable budget must use none`);
    if (budget.knownEntries != null) push(errors, Number.isInteger(budget.knownEntries) && budget.knownEntries >= 0, `${label}.budget.knownEntries: invalid count`);
    if (budget.coverage != null) push(errors, Number.isFinite(budget.coverage) && budget.coverage >= 0 && budget.coverage <= 1, `${label}.budget.coverage: invalid share`);
  }

  if (!Array.isArray(value.archetypes) || value.archetypes.length < 2 || value.archetypes.length > 3) errors.push(`${label}.archetypes: expected 2-3 slots`);
  else {
    const slots = new Set(value.archetypes);
    push(errors, slots.size === value.archetypes.length, `${label}.archetypes: duplicate slot`);
    value.archetypes.forEach((slot, i) => push(errors, DECISION_ARCHETYPE_ENUM.has(slot), `${label}.archetypes[${i}]: unknown slot`));
    push(errors, slots.has('best-for-most') && slots.has('strictest-match'), `${label}.archetypes: missing required slot`);
    if (budget.available) push(errors, slots.has('budget-honest'), `${label}.archetypes: budget data requires budget-honest`);
    else push(errors, !slots.has('budget-honest'), `${label}.archetypes: budget-honest requires budget data`);
  }

  const page = value.page || {};
  push(errors, isObject(page), `${label}.page: missing object`);
  if (isObject(page)) {
    push(errors, page.stage === 'founder-review' || page.stage === 'approved-pilot' || page.stage === 'approved-batch' || page.stage === 'contract-preview', `${label}.page.stage: unknown stage`);
    push(errors, typeof page.primaryRoute === 'boolean', `${label}.page.primaryRoute: must be boolean`);
    if (page.primaryRoute) push(errors, page.stage === 'founder-review' || page.stage === 'approved-pilot' || page.stage === 'approved-batch', `${label}.page: primary route must be in review or approved`);
    else push(errors, page.stage === 'contract-preview', `${label}.page: non-primary pilot must remain contract preview`);
  }
  return errors;
}

function validateDecisionContracts(value, label = 'decision-contracts') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-decision-contracts', `${label}: wrong format`);
  push(errors, /^0\.2\.0(?:[-+].*)?$/.test(String(value.version || '')), `${label}.version: expected 0.2.0 semver`);
  push(errors, DATE.test(String(value.published || '')), `${label}.published: expected YYYY-MM-DD`);
  push(errors, value.status === 'founder-signoff-pending' || value.status === 'founder-approved', `${label}.status: unknown founder-review state`);
  if (value.status === 'founder-approved') {
    push(errors, isObject(value.approval), `${label}.approval: required after founder approval`);
    if (isObject(value.approval)) {
      push(errors, DATE.test(String(value.approval.on || '')), `${label}.approval.on: expected YYYY-MM-DD`);
      push(errors, isString(value.approval.scope), `${label}.approval.scope: missing scope`);
      push(errors, isString(value.approval.signal), `${label}.approval.signal: missing signal`);
    }
  }
  errors.push(...validateDecisionConsumer(value.consumer, `${label}.consumer`));
  if (!Array.isArray(value.contracts) || !value.contracts.length) errors.push(`${label}.contracts: missing non-empty array`);
  else {
    const categories = new Set();
    value.contracts.forEach((decision, i) => {
      errors.push(...validateDecision(decision, `${label}.contracts[${i}]`));
      if (decision && categories.has(decision.category)) errors.push(`${label}.contracts[${i}].category: duplicate ${decision.category}`);
      if (decision) categories.add(decision.category);
    });
  }
  return errors;
}

function validateLens(value, label = 'lens') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  if (!isObject(value.meta)) errors.push(`${label}.meta: missing object`);
  else {
    push(errors, KEBAB.test(String(value.meta.id || '')), `${label}.meta.id: invalid or missing id`);
    push(errors, isString(value.meta.label), `${label}.meta.label: missing label`);
    push(errors, TYPE_ENUM.has(value.meta.type), `${label}.meta.type: unknown type ${value.meta.type || '(missing)'}`);
    push(errors, isString(value.meta.source), `${label}.meta.source: missing source`);
    if (value.meta.presets != null && !isObject(value.meta.presets)) errors.push(`${label}.meta.presets: must be an object`);
    if (value.meta.decision != null) errors.push(...validateDecision(value.meta.decision, `${label}.meta.decision`));
  }
  if (!Array.isArray(value.criteria) || !value.criteria.length) errors.push(`${label}.criteria: missing non-empty array`);
  const criterionKeys = new Set();
  if (Array.isArray(value.criteria)) {
    value.criteria.forEach((criterion, i) => {
      const before = errors.length;
      errors.push(...validateCriterion(criterion, `${label}.criteria[${i}]`));
      if (errors.length === before && criterionKeys.has(criterion.key)) errors.push(`${label}.criteria[${i}]: duplicate key ${criterion.key}`);
      if (errors.length === before) criterionKeys.add(criterion.key);
    });
  }

  const arr = entityArray(value);
  if (!arr) errors.push(`${label}: must contain exactly one entity array: products or resources`);
  else {
    push(errors, arr.items.length > 0, `${label}.${arr.name}: missing non-empty array`);
    arr.items.forEach((entity, i) => {
      errors.push(...validateEntity(entity, `${label}.${arr.name}[${i}]`));
      for (const [key, score] of Object.entries(entity.scores || {})) {
        if (!criterionKeys.has(key)) errors.push(`${label}.${arr.name}[${i}].scores.${key}: undeclared criterion`);
        if (score !== null && !(entity.provenance && Object.prototype.hasOwnProperty.call(entity.provenance, key))) {
          errors.push(`${label}.${arr.name}[${i}].${key}: score missing provenance`);
        }
      }
    });
  }
  return errors;
}

function validatePassport(value, label = 'passport') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-passport', `${label}: wrong format`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  if (!isObject(value.values) || !Object.keys(value.values).length) errors.push(`${label}.values: missing non-empty object`);
  else {
    for (const [key, weight] of Object.entries(value.values)) {
      push(errors, UNIVERSAL_VALUES.has(key), `${label}.values.${key}: unknown universal value`);
      push(errors, validWeight(weight), `${label}.values.${key}: weight must be 0..5`);
    }
  }
  return errors;
}

function validateOntology(value, label = 'ontology') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, Number.isInteger(value.version) && value.version >= 1, `${label}.version: missing integer version`);
  if (!Array.isArray(value.types) || !value.types.length) errors.push(`${label}.types: missing non-empty array`);
  else {
    for (const type of value.types) push(errors, TYPE_ENUM.has(type), `${label}.types: unknown type ${type}`);
  }
  if (!Array.isArray(value.needs)) errors.push(`${label}.needs: missing array`);
  else {
    push(errors, value.needs.length === NEED_ENUM.size, `${label}.needs: expected ${NEED_ENUM.size} needs`);
    const ids = new Set();
    value.needs.forEach((need, n) => {
      const at = `${label}.needs[${n}]`;
      if (!isObject(need)) errors.push(`${at}: must be an object`);
      else {
        push(errors, NEED_ENUM.has(need.id), `${at}.id: unknown need ${need.id || '(missing)'}`);
        push(errors, !ids.has(need.id), `${at}.id: duplicate need ${need.id || '(missing)'}`);
        ids.add(need.id);
        push(errors, isString(need.label), `${at}.label: missing label`);
        push(errors, isString(need.reads) && need.reads.length <= 140, `${at}.reads: missing or over 140 characters`);
      }
    });
  }
  if (!Array.isArray(value.domains)) errors.push(`${label}.domains: missing array`);
  else {
    value.domains.forEach((domain, d) => {
      if (!isObject(domain)) errors.push(`${label}.domains[${d}]: must be an object`);
      else {
        push(errors, isString(domain.label), `${label}.domains[${d}].label: missing label`);
        if (!Array.isArray(domain.categories)) errors.push(`${label}.domains[${d}].categories: missing array`);
        else domain.categories.forEach((category, c) => {
          if (!isObject(category)) errors.push(`${label}.domains[${d}].categories[${c}]: must be an object`);
          else {
            push(errors, isString(category.label), `${label}.domains[${d}].categories[${c}].label: missing label`);
            push(errors, TYPE_ENUM.has(category.type), `${label}.domains[${d}].categories[${c}].type: unknown type ${category.type || '(missing)'}`);
            push(errors, NEED_ENUM.has(category.need), `${label}.domains[${d}].categories[${c}].need: unknown need ${category.need || '(missing)'}`);
            if (category.cid != null) push(errors, KEBAB.test(category.cid), `${label}.domains[${d}].categories[${c}].cid: invalid cid`);
          }
        });
      }
    });
  }
  return errors;
}

function validateRegionProfile(value, label = 'regionProfile', expectedEntryCount = null) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, Number.isInteger(value.entryCount) && value.entryCount >= 0, `${label}.entryCount: invalid count`);
  if (Number.isInteger(expectedEntryCount)) push(errors, value.entryCount === expectedEntryCount, `${label}.entryCount: must match category count`);
  push(errors, Number.isInteger(value.regionTagged) && value.regionTagged >= 0, `${label}.regionTagged: invalid count`);
  push(errors, Number.isInteger(value.missingRegion) && value.missingRegion >= 0, `${label}.missingRegion: invalid count`);
  if (Number.isInteger(value.regionTagged) && Number.isInteger(value.missingRegion) && Number.isInteger(value.entryCount)) {
    push(errors, value.regionTagged + value.missingRegion === value.entryCount, `${label}: regionTagged + missingRegion must equal entryCount`);
  }
  if (!isObject(value.values)) errors.push(`${label}.values: missing object`);
  else {
    for (const [region, count] of Object.entries(value.values)) {
      push(errors, REGIONS.has(region), `${label}.values.${region}: unknown region`);
      push(errors, Number.isInteger(count) && count >= 0, `${label}.values.${region}: invalid count`);
    }
    push(errors, value.globalEntries === (value.values.global || 0), `${label}.globalEntries: must match values.global`);
  }
  if (!Array.isArray(value.filterValues)) errors.push(`${label}.filterValues: missing array`);
  else {
    const seen = new Set();
    value.filterValues.forEach((region, i) => {
      push(errors, REGION_FILTERS.has(region) && region !== 'everywhere', `${label}.filterValues[${i}]: invalid filter region`);
      if (seen.has(region)) errors.push(`${label}.filterValues[${i}]: duplicate ${region}`);
      seen.add(region);
    });
  }
  push(errors, Number.isInteger(value.globalEntries) && value.globalEntries >= 0, `${label}.globalEntries: invalid count`);
  if (!isObject(value.unknownRegionValues)) errors.push(`${label}.unknownRegionValues: missing object`);
  else {
    for (const [region, count] of Object.entries(value.unknownRegionValues)) {
      push(errors, !REGIONS.has(region), `${label}.unknownRegionValues.${region}: known region should not be listed as unknown`);
      push(errors, Number.isInteger(count) && count >= 0, `${label}.unknownRegionValues.${region}: invalid count`);
    }
  }
  push(errors, typeof value.countryLevelNeeded === 'boolean', `${label}.countryLevelNeeded: must be boolean`);
  push(errors, Number.isInteger(value.countryLevelLimitationCount) && value.countryLevelLimitationCount >= 0, `${label}.countryLevelLimitationCount: invalid count`);
  push(errors, typeof value.strictCurrentEnumSafe === 'boolean', `${label}.strictCurrentEnumSafe: must be boolean`);
  if (value.countryLevelNeeded) push(errors, value.countryLevelLimitationCount > 0, `${label}: countryLevelNeeded requires limitation count`);
  else push(errors, value.countryLevelLimitationCount === 0, `${label}: no country-level need should have zero limitation count`);
  if (value.countryLevelNeeded) push(errors, value.strictCurrentEnumSafe === false, `${label}.strictCurrentEnumSafe: must be false when country-level regions are needed`);
  return errors;
}

function validateRegionDecisionContract(value, categories = [], label = 'regionDecisionContract') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.status === 'h1-app-owned-region-decision', `${label}.status: wrong status`);
  push(errors, isString(value.consumer) && value.consumer.includes('H1') && value.consumer.includes('app/app.js'), `${label}.consumer: must name H1 app consumer`);
  push(errors, Array.isArray(value.currentFilterValues) && value.currentFilterValues.join('|') === 'everywhere|US|EU|UK', `${label}.currentFilterValues: must match app region cycle`);
  push(errors, Array.isArray(value.currentEntryRegionValues) && value.currentEntryRegionValues.join('|') === 'US|EU|UK|global', `${label}.currentEntryRegionValues: must match entry enum`);
  push(errors, isString(value.currentFilterRule) && value.currentFilterRule.includes('global'), `${label}.currentFilterRule: must name global behavior`);
  push(errors, isString(value.recommendation) && value.recommendation.includes('payments') && value.recommendation.includes('strict'), `${label}.recommendation: must name payments strict-filter caveat`);
  push(errors, isString(value.appOwnedDecision) && value.appOwnedDecision.includes('country-level'), `${label}.appOwnedDecision: must name country-level decision`);
  const categoryIds = new Set(categories.map(c => c && c.id).filter(Boolean));
  if (!Array.isArray(value.categoriesWithRegionControls)) errors.push(`${label}.categoriesWithRegionControls: missing array`);
  else {
    value.categoriesWithRegionControls.forEach((id, i) => {
      push(errors, categoryIds.has(id), `${label}.categoriesWithRegionControls[${i}]: unknown category ${id}`);
      const category = categories.find(c => c.id === id);
      push(errors, !!(category && category.regionProfile && category.regionProfile.filterValues && category.regionProfile.filterValues.length), `${label}.categoriesWithRegionControls[${i}]: category lacks filter values`);
    });
  }
  if (!Array.isArray(value.countryLevelLimitations)) errors.push(`${label}.countryLevelLimitations: missing array`);
  else {
    const seen = new Set();
    value.countryLevelLimitations.forEach((row, i) => {
      const at = `${label}.countryLevelLimitations[${i}]`;
      if (!isObject(row)) {
        errors.push(`${at}: must be an object`);
        return;
      }
      push(errors, categoryIds.has(row.category), `${at}.category: unknown category`);
      push(errors, ENTITY_CODE.test(String(row.code || '')), `${at}.code: invalid code`);
      push(errors, isString(row.name), `${at}.name: missing name`);
      push(errors, isString(row.market), `${at}.market: missing market`);
      push(errors, Array.isArray(row.currentRegion) && row.currentRegion.length > 0, `${at}.currentRegion: missing regions`);
      if (Array.isArray(row.currentRegion)) {
        row.currentRegion.forEach((region, r) => push(errors, REGIONS.has(region), `${at}.currentRegion[${r}]: unknown region ${region}`));
        push(errors, row.currentRegion.includes('global'), `${at}.currentRegion: H1 limitation should currently be tagged global`);
      }
      push(errors, isString(row.proposedRegionValue), `${at}.proposedRegionValue: missing proposed value`);
      push(errors, isString(row.reason) && row.reason.includes('Current region enum'), `${at}.reason: must name current enum limitation`);
      seen.add(row.code);
    });
    for (const code of H1_PAYMENT_REGION_LIMITATION_CODES) push(errors, seen.has(code), `${label}.countryLevelLimitations: missing ${code}`);
    push(errors, seen.size === H1_PAYMENT_REGION_LIMITATION_CODES.size, `${label}.countryLevelLimitations: unexpected limitation code count`);
  }
  if (!Array.isArray(value.missingLimitationEntries)) errors.push(`${label}.missingLimitationEntries: missing array`);
  else push(errors, value.missingLimitationEntries.length === 0, `${label}.missingLimitationEntries: should be empty`);
  if (!isObject(value.coverage)) errors.push(`${label}.coverage: missing object`);
  else {
    push(errors, value.coverage.categoryCount === categories.length, `${label}.coverage.categoryCount: must match category count`);
    if (Array.isArray(value.categoriesWithRegionControls)) push(errors, value.coverage.categoriesWithRegionControls === value.categoriesWithRegionControls.length, `${label}.coverage.categoriesWithRegionControls: mismatch`);
    push(errors, value.coverage.limitationCategories === 1, `${label}.coverage.limitationCategories: expected H1 payments category`);
    if (Array.isArray(value.countryLevelLimitations)) push(errors, value.coverage.countryLevelLimitationEntries === value.countryLevelLimitations.length, `${label}.coverage.countryLevelLimitationEntries: mismatch`);
    push(errors, value.coverage.missingLimitationEntries === 0, `${label}.coverage.missingLimitationEntries: should be 0`);
  }
  return errors;
}

function validateNamingContract(value, categories = [], label = 'namingContract') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.status === 'h3-app-owned-naming-ia-contract', `${label}.status: wrong status`);
  push(errors, isString(value.consumer) && value.consumer.includes('H3') && value.consumer.includes('app/app.js'), `${label}.consumer: must name H3 app consumer`);
  if (!isObject(value.canonicalNames)) errors.push(`${label}.canonicalNames: missing object`);
  else {
    const expected = {
      ecosystem: 'Values Commons',
      standard: 'Open Values Standard',
      instance: 'Conscious Consuming'
    };
    for (const [slot, name] of Object.entries(expected)) {
      const row = value.canonicalNames[slot];
      if (!isObject(row)) {
        errors.push(`${label}.canonicalNames.${slot}: missing object`);
        continue;
      }
      push(errors, row.name === name, `${label}.canonicalNames.${slot}.name: expected ${name}`);
      push(errors, isString(row.role), `${label}.canonicalNames.${slot}.role: missing role`);
      push(errors, isString(row.use), `${label}.canonicalNames.${slot}.use: missing use guidance`);
    }
  }
  if (!isObject(value.domainPosture)) errors.push(`${label}.domainPosture: missing object`);
  else {
    push(errors, value.domainPosture.ecosystemHome === 'https://valuescommons.org/', `${label}.domainPosture.ecosystemHome: wrong URL`);
    push(errors, value.domainPosture.appCanonicalBase === 'https://valuescommons.org/app/', `${label}.domainPosture.appCanonicalBase: wrong URL`);
    push(errors, value.domainPosture.standardHome === 'https://valuescommons.org/standard/', `${label}.domainPosture.standardHome: wrong URL`);
    push(errors, value.domainPosture.standardDomainAlias === 'openvaluesstandard.org', `${label}.domainPosture.standardDomainAlias: wrong alias`);
    push(errors, value.domainPosture.legacyDomainAlias === 'consciousconsuming.org', `${label}.domainPosture.legacyDomainAlias: wrong alias`);
  }
  if (!Array.isArray(value.copyRules)) errors.push(`${label}.copyRules: missing array`);
  else {
    const ids = new Set();
    value.copyRules.forEach((row, i) => {
      const at = `${label}.copyRules[${i}]`;
      if (!isObject(row)) {
        errors.push(`${at}: must be an object`);
        return;
      }
      push(errors, KEBAB.test(String(row.id || '')), `${at}.id: invalid id`);
      push(errors, isString(row.name), `${at}.name: missing name`);
      push(errors, isString(row.useFor), `${at}.useFor: missing guidance`);
      push(errors, isString(row.doNotUseFor), `${at}.doNotUseFor: missing boundary`);
      ids.add(row.id);
    });
    for (const id of ['ecosystem', 'standard', 'instance', 'commons-lowercase']) push(errors, ids.has(id), `${label}.copyRules: missing ${id}`);
  }
  if (!Array.isArray(value.appOwnedTargets)) errors.push(`${label}.appOwnedTargets: missing array`);
  else {
    const ids = new Set();
    value.appOwnedTargets.forEach((row, i) => {
      const at = `${label}.appOwnedTargets[${i}]`;
      if (!isObject(row)) {
        errors.push(`${at}: must be an object`);
        return;
      }
      push(errors, KEBAB.test(String(row.id || '')), `${at}.id: invalid id`);
      push(errors, isString(row.surface), `${at}.surface: missing surface`);
      push(errors, isString(row.preferred), `${at}.preferred: missing preferred copy`);
      push(errors, isString(row.avoid), `${at}.avoid: missing avoid note`);
      ids.add(row.id);
    });
    for (const id of ['app-wordmark', 'ecosystem-footer', 'standard-link', 'public-home-route', 'instance-explanation']) push(errors, ids.has(id), `${label}.appOwnedTargets: missing ${id}`);
  }
  push(errors, isString(value.recommendation) && value.recommendation.includes('Conscious Consuming') && value.recommendation.includes('Values Commons') && value.recommendation.includes('Open Values Standard'), `${label}.recommendation: must name the three-name stack`);
  push(errors, isString(value.appOwnedDecision) && value.appOwnedDecision.includes('app/footer/header'), `${label}.appOwnedDecision: must name app/footer/header decision`);
  push(errors, isString(value.drainRule) && value.drainRule.includes('H3'), `${label}.drainRule: must name H3 drain rule`);
  if (!isObject(value.coverage)) errors.push(`${label}.coverage: missing object`);
  else {
    push(errors, value.coverage.categoryCount === categories.length, `${label}.coverage.categoryCount: must match category count`);
    push(errors, value.coverage.canonicalNameCount === 3, `${label}.coverage.canonicalNameCount: expected 3`);
    if (Array.isArray(value.copyRules)) push(errors, value.coverage.copyRuleCount === value.copyRules.length, `${label}.coverage.copyRuleCount: mismatch`);
    if (Array.isArray(value.appOwnedTargets)) push(errors, value.coverage.appOwnedTargetCount === value.appOwnedTargets.length, `${label}.coverage.appOwnedTargetCount: mismatch`);
  }
  return errors;
}

function validateCertificationScoringContract(value, label = 'certificationScoringContract') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.status === 'h20-app-owned-certification-scoring-parity', `${label}.status: wrong status`);
  push(errors, isString(value.consumer) && value.consumer.includes('H20') && value.consumer.includes('app/app.js') && value.consumer.includes('app/engine.js'), `${label}.consumer: must name H20 browser consumers`);
  push(errors, Array.isArray(value.categories) && value.categories.join('|') === 'coffee|dark-chocolate|tea', `${label}.categories: expected three S8 pilots`);
  push(errors, value.unknownScore === null, `${label}.unknownScore: expected null`);
  push(errors, isString(value.missingRule), `${label}.missingRule: missing rule`);
  push(errors, isString(value.admissionRule), `${label}.admissionRule: missing rule`);
  push(errors, isString(value.legacyRule), `${label}.legacyRule: missing rule`);
  push(errors, isString(value.appOwnedNext), `${label}.appOwnedNext: missing next action`);
  push(errors, value.h20DrainableFromDataAlone === false, `${label}.h20DrainableFromDataAlone: must be false`);
  if (!Array.isArray(value.criteria) || value.criteria.length !== 3) errors.push(`${label}.criteria: expected three rows`);
  else value.criteria.forEach((row, i) => {
    const at = `${label}.criteria[${i}]`;
    push(errors, isObject(row), `${at}: must be object`);
    if (!isObject(row)) return;
    push(errors, CRITERION_KEY.test(String(row.key || '')), `${at}.key: invalid key`);
    push(errors, Array.isArray(row.acceptedTags) && row.acceptedTags.length >= 1 && row.acceptedTags.every(isString), `${at}.acceptedTags: missing tags`);
    push(errors, row.scoreWhenMatched === 100, `${at}.scoreWhenMatched: expected 100`);
    push(errors, row.scoreWhenLabelsPresentWithoutMatch === 0, `${at}.scoreWhenLabelsPresentWithoutMatch: expected 0`);
  });
  if (!Array.isArray(value.fixtures) || value.fixtures.length < 4) errors.push(`${label}.fixtures: expected parity cases`);
  else value.fixtures.forEach((fixture, i) => {
    const at = `${label}.fixtures[${i}]`;
    push(errors, isObject(fixture), `${at}: must be object`);
    if (!isObject(fixture)) return;
    push(errors, KEBAB.test(String(fixture.id || '')), `${at}.id: invalid id`);
    push(errors, Array.isArray(fixture.labels) && fixture.labels.every(isString), `${at}.labels: invalid labels`);
    push(errors, isObject(fixture.expectedScores), `${at}.expectedScores: missing object`);
    push(errors, fixture.knownFieldContribution === 0 || fixture.knownFieldContribution === 1, `${at}.knownFieldContribution: expected 0 or 1`);
  });
  return errors;
}

function validateCategoryIndex(value, label = 'category-index') {
  const errors = [];
  const generatedIndex = label === 'app/data/index.json';
  if (!isObject(value)) return [`${label}: must be an object`];
  if (!Array.isArray(value.categories) || !value.categories.length) errors.push(`${label}.categories: missing non-empty array`);
  else value.categories.forEach((category, i) => {
    if (!isObject(category)) errors.push(`${label}.categories[${i}]: must be an object`);
    else {
      push(errors, KEBAB.test(String(category.id || '')), `${label}.categories[${i}].id: invalid id`);
      push(errors, isString(category.label), `${label}.categories[${i}].label: missing label`);
      push(errors, /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(String(category.file || '')), `${label}.categories[${i}].file: invalid or missing file`);
      push(errors, Number.isInteger(category.n) && category.n >= 0, `${label}.categories[${i}].n: invalid count`);
      push(errors, TYPE_ENUM.has(category.type), `${label}.categories[${i}].type: unknown type`);
      push(errors, Array.isArray(category.criteria) && category.criteria.length > 0, `${label}.categories[${i}].criteria: missing criteria`);
      if (Array.isArray(category.criteria)) category.criteria.forEach((criterion, c) => errors.push(...validateCriterion(criterion, `${label}.categories[${i}].criteria[${c}]`)));
      push(errors, NEED_ENUM.has(category.need), `${label}.categories[${i}].need: unknown need ${category.need || '(missing)'}`);
      push(errors, isString(category.domain), `${label}.categories[${i}].domain: missing domain`);
      if (category.regionProfile != null) errors.push(...validateRegionProfile(category.regionProfile, `${label}.categories[${i}].regionProfile`, category.n));
      else if (generatedIndex) errors.push(`${label}.categories[${i}].regionProfile: missing generated region profile`);
      if (category.decision != null) errors.push(...validateDecision(category.decision, `${label}.categories[${i}].decision`));
    }
  });
  push(errors, isString(value.attribution), `${label}.attribution: missing attribution`);
  errors.push(...validateOntology(value.ontology, `${label}.ontology`));
  if (value.regionDecisionContract != null) errors.push(...validateRegionDecisionContract(value.regionDecisionContract, value.categories || [], `${label}.regionDecisionContract`));
  else if (generatedIndex) errors.push(`${label}.regionDecisionContract: missing generated region decision contract`);
  if (value.namingContract != null) errors.push(...validateNamingContract(value.namingContract, value.categories || [], `${label}.namingContract`));
  else if (generatedIndex) errors.push(`${label}.namingContract: missing generated naming contract`);
  if (value.certificationScoringContract != null) errors.push(...validateCertificationScoringContract(value.certificationScoringContract, `${label}.certificationScoringContract`));
  else if (generatedIndex) errors.push(`${label}.certificationScoringContract: missing generated H20 parity contract`);
  return errors;
}

function validateLines(value, label = 'lines') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-lines', `${label}: wrong format`);
  push(errors, /^0\.2(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.2`);
  push(errors, DATE.test(String(value.updated || '')), `${label}.updated: must be YYYY-MM-DD`);
  if (!isObject(value.kinds) || !Object.keys(value.kinds).length) errors.push(`${label}.kinds: missing non-empty object`);
  if (!Array.isArray(value.lines) || !value.lines.length) errors.push(`${label}.lines: missing non-empty array`);
  const ids = new Set();
  if (Array.isArray(value.lines)) {
    value.lines.forEach((line, i) => {
      const at = `${label}.lines[${i}]`;
      if (!isObject(line)) {
        errors.push(`${at}: must be an object`);
        return;
      }
      push(errors, /^(allergy|diet|require|avoid|cap|lean):[a-z0-9-]+$/.test(String(line.id || '')), `${at}.id: invalid id`);
      if (ids.has(line.id)) errors.push(`${at}.id: duplicate ${line.id}`);
      ids.add(line.id);
      push(errors, LINE_KIND_ENUM.has(line.kind), `${at}.kind: unknown kind ${line.kind || '(missing)'}`);
      if (line.id && line.kind) push(errors, String(line.id).split(':')[0] === line.kind, `${at}.id: prefix should match kind`);
      push(errors, isString(line.label), `${at}.label: missing label`);
      push(errors, isString(line.reads), `${at}.reads: missing reads`);
      if (line.kind === 'allergy') push(errors, isString(line.tag), `${at}.tag: allergy line missing tag`);
      if (line.kind === 'diet' || line.kind === 'require') push(errors, Array.isArray(line.accept) && line.accept.length > 0, `${at}.accept: ${line.kind} line missing accept`);
      if (line.kind === 'avoid') {
        push(errors, isString(line.entity), `${at}.entity: avoid line missing entity`);
        push(errors, Array.isArray(line.brands) && line.brands.length > 0, `${at}.brands: avoid line missing brands`);
      }
    });
  }
  if (value.sets != null) {
    if (!Array.isArray(value.sets)) errors.push(`${label}.sets: must be an array when present`);
    else {
      const setIds = new Set();
      value.sets.forEach((set, i) => {
        const at = `${label}.sets[${i}]`;
        if (!isObject(set)) {
          errors.push(`${at}: must be an object`);
          return;
        }
        push(errors, set.format === 'open-values-line-set', `${at}.format: wrong format`);
        push(errors, /^floor:[a-z0-9-]+$/.test(String(set.id || '')), `${at}.id: invalid floor set id`);
        if (setIds.has(set.id)) errors.push(`${at}.id: duplicate ${set.id}`);
        setIds.add(set.id);
        push(errors, set.tier === 'floor', `${at}.tier: expected floor`);
        push(errors, isString(set.label), `${at}.label: missing label`);
        push(errors, /^\d+\.\d+\.\d+(?:[-+][a-z0-9.-]+)?$/.test(String(set.version || '')), `${at}.version: invalid semver`);
        push(errors, DATE.test(String(set.published || '')), `${at}.published: must be YYYY-MM-DD`);
        push(errors, set.defaultOn === true, `${at}.defaultOn: shared floor must declare true`);
        push(errors, set.presentation === 'fold', `${at}.presentation: floor must fold, never erase`);
        push(errors, set.unknownEvidence === 'keep-visible', `${at}.unknownEvidence: missing evidence must remain visible`);
        push(errors, isString(set.namedConsumer), `${at}.namedConsumer: missing consumer`);
        push(errors, isObject(set.bounds), `${at}.bounds: missing object`);
        push(errors, isObject(set.fork) && set.fork.portableRuleIds === true && set.fork.localRuleOverrides === true, `${at}.fork: missing portable, local fork contract`);
        push(errors, isObject(set.governance), `${at}.governance: missing object`);
        push(errors, Array.isArray(set.changelog) && set.changelog.length > 0, `${at}.changelog: missing non-empty changelog`);
        if (!Array.isArray(set.rules) || !set.rules.length) errors.push(`${at}.rules: missing non-empty array`);
        else {
          const ruleIds = new Set();
          set.rules.forEach((rule, r) => {
            const rat = `${at}.rules[${r}]`;
            if (!isObject(rule)) {
              errors.push(`${rat}: must be an object`);
              return;
            }
            push(errors, /^avoid:floor-[a-z0-9-]+$/.test(String(rule.id || '')), `${rat}.id: invalid floor rule id`);
            if (ruleIds.has(rule.id)) errors.push(`${rat}.id: duplicate ${rule.id}`);
            ruleIds.add(rule.id);
            push(errors, rule.kind === 'avoid' && rule.tier === 'floor', `${rat}: expected avoid kind and floor tier`);
            push(errors, isString(rule.label), `${rat}.label: missing label`);
            push(errors, isString(rule.reads), `${rat}.reads: missing plain reading`);
            push(errors, rule.effect === 'fold', `${rat}.effect: floor must fold`);
            push(errors, Array.isArray(rule.scope?.categories) && rule.scope.categories.length > 0, `${rat}.scope.categories: missing categories`);
            push(errors, rule.match?.type === 'criterion-band', `${rat}.match.type: expected criterion-band`);
            push(errors, isString(rule.match?.criterion), `${rat}.match.criterion: missing criterion`);
            push(errors, rule.match?.band === 'poor' && rule.match?.maximumExclusive === 20, `${rat}.match: floor pilot must use the Poor band (<20)`);
            push(errors, rule.match?.requiresSource === true && rule.match?.requiresAsOf === true, `${rat}.match: source and as-of gates are required`);
            push(errors, isString(rule.receipt?.note), `${rat}.receipt.note: missing note`);
            push(errors, /^https?:\/\//i.test(String(rule.receipt?.source || '')), `${rat}.receipt.source: missing http(s) source`);
            push(errors, /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(String(rule.receipt?.asof || '')), `${rat}.receipt.asof: missing date`);
          });
        }
      });
    }
  }
  return errors;
}

function validateTagRegistry(value, label = 'tag-registry') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'ovs-tag-registry', `${label}: wrong format`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  push(errors, DATE.test(String(value.updated || '')), `${label}.updated: must be YYYY-MM-DD`);
  if (value.minItems != null) push(errors, Number.isInteger(value.minItems) && value.minItems >= 1, `${label}.minItems: must be positive integer`);
  if (!Array.isArray(value.tags) || !value.tags.length) errors.push(`${label}.tags: missing non-empty array`);
  const ids = new Set();
  if (Array.isArray(value.tags)) {
    value.tags.forEach((tag, i) => {
      const at = `${label}.tags[${i}]`;
      if (!isObject(tag)) {
        errors.push(`${at}: must be an object`);
        return;
      }
      push(errors, /^ovs:tag\/[a-z0-9-]+$/.test(String(tag.id || '')), `${at}.id: invalid id`);
      if (ids.has(tag.id)) errors.push(`${at}.id: duplicate ${tag.id}`);
      ids.add(tag.id);
      push(errors, isString(tag.label), `${at}.label: missing label`);
      push(errors, Array.isArray(tag.aliases), `${at}.aliases: missing array`);
      push(errors, TAG_KIND_ENUM.has(tag.kind), `${at}.kind: unknown kind ${tag.kind || '(missing)'}`);
      push(errors, isString(tag.reads), `${at}.reads: missing reads`);
      push(errors, Object.prototype.hasOwnProperty.call(tag, 'receipt'), `${at}.receipt: missing field`);
      if (tag.receipt != null) push(errors, isString(tag.receipt), `${at}.receipt: must be string or null`);
      if (tag.kind === 'certification') push(errors, isString(tag.receipt) && URL.test(tag.receipt), `${at}.receipt: certification needs http(s) receipt`);
    });
  }
  return errors;
}

function validateSynonymRegistry(value, label = 'synonym-registry') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'ovs-synonym-registry', `${label}: wrong format`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  push(errors, DATE.test(String(value.updated || '')), `${label}.updated: must be YYYY-MM-DD`);
  if (!isObject(value.synonyms) || !Object.keys(value.synonyms).length) errors.push(`${label}.synonyms: missing non-empty object`);
  if (isObject(value.synonyms)) {
    for (const [term, target] of Object.entries(value.synonyms)) {
      push(errors, isString(term), `${label}.synonyms: blank term`);
      push(errors, /^ovs:(cat|tag)\/[a-z0-9-]+$/.test(String(target || '')), `${label}.synonyms.${term}: invalid target ${target}`);
    }
  }
  return errors;
}

function validateErrandRegistry(value, label = 'errand-registry') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'ovs-errand-registry', `${label}: wrong format`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  push(errors, DATE.test(String(value.updated || '')), `${label}.updated: must be YYYY-MM-DD`);
  if (!Array.isArray(value.errands) || !value.errands.length) errors.push(`${label}.errands: missing non-empty array`);
  const ids = new Set();
  if (Array.isArray(value.errands)) {
    value.errands.forEach((errand, i) => {
      const at = `${label}.errands[${i}]`;
      if (!isObject(errand)) {
        errors.push(`${at}: must be an object`);
        return;
      }
      push(errors, /^ovs:errand\/[a-z0-9-]+$/.test(String(errand.id || '')), `${at}.id: invalid id`);
      if (ids.has(errand.id)) errors.push(`${at}.id: duplicate ${errand.id}`);
      ids.add(errand.id);
      push(errors, isString(errand.label), `${at}.label: missing label`);
      push(errors, Array.isArray(errand.aliases), `${at}.aliases: missing array`);
      push(errors, isString(errand.reads), `${at}.reads: missing reads`);
      push(errors, errand.output === 'list', `${at}.output: must be list`);
      if (errand.tradeoff != null) {
        push(errors, Array.isArray(errand.tradeoff) && errand.tradeoff.length === 2, `${at}.tradeoff: must have two keys`);
        if (Array.isArray(errand.tradeoff)) errand.tradeoff.forEach((key, k) => push(errors, CRITERION_KEY.test(String(key || '')), `${at}.tradeoff[${k}]: invalid key`));
      }
      if (!Array.isArray(errand.steps) || !errand.steps.length) errors.push(`${at}.steps: missing non-empty array`);
      else errand.steps.forEach((step, s) => {
        const stepAt = `${at}.steps[${s}]`;
        if (!isObject(step)) {
          errors.push(`${stepAt}: must be an object`);
          return;
        }
        push(errors, KEBAB.test(String(step.cat || '')), `${stepAt}.cat: invalid category id`);
        push(errors, PICK_ENUM.has(step.pick), `${stepAt}.pick: must be one or several`);
        push(errors, isString(step.note), `${stepAt}.note: missing note`);
      });
    });
  }
  return errors;
}

function validateRankRow(value, label = 'rank-row') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, Number.isInteger(value.rank) && value.rank >= 1, `${label}.rank: must be positive integer`);
  push(errors, isString(value.code), `${label}.code: missing code`);
  push(errors, isString(value.name), `${label}.name: missing name`);
  push(errors, Number.isFinite(value.score) && value.score >= 0 && value.score <= 100, `${label}.score: must be 0..100`);
  push(errors, isString(value.tier), `${label}.tier: missing tier`);
  push(errors, Array.isArray(value.why), `${label}.why: missing array`);
  push(errors, Number.isFinite(value.coverage) && value.coverage >= 0 && value.coverage <= 1, `${label}.coverage: must be 0..1`);
  if (value.reason != null && !isObject(value.reason)) errors.push(`${label}.reason: must be object when present`);
  if (value.weakestAxis != null) push(errors, Array.isArray(value.weakestAxis) && value.weakestAxis.length === 2, `${label}.weakestAxis: must be pair`);
  return errors;
}

function validateCitationBundle(value, label = 'citation-bundle') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-citation-bundle', `${label}: wrong format`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  push(errors, KEBAB.test(String(value.id || '')), `${label}.id: invalid id`);
  push(errors, isString(value.title), `${label}.title: missing title`);
  push(errors, DATE.test(String(value.createdAt || '')), `${label}.createdAt: must be YYYY-MM-DD`);
  push(errors, isString(value.maintainer), `${label}.maintainer: missing maintainer`);
  push(errors, isString(value.license), `${label}.license: missing license`);
  push(errors, isString(value.purpose), `${label}.purpose: missing purpose`);
  push(errors, value.rerunCommand === 'npm run audit:citations', `${label}.rerunCommand: should be npm run audit:citations`);

  const source = value.source || {};
  if (!isObject(source)) errors.push(`${label}.source: missing object`);
  else {
    push(errors, isString(source.lensPath), `${label}.source.lensPath: missing lensPath`);
    push(errors, KEBAB.test(String(source.lensId || '')), `${label}.source.lensId: invalid lensId`);
    push(errors, SHORT_HASH.test(String(source.lensHash || '')), `${label}.source.lensHash: invalid short hash`);
    push(errors, SHA256.test(String(source.snapshotSha256 || '')), `${label}.source.snapshotSha256: invalid sha256`);
    push(errors, isString(source.engineVersion), `${label}.source.engineVersion: missing engineVersion`);
  }

  const assumptions = value.lensAssumptions || {};
  if (!isObject(assumptions)) errors.push(`${label}.lensAssumptions: missing object`);
  else {
    push(errors, isString(assumptions.label), `${label}.lensAssumptions.label: missing label`);
    push(errors, TYPE_ENUM.has(assumptions.type), `${label}.lensAssumptions.type: unknown type`);
    push(errors, isString(assumptions.valueFrame) && /values-relative/i.test(assumptions.valueFrame), `${label}.lensAssumptions.valueFrame: should state values-relative ranking`);
    push(errors, isString(assumptions.disclaimer), `${label}.lensAssumptions.disclaimer: missing disclaimer`);
    if (!isObject(assumptions.weights) || !Object.keys(assumptions.weights).length) errors.push(`${label}.lensAssumptions.weights: missing non-empty object`);
    else {
      for (const [key, weight] of Object.entries(assumptions.weights)) {
        push(errors, CRITERION_KEY.test(key), `${label}.lensAssumptions.weights.${key}: invalid key`);
        push(errors, validWeight(weight), `${label}.lensAssumptions.weights.${key}: must be 0..5`);
      }
    }
    if (!Array.isArray(assumptions.criteria) || !assumptions.criteria.length) errors.push(`${label}.lensAssumptions.criteria: missing non-empty array`);
    else assumptions.criteria.forEach((criterion, i) => errors.push(...validateCriterion(criterion, `${label}.lensAssumptions.criteria[${i}]`)));
  }

  if (!isObject(value.query)) errors.push(`${label}.query: missing object`);
  else {
    push(errors, value.query.kind === 'rank-lens', `${label}.query.kind: must be rank-lens`);
    push(errors, isString(value.query.focus), `${label}.query.focus: missing focus`);
    push(errors, Array.isArray(value.query.targetCodes), `${label}.query.targetCodes: missing array`);
    push(errors, Number.isInteger(value.query.topN) && value.query.topN >= 1, `${label}.query.topN: must be positive integer`);
  }

  errors.push(...validateLens(value.lensSnapshot, `${label}.lensSnapshot`));

  const expected = value.expected || {};
  if (!isObject(expected)) errors.push(`${label}.expected: missing object`);
  else {
    push(errors, isString(expected.engineVersion), `${label}.expected.engineVersion: missing engineVersion`);
    push(errors, SHORT_HASH.test(String(expected.lensHash || '')), `${label}.expected.lensHash: invalid short hash`);
    push(errors, SHA256.test(String(expected.snapshotSha256 || '')), `${label}.expected.snapshotSha256: invalid sha256`);
    push(errors, Number.isInteger(expected.rankedCount) && expected.rankedCount >= 0, `${label}.expected.rankedCount: invalid count`);
    if (!Array.isArray(expected.top)) errors.push(`${label}.expected.top: missing array`);
    else expected.top.forEach((row, i) => errors.push(...validateRankRow(row, `${label}.expected.top[${i}]`)));
    if (!isObject(expected.targets)) errors.push(`${label}.expected.targets: missing object`);
    else {
      for (const [code, row] of Object.entries(expected.targets)) {
        push(errors, isString(code), `${label}.expected.targets: blank target code`);
        errors.push(...validateRankRow(row, `${label}.expected.targets.${code}`));
      }
    }
  }
  return errors;
}

function validatePulse(value, label = 'pulse') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'ovs-pulse', `${label}: wrong format`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  push(errors, DATE.test(String(value.built || '')), `${label}.built: must be YYYY-MM-DD`);
  push(errors, Number.isInteger(value.windowDays) && value.windowDays >= 1, `${label}.windowDays: must be positive integer`);
  push(errors, Number.isInteger(value.truncated) && value.truncated >= 0, `${label}.truncated: must be nonnegative integer`);
  if (!Array.isArray(value.entries)) errors.push(`${label}.entries: missing array`);
  else value.entries.forEach((entry, i) => {
    const at = `${label}.entries[${i}]`;
    if (!isObject(entry)) {
      errors.push(`${at}: must be an object`);
      return;
    }
    push(errors, DATE.test(String(entry.date || '')), `${at}.date: must be YYYY-MM-DD`);
    push(errors, OVS_NODE_ID.test(String(entry.node || '')), `${at}.node: invalid node`);
    push(errors, PULSE_KIND_ENUM.has(entry.kind), `${at}.kind: unknown kind ${entry.kind || '(missing)'}`);
    push(errors, isString(entry.what), `${at}.what: missing what`);
    if (entry.source != null) push(errors, isString(entry.source) && URL.test(entry.source), `${at}.source: must be http(s) URL`);
    if (entry.commit != null) push(errors, SHORT_HASH.test(String(entry.commit)), `${at}.commit: invalid short hash`);
  });
  return errors;
}

function validateEdges(value, label = 'edges') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-edges', `${label}: wrong format`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  if (!Array.isArray(value.edges) || !value.edges.length) errors.push(`${label}.edges: missing non-empty array`);
  const seen = new Set();
  if (Array.isArray(value.edges)) {
    value.edges.forEach((edge, i) => {
      const at = `${label}.edges[${i}]`;
      if (!isObject(edge)) {
        errors.push(`${at}: must be an object`);
        return;
      }
      push(errors, OVS_NODE_ID.test(String(edge.from || '')), `${at}.from: invalid node`);
      push(errors, KEBAB.test(String(edge.rel || '')), `${at}.rel: invalid relation`);
      push(errors, OVS_NODE_ID.test(String(edge.to || '')), `${at}.to: invalid node`);
      push(errors, isString(edge.source), `${at}.source: missing source`);
      push(errors, isString(edge.asof) && (/^(19|20)\d{2}$/.test(edge.asof) || DATE.test(edge.asof)), `${at}.asof: must be year or YYYY-MM-DD`);
      const key = `${edge.from}\u0000${edge.rel}\u0000${edge.to}`;
      if (seen.has(key)) errors.push(`${at}: duplicate edge ${edge.from} ${edge.rel} ${edge.to}`);
      seen.add(key);
    });
  }
  return errors;
}

function validateDoor(value, label = 'door') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-door', `${label}: wrong format`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  push(errors, isString(value.generatedAt), `${label}.generatedAt: missing generatedAt`);
  push(errors, isString(value.self) && URL.test(value.self), `${label}.self: missing self URL`);
  for (const section of ['publisher', 'standard', 'instance', 'licenses', 'privacy', 'trustArtifacts', 'stacks']) {
    if (!isObject(value[section])) errors.push(`${label}.${section}: missing object`);
  }
  if (isObject(value.publisher)) {
    push(errors, isString(value.publisher.name), `${label}.publisher.name: missing name`);
    push(errors, isString(value.publisher.url) && URL.test(value.publisher.url), `${label}.publisher.url: missing URL`);
  }
  if (isObject(value.standard)) {
    push(errors, isString(value.standard.name), `${label}.standard.name: missing name`);
    push(errors, isString(value.standard.version), `${label}.standard.version: missing version`);
    push(errors, isString(value.standard.url) && URL.test(value.standard.url), `${label}.standard.url: missing URL`);
  }
  if (isObject(value.instance)) {
    push(errors, isString(value.instance.name), `${label}.instance.name: missing name`);
    push(errors, isString(value.instance.role), `${label}.instance.role: missing role`);
    push(errors, isString(value.instance.url) && URL.test(value.instance.url), `${label}.instance.url: missing URL`);
    push(errors, isString(value.instance.index) && URL.test(value.instance.index), `${label}.instance.index: missing URL`);
  }
  if (isObject(value.privacy)) {
    for (const key of ['accounts', 'tracking', 'ads', 'payToRank']) {
      push(errors, typeof value.privacy[key] === 'boolean', `${label}.privacy.${key}: must be boolean`);
    }
  }
  if (isObject(value.stacks)) {
    push(errors, isString(value.stacks.index) && URL.test(value.stacks.index), `${label}.stacks.index: missing URL`);
    push(errors, isString(value.stacks.pattern) && URL.test(value.stacks.pattern), `${label}.stacks.pattern: missing URL pattern`);
    push(errors, value.stacks.hash === 'sha256', `${label}.stacks.hash: must be sha256`);
  }
  if (!Array.isArray(value.lenses) || !value.lenses.length) errors.push(`${label}.lenses: missing non-empty array`);
  else value.lenses.forEach((lens, i) => {
    const at = `${label}.lenses[${i}]`;
    if (!isObject(lens)) {
      errors.push(`${at}: must be an object`);
      return;
    }
    push(errors, KEBAB.test(String(lens.id || '')), `${at}.id: invalid id`);
    push(errors, isString(lens.title), `${at}.title: missing title`);
    push(errors, TYPE_ENUM.has(lens.type), `${at}.type: unknown type`);
    push(errors, isString(lens.domain), `${at}.domain: missing domain`);
    push(errors, Number.isInteger(lens.entries) && lens.entries >= 0, `${at}.entries: invalid count`);
    push(errors, Array.isArray(lens.criteria), `${at}.criteria: missing array`);
    push(errors, isString(lens.url) && URL.test(lens.url), `${at}.url: missing URL`);
    push(errors, isString(lens.data) && URL.test(lens.data), `${at}.data: missing URL`);
    push(errors, SHA256.test(String(lens.sha256 || '')), `${at}.sha256: invalid sha256`);
    push(errors, lens.integrity === `sha256-${lens.sha256}`, `${at}.integrity: must match sha256`);
    push(errors, isString(lens.stack) && URL.test(lens.stack), `${at}.stack: missing URL`);
    push(errors, isString(lens.license) && URL.test(lens.license), `${at}.license: missing URL`);
    push(errors, isString(lens.source), `${at}.source: missing source`);
    push(errors, isString(lens.attribution), `${at}.attribution: missing attribution`);
  });
  return errors;
}

function validateStackIndex(value, label = 'stack-index') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-stack-index', `${label}: wrong format`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  push(errors, isString(value.generatedAt), `${label}.generatedAt: missing generatedAt`);
  push(errors, isString(value.sourceDoor) && URL.test(value.sourceDoor), `${label}.sourceDoor: missing URL`);
  push(errors, value.hash === 'sha256', `${label}.hash: must be sha256`);
  push(errors, isString(value.description), `${label}.description: missing description`);
  if (!Array.isArray(value.lenses) || !value.lenses.length) errors.push(`${label}.lenses: missing non-empty array`);
  else value.lenses.forEach((lens, i) => {
    const at = `${label}.lenses[${i}]`;
    if (!isObject(lens)) {
      errors.push(`${at}: must be an object`);
      return;
    }
    push(errors, KEBAB.test(String(lens.id || '')), `${at}.id: invalid id`);
    push(errors, SHA256.test(String(lens.sha256 || '')), `${at}.sha256: invalid sha256`);
    push(errors, lens.integrity === `sha256-${lens.sha256}`, `${at}.integrity: must match sha256`);
    push(errors, isString(lens.path) && lens.path === `/stacks/lens/${lens.id}/${lens.sha256}.json`, `${at}.path: must be content-addressed`);
    push(errors, isString(lens.url) && URL.test(lens.url), `${at}.url: missing URL`);
    push(errors, isString(lens.canonicalData) && URL.test(lens.canonicalData), `${at}.canonicalData: missing URL`);
    push(errors, isString(lens.license) && URL.test(lens.license), `${at}.license: missing URL`);
  });
  return errors;
}

function validateNodeIndex(value, label = 'node-index') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'ovs-node-index', `${label}: wrong format`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  push(errors, DATE.test(String(value.built || '')), `${label}.built: must be YYYY-MM-DD`);
  if (value.type != null) push(errors, isString(value.type), `${label}.type: must be a string when present`);
  if (value.minItems != null) push(errors, Number.isInteger(value.minItems) && value.minItems >= 1, `${label}.minItems: must be positive integer`);
  if (!Array.isArray(value.nodes) || !value.nodes.length) errors.push(`${label}.nodes: missing non-empty array`);
  const ids = new Set();
  if (Array.isArray(value.nodes)) {
    value.nodes.forEach((node, i) => {
      const at = `${label}.nodes[${i}]`;
      if (!isObject(node)) {
        errors.push(`${at}: must be an object`);
        return;
      }
      push(errors, OVS_NODE_ID.test(String(node.id || '')), `${at}.id: invalid node id`);
      if (ids.has(node.id)) errors.push(`${at}.id: duplicate ${node.id}`);
      ids.add(node.id);
      push(errors, isString(node.label), `${at}.label: missing label`);
      if (node.type != null) push(errors, isString(node.type), `${at}.type: must be string`);
      if (node.aliases != null) push(errors, Array.isArray(node.aliases), `${at}.aliases: must be array`);
      if (node.items != null) push(errors, Number.isInteger(node.items) && node.items >= 0, `${at}.items: must be nonnegative integer`);
      if (node.categories != null) {
        push(errors, Array.isArray(node.categories), `${at}.categories: must be array`);
        if (Array.isArray(node.categories)) node.categories.forEach((cid, c) => push(errors, KEBAB.test(String(cid || '')), `${at}.categories[${c}]: invalid category id`));
      }
      if (node.top != null) {
        push(errors, Array.isArray(node.top), `${at}.top: must be array`);
        if (Array.isArray(node.top)) node.top.forEach((pick, p) => {
          const pickAt = `${at}.top[${p}]`;
          if (!isObject(pick)) {
            errors.push(`${pickAt}: must be object`);
            return;
          }
          push(errors, KEBAB.test(String(pick.cat || '')), `${pickAt}.cat: invalid category id`);
          push(errors, isString(pick.code), `${pickAt}.code: missing code`);
          push(errors, isString(pick.name), `${pickAt}.name: missing name`);
          if (pick.score != null) push(errors, Number.isFinite(pick.score) && pick.score >= 0 && pick.score <= 100, `${pickAt}.score: must be 0..100`);
        });
      }
      if (node.brands != null) {
        push(errors, Array.isArray(node.brands), `${at}.brands: must be array`);
        if (Array.isArray(node.brands)) node.brands.forEach((id, b) => push(errors, OVS_NODE_ID.test(String(id || '')), `${at}.brands[${b}]: invalid node id`));
      }
      if (node.brandNames != null) push(errors, Array.isArray(node.brandNames), `${at}.brandNames: must be array`);
      if (node.ownershipSources != null) {
        push(errors, Array.isArray(node.ownershipSources), `${at}.ownershipSources: must be array`);
        if (Array.isArray(node.ownershipSources)) node.ownershipSources.forEach((source, s) => {
          const sourceAt = `${at}.ownershipSources[${s}]`;
          if (!isObject(source)) {
            errors.push(`${sourceAt}: must be object`);
            return;
          }
          push(errors, OVS_NODE_ID.test(String(source.from || '')), `${sourceAt}.from: invalid node id`);
          if (source.brand != null) push(errors, OVS_NODE_ID.test(String(source.brand)), `${sourceAt}.brand: invalid node id`);
          push(errors, isString(source.brandName), `${sourceAt}.brandName: missing brandName`);
          push(errors, isString(source.source), `${sourceAt}.source: missing source`);
          push(errors, isString(source.asof), `${sourceAt}.asof: missing asof`);
        });
      }
    });
  }
  return errors;
}

function validateTargetMap(value, label, options = {}) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing object`];
  if (!options.allowEmpty && !Object.keys(value).length) errors.push(`${label}: missing non-empty object`);
  for (const [key, target] of Object.entries(value)) {
    push(errors, isString(key), `${label}: blank key`);
    push(errors, OVS_ANY_ID.test(String(target || '')), `${label}.${key}: invalid target ${target}`);
  }
  return errors;
}

function validateTokenMap(value, label) {
  const errors = [];
  if (!isObject(value) || !Object.keys(value).length) return [`${label}: missing non-empty object`];
  for (const [key, ids] of Object.entries(value)) {
    push(errors, isString(key), `${label}: blank token`);
    if (!Array.isArray(ids) || !ids.length) errors.push(`${label}.${key}: must be non-empty array`);
    else ids.forEach((id, i) => push(errors, OVS_ANY_ID.test(String(id || '')), `${label}.${key}[${i}]: invalid target ${id}`));
  }
  return errors;
}

function validateSynonymIndex(value, label = 'synonym-index') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'ovs-synonym-index', `${label}: wrong format`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  push(errors, DATE.test(String(value.built || '')), `${label}.built: must be YYYY-MM-DD`);
  push(errors, isString(value.source), `${label}.source: missing source`);
  errors.push(...validateTargetMap(value.aliases, `${label}.aliases`));
  errors.push(...validateTargetMap(value.normalized, `${label}.normalized`));
  if (!isObject(value.targets) || !Object.keys(value.targets).length) errors.push(`${label}.targets: missing non-empty object`);
  else {
    for (const [target, terms] of Object.entries(value.targets)) {
      push(errors, /^ovs:(cat|tag)\/[a-z0-9-]+$/.test(target), `${label}.targets.${target}: invalid target key`);
      push(errors, Array.isArray(terms) && terms.length > 0, `${label}.targets.${target}: must be non-empty array`);
    }
  }
  return errors;
}

function validateAskIndex(value, label = 'ask-index') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'ovs-ask-index', `${label}: wrong format`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  push(errors, DATE.test(String(value.built || '')), `${label}.built: must be YYYY-MM-DD`);
  push(errors, Array.isArray(value.source) && value.source.length > 0, `${label}.source: missing non-empty array`);
  push(errors, value.loadHint === 'lazy-product-search', `${label}.loadHint: must be lazy-product-search`);
  if (!isObject(value.budget)) {
    errors.push(`${label}.budget: missing object`);
  } else {
    push(errors, value.budget.maxBytes === 6000000, `${label}.budget.maxBytes: must be 6000000`);
    push(errors, Number.isInteger(value.budget.currentBytes) && value.budget.currentBytes > 0, `${label}.budget.currentBytes: must be positive integer`);
    push(errors, typeof value.budget.withinBudget === 'boolean', `${label}.budget.withinBudget: must be boolean`);
    push(errors, value.budget.withinBudget === (value.budget.currentBytes <= value.budget.maxBytes), `${label}.budget.withinBudget: mismatch`);
    push(errors, isString(value.budget.measurement), `${label}.budget.measurement: missing measurement`);
    push(errors, isString(value.budget.actionWhenExceeded), `${label}.budget.actionWhenExceeded: missing action`);
  }
  if (!isObject(value.shards)) {
    errors.push(`${label}.shards: missing object`);
  } else {
    push(errors, ['not-needed', 'required'].includes(value.shards.status), `${label}.shards.status: invalid status`);
    push(errors, Number.isInteger(value.shards.count) && value.shards.count >= 1, `${label}.shards.count: must be positive integer`);
    errors.push(...validateStringArray(value.shards.files, `${label}.shards.files`));
    push(errors, isString(value.shards.hint), `${label}.shards.hint: missing hint`);
    if (value.budget?.withinBudget === true) push(errors, value.shards.status === 'not-needed', `${label}.shards.status: should be not-needed while within budget`);
    if (value.budget?.withinBudget === false) push(errors, value.shards.status === 'required', `${label}.shards.status: should be required when over budget`);
  }
  errors.push(...validateTokenMap(value.tokens, `${label}.tokens`));
  errors.push(...validateTargetMap(value.aliases, `${label}.aliases`, { allowEmpty: true }));
  if (!isObject(value.stats)) errors.push(`${label}.stats: missing object`);
  else {
    for (const [key, count] of Object.entries(value.stats)) {
      push(errors, Number.isInteger(count) && count >= 0, `${label}.stats.${key}: must be nonnegative integer`);
    }
  }
  return errors;
}

function validateAvoidTokenIndex(value, label = 'avoid-token-index') {
  const errors = validateContractEnvelope(value, label, 'ovs-avoid-token-index');
  if (errors.length && !isObject(value)) return errors;
  push(errors, /browser-extension/i.test(String(value.purpose || '')), `${label}.purpose: should name browser-extension use`);
  push(errors, /word boundaries/i.test(String(value.matching?.boundary || '')), `${label}.matching.boundary: should require word-boundary matching`);
  push(errors, /app-owned/i.test(String(value.matching?.appLaneNote || '')), `${label}.matching.appLaneNote: should keep runtime UI app-owned`);
  if (!Array.isArray(value.families) || !value.families.length) errors.push(`${label}.families: missing non-empty array`);
  else {
    const ids = new Set();
    const allTokens = new Set();
    let tokenTotal = 0;
    value.families.forEach((family, i) => {
      const at = `${label}.families[${i}]`;
      if (!isObject(family)) {
        errors.push(`${at}: must be object`);
        return;
      }
      push(errors, /^avoid:[a-z0-9-]+$/.test(String(family.id || '')), `${at}.id: invalid avoid family id`);
      if (ids.has(family.id)) errors.push(`${at}.id: duplicate ${family.id}`);
      ids.add(family.id);
      push(errors, family.line === `ovs:line/${family.id}`, `${at}.line: must point to matching line id`);
      push(errors, isString(family.label), `${at}.label: missing label`);
      push(errors, /^[a-z0-9]+(?: [a-z0-9]+)*$/.test(String(family.entity || '')), `${at}.entity: must be plain ASCII lowercase token`);
      push(errors, Number.isInteger(family.sourceLineBrands) && family.sourceLineBrands >= 0, `${at}.sourceLineBrands: must be nonnegative integer`);
      push(errors, Number.isInteger(family.sourceCompanyBrands) && family.sourceCompanyBrands >= 0, `${at}.sourceCompanyBrands: must be nonnegative integer`);
      if (!Array.isArray(family.tokens) || !family.tokens.length) {
        errors.push(`${at}.tokens: missing non-empty array`);
        return;
      }
      push(errors, family.tokenCount === family.tokens.length, `${at}.tokenCount: mismatch`);
      const seen = new Set();
      family.tokens.forEach((token, j) => {
        push(errors, /^[a-z0-9]+(?: [a-z0-9]+)*$/.test(String(token || '')), `${at}.tokens[${j}]: must be plain ASCII lowercase token`);
        push(errors, !String(token || '').includes('?'), `${at}.tokens[${j}]: must not contain replacement marker`);
        if (seen.has(token)) errors.push(`${at}.tokens[${j}]: duplicate token ${token}`);
        seen.add(token);
        allTokens.add(token);
      });
      push(errors, [...seen].join('\n') === family.tokens.join('\n'), `${at}.tokens: should be sorted and deduped`);
      tokenTotal += family.tokens.length;
    });
    if (isObject(value.stats)) {
      push(errors, value.stats.families === value.families.length, `${label}.stats.families: mismatch`);
      push(errors, value.stats.tokens === tokenTotal, `${label}.stats.tokens: mismatch`);
      push(errors, value.stats.uniqueTokens === allTokens.size, `${label}.stats.uniqueTokens: mismatch`);
      push(errors, Number.isInteger(value.stats.bytes) && value.stats.bytes > 0 && value.stats.bytes < 30000, `${label}.stats.bytes: should be compact`);
    }
  }
  if (!isObject(value.stats)) errors.push(`${label}.stats: missing object`);
  else errors.push(...validateObjectCounts(value.stats, `${label}.stats`));
  return errors;
}

function validateAskCoreStartupContract(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing startup contract object`];
  push(errors, /startup Ask contract/i.test(String(value.purpose || '')), `${label}.purpose: missing startup Ask purpose`);
  push(errors, /app-owned/i.test(String(value.appLaneNote || '')), `${label}.appLaneNote: missing app-owned note`);
  push(errors, value.loadHint === 'eager-search', `${label}.loadHint: must be eager-search`);
  if (!isObject(value.budget)) errors.push(`${label}.budget: missing object`);
  else {
    push(errors, value.budget.maxBytes === 780000, `${label}.budget.maxBytes: must be 780000`);
    push(errors, Number.isInteger(value.budget.currentBytes) && value.budget.currentBytes > 0, `${label}.budget.currentBytes: must be positive integer`);
    push(errors, value.budget.minimumHeadroomBytes === 50000, `${label}.budget.minimumHeadroomBytes: must be 50000`);
    push(errors, Number.isInteger(value.budget.headroomBytes), `${label}.budget.headroomBytes: must be integer`);
    push(errors, typeof value.budget.withinBudget === 'boolean', `${label}.budget.withinBudget: must be boolean`);
    push(errors, typeof value.budget.hasMinimumHeadroom === 'boolean', `${label}.budget.hasMinimumHeadroom: must be boolean`);
    push(errors, isString(value.budget.measurement), `${label}.budget.measurement: missing measurement`);
  }
  if (!isObject(value.covers)) errors.push(`${label}.covers: missing object`);
  else {
    push(errors, value.covers.layer === 'core', `${label}.covers.layer: must be core`);
    for (const field of ['targetTypes', 'deferredTargetTypes', 'targetFields']) {
      push(errors, Array.isArray(value.covers[field]) && value.covers[field].length > 0, `${label}.covers.${field}: missing non-empty array`);
    }
  }
  if (!isObject(value.resolver)) errors.push(`${label}.resolver: missing object`);
  else {
    push(errors, isString(value.resolver.normalization), `${label}.resolver.normalization: missing normalization`);
    push(errors, Array.isArray(value.resolver.stopWords), `${label}.resolver.stopWords: missing array`);
    push(errors, Array.isArray(value.resolver.rankOrder) && value.resolver.rankOrder.length > 0, `${label}.resolver.rankOrder: missing non-empty array`);
    if (Array.isArray(value.resolver.rankOrder)) {
      const fuzzy = value.resolver.rankOrder.indexOf('fuzzy-1');
      const containment = value.resolver.rankOrder.indexOf('token-containment');
      push(errors, fuzzy >= 0 && containment >= 0 && fuzzy < containment, `${label}.resolver.rankOrder: fuzzy-1 must precede token-containment`);
    }
    push(errors, Number.isInteger(value.resolver.maxStartupResults) && value.resolver.maxStartupResults > 0, `${label}.resolver.maxStartupResults: invalid max`);
  }
  if (!isObject(value.lazyBoundary)) errors.push(`${label}.lazyBoundary: missing object`);
  else {
    push(errors, value.lazyBoundary.file === 'ask-index.json', `${label}.lazyBoundary.file: must be ask-index.json`);
    push(errors, value.lazyBoundary.loadHint === 'lazy-product-search', `${label}.lazyBoundary.loadHint: must be lazy-product-search`);
    push(errors, isString(value.lazyBoundary.use), `${label}.lazyBoundary.use: missing use`);
    push(errors, isString(value.lazyBoundary.trigger), `${label}.lazyBoundary.trigger: missing trigger`);
    push(errors, value.lazyBoundary.keepCoreIfLazyFails === true, `${label}.lazyBoundary.keepCoreIfLazyFails: must be true`);
    push(errors, isString(value.lazyBoundary.failureMode), `${label}.lazyBoundary.failureMode: missing failure mode`);
  }
  if (!isObject(value.emptyState)) errors.push(`${label}.emptyState: missing object`);
  else {
    push(errors, isString(value.emptyState.when), `${label}.emptyState.when: missing condition`);
    push(errors, isString(value.emptyState.primary) && ROUTE_HASH.test(value.emptyState.primary), `${label}.emptyState.primary: missing route hash`);
    push(errors, isString(value.emptyState.secondary) && ROUTE_HASH.test(value.emptyState.secondary), `${label}.emptyState.secondary: missing route hash`);
    push(errors, isString(value.emptyState.mustNot), `${label}.emptyState.mustNot: missing must-not`);
  }
  if (!Array.isArray(value.goldenQueries) || !value.goldenQueries.length) errors.push(`${label}.goldenQueries: missing non-empty array`);
  else value.goldenQueries.forEach((test, i) => {
    const at = `${label}.goldenQueries[${i}]`;
    if (!isObject(test)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, isString(test.query), `${at}.query: missing query`);
    push(errors, isString(test.normalized), `${at}.normalized: missing normalized`);
    push(errors, isString(test.intent), `${at}.intent: missing intent`);
    push(errors, Array.isArray(test.expectAny) && test.expectAny.length > 0, `${at}.expectAny: missing non-empty array`);
    for (const id of test.expectAny || []) push(errors, OVS_ANY_ID.test(String(id || '')), `${at}.expectAny: invalid id ${id}`);
    push(errors, Number.isInteger(test.expectOneInTop) && test.expectOneInTop > 0, `${at}.expectOneInTop: invalid top count`);
    push(errors, OVS_ANY_ID.test(String(test.matched || '')), `${at}.matched: invalid id`);
    push(errors, Number.isInteger(test.matchedRank) && test.matchedRank > 0, `${at}.matchedRank: invalid rank`);
    push(errors, isString(test.expectFirstHash) && ROUTE_HASH.test(test.expectFirstHash), `${at}.expectFirstHash: missing hash`);
    push(errors, isString(test.expectMatchedHash) && ROUTE_HASH.test(test.expectMatchedHash), `${at}.expectMatchedHash: missing hash`);
    push(errors, test.ok === true, `${at}.ok: must be true`);
    if (test.orderingAssertions != null) {
      if (!Array.isArray(test.orderingAssertions)) errors.push(`${at}.orderingAssertions: must be array`);
      else test.orderingAssertions.forEach((assertion, t) => errors.push(...validateAskOrderingAssertion(assertion, `${at}.orderingAssertions[${t}]`)));
    }
    if (test.orderingChecks != null) {
      if (!Array.isArray(test.orderingChecks)) errors.push(`${at}.orderingChecks: must be array`);
      else test.orderingChecks.forEach((check, c) => errors.push(...validateAskOrderingCheck(check, `${at}.orderingChecks[${c}]`)));
    }
    if (!Array.isArray(test.top) || !test.top.length) errors.push(`${at}.top: missing non-empty array`);
    else test.top.forEach((hit, h) => errors.push(...validateAskHit(hit, `${at}.top[${h}]`)));
  });
  return errors;
}

function validateAskCoreIndex(value, label = 'ask-core-index') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'ovs-ask-core-index', `${label}: wrong format`);
  push(errors, value.type === 'ask-core', `${label}.type: must be ask-core`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  push(errors, DATE.test(String(value.built || '')), `${label}.built: must be YYYY-MM-DD`);
  push(errors, Array.isArray(value.source) && value.source.length > 0, `${label}.source: missing non-empty array`);
  push(errors, isString(value.strategy), `${label}.strategy: missing strategy`);
  push(errors, Array.isArray(value.targetFields) && value.targetFields.length > 0, `${label}.targetFields: missing non-empty array`);
  errors.push(...validateAskCoreStartupContract(value.startupContract, `${label}.startupContract`));
  errors.push(...validateTokenMap(value.tokens, `${label}.tokens`));
  errors.push(...validateTargetMap(value.aliases, `${label}.aliases`, { allowEmpty: true }));
  if (!isObject(value.targets) || !Object.keys(value.targets).length) errors.push(`${label}.targets: missing non-empty object`);
  else {
    for (const [id, target] of Object.entries(value.targets)) {
      push(errors, OVS_ANY_ID.test(id), `${label}.targets.${id}: invalid target id`);
      if (!isObject(target)) errors.push(`${label}.targets.${id}: must be object`);
      else {
        push(errors, isString(target.type), `${label}.targets.${id}.type: missing type`);
        push(errors, isString(target.label), `${label}.targets.${id}.label: missing label`);
        push(errors, isString(target.hash) && ROUTE_HASH.test(target.hash), `${label}.targets.${id}.hash: missing route hash`);
      }
    }
  }
  if (!isObject(value.stats)) errors.push(`${label}.stats: missing object`);
  else {
    for (const [key, count] of Object.entries(value.stats)) {
      push(errors, Number.isInteger(count) && count >= 0, `${label}.stats.${key}: must be nonnegative integer`);
    }
  }
  return errors;
}

function validateNodeManifestLoaderPlan(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing loader plan object`];
  push(errors, /runtime fetch plan/i.test(String(value.purpose || '')), `${label}.purpose: missing runtime fetch plan purpose`);
  push(errors, value.source === 'app/data/nodes/node-load-plan.json', `${label}.source: must point to node-load-plan`);
  if (!isObject(value.integrity)) errors.push(`${label}.integrity: missing object`);
  else {
    push(errors, value.integrity.algorithm === 'sha256', `${label}.integrity.algorithm: must be sha256`);
    push(errors, isString(value.integrity.cacheKey), `${label}.integrity.cacheKey: missing cache key`);
    push(errors, isString(value.integrity.validate), `${label}.integrity.validate: missing validate policy`);
    push(errors, isString(value.integrity.retry), `${label}.integrity.retry: missing retry policy`);
    push(errors, isString(value.integrity.fallback), `${label}.integrity.fallback: missing fallback policy`);
  }
  if (!Array.isArray(value.stages) || !value.stages.length) errors.push(`${label}.stages: missing non-empty array`);
  else value.stages.forEach((stage, i) => {
    const at = `${label}.stages[${i}]`;
    if (!isObject(stage)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, Number.isInteger(stage.step) && stage.step === i + 1, `${at}.step: must be sequential`);
    push(errors, /^[a-z0-9-]+$/.test(String(stage.id || '')), `${at}.id: invalid id`);
    push(errors, isString(stage.label), `${at}.label: missing label`);
    push(errors, isString(stage.loadHint), `${at}.loadHint: missing loadHint`);
    push(errors, typeof stage.runtime === 'boolean', `${at}.runtime: must be boolean`);
    push(errors, isString(stage.trigger), `${at}.trigger: missing trigger`);
    push(errors, isString(stage.failureMode), `${at}.failureMode: missing failure mode`);
    if (stage.bytes != null) push(errors, Number.isInteger(stage.bytes) && stage.bytes >= 0, `${at}.bytes: must be nonnegative integer`);
    if (!Array.isArray(stage.files) || !stage.files.length) {
      errors.push(`${at}.files: missing non-empty array`);
    } else {
      stage.files.forEach((file, j) => {
        const fat = `${at}.files[${j}]`;
        if (!isObject(file)) {
          errors.push(`${fat}: must be object`);
          return;
        }
        push(errors, /^[a-z0-9-]+\.json$/.test(String(file.file || '')), `${fat}.file: invalid file`);
        push(errors, isString(file.type), `${fat}.type: missing type`);
        push(errors, isString(file.loadHint), `${fat}.loadHint: missing loadHint`);
        if (file.file === 'manifest.json') {
          push(errors, file.type === 'manifest', `${fat}.type: manifest self-entry must use manifest type`);
          push(errors, file.integrity === 'self-unhashed', `${fat}.integrity: manifest self-entry must be self-unhashed`);
          push(errors, file.cacheKey === null, `${fat}.cacheKey: manifest self-entry cacheKey must be null`);
          push(errors, file.sha256 == null, `${fat}.sha256: manifest self-entry must not carry sha256`);
        } else {
          push(errors, Number.isInteger(file.bytes) && file.bytes > 0, `${fat}.bytes: must be positive integer`);
          push(errors, SHA256.test(String(file.sha256 || '')), `${fat}.sha256: invalid sha256`);
          push(errors, file.cacheKey === `${file.file}:${file.sha256}`, `${fat}.cacheKey: must be file:sha256`);
        }
      });
    }
  });
  if (!isObject(value.totals)) errors.push(`${label}.totals: missing object`);
  else {
    for (const [key, count] of Object.entries(value.totals)) {
      push(errors, Number.isInteger(count) && count >= 0, `${label}.totals.${key}: must be nonnegative integer`);
    }
  }
  return errors;
}

function validateNodeManifest(value, label = 'node-manifest') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'ovs-node-manifest', `${label}: wrong format`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  push(errors, DATE.test(String(value.built || '')), `${label}.built: must be YYYY-MM-DD`);
  push(errors, isString(value.source), `${label}.source: missing source`);
  push(errors, isString(value.appLaneNote), `${label}.appLaneNote: missing app lane note`);
  if (!isObject(value.integrity)) errors.push(`${label}.integrity: missing object`);
  else {
    push(errors, value.integrity.algorithm === 'sha256', `${label}.integrity.algorithm: must be sha256`);
    push(errors, isString(value.integrity.scope), `${label}.integrity.scope: missing scope`);
  }
  push(errors, Array.isArray(value.loadOrder) && value.loadOrder.length > 0, `${label}.loadOrder: missing non-empty array`);
  if (!Array.isArray(value.indexes) || !value.indexes.length) errors.push(`${label}.indexes: missing non-empty array`);
  else value.indexes.forEach((entry, i) => {
    const at = `${label}.indexes[${i}]`;
    if (!isObject(entry)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, isString(entry.type), `${at}.type: missing type`);
    push(errors, /^[a-z0-9-]+\.json$/.test(String(entry.file || '')), `${at}.file: invalid file`);
    push(errors, FORMAT_ID.test(String(entry.format || '')), `${at}.format: invalid format`);
    push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(entry.version || '')), `${at}.version: must start with 0.1`);
    push(errors, DATE.test(String(entry.built || '')), `${at}.built: must be YYYY-MM-DD`);
    push(errors, Number.isInteger(entry.bytes) && entry.bytes > 0, `${at}.bytes: must be positive integer`);
    push(errors, SHA256.test(String(entry.sha256 || '')), `${at}.sha256: invalid sha256`);
    push(errors, isString(entry.loadHint), `${at}.loadHint: missing loadHint`);
  });
  errors.push(...validateNodeManifestLoaderPlan(value.loaderPlan, `${label}.loaderPlan`));
  if (!isObject(value.totals)) errors.push(`${label}.totals: missing object`);
  return errors;
}

function validateSourceField(value, label) {
  const errors = [];
  if (isString(value)) return errors;
  if (!Array.isArray(value) || !value.length) return [`${label}: missing source`];
  value.forEach((item, i) => push(errors, isString(item), `${label}[${i}]: must be non-empty string`));
  return errors;
}

function validateContractEnvelope(value, label, format, options = {}) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === format, `${label}: wrong format`);
  push(errors, /^0\.1(?:\.0)?(?:[-+].*)?$/.test(String(value.version || '')), `${label}: version must start with 0.1`);
  push(errors, DATE.test(String(value.built || '')), `${label}.built: must be YYYY-MM-DD`);
  errors.push(...validateSourceField(value.source, `${label}.source`));
  if (options.purpose !== false) push(errors, isString(value.purpose), `${label}.purpose: missing purpose`);
  if (options.appLaneNote) push(errors, isString(value.appLaneNote), `${label}.appLaneNote: missing app lane note`);
  return errors;
}

function validateStringArray(value, label, options = {}) {
  const errors = [];
  if (!Array.isArray(value) || (!options.allowEmpty && !value.length)) return [`${label}: missing non-empty array`];
  value.forEach((item, i) => push(errors, isString(item), `${label}[${i}]: must be non-empty string`));
  return errors;
}

function validateObjectCounts(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing object`];
  for (const [key, count] of Object.entries(value)) {
    if (Number.isInteger(count)) push(errors, count >= 0, `${label}.${key}: must be nonnegative`);
  }
  return errors;
}

function validateAskHit(value, label, options = {}) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be object`];
  push(errors, OVS_ANY_ID.test(String(value.id || '')), `${label}.id: invalid Open Values id`);
  push(errors, isString(value.label), `${label}.label: missing label`);
  if (options.requireType !== false) push(errors, isString(value.type), `${label}.type: missing type`);
  push(errors, isString(value.hash) && ROUTE_HASH.test(value.hash), `${label}.hash: missing route hash`);
  if (value.route != null) push(errors, isString(value.route), `${label}.route: missing route`);
  if (value.score != null) push(errors, Number.isFinite(value.score), `${label}.score: must be numeric`);
  push(errors, isString(value.reason), `${label}.reason: missing reason`);
  if (value.key != null) push(errors, isString(value.key), `${label}.key: missing key`);
  return errors;
}

function validateAskOrderingAssertion(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be object`];
  push(errors, isString(value.id), `${label}.id: missing id`);
  push(errors, isString(value.winnerReason), `${label}.winnerReason: missing winner reason`);
  push(errors, isString(value.loserReason), `${label}.loserReason: missing loser reason`);
  if (value.note != null) push(errors, isString(value.note), `${label}.note: missing note`);
  for (const [field, values] of Object.entries({ winnerAny: value.winnerAny, loserAny: value.loserAny })) {
    if (values == null) continue;
    if (!Array.isArray(values)) {
      errors.push(`${label}.${field}: must be array`);
      continue;
    }
    values.forEach((id, i) => push(errors, OVS_ANY_ID.test(String(id || '')), `${label}.${field}[${i}]: invalid target`));
  }
  return errors;
}

function validateAskOrderingCheck(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be object`];
  push(errors, isString(value.id), `${label}.id: missing id`);
  push(errors, isString(value.winnerReason), `${label}.winnerReason: missing winner reason`);
  push(errors, isString(value.loserReason), `${label}.loserReason: missing loser reason`);
  if (value.note != null) push(errors, isString(value.note), `${label}.note: missing note`);
  push(errors, value.winnerRank == null || (Number.isInteger(value.winnerRank) && value.winnerRank >= 1), `${label}.winnerRank: invalid winner rank`);
  push(errors, value.loserRank == null || (Number.isInteger(value.loserRank) && value.loserRank >= 1), `${label}.loserRank: invalid loser rank`);
  push(errors, typeof value.ok === 'boolean', `${label}.ok: must be boolean`);
  return errors;
}

function validateAskFixtures(value, label = 'ask-fixtures') {
  const errors = validateContractEnvelope(value, label, 'ovs-ask-fixtures');
  if (errors.length && !isObject(value)) return errors;
  errors.push(...validateStringArray(value.resolverOrder, `${label}.resolverOrder`));
  if (!Array.isArray(value.layers) || !value.layers.length) errors.push(`${label}.layers: missing non-empty array`);
  else value.layers.forEach((layer, i) => {
    const at = `${label}.layers[${i}]`;
    if (!isObject(layer)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, layer.layer === 'core' || layer.layer === 'full', `${at}.layer: must be core or full`);
    push(errors, /^[A-Za-z0-9._/-]+\.json$/.test(String(layer.file || '')), `${at}.file: invalid json file`);
    push(errors, isString(layer.use), `${at}.use: missing use`);
  });
  if (!Array.isArray(value.cases) || !value.cases.length) errors.push(`${label}.cases: missing non-empty array`);
  else value.cases.forEach((test, i) => {
    const at = `${label}.cases[${i}]`;
    if (!isObject(test)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, isString(test.query), `${at}.query: missing query`);
    push(errors, isString(test.normalized), `${at}.normalized: missing normalized`);
    push(errors, test.layer === 'core' || test.layer === 'full', `${at}.layer: must be core or full`);
    if (!Array.isArray(test.expectAny) || !test.expectAny.length) errors.push(`${at}.expectAny: missing non-empty array`);
    else test.expectAny.forEach((id, t) => push(errors, OVS_ANY_ID.test(String(id || '')), `${at}.expectAny[${t}]: invalid target`));
    if (test.expectOneInTop != null) push(errors, Number.isInteger(test.expectOneInTop) && test.expectOneInTop >= 1, `${at}.expectOneInTop: must be positive integer`);
    if (test.orderingAssertions != null) {
      if (!Array.isArray(test.orderingAssertions)) errors.push(`${at}.orderingAssertions: must be array`);
      else test.orderingAssertions.forEach((assertion, t) => errors.push(...validateAskOrderingAssertion(assertion, `${at}.orderingAssertions[${t}]`)));
    }
  });
  return errors;
}

function validateAskTraces(value, label = 'ask-traces') {
  const errors = validateContractEnvelope(value, label, 'ovs-ask-traces');
  if (errors.length && !isObject(value)) return errors;
  push(errors, isString(value.resolverModel), `${label}.resolverModel: missing resolver model`);
  if (!Array.isArray(value.traces) || !value.traces.length) errors.push(`${label}.traces: missing non-empty array`);
  else value.traces.forEach((trace, i) => {
    const at = `${label}.traces[${i}]`;
    if (!isObject(trace)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, isString(trace.query), `${at}.query: missing query`);
    push(errors, isString(trace.normalized), `${at}.normalized: missing normalized`);
    push(errors, trace.layer === 'core' || trace.layer === 'full', `${at}.layer: must be core or full`);
    if (!Array.isArray(trace.expectAny) || !trace.expectAny.length) errors.push(`${at}.expectAny: missing non-empty array`);
    else trace.expectAny.forEach((id, t) => push(errors, OVS_ANY_ID.test(String(id || '')), `${at}.expectAny[${t}]: invalid target`));
    push(errors, trace.matched == null || OVS_ANY_ID.test(String(trace.matched)), `${at}.matched: invalid matched target`);
    push(errors, trace.matchedRank == null || (Number.isInteger(trace.matchedRank) && trace.matchedRank >= 1), `${at}.matchedRank: invalid matched rank`);
    if (trace.orderingAssertions != null) {
      if (!Array.isArray(trace.orderingAssertions)) errors.push(`${at}.orderingAssertions: must be array`);
      else trace.orderingAssertions.forEach((assertion, t) => errors.push(...validateAskOrderingAssertion(assertion, `${at}.orderingAssertions[${t}]`)));
    }
    if (trace.orderingChecks != null) {
      if (!Array.isArray(trace.orderingChecks)) errors.push(`${at}.orderingChecks: must be array`);
      else trace.orderingChecks.forEach((check, c) => errors.push(...validateAskOrderingCheck(check, `${at}.orderingChecks[${c}]`)));
    }
    push(errors, typeof trace.ok === 'boolean', `${at}.ok: must be boolean`);
    if (!Array.isArray(trace.top) || !trace.top.length) errors.push(`${at}.top: missing non-empty array`);
    else trace.top.forEach((hit, h) => errors.push(...validateAskHit(hit, `${at}.top[${h}]`)));
  });
  return errors;
}

function validateAskPresentation(value, label = 'ask-presentation-contract') {
  const errors = validateContractEnvelope(value, label, 'ovs-ask-presentation-contract', { appLaneNote: true });
  if (errors.length && !isObject(value)) return errors;
  const sections = new Set();
  if (!Array.isArray(value.resultSections) || !value.resultSections.length) errors.push(`${label}.resultSections: missing non-empty array`);
  else value.resultSections.forEach((section, i) => {
    const at = `${label}.resultSections[${i}]`;
    if (!isObject(section)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, isString(section.id), `${at}.id: missing id`);
    sections.add(section.id);
    push(errors, isString(section.label), `${at}.label: missing label`);
    errors.push(...validateStringArray(section.layers, `${at}.layers`));
    errors.push(...validateStringArray(section.targetTypes, `${at}.targetTypes`));
    push(errors, Number.isInteger(section.maxItems) && section.maxItems >= 1, `${at}.maxItems: must be positive integer`);
  });
  for (const required of ['places', 'entries']) push(errors, sections.has(required), `${label}.resultSections: missing ${required}`);
  const expectedTypes = ['category', 'guide', 'brand', 'company', 'tag', 'line', 'errand', 'item'];
  if (!isObject(value.typeCopy)) errors.push(`${label}.typeCopy: missing object`);
  else expectedTypes.forEach(type => {
    const copy = value.typeCopy[type];
    if (!isObject(copy)) errors.push(`${label}.typeCopy.${type}: missing object`);
    else {
      push(errors, isString(copy.badge), `${label}.typeCopy.${type}.badge: missing badge`);
      push(errors, isString(copy.action), `${label}.typeCopy.${type}.action: missing action`);
      push(errors, isString(copy.route) && copy.route.startsWith('#'), `${label}.typeCopy.${type}.route: missing route`);
    }
  });
  if (!isObject(value.matchReasons)) errors.push(`${label}.matchReasons: missing object`);
  else ['alias', 'exact', 'query-token', 'fuzzy-1', 'token-containment'].forEach(reason => push(errors, isString(value.matchReasons[reason]), `${label}.matchReasons.${reason}: missing copy`));
  if (!isObject(value.emptyState)) errors.push(`${label}.emptyState: missing object`);
  else {
    push(errors, isString(value.emptyState.primary) && ROUTE_HASH.test(value.emptyState.primary), `${label}.emptyState.primary: missing route hash`);
    push(errors, isString(value.emptyState.secondary) && ROUTE_HASH.test(value.emptyState.secondary), `${label}.emptyState.secondary: missing route hash`);
  }
  if (!Array.isArray(value.qaCases) || !value.qaCases.length) errors.push(`${label}.qaCases: missing non-empty array`);
  else value.qaCases.forEach((test, i) => {
    const at = `${label}.qaCases[${i}]`;
    if (!isObject(test)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, isString(test.query), `${at}.query: missing query`);
    push(errors, isString(test.section), `${at}.section: missing section`);
    push(errors, isString(test.expectFirstHash) && ROUTE_HASH.test(test.expectFirstHash), `${at}.expectFirstHash: missing route hash`);
    push(errors, isString(test.expectMatchedHash) && ROUTE_HASH.test(test.expectMatchedHash), `${at}.expectMatchedHash: missing route hash`);
    if (test.orderingChecks != null) {
      if (!Array.isArray(test.orderingChecks)) errors.push(`${at}.orderingChecks: must be array`);
      else test.orderingChecks.forEach((check, c) => errors.push(...validateAskOrderingCheck(check, `${at}.orderingChecks[${c}]`)));
    }
    push(errors, typeof test.ok === 'boolean', `${at}.ok: must be boolean`);
  });
  return errors;
}

function validatePublicGates(value, label = 'publicGates') {
  const errors = [];
  if (!isObject(value)) {
    errors.push(`${label}: missing object`);
    return errors;
  }
  push(errors, value.status === 'ready-for-app-public-gates', `${label}.status: must be ready-for-app-public-gates`);
  push(errors, isString(value.namedConsumer), `${label}.namedConsumer: missing named consumer`);
  push(errors, isString(value.voiceSource), `${label}.voiceSource: missing voice source`);
  push(errors, isString(value.rule), `${label}.rule: missing rule`);
  errors.push(...validateStringArray(value.appOwnedBeforePublic, `${label}.appOwnedBeforePublic`));
  const surfaceById = new Map();
  if (!Array.isArray(value.surfaces) || !value.surfaces.length) errors.push(`${label}.surfaces: missing non-empty array`);
  else {
    const ids = new Set();
    value.surfaces.forEach((surface, i) => {
      const at = `${label}.surfaces[${i}]`;
      if (!isObject(surface)) {
        errors.push(`${at}: must be object`);
        return;
      }
      push(errors, /^[a-z0-9-]+$/.test(String(surface.id || '')), `${at}.id: invalid id`);
      if (ids.has(surface.id)) errors.push(`${at}.id: duplicate ${surface.id}`);
      ids.add(surface.id);
      if (isString(surface.id)) surfaceById.set(surface.id, surface);
      push(errors, isString(surface.label), `${at}.label: missing label`);
      push(errors, surface.owner === 'app/design', `${at}.owner: must be app/design`);
      push(errors, surface.status === 'voice-signed-app-gate', `${at}.status: must be voice-signed-app-gate`);
      push(errors, isString(surface.proseClass), `${at}.proseClass: missing prose class`);
      errors.push(...validateStringArray(surface.sourceFiles, `${at}.sourceFiles`));
      if (!isObject(surface.voice)) errors.push(`${at}.voice: missing object`);
      else {
        push(errors, ['signed', 'minimal-generated-copy'].includes(surface.voice.status), `${at}.voice.status: invalid status`);
        push(errors, DATE.test(String(surface.voice.signedAt || '')), `${at}.voice.signedAt: must be YYYY-MM-DD`);
        push(errors, isString(surface.voice.signoffBlock), `${at}.voice.signoffBlock: missing signoff block`);
        push(errors, Number.isInteger(surface.voice.pilotSamples) && surface.voice.pilotSamples >= 0, `${at}.voice.pilotSamples: invalid count`);
      }
      if (surface.generatedCount != null) push(errors, Number.isInteger(surface.generatedCount) && surface.generatedCount >= 0, `${at}.generatedCount: invalid count`);
      push(errors, isString(surface.appOwnedGate), `${at}.appOwnedGate: missing app-owned gate`);
      errors.push(...validateStringArray(surface.mustNot, `${at}.mustNot`));
    });
  }
  errors.push(...validatePublicGateReleaseContract(value.releaseContract, `${label}.releaseContract`, surfaceById, value.voiceSource));
  return errors;
}

function validatePublicGateReleaseContract(value, label, surfaceById = new Map(), voiceSource = '') {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing release contract object`];
  push(errors, /public release contract/i.test(String(value.purpose || '')), `${label}.purpose: missing public release purpose`);
  push(errors, value.status === 'ready-for-app-public-gates', `${label}.status: must be ready-for-app-public-gates`);
  push(errors, isString(value.namedConsumer), `${label}.namedConsumer: missing named consumer`);
  push(errors, isString(value.releaseRule) && /one surface/i.test(value.releaseRule), `${label}.releaseRule: must name one-surface release rule`);
  push(errors, value.voiceSource === voiceSource, `${label}.voiceSource: must match publicGates voiceSource`);
  errors.push(...validateStringArray(value.sharedEvidenceRequired, `${label}.sharedEvidenceRequired`));
  push(errors, isString(value.rollbackRule), `${label}.rollbackRule: missing rollback rule`);

  const covered = new Map();
  if (!Array.isArray(value.releaseOrder) || !value.releaseOrder.length) errors.push(`${label}.releaseOrder: missing non-empty array`);
  else value.releaseOrder.forEach((step, i) => {
    const at = `${label}.releaseOrder[${i}]`;
    if (!isObject(step)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, step.step === i + 1, `${at}.step: must be sequential`);
    push(errors, /^[a-z0-9-]+$/.test(String(step.surfaceId || '')), `${at}.surfaceId: invalid id`);
    const surface = surfaceById.get(step.surfaceId);
    push(errors, !!surface, `${at}.surfaceId: unknown surface ${step.surfaceId}`);
    if (surface) {
      push(errors, step.label === surface.label, `${at}.label: must match surface label`);
      push(errors, step.voiceStatus === surface.voice?.status, `${at}.voiceStatus: must match surface voice status`);
    }
    errors.push(...validateStringArray(step.sourceFiles, `${at}.sourceFiles`));
    errors.push(...validateStringArray(step.evidenceRequired, `${at}.evidenceRequired`));
    errors.push(...validateStringArray(step.releaseWhen, `${at}.releaseWhen`));
    errors.push(...validateStringArray(step.mustNot, `${at}.mustNot`));
    covered.set(step.surfaceId, (covered.get(step.surfaceId) || 0) + 1);
  });
  for (const id of surfaceById.keys()) push(errors, covered.get(id) === 1, `${label}.releaseOrder: surface ${id} must be covered exactly once`);

  if (!isObject(value.coverage)) errors.push(`${label}.coverage: missing object`);
  else {
    push(errors, value.coverage.surfaces === surfaceById.size, `${label}.coverage.surfaces: mismatch`);
    push(errors, value.coverage.releaseSteps === (value.releaseOrder || []).length, `${label}.coverage.releaseSteps: mismatch`);
    push(errors, value.coverage.allSurfacesCovered === true, `${label}.coverage.allSurfacesCovered: must be true`);
    errors.push(...validateStringArray(value.coverage.minimalGeneratedCopy, `${label}.coverage.minimalGeneratedCopy`, { allowEmpty: true }));
    errors.push(...validateStringArray(value.coverage.signedSurfaces, `${label}.coverage.signedSurfaces`, { allowEmpty: true }));
    for (const id of value.coverage.minimalGeneratedCopy || []) push(errors, surfaceById.get(id)?.voice?.status === 'minimal-generated-copy', `${label}.coverage.minimalGeneratedCopy: ${id} is not minimal-generated-copy`);
    for (const id of value.coverage.signedSurfaces || []) push(errors, surfaceById.get(id)?.voice?.status === 'signed', `${label}.coverage.signedSurfaces: ${id} is not signed`);
  }
  return errors;
}

function validateH4DrainContract(value, label = 'h4DrainContract', options = {}) {
  const errors = [];
  const knownPhaseIds = options.phaseIds instanceof Set ? options.phaseIds : null;
  if (!isObject(value)) return [`${label}: missing H4 drain contract object`];
  push(errors, /H4 drain/i.test(String(value.purpose || '')), `${label}.purpose: missing H4 drain purpose`);
  push(errors, value.status === 'pending-app-integration', `${label}.status: must remain pending-app-integration`);
  push(errors, value.activeHandoff === 'H4', `${label}.activeHandoff: must be H4`);
  push(errors, isString(value.namedConsumer), `${label}.namedConsumer: missing named consumer`);
  push(errors, value.h4DrainableFromDataAlone === false, `${label}.h4DrainableFromDataAlone: must be false`);
  push(errors, isString(value.drainRule) && /app-owned|generated data alone/i.test(value.drainRule), `${label}.drainRule: must name app-owned/data-alone boundary`);

  const coveredPhases = new Set();
  const stepIds = new Set();
  if (!Array.isArray(value.steps) || !value.steps.length) errors.push(`${label}.steps: missing non-empty array`);
  else value.steps.forEach((step, i) => {
    const at = `${label}.steps[${i}]`;
    if (!isObject(step)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, step.step === i + 1, `${at}.step: must be sequential`);
    push(errors, KEBAB.test(String(step.id || '')), `${at}.id: invalid id`);
    if (stepIds.has(step.id)) errors.push(`${at}.id: duplicate ${step.id}`);
    stepIds.add(step.id);
    push(errors, isString(step.label), `${at}.label: missing label`);
    if (!Array.isArray(step.phaseIds) || !step.phaseIds.length) errors.push(`${at}.phaseIds: missing non-empty array`);
    else step.phaseIds.forEach((phaseId, p) => {
      push(errors, KEBAB.test(String(phaseId || '')), `${at}.phaseIds[${p}]: invalid phase id`);
      if (knownPhaseIds) push(errors, knownPhaseIds.has(phaseId), `${at}.phaseIds[${p}]: unknown phase ${phaseId}`);
      coveredPhases.add(phaseId);
    });
    errors.push(...validateStringArray(step.sourceFiles, `${at}.sourceFiles`));
    push(errors, isString(step.contractPointer) && step.contractPointer.includes('#'), `${at}.contractPointer: must include file#pointer`);
    errors.push(...validateStringArray(step.appOwnedEvidence, `${at}.appOwnedEvidence`));
    errors.push(...validateStringArray(step.passWhen, `${at}.passWhen`));
    errors.push(...validateStringArray(step.mustNot, `${at}.mustNot`));
  });
  if (knownPhaseIds) for (const id of knownPhaseIds) push(errors, coveredPhases.has(id), `${label}.steps: missing phase coverage for ${id}`);

  if (!isObject(value.finalDecision)) errors.push(`${label}.finalDecision: missing object`);
  else {
    push(errors, value.finalDecision.expectedStatusBeforeAppWork === 'pending-app-integration', `${label}.finalDecision.expectedStatusBeforeAppWork: wrong status`);
    push(errors, value.finalDecision.dataAloneIsInsufficient === true, `${label}.finalDecision.dataAloneIsInsufficient: must be true`);
    errors.push(...validateStringArray(value.finalDecision.drainOnlyWhen, `${label}.finalDecision.drainOnlyWhen`));
    errors.push(...validateStringArray(value.finalDecision.mustNot, `${label}.finalDecision.mustNot`));
  }

  if (!isObject(value.coverage)) errors.push(`${label}.coverage: missing object`);
  else {
    push(errors, value.coverage.steps === (value.steps || []).length, `${label}.coverage.steps: mismatch`);
    if (knownPhaseIds) {
      push(errors, value.coverage.phaseCount === knownPhaseIds.size, `${label}.coverage.phaseCount: mismatch`);
      push(errors, value.coverage.coveredPhaseCount === knownPhaseIds.size, `${label}.coverage.coveredPhaseCount: mismatch`);
    } else {
      push(errors, Number.isInteger(value.coverage.phaseCount) && value.coverage.phaseCount >= 1, `${label}.coverage.phaseCount: invalid count`);
      push(errors, Number.isInteger(value.coverage.coveredPhaseCount) && value.coverage.coveredPhaseCount >= 1, `${label}.coverage.coveredPhaseCount: invalid count`);
    }
    push(errors, value.coverage.allPhasesCovered === true, `${label}.coverage.allPhasesCovered: must be true`);
    push(errors, Number.isInteger(value.coverage.previewScenarios) && value.coverage.previewScenarios >= 0, `${label}.coverage.previewScenarios: invalid count`);
    push(errors, Number.isInteger(value.coverage.publicGateSurfaces) && value.coverage.publicGateSurfaces >= 0, `${label}.coverage.publicGateSurfaces: invalid count`);
    push(errors, value.coverage.dataAloneDrainable === false, `${label}.coverage.dataAloneDrainable: must be false`);
    push(errors, isString(value.coverage.finalStepId) && stepIds.has(value.coverage.finalStepId), `${label}.coverage.finalStepId: must name a step id`);
  }
  return errors;
}

function validateNodeReadiness(value, label = 'node-readiness') {
  const errors = validateContractEnvelope(value, label, 'ovs-node-readiness', { appLaneNote: true, purpose: false });
  if (errors.length && !isObject(value)) return errors;
  push(errors, value.status === 'ready-for-app-integration', `${label}.status: wrong status`);
  if (!Array.isArray(value.runtimePlan) || !value.runtimePlan.length) errors.push(`${label}.runtimePlan: missing non-empty array`);
  else value.runtimePlan.forEach((step, i) => {
    const at = `${label}.runtimePlan[${i}]`;
    if (!isObject(step)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, Number.isInteger(step.step) && step.step >= 1, `${at}.step: must be positive integer`);
    push(errors, isString(step.purpose), `${at}.purpose: missing purpose`);
    if (step.file != null) push(errors, isString(step.file), `${at}.file: missing file`);
    if (step.files != null) errors.push(...validateStringArray(step.files, `${at}.files`, { allowEmpty: true }));
  });
  if (!Array.isArray(value.devContracts) || !value.devContracts.length) errors.push(`${label}.devContracts: missing non-empty array`);
  else value.devContracts.forEach((contract, i) => {
    const at = `${label}.devContracts[${i}]`;
    if (!isObject(contract)) errors.push(`${at}: must be object`);
    else {
      push(errors, isString(contract.file), `${at}.file: missing file`);
      push(errors, isString(contract.purpose), `${at}.purpose: missing purpose`);
    }
  });
  if (!isObject(value.routeContract)) errors.push(`${label}.routeContract: missing object`);
  else ['category', 'guide', 'item', 'node'].forEach(route => push(errors, isString(value.routeContract[route]) && value.routeContract[route].startsWith('#'), `${label}.routeContract.${route}: missing hash pattern`));
  errors.push(...validateObjectCounts(value.counts, `${label}.counts`));
  errors.push(...validateObjectCounts(value.budgets, `${label}.budgets`));
  errors.push(...validatePublicGates(value.publicGates, `${label}.publicGates`));
  errors.push(...validateH4DrainContract(value.h4DrainContract, `${label}.h4DrainContract`));
  if (!Array.isArray(value.goldenQueries) || !value.goldenQueries.length) errors.push(`${label}.goldenQueries: missing non-empty array`);
  return errors;
}

function validateNodeWalkthroughs(value, label = 'node-walkthroughs') {
  const errors = validateContractEnvelope(value, label, 'ovs-node-walkthroughs', { appLaneNote: true });
  if (errors.length && !isObject(value)) return errors;
  if (!Array.isArray(value.walkthroughs) || !value.walkthroughs.length) errors.push(`${label}.walkthroughs: missing non-empty array`);
  const ids = new Set();
  if (Array.isArray(value.walkthroughs)) value.walkthroughs.forEach((walkthrough, i) => {
    const at = `${label}.walkthroughs[${i}]`;
    if (!isObject(walkthrough)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, /^[a-z0-9-]+$/.test(String(walkthrough.id || '')), `${at}.id: invalid id`);
    if (ids.has(walkthrough.id)) errors.push(`${at}.id: duplicate ${walkthrough.id}`);
    ids.add(walkthrough.id);
    push(errors, isString(walkthrough.label), `${at}.label: missing label`);
    push(errors, isString(walkthrough.query), `${at}.query: missing query`);
    if (!isObject(walkthrough.expected)) errors.push(`${at}.expected: missing object`);
    else {
      push(errors, OVS_ANY_ID.test(String(walkthrough.expected.company || '')), `${at}.expected.company: invalid company`);
      push(errors, OVS_ANY_ID.test(String(walkthrough.expected.line || '')), `${at}.expected.line: invalid line`);
      if (!Array.isArray(walkthrough.expected.brands) || !walkthrough.expected.brands.length) errors.push(`${at}.expected.brands: missing non-empty array`);
      else walkthrough.expected.brands.forEach((brand, b) => push(errors, OVS_ANY_ID.test(String(brand || '')), `${at}.expected.brands[${b}]: invalid brand`));
    }
    if (!Array.isArray(walkthrough.askTop) || !walkthrough.askTop.length) errors.push(`${at}.askTop: missing non-empty array`);
    else walkthrough.askTop.forEach((hit, h) => errors.push(...validateAskHit(hit, `${at}.askTop[${h}]`, { requireType: false })));
    push(errors, OVS_ANY_ID.test(String(walkthrough.matchedTop || '')), `${at}.matchedTop: invalid target`);
    push(errors, isObject(walkthrough.pages), `${at}.pages: missing object`);
    if (!isObject(walkthrough.checks)) errors.push(`${at}.checks: missing object`);
    else Object.entries(walkthrough.checks).forEach(([key, ok]) => push(errors, ok === true, `${at}.checks.${key}: must be true`));
  });
  return errors;
}

function validateNodePageContracts(value, label = 'node-page-contracts') {
  const errors = validateContractEnvelope(value, label, 'ovs-node-page-contracts', { appLaneNote: true });
  if (errors.length && !isObject(value)) return errors;
  if (!Array.isArray(value.contracts) || !value.contracts.length) errors.push(`${label}.contracts: missing non-empty array`);
  const types = new Set();
  if (Array.isArray(value.contracts)) value.contracts.forEach((contract, i) => {
    const at = `${label}.contracts[${i}]`;
    if (!isObject(contract)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, isString(contract.type), `${at}.type: missing type`);
    if (types.has(contract.type)) errors.push(`${at}.type: duplicate ${contract.type}`);
    types.add(contract.type);
    push(errors, isString(contract.routePattern) && contract.routePattern.startsWith('#'), `${at}.routePattern: missing route pattern`);
    push(errors, isString(contract.source), `${at}.source: missing source`);
    errors.push(...validateStringArray(contract.requiredFields, `${at}.requiredFields`));
    errors.push(...validateStringArray(contract.sections, `${at}.sections`));
    if (!Array.isArray(contract.examples) || !contract.examples.length) errors.push(`${at}.examples: missing non-empty array`);
    else contract.examples.forEach((example, e) => {
      const exAt = `${at}.examples[${e}]`;
      if (!isObject(example)) errors.push(`${exAt}: must be object`);
      else {
        push(errors, OVS_ANY_ID.test(String(example.id || '')), `${exAt}.id: invalid id`);
        push(errors, isString(example.label), `${exAt}.label: missing label`);
        push(errors, isString(example.hash) && ROUTE_HASH.test(example.hash), `${exAt}.hash: missing route hash`);
      }
    });
  });
  errors.push(...validateObjectCounts(value.totals, `${label}.totals`));
  return errors;
}

function validateNodeRouteFixtures(value, label = 'node-route-fixtures') {
  const errors = validateContractEnvelope(value, label, 'ovs-node-route-fixtures', { appLaneNote: true });
  if (errors.length && !isObject(value)) return errors;
  push(errors, isObject(value.parserRules), `${label}.parserRules: missing object`);
  if (!Array.isArray(value.cases) || !value.cases.length) errors.push(`${label}.cases: missing non-empty array`);
  else value.cases.forEach((test, i) => {
    const at = `${label}.cases[${i}]`;
    if (!isObject(test)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, /^[a-z0-9-]+$/.test(String(test.id || '')), `${at}.id: invalid id`);
    push(errors, isString(test.type), `${at}.type: missing type`);
    push(errors, isString(test.label), `${at}.label: missing label`);
    push(errors, isString(test.hash) && ROUTE_HASH.test(test.hash), `${at}.hash: missing route hash`);
    if (!isObject(test.expect)) errors.push(`${at}.expect: missing object`);
    else {
      push(errors, isString(test.expect.route), `${at}.expect.route: missing route`);
      push(errors, isString(test.expect.type), `${at}.expect.type: missing type`);
      push(errors, OVS_ANY_ID.test(String(test.expect.id || '')), `${at}.expect.id: invalid Open Values id`);
      push(errors, isObject(test.expect.params), `${at}.expect.params: missing params`);
    }
  });
  errors.push(...validateObjectCounts(value.totals, `${label}.totals`));
  return errors;
}

function validateNodeRouteGuardrails(value, label = 'node-route-guardrails') {
  const errors = validateContractEnvelope(value, label, 'ovs-node-route-guardrails', { appLaneNote: true });
  if (errors.length && !isObject(value)) return errors;
  push(errors, isObject(value.fallbackGuidance), `${label}.fallbackGuidance: missing object`);
  const kinds = new Set(['malformed', 'unsupported', 'unknown-target', 'canonicalize']);
  if (!Array.isArray(value.cases) || !value.cases.length) errors.push(`${label}.cases: missing non-empty array`);
  else value.cases.forEach((test, i) => {
    const at = `${label}.cases[${i}]`;
    if (!isObject(test)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, /^[a-z0-9-]+$/.test(String(test.id || '')), `${at}.id: invalid id`);
    push(errors, kinds.has(test.kind), `${at}.kind: unknown kind ${test.kind}`);
    push(errors, typeof test.hash === 'string', `${at}.hash: missing hash string`);
    push(errors, isString(test.reason), `${at}.reason: missing reason`);
    if (!isObject(test.expect)) errors.push(`${at}.expect: missing object`);
    else {
      push(errors, typeof test.expect.parseable === 'boolean', `${at}.expect.parseable: must be boolean`);
      push(errors, typeof test.expect.targetExists === 'boolean', `${at}.expect.targetExists: must be boolean`);
      push(errors, test.expect.canonicalHash === null || (isString(test.expect.canonicalHash) && ROUTE_HASH.test(test.expect.canonicalHash)), `${at}.expect.canonicalHash: must be null or route hash`);
      if (test.kind === 'canonicalize') push(errors, isString(test.expect.canonicalHash) && ROUTE_HASH.test(test.expect.canonicalHash), `${at}.expect.canonicalHash: canonicalize cases need a route hash`);
    }
  });
  errors.push(...validateObjectCounts(value.totals, `${label}.totals`));
  return errors;
}

function validateNodeLoadPlan(value, label = 'node-load-plan') {
  const errors = validateContractEnvelope(value, label, 'ovs-node-load-plan', { appLaneNote: true });
  if (errors.length && !isObject(value)) return errors;
  if (!isObject(value.integrityContract)) errors.push(`${label}.integrityContract: missing object`);
  else {
    push(errors, value.integrityContract.algorithm === 'sha256', `${label}.integrityContract.algorithm: must be sha256`);
    for (const key of ['cacheKey', 'validate', 'retry', 'fallback']) push(errors, isString(value.integrityContract[key]), `${label}.integrityContract.${key}: missing text`);
  }
  errors.push(...validateObjectCounts(value.budgets, `${label}.budgets`));
  if (isObject(value.budgets)) {
    if (value.budgets.startupBudgetBytes != null) push(errors, Number.isInteger(value.budgets.startupBudgetBytes) && value.budgets.startupBudgetBytes > 0, `${label}.budgets.startupBudgetBytes: invalid budget`);
    if (value.budgets.minimumHeadroomBytes != null) push(errors, Number.isInteger(value.budgets.minimumHeadroomBytes) && value.budgets.minimumHeadroomBytes >= 0, `${label}.budgets.minimumHeadroomBytes: invalid headroom`);
  }
  if (!Array.isArray(value.stages) || !value.stages.length) errors.push(`${label}.stages: missing non-empty array`);
  else value.stages.forEach((stage, i) => {
    const at = `${label}.stages[${i}]`;
    if (!isObject(stage)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, /^[a-z0-9-]+$/.test(String(stage.id || '')), `${at}.id: invalid id`);
    push(errors, isString(stage.label), `${at}.label: missing label`);
    push(errors, isString(stage.loadHint), `${at}.loadHint: missing loadHint`);
    errors.push(...validateStringArray(stage.files, `${at}.files`));
    push(errors, isString(stage.trigger), `${at}.trigger: missing trigger`);
    errors.push(...validateStringArray(stage.acceptanceCriteria, `${at}.acceptanceCriteria`));
    push(errors, isString(stage.failureMode), `${at}.failureMode: missing failure mode`);
  });
  errors.push(...validateObjectCounts(value.totals, `${label}.totals`));
  return errors;
}

function validateRuntimeQaContract(value, label, caseIds = new Set(), stages = new Set()) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing qa contract object`];
  push(errors, /runtime QA contract/i.test(String(value.purpose || '')), `${label}.purpose: missing runtime QA purpose`);
  push(errors, value.status === 'pending-app-integration', `${label}.status: must be pending-app-integration`);
  push(errors, value.h4DrainableFromDataAlone === false, `${label}.h4DrainableFromDataAlone: must be false`);
  push(errors, isString(value.drainRule) && /app-owned/i.test(value.drainRule), `${label}.drainRule: must name app-owned drain rule`);

  const covered = new Set();
  const modeIds = new Set();
  if (!Array.isArray(value.modes) || !value.modes.length) errors.push(`${label}.modes: missing non-empty array`);
  else value.modes.forEach((mode, i) => {
    const at = `${label}.modes[${i}]`;
    if (!isObject(mode)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, /^[a-z0-9-]+$/.test(String(mode.id || '')), `${at}.id: invalid id`);
    if (isString(mode.id)) modeIds.add(mode.id);
    push(errors, mode.owner === 'app/design', `${at}.owner: must be app/design`);
    errors.push(...validateStringArray(mode.caseIds, `${at}.caseIds`));
    for (const id of mode.caseIds || []) {
      push(errors, caseIds.has(id), `${at}.caseIds: unknown case id ${id}`);
      covered.add(id);
    }
    errors.push(...validateStringArray(mode.sourceFiles, `${at}.sourceFiles`));
    errors.push(...validateStringArray(mode.passWhen, `${at}.passWhen`));
    errors.push(...validateStringArray(mode.mustNot, `${at}.mustNot`));
  });
  for (const id of caseIds) push(errors, covered.has(id), `${label}.modes: case ${id} is not covered`);

  if (!isObject(value.loadStageCoverage)) errors.push(`${label}.loadStageCoverage: missing object`);
  else {
    for (const [stage, coverage] of Object.entries(value.loadStageCoverage)) {
      const at = `${label}.loadStageCoverage.${stage}`;
      push(errors, stages.has(stage), `${at}: unknown stage`);
      if (!isObject(coverage)) {
        errors.push(`${at}: must be object`);
        continue;
      }
      push(errors, isString(coverage.loadHint), `${at}.loadHint: missing loadHint`);
      push(errors, typeof coverage.runtime === 'boolean', `${at}.runtime: must be boolean`);
      errors.push(...validateStringArray(coverage.sourceFiles, `${at}.sourceFiles`));
      errors.push(...validateStringArray(coverage.caseIds, `${at}.caseIds`));
      for (const id of coverage.caseIds || []) push(errors, caseIds.has(id), `${at}.caseIds: unknown case id ${id}`);
    }
    for (const stage of stages) push(errors, Object.prototype.hasOwnProperty.call(value.loadStageCoverage, stage), `${label}.loadStageCoverage: missing stage ${stage}`);
  }

  if (!isObject(value.coverage)) errors.push(`${label}.coverage: missing object`);
  else {
    push(errors, value.coverage.caseCount === caseIds.size, `${label}.coverage.caseCount: mismatch`);
    push(errors, value.coverage.modeCount === (value.modes || []).length, `${label}.coverage.modeCount: mismatch`);
    push(errors, value.coverage.stagesCovered === Object.keys(value.loadStageCoverage || {}).length, `${label}.coverage.stagesCovered: mismatch`);
    push(errors, value.coverage.allCasesCovered === true, `${label}.coverage.allCasesCovered: must be true`);
    errors.push(...validateStringArray(value.coverage.runtimeModeIds, `${label}.coverage.runtimeModeIds`));
    errors.push(...validateStringArray(value.coverage.manualReviewModeIds, `${label}.coverage.manualReviewModeIds`));
    for (const id of value.coverage.runtimeModeIds || []) push(errors, modeIds.has(id), `${label}.coverage.runtimeModeIds: unknown mode ${id}`);
    for (const id of value.coverage.manualReviewModeIds || []) push(errors, modeIds.has(id), `${label}.coverage.manualReviewModeIds: unknown mode ${id}`);
  }
  return errors;
}

function validateNodeRuntimeStates(value, label = 'node-runtime-states') {
  const errors = validateContractEnvelope(value, label, 'ovs-node-runtime-states', { appLaneNote: true });
  if (errors.length && !isObject(value)) return errors;
  errors.push(...validateStringArray(value.caseFields, `${label}.caseFields`));
  const caseIds = new Set();
  const stages = new Set();
  if (!Array.isArray(value.cases) || !value.cases.length) errors.push(`${label}.cases: missing non-empty array`);
  else value.cases.forEach((test, i) => {
    const at = `${label}.cases[${i}]`;
    if (!isObject(test)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, /^[a-z0-9-]+$/.test(String(test.id || '')), `${at}.id: invalid id`);
    push(errors, isString(test.family), `${at}.family: missing family`);
    push(errors, isString(test.stage), `${at}.stage: missing stage`);
    if (isString(test.id)) caseIds.add(test.id);
    if (isString(test.stage)) stages.add(test.stage);
    push(errors, isString(test.trigger), `${at}.trigger: missing trigger`);
    errors.push(...validateStringArray(test.requiredBehavior, `${at}.requiredBehavior`));
    errors.push(...validateStringArray(test.mustNot, `${at}.mustNot`));
    push(errors, isString(test.appOwnedCopyIntent), `${at}.appOwnedCopyIntent: missing copy intent`);
    errors.push(...validateStringArray(test.sourceFiles, `${at}.sourceFiles`));
  });
  errors.push(...validateRuntimeQaContract(value.qaContract, `${label}.qaContract`, caseIds, stages));
  errors.push(...validateObjectCounts(value.totals, `${label}.totals`));
  return errors;
}

function validatePreviewRunContract(value, label, groups = new Set(), scenarios = []) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing run contract object`];
  push(errors, /private-preview run contract/i.test(String(value.purpose || '')), `${label}.purpose: missing private-preview run purpose`);
  push(errors, value.status === 'pending-app-integration', `${label}.status: must be pending-app-integration`);
  push(errors, value.h4DrainableFromDataAlone === false, `${label}.h4DrainableFromDataAlone: must be false`);
  push(errors, isString(value.namedConsumer), `${label}.namedConsumer: missing named consumer`);
  push(errors, isString(value.drainRule) && /H4/i.test(value.drainRule), `${label}.drainRule: must name H4 drain rule`);
  errors.push(...validateStringArray(value.evidenceRequired, `${label}.evidenceRequired`));
  errors.push(...validateStringArray(value.exitCriteria, `${label}.exitCriteria`));

  const scenarioById = new Map(scenarios.map(scenario => [scenario.id, scenario]));
  const covered = new Map();
  const orderedGroups = [];
  if (!Array.isArray(value.runOrder) || !value.runOrder.length) errors.push(`${label}.runOrder: missing non-empty array`);
  else value.runOrder.forEach((step, i) => {
    const at = `${label}.runOrder[${i}]`;
    if (!isObject(step)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, step.step === i + 1, `${at}.step: must be sequential`);
    push(errors, groups.has(step.group), `${at}.group: unknown group ${step.group}`);
    orderedGroups.push(step.group);
    errors.push(...validateStringArray(step.scenarioIds, `${at}.scenarioIds`));
    for (const id of step.scenarioIds || []) {
      const scenario = scenarioById.get(id);
      push(errors, !!scenario, `${at}.scenarioIds: unknown scenario ${id}`);
      if (scenario) push(errors, scenario.group === step.group, `${at}.scenarioIds: ${id} belongs to ${scenario.group}`);
      covered.set(id, (covered.get(id) || 0) + 1);
    }
    errors.push(...validateStringArray(step.passWhen, `${at}.passWhen`));
    errors.push(...validateStringArray(step.mustNot, `${at}.mustNot`));
  });
  for (const scenario of scenarios) push(errors, covered.get(scenario.id) === 1, `${label}.runOrder: scenario ${scenario.id} must be covered exactly once`);

  if (!isObject(value.coverage)) errors.push(`${label}.coverage: missing object`);
  else {
    push(errors, value.coverage.scenarioCount === scenarios.length, `${label}.coverage.scenarioCount: mismatch`);
    push(errors, value.coverage.groupCount === orderedGroups.length, `${label}.coverage.groupCount: mismatch`);
    push(errors, value.coverage.allScenariosCovered === true, `${label}.coverage.allScenariosCovered: must be true`);
    push(errors, value.coverage.allGroupsCovered === true, `${label}.coverage.allGroupsCovered: must be true`);
    errors.push(...validateStringArray(value.coverage.orderedGroups, `${label}.coverage.orderedGroups`));
    push(errors, JSON.stringify(value.coverage.orderedGroups || []) === JSON.stringify(orderedGroups), `${label}.coverage.orderedGroups: must match run order`);
    if (value.coverage.drainScenarioId != null) {
      push(errors, scenarioById.has(value.coverage.drainScenarioId), `${label}.coverage.drainScenarioId: unknown scenario`);
      const last = (value.runOrder || [])[value.runOrder.length - 1];
      push(errors, (last?.scenarioIds || []).includes(value.coverage.drainScenarioId), `${label}.coverage.drainScenarioId: must be in final run step`);
    }
  }
  return errors;
}

function validateNodePreviewMatrix(value, label = 'node-preview-matrix') {
  const errors = validateContractEnvelope(value, label, 'ovs-node-preview-matrix', { appLaneNote: true });
  if (errors.length && !isObject(value)) return errors;
  push(errors, value.status === 'pending-app-integration', `${label}.status: must remain pending-app-integration`);
  push(errors, value.h4DrainableFromDataAlone === false, `${label}.h4DrainableFromDataAlone: must be false`);
  errors.push(...validateStringArray(value.groups, `${label}.groups`));
  const groups = new Set(Array.isArray(value.groups) ? value.groups : []);
  const scenarios = [];
  if (!Array.isArray(value.scenarios) || !value.scenarios.length) errors.push(`${label}.scenarios: missing non-empty array`);
  else value.scenarios.forEach((scenario, i) => {
    const at = `${label}.scenarios[${i}]`;
    if (!isObject(scenario)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, /^[a-z0-9-]+$/.test(String(scenario.id || '')), `${at}.id: invalid id`);
    push(errors, groups.has(scenario.group), `${at}.group: unknown group ${scenario.group}`);
    if (isString(scenario.id) && isString(scenario.group)) scenarios.push(scenario);
    push(errors, isString(scenario.title), `${at}.title: missing title`);
    push(errors, scenario.owner === 'app/design', `${at}.owner: must be app/design`);
    errors.push(...validateStringArray(scenario.sourceFiles, `${at}.sourceFiles`));
    errors.push(...validateStringArray(scenario.steps, `${at}.steps`));
    errors.push(...validateStringArray(scenario.acceptanceCriteria, `${at}.acceptanceCriteria`));
    errors.push(...validateStringArray(scenario.mustNot, `${at}.mustNot`));
  });
  errors.push(...validatePreviewRunContract(value.runContract, `${label}.runContract`, groups, scenarios));
  errors.push(...validateObjectCounts(value.totals, `${label}.totals`));
  return errors;
}

function validateNodeIntegrationChecklist(value, label = 'node-integration-checklist') {
  const errors = validateContractEnvelope(value, label, 'ovs-node-integration-checklist', { appLaneNote: true });
  if (errors.length && !isObject(value)) return errors;
  errors.push(...validateObjectCounts(value.readinessTargets, `${label}.readinessTargets`));
  errors.push(...validateObjectCounts(value.counts, `${label}.counts`));
  errors.push(...validateStringArray(value.smokeCommands, `${label}.smokeCommands`));
  errors.push(...validatePublicGates(value.publicGates, `${label}.publicGates`));
  const phaseIds = new Set();
  if (!Array.isArray(value.phases) || !value.phases.length) errors.push(`${label}.phases: missing non-empty array`);
  else value.phases.forEach((phase, i) => {
    const at = `${label}.phases[${i}]`;
    if (!isObject(phase)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, /^[a-z0-9-]+$/.test(String(phase.id || '')), `${at}.id: invalid id`);
    if (isString(phase.id)) phaseIds.add(phase.id);
    push(errors, isString(phase.label), `${at}.label: missing label`);
    push(errors, phase.owner === 'app/design', `${at}.owner: must be app/design`);
    push(errors, phase.status === 'pending-app-integration', `${at}.status: must remain pending-app-integration`);
    errors.push(...validateStringArray(phase.sourceFiles, `${at}.sourceFiles`));
    errors.push(...validateStringArray(phase.acceptanceCriteria, `${at}.acceptanceCriteria`));
    push(errors, isString(phase.risk), `${at}.risk: missing risk`);
  });
  errors.push(...validateH4DrainContract(value.h4DrainContract, `${label}.h4DrainContract`, { phaseIds }));
  return errors;
}

function validateChallengeSet(value, label = 'challenge-set') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-challenge-set', `${label}: wrong format`);
  push(errors, SEMVER.test(String(value.version || '')), `${label}.version: must be semver`);
  push(errors, value.standard === 'open-values-standard', `${label}.standard: wrong standard`);
  push(errors, DATE.test(String(value.updated || '')), `${label}.updated: must be YYYY-MM-DD`);
  push(errors, isString(value.purpose), `${label}.purpose: missing purpose`);
  errors.push(...validateStringArray(value.principles, `${label}.principles`));

  const algorithmIds = new Set();
  if (!Array.isArray(value.algorithms) || !value.algorithms.length) errors.push(`${label}.algorithms: missing non-empty array`);
  else value.algorithms.forEach((algorithm, i) => {
    const at = `${label}.algorithms[${i}]`;
    if (!isObject(algorithm)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, KEBAB.test(String(algorithm.id || '')), `${at}.id: invalid id`);
    algorithmIds.add(algorithm.id);
    push(errors, isString(algorithm.label), `${at}.label: missing label`);
    push(errors, isString(algorithm.summary), `${at}.summary: missing summary`);
    errors.push(...validateStringArray(algorithm.inputs, `${at}.inputs`));
    errors.push(...validateStringArray(algorithm.outputs, `${at}.outputs`));
    errors.push(...validateStringArray(algorithm.mustNot, `${at}.mustNot`));
  });
  for (const required of ['opposite-view', 'steelman']) push(errors, algorithmIds.has(required), `${label}.algorithms: missing ${required}`);

  const instanceIds = new Set();
  if (!Array.isArray(value.instances) || !value.instances.length) errors.push(`${label}.instances: missing non-empty array`);
  else value.instances.forEach((instance, i) => {
    const at = `${label}.instances[${i}]`;
    if (!isObject(instance)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, KEBAB.test(String(instance.id || '')), `${at}.id: invalid id`);
    instanceIds.add(instance.id);
    push(errors, isString(instance.label), `${at}.label: missing label`);
    push(errors, isString(instance.role), `${at}.role: missing role`);
    push(errors, ['available', 'prominent', 'primary'].includes(instance.challengeDefault), `${at}.challengeDefault: invalid value`);
    errors.push(...validateStringArray(instance.surfaces, `${at}.surfaces`));
  });
  for (const required of ['conscious-consuming', 'kosplora', 'socrates-colosseum']) push(errors, instanceIds.has(required), `${label}.instances: missing ${required}`);

  const tags = new Map();
  if (!Array.isArray(value.contraryTags) || !value.contraryTags.length) errors.push(`${label}.contraryTags: missing non-empty array`);
  else value.contraryTags.forEach((tag, i) => {
    const at = `${label}.contraryTags[${i}]`;
    if (!isObject(tag)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, isString(tag.id), `${at}.id: missing id`);
    if (tags.has(tag.id)) errors.push(`${at}.id: duplicate ${tag.id}`);
    tags.set(tag.id, tag);
    push(errors, KEBAB.test(String(tag.category || '')), `${at}.category: invalid category`);
    push(errors, ENTITY_CODE.test(String(tag.entity || '')), `${at}.entity: invalid entity`);
    push(errors, CRITERION_KEY.test(String(tag.axis || '')), `${at}.axis: invalid axis`);
    push(errors, tag.polarity === 'steelman-weakness' || tag.polarity === 'opposite-view-strength', `${at}.polarity: invalid polarity`);
    push(errors, Number.isFinite(tag.score) && tag.score >= 0 && tag.score <= 100, `${at}.score: must be 0..100`);
    push(errors, isString(tag.summary), `${at}.summary: missing summary`);
    errors.push(...validateSource(tag.source, `${at}.source`));
  });

  if (!Array.isArray(value.cases) || !value.cases.length) errors.push(`${label}.cases: missing non-empty array`);
  else value.cases.forEach((test, i) => {
    const at = `${label}.cases[${i}]`;
    if (!isObject(test)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, KEBAB.test(String(test.id || '')), `${at}.id: invalid id`);
    push(errors, KEBAB.test(String(test.category || '')), `${at}.category: invalid category`);
    push(errors, isString(test.label), `${at}.label: missing label`);
    errors.push(...validateChallengeRead(test.reads, `${at}.reads`));

    for (const viewName of ['userView', 'oppositeView']) {
      const view = test[viewName];
      const viewAt = `${at}.${viewName}`;
      if (!isObject(view)) {
        errors.push(`${viewAt}: missing object`);
        continue;
      }
      push(errors, isString(view.label), `${viewAt}.label: missing label`);
      push(errors, ENTITY_CODE.test(String(view.expectedTop || '')), `${viewAt}.expectedTop: invalid expected top`);
      if (!isObject(view.weights) || !Object.keys(view.weights).length) errors.push(`${viewAt}.weights: missing non-empty object`);
      else {
        for (const [key, weight] of Object.entries(view.weights)) {
          push(errors, CRITERION_KEY.test(key), `${viewAt}.weights.${key}: invalid criterion key`);
          push(errors, Number.isFinite(weight) && weight >= 0 && weight <= 5, `${viewAt}.weights.${key}: weight must be 0..5`);
        }
      }
      if (viewName === 'oppositeView') {
        push(errors, isString(view.sourceTag), `${viewAt}.sourceTag: missing sourceTag`);
        if (isString(view.sourceTag)) {
          push(errors, tags.has(view.sourceTag), `${viewAt}.sourceTag: unknown tag ${view.sourceTag}`);
          const tag = tags.get(view.sourceTag);
          if (tag) {
            push(errors, tag.category === test.category, `${viewAt}.sourceTag: category mismatch`);
            push(errors, tag.entity === view.expectedTop, `${viewAt}.sourceTag: entity mismatch`);
            push(errors, tag.polarity === 'opposite-view-strength', `${viewAt}.sourceTag: must point to opposite-view-strength`);
          }
        }
      }
    }

    const steelman = test.steelman;
    if (!isObject(steelman)) errors.push(`${at}.steelman: missing object`);
    else {
      push(errors, steelman.forEntity === test.userView?.expectedTop, `${at}.steelman.forEntity: should match userView.expectedTop`);
      push(errors, CRITERION_KEY.test(String(steelman.axis || '')), `${at}.steelman.axis: invalid axis`);
      push(errors, isString(steelman.sourceTag), `${at}.steelman.sourceTag: missing sourceTag`);
      push(errors, isString(steelman.framing), `${at}.steelman.framing: missing framing`);
      if (isString(steelman.sourceTag)) {
        push(errors, tags.has(steelman.sourceTag), `${at}.steelman.sourceTag: unknown tag ${steelman.sourceTag}`);
        const tag = tags.get(steelman.sourceTag);
        if (tag) {
          push(errors, tag.category === test.category, `${at}.steelman.sourceTag: category mismatch`);
          push(errors, tag.entity === steelman.forEntity, `${at}.steelman.sourceTag: entity mismatch`);
          push(errors, tag.axis === steelman.axis, `${at}.steelman.sourceTag: axis mismatch`);
          push(errors, tag.polarity === 'steelman-weakness', `${at}.steelman.sourceTag: must point to steelman-weakness`);
        }
      }
    }
    if (test.userView && test.oppositeView) {
      push(errors, test.userView.expectedTop !== test.oppositeView.expectedTop, `${at}: expected tops should differ`);
    }
  });
  return errors;
}

function validateChallengeIndexTag(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be object`];
  push(errors, isString(value.tag), `${label}.tag: missing tag`);
  push(errors, CRITERION_KEY.test(String(value.axis || '')), `${label}.axis: invalid axis`);
  push(errors, Number.isFinite(value.score) && value.score >= 0 && value.score <= 100, `${label}.score: must be 0..100`);
  push(errors, isString(value.summary), `${label}.summary: missing summary`);
  errors.push(...validateSource(value.source, `${label}.source`));
  return errors;
}

function validateChallengeIndexTop(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be object`];
  push(errors, ENTITY_CODE.test(String(value.code || '')), `${label}.code: invalid code`);
  push(errors, isString(value.name), `${label}.name: missing name`);
  if (value.brand != null) push(errors, isString(value.brand), `${label}.brand: must be string when present`);
  push(errors, Number.isFinite(value.score) && value.score >= 0 && value.score <= 100, `${label}.score: must be 0..100`);
  push(errors, Number.isFinite(value.coverage) && value.coverage >= 0 && value.coverage <= 1, `${label}.coverage: must be 0..1`);
  errors.push(...validateStringArray(value.why, `${label}.why`, { allowEmpty: true }));
  return errors;
}

function validateChallengeIndexView(value, label, options = {}) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be object`];
  push(errors, isString(value.label), `${label}.label: missing label`);
  push(errors, ENTITY_CODE.test(String(value.expectedTop || '')), `${label}.expectedTop: invalid expected top`);
  if (!isObject(value.weights) || !Object.keys(value.weights).length) errors.push(`${label}.weights: missing non-empty object`);
  else {
    for (const [key, weight] of Object.entries(value.weights)) {
      push(errors, CRITERION_KEY.test(key), `${label}.weights.${key}: invalid criterion key`);
      push(errors, Number.isFinite(weight) && weight >= 0 && weight <= 5, `${label}.weights.${key}: weight must be 0..5`);
    }
  }
  errors.push(...validateChallengeIndexTop(value.top, `${label}.top`));
  if (value.top && value.expectedTop) push(errors, value.top.code === value.expectedTop, `${label}.top.code: must match expectedTop`);
  if (options.needsSourceTag) {
    push(errors, isString(value.sourceTag), `${label}.sourceTag: missing sourceTag`);
    errors.push(...validateChallengeIndexTag(value.selectedTag, `${label}.selectedTag`));
    errors.push(...validateChallengeIndexTag(value.receipt, `${label}.receipt`));
    if (isObject(value.selectedTag) && isString(value.sourceTag)) {
      push(errors, value.selectedTag.tag === value.sourceTag, `${label}.selectedTag.tag: must match sourceTag`);
    }
    if (isObject(value.receipt) && isString(value.sourceTag)) {
      push(errors, value.receipt.tag === value.sourceTag, `${label}.receipt.tag: must match sourceTag`);
    }
  }
  return errors;
}

function validateChallengeIndex(value, label = 'challenge-index') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-challenge-index', `${label}: wrong format`);
  push(errors, SEMVER.test(String(value.version || '')), `${label}.version: must be semver`);
  push(errors, value.standard === 'open-values-standard', `${label}.standard: wrong standard`);
  push(errors, DATE.test(String(value.built || '')), `${label}.built: must be YYYY-MM-DD`);
  push(errors, isString(value.purpose), `${label}.purpose: missing purpose`);
  errors.push(...validateStringArray(value.principles, `${label}.principles`));

  if (!isObject(value.generatedFrom)) errors.push(`${label}.generatedFrom: missing object`);
  else {
    push(errors, value.generatedFrom.path === 'content/challenge/index.json', `${label}.generatedFrom.path: must be content/challenge/index.json`);
    push(errors, DATE.test(String(value.generatedFrom.updated || '')), `${label}.generatedFrom.updated: must be YYYY-MM-DD`);
    push(errors, SHA256.test(String(value.generatedFrom.sha256 || '')), `${label}.generatedFrom.sha256: invalid sha256`);
  }

  if (!isObject(value.counts)) errors.push(`${label}.counts: missing object`);
  else {
    for (const key of ['instances', 'algorithms', 'cases', 'contraryTags', 'categories']) {
      push(errors, Number.isInteger(value.counts[key]) && value.counts[key] >= 0, `${label}.counts.${key}: must be nonnegative integer`);
    }
  }

  const categoryIds = new Set();
  if (!Array.isArray(value.categories) || !value.categories.length) errors.push(`${label}.categories: missing non-empty array`);
  else value.categories.forEach((category, i) => {
    const at = `${label}.categories[${i}]`;
    if (!isObject(category)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, KEBAB.test(String(category.id || '')), `${at}.id: invalid id`);
    if (categoryIds.has(category.id)) errors.push(`${at}.id: duplicate ${category.id}`);
    categoryIds.add(category.id);
    push(errors, isString(category.label), `${at}.label: missing label`);
    push(errors, TYPE_ENUM.has(category.type), `${at}.type: unknown type`);
    push(errors, /^app\/data\/[a-z0-9-]+\.json$/.test(String(category.file || '')), `${at}.file: invalid file`);
    if (category.n != null) push(errors, Number.isInteger(category.n) && category.n >= 0, `${at}.n: must be nonnegative integer`);
    if (!Array.isArray(category.criteria) || !category.criteria.length) errors.push(`${at}.criteria: missing non-empty array`);
    else category.criteria.forEach((criterion, c) => errors.push(...validateCriterion(criterion, `${at}.criteria[${c}]`)));
  });

  if (!Array.isArray(value.algorithms) || !value.algorithms.length) errors.push(`${label}.algorithms: missing non-empty array`);
  else value.algorithms.forEach((algorithm, i) => {
    const at = `${label}.algorithms[${i}]`;
    if (!isObject(algorithm)) errors.push(`${at}: must be object`);
    else {
      push(errors, KEBAB.test(String(algorithm.id || '')), `${at}.id: invalid id`);
      push(errors, isString(algorithm.label), `${at}.label: missing label`);
      push(errors, isString(algorithm.summary), `${at}.summary: missing summary`);
    }
  });

  const instanceIds = new Set();
  if (!Array.isArray(value.instances) || !value.instances.length) errors.push(`${label}.instances: missing non-empty array`);
  else value.instances.forEach((instance, i) => {
    const at = `${label}.instances[${i}]`;
    if (!isObject(instance)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, KEBAB.test(String(instance.id || '')), `${at}.id: invalid id`);
    if (instanceIds.has(instance.id)) errors.push(`${at}.id: duplicate ${instance.id}`);
    instanceIds.add(instance.id);
    push(errors, isString(instance.label), `${at}.label: missing label`);
    push(errors, isString(instance.role), `${at}.role: missing role`);
    push(errors, ['available', 'prominent', 'primary'].includes(instance.challengeDefault), `${at}.challengeDefault: invalid value`);
    errors.push(...validateStringArray(instance.surfaces, `${at}.surfaces`));
  });

  const caseIds = new Set();
  if (!Array.isArray(value.cases) || !value.cases.length) errors.push(`${label}.cases: missing non-empty array`);
  else value.cases.forEach((test, i) => {
    const at = `${label}.cases[${i}]`;
    if (!isObject(test)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, KEBAB.test(String(test.id || '')), `${at}.id: invalid id`);
    if (caseIds.has(test.id)) errors.push(`${at}.id: duplicate ${test.id}`);
    caseIds.add(test.id);
    push(errors, KEBAB.test(String(test.category || '')), `${at}.category: invalid category`);
    if (test.category) push(errors, categoryIds.has(test.category), `${at}.category: not listed in categories`);
    push(errors, isString(test.label), `${at}.label: missing label`);
    errors.push(...validateChallengeRead(test.reads, `${at}.reads`));
    errors.push(...validateChallengeIndexView(test.userView, `${at}.userView`));
    errors.push(...validateChallengeIndexView(test.oppositeView, `${at}.oppositeView`, { needsSourceTag: true }));

    const steelman = test.steelman;
    if (!isObject(steelman)) errors.push(`${at}.steelman: missing object`);
    else {
      push(errors, steelman.forEntity === test.userView?.expectedTop, `${at}.steelman.forEntity: should match userView.expectedTop`);
      push(errors, CRITERION_KEY.test(String(steelman.axis || '')), `${at}.steelman.axis: invalid axis`);
      push(errors, isString(steelman.sourceTag), `${at}.steelman.sourceTag: missing sourceTag`);
      push(errors, isString(steelman.framing), `${at}.steelman.framing: missing framing`);
      push(errors, isString(steelman.line), `${at}.steelman.line: missing line`);
      if (isString(steelman.line) && isString(steelman.framing)) push(errors, steelman.line === steelman.framing, `${at}.steelman.line: should match framing`);
      errors.push(...validateChallengeIndexTag(steelman.selectedTag, `${at}.steelman.selectedTag`));
      errors.push(...validateChallengeIndexTag(steelman.receipt, `${at}.steelman.receipt`));
      if (isObject(steelman.selectedTag)) {
        push(errors, steelman.selectedTag.tag === steelman.sourceTag, `${at}.steelman.selectedTag.tag: must match sourceTag`);
        push(errors, steelman.selectedTag.axis === steelman.axis, `${at}.steelman.selectedTag.axis: must match axis`);
      }
      if (isObject(steelman.receipt)) push(errors, steelman.receipt.tag === steelman.sourceTag, `${at}.steelman.receipt.tag: must match sourceTag`);
    }
    if (test.userView && test.oppositeView) {
      push(errors, test.userView.expectedTop !== test.oppositeView.expectedTop, `${at}: expected tops should differ`);
    }
  });

  if (isObject(value.counts)) {
    if (Array.isArray(value.instances)) push(errors, value.counts.instances === value.instances.length, `${label}.counts.instances: does not match instances length`);
    if (Array.isArray(value.algorithms)) push(errors, value.counts.algorithms === value.algorithms.length, `${label}.counts.algorithms: does not match algorithms length`);
    if (Array.isArray(value.categories)) push(errors, value.counts.categories === value.categories.length, `${label}.counts.categories: does not match categories length`);
    if (Array.isArray(value.cases)) push(errors, value.counts.cases === value.cases.length, `${label}.counts.cases: does not match cases length`);
  }
  return errors;
}

function validateAsksOffers(value, label = 'asks-offers') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-asks-offers', `${label}: wrong format`);
  push(errors, SEMVER.test(String(value.version || '')), `${label}.version: must be semver`);
  push(errors, value.standard === 'open-values-standard', `${label}.standard: wrong standard`);
  push(errors, DATE.test(String(value.updated || '')), `${label}.updated: must be YYYY-MM-DD`);
  push(errors, isString(value.purpose), `${label}.purpose: missing purpose`);
  errors.push(...validateStringArray(value.principles, `${label}.principles`));

  if (!isObject(value.publication)) errors.push(`${label}.publication: missing object`);
  else {
    push(errors, isString(value.publication.status), `${label}.publication.status: missing status`);
    push(errors, isString(value.publication.storage), `${label}.publication.storage: missing storage`);
    push(errors, isString(value.publication.relay), `${label}.publication.relay: missing relay`);
    push(errors, isString(value.publication.identity), `${label}.publication.identity: missing identity`);
    push(errors, value.publication.liveDatabase === false, `${label}.publication.liveDatabase: must be false`);
    push(errors, isString(value.publication.privacy), `${label}.publication.privacy: missing privacy`);
  }

  const ids = new Set();
  let asks = 0;
  let offers = 0;
  if (!Array.isArray(value.items) || !value.items.length) errors.push(`${label}.items: missing non-empty array`);
  else value.items.forEach((item, i) => {
    const at = `${label}.items[${i}]`;
    if (!isObject(item)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, KEBAB.test(String(item.id || '')), `${at}.id: invalid id`);
    if (ids.has(item.id)) errors.push(`${at}.id: duplicate ${item.id}`);
    ids.add(item.id);
    push(errors, item.kind === 'ask' || item.kind === 'offer', `${at}.kind: must be ask or offer`);
    if (item.kind === 'ask') asks += 1;
    if (item.kind === 'offer') offers += 1;
    push(errors, ['template', 'seed', 'live', 'archived'].includes(item.status), `${at}.status: invalid status`);
    push(errors, isString(item.title), `${at}.title: missing title`);
    push(errors, isString(item.summary), `${at}.summary: missing summary`);
    push(errors, isString(item.prompt), `${at}.prompt: missing prompt`);
    errors.push(...validateStringArray(item.audience, `${at}.audience`));
    if (item.kind === 'ask') errors.push(...validateStringArray(item.needs, `${at}.needs`));
    if (item.kind === 'offer') errors.push(...validateStringArray(item.offers, `${at}.offers`));

    if (!Array.isArray(item.values) || !item.values.length) errors.push(`${at}.values: missing non-empty array`);
    else item.values.forEach((valueId, v) => push(errors, UNIVERSAL_VALUES.has(valueId), `${at}.values[${v}]: unknown universal value ${valueId}`));
    if (!Array.isArray(item.regions) || !item.regions.length) errors.push(`${at}.regions: missing non-empty array`);
    else item.regions.forEach((region, r) => push(errors, REGIONS.has(region), `${at}.regions[${r}]: unknown region ${region}`));

    const related = item.related;
    if (!isObject(related)) errors.push(`${at}.related: missing object`);
    else {
      for (const field of ['categories', 'guides', 'initiatives']) {
        if (!Array.isArray(related[field]) || !related[field].length) errors.push(`${at}.related.${field}: missing non-empty array`);
        else related[field].forEach((id, n) => push(errors, KEBAB.test(String(id || '')), `${at}.related.${field}[${n}]: invalid id ${id}`));
      }
    }

    if (!Array.isArray(item.receipts) || !item.receipts.length) errors.push(`${at}.receipts: missing non-empty array`);
    else item.receipts.forEach((receipt, r) => errors.push(...validateSource(receipt, `${at}.receipts[${r}]`)));
    errors.push(...validateStringArray(item.limits, `${at}.limits`));
  });
  push(errors, asks > 0, `${label}.items: missing ask items`);
  push(errors, offers > 0, `${label}.items: missing offer items`);
  return errors;
}

function validateAsksOffersIndexRelated(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing object`];
  if (!Array.isArray(value.categories) || !value.categories.length) errors.push(`${label}.categories: missing non-empty array`);
  else value.categories.forEach((category, i) => {
    const at = `${label}.categories[${i}]`;
    if (!isObject(category)) errors.push(`${at}: must be object`);
    else {
      push(errors, KEBAB.test(String(category.id || '')), `${at}.id: invalid id`);
      push(errors, isString(category.label), `${at}.label: missing label`);
      if (category.type != null) push(errors, TYPE_ENUM.has(category.type), `${at}.type: unknown type`);
    }
  });
  if (!Array.isArray(value.guides) || !value.guides.length) errors.push(`${label}.guides: missing non-empty array`);
  else value.guides.forEach((guide, i) => {
    const at = `${label}.guides[${i}]`;
    if (!isObject(guide)) errors.push(`${at}: must be object`);
    else {
      push(errors, KEBAB.test(String(guide.id || '')), `${at}.id: invalid id`);
      push(errors, isString(guide.title), `${at}.title: missing title`);
      push(errors, /^content\/guides\/[a-z0-9-]+\.md$/.test(String(guide.path || '')), `${at}.path: invalid path`);
      push(errors, /^#guide\/[a-z0-9-]+$/.test(String(guide.hash || '')), `${at}.hash: invalid hash`);
    }
  });
  if (!Array.isArray(value.initiatives) || !value.initiatives.length) errors.push(`${label}.initiatives: missing non-empty array`);
  else value.initiatives.forEach((initiative, i) => {
    const at = `${label}.initiatives[${i}]`;
    if (!isObject(initiative)) errors.push(`${at}: must be object`);
    else {
      push(errors, KEBAB.test(String(initiative.code || '')), `${at}.code: invalid code`);
      push(errors, isString(initiative.name), `${at}.name: missing name`);
      errors.push(...validateLegitimacy(initiative.legitimacy, `${at}.legitimacy`));
      errors.push(...validateActPath(initiative.actPath, `${at}.actPath`));
      if (initiative.scoreSignals != null) push(errors, isObject(initiative.scoreSignals), `${at}.scoreSignals: must be object`);
    }
  });
  return errors;
}

function validateAsksOffersIndex(value, label = 'asks-offers-index') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-asks-offers-index', `${label}: wrong format`);
  push(errors, SEMVER.test(String(value.version || '')), `${label}.version: must be semver`);
  push(errors, value.standard === 'open-values-standard', `${label}.standard: wrong standard`);
  push(errors, DATE.test(String(value.built || '')), `${label}.built: must be YYYY-MM-DD`);
  push(errors, isString(value.purpose), `${label}.purpose: missing purpose`);
  errors.push(...validateStringArray(value.principles, `${label}.principles`));

  if (!isObject(value.generatedFrom)) errors.push(`${label}.generatedFrom: missing object`);
  else {
    push(errors, value.generatedFrom.path === 'content/asks-offers.json', `${label}.generatedFrom.path: must be content/asks-offers.json`);
    push(errors, DATE.test(String(value.generatedFrom.updated || '')), `${label}.generatedFrom.updated: must be YYYY-MM-DD`);
    push(errors, SHA256.test(String(value.generatedFrom.sha256 || '')), `${label}.generatedFrom.sha256: invalid sha256`);
  }

  if (!isObject(value.publication)) errors.push(`${label}.publication: missing object`);
  else {
    push(errors, value.publication.liveDatabase === false, `${label}.publication.liveDatabase: must be false`);
    push(errors, isString(value.publication.privacy), `${label}.publication.privacy: missing privacy`);
  }

  if (!isObject(value.counts)) errors.push(`${label}.counts: missing object`);
  else {
    for (const key of ['items', 'asks', 'offers', 'templates', 'live', 'categories', 'guides', 'initiatives', 'values', 'regions']) {
      push(errors, Number.isInteger(value.counts[key]) && value.counts[key] >= 0, `${label}.counts.${key}: must be nonnegative integer`);
    }
    push(errors, value.counts.live === 0, `${label}.counts.live: seed index must not contain live items`);
  }

  const sections = new Map();
  if (!Array.isArray(value.sections) || value.sections.length < 2) errors.push(`${label}.sections: missing asks/offers sections`);
  else value.sections.forEach((section, i) => {
    const at = `${label}.sections[${i}]`;
    if (!isObject(section)) errors.push(`${at}: must be object`);
    else {
      push(errors, section.id === 'asks' || section.id === 'offers', `${at}.id: must be asks or offers`);
      push(errors, section.kind === 'ask' || section.kind === 'offer', `${at}.kind: must be ask or offer`);
      push(errors, Number.isInteger(section.count) && section.count >= 0, `${at}.count: must be nonnegative integer`);
      sections.set(section.kind, section.count);
    }
  });

  if (!isObject(value.filters)) errors.push(`${label}.filters: missing object`);
  else {
    if (!Array.isArray(value.filters.values)) errors.push(`${label}.filters.values: missing array`);
    else value.filters.values.forEach((valueId, i) => push(errors, UNIVERSAL_VALUES.has(valueId), `${label}.filters.values[${i}]: unknown universal value ${valueId}`));
    if (!Array.isArray(value.filters.regions)) errors.push(`${label}.filters.regions: missing array`);
    else value.filters.regions.forEach((region, i) => push(errors, REGIONS.has(region), `${label}.filters.regions[${i}]: unknown region ${region}`));
    for (const field of ['categories', 'guides', 'initiatives']) {
      if (!Array.isArray(value.filters[field])) errors.push(`${label}.filters.${field}: missing array`);
      else value.filters[field].forEach((id, i) => push(errors, KEBAB.test(String(id || '')), `${label}.filters.${field}[${i}]: invalid id ${id}`));
    }
  }

  let asks = 0;
  let offers = 0;
  let templates = 0;
  let live = 0;
  const valueSet = new Set();
  const regionSet = new Set();
  const itemIds = new Set();
  if (!Array.isArray(value.items) || !value.items.length) errors.push(`${label}.items: missing non-empty array`);
  else value.items.forEach((item, i) => {
    const at = `${label}.items[${i}]`;
    if (!isObject(item)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, KEBAB.test(String(item.id || '')), `${at}.id: invalid id`);
    if (itemIds.has(item.id)) errors.push(`${at}.id: duplicate ${item.id}`);
    itemIds.add(item.id);
    push(errors, item.kind === 'ask' || item.kind === 'offer', `${at}.kind: must be ask or offer`);
    if (item.kind === 'ask') asks += 1;
    if (item.kind === 'offer') offers += 1;
    push(errors, ['template', 'seed', 'live', 'archived'].includes(item.status), `${at}.status: invalid status`);
    if (item.status === 'template') templates += 1;
    if (item.status === 'live') live += 1;
    push(errors, isString(item.title), `${at}.title: missing title`);
    push(errors, isString(item.summary), `${at}.summary: missing summary`);
    push(errors, isString(item.prompt), `${at}.prompt: missing prompt`);
    errors.push(...validateStringArray(item.audience, `${at}.audience`));
    if (!Array.isArray(item.values) || !item.values.length) errors.push(`${at}.values: missing non-empty array`);
    else item.values.forEach((valueId, v) => {
      push(errors, UNIVERSAL_VALUES.has(valueId), `${at}.values[${v}]: unknown universal value ${valueId}`);
      valueSet.add(valueId);
    });
    if (!Array.isArray(item.regions) || !item.regions.length) errors.push(`${at}.regions: missing non-empty array`);
    else item.regions.forEach((region, r) => {
      push(errors, REGIONS.has(region), `${at}.regions[${r}]: unknown region ${region}`);
      regionSet.add(region);
    });
    if (!isObject(item.action)) errors.push(`${at}.action: missing object`);
    else {
      push(errors, item.action.label === 'Ask' || item.action.label === 'Offer', `${at}.action.label: invalid label`);
      push(errors, Array.isArray(item.action.items) && item.action.items.length > 0, `${at}.action.items: missing items`);
      if (item.kind === 'ask') push(errors, item.action.label === 'Ask', `${at}.action.label: ask item should use Ask`);
      if (item.kind === 'offer') push(errors, item.action.label === 'Offer', `${at}.action.label: offer item should use Offer`);
    }
    errors.push(...validateAsksOffersIndexRelated(item.related, `${at}.related`));
    if (!Array.isArray(item.receipts) || !item.receipts.length) errors.push(`${at}.receipts: missing non-empty array`);
    else item.receipts.forEach((receipt, r) => errors.push(...validateSource(receipt, `${at}.receipts[${r}]`)));
    errors.push(...validateStringArray(item.limits, `${at}.limits`));
  });

  if (isObject(value.counts)) {
    if (Array.isArray(value.items)) push(errors, value.counts.items === value.items.length, `${label}.counts.items: does not match items length`);
    push(errors, value.counts.asks === asks, `${label}.counts.asks: does not match ask items`);
    push(errors, value.counts.offers === offers, `${label}.counts.offers: does not match offer items`);
    push(errors, value.counts.templates === templates, `${label}.counts.templates: does not match template items`);
    push(errors, value.counts.live === live, `${label}.counts.live: does not match live items`);
    push(errors, value.counts.values === valueSet.size, `${label}.counts.values: does not match item values`);
    push(errors, value.counts.regions === regionSet.size, `${label}.counts.regions: does not match item regions`);
  }
  if (sections.size) {
    push(errors, sections.get('ask') === asks, `${label}.sections: ask count mismatch`);
    push(errors, sections.get('offer') === offers, `${label}.sections: offer count mismatch`);
  }
  return errors;
}

const PROPOSAL_STATUS_ENUM = new Set(['template', 'draft', 'submitted', 'withdrawn', 'superseded', 'archived']);
const ATTESTATION_STATUS_ENUM = new Set(['template', 'submitted', 'withdrawn', 'archived']);
const ATTESTATION_STANCE_ENUM = new Set(['support', 'concern', 'needs-work', 'oppose', 'abstain']);
const PROPOSAL_OP_ENUM = new Set(['add-item', 'remove-item', 'edit-field', 'set-field', 'note']);

function validateGovernanceActor(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing object`];
  push(errors, isString(value.type), `${label}.type: missing type`);
  push(errors, KEBAB.test(String(value.id || '')), `${label}.id: invalid id`);
  push(errors, isString(value.display), `${label}.display: missing display`);
  return errors;
}

function validateGovernanceSignature(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing object`];
  push(errors, isString(value.method), `${label}.method: missing method`);
  push(errors, typeof value.verified === 'boolean', `${label}.verified: must be boolean`);
  return errors;
}

function validateProposalTarget(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing object`];
  push(errors, isString(value.path), `${label}.path: missing path`);
  push(errors, FORMAT_ID.test(String(value.format || '')), `${label}.format: invalid format id`);
  push(errors, SHA256.test(String(value.baseSha256 || '')), `${label}.baseSha256: invalid sha256`);
  push(errors, SHORT_HASH.test(String(value.baseHash || '')), `${label}.baseHash: invalid short hash`);
  if (value.baseSha256 && value.baseHash) push(errors, String(value.baseSha256).slice(0, 8) === value.baseHash, `${label}.baseHash: must match sha prefix`);
  if (value.currentSha256 != null) push(errors, SHA256.test(String(value.currentSha256 || '')), `${label}.currentSha256: invalid sha256`);
  if (value.currentHash != null) push(errors, SHORT_HASH.test(String(value.currentHash || '')), `${label}.currentHash: invalid short hash`);
  if (value.matchesCurrent != null) push(errors, typeof value.matchesCurrent === 'boolean', `${label}.matchesCurrent: must be boolean`);
  return errors;
}

function validateProposalOperation(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be object`];
  push(errors, PROPOSAL_OP_ENUM.has(value.op), `${label}.op: unknown operation ${value.op || '(missing)'}`);
  push(errors, typeof value.path === 'string' && value.path.startsWith('/'), `${label}.path: must be JSON pointer-like`);
  push(errors, isString(value.summary), `${label}.summary: missing summary`);
  if (value.impact != null) push(errors, isString(value.impact), `${label}.impact: must be string`);
  if (value.risk != null) push(errors, isString(value.risk), `${label}.risk: must be string`);
  return errors;
}

function validateProposal(value, label = 'proposal') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-proposal', `${label}: wrong format`);
  push(errors, /^0\.1\.0(?:[-+].*)?$/.test(String(value.version || '')), `${label}.version: must be 0.1.0 semver`);
  push(errors, KEBAB.test(String(value.id || '')), `${label}.id: invalid id`);
  push(errors, PROPOSAL_STATUS_ENUM.has(value.status), `${label}.status: unknown status`);
  errors.push(...validateProposalTarget(value.target, `${label}.target`));
  errors.push(...validateGovernanceActor(value.author, `${label}.author`));
  push(errors, DATE.test(String(value.created || '')), `${label}.created: must be YYYY-MM-DD`);
  push(errors, DATE.test(String(value.updated || '')), `${label}.updated: must be YYYY-MM-DD`);
  push(errors, isString(value.rationale), `${label}.rationale: missing rationale`);
  if (!Array.isArray(value.operations) || !value.operations.length) errors.push(`${label}.operations: missing non-empty array`);
  else value.operations.forEach((operation, i) => errors.push(...validateProposalOperation(operation, `${label}.operations[${i}]`)));
  errors.push(...validateGovernanceSignature(value.signature, `${label}.signature`));
  if (value.limits != null) errors.push(...validateStringArray(value.limits, `${label}.limits`, { allowEmpty: true }));
  return errors;
}

function validateAttestation(value, label = 'attestation') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-attestation', `${label}: wrong format`);
  push(errors, /^0\.1\.0(?:[-+].*)?$/.test(String(value.version || '')), `${label}.version: must be 0.1.0 semver`);
  push(errors, KEBAB.test(String(value.id || '')), `${label}.id: invalid id`);
  push(errors, ATTESTATION_STATUS_ENUM.has(value.status), `${label}.status: unknown status`);
  push(errors, KEBAB.test(String(value.proposal || '')), `${label}.proposal: invalid proposal id`);
  push(errors, ATTESTATION_STANCE_ENUM.has(value.stance), `${label}.stance: unknown stance`);
  errors.push(...validateGovernanceActor(value.attester, `${label}.attester`));
  push(errors, DATE.test(String(value.created || '')), `${label}.created: must be YYYY-MM-DD`);
  push(errors, isString(value.publicComment), `${label}.publicComment: missing comment`);
  errors.push(...validateGovernanceSignature(value.signature, `${label}.signature`));
  push(errors, typeof value.counted === 'boolean', `${label}.counted: must be boolean`);
  push(errors, isString(value.privacy), `${label}.privacy: missing privacy`);
  return errors;
}

function validateGovernancePublication(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing object`];
  push(errors, isString(value.status), `${label}.status: missing status`);
  push(errors, isString(value.storage), `${label}.storage: missing storage`);
  push(errors, isString(value.relay), `${label}.relay: missing relay`);
  push(errors, isString(value.identity), `${label}.identity: missing identity`);
  push(errors, value.liveVoting === false, `${label}.liveVoting: must be false`);
  push(errors, value.contactGated === true, `${label}.contactGated: must be true`);
  push(errors, isString(value.ratification), `${label}.ratification: missing ratification`);
  push(errors, isString(value.privacy), `${label}.privacy: missing privacy`);
  return errors;
}

function validateKAnonymity(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing object`];
  push(errors, Number.isInteger(value.minimumGroupSize) && value.minimumGroupSize >= 5, `${label}.minimumGroupSize: must be at least 5`);
  errors.push(...validateStringArray(value.countedStatuses, `${label}.countedStatuses`, { allowEmpty: true }));
  errors.push(...validateStringArray(value.uncountedStatuses, `${label}.uncountedStatuses`, { allowEmpty: true }));
  errors.push(...validateStringArray(value.countedOnlyWhen, `${label}.countedOnlyWhen`));
  push(errors, isString(value.note), `${label}.note: missing note`);
  return errors;
}

function validateGovernanceLedger(value, label = 'governance-ledger') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-governance-ledger', `${label}: wrong format`);
  push(errors, /^0\.1\.0(?:[-+].*)?$/.test(String(value.version || '')), `${label}.version: must be 0.1.0 semver`);
  push(errors, value.standard === 'open-values-standard', `${label}.standard: wrong standard`);
  push(errors, DATE.test(String(value.updated || '')), `${label}.updated: must be YYYY-MM-DD`);
  push(errors, isString(value.purpose), `${label}.purpose: missing purpose`);
  errors.push(...validateStringArray(value.principles, `${label}.principles`));
  errors.push(...validateGovernancePublication(value.publication, `${label}.publication`));
  errors.push(...validateKAnonymity(value.kAnonymity, `${label}.kAnonymity`));

  const proposalIds = new Set();
  if (!Array.isArray(value.proposals) || !value.proposals.length) errors.push(`${label}.proposals: missing non-empty array`);
  else value.proposals.forEach((proposal, i) => {
    const at = `${label}.proposals[${i}]`;
    errors.push(...validateProposal(proposal, at));
    if (proposal && proposal.id) {
      if (proposalIds.has(proposal.id)) errors.push(`${at}.id: duplicate ${proposal.id}`);
      proposalIds.add(proposal.id);
    }
  });
  const attestationIds = new Set();
  if (!Array.isArray(value.attestations)) errors.push(`${label}.attestations: missing array`);
  else value.attestations.forEach((attestation, i) => {
    const at = `${label}.attestations[${i}]`;
    errors.push(...validateAttestation(attestation, at));
    if (attestation && attestation.id) {
      if (attestationIds.has(attestation.id)) errors.push(`${at}.id: duplicate ${attestation.id}`);
      attestationIds.add(attestation.id);
    }
    if (attestation && attestation.proposal) push(errors, proposalIds.has(attestation.proposal), `${at}.proposal: unknown proposal ${attestation.proposal}`);
  });
  return errors;
}

function validateGovernanceIndex(value, label = 'governance-index') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-governance-index', `${label}: wrong format`);
  push(errors, /^0\.1\.0(?:[-+].*)?$/.test(String(value.version || '')), `${label}.version: must be 0.1.0 semver`);
  push(errors, value.standard === 'open-values-standard', `${label}.standard: wrong standard`);
  push(errors, DATE.test(String(value.built || '')), `${label}.built: must be YYYY-MM-DD`);
  push(errors, isString(value.purpose), `${label}.purpose: missing purpose`);
  if (!isObject(value.generatedFrom)) errors.push(`${label}.generatedFrom: missing object`);
  else {
    push(errors, value.generatedFrom.path === 'content/governance/proposals.json', `${label}.generatedFrom.path: must be content/governance/proposals.json`);
    push(errors, DATE.test(String(value.generatedFrom.updated || '')), `${label}.generatedFrom.updated: must be YYYY-MM-DD`);
    push(errors, SHA256.test(String(value.generatedFrom.sha256 || '')), `${label}.generatedFrom.sha256: invalid sha256`);
  }
  errors.push(...validateGovernancePublication(value.publication, `${label}.publication`));
  errors.push(...validateKAnonymity(value.kAnonymity, `${label}.kAnonymity`));

  let counted = 0;
  const proposalIds = new Set();
  if (!Array.isArray(value.proposals) || !value.proposals.length) errors.push(`${label}.proposals: missing non-empty array`);
  else value.proposals.forEach((proposal, i) => {
    const at = `${label}.proposals[${i}]`;
    if (!isObject(proposal)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, KEBAB.test(String(proposal.id || '')), `${at}.id: invalid id`);
    if (proposalIds.has(proposal.id)) errors.push(`${at}.id: duplicate ${proposal.id}`);
    proposalIds.add(proposal.id);
    push(errors, PROPOSAL_STATUS_ENUM.has(proposal.status), `${at}.status: unknown status`);
    errors.push(...validateProposalTarget(proposal.target, `${at}.target`));
    errors.push(...validateGovernanceActor(proposal.author, `${at}.author`));
    push(errors, DATE.test(String(proposal.created || '')), `${at}.created: must be YYYY-MM-DD`);
    push(errors, DATE.test(String(proposal.updated || '')), `${at}.updated: must be YYYY-MM-DD`);
    push(errors, isString(proposal.rationale), `${at}.rationale: missing rationale`);
    if (!Array.isArray(proposal.operations) || !proposal.operations.length) errors.push(`${at}.operations: missing non-empty array`);
    else proposal.operations.forEach((operation, n) => errors.push(...validateProposalOperation(operation, `${at}.operations[${n}]`)));
    push(errors, Number.isInteger(proposal.operationCount) && proposal.operationCount === (proposal.operations || []).length, `${at}.operationCount: mismatch`);
    errors.push(...validateGovernanceSignature(proposal.signature, `${at}.signature`));
  });

  if (!Array.isArray(value.attestations)) errors.push(`${label}.attestations: missing array`);
  else value.attestations.forEach((attestation, i) => {
    const at = `${label}.attestations[${i}]`;
    if (!isObject(attestation)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, KEBAB.test(String(attestation.id || '')), `${at}.id: invalid id`);
    push(errors, ATTESTATION_STATUS_ENUM.has(attestation.status), `${at}.status: unknown status`);
    push(errors, KEBAB.test(String(attestation.proposal || '')), `${at}.proposal: invalid proposal id`);
    if (attestation.proposal) push(errors, proposalIds.has(attestation.proposal), `${at}.proposal: unknown proposal ${attestation.proposal}`);
    push(errors, ATTESTATION_STANCE_ENUM.has(attestation.stance), `${at}.stance: unknown stance`);
    errors.push(...validateGovernanceActor(attestation.attester, `${at}.attester`));
    push(errors, DATE.test(String(attestation.created || '')), `${at}.created: must be YYYY-MM-DD`);
    push(errors, isString(attestation.publicComment), `${at}.publicComment: missing comment`);
    errors.push(...validateGovernanceSignature(attestation.signature, `${at}.signature`));
    push(errors, typeof attestation.counted === 'boolean', `${at}.counted: must be boolean`);
    if (attestation.counted) counted += 1;
    push(errors, isString(attestation.privacy), `${at}.privacy: missing privacy`);
  });

  if (!isObject(value.counts)) errors.push(`${label}.counts: missing object`);
  else {
    for (const key of ['proposals', 'attestations', 'countedAttestations', 'targets', 'targetFormats']) {
      push(errors, Number.isInteger(value.counts[key]) && value.counts[key] >= 0, `${label}.counts.${key}: must be nonnegative integer`);
    }
    if (Array.isArray(value.proposals)) push(errors, value.counts.proposals === value.proposals.length, `${label}.counts.proposals: mismatch`);
    if (Array.isArray(value.attestations)) push(errors, value.counts.attestations === value.attestations.length, `${label}.counts.attestations: mismatch`);
    push(errors, value.counts.countedAttestations === counted, `${label}.counts.countedAttestations: mismatch`);
  }

  if (!isObject(value.filters)) errors.push(`${label}.filters: missing object`);
  else {
    for (const field of ['proposalStatuses', 'attestationStatuses', 'stances', 'targets', 'targetFormats']) {
      push(errors, Array.isArray(value.filters[field]), `${label}.filters.${field}: missing array`);
    }
  }
  errors.push(...validateStringArray(value.principles, `${label}.principles`));
  return errors;
}

const DESIGN_TOKEN_VERSION = /^0\.1\.0(?:[-+].*)?$/;
const DESIGN_HEX = /^#[0-9a-fA-F]{6}$/;
const DESIGN_LENGTH = /^(\d+(\.\d+)?)(rem|px)$/;
const DESIGN_ART_KIND_ENUM = new Set(['svg-line', 'svg-fill']);
const DESIGN_STATUS_ENUM = new Set(['format-seed', 'active', 'archived']);
const DESIGN_REQUIRED_COLORS = ['background', 'surface', 'text', 'mutedText', 'border', 'accent', 'accentText', 'focus', 'link', 'success', 'warning', 'danger'];
const DESIGN_REQUIRED_TYPE = {
  display: { size: '1.65rem', lineHeight: 1.2 },
  heading: { size: '1.06rem', lineHeight: 1.35 },
  body: { size: '0.95rem', lineHeight: 1.5 },
  meta: { size: '0.74rem', lineHeight: 1.35 }
};
const DESIGN_REQUIRED_SPACE = { xs: '0.35rem', md: '0.75rem', xl: '1.5rem' };
// 2026-08-06: the shape scale went sharp, deliberately (see research/design_tokens_audit.js for
// the full note). One radius for everything that sits on the paper; the pill is gone as a shape.
const DESIGN_REQUIRED_RADIUS = { control: '0.25rem', card: '0.25rem', panel: '0.25rem', pill: '3px' };
const DESIGN_REQUIRED_DAY_CYCLE_CSS_VARS = [
  '--day-dawn-bg', '--day-dawn-surface', '--day-dawn-pill', '--day-dawn-line', '--day-dawn-ink', '--day-dawn-muted', '--day-dawn-hint', '--day-dawn-accent', '--day-dawn-warn',
  '--day-noon-bg', '--day-noon-surface', '--day-noon-pill', '--day-noon-line', '--day-noon-ink', '--day-noon-muted', '--day-noon-hint', '--day-noon-accent', '--day-noon-warn',
  '--day-dusk-bg', '--day-dusk-surface', '--day-dusk-pill', '--day-dusk-line', '--day-dusk-ink', '--day-dusk-muted', '--day-dusk-hint', '--day-dusk-accent', '--day-dusk-warn',
  '--day-night-bg', '--day-night-surface', '--day-night-pill', '--day-night-line', '--day-night-ink', '--day-night-muted', '--day-night-hint', '--day-night-accent', '--day-night-warn'
];
const DESIGN_REQUIRED_BLOOM_CSS_VARS = [
  '--bloom-planet-petal', '--bloom-planet-center',
  '--bloom-people-petal', '--bloom-people-center',
  '--bloom-health-petal', '--bloom-health-center',
  '--bloom-honesty-petal', '--bloom-honesty-center',
  '--bloom-privacy-petal', '--bloom-privacy-center',
  '--bloom-animals-petal', '--bloom-animals-center',
  '--bloom-cost-petal', '--bloom-cost-center',
  '--bloom-local-petal', '--bloom-local-center'
];
const DESIGN_REQUIRED_MOTION_CSS_VARS = ['--dur-micro', '--dur-hover', '--dur-reveal', '--dur-rerank', '--dur-bloom', '--ease-breathe', '--ease-settle', '--ease-rerank', '--ease-bloom'];
const DESIGN_REQUIRED_MATERIALITY_CSS_VARS = ['--paper-grain-opacity', '--paper-grain-scale', '--paper-grain-contrast-limit', '--shadow-soft', '--shadow-lift'];
const DESIGN_REQUIRED_CSS_VARS = [
  '--bg', '--surface', '--track', '--pill', '--ink', '--muted', '--hint', '--line', '--accent', '--accent-text', '--warn',
  ...DESIGN_REQUIRED_BLOOM_CSS_VARS,
  ...DESIGN_REQUIRED_DAY_CYCLE_CSS_VARS,
  '--font-sans', '--font-display', '--font-mono', '--fs-xs', '--fs-base', '--fs-md', '--fs-xl',
  '--lh-tight', '--lh-snug', '--lh-base', '--sp-2', '--sp-3', '--sp-5',
  '--r-1', '--r-2', '--r-3', '--r-pill', '--radius', '--dur-1', '--dur-2', '--ease',
  ...DESIGN_REQUIRED_MOTION_CSS_VARS,
  '--e1', '--e2',
  ...DESIGN_REQUIRED_MATERIALITY_CSS_VARS
];
const DESIGN_BLOOM_THEMES = ['planet', 'people', 'health', 'honesty', 'privacy', 'animals', 'cost', 'local'];
const DESIGN_REQUIRED_RAMP_FAMILIES = ['soil', 'leaf', 'water', 'light'];
const DESIGN_REQUIRED_MODE_ALIASES = ['bg', 'surface', 'pill', 'line', 'ink', 'muted', 'hint', 'accent', 'warn'];
const DESIGN_REQUIRED_DAY_CYCLE_VARIANTS = ['dawn', 'noon', 'dusk', 'night'];
const DESIGN_REQUIRED_MATERIALITY_SURFACES = ['page-paper', 'card-paper', 'quiet-band'];
const DESIGN_REQUIRED_MOTION_CURVES = ['breathe', 'settle', 'rerank', 'bloom'];
const DESIGN_REQUIRED_MOTION_DURATIONS = ['micro', 'hover', 'reveal', 'rerank', 'bloom'];
const DESIGN_REQUIRED_MOTION_INTENTS = ['hover-feedback', 'panel-reveal', 'rank-rerank', 'value-bloom-draw'];
const DESIGN_REQUIRED_SKIN_READINESS = ['h1-palette', 'h2-day-cycle', 'h3-motion', 'h4-value-bloom', 'h5-materiality'];
const DESIGN_SAFE_MOTION_PROPERTIES = new Set(['opacity', 'border-color', 'background-color', 'color', 'transform', 'stroke-dashoffset']);

function designSameArray(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => item === b[i]);
}

function designHexToRgb(hex) {
  const normalized = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255
  };
}

function designLinear(channel) {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function designLuminance(hex) {
  const rgb = designHexToRgb(hex);
  if (!rgb) return null;
  return 0.2126 * designLinear(rgb.r) + 0.7152 * designLinear(rgb.g) + 0.0722 * designLinear(rgb.b);
}

function designContrastRatio(foreground, background) {
  const fg = designLuminance(foreground);
  const bg = designLuminance(background);
  if (fg == null || bg == null) return null;
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function validateDesignReference(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be object`];
  push(errors, isString(value.label), `${label}.label: missing label`);
  push(errors, isString(value.url) && URL.test(value.url), `${label}.url: missing http(s) url`);
  push(errors, isString(value.asof) && YEAR.test(value.asof), `${label}.asof: missing year`);
  return errors;
}

function validateDesignColorToken(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be object`];
  push(errors, DESIGN_HEX.test(String(value.value || '')), `${label}.value: invalid hex`);
  push(errors, isString(value.role), `${label}.role: missing role`);
  return errors;
}

function validateDesignColorRamps(value, label, requireCore = false) {
  const errors = [];
  if (!isObject(value)) {
    if (requireCore) errors.push(`${label}: missing H1 color ramps`);
    return errors;
  }
  for (const family of DESIGN_REQUIRED_RAMP_FAMILIES) {
    if (requireCore) push(errors, isObject(value[family]), `${label}.${family}: missing required ramp`);
  }
  for (const [family, ramp] of Object.entries(value)) {
    const at = `${label}.${family}`;
    if (!isObject(ramp)) {
      errors.push(`${at}: must be object`);
      continue;
    }
    push(errors, Object.keys(ramp).length >= 4, `${at}: expected at least four stops`);
    for (const [stop, color] of Object.entries(ramp)) {
      push(errors, /^\d+$/.test(stop), `${at}.${stop}: stop must be numeric`);
      push(errors, DESIGN_HEX.test(String(color || '')), `${at}.${stop}: invalid hex`);
    }
  }
  return errors;
}

function validateDesignColorModes(value, label, requireCore = false) {
  const errors = [];
  if (!isObject(value)) {
    if (requireCore) errors.push(`${label}: missing H1 color modes`);
    return errors;
  }
  if (value.status != null) push(errors, isString(value.status), `${label}.status: missing status`);
  if (value.pilotColors != null) errors.push(...validateStringArray(value.pilotColors, `${label}.pilotColors`));
  for (const mode of ['light', 'dark']) {
    const entry = value[mode];
    if (requireCore) push(errors, isObject(entry), `${label}.${mode}: missing mode`);
    if (!isObject(entry)) continue;
    push(errors, isObject(entry.aliases), `${label}.${mode}.aliases: missing aliases`);
    if (isObject(entry.aliases)) {
      for (const alias of DESIGN_REQUIRED_MODE_ALIASES) {
        push(errors, DESIGN_HEX.test(String(entry.aliases[alias] || '')), `${label}.${mode}.aliases.${alias}: invalid hex`);
      }
    }
    if (!Array.isArray(entry.contrastPairs) || !entry.contrastPairs.length) {
      errors.push(`${label}.${mode}.contrastPairs: missing non-empty array`);
      continue;
    }
    entry.contrastPairs.forEach((pair, i) => {
      const at = `${label}.${mode}.contrastPairs[${i}]`;
      if (!isObject(pair)) {
        errors.push(`${at}: must be object`);
        return;
      }
      push(errors, KEBAB.test(String(pair.id || '')), `${at}.id: invalid id`);
      push(errors, isString(pair.fg), `${at}.fg: missing alias`);
      push(errors, isString(pair.bg), `${at}.bg: missing alias`);
      push(errors, Number.isFinite(pair.minimum) && pair.minimum >= 3, `${at}.minimum: must be at least 3`);
      const fg = entry.aliases && entry.aliases[pair.fg];
      const bg = entry.aliases && entry.aliases[pair.bg];
      if (fg && bg) {
        const ratio = designContrastRatio(fg, bg);
        push(errors, ratio != null && ratio >= pair.minimum, `${at}: contrast below minimum`);
      }
    });
  }
  return errors;
}

function validateDesignDayCycle(value, label, requireCore = false) {
  const errors = [];
  if (!requireCore && isObject(value) && Object.keys(value).length === 0) return errors;
  if (!isObject(value)) {
    if (requireCore) errors.push(`${label}: missing H2 day-cycle variants`);
    return errors;
  }
  push(errors, value.status === 'h2-token-substrate', `${label}.status: expected h2-token-substrate`);
  push(errors, isString(value.consumer), `${label}.consumer: missing consumer`);
  push(errors, value.defaultMode === 'noon', `${label}.defaultMode: expected noon`);
  if (!isObject(value.variants)) {
    errors.push(`${label}.variants: missing object`);
    return errors;
  }
  for (const variant of DESIGN_REQUIRED_DAY_CYCLE_VARIANTS) {
    const entry = value.variants[variant];
    push(errors, isObject(entry), `${label}.variants.${variant}: missing variant`);
    if (!isObject(entry)) continue;
    push(errors, isString(entry.label), `${label}.variants.${variant}.label: missing label`);
    push(errors, isString(entry.role), `${label}.variants.${variant}.role: missing role`);
    push(errors, isObject(entry.aliases), `${label}.variants.${variant}.aliases: missing aliases`);
    if (isObject(entry.aliases)) {
      for (const alias of DESIGN_REQUIRED_MODE_ALIASES) {
        push(errors, DESIGN_HEX.test(String(entry.aliases[alias] || '')), `${label}.variants.${variant}.aliases.${alias}: invalid hex`);
      }
    }
    if (!Array.isArray(entry.contrastPairs) || entry.contrastPairs.length < 4) {
      errors.push(`${label}.variants.${variant}.contrastPairs: expected at least four pairs`);
      continue;
    }
    entry.contrastPairs.forEach((pair, i) => {
      const at = `${label}.variants.${variant}.contrastPairs[${i}]`;
      if (!isObject(pair)) {
        errors.push(`${at}: must be object`);
        return;
      }
      push(errors, KEBAB.test(String(pair.id || '')), `${at}.id: invalid id`);
      push(errors, isString(pair.fg), `${at}.fg: missing alias`);
      push(errors, isString(pair.bg), `${at}.bg: missing alias`);
      push(errors, Number.isFinite(pair.minimum) && pair.minimum >= 3, `${at}.minimum: must be at least 3`);
      const fg = entry.aliases && entry.aliases[pair.fg];
      const bg = entry.aliases && entry.aliases[pair.bg];
      if (fg && bg) {
        const ratio = designContrastRatio(fg, bg);
        push(errors, ratio != null && ratio >= pair.minimum, `${at}: contrast below minimum`);
      }
    });
  }
  errors.push(...validateStringArray(value.mustNot, `${label}.mustNot`));
  return errors;
}

function validateDesignSignature(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be object`];
  for (const [theme, score] of Object.entries(value)) {
    push(errors, DESIGN_BLOOM_THEMES.includes(theme), `${label}.${theme}: unknown bloom theme`);
    push(errors, Number.isFinite(score) && score >= 0 && score <= 100, `${label}.${theme}: must be 0..100`);
  }
  return errors;
}

function validateDesignValueSignatureCoverage(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing object`];
  for (const key of ['categories', 'entries', 'scoredEntries', 'signedEntries', 'drawableEntries', 'missingSignatureEntries', 'staleSignatureEntries']) {
    push(errors, Number.isInteger(value[key]) && value[key] >= 0, `${label}.${key}: must be nonnegative integer`);
  }
  push(errors, Number.isInteger(value.minimumThemesForBloom) && value.minimumThemesForBloom >= 2, `${label}.minimumThemesForBloom: must be at least 2`);
  push(errors, isObject(value.themeCounts), `${label}.themeCounts: missing object`);
  if (isObject(value.themeCounts)) {
    for (const [theme, count] of Object.entries(value.themeCounts)) {
      push(errors, DESIGN_BLOOM_THEMES.includes(theme), `${label}.themeCounts.${theme}: unknown bloom theme`);
      push(errors, Number.isInteger(count) && count >= 0, `${label}.themeCounts.${theme}: must be nonnegative integer`);
    }
  }
  return errors;
}

function validateDesignValueBloom(value, label, generated = false) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing H4 value-bloom contract`];
  push(errors, value.status === 'h4-token-substrate', `${label}.status: expected h4-token-substrate`);
  push(errors, isString(value.consumer), `${label}.consumer: missing consumer`);
  push(errors, isString(value.sourceFunction) && value.sourceFunction.includes('CC.engine.signature'), `${label}.sourceFunction: expected CC.engine.signature`);
  push(errors, Number.isInteger(value.minimumThemesForBloom) && value.minimumThemesForBloom >= 2, `${label}.minimumThemesForBloom: must be at least 2`);
  push(errors, isString(value.scoreScale), `${label}.scoreScale: missing scale note`);
  push(errors, designSameArray(value.order, DESIGN_BLOOM_THEMES), `${label}.order: must match canonical theme order`);
  if (!Array.isArray(value.themes) || value.themes.length !== DESIGN_BLOOM_THEMES.length) errors.push(`${label}.themes: expected ${DESIGN_BLOOM_THEMES.length} themes`);
  else value.themes.forEach((theme, i) => {
    const at = `${label}.themes[${i}]`;
    if (!isObject(theme)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, theme.id === DESIGN_BLOOM_THEMES[i], `${at}.id: expected ${DESIGN_BLOOM_THEMES[i]}`);
    push(errors, isString(theme.label), `${at}.label: missing label`);
    push(errors, isString(theme.universal), `${at}.universal: missing universal`);
    push(errors, DESIGN_HEX.test(String(theme.petalColor || '')), `${at}.petalColor: invalid hex`);
    push(errors, DESIGN_HEX.test(String(theme.centerColor || '')), `${at}.centerColor: invalid hex`);
    push(errors, isString(theme.role), `${at}.role: missing role`);
  });
  const vector = value.signatureVector;
  if (!isObject(vector)) errors.push(`${label}.signatureVector: missing object`);
  else {
    push(errors, vector.status === 'optional-materialization-contract', `${label}.signatureVector.status: expected optional-materialization-contract`);
    push(errors, vector.field === 'valueSignature', `${label}.signatureVector.field: expected valueSignature`);
    push(errors, designSameArray(vector.order, DESIGN_BLOOM_THEMES), `${label}.signatureVector.order: must match canonical theme order`);
    push(errors, vector.omitMissing === true, `${label}.signatureVector.omitMissing: must be true`);
    push(errors, isString(vector.shape), `${label}.signatureVector.shape: missing shape`);
    errors.push(...validateStringArray(vector.mustNot, `${label}.signatureVector.mustNot`));
  }
  if (generated) {
    errors.push(...validateDesignValueSignatureCoverage(value.signatureCoverage, `${label}.signatureCoverage`));
    if (!Array.isArray(value.previewFixtures) || value.previewFixtures.length < 3) errors.push(`${label}.previewFixtures: expected at least three fixtures`);
    else value.previewFixtures.forEach((fixture, i) => {
      const at = `${label}.previewFixtures[${i}]`;
      if (!isObject(fixture)) {
        errors.push(`${at}: must be object`);
        return;
      }
      push(errors, KEBAB.test(String(fixture.category || '')), `${at}.category: invalid category`);
      push(errors, isString(fixture.code), `${at}.code: missing code`);
      push(errors, isString(fixture.name), `${at}.name: missing name`);
      push(errors, isString(fixture.route) && fixture.route.startsWith('#card/'), `${at}.route: expected card route`);
      push(errors, Number.isInteger(fixture.themeCount) && fixture.themeCount >= value.minimumThemesForBloom, `${at}.themeCount: below bloom floor`);
      errors.push(...validateDesignSignature(fixture.signature, `${at}.signature`));
    });
  }
  return errors;
}

function validateDesignTypographyMap(value, label) {
  const errors = [];
  if (!isObject(value) || !Object.keys(value).length) return [`${label}: missing non-empty object`];
  for (const [key, expected] of Object.entries(DESIGN_REQUIRED_TYPE)) {
    const token = value[key];
    if (!isObject(token)) {
      errors.push(`${label}.${key}: missing token`);
      continue;
    }
    push(errors, token.size === expected.size, `${label}.${key}.size: expected ${expected.size}`);
    push(errors, token.lineHeight === expected.lineHeight, `${label}.${key}.lineHeight: expected ${expected.lineHeight}`);
  }
  for (const [key, token] of Object.entries(value)) {
    const at = `${label}.${key}`;
    if (!isObject(token)) {
      errors.push(`${at}: must be object`);
      continue;
    }
    push(errors, isString(token.family), `${at}.family: missing family`);
    push(errors, DESIGN_LENGTH.test(String(token.size || '')), `${at}.size: must use rem or px`);
    push(errors, Number.isFinite(token.lineHeight) && token.lineHeight >= 1 && token.lineHeight <= 2, `${at}.lineHeight: must be 1..2`);
  }
  return errors;
}

function validateDesignLengthMap(value, label) {
  const errors = [];
  if (!isObject(value) || !Object.keys(value).length) return [`${label}: missing non-empty object`];
  for (const [key, entry] of Object.entries(value)) {
    push(errors, DESIGN_LENGTH.test(String(entry || '')), `${label}.${key}: must use rem or px`);
  }
  return errors;
}

function validateDesignRhythmMap(value, required, label) {
  const errors = validateDesignLengthMap(value, label);
  if (!isObject(value)) return errors;
  for (const [key, expected] of Object.entries(required)) {
    push(errors, value[key] === expected, `${label}.${key}: expected ${expected}`);
  }
  return errors;
}

function validateDesignElevation(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing object`];
  const entries = Object.entries(value);
  push(errors, entries.length > 0 && entries.length <= 2, `${label}: expected one or two shadow levels`);
  for (const [key, entry] of entries) {
    push(errors, /^level[12]$/.test(key), `${label}.${key}: only level1/level2 allowed`);
    push(errors, isString(entry), `${label}.${key}: missing shadow value`);
    push(errors, /rgba\(/.test(String(entry || '')), `${label}.${key}: should use soft rgba shadow`);
  }
  return errors;
}

function validateDesignMateriality(value, label, colors = {}, requireCore = false) {
  const errors = [];
  if (!requireCore && isObject(value) && Object.keys(value).length === 0) return errors;
  if (!isObject(value)) {
    if (requireCore) errors.push(`${label}: missing H5 materiality contract`);
    return errors;
  }
  push(errors, value.status === 'h5-token-substrate', `${label}.status: expected h5-token-substrate`);
  push(errors, isString(value.consumer), `${label}.consumer: missing consumer`);
  if (!isObject(value.paperGrain)) errors.push(`${label}.paperGrain: missing object`);
  else {
    push(errors, Number.isFinite(value.paperGrain.opacity) && value.paperGrain.opacity > 0 && value.paperGrain.opacity <= 0.08, `${label}.paperGrain.opacity: must stay subtle`);
    push(errors, Number.isInteger(value.paperGrain.scalePx) && value.paperGrain.scalePx >= 96 && value.paperGrain.scalePx <= 320, `${label}.paperGrain.scalePx: out of range`);
    push(errors, Number.isFinite(value.paperGrain.contrastLimit) && value.paperGrain.contrastLimit > 0 && value.paperGrain.contrastLimit <= 0.1, `${label}.paperGrain.contrastLimit: too high`);
    errors.push(...validateStringArray(value.paperGrain.tokens, `${label}.paperGrain.tokens`));
    for (const token of value.paperGrain.tokens || []) push(errors, isObject(colors[token]), `${label}.paperGrain.tokens: unknown color token ${token}`);
    errors.push(...validateStringArray(value.paperGrain.mustNot, `${label}.paperGrain.mustNot`));
  }
  if (!isObject(value.shadow)) errors.push(`${label}.shadow: missing object`);
  else {
    push(errors, value.shadow.style === 'warm-soft', `${label}.shadow.style: expected warm-soft`);
    push(errors, value.shadow.source === 'tokens.elevation', `${label}.shadow.source: expected tokens.elevation`);
    push(errors, value.shadow.maxLevels === 2, `${label}.shadow.maxLevels: expected 2`);
    errors.push(...validateStringArray(value.shadow.mustNot, `${label}.shadow.mustNot`));
  }
  const surfaces = Array.isArray(value.surfaces) ? value.surfaces : [];
  if (surfaces.length < DESIGN_REQUIRED_MATERIALITY_SURFACES.length) errors.push(`${label}.surfaces: expected materiality surface list`);
  const ids = new Set();
  surfaces.forEach((surface, i) => {
    const at = `${label}.surfaces[${i}]`;
    if (!isObject(surface)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, KEBAB.test(String(surface.id || '')), `${at}.id: invalid id`);
    if (surface.id) {
      push(errors, !ids.has(surface.id), `${at}.id: duplicate ${surface.id}`);
      ids.add(surface.id);
    }
    push(errors, isObject(colors[surface.token]), `${at}.token: unknown color token ${surface.token || '(missing)'}`);
    push(errors, surface.grain === 'paperGrain', `${at}.grain: expected paperGrain`);
    push(errors, isString(surface.role), `${at}.role: missing role`);
  });
  for (const id of DESIGN_REQUIRED_MATERIALITY_SURFACES) push(errors, ids.has(id), `${label}.surfaces: missing ${id}`);
  return errors;
}

function validateDesignMotion(value, label, requireH3 = false) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing object`];
  for (const key of ['durationFast', 'durationBase', 'durationSlow']) {
    push(errors, Number.isInteger(value[key]) && value[key] >= 0 && value[key] <= 150, `${label}.${key}: must be 0..150ms`);
  }
  if (Number.isInteger(value.durationFast) && Number.isInteger(value.durationBase) && Number.isInteger(value.durationSlow)) {
    push(errors, value.durationFast <= value.durationBase && value.durationBase <= value.durationSlow, `${label}: durations must ascend`);
  }
  push(errors, Number.isInteger(value.durationRerank) && value.durationRerank >= 200 && value.durationRerank <= 500, `${label}.durationRerank: expected the one larger FLIP rerank duration`);
  push(errors, isString(value.easing), `${label}.easing: missing easing`);
  push(errors, isString(value.reducedMotion), `${label}.reducedMotion: missing reduced motion policy`);
  push(errors, Number.isInteger(value.maxMovingElements) && value.maxMovingElements >= 0 && value.maxMovingElements <= 16, `${label}.maxMovingElements: must be 0..16`);
  errors.push(...validateStringArray(value.mustNot, `${label}.mustNot`));
  const hasH3 = requireH3 || value.status != null || value.curves != null || value.settleDurations != null || value.intents != null || value.reducedMotionPolicy != null;
  if (!hasH3) return errors;
  push(errors, value.status === 'h3-token-substrate', `${label}.status: expected h3-token-substrate`);
  push(errors, isString(value.consumer), `${label}.consumer: missing consumer`);
  push(errors, isObject(value.curves), `${label}.curves: missing H3 curves`);
  if (isObject(value.curves)) {
    for (const id of DESIGN_REQUIRED_MOTION_CURVES) {
      push(errors, /^cubic-bezier\(/.test(String(value.curves[id] || '')), `${label}.curves.${id}: expected cubic-bezier curve`);
    }
  }
  push(errors, isObject(value.settleDurations), `${label}.settleDurations: missing H3 duration map`);
  if (isObject(value.settleDurations)) {
    for (const id of DESIGN_REQUIRED_MOTION_DURATIONS) {
      push(errors, Number.isInteger(value.settleDurations[id]) && value.settleDurations[id] >= 0 && value.settleDurations[id] <= 600, `${label}.settleDurations.${id}: out of range`);
    }
    push(errors, value.settleDurations.micro === value.durationFast, `${label}.settleDurations.micro: must match durationFast`);
    push(errors, value.settleDurations.hover === value.durationBase, `${label}.settleDurations.hover: must match durationBase`);
    push(errors, value.settleDurations.rerank === value.durationRerank, `${label}.settleDurations.rerank: must match durationRerank`);
  }
  const intents = Array.isArray(value.intents) ? value.intents : [];
  if (intents.length < DESIGN_REQUIRED_MOTION_INTENTS.length) errors.push(`${label}.intents: missing H3 intent list`);
  const intentIds = new Set();
  intents.forEach((intent, i) => {
    const at = `${label}.intents[${i}]`;
    if (!isObject(intent)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, DESIGN_REQUIRED_MOTION_INTENTS.includes(intent.id), `${at}.id: unexpected intent ${intent.id || '(missing)'}`);
    if (intent.id) {
      push(errors, !intentIds.has(intent.id), `${at}.id: duplicate ${intent.id}`);
      intentIds.add(intent.id);
    }
    push(errors, isObject(value.settleDurations) && Number.isInteger(value.settleDurations[intent.duration]), `${at}.duration: unknown duration key`);
    push(errors, isObject(value.curves) && isString(value.curves[intent.curve]), `${at}.curve: unknown curve key`);
    push(errors, Number.isInteger(intent.maxDistancePx) && intent.maxDistancePx >= 0 && intent.maxDistancePx <= 24, `${at}.maxDistancePx: must be 0..24`);
    if (intent.maxMovingElements != null) push(errors, Number.isInteger(intent.maxMovingElements) && intent.maxMovingElements <= value.maxMovingElements, `${at}.maxMovingElements: exceeds profile cap`);
    errors.push(...validateStringArray(intent.allowedProperties, `${at}.allowedProperties`));
    for (const prop of intent.allowedProperties || []) push(errors, DESIGN_SAFE_MOTION_PROPERTIES.has(prop), `${at}.allowedProperties: unsafe property ${prop}`);
    errors.push(...validateStringArray(intent.mustNot, `${at}.mustNot`));
  });
  for (const id of DESIGN_REQUIRED_MOTION_INTENTS) push(errors, intentIds.has(id), `${label}.intents: missing ${id}`);
  if (!isObject(value.reducedMotionPolicy)) errors.push(`${label}.reducedMotionPolicy: missing object`);
  else {
    push(errors, value.reducedMotionPolicy.mode === value.reducedMotion, `${label}.reducedMotionPolicy.mode: must match reducedMotion`);
    errors.push(...validateStringArray(value.reducedMotionPolicy.allowedProperties, `${label}.reducedMotionPolicy.allowedProperties`));
    for (const prop of value.reducedMotionPolicy.allowedProperties || []) {
      push(errors, DESIGN_SAFE_MOTION_PROPERTIES.has(prop), `${label}.reducedMotionPolicy.allowedProperties: unsafe property ${prop}`);
      push(errors, prop !== 'transform' && prop !== 'stroke-dashoffset', `${label}.reducedMotionPolicy.allowedProperties: reduced motion must not include ${prop}`);
    }
    errors.push(...validateStringArray(value.reducedMotionPolicy.mustNot, `${label}.reducedMotionPolicy.mustNot`));
  }
  return errors;
}

function validateDesignCssVariableMapping(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing object`];
  push(errors, value.status === 'i3-review-table', `${label}.status: must be i3-review-table`);
  push(errors, isString(value.consumer), `${label}.consumer: missing named consumer`);
  push(errors, isString(value.sourceProfile), `${label}.sourceProfile: missing source profile`);
  push(errors, isString(value.note), `${label}.note: missing note`);
  if (!Array.isArray(value.rows) || value.rows.length < DESIGN_REQUIRED_CSS_VARS.length) {
    errors.push(`${label}.rows: expected a complete one-page mapping table`);
    return errors;
  }
  const cssVars = new Set();
  value.rows.forEach((row, i) => {
    const at = `${label}.rows[${i}]`;
    if (!isObject(row)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$/.test(String(row.token || '')), `${at}.token: invalid token path`);
    push(errors, /^--[a-z0-9-]+$/.test(String(row.cssVariable || '')), `${at}.cssVariable: invalid CSS variable`);
    push(errors, isString(row.role), `${at}.role: missing role`);
    if (row.cssVariable) cssVars.add(row.cssVariable);
  });
  for (const cssVar of DESIGN_REQUIRED_CSS_VARS) {
    push(errors, cssVars.has(cssVar), `${label}.rows: missing mapping for ${cssVar}`);
  }
  return errors;
}

function validateDesignSkinReadiness(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: missing object`];
  push(errors, value.status === 'substrate-ready' || value.status === 'blocked', `${label}.status: must be substrate-ready or blocked`);
  push(errors, isString(value.consumer), `${label}.consumer: missing consumer`);
  push(errors, isString(value.sourceProfile), `${label}.sourceProfile: missing sourceProfile`);
  push(errors, value.dataOnlyDrain === false, `${label}.dataOnlyDrain: must be false`);
  push(errors, isString(value.appOwnedNext), `${label}.appOwnedNext: missing app-owned next step`);
  errors.push(...validateStringArray(value.generatedFrom, `${label}.generatedFrom`));
  errors.push(...validateStringArray(value.mustNot, `${label}.mustNot`));

  const items = Array.isArray(value.items) ? value.items : [];
  if (items.length !== DESIGN_REQUIRED_SKIN_READINESS.length) errors.push(`${label}.items: expected ${DESIGN_REQUIRED_SKIN_READINESS.length} items`);
  const ids = new Set();
  let ready = 0;
  let blocked = 0;
  items.forEach((item, i) => {
    const at = `${label}.items[${i}]`;
    if (!isObject(item)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, DESIGN_REQUIRED_SKIN_READINESS.includes(item.id), `${at}.id: unexpected id ${item.id || '(missing)'}`);
    if (item.id) {
      push(errors, !ids.has(item.id), `${at}.id: duplicate ${item.id}`);
      ids.add(item.id);
    }
    push(errors, isString(item.label), `${at}.label: missing label`);
    push(errors, item.status === 'ready' || item.status === 'blocked', `${at}.status: must be ready or blocked`);
    if (item.status === 'ready') ready += 1;
    if (item.status === 'blocked') blocked += 1;
    push(errors, isString(item.consumer), `${at}.consumer: missing consumer`);
    errors.push(...validateStringArray(item.paths, `${at}.paths`));
    push(errors, isObject(item.evidence), `${at}.evidence: missing object`);
    push(errors, isString(item.appOwnedNext), `${at}.appOwnedNext: missing app-owned next step`);
  });
  for (const id of DESIGN_REQUIRED_SKIN_READINESS) push(errors, ids.has(id), `${label}.items: missing ${id}`);

  if (!isObject(value.coverage)) errors.push(`${label}.coverage: missing object`);
  else {
    push(errors, value.coverage.required === DESIGN_REQUIRED_SKIN_READINESS.length, `${label}.coverage.required: mismatch`);
    push(errors, value.coverage.ready === ready, `${label}.coverage.ready: mismatch`);
    push(errors, value.coverage.blocked === blocked, `${label}.coverage.blocked: mismatch`);
    push(errors, value.coverage.substrateOnly === true, `${label}.coverage.substrateOnly: must be true`);
  }
  if (value.status === 'substrate-ready') push(errors, blocked === 0, `${label}.status: substrate-ready requires zero blocked items`);
  return errors;
}

function validateDesignComponentContract(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be object`];
  push(errors, KEBAB.test(String(value.id || '')), `${label}.id: invalid id`);
  errors.push(...validateStringArray(value.tokens, `${label}.tokens`));
  errors.push(...validateStringArray(value.mustExpress, `${label}.mustExpress`));
  errors.push(...validateStringArray(value.mustNot, `${label}.mustNot`));
  return errors;
}

function validateDesignArtToken(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be object`];
  push(errors, KEBAB.test(String(value.id || '')), `${label}.id: invalid id`);
  push(errors, DESIGN_ART_KIND_ENUM.has(value.kind), `${label}.kind: unknown kind`);
  push(errors, isString(value.viewBox), `${label}.viewBox: missing viewBox`);
  push(errors, isString(value.stroke), `${label}.stroke: missing stroke`);
  push(errors, isString(value.fill), `${label}.fill: missing fill`);
  push(errors, isString(value.path) && /^M/i.test(value.path), `${label}.path: must start with M`);
  push(errors, isString(value.usage), `${label}.usage: missing usage`);
  return errors;
}

function validateDesignSourceProfile(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be object`];
  push(errors, KEBAB.test(String(value.id || '')), `${label}.id: invalid id`);
  push(errors, isString(value.label), `${label}.label: missing label`);
  push(errors, isString(value.role), `${label}.role: missing role`);
  push(errors, DESIGN_STATUS_ENUM.has(value.status), `${label}.status: unknown status`);
  push(errors, isString(value.summary), `${label}.summary: missing summary`);
  if (!isObject(value.tokens)) errors.push(`${label}.tokens: missing object`);
  else {
    const colors = value.tokens.color;
    if (!isObject(colors)) errors.push(`${label}.tokens.color: missing object`);
    else {
      for (const key of DESIGN_REQUIRED_COLORS) push(errors, isObject(colors[key]), `${label}.tokens.color.${key}: missing token`);
      for (const [key, token] of Object.entries(colors)) errors.push(...validateDesignColorToken(token, `${label}.tokens.color.${key}`));
    }
    errors.push(...validateDesignColorRamps(value.tokens.colorRamps, `${label}.tokens.colorRamps`, value.id === 'quiet-commons'));
    errors.push(...validateDesignColorModes(value.tokens.colorModes, `${label}.tokens.colorModes`, value.id === 'quiet-commons'));
    errors.push(...validateDesignDayCycle(value.tokens.dayCycle, `${label}.tokens.dayCycle`, value.id === 'quiet-commons'));
    errors.push(...validateDesignTypographyMap(value.tokens.typography, `${label}.tokens.typography`));
    errors.push(...validateDesignRhythmMap(value.tokens.space, DESIGN_REQUIRED_SPACE, `${label}.tokens.space`));
    errors.push(...validateDesignRhythmMap(value.tokens.radius, DESIGN_REQUIRED_RADIUS, `${label}.tokens.radius`));
    errors.push(...validateDesignMotion(value.tokens.motion, `${label}.tokens.motion`, value.id === 'quiet-commons'));
    errors.push(...validateDesignElevation(value.tokens.elevation, `${label}.tokens.elevation`));
    errors.push(...validateDesignMateriality(value.tokens.materiality, `${label}.tokens.materiality`, colors || {}, value.id === 'quiet-commons'));
  }
  if (!Array.isArray(value.contrastPairs) || !value.contrastPairs.length) errors.push(`${label}.contrastPairs: missing non-empty array`);
  else {
    const colors = isObject(value.tokens) && isObject(value.tokens.color) ? value.tokens.color : {};
    value.contrastPairs.forEach((pair, i) => {
      const at = `${label}.contrastPairs[${i}]`;
      if (!isObject(pair)) {
        errors.push(`${at}: must be object`);
        return;
      }
      push(errors, KEBAB.test(String(pair.id || '')), `${at}.id: invalid id`);
      push(errors, isString(pair.fg) && isObject(colors[pair.fg]), `${at}.fg: unknown color ${pair.fg || '(missing)'}`);
      push(errors, isString(pair.bg) && isObject(colors[pair.bg]), `${at}.bg: unknown color ${pair.bg || '(missing)'}`);
      push(errors, isString(pair.purpose), `${at}.purpose: missing purpose`);
      push(errors, Number.isFinite(pair.minimum) && pair.minimum >= 3, `${at}.minimum: must be at least 3`);
      if (colors[pair.fg] && colors[pair.bg]) {
        const ratio = designContrastRatio(colors[pair.fg].value, colors[pair.bg].value);
        push(errors, ratio != null && ratio >= pair.minimum, `${at}: contrast below minimum`);
      }
    });
  }
  if (!Array.isArray(value.componentContracts) || !value.componentContracts.length) errors.push(`${label}.componentContracts: missing non-empty array`);
  else value.componentContracts.forEach((contract, i) => errors.push(...validateDesignComponentContract(contract, `${label}.componentContracts[${i}]`)));
  if (!Array.isArray(value.artTokens) || !value.artTokens.length) errors.push(`${label}.artTokens: missing non-empty array`);
  else value.artTokens.forEach((art, i) => errors.push(...validateDesignArtToken(art, `${label}.artTokens[${i}]`)));
  return errors;
}

function validateDesignTokens(value, label = 'design-tokens') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-design-tokens', `${label}: wrong format`);
  push(errors, DESIGN_TOKEN_VERSION.test(String(value.version || '')), `${label}.version: must be 0.1.0 semver`);
  push(errors, value.standard === 'open-values-standard', `${label}.standard: wrong standard`);
  push(errors, DATE.test(String(value.updated || '')), `${label}.updated: must be YYYY-MM-DD`);
  push(errors, isString(value.purpose), `${label}.purpose: missing purpose`);
  errors.push(...validateStringArray(value.principles, `${label}.principles`));
  if (value.references != null) {
    if (!Array.isArray(value.references)) errors.push(`${label}.references: must be array`);
    else value.references.forEach((reference, i) => errors.push(...validateDesignReference(reference, `${label}.references[${i}]`)));
  }
  errors.push(...validateDesignValueBloom(value.valueBloom, `${label}.valueBloom`));
  errors.push(...validateDesignCssVariableMapping(value.cssVariableMapping, `${label}.cssVariableMapping`));
  const ids = new Set();
  if (!Array.isArray(value.profiles) || !value.profiles.length) errors.push(`${label}.profiles: missing non-empty array`);
  else value.profiles.forEach((profile, i) => {
    const at = `${label}.profiles[${i}]`;
    errors.push(...validateDesignSourceProfile(profile, at));
    if (profile && profile.id) {
      if (ids.has(profile.id)) errors.push(`${at}.id: duplicate ${profile.id}`);
      ids.add(profile.id);
    }
  });
  return errors;
}

function validateDesignIndexProfile(value, label) {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be object`];
  push(errors, KEBAB.test(String(value.id || '')), `${label}.id: invalid id`);
  push(errors, isString(value.label), `${label}.label: missing label`);
  push(errors, isString(value.role), `${label}.role: missing role`);
  push(errors, DESIGN_STATUS_ENUM.has(value.status), `${label}.status: unknown status`);
  push(errors, isString(value.summary), `${label}.summary: missing summary`);
  push(errors, isObject(value.cssVariables), `${label}.cssVariables: missing object`);
  if (!Array.isArray(value.colorTokens) || !value.colorTokens.length) errors.push(`${label}.colorTokens: missing non-empty array`);
  else value.colorTokens.forEach((token, i) => {
    const at = `${label}.colorTokens[${i}]`;
    if (!isObject(token)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, isString(token.id), `${at}.id: missing id`);
    push(errors, DESIGN_HEX.test(String(token.value || '')), `${at}.value: invalid hex`);
    push(errors, isString(token.role), `${at}.role: missing role`);
  });
  errors.push(...validateDesignColorRamps(value.colorRamps, `${label}.colorRamps`, value.id === 'quiet-commons'));
  errors.push(...validateDesignColorModes(value.colorModes, `${label}.colorModes`, value.id === 'quiet-commons'));
  errors.push(...validateDesignDayCycle(value.dayCycle, `${label}.dayCycle`, value.id === 'quiet-commons'));
  errors.push(...validateDesignTypographyMap(value.typography, `${label}.typography`));
  errors.push(...validateDesignRhythmMap(value.space, DESIGN_REQUIRED_SPACE, `${label}.space`));
  errors.push(...validateDesignRhythmMap(value.radius, DESIGN_REQUIRED_RADIUS, `${label}.radius`));
  errors.push(...validateDesignMotion(value.motion, `${label}.motion`, value.id === 'quiet-commons'));
  errors.push(...validateDesignElevation(value.elevation, `${label}.elevation`));
  const colorsById = {};
  for (const token of value.colorTokens || []) if (token && token.id) colorsById[token.id] = token;
  errors.push(...validateDesignMateriality(value.materiality, `${label}.materiality`, colorsById, value.id === 'quiet-commons'));
  let pass = 0;
  if (!Array.isArray(value.contrast) || !value.contrast.length) errors.push(`${label}.contrast: missing non-empty array`);
  else value.contrast.forEach((pair, i) => {
    const at = `${label}.contrast[${i}]`;
    if (!isObject(pair)) {
      errors.push(`${at}: must be object`);
      return;
    }
    push(errors, KEBAB.test(String(pair.id || '')), `${at}.id: invalid id`);
    push(errors, DESIGN_HEX.test(String(pair.foreground || '')), `${at}.foreground: invalid hex`);
    push(errors, DESIGN_HEX.test(String(pair.background || '')), `${at}.background: invalid hex`);
    push(errors, Number.isFinite(pair.minimum) && pair.minimum >= 3, `${at}.minimum: must be at least 3`);
    push(errors, Number.isFinite(pair.ratio), `${at}.ratio: missing numeric ratio`);
    push(errors, typeof pair.pass === 'boolean', `${at}.pass: must be boolean`);
    const ratio = designContrastRatio(pair.foreground, pair.background);
    if (ratio != null && Number.isFinite(pair.ratio)) {
      push(errors, Math.abs(Number(ratio.toFixed(2)) - pair.ratio) <= 0.02, `${at}.ratio: does not match computed contrast`);
      push(errors, pair.pass === (ratio >= pair.minimum), `${at}.pass: does not match computed contrast`);
    }
    if (pair.pass) pass += 1;
  });
  if (isObject(value.contrastSummary)) {
    push(errors, value.contrastSummary.pairs === (value.contrast || []).length, `${label}.contrastSummary.pairs: mismatch`);
    push(errors, value.contrastSummary.pass === pass, `${label}.contrastSummary.pass: mismatch`);
  } else {
    errors.push(`${label}.contrastSummary: missing object`);
  }
  if (!Array.isArray(value.componentContracts) || !value.componentContracts.length) errors.push(`${label}.componentContracts: missing non-empty array`);
  else value.componentContracts.forEach((contract, i) => errors.push(...validateDesignComponentContract(contract, `${label}.componentContracts[${i}]`)));
  if (!Array.isArray(value.artTokens) || !value.artTokens.length) errors.push(`${label}.artTokens: missing non-empty array`);
  else value.artTokens.forEach((art, i) => errors.push(...validateDesignArtToken(art, `${label}.artTokens[${i}]`)));
  return errors;
}

function validateDesignTokenIndex(value, label = 'design-token-index') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-design-token-index', `${label}: wrong format`);
  push(errors, DESIGN_TOKEN_VERSION.test(String(value.version || '')), `${label}.version: must be 0.1.0 semver`);
  push(errors, value.standard === 'open-values-standard', `${label}.standard: wrong standard`);
  push(errors, DATE.test(String(value.built || '')), `${label}.built: must be YYYY-MM-DD`);
  push(errors, isString(value.purpose), `${label}.purpose: missing purpose`);
  if (!isObject(value.generatedFrom)) errors.push(`${label}.generatedFrom: missing object`);
  else {
    push(errors, value.generatedFrom.path === 'content/design/tokens.json', `${label}.generatedFrom.path: must be content/design/tokens.json`);
    push(errors, DATE.test(String(value.generatedFrom.updated || '')), `${label}.generatedFrom.updated: must be YYYY-MM-DD`);
    push(errors, SHA256.test(String(value.generatedFrom.sha256 || '')), `${label}.generatedFrom.sha256: invalid sha256`);
  }
  errors.push(...validateStringArray(value.principles, `${label}.principles`));
  if (value.references != null) {
    if (!Array.isArray(value.references)) errors.push(`${label}.references: must be array`);
    else value.references.forEach((reference, i) => errors.push(...validateDesignReference(reference, `${label}.references[${i}]`)));
  }
  errors.push(...validateDesignValueBloom(value.valueBloom, `${label}.valueBloom`, true));
  errors.push(...validateDesignValueSignatureCoverage(value.valueSignatureCoverage, `${label}.valueSignatureCoverage`));
  errors.push(...validateDesignCssVariableMapping(value.cssVariableMapping, `${label}.cssVariableMapping`));

  const profiles = Array.isArray(value.profiles) ? value.profiles : [];
  if (!profiles.length) errors.push(`${label}.profiles: missing non-empty array`);
  profiles.forEach((profile, i) => errors.push(...validateDesignIndexProfile(profile, `${label}.profiles[${i}]`)));
  errors.push(...validateDesignSkinReadiness(value.skinReadiness, `${label}.skinReadiness`));

  if (!isObject(value.counts)) errors.push(`${label}.counts: missing object`);
  else {
    for (const key of ['profiles', 'colorTokens', 'contrastPairs', 'passingContrastPairs', 'failingContrastPairs', 'componentContracts', 'cssVariableMappings', 'bloomThemes', 'valueSignatures', 'drawableBloomEntries', 'bloomPreviewFixtures', 'dayCycleVariants', 'materialitySurfaces', 'motionCurves', 'motionIntents', 'skinReadinessItems', 'artTokens', 'artKinds']) {
      push(errors, Number.isInteger(value.counts[key]) && value.counts[key] >= 0, `${label}.counts.${key}: must be nonnegative integer`);
    }
    const allContrast = profiles.flatMap(profile => Array.isArray(profile.contrast) ? profile.contrast : []);
    const artKinds = new Set(profiles.flatMap(profile => Array.isArray(profile.artTokens) ? profile.artTokens.map(art => art.kind) : []));
    push(errors, value.counts.profiles === profiles.length, `${label}.counts.profiles: mismatch`);
    push(errors, value.counts.colorTokens === profiles.reduce((sum, profile) => sum + ((profile.colorTokens || []).length), 0), `${label}.counts.colorTokens: mismatch`);
    push(errors, value.counts.contrastPairs === allContrast.length, `${label}.counts.contrastPairs: mismatch`);
    push(errors, value.counts.passingContrastPairs === allContrast.filter(pair => pair.pass).length, `${label}.counts.passingContrastPairs: mismatch`);
    push(errors, value.counts.failingContrastPairs === allContrast.filter(pair => !pair.pass).length, `${label}.counts.failingContrastPairs: mismatch`);
    push(errors, value.counts.failingContrastPairs === 0, `${label}.counts.failingContrastPairs: must be zero`);
    push(errors, value.counts.componentContracts === profiles.reduce((sum, profile) => sum + ((profile.componentContracts || []).length), 0), `${label}.counts.componentContracts: mismatch`);
    push(errors, value.counts.cssVariableMappings === ((value.cssVariableMapping && value.cssVariableMapping.rows) || []).length, `${label}.counts.cssVariableMappings: mismatch`);
    push(errors, value.counts.bloomThemes === DESIGN_BLOOM_THEMES.length, `${label}.counts.bloomThemes: mismatch`);
    if (isObject(value.valueSignatureCoverage)) {
      push(errors, value.counts.valueSignatures === value.valueSignatureCoverage.signedEntries, `${label}.counts.valueSignatures: mismatch`);
      push(errors, value.counts.drawableBloomEntries === value.valueSignatureCoverage.drawableEntries, `${label}.counts.drawableBloomEntries: mismatch`);
    }
    push(errors, value.counts.bloomPreviewFixtures === ((value.valueBloom && value.valueBloom.previewFixtures) || []).length, `${label}.counts.bloomPreviewFixtures: mismatch`);
    push(errors, value.counts.dayCycleVariants === profiles.reduce((sum, profile) => sum + Object.keys(profile.dayCycle?.variants || {}).length, 0), `${label}.counts.dayCycleVariants: mismatch`);
    push(errors, value.counts.materialitySurfaces === profiles.reduce((sum, profile) => sum + (Array.isArray(profile.materiality?.surfaces) ? profile.materiality.surfaces.length : 0), 0), `${label}.counts.materialitySurfaces: mismatch`);
    push(errors, value.counts.motionCurves === profiles.reduce((sum, profile) => sum + Object.keys(profile.motion?.curves || {}).length, 0), `${label}.counts.motionCurves: mismatch`);
    push(errors, value.counts.motionIntents === profiles.reduce((sum, profile) => sum + (Array.isArray(profile.motion?.intents) ? profile.motion.intents.length : 0), 0), `${label}.counts.motionIntents: mismatch`);
    push(errors, value.counts.skinReadinessItems === ((value.skinReadiness && value.skinReadiness.items) || []).length, `${label}.counts.skinReadinessItems: mismatch`);
    push(errors, value.counts.artTokens === profiles.reduce((sum, profile) => sum + ((profile.artTokens || []).length), 0), `${label}.counts.artTokens: mismatch`);
    push(errors, value.counts.artKinds === artKinds.size, `${label}.counts.artKinds: mismatch`);
  }

  if (!isObject(value.filters)) errors.push(`${label}.filters: missing object`);
  else {
    for (const field of ['profiles', 'roles', 'bloomThemes', 'drawableBloomCategories', 'dayCycleVariants', 'motionIntents', 'skinReadiness', 'artKinds']) push(errors, Array.isArray(value.filters[field]), `${label}.filters.${field}: missing array`);
    push(errors, designSameArray(value.filters.bloomThemes, [...DESIGN_BLOOM_THEMES].sort()), `${label}.filters.bloomThemes: mismatch`);
    if ((value.filters.dayCycleVariants || []).length) push(errors, designSameArray(value.filters.dayCycleVariants, [...DESIGN_REQUIRED_DAY_CYCLE_VARIANTS].sort()), `${label}.filters.dayCycleVariants: mismatch`);
    push(errors, designSameArray(value.filters.skinReadiness, [...DESIGN_REQUIRED_SKIN_READINESS].sort()), `${label}.filters.skinReadiness: mismatch`);
  }
  return errors;
}

function validateRegistry(value, label = 'registry') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-format-registry', `${label}: wrong format`);
  push(errors, SEMVER.test(String(value.version || '')), `${label}.version: must be semver`);
  push(errors, value.standard === 'open-values-standard', `${label}.standard: wrong standard`);
  push(errors, SEMVER.test(String(value.standardVersion || '')), `${label}.standardVersion: must be semver`);
  push(errors, DATE.test(String(value.updated || '')), `${label}.updated: must be YYYY-MM-DD`);
  if (!Array.isArray(value.entries) || !value.entries.length) errors.push(`${label}.entries: missing non-empty array`);
  else {
    const ids = new Set();
    value.entries.forEach((entry, i) => {
      const at = `${label}.entries[${i}]`;
      if (!isObject(entry)) {
        errors.push(`${at}: must be an object`);
        return;
      }
      push(errors, FORMAT_ID.test(String(entry.id || '')), `${at}.id: invalid format id`);
      push(errors, SEMVER.test(String(entry.version || '')), `${at}.version: must be semver`);
      push(errors, STATUS_ENUM.has(entry.status), `${at}.status: unknown status`);
      push(errors, KIND_ENUM.has(entry.kind), `${at}.kind: unknown kind`);
      push(errors, isString(entry.purpose), `${at}.purpose: missing purpose`);
      push(errors, isObject(entry.marker), `${at}.marker: missing object`);
      if (isObject(entry.marker)) {
        push(errors, MARKER_MODE_ENUM.has(entry.marker.mode), `${at}.marker.mode: unknown mode ${entry.marker.mode || '(missing)'}`);
        if (entry.marker.format != null) push(errors, FORMAT_ID.test(entry.marker.format), `${at}.marker.format: invalid format id`);
        if (entry.marker.mode === 'explicit-format') {
          push(errors, entry.marker.format === entry.id, `${at}.marker.format: explicit marker must equal entry id`);
        } else if (entry.marker.format != null) {
          errors.push(`${at}.marker.format: only explicit-format markers should declare format`);
        }
        if (entry.marker.pathPattern != null) push(errors, isString(entry.marker.pathPattern), `${at}.marker.pathPattern: must be a string`);
        if (entry.marker.pathPatterns != null) {
          if (!Array.isArray(entry.marker.pathPatterns)) errors.push(`${at}.marker.pathPatterns: must be an array`);
          else {
            const seenPaths = new Set();
            entry.marker.pathPatterns.forEach((pattern, p) => {
              push(errors, isString(pattern), `${at}.marker.pathPatterns[${p}]: must be a string`);
              if (seenPaths.has(pattern)) errors.push(`${at}.marker.pathPatterns[${p}]: duplicate path pattern ${pattern}`);
              seenPaths.add(pattern);
            });
          }
        }
      }
      if (!Object.prototype.hasOwnProperty.call(entry, 'declaredVersion')) errors.push(`${at}.declaredVersion: missing declared version policy`);
      else {
        const declaredClass = versionClass(entry.declaredVersion);
        if (declaredClass === 'bare') {
          push(errors, entry.compatibility && entry.compatibility.acceptsBareVersion === true, `${at}.declaredVersion: bare versions require compatibility.acceptsBareVersion`);
        } else if (entry.declaredVersion === 'none') {
          push(errors, entry.marker && entry.marker.mode === 'legacy-shape', `${at}.declaredVersion: none is only valid for legacy-shape entries`);
        } else if (declaredClass === 'other') {
          push(errors, entry.marker && entry.marker.mode === 'legacy-shape', `${at}.declaredVersion: non-semver legacy markers are only valid for legacy-shape entries`);
        }
      }
      if (entry.schema !== null && entry.schema != null) push(errors, isString(entry.schema), `${at}.schema: must be a path string or null`);
      if (entry.schema === null) push(errors, isString(entry.schemaNote), `${at}.schemaNote: required when schema is null`);
      push(errors, Array.isArray(entry.sourceOfTruth), `${at}.sourceOfTruth: missing array`);
      push(errors, Array.isArray(entry.generatedOutputs), `${at}.generatedOutputs: missing array`);
      push(errors, Array.isArray(entry.builders), `${at}.builders: missing array`);
      push(errors, Array.isArray(entry.audits), `${at}.audits: missing array`);
      push(errors, OWNER_ENUM.has(entry.ownerLane), `${at}.ownerLane: unknown owner`);
      push(errors, Array.isArray(entry.runtimeConsumers), `${at}.runtimeConsumers: missing array`);
      push(errors, isObject(entry.compatibility), `${at}.compatibility: missing object`);
      if (isObject(entry.compatibility)) {
        for (const key of ['acceptsLegacyVersion', 'acceptsBareVersion']) {
          if (entry.compatibility[key] != null) push(errors, typeof entry.compatibility[key] === 'boolean', `${at}.compatibility.${key}: must be boolean`);
        }
      }
      if (entry.dependencies != null) push(errors, Array.isArray(entry.dependencies), `${at}.dependencies: must be an array`);
      if (ids.has(entry.id)) errors.push(`${at}.id: duplicate ${entry.id}`);
      ids.add(entry.id);
    });
    value.entries.forEach((entry, i) => {
      for (const dep of entry.dependencies || []) {
        if (!ids.has(dep)) errors.push(`${label}.entries[${i}].dependencies: unknown dependency ${dep}`);
      }
    });
  }
  return errors;
}

function validateConformanceVectors(value, registryIds, label = 'conformance-vectors') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-conformance-vectors', `${label}: wrong format`);
  push(errors, SEMVER.test(String(value.version || '')), `${label}.version: must be semver`);
  push(errors, value.standard === 'open-values-standard', `${label}.standard: wrong standard`);
  push(errors, DATE.test(String(value.updated || '')), `${label}.updated: must be YYYY-MM-DD`);
  if (!Array.isArray(value.vectors) || !value.vectors.length) errors.push(`${label}.vectors: missing non-empty array`);
  else {
    const ids = new Set();
    value.vectors.forEach((vector, i) => {
      const at = `${label}.vectors[${i}]`;
      if (!isObject(vector)) {
        errors.push(`${at}: must be an object`);
        return;
      }
      push(errors, KEBAB.test(String(vector.id || '')), `${at}.id: invalid id`);
      if (ids.has(vector.id)) errors.push(`${at}.id: duplicate ${vector.id}`);
      ids.add(vector.id);
      push(errors, registryIds.has(vector.formatUnderTest), `${at}.formatUnderTest: unregistered format ${vector.formatUnderTest || '(missing)'}`);
      push(errors, vector.expect === 'pass' || vector.expect === 'fail', `${at}.expect: must be pass or fail`);
      push(errors, isString(vector.reason), `${at}.reason: missing reason`);
      push(errors, Object.prototype.hasOwnProperty.call(vector, 'value'), `${at}.value: missing fixture value`);
    });
  }
  return errors;
}

function validateRegisterShelf(value, label = 'register-shelf') {
  const errors = [];
  if (!isObject(value)) return [`${label}: must be an object`];
  push(errors, value.format === 'open-values-register-shelf', `${label}: wrong format`);
  push(errors, value.version === '1.0.0', `${label}.version: expected 1.0.0`);
  push(errors, isString(value.note), `${label}.note: missing note`);
  push(errors, isObject(value.howToRead), `${label}.howToRead: missing object`);
  if (isObject(value.howToRead)) {
    for (const field of ['reach', 'access', 'provenanceKey', 'proven']) {
      push(errors, isString(value.howToRead[field]), `${label}.howToRead.${field}: missing explanation`);
    }
  }
  if (!Array.isArray(value.registers) || !value.registers.length) errors.push(`${label}.registers: missing non-empty array`);
  else {
    const ids = new Set();
    const endpoints = new Set();
    value.registers.forEach((register, i) => {
      const at = `${label}.registers[${i}]`;
      push(errors, isObject(register), `${at}: must be an object`);
      if (!isObject(register)) return;
      push(errors, KEBAB.test(String(register.id || '')), `${at}.id: invalid id`);
      push(errors, !ids.has(register.id), `${at}.id: duplicate ${register.id}`);
      ids.add(register.id);
      push(errors, isString(register.name), `${at}.name: missing name`);
      push(errors, isString(register.publisher), `${at}.publisher: missing publisher`);
      push(errors, ['api', 'bulk', 'page'].includes(register.access), `${at}.access: expected api, bulk, or page`);
      push(errors, isString(register.endpoint) && URL.test(register.endpoint), `${at}.endpoint: missing http(s) URL`);
      push(errors, !endpoints.has(register.endpoint), `${at}.endpoint: duplicate ${register.endpoint}`);
      endpoints.add(register.endpoint);
      push(errors, register.reach === 'cross-cutting' || register.reach === 'single', `${at}.reach: expected cross-cutting or single`);
      push(errors, CRITERION_KEY.test(String(register.provenanceKey || '')), `${at}.provenanceKey: invalid key`);
      for (const field of ['populates', 'proven']) {
        if (!Array.isArray(register[field]) || !register[field].length) errors.push(`${at}.${field}: missing non-empty array`);
        else {
          const seen = new Set();
          register[field].forEach((item, j) => {
            push(errors, isString(item), `${at}.${field}[${j}]: missing value`);
            push(errors, !seen.has(item), `${at}.${field}[${j}]: duplicate ${item}`);
            seen.add(item);
          });
        }
      }
      if (register.alsoAt != null) {
        if (!Array.isArray(register.alsoAt)) errors.push(`${at}.alsoAt: must be an array`);
        else register.alsoAt.forEach((url, j) => push(errors, isString(url) && URL.test(url), `${at}.alsoAt[${j}]: expected http(s) URL`));
      }
      if (register.note != null) push(errors, isString(register.note), `${at}.note: must be a non-empty string`);
      if (register.caution != null) push(errors, isString(register.caution), `${at}.caution: must be a non-empty string`);
    });
  }
  if (!Array.isArray(value.refused) || !value.refused.length) errors.push(`${label}.refused: missing non-empty array`);
  else {
    const patterns = new Set();
    value.refused.forEach((refusal, i) => {
      const at = `${label}.refused[${i}]`;
      push(errors, isObject(refusal), `${at}: must be an object`);
      if (!isObject(refusal)) return;
      push(errors, isString(refusal.pattern), `${at}.pattern: missing pattern`);
      push(errors, !patterns.has(refusal.pattern), `${at}.pattern: duplicate ${refusal.pattern}`);
      patterns.add(refusal.pattern);
      push(errors, isString(refusal.why), `${at}.why: missing reason`);
      if (refusal.examples != null) push(errors, Array.isArray(refusal.examples) && refusal.examples.every(isString), `${at}.examples: expected non-empty strings`);
    });
  }
  return errors;
}

const validators = {
  'open-values-format-registry': validateRegistry,
  'open-values-conformance-vectors': validateConformanceVectors,
  'open-values-register-shelf': validateRegisterShelf,
  'open-values-source': validateSource,
  'open-values-criterion': validateCriterion,
  'open-values-rating': validateRating,
  'open-values-entity': validateEntity,
  'open-values-lens': validateLens,
  'open-values-category-dataset': validateLens,
  'open-values-passport': validatePassport,
  'open-values-ontology': validateOntology,
  'open-values-category-index': validateCategoryIndex,
  'open-values-lines': validateLines,
  'open-values-decision-contracts': validateDecisionContracts,
  'ovs-tag-registry': validateTagRegistry,
  'ovs-synonym-registry': validateSynonymRegistry,
  'ovs-errand-registry': validateErrandRegistry,
  'open-values-citation-bundle': validateCitationBundle,
  'ovs-pulse': validatePulse,
  'open-values-edges': validateEdges,
  'open-values-door': validateDoor,
  'open-values-stack-index': validateStackIndex,
  'ovs-node-index': validateNodeIndex,
  'ovs-synonym-index': validateSynonymIndex,
  'ovs-ask-index': validateAskIndex,
  'ovs-avoid-token-index': validateAvoidTokenIndex,
  'ovs-ask-core-index': validateAskCoreIndex,
  'ovs-node-manifest': validateNodeManifest,
  'ovs-ask-fixtures': validateAskFixtures,
  'ovs-ask-traces': validateAskTraces,
  'ovs-ask-presentation-contract': validateAskPresentation,
  'ovs-node-readiness': validateNodeReadiness,
  'ovs-node-walkthroughs': validateNodeWalkthroughs,
  'ovs-node-page-contracts': validateNodePageContracts,
  'ovs-node-route-fixtures': validateNodeRouteFixtures,
  'ovs-node-route-guardrails': validateNodeRouteGuardrails,
  'ovs-node-load-plan': validateNodeLoadPlan,
  'ovs-node-runtime-states': validateNodeRuntimeStates,
  'ovs-node-preview-matrix': validateNodePreviewMatrix,
  'ovs-node-integration-checklist': validateNodeIntegrationChecklist,
  'open-values-challenge-set': validateChallengeSet,
  'open-values-challenge-index': validateChallengeIndex,
  'open-values-asks-offers': validateAsksOffers,
  'open-values-asks-offers-index': validateAsksOffersIndex,
  'open-values-proposal': validateProposal,
  'open-values-attestation': validateAttestation,
  'open-values-governance-ledger': validateGovernanceLedger,
  'open-values-governance-index': validateGovernanceIndex,
  'open-values-design-tokens': validateDesignTokens,
  'open-values-design-token-index': validateDesignTokenIndex
};

function normalizeVersion(value) {
  const raw = String(value || '');
  return BARE_VERSION.test(raw) ? `${raw}.0` : raw;
}

function versionCompatible(entry, declared) {
  if (declared == null || declared === '') return true;
  const normalized = normalizeVersion(declared);
  if (normalized === entry.version) return true;
  if (entry.compatibility && entry.compatibility.acceptsBareVersion && normalizeVersion(declared) === entry.version) return true;
  if (entry.declaredVersion && entry.declaredVersion !== 'none' && String(declared) === String(entry.declaredVersion)) return true;
  return false;
}

function versionClass(value) {
  if (value == null || value === '') return 'missing';
  const raw = String(value);
  if (SEMVER.test(raw)) return 'semver';
  if (BARE_VERSION.test(raw)) return 'bare';
  return 'other';
}

function walkJson(abs, out = []) {
  if (!fs.existsSync(abs)) return out;
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    if (abs.endsWith('.json')) out.push(abs);
    return out;
  }
  if (!stat.isDirectory()) return out;
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    walkJson(path.join(abs, ent.name), out);
  }
  return out;
}

function schemaRefs(value, refs = []) {
  if (Array.isArray(value)) {
    value.forEach(item => schemaRefs(item, refs));
    return refs;
  }
  if (isObject(value)) {
    if (typeof value.$ref === 'string') refs.push(value.$ref);
    Object.values(value).forEach(child => schemaRefs(child, refs));
  }
  return refs;
}

function checkSchemaSurface() {
  const schemas = new Map();
  const files = fs.readdirSync(SCHEMA_DIR)
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => path.join(SCHEMA_DIR, name));
  for (const file of files) {
    const schema = readJson(file);
    if (!schema) continue;
    if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') failures.push(`${rel(file)}: should declare JSON Schema 2020-12`);
    if (!isString(schema.$id)) failures.push(`${rel(file)}: missing $id`);
    else schemas.set(schema.$id, file);
    if (!isString(schema.title)) failures.push(`${rel(file)}: missing title`);
  }
  for (const file of files) {
    const schema = readJson(file);
    if (!schema) continue;
    for (const ref of schemaRefs(schema)) {
      if (ref.startsWith('#')) continue;
      const base = ref.split('#')[0];
      if (!schemas.has(base)) failures.push(`${rel(file)}: unresolved external $ref ${ref}`);
    }
  }
  return files.length;
}

function looksLikePath(value) {
  return typeof value === 'string'
    && !value.includes('*')
    && !value.includes('<')
    && !/\s/.test(value)
    && /^(app|content|docs|pipeline|research|scripts|dist)\//.test(value);
}

function checkAuditCommand(entryId, auditCommand, packageScripts) {
  const npmRun = auditCommand.match(/^npm run ([A-Za-z0-9:_-]+)(?:\s+.*)?$/);
  if (npmRun) {
    if (!packageScripts[npmRun[1]]) failures.push(`${entryId}: audit command references missing package script ${auditCommand}`);
    return;
  }

  const nodeRun = auditCommand.match(/^node ([^\s]+\.m?js)(?:\s+.*)?$/);
  if (nodeRun) {
    if (!fs.existsSync(path.join(ROOT, nodeRun[1]))) failures.push(`${entryId}: audit command references missing file ${auditCommand}`);
    return;
  }

  const pythonRun = auditCommand.match(/^(?:python|python3|py -3) ([^\s]+\.py)(?:\s+.*)?$/);
  if (pythonRun) {
    if (!fs.existsSync(path.join(ROOT, pythonRun[1]))) failures.push(`${entryId}: audit command references missing file ${auditCommand}`);
    return;
  }

  failures.push(`${entryId}: audit command is not machine-checkable: ${auditCommand}`);
}

function checkRegistryPaths(registry) {
  const packageJson = readJson(path.join(ROOT, 'package.json'), 'package.json') || {};
  const packageScripts = packageJson.scripts || {};
  for (const entry of registry.entries || []) {
    if (entry.schema && !fs.existsSync(path.join(ROOT, entry.schema))) {
      failures.push(`${entry.id}: schema path missing ${entry.schema}`);
    }
    for (const builder of entry.builders || []) {
      if (/\.(js|mjs|py)$/.test(builder) && !fs.existsSync(path.join(ROOT, builder))) {
        failures.push(`${entry.id}: builder path missing ${builder}`);
      }
    }
    for (const candidate of [...(entry.sourceOfTruth || []), ...(entry.generatedOutputs || [])]) {
      if (looksLikePath(candidate) && !fs.existsSync(path.join(ROOT, candidate))) {
        warnings.push(`${entry.id}: declared path currently missing ${candidate}`);
      }
    }
    for (const auditCommand of entry.audits || []) {
      checkAuditCommand(entry.id, auditCommand, packageScripts);
    }
  }
}

function checkRegistrySemverPolicy(registry) {
  const stats = {
    entries: 0,
    semverEntries: 0,
    bareDeclaredGrandfathered: 0,
    legacyUnversioned: 0
  };
  for (const entry of registry.entries || []) {
    stats.entries += 1;
    if (SEMVER.test(String(entry.version || ''))) stats.semverEntries += 1;
    const declared = entry.declaredVersion;
    if (BARE_VERSION.test(String(declared || ''))) {
      if (entry.compatibility && entry.compatibility.acceptsBareVersion) {
        stats.bareDeclaredGrandfathered += 1;
      } else {
        failures.push(`${entry.id}: bare declaredVersion ${declared} must set compatibility.acceptsBareVersion`);
      }
    }
    if (declared === 'none') {
      if (entry.marker && entry.marker.mode === 'legacy-shape') stats.legacyUnversioned += 1;
      else failures.push(`${entry.id}: declaredVersion none is only allowed for legacy-shape entries`);
    }
  }
  return stats;
}

function schemaCoverage(registry) {
  const stats = {
    withSchema: 0,
    withoutSchema: 0,
    sourceWithSchema: 0,
    explicitWithSchema: 0
  };
  for (const entry of registry.entries || []) {
    if (entry.schema) {
      stats.withSchema += 1;
      if (entry.kind === 'source') stats.sourceWithSchema += 1;
      if (entry.marker && entry.marker.mode === 'explicit-format') stats.explicitWithSchema += 1;
    } else {
      stats.withoutSchema += 1;
    }
  }
  return stats;
}

function scanExplicitFormats() {
  const files = [
    ...walkJson(path.join(ROOT, 'content')),
    ...walkJson(path.join(ROOT, 'app', 'data')),
    path.join(ROOT, 'app', 'edges.json'),
    path.join(ROOT, 'dist', '.well-known', 'open-values.json'),
    path.join(ROOT, 'dist', 'stacks', 'index.json')
  ].filter((file, i, arr) => file && arr.indexOf(file) === i)
   .filter((file) => fs.existsSync(file)); // dist/* are build artifacts; absent in a no-build CI, and a missing one must not fail a format scan (verified at build/deploy time by the well-known + stacks audits)
  const formats = new Map();
  for (const file of files) {
    const data = readJson(file);
    if (data && typeof data.format === 'string') {
      if (!formats.has(data.format)) formats.set(data.format, []);
      formats.get(data.format).push(rel(file));
    }
  }
  return formats;
}

function explicitFormatFiles() {
  const files = [
    ...walkJson(path.join(ROOT, 'content')),
    ...walkJson(path.join(ROOT, 'app', 'data')),
    path.join(ROOT, 'app', 'edges.json'),
    path.join(ROOT, 'dist', '.well-known', 'open-values.json'),
    path.join(ROOT, 'dist', 'stacks', 'index.json')
  ].filter((file, i, arr) => file && arr.indexOf(file) === i)
   .filter((file) => fs.existsSync(file)); // dist/* are build artifacts; absent in a no-build CI, and a missing one must not fail a format scan (verified at build/deploy time by the well-known + stacks audits)
  const out = [];
  for (const file of files) {
    const data = readJson(file);
    if (data && typeof data.format === 'string') out.push({ file, data });
  }
  return out;
}

function pushRealErrors(label, errors) {
  for (const error of errors) failures.push(`${label}: ${error}`);
}

function validateExplicitFormatFiles(registryById, registryIds) {
  let checked = 0;
  let specialized = 0;
  const versionStats = {
    semver: 0,
    bareCompatible: 0,
    missing: 0,
    other: 0,
    standardOwnedSemver: 0
  };
  for (const { file, data } of explicitFormatFiles()) {
    checked += 1;
    const label = rel(file);
    const entry = registryById.get(data.format);
    if (!entry) {
      failures.push(`${label}: unregistered explicit format ${data.format}`);
      continue;
    }
    const klass = versionClass(data.version);
    if (klass === 'semver') versionStats.semver += 1;
    else if (klass === 'bare' && entry.compatibility && entry.compatibility.acceptsBareVersion) versionStats.bareCompatible += 1;
    else if (klass === 'missing') versionStats.missing += 1;
    else versionStats.other += 1;
    if (label.startsWith('app/data/standard/') && klass !== 'semver') {
      failures.push(`${label}: standard-owned explicit formats must use semver versions`);
    }
    if (label.startsWith('app/data/standard/') && klass === 'semver') versionStats.standardOwnedSemver += 1;
    if (klass === 'bare' && !(entry.compatibility && entry.compatibility.acceptsBareVersion)) {
      failures.push(`${label}: bare version ${data.version} is not grandfathered by registry compatibility`);
    }
    if (klass === 'missing') {
      failures.push(`${label}: explicit format file missing version`);
    }
    if (!versionCompatible(entry, data.version)) {
      failures.push(`${label}: version ${data.version || '(missing)'} is not compatible with registry ${entry.version}`);
    }
    const validator = validators[data.format];
    if (validator) {
      specialized += 1;
      const errors = data.format === 'open-values-conformance-vectors'
        ? validator(data, registryIds, label)
        : validator(data, label);
      pushRealErrors(label, errors);
    }
  }
  return { checked, specialized, versionStats };
}

function validateLegacyRealFiles() {
  const counts = {
    sourceLenses: 0,
    categoryDatasets: 0,
    ontology: 0,
    categoryIndex: 0
  };

  const lensDir = path.join(ROOT, 'content', 'lenses');
  for (const name of fs.readdirSync(lensDir).filter(item => item.endsWith('.json')).sort()) {
    const file = path.join(lensDir, name);
    const data = readJson(file);
    if (!data) continue;
    counts.sourceLenses += 1;
    pushRealErrors(rel(file), validateLens(data, rel(file)));
  }

  const ontologyFile = path.join(ROOT, 'content', 'ontology.json');
  const ontology = readJson(ontologyFile);
  if (ontology) {
    counts.ontology = 1;
    pushRealErrors(rel(ontologyFile), validateOntology(ontology, rel(ontologyFile)));
  }

  const indexFile = path.join(ROOT, 'app', 'data', 'index.json');
  const index = readJson(indexFile);
  if (index) {
    counts.categoryIndex = 1;
    pushRealErrors(rel(indexFile), validateCategoryIndex(index, rel(indexFile)));
    for (const category of index.categories || []) {
      if (!category || !category.file) continue;
      const file = path.join(ROOT, 'app', 'data', category.file);
      const data = readJson(file);
      if (!data) continue;
      counts.categoryDatasets += 1;
      pushRealErrors(rel(file), validateLens(data, rel(file)));
    }
  }

  return counts;
}

function runVectors(vectorFile, registryIds) {
  const vectorErrors = validateConformanceVectors(vectorFile, registryIds);
  failures.push(...vectorErrors.map(err => `app/data/standard/conformance-vectors.json: ${err}`));
  let passCases = 0;
  let failCases = 0;
  if (vectorErrors.length) return { passCases, failCases };
  for (const vector of vectorFile.vectors) {
    const validator = validators[vector.formatUnderTest];
    if (!validator) {
      failures.push(`${vector.id}: no validator registered for ${vector.formatUnderTest}`);
      continue;
    }
    const errors = vector.formatUnderTest === 'open-values-conformance-vectors'
      ? validator(vector.value, registryIds, vector.id)
      : validator(vector.value, vector.id);
    if (vector.expect === 'pass') {
      if (errors.length) failures.push(`${vector.id}: expected pass, got ${errors.join('; ')}`);
      else passCases += 1;
    } else {
      if (!errors.length) failures.push(`${vector.id}: expected fail, but validator accepted it`);
      else failCases += 1;
    }
  }
  return { passCases, failCases };
}

function main() {
  console.log('Open Values Standard audit');

  const registry = readJson(REGISTRY);
  const vectorFile = readJson(VECTORS);
  const schemaCount = checkSchemaSurface();
  if (!registry || !vectorFile) {
    process.exit(1);
  }

  failures.push(...validateRegistry(registry, 'app/data/standard/registry.json'));
  const registryIds = new Set((registry.entries || []).map(entry => entry.id));
  const registryById = new Map((registry.entries || []).map(entry => [entry.id, entry]));
  checkRegistryPaths(registry);
  const semverResults = checkRegistrySemverPolicy(registry);
  const schemaResults = schemaCoverage(registry);

  const explicitFormats = scanExplicitFormats();
  for (const [format, files] of explicitFormats.entries()) {
    if (!registryIds.has(format)) failures.push(`unregistered explicit format ${format}: ${files.slice(0, 5).join(', ')}`);
  }

  const vectorResults = runVectors(vectorFile, registryIds);
  const explicitResults = validateExplicitFormatFiles(registryById, registryIds);
  const realResults = validateLegacyRealFiles();

  console.log(`  registry entries: ${(registry.entries || []).length}`);
  console.log(`  registry semver entries: ${semverResults.semverEntries}/${semverResults.entries}`);
  console.log(`  bare declared versions grandfathered: ${semverResults.bareDeclaredGrandfathered}`);
  console.log(`  legacy unversioned entries: ${semverResults.legacyUnversioned}`);
  console.log(`  registry schema-backed entries: ${schemaResults.withSchema}/${schemaResults.withSchema + schemaResults.withoutSchema}`);
  console.log(`  source formats with schemas: ${schemaResults.sourceWithSchema}`);
  console.log(`  explicit formats with schemas: ${schemaResults.explicitWithSchema}`);
  console.log(`  schemas: ${schemaCount}`);
  console.log(`  explicit formats: ${explicitFormats.size}`);
  console.log(`  explicit-format files checked: ${explicitResults.checked}`);
  console.log(`  explicit-format files with specialized validators: ${explicitResults.specialized}`);
  console.log(`  explicit semver files: ${explicitResults.versionStats.semver}`);
  console.log(`  explicit bare-version files grandfathered: ${explicitResults.versionStats.bareCompatible}`);
  console.log(`  standard-owned semver files: ${explicitResults.versionStats.standardOwnedSemver}`);
  console.log(`  source lenses checked: ${realResults.sourceLenses}`);
  console.log(`  category datasets checked: ${realResults.categoryDatasets}`);
  console.log(`  ontology checked: ${realResults.ontology}`);
  console.log(`  category index checked: ${realResults.categoryIndex}`);
  console.log(`  vector pass cases: ${vectorResults.passCases}`);
  console.log(`  vector fail cases: ${vectorResults.failCases}`);
  console.log(`  warnings: ${warnings.length}`);
  for (const warning of warnings.slice(0, 20)) console.log(`  WARN ${warning}`);
  if (warnings.length > 20) console.log(`  ... ${warnings.length - 20} more warnings`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures.slice(0, 80)) console.log(`  FAIL ${failure}`);
    if (failures.length > 80) console.log(`  ... ${failures.length - 80} more failures`);
    process.exit(1);
  }

  console.log('STANDARD AUDIT PASS');
}

main();
