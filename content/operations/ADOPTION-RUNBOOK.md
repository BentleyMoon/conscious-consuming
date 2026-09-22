# Adoption event runbook

This runbook records real-world gate evidence without turning tester identity or private values into project data. The strategy stays in `codex.md` §M and the existing first-user documents. This file only explains the operational record.

## What counts

An adoption event is caused by someone outside the project and has retained evidence. Examples are a completed real-decision learning receipt, an uncontrolled agent citing the commons, a person-file working on an independently hosted instance, another builder adopting the covenant, or external research citation or replication interest.

Internal work never counts: capsules, commits, builds, tests, audits, founder self-review, invitations, page views, downloads, templates, synthetic fixtures, and compliments without a completed use attempt.

## Recording sequence

1. Find the exact gate and accepted `eventType` in `content/operations/adoption.json`.
2. Copy `content/operations/templates/adoption-event.json` outside the ledger.
3. Replace the template kind with `cc-adoption-event` and fill every field.
4. Use a pseudonymous `subjectKey` such as `receipt-r1-003`. Do not use a name, handle, email, phone number, account identifier, exact address, or value-file identifier.
5. Point to evidence using an HTTPS URL or a non-identifying `receipt:`, `observation:`, or `message:` reference. Do not copy a private receipt body into the ledger.
6. Keep `review.status` as `pending` until the founder or release owner checks that the event was external, occurred, matches the gate, and has enough evidence.
7. After confirmation, set the reviewer role, review time, and narrow rationale. Append the completed event as one JSON line to `content/operations/adoption-events.jsonl`.
8. Run `node research/first_use_audit.js`. The audit computes counts from valid confirmed events; it never trusts a hand-written gate status.

## Failure rules

- Pending or rejected records remain visible but never count.
- Internal actor classes, missing evidence, unknown event types, contact-like evidence references, duplicate event IDs, or privacy flags that are not explicitly false fail the audit.
- Multiple records for the same `subjectKey` and gate count once.
- Crossing a threshold means the named gate fired. It does not promote unrelated claims or unlock a different territory.
- A negative learning receipt is still valuable external evidence. Its `claimBoundary` must preserve the negative result instead of converting it into traction.

## Current state

The ledger contains one initialization record and zero adoption events. Every gate remains locked.
