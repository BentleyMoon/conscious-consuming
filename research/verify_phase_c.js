// Phase C verification: load the built bundle and assert every basis landed.
const fs = require('fs');
const window = {};
eval(fs.readFileSync('app/data.js', 'utf8'));
const B = window.CC_BUNDLE;
const food = B.data['plant-based-milk'], svc = B.data['digital-services'],
      med = B.data['learning-resources'], org = B.data['mission-businesses'],
      init = B.data['causes-to-support'];
const hasCrit = (ds, k) => ds.criteria.some(c => c.key === k);
const find = (ds, code) => ds.products.find(p => p.code === code);

// food economical extremes (cheaper -> higher economical)
const fe = food.products.filter(p => p.scores.economical != null)
  .map(p => ({ e: p.scores.economical, prov: p.provenance.economical }));
fe.sort((a, b) => a.e - b.e);

const checks = {
  "C2 ontology present": !!(B.ontology && B.ontology.types && B.ontology.types.length === 5),
  "C2 ontology has facet": JSON.stringify(B.ontology).includes('"facet"'),
  "C1 links on services": !!(svc.products[0].links && svc.products[0].links.length),
  "C1 region on services": !!(svc.products[0].region),
  "C1 org description": !!(find(org, 'patagonia').description),
  "C1 org focuses (n)": (find(org, 'patagonia').focuses || []).length,
  "C1 org link": find(org, 'patagonia').links[0].url,
  "C1 initiative link": find(init, 'against-malaria').links[0].url,
  "C3 economical in services": hasCrit(svc, 'economical'),
  "C3 economical in media": hasCrit(med, 'economical'),
  "C3 economical in orgs": hasCrit(org, 'economical'),
  "C3 economical NOT in initiatives (correct)": !hasCrit(init, 'economical'),
  "C3 'Most affordable' preset (media)": !!med.meta.presets['Most affordable'],
  "C3 food economical (Open Prices)": hasCrit(food, 'economical'),
  "C3 food priced count": food.meta.priced,
  "C3 food cheapest economical": fe.length ? fe[fe.length - 1].e : null,
  "C3 food priciest economical": fe.length ? fe[0].e : null,
  "C3 food price provenance sample": fe.length ? fe[fe.length - 1].prov : null,
};
let ok = true;
for (const [k, v] of Object.entries(checks)) {
  const pass = v !== false && v != null && v !== 0;
  if (!pass) ok = false;
  console.log((pass ? 'PASS ' : 'FAIL ') + k + ' = ' + JSON.stringify(v));
}
console.log(ok ? '\nALL CHECKS PASS' : '\nSOME CHECKS FAILED');
// It said SOME CHECKS FAILED and exited 0, so a failure read as a failure and shipped anyway.
// Branch on the verdict it already computed.
process.exit(ok ? 0 : 1);
