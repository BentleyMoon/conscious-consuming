#!/usr/bin/env node
/* The source harness: turns census registers into draft lenses, and holds every draft to the same
 * contract a hand-built lens meets.
 *
 *   node pipeline/sources/harness.mjs <adapter> [--only <decision-id>]
 *
 * WHERE IT SITS. The register system in pipeline/registers/ already captures registers as
 * byte-exact snapshots with licence notes, maps them to decisions, and promotes reviewed evidence
 * into lenses that exist. What it has no path for is a register building a decision that does not
 * exist yet: every one of the 53 bulk-built decisions came from a one-off fetch script. This is
 * that path, and it reads the shelf's committed snapshots rather than the network, so a build is
 * reproducible and the licence travels with the bytes (pipeline/registers/README.md).
 *
 * An ADAPTER (pipeline/sources/adapters/<id>.mjs) reads one census register and returns draft
 * lenses: the options for each decision it can supply, the measures that register holds, and a
 * provenance entry per score pointing at that option's own record in the register. Each option
 * carries the register's stable identifiers in `ids` (lei, ein, cert, rssd, companyNumber).
 *
 * A MEASURE (pipeline/sources/measures/<id>.mjs) reads a register keyed by company and adds a
 * score to any option, in any draft, that shares its identifier. One measure written once reaches
 * every decision whose options are companies. It may only state positive facts unless it is itself
 * a census, because absence from a list a company had to apply to is not evidence of anything.
 *
 * WHY JOINS NEED AN IDENTIFIER. A fuzzy match between "Apple Inc" and "Apple Rush Co" puts one
 * company's record on another's row: a fabricated fact with a real-looking source. The existing
 * entity mapping (pipeline/registers/entity_mapping.py) accepts a match only with a stable register
 * identifier and a review receipt, and this harness keeps that bar rather than routing around it.
 * A measure writes a score only where option and register share an identifier, which makes the
 * join exact by construction. A name that merely normalises to the same string writes nothing: it
 * is saved as a candidate row in the existing entity-map format for a reviewer to confirm. Both
 * counts are printed for every measure, so a low identifier rate is visible.
 *
 * Drafts go to content/lenses-drafts/ (gitignored), because every file in content/lenses is live
 * to the build. Promotion stays the serial step in docs/SWARM-BRIEF.md section 5.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DRAFTS = path.join(ROOT, 'content', 'lenses-drafts');
const ADAPTERS = path.join(ROOT, 'pipeline', 'sources', 'adapters');
const MEASURES = path.join(ROOT, 'pipeline', 'sources', 'measures');
const TAXONOMY = path.join(ROOT, 'content', 'taxonomy.json');
const SNAPSHOTS = path.join(ROOT, 'pipeline', 'registers', 'raw');
const LOCAL_SNAPSHOTS = path.join(ROOT, 'pipeline', 'registers', 'local');

const LEGAL = /\b(incorporated|inc|llc|ltd|limited|plc|corp|corporation|co|company|group|holdings?|gmbh|ag|sa|nv|bv|ab|oy|spa|the)\b/g;

/* One name, one key, for proposing matches. Never used to write a score. */
export function normaliseName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\./g, '')                        // dotted forms first: S.A. and L.L.C. become sa and llc
    .replace(/[,'’()\-/]/g, ' ')
    .replace(LEGAL, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function decisionsById() {
  const tax = JSON.parse(fs.readFileSync(TAXONOMY, 'utf8'));
  const out = new Map();
  for (const realm of tax.realms) for (const field of realm.fields) for (const family of field.families) {
    for (const d of family.decisions) out.set(d.id, d);
  }
  return out;
}

/* The newest snapshot for a register: its manifest and the payload bytes. Committed snapshots live
   in raw/; registers whose terms forbid republishing the file are captured to local/ (gitignored). */
export function latestSnapshot(registerId) {
  for (const root of [SNAPSHOTS, LOCAL_SNAPSHOTS]) {
    const dir = path.join(root, registerId);
    if (!fs.existsSync(dir)) continue;
    const manifests = fs.readdirSync(dir).filter((f) => f.endsWith('.snapshot.json')).sort();
    if (!manifests.length) continue;
    const manifestPath = path.join(dir, manifests[manifests.length - 1]);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const stem = manifests[manifests.length - 1].replace(/\.snapshot\.json$/, '');
    const payloadName = fs.readdirSync(dir).find((f) => f.startsWith(`${stem}.payload.`));
    return { manifest, manifestPath, payloadPath: payloadName ? path.join(dir, payloadName) : null };
  }
  return null;
}

async function loadDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const mods = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.mjs')).sort()) {
    mods.push(await import(pathToFileURL(path.join(dir, f)).href));
  }
  return mods;
}

/* A measure module exports id, criterion {key,label,source}, idScheme, reaches(decision), and
   index(ctx) -> { byId: Map(identifier -> fact), byName: Map(normalisedName -> fact) } or null when
   its snapshot is absent, a fact being { score, note, source, asof, identifier, legalName }. Only
   byId writes scores.
   Optional: key(option, decision, index) returns the identifier(s) for an option when they have to
   be resolved against the register itself (a vehicle's NHTSA model, say), and combine(facts,
   option) folds several facts into one, or returns null when none of them carries a score.
   An option may say how it came by an identifier in idNotes[scheme]; that sentence leads the note,
   so a reader sees why a company's record sits on a product's row. */
function applyMeasures(decision, lens, measureIndexes, wanted) {
  const stats = [], candidates = [];
  for (const { mod, index } of measureIndexes) {
    if (wanted ? !wanted.includes(mod.id) : !mod.reaches(decision)) continue;
    if (!index) { stats.push({ measure: mod.id, key: mod.criterion.key, missing: true }); continue; }
    const key = mod.criterion.key;
    let tried = 0, joined = 0, proposed = 0;
    for (const p of lens.products) {
      tried += 1;
      const raw = mod.key ? mod.key(p, decision, index) : (p.ids && p.ids[mod.idScheme]);
      const ids = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(String);
      const facts = ids.map((id) => index.byId.get(id)).filter(Boolean);
      const hit = facts.length ? (mod.combine ? mod.combine(facts, p) : facts[0]) : null;
      if (hit && hit.score != null) {
        joined += 1;
        const lead = p.idNotes && p.idNotes[mod.idScheme];
        p.scores = p.scores || {};
        p.provenance = p.provenance || {};
        p.scores[key] = hit.score;
        p.provenance[key] = { note: lead ? `${lead} ${hit.note}` : hit.note, source: hit.source, asof: hit.asof };
        continue;
      }
      if (ids.length) continue;
      const byName = index.byName && index.byName.get(normaliseName(p.brand || p.name));
      if (byName) {
        proposed += 1;
        candidates.push({
          status: 'candidate', register: mod.id, cid: decision.id, entityCode: p.code,
          optionName: p.name, legalName: byName.legalName,
          registerIdentifier: { scheme: byName.identifierScheme || mod.idScheme, value: byName.identifier },
          matchEvidence: { source: byName.source, note: 'Names normalise to the same string. A reviewer must confirm it is the same entity.' },
        });
      }
    }
    if (joined && !lens.criteria.some((c) => c.key === key)) lens.criteria.push({ ...mod.criterion });
    stats.push({ measure: mod.id, key, tried, joined, proposed });
  }
  for (const p of lens.products) { delete p.ids; delete p.idNotes; }
  return { stats, candidates };
}

function publishers(lens) {
  const domains = new Set();
  for (const p of lens.products) {
    for (const v of Object.values(p.provenance || {})) {
      const m = /^https?:\/\/([^/]+)/.exec((v && v.source) || '');
      if (m) domains.add(m[1].replace(/^www\./, ''));
    }
  }
  return domains;
}

/* lens_check on the draft, with its exit status read before anything else runs. */
function check(file) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'research', 'lens_check.js'), '--file', file], { encoding: 'utf8' });
  const status = r.status;
  const lines = (r.stdout || '').split(/\r?\n/).filter((l) => /^\s+(FAIL|WARN)/.test(l));
  return { status, lines };
}

async function main() {
  const args = process.argv.slice(2);
  const adapterId = args.find((a) => !a.startsWith('--'));
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null;
  if (!adapterId) {
    console.log('usage: node pipeline/sources/harness.mjs <adapter> [--only <decision-id>]');
    process.exit(2);
  }
  const file = path.join(ADAPTERS, `${adapterId}.mjs`);
  if (!fs.existsSync(file)) { console.log(`No adapter at ${path.relative(ROOT, file)}`); process.exit(2); }

  const adapter = await import(pathToFileURL(file).href);
  const byId = decisionsById();
  const ctx = { byId, root: ROOT, latestSnapshot };

  console.log(`Source harness: ${adapter.source.name}`);
  const measureIndexes = [];
  for (const mod of await loadDir(MEASURES)) {
    const index = await mod.index(ctx);
    measureIndexes.push({ mod, index });
    if (!index) console.log(`  measure ${mod.id}: no snapshot (node pipeline/sources/capture.mjs ${mod.id})`);
    else console.log(`  measure ${mod.id}: ${index.byId.size} by ${mod.idScheme}, ${index.byName ? index.byName.size : 0} by name (proposals only)`);
  }

  const drafts = await adapter.build(ctx, only);
  fs.mkdirSync(DRAFTS, { recursive: true });
  let pass = 0;
  console.log('\n  decision                         options  measures  publishers  lens_check');
  for (const { decision, lens, measures } of drafts) {
    const d = byId.get(decision);
    const { stats: joins, candidates } = applyMeasures(d, lens, measureIndexes, measures);
    const out = path.join(DRAFTS, `${decision}.json`);
    fs.writeFileSync(out, JSON.stringify(lens, null, 1) + '\n', 'utf8');
    if (candidates.length) {
      const queue = {
        format: 'open-values-register-entity-map', version: '1.0.0',
        note: 'Proposals only. Each row needs a reviewer, a jurisdiction and a review receipt before entity_mapping.py will accept it.',
        mappings: candidates,
      };
      fs.writeFileSync(path.join(DRAFTS, `${decision}.mapping-candidates.json`), JSON.stringify(queue, null, 1) + '\n', 'utf8');
    }
    const result = check(out);
    const ok = result.status === 0;
    if (ok) pass += 1;
    console.log(`  ${decision.padEnd(32)} ${String(lens.products.length).padStart(7)} ` +
      `${String(lens.criteria.length).padStart(9)} ${String(publishers(lens).size).padStart(11)}  ${ok ? 'PASS' : 'fail'}`);
    for (const j of joins) {
      if (j.missing) { console.log(`      ${j.measure}: skipped, no snapshot`); continue; }
      const rate = j.tried ? Math.round((100 * j.joined) / j.tried) : 0;
      console.log(`      ${j.measure}: ${j.joined} of ${j.tried} options scored by identifier (${rate}%), ${j.proposed} name matches written for review`);
    }
    if (!ok) for (const l of result.lines.slice(0, 6)) console.log(`      ${l.trim()}`);
  }
  console.log(`\n${pass} of ${drafts.length} drafts pass lens_check. Drafts are in content/lenses-drafts/.`);
  console.log('A passing draft still needs swarm sources and the serial promotion in docs/SWARM-BRIEF.md section 5.');
  process.exit(drafts.length && pass === drafts.length ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
}
