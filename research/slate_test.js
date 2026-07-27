/* K4c: federation of ACTION. A collective passport + a lens -> a derived slate (endorse / divest),
   honestly (divest only where a heavily-weighted value is badly failed, with a source), reproducibly. */
const fs = require('fs'), path = require('path');
const e = require('../app/engine.js');
function loadLens(rel){ global.window = {}; (0, eval)(fs.readFileSync(path.join(__dirname, rel), 'utf8')); return global.window.OVS_LENS; }
let p = 0, f = 0; const ok = (L, c) => { c ? p++ : f++; console.log((c ? 'PASS ' : 'FAIL ') + L); };

const M = loadLens('../instances/messages/lens.js');

// a privacy + openness collective (e.g. exported from an Assembly): autonomy & openness high
const privacy = { source:'our assembly', values:{ autonomy:5, openness:5, access:2 } };
const slate = e.buildSlate(privacy, M, { dissent:['Access'] });

ok('slate format + verifiable lens hash', slate.format === 'open-values-slate' && slate.lensHash === e.lensHash(M));
ok('endorses Signal first (best for private+open)', slate.endorse[0] && slate.endorse[0].code === 'signal');
ok('endorsements carry a sourced reason', slate.endorse.every(x => x.reason));
ok('divest is non-empty and every item has a receipt (a failed value + its note/source)',
   slate.divest.length > 0 && slate.divest.every(x => x.conflicts.length > 0 && (x.conflicts[0].source || x.conflicts[0].note)));
ok('divest targets an option that fails openness (e.g. Messenger, closed source)',
   slate.divest.some(x => x.code === 'messenger') && slate.divest.find(x=>x.code==='messenger').conflicts.some(c => c.key === 'openness'));
ok('a strong endorsement never appears in divest', !slate.divest.some(d => d.code === slate.endorse[0].code));
ok('dissent is carried forward (no fake unanimity)', slate.dissent.join(',') === 'Access');

// reproducible: same passport + lens -> identical slate
const slate2 = e.buildSlate(privacy, M, { dissent:['Access'] });
ok('reproducible (same passport + lens -> identical slate)', JSON.stringify(slate) === JSON.stringify(slate2));

// a different "we" -> a different slate (reach-first), and nothing egregiously against those values
const reach = { source:'a different room', values:{ community:5, access:5, autonomy:0, openness:0 } };
const rs = e.buildSlate(reach, M);
ok('reach-first endorses WhatsApp first', rs.endorse[0] && rs.endorse[0].code === 'whatsapp');
ok('reach-first divest is empty (no heavy value badly failed -> no call-outs)', rs.divest.length === 0);

console.log(p + ' passed, ' + f + ' failed');
process.exit(f ? 1 : 0);
