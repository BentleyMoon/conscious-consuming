/* Hardening: federation works on CC's own `products` datasets (engine v0.8 — entity-field-agnostic), and the
   local patch OVERLAY (the receiving half) applies/reflects/clears reproducibly, never mutates the originals,
   and FLAGS corrections that target missing data instead of silently doing nothing. All via the real engine. */
const e = require('../app/engine.js');
let p = 0, f = 0; const ok = (L, c) => { c ? p++ : f++; console.log((c ? 'PASS ' : 'FAIL ') + L); };

// A CC-style dataset uses `products` (not the portable-lens `resources`) — the field the engine must now handle.
const mk = () => ({ meta:{ id:'banking', label:'Ethical banking', type:'Services' },
  criteria:[{key:'ethics',label:'Ethics',tier:'assessed'},{key:'fees',label:'Fees',tier:'measured'}],
  products:[
    {code:'chase',   name:'Chase',   brand:'big',  scores:{ethics:30,fees:40}, provenance:{}},
    {code:'triodos', name:'Triodos', brand:'coop', scores:{ethics:92,fees:60}, provenance:{}}
  ]});
const patch = { ops:[ {op:'set-score', code:'chase', key:'ethics', value:5, source:'https://report.org', note:'fossil financing'} ] };

// 1) products-aware mergeLens (the v0.8 change — was resources-only)
const orig = mk();
const m = e.mergeLens(orig, [patch]);
ok('set-score applies to a PRODUCTS dataset (chase.ethics 30 -> 5)', m.lens.products.find(r=>r.code==='chase').scores.ethics === 5);
ok('the correction carries its source as provenance', m.lens.products.find(r=>r.code==='chase').provenance.ethics.source === 'https://report.org');
ok('mergeLens does NOT mutate the original products dataset', orig.products.find(r=>r.code==='chase').scores.ethics === 30);
const m2 = e.mergeLens(mk(), [{ ops:[ {op:'add-entity', entity:{code:'beneficial', name:'Beneficial State', scores:{ethics:88,fees:55}}} ] }]);
ok('add-entity appends to PRODUCTS (3 entries)', m2.lens.products.length === 3 && m2.lens.products.some(r=>r.code==='beneficial'));

// 2) hash + diff on products
const h = e.lensHash(mk());
ok('lensHash works on a products dataset (8-hex, stable)', /^[0-9a-f]{8}$/.test(h) && h === e.lensHash(mk()));
ok('lensHash changes when a product score changes', e.lensHash(m.lens) !== h);
ok('diffLens recovers the op from products', e.diffLens(mk(), m.lens).some(o=>o.op==='set-score' && o.code==='chase' && o.value===5));

// 3) resources lenses unchanged (no regression for portable lenses)
const rlens = { meta:{id:'r'}, resources:[{code:'x',scores:{a:1}}] };
ok('a resources lens still hashes (unchanged path)', /^[0-9a-f]{8}$/.test(e.lensHash(rlens)));
ok('mergeLens still applies to a resources lens', e.mergeLens(rlens,[{ops:[{op:'set-score',code:'x',key:'a',value:9}]}]).lens.resources[0].scores.a === 9);

// 4) overlay properties: reproducible, restorable, stackable
ok('overlay is reproducible (same patches -> identical result)',
   e.mergeLens(mk(),[patch]).lens.products.find(r=>r.code==='chase').scores.ethics === e.mergeLens(mk(),[patch]).lens.products.find(r=>r.code==='chase').scores.ethics);
ok('clearing the overlay restores the original facts (empty patch list)', e.mergeLens(mk(),[]).lens.products.find(r=>r.code==='chase').scores.ethics === 30);
const stk = e.mergeLens(mk(), [patch, {ops:[{op:'set-score',code:'triodos',key:'fees',value:99}]}]);
ok('two stacked corrections both apply', stk.lens.products.find(r=>r.code==='chase').scores.ethics===5 && stk.lens.products.find(r=>r.code==='triodos').scores.fees===99);

// 5) apply-safety: a correction to data you don't have is FLAGGED, not silently lost
const bad = e.mergeLens(mk(), [{ ops:[ {op:'set-score', code:'nonexistent', key:'ethics', value:1} ] }]);
ok('a correction to a missing entity is flagged (no-such-entity)', bad.log.some(l=>l.status==='no-such-entity'));
ok('that no-op patch changes nothing', bad.lens.products.find(r=>r.code==='chase').scores.ethics === 30);

console.log('\n' + p + ' passed, ' + f + ' failed');
process.exit(f ? 1 : 0);
