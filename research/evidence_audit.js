/* Evidence-coverage audit — the Masterplan V6 scoreboard.
   Prints per-lens object-provenance coverage (the SAME metric as the app's "Evidence: strong/partial/early"
   meter), worst first = the work queue. Run before AND after each evidence-rebuild sprint; the target is
   "coverage up materially," not just ALL CHECKS PASS.  Run:  node research/evidence_audit.js
   A claim is "well-evidenced" if it's a measured/certified criterion, its provenance is an object with a
   source URL ({note, source, asof}), or it is a plain note on a low-stakes convenience axis. */
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'content', 'lenses');
const NOTE_OK = { fees: true, accessibility: true, price: true, economical: true, catalog: true, selection: true };

function coverage(ds) {
  if (!ds.criteria || !ds.products) return null;
  const openDB = !!(ds.meta && ds.meta.productBase); // Open Food/Beauty Facts lenses are sourced by their database
  const tier = {}; ds.criteria.forEach(c => tier[c.key] = c.tier || 'assessed');
  let good = 0, total = 0;
  for (const p of ds.products) for (const cr of ds.criteria) {
    const v = p.scores && p.scores[cr.key]; if (v == null) continue; total++;
    const pv = p.provenance && p.provenance[cr.key];
    if (openDB || (pv && typeof pv === 'object' && pv.source) || tier[cr.key] === 'measured' || tier[cr.key] === 'certified' || (NOTE_OK[cr.key] && typeof pv === 'string' && pv.trim())) good++;
  }
  const pct = total ? good / total : 0;
  return { good, total, pct, level: pct >= 0.66 ? 'strong' : pct >= 0.2 ? 'partial' : 'early' };
}

const rows = [];
for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith('.json')) continue;
  let ds; try { ds = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { console.log(f, 'PARSE ERROR'); continue; }
  const c = coverage(ds); if (c) rows.push({ id: (ds.meta && ds.meta.id) || f.replace('.json', ''), ...c });
}
rows.sort((a, b) => a.pct - b.pct);

const ICON = { strong: '✓ strong ', partial: '◐ partial', early: '○ early  ' };
console.log('\nEvidence coverage — content/lenses (worst first = the work queue)\n');
for (const r of rows) {
  const bar = '█'.repeat(Math.round(r.pct * 20)).padEnd(20, '·');
  console.log('  ' + ICON[r.level] + '  ' + String(Math.round(r.pct * 100)).padStart(3) + '%  ' + bar + '  ' + r.id.padEnd(22) + ' (' + r.good + '/' + r.total + ')');
}
const sum = rows.reduce((a, r) => { a.good += r.good; a.total += r.total; return a; }, { good: 0, total: 0 });
console.log('\n  TOTAL curated: ' + sum.good + '/' + sum.total + ' (' + Math.round(sum.good / sum.total * 100) + '%) sourced across ' + rows.length + ' lenses');
console.log('  Target: every high-stakes lens → at least ◐ partial; the wedge lenses → ✓ strong.\n');
  // This one reports and never gates: it has no pass condition, only a coverage number that
  // should rise. Unlabelled, a reporter sitting in a chain of gates gets read as a finding,
  // which is how a number nobody can fail ends up being acted on. Said in the output, where a
  // reader sees it, not in a comment where only an author does.
  console.log('  ADVISORY: a place to look, not a finding. This audit never fails a build.');
