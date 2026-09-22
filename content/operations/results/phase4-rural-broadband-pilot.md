# Phase 4 result — demand-pulled rural broadband pilot

**Date:** 2026-07-15
**Capsule:** `phase4-rural-broadband-pilot`
**Research verdict:** POSITIVE
**Execution verdict:** BLOCKED by the inherited Phase 2 dataset/provenance build gate

## Outcome

Phase 4 selected one bounded expansion pilot: add a rural/satellite decision shape to the existing Broadband & internet lens after the dataset build path is green.

This is not category-count growth. The published guide already tells constrained households to compare satellite, but the live 12-entry comparison set contains no satellite option. Three candidates now have a frozen primary-evidence contract covering all five existing criteria:

1. Starlink Residential
2. Hughesnet
3. Viasat Internet

No scores were drafted and no product, category, pipeline, generated-app, or design-owned file was edited.

## Executable demand guard

`research/demand_expansion_audit.js` distinguishes three states that must not be collapsed:

- **External demand:** zero submitted governance proposals and zero counted attestations; no external-demand claim is made.
- **Earned recognition gap:** the live guide names a real technology route that the live lens cannot represent.
- **Write authorization:** HOLD while the Phase 2 ledger state is `BLOCKED`.

Current result:

```text
[demand-expansion] categories=88 broadband=12 satellite=0 submitted_demand=0 decision_shape=earned write=HOLD
[demand-expansion] pilot=rural-satellite-broadband candidates=starlink,hughesnet,viasat phase2=BLOCKED
```

The audit also keeps a candidate from advancing unless every existing criterion has at least one exact HTTPS primary-evidence route.

## Evidence boundary

The FCC National Broadband Map recognizes satellite as fixed broadband technology, while its availability-challenge guidance says map availability is not evidence of performance, affordability, or adoption. The candidate contract therefore requires address-specific labels and availability plus current privacy, plan, data, network-management, support, and legal terms.

The full evidence matrix is frozen in `content/operations/reviews/phase4-rural-broadband-baseline-2026-07-15.md`. It deliberately does not universalize price, speed, availability, latency, data treatment, or equipment constraints.

## Expansion avoided: private messaging

The earlier “private messaging app” probe is not a content gap. The live `digital-services` source already contains nine directly relevant entries in the audit set: Signal, WhatsApp, Telegram, Element, SimpleX, Wire, Threema, Briar, and Delta Chat.

The problem is retrieval/index relevance. This capsule does not cross into app/search code, and it does not append to the inherited-dirty `docs/CONTENT-HANDOFF.md`. The issue is preserved here for a clean app-side successor scope.

## Why the pilot did not write data

The latest `phase2-provenance-domains` ledger entry is terminal `BLOCKED`. Its registrable-domain generator and verification integration are not reconciled, and branch-wide verification reports 15,350 inherited provenance mismatches. A dataset-backed edit would require running that unresolved generator across already dirty generated outputs.

The stop condition therefore fired before `content/lenses/broadband-internet.json` changed. This is the correct operational result: a good candidate should not bypass a broken evidence build.

## Verification receipts

| Command | Result |
| --- | --- |
| `node --check research/demand_expansion_audit.js` | PASS |
| `node research/demand_expansion_audit.js` | PASS — decision shape earned, three evidence-complete candidates, write HOLD |
| `git diff --exit-code -- content/lenses/broadband-internet.json` | PASS — no lens change |
| `node scripts/content-runtime.mjs validate` | PASS |
| Required dataset/guide build sequence | NOT RUN — no source lens or guide changed; Phase 2 explicitly blocks the dataset builder |

## Smallest safe follow-up

1. Reconcile Phase 2’s shared registrable-domain resolver, verification code, and generated datasets.
2. Confirm the branch-wide provenance gate is green.
3. Open a new content-write capsule owning only the broadband lens and deterministic generated outputs.
4. Re-read the frozen primary sources, score exactly Starlink, Hughesnet, and Viasat under the five existing criteria, and preserve address-specific limitations.
5. Run the required sequential build: `build_datasets.py`, `build_guides.py`, then `verify_run.js`, followed by branch verification.

## Claim boundary

This result supports the narrow claim that a missing satellite route is the strongest currently evidenced expansion pilot and that three candidates are ready for later scoring research. It does not support adding them before the build gate is green, preferring satellite over terrestrial service, or treating any provider claim as universal or independently verified.
