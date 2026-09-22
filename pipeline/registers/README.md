# Register snapshots

This directory is the network boundary for catalogue-wide register passes. Capture happens here. Dataset builds consume committed snapshots and do not contact live endpoints.

## Layout

```text
pipeline/registers/
  snapshot.py
  raw/
    <register-id>/
      <YYYY-MM-DD>-<hash-prefix>.snapshot.json
      <YYYY-MM-DD>-<hash-prefix>.payload.<extension>
```

The manifest and payload are one inseparable snapshot. Both are committed. The manifest records the request scope, sorted query, retrieval time, public headers, names of secret headers, final URL, media type, byte count, SHA-256, rights note, and parser version.

Credentials are read from environment variables only. Their values are used for the request and never written to the snapshot. Secret-looking query parameters are refused because URLs are recorded.

Use `--user-agent` when a publisher requires a declared application and contact address, including SEC endpoints. For authenticated headers, the named environment variable must contain the complete header value. Prepare that value outside the repository.

## Capture

API example:

```bash
python pipeline/registers/snapshot.py capture \
  --register cfpb-complaints \
  --query date_received_min=2025-01-01 \
  --query date_received_max=2025-12-31 \
  --scope "All checking or savings account complaints received in 2025" \
  --license-url https://www.consumerfinance.gov/open-government/ \
  --license-note "United States government public data; verify dataset-specific terms before redistribution." \
  --parser-id cfpb-complaints-parser \
  --parser-version 1.0.0
```

Authenticated header example:

```bash
python pipeline/registers/snapshot.py capture \
  --register companies-house-psc \
  --scope "Declared company and PSC identifiers in the reviewed mapping set" \
  --license-url https://www.companieshouse.gov.uk/about/ifts.shtml \
  --license-note "Companies House public data subject to its published reuse terms." \
  --parser-id companies-house-psc-parser \
  --parser-version 1.0.0 \
  --secret-header-env Authorization=COMPANIES_HOUSE_AUTHORIZATION
```

For a manually downloaded bulk file or page, add `--source-file`, `--media-type`, and optionally `--extension`. The declared source URL remains in the manifest even when the bytes are imported from disk.

## Offline use

Verify integrity:

```bash
python pipeline/registers/snapshot.py verify pipeline/registers/raw/<register-id>/<snapshot>.snapshot.json
```

Replay the exact bytes to another process:

```bash
python pipeline/registers/snapshot.py replay pipeline/registers/raw/<register-id>/<snapshot>.snapshot.json
```

Run the whole contract:

```bash
npm run audit:register-snapshots
```

The audit checks every committed manifest and payload. Its offline test exercises API, bulk, and page adapters, detects tampering, and confirms that secret-looking query keys are refused.

## Coverage planning

`content/register-coverage-rules.json` contains conservative reviewed selectors over taxonomy properties. `pipeline/registers/build_coverage_matrix.py` derives every covered or open decision and crosses it with every shelf register. The generated matrix records each relationship exactly once as applicable, not-applicable, blocked, or unmapped.

Unmapped is the default. It means the relationship has not been reviewed. A decision can become not-applicable or blocked only through an explicit selector with a written reason.

```bash
npm run build:register-coverage
npm run audit:register-coverage
```

## Deterministic evidence

Register-specific parsers write normalized scalar observations to `pipeline/registers/observations/`. They do not write finished notes, choose criteria, or assign scores. `build_evidence.py` joins those observations only to verified snapshots, reviewed `matched` mappings, and decisions marked applicable in the coverage matrix.

```bash
npm run build:register-evidence
npm run audit:register-evidence
```

Generated bundles live in `pipeline/registers/evidence/`. Every provenance note derives its source URL, query, scope, and date from the snapshot. A `no-matching-record` observation always says that the scoped absence does not establish safety, quality, or compliance.

Each bundle deterministically selects up to ten entries for manual checking. The resulting receipt belongs in `content/register-reviews/`, pins the evidence bytes by SHA-256, and becomes stale whenever any source, mapping, observation, coverage rule, or generator input changes.

Approved provenance can then cross the final content boundary:

```bash
npm run promote:register-evidence
npm run audit:register-promotions
```

Promotion changes only an existing provenance cell whose criterion and score are already present. It cannot add a score, invent a criterion, create an option, or use an unapproved or stale receipt.
