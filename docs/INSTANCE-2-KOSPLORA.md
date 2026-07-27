# Instance #2 — Kosplora, and why it (not Global Steward) is the rule-of-three test

*Scoping analysis, 2026-06-20. Companion to [THE-VALUES-LAYER.md](THE-VALUES-LAYER.md) §7 (the rule of three) and [STANDARD-v0.md](STANDARD-v0.md). Grounded in research on open-education rubrics and civic-consensus systems.*

> **One instance is an app; two is a substrate.** A second instance exists to *falsify* the claim "this substrate is general." A falsification test is only informative if it **reuses the substrate and varies the domain**. Judged by that rule, **Kosplora is the right instance #2; Global Steward is instance #3 (the commons layer), not #2.**

---

## 1. The verdict

| | **Kosplora** (open education) | **Global Steward** (civic consensus) |
| --- | --- | --- |
| Reuses today's engine (Entity × sourced Criteria × portable Values, read-only)? | **Yes — wholesale.** | **No.** Replaces values-rank with *bridging*-rank. |
| New primitives it forces | One *parameter* (time-decay of a criterion) | **Three** (write/commons layer, pseudonymous Sybil-resistant identity, bridging algorithm) |
| Are the criteria pre-built & openly licensed? | **Yes** (Achieve/ISKME OER rubrics are CC-BY; MERLOT, Common Sense, Class Central) | N/A — it isn't a criteria-ranking problem |
| What passing it proves | **The values-ranking substrate is transferable** (the thing we want to prove) | The *commons/bridging* substrate is real (a different claim) |
| Cost/risk to build now | Low — *ingest* rubrics, configure a lens | High — front-loads the exact layer we deliberately deferred, on an unsolved identity problem |

**Build Kosplora as instance #2. Park Global Steward as instance #3 — built *on top of* a proven engine, not *instead of* one.**

---

## 2. Why Kosplora is a clean configuration, not a rewrite

Open education is the rare domain where **the rating dimensions are already professionally formalized, sourced, and public-domain** — you *ingest* the criteria rather than invent them. That makes it an unusually honest transferability test: if the engine ranks learning resources as cleanly as it ranks banks, generality is demonstrated; if it leaks, you find out cheaply.

**Entity** = a learning resource (a course, book, tool, channel, OER object). (The Achieve rubric's "object = smallest stand-alone meaningful unit" answers the granularity question.)

**Criteria** — drawn straight from the existing instruments, each *sourced* exactly like CC's:

| Criterion (`key`) | Sourced from | Tier |
| --- | --- | --- |
| `rigor` — accuracy / content quality | MERLOT "Quality of Content"; Achieve #2 | assessed / certified |
| `pedagogy` — instructional design | Common Sense "Pedagogy"; Achieve #6–7 | assessed |
| `openness` — free? OER-licensed? paywalled? | license metadata | **measured** |
| `accessibility` — WCAG / UDL | Achieve #8 "Assurance of Accessibility" | certified / measured |
| `currency` — how up-to-date | publish/update date | **measured** (decays — see §3) |
| `prereqs` — prerequisite load | MERLOT prerequisite field; SUNY OSCQR | assessed |
| `time_to_value` — time commitment | Class Central; learner guides | measured |
| `engagement` | Common Sense "Engagement" | assessed |
| `effectiveness` — does learning transfer? | MERLOT "Potential Effectiveness" | assessed *(hardest — proxy honestly, §5)* |

**Values** — the learner's portable passport, re-weighting those criteria. **This is the whole point, and the place every incumbent fails.** Class Central gives *one* global Bayesian ranking; MERLOT gives *one* set of expert scores. **None of them re-weight by the individual.** Yet a self-taught career-switcher weighs `openness` + `time_to_value`; a university adopter weighs `accessibility` + standards-alignment; a depth-seeker weighs `rigor` + deeper-learning. Re-weighting by portable values is *precisely what CC's engine already does* — which is the strongest possible signal that the substrate transfers.

Note how this maps onto the **existing 8 themes** with almost no new vocabulary: `openness`→Honesty/Privacy, `rigor`/`pedagogy`/`effectiveness`→a (new) *Learning* theme or People, `accessibility`/`time_to_value`→Cost&ease, `currency`→Health(freshness) or its own. The Values Passport is *almost* domain-portable as-is — and the small gaps it reveals are exactly what a rule-of-three test is supposed to surface.

## 3. The one genuine stress (a feature, not a blocker)

**Currency decays.** A 2019 web-dev course can be obsolete; a brand's labor record ages far more slowly. Open education makes *time-decay of a criterion* load-bearing in a way consumer ethics doesn't. This is **a parameter on an existing criterion, not a new primitive** — and it's the ideal kind of mild stress: it teaches the Standard whether `Criterion` needs an optional `half_life` / decay field, discovered on a real second domain rather than guessed. Likely outcome: v0 → v0.1 adds an optional decay hint. That is the rule of three working as designed.

## 4. Why it's a real product (its reason to exist)

Open educational resources have one chronically documented failure: **discoverability.** Learners and teachers "can't find high-quality OER suitable for their needs" because repositories are fragmented by region/institution/project and metadata is absent or non-uniform. A values-weighted ranking over a *unified* Entity×Criteria index is a direct answer to a problem the literature names explicitly. And there's timing: **Common Sense Education is pausing its edtech reviews in February 2026** — a curation vacuum opening exactly as a values-ranked alternative could fill it. Kosplora is a genuine product, not a demo.

## 5. Honest caveats (carry these in)

- **`effectiveness` is the hardest to source** — true learning-transfer data rarely exists. Proxy it transparently (completion + review sentiment + engagement) and *label it a proxy*, per the Standard's provenance-first invariant. Don't fake it.
- **Crowd-review corpora (Class Central / Goodreads-style) are often proprietary;** the *expert rubrics* (Achieve CC-BY) are reusable, the *review data* may not be. Confirm data rights before depending on them — prefer open/own-collected signal.
- **Don't re-skin CC.** The transfer test only means something if Kosplora gets its *own* presentation (L3) — proving the engine/data (L0–L2) separate cleanly from the shell. A learning *atlas* should look nothing like a consumption *map*.

## 6. What "instance #2" concretely is (the minimal honest build)

The point is not a full product — it's the *falsification test*, run as cheaply as possible:

1. **One Kosplora lens** in the Standard's format: ~15–25 real learning resources, the criteria above, sourced provenance (ingesting Achieve/MERLOT/Common Sense scores where licensed).
2. **The same `engine.js`, imported unchanged.** If it ranks learners' resources by their values without a single edit to the engine, L0–L2 transferability is *proven*. If it needs an edit, that edit is the abstraction the rule of three was built to find (likely: the `currency` decay field).
3. **A distinct minimal shell** (even a rough one) over the same engine — proving L3 skinnability.
4. **Write down what leaked.** Every edit the engine needed → a Standard v0.1 revision. *That* is the deliverable: not Kosplora-the-product, but *Standard v1, forced into existence by a real second domain.*

This can be a weekend's proof, not a quarter's project — which is itself the test of whether the substrate is real.

---

## 7. Global Steward — instance #3, the commons layer (why later)

Global Steward is the more *important* and more *novel* project. It is the wrong *transferability* test now, because it doesn't exercise the values-ranking engine at all — it forces a different machine:

- **A write/commons layer.** Users *create and deliberate on* statements/proposals (the pattern of Pol.is, Decidim, Loomio), with state, moderation, and binding thresholds. CC's substrate is deliberately **read-only**; this is the very layer we deferred. Building it to satisfy a rule-of-three would front-load the *most* speculative, *least* reusable infrastructure first — backwards.
- **Pseudonymous, Sybil-resistant identity.** Cohort consensus needs one-human-one-voice without surveillance. The research is blunt: there is **no clean deployed answer** — BrightID (social-graph, surveillance-light, and a natural fit for Dunbar cohorts), Gitcoin Passport (stacked weak credentials), ZK proof-of-personhood are all trade-offs on the {Sybil-resistance, pseudonymity, decentralization} triangle. World ID's biometric orb maximizes Sybil-resistance but destroys pseudonymity — the anti-pattern. Betting transferability on an open research frontier is unwise.
- **Bridging-rank, not values-rank — the deep one.** CC's engine ranks *Entities by Criteria weighted by an individual's Values* (deliberately personal: my ranking ≠ yours). Civic consensus does the **opposite**: Pol.is clusters opinion (k-means) and elevates statements agreed *across* clusters; Community Notes uses **matrix factorization** over a person×statement matrix, publishing a note only when people who usually *disagree* both rate it helpful (the note-intercept = broad helpfulness; the note-factor = polarization). That is a *different objective function* — find the common ground, not serve the individual. You would not reuse the ranking core; you'd write a new one (and rightly draw on Ovadya & Thorburn's *Bridging Systems* and the Prosocial Ranking Challenge's evidence that bridging measurably lowers polarization).

So Global Steward is a coherent, exciting **instance #3**: bridging-rank as a *sibling* to values-rank, a write/commons layer, and surveillance-light cohort identity — built **after** Kosplora has shown the read engine generalizes, so the commons extends a proven core instead of substituting for it.

---

## 8. Recommendation

1. **Build the Kosplora falsification test** (§6) when ready — a thin lens + the unchanged engine + a distinct shell. Its real output is **Standard v1**, revised by contact with a genuinely different domain.
2. **Park Global Steward as instance #3 / the commons layer** — and, when its time comes, co-design L5 (the decentralized commons) *with* it, since its governance/identity/bridging needs are exactly what L5 must answer.
3. **Sequence honored:** read-engine generality (Kosplora) before write-commons novelty (Global Steward). Prove the brick before pouring the foundation for the cathedral.

*And the standing caveat from the north star: none of this should pull effort from getting Conscious Consuming itself in front of real people. Instance #2 is the forcing function for the **architecture**; real users are the forcing function for the **project**. The second matters more.*

---

## 9. Result — the test was built and run, and it PASSED (2026-06-20)

### Round 12 decision-page addendum (2026-07-14)

The original test proved that the ranking engine transfers. Development Round 12 asks the harder product question:
does the new decision interaction transfer without returning to a value-weighting quiz? It does.

Conscious Consuming and Kosplora now import the same domain-neutral `app/decision.js` component for practical dial
weighting, computed answer recipes, answer explanations, show-the-math rows, and range language. Kosplora contributes
configuration only: three learning dials, three durable learning lines, an honest zero-fold illustrative floor,
twelve resources, and its distinct dark atlas skin. The shared component contains no learning, Kosplora, coffee,
or banking branch.

At zero setup the lens computes both evidence-supported recipes. One practical move — **Established material or the
most current?** fully toward **Most current** â€” changes Best for most from Stanford Encyclopedia of Philosophy to
Wikipedia. There is deliberately no Budget, honest recipe because the lens has no dependable price facts. Portable
leanings remain behind **Fine-tune close calls** and break equal dial scores last.

`npm run audit:generality-release` reproduces the receipt and verifies that filtered resources remain in the
show-anyway fold. The public surface stays explicitly **illustrative, not an endorsement**: its legacy score notes
are sufficient to exercise the component, not sufficient for release-grade claims.

### Original engine result (2026-06-20)

The falsification test exists, twice over:
- **Headless & reproducible** — `research/kosplora_test.js` imports `app/engine.js` **unchanged** (via `module.exports`) and ranks 12 learning resources for four learners.
- **Visual** — `kosplora/index.html`, a standalone page with a deliberately *different* skin (dark "learning atlas," indigo, serif display), loading the same `../app/engine.js`.

**What transferred (unedited):** `score()`, `band()`/`bandFill()`, `scoreTier()`, the coverage/confidence model, the "strongest on" reasons — and even the FLIP "living ranking" animation — all worked on a new domain with **zero edits to the engine**. The ranking core is genuinely domain-agnostic.

**What leaked (exactly one thing):** the **value vocabulary** (`THEMES` + `KEY2THEME`) was baked into the engine, so a learner's portable values couldn't reach education-specific criteria — `themeDefaults` projected unknown keys to neutral. *This is precisely the abstraction the rule of three exists to find.*

**The fix → Standard v0.1:** `themeDefaults(criteria, passport, k2t)` now takes the key→theme map as an **optional parameter** (defaulting to CC's, so CC is untouched). Kosplora injects its own vocabulary (`rigour / open / ease / fresh`); the engine bumped to **v0.1**. One backward-compatible line — *the entire deliverable of the test.*

**The result:**
```
Rigour-first      #1 Stanford Encyclopedia of Philosophy   top3: SEP, 3Blue1Brown, freeCodeCamp
Well-taught/easy  #1 Khan Academy                          top3: Khan, 3Blue1Brown, freeCodeCamp
…the full list reorders for every value profile…
PASS — different values → different top picks, via a vocabulary the engine never knew. The substrate transfers.
```
A rigour-seeker and a well-taught-&-easy learner get **different #1s from the same engine and the same facts.** That is transferability, demonstrated — not argued.

**One honest finding (kept, not hidden):** the 3↔5 weighting is intentionally *mild*, so a broadly-excellent option (here SEP — deep, open, current) holds the top against single-axis prioritisation, exactly as in CC. Values reorder the field and move the top pick (Khan wins "well-taught & easy"), but don't flip it for *every* value. A real property of the engine, surfaced only by running a second instance.

**Verdict: the values-ranking substrate is transferable — proven, at the cost of one backward-compatible revision (Standard v0.1).** *One instance was an app; two is a substrate.* Global Steward (instance #3) remains the home for the eventual write/commons layer.
