// Comprehensive verification of the continuous R&D run (32-category commons + Discover + Lab).
const fs = require('fs');
const window = {};
eval(fs.readFileSync('app/data.js', 'utf8'));
eval(fs.readFileSync('app/guides.js', 'utf8'));
const B = window.CC_BUNDLE, G = window.CC_GUIDES;
const cats = B.index.categories;
const FOOD = ['plant-based-milk', 'milk', 'plant-based-yogurt', 'eggs', 'breakfast-cereal', 'granola', 'oats', 'coffee', 'dark-chocolate', 'yogurt', 'olive-oil', 'bread', 'flour-baking', 'plant-based-meat', 'tea', 'pasta-sauce', 'nut-butter', 'nuts', 'fruit-juice', 'ice-cream', 'cheese', 'butter', 'crisps', 'biscuits', 'soda', 'honey', 'fruit-jam', 'rice', 'pasta', 'legumes', 'tofu', 'hummus', 'soups', 'canned-fish', 'fish-seafood', 'canned-tomatoes', 'canned-vegetables', 'frozen-vegetables', 'frozen-pizza', 'ready-meals', 'dried-fruit', 'cereal-bars', 'energy-drinks', 'crackers', 'ketchup', 'mayonnaise', 'salad-dressing', 'pickles', 'chocolate-spread', 'spices-seasoning'];
const PRICED = ['plant-based-milk', 'breakfast-cereal', 'coffee', 'dark-chocolate', 'yogurt', 'olive-oil', 'bread', 'plant-based-meat', 'tea', 'pasta-sauce', 'nut-butter', 'fruit-juice', 'ice-cream'];
const BEAUTY = ['toothpaste', 'mouthwash', 'soap', 'body-wash', 'shampoo', 'deodorant', 'sunscreen', 'face-wash', 'face-cream', 'hand-cream', 'lip-balm', 'hair-conditioner'];
const BLOOM_THEMES = ['planet', 'people', 'health', 'honesty', 'privacy', 'animals', 'cost', 'local'];
const BLOOM_MIN_THEMES = 2;
const KEY2THEME = {
  environment: 'planet', forest: 'planet', packaging: 'planet', palm_oil: 'planet', organic: 'planet', durability: 'planet', repairability: 'planet', longevity: 'planet',
  processing: 'health', nutrition_grade: 'health', protein: 'health', low_sugar: 'health', health: 'health', safety: 'health', calm: 'health',
  ethics: 'people', labor: 'people', artist_pay: 'people', impact: 'people', ways_to_help: 'people', educational: 'people',
  transparency: 'honesty', independence: 'honesty', nonprofit: 'honesty', certification: 'honesty', depth: 'honesty',
  privacy: 'privacy', openness: 'privacy', jurisdiction: 'privacy', security: 'privacy', portability: 'privacy', respect: 'privacy',
  vegan: 'animals', cruelty_free: 'animals',
  economical: 'cost', fees: 'cost', price: 'cost', accessibility: 'cost', catalog: 'cost', selection: 'cost',
  local: 'local', ownership: 'local',
  // 2026-08-13. Kept in step with pipeline/build_datasets.py by hand, which is the point: this map
  // is re-implemented here rather than imported, so a builder that starts theming a key wrongly
  // has to be agreed with twice. Six keys arrived with the swarm's first waves. rewards is money
  // coming back to you; complaints, buyer_protection and damage_protection all answer who carries
  // the loss when something goes wrong; reliability and cancellations are the debatable pair, read
  // as honesty on the grounds that a published schedule an airline does not keep is a gap between
  // claim and delivery. See the longer note in the builder.
  rewards: 'cost',
  complaints: 'people', buyer_protection: 'people', damage_protection: 'people',
  permanence: 'honesty',
  reliability: 'honesty', cancellations: 'honesty',
};
const vfac = new Set(), lfac = {}, rfac = new Set();
const catById = new Map(cats.map(c => [c.id, c]));
function sourceDomain(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url.includes('://') ? url : `https://${url}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch (_) {
    return null;
  }
}
function expectedProvenanceSummary(ds, product) {
  const domains = new Set();
  let factCount = 0, sourcedFactCount = 0, noteOnlyFactCount = 0;
  for (const criterion of ds.criteria || []) {
    const key = criterion && criterion.key;
    if (!key || !product.scores || product.scores[key] == null) continue;
    factCount++;
    const pv = product.provenance && product.provenance[key];
    if (pv && typeof pv === 'object') {
      const domain = sourceDomain(pv.source);
      if (domain) {
        domains.add(domain);
        sourcedFactCount++;
      } else {
        noteOnlyFactCount++;
      }
    } else if (typeof pv === 'string' && pv.trim()) {
      noteOnlyFactCount++;
    } else {
      noteOnlyFactCount++;
    }
  }
  return { factCount, sourcedFactCount, noteOnlyFactCount, sourceDomainCount: domains.size };
}
function roundScore(value) {
  if (!Number.isFinite(value)) return null;
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? rounded : rounded;
}
function expectedValueSignature(ds, product) {
  const key2theme = Object.assign({}, KEY2THEME, ds.key2theme || {});
  const sums = {}, counts = {};
  for (const [key, raw] of Object.entries(product.scores || {})) {
    if (raw == null || !key2theme[key]) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) continue;
    const theme = key2theme[key];
    sums[theme] = (sums[theme] || 0) + value;
    counts[theme] = (counts[theme] || 0) + 1;
  }
  const signature = {};
  for (const theme of BLOOM_THEMES) {
    if (counts[theme]) signature[theme] = roundScore(sums[theme] / counts[theme]);
  }
  return signature;
}
function sameObject(a, b) {
  return JSON.stringify(a || {}) === JSON.stringify(b || {});
}
function profileFromStats(stats) {
  const themeCounts = {};
  for (const theme of BLOOM_THEMES) if (stats.themeCounts[theme]) themeCounts[theme] = stats.themeCounts[theme];
  return {
    entryCount: stats.entryCount,
    signedEntries: stats.signedEntries,
    drawableEntries: stats.drawableEntries,
    minimumThemesForBloom: BLOOM_MIN_THEMES,
    themeCounts,
  };
}
let provenanceEntries = 0, provenanceSingleSource = 0, provenanceMultiSource = 0, provenanceNoSource = 0, provenanceMismatch = 0;
let signatureEntries = 0, signatureUnscored = 0, signatureDrawable = 0, signatureMismatch = 0, signatureProfileMismatch = 0, signatureIndexMismatch = 0;
for (const cid in B.data) { const ds = B.data[cid];
  const valueStats = { entryCount: ds.products.length, signedEntries: 0, drawableEntries: 0, themeCounts: {} };
  for (const c of ds.criteria) vfac.add(c.key);
  for (const p of ds.products) {
    for (const f of (p.focuses || [])) lfac[f] = (lfac[f] || 0) + 1;
    for (const r of (p.region || [])) if (r !== 'global') rfac.add(r);
    provenanceEntries++;
    const actual = p.provenanceSummary || {};
    const expected = expectedProvenanceSummary(ds, p);
    if (actual.singleSource) provenanceSingleSource++;
    if (actual.sourceDomainCount > 1) provenanceMultiSource++;
    if (actual.sourceDomainCount === 0) provenanceNoSource++;
    if (
      actual.factCount !== expected.factCount
      || actual.sourcedFactCount !== expected.sourcedFactCount
      || actual.sourceDomainCount !== expected.sourceDomainCount
      || (actual.noteOnlyFactCount || 0) !== expected.noteOnlyFactCount
      || actual.singleSource !== (expected.sourceDomainCount === 1)
      || typeof actual.primarySource !== 'string'
    ) {
      provenanceMismatch++;
    }
    const expectedSignature = expectedValueSignature(ds, p);
    const signatureThemes = Object.keys(expectedSignature);
    if (signatureThemes.length) {
      signatureEntries++;
      valueStats.signedEntries++;
      if (signatureThemes.length >= BLOOM_MIN_THEMES) {
        signatureDrawable++;
        valueStats.drawableEntries++;
      }
      for (const theme of signatureThemes) valueStats.themeCounts[theme] = (valueStats.themeCounts[theme] || 0) + 1;
      if (!sameObject(p.valueSignature, expectedSignature)) signatureMismatch++;
    } else if (p.valueSignature) {
      signatureMismatch++;
    } else {
      signatureUnscored++;
    }
  }
  const expectedProfile = profileFromStats(valueStats);
  if (!sameObject(ds.meta && ds.meta.valueSignatureProfile, expectedProfile)) signatureProfileMismatch++;
  const indexProfile = catById.get(cid) && catById.get(cid).valueSignatureProfile;
  if (!sameObject(indexProfile, expectedProfile)) signatureIndexMismatch++;
}
let ontCids = 0; (function w(o){ if (Array.isArray(o)) o.forEach(w); else if (o && typeof o === 'object') { if (o.cid) ontCids++; Object.values(o).forEach(w); } })(B.ontology);
const liveCategoryDomains = new Set(cats.map(c => c.domain).filter(Boolean));
const ontologyDomains = B.ontology.domains || [];
const checks = {
  // 2026-08-12, swarm wave one. 88 -> 91 categories, and the count of domains holding at least one
  // built category went 10 -> 13: Health & wellness, Transport & mobility and Pets each had none
  // before this and now have one. Those were three of the six realms that read to a visitor as
  // subjects the catalogue did not cover.
  // 2026-08-13, waves two and three. 91 -> 102 categories, and domains holding at least one built
  // category 13 -> 15: Clothing and Travel & leisure join. Every one of the sixteen legacy domains
  // except Garden & outdoors now has something built in it.
  // 2026-08-14, Phase 10 serial promotion: four built frontier lenses entered the ontology.
  // 124 on 2026-08-26: the digital-services split gave messaging and browsers their own datasets.
  'categories = 124': cats.length === 124 ? 124 : 'FAIL(' + cats.length + ')',
  'all 15 live category domains': liveCategoryDomains.size === 15 ? 'yes' : 'FAIL(' + liveCategoryDomains.size + ')',
  'priced food have economical': PRICED.every(id => B.data[id] && B.data[id].criteria.some(c => c.key === 'economical')),
  'food with economical (all)': FOOD.filter(id => B.data[id] && B.data[id].criteria.some(c => c.key === 'economical')).length,
  'beauty (12) have beauty criteria': BEAUTY.every(id => B.data[id] && B.data[id].criteria.some(c => c.key === 'cruelty_free')),
  'discover value facets': vfac.size,
  'discover label facets': Object.keys(lfac).length,
  'Organic label slice': lfac['Organic'] || 0,
  'Vegan label slice': lfac['Vegan'] || 0,
  'Fair Trade label slice': lfac['Fair Trade'] || 0,
  'region facets': rfac.size,
  'guides': G.length,
  'ontology live cids': ontCids,
  'ontology domains include live + frontier': ontologyDomains.length >= 9 ? ontologyDomains.length : 'FAIL(' + ontologyDomains.length + ')',
  'every category has a domain': cats.every(c => c.domain && c.domain !== 'Other'),
  'discover by-type facet': new Set(Object.values(B.data).map(d => d.meta.type)).size,
  'food entries (total)': FOOD.reduce((n, id) => n + (B.data[id] ? B.data[id].products.length : 0), 0),
  'beauty entries (total)': BEAUTY.reduce((n, id) => n + (B.data[id] ? B.data[id].products.length : 0), 0),
  'provenance summaries on entries': provenanceEntries === Object.values(B.data).reduce((n, ds) => n + ds.products.length, 0) && provenanceMismatch === 0 ? provenanceEntries : `FAIL(${provenanceMismatch} mismatch)`,
  'single-source entries surfaced': provenanceSingleSource > 10000 ? provenanceSingleSource : `FAIL(${provenanceSingleSource})`,
  'multi-source entries surfaced': provenanceMultiSource > 100 ? provenanceMultiSource : `FAIL(${provenanceMultiSource})`,
  'zero-source entries bounded': provenanceNoSource < 20 ? `yes (${provenanceNoSource})` : `FAIL(${provenanceNoSource})`,
  'value signatures on scored entries': signatureEntries + signatureUnscored === provenanceEntries && signatureMismatch === 0
    ? `${signatureEntries} signed; ${signatureUnscored} explicitly unscored`
    : `FAIL(${signatureMismatch} mismatch, ${signatureEntries} signed + ${signatureUnscored} unscored / ${provenanceEntries})`,
  'drawable value signatures': signatureDrawable > 20000 ? signatureDrawable : `FAIL(${signatureDrawable})`,
  'value signature profiles': signatureProfileMismatch === 0 ? 'yes' : `FAIL(${signatureProfileMismatch})`,
  'index value signature profiles': signatureIndexMismatch === 0 ? 'yes' : `FAIL(${signatureIndexMismatch})`,
};
let ok = true;
for (const k in checks) { const v = checks[k]; const pass = v !== false && v !== 0 && String(v).indexOf('FAIL') < 0; if (!pass) ok = false; console.log((pass ? 'PASS ' : 'FAIL ') + k + ' = ' + v); }
console.log(ok ? '\nALL CHECKS PASS' : '\nSOME CHECKS FAILED');
if (!ok) process.exit(1);
