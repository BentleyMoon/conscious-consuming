/* HELD, 2026-10-13. Not promoted, for two reasons. The register is not a census (see "What it is
 * and is not" below), so a brand's median comes from whichever of its models were certified in the
 * last year. And the drafts score capacity under the accessibility key, which the site reads as
 * "everyday access", with a tradeoff pair (environment|accessibility) that build_decisions.js does
 * not have. The adapter, the ENERGY STAR measure and the capture method work; the four drafts it
 * builds (dishwashers, air purifiers, dehumidifiers, fridges and freezers) pass lens_check and
 * swarm sources. Promote them only once a full roster and an honest capacity key exist.
 *
 * The US Department of Energy's Compliance Certification Database: every basic model whose
 * certification to the federal efficiency standard was submitted in the past year.
 *
 * WHAT IT IS AND IS NOT. DOE requires a certification report for every basic model of a covered
 * appliance before it is sold, and its public database "houses only certification records of
 * current basic models that have been submitted within the past year" (the database's landing
 * page). So it lists the recently certified market, which is what makes it the roster, but not every
 * model in a shop: a brand whose reports are more than a year old is thin or missing. The
 * 2026-10-13 capture showed 3 Samsung dishwashers where ENERGY STAR certifies 22, 16 Samsung fridges
 * where ENERGY STAR certifies 101, and no Frigidaire room air conditioners at all. Every lens built
 * here says which brands are short, computed from the two snapshots, so the sentence stays true on a
 * rerun.
 *
 * THE OPTION. A product group holds thousands of model numbers. One option per brand and product
 * type (a top-freezer fridge is not compared with a chest freezer; a 20-pint dehumidifier is not
 * compared with a 50-pint one, because DOE's own standards treat them as different classes), with
 * the median model's figures and the range across that brand's models in every note. Brands that
 * DOE lists for exactly the same set of basic models are one option, because they are one certified
 * product sold under several names. A record whose brand field lists several names separated by
 * commas counts for each name only when every name also appears on its own in the same group;
 * otherwise the field is one name ("VIKING RANGE, LLC"). Records with no brand ("/", "N/A",
 * "not applicable") and brands whose records carry none of the measured figures are left off, and
 * the attribution counts them.
 *
 * SCORES. Each measure is scored as a share of the best brand median of the same type on the list,
 * as the electric-vehicle adapter does, so twice the energy reads as half the score. Capacity is
 * scored the same way, and every note says that more of it only helps if you need it.
 *
 * NOT BUILT, AND WHY (the capture still holds these groups for whoever takes them on):
 *   tumble-dryers: brand medians of the combined energy factor sit at the federal minimum for nearly
 *     every brand of vented dryer, so a brand-level score is 100 for all of them; the difference
 *     that matters (heat pump against vented) is not a DOE class. It needs model-level options.
 *   air-conditioning: Frigidaire, one of the brands people buy most, has no room air conditioner in
 *     the database on the day of capture, and portable units have no ENERGY STAR list.
 */
import { readPayload } from '../lib/read.mjs';

const BASE = 'https://www.regulations.doe.gov/certification-data';
const SOLR = `${BASE}/solr/ccms/select`;
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const PAGE = 5000;

const COMMON = {
  oop: 'oop',
  brand: 'Brand_Name_s__s',
  basic: 'Basic_Model_Number_m',
  model: 'Individual_Model_Number_Covered_by_Basic_Model_m',
  waiver: 'Is_the_Certification_for_this_Basic_Model_Based_on_a_Waiver_of_DOE_s_Test_Procedure_Requirements__s',
};

export const GROUPS = {
  dishwashers: {
    group: 'Dishwashers', page: 'CCMS-4-Dishwashers.html',
    fields: { ...COMMON, cls: 'Product_Group_Code_Description_s', kwh: 'Estimated_Annual_Energy_Use__kWh_year__d', water: 'Water_Consumption__Gallons_Cycle__d', places: 'Capacity__Number_of_Place_Settings__d' },
  },
  fridges: {
    group: 'Refrigerators, Refrigerator-Freezers, and Freezers', page: 'CCMS-4-Refrigerators__Refrigerator-Freezers__and_Freezers.html',
    fields: { ...COMMON, cls: 'Product_Group_Code_Description_s', av: 'Total_Adjusted_Volume__Cubic_Feet__d', kwh: 'Annual_Energy_Use__Kilowatt_Hours_Year__d', vol: 'Total_Refrigerated_Volume__ft3__d' },
  },
  dryersD1: {
    group: 'Clothes Dryers - Appendix D1', page: 'CCMS-4-Clothes_Dryers_-_Appendix_D1.html',
    fields: { ...COMMON, cls: 'Product_Group_Code_Description_s', cap: 'Capacity__cubic_feet__d', cef: 'Combined_Energy_Factor__pounds_per_kilowatt_hour__d' },
  },
  dryersD2: {
    group: 'Clothes Dryers - Appendix D2', page: 'CCMS-4-Clothes_Dryers_-_Appendix_D2.html',
    fields: { ...COMMON, cls: 'Product_Group_Code_Description_s', cap: 'Capacity__cubic_feet__d', cef: 'Combined_Energy_Factor__pounds_per_kilowatt_hour__d' },
  },
  dehumidifiers: {
    group: 'Dehumidifiers', page: 'CCMS-4-Dehumidifiers.html',
    fields: { ...COMMON, cls: 'Product_Group_Code_Description_s', pints: 'Capacity__Pints_Day__d', ief: 'Integrated_Energy_Factor__Liters_Kilowatt_Hour__d' },
  },
  roomAc: {
    group: 'Air Conditioners and Heat Pumps - Room Air Conditioners', page: 'CCMS-4-Air_Conditioners_and_Heat_Pumps_-_Room_Air_Conditioners.html',
    fields: { ...COMMON, cls: 'Product_Group_Code_Description_s', btu: 'Cooling_Capacity__BTU_Hour__d', watts: 'Electrical_Power_Input__Watts__d', ceer: 'Combined_Energy_Efficiency_Ratio_d' },
  },
  portableAc: {
    group: 'Air Conditioners and Heat Pumps - Portable Air Conditioners', page: 'CCMS-4-Air_Conditioners_and_Heat_Pumps_-_Portable_Air_Conditioners.html',
    fields: { ...COMMON, ceer: 'Combined_Energy_Efficiency_Ratio__CEER__in_Btu_Wh_d', sacc: 'Seasonally_Adjusted__Cooling_Capacity__SACC__in_Btu_h_d', duct: 'Duct_Configuration_Used_for_Testing_s' },
  },
  airCleaners: {
    group: 'Air Cleaners', page: 'CCMS-4-Air_Cleaners.html',
    fields: { ...COMMON, cls: 'Product_Group_Code_Description_s', pm25: 'PM2_5_CADR__cfm__d', smoke: 'Smoke_Clean_Air_Delivery_Rate__CADR___cfm__d', kwh: 'Annual_Energy_Consumption__kWh_yr__d', ief: 'Integrated_Energy_Factor__PM2_5_CADR_W__d', room: 'Effective_Room_Size__square_feet__d' },
  },
};

const fl = (fields) => Object.entries(fields).map(([alias, field]) => (alias === field ? field : `${alias}:${field}`)).join(',');
export function pageUrl(spec, start, rows) {
  const q = new URLSearchParams({ q: `Product_Group_s:"${spec.group}"`, fl: fl(spec.fields), sort: 'oop asc', start: String(start), rows: String(rows), wt: 'json', omitHeader: 'true' });
  return `${SOLR}?${q}`;
}

export const source = { name: 'US DOE Compliance Certification Database', register: 'doe-compliance-certification-database' };

export const captures = [{
  register: 'doe-compliance-certification-database',
  access: 'api',
  base: SOLR,
  userAgent: BROWSER_UA,
  concurrency: 2,
  scope: `The DOE Compliance Certification Database's own search index (the Solr service behind each product group page), every record in eight product groups: ${Object.values(GROUPS).map((g) => g.group).join('; ')}. Brand, product class, basic and individual model numbers, and the tested energy, water and capacity fields each group publishes.`,
  licenseUrl: 'https://www.energy.gov/web-policies',
  licenseNote: 'US federal government work: "Government information at DOE websites is in the public domain" (energy.gov web policies). DOE states that a listing is not a finding of compliance and makes no warranty on accuracy. The site refuses scripted user agents, so the crawl identifies as a browser.',
  parserId: 'doe-ccms-solr-bundle',
  parserVersion: '1.0.0',
  async crawl(get) {
    for (const spec of Object.values(GROUPS)) {
      const head = await get(pageUrl(spec, 0, 0));
      const total = (head && head.response && head.response.numFound) || 0;
      for (let start = 0; start < total; start += PAGE) await get(pageUrl(spec, start, PAGE));
    }
  },
}];

/* ---------- reading ---------- */

/* Case, spaces and punctuation only, the same rule the ENERGY STAR join uses. */
const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
/* DOE prints a few brand names as UTF-8 read as Latin-1 ("CafÃ©"). Repaired only when the bytes
   decode cleanly, and only for display and grouping; the source link keeps DOE's own spelling. */
function repair(s) {
  const t = String(s || '').trim();
  if (!/[ÃÂ]/.test(t)) return t;
  const fixed = Buffer.from(t, 'latin1').toString('utf8');
  return fixed.includes('�') ? t : fixed;
}
const NO_BRAND = new Set(['', 'na', 'notapplicable', 'none', 'unbranded', 'nobrand', 'generic']);
const list = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]).flatMap((v) => String(v).split(/[,;]/)).map((v) => v.trim()).filter(Boolean);
const median = (xs) => {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
};
const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (n, dp = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const joinNames = (names) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`;

function groupRecords(bundle, key) {
  const spec = GROUPS[key];
  const docs = [];
  for (const [url, r] of Object.entries(bundle.responses || {})) {
    if (r.status !== 200 || !r.body || !r.body.response) continue;
    if (new URL(url).searchParams.get('q') !== `Product_Group_s:"${spec.group}"`) continue;
    docs.push(...r.body.response.docs);
  }
  const seen = new Set();
  const unique = docs.filter((d) => (seen.has(d.oop) ? false : seen.add(d.oop)));
  const standalone = new Set(unique.filter((d) => !String(d.brand).includes(',')).map((d) => norm(repair(d.brand))));
  let unbranded = 0;
  const records = [];
  for (const d of unique) {
    const raw = String(d.brand || '').trim();
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    const brands = (parts.length > 1 && parts.every((p) => standalone.has(norm(repair(p)))) ? parts : [raw.replace(/,\s*$/, '')])
      .map(repair).filter((b) => !NO_BRAND.has(norm(b)));
    if (!brands.length) { unbranded += 1; continue; }
    records.push({ ...d, group: key, raw, brands, basicNumber: String(d.basic || '').trim(), models: list(d.model) });
  }
  return { records, unbranded };
}

/* ---------- the decisions ---------- */

const share = (x, best, lowerIsBetter) => (lowerIsBetter ? best / x : x / best);

const DECISIONS = {
  dishwashers: {
    label: 'Dishwashers',
    groups: ['dishwashers'],
    minModels: 3,
    ds: ['q8py-6w3f'],
    type: (r) => (/compact/i.test(r.cls) ? 'compact' : /standard/i.test(r.cls) ? 'standard' : null),
    types: { standard: 'standard dishwashers', compact: 'compact dishwashers' },
    env: [
      { field: 'kwh', lower: true, what: 'estimated annual energy use', unit: (x) => `${num(x)} kWh a year` },
      { field: 'water', lower: true, what: 'water use', unit: (x) => `${num(x, 1)} gallons a cycle` },
    ],
    envLabel: 'Energy and water use',
    cap: { field: 'places', what: 'capacity', unit: (x) => `${num(x)} place settings`, plain: 'More place settings means fewer loads for a household that fills them.' },
    capLabel: 'Place settings per load',
    tradeoffLabels: ['less energy and water a cycle', 'more place settings a load'],
    presets: ['Least energy and water', 'Most place settings'],
    excludes: 'Prices, reliability, noise and repair records are not in these registers and are not scored.',
  },
  'air-purifiers': {
    label: 'Air purifiers',
    groups: ['airCleaners'],
    minModels: 5,
    ds: ['gaa3-swy6'],
    type: () => 'all',
    types: { all: 'air purifiers' },
    env: [{ field: 'ief', lower: false, what: 'integrated energy factor', unit: (x) => `${num(x, 1)} cubic feet a minute of fine-particle-free air per watt`, also: (o) => `median annual energy use ${num(o.median('kwh'))} kWh (${o.spread('kwh', (x) => num(x))})` }],
    envLabel: 'Clean air per watt',
    cap: { field: 'pm25', what: 'PM2.5 clean air delivery rate', unit: (x) => `${num(x)} cubic feet a minute`, also: (o) => `; the median effective room size DOE gives is ${num(o.median('room'))} square feet`, plain: 'A higher rate clears fine particles from a room faster or serves a bigger room.' },
    capLabel: 'Clean air delivery rate (PM2.5)',
    tradeoffLabels: ['more clean air per watt', 'more clean air a minute'],
    presets: ['Most clean air per watt', 'Most clean air a minute'],
    excludes: 'Prices, filter costs, noise and ozone are not scored. DOE tests fine particles, smoke and dust, not gases, odours or germs.',
  },
  'dehumidifiers-and-humidifiers': {
    label: 'Dehumidifiers and humidifiers',
    groups: ['dehumidifiers'],
    minModels: 4,
    ds: ['mgiu-hu4z'],
    // DOE's own classes: the standard differs by capacity, so brands are compared within a class.
    type: (r) => {
      const c = String(r.cls);
      if (/whole-home/i.test(c)) return 'whole-home';
      if (/greater than 50/i.test(c)) return 'over-50';
      if (/greater than 25/i.test(c)) return '25-50';
      if (/less than or equal to 25/i.test(c)) return 'to-25';
      return null;
    },
    types: {
      'to-25': 'portable dehumidifiers up to 25 pints a day', '25-50': 'portable dehumidifiers over 25 and up to 50 pints a day',
      'over-50': 'portable dehumidifiers over 50 pints a day', 'whole-home': 'whole-home dehumidifiers',
    },
    env: [{ field: 'ief', lower: false, what: 'integrated energy factor', unit: (x) => `${num(x, 2)} litres of water removed per kWh` }],
    envLabel: 'Water removed per kWh',
    cap: { field: 'pints', what: 'capacity', unit: (x) => `${num(x, 1)} pints of water a day`, plain: 'A bigger capacity dries a damper or larger space; a small damp room does not need one.' },
    capLabel: 'Water removed a day',
    tradeoffLabels: ['more water removed per kWh', 'more water removed a day'],
    presets: ['Most water per kWh', 'Biggest capacity'],
    excludes: 'Humidifiers have no DOE efficiency standard and are not on this list. Prices, noise and refrigerant are not scored.',
  },
  'fridges-and-freezers': {
    label: 'Fridges and freezers',
    groups: ['fridges'],
    minModels: 10,
    ds: ['p5st-her9', '8t9c-g3tn'],
    type: (r) => {
      const c = String(r.cls);
      if (/built-?in/i.test(c)) return 'built-in';
      if (/compact/i.test(c)) return /freezers/i.test(c) && !/refrigerator/i.test(c) ? 'compact-freezer' : 'compact';
      if (/chest freezers/i.test(c)) return 'chest';
      if (/upright freezers/i.test(c)) return 'upright';
      if (/all-refrigerators/i.test(c)) return 'fridge-only';
      if (/top-mounted/i.test(c)) return 'top';
      if (/bottom-mounted/i.test(c)) return 'bottom';
      if (/side-mounted/i.test(c)) return 'side';
      return null;
    },
    types: {
      top: 'top-freezer fridges', bottom: 'bottom-freezer fridges', side: 'side-by-side fridges', 'fridge-only': 'fridges without a freezer',
      upright: 'upright freezers', chest: 'chest freezers', compact: 'compact fridges', 'compact-freezer': 'compact freezers', 'built-in': 'built-in fridges and freezers',
    },
    derive: (r) => ({ ...r, kwhPerAv: r.kwh > 0 && r.av > 0 ? r.kwh / r.av : null }),
    env: [{ field: 'kwhPerAv', lower: true, what: 'energy use per adjusted cubic foot', unit: (x) => `${num(x, 1)} kWh a year per adjusted cubic foot`, also: (o) => `median ${num(o.median('kwh'))} kWh a year (${o.spread('kwh', (x) => num(x))}) for a median adjusted volume of ${num(o.median('av'), 1)} cubic feet, which is how DOE sizes a cabinet for its standard` }],
    envLabel: 'Energy use per cubic foot',
    cap: { field: 'vol', what: 'storage volume', unit: (x) => `${num(x, 1)} cubic feet`, plain: 'More storage only helps a household that fills it, and a bigger cabinet uses more energy in total.' },
    capLabel: 'Storage volume',
    tradeoffLabels: ['less energy per cubic foot', 'more storage'],
    presets: ['Least energy per cubic foot', 'Most storage'],
    excludes: 'Prices, noise and reliability are not scored. Wine and beverage coolers are a separate DOE product group and are not on this list.',
  },
};

/* ---------- building ---------- */

function optionsFor(spec, records) {
  const rows = records.map((r) => (spec.derive ? spec.derive(r) : r)).map((r) => ({ ...r, type: spec.type(r) })).filter((r) => r.type);
  // Brands that DOE lists for exactly the same set of basic models become one option.
  const basics = new Map();
  for (const r of rows) for (const b of r.brands) {
    const k = norm(b);
    if (!basics.has(k)) basics.set(k, new Set());
    basics.get(k).add(norm(r.basicNumber));
  }
  const bySig = new Map();
  for (const [k, set] of basics) {
    const sig = [...set].sort().join('|');
    if (!bySig.has(sig)) bySig.set(sig, []);
    bySig.get(sig).push(k);
  }
  const groupOf = new Map();
  for (const keys of bySig.values()) for (const k of keys) groupOf.set(k, keys.slice().sort().join('+'));

  const options = new Map();
  for (const r of rows) {
    for (const g of new Set(r.brands.map((b) => groupOf.get(norm(b))))) {
      const id = `${g}|${r.type}`;
      if (!options.has(id)) options.set(id, { id, group: g, type: r.type, models: new Map() });
      const o = options.get(id);
      const mk = `${r.group}|${norm(r.basicNumber)}|${r.models.map(norm).sort().join(',')}`;
      if (!o.models.has(mk)) o.models.set(mk, { ...r, brands: [], raws: new Set() });
      const m = o.models.get(mk);
      for (const b of r.brands) if (groupOf.get(norm(b)) === g && !m.brands.includes(b)) m.brands.push(b);
      m.raws.add(r.raw);
    }
  }
  return [...options.values()].map((o) => ({ ...o, models: [...o.models.values()] })).filter((o) => o.models.length >= spec.minModels);
}

/* One spelling per brand across a decision: the commonest, except that where the commonest is in
   capitals and DOE also prints the same letters in mixed case (WHIRLPOOL, Whirlpool), the mixed case
   is used for reading. BLACK+DECKER stays BLACK+DECKER: "Black Decker" is not the same spelling. */
function spellings(records) {
  const byKey = new Map();
  for (const r of records) for (const b of r.brands) {
    const k = norm(b);
    if (!byKey.has(k)) byKey.set(k, new Map());
    byKey.get(k).set(b, (byKey.get(k).get(b) || 0) + 1);
  }
  const out = new Map();
  for (const [k, s] of byKey) {
    const e = [...s.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const top = e[0][0];
    const mixed = top === top.toUpperCase() ? e.find(([b]) => b !== b.toUpperCase() && b.toUpperCase() === top) : null;
    out.set(k, (mixed || e[0])[0]);
  }
  return out;
}

/* The option's names, in order of how many of its models carry each. */
function describe(o, spelling) {
  const count = new Map();
  for (const m of o.models) for (const b of m.brands) count.set(norm(b), (count.get(norm(b)) || 0) + 1);
  return [...count.entries()].map(([k, n]) => ({ b: spelling.get(k), n }))
    .sort((a, b) => b.n - a.n || a.b.localeCompare(b.b)).map((x) => x.b);
}

/* Brands that DOE lists for more than this many models in a type but whose ENERGY STAR list is at
   least twice as long, read from the two snapshots. */
function coverageGap(spec, records, esBundle) {
  if (!esBundle) return '';
  const esCount = new Map();
  for (const ds of spec.ds) {
    const hit = Object.entries(esBundle.responses || {}).find(([u]) => u.includes(`/${ds}.json`));
    if (!hit || !Array.isArray(hit[1].body)) continue;
    for (const r of hit[1].body) {
      const k = norm(r.brand_name);
      const cur = esCount.get(k) || { name: r.brand_name, n: 0 };
      cur.n += 1;
      esCount.set(k, cur);
    }
  }
  const doeCount = new Map();
  for (const r of records) for (const b of r.brands) doeCount.set(norm(b), (doeCount.get(norm(b)) || 0) + 1);
  // ENERGY STAR also prints several names in one field ("Waykar; KESNOS; YAUFEY; Fehom"); DOE's
  // count for such a row is the largest count among the names it lists.
  const doeFor = (k, name) => {
    const parts = String(name).split(/[,;]/).map((p) => norm(p)).filter(Boolean);
    return parts.length > 1 ? Math.max(...parts.map((p) => doeCount.get(p) || 0)) : doeCount.get(k) || 0;
  };
  const short = [...esCount.entries()].map(([k, v]) => ({ ...v, doe: doeFor(k, v.name) }))
    .filter((x) => x.n >= 10 && x.doe < x.n / 2).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  if (!short.length) return '';
  return ` On the day of capture ENERGY STAR certified at least twice as many models as this database listed for ${plural(short.length, 'brand', 'brands')} with ten or more ENERGY STAR models: ${short.slice(0, 6).map((x) => `${x.name} (${x.n} against ${x.doe})`).join(', ')}${short.length > 6 ? ', and others' : ''}. Those brands' rows rest on fewer models than they sell, or are missing.`;
}

export async function build(ctx, only) {
  const snap = ctx.latestSnapshot(source.register);
  if (!snap) throw new Error(`no snapshot for ${source.register}: run node pipeline/sources/capture.mjs doe-ccd-appliances`);
  const bundle = JSON.parse(readPayload(snap).toString('utf8'));
  const asof = String(snap.manifest.capturedAt || '').slice(0, 7);
  const capturedOn = String(snap.manifest.capturedAt || '').slice(0, 10);
  const esSnap = ctx.latestSnapshot('energy-star-certified-products');
  const esBundle = esSnap ? JSON.parse(readPayload(esSnap).toString('utf8')) : null;
  const byGroup = Object.fromEntries(Object.keys(GROUPS).map((k) => [k, groupRecords(bundle, k)]));
  const out = [];

  for (const [decisionId, spec] of Object.entries(DECISIONS)) {
    if (only && only !== decisionId) continue;
    const records = spec.groups.flatMap((g) => byGroup[g].records);
    const unbranded = spec.groups.reduce((n, g) => n + byGroup[g].unbranded, 0);
    const multiType = Object.keys(spec.types).length > 1;

    let opts = optionsFor(spec, records);
    const spelling = spellings(records);
    for (const o of opts) {
      o.names = describe(o, spelling);
      o.values = (field) => o.models.map((m) => Number(m[field])).filter((x) => Number.isFinite(x) && x > 0);
      o.median = (field) => median(o.values(field));
      o.spread = (field, fmt) => {
        const xs = o.values(field);
        const lo = Math.min(...xs), hi = Math.max(...xs);
        return lo === hi ? `all ${fmt(lo)}` : `range ${fmt(lo)} to ${fmt(hi)}`;
      };
      o.basics = new Set(o.models.map((m) => norm(m.basicNumber)));
    }
    const blank = opts.filter((o) => [...spec.env.map((e) => e.field), spec.cap.field].every((f) => o.median(f) == null));
    opts = opts.filter((o) => !blank.includes(o));
    const bestOf = (field, lower, type) => {
      const xs = opts.filter((o) => o.type === type).map((o) => o.median(field)).filter((x) => x != null && x > 0);
      return xs.length ? (lower ? Math.min(...xs) : Math.max(...xs)) : null;
    };
    const page = (o) => {
      const raws = [...new Set(o.models.flatMap((m) => [...m.raws]))].sort();
      const fq = `Brand_Name_s__s:(${raws.map((r) => `"${r.replace(/"/g, '\\"')}"`).join(' OR ')})`;
      return `${BASE}/${GROUPS[spec.groups[0]].page}#fq=${encodeURIComponent(fq)}`;
    };

    const products = opts.map((o) => {
      const typePhrase = spec.types[o.type];
      const brandLabel = joinNames(o.names);
      const name = multiType ? `${o.names.join(' / ')} ${typePhrase}` : o.names.join(' / ');
      const n = o.models.length;
      const who = o.names.length > 1 ? `the names ${brandLabel}` : o.names[0];
      const shared = o.names.length > 1 ? ' DOE lists the same basic models under each of these names, so they are one row.' : '';
      const within = opts.filter((x) => x !== o && x.type === o.type && x.basics.size > o.basics.size && [...o.basics].every((b) => x.basics.has(b))).map((x) => x.names[0]);
      const overlap = within.length ? ` Every one of these basic models is also listed under ${joinNames(within.slice(0, 3))}.` : '';
      const waivers = o.models.filter((m) => /^yes/i.test(String(m.waiver || ''))).length;
      const waiverNote = waivers ? ` ${plural(waivers, 'of them was', 'of them were')} certified under a DOE waiver of the usual test procedure.` : '';
      const src = page(o);

      const p = {
        code: slug(name),
        name,
        brand: o.names[0],
        allergens: [],
        allergensDeclared: true,
        description: `${plural(n, typePhrase.replace(/s( |$)/, '$1'), typePhrase)} that DOE's certification database lists under ${brandLabel}.${shared}${overlap}`,
        scores: {},
        provenance: {},
        links: [{ label: 'DOE certification records for this brand', url: src }],
        region: ['US'],
        focuses: [o.names[0], typePhrase.replace(/^./, (c) => c.toUpperCase())],
        ids: {
          doeModels: {
            label: typePhrase, who,
            // The join tries each brand name and the brand field exactly as DOE printed it, so a
            // field listing four names can still meet an ENERGY STAR row that lists the same four.
            records: o.models.map((m) => ({ brands: [...new Set([...m.brands, ...m.raws])], models: [...m.models, m.basicNumber].filter(Boolean) })),
          },
        },
      };

      // Environment: each measure's median as a share of the best brand median of the same type,
      // averaged across measures where a group has two.
      const parts = [];
      const shares = [];
      for (const e of spec.env) {
        const med = o.median(e.field);
        const best = bestOf(e.field, e.lower, o.type);
        if (med == null || best == null) continue;
        shares.push(share(med, best, e.lower));
        parts.push(`${e.what[0].toUpperCase()}${e.what.slice(1)}: median ${e.unit(med)} (${o.spread(e.field, (x) => e.unit(x).split(' ')[0])}); the best brand median is ${e.unit(best)}${e.also ? `; ${e.also(o)}` : ''}.`);
      }
      if (shares.length) {
        const pole = spec.env.every((e) => e.lower) ? 'twice the best scores 50' : 'half the best scores 50';
        const how = shares.length > 1
          ? `Scored as the average of the two shares of the best brand median among ${typePhrase} on this list (the best scores 100; ${pole}).`
          : `Scored as a share of the best brand median among ${typePhrase} on this list (the best scores 100; ${pole}).`;
        p.scores.environment = Math.min(100, Math.round(100 * (shares.reduce((a, b) => a + b, 0) / shares.length)));
        p.provenance.environment = {
          note: `${plural(n, typePhrase.replace(/s( |$)/, '$1'), typePhrase)} under ${brandLabel}, as each manufacturer certified them to DOE under its test procedure. ${parts.join(' ')}${waiverNote} ${how}`,
          source: src,
          asof,
        };
      }
      const c = spec.cap;
      const capMed = o.median(c.field);
      const capBest = bestOf(c.field, false, o.type);
      if (capMed != null && capBest != null) {
        p.scores.accessibility = Math.min(100, Math.round(100 * share(capMed, capBest, false)));
        p.provenance.accessibility = {
          note: `Median ${c.what} ${c.unit(capMed)} across the ${plural(o.values(c.field).length, typePhrase.replace(/s( |$)/, '$1'), typePhrase)} DOE lists under ${brandLabel} (${o.spread(c.field, (x) => c.unit(x).split(' ')[0])})${c.also ? c.also(o) : ''}. Scored as a share of the largest brand median among ${typePhrase} on this list (${c.unit(capBest)} scores 100; half of it scores 50). ${c.plain}`,
          source: src,
          asof,
        };
      }
      return p;
    });
    products.sort((a, b) => a.name.localeCompare(b.name));

    const leftOff = [
      unbranded ? `${plural(unbranded, 'record', 'records')} with no brand name ("/", "N/A", "not applicable")` : '',
      blank.length ? `${blank.map((o) => o.names.join(' / ')).join(', ')}, whose records carry none of the measured figures` : '',
    ].filter(Boolean);
    const groupNames = spec.groups.map((g) => GROUPS[g].group).join(' and ');
    const typeList = joinNames(Object.entries(spec.types).filter(([t]) => opts.some((o) => o.type === t)).map(([, phrase]) => phrase));
    const lens = {
      meta: {
        id: decisionId,
        label: spec.label,
        type: 'Products',
        primaryAxis: 'environment',
        tradeoff: ['environment', 'accessibility'],
        tradeoffLabels: spec.tradeoffLabels,
        source: 'US Department of Energy Compliance Certification Database; US EPA ENERGY STAR certified products',
        attribution: `Every brand with at least ${spec.minModels} models of one type in the US Department of Energy's Compliance Certification Database (${groupNames}), captured ${capturedOn}, one row per brand and type${multiType ? ` (${typeList})` : ''}. DOE's public database holds the certifications of current basic models submitted in the past year, so a brand whose reports are older than that is thin or missing.${coverageGap(spec, records, esBundle)} Brands that DOE lists for exactly the same basic models are one row, and a model DOE lists more than once counts once.${leftOff.length ? ` Left off: ${leftOff.join('; ')}.` : ''} The figures are the manufacturers' own certified test results; DOE says a listing is not a finding of compliance. Each score is the brand's median model as a share of the best brand median of the same type on this list, so it compares brands within a type and says nothing about how far either is from the legal minimum. Capacity scores higher when it is bigger, which only matters if you need it. The ENERGY STAR share is EPA's certified list matched to DOE's models by brand and model number; a brand with no match is left unscored, which the ranking reads as neutral. ${spec.excludes}`,
        allergens: false,
        presets: {
          Balanced: { w: { environment: 3, accessibility: 2, certification: 2 }, x: [] },
          [spec.presets[0]]: { w: { environment: 5, certification: 2, accessibility: 1 }, x: [] },
          [spec.presets[1]]: { w: { accessibility: 5, environment: 2, certification: 1 }, x: [] },
          'Most ENERGY STAR models': { w: { certification: 5, environment: 3, accessibility: 1 }, x: [] },
        },
        license: 'US public data (Department of Energy; EPA ENERGY STAR)',
        productBase: `${BASE}/${GROUPS[spec.groups[0]].page}`,
        n: products.length,
      },
      criteria: [
        { key: 'environment', label: spec.envLabel, source: 'US DOE Compliance Certification Database', tier: 'measured' },
        { key: 'accessibility', label: spec.capLabel, source: 'US DOE Compliance Certification Database', tier: 'measured' },
      ],
      products,
      links: [
        ...spec.groups.map((g) => ({ label: `DOE certification database: ${GROUPS[g].group}`, url: `${BASE}/${GROUPS[g].page}` })),
        { label: 'ENERGY STAR product finder', url: 'https://www.energystar.gov/productfinder/' },
      ],
    };
    out.push({ decision: decisionId, lens, measures: ['energy-star-models'] });
  }
  return out;
}
