# Phase 3 result — published guide citation depth

**Date:** 2026-07-15
**Capsule:** `phase3-guide-citation-depth`
**Scoped verdict:** POSITIVE
**Branch release verdict:** BLOCKED by inherited Phase 2 provenance integration

## Outcome

The three published, reader-facing guides that had no inspectable external evidence now link directly to current primary sources:

| Guide | Before | After | Source shape |
| --- | ---: | ---: | --- |
| `smart-thermostats` | 0 links | 5 links | ENERGY STAR criteria/products/rebates, NIST consumer IoT guidance, Matter standards-owner update |
| `broadband-internet` | 0 links | 7 links | FCC labels/map/challenges, NTIA local resources, first-party community-fiber and ISP privacy examples |
| `mobile-carriers` | 0 links | 8 links | FCC enforcement/CPNI/map/labels, current carrier privacy controls, first-party mission-giving disclosure |

The prose remains practical and unchanged apart from the dated source anchor paragraphs and `last_updated` metadata. No product ranking or score changed.

## Guard added

`research/guide_citation_audit.js` scans every published Markdown guide and fails when a non-method guide has zero external Markdown citations.

Current result:

- Published guides: **100**
- Published guides with citations: **99**
- Uncited non-method guides: **0**
- Explicit method exception: **1** (`how-scores-work.md`, design-owned internal-method guide)

This is a minimum publication guard, not a source-quality score. Link quantity alone does not establish sufficiency, independence, correctness, or freshness.

## Live consumer check

`python pipeline/build_guides.py` regenerated the guide bundle and static pages. The expected linked phrases are present in:

- `app/g/smart-thermostats.html`
- `app/g/broadband-internet.html`
- `app/g/mobile-carriers.html`
- `app/guides.js`

These are deterministic generated outputs; no app code was hand-edited.

## Verification receipts

| Command | Result |
| --- | --- |
| `node --check research/guide_citation_audit.js` | PASS |
| `node research/guide_citation_audit.js` | PASS — 100 published, 99 cited, 0 uncited non-method, 1 method exception |
| `python pipeline/build_guides.py` | PASS — 100 guides regenerated |
| Generated phrase checks for three static pages and `app/guides.js` | PASS — 6/6 |
| `node research/guide_voice_audit.js` | PASS — 100 guides |
| `node research/content_readiness_audit.js` | PASS — guide queue 0; only design-owned banking remains in source-refresh queue |
| `node research/verify_run.js` | PASS |
| `node scripts/content-runtime.mjs validate` | PASS |
| `npm run verify` | BLOCKED — inherited Phase 2 provenance-domain audit mismatch, 15,350 failures |

## Why the full build sequence did not run

The repository runtime normally requires `build_datasets.py`, `build_guides.py`, then `verify_run.js`. This guide-only capsule ran the affected guide builder and verifier. It intentionally did not run `build_datasets.py`, because the Phase 2 stop condition records that a dataset rebuild would apply the new registrable-domain generator while integration remains unresolved across inherited-dirty verification code. Crossing that boundary here would mix phases and obscure ownership.

## Remaining constraints

1. Phase 2 must reconcile the registrable-domain generator, generated datasets, and provenance audit before the branch-wide verification gate can pass.
2. The release-observability fingerprints documented in `docs/PROJECT-STATUS.md` were already stale before this capsule and remain outside content-lane authority.
3. The new citation audit is standalone because integrating it into inherited-dirty `scripts/verify.mjs` or `research/verify_run.js` would collide with earlier capsules.
4. Source policies and standards can change; these links still require routine freshness review.

## Claim boundary

This result supports the narrow claim that CC no longer publishes a non-method decision guide with zero inspectable external citations, and that the three repaired guides expose relevant primary evidence. It does not support the claim that every sentence is independently corroborated or that every cited organization is neutral.
