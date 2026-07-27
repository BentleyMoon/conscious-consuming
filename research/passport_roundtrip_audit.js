#!/usr/bin/env node
/* The passport journey contract.

   A values file made anywhere must align everywhere: every surface that WRITES
   a passport must emit universal value ids, and every surface that READS one
   must accept the shared shape. The tour once exported its local theme ids
   (private/open/ease/reach); assembly imported the file happily and then could
   never align it with anyone else's values. This audit makes that class of bug
   impossible to ship quietly.
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const notes = [];

// The canonical universal value space. If this list ever changes, every writer
// and reader below changes with it, in the same commit.
const UNIVERSAL = ['planet','people','openness','access','wellbeing','autonomy','animals','community','quality','joy'];

function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { failures.push(`${rel}: missing file`); return ''; }
  return fs.readFileSync(abs, 'utf8');
}
function expect(cond, msg) { if (!cond) failures.push(msg); }

// Pull the value ids out of an object literal like {a:'x',b:'y'} captured by re.
function mappingTargets(text, re, which) {
  const m = text.match(re);
  if (!m) return null;
  const body = m[1];
  const out = [];
  const pairRe = which === 'keys' ? /([a-zA-Z_][\w-]*)\s*:/g : /:\s*'([^']+)'/g;
  let p; while ((p = pairRe.exec(body))) out.push(p[1]);
  return out;
}

/* --- Writer: the tour's Keep-this-file export --- */
{
  const tour = read('tour/index.html');
  expect(tour.includes("kind:'values-passport'"), 'tour: export must carry kind values-passport');
  expect(tour.includes("my-values-passport.json"), 'tour: export filename must be my-values-passport.json');
  const targets = mappingTargets(tour, /TO_UNIVERSAL\s*=\s*\{([^}]*)\}/, 'values');
  expect(Array.isArray(targets) && targets.length > 0, 'tour: TO_UNIVERSAL mapping must exist (local ids must translate before export)');
  (targets || []).forEach(t => expect(UNIVERSAL.includes(t), `tour: TO_UNIVERSAL maps to unknown universal id "${t}"`));
  if (targets) notes.push(`tour exports ${targets.length} universal ids`);
}

/* --- Reader: assembly's import gate --- */
{
  const asm = read('assembly/index.html');
  expect(/!p\s*\|\|\s*!p\.values/.test(asm) || /p\.values\s*&&/.test(asm) || /!p\.values/.test(asm),
    'assembly: addPassport must gate on p.values (the shared shape)');
  expect(asm.includes('values-passport') || asm.includes('values passport') || asm.includes('values files'),
    'assembly: import surface should speak the values-file language');
}

/* --- Writer: the app's own export --- */
{
  const app = read('app/app.js');
  expect(app.includes('exportValuesPassport'), 'app: exportValuesPassport must exist');
  expect(app.includes("my-values-passport.json"), 'app: export filename must be my-values-passport.json');
}

/* --- Bridges: every lens's universalToLocal keys live in the universal space --- */
{
  const lensFiles = ['instances/messages/lens.js', 'kosplora/index.html', 'tour/index.html'];
  let bridges = 0;
  for (const rel of lensFiles) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    const keys = mappingTargets(text, /universalToLocal\s*:\s*\{([^}]*)\}/, 'keys');
    if (!keys) continue;
    bridges++;
    keys.forEach(k => expect(UNIVERSAL.includes(k), `${rel}: universalToLocal keys from unknown universal id "${k}"`));
  }
  expect(bridges >= 1, 'at least one lens must carry a universalToLocal passport bridge');
  notes.push(`${bridges} passport bridge(s) checked`);
}

/* --- Writer: the instance press emits bridges from the same space --- */
{
  const press = read('instances/new/index.html');
  const ids = [];
  const re = /\['([a-z]+)','[A-Z][a-z]+'\]/g;
  let m; while ((m = re.exec(press))) ids.push(m[1]);
  expect(ids.length === UNIVERSAL.length, `press: universal picker must offer exactly ${UNIVERSAL.length} ids (found ${ids.length})`);
  ids.forEach(id => expect(UNIVERSAL.includes(id), `press: picker offers unknown universal id "${id}"`));
  expect(press.includes('universalToLocal'), 'press: pressed lenses must include the universalToLocal bridge');
  expect(press.includes('provenance'), 'press: pressed lenses must carry per-score provenance (source before score)');
}

if (failures.length) {
  console.log('Passport journey audit failures:');
  for (const f of failures) console.log(`  FAIL ${f}`);
  process.exit(1);
}
console.log('Passport journey audit');
for (const n of notes) console.log(`  ${n}`);
console.log(`  universal ids: ${UNIVERSAL.length}`);
console.log('PASSPORT JOURNEY CHECKS PASS');
