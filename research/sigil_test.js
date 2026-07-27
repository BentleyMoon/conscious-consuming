/* Value-sigil test: deterministic, well-formed SVG, and genuinely value-derived (different profiles → different marks). */
const sigil = require('../app/sigil.js');
let p = 0, f = 0; const ok = (L, c) => { c ? p++ : f++; console.log((c ? 'PASS ' : 'FAIL ') + L); };

const balanced = { planet:3, people:3, openness:3, access:3, wellbeing:3, autonomy:3, animals:3, community:3, quality:3, joy:3 };
const planety  = { planet:5, people:4, openness:2, access:1, wellbeing:3, autonomy:1, animals:5, community:4, quality:3, joy:2 };
const opennessy= { planet:1, people:2, openness:5, access:5, wellbeing:2, autonomy:5, animals:1, community:2, quality:4, joy:3 };

const a = sigil(balanced), b = sigil(planety), c = sigil(opennessy);
ok('returns an <svg>…</svg> string', a.startsWith('<svg') && a.trim().endsWith('</svg>'));
ok('well-formed: equal <svg/</svg> + has polygon + circles', (a.match(/<svg/g)||[]).length===1 && a.includes('</svg>') && a.includes('<polygon') && (a.match(/<circle/g)||[]).length>=2);
ok('deterministic: same values → identical mark', sigil(planety) === b);
ok('value-derived: different profiles → different marks', a!==b && b!==c && a!==c);
ok('balanced profile draws a regular n-gon (all radii equal)', (()=>{const m=[...a.matchAll(/<circle[^>]*r="([\d.]+)"/g)].map(x=>+x[1]);const node=m.slice(1);return node.length>0 && node.every(r=>Math.abs(r-node[0])<0.01);})());
ok('a heavily-weighted value yields a longer spoke than a light one', (()=>{
  // planet (weight 5) node radius vs access (weight 1) node radius in `planety`
  const s=sigil({planet:5, access:1});
  const rs=[...s.matchAll(/<circle[^>]*r="([\d.]+)"/g)].map(x=>+x[1]).slice(1).sort((a,b)=>a-b);
  return rs.length>=2 && rs[rs.length-1] > rs[0];
})());
ok('empty values → still a valid svg (no crash)', sigil({}).startsWith('<svg'));
ok('respects size option', sigil(balanced,{size:200}).includes('width="200"'));

// --- the shareable passport card (sigil + values + tagline) ---
const card = sigil.passportCard(planety, { size: 600 });
ok('passportCard → valid svg at the requested size', card.startsWith('<svg') && card.trim().endsWith('</svg>') && card.includes('width="600"'));
ok('card shows the title + a value label + an embedded sigil', card.includes('MY VALUES PASSPORT') && card.includes('Planet') && card.includes('<polygon'));
ok('card carries the no-account promise (no personal data)', card.includes('no name · no account'));
ok('card is value-derived (differs by profile)', sigil.passportCard(planety) !== sigil.passportCard(opennessy));
ok('balanced profile → "Balanced" line', sigil.passportCard(balanced).includes('Balanced'));

// --- the collective card (Assembly): built from a real merge, shows share + split honestly ---
const e = require('../app/engine.js');
const COL = e.mergePassports([
  {nick:'Ada',values:{planet:5,people:4,openness:5,access:1,autonomy:5,community:4}},
  {nick:'Ben',values:{planet:5,people:5,openness:4,access:2,autonomy:1,community:5}},
  {nick:'Cy', values:{planet:4,people:3,openness:5,access:5,autonomy:5,community:2}},
  {nick:'Dee',values:{planet:5,people:5,openness:4,access:1,autonomy:1,community:5}}
], 'Maple Street co-op');
const ccard = sigil.collectiveCard(COL, { size: 600 });
ok('collectiveCard → valid svg naming the assembly', ccard.startsWith('<svg') && ccard.includes('Maple Street co-op') && ccard.includes('width="600"'));
ok('collective card: shared values + embedded sigil + honest split', ccard.includes('WHAT WE SHARE') && ccard.includes('Planet') && ccard.includes('<polygon') && (ccard.includes('still split on') || ccard.includes('remarkable agreement')));
ok('collective card surfaces the real split (Access / Autonomy)', ccard.includes('still split on') && (ccard.includes('Access') || ccard.includes('Autonomy')));
ok('collective card carries the no-server promise + voice count', ccard.includes('no server · no account') && ccard.includes('4 voices'));

// --- the shareable resemblance/metaphor card (G4): "X is the Y of Z" + the shared value-signature ---
const acard = sigil.analogyCard({ aName:'Fairphone', aCat:'Phones', bName:'Patagonia', bCat:'Clothing', resemblance:88, values:{planet:90,people:88,honesty:80} }, { size:600 });
ok('analogyCard → valid svg at the requested size', acard.startsWith('<svg') && acard.trim().endsWith('</svg>') && acard.includes('width="600"'));
ok('analogy card states "X is the Y of Z" + an embedded sigil', acard.includes('Fairphone') && acard.includes('Patagonia') && acard.includes('is the') && acard.includes('of Phones') && acard.includes('<polygon'));
ok('analogy card shows the resemblance % and stays honest', acard.includes('88%') && acard.includes('suggestion, never an endorsement'));

console.log(p + ' passed, ' + f + ' failed');
process.exit(f ? 1 : 0);
