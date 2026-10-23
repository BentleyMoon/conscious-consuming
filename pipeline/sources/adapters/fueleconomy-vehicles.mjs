/* The EPA and DOE vehicle census (fueleconomy.gov): every vehicle rated for sale in the US.
 *
 * One option per make, nameplate and powertrain, for the newest of model years 2026 and 2027 in
 * which it is listed. A nameplate's configurations (drive, battery, wheel size, trim) are its
 * variants; figures use the median variant, and each note gives the full range so the spread is
 * never hidden. The file builds five decisions: electric vehicles, hybrids and plug-in hybrids,
 * small and city cars, vans and pickups, and new cars as a whole.
 *
 * POWERTRAINS. The EPA's atvType says EV, Hybrid, Plug-in Hybrid, Diesel, FFV or FCV, or nothing
 * for a plain gasoline car. "Hybrid" covers two different things: full hybrids, which can move on
 * the electric motor alone, and mild hybrids, whose engine descriptor says "Mild Hybrid". A Ford
 * Escape, an Escape hybrid and an Escape plug-in hybrid cost different amounts to run, so each is
 * its own option. Flex-fuel rows are gasoline cars that can also take E85; their annual cost is
 * the EPA's gasoline figure, so they stay with the gasoline nameplate. Fuel-cell cars are left
 * out: the file gives them no fuel cost.
 *
 * NAMES. The EPA's baseModel for the electric Equinox is "Equinox", the same as the gasoline one.
 * The variant names say "Equinox EV AWD", so an electric option takes the longer common prefix
 * when it adds an electric marker, and otherwise adds "(electric)" when another powertrain shares
 * the baseModel. Other powertrains follow the same rule with a plain word: "(hybrid)",
 * "(plug-in hybrid)", "(mild hybrid)" or "(diesel)" is added only when the same make and baseModel
 * is also sold with another powertrain. A gasoline car keeps the bare name.
 *
 * PLUG-IN HYBRIDS. For a plug-in hybrid the file's fuelCost08 is the annual cost on gasoline
 * alone and fuelCostA08 (the electricity cost) is 0 on every 2026 and 2027 row. The headline figure
 * fueleconomy.gov shows ("Annual Fuel Cost, Electricity + Gasoline") is not in the file. It is
 * rebuilt here from the file's own city and highway utility factors, kWh per 100 miles and
 * gasoline-only mpg, at the fuel prices that reproduce the file's other annual costs. On
 * 2026-10-12 the rebuilt figure matched the fueleconomy.gov page for all 30 plug-in hybrids
 * checked, and agrees with the file's own five-year youSaveSpend figure for every plug-in row.
 */
import fs from 'node:fs';
import path from 'node:path';
import { unzip, parseCsv, readPayload } from '../lib/read.mjs';

// The side-by-side page shows the annual cost, mpg and range the notes quote; the noframes page
// shows mpg and kWh per 100 miles only.
const SBS = 'https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=';
const YEARS = ['2026', '2027'];
const EV_MARKERS = new Set(['EV', 'ELECTRIC', 'ELECTRIFIED', 'E-TRON', 'BEV']);
const POWERTRAIN = { EV: 'BEV', Hybrid: 'HEV', 'Plug-in Hybrid': 'PHEV', FCV: 'FCEV' };
const MAPS = ['vehicle-makers.json', 'vehicle-makers-additions.json'];

export const source = { name: 'EPA and DOE fueleconomy.gov vehicle census', register: 'fueleconomy-gov-vehicles' };

export const captures = [{
  register: 'fueleconomy-gov-vehicles',
  access: 'bulk',
  url: 'https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip',
  scope: 'Every vehicle in the fueleconomy.gov database, all model years, as one zipped CSV.',
  licenseUrl: 'https://edg.epa.gov/EPA_Data_License.htm',
  licenseNote: 'US public domain: data produced by the US EPA is in the public domain by default (EPA data licence, reached through the data.gov catalogue entry).',
  parserId: 'fueleconomy-vehicles-csv',
  parserVersion: '1.0.0',
}];

const median = (xs) => {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  return s[Math.floor((s.length - 1) / 2)];
};
const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dollars = (n) => `$${n.toLocaleString('en-US')}`;
const tokens = (s) => String(s).split(/\s+/).filter(Boolean);
const powertrainOf = (r) => POWERTRAIN[r.atvType] || 'ICE';
// The EPA rounds annual costs to the nearest $50, halves going down ($3,425 is shown as $3,400).
const round50 = (x) => Math.round(x / 50 - 1e-6) * 50;
const lo = (xs) => Math.min(...xs);
const hi = (xs) => Math.max(...xs);
const spread = (xs, fmt) => (lo(xs) === hi(xs) ? fmt(lo(xs)) : `${fmt(lo(xs))} to ${fmt(hi(xs))}`);
const configs = (k) => (k === 1 ? 'its one configuration' : `its ${k} configurations`);

function bodyType(vclass) {
  if (/Pickup/.test(vclass)) return 'Pickup';
  if (/Sport Utility/.test(vclass)) return 'SUV';
  if (/Van|Minivan/.test(vclass)) return 'Van';
  if (/Wagon/.test(vclass)) return 'Wagon';
  if (/Two Seaters/.test(vclass)) return 'Two-seater';
  return 'Car';
}

/* The EPA size class in plain words, without the 2WD or 4WD the EPA appends. */
function sizeClass(vclass) {
  const c = String(vclass).replace(/\s*-?\s*[24]WD$/, '').trim();
  const words = {
    'Small Sport Utility Vehicle': 'small SUVs', 'Standard Sport Utility Vehicle': 'standard SUVs',
    'Small Pickup Trucks': 'small pickups', 'Standard Pickup Trucks': 'standard pickups', Minivan: 'minivans',
    'Special Purpose Vehicle': 'special purpose vehicles', 'Two Seaters': 'two-seaters',
  };
  return words[c] || c.toLowerCase();
}

function nameplate(make, baseModel, variants, rivals) {
  const lists = variants.map((v) => tokens(v.model));
  const prefix = [];
  for (let i = 0; i < lists[0].length; i += 1) {
    const w = lists[0][i];
    if (lists.every((l) => l[i] && l[i].toLowerCase() === w.toLowerCase())) prefix.push(w); else break;
  }
  const base = tokens(baseModel).map((w) => w.toUpperCase());
  const up = prefix.map((w) => w.toUpperCase());
  let end = -1;
  up.forEach((w, i) => { if (EV_MARKERS.has(w) && !base.includes(w)) end = i; });
  if (end >= 0 && base.every((w) => up.includes(w))) {
    for (const w of base) end = Math.max(end, up.indexOf(w));
    return prefix.slice(0, end + 1).join(' ');
  }
  return rivals.has(`${make}|${baseModel}`.toUpperCase()) ? `${baseModel} (electric)` : baseModel;
}

/* A share of the best on the list, so twice the cost reads as half the score. Min-max scaling was
   tried first: it pinned whichever car came last to zero however close it was, and one $1,500-a-year
   hypercar squeezed every ordinary car into the top third. */
function scale(values, higherIsBetter) {
  const xs = values.filter((x) => Number.isFinite(x) && x > 0);
  const best = higherIsBetter ? Math.max(...xs) : Math.min(...xs);
  return (x) => {
    if (!Number.isFinite(x) || x <= 0) return null;
    return Math.round(100 * (higherIsBetter ? x / best : best / x));
  };
}

/* Which company makes each make, for registers keyed by LEI. A make is linked only while every
   configuration on the option carries the EPA manufacturer code the reviewed row names: the GR
   Supra is a Toyota certified under BMW's code, so it carries no Toyota record. */
function loadMakers(root) {
  const out = new Map();
  for (const file of MAPS) {
    const p = path.join(root, 'pipeline', 'sources', 'maps', file);
    if (!fs.existsSync(p)) continue;
    const map = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const m of map.mappings.filter((x) => x.status === 'matched')) out.set(m.make.toUpperCase(), m);
  }
  return out;
}
const makerFor = (makers, make, variants) => {
  const m = makers.get(make.toUpperCase());
  return m && variants.every((v) => v.mfrCode === m.epaManufacturerCode) ? m : null;
};

/* ---------------------------------------------------------------------------------------------
 * Electric vehicles, as built on 2026-10-12, with two fixes on 2026-10-13: no productBase (the app
 * reads it as an open product database, appends each option's code to it and labels the link
 * "Open Food Facts"), and sources on the side-by-side page, which shows the annual cost and range
 * the notes quote where the noframes page shows only efficiency.
 * ------------------------------------------------------------------------------------------- */
function buildElectric(decisionId, spec, rows, asof, makers) {
  const inScope = rows.filter(spec.filter);
  const rivals = new Set(rows.filter((r) => !spec.filter(r)).map((r) => `${r.make}|${r.baseModel}`.toUpperCase()));
  const groups = new Map();
  for (const r of inScope) {
    const k = `${r.make.toUpperCase()}|${r.baseModel.toUpperCase()}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const options = [];
  for (const group of groups.values()) {
    const year = group.some((r) => r.year === YEARS[0]) ? YEARS[0] : group.map((r) => r.year).sort().pop();
    const variants = group.filter((r) => r.year === year).sort((a, b) => Number(a.id) - Number(b.id));
    const make = variants[0].make;
    const plate = nameplate(make, variants[0].baseModel, variants, rivals);
    const cost = variants.map((v) => Number(v.fuelCost08)).filter((n) => n > 0);
    const range = variants.map((v) => Number(v.range)).filter((n) => n > 0);
    const midCost = median(cost);
    const midRange = median(range);
    const byCost = variants.find((v) => Number(v.fuelCost08) === midCost) || variants[0];
    const byRange = variants.find((v) => Number(v.range) === midRange) || variants[0];
    const maker = makerFor(makers, make, variants);
    options.push({ year, make, plate, variants, cost, range, midCost, midRange, byCost, byRange, maker });
  }

  const costScore = scale(options.map((o) => o.midCost), false);
  const rangeScore = scale(options.map((o) => o.midRange), true);
  const bestCost = Math.min(...options.map((o) => o.midCost).filter((x) => x > 0));
  const bestRange = Math.max(...options.map((o) => o.midRange).filter((x) => x > 0));
  const products = options.map((o) => {
    const name = `${o.make} ${o.plate}`;
    const p = {
      code: slug(name),
      name,
      brand: o.make,
      allergens: [],
      allergensDeclared: true,
      description: `The ${o.year} ${name}, rated by the EPA in ${o.variants.length === 1 ? 'one configuration' : `${o.variants.length} configurations`}${o.range.length ? `, with ${spread(o.range, (x) => `${x}`)} miles of range` : ''}.`,
      scores: {},
      provenance: {},
      links: [{ label: 'EPA fuel economy figures', url: `${SBS}${o.byCost.id}` }],
      region: ['US'],
      focuses: [o.make, bodyType(o.variants[0].VClass)],
      ids: {
        vehicle: { year: Number(o.year), make: o.make, powertrain: powertrainOf(o.variants[0]), models: o.variants.map((v) => v.model) },
      },
    };
    if (o.maker) {
      p.ids.lei = o.maker.registerIdentifier.value;
      p.idNotes = { lei: `${o.make} vehicles are certified under EPA manufacturer code ${o.maker.epaManufacturerCode}, which belongs to ${o.maker.legalName}.` };
    }
    if (o.midCost != null) {
      p.scores.economical = costScore(o.midCost);
      p.provenance.economical = {
        note: `The EPA estimates ${spread(o.cost, dollars)} a year in electricity across ${configs(o.cost.length)}, median ${dollars(o.midCost)}, for 15,000 miles with 55 per cent city driving. Scored against the cheapest to run on this list (${dollars(bestCost)} a year scores 100; twice that scores 50).`,
        source: `${SBS}${o.byCost.id}`,
        asof,
      };
    }
    if (o.midRange != null) {
      p.scores.accessibility = rangeScore(o.midRange);
      p.provenance.accessibility = {
        note: `EPA-rated range of ${spread(o.range, (x) => `${x}`)} miles across ${configs(o.range.length)}, median ${o.midRange}. Scored against the longest on this list (${bestRange} miles scores 100; half that scores 50).`,
        source: `${SBS}${o.byRange.id}`,
        asof,
      };
    }
    return p;
  });
  products.sort((a, b) => a.name.localeCompare(b.name));

  return {
    meta: {
      id: decisionId,
      label: spec.label,
      type: 'Products',
      primaryAxis: 'economical',
      tradeoff: ['economical', 'accessibility'],
      tradeoffLabels: ['cheapest to run', 'longest range'],
      source: 'EPA and DOE fueleconomy.gov; NHTSA 5-Star Safety Ratings; Science Based Targets initiative',
      attribution: `Every electric vehicle the EPA rated for model year ${YEARS.join(' or ')}, one row per nameplate (model year ${YEARS[0]} where it exists), from the EPA and DOE vehicle file on fueleconomy.gov. Running cost and range are the EPA's own figures for the median configuration, scored as a share of the best on this list. Crash ratings are NHTSA's, joined only to the battery-electric version NHTSA names, and scored on the lowest-rated tested version. The maker's climate target is SBTi's record for the company that certifies the vehicle, matched by LEI. Purchase prices are not in these registers and are not scored.`,
      allergens: false,
      presets: {
        Balanced: { w: { economical: 3, accessibility: 3, safety: 3, environment: 2 }, x: [] },
        'Cheapest to run': { w: { economical: 5, accessibility: 2, safety: 2, environment: 1 }, x: [] },
        'Longest range': { w: { accessibility: 5, economical: 2, safety: 2, environment: 1 }, x: [] },
        'Crash safety first': { w: { safety: 5, economical: 2, accessibility: 2, environment: 1 }, x: [] },
        "Maker's climate target": { w: { environment: 5, economical: 2, accessibility: 2, safety: 2 }, x: [] },
      },
      license: 'US public data (EPA, DOE, NHTSA); SBTi facts cited with credit under its website terms',
      n: products.length,
    },
    criteria: [
      { key: 'economical', label: 'Energy cost a year', source: 'EPA and DOE fueleconomy.gov', tier: 'measured' },
      { key: 'accessibility', label: 'Range on a full charge', source: 'EPA and DOE fueleconomy.gov', tier: 'measured' },
    ],
    products,
    links: [
      { label: 'fueleconomy.gov electric vehicles', url: 'https://www.fueleconomy.gov/feg/evsbs.shtml' },
      { label: 'EPA and DOE vehicle data download', url: 'https://www.fueleconomy.gov/feg/ws/index.shtml' },
      { label: 'NHTSA 5-Star Safety Ratings', url: 'https://www.nhtsa.gov/ratings' },
      { label: 'SBTi target dashboard', url: 'https://sciencebasedtargets.org/target-dashboard' },
    ],
  };
}

/* ---------------------------------------------------------------------------------------------
 * The whole market: every powertrain, one option per make, nameplate and powertrain.
 * ------------------------------------------------------------------------------------------- */

/* gasoline is the bare name; every other powertrain is named only when the nameplate needs it.
   tag is the powertrain word NHTSA's SafetyRatings API puts at the end of each 2026 model name.
   NHTSA files diesel and flex-fuel versions under ICE, and files mild hybrids under MHEV for some
   makers and under ICE for others (mildTag). nhtsaWords is added to the EPA name for matching only,
   because NHTSA writes "RAV4 HYBRID HEV" where the EPA writes "RAV4 AWD XLE" with atvType Hybrid. */
const CLASS = {
  gasoline: { focus: 'Gasoline', suffix: '', tag: 'ICE', nhtsaWords: '' },
  diesel: { focus: 'Diesel', suffix: '(diesel)', tag: 'ICE', nhtsaWords: '' },
  mild: { focus: 'Mild hybrid', suffix: '(mild hybrid)', tag: null, nhtsaWords: '' },
  hybrid: { focus: 'Hybrid', suffix: '(hybrid)', tag: 'HEV', nhtsaWords: 'Hybrid' },
  plugin: { focus: 'Plug-in hybrid', suffix: '(plug-in hybrid)', tag: 'PHEV', nhtsaWords: 'Plug-in Hybrid' },
  electric: { focus: 'Electric', suffix: '(electric)', tag: 'BEV', nhtsaWords: '' },
  fuelcell: { focus: 'Fuel cell', suffix: '(fuel cell)', tag: null, nhtsaWords: '' },
};
const GRADE = {
  'Regular Gasoline': ['regular gasoline', 'regular'], 'Premium Gasoline': ['premium gasoline', 'premium'],
  'Midgrade Gasoline': ['midgrade gasoline', 'midgrade'], Diesel: ['diesel', 'diesel'], Electricity: ['electricity', 'electricity'],
};

const engineKey = (r) => `${r.make}|${r.baseModel}|${r.displ}|${r.cylinders}`.toUpperCase();

/* A Hybrid row is a mild hybrid when its engine descriptor says so, or when the same make, model and
   engine is described as a mild hybrid on another row. The 2027 Mercedes-Benz C300 (id 50488) and the
   2027 Ram 1500 2WD 5.7 litre (id 50759) lack the descriptor that their 2026 twins carry, with the
   same mpg and cost. */
function classifier(rows) {
  const mild = new Set(rows.filter((r) => r.atvType === 'Hybrid' && /mild/i.test(r.eng_dscr)).map(engineKey));
  return (r) => {
    if (r.atvType === 'EV') return 'electric';
    if (r.atvType === 'Plug-in Hybrid') return 'plugin';
    if (r.atvType === 'Hybrid') return /mild/i.test(r.eng_dscr) || mild.has(engineKey(r)) ? 'mild' : 'hybrid';
    if (r.atvType === 'Diesel') return 'diesel';
    if (/FCV/.test(r.atvType)) return 'fuelcell';
    return 'gasoline';
  };
}

/* The file carries each vehicle's annual cost but not the fuel prices behind it. Recovered here, one
   fuel at a time, as the price in cents that reproduces the file's own figures (15,000 miles over the
   combined mpg or kWh per 100 miles). Used to rebuild the plug-in hybrid figure and to say in each
   note what price a cost assumes. A price is quoted only when exactly one cent value fits. */
function fuelPrices(rows) {
  const fit = (list, cost) => {
    if (!list.length) return null;
    let bestHits = -1;
    let cents = [];
    for (let c = 1; c <= 1500; c += 1) {
      let hits = 0;
      for (const r of list) if (round50(cost(r, c / 100)) === Number(r.fuelCost08)) hits += 1;
      if (hits > bestHits) { bestHits = hits; cents = [c]; } else if (hits === bestHits) cents.push(c);
    }
    if (bestHits / list.length < 0.95) return null;
    return { price: cents[0] / 100, unique: cents.length === 1, rows: list.length, reproduced: bestHits };
  };
  const out = {};
  for (const grade of ['Regular Gasoline', 'Premium Gasoline', 'Midgrade Gasoline', 'Diesel']) {
    const list = rows.filter((r) => r.fuelType1 === grade && !r.fuelType2 && Number(r.comb08) > 0 && Number(r.fuelCost08) > 0);
    out[grade] = fit(list, (r, p) => (15000 * p) / Number(r.comb08));
  }
  out.Electricity = fit(rows.filter((r) => r.atvType === 'EV' && Number(r.combE) > 0), (r, p) => 150 * Number(r.combE) * p);
  return out;
}

/* fueleconomy.gov's "Annual Fuel Cost, Electricity + Gasoline" for a plug-in hybrid: city and
   highway legs, each the utility factor's share of miles on electricity (plus any gasoline a blended
   plug-in burns while charge-depleting) and the rest on gasoline, weighted 55 to 45. Checked against
   the file's youSaveSpend, which fueleconomy.gov computes from the same figure: the average new
   vehicle's cost less a fifth of the five-year saving must land within $50, or the row falls back
   to the gasoline-only figure the file states. */
function plugInCost(r, prices, averageCost) {
  const pg = prices[r.fuelType1] && prices[r.fuelType1].price;
  const pe = prices.Electricity && prices.Electricity.price;
  if (!pg || !pe || !(Number(r.city08) > 0) || !(Number(r.highway08) > 0)) return null;
  const leg = (uf, e, cd, mpg) => uf * ((e / 100) * pe + (cd / 100) * pg) + ((1 - uf) * pg) / mpg;
  const perMile = 0.55 * leg(Number(r.cityUF), Number(r.cityE), Number(r.cityCD), Number(r.city08))
    + 0.45 * leg(Number(r.highwayUF), Number(r.highwayE), Number(r.highwayCD), Number(r.highway08));
  const cost = round50(15000 * perMile);
  if (averageCost == null || Math.abs(averageCost - Number(r.youSaveSpend) / 5 - cost) > 50) return null;
  return cost;
}

/* The yearly cost of the average new vehicle that youSaveSpend is measured against, read back from
   single-fuel rows (cost plus a fifth of the five-year saving), taking the most common value. */
function averageCostOf(rows) {
  const counts = new Map();
  for (const r of rows) {
    if (r.fuelType2 || !(Number(r.fuelCost08) > 0) || r.youSaveSpend === '') continue;
    const v = round50(Number(r.fuelCost08) + Number(r.youSaveSpend) / 5);
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}

const startsWith = (long, short) => {
  const a = tokens(long).map((w) => w.toUpperCase());
  const b = tokens(short).map((w) => w.toUpperCase());
  return b.every((w, i) => a[i] === w);
};

/* The names an option offers NHTSA's matcher: the EPA model name, the name led by its baseModel when
   the model name does not start with it (BMW's "330i Sedan" is a 3 Series, Mercedes-Benz's "C300" a
   C-Class), and the powertrain word NHTSA writes into its own names. The matcher still requires the
   same year, make and powertrain tag, and every word of NHTSA's name present. */
function nhtsaNames(v, cls) {
  const forms = [v.model];
  if (!startsWith(v.model, v.baseModel)) forms.push(`${v.baseModel} ${v.model}`);
  const extra = CLASS[cls].nhtsaWords;
  return extra ? forms.map((f) => `${f} ${extra}`) : forms;
}

/* NHTSA's tag for a maker's mild hybrids in a model year: MHEV when NHTSA lists any of that maker's
   models as MHEV that year (Audi, Jaguar, Land Rover, Mazda, Mitsubishi and Volvo in 2026), and ICE
   otherwise, which is where it files BMW, Genesis, Mercedes-Benz and Ram mild hybrids. */
async function mildTagger(ctx) {
  let idx = null;
  try {
    const nhtsa = await import('../measures/nhtsa-ratings.mjs');
    idx = await nhtsa.index(ctx);
  } catch { idx = null; }
  return (year, make) => {
    if (!idx || !idx.models) return 'MHEV';
    const m = make.toUpperCase() === 'ALFA ROMEO' ? 'ALFA' : make.toUpperCase();
    const list = idx.models.get(`${year}|${m}`) || [];
    return list.some((x) => x.tag === 'MHEV') ? 'MHEV' : 'ICE';
  };
}

const SMALL = new Set(['Minicompact Cars', 'Subcompact Cars', 'Compact Cars', 'Small Station Wagons']);
const VANS = /^(Minivan|Small Pickup Trucks|Standard Pickup Trucks|Vans)/;

/* Where one EPA baseModel covers cars sold under different names, reviewed by hand against the
   variant names in the 2026 and 2027 rows: the EPA files the Evoque, Velar and Sport under
   "Range Rover", the Discovery Sport under "Discovery", the M2, M3 and M4 under "M", and the Atlas
   Cross Sport under "Atlas". A variant whose model name starts with one of these takes it as its
   nameplate. Trims (Wilderness, Raptor, Plaid and the like) stay with their nameplate. */
const SUBNAMES = {
  'LAND ROVER|RANGE ROVER': ['Range Rover Evoque', 'Range Rover Velar', 'Range Rover Sport'],
  'LAND ROVER|DISCOVERY': ['Discovery Sport'],
  'BMW|M': ['M2', 'M3', 'M4', 'M5'],
  'AUDI|RS': ['RS 3', 'RS 6', 'RS 7'],
  'VOLKSWAGEN|ATLAS': ['Atlas Cross Sport'],
};
const STOP = /^(2WD|4WD|AWD|FWD|RWD|4X4|4X2|4MATIC|QUATTRO|ALL4|XDRIVE.*|SDRIVE.*|PICKUP|HYBRID|HEV|PHEV|MHEV|FHEV|PLUG-IN|4XE|FFV|EV|BEV|ELECTRIC)$/i;

/* The nameplate a non-electric row belongs to: a reviewed sub-name, or the baseModel. */
function plateBase(r) {
  for (const sub of SUBNAMES[`${r.make}|${r.baseModel}`.toUpperCase()] || []) if (startsWith(r.model, sub)) return sub;
  return r.baseModel;
}

/* When every configuration's name carries the same word after the nameplate, the name keeps it:
   the EPA's gasoline "Outlander" rows are all "Outlander Sport", a different, smaller car. Drive,
   powertrain and trim codes (anything with a digit, or of three capitals or fewer) end the name. */
function extendPlate(base, variants) {
  const lists = variants.map((v) => tokens(v.model));
  const prefix = [];
  for (let i = 0; i < lists[0].length; i += 1) {
    const w = lists[0][i];
    if (lists.every((l) => l[i] && l[i].toLowerCase() === w.toLowerCase())) prefix.push(w); else break;
  }
  const b = tokens(base);
  if (!startsWith(prefix.join(' '), base) || prefix.length <= b.length) return base;
  const extra = [];
  for (const w of prefix.slice(b.length)) {
    if (STOP.test(w) || /\d/.test(w) || /[()/]/.test(w) || /^[A-Z]{1,3}$/.test(w) || w.length < 4) break;
    extra.push(w);
  }
  return extra.length ? `${base} ${extra.join(' ')}` : base;
}

/* Rows grouped into options: make, nameplate and powertrain, newest model year kept. */
function groupRows(rows, classOf, filter) {
  const groups = new Map();
  for (const r of rows) {
    const cls = classOf(r);
    if (cls === 'fuelcell' || !filter(r, cls)) continue;
    const base = cls === 'electric' ? r.baseModel : plateBase(r);
    const key = `${r.make}|${base}|${cls}`.toUpperCase();
    if (!groups.has(key)) groups.set(key, { key, cls, base, rows: [] });
    groups.get(key).rows.push(r);
  }
  for (const g of groups.values()) {
    g.year = g.rows.some((r) => r.year === YEARS[0]) ? YEARS[0] : g.rows.map((r) => r.year).sort().pop();
    g.variants = g.rows.filter((r) => r.year === g.year).sort((a, b) => Number(a.id) - Number(b.id));
  }
  return groups;
}

/* Every option's name, fixed once from the whole file so a car is named the same in every lens.
   A powertrain word is added only when another powertrain of the same make would otherwise carry
   the same name; electric options keep the electric-vehicles lens's rule. */
function marketNames(rows, classOf, evRivals) {
  const groups = groupRows(rows, classOf, () => true);
  const named = new Map();
  const classesByName = new Map();
  for (const g of groups.values()) {
    const make = g.variants[0].make;
    if (g.cls === 'electric') { named.set(g.key, nameplate(make, g.variants[0].baseModel, g.variants, evRivals)); continue; }
    const n = extendPlate(g.base, g.variants);
    named.set(g.key, n);
    const k = `${make}|${n}`.toUpperCase();
    if (!classesByName.has(k)) classesByName.set(k, new Set());
    classesByName.get(k).add(g.cls);
  }
  const out = new Map();
  for (const g of groups.values()) {
    const n = named.get(g.key);
    if (g.cls === 'electric') { out.set(g.key, n); continue; }
    const shared = classesByName.get(`${g.variants[0].make}|${n}`.toUpperCase()).size > 1;
    out.set(g.key, CLASS[g.cls].suffix && shared ? `${n} ${CLASS[g.cls].suffix}` : n);
  }
  return out;
}

function marketOptions(rows, filter, env) {
  const { classOf, prices, averageCost, makers, names, mildTag } = env;
  const options = [];
  for (const { key, cls, year, variants } of groupRows(rows, classOf, filter).values()) {
    const make = variants[0].make;
    const baseModel = variants[0].baseModel;
    const plate = names.get(key);
    // Each configuration's annual cost: the EPA figure, or for a plug-in hybrid the rebuilt
    // electricity-plus-gasoline figure. One configuration that cannot be rebuilt puts the whole
    // option on the gasoline-only figure, so its configurations are compared like with like.
    let blended = false;
    let cost = variants.map((v) => ({ v, cost: Number(v.fuelCost08) }));
    if (cls === 'plugin') {
      const rebuilt = variants.map((v) => ({ v, cost: plugInCost(v, prices, averageCost) }));
      if (rebuilt.every((x) => x.cost > 0)) { cost = rebuilt; blended = true; }
    }
    cost = cost.filter((x) => x.cost > 0);
    if (!cost.length) continue;
    const mid = median(cost.map((x) => x.cost));
    const byCost = cost.find((x) => x.cost === mid).v;
    const maker = makerFor(makers, make, variants);
    const tag = cls === 'mild' ? mildTag(Number(year), make) : CLASS[cls].tag;
    options.push({ year, make, baseModel, plate, cls, variants, cost, mid, byCost, blended, maker, tag });
  }
  return options;
}

/* "at $4.47 a gallon, the price behind the EPA's figures in this file". A price is named only when
   every fuel the figure uses has one; otherwise the sentence says so without a number. */
function pricePhrase(grades, prices) {
  if (!grades.every((g) => prices[g] && prices[g].unique)) return 'at the fuel prices behind the EPA\'s figures in this file';
  const each = grades.map((g) => (g === 'Electricity'
    ? `${Math.round(prices[g].price * 100)} cents a kilowatt-hour`
    : `$${prices[g].price.toFixed(2)} a gallon${grades.length > 1 ? ` of ${GRADE[g][1]}` : ''}`));
  const list = each.length === 1 ? each[0] : `${each.slice(0, -1).join(', ')} and ${each[each.length - 1]}`;
  return `at ${list}, the ${each.length === 1 ? 'price' : 'prices'} behind the EPA's figures in this file`;
}

function costNote(o, prices, bestCost) {
  const k = o.cost.length;
  const costs = o.cost.map((x) => x.cost);
  const scored = `Scored against the cheapest to run on this list (${dollars(bestCost)} a year scores 100; twice that scores 50).`;
  const grades = [...new Set(o.cost.map((x) => x.v.fuelType1))];
  if (o.cls === 'plugin') {
    const v = o.byCost;
    const gasOnly = Number(v.fuelCost08);
    const many = k > 1 ? ` That is the median of ${configs(k)}, which run ${spread(costs, dollars)}.` : '';
    if (o.blended) {
      const pct = Math.round(100 * Number(v.combinedUF));
      return `The EPA estimates ${dollars(o.mid)} a year for electricity and gasoline together, assuming ${pct} per cent of miles run on electricity, the share the EPA assigns to a car with ${v.rangeA} miles of electric range (its utility factor). On gasoline alone, at ${v.comb08} mpg, its figure is ${dollars(gasOnly)}. Both assume 15,000 miles a year with 55 per cent city driving, ${pricePhrase(['Electricity', v.fuelType1], prices)}.${many} ${scored.replace('Scored against', 'Scored on the combined figure against')}`;
    }
    return `The EPA file gives ${dollars(o.mid)} a year on gasoline alone, at ${v.comb08} mpg, for 15,000 miles with 55 per cent city driving.${many} Its electricity-and-gasoline figure could not be rebuilt from the file, so this score treats the car as never plugged in. ${scored}`;
  }
  if (o.cls === 'electric') {
    const kwh = o.cost.map((x) => Math.round(Number(x.v.combE))).filter((n) => n > 0);
    return `The EPA estimates ${spread(costs, dollars)} a year in electricity across ${configs(k)}, median ${dollars(o.mid)}, at ${spread(kwh, (x) => `${x}`)} kWh per 100 miles. That assumes 15,000 miles a year with 55 per cent city driving ${pricePhrase(['Electricity'], prices)}. ${scored}`;
  }
  const fuel = grades.length === 1 ? GRADE[grades[0]][0] : `gasoline (${grades.map((g) => GRADE[g][1]).join(' or ')}, by configuration)`;
  const mpg = o.cost.map((x) => Number(x.v.comb08)).filter((n) => n > 0);
  return `The EPA estimates ${spread(costs, dollars)} a year in ${fuel} across ${configs(k)}, median ${dollars(o.mid)}, at ${spread(mpg, (x) => `${x}`)} mpg combined. That assumes 15,000 miles a year with 55 per cent city driving ${pricePhrase(grades, prices)}. ${scored}`;
}

function describe(o, name) {
  const k = o.variants.length;
  const classes = [...new Set(o.variants.map((v) => sizeClass(v.VClass)))];
  const sized = `(${classes.length === 1 ? classes[0] : `${classes.slice(0, -1).join(', ')} and ${classes[classes.length - 1]}`})`;
  const what = {
    gasoline: 'runs on gasoline', diesel: 'runs on diesel', hybrid: 'is a hybrid', mild: 'is listed by the EPA as a mild hybrid',
    plugin: 'is a plug-in hybrid', electric: 'is electric',
  }[o.cls];
  // The name already says the powertrain when it carries the suffix.
  const lead = `The ${o.year} ${name}${CLASS[o.cls].suffix && name.endsWith(CLASS[o.cls].suffix) ? '' : ` ${what} and`} was rated by the EPA in ${k === 1 ? 'one configuration' : `${k} configurations`} ${sized}`;
  const mpg = o.variants.map((v) => Number(v.comb08)).filter((n) => n > 0);
  if (o.cls === 'electric') {
    const range = o.variants.map((v) => Number(v.range)).filter((n) => n > 0);
    return `${lead}${range.length ? `, with ${spread(range, (x) => `${x}`)} miles of range` : ''}.`;
  }
  if (o.cls === 'plugin') {
    const range = o.variants.map((v) => Number(v.rangeA)).filter((n) => n > 0);
    return `${lead}, with ${spread(range, (x) => `${x}`)} miles of electric range and ${spread(mpg, (x) => `${x}`)} mpg on gasoline alone.`;
  }
  return `${lead}, at ${spread(mpg, (x) => `${x}`)} mpg combined.`;
}

function marketProducts(options, prices) {
  const bestCost = Math.min(...options.map((o) => o.mid));
  const costScore = scale(options.map((o) => o.mid), false);
  const seen = new Set();
  const products = options.map((o) => {
    const name = `${o.make} ${o.plate}`;
    const code = slug(name);
    if (seen.has(code)) throw new Error(`two options would share the code ${code}`);
    seen.add(code);
    const models = o.cls === 'electric'
      ? o.variants.map((v) => v.model)   // as in the electric-vehicles lens, so an EV carries the same crash record in every lens
      : [...new Set(o.variants.flatMap((v) => nhtsaNames(v, o.cls)))];
    const p = {
      code,
      name,
      brand: o.make,
      allergens: [],
      allergensDeclared: true,
      description: describe(o, name),
      scores: { economical: costScore(o.mid) },
      provenance: {
        economical: { note: costNote(o, prices, bestCost), source: `${SBS}${o.byCost.id}`, asof: null },
      },
      links: [{ label: 'EPA fuel economy figures', url: `${SBS}${o.byCost.id}` }],
      region: ['US'],
      focuses: [o.make, bodyType(o.variants[0].VClass), CLASS[o.cls].focus],
      ids: { vehicle: { year: Number(o.year), make: o.make, powertrain: o.tag, models } },
    };
    if (o.maker) {
      p.ids.lei = o.maker.registerIdentifier.value;
      p.idNotes = { lei: `${o.make} vehicles are certified under EPA manufacturer code ${o.maker.epaManufacturerCode}, which belongs to ${o.maker.legalName}.` };
    }
    return p;
  });
  products.sort((a, b) => a.name.localeCompare(b.name));
  return products;
}

const MARKET_PRESETS = {
  Balanced: { w: { economical: 3, safety: 3, environment: 2 }, x: [] },
  'Cheapest to run': { w: { economical: 5, safety: 2, environment: 1 }, x: [] },
  'Crash safety first': { w: { safety: 5, economical: 2, environment: 1 }, x: [] },
  "Maker's climate target": { w: { environment: 5, economical: 2, safety: 2 }, x: [] },
};

/* The sentences every market lens shares, after its own opening about who is on the list. */
function sharedAttribution(prices, options) {
  const g = prices['Regular Gasoline'];
  const e = prices.Electricity;
  const at = g && g.unique && e && e.unique ? ` (at $${g.price.toFixed(2)} a gallon of regular and ${Math.round(e.price * 100)} cents a kilowatt-hour in this file)` : '';
  const cheapest = options.reduce((a, b) => (b.mid < a.mid ? b : a));
  return [
    `Running cost is the EPA's yearly fuel or electricity cost for the median configuration, for 15,000 miles with 55 per cent city driving at the fuel prices fueleconomy.gov used${at}, scored as a share of the cheapest on this list. For a plug-in hybrid it is fueleconomy.gov's combined electricity and gasoline figure, which assumes the share of miles on electricity the EPA sets for that car; each note also gives its cost on gasoline alone.`,
    ...(cheapest.cls === 'electric' && options.some((o) => o.cls !== 'electric')
      ? ['The cheapest to run on this list is electric, so a gasoline vehicle\'s running-cost score mostly shows how far it sits from electric running costs.'] : []),
    'Crash ratings are NHTSA\'s overall stars, joined only to the model NHTSA names with the same year, make and powertrain, and scored on the lowest-rated tested version; a model NHTSA has not tested is left unscored. NHTSA advises comparing frontal crash ratings only between vehicles within 250 pounds of each other.',
    'The maker\'s climate target is SBTi\'s record for the company whose EPA manufacturer code certifies the vehicle, matched by LEI; a maker SBTi does not list is left unscored, not marked down.',
    'Purchase prices are not in these registers and are not scored.',
  ].join(' ');
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const DECISIONS = {
  'electric-vehicles': {
    label: 'Electric vehicles',
    filter: (r) => r.atvType === 'EV',
    measures: ['nhtsa-ratings', 'sbti-targets'],
    electric: true,
  },
  'hybrid-and-plug-in-hybrid-cars': {
    filter: (r, cls) => cls === 'hybrid' || cls === 'plugin',
    measures: ['nhtsa-ratings', 'sbti-targets'],
    lead: (env, opts) => {
      const k = opts.filter((o) => o.cls === 'plugin').length;
      const missing = env.missingPlugins;
      const named = ['Toyota|RAV4', 'Toyota|Prius'].filter((x) => missing.has(x.toUpperCase())).map((x) => x.replace('|', ' '));
      return `Every full hybrid and plug-in hybrid the EPA rated for model year ${YEARS.join(' or ')}, one row per make, nameplate and powertrain (model year ${YEARS[0]} where it exists), from the EPA and DOE vehicle file on fueleconomy.gov: ${plural(opts.length - k, 'hybrid', 'hybrids')} and ${plural(k, 'plug-in hybrid', 'plug-in hybrids')}. Mild hybrids, whose engine description in the file says "Mild Hybrid" and which the EPA lists as hybrids, are left out here and kept on the new cars list. ${missing.size} plug-in nameplates the EPA rated for model year 2025 have no ${YEARS.join(' or ')} rating in this file${named.length ? `, among them the ${named.join(' and ')} plug-in hybrids` : ''}. The file does not say which have ended and which are not yet rated, and none is on this list until the EPA rates it.`;
    },
  },
  'small-and-city-cars': {
    filter: (r) => SMALL.has(r.VClass),
    measures: ['nhtsa-ratings', 'sbti-targets'],
    lead: (env, opts) => {
      const left = ['Honda|Civic', 'Hyundai|Elantra', 'Kia|K4', 'Nissan|Sentra']
        .filter((x) => env.plates.has(x.toUpperCase()) && !opts.some((o) => `${o.make}|${o.baseModel}`.toUpperCase() === x.toUpperCase()))
        .map((x) => x.replace('|', ' '));
      return `Every car the EPA rated for model year ${YEARS.join(' or ')} in its four smallest car size classes (minicompact, subcompact and compact cars, and small station wagons), one row per make, nameplate and powertrain, counting only the configurations in those classes, from the EPA and DOE vehicle file on fueleconomy.gov. The EPA sizes a car by its passenger and luggage room, not by its length or price, so this list includes sports and luxury cars with small cabins${left.length ? ` and leaves out the ${left.join(', ').replace(/, ([^,]*)$/, ' and $1')}, which the EPA rates as midsize or large cars` : ''}. Small SUVs are classed by weight and are not here. Every car the EPA rated is on the new cars list.`;
    },
  },
  'vans-and-pickups': {
    filter: (r) => VANS.test(r.VClass),
    measures: ['nhtsa-ratings', 'sbti-targets'],
    lead: () => `Every minivan and pickup the EPA rated for model year ${YEARS.join(' or ')}, one row per make, nameplate and powertrain (model year ${YEARS[0]} where it exists), from the EPA and DOE vehicle file on fueleconomy.gov. Pickups and cargo vans above 8,500 pounds gross vehicle weight carry no EPA fuel economy label, so heavy-duty pickups such as the Ford F-250 and Ram 2500 and full-size vans such as the Ford Transit, Mercedes-Benz Sprinter and Ram ProMaster are not in the file and not on this list; the file has no full-size passenger vans for these years either.`,
  },
  'new-cars': {
    filter: () => true,
    measures: ['nhtsa-ratings', 'sbti-targets'],
    lead: (env, opts) => {
      const counts = {};
      for (const o of opts) counts[o.cls] = (counts[o.cls] || 0) + 1;
      const order = [['gasoline', 'gasoline'], ['diesel', 'diesel'], ['mild', 'mild hybrid'], ['hybrid', 'hybrid'], ['plugin', 'plug-in hybrid'], ['electric', 'electric']];
      const parts = order.filter(([c]) => counts[c]).map(([c, w]) => `${counts[c]} ${w}`);
      return `Every new car, SUV, minivan and pickup the EPA rated for model year ${YEARS.join(' or ')}, one row per make, nameplate and powertrain (model year ${YEARS[0]} where it exists), from the EPA and DOE vehicle file on fueleconomy.gov. By powertrain the ${opts.length} rows are ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}. Hydrogen fuel-cell cars are left out because the file gives no fuel cost for them, and vehicles above 8,500 pounds gross vehicle weight, such as heavy-duty pickups and full-size vans, are not in the file.`;
    },
  },
};

export async function build(ctx, only) {
  const snap = ctx.latestSnapshot(source.register);
  if (!snap) throw new Error(`no snapshot for ${source.register}: run node pipeline/sources/capture.mjs fueleconomy-vehicles`);
  const zip = unzip(readPayload(snap));
  const csvName = [...zip.keys()].find((k) => k.endsWith('.csv'));
  const all = parseCsv(zip.get(csvName).toString('utf8'));
  const rows = all.filter((r) => YEARS.includes(r.year));
  const asof = String(snap.manifest.capturedAt || '').slice(0, 7);
  const makers = loadMakers(ctx.root);
  const out = [];

  let env = null;
  const market = async () => {
    if (env) return env;
    const classOf = classifier(rows);
    const evRivals = new Set(rows.filter((r) => r.atvType !== 'EV').map((r) => `${r.make}|${r.baseModel}`.toUpperCase()));
    const plugins = (rs) => new Set(rs.filter((r) => r.atvType === 'Plug-in Hybrid').map((r) => `${r.make}|${r.baseModel}`.toUpperCase()));
    const current = plugins(rows);
    const earlier = plugins(all.filter((r) => r.year === '2025'));
    env = {
      classOf,
      prices: fuelPrices(rows),
      averageCost: averageCostOf(rows),
      makers,
      names: marketNames(rows, classOf, evRivals),
      plates: new Set(rows.map((r) => `${r.make}|${r.baseModel}`.toUpperCase())),
      missingPlugins: new Set([...earlier].filter((k) => !current.has(k))),
      mildTag: await mildTagger(ctx),
    };
    return env;
  };

  for (const [decisionId, spec] of Object.entries(DECISIONS)) {
    if (only && only !== decisionId) continue;
    if (spec.electric) {
      out.push({ decision: decisionId, lens: buildElectric(decisionId, spec, rows, asof, makers), measures: spec.measures });
      continue;
    }
    const e = await market();
    const options = marketOptions(rows, spec.filter, e);
    const products = marketProducts(options, e.prices);
    for (const p of products) p.provenance.economical.asof = asof;
    const decision = ctx.byId.get(decisionId);
    const lens = {
      meta: {
        id: decisionId,
        label: decision ? decision.label : decisionId,
        type: 'Products',
        primaryAxis: 'economical',
        tradeoff: ['economical', 'safety'],
        tradeoffLabels: ['cheapest to run', 'best NHTSA crash rating'],
        source: 'EPA and DOE fueleconomy.gov; NHTSA 5-Star Safety Ratings; Science Based Targets initiative',
        attribution: `${spec.lead(e, options)} ${sharedAttribution(e.prices, options)}`,
        allergens: false,
        presets: MARKET_PRESETS,
        license: 'US public data (EPA, DOE, NHTSA); SBTi facts cited with credit under its website terms',
        n: products.length,
      },
      criteria: [
        { key: 'economical', label: 'Fuel and electricity cost a year', source: 'EPA and DOE fueleconomy.gov', tier: 'measured' },
      ],
      products,
      links: [
        { label: 'fueleconomy.gov: find and compare cars', url: 'https://www.fueleconomy.gov/feg/findacar.shtml' },
        ...(decisionId === 'hybrid-and-plug-in-hybrid-cars' ? [{ label: 'fueleconomy.gov plug-in hybrids', url: 'https://www.fueleconomy.gov/feg/phevsbs.shtml' }] : []),
        { label: 'EPA and DOE vehicle data download', url: 'https://www.fueleconomy.gov/feg/ws/index.shtml' },
        { label: 'NHTSA 5-Star Safety Ratings', url: 'https://www.nhtsa.gov/ratings' },
        { label: 'SBTi target dashboard', url: 'https://sciencebasedtargets.org/target-dashboard' },
      ],
    };
    out.push({ decision: decisionId, lens, measures: spec.measures });
  }
  return out;
}
