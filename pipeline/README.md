# Data pipeline

> "Own your data." Acquire open data into a **local cache**, score it, and emit the static datasets the app serves — so the app **never touches the network at runtime**. Everything here is build-time.

## Sources
- **Open Food Facts** (food) — Nutri-Score, NOVA, Green-Score, nutriments, allergens, labels.
- **Open Beauty Facts** (personal care) — ingredient analysis (vegan / palm-oil), certifications.
- **Open Prices** (affordability) — community prices by barcode, baked into an `economical` criterion.

## Scripts
- **`fetch_safer_choice.py`** - EPA Safer Choice / Envirofacts certified products to `raw_safer_choice/<id>.jsonl` and generated lenses such as `dish-soap`.
- **`fetch_raw.py`** — paginate OFF for the food `CATEGORIES` → `raw/<id>.jsonl`. Robust to 503s: retry/backoff, tag fallback, a **no-shrink guard** (never overwrite a cache with fewer products), and **skip-if-cached** (only fetch new). `python fetch_raw.py [maxPages] [--refresh]`
- **`fetch_beauty.py`** — same idea for Open Beauty Facts; writes generated lenses to `content/lenses/<id>.json` (the build includes them automatically). Re-scores from cache without `--refresh`.
- **`fetch_prices.py`** — Open Prices by barcode → `prices/<id>.json` (median in a single currency, prefers EUR). `python fetch_prices.py [cap]`
- **`scoring.py`** — the food scoring engine (Axis A): environment / processing / nutrition / protein / low-sugar / ethics, plus derived `focuses` (Organic, Fair Trade, Vegan, Gluten-free…) for the faceted index.
- **`scoring_beauty.py`** — beauty scoring: transparency / vegan / palm-oil-free / organic / cruelty-free, plus focuses.
- **`build_datasets.py`** — `raw/` + `content/lenses/*` + `content/ontology.json` → `app/data/*.json` + bundled `app/data.js`. Bakes Open Prices `economical` into food.
- **`build_guides.py`** — `content/guides/*.md` → `app/guides.js`.
- **`enrich_lenses.py`, `add_economical.py`** — one-time enrichers for the curated lenses (descriptions / links / region; economical tiers).
- **`ingest_dump.py`** — full-catalogue path from an OFF bulk dump (zero-API).

## Quick start
```
python fetch_raw.py        # fetch any NEW food categories (skips cached)
python fetch_beauty.py     # Open Beauty Facts lenses
python fetch_safer_choice.py # EPA Safer Choice lenses
python fetch_prices.py 150 # affordability
python build_datasets.py   # → app/data.js
python build_guides.py     # → app/guides.js
```

## Adding a category
- **Food:** add to `CATEGORIES` in `fetch_raw.py`, a node in `content/ontology.json`, and `ORDER` in `build_datasets.py`. Re-run fetch + build.
- **Beauty:** add to `CATEGORIES` in `fetch_beauty.py` (+ ontology + ORDER). Re-run.
- **Curated lens:** drop a JSON in `content/lenses/` (meta + criteria + presets + products). The build includes it automatically.

## Refresh
Re-run the acquire step then `build_datasets.py` (the fetchers are incremental). On-ethos: **contribute corrections back to OFF/OBF** as you find them — it improves the commons and lowers our upkeep.

*Data © Open Food Facts / Open Beauty Facts / Open Prices contributors, under the ODbL.*
