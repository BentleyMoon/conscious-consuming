# CC result card - s3-allergy-readiness

- Fingerprint: `0e96958ce5211278`
- State: `BLOCKED`
- Verdict: `BLOCKED`
- Model: `gpt-5.6-sol`
- Reasoning: `medium`
- Decision: Can a person with an allergy distinguish declared absence, declared presence or trace, and missing data without CC implying safety?
- Live consumer: Food category and product decision surfaces that display allergen information.
- Recorded: 2026-07-15T13:55:43-07:00

## Headline

The Phase 1 data repair is positive, but publication remains blocked until the app consumes the new per-allergen states and the repository release-status fingerprint baseline is reconciled.

## What changed

- Expanded the structured map from four EU groups to all EU-14 groups, with lactose kept distinct and coconut retained as an additional tracked allergy.
- Added `allergenContains`, `allergenTraces`, `allergenDetected`, `allergenFree`, `allergenConflicts`, and `allergenDataState` to every rebuilt food product.
- Kept `allergens` as the conservative contains/trace/detection union so the legacy filter cannot silently pass trace evidence.
- Made missing and unmapped evidence fail closed; `allergensDeclared: true` can no longer coexist with an empty legacy union.
- Added an independent corpus audit to `research/verify_run.js`, 52 scoring tests, a frozen baseline packet, and app handoff H14.
- Rebuilt generated datasets and guides sequentially; generated app bundles were not hand-edited.

## Evidence and limitations

- Raw baseline: 20,651 rows; 13,789 with a structured allergen or trace field; 6,862 without either field.
- Generated baseline before repair: 19,772 food products; 4,736 unsafe declared-empty records.
- Rebuilt audit: 19,772 products; 12,029 fully structured-declared unions; 6,140 trace rows; 2,077 nonconflicting explicit-free rows; 300 source-conflict rows; 5,704 no-data rows; zero declared-empty records.
- All EU-14 groups plus lactose are represented in the rebuilt corpus.
- Ingredient detection is explicitly incomplete fallback evidence. Open Food Facts records are source reports, not guarantees of accuracy, completeness, cross-contamination status, or individual safety.
- Current app code still has only the old five labels and generic contains/free copy. H14 must render the per-allergen arrays consistently across filters, cards, details, Discover, Ask, saved profiles, and live lookup.

## Verification

- `python pipeline/test_scoring.py` - exit 0; 52 checks passed.
- `python pipeline/build_datasets.py` - process completed and generated all 50 cached food datasets; post-build independent corpus audit passed.
- `python pipeline/build_guides.py` - exit 0; 100 guides rebuilt.
- `node research/verify_run.js` - exit 0; core checks and allergen safety audit passed.
- `node research/allergen_safety_audit.js` - exit 0; zero declared-empty rows and full EU-14 plus lactose coverage.
- `node research/contribution_handoff_audit.js` - exit 0; H14 queue integration passed with zero warnings.
- `node research/content_runtime_test.mjs` - exit 0 after replacing stale live-state assumptions with isolated fixtures.
- `npm run verify` - exit 1 only at `release_observability_audit.mjs`: status docs still show `34fd8a868525` / `806861a0ec90`, while the fresh package-mode audit reports `dd509559cac1` / `0776abd44ad4`. No release or commit is claimed.
- Process-tree check - clean after all rebuild and verification processes completed.

## Claim boundary

- Supports: CC's generated data can preserve source-declared presence, trace, explicit-free, conflict, ingredient-detected, and missing states without inferring safety from absence.
- Does not support: Medical advice, universal label completeness, absence of cross-contamination, safety for any individual, or app-level release readiness.

## Failure route or successor

Failure class: `gate-closed`. Design/app drains H14 with running-app fixtures; the release owner reconciles package fingerprints; then the S3 capsule can be rerun for founder review. Phase 1 continues with the price/cost correctness spine. The delivery roadmap is five phases after Phase 0.
