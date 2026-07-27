# The Weave — the ontology as a graph (v0 spec)

*The converged design from the rhizome brainstorm: the navigable commons re-formed from a **tree** into a
**rhizome** — one sourced values-graph, many lenses, cross-platform, **no center**. This is the buildable v0.
**G1 is shipped** (engine v0.10 + a passing proof); G2–G4 are sequenced below. 2026-06-29.*

## The realization that makes it buildable
The graph already exists — *implicitly*. Lenses **are** node-sets; `content/ontology.json` **is** the
taxonomic edges; `KEY2THEME` + the values spine **are** the value-edges; the passport **is** a traversal
bias. So v0 is not a database and not a rewrite — it is four small things: make the implicit graph
**explicit** in a pure function, add **one** sourced edge-file, add **node URIs + external IDs**, and ship
**computed analogy** (which needs *zero* new data because it reuses the spine). One vertical slice proves all
three threads — metaphor · cross-platform · uncapturable — at once.

## Schema (a superset of what already exists)
**Node** — a lens entity with an address and outbound IDs; existing fields ride in untouched:
```jsonc
{ "id": "ovs:phones/fairphone-5",        // stable URI: ovs:<category>/<code>
  "kind": "entity", "label": "Fairphone 5", "domain": "Tech & digital", "category": "phones",
  "scores": {…}, "provenance": {…},        // unchanged lens data
  "ids": { "wikidata": "Q…", "off": "…", "schema": "Product" } }   // NEW, optional, sparse-ok
```
**Edge** — its own forkable file (a new lens *type*), so it federates by the machinery you already have:
```jsonc
// content/edges/<shard>.json   format: "open-values-edges" v0.1
{ "edges": [
  { "from":"ovs:phones/fairphone-5", "rel":"alternative-to", "to":"ovs:phones/iphone-15", "source":"…" },
  { "from":"ovs:org/nestle", "rel":"parent-of", "to":"ovs:brand/kitkat", "source":"…", "asof":"2026" },
  { "from":"ovs:phones/fairphone-5", "rel":"analogous-to", "to":"ovs:clothing/patagonia",
    "note":"the Patagonia of phones", "computed":true } ] }
```
v0 edge types: **`alternative-to`** (swaps) · **`parent-of`/`owned-by`** (who's really behind it) ·
**`analogous-to`** (the metaphor). Every *asserted* edge carries a `source` — receipts on links. Identity is
the human URI for linking + `lensHash` for integrity (git's refs-vs-commits, applied to knowledge).

## Engine primitives — **v0.10, shipped (G1)**
Pure, Node-testable, built on-device from `CC_BUNDLE` + the edges file. In [`app/engine.js`](../app/engine.js):
- **`signature(entity, key2theme?)`** → a value vector over themes (mean of the criteria mapping to each
  theme). Only themes with data appear — never faked.
- **`analogues(node, pool, opts)`** → the metaphor: nodes most like `node` but in a **different** bucket
  (the computed "X of Y"), nearest-first with a `resemblance` 0–100, labelled `computed`. Reuses `signature`
  — the same cross-domain projection as the passport spine.
- **`buildGraph({lenses, ontology, edges})`** → a light index (`node`, `nodes`, `neighbors`); heavy facts
  stay in the lenses, so it scales over ~19k entities. `sigDistance` underlies the analogy with an honest
  overlap floor (no comparison on too little shared ground).

**Proof:** [`research/graph_test.js`](../research/graph_test.js) — 12/12. *"The Patagonia of phones"*
computes from values alone; the low-values phone resembles fast fashion; no analogy is forced across thin
overlap. The architecture's riskiest claim is a passing test.

## The metaphor engine
- **Computed** (live in G1): `analogous-to` edges generated from spine-distance, shown as *"a resemblance by
  your shared values"* with a confidence from the distance — never an authoritative claim; a sourced edge can
  override a computed one.
- **Conceptual maps** (G4, tiny files): `{ "id":"vote", "map":[["citizen","consumer"],["ballot","purchase"],
  ["candidate","brand"]] }` — names the roles so the system can *explain* and *translate a stance* (the spine
  already does the translation).

## Cross-platform (a mapping file, not an endpoint)
**✅ shipped (G2).** `engine.WEAVE_CONTEXT` maps `ovs` relations → web vocabularies (`parent-of → schema:parentOrganization /
wdt:P749`, `made-by → schema:manufacturer`, `alternative-to → schema:isSimilarTo`). Any node then **exports
as JSON-LD** (web-citable), and `resolve(extId)` joins inbound from OFF/Wikidata. The Commons-widget pattern
makes a single verdict-node **embeddable** anywhere. CC becomes the *values overlay* on the open-data web —
no server, just shared identifiers.

## Uncapturable (it federates exactly like facts already do)
**✅ shipped (G2).** `mergeGraph` is `mergeLens` generalized: merge edges by `(from, rel, to)`, with provenance,
dedupe, and a `baseHash` flag — content-addressed by `edgesHash`, the same contract the federation suites guard. Content-addressed, sharded by
domain/region, lazy-loaded per the existing pattern. No new trust model, no center, works offline. A
community can fork the Weave, add sourced edges, and pass the file — knowledge that federates like a patch.

## What v0 ships — and what it deliberately doesn't
**Ships:** the explicit graph + computed analogy (G1 ✅) · node URIs + sparse external IDs · a small *sourced*
`edges.json` (alternatives + ownership for ~2 flagship categories) · **one additive UI surface: a
"Connections" panel** on the product detail — *Alternatives · Who owns it · Resembles · Elsewhere*. Additive,
calm, **no IA rework**.
**Does NOT (yet):** the Garden skin, full graph visualization, community-authored indexes, wormholes UI, a
sourced edge for every entity. Fast-follows, not v0.

## Risks, named & mitigated
- **Sourcing burden / "12-edge vaporware"** → lead with *computed* analogy (covers all existing data
  instantly, zero new sourcing) + a tight, real ownership set; frame the rest with the ontology's honest
  "growing" pattern.
- **On-device perf (~19k nodes)** → thin node refs, sharded/lazy build, capped traversal depth.
- **IA churn fatigue** (Explore was just reworked) → v0 is **additive** (a panel + a derived view); it does
  not touch navigation.
- **Metaphor going woo/offensive** → computed analogy is labelled, distance-gated, sourced-overridable, and
  worded as a *suggestion by shared values*, not a fact.
- **Link rot** → URIs derived from already-stable ids (`cid` + code); hash for integrity.

## Build sequence (each phase = one real artifact, gated, never crosses the line)
- **G1 — graph explicit + analogy proof.** ✅ engine v0.10 (`signature`/`analogues`/`buildGraph`) +
  `graph_test.js` (12/12). No UI. The de-risker.
- **G2 — sourced edges + federation + JSON-LD.** ✅ `mergeGraph`/`edgesHash` (edges federate like facts —
  dedupe, provenance, `baseHash` flag), the JSON-LD `@context` + `toJSONLD` (a node exports as web-citable
  linked data), the seed `app/edges.json` (banking alternatives + a sourced ownership edge), and the panel's
  graceful org-target rendering — all proven in `graph_test.js` (21/21). *(Expanding the edge DATA across
  categories = Codex's content lane; the format + merge + context = the standard, shipped.)*
- **G3 — the Connections panel.** The graph's first visible, calm, sourced payoff on the detail view.
- **G4 — the metaphor, shareable.** ✅ `CC.analogyCard` — a self-contained "X is the Y of Z" card carrying the
  *shape of values the two share* (drawn as the sigil), with a "Save as a card" button on the top Resembles
  result, rasterized by the existing `downloadCardPNG`. The conceptual-map format (the `vote` example above) is
  specced for the engine's explain/translate; the shareable card is G4's shipped artifact. **The Weave v0
  (G1–G4) is complete** — think · spread · connect · share, all on no server.
- **Fast-follow:** the Garden lens ✅ (a 4th Explore skin) · **community-authored indexes** ✅
  (`engine.indexMatch`/`runIndex` + the forkable `open-values-index` file + the `#indexes` builder — anyone
  authors their own "things strong on my values" slice, saved/run/exported/forked, no official taxonomy, no
  server) · **cross-instance wormholes** ✅ (`engine.twinOf` — a CC entity becomes a passport, carried through
  the spine into another instance, returning its values-twin there; surfaced in the Connections panel as
  "Through the standard." Proven: *Triodos Bank's twin in the world of learning is the Stanford Encyclopedia of
  Philosophy*, via people + openness). The deeper rhizome is now real end-to-end; what remains is **deploy** (a
  second *live* instance makes wormholes a walkable journey) and **Codex** edge/lens data population.

## Naming (owned by principle)
**The Rhizome** = the architecture. **The Weave** = the sourced edge-graph (`open-values-edges`). User-facing,
stay humane and literal: **"Connections"** and **"Resembles."** The poetics live here; the buttons stay plain.
