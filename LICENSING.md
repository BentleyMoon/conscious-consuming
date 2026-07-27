# Licensing — what's under which license, and why

This project is a **public good**, multi-licensed by asset type so each part carries the
license that fits it. Use any part under its stated terms; forks must preserve these notices.

| Asset | Where | License | SPDX / link |
|------|-------|---------|-------------|
| **Code** | `app/` (engine.js, shell.js, app.js, sigil.js, reveal.js, i18n.js, sw.js), `pipeline/`, `assembly/` · `workshop/` · `slate/` · `tour/` · `funders/` · the instance skins | **GNU AGPL-3.0-or-later** | `AGPL-3.0-or-later` |
| **Data** | `content/lenses/`, the ontology, `app/data/` (built datasets), the verdict cards | **Open Database License v1.0** | `ODbL-1.0` |
| **Guides & written content** | `content/guides/`, `docs/`, the human-facing copy in the surfaces | **Creative Commons BY-SA 4.0** | `CC-BY-SA-4.0` |

## Why AGPL for the code
It makes the project's central promise **legally binding**: anyone may use, study, and fork it,
but any fork — *including one run only as a hosted network service* — must keep its source open
to its users. The standard can spread by being forked, yet **cannot be captured** into a closed,
proprietary product. The license is the "uncapturable" principle, enforced.

## Why ODbL for the data
The food/beauty facts come from **[Open Food Facts](https://world.openfoodfacts.org/) /
Open Beauty Facts**, which are ODbL. Matching it keeps the data flowing both ways and honours
their share-alike terms. Open Food/Beauty Facts source data remains under **its own** ODbL terms
and attribution. Curated-lens facts additionally carry their own **per-claim sources**.

## Why CC BY-SA for the writing
Guides and docs are prose — Creative Commons is the natural fit; share-alike keeps improvements open.

## Attribution
> *Conscious Consuming / the Open Values Standard, by Bentley Moon-Perkins* — and, for data,
> *facts from Open Food Facts / Open Beauty Facts (ODbL).*

## License text — in place
`LICENSE` now carries the **full verbatim GNU AGPL-3.0 text** beneath a short multi-asset header
(so the file alone can't be misread as putting the *data* under AGPL). The header is brief enough
that GitHub/SPDX license auto-detection still resolves the file as `AGPL-3.0` — which the DPG
review relies on. No further license-text step remains before submission.
