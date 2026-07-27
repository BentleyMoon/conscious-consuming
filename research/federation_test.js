/* K4 federation test: many passports -> a collective stance, reproducibly, with honest dissent;
   and the collective passport carrying into an instance via the shared core. All through the real engine. */
const e = require('../app/engine.js');
let p = 0, f = 0; const ok = (L, c) => { c ? p++ : f++; console.log((c ? 'PASS ' : 'FAIL ') + L); };

// three people: unanimous on planet, split on openness and access
const p1 = {values:{planet:5, openness:5, access:1}, source:'a'};
const p2 = {values:{planet:5, openness:1, access:1}, source:'b'};
const p3 = {values:{planet:5, openness:1, access:5}, source:'c'};
const m = e.mergePassports([p1, p2, p3], 'Test assembly');

ok('n = 3', m.n === 3);
ok('planet mean = 5', m.values.planet === 5);
ok('planet is unanimous (consensus 1)', m.agreement.planet.consensus === 1);
ok('openness is split (consensus < 0.5)', m.agreement.openness.consensus < 0.5);
ok('dissent ranks a split value first, the unanimous one last',
   m.dissent[m.dissent.length - 1] === 'planet' && m.agreement[m.dissent[0]].consensus < 0.5);
ok('omits values no one expressed (no joy invented)', m.values.joy === undefined);
ok('collective is itself a drop-in passport', m.passport.format === 'open-values-passport' && m.passport.values.planet === 5);

// reproducibility: same files -> byte-identical tally (the uncapturable property)
const m2 = e.mergePassports([p1, p2, p3], 'Test assembly');
ok('reproducible (same files -> identical result)', JSON.stringify(m) === JSON.stringify(m2));

// the collective carries into CC via the shared core, raise-toward (augments, never erases)
const UNIVERSAL2CC = {planet:'planet',people:'people',wellbeing:'health',openness:'honesty',autonomy:'privacy',animals:'animals',access:'cost',community:'local'};
const base = {planet:3,people:3,health:3,honesty:3,privacy:3,animals:3,cost:3,local:3};
const into = e.passportApply(m.passport, UNIVERSAL2CC, base);
ok('collective planet (5) -> CC planet theme = 5', into.weights.planet === 5);
ok('raise-toward: a sub-3 collective value does not LOWER a CC theme', into.weights.honesty === 3);

console.log(p + ' passed, ' + f + ' failed');
process.exit(f ? 1 : 0);
