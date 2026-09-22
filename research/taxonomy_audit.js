#!/usr/bin/env node
/* Taxonomy audit.

   Guards content/taxonomy.json, the map of what there is to decide about, against the two ways a
   map goes quietly wrong: it stops agreeing with the navigation it is supposed to describe, and it
   starts claiming coverage it does not have.

   HOW THIS AUDIT IS BUILT, AND WHY. Every subject is derived from the artifacts themselves. There
   is no list of expected ids in this file, because a gate built on a hand-maintained allowlist can
   only ever confirm its own list. The counts are recomputed from the realms and compared against
   the counts the file publishes about itself, so the map cannot misreport its own coverage.

   NINE BITES, NOT ONE. The standing failure across this codebase's gates is audits that have never
   been observed to fail: a check that has only ever passed is a check whose failure path is
   untested, and several have turned out to be incapable of failing at all. Each class of check
   here is proved separately by breaking exactly that thing in an in-memory copy and requiring the
   matching error. A bite that fires the wrong error is a failure, so the proofs cannot pass each
   other's exams.

   Run: node research/taxonomy_audit.js
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REASON_MIN = 24;

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/* Deliberately re-implemented rather than imported from the compiler. An audit that borrows the
   builder's own slug function cannot catch the builder's own slug bug. */
function slug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function flatten(taxonomy) {
  const out = [];
  for (const realm of taxonomy.realms || []) {
    for (const field of realm.fields || []) {
      for (const family of field.families || []) {
        for (const decision of family.decisions || []) {
          out.push({ decision, family, field, realm });
        }
      }
    }
  }
  return out;
}

function inspect(taxonomy, ontology, index) {
  const errors = [];
  const expect = (ok, message) => { if (!ok) errors.push(message); };

  const flat = flatten(taxonomy);
  const decisions = flat.map((entry) => entry.decision);

  // 1. IDENTITY. A decision id is the unit of work a content agent claims, so a collision is two
  //    agents unknowingly writing the same page.
  const seen = new Map();
  for (const d of decisions) {
    const key = `${d.id}\u0000${d.facet || ''}`;
    if (seen.has(key)) errors.push(`duplicate decision id ${d.id}${d.facet ? ` (facet ${d.facet})` : ''}`);
    seen.set(key, d);
    expect(slug(d.label).length > 0, `decision with empty label under ${d.path}`);
    expect(d.path === `${d.realm}/${d.field}/${d.family}/${d.id}`, `${d.id}: path disagrees with its own placement`);
  }

  // 2. NO EMPTY BRANCHES. An empty branch is a heading that promises a shelf and holds nothing,
  //    which is how a catalogue comes to look larger than it is.
  for (const realm of taxonomy.realms || []) {
    expect((realm.fields || []).length > 0, `${realm.id}: realm holds no fields`);
    expect(String(realm.edge || '').length > 40, `${realm.id}: realm has no written edge saying where it stops`);
    for (const field of realm.fields || []) {
      expect((field.families || []).length > 0, `${realm.id}/${field.id}: field holds no families`);
      for (const family of field.families || []) {
        expect((family.decisions || []).length > 0, `${realm.id}/${field.id}/${family.id}: family holds no decisions`);
      }
    }
  }

  // 3. SCOPE IS ARGUED, NOT ASSERTED. Anything held back or refused carries a written reason. A
  //    refusal without one is indistinguishable from an omission, and the difference between those
  //    two is the whole claim this map makes about being complete on purpose.
  for (const d of decisions) {
    const scopes = ['covered', 'open', 'hold', 'out'];
    expect(scopes.includes(d.scope), `${d.id}: scope "${d.scope}" is not one of ${scopes.join(', ')}`);
    if (d.scope === 'hold' || d.scope === 'out') {
      expect(String(d.reason || '').length >= REASON_MIN,
        `${d.id}: scope "${d.scope}" carries no written reason`);
    }
    if (d.scope === 'covered') expect(Boolean(d.cid), `${d.id}: covered but names no dataset`);
    if (d.scope === 'open') expect(!d.cid, `${d.id}: open but names a dataset`);
  }

  // 4. THE MAP AGREES WITH WHAT IS BUILT. Every dataset the app actually ships has to sit
  //    somewhere on the map, or the map is a map of a different catalogue.
  const byCid = new Map();
  for (const d of decisions) {
    if (!d.cid) continue;
    if (!byCid.has(d.cid)) byCid.set(d.cid, []);
    byCid.get(d.cid).push(d);
  }
  for (const [cid, group] of byCid) {
    const facets = group.map((d) => d.facet || '');
    const distinct = new Set(facets);
    expect(group.length === 1 || (distinct.size === facets.length && !distinct.has('')),
      `cid ${cid} is claimed by ${group.length} decisions without distinct facets`);
  }
  const built = new Set(((index && index.categories) || []).map((c) => c.id));
  for (const id of built) expect(byCid.has(id), `built dataset ${id} is not placed anywhere on the map`);
  for (const cid of byCid.keys()) expect(built.has(cid), `map claims dataset ${cid}, which the app does not ship`);

  // 5. THE MAP COVERS THE NAVIGATION. Every row the live site can show resolves to a decision, an
  //    alias, or the branch that replaced it.
  const homes = new Set();
  for (const d of decisions) {
    homes.add(d.id);
    homes.add(slug(d.label));
    for (const alias of d.aka || []) homes.add(slug(alias));
  }
  for (const realm of taxonomy.realms || []) {
    homes.add(slug(realm.label));
    for (const field of realm.fields || []) {
      homes.add(field.id);
      for (const alias of field.aka || []) homes.add(slug(alias));
      for (const family of field.families || []) {
        homes.add(family.id);
        for (const alias of family.aka || []) homes.add(slug(alias));
      }
    }
  }
  const rows = [];
  for (const domain of (ontology && ontology.domains) || []) {
    for (const row of domain.categories || []) rows.push({ ...row, domain: domain.label });
  }
  for (const row of rows) {
    if (row.cid) expect(byCid.has(row.cid), `navigation row "${row.label}" (cid ${row.cid}) has no home on the map`);
    else expect(homes.has(slug(row.label)), `navigation row "${row.label}" (${row.domain}) has no home on the map`);
  }

  // 6. FACETS ARE CLOSED SETS. An open-ended facet is a free-text field, and a free-text field is
  //    where a taxonomy goes to become a spreadsheet.
  const facets = taxonomy.facets || {};
  const allowed = (name) => new Set((facets[name] && facets[name].values) || []);
  for (const name of ['need', 'type', 'mode', 'cadence', 'actor']) {
    const values = allowed(name);
    expect(values.size > 0, `facet ${name} declares no values`);
    for (const d of decisions) {
      expect(values.has(d[name]), `${d.id}: ${name} "${d[name]}" is not a declared value`);
    }
  }
  for (const need of allowed('need')) {
    expect(decisions.some((d) => d.need === need && d.scope !== 'out'),
      `need ${need} holds no decisions in scope`);
  }

  // 7. THE EXTERNAL REFEREE. Completeness against a list this project wrote itself is an opinion.
  //    Every division of the UN's classification of what people consume has to be claimed by some
  //    realm, so that "we cover everything" is a check somebody else can run.
  const divisions = (taxonomy.coicop && taxonomy.coicop.divisions) || {};
  expect(Object.keys(divisions).length > 0, 'no COICOP divisions declared');
  for (const code of Object.keys(divisions)) {
    const claimed = (taxonomy.realms || []).filter((r) => (r.coicop || []).includes(code));
    expect(claimed.length > 0, `COICOP division ${code} (${divisions[code]}) is claimed by no realm`);
  }
  for (const realm of taxonomy.realms || []) {
    for (const code of realm.coicop || []) {
      expect(code === 'none' || Object.prototype.hasOwnProperty.call(divisions, code),
        `${realm.id}: coicop "${code}" is not a declared division`);
    }
  }

  // 8. THE FILE CANNOT MISREPORT ITSELF. Coverage is published as a number, so the number is
  //    recomputed here from the realms rather than trusted.
  const counted = {
    realms: (taxonomy.realms || []).length,
    fields: (taxonomy.realms || []).reduce((n, r) => n + (r.fields || []).length, 0),
    families: (taxonomy.realms || []).reduce((n, r) =>
      n + (r.fields || []).reduce((m, f) => m + (f.families || []).length, 0), 0),
    decisions: decisions.length,
    inScope: decisions.filter((d) => d.scope !== 'out').length,
    covered: decisions.filter((d) => d.scope === 'covered').length,
    open: decisions.filter((d) => d.scope === 'open').length,
    hold: decisions.filter((d) => d.scope === 'hold').length,
    out: decisions.filter((d) => d.scope === 'out').length,
    datasets: byCid.size,
  };
  for (const key of Object.keys(counted)) {
    expect((taxonomy.counts || {})[key] === counted[key],
      `published count ${key}=${(taxonomy.counts || {})[key]} disagrees with recount ${counted[key]}`);
  }
  const pct = Math.round((1000 * counted.covered) / Math.max(1, counted.inScope)) / 10;
  expect((taxonomy.counts || {}).coveredPercent === pct,
    `published coverage ${(taxonomy.counts || {}).coveredPercent}% disagrees with recount ${pct}%`);

  return {
    errors,
    receipt: {
      ...counted,
      coveredPercent: pct,
      navigationRows: rows.length,
      divisions: Object.keys(divisions).length,
    },
  };
}

/* Each bite breaks exactly one thing and names the error it must produce. A bite whose mutation
   trips a different check has not proved the check it claims to prove. */
const BITES = [
  {
    what: 'duplicated a decision id',
    pattern: /duplicate decision id/,
    break: (t) => {
      const a = t.realms[0].fields[0].families[0].decisions[0];
      const b = t.realms[1].fields[0].families[0].decisions[0];
      b.id = a.id;
      b.path = `${b.realm}/${b.field}/${b.family}/${b.id}`;
      delete b.facet;
      delete a.facet;
    },
  },
  {
    what: 'emptied a family',
    pattern: /family holds no decisions/,
    break: (t) => { t.realms[0].fields[0].families[0].decisions = []; },
  },
  {
    what: 'removed the written reason from a refusal',
    pattern: /carries no written reason/,
    break: (t) => {
      for (const d of flatten(t).map((e) => e.decision)) {
        if (d.scope === 'out' || d.scope === 'hold') { d.reason = 'no'; return; }
      }
      throw new Error('no held or refused decision to bite');
    },
  },
  {
    what: 'unplaced a built dataset',
    pattern: /is not placed anywhere on the map/,
    break: (t) => {
      for (const d of flatten(t).map((e) => e.decision)) {
        if (d.cid && !d.facet) { delete d.cid; d.scope = 'open'; return; }
      }
      throw new Error('no unfaceted dataset to bite');
    },
  },
  {
    what: 'took a navigation row its home',
    pattern: /has no home on the map/,
    /* This one has to find a decision some navigation row actually depends on. Renaming an
       arbitrary decision proves nothing, because most decisions are new and no row points at
       them: the first version of this bite passed the mutation and taught nothing. */
    break: (t, ontology) => {
      const gaps = [];
      for (const dom of ontology.domains || []) {
        for (const row of dom.categories || []) if (!row.cid) gaps.push(slug(row.label));
      }
      for (const e of flatten(t)) {
        const d = e.decision;
        const names = new Set([d.id, slug(d.label), ...(d.aka || []).map(slug)]);
        const depended = gaps.find((g) => names.has(g));
        if (!depended) continue;
        d.label = 'Xyzzy placeholder';
        d.id = 'xyzzy-placeholder';
        d.path = `${d.realm}/${d.field}/${d.family}/xyzzy-placeholder`;
        delete d.aka;
        return;
      }
      throw new Error('no decision that a navigation row depends on');
    },
  },
  {
    what: 'gave a decision a facet value outside the declared set',
    pattern: /is not a declared value/,
    break: (t) => { t.realms[0].fields[0].families[0].decisions[0].mode = 'barter'; },
  },
  {
    what: 'left a COICOP division claimed by nobody',
    pattern: /is claimed by no realm/,
    break: (t) => { for (const r of t.realms) r.coicop = ['none']; },
  },
  {
    what: 'overstated the published decision count',
    pattern: /disagrees with recount/,
    break: (t) => { t.counts.decisions += 500; },
  },
  {
    what: 'let two decisions claim one dataset without distinct facets',
    pattern: /without distinct facets/,
    break: (t) => {
      for (const d of flatten(t).map((e) => e.decision)) {
        if (d.cid && d.facet) { delete d.facet; return; }
      }
      throw new Error('no faceted dataset to bite');
    },
  },
];

function main() {
  const taxonomy = readJson('content/taxonomy.json');
  const ontology = readJson('content/ontology.json');
  const index = fs.existsSync(path.join(ROOT, 'app/data/index.json')) ? readJson('app/data/index.json') : null;

  const result = inspect(taxonomy, ontology, index);
  const r = result.receipt;

  console.log('Taxonomy audit');
  console.log(`  ${r.realms} realms -> ${r.fields} fields -> ${r.families} families -> ${r.decisions} decisions`);
  console.log(`  in scope ${r.inScope}: built ${r.covered} (${r.coveredPercent}%), open ${r.open}, held ${r.hold}; refused ${r.out}`);
  console.log(`  ${r.navigationRows} navigation rows resolved, ${r.datasets} datasets placed, ${r.divisions} COICOP divisions claimed`);

  if (result.errors.length) {
    console.log(`TAXONOMY AUDIT FAILED (${result.errors.length})`);
    for (const error of result.errors.slice(0, 40)) console.log(`  FAIL ${error}`);
    if (result.errors.length > 40) console.log(`  ... and ${result.errors.length - 40} more`);
    process.exit(1);
  }

  for (const bite of BITES) {
    const broken = clone(taxonomy);
    try {
      bite.break(broken, ontology);
    } catch (err) {
      console.log(`TAXONOMY AUDIT FAILED (bite "${bite.what}" could not be applied: ${err.message})`);
      process.exit(1);
    }
    const bitten = inspect(broken, ontology, index);
    const caught = bitten.errors.filter((e) => bite.pattern.test(e));
    if (!caught.length) {
      console.log(`TAXONOMY AUDIT FAILED (bite "${bite.what}" produced no matching error)`);
      for (const e of bitten.errors.slice(0, 5)) console.log(`    saw: ${e}`);
      process.exit(1);
    }
    console.log(`  bite proof: ${bite.what} -> ${caught.length} matching error${caught.length === 1 ? '' : 's'}`);
  }

  const restored = inspect(taxonomy, ontology, index);
  if (restored.errors.length) {
    console.log('TAXONOMY AUDIT FAILED (source did not pass after in-memory mutation proofs)');
    process.exit(1);
  }

  console.log(`  ${BITES.length} of ${BITES.length} checks proved able to fail`);
  console.log('TAXONOMY AUDIT PASS');
}

main();
