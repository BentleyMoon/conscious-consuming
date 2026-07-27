# R&D-1.1 — Open Food Facts data & coverage audit

> **Question:** Is Open Food Facts dense and clean enough — *including for US products* — to power honest comparisons in our candidate categories?
> **Method:** real samples pulled from the OFF v2 API on 2026-06-15 via [`audit_off.py`](audit_off.py) (global) and [`audit_us.py`](audit_us.py) (US-filtered). 300 products sampled per category per scope; field "presence" measured for the fields Ring 0 depends on; total/US counts via the API's exact `count`.

---

## Verdict (TL;DR)

**✅ The cornerstone holds.** OFF has ample products and strong coverage of the core comparison fields — ingredients, processing (NOVA), Nutri-Score, and environmental score — *including for US products*, across our candidate categories. Two caveats shape the build:

1. **Allergen *tags* are under-populated** (US plant beverages: 35%). → The allergen hard-filter must be **derived from `ingredients_text`** (≈99–100% present), not from `allergens_tags` alone.
2. **Environmental score is uneven by category** (cereals 100% US; snack bars 39% US). → Treat eco-score as *available-where-present*, not guaranteed.

**Lead categories:** **breakfast cereals** (densest, cleanest) and **plant-based beverages** (large pool + the strongest values story). **Snack bars** are weakest (small pool, poor eco-score) → defer.

---

## Product volume (exact API counts)

| Category | Global | United States |
|---|---:|---:|
| Plant-based beverages | 71,483 | **13,885** |
| Breakfast cereals | 26,092 | 3,687 |
| Cereal / snack bars | 4,917 | 830 |

US data is a *minority* of the Europe-heavy global pool, but it is real and substantial — enough to launch a US-facing product and enough material for guides.

---

## Field coverage — % of sampled products with the field

**Global sample** (300 each)

| Field | Plant beverages | Breakfast cereals | Snack bars |
|---|---:|---:|---:|
| Nutri-Score | 91.7 | 99.7 | 87.7 |
| Processing (NOVA) | 94.3 | 98.0 | 97.0 |
| Eco / Green-Score | 80.7 | 99.7 | 65.0 |
| Allergen tags | 39.7 | 94.7 | 89.0 |
| Labels | 85.0 | 96.3 | 86.0 |
| Ingredients text | 97.0 | 99.7 | 98.0 |

**US-only sample** (300 each)

| Field | Plant beverages | Breakfast cereals | Snack bars |
|---|---:|---:|---:|
| Nutri-Score | 85.0 | 90.0 | 91.0 |
| Processing (NOVA) | 95.3 | 98.7 | 97.7 |
| Eco / Green-Score | 81.7 | **100.0** | **39.0** |
| Allergen tags | **35.0** | 67.0 | 87.0 |
| Labels | 76.3 | 79.7 | 69.0 |
| Ingredients text | 99.3 | 100.0 | 98.0 |

---

## What this means

1. **Comparisons are viable today.** Ingredients, NOVA, and Nutri-Score are densely populated for US products — the spine of a health/processing comparison is there now.
2. **Build allergen detection from ingredients, not tags.** The `allergens_tags` field is the weakest, especially for US plant beverages (35%). Since `ingredients_text` is ~99–100% present, parse allergens from ingredients (and always defer to the physical label for safety-critical use).
3. **Environmental comparison is category-dependent.** Strong for cereals (100% US), thin for snack bars (39% US). Lead environmental claims where coverage supports them.
4. **Euro-skew is real but not blocking.** Default samples are France/Belgium-heavy; US volume is nonetheless in the thousands-to-tens-of-thousands. A natural, on-ethos response: **contribute US product data back to OFF** as we go.
5. **Nutri-Score caveat:** historically "not-applicable" for some beverages, yet still ≥85% present here — usable.

---

## Limitations (honest)

- Coverage is from a **300-product sample** per scope, under the API's default ordering (which may favor more-complete/popular products) — long-tail coverage may run somewhat lower. **Counts are exact**; coverage percentages are estimates.
- **Presence ≠ accuracy.** OFF is crowd-sourced; fields can be wrong or stale. Spot-check before trusting any individual value, and surface provenance + a "report a correction" path in the product (per [`CRITERIA-STANDARD`](../../docs/CRITERIA-STANDARD.md)).
- One transient `503` occurred (plant beverages, first run) — handled by retry/backoff; numbers above are from successful pulls.

---

## Recommendation → into the build

- **Seed categories:** breakfast cereals + plant-based beverages. Hold snack bars.
- **Allergens:** derive from `ingredients_text`; label tags as supplementary.
- **Eco-score:** show where present; don't promise it everywhere.
- **First guide (R&D-1.3):** plant-based milk — large US pool + the richest values narrative. → [`content/guides/plant-based-milk.md`](../../content/guides/plant-based-milk.md).

## Reproduce

```
python audit_off.py     # global coverage → audit_summary.json, sample_products.csv
python audit_us.py      # US coverage + plant-milk retry → audit_us.json
```

*Outputs in this folder: `audit_summary.json`, `audit_us.json`, `sample_products.csv`.*
