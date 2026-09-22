# Mass Data Access Plan

Updated: 2026-06-29

Purpose: find high-volume, source-honest ways to grow Conscious Consuming without lowering the evidence bar. Bulk sources should become generated or semi-generated content only when the source has clear public access, stable fields, licensing/attribution we can honor, and enough scorable rows to pass the roughly 50-entry floor.

## Working rule

Use mass data for objective or certified signals. Do not bulk-ingest proprietary rating sites, search-result lists, affiliate pages, or scraped brand rankings. If a source cannot explain the basis for a score, use it only as candidate discovery and keep the final lens curated.

## Strongest bulk routes

| Route | Best use | Why it fits | Caveat |
| --- | --- | --- | --- |
| Open Food Facts | New food frontier categories | Already wired into `pipeline/fetch_raw.py`, ODbL, product-level provenance, Nutri-Score/NOVA/Green-Score/labels | Some categories need custom presets or should be avoided if health/ethics scoring would mislead |
| Open Beauty Facts | Personal-care frontier categories | Already wired into `pipeline/fetch_beauty.py`, ODbL, product-level provenance, ingredients/labels | Many beauty frontiers have sparse fields; only keep categories over the scorable floor |
| Open Prices | Affordability layer for food | Already wired into `pipeline/fetch_prices.py`, baked at build time | Coverage varies by barcode and region |
| EPA Safer Choice / Envirofacts | Cleaning, laundry, dish soap, floor cleaners | Certified source, downloadable dataset, strong fit for safer-chemical claims | US-specific; scores should be certification-first rather than broad product virtue |
| F-Droid index plus Exodus Privacy | Open/privacy Android app lenses | Large app metadata, source-code links, licenses, anti-features, permissions and tracker reports | Needs a dedicated digital-app scorer and careful package matching |
| iFixit API / repair pages | Phones, laptops, tablets, consoles | Repairability evidence fits existing `repairability` and `longevity` criteria | Coverage is uneven; better as enrichment than a whole category generator |
| IRS EO BMF plus ProPublica Nonprofit Explorer | Causes and nonprofits | Public nonprofit metadata, filings, NTEE categories, financial fields | Do not turn tax fields into impact scores without a careful guide/model |
| Gutendex / Open Library / Wikidata | Books and learning resources | Public-domain/library metadata at high volume | Better for discovery and open-access facets than for moral scoring |

## Probe results from 2026-06-29

Command used:

```bash
python pipeline/probe_mass_sources.py
```

Open Food Facts candidates that cleared the rough floor in small probes. The API returned intermittent 503s, so treat these as observed viability signals and keep the existing retry/no-shrink pattern when turning any candidate into a real fetcher.

| Candidate | Best tag | Scored rows in probe | Notes |
| --- | --- | ---: | --- |
| Fish & seafood | `fishes` | 297 | Status: Part 2/5 implemented as `fish-seafood`; guide caveats cover mercury and seafood-specific sustainability limits |
| Baby food | `baby-foods` | 259 | Viable, but health-adjacent; needs explicit not-medical-advice framing |
| Bottled water | `waters` | 174 | Good ontology fit; should emphasize packaging/locality limits |
| Meat & poultry | `meats` | 100 | High-impact, but existing food criteria understate animal welfare and climate specifics |
| Ready meals | `prepared-meals` | 99 | Status: Part 3/5 implemented as `ready-meals`; useful honest-floor category with guide caveats for sodium, processing, and serving-size limits |
| Spices & seasonings | `spices` | 91-260 | Status: Part 4/5 implemented as `spices-seasoning`; guide copy explains limits around salt, labels, allergens, and supply-chain opacity |
| Beer | `beers` | 89 | Technically viable; lower preview priority |
| Wine | `wines` | 71 | Technically viable; lower preview priority |
| Flour & baking | `flours` | 193 observed in ad hoc probe; flaky in repeat run | Status: Part 5/5 implemented as `flour-baking`; guide copy distinguishes plain flour from sugar/sodium-heavy mixes and allergy-sensitive blends |

Open Beauty Facts candidates:

| Candidate | Best tag | Scored rows in probe | Notes |
| --- | --- | ---: | --- |
| Fragrance | `perfumes` | 97 | Viable but sensitive; transparency gaps should be explicit |
| Body lotion | `body-milks` | 41 | Below floor in small probe; retry broader tags before adding |
| Makeup | `mascaras` | 24 | Too thin with current scoring |
| Nail care | `nail-care` | 25 | Too thin with current scoring |
| Hair styling | `hair-gels` | 19 | Too thin with current scoring |

Open Pet Food Facts:

| Candidate | Best tag | Scored rows in probe | Notes |
| --- | --- | ---: | --- |
| Cat food | `cat-food` | 65 | Data exists, but existing human-food scorer is not appropriate |
| Dog food | `dry-dog-food` | 37 | Needs more tags and a pet-specific scorer |

EPA Safer Choice / Envirofacts:

The first 2,000 rows include large directly useful sectors: laundry detergents (342), all-purpose cleaners (293), floor cleaners (205), carpet cleaners (182), odor removers (179), dish soaps (100), and automatic dishwasher products (56). This is the best next mass source because it is certified, current, and maps to existing Home frontier categories.

## Recommended implementation sequence

1. Build `pipeline/fetch_safer_choice.py` for EPA Envirofacts.
   - Status: Part 1/5 implemented the first generated category, `dish-soap`, from EPA Safer Choice / Envirofacts.
   - Consider `safer-choice-cleaners` or enrichment of `cleaning-products` only after Claude/product agrees whether certification-only datasets should sit beside curated rosters.
   - Criteria can reuse existing keys: `certification`, `health`, `environment`, `transparency`, `accessibility`.

2. Add Open Food Facts frontier categories in small batches.
   - Status: Part 2/5 implemented `fish-seafood` from Open Food Facts.
   - Status: Part 3/5 implemented `ready-meals` from Open Food Facts.
   - Status: Part 4/5 implemented `spices-seasoning` from Open Food Facts.
   - Status: Part 5/5 implemented `flour-baking` from Open Food Facts.
   - Best next: `baby-food`, `bottled-water`.
   - For each: add to `fetch_raw.py`, ontology, `ORDER`, price list when useful, guide, and `verify_run.js` category count.
   - Avoid alcohol until product/health framing is settled.

3. Add `fragrance` from Open Beauty Facts only if the guide is honest about sparse ingredient disclosure.
   - It clears the scorable floor, but the decision is more sensitive than soap/shampoo.

4. Make a separate pet-food scorer before adding pet categories.
   - Reusing human-food nutrition scores would be misleading.

5. Build a digital app scorer later.
   - F-Droid can supply open-source, license, anti-feature, source-code and update fields.
   - Exodus Privacy can supply tracker/permission reports.
   - This should generate a distinct category such as `android-privacy-apps` or enrich `digital-services`, not overwrite the current hand-curated digital services lens.

## Sources to avoid for bulk ingestion

- Good On You, EWG, Charity Navigator/Candid, paid financial databases, app-store ranking pages, affiliate roundups, and unsourced "best of" pages. They may help human research, but they are not clean bulk data feeds for this commons.

## Local tooling

Use the read-only probe before any generated category expansion:

```bash
python pipeline/probe_mass_sources.py --pages 3 --page-size 100
```

If a candidate clears the floor, convert it into a real fetcher or add it to an existing fetcher, then run the full build gate:

```bash
python pipeline/build_datasets.py
python pipeline/build_guides.py
node research/verify_run.js
node research/evidence_audit.js
```
