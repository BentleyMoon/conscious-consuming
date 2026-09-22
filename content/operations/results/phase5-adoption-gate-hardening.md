# Phase 5 result — operational hardening and adoption gates

- Date: 2026-07-15
- Capsule: `phase5-adoption-gate-hardening`
- Scoped verdict: POSITIVE

**Branch release verdict:** BLOCKED by the inherited Phase 2 provenance integration

## Outcome

CC can now distinguish internal work from external adoption in a machine-readable, privacy-safe way. The current result is intentionally zero:

```text
adoption events: 0 confirmed / 0 recorded
adoption gates: 0 open / 7 locked
```

No tester, external agent, builder, group, or researcher action was invented. The single line in `adoption-events.jsonl` initializes the append-only ledger and is structurally unable to count as an event.

## What changed

- `content/operations/adoption.json` registers seven existing strategy gates, their thresholds, accepted external event types, distinct-subject rule, source, and narrowly unlocked territory.
- `content/operations/adoption-events.jsonl` starts an append-only ledger with zero events.
- `content/operations/schemas/adoption.schema.json` validates the registry shape.
- `content/operations/schemas/adoption-event.schema.json` requires an external actor class, gate-compatible event type, pseudonymous subject key, retained evidence, explicit privacy flags, claim boundary, and confirmation by the founder or release owner.
- `content/operations/templates/adoption-event.json` remains deliberately non-countable until copied, completed, and changed from template kind to real event kind.
- `content/operations/ADOPTION-RUNBOOK.md` defines the minimal privacy-safe operator sequence.
- `research/first_use_audit.js` now validates and reports adoption state as part of the existing first-use audit. No new audit command was added.

## Gates now represented

| Gate | Threshold | Current | What it controls |
| --- | ---: | ---: | --- |
| First-five learning receipts | 5 distinct external subjects | 0 | R1 rerun and next invitation batch |
| One real group | 1 | 0 | Evidence that the organizing loop survived external use |
| External agent citation | 1 | 0 | Agent-front locked work |
| External person-file transfer | 1 | 0 | File-front locked work |
| External covenant adoption | 1 | 0 | Covenant certification/adoption tooling |
| External science citation or replication interest | 1 | 0 | Next science-front move |
| Organic group use | 3 distinct groups | 0 | Group/political locked territory |

Gate state is computed from confirmed valid events. There is no editable `open` field to drift or be promoted by enthusiasm.

## Adversarial behavior

The consolidated first-use audit contains in-memory fixtures that prove:

- a pending event does not count;
- an internal-agent event does not count;
- an evidence-free event does not count;
- the JSON template does not count;
- a valid confirmed external event counts;
- a multi-subject threshold opens only after enough distinct subject keys;
- duplicate records for one subject cannot satisfy a multi-subject gate.

Malformed event records, unknown event types, duplicate event IDs, contact-like evidence references, and privacy flags that are not explicitly false fail the audit.

## Runtime doctrine applied

The Phase 5 design carries forward the reference-system lessons without copying their machinery:

- `C:/engine/README.md`: frozen scope, exact commands, result cards, and bounded claims.
- `C:/consoledia/program/PROMOTION_GATES_SPEC.md`: recorded is not verified or promoted; promotion requires a separate authorization record.
- `C:/consoledia/experiments/memory/README.md`: negative results remain first-class evidence and authoritative artifacts beat heuristic summaries.
- `C:/consoledia/docs/codex_stability_protocol.md`: a PASS is evidence, not promoted truth.

For CC, the equivalent rule is simple: a capsule receipt is not adoption, and a learning receipt is not gate-opening evidence until an authorized reviewer confirms its external cause and evidence boundary.

## Five-number readout

1. User-facing coined terms added: **0**
2. Strategy/product docs added: **0**; bounded operations artifacts added: **3 Markdown records plus registry/schema/template files**
3. New top-level audits added: **0**; the existing first-use audit was consolidated
4. Founder review surface: **two-line summary plus seven-row table**; stopwatch not recorded, with the ≤2-minute target preserved
5. Confirmed adoption events fired: **0**

## Content delta

- Category delta: **0**
- Entry delta: **0**
- Score or provenance delta: **0**
- Guide delta: **0**
- Generated app delta: **0**
- `docs/CONTENT-HANDOFF.md`: **unchanged**

## Verification receipts

| Command | Result |
| --- | --- |
| `node --check research/first_use_audit.js` | PASS |
| `node research/first_use_audit.js` | PASS — 10 flagship categories, 13 app views, 0 confirmed events, 0 open / 7 locked gates |
| Draft 2020-12 registry validation with Python `jsonschema` | PASS |
| Draft 2020-12 event schema self-check with Python `jsonschema` | PASS |
| `npm run test:content-runtime` | PASS |
| `node research/verify_run.js` | PASS — `ALL CHECKS PASS`; allergen safety audit PASS |
| `node scripts/content-runtime.mjs validate` | PASS |
| `npm run verify` | BLOCKED — inherited Phase 2 registrable-domain mismatch, 15,350 provenance-summary failures |

The dataset and guide builders were not run because no lens, ontology, guide, pipeline, or generated-app source changed. Running the dataset builder remains forbidden while Phase 2's generator and provenance verification path disagree.

## Smallest real-world successor

1. Reconcile Phase 2 and restore the branch-wide release gate.
2. Prepare the private preview and complete the founder's R1 receipt.
3. If the decision is “Pass to first 5,” send five personal invitations for one real decision each.
4. Retain one privacy-safe learning receipt per completed external attempt.
5. Confirm and append only the corresponding bounded event records.
6. Let the first-use audit decide whether the first-five gate fired; do not open it manually.

This successor requires actions by real people. Another agentic content round cannot substitute for them.

## Claim boundary

This result supports the claim that CC now has a fail-closed, privacy-safe adoption-event accounting layer integrated into its existing first-use audit. It does not support claiming traction, recruitment, external use, public citation, file portability in the wild, covenant adoption, replication interest, or permission to open any locked territory.
