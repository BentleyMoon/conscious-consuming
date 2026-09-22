# S3 allergen baseline - 2026-07-15

Scope: the 50 cached Open Food Facts JSONL categories consumed by `pipeline/build_datasets.py`, measured before the Phase 1 mapping change.

## Source boundary

- EU Regulation 1169/2011 Annex II defines the EU-14 list. Milk includes lactose in the regulation; CC keeps lactose as a distinct intolerance control without assuming every milk declaration is a lactose declaration.
- Open Food Facts supplies distinct allergen and trace tags, but its volunteer-contributed data is not guaranteed complete or accurate.
- Absence of a structured tag is therefore missing data, never evidence that a product is free of an allergen.

Authoritative references:

- https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011R1169
- https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/explain-product-attributes/
- https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/

## Frozen raw baseline

| Measure | Count |
| --- | ---: |
| Raw product rows | 20,651 |
| Rows with `allergens_tags` | 12,735 |
| Rows with `traces_tags` | 6,701 |
| Rows with either structured field | 13,789 |
| Rows with neither structured field | 6,862 |

Observed primary `allergens_tags` counts included milk 4,746; gluten 4,633; soybeans 2,599; eggs 1,877; nuts 1,728; mustard 1,319; fish 908; sesame 751; celery 749; peanuts 742; sulphites 558; crustaceans 92; lupin 88; and molluscs 48. All EU-14 groups therefore exist in the current cache, but the old mapper recognized only gluten, nuts, peanut, soy, and ingredient-detected coconut.

## Frozen generated baseline

| Measure | Count |
| --- | ---: |
| Built food products | 19,772 |
| `allergensDeclared: true` | 12,495 |
| Declared with an empty mapped allergen list | 4,736 |
| `allergensDeclared: false` | 7,277 |
| Ingredient-detected group while undeclared | 613 |

The 4,736 declared-empty products are the critical defect. The existing app converts that shape into generic "Declared free of tracked allergens" copy even when a raw declaration such as `en:milk` was merely outside the old four-group structured map.

## Phase 1 acceptance boundary

1. Structured contains and trace evidence must remain distinct and both must stay conservatively filterable.
2. Explicit free claims must be group-specific, source-declared, and disjoint from positive/trace evidence; conflicts fail closed.
3. Ingredient detection remains non-declared fallback evidence.
4. `allergensDeclared: true` with an empty legacy union must be impossible while the old app consumer exists.
5. Unmapped and missing source data must remain visible as no data.
6. The data layer can prepare three-state rendering, but app release remains blocked until H14 consumes it consistently.
