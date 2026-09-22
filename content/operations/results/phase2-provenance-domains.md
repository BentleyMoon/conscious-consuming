# CC result card - phase2-provenance-domains

- Fingerprint: `15c08efd47456750`
- State: `BLOCKED`
- Verdict: `BLOCKED`
- Model: `gpt-5.6-sol`
- Reasoning: `medium`
- Decision: Does CC count independently controlled source domains rather than treating one publisher's subdomains as corroboration?
- Live consumer: The generated provenanceSummary, corroboration indicator, Trust Lens, linked-data exports, and agent-readable sourced facts.
- Recorded: 2026-07-15T14:11:31-07:00

## Headline

The Phase 2 registrable-domain resolver and generator/audit wiring are implemented and cross-runtime tested, but generated data remains on the old hostname contract until the inherited-dirty `research/verify_run.js` integration gate is safely resolved.

## What changed

- Added a deterministic, offline `cc-provenance-domain-contract` derived from the official Public Suffix List snapshot, including the private-domain section and exact/wildcard/exception behavior.
- Added matching Python and Node resolvers for provenance URLs.
- Changed the clean `pipeline/build_datasets.py` source-domain function to use the registrable-domain resolver.
- Changed the dedicated provenance summary audit oracle to the same shared contract.
- Added 15 adversarial fixtures covering same-publisher subdomains, Open Food Facts subdomains, `co.uk`, `github.io`, PSL wildcard/exception rules, IPv4, IPv6, IDN, unknown suffixes, and invalid URLs.
- Froze the current hostname-overcount baseline without editing app code or source lenses.

## Evidence and limitations

- Corpus: 24,621 generated entries and 3,153 normalized source hostnames.
- Current generated summaries label 5,857 entries as multi-source.
- The PSL-derived resolver finds only 1,227 entries with more than one registrable source domain.
- 4,845 entries contain raw source hostnames that collapse; 4,918 hostname slots are removed by deduplication.
- `support.apple.com`, `security.apple.com`, and `apple.com` collapse to `apple.com`.
- `prices.openfoodfacts.org` and `world.openfoodfacts.org` collapse to `openfoodfacts.org`.
- PSL private suffixes remain precise: `alice.github.io` and `bob.github.io` do not collapse.
- Registrable-domain separation is still only a proxy. Two domains can share ownership or editorial control, so the corrected count cannot prove independence.

## Verification

- `python pipeline/source_domains.py --self-test` - exit 0; 15 fixtures passed.
- `node research/provenance_domain_test.mjs` - exit 0; Python/Node parity and frozen corpus metrics passed.
- `node --check research/provenance_domain.js` - exit 0.
- `node --check research/provenance_domain_test.mjs` - exit 0.
- `node --check research/provenance_summary_audit.js` - exit 0.
- `python -m py_compile pipeline/source_domains.py pipeline/build_datasets.py` - exit 0.
- `node scripts/content-runtime.mjs validate` - exit 0.
- Generated contract application is intentionally still false: 5,857 current generated multi-source entries versus the corrected 1,227.
- A separately launched build process was observed and allowed to exit; timestamps and corpus checks confirmed it did not change generated files in this worktree.

## Claim boundary

- Supports: CC can deterministically deduplicate provenance URLs by DNS registrable domain without network-dependent builds.
- Does not support: Editorial or financial independence, source quality, truth of a claim, or release readiness from source count alone.

## Failure route or successor

Failure class: `dirty-collision`. `research/verify_run.js` is already dirty from the terminal S3 capsule and still recomputes hostname counts. The successor must bring that verifier onto `research/provenance_domain.js` under an explicit clean/inherited scope, then run the required sequential rebuild, the dedicated provenance audit, and repository verification. Until then, no generated-data or release claim is made.
