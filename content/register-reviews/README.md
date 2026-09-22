# Register evidence reviews

Human review receipts live here after the deterministic sample named by an evidence bundle has been checked against both the public register and the entity mapping.

Receipts pin the byte-exact evidence bundle by SHA-256 and record `approved` or `rejected`. A changed input produces a changed bundle and invalidates the old receipt. Phase 5 creates this boundary; later register waves must supply approved receipts before promotion into lenses.
