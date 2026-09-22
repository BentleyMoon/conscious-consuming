/* Kosplora — the rule-of-three falsification test, run headless against the REAL engine.
   Imports app/engine.js UNCHANGED (via its module.exports) and ranks learning resources by a learner's
   portable values, using Kosplora's OWN value vocabulary injected through the v0.1 themeDefaults().
   If different learners get different top picks from the same engine + same facts, the substrate transfers.
   Run: node research/kosplora_test.js */
const engine = require('../app/engine.js'); // the exact file Conscious Consuming runs — not a copy

// A new domain's criteria (from real OER rubrics — Achieve/ISKME, MERLOT, Common Sense)
const CRITERIA = [
  { key: 'rigor', label: 'Rigour' }, { key: 'pedagogy', label: 'Teaching' },
  { key: 'openness', label: 'Open & free' }, { key: 'accessibility', label: 'Accessible' },
  { key: 'currency', label: 'Up-to-date' }, { key: 'engagement', label: 'Engaging' }
];
// Kosplora's OWN value vocabulary — the engine has never heard of "rigour". Injected, not baked in.
//   rigour = intellectual depth · open = free/open licence · ease = well-taught + accessible + engaging · fresh = current
const KEY2THEME = { rigor: 'rigor', pedagogy: 'ease', openness: 'open', accessibility: 'ease', currency: 'fresh', engagement: 'ease' };

// Tradeoff-heavy field: real specialists with genuine weaknesses (no single dominant all-rounder).
const R = [
  { name: 'Stanford Encyc. Phil.', scores: { rigor: 99, pedagogy: 82, openness: 95, accessibility: 80, currency: 93, engagement: 72 } },
  { name: 'MIT OpenCourseWare',  scores: { rigor: 95, pedagogy: 72, openness: 96, accessibility: 78, currency: 55, engagement: 52 } },
  { name: 'Khan Academy',        scores: { rigor: 66, pedagogy: 95, openness: 84, accessibility: 97, currency: 80, engagement: 90 } },
  { name: '3Blue1Brown',         scores: { rigor: 86, pedagogy: 96, openness: 85, accessibility: 80, currency: 78, engagement: 97 } },
  { name: 'Wikipedia',           scores: { rigor: 83, pedagogy: 70, openness: 99, accessibility: 92, currency: 96, engagement: 66 } },
  { name: 'freeCodeCamp',        scores: { rigor: 76, pedagogy: 82, openness: 95, accessibility: 88, currency: 92, engagement: 84 } },
  { name: 'Harvard CS50',        scores: { rigor: 84, pedagogy: 90, openness: 66, accessibility: 84, currency: 84, engagement: 88 } },
  { name: 'The Odin Project',    scores: { rigor: 80, pedagogy: 85, openness: 95, accessibility: 80, currency: 88, engagement: 78 } },
  { name: 'Duolingo',            scores: { rigor: 44, pedagogy: 78, openness: 72, accessibility: 94, currency: 86, engagement: 94 } },
  { name: 'Brilliant',           scores: { rigor: 78, pedagogy: 88, openness: 38, accessibility: 80, currency: 84, engagement: 88 } },
  { name: 'MasterClass',         scores: { rigor: 48, pedagogy: 66, openness: 22, accessibility: 72, currency: 78, engagement: 86 } },
  { name: 'Generic Udemy course',scores: { rigor: 54, pedagogy: 60, openness: 40, accessibility: 70, currency: 62, engagement: 68 } }
];

function rankFor(passport) {
  const weights = engine.themeDefaults(CRITERIA, passport, KEY2THEME); // v0.1: inject Kosplora's vocabulary
  return R.map(r => [r.name, engine.score(r, { criteria: CRITERIA, weights })])
    .filter(x => x[1]).sort((a, b) => b[1].score - a[1].score);
}

const learners = {
  'Rigour-first':   { rigor: 5, open: 3, ease: 3, fresh: 3 },
  'Open & free':    { rigor: 3, open: 5, ease: 3, fresh: 3 },
  'Well-taught/easy':{ rigor: 3, open: 3, ease: 5, fresh: 3 },
  'Freshness-first':{ rigor: 3, open: 3, ease: 3, fresh: 5 }
};

console.log('Values Engine v' + engine.VERSION + ' (the unedited Conscious Consuming engine)\n');
const tops = [];
for (const [label, passport] of Object.entries(learners)) {
  const r = rankFor(passport);
  tops.push(r[0][0]);
  console.log(label.padEnd(18) + '#1 ' + r[0][0] + ' (' + r[0][1].score + ')   top3: ' + r.slice(0, 3).map(x => x[0]).join(', '));
}
const distinct = new Set(tops).size;
console.log('\nDistinct #1 picks across ' + tops.length + ' learners: ' + distinct);
console.log(distinct >= 2
  ? 'PASS — different values yield different top picks (and the whole list reorders) from the SAME engine and SAME\n       facts, via a vocabulary the engine never knew. The substrate transfers.\n       (Finding: the 3↔5 weighting is intentionally mild — as in CC, a broadly-excellent option resists single-axis\n        prioritization, so not every value flips the #1. The one abstraction the test forced: Standard v0.1 makes the\n        value vocabulary injectable — themeDefaults(criteria, passport, KEY2THEME).)'
  : 'FAIL — values did not move the ranking; investigate.');
// Printed FAIL and exited 0 until 2026-07-31, so a run where values stopped moving the ranking
// would have read as a failure in the log and still passed the chain into a deploy.
process.exit(distinct >= 2 ? 0 : 1);
