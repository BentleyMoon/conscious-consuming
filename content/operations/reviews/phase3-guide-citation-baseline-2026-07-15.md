# Phase 3 guide citation baseline — 2026-07-15

## Decision

After broad freshness and readiness checks found no clean, content-owned category backlog, the Phase 3 question narrowed to whether every published decision guide exposes evidence a reader can inspect.

## Baseline

- Published guides scanned: **100**
- Published guides with zero external Markdown links: **4**
- Internal methodology exception: **1** (`how-scores-work.md`, design-owned)
- Reader-facing zero-citation defects: **3**
  - `smart-thermostats.md` — 654 body words
  - `broadband-internet.md` — 714 body words
  - `mobile-carriers.md` — 774 body words
- Existing executable gate for zero-citation published guides: **none**

All three affected guides were marked `published` and already made factual or regulatory claims while ending with plain-text “Useful anchors.” The repair is therefore citation depth, not category expansion or prose inflation.

## Wider Phase 3 context

- Curated lenses scanned by the freshness audit: **25**
- Presentation-ready: **24**
- Editorial-polish queue: **1** (`banking`, design-owned)
- Dated sourced claims scanned: **15,883**
- Claims missing dated provenance: **0**
- Guides passing the voice audit: **100 / 100**
- Product evidence coverage: **20,238 / 20,238 sourced entries**

## Acceptance target

1. Replace the three plain-text anchor lists with direct links to current regulator, government-program, standards-owner, and first-party policy pages.
2. Preserve the existing practical voice and claim boundaries.
3. Add an executable audit that fails on a published non-method guide with no external citation.
4. Regenerate the static guide pages and retain existing readiness and verifier verdicts.

## Claim boundary

An external-link count is only a guard against publishing a completely uncited decision guide. It does not establish that a source is independent, sufficient, current forever, or correctly interpreted.
