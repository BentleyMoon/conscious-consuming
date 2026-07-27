/* K4b: federation of FACTS. A lens is a file → fork it, patch it, merge patches, reproducibly, with
   attribution; a corrected fact changes a verdict; diff round-trips. All through the real engine. */
const e = require('../app/engine.js');
let p = 0, f = 0; const ok = (L, c) => { c ? p++ : f++; console.log((c ? 'PASS ' : 'FAIL ') + L); };

const base = { meta:{ id:'demo', title:'Demo' },
  criteria:[{key:'a',label:'A',tier:'measured'},{key:'b',label:'B',tier:'assessed'}],
  resources:[
    {code:'x', name:'X', brand:'one', scores:{a:50,b:50}, provenance:{}},
    {code:'y', name:'Y', brand:'two', scores:{a:80,b:20}, provenance:{}}
  ]};

// A community correction (with a source) + a new option contributed by someone else
const patch1 = { by:'sam', note:'fix A', ops:[ {op:'set-score', code:'x', key:'a', value:95, source:'gov dataset 2026', note:'measured'} ] };
const patch2 = { by:'lee', note:'add Z', ops:[ {op:'add-entity', entity:{code:'z', name:'Z', brand:'three', scores:{a:70,b:70}, provenance:{}}, source:'vendor docs'} ] };

const merged = e.mergeLens(base, [patch1, patch2]);
const x = merged.lens.resources.find(r => r.code === 'x');
const z = merged.lens.resources.find(r => r.code === 'z');
ok('set-score applied (x.a 50 -> 95)', x.scores.a === 95);
ok('correction carries its source as provenance', x.provenance.a && x.provenance.a.source === 'gov dataset 2026');
ok('add-entity applied (Z present, 3 entities)', !!z && merged.lens.resources.length === 3);
ok('change log attributes each change to its author', merged.log[0].by === 'sam' && merged.log[1].by === 'lee');
ok('log records from -> to + source', merged.log[0].from === 50 && merged.log[0].to === 95 && merged.log[0].source === 'gov dataset 2026');

// base is untouched (pure)
ok('merge does not mutate the base lens', base.resources.find(r => r.code === 'x').scores.a === 50 && base.resources.length === 2);

// reproducible: same files -> identical merged lens
const merged2 = e.mergeLens(base, [patch1, patch2]);
ok('reproducible (same patches -> identical lens)', JSON.stringify(merged.lens) === JSON.stringify(merged2.lens));

// clamp + bad-target are handled, not crashing
const odd = e.mergeLens(base, [{ by:'x', ops:[ {op:'set-score',code:'x',key:'a',value:150}, {op:'set-score',code:'nope',key:'a',value:1} ] }]);
ok('value clamps to 0..100', odd.lens.resources.find(r=>r.code==='x').scores.a === 100);
ok('patch against a missing entity is logged, not fatal', odd.log.some(l => l.status === 'no-such-entity'));

// a corrected FACT changes the VERDICT (the point of federating facts)
const ctx = { criteria: base.criteria, weights:{a:5,b:1} };
const before = e.score(base.resources.find(r=>r.code==='x'), ctx).score;
const after  = e.score(x, ctx).score;
ok('correcting a heavily-weighted fact moves the score', after > before);

// fork stamps parentage + a verifiable hash
const fork = e.forkLens(base, { id:'demo-eu', title:'Demo (EU)' });
ok('fork records forkedFrom id + base hash', fork.meta.forkedFrom.id === 'demo' && fork.meta.forkedFrom.hash === e.lensHash(base));
ok('lensHash changes once facts change', e.lensHash(base) !== e.lensHash(merged.lens));

// diff is the inverse of merge: diff(base, merged) re-applied to base reconstructs merged
const ops = e.diffLens(base, merged.lens);
const round = e.mergeLens(base, [{ by:'roundtrip', ops: ops }]);
ok('diffLens round-trips (diff then merge == merged)', JSON.stringify(round.lens) === JSON.stringify(merged.lens));

// K4 hardening: a patch can declare the lens hash it targets; a mismatch is flagged, never silently merged
const bh = e.lensHash(base);
ok('matching baseHash -> no mismatch flag', !e.mergeLens(base, [{ by:'sam', baseHash:bh, ops:[{op:'set-score',code:'x',key:'a',value:60}] }]).log.some(l => l.status === 'base-mismatch'));
const sm = e.mergeLens(base, [{ by:'sam', baseHash:'deadbeef', ops:[{op:'set-score',code:'x',key:'a',value:60}] }]).log.find(l => l.status === 'base-mismatch');
ok('stale baseHash -> flagged with expected + got', !!sm && sm.expected === 'deadbeef' && sm.got === bh);
ok('no baseHash -> back-compatible (no flag)', !e.mergeLens(base, [{ by:'x', ops:[{op:'set-score',code:'x',key:'a',value:60}] }]).log.some(l => l.status === 'base-mismatch'));

console.log(p + ' passed, ' + f + ' failed');
process.exit(f ? 1 : 0);
