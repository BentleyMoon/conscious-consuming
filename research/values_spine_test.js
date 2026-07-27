/* The shared values spine (T2). Proves "your values follow you everywhere" is LITERALLY true — and honestly
   bounded. A Values Passport exported from Conscious Consuming travels into Kosplora (a different domain, the
   SAME unedited engine) and does real work: it re-ranks where to learn. And where a value has no honest
   expression in the new space, the engine REPORTS it as not-transferred rather than dropping it silently —
   the project's honesty ethos, enforced in the federation primitive. Run: node research/values_spine_test.js */
const fs = require('fs'), path = require('path');
const e = require('../app/engine.js');
function loadLens(rel){ global.window = {}; (0, eval)(fs.readFileSync(path.join(__dirname, rel), 'utf8')); return global.window.OVS_LENS; }
let p = 0, f = 0; const ok = (L, c) => { c ? p++ : f++; console.log((c ? 'PASS ' : 'FAIL ') + L); };

// Conscious Consuming's theme→universal map (mirrors app.js CC_THEME_UNIVERSAL).
const CC_MAP = { planet:'planet', people:'people', health:'wellbeing', honesty:'openness', privacy:'autonomy', animals:'animals', cost:'access', local:'community' };
const K = loadLens('../kosplora/lens.js');

ok('engine is v0.10 (transparent transfer + the Weave)', e.VERSION === '0.10');

// A CC visitor who prioritises Honesty, People (fairness) and Planet; the rest neutral (3).
const ccThemes = { planet:5, people:5, health:3, honesty:5, privacy:3, animals:3, cost:3, local:3 };
const pass = e.passportFrom(ccThemes, CC_MAP, 'conscious-consuming');
const res  = e.passportApply(pass, K.universalToLocal, { rigor:3, ease:3, open:3, fresh:3 });

// 1) CARRIED — the values that found a learning home (incl. fairness/ethics, via the bridge-coherence fix)
ok('honesty (openness) carried into Kosplora "open"', res.carried.some(c => c.universal==='openness' && c.local==='open'));
ok('people (fairness) now carries into Kosplora "open"', res.carried.some(c => c.universal==='people' && c.local==='open'));
ok('the "open" theme is raised to 5 by the passport', res.weights.open === 5);

// 2) DROPPED — a prioritised value with no honest expression in learning is REPORTED, not hidden or faked
ok('planet is reported as not-transferred (no learning expression)', res.dropped.some(d => d.universal==='planet'));
ok('neutral values (animals @3) are NOT reported as dropped', !res.dropped.some(d => d.universal==='animals'));

// 3) back-compat: applied still equals carried's universals
const carriedUnis = res.carried.map(c => c.universal).sort().join(',');
ok('applied (back-compat) = carried universals', res.applied.slice().sort().join(',') === carriedUnis);

// 4) it reaches the CRITERIA: the openness criterion inherits weight 5 through themeDefaults
const w = e.themeDefaults(K.criteria, res.weights, K.key2theme);
ok('openness criterion weight = 5 via themeDefaults', w.openness === 5);

// 5) it changes the RANKING the right way: emphasising openness helps an open resource, hurts a paywalled one
const sc = (code, weights) => { const r = K.resources.find(x => x.code===code); return e.score(r, {criteria:K.criteria, weights}).score; };
const balanced = {}; for (const cr of K.criteria) balanced[cr.key] = 3;
ok('open resource (Wikipedia) scores HIGHER under honesty-first than balanced', sc('wikipedia', w) > sc('wikipedia', balanced));
ok('paywalled resource (MasterClass) scores LOWER under honesty-first than balanced', sc('masterclass', w) < sc('masterclass', balanced));

// 6) the #1 pick under the imported CC passport is a genuinely open resource
const ranked = K.resources.map(x => [x, e.score(x, {criteria:K.criteria, weights:w})]).filter(x=>x[1]).sort((a,b)=>b[1].score-a[1].score);
ok('#1 under the CC passport is highly-open (openness >= 90)', ranked[0][0].scores.openness >= 90);

// --- THE ≥2-INSTANCE PROOF (CC-RND-FORWARD T2 verify): ONE passport, prioritising honesty + privacy,
// produces elevated LOCAL criterion weights in BOTH other instances — values follow you, literally. ---
const M = loadLens('../instances/messages/lens.js');
const travelThemes = { planet:5, people:3, health:3, honesty:5, privacy:5, animals:3, cost:3, local:3 };
const travelPass = e.passportFrom(travelThemes, CC_MAP, 'conscious-consuming');

// Kosplora: honesty (openness) reaches the openness CRITERION at weight 5
const kRes = e.passportApply(travelPass, K.universalToLocal, { rigor:3, ease:3, open:3, fresh:3 });
const kW = e.themeDefaults(K.criteria, kRes.weights, K.key2theme);
ok('[2-instance] Kosplora: openness criterion = 5 from the one passport', kW.openness === 5);

// Messages: honesty AND privacy reach the local criteria (privacy+security via "private", openness via "open")
const mRes = e.passportApply(travelPass, M.universalToLocal, { private:3, open:3, ease:3, reach:3 });
ok('[2-instance] Messages: privacy (autonomy) carried into "private"', mRes.carried.some(c => c.universal==='autonomy' && c.local==='private'));
ok('[2-instance] Messages: honesty (openness) carried into "open"', mRes.carried.some(c => c.universal==='openness' && c.local==='open'));
ok('[2-instance] Messages: planet reported as not-transferred (no messaging expression)', mRes.dropped.some(d => d.universal==='planet'));
const mW = e.themeDefaults(M.criteria, mRes.weights, M.key2theme);
ok('[2-instance] Messages: privacy criterion = 5 via themeDefaults', mW.privacy === 5);
ok('[2-instance] Messages: security criterion = 5 (same "private" theme)', mW.security === 5);
ok('[2-instance] Messages: openness criterion = 5 via themeDefaults', mW.openness === 5);

// ...and it changes the RANKING the right way in the second instance too
const msc = (code, weights) => { const r = M.resources.find(x => x.code===code); return e.score(r, {criteria:M.criteria, weights}).score; };
const mBalanced = {}; for (const cr of M.criteria) mBalanced[cr.key] = 3;
const mRanked = M.resources.map(x => [x, e.score(x, {criteria:M.criteria, weights:mW})]).filter(x=>x[1]).sort((a,b)=>b[1].score-a[1].score);
ok('[2-instance] Messages: #1 under the CC passport is Signal', mRanked[0][0].code === 'signal');
ok('[2-instance] Messages: a closed, data-hungry messenger scores LOWER under the passport than balanced', msc('messenger', mW) < msc('messenger', mBalanced));

// --- CROSS-INSTANCE WORMHOLE: a CC entity's values-twin in another instance (Kosplora), via the spine ---
const ethicalThing = { scores: { ethics: 92, transparency: 90, environment: 80, fees: 30 } }; // honesty/people/planet-strong
const twin = e.twinOf(ethicalThing, CC_MAP, K);
ok('twinOf finds a values-twin in the other instance', !!twin && !!twin.node);
ok("an ethical/transparent thing's learning twin is an open resource (openness >= 90)", twin && twin.node.scores.openness >= 90);
ok('the wormhole reports which values bridged (carried)', twin && twin.carried && twin.carried.length > 0);

console.log(p + ' passed, ' + f + ' failed');
process.exit(f ? 1 : 0);
