# Phase 4 rural-broadband expansion baseline — 2026-07-15

## Decision

Phase 4 asks where another content addition would change a real decision rather than merely increase a category count. The selected pilot is a missing rural/satellite route inside the existing `broadband-internet` lens.

The pilot is earned, but a content write is not currently authorized by the build state. Research can freeze the candidate set and evidence contract; the lens must remain unchanged until the inherited Phase 2 provenance-domain integration is green.

## Demand baseline

- Live categories: **88**
- Live broadband entries: **12**
- Existing broadband technologies represented: fiber, cable, and fixed wireless
- Satellite entries: **0**
- Published guide: explicitly tells a constrained household to compare “cable, DSL, fixed wireless, or satellite”
- Submitted governance proposals: **0**
- Counted public attestations: **0**
- Real tester-learning receipts located in the repository: **0**

This is not an externally requested expansion. It qualifies under the narrower recognition-gap rule: the live decision already names a route that its live comparison set cannot represent. The roster size is incidental.

## Why satellite is a distinct decision shape

The FCC National Broadband Map treats satellite as a fixed broadband technology alongside fiber, cable, DSL, and fixed wireless. It also makes an important boundary explicit: the map describes reported availability, not service performance, affordability, or adoption. A satellite entry therefore must help a constrained household recognize an available route while preserving address-, plan-, congestion-, equipment-, latency-, and weather-specific limitations.

Primary regulatory anchors:

- [FCC National Broadband Map guide](https://help.bdc.fcc.gov/hc/en-us/articles/10467446103579-How-to-Use-the-FCC-s-National-Broadband-Map)
- [FCC availability-challenge guide](https://help.bdc.fcc.gov/hc/en-us/articles/10476040597787-How-to-Submit-an-Availability-Challenge)
- [FCC Broadband Consumer Label compliance guide](https://docs.fcc.gov/public/attachments/DA-24-459A1.pdf)
- [FCC satellite broadband availability report, April 29, 2026](https://docs.fcc.gov/public/attachments/DOC-421210A1.pdf)

## Existing scoring contract

The pilot must use the five existing broadband criteria. It must not add a satellite-only scoring axis or make scores incomparable with terrestrial providers.

| Criterion | Required reading |
| --- | --- |
| Network privacy | Current provider privacy notice plus service-specific collection, sharing, retention, and network-management disclosures |
| Low all-in cost | Address-specific Broadband Facts label, equipment purchase/lease, installation, promotion, payment-method conditions, taxes/fees, data treatment, and cancellation terms |
| Clear plan terms | Current service description, expected speed/latency, priority or congestion policy, data policy, network-management policy, and subscriber agreement |
| Availability & support | Address check, installation constraints, equipment/sky-view requirements, mobility restrictions, support route, and known service-shape limitations |
| Public accountability | Public legal/policy stack, regulator-facing disclosures, complaint or enforcement evidence when applicable, ownership context, and limits on what first-party evidence can establish |

No price, speed, availability, or “unlimited” statement may be generalized from a single address or plan.

## Three-option candidate matrix

The matrix freezes evidence inputs, not scores. Every candidate needs a fresh editorial read of every linked source after the build gate opens.

| Candidate | Decision role | Exact primary evidence bundle |
| --- | --- | --- |
| Starlink Residential | LEO satellite route for remote or otherwise constrained addresses | Privacy: [privacy notice](https://starlink.com/legal/documents/DOC-1000-41799-67). Fees: [service plans](https://starlink.com/service-plans), [plan descriptions](https://starlink.com/legal/documents/DOC-1728-44881-79), [terms](https://www.starlink.com/legal/documents/DOC-1354-58366-77). Terms/network: [fair-use policy](https://starlink.com/legal/documents/DOC-DF-1914-46768-65), [specifications](https://starlink.com/legal/documents/DOC-1107-78394-76). Access: [residential availability route](https://starlink.com/residential) plus FCC map. Accountability: the same legal/privacy stack plus the FCC satellite report; do not infer public-interest performance from first-party claims alone. |
| Hughesnet | GEO satellite route with explicit priority-data and latency constraints | Privacy: [privacy policy](https://legal.hughesnet.com/PrivacyPolicy.cfm). Fees: [plans and pricing](https://www.hughesnet.com/consumer-plans-pricing), [Broadband Labels](https://labels.hughesnet.com/), [termination and important terms](https://legal.hughesnet.com/ForYourHome.cfm). Terms/network: [subscriber-agreement index](https://legal.hughesnet.com/Home.cfm), [Fair Access Policy](https://legal.hughesnet.com/FairAccessPolicy.cfm), [network-management practices](https://legal.hughesnet.com/NetworkManagement.cfm). Access/support: [FAQ](https://www.hughesnet.com/frequently-asked-questions) and the address-specific plan route. Accountability: current legal, privacy, and network-management pages; preserve the limits of provider-authored evidence. |
| Viasat Internet | GEO satellite route with location- and congestion-specific plan constraints | Privacy: [privacy center](https://www.viasat.com/privacy/) and [service-specific disclosures](https://www.viasat.com/privacy/service-specific-disclosures/). Fees: [satellite internet](https://www.viasat.com/satellite-internet/), [Broadband Label](https://www.viasat.com/satellite-internet/broadband-label/), [current legal stack](https://www.viasat.com/legal/). Terms/network: [Unleashed FAQ](https://www.viasat.com/satellite-internet/help/residential/plans-and-add-on-services/unleashed-faqs/) and [network-management policy](https://www.viasat.com/content/dam/us-site/legal/documents/Network_Management_Policy_6_6_June_14_2023.pdf). Access/support: address-specific plan and label routes plus FCC map. Accountability: the current legal/privacy stack; do not convert policy publication into an unsupported positive score. |

## Adjacent false-positive: private messaging

The phrase “private messaging app” exposed a retrieval/index problem, not a content shortage. The existing `digital-services` lens already contains Signal, WhatsApp, Telegram, Element, SimpleX, Wire, Threema, Briar, and Delta Chat. Adding more messaging products would duplicate coverage while leaving the actual first-use failure intact.

That issue belongs in a clean app/search handoff after inherited handoff-file ownership clears. It is intentionally not added to the already dirty `docs/CONTENT-HANDOFF.md` in this capsule.

## Build gate

The latest `phase2-provenance-domains` ledger entry is `BLOCKED`. The generator and verification path disagree on registrable-domain provenance, and branch verification reports 15,350 inherited mismatches. Running the dataset builder now would mix the candidate pilot with unresolved generated-output changes.

Therefore:

- Candidate pilot: **approved for preparation**
- Lens edit: **HOLD**
- Product delta in Phase 4: **0**
- Smallest safe successor: reconcile Phase 2, open a new write capsule for exactly these three candidates, score with the frozen evidence contract, then run the required sequential build and full verification

## Claim boundary

This baseline supports the claim that the current broadband decision omits a real satellite route and that three recognizable U.S. candidates have enough first-party and regulator evidence to enter a later scoring review. It does not support the claim that satellite is preferable to terrestrial service, that any candidate serves every address, or that any advertised price or performance is universal.
