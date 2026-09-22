#!/usr/bin/env node
/* Conformance check for the line registry (content/lines.json) — run before anything reads it, so a
   single malformed line can't quietly break every product filter at once (CONSTELLATION-CRITIQUE W2).
   Validates personal-line shape, published line-sets, the sourced shared-floor pilot and its bounded
   exclusion counts, plus generated app/lines.js sync. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'content', 'lines.json');
const GEN = path.join(ROOT, 'app', 'lines.js');
const DATA_INDEX = path.join(ROOT, 'app', 'data', 'index.json');

const KINDS = ['allergy', 'diet', 'require', 'avoid', 'cap', 'lean'];
const C6_REQUIRED_REQUIRE_LINES = {
  'require:b-corp': 'B Corp',
  'require:fsc': 'FSC',
  'require:ewg-verified': 'EWG Verified',
  'require:end-to-end-encrypted': 'End-to-end encrypted',
  'require:employee-member-owned': 'Employee/member-owned',
};
const C6_REQUIRED_AVOID_LINES = [
  'avoid:amazon',
  'avoid:alphabet',
  'avoid:meta',
  'avoid:microsoft',
  'avoid:procter-and-gamble',
  'avoid:loreal',
];
const SAFETY_ALLERGENS = {
  gluten: 'Gluten', crustaceans: 'Crustaceans', eggs: 'Eggs', fish: 'Fish',
  peanut: 'Peanuts', soy: 'Soybeans', milk: 'Milk', nuts: 'Tree nuts',
  celery: 'Celery', mustard: 'Mustard', sesame: 'Sesame', sulphites: 'Sulphites',
  lupin: 'Lupin', molluscs: 'Molluscs', lactose: 'Lactose',
};
const errors = [];
const warns = [];
function err(m) { errors.push(m); }
function warn(m) { warns.push(m); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function isHttp(value) { return /^https?:\/\//i.test(String(value || '')); }
function isAsOf(value) { return /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(String(value || '')); }
function isSourcedClaim(value) {
  return value && typeof value === 'object' && isHttp(value.source) && isAsOf(value.asof);
}

let reg;
try { reg = JSON.parse(fs.readFileSync(SRC, 'utf8')); }
catch (e) { console.error('lines_audit FAILED: cannot parse content/lines.json — ' + e.message); process.exit(1); }

if (reg.format !== 'open-values-lines') err('format must be "open-values-lines"');
if (!reg.version) err('missing version');
const lines = Array.isArray(reg.lines) ? reg.lines : (err('lines[] missing') , []);

const seen = new Set();
const byId = new Map();
for (const l of lines) {
  const at = 'line ' + (l && l.id ? l.id : JSON.stringify(l));
  if (!l || typeof l !== 'object') { err(at + ': not an object'); continue; }
  if (!l.id) err(at + ': missing id');
  else if (seen.has(l.id)) err(at + ': duplicate id'); else { seen.add(l.id); byId.set(l.id, l); }
  if (!KINDS.includes(l.kind)) err(at + ': unknown kind "' + l.kind + '"');
  if (!l.label) err(at + ': missing label');
  if (!l.reads) err(at + ': missing reads (the plain sentence)');
  // id convention: "<kind>:<slug>"
  if (l.id && l.kind && l.id.split(':')[0] !== l.kind) warn(at + ': id prefix should equal kind');
  // per-kind execution fields
  if (l.kind === 'allergy' && !l.tag) err(at + ': allergy line needs a tag');
  if ((l.kind === 'diet' || l.kind === 'require') && !(Array.isArray(l.accept) && l.accept.length))
    err(at + ': ' + l.kind + ' line needs a non-empty accept[]');
  if (l.kind === 'avoid') {
    if (!l.entity) err(at + ': avoid line needs an entity');
    if (!(Array.isArray(l.brands) && l.brands.length)) err(at + ': avoid line needs a non-empty brands[]');
    if (!l.why) warn(at + ': avoid line has no why/source link');
    for (const b of (l.brands || [])) {
      if (b !== String(b).toLowerCase()) err(at + ': brand "' + b + '" must be lowercase (matched case-insensitively)');
      // '?' in a brand token is almost always an encoding casualty (é→?) that silently shrinks a boycott's
      // reach — the matcher folds accents, so tokens should be plain ascii. Caught live 2026-07-07.
      if (b.includes('?')) err(at + ': brand "' + b + '" contains "?" — likely encoding corruption; use the plain-ascii form');
    }
  }
}

for (const [tag, label] of Object.entries(SAFETY_ALLERGENS)) {
  const line = byId.get('allergy:' + tag);
  if (!line) { err('S3 missing safety line allergy:' + tag); continue; }
  if (line.tag !== tag) err(line.id + ': tag must be "' + tag + '"');
  if (line.label !== label) err(line.id + ': label must be "' + label + '"');
  if (!/explicitly declared/i.test(String(line.reads || '')) || !/missing evidence/i.test(String(line.reads || '')))
    err(line.id + ': reads must name explicit declaration and missing-evidence behavior');
}

let tagLabels = new Set();
try {
  const tagReg = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'tags.json'), 'utf8'));
  tagLabels = new Set((tagReg.tags || []).flatMap((tag) => [tag.label, ...(tag.aliases || [])].filter(Boolean)));
} catch (e) {
  warn('content/tags.json could not be read for C6 require-line mapping: ' + e.message);
}

for (const [id, canonicalLabel] of Object.entries(C6_REQUIRED_REQUIRE_LINES)) {
  const line = byId.get(id);
  if (!line) {
    err('C6 missing require line ' + id);
    continue;
  }
  if (!(line.accept || []).includes(canonicalLabel)) {
    err(id + ': accept[] must include C4 canonical tag label "' + canonicalLabel + '"');
  }
  if (tagLabels.size && !(line.accept || []).some((accept) => tagLabels.has(accept))) {
    err(id + ': no accept[] value resolves to content/tags.json');
  }
}

for (const id of C6_REQUIRED_AVOID_LINES) {
  const line = byId.get(id);
  if (!line) {
    err('C6 missing avoid line ' + id);
    continue;
  }
  if (!/^https?:\/\//i.test(String(line.why || ''))) err(id + ': avoid line needs an http(s) why/source link');
  if ((line.brands || []).length < 5) err(id + ': C6 avoid line should know at least five brand tokens');
}

// J2.1 — the shared floor is a published line-set, not ten no-op personal avoid lines. Its matcher is
// deliberately narrow: a category-scoped criterion already in the assessed Poor band (<20), and only
// where that exact entry claim has both an http(s) source and an as-of date. Unknown evidence stays visible.
const floorSets = (Array.isArray(reg.sets) ? reg.sets : []).filter(set => set && set.tier === 'floor');
if (!floorSets.length) err('J2.1 missing tier-floor line-set');
const floorIds = new Set();
const floorSummaries = [];
for (const set of floorSets) {
  const at = 'floor set ' + (set.id || JSON.stringify(set));
  if (set.format !== 'open-values-line-set') err(at + ': format must be open-values-line-set');
  if (!/^floor:[a-z0-9-]+$/.test(String(set.id || ''))) err(at + ': invalid id');
  if (set.id && floorIds.has(set.id)) err(at + ': duplicate id');
  floorIds.add(set.id);
  if (!set.label) err(at + ': missing label');
  if (!set.version) err(at + ': missing version');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(set.published || ''))) err(at + ': published must be YYYY-MM-DD');
  if (set.defaultOn !== true) err(at + ': defaultOn must be true');
  if (set.presentation !== 'fold') err(at + ': presentation must be fold (never erase)');
  if (set.unknownEvidence !== 'keep-visible') err(at + ': unknownEvidence must be keep-visible');
  if (!set.namedConsumer) err(at + ': missing namedConsumer');
  if (!set.fork || set.fork.portableRuleIds !== true || set.fork.localRuleOverrides !== true || !set.fork.license)
    err(at + ': incomplete fork contract');
  if (!set.governance || !set.governance.curator || !set.governance.changePath || !set.governance.noCapture)
    err(at + ': incomplete governance contract');
  if (!(Array.isArray(set.changelog) && set.changelog.length)) err(at + ': changelog must be present');
  else for (const [i, change] of set.changelog.entries()) {
    if (!change || !change.version || !/^\d{4}-\d{2}-\d{2}$/.test(String(change.date || '')) || !change.changes)
      err(at + ': changelog[' + i + '] needs version, date, and changes');
  }

  const bounds = set.bounds || {};
  for (const key of ['maximumRules', 'maximumExcludedSharePerCategory', 'maximumExcludedShareOverall', 'minimumRemainingPerCategory', 'minimumMatchesPerRule']) {
    if (!Number.isFinite(bounds[key]) || bounds[key] <= 0) err(at + ': bounds.' + key + ' must be positive');
  }
  const rules = Array.isArray(set.rules) ? set.rules : (err(at + ': rules[] missing'), []);
  if (set.id === 'floor:cc-shared-v1-pilot' && rules.length !== 10) err(at + ': founder-review pilot must contain exactly 10 rules');
  if (Number.isFinite(bounds.maximumRules) && rules.length > bounds.maximumRules)
    err(at + ': ' + rules.length + ' rules exceed maximumRules ' + bounds.maximumRules);

  const ruleIds = new Set();
  for (const rule of rules) {
    const rat = at + ' rule ' + (rule && rule.id ? rule.id : JSON.stringify(rule));
    if (!rule || typeof rule !== 'object') { err(rat + ': not an object'); continue; }
    if (!/^avoid:floor-[a-z0-9-]+$/.test(String(rule.id || ''))) err(rat + ': invalid id');
    if (rule.id && ruleIds.has(rule.id)) err(rat + ': duplicate id');
    ruleIds.add(rule.id);
    if (rule.kind !== 'avoid' || rule.tier !== 'floor') err(rat + ': expected kind avoid and tier floor');
    if (!rule.label || !rule.reads) err(rat + ': missing label or reads');
    if (rule.effect !== 'fold') err(rat + ': effect must be fold');
    if (!(rule.scope && Array.isArray(rule.scope.categories) && rule.scope.categories.length)) err(rat + ': scope.categories[] missing');
    if (!rule.match || rule.match.type !== 'criterion-band') err(rat + ': match.type must be criterion-band');
    if (!rule.match || !rule.match.criterion) err(rat + ': match.criterion missing');
    if (!rule.match || rule.match.band !== 'poor' || rule.match.maximumExclusive !== 20)
      err(rat + ': pilot matcher must use the assessed Poor band (<20)');
    if (!rule.match || rule.match.requiresSource !== true || rule.match.requiresAsOf !== true)
      err(rat + ': source and as-of gates must be true');
    if (!rule.receipt || !rule.receipt.note || !isHttp(rule.receipt.source) || !isAsOf(rule.receipt.asof))
      err(rat + ': receipt needs note, http(s) source, and as-of date');
  }

  let index;
  try { index = readJson(DATA_INDEX); }
  catch (e) { err(at + ': cannot read app/data/index.json for exclusion bounds — ' + e.message); index = { categories: [] }; }
  const datasets = new Map();
  let corpusEntries = 0;
  for (const category of (index.categories || [])) {
    try {
      const dataset = readJson(path.join(ROOT, 'app', 'data', category.file));
      datasets.set(category.id, dataset);
      corpusEntries += (dataset.products || dataset.resources || []).length;
    } catch (e) { err(at + ': cannot read dataset ' + category.id + ' — ' + e.message); }
  }

  const combinedByCategory = new Map();
  const ruleCounts = [];
  for (const rule of rules) {
    let count = 0;
    const categoryCounts = [];
    for (const cid of ((rule.scope && rule.scope.categories) || [])) {
      const dataset = datasets.get(cid);
      if (!dataset) { err(at + ' rule ' + rule.id + ': unknown category ' + cid); continue; }
      if (!(dataset.criteria || []).some(criterion => criterion.key === rule.match.criterion)) {
        err(at + ' rule ' + rule.id + ': category ' + cid + ' has no criterion ' + rule.match.criterion);
        continue;
      }
      const products = dataset.products || dataset.resources || [];
      const matched = [];
      products.forEach((product, indexInCategory) => {
        const value = product && product.scores && product.scores[rule.match.criterion];
        const claim = product && product.provenance && product.provenance[rule.match.criterion];
        if (Number.isFinite(value) && value < rule.match.maximumExclusive && isSourcedClaim(claim)) matched.push(indexInCategory);
      });
      count += matched.length;
      categoryCounts.push({ cid, excluded: matched.length, entries: products.length });
      if (!combinedByCategory.has(cid)) combinedByCategory.set(cid, new Set());
      for (const indexInCategory of matched) combinedByCategory.get(cid).add(indexInCategory);
    }
    if (Number.isFinite(bounds.minimumMatchesPerRule) && count < bounds.minimumMatchesPerRule)
      err(at + ' rule ' + rule.id + ': ' + count + ' matches below minimum ' + bounds.minimumMatchesPerRule);
    ruleCounts.push({ id: rule.id, count, categoryCounts });
  }

  let combinedExcluded = 0;
  let maxCategory = { cid: '(none)', excluded: 0, entries: 0, share: 0 };
  for (const [cid, matched] of combinedByCategory.entries()) {
    const dataset = datasets.get(cid);
    const entries = ((dataset && (dataset.products || dataset.resources)) || []).length;
    const excluded = matched.size;
    const share = entries ? excluded / entries : 0;
    combinedExcluded += excluded;
    if (share > maxCategory.share) maxCategory = { cid, excluded, entries, share };
    if (Number.isFinite(bounds.maximumExcludedSharePerCategory) && share > bounds.maximumExcludedSharePerCategory)
      err(at + ': ' + cid + ' exclusion share ' + (share * 100).toFixed(1) + '% exceeds ' + (bounds.maximumExcludedSharePerCategory * 100).toFixed(1) + '%');
    if (Number.isFinite(bounds.minimumRemainingPerCategory) && entries - excluded < bounds.minimumRemainingPerCategory)
      err(at + ': ' + cid + ' leaves only ' + (entries - excluded) + ' visible entries, below ' + bounds.minimumRemainingPerCategory);
  }
  const overallShare = corpusEntries ? combinedExcluded / corpusEntries : 0;
  if (Number.isFinite(bounds.maximumExcludedShareOverall) && overallShare > bounds.maximumExcludedShareOverall)
    err(at + ': overall exclusion share ' + (overallShare * 100).toFixed(3) + '% exceeds ' + (bounds.maximumExcludedShareOverall * 100).toFixed(3) + '%');
  floorSummaries.push({ set, ruleCounts, corpusEntries, combinedExcluded, overallShare, maxCategory });
}

// S3 safety contract: every generated food entry carries the compact three-state
// evidence payload, and the shared engine must reject both declarations and
// unknown evidence whenever an allergy rule is active.
let safetyEntries = 0;
try {
  const index = readJson(DATA_INDEX);
  const allowed = new Set([...Object.keys(SAFETY_ALLERGENS), 'coconut']);
  for (const category of (index.categories || [])) {
    const dataset = readJson(path.join(ROOT, 'app', 'data', category.file));
    if (!(dataset.meta && dataset.meta.allergens === true)) continue;
    for (const product of (dataset.products || [])) {
      safetyEntries++;
      const at = category.id + '/' + (product.code || product.name || '(unknown)');
      const evidence = product.allergenEvidence;
      if (!evidence || !Array.isArray(evidence.declares) || !Array.isArray(evidence.declaredFree)) {
        err(at + ': missing allergenEvidence {declares[], declaredFree[]}');
        continue;
      }
      for (const tag of [...evidence.declares, ...evidence.declaredFree])
        if (!allowed.has(tag)) err(at + ': unknown allergen evidence tag ' + tag);
      const overlap = evidence.declares.filter(tag => evidence.declaredFree.includes(tag));
      if (overlap.length) err(at + ': contradictory declares/free evidence for ' + overlap.join(', '));
      if (JSON.stringify(product.allergens || []) !== JSON.stringify(evidence.declares))
        err(at + ': legacy allergens[] must mirror allergenEvidence.declares[]');
    }
  }
} catch (e) { err('S3 could not audit generated allergen evidence: ' + e.message); }
if (!safetyEntries) err('S3 found no generated food entries carrying the allergen contract');

try {
  const engine = require(path.join(ROOT, 'app', 'engine.js'));
  const criteria = [{ key: 'fit', label: 'Fit' }], weights = { fit: 3 }, excludes = new Set(['milk']);
  const base = { scores: { fit: 80 }, allergenEvidence: { declares: [], declaredFree: [] } };
  const declares = { ...base, allergenEvidence: { declares: ['milk'], declaredFree: [] } };
  const free = { ...base, allergenEvidence: { declares: [], declaredFree: ['milk'] } };
  if (engine.allergenStatus(declares, 'milk') !== 'declares') err('S3 engine does not expose declares state');
  if (engine.allergenStatus(free, 'milk') !== 'declared-free') err('S3 engine does not expose declared-free state');
  if (engine.allergenStatus(base, 'milk') !== 'no-data') err('S3 engine does not expose no-data state');
  if (engine.score(declares, { criteria, weights, excludes }) !== null) err('S3 declaration silently passed an allergy rule');
  if (engine.score(base, { criteria, weights, excludes }) !== null) err('S3 no-data product silently passed an allergy rule');
  if (!engine.score(free, { criteria, weights, excludes })) err('S3 explicit free claim did not clear an allergy rule');
} catch (e) { err('S3 engine safety test failed: ' + e.message); }

try {
  const appSource = fs.readFileSync(path.join(ROOT, 'app', 'app.js'), 'utf8');
  // The dash in the no-data line became a full stop on 2026-07-31, when the voice gate was
  // extended to cover the app and found it. The safety property this pins is the three states
  // staying distinct and present, not the punctuation between them.
  for (const phrase of ['Declares ${label}.', 'Declared ${label}-free.', 'No ${label} data. Check the label.'])
    if (!appSource.includes(phrase)) err('S3 app copy missing state template: ' + phrase);
  if (!appSource.includes('allergen-safety-fold') || !appSource.includes('Nothing is erased'))
    err('S3 app is missing the visible allergy show-anyway fold');
} catch (e) { err('S3 could not audit app safety copy: ' + e.message); }

// generated file in sync?
if (fs.existsSync(GEN)) {
  const gen = fs.readFileSync(GEN, 'utf8');
  const m = gen.match(/CC\.LINE_REGISTRY = (\[[\s\S]*?\]);/);
  if (!m) err('app/lines.js present but CC.LINE_REGISTRY not found — regenerate with node pipeline/build_lines.js');
  else {
    let genLines; try { genLines = JSON.parse(m[1]); } catch (e) { genLines = null; }
    if (!genLines || JSON.stringify(genLines) !== JSON.stringify(lines))
      err('app/lines.js is out of sync with content/lines.json — run: node pipeline/build_lines.js');
  }
  const sm = gen.match(/CC\.LINE_SETS = (\[[\s\S]*?\]);/);
  if (!sm) err('app/lines.js present but CC.LINE_SETS not found — regenerate with node pipeline/build_lines.js');
  else {
    let genSets; try { genSets = JSON.parse(sm[1]); } catch (e) { genSets = null; }
    const sets = Array.isArray(reg.sets) ? reg.sets : [];
    if (!genSets || JSON.stringify(genSets) !== JSON.stringify(sets))
      err('app/lines.js line-sets are out of sync with content/lines.json — run: node pipeline/build_lines.js');
  }
} else warn('app/lines.js not generated yet — run: node pipeline/build_lines.js');

for (const w of warns) console.log('  ! ' + w);
if (errors.length) {
  console.error('lines_audit FAIL (' + errors.length + '):');
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
for (const summary of floorSummaries) {
  console.log('  floor ' + summary.set.id + ': ' + summary.ruleCounts.length + ' rules; ' + summary.combinedExcluded + ' exclusion candidate(s) folded across ' + summary.corpusEntries + ' entries (' + (summary.overallShare * 100).toFixed(3) + '%)');
  for (const rule of summary.ruleCounts) {
    const cats = rule.categoryCounts.map(row => row.cid + ' ' + row.excluded + '/' + row.entries).join(', ');
    console.log('    ' + rule.id + ': ' + rule.count + (cats ? ' — ' + cats : ''));
  }
  console.log('    highest category share: ' + summary.maxCategory.cid + ' ' + summary.maxCategory.excluded + '/' + summary.maxCategory.entries + ' (' + (summary.maxCategory.share * 100).toFixed(1) + '%; bound ' + (summary.set.bounds.maximumExcludedSharePerCategory * 100).toFixed(1) + '%)');
}
console.log('lines_audit PASS — ' + lines.length + ' personal lines, ' + floorSets.length + ' floor set(s), ' + safetyEntries + ' food entries safety-checked, ' + seen.size + ' unique personal ids, ' + warns.length + ' warning(s)');
