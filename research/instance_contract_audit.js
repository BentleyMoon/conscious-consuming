#!/usr/bin/env node
/* Every instance's decision surface must actually decide.

   WHY THIS EXISTS: the generality receipt (research/generality_release_audit.js) pins a
   reachable one-dial flip, but only for Kosplora. Instance #3, Where to Message, shipped live
   with three tradeoff dials and a recommendation that never changed at any setting of any dial.
   Signal won at 0 and at 100 on all three. Nothing caught it: the shell renders client-side so
   curl saw nothing, the voice audit reads copy rather than behaviour, and the generality receipt
   never loads a second lens.

   Three working sliders that cannot change the answer are worse than no sliders. They tell a
   person their choices are being used when the arithmetic ignores them, which is the exact
   claim this whole project exists to make true.

   So this audit discovers every lens rather than listing them, and holds all of them to the
   property Kosplora already had to prove. A fourth instance is covered the day it lands.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const engine = require('../app/engine.js');
const decision = require('../app/decision.js');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const receipts = [];

function lensFiles() {
  const found = [];
  const walk = (dir) => {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (entry.name === 'lens.js') found.push(rel.split(path.sep).join('/'));
    }
  };
  for (const root of ['kosplora', 'instances']) walk(root);
  return found.sort();
}

function loadLens(rel) {
  const sandbox = { window: {} };
  sandbox.window.window = sandbox.window;
  try {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  } catch (error) {
    failures.push(`${rel}: cannot evaluate (${error.message})`);
    return null;
  }
  return sandbox.window.OVS_LENS || sandbox.window.KOSPLORA_LENS || null;
}

function audit(rel) {
  const lens = loadLens(rel);
  if (!lens) return;
  const contract = lens.decision;
  if (!contract || !(contract.axes || []).length) {
    failures.push(`${rel}: no decision contract, so the instance ships a dead ranker`);
    return;
  }

  const dataset = { meta: { id: contract.category, label: (lens.meta || {}).title }, criteria: lens.criteria, products: lens.resources };
  const pool = { base: lens.resources.slice(), entries: lens.resources.slice(), floorFolded: [], personalFolded: [], personalHidden: 0 };
  const tieWeights = engine.themeDefaults(lens.criteria, {}, lens.key2theme);
  const run = (values) => decision.recipes({ engine, dataset, contract, pool, values, tieWeights });

  const base = run({});
  const archetypes = contract.archetypes || [];
  if (base.recipes.length !== archetypes.length) {
    failures.push(`${rel}: computed ${base.recipes.length}/${archetypes.length} zero-setup recipes`);
  }
  const baseline = base.recipes.find((row) => row.id === 'best-for-most');
  if (!baseline) { failures.push(`${rel}: no best-for-most answer at zero setup`); return; }

  // The property that matters: SOME single dial move must change the headline answer. A dial
  // only tilts weight between its own two criteria, so on a list with one dominant option the
  // tilt can be diluted below the leader's margin. That is a data-and-contract problem, and it
  // is invisible unless something sweeps the dials.
  let flip = null;
  const dead = [];
  for (const axis of contract.axes) {
    let moves = false;
    for (const value of [0, 25, 75, 100]) {
      // Fair to the dial: it counts as live if it changes ANY archetype's answer, not only the
      // headline. A dial that reorders strictest-match while best-for-most holds is doing real
      // work and a person can see it.
      for (const row of run({ [axis.id]: value }).recipes) {
        const was = base.recipes.find((r) => r.id === row.id);
        if (was && row.product.code !== was.product.code) {
          moves = true;
          if (!flip && row.id === 'best-for-most') flip = { axis: axis.id, value, from: baseline.product.name, to: row.product.name };
        }
      }
    }
    if (!moves) dead.push(axis.id);
  }

  if (!flip) {
    failures.push(`${rel}: no dial changes the answer at any setting; ${contract.axes.length} decorative slider(s) claiming to use choices they ignore`);
  } else if (dead.length) {
    failures.push(`${rel}: dial(s) that never change the answer: ${dead.join(', ')}. Cut them or repoint them at criteria that decide.`);
  }

  for (const axis of contract.axes) {
    const undeclared = (axis.criteria || []).filter((key) => !lens.criteria.some((row) => row.key === key));
    if (undeclared.length) failures.push(`${rel}: axis ${axis.id} weighs undeclared criteria (${undeclared.join(', ')})`);
    if (/how much (?:do )?you care|care about ethics|your values|ethical(?:ly)?/i.test(String(axis.question || ''))) {
      failures.push(`${rel}: axis ${axis.id} asks an identity question rather than a practical one`);
    }
  }

  // Two archetypes that always agree are one answer printed twice under two headings.
  const spread = new Set();
  for (const axis of contract.axes) for (const value of [0, 50, 100]) {
    for (const row of run({ [axis.id]: value }).recipes) spread.add(row.id + ':' + row.product.code);
  }
  const perArchetype = archetypes.map((id) => new Set([...spread].filter((k) => k.startsWith(id + ':')).map((k) => k.split(':')[1])));
  if (archetypes.length > 1 && perArchetype.every((set) => set.size === 1) && new Set(perArchetype.map((s) => [...s][0])).size === 1) {
    failures.push(`${rel}: every archetype returns the same option at every setting, so "${archetypes.join(' and ')}" is one answer twice`);
  }

  receipts.push(`  ${rel}: ${lens.resources.length} options · ${contract.axes.length} ${contract.axes.length === 1 ? 'axis' : 'axes'} · flip ${flip ? `${flip.from} -> ${flip.to} (${flip.axis}=${flip.value})` : 'NONE'}`);
}

function main() {
  console.log('Instance decision-contract audit');
  const files = lensFiles();
  if (!files.length) failures.push('no lens files discovered; the walker is looking in the wrong place');
  for (const rel of files) audit(rel);

  for (const line of receipts) console.log(line);
  if (failures.length) {
    console.error(`INSTANCE CONTRACT AUDIT FAIL (${failures.length})`);
    failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exit(1);
  }
  console.log(`  instances checked: ${files.length}`);
  console.log('INSTANCE CONTRACT AUDIT PASS');
}

main();
