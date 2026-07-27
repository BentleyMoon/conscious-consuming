/* Interop: a community's aggregated ratings (the Commons) → a forkable, values-rankable LENS.
   Proves the discussion layer (server) and the decision layer (files) meet on one data shape. */
const e = require('../app/engine.js');
let p = 0, f = 0; const ok = (L, c) => { c ? p++ : f++; console.log((c ? 'PASS ' : 'FAIL ') + L); };

const criteria = [
  { key:'ethics', label:'Ethics', tier:'assessed' },
  { key:'quality', label:'Quality', tier:'assessed' },
  { key:'sustainability', label:'Sustainability', tier:'assessed' }
];
const ratings = [
  { code:'brand-a', name:'Brand A', brand:'co-op', scores:{ethics:85, quality:70, sustainability:90}, voters:42 },
  { code:'brand-b', name:'Brand B', brand:'big',  scores:{ethics:30, quality:80, sustainability:25}, voters:31 },
  { code:'brand-c', name:'Brand C',               scores:{ethics:60, quality:55}, voters:5 }   // partial data
];
const lens = e.lensFromRatings(ratings, { id:'coffee-commons', title:'Coffee — Community', criteria });

ok('produces a valid OVS lens', !!lens.meta && lens.criteria.length === 3 && lens.themes.length === 3 && lens.resources.length === 3);
ok('ratings became scores with community provenance', lens.resources[0].scores.ethics === 85 && lens.resources[0].provenance.ethics.source === 'the Commons' && /42 voters/.test(lens.resources[0].provenance.ethics.note));
ok('default themes/key2theme derived (each criterion is its own value)', lens.key2theme.ethics === 'ethics' && lens.themes[0].id === 'ethics');
ok('the ENGINE ranks the crowd-lens by YOUR values (ethics+sustainability → Brand A)', (() => {
  const w = e.themeDefaults(lens.criteria, { ethics:5, quality:3, sustainability:5 }, lens.key2theme);
  const r = lens.resources.map(x => [x, e.score(x, { criteria:lens.criteria, weights:w })]).filter(x => x[1]).sort((a,b)=>b[1].score-a[1].score);
  return r[0][0].code === 'brand-a';
})());
ok('it is a REAL lens — forkable in the Workshop (mergeLens + lensHash)', (() => {
  const m = e.mergeLens(lens, [{ by:'sam', ops:[{ op:'set-score', code:'brand-b', key:'ethics', value:50, source:'an audit' }] }]);
  return m.lens.resources.find(r => r.code === 'brand-b').scores.ethics === 50 && !!e.lensHash(lens);
})());
ok('a passport drives a SLATE over the crowd-lens (the whole loop closes)', (() => {
  const L = e.lensFromRatings(ratings, { id:'c', title:'C', criteria, universalToLocal:{ people:'ethics', quality:'quality', planet:'sustainability' } });
  const S = e.buildSlate({ values:{ people:5, planet:5, quality:2 } }, L, {});
  return S.endorse.length > 0 && S.endorse[0].code === 'brand-a';
})());

console.log(p + ' passed, ' + f + ' failed');
process.exit(f ? 1 : 0);
