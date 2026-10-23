/* ENERGY STAR certified products (US EPA), read through data.energystar.gov.
 *
 * A list that manufacturers apply to join, so it can only add a positive fact to an option a census
 * already put on the roster. It joins to the DOE Compliance Certification Database model by model:
 * the same brand and the same model number as both registers print them, after removing only case,
 * spaces and punctuation (DOE writes "KDTS424S***", ENERGY STAR may write "KDTS424S**"; both become
 * "kdts424s"). Nothing is matched by a model number that merely starts the same way.
 *
 * The fact it writes is about a brand's line, because a draft's option is a brand: "N of the M
 * models DOE lists under this brand are ENERGY STAR certified". A brand with none certified is left
 * unscored, which the ranking reads as neutral, not as zero. A brand with any certified model
 * scores at least 60, because a missing score reads as 50 and a positive fact must never rank below
 * silence; the rest of the scale is the certified share (60 + 40 x N / M).
 *
 * An option reaches this measure through ids.doeModels = { label, who, records: [{ brands, models }] },
 * one record per DOE listing, carrying every brand name and model number DOE prints on it.
 */
import { readPayload } from '../lib/read.mjs';

const API = 'https://data.energystar.gov/resource';
const FINDER = 'https://www.energystar.gov/productfinder/product';

/* Each dataset, with the product finder page a reader can filter by brand. */
const DATASETS = {
  'q8py-6w3f': { name: 'Certified Residential Dishwashers', finder: 'certified-residential-dishwashers' },
  'p5st-her9': { name: 'Certified Residential Refrigerators', finder: 'certified-residential-refrigerators' },
  '8t9c-g3tn': { name: 'Certified Residential Freezers', finder: 'certified-residential-freezers' },
  't9u7-4d2j': { name: 'Certified Residential Clothes Dryers', finder: 'certified-clothes-dryers' },
  'mgiu-hu4z': { name: 'Certified Dehumidifiers', finder: 'certified-dehumidifiers' },
  '5xn2-dv4h': { name: 'Certified Room Air Conditioners', finder: 'certified-room-air-conditioners' },
  'gaa3-swy6': { name: 'Certified Room Air Cleaners', finder: 'certified-room-air-cleaners' },
};
const FOR_DECISION = {
  dishwashers: ['q8py-6w3f'],
  'fridges-and-freezers': ['p5st-her9', '8t9c-g3tn'],
  'tumble-dryers': ['t9u7-4d2j'],
  'dehumidifiers-and-humidifiers': ['mgiu-hu4z'],
  'air-conditioning': ['5xn2-dv4h'],
  'air-purifiers': ['gaa3-swy6'],
};

export const id = 'energy-star-models';
export const criterion = { key: 'certification', label: 'Share of models ENERGY STAR certifies', source: 'US EPA ENERGY STAR certified product datasets', tier: 'certified' };
export const idScheme = 'doeModels';

export function datasetUrl(ds) {
  const q = new URLSearchParams({ $select: 'brand_name,model_number,pd_id,meets_most_efficient_criteria', $order: 'pd_id', $limit: '50000' });
  return `${API}/${ds}.json?${q}`;
}

export const captures = [{
  register: 'energy-star-certified-products',
  access: 'api',
  base: API,
  scope: `ENERGY STAR certified product datasets on data.energystar.gov, every row of seven: ${Object.entries(DATASETS).map(([k, v]) => `${v.name} (${k})`).join('; ')}. Brand, model number, product finder id and the Most Efficient flag.`,
  licenseUrl: 'https://edg.epa.gov/EPA_Data_License.html',
  licenseNote: 'EPA Data License: "all data produced by the U.S EPA is by default in the public domain".',
  parserId: 'energy-star-socrata-bundle',
  parserVersion: '1.0.0',
  async crawl(get) {
    for (const ds of Object.keys(DATASETS)) await get(datasetUrl(ds));
  },
}];

/* Case, spaces and punctuation only. */
export const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');

export function reaches(decision) {
  return Boolean(FOR_DECISION[decision.id]);
}

export async function index(ctx) {
  const snap = ctx.latestSnapshot('energy-star-certified-products');
  if (!snap) return null;
  const bundle = JSON.parse(readPayload(snap).toString('utf8'));
  const asof = String(bundle.finishedAt || snap.manifest.capturedAt || '').slice(0, 7);
  const byId = new Map();
  for (const ds of Object.keys(DATASETS)) {
    const r = bundle.responses[datasetUrl(ds)];
    if (!r || r.status !== 200 || !Array.isArray(r.body)) continue;
    for (const row of r.body) {
      const b = norm(row.brand_name);
      const m = norm(row.model_number);
      if (!b || !m) continue;
      byId.set(`${ds}|${b}|${m}`, {
        dataset: ds, brand: row.brand_name, model: row.model_number, pdId: row.pd_id,
        mostEfficient: row.meets_most_efficient_criteria === 'Yes', asof, score: null,
      });
    }
  }
  return { byId, byName: null };
}

/* Every key any of the option's DOE records could match, in each dataset its decision reads. */
export function key(option, decision) {
  const v = option.ids && option.ids.doeModels;
  if (!v) return [];
  const keys = new Set();
  for (const ds of FOR_DECISION[decision.id] || []) {
    for (const rec of v.records) for (const b of rec.brands) for (const m of rec.models) keys.add(`${ds}|${norm(b)}|${norm(m)}`);
  }
  return [...keys];
}

/* N of the option's M DOE records carry a brand and model number an ENERGY STAR list also prints. */
export function combine(facts, option) {
  const v = option.ids.doeModels;
  const hit = new Map(facts.map((f) => [`${norm(f.brand)}|${norm(f.model)}`, f]));
  let n = 0, most = 0;
  for (const rec of v.records) {
    const found = rec.brands.flatMap((b) => rec.models.map((m) => hit.get(`${norm(b)}|${norm(m)}`))).filter(Boolean);
    if (!found.length) continue;
    n += 1;
    if (found.some((f) => f.mostEfficient)) most += 1;
  }
  if (!n) return null;
  const m = v.records.length;
  const count = (xs) => [...xs.reduce((acc, x) => acc.set(x, (acc.get(x) || 0) + 1), new Map()).entries()].sort((a, b) => b[1] - a[1]);
  const esBrand = count(facts.map((f) => f.brand))[0][0];
  const ds = count(facts.map((f) => f.dataset))[0][0];
  const names = [...new Set(facts.map((f) => DATASETS[f.dataset].name))];
  const lists = names.length > 1 ? `${names.join(' and ')} lists also print` : `${names[0]} list also prints`;
  const pct = Math.round((100 * n) / m);
  const fmt = (x) => x.toLocaleString('en-US');
  return {
    score: Math.round(60 + (40 * n) / m),
    note: `${fmt(n)} of the ${fmt(m)} ${v.label} DOE lists under ${v.who} (${pct} per cent) carry a brand and model number that ENERGY STAR's ${lists}${most ? `, and ${fmt(most)} of those ${most === 1 ? 'meets' : 'meet'} ENERGY STAR Most Efficient` : ''}. Matched with only case, spaces and punctuation removed, so a model ENERGY STAR lists under a different number is not counted. Scored 60 plus 40 times the certified share; a brand with no match is left unscored, which the ranking reads as neutral.`,
    source: `${FINDER}/${DATASETS[ds].finder}/results?page_number=0&brand_name_filter=${encodeURIComponent(esBrand).replace(/%20/g, '+')}&markets_filter=United+States`,
    asof: facts[0].asof,
  };
}
