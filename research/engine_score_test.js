/* THE RANK — unit tests for engine.score (Standard v0 §6), the one function every ranking on every
   instance passes through. Before this file the arithmetic was exercised by audits that call score()
   but only one of them (the allergen exclusion in lines_audit) checked what came back, so the
   renormalisation, the confidence floor, the pull toward 50 and the dealbreaker cap could all have
   drifted with nothing going red. Each case is small enough to check by hand.
   Run: node research/engine_score_test.js */
const e = require('../app/engine.js');
let p = 0, f = 0; const ok = (L, c) => { c ? p++ : f++; console.log((c ? 'PASS ' : 'FAIL ') + L); };

const C = [
  { key: 'environment', label: 'Environment', tier: 'measured' },
  { key: 'ethics', label: 'Ethics', tier: 'certified' },
  { key: 'privacy', label: 'Privacy', tier: 'assessed' },
  { key: 'economical', label: 'Economical', tier: 'measured' },
];
const run = (scores, weights, extra) => e.score({ scores }, Object.assign({ criteria: C, weights }, extra || {}));

// The weighted mean, with full coverage.
let r = run({ environment: 80, privacy: 40 }, { environment: 3, privacy: 1 });
ok('full coverage is the plain weighted mean: (3·80 + 1·40) / 4 = 70', r.score === 70 && r.coverage === 1);
ok('facts and wanted count the weighted axes', r.facts === 2 && r.wanted === 2);
ok('why names the largest weighted contributions first', r.why[0] === 'Environment' && r.why[1] === 'Privacy');

// Missing data: renormalise over what is known, then pull toward 50 by the unknown share.
r = run({ environment: 90 }, { environment: 3, privacy: 1 });
ok('a missing axis is unknown, not 0: coverage is 3/4', r.coverage === 0.75);
ok('score = mean·coverage + 50·(1 − coverage) = 90·0.75 + 12.5 = 80', r.score === 80);
r = run({ environment: 10 }, { environment: 3, privacy: 1 });
ok('the same pull raises a weak entry: 10·0.75 + 12.5 = 20 (the documented cost of not guessing)', r.score === 20);
ok('a zero weight is ignored entirely, known or not', run({ environment: 80, privacy: 0 }, { environment: 2, privacy: 0 }).score === 80);

// The confidence floor.
ok('below MIN_COVERAGE the score is withheld (null), not faked',
  run({ economical: 90 }, { environment: 5, privacy: 5, economical: 1 }) === null);
ok('exactly at the floor it is shown', run({ economical: 90 }, { environment: 3, economical: 1 }) !== null);
ok('a caller can raise the floor', run({ environment: 90 }, { environment: 3, privacy: 1 }, { minCoverage: 0.9 }) === null);
ok('no weights at all withholds rather than scoring 50', run({ environment: 90 }, {}) === null);
ok('weights with no known axis withhold', run({}, { environment: 3 }) === null);

// The non-compensatory veto.
r = run({ environment: 10, privacy: 100, economical: 100 }, { environment: 4, privacy: 5, economical: 5 });
ok('an axis weighted ≥4 scoring ≤20 caps a fit that would otherwise be high', r.score === 49 && r.cap && r.cap.label === 'Environment' && r.cap.v === 10);
r = run({ environment: 10, privacy: 100, economical: 100 }, { environment: 3, privacy: 5, economical: 5 });
ok('weight 3 is not a dealbreaker', r.score > 49 && r.cap === null);
r = run({ environment: 21, privacy: 100, economical: 100 }, { environment: 5, privacy: 5, economical: 5 });
ok('21 is not catastrophic', r.cap === null);
r = run({ environment: 20, privacy: 100, economical: 100 }, { environment: 5, privacy: 5, economical: 5 });
ok('20 is', r.cap && r.score === 49);
r = run({ environment: 15, privacy: 5 }, { environment: 5, privacy: 5 });
ok('the cap never raises a score already below 49, and reports no cap', r.score === 10 && r.cap === null);
r = run({ environment: 15, privacy: 5, economical: 100, ethics: 100 }, { environment: 5, privacy: 5, economical: 5, ethics: 5 });
ok('the lowest dealbreaker is the one reported', r.cap && r.cap.label === 'Privacy' && r.cap.v === 5);
r = run({ privacy: 100, economical: 100 }, { environment: 5, privacy: 5, economical: 5 });
ok('an unknown axis cannot cap: missing is not catastrophic', r.cap === null);

// A certified axis cannot cap: its 0 is "no label found", not evidence of harm.
r = run({ ethics: 0, environment: 100, economical: 100 }, { ethics: 5, environment: 5, economical: 5 });
ok('a certified 0 weighted 5 does not cap', r.cap === null && r.score !== 49);
ok('but it still counts fully in the mean: (0 + 100 + 100) / 3 = 67', r.score === 67);
r = run({ ethics: 0, environment: 10, economical: 100, privacy: 100 }, { ethics: 5, environment: 5, economical: 5, privacy: 5 });
ok('a measured dealbreaker alongside it still caps: raw 53 becomes 49', r.score === 49 && r.cap && r.cap.label === 'Environment');
ok('a criterion with no tier can still cap (instances that predate tiers keep the veto)',
  e.score({ scores: { a: 0, b: 100 } }, { criteria: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }], weights: { a: 5, b: 5 } }).score === 49);

// Allergens: only an explicit free claim clears an allergy, whatever shape the exclusions arrive in.
const free = { scores: { environment: 80 }, allergenEvidence: { declaredFree: ['nuts'] } };
const declares = { scores: { environment: 80 }, allergenEvidence: { declares: ['nuts'] } };
const silent = { scores: { environment: 80 } };
const ctx = x => ({ criteria: C, weights: { environment: 3 }, excludes: x });
ok('a declared-free product passes a nut exclusion (Set)', e.score(free, ctx(new Set(['nuts']))) !== null);
ok('a product declaring nuts is excluded (Set)', e.score(declares, ctx(new Set(['nuts']))) === null);
ok('a product saying nothing is excluded: absence is not safety (Set)', e.score(silent, ctx(new Set(['nuts']))) === null);
ok('an array of exclusions excludes too (it used to pass everything through)', e.score(declares, ctx(['nuts'])) === null && e.score(silent, ctx(['nuts'])) === null);
ok('and an array still lets a declared-free product through', e.score(free, ctx(['nuts'])) !== null);
ok('an empty exclusion list excludes nothing', e.score(silent, ctx([])) !== null && e.score(silent, ctx(new Set())) !== null);

// Tiers of fit.
ok('scoreTier boundaries: 78 Excellent, 60 Strong, 45 Mixed, 44 Weak',
  e.scoreTier(78)[0] === 'Excellent fit' && e.scoreTier(60)[0] === 'Strong fit' && e.scoreTier(45)[0] === 'Mixed fit' && e.scoreTier(44)[0] === 'Weak fit');

console.log(p + ' passed, ' + f + ' failed');
process.exit(f ? 1 : 0);
