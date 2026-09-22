#!/usr/bin/env node
/* The swarm's working surface.
 *
 * WHY A CLI AND NOT A LONGER BRIEF. A brief is read once, at the start, by an agent that then
 * works for an hour from memory. The rules that survive are the ones a command enforces. This
 * holds the four things a lane worker needs to do that a document cannot do for it: see what is
 * unclaimed, claim it without colliding, start a lens in the right shape, and check that the
 * sources it cited actually exist.
 *
 * Commands:
 *   board                    every lane, its coverage, and who holds it
 *   next <realm> [n]         the open decisions in a lane, most consequential first
 *   claim <realm> <agent>    take a lane
 *   release <realm>          give it back
 *   new <decision-id>        scaffold content/lenses/<id>.json from the map
 *   sources <cid>            check every cited URL resolves (network)
 *
 * The lane file is content/swarm-lanes.json. It is state, not a published format, so it carries
 * no format marker and nothing downstream reads it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAXONOMY = path.join(ROOT, 'content', 'taxonomy.json');
const LANES = path.join(ROOT, 'content', 'swarm-lanes.json');
const LENS_DIR = path.join(ROOT, 'content', 'lenses');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

function taxonomy() {
  return readJson(TAXONOMY);
}

function decisions(tax) {
  const out = [];
  for (const realm of tax.realms) {
    for (const field of realm.fields) {
      for (const family of field.families) {
        for (const decision of family.decisions) {
          out.push({ ...decision, realmLabel: realm.label, fieldLabel: field.label, familyLabel: family.label });
        }
      }
    }
  }
  return out;
}

function lanes() {
  if (!fs.existsSync(LANES)) return { note: 'One agent per realm file. Nobody edits content/ontology.json in a lane.', claims: {} };
  return readJson(LANES);
}

/* HOW OFTEN IT COMES ROUND, AND HOW MANY PEOPLE IT LANDS ON. Not consequence, and the difference
   matters: the first version of this called itself a consequence score and put children's
   supplements above over-the-counter medicine, because it had no way to know which one a reader
   would regret getting wrong. Recurrence and scale are things the data actually holds. Judgement
   about what matters most lives in the first batch below, where a person wrote it down and can be
   argued with. */
function recurrence(d) {
  const cadence = { daily: 6, weekly: 5, monthly: 4, seasonal: 3, yearly: 3, once: 3, rare: 2 }[d.cadence] || 2;
  const reach = { household: 2, community: 2, organization: 1, person: 1 }[d.actor] || 1;
  return cadence * reach;
}

/* The opening move, decided by a person and quoted from docs/SWARM-BRIEF.md. Six realms have
   nothing built, and to a visitor that is indistinguishable from the catalogue not covering health,
   transport, family, animals, travel or work at all. */
const FIRST_BATCH = [
  ['health', 'over-the-counter-medicine', 'Everyone buys it, ownership is concentrated and public, and the axes are clear.'],
  ['transport', 'used-cars', 'The largest purchase most people make after a home, and the values axes are real.'],
  ['family-and-care', 'nappies', 'Recurring, high volume, and the reusable option is a genuine second axis.'],
  ['animals', 'dog-food', 'Recurring, ingredient sourcing is documented, and the market is consolidated.'],
  ['travel', 'airlines', 'High emissions per decision, and public reporting exists.'],
  ['work-and-livelihood', 'trade-unions', 'Nothing else in the catalogue tells a person how to have a say at work.'],
];

function board() {
  const tax = taxonomy();
  const all = decisions(tax);
  const state = lanes();
  const files = fs.readdirSync(path.join(ROOT, 'content', 'taxonomy')).filter((f) => f.endsWith('.md'));
  const byRealm = new Map();
  for (const d of all) {
    if (!byRealm.has(d.realm)) byRealm.set(d.realm, []);
    byRealm.get(d.realm).push(d);
  }
  console.log('Lane                    file                              built  open  held  refused  owner');
  for (const file of files) {
    const id = file.replace(/^\d+-/, '').replace(/\.md$/, '');
    const list = byRealm.get(id) || [];
    const n = (scope) => list.filter((d) => d.scope === scope).length;
    const owner = (state.claims && state.claims[id] && state.claims[id].agent) || '';
    console.log(
      `${id.padEnd(23)} ${file.padEnd(33)} ${String(n('covered')).padStart(5)} ` +
      `${String(n('open')).padStart(5)} ${String(n('hold')).padStart(5)} ${String(n('out')).padStart(8)}  ${owner}`
    );
  }
  const c = tax.counts;
  console.log(`\n${c.covered} of ${c.inScope} in scope are built (${c.coveredPercent} per cent). ${c.open} open.`);

  const byId = new Map(all.map((d) => [d.id, d]));
  const pending = FIRST_BATCH.filter(([, id]) => (byId.get(id) || {}).scope === 'open');
  if (pending.length) {
    console.log('\nFirst batch, still open. Six realms have nothing built at all, and to a visitor');
    console.log('an empty realm is indistinguishable from a subject the catalogue does not cover.');
    for (const [realm, id, why] of pending) {
      console.log(`  ${realm.padEnd(20)} ${id.padEnd(26)} ${why}`);
    }
  } else {
    console.log('\nFirst batch done. Next by size of gap: home has the most open decisions and the');
    console.log('largest share of a household budget.');
  }
}

function next(realm, count) {
  const all = decisions(taxonomy()).filter((d) => d.realm === realm && d.scope === 'open');
  if (!all.length) {
    console.log(`No open decisions in ${realm}. Either the lane is finished or the realm id is wrong; run "board".`);
    return;
  }
  all.sort((a, b) => recurrence(b) - recurrence(a) || a.id.localeCompare(b.id));
  for (const d of all.slice(0, count)) {
    console.log(`${d.id}`);
    console.log(`   ${d.fieldLabel} / ${d.familyLabel}  ${d.type}, ${d.mode}, ${d.cadence}, ${d.actor}, need ${d.need}`);
    if (d.aka) console.log(`   also called: ${d.aka.join(', ')}`);
  }
  console.log(`\n${all.length} open in ${realm}; showing ${Math.min(count, all.length)}, most recurring first.`);
  console.log('Recurrence is not importance. Read the family around a decision before picking one.');
}

function claim(realm, agent) {
  const state = lanes();
  state.claims = state.claims || {};
  const held = state.claims[realm];
  if (held && held.agent && held.agent !== agent) {
    console.log(`REFUSED: ${realm} is held by ${held.agent} since ${held.since}. Pick another lane from "board".`);
    process.exit(1);
  }
  const ids = new Set(decisions(taxonomy()).map((d) => d.realm));
  if (!ids.has(realm)) {
    console.log(`REFUSED: no realm "${realm}". Run "board" for the list.`);
    process.exit(1);
  }
  state.claims[realm] = { agent, since: new Date().toISOString().slice(0, 10) };
  writeJson(LANES, state);
  console.log(`${agent} holds ${realm}. Edit only content/taxonomy/*-${realm}.md and new files in content/lenses.`);
}

function release(realm) {
  const state = lanes();
  if (!state.claims || !state.claims[realm]) {
    console.log(`${realm} was not held.`);
    return;
  }
  delete state.claims[realm];
  writeJson(LANES, state);
  console.log(`${realm} released.`);
}

/* The scaffold is deliberately invalid. It carries FILL IN HERE markers that research/lens_check.js
   refuses, so a half-finished lens cannot be mistaken for a finished one by anybody, including the
   agent that wrote it. */
function scaffold(id) {
  const decision = decisions(taxonomy()).find((d) => d.id === id);
  if (!decision) {
    console.log(`No decision "${id}" on the map. Run "next <realm>" for open ones.`);
    process.exit(1);
  }
  if (decision.scope !== 'open') {
    console.log(`${id} is "${decision.scope}", not open.` +
      (decision.reason ? ` Reason on file: ${decision.reason}` : ''));
    process.exit(1);
  }
  const file = path.join(LENS_DIR, `${id}.json`);
  if (fs.existsSync(file)) {
    console.log(`${path.relative(ROOT, file)} already exists.`);
    process.exit(1);
  }
  const lens = {
    meta: {
      id,
      label: decision.label,
      type: decision.type,
      primaryAxis: 'FILL IN HERE',
      tradeoff: ['FILL IN HERE', 'FILL IN HERE'],
      tradeoffLabels: ['FILL IN HERE', 'FILL IN HERE'],
      source: 'Conscious Consuming',
      attribution: 'FILL IN HERE: what these scores are, what they are not, and how to check them.',
      allergens: false,
      presets: {
        Balanced: { w: {}, x: [] },
      },
    },
    criteria: [
      { key: 'FILL IN HERE', label: 'FILL IN HERE', source: 'curated' },
    ],
    products: [],
    _guidance: {
      decision: decision.path,
      facets: `${decision.type}, ${decision.mode}, ${decision.cadence}, ${decision.actor}, need ${decision.need}`,
      remove: 'Delete this _guidance block before committing.',
      steps: [
        'Name the two axes a real person trades between. If you cannot, you do not understand the decision yet.',
        `At least 12 options, including the mainstream one people already use, even when it scores badly.`,
        'Where the decision has a route that is not a purchase (borrow, repair, secondhand, free tier), include it.',
        'Every score needs provenance: { note, source (absolute URL), asof }.',
        'Prefer regulators, filings, methodology pages and certification directories over a brand describing itself.',
        'Then: node research/lens_check.js ' + id + ' && node scripts/swarm.mjs sources ' + id,
      ],
    },
  };
  writeJson(file, lens);
  console.log(`Wrote ${path.relative(ROOT, file)} for ${decision.path}`);
  console.log(`It will fail research/lens_check.js until the FILL IN HERE markers are gone. That is the point.`);
}

/* A hallucinated citation is usually a URL that does not resolve. This cannot tell you whether a
   page says what a note claims, and it is not trying to. It catches the cheaper lie. */
async function sources(cid) {
  const files = fs.readdirSync(LENS_DIR).filter((f) => f.endsWith('.json'));
  let lens = null;
  for (const file of files) {
    const data = readJson(path.join(LENS_DIR, file));
    if (data.meta && data.meta.id === cid) { lens = data; break; }
  }
  if (!lens) {
    console.log(`No lens with cid "${cid}".`);
    process.exit(1);
  }
  const urls = new Map();
  for (const product of lens.products || []) {
    for (const [key, entry] of Object.entries(product.provenance || {})) {
      if (entry && typeof entry === 'object' && /^https?:\/\//i.test(entry.source || '')) {
        if (!urls.has(entry.source)) urls.set(entry.source, []);
        urls.get(entry.source).push(`${product.code}.${key}`);
      }
    }
  }
  if (!urls.size) {
    console.log(`${cid}: no absolute source URLs to check.`);
    return;
  }
  console.log(`${cid}: checking ${urls.size} distinct source URLs`);

  const list = [...urls.keys()];
  const dead = [];
  const unverified = [];
  let ok = 0;
  const LIMIT = 6;
  let cursor = 0;

  async function one(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      // HEAD first because it is cheap, then GET on ANY 4xx rather than only on 405 and 501.
      // idealist.org answers HEAD with 404 across its whole site, including its homepage, while GET
      // returns 200 with real content. The narrow fallback reported those pages as DEAD, which is
      // the worst failure available to a tool whose job is spotting invented citations: it accuses
      // a real source, and an agent that trusts it deletes good evidence. Checked before changing:
      // a genuinely missing page on that host 404s on GET too, so the wider fallback cannot hide a
      // real death, it only stops guessing from a method the server refuses to answer honestly.
      let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
      if (response.status >= 400) {
        response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
      }
      if (response.status === 404 || response.status === 410) dead.push([url, response.status]);
      else if (response.status >= 400) unverified.push([url, response.status]);
      else ok += 1;
    } catch (err) {
      const message = String((err && err.cause && err.cause.code) || (err && err.name) || err);
      // A name that does not resolve is the signature of an invented domain. A timeout is not.
      if (/ENOTFOUND|EAI_AGAIN/.test(message)) dead.push([url, message]);
      else unverified.push([url, message]);
    } finally {
      clearTimeout(timer);
    }
  }

  await Promise.all(Array.from({ length: Math.min(LIMIT, list.length) }, async () => {
    while (cursor < list.length) {
      const url = list[cursor++];
      await one(url);
    }
  }));

  console.log(`  reachable: ${ok}`);
  if (unverified.length) {
    console.log(`  unverified (blocked, slow, or behind a wall; not evidence of invention): ${unverified.length}`);
    for (const [url, why] of unverified.slice(0, 8)) console.log(`     ${why}  ${url}`);
  }
  if (dead.length) {
    console.log(`  DEAD: ${dead.length}`);
    for (const [url, why] of dead) {
      console.log(`     ${why}  ${url}`);
      console.log(`        cited by: ${urls.get(url).slice(0, 6).join(', ')}`);
    }
    console.log('A source that does not resolve is not a source. Replace it or drop the score.');
    process.exit(1);
  }
  console.log('SOURCES OK');
}

const [command, ...rest] = process.argv.slice(2);
switch (command) {
  case 'board': board(); break;
  case 'next': next(rest[0], Number(rest[1]) || 10); break;
  case 'claim': claim(rest[0], rest[1] || 'unnamed'); break;
  case 'release': release(rest[0]); break;
  case 'new': scaffold(rest[0]); break;
  case 'sources': await sources(rest[0]); break;
  default:
    console.log('usage: node scripts/swarm.mjs board | next <realm> [n] | claim <realm> <agent> | release <realm> | new <decision-id> | sources <cid>');
    process.exit(2);
}
