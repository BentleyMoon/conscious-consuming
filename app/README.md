# Conscious Consuming — the app

> A calm, values-first guide to conscious consuming. **Precompute + static** ([ADR 0001](../docs/adr/0001-precompute-static-architecture.md)) — no server, no database, no accounts, no tracking. A hash-routed SPA that runs from a double-clicked file, or installs as an offline PWA.

## What it is

A "wikipedia of conscious consuming": pick anything across **five entry types** (Products · Services · Media · Organizations · Initiatives), weight it to **your values** with sliders, and get a live, confidence-adjusted ranking of real things — every claim sourced or openly reasoned, never ranked by who pays. All personalization runs in your browser.

**18 live categories** today: food (plant milk, breakfast cereal, coffee, tea, dark chocolate, yogurt, olive oil, bread, plant-based meat, pasta sauce — *Open Food Facts*), personal care (toothpaste, soap, shampoo, deodorant — *Open Beauty Facts*), plus curated lenses for digital services, learning resources, mission-driven businesses, and causes to support. Affordability comes from *Open Prices*.

## The views (hash-routed)

- `#home` — masthead, search, doors, the commons map, principles.
- `#explore[/cid[/facet]]` — the values tool: presets + sliders + sort + region, with the **living ranking** (cards glide as you change weights).
- `#guides` / `#guide/<slug>` — readable, sourced explainers (8 guides).
- `#browse` — the fundamental-category **ontology** (live vs honestly "growing").
- `#discover[/value|label|region/<key>]` — the **faceted index**: slice the whole commons by a value (Vegan, Cruelty-free, Economical, Privacy…), label (Organic, Fair Trade…), or region.
- `#contribute` — local-first suggestions (export → send).
- `#lab` — experimental features behind flags (values fingerprint · "if you pick one" · explain-the-score · posture buttons · compare).
- `#compare` — pin up to 4 entries side by side.

## Structure

```
app/
├─ index.html      # shell + view sections
├─ styles.css      # the design system
├─ app.js          # all logic (engine, router, views, lab)
├─ data.js         # window.CC_BUNDLE — datasets + ontology (generated)
├─ guides.js       # window.CC_GUIDES (generated)
├─ i18n.js         # localization (en + es seed); English is the fallback
├─ sw.js           # service worker — installable + offline (real deploys only; off on localhost)
├─ manifest.webmanifest, icon.svg
└─ data/           # per-category JSON + index.json (also bundled into data.js)
```

The datasets are produced by the [pipeline](../pipeline/README.md). The app makes **no network calls at runtime** — everything is baked into `data.js`; the only outbound requests are links you click (source pages, websites).

## Run locally
```
python ../pipeline/build_datasets.py   # rebuild data.js from the caches
python serve.py 8848                   # no-cache static server
# open http://localhost:8848
```

## Deploy
Drop `app/` on any static host (Netlify Drop / Cloudflare Pages / GitHub Pages). HTTPS makes it an installable, **offline PWA**. No backend, ~zero cost. See [`docs/DEPLOY-AND-SHARE.md`](../docs/DEPLOY-AND-SHARE.md).

## Attribution
Food © Open Food Facts · personal care © Open Beauty Facts · prices © Open Prices — all under the **Open Database License (ODbL)**. Curated lenses are assessments with stated reasoning, not measured data. Always confirm allergens on the physical label.
