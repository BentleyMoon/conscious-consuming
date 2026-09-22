#!/usr/bin/env node
/* Single-lens preflight.

   WHY THIS EXISTS. The full pipeline takes minutes and rewrites every generated surface in the
   repo. A swarm of agents cannot run it per decision: it is slow, and several agents running it at
   once fight over the same generated files. This checks one lens in about a second and touches
   nothing.

   It is also where the swarm's quality rules live, because a rule that only exists in a brief is a
   rule that gets read once. Everything here is derived from the artifacts: the criterion
   vocabulary comes from the lenses already written, the filter keys come from the home lens
   itself, and the type and label come from the map. There is no hand-maintained list of expected
   values in this file, because a gate built on one can only ever confirm its own list.

   WHAT IT IS LOOKING FOR. Shape errors are the cheap half. The expensive half is fabrication: an
   agent under pressure to fill a roster will produce plausible scores attached to plausible URLs.
   Nothing here can read a page and tell you it says what the note claims. What it can do is catch
   the shapes fabrication takes: one source cited for everything, a note repeated verbatim across
   products, every fact sourced to the seller's own website, a year that never happened.

   Run: node research/lens_check.js <cid>        strict, for new work
        node research/lens_check.js --all        corpus report
        node research/lens_check.js <cid> --lax  contract only, quality rules as warnings
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LENS_DIR = path.join(ROOT, 'content', 'lenses');
const HOMELENS = path.join(ROOT, 'app', 'homelens.js');
const TAXONOMY = path.join(ROOT, 'content', 'taxonomy.json');

const TYPES = new Set(['Products', 'Services', 'Media', 'Organizations', 'Initiatives']);
const ROSTER_FLOOR = 12;          // the smallest roster the corpus already ships
const MIN_CRITERIA = 3;
const BANNED = ['curated', 'empower', 'robust', 'journey', 'seamless', 'landscape',
  'leverage', 'delve', 'tapestry', 'vibrant', 'elevate'];
// Case-sensitive on purpose. /TODO/i matched Todo.txt, a real product in the notes roster, and a
// gate that fails correct content teaches an agent to break the gate.
const PLACEHOLDERS = [/\bTODO\b/, /\bTKTK\b/, /\blorem ipsum\b/i, /example\.com/i,
  /\bfill in here\b/i, /\bXXX\b/];
const YEAR_MIN = 2015;

/* National government domain conventions, which are a published and enumerable set rather than a
   list of favoured sites. Three separate lanes hit this check reporting zero institutional sources
   while citing a German federal court, a German federal cybersecurity agency and the UK aviation
   regulator, because the first version only knew about .gov and .gov.xx. A heuristic that scores
   every non-US regulator as commercial is not measuring what it claims to. */
const GOV_PATTERNS = [
  /(^|\.)(gov|edu|int|mil)$/,      // United States and generic
  // The leading (^|\.) matters. host() strips www., so www.gov.uk arrives as gov.uk, which has no
  // dot before "gov" and does not end in "gov" either: the UK's primary government domain was
  // invisible to both other patterns while london-fire.gov.uk passed. Found by a lane agent that
  // diagnosed the regex rather than working around it, and the fourth time this heuristic has been
  // corrected by someone using it.
  /(^|\.)(gov|ac|edu|mil)\.[a-z]{2}$/, // gov.uk, ac.uk, gov.au, edu.au and the many like them
  /\.[a-z]{2}\.us$/,               // US states, which mostly sit on state.XX.us
  /(^|\.)europa\.eu$/,
  /(^|\.)gc\.ca$/, /(^|\.)canada\.ca$/,
  /(^|\.)gouv\.fr$/,
  /(^|\.)bund\.de$/,
  /(^|\.)gob\.es$/, /(^|\.)gob\.mx$/,
  /(^|\.)go\.jp$/, /(^|\.)go\.kr$/,
  /(^|\.)admin\.ch$/,
  /(^|\.)overheid\.nl$/, /(^|\.)rijksoverheid\.nl$/,
];

/* Public bodies that follow no convention their country can be recognised by. Germany's federal
   courts sit on a plain .de, so no rule derived from domain shape can find them. Add only a body
   with legal authority over the sector it publishes about, and name in the commit which lens found
   the gap. Incomplete by construction, and a floor rather than a gate: nothing fails for being
   absent, and a miss costs one advisory warning a human can overrule. */
const REGULATORS = [
  'caa.co.uk',              // UK Civil Aviation Authority, punctuality and licensing
  'citizensadvice.org.uk',  // UK statutory consumer advocate for energy and post
  'law.cornell.edu',        // Legal Information Institute, primary text of US statute
  'bundesgerichtshof.de',   // Germany's Federal Court of Justice
  'dataprotection.ie',      // Ireland's Data Protection Commission, lead EU regulator for big tech
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/* The home lens decides which criteria light a filter chip. Parsed from the file itself so this
   cannot drift from what the page actually does. */
function filterKeys() {
  const src = fs.readFileSync(HOMELENS, 'utf8');
  const block = src.slice(src.indexOf('var LENSES = ['), src.indexOf('];', src.indexOf('var LENSES = [')));
  const keys = new Set();
  for (const match of block.matchAll(/keys:\s*\[([^\]]*)\]/g)) {
    for (const raw of match[1].split(',')) {
      const key = raw.trim().replace(/^['"]|['"]$/g, '');
      if (key) keys.add(key);
    }
  }
  return keys;
}

/* Every criterion key already in use, so a new one is visible as new rather than as normal. */
function vocabulary(exceptCid) {
  const counts = new Map();
  for (const file of fs.readdirSync(LENS_DIR)) {
    if (!file.endsWith('.json')) continue;
    const data = readJson(path.join(LENS_DIR, file));
    if (data.meta && data.meta.id === exceptCid) continue;
    for (const criterion of data.criteria || []) {
      counts.set(criterion.key, (counts.get(criterion.key) || 0) + 1);
    }
  }
  return counts;
}

/* Keyed by cid and by decision id. A lens being written for the first time has no cid on the map
   yet, because the outline is edited after the dataset exists: keying on cid alone told every new
   lens it had no home, which is the opposite of what this check is for. New work is matched by
   decision id, which is what the scaffold names the file. */
function mapDecisions() {
  if (!fs.existsSync(TAXONOMY)) return new Map();
  const taxonomy = readJson(TAXONOMY);
  const byKey = new Map();
  const add = (key, decision) => {
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(decision);
  };
  for (const realm of taxonomy.realms || []) {
    for (const field of realm.fields || []) {
      for (const family of field.families || []) {
        for (const decision of family.decisions || []) {
          if (decision.cid) add(decision.cid, decision);
          else if (decision.scope === 'open') add(decision.id, decision);
        }
      }
    }
  }
  return byKey;
}

function textOf(lens) {
  const parts = [String((lens.meta && lens.meta.attribution) || '')];
  for (const product of lens.products || []) {
    parts.push(String(product.description || ''));
    for (const entry of Object.values(product.provenance || {})) {
      if (entry && typeof entry === 'object') parts.push(String(entry.note || ''));
    }
  }
  return parts;
}

function host(url) {
  const match = /^https?:\/\/([^/]+)/i.exec(String(url || ''));
  return match ? match[1].toLowerCase().replace(/^www\./, '') : '';
}

function check(cid, lens, context) {
  const fail = [];
  const warn = [];
  const meta = lens.meta || {};
  const criteria = lens.criteria || [];
  const products = lens.products || [];

  // ---- contract ----
  // The cid is meta.id, not the filename. Three lenses already ship with a filename that differs
  // from their id, so checking the filename would have failed working content and taught an agent
  // to rename things that were right.
  if (!String(meta.id || '').trim()) fail.push('meta.id is empty');
  if (!TYPES.has(meta.type)) fail.push(`meta.type "${meta.type}" is not one of ${[...TYPES].join(', ')}`);
  if (!String(meta.label || '').trim()) fail.push('meta.label is empty');
  if (!String(meta.attribution || '').trim()) fail.push('meta.attribution is empty: a reader has to be told what the scores are and are not');

  const placed = context.byCid.get(cid) || [];
  if (!placed.length) {
    fail.push(`${cid} matches no decision on the map, by cid or by id. Every dataset is work on a decision somebody can point at: add it to content/taxonomy/ and say in the commit why it belongs there.`);
  } else {
    const decision = placed[0];
    if (decision.type !== meta.type) {
      fail.push(`meta.type "${meta.type}" disagrees with the map, which says "${decision.type}" for ${decision.path}`);
    }
    if (placed.length === 1 && decision.label !== meta.label) {
      warn.push(`meta.label "${meta.label}" differs from the map label "${decision.label}"`);
    }
  }

  if (!criteria.length) fail.push('no criteria');
  if (criteria.length < MIN_CRITERIA) {
    fail.push(`${criteria.length} criteria: a decision needs at least ${MIN_CRITERIA} measures to be a comparison rather than a ranking`);
  }
  const declared = new Set();
  for (const criterion of criteria) {
    if (!criterion.key) fail.push('a criterion has no key');
    else if (declared.has(criterion.key)) fail.push(`criterion ${criterion.key} declared twice`);
    else declared.add(criterion.key);
    /* The corpus settled on lowercase and underscores long ago: 42 of the 45 keys in use follow it,
       and the three that did not arrived in one wave. A key is a join across every lens, so a
       camelCase twin of an existing snake_case key would never compare with it and nothing would
       say so. Cheap to enforce, expensive to discover later. */
    if (criterion.key && !/^[a-z][a-z0-9_]*$/.test(criterion.key)) {
      fail.push(`criterion key "${criterion.key}" is not lowercase with underscores, which every other key in the corpus is`);
    }
    if (!String(criterion.label || '').trim()) fail.push(`criterion ${criterion.key} has no label`);
    if (!String(criterion.source || '').trim()) fail.push(`criterion ${criterion.key} does not say where it comes from`);
  }

  if (products.length < ROSTER_FLOOR) {
    fail.push(`${products.length} options: the floor is ${ROSTER_FLOOR}. A short roster reads as a shortlist somebody was paid for.`);
  }
  const codes = new Set();
  for (const product of products) {
    if (!product.code) fail.push(`an option has no code (${product.name || 'unnamed'})`);
    else if (codes.has(product.code)) fail.push(`duplicate option code ${product.code}`);
    else codes.add(product.code);
    if (!String(product.name || '').trim()) fail.push(`option ${product.code} has no name`);
    for (const key of Object.keys(product.scores || {})) {
      if (!declared.has(key)) fail.push(`option ${product.code} scores "${key}", which no criterion declares`);
    }
  }

  // ---- provenance ----
  const openData = new Set(criteria.filter((c) => c.source && c.source !== 'curated').map((c) => c.key));
  let cells = 0;
  let missing = 0;
  const noteCounts = new Map();
  const hostCounts = new Map();
  let sourced = 0;
  for (const product of products) {
    for (const [key, value] of Object.entries(product.scores || {})) {
      if (value === null || value === undefined) continue;
      if (openData.has(key)) continue;   // criterion-level provenance covers these
      cells += 1;
      const entry = (product.provenance || {})[key];
      if (!entry || typeof entry !== 'object') { missing += 1; continue; }
      const note = String(entry.note || '').trim();
      const source = String(entry.source || '').trim();
      const asof = String(entry.asof || '').trim();
      if (!note) fail.push(`${product.code}.${key}: provenance has no note`);
      if (!source) {
        fail.push(`${product.code}.${key}: provenance has no source`);
      } else if (!/^https?:\/\//i.test(source)) {
        fail.push(`${product.code}.${key}: source "${source.slice(0, 40)}" is not an absolute URL`);
      } else {
        sourced += 1;
        const h = host(source);
        hostCounts.set(h, (hostCounts.get(h) || 0) + 1);
      }
      if (!asof) {
        fail.push(`${product.code}.${key}: provenance has no asof date`);
      } else {
        const year = Number(String(asof).slice(0, 4));
        const now = new Date().getFullYear();
        if (!Number.isInteger(year) || year < YEAR_MIN || year > now + 1) {
          fail.push(`${product.code}.${key}: asof "${asof}" is not a plausible year`);
        }
      }
      if (note) noteCounts.set(note, (noteCounts.get(note) || 0) + 1);
    }
  }
  if (missing) {
    warn.push(`${missing} of ${cells} scored cells carry no provenance. A score without a source is an opinion with a number on it.`);
  }

  // ---- the shapes fabrication takes ----
  for (const [note, n] of noteCounts) {
    if (n >= 3 && note.length > 30) {
      warn.push(`the same note appears on ${n} cells verbatim: "${note.slice(0, 60)}..." Sometimes true, when every option lacks the same certification. Often it means the difference between them was not looked up.`);
    }
  }
  /* WHERE THE EVIDENCE COMES FROM, REPORTED RATHER THAN POLICED. Institutional is decided by the
     shape of the host, not by a list of approved sites: a list would only ever confirm itself, and
     the web is too large to enumerate. This cannot tell a good commercial source from a bad one,
     so it reports a ratio and names the rule. Wave one made the case for it: the lens that turned
     out to contain a fabricated claim had 3 institutional cells out of 49, and the two that held
     up had 21 of 39 and 11 of 43. */
  const institutional = [...hostCounts.entries()]
    // US states largely sit on state.XX.us rather than .gov, so a regex that only knows .gov
    // scores a state attorney general as a commercial site. Found by a lane agent that declined to
    // chase the ratio and said why, which is the better failure to have.
    //
    // REGULATORS is a hand-maintained list, which this file otherwise argues against, and the
    // compromise is deliberate. Statutory regulators do not reliably sit on a government TLD: the
    // UK Civil Aviation Authority is caa.co.uk and has been since before .gov.uk existed. There is
    // no derivable rule that separates a regulator from a company by domain shape, so the choice is
    // between a short list that is honest about being incomplete and a check that keeps calling
    // regulators commercial. The list is a floor, never a gate: nothing fails for being absent from
    // it, and the only effect of a miss is one advisory warning that a human can overrule.
    .filter(([h]) => GOV_PATTERNS.some((p) => p.test(h)) || REGULATORS.some((r) => h === r || h.endsWith(`.${r}`)))
    .reduce((n, [, count]) => n + count, 0);
  if (sourced >= 10) {
    const share = Math.round((100 * institutional) / sourced);
    if (share < 15) {
      warn.push(`${share} per cent of sources are institutional (a government, university or intergovernmental domain). Low is not automatically wrong, and for a decision about which shop to use it may be right. It is wrong when a regulator publishes the exact record being cited to a commercial site instead: recalls, enforcement, safety and certification all have an official register.`);
    }
  }
  /* Tertiary sources are a research lead, not a citation. A wiki article is a summary of something
     else, and the something else is what belongs in the provenance. */
  for (const [h, count] of hostCounts) {
    if (/(^|\.)wikipedia\.org$/.test(h) || /(^|\.)fandom\.com$/.test(h)) {
      warn.push(`${count} cell(s) cite ${h}. A wiki summarises a source; cite the source it summarises.`);
    }
  }

  if (sourced >= 8) {
    const [topHost, topCount] = [...hostCounts.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];
    if (topCount / sourced > 0.9 && hostCounts.size <= 2) {
      warn.push(`${Math.round((100 * topCount) / sourced)} per cent of sources are ${topHost}. One site cited for a whole comparison is a single point of failure and usually a single point of invention.`);
    }
    if (hostCounts.size <= 2 && products.length > 15) {
      warn.push(`${hostCounts.size} distinct source host(s) across ${products.length} options`);
    }
  }

  // ---- vocabulary ----
  /* A WARNING THAT ALWAYS FIRES IS A WARNING THAT TEACHES PEOPLE TO SUPPRESS WARNINGS. The first
     version flagged every criterion with no home-lens filter, which meant "accessibility" tripped
     it on all 23 lenses that use it as an ease axis. Three agents in the first wave each hit it on
     their first attempt and each reached for --lax, which suppresses every other warning too. An
     established key is a settled convention, not a finding. Only a key new to the corpus is worth
     stopping for. */
  for (const key of declared) {
    const seen = context.vocab.get(key) || 0;
    if (!seen) {
      warn.push(`criterion "${key}" is new to the corpus. Check it is not a synonym of one already in use, or the two will never compare.`);
      if (!context.filters.has(key)) {
        warn.push(`criterion "${key}" is new and matches no filter on the home lens, so it will never light a chip. That is correct for an ease or price axis and wrong for a values measure.`);
      }
    }
  }

  // ---- the decision has to be a decision ----
  const tradeoff = meta.tradeoff || [];
  if (tradeoff.length !== 2) {
    warn.push(`meta.tradeoff names ${tradeoff.length} axes, not 2. Five dials cancel each other and every option lands mid-table; naming the two a real person trades between is most of understanding the decision.`);
  } else {
    for (const axis of tradeoff) {
      if (!declared.has(axis)) fail.push(`tradeoff axis "${axis}" is not one of the criteria`);
    }
    if ((meta.tradeoffLabels || []).length !== 2) {
      fail.push('meta.tradeoffLabels must name both ends of the tradeoff');
    }
  }
  if (Object.keys(meta.presets || {}).length < 3) {
    warn.push('fewer than three presets: a reader arriving without settings has nothing to start from');
  }

  // ---- voice ----
  // Written as an escape so this file contains no em dash of its own. A detector that trips its
  // own rule teaches everyone downstream to ignore the rule.
  const EM_DASH = '—';
  for (const text of textOf(lens)) {
    if (text.includes(EM_DASH)) { fail.push('em dash in prose'); break; }
  }
  const joined = textOf(lens).join(' \u0000 ');
  for (const word of BANNED) {
    const re = new RegExp(`\\b${word}`, 'i');
    if (re.test(joined)) warn.push(`banned word "${word}" in prose`);
  }
  for (const pattern of PLACEHOLDERS) {
    if (pattern.test(joined)) { fail.push(`placeholder text left in prose (${pattern})`); break; }
  }

  return { fail, warn, cells, sourced, products: products.length, criteria: criteria.length };
}

function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const lax = args.includes('--lax');
  const target = args.find((a) => !a.startsWith('--'));

  if (!all && !target) {
    console.log('usage: node research/lens_check.js <cid> [--lax] | --all');
    process.exit(2);
  }

  const context = { filters: filterKeys(), byCid: mapDecisions(), vocab: null };
  const files = fs.readdirSync(LENS_DIR).filter((f) => f.endsWith('.json'));
  const byName = new Map();
  for (const file of files) {
    const data = readJson(path.join(LENS_DIR, file));
    const id = (data.meta && data.meta.id) || file.replace(/\.json$/, '');
    byName.set(file.replace(/\.json$/, ''), file);
    byName.set(id, file);
  }
  const ids = all ? files : [byName.get(target)];
  if (!all && !ids[0]) {
    console.log(`LENS CHECK FAILED: no lens with cid or filename "${target}" in content/lenses`);
    process.exit(1);
  }

  let hardFailures = 0;
  let warned = 0;

  for (const name of ids) {
    const file = path.join(LENS_DIR, name);
    let lens;
    try {
      lens = readJson(file);
    } catch (err) {
      console.log(`  FAIL ${name}: not valid JSON (${err.message})`);
      hardFailures += 1;
      continue;
    }
    const cid = (lens.meta && lens.meta.id) || name.replace(/\.json$/, '');
    context.vocab = vocabulary(cid);
    const result = check(cid, lens, context);

    if (all) {
      const flag = result.fail.length ? 'FAIL' : result.warn.length ? 'warn' : 'ok  ';
      console.log(`${flag} ${cid.padEnd(22)} ${String(result.products).padStart(4)} options, ` +
        `${String(result.criteria).padStart(2)} criteria, ${result.sourced} sourced cells` +
        `${result.fail.length ? `  (${result.fail.length} failures)` : ''}` +
        `${result.warn.length ? `  (${result.warn.length} warnings)` : ''}`);
      for (const message of result.fail) console.log(`       FAIL ${message}`);
    } else {
      console.log(`Lens check: ${cid}`);
      console.log(`  ${result.products} options, ${result.criteria} criteria, ${result.sourced} sourced cells`);
      for (const message of result.fail) console.log(`  FAIL ${message}`);
      for (const message of result.warn) console.log(`  WARN ${message}`);
    }
    hardFailures += result.fail.length;
    warned += result.warn.length;
  }

  if (hardFailures) {
    console.log(`LENS CHECK FAILED (${hardFailures} contract failures)`);
    process.exit(1);
  }
  if (warned && !lax && !all) {
    console.log(`LENS CHECK FAILED (${warned} quality warnings; fix them, or rerun with --lax and say in the commit why each one stands)`);
    process.exit(1);
  }
  console.log(all ? `LENS CHECK COMPLETE (${ids.length} lenses, ${warned} warnings)` : 'LENS CHECK PASS');
}

main();
