/* Falsification test for K2/K3: the shared SHELL transfers, not just the engine.
   Loads each instance's manifest and proves, through the UNMODIFIED engine, that
   (a) opposite values yield different #1s, and (b) a CC passport travels into a new domain. */
const fs = require('fs'), path = require('path');
const e = require('../app/engine.js');
function loadLens(rel){ global.window = {}; (0, eval)(fs.readFileSync(path.join(__dirname, rel), 'utf8')); return global.window.OVS_LENS; }
let p = 0, f = 0; const ok = (L, c) => { c ? p++ : f++; console.log((c ? 'PASS ' : 'FAIL ') + L); };
function top(lens, passport){
  const w = e.themeDefaults(lens.criteria, passport, lens.key2theme);
  const r = lens.resources.map(x => [x, e.score(x, {criteria:lens.criteria, weights:w})]).filter(x => x[1]).sort((a,b)=>b[1].score-a[1].score);
  return r[0][0].code;
}

// --- Kosplora: now a manifest that sets OVS_LENS (+ back-compat alias) and carries its own passport map ---
const K = loadLens('../kosplora/lens.js');
ok('kosplora sets OVS_LENS', !!K);
ok('kosplora keeps KOSPLORA_LENS alias', global.window.KOSPLORA_LENS === K);
ok('kosplora carries universalToLocal (was shell code)', !!K.universalToLocal && K.universalToLocal.openness === 'open');

// --- Instance #3 (messages): the rule-of-three at the EXPERIENCE layer ---
const M = loadLens('../instances/messages/lens.js');
ok('messages lens loads (7 entities)', M.resources.length === 7);
const privTop = top(M, {private:5, open:5, ease:1, reach:0});
const reachTop = top(M, {private:0, open:0, ease:5, reach:5});
ok('privacy-first #1 = Signal (got ' + privTop + ')', privTop === 'signal');
ok('reach-first #1 differs (got ' + reachTop + ')', reachTop !== privTop && reachTop === 'whatsapp');

// --- A passport exported from CC travels into the messages instance ---
const CC_MAP = {planet:'planet',people:'people',health:'wellbeing',honesty:'openness',privacy:'autonomy',animals:'animals',cost:'access',local:'community'};
const ccPass = e.passportFrom({privacy:5, honesty:5, cost:1}, CC_MAP, 'conscious-consuming'); // privacy->autonomy, honesty->openness
const applied = e.passportApply(ccPass, M.universalToLocal, {private:3, open:3, ease:3, reach:3});
ok('CC privacy (=autonomy) -> messages "private" = 5', applied.weights.private === 5);
ok('CC honesty (=openness) -> messages "open" = 5', applied.weights.open === 5);
ok('only the spanning values applied', applied.applied.slice().sort().join(',') === 'autonomy,openness');

console.log(p + ' passed, ' + f + ' failed');
process.exit(f ? 1 : 0);
