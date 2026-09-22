# Phase 5 adoption baseline — 2026-07-15

## Decision

The final delivery phase hardens the boundary between work completed inside CC and adoption caused outside it. This matters because the operative plan allows locked territories to open only after evidenced real-world events.

## Measured baseline

- Completed external learning receipts in the repository: **0**
- Confirmed external adoption events: **0**
- Existing machine-readable adoption ledger: **none**
- Existing recruiting and receipt instructions: **present**
- Existing first-use audit: **present and green**, but it does not count or validate adoption evidence
- Current content-runtime ledger: **4 work results**, of which **3 are blocked** and **1 is complete**
- Current adoption gates opened by external evidence: **0**

The four content-runtime ledger entries are task/run records. They cannot be treated as adoption. Founder feedback already documented in the strategy is important product evidence, but it is not an external event and cannot unlock §M territory.

## Existing human loop

The project already has the right human protocol:

- `docs/PREVIEW-FEEDBACK-LOOP.md` says to invite the first five people, collect one learning receipt each, repair only trust breaks or dead ends, and rerun the R1 gate before the next batch.
- `docs/R1-REVIEW.md` asks whether one real decision became clearer, where trust rose or broke, what was missing, and whether the preview should pass, patch, or stop.
- `docs/ADOPTION-KIT.md` preserves the same real-decision, trust, missingness, and smallest-next-patch fields without requiring an account.
- `docs/PATH-TO-FIRST-USERS.md` keeps the primary outcome at 20–50 personally recruited people and one real decision each.

The gap is operational rather than strategic: there is no durable, privacy-safe record that distinguishes a confirmed external event from an internal receipt.

## Runtime principles imported from the reference systems

- `C:/engine/README.md`: freeze the hypothesis and stop rule, use exact commands, retain result cards, and keep the claim boundary narrow.
- `C:/consoledia/program/PROMOTION_GATES_SPEC.md`: recorded is not verified or promoted; explicit authorization is a separate state transition.
- `C:/consoledia/experiments/memory/README.md`: retain negative results beside positive results and prefer authoritative artifacts over heuristic rollups.
- `C:/consoledia/docs/codex_stability_protocol.md`: a PASS is evidence, not promoted truth; keep output targeted and long work explicitly gated.

For CC, that becomes: a work ledger entry is not adoption; an invitation is not use; a receipt is not confirmed until reviewed; a confirmed event opens only its named gate.

## Acceptance boundary

1. Define the exact gates and thresholds already authorized by strategy; do not invent a new roadmap.
2. Start the event ledger at zero.
3. Require an external actor class, evidence, pseudonymous subject key, explicit privacy flags, a narrow claim boundary, and founder or release-owner confirmation.
4. Compute gate state from valid confirmed events rather than storing editable `open` flags.
5. Consolidate validation into `research/first_use_audit.js`; do not add another audit command.
6. Preserve negative learning receipts as first-class evidence.

## Claim boundary

This baseline supports hardening the recording and counting process. It does not support claiming that anyone has been recruited, that any real decision has been completed externally, or that any adoption-gated territory may open.
