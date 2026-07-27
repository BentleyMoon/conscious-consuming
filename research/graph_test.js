/* THE WEAVE — G1 proof (engine v0.10). The ontology made a graph, with the headline capability proven on
   controlled data: cross-domain ANALOGY ("the Patagonia of phones") falls straight out of the SAME theme
   projection the values spine uses — no new data, no server. Also proves the graph index: nodes from lenses,
   sourced edges, and taxonomic edges from the ontology. Run: node research/graph_test.js */
const e = require('../app/engine.js');
let p = 0, f = 0; const ok = (L, c) => { c ? p++ : f++; console.log((c ? 'PASS ' : 'FAIL ') + L); };

// Two synthetic lenses whose criteria map (via engine.KEY2THEME) to shared themes:
//   ethics -> people · repairability/durability -> planet · transparency -> honesty · economical -> cost
const phones = { meta: { id: 'phones', domain: 'Tech & digital' }, products: [
  { code: 'fairphone', name: 'Fairphone',       scores: { ethics: 92, repairability: 95, transparency: 85, economical: 40 } },
  { code: 'flagship',  name: 'Sealed Flagship', scores: { ethics: 35, repairability: 20, transparency: 30, economical: 80 } },
]};
const clothing = { meta: { id: 'clothing', domain: 'Clothing' }, products: [
  { code: 'patagonia',   name: 'Patagonia',    scores: { ethics: 90, durability: 93, transparency: 82, economical: 30 } },
  { code: 'fastfashion', name: 'Fast Fashion', scores: { ethics: 25, durability: 28, transparency: 30, economical: 85 } },
]};
const ont = { domains: [ { label: 'Tech & digital', categories: [ { label: 'Phones', cid: 'phones' } ] } ] };
const edges = { format: 'open-values-edges', version: '0.1', edges: [
  { from: 'ovs:phones/fairphone', rel: 'alternative-to', to: 'ovs:phones/flagship', source: 'test' },
]};

ok('engine is v0.10 (the Weave)', e.VERSION === '0.10');

const G = e.buildGraph({ lenses: [phones, clothing], ontology: ont, edges: [edges] });

// --- the graph index: lenses + ontology + sourced edges, assembled on-device ---
ok('lens entities became nodes (4)', G.nodes().length === 4);
ok('node id is a stable URI', !!G.node('ovs:phones/fairphone') && G.node('ovs:phones/fairphone').label === 'Fairphone');
ok('a sourced edge is traversable', G.neighbors('ovs:phones/fairphone', 'alternative-to').length === 1);
ok('the ontology gives a taxonomic edge', G.neighbors('ovs:cat/phones', 'in-domain').length === 1);

// --- the signature is honest: only themes that have data, never faked ---
const sig = e.signature(phones.products[0]);
ok('signature projects scores onto themes', sig.people === 92 && sig.planet === 95 && sig.honesty === 85 && sig.cost === 40);

// --- THE METAPHOR: cross-domain analogy, computed from the spine projection ---
const fair = G.node('ovs:phones/fairphone');
const aFair = e.analogues(fair, G.nodes(), { k: 3 });
ok('analogy is CROSS-bucket (no phones among a phone\'s analogues)', aFair.every(x => x.node.category !== 'phones'));
ok('"the Patagonia of phones" — Fairphone\'s top analogue is Patagonia', aFair[0] && aFair[0].node.id === 'ovs:clothing/patagonia');
ok('the values-opposite (Fast Fashion) is NOT a near analogue', !aFair.some(x => x.node.id === 'ovs:clothing/fastfashion'));
ok('resemblance reads high for a true analogue', aFair[0] && aFair[0].resemblance >= 90);

// --- it tracks VALUES, not category: the cheap, sealed phone resembles fast fashion, not Patagonia ---
const flag = G.node('ovs:phones/flagship');
const aFlag = e.analogues(flag, G.nodes(), { k: 1 });
ok("the low-values phone's analogue is Fast Fashion, not Patagonia", aFlag[0] && aFlag[0].node.id === 'ovs:clothing/fastfashion');

// --- honesty floor: too little in common -> no forced analogy ---
const lonely = { id: 'ovs:x/lonely', category: 'x', scores: { vegan: 90 } }; // only the 'animals' theme
ok('no analogy is forced when signatures barely overlap', e.analogues(lonely, G.nodes(), {}).length === 0);

// --- FEDERATION of the Weave: edges merge like facts (mergeGraph), content-addressed (edgesHash) ---
const baseEf = { format: 'open-values-edges', version: '0.1', edges: [
  { from: 'ovs:phones/fairphone', rel: 'alternative-to', to: 'ovs:phones/flagship', source: 'a' } ] };
const h0 = e.edgesHash(baseEf);
ok('edgesHash is deterministic', e.edgesHash(baseEf) === h0);
const m = e.mergeGraph(baseEf, [ { by: 'ana', edges: [
  { from: 'ovs:phones/fairphone', rel: 'made-by', to: 'ovs:org/fairphone-bv', source: 'b' },          // new
  { from: 'ovs:phones/fairphone', rel: 'alternative-to', to: 'ovs:phones/flagship', source: 'dup' } ] } ]); // dup
ok('mergeGraph adds a genuinely new edge', m.file.edges.length === 2);
ok('mergeGraph dedupes by (from,rel,to)', m.log.some(l => l.status === 'duplicate'));
ok('mergeGraph logs the add with provenance', m.log.some(l => l.op === 'add-edge' && l.source === 'b'));
ok('edgesHash changes when the edge-set changes', e.edgesHash(m.file) !== h0);
ok('mergeGraph flags a baseHash mismatch (never silently merges)', e.mergeGraph(baseEf, [{ baseHash: 'deadbeef', edges: [] }]).log.some(l => l.status === 'base-mismatch'));

// --- CROSS-PLATFORM: a node exports as JSON-LD that joins the open-data web ---
const jld = e.toJSONLD({ id: 'ovs:phones/fairphone', label: 'Fairphone', ids: { wikidata: 'Q42' } }, baseEf.edges);
ok('JSON-LD carries @context + @id + name', !!jld['@context'] && jld['@id'] === 'ovs:phones/fairphone' && jld.name === 'Fairphone');
ok('JSON-LD maps an ovs relation to a web property', !!jld['alternative-to']);
ok('JSON-LD sameAs joins the node to Wikidata', !!jld.sameAs && String(jld.sameAs).indexOf('Q42') >= 0);

// --- COMMUNITY-AUTHORED INDEXES: a forkable "things strong on my values" filter over the commons ---
const things = [
  { id: 'a', scores: { ethics: 90, environment: 88, fees: 30 } },   // strong people + planet
  { id: 'b', scores: { ethics: 88, environment: 40 } },             // strong people, weak planet
  { id: 'c', scores: { ethics: 30, environment: 30 } },             // weak on both
];
const idxPP = { format: 'open-values-index', values: ['people', 'planet'], min: 60 };
ok('index keeps a thing strong on ALL chosen values', e.indexMatch(things[0], idxPP) === true);
ok('index drops a thing weak on one chosen value', e.indexMatch(things[1], idxPP) === false);
ok('runIndex filters the commons to matches only', e.runIndex(idxPP, things).length === 1 && e.runIndex(idxPP, things)[0].id === 'a');
ok('an index with no values matches nothing (never "everything")', e.indexMatch(things[0], { values: [] }) === false);

console.log(p + ' passed, ' + f + ' failed');
process.exit(f ? 1 : 0);
