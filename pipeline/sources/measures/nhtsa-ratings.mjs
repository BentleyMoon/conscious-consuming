/* NHTSA 5-Star Safety Ratings, read through NHTSA's SafetyRatings API.
 *
 * From model year 2026 the API names every model with its powertrain: "EQUINOX EV BEV" and
 * "EQUINOX ICE" are separate records. The bulk Safercar file carries no powertrain column, and
 * there a petrol Equinox and an electric Equinox EV differ only by a word that a name match can
 * drop, which would put one car's crash test on the other's row. So this measure joins only to a
 * model whose powertrain tag matches the option's, and refuses a year whose names carry no tags.
 *
 * NHTSA tests a selection of models each year. An untested model gets no score, which the ranking
 * reads as neutral, not as a failure.
 */
import { readPayload } from '../lib/read.mjs';

const BASE = 'https://api.nhtsa.gov/SafetyRatings';
const YEARS = [2026, 2027];
const TAGS = new Set(['BEV', 'ICE', 'HEV', 'PHEV', 'FCEV', 'MHEV']);
const MAKE_ALIAS = { 'ALFA ROMEO': 'ALFA' };
const enc = encodeURIComponent;

export const id = 'nhtsa-ratings';
export const criterion = { key: 'safety', label: 'NHTSA crash rating', source: 'NHTSA 5-Star Safety Ratings', tier: 'measured' };
export const idScheme = 'vehicle';

export const captures = [{
  register: 'nhtsa',
  access: 'api',
  base: BASE,
  scope: 'NHTSA SafetyRatings API: every make, model and variant listed for model years 2026 and 2027, and the ratings record of each variant.',
  licenseUrl: 'https://www.nhtsa.gov/about-nhtsa/terms-use',
  licenseNote: 'NHTSA terms of use: public information. The terms page was read in a browser because www.nhtsa.gov refuses scripted fetches; api.nhtsa.gov serves normally.',
  parserId: 'nhtsa-safety-ratings-bundle',
  parserVersion: '1.0.0',
  async crawl(get) {
    await Promise.all(YEARS.map(async (year) => {
      const makes = await get(`${BASE}/modelyear/${year}`);
      await Promise.all(((makes && makes.Results) || []).map(async ({ Make }) => {
        const models = await get(`${BASE}/modelyear/${year}/make/${enc(Make)}`);
        await Promise.all(((models && models.Results) || []).map(async ({ Model }) => {
          const variants = await get(`${BASE}/modelyear/${year}/make/${enc(Make)}/model/${enc(Model)}`);
          await Promise.all(((variants && variants.Results) || []).map(({ VehicleId }) => get(`${BASE}/VehicleId/${VehicleId}`)));
        }));
      }));
    }));
  },
}];

const words = (s) => String(s || '').toUpperCase().replace(/\./g, '').replace(/[^A-Z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
const titleMake = (make) => {
  const m = String(make || '').toUpperCase();
  return MAKE_ALIAS[m] || m;
};

export function reaches(decision) {
  return decision.family === 'buying-a-car';
}

export async function index(ctx) {
  const snap = ctx.latestSnapshot('nhtsa');
  if (!snap) return null;
  const bundle = JSON.parse(readPayload(snap).toString('utf8'));
  const asof = String(bundle.finishedAt || snap.manifest.capturedAt || '').slice(0, 7);
  const responses = bundle.responses || {};
  const body = (url) => (responses[url] && responses[url].status === 200 ? responses[url].body : null);
  const models = new Map();   // year|MAKE -> [{ full, core, tag }]
  const byId = new Map();     // year|MAKE|FULL MODEL -> rated variants
  for (const year of YEARS) {
    const makes = body(`${BASE}/modelyear/${year}`);
    for (const { Make } of (makes && makes.Results) || []) {
      const list = [];
      const ms = body(`${BASE}/modelyear/${year}/make/${enc(Make)}`);
      for (const { Model } of (ms && ms.Results) || []) {
        // The tag can repeat a word already in the name: the Mach-E is "MUSTANG MACH-E BEV BEV".
        const core = words(Model);
        const tag = TAGS.has(core[core.length - 1]) ? core[core.length - 1] : null;
        while (core.length > 1 && (TAGS.has(core[core.length - 1]) || core[core.length - 1] === 'GAS')) core.pop();
        list.push({ full: Model, core, tag });
        const vs = body(`${BASE}/modelyear/${year}/make/${enc(Make)}/model/${enc(Model)}`);
        const rated = [];
        for (const { VehicleId, VehicleDescription } of (vs && vs.Results) || []) {
          const url = `${BASE}/VehicleId/${VehicleId}`;
          const rec = ((body(url) || {}).Results || [])[0];
          if (!rec || !/^[1-5]$/.test(String(rec.OverallRating))) continue;
          rated.push({
            url, description: VehicleDescription || rec.VehicleDescription, overall: Number(rec.OverallRating),
            front: rec.OverallFrontCrashRating, side: rec.OverallSideCrashRating, rollover: rec.RolloverRating,
          });
        }
        if (rated.length) byId.set(`${year}|${Make.toUpperCase()}|${Model.toUpperCase()}`, { year, make: Make, model: Model, rated, asof });
      }
      models.set(`${year}|${Make.toUpperCase()}`, list);
    }
  }
  return { byId, byName: null, models };
}

/* The NHTSA models an option's variants correspond to: same year, same make, same powertrain tag,
   every word of the NHTSA name present in the variant's EPA name, first words equal, longest wins. */
export function key(option, decision, idx) {
  const v = option.ids && option.ids.vehicle;
  if (!v || !idx || !idx.models) return [];
  const list = idx.models.get(`${v.year}|${titleMake(v.make)}`) || [];
  if (!list.some((m) => m.tag)) return [];
  const keys = new Set();
  for (const variant of v.models) {
    const have = new Set(words(variant));
    const first = words(variant)[0];
    let best = [];
    for (const m of list) {
      if (m.tag !== v.powertrain || m.core[0] !== first || !m.core.every((w) => have.has(w))) continue;
      if (!best.length || m.core.length > best[0].core.length) best = [m];
      else if (m.core.length === best[0].core.length) best.push(m);
    }
    for (const m of best) keys.add(`${v.year}|${titleMake(v.make)}|${m.full.toUpperCase()}`);
  }
  return [...keys];
}

/* Scored on the lowest-rated tested variant, so a reader is never shown the better twin's rating. */
export function combine(hits, option) {
  const rated = hits.flatMap((h) => h.rated);
  if (!rated.length) return null;
  rated.sort((a, b) => a.overall - b.overall);
  const low = rated[0];
  const listed = rated.map((r) => `${r.description.replace(/^\d{4}\s+/, '')}: ${r.overall}`).join('; ');
  const sub = [low.front && `front ${low.front}`, low.side && `side ${low.side}`, low.rollover && `rollover ${low.rollover}`].filter(Boolean).join(', ');
  return {
    score: low.overall * 20,
    note: `NHTSA overall rating, in stars out of 5, for each tested ${hits[0].year} version: ${listed}. Scored on the lowest (${low.overall} stars${sub ? `; ${sub}` : ''}). Versions NHTSA has not tested are not counted.`,
    source: low.url,
    asof: hits[0].asof,
  };
}
