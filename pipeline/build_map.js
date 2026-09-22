#!/usr/bin/env node
/* Publish the whole map to the app, so the spatial view can show what is not built yet.

   The lens has only ever seen content/ontology.json: 8 needs, 18 areas, 39 kinds and the 122
   decisions that have a dataset. That is the navigation, and it is the right thing to walk when
   you are choosing something. It is the wrong thing to look at when you want to know what this
   catalogue is, because 946 decisions the map already names are simply absent from it, and a
   reader zooming out sees a finished directory of 122 rather than a map with most of its ground
   still open.

   This writes the map spine to app/data/map.json: sixteen domains of life, their fields and
   families, and every decision with the state the taxonomy gave it. Built decisions carry their
   cid so the lens can route to the dataset; open, held and refused ones carry their reason state
   so the lens can draw them as ground that exists and is not covered.

   It is NOT loaded at startup. app/data/index.json stays the boot payload and this file is
   fetched only when a reader travels to the wide rungs, because the payload budget is already a
   known debt and a map of a thousand decisions is not something every visit should pay for.

   Run: node pipeline/build_map.js   (part of npm run build) */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'content', 'taxonomy.json');
const OUT = path.join(ROOT, 'app', 'data', 'map.json');

// Scope words as the reader meets them. "covered" is build vocabulary; a person reading the map
// wants to know whether there is an answer here, not which internal state the compiler used.
const STATE = { covered: 'built', open: 'open', hold: 'held', out: 'refused' };

function main() {
  const taxonomy = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const realms = [];
  const totals = { realms: 0, fields: 0, families: 0, decisions: 0, built: 0, open: 0, held: 0, refused: 0 };

  for (const realm of taxonomy.realms || []) {
    const fields = [];
    for (const field of realm.fields || []) {
      const families = [];
      for (const family of field.families || []) {
        const decisions = [];
        for (const decision of family.decisions || []) {
          const state = STATE[decision.scope] || decision.scope;
          const row = { id: decision.id, label: decision.label, state: state, need: decision.need };
          if (decision.cid) row.cid = decision.cid;
          decisions.push(row);
          totals.decisions += 1;
          totals[state === 'built' ? 'built' : state] += 1;
        }
        if (!decisions.length) continue;
        families.push({ id: family.id, label: family.label, decisions: decisions });
        totals.families += 1;
      }
      if (!families.length) continue;
      fields.push({ id: field.id, label: field.label, families: families });
      totals.fields += 1;
    }
    if (!fields.length) continue;
    realms.push({ id: realm.id, label: realm.label, need: realm.need, edge: realm.edge || '', fields: fields });
    totals.realms += 1;
  }

  const doc = {
    format: 'open-values-map',
    version: '1.0.0',
    built: taxonomy.built || new Date().toISOString().slice(0, 10),
    purpose: 'The whole map, for the spatial view: every decision the catalogue names, built or not.',
    consumer: 'app/homelens.js wide rungs; lazily fetched, never part of the boot payload.',
    source: 'content/taxonomy.json',
    states: {
      built: 'A dataset exists and the decision is answerable today.',
      open: 'Named on the map, nobody has built it yet.',
      held: 'Deliberately not built, with a written reason in the realm outline.',
      refused: 'Out of scope, with a written reason in the realm outline.'
    },
    totals: totals,
    realms: realms
  };

  const text = JSON.stringify(doc) + '\n';
  const before = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (before === text) {
    console.log(`build_map: output current (${totals.decisions} decisions, ${totals.built} built)`);
    return;
  }
  fs.writeFileSync(OUT, text);
  const kb = Math.round(Buffer.byteLength(text) / 1024);
  console.log(`build_map: wrote app/data/map.json (${totals.realms} domains, ${totals.fields} fields, ` +
              `${totals.families} families, ${totals.decisions} decisions, ${totals.built} built, ${kb} KB)`);
}

main();
