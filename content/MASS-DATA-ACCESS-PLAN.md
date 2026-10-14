# Mass Data Access Plan

Updated: 2026-10-14

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
   - Consider `safer-choice-cleaners` or enrichment of `cleaning-products` only after the app lane agrees whether certification-only datasets should sit beside hand-checked rosters.
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
   - This should generate a distinct category such as `android-privacy-apps` or enrich `digital-services`, not overwrite the current hand-checked digital services lens.

## Deepening the food caches (2026-10-14)

The generated food categories were capped at 400 Open Food Facts records each (8 pages of 50 in `pipeline/fetch_raw.py`). Raising the cap was measured before it was changed.

What a deeper cache costs, measured by fetching every food category to 1,000 records (the API ceiling, see below) and building:

| Surface | Loaded | At 400 (HEAD) | At ~1,000 | Budget |
| --- | --- | ---: | ---: | --- |
| `app/data/nodes/ask-core.json` | eagerly, by every visitor | 619,947 B (100 KB gz) | 929,500 B | 780,000 B with 50 KB headroom (`node_index_audit.js`) |
| `app/data/nodes/ask-index.json` | lazily, on product search | 5,677,509 B (1.07 MB gz) | 8,296,577 B (1.78 MB gz) | 6,000,000 B (`node_index_audit.js`) |
| Largest category JSON | per category, on demand | ~0.9-1.3 MB | ~2.1 MB | none |
| `app/data.js` (file:// fallback, committed, omitted from the public deploy) | never in served mode | 43.3 MB | 77.4 MB | GitHub warns at 50 MB, refuses at 100 MB |

Category data loads per category and the service worker precaches only `index.json`, so per-category size was not the limit. The binding limit is the eager Ask core: every brand the deeper catalogue adds becomes a startup search target. At 1,000 per category it exceeded its budget by about 150 KB.

What was done:

- `ask-index.json` is now written one token per line instead of one posting per line. It parses to the identical object and keeps line-per-token diffs. The raw saving is about a fifth. gzip had already removed most of that whitespace in transit, so the gain is in raw bytes and parse work, not much in transfer. The 6 MB budget was not moved.
- The cap is now 500 (`DEFAULT_CAP` in `fetch_raw.py`), fetched append-only with `--deepen`: existing records are kept byte for byte and new codes are added behind them in OFF's own order. Caches already above the cap (cheese, eggs, spices at 800) are unchanged.
- Result: 24,228 -> 29,693 entries across 126 -> 130 categories. Ask core is at 717,398 B (62.6 KB headroom), the Ask index at 5,548,292 B (1.22 MB gz), and `app/data.js` at 52.4 MB.
- Four new generated categories: `bottled-water` (OFF `waters`, 500 raw -> 446 scored), `fragrance` (OBF `perfumes`, 445 raw -> 120 scored, with the transparency criterion renamed "Lists ingredients" and every note saying a listed "parfum" can hide many undisclosed compounds), `floor-cleaners` (EPA Safer Choice, 64) and `carpet-cleaners` (EPA Safer Choice, 68).
- Held: EPA Odor Removers (42 consumer products after merging one row per UPC) and Automatic Dishwasher Products (17) are below the floor. EPA All-Purpose Cleaners (121) duplicates the hand-checked `cleaning-products` decision. Alcohol, baby food and pet food stay held, as above. The 12 earlier beauty lenses were not deepened: they have been edited since generation, so regenerating them would overwrite that work.

To go further, the app lane would need to lazy-load brand targets out of the startup Ask core and shard `ask-index.json`. With both done, the 1,000-record caches are one `fetch_raw.py --deepen --cap 1000` away.

API limits observed. Open Food Facts documents 10 search requests a minute. The fetchers now wait 6.5 s between search requests, send a descriptive User-Agent, and do not retry 4xx answers. Anonymous search returns HTTP 401 past page 10 of 100, so the API path tops out near 1,000 records per tag. Deeper than that needs the bulk dump (`ingest_dump.py`). Intermittent 503s still happen, and the append-only deepen mode can be re-run to fill what they interrupted.

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
