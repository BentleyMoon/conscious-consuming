/* The content plan: which open data source to ingest next, and what it would build.
 *
 * WHY THIS EXISTS. On 2026-10-12 the map held 1,069 decisions and 141 were built. Hand research
 * built about five a month. Three bulk sources had built 53 decisions holding 19,769 entries, and
 * one of them, Open Food Facts, built fifty. The leverage is in sources, and the reason it once
 * looked like a problem (food took four fifths of the catalogue) is that nothing aimed it. This
 * aims it: it reads the registry of verified sources and ranks them by how much of the open map,
 * weighted toward the emptiest realms, each one would feed.
 *
 * THREE RULES, each from a failure or a written commitment, not from taste:
 *
 * 1. A roster must be a census. ENERGY STAR, Leaping Bunny and every other certification register
 *    lists only what passed. A roster built from one omits the market leader, which
 *    docs/SWARM-BRIEF.md forbids ("a comparison that quietly omits the market leader is an
 *    advertisement for the alternatives"). Registers that list everything sold, good and bad, can
 *    supply a roster. Winners' lists can only supply a measure: does this maker hold it.
 *
 * 2. Finished means two independent publishers. A verdict page is offered to search engines only
 *    when it rests on more than one independent source domain (design doc, 2026-09). A decision is
 *    counted as sourceable only when a census roster, plus measures from at least one other
 *    publisher, give it three or more measures.
 *
 * 3. Weight follows the written queue in docs/SWARM-BRIEF.md section 6, not ease. A realm with
 *    almost nothing built reads to a visitor as a subject the catalogue does not cover, and the
 *    largest gaps come next. Ease of sourcing is exactly what aimed the last bulk wave at food.
 *
 * A source that could not be fetched, whose licence does not allow reuse, or whose publisher earns
 * money on what it ranks, is listed with the reason and counts for nothing.
 *
 * WHAT IT READS. The register shelf (content/registers.json): its proven `registers`, which earned
 * their place by a citation surviving hand verification, and its `candidates`, whose access and
 * licence were checked by fetching but which no lens has cited yet. Which decision each proven
 * register applies to comes from the reviewed coverage matrix (pipeline/registers/coverage-matrix
 * .json); a candidate carries the decisions its verifier mapped it to. Nothing here is a second
 * registry: the shelf is the one place a source is written down.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAXONOMY = path.join(ROOT, 'content', 'taxonomy.json');
const SHELF = path.join(ROOT, 'content', 'registers.json');
const MATRIX = path.join(ROOT, 'pipeline', 'registers', 'coverage-matrix.json');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function allDecisions(tax) {
  const out = [];
  for (const realm of tax.realms) {
    for (const field of realm.fields) {
      for (const family of field.families) {
        for (const d of family.decisions) out.push({ ...d, realmLabel: realm.label });
      }
    }
  }
  return out;
}

export function eligibility(src) {
  if (!src.accessVerified) return 'its data endpoint could not be fetched';
  if (src.reuseOk !== true) return src.reuseOk === false ? 'its licence does not allow reuse' : 'its licence is unclear';
  if (src.commercialConflict) return 'its publisher earns money on what it ranks';
  return null;
}

/* Weight per open decision, from section 6 of the brief. */
function realmWeights(all) {
  const stats = new Map();
  for (const d of all) {
    if (d.scope === 'out') continue;
    const s = stats.get(d.realm) || { built: 0, open: 0, total: 0, label: d.realmLabel };
    s.total += 1;
    if (d.scope === 'covered') s.built += 1;
    if (d.scope === 'open') s.open += 1;
    stats.set(d.realm, s);
  }
  const weight = new Map();
  for (const [realm, s] of stats) {
    const gap = s.total ? s.open / s.total : 0;
    const absent = s.built < 5 ? 1 : 0;      // reads to a visitor as not covered at all
    weight.set(realm, 1 + gap + absent);
  }
  return { stats, weight };
}

function reaches(src, d) {
  if ((src.decisions || []).includes(d.id)) return true;
  // cross-cutting company-keyed measures reach any decision whose options are companies or brands
  if (src.kind === 'measure' && (src.realms || []).includes(d.realm) &&
      ['company', 'brand'].includes(src.key) && ['Products', 'Services', 'Organizations'].includes(d.type)) return true;
  return false;
}

export function plan() {
  const tax = readJson(TAXONOMY);
  const shelf = readJson(SHELF);
  const matrix = fs.existsSync(MATRIX) ? readJson(MATRIX) : { decisions: [] };
  const applicable = new Map();
  for (const row of matrix.decisions || []) {
    for (const rid of (row.coverage && row.coverage.applicable) || []) {
      if (!applicable.has(rid)) applicable.set(rid, []);
      applicable.get(rid).push(row.id);
    }
  }
  /* proven shelf registers: earned, so access and licence count as verified; a register is a
     roster only where the shelf says so, because most of it was built as cross-cutting evidence */
  const proven = (shelf.registers || []).map((r) => ({
    id: r.id, name: r.name, publisher: r.publisher,
    kind: r.role === 'roster' ? 'roster' : 'measure', census: r.census === true,
    key: r.key || 'company', accessVerified: true, reuseOk: true, commercialConflict: false,
    region: r.region || ['US'], measures: [{ criterion: r.provenanceKey }],
    decisions: [...new Set([...(applicable.get(r.id) || []), ...(r.proven || [])])],
    realms: r.realms || [], onShelf: 'proven',
  }));
  /* A candidate that extends a proven register adds its proposed decisions to that register
     rather than counting twice; the coverage matrix stays the reviewed record of applicability. */
  const byIdProven = new Map(proven.map((r) => [r.id, r]));
  const candidates = [];
  for (const c of shelf.candidates || []) {
    const base = c.extendsShelf && byIdProven.get(c.extendsShelf);
    if (base) {
      base.decisions = [...new Set([...base.decisions, ...(c.decisions || [])])];
      base.region = [...new Set([...(base.region || []), ...(c.region || [])])];
      if (c.realms) base.realms = c.realms;
      if (c.measures) base.measures = c.measures;
      continue;
    }
    candidates.push({ ...c, onShelf: 'candidate' });
  }
  const reg = { sources: proven.concat(candidates) };
  const all = allDecisions(tax);
  const open = all.filter((d) => d.scope === 'open');
  const { stats, weight } = realmWeights(all);

  const usable = [], excluded = [];
  for (const s of reg.sources) {
    const why = eligibility(s);
    (why ? excluded : usable).push(why ? { s, why } : s);
  }
  const rosters = usable.filter((s) => s.kind === 'roster' && s.census === true);
  const winnersLists = usable.filter((s) => s.kind === 'roster' && s.census !== true);
  const measures = usable.filter((s) => s.kind === 'measure').concat(winnersLists);  // rule 1

  /* A measure counts for a decision only where it can join something: a UK pay-gap register adds
     nothing to a roster of US-only cars. Global on either side overlaps everything. */
  const overlaps = (a, b) => {
    const ra = a.region || [], rb = b.region || [];
    return ra.includes('global') || rb.includes('global') || ra.some((x) => rb.includes(x));
  };
  /* Independence is counted per option, because the design rule is per verdict page: an option
     must rest on more than one publisher. Two rosters for different regions list different
     things (a charity in England is not in the IRS file), so they do not vouch for each other.
     For each roster, count its own publisher plus measures from other publishers that can join
     it, and keep the best roster. GLOBAL_COMPANY measures reach nearly every company decision,
     and how many options they actually join is unknown until an adapter runs, so a decision
     that clears the bar only because of them is reported apart rather than counted as solid. */
  const GLOBAL_COMPANY = new Set(['sbti-target-dashboard', 'gleif-lei']);
  const perDecision = open.map((d) => {
    const r = rosters.filter((s) => reaches(s, d));
    const mAll = measures.filter((s) => reaches(s, d));
    const m = mAll.filter((s) => !r.length || r.some((x) => overlaps(x, s)));
    let best = { crit: 0, pubs: 0, solid: false };
    for (const x of r) {
      const joinable = mAll.filter((s) => overlaps(x, s) && s.publisher !== x.publisher);
      const score = (list) => {
        const crit = new Set((x.measures || []).map((k) => k.criterion));
        for (const s of list) for (const k of s.measures || []) crit.add(k.criterion);
        return { crit: crit.size, pubs: 1 + new Set(list.map((s) => s.publisher)).size };
      };
      const all = score(joinable);
      const solid = score(joinable.filter((s) => !GLOBAL_COMPANY.has(s.id)));
      const cand = { crit: all.crit, pubs: all.pubs, solid: solid.crit >= 3 && solid.pubs >= 2 };
      const better = cand.solid !== best.solid ? cand.solid : cand.pubs * 10 + cand.crit > best.pubs * 10 + best.crit;
      if (better) best = cand;
    }
    const meets = best.crit >= 3 && best.pubs >= 2;
    const status = !r.length ? (m.length ? 'measured-only' : 'unfed')
      : meets ? (best.solid ? 'sourceable' : 'sourceable-if-joined') : 'roster-short';
    return { d, r, m, crit: best.crit, pubs: best.pubs, status, w: weight.get(d.realm) || 1 };
  });

  const yieldOf = new Map();
  for (const p of perDecision) {
    for (const s of p.r) {
      const credit = p.status === 'sourceable' ? p.w : p.status === 'sourceable-if-joined' ? 0.8 * p.w : 0.6 * p.w;
      const y = yieldOf.get(s.id) || { s, score: 0, decisions: [] };
      y.score += credit; y.decisions.push(p.d.id); yieldOf.set(s.id, y);
    }
    // a measure builds nothing alone: it counts only where a roster exists for it to attach to
    if (p.r.length) {
      for (const s of p.m) {
        const y = yieldOf.get(s.id) || { s, score: 0, decisions: [] };
        y.score += 0.3 * p.w; y.decisions.push(p.d.id); yieldOf.set(s.id, y);
      }
    }
  }
  const ranked = [...yieldOf.values()].sort((a, b) => b.score - a.score);
  return { all, open, stats, weight, usable, excluded, rosters, winnersLists, measures, perDecision, ranked, reg };
}

export function printPlan() {
  const P = plan();
  if (!P.reg.sources.length) {
    console.log('The register shelf is empty. Sources are written down in content/registers.json.');
    return;
  }
  const nProven = P.reg.sources.filter((x) => x.onShelf === 'proven').length;
  console.log(`Register shelf: ${nProven} proven, ${P.reg.sources.length - nProven} candidates. Usable: ${P.usable.length}. ` +
    `Census rosters: ${P.rosters.length}. Measures: ${P.measures.length} ` +
    `(${P.winnersLists.length} of them certification lists, used as measures by rule 1).`);
  if (P.excluded.length) {
    console.log('\nNot counted:');
    for (const { s, why } of P.excluded) console.log(`  ${s.id.padEnd(30)} ${why}`);
  }

  const label = (y) => `${y.s.id} (${(y.s.region || []).join(', ')}${y.s.onShelf === 'candidate' ? ', candidate' : ''})`;
  console.log('\nBuild order. A roster builds decisions, so the top roster is the next adapter.');
  console.log('Score is open decisions fed, weighted toward the emptiest realms.');
  console.log('  score  decisions  roster');
  for (const y of P.ranked.filter((y) => y.s.kind === 'roster' && y.s.census).slice(0, 15)) {
    console.log(`  ${y.score.toFixed(1).padStart(5)}  ${String(y.decisions.length).padStart(9)}  ${label(y)}`);
  }
  console.log('\nMultipliers. A measure builds nothing alone; it adds an independent fact to each');
  console.log('roster option it can join, so it is scored only on decisions that have a roster.');
  console.log('  score  decisions  measure');
  for (const y of P.ranked.filter((y) => !(y.s.kind === 'roster' && y.s.census)).slice(0, 12)) {
    console.log(`  ${y.score.toFixed(1).padStart(5)}  ${String(y.decisions.length).padStart(9)}  ${label(y)}`);
  }

  const blank = () => ({ sourceable: 0, 'sourceable-if-joined': 0, 'roster-short': 0, 'measured-only': 0, unfed: 0 });
  const counts = blank();
  const byRealm = new Map();
  for (const p of P.perDecision) {
    counts[p.status] += 1;
    const r = byRealm.get(p.d.realm) || blank();
    r[p.status] += 1; byRealm.set(p.d.realm, r);
  }
  console.log(`\nOf ${P.open.length} open decisions, if every usable source were ingested:`);
  console.log(`  ${String(counts.sourceable).padStart(4)}  sourceable: each option can rest on two publishers and three measures`);
  console.log(`  ${String(counts['sourceable-if-joined']).padStart(4)}  sourceable only if SBTi or GLEIF joins enough options; unknown until run`);
  console.log(`  ${String(counts['roster-short']).padStart(4)}  roster from a source; a lane agent adds the missing measures by hand`);
  console.log(`  ${String(counts['measured-only']).padStart(4)}  measures exist but no census roster; still hand-built, with less to find`);
  console.log(`  ${String(counts.unfed).padStart(4)}  nothing registered yet`);
  console.log('A ceiling, not a promise: each decision still has to pass lens_check (twelve options,');
  console.log('the mainstream option included) and swarm sources before it is built.');

  console.log('\nRealm                  built  open  sourceable  if-joined  roster-short  measured-only');
  for (const [realm, s] of [...P.stats].sort((a, b) => b[1].open - a[1].open)) {
    const r = byRealm.get(realm) || {};
    console.log(`  ${realm.padEnd(22)} ${String(s.built).padStart(4)} ${String(s.open).padStart(5)} ` +
      `${String(r.sourceable || 0).padStart(10)} ${String(r['sourceable-if-joined'] || 0).padStart(10)} ${String(r['roster-short'] || 0).padStart(13)} ${String(r['measured-only'] || 0).padStart(14)}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) printPlan();
