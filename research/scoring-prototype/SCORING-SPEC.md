# R&D-2.1 / 2.2 — Scoring & Alternatives: spec + eval

> The two-axis engine: how OFF facts become comparable 0–100 scores, how *your* values weight them, how we handle uncertainty, and how "better alternatives" works — plus the **honest eval** on real data. Code: [`score_off.py`](score_off.py). Drafted 2026-06-15.

---

## Verdict

**The product thesis holds.** On 148 real Open Food Facts plant-milk products, the engine produces **sane, explainable, values-differentiated rankings** and **coherent alternatives** — *after* fixing three problems the first run exposed (see Eval). This is the core "magic" of Ring 0, and it works on real data.

---

## Axis A — objective sub-scores (the facts)

Each OFF signal normalizes to a comparable **0–100**, where higher = better.

| Criterion | OFF signal | Mapping → 0–100 |
|---|---|---|
| Nutrition grade | Nutri-Score a–e | a=100, b=75, c=50, d=25, e=0 |
| Processing | NOVA 1–4 | 1=100, 2=66, 3=33, 4=0 |
| Environment | Green-/Eco-Score a–e | a=100 … e=0 |
| Protein | `nutriments.proteins_100g` | min–max within category* |
| Low sugar | `nutriments.sugars_100g` | 100 − min–max(sugar)* |
| Ethics | recognized labels (organic, fair-trade…) | 0 / 50 / 100 by count |
| ~~Cost~~ | — | **excluded — OFF has no reliable price** |

**Missing data → the criterion is omitted, never scored as zero** (no fake penalty for incompleteness). *\*min–max is sample-relative in v0; flagged for refinement.*

## Axis B — your values

- **Weights** per criterion (0–1), from the profile survey.
- **Hard filters** (allergens) → **exclude** the product, never merely down-rank it.

## The personalized score

1. Weighted average of objective sub-scores, over the criteria you weight **and** that have data.
2. **Coverage** = Σ(weights with data) ÷ Σ(all your weights) — how much of what you care about we actually know.
3. **Confidence adjustment:** `score = raw × coverage + 50 × (1 − coverage)` — a product we know little about is pulled toward neutral, so **sparse data can't game the top of the list**.
4. Below **25% coverage** → unrankable (we say "we don't know enough"), rather than guess.
5. **Explanation:** the top two criteria driving the score ("← environment, processing").

## Better alternatives

Within the **same tight category**, products scoring meaningfully higher for *your* profile, each tagged with what it's "stronger on." Category tightness is essential (see Eval #1).

## Allergens

Derived from **`ingredients_text`** (tags are too sparse — see the [data audit](../off-data-audit/README.md)), with a **multilingual** keyword heuristic (EN/FR, since the data is French-heavy). The physical label is always authoritative; anything safety-critical defers to it.

---

## The eval (real data — `plant-based-milk-alternatives`, 148 products)

**v1 exposed three real problems** — exactly what the spike was for:

1. **Category pollution** — the broad `plant-based-beverages` tag mixed in teas, juices, and chicory, so "alternatives" compared a peach iced tea to coconut cream.
2. **Sparse-data gaming** — products with only 35% coverage tied at 100.0 and topped the list.
3. **Allergen under-detection** — English-only keywords on French data excluded just **1** product.

**v2 fixes → the results are now sane:**

| Fix | Result |
|---|---|
| Tight category (`plant-based-milk-alternatives`) | Only real plant milks ranked |
| Confidence adjustment + 25% floor | Top picks all have 100% data; no sparse 100s |
| Multilingual allergen terms | Nut-allergy filter removed **35** nut milks (was 1) |

Representative output:
- **Climate-first:** `Boisson soja nature BIO · Regain` 90.0 ← environment, processing (soy is genuinely low-impact)
- **Nut-allergy family:** 35 nut products excluded; soy milks surface (88–91)
- **Protein-seeker:** soy milks top, incl. `High Protein Soja Drink · alpro` — matches the nutrition science
- **Alternatives:** anchor `Boisson cajou (cashew) · Bjorg` 47.5 → soy 90.0, coconut 80.0

Cross-checked against the [plant-milk guide](../../content/guides/plant-based-milk.md): the engine's "soy for protein, soy/oat for climate" agrees with the cited literature. ✅

---

## Honest remaining refinements (carry into the build)

- **Coarse grades cause ties.** Nutri-Score (5 levels) and NOVA (4 levels) produce many ties (several soy milks at 92.5). Finer ranking needs more continuous signals (lean harder on `nutriments`) + tie-breakers.
- **Sample-relative normalization.** Protein/sugar min–max should become an absolute or category-anchored scale so scores are stable across pulls.
- **Allergen detection needs real parsing**, not keywords, before it's trustworthy for safety — multilingual NLP over ingredients + OFF allergen tags where present. *Always* defer to the label.
- **Soy dominance is real** (low impact, high protein) but partly reflects the French organic-soy-heavy sample; watch for data/category bias.
- **Confidence shrinks toward 50** in v0; shrinking toward the *category mean* may be fairer.

---

## What this earns for Ring 0

The scoring engine is **buildable and honest**. Non-negotiables it validated: tight categories, confidence-adjusted scoring, ingredient-derived multilingual allergens, and missing-data-as-"unknown." → Next: **R&D-2.3**, designing how a user actually *sees* and trusts this.
