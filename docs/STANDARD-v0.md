# The Open Values Standard — v0.1

*The formal protocol beneath **Values Commons**: the data contract at the heart of [the Values Layer](THE-VALUES-LAYER.md). This is not a new design — it is the **written, versioned specification of what Conscious Consuming already implies**, so a second site can share it. CC's `content/lenses/*.json`, the `app/engine.js` library, and the "You" export are the **reference implementation**. Protocol status: v0.1 (draft-but-shipping). Reference engine: `app/engine.js` v0.10. 2026-06-20; naming canon updated 2026-07-02.*

> **Naming.** **Values Commons** is the public ecosystem. **The Open Values Standard** is this protocol. **Conscious Consuming** is the first real instance.

> **Why this exists.** The substrate's keystone is one honest answer to: *"what is an entity, a criterion, a value, and a provenance?"* Everything else — the portable identity, the skinnable shells, the second instance, and the future decentralized commons — composes on this one contract. Writing it down costs little, commits to nothing irreversible, and makes CC itself cleaner today.

> **Spec posture.** v0.1 is normative for the data shapes, invariants, and conformance rules below. The engine version is separate: the protocol changes when the contract changes; the reference engine changes when implementation primitives are added.

---

## Implementer checklist

An implementation of the Open Values Standard v0.1 should be able to:

1. Read a lens with `meta`, `criteria`, and `resources` or `products`.
2. Reject or ignore score keys that are not declared criteria.
3. Treat missing scores as unknown, never as zero.
4. Preserve provenance for every value-laden claim.
5. Project a Values Passport into local weights through `universalToLocal` and `key2theme`.
6. Rank entities by facts times user weights, with confidence withholding.
7. Export or preserve the user's values as a nameless Values Passport.
8. Stay neutral: no sponsorship, ads, tracking, or paid placement in ranking.

## 0. Design invariants (the non-negotiables the format encodes)

1. **Values-relative, not verdicts.** A score is *fit to a person's declared values*, never "good/bad."
2. **Provenance-first.** Every value-laden claim carries how we know it (a tier, and for judgements a source + date).
3. **Missing ≠ zero.** Absent data is omitted, never guessed; the engine shrinks confidence toward neutral instead of inventing it.
4. **No pay-to-rank.** Nothing in the format can encode sponsorship or paid placement. Rank order is a pure function of facts × the user's weights.
5. **Portable identity.** The values that drive ranking belong to the user and travel between instances; an instance never needs to collect them.
6. **Forkable & plural.** The format is a neutral mechanism. It carries *whatever* values a community defines; it does not privilege one value system.

---

## 1. `Criterion` — a single axis of value

```jsonc
{
  "key": "environment",        // stable id; reused across lenses → joins Discover facets + the theme map
  "label": "Green financing",  // free display text (per-lens)
  "tier": "assessed",          // measured | certified | assessed  (epistemic honesty)
  "source": "curated"          // provenance class for the axis as a whole
}
```

- **`tier`** is the trust contract:
  - `measured` — an objective open-data fact (a Nutri-Score, a price). Shown precisely.
  - `certified` — a third-party certification (B Corp, Fair Trade).
  - `assessed` — a researched judgement. **Rendered as a coarse band, never a false 2-digit number**, and every claim must cite (§3).
- **`key`** is the interoperability primitive: reusing a key (`environment`, `privacy`, `ethics`…) auto-joins an entity to the Discover facets *and* the Values theme map (§4). New keys are a deliberate act.

## 2. `Entity` — a thing being weighed

```jsonc
{
  "code": "triodos",                 // stable id, unique within the lens
  "name": "Triodos Bank",
  "brand": "ethical bank",           // optional
  "description": "…",                // optional
  "scores": { "environment": 98, "ethics": 92 },             // 0-100 numbers, keyed by Criterion.key; OMIT unknowns
  "provenance": { "environment": { "...": "see §3" } },      // per-key basis
  "links":  [ { "label": "Website", "url": "https://…" } ],  // optional
  "region": ["UK", "EU"],            // optional: US | UK | EU | global
  "focuses": ["Fossil-free", "B Corp"]  // optional cross-cutting facet labels
}
```

- `scores` keys MUST be a subset of the lens's `Criterion.key`s. **A missing key means "unknown" — never 0.**
- Domain extensions are allowed as extra fields (e.g. food adds `allergens`, `allergensDeclared`); consumers ignore unknown fields.

## 3. `Provenance` — how we know a score

A provenance value is **either** a legacy plain string (a bare note) **or** a citation object:

```jsonc
"provenance": {
  "environment": {
    "note": "World's #1 fossil-fuel financier — ~$58bn in 2025, ~$430bn since 2016",
    "source": "https://www.ran.org/press-releases/bocc26/",   // a real, resolvable URL
    "asof":   "2026"                                           // year (or ISO date) the claim was true
  },
  "fees": "Monthly account fees common unless waived"          // legacy string still valid
}
```

- For any `assessed` criterion, the citation object (`note` + `source` + `asof`) is the bar. Low-controversy axes (ease, fees) may stay plain notes.
- The engine renders an `asof`-dated **source↗** link per claim and exposes a **dispute** path. Provenance is meant to be *contested*, not trusted blindly.

## 4. `Values` — the portable identity (the "Values Passport")

The standard separates the **universal passport vocabulary** from each instance's **local theme map**.

- The universal passport vocabulary is the cross-instance bridge: `planet`, `people`, `openness`, `access`, `wellbeing`, `autonomy`, `animals`, `community`, `quality`, `joy`.
- A local instance may expose its own themes. Conscious Consuming, for example, uses local themes such as `health`, `honesty`, `privacy`, `cost`, and `local`, then maps them to universal values on export.
- `key2theme` maps criteria to local themes. `universalToLocal` maps a passport's universal values into a receiving instance's local themes.

A person's values are local-first, user-owned, exportable, and portable across instances.

```jsonc
{
  "format": "open-values-passport",
  "version": "0.1",
  "source": "conscious-consuming",
  "values": {
    "planet": 5,
    "openness": 4,
    "autonomy": 5,
    "access": 3
  }
}
```

- A passport's `values` map universal value ids to weights 0-5. `3` is neutral.
- `passportApply(passport, universalToLocal, base)` projects the passport into a receiving instance's local themes, reporting carried and dropped values honestly.
- `themeDefaults(criteria, localWeights, key2theme)` projects local theme weights onto lens criteria, producing the per-criterion weights the engine ranks by. **Set your values once; they travel everywhere.**
- A full export is the user's whole local state (`cc.themes`, profile, saved, notes, contributions) — a file they carry, the privacy-preserving answer to "sync."

## 5. `Lens` — a domain, as a config file

A lens is one ranked domain. It is *data*, not code — adding one is adding a file.

```jsonc
{
  "meta": {
    "id": "banking",                 // globally unique, kebab-case
    "label": "Ethical banking",
    "type": "Services",              // Products | Services | Media | Organizations | Initiatives
    "domain": "Money",               // life-domain (navigation)
    "source": "Conscious Consuming (curated)",
    "attribution": "… not financial advice. Reviewed 2026-06.",
    "allergens": false,              // domain flag (food = true)
    "productBase": "https://…/",     // optional: deep-link base for "see source"
    "presets": { "Balanced": { "w": { "environment": 3, "...": 2 }, "x": [] } }
  },
  "criteria": [ /* §1 — exactly the axes this lens ranks on */ ],
  "products": [ /* §2 — the entities */ ]
}
```

**Conformance (v0.1): a lens is valid if**:

1. `meta.id` is present and stable.
2. `criteria[]` contains unique `key` values and human-readable `label` values.
3. The entity array is present as either `resources[]` (portable instance lenses) or `products[]` (Conscious Consuming datasets).
4. Every entity has a stable `code`, a display `name`, and a `scores` object.
5. Every score key is declared in `criteria[]`.
6. Scores are numbers from 0 to 100. Unknown values are omitted, not set to zero.
7. Provenance is preserved per score key when present. Citation objects use `note`, `source`, and `asof`.
8. Optional fields are ignored by consumers that do not understand them.

Citation-ready public lenses should use provenance objects for assessed claims. Legacy plain-string provenance remains readable for backward compatibility.

## 6. The engine contract — `Ranking`

The reference engine (`app/engine.js`) is a pure function of (entities, criteria, passport-derived weights). It returns, per entity:

```jsonc
{
  "score": 49,          // 0–100 values-relative fit
  "coverage": 0.57,     // share of your weighted axes that had data
  "why": ["Ethics","Transparent"],   // your top-contributing axes
  "facts": 4, "wanted": 7,           // "based on 4 of 7 facts you value"
  "cap": { "label": "Green financing", "v": 12 }   // non-null if a dealbreaker capped the fit
}
```

The formula, fixed in v0.1: `round( (Σ wᵢ·sᵢ / Σ wᵢ)·coverage + 50·(1−coverage) )`, where `coverage = Σ(weighted axes with data) / Σ(weighted axes)`; results below `MIN_COVERAGE` (0.25) are withheld (unknown, not faked); an axis you weight ≥4 that scores ≤20 **caps** the fit at 49 (a non-compensatory veto, so a dealbreaker can't be averaged away). `assessed` sub-scores display as bands (`Strong/Good/Fair/Limited/Poor`), `measured` ones precisely.

---

## 7. Linked-data export

Conscious Consuming's generated verdict cards export each citable entity as JSON-LD. Entity nodes use the Weave
`@context`, schema.org entity types, ODbL licensing, `additionalProperty` band values for scored criteria, per-claim
`citation` URLs, and `dateModified` values derived from `provenance.asof`. Each entity also points to an `isBasedOn`
`Dataset` node for its source lens, with ODbL license fields and a DCAT-style JSON distribution.

Structural price fields are deliberately absent from verdict-card JSON-LD unless a future standard version defines a
safe price contract. Current price-like data remains a local scoring/display concern, not a linked-data promise.

Run:

```bash
npm run audit:linked-data
```

The audit walks the generated card corpus under `app/c/`, compares it with `app/data/*.json`, and confirms entity
coverage, citation/date round-tripping, Dataset cues, and price-field absence.

## 8. Well-Known discovery

The public static package exposes a Well-Known Door at:

```text
/.well-known/open-values.json
```

This JSON file declares the publisher, the Open Values Standard version, the reference instance, privacy promises,
trust artifacts, and every published lens with its data URL, SHA-256 hash, ODbL license, and provenance date range.
It is a discovery convention, not a registry: mirrors and clients can fetch a lens, verify the hash, and decide
locally which publishers they trust.

Run:

```bash
npm run audit:well-known
```

The audit recomputes the manifest from the packaged `app/data/*.json` files and verifies the public discovery file.

The static package also ships a content-addressed stack:

```text
/stacks/index.json
/stacks/lens/<id>/<sha256>.json
```

The stack is deliberately boring: it is just lens JSON copied to hash-named paths. A mirror or citation can fetch a
stack URL, recompute SHA-256, and reject the file if the bytes do not match. This is not a central registry and it is
not a trust decision; it only makes tampering and route drift mechanically visible.

Run:

```bash
npm run audit:stacks
```

The audit compares every stack copy with the packaged `app/data/*.json` source and the Well-Known Door.

## 9. Validator path

The repo-local validator now lives at `research/validate_lens.js`, with JSON Schema drafts in `research/schema/`.
Run:

```bash
npm run audit:conformance
```

It checks:

1. JSON parseability.
2. `meta.id`, criteria uniqueness, and entity identity.
3. Score-key subset of criterion keys.
4. Score range 0-100.
5. Provenance object shape for citation-ready assessed claims.
6. Passport shape: `format`, `version`, `values` using a smoke fixture and any `--passport=<file>` supplied to the script.
7. Optional mappings: `key2theme` keys must refer to criteria, and `universalToLocal` values should refer to local themes.
8. No ranking metadata that encodes sponsorship or paid placement.

The validator reports compatibility with Open Values Standard v0.1. It is not a certification authority and it does
not publish an outside package yet; the practical conformance proof remains: validate the file, load it through the
reference engine, rank it with `score`, export/import a Values Passport, and pass the instance/federation tests that
apply to the surface.

## 10. What is *not* in v0.1 (deliberately deferred)

- **The future decentralized commons layer** — contribution, signing, content-addressing, federation, governance. That is the Values-Layer L5 layer, gated on real use. v0.1 is the *read* contract; the *write/merge* contract is a later version.
- **A published validator package.** v0.1 now has repo-local JSON Schemas and a validator, but a package such as `open-values-validator` earns its place when outside implementers need it.
- **Cross-instance trust/discovery.** How a passport decides which commons to trust is an L5 concern.

## 11. Versioning

This protocol is **v0.1**. v0.1 was forced by exactly the event this section anticipated: the second instance (**Kosplora**) consumed v0 and revealed one real revision — **the value vocabulary (`THEMES` / `KEY2THEME`) must be instance-injectable, not baked into the engine** — so `themeDefaults(criteria, passport, k2t)` now takes the key→theme map as an optional parameter. See [INSTANCE-2-KOSPLORA.md](INSTANCE-2-KOSPLORA.md) §9.

The reference engine is currently `VERSION: '0.10'`. That implementation version can advance for engine primitives, Weave helpers, or test coverage without necessarily changing the protocol. The protocol version changes when the data contract, passport contract, or conformance requirements change. v1 is cut when more instances force more revisions. Breaking changes bump the major; the reference implementation (CC) always tracks head.
