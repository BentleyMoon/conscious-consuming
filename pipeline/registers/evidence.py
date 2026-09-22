#!/usr/bin/env python3
"""Pure transformation from verified register inputs to lens-ready provenance."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode, urlsplit, urlunsplit

from entity_mapping import claim_eligible_rows
from snapshot import verify_snapshot

GENERATOR_VERSION = "1.1.0"
ABSENCE_DISCLAIMER = "This scoped absence does not establish safety, quality, or compliance."


class EvidenceError(ValueError):
    """An input cannot safely cross the generated evidence boundary."""


def canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_path(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def relative_label(path: Path, root: Path) -> str:
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def identifier_key(identifier: dict) -> tuple[str, str]:
    return str(identifier.get("scheme", "")), str(identifier.get("value", ""))


def query_url(manifest: dict) -> str:
    request = manifest["request"]
    parts = urlsplit(request["url"])
    pairs = []
    for key in sorted(request.get("query", {})):
        for value in sorted(request["query"][key]):
            pairs.append((key, value))
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(pairs), ""))


def applicable_pairs(matrix: dict, register_id: str) -> set[str]:
    result = set()
    for decision in matrix.get("decisions", []):
        ids = {row.get("registerId") for row in decision.get("coverage", {}).get("applicable", [])}
        if register_id in ids and decision.get("cid"):
            result.add(decision["cid"])
    return result


def validate_observation(observation: dict, label: str) -> None:
    allowed = {"registerIdentifier", "outcome", "searchTerms", "records", "claims"}
    unexpected = set(observation) - allowed
    if unexpected:
        raise EvidenceError(f"{label}: unexpected fields {sorted(unexpected)}")
    scheme, value = identifier_key(observation.get("registerIdentifier", {}))
    if not scheme.strip() or not value.strip():
        raise EvidenceError(f"{label}: stable register identifier is required")
    terms = observation.get("searchTerms")
    if not isinstance(terms, list) or not terms or any(not isinstance(term, str) or not term.strip() for term in terms):
        raise EvidenceError(f"{label}: searchTerms must be non-empty strings")
    if len(set(terms)) != len(terms):
        raise EvidenceError(f"{label}: searchTerms must be unique")
    records = observation.get("records")
    claims = observation.get("claims")
    if not isinstance(records, list) or not isinstance(claims, list):
        raise EvidenceError(f"{label}: records and claims must be arrays")
    record_ids = []
    for index, record in enumerate(records):
        if set(record) != {"id", "pointer"}:
            raise EvidenceError(f"{label}.records[{index}]: expected only id and pointer")
        if not str(record["id"]).strip() or not str(record["pointer"]).startswith(("#", "/", "line:", "row:")):
            raise EvidenceError(f"{label}.records[{index}]: invalid record trace")
        record_ids.append(record["id"])
    if len(record_ids) != len(set(record_ids)):
        raise EvidenceError(f"{label}: duplicate record ids")
    known_records = set(record_ids)
    for index, claim in enumerate(claims):
        if set(claim) - {"label", "value", "unit", "recordIds"}:
            raise EvidenceError(f"{label}.claims[{index}]: unexpected field")
        if not isinstance(claim.get("label"), str) or not claim["label"].strip():
            raise EvidenceError(f"{label}.claims[{index}]: label is required")
        if isinstance(claim.get("value"), (dict, list)) or claim.get("value") is None:
            raise EvidenceError(f"{label}.claims[{index}]: value must be scalar")
        refs = claim.get("recordIds")
        if not isinstance(refs, list) or not refs or set(refs) - known_records:
            raise EvidenceError(f"{label}.claims[{index}]: every claim must cite known record ids")
    outcome = observation.get("outcome")
    if outcome == "records-found" and (not records or not claims):
        raise EvidenceError(f"{label}: records-found requires records and claims")
    if outcome == "no-matching-record" and (records or claims):
        raise EvidenceError(f"{label}: scoped absence cannot carry records or claims")
    if outcome not in {"records-found", "no-matching-record"}:
        raise EvidenceError(f"{label}: unsupported outcome {outcome}")


def display_scalar(value: object) -> str:
    if value is True:
        return "true"
    if value is False:
        return "false"
    return str(value)


def generated_note(register_name: str, legal_name: str, observation: dict, scope: str, captured_date: str) -> str:
    terms = ", ".join(sorted(term.strip() for term in observation["searchTerms"]))
    if observation["outcome"] == "no-matching-record":
        return (
            f"No matching record was returned for {legal_name} by {register_name}. "
            f"Search terms: {terms}. Scope: {scope}. Snapshot captured {captured_date}. "
            f"{ABSENCE_DISCLAIMER}"
        )
    claims = sorted(
        observation["claims"],
        key=lambda row: (row["label"].casefold(), display_scalar(row["value"]), row.get("unit", "")),
    )
    rendered = []
    for claim in claims:
        value = display_scalar(claim["value"])
        if claim.get("unit"):
            value = f"{value} {claim['unit']}"
        rendered.append(f"{claim['label'].strip()}: {value}")
    count = len(observation["records"])
    noun = "record" if count == 1 else "records"
    return (
        f"For {legal_name}, {register_name} returned {count} matching {noun}. "
        f"{'; '.join(rendered)}. Search terms: {terms}. Scope: {scope}. "
        f"Snapshot captured {captured_date}."
    )


def build_evidence_bundle(
    *,
    root: Path,
    shelf: dict,
    snapshot_path: Path,
    mapping_path: Path,
    observations_path: Path,
    coverage_path: Path,
) -> dict:
    manifest = verify_snapshot(snapshot_path)
    mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    observations = json.loads(observations_path.read_text(encoding="utf-8"))
    coverage = json.loads(coverage_path.read_text(encoding="utf-8"))
    register_id = manifest["registerId"]
    register = next((row for row in shelf.get("registers", []) if row.get("id") == register_id), None)
    if not register:
        raise EvidenceError(f"snapshot names unknown shelf register {register_id}")
    if mapping.get("registerId") != register_id or observations.get("registerId") != register_id:
        raise EvidenceError("snapshot, mapping, and observations must name the same register")
    if observations.get("format") != "open-values-register-observations" or observations.get("version") != "1.0.0":
        raise EvidenceError("unsupported register observations format")
    pinned = observations.get("snapshot", {})
    if pinned.get("snapshotId") != manifest["snapshotId"] or pinned.get("payloadSha256") != manifest["response"]["sha256"]:
        raise EvidenceError("observations are not pinned to the verified snapshot payload")
    expected_manifest = relative_label(snapshot_path, root)
    if pinned.get("manifest") != expected_manifest:
        raise EvidenceError(f"observations snapshot manifest must be {expected_manifest}")
    if observations.get("parser") != manifest.get("parser"):
        raise EvidenceError("observation parser receipt does not match the snapshot parser contract")

    all_eligible = claim_eligible_rows(mapping)
    targets = observations.get("targets")
    if not isinstance(targets, list) or not targets or len(targets) != len(set(targets)):
        raise EvidenceError("observations must name a unique non-empty target set")
    rows_by_target = {f"{row['cid']}/{row['entityCode']}": row for row in all_eligible}
    unknown_targets = sorted(set(targets) - set(rows_by_target))
    if unknown_targets:
        raise EvidenceError(f"observations name targets without claim-eligible mappings: {unknown_targets}")
    eligible = [rows_by_target[target] for target in targets]
    allowed_cids = applicable_pairs(coverage, register_id)
    for row in eligible:
        if row["cid"] not in allowed_cids:
            raise EvidenceError(f"{row['cid']}/{register_id}: coverage matrix is not applicable")

    by_identifier = {}
    for index, observation in enumerate(observations.get("observations", [])):
        validate_observation(observation, f"observations[{index}]")
        key = identifier_key(observation["registerIdentifier"])
        if key in by_identifier:
            raise EvidenceError(f"duplicate observation identifier {key[0]}:{key[1]}")
        by_identifier[key] = observation
    needed = {identifier_key(row["registerIdentifier"]) for row in eligible}
    if set(by_identifier) != needed:
        missing = sorted(needed - set(by_identifier))
        extra = sorted(set(by_identifier) - needed)
        raise EvidenceError(f"observation/matched mapping mismatch missing={missing} extra={extra}")

    source = query_url(manifest)
    captured_date = manifest["capturedAt"][:10]
    scope = manifest["request"]["scope"].strip()
    entries = []
    for row in eligible:
        observation = by_identifier[identifier_key(row["registerIdentifier"])]
        entry_id = f"{row['cid']}/{row['entityCode']}"
        entries.append({
            "entryId": entry_id,
            "cid": row["cid"],
            "entityCode": row["entityCode"],
            "entityName": row["entityName"],
            "entityIdentitySha256": row["entityIdentitySha256"],
            "legalName": row["legalName"],
            "registerIdentifier": {
                "scheme": row["registerIdentifier"]["scheme"],
                "value": row["registerIdentifier"]["value"],
            },
            "mappingReview": {"by": row["review"]["by"], "on": row["review"]["on"]},
            "outcome": observation["outcome"],
            "searchTerms": sorted(observation["searchTerms"]),
            "recordTrace": sorted(observation["records"], key=lambda item: (item["id"], item["pointer"])),
            "provenance": {
                "note": generated_note(register["name"], row["legalName"], observation, scope, captured_date),
                "source": source,
                "asof": captured_date[:4],
            },
        })
    entries.sort(key=lambda item: (item["cid"], item["entityCode"]))

    input_hashes = {
        "snapshotManifestSha256": sha256_path(snapshot_path),
        "mappingSha256": sha256_path(mapping_path),
        "observationsSha256": sha256_path(observations_path),
        "coverageMatrixSha256": sha256_path(coverage_path),
    }
    # Review sampling must be stable for the source evidence itself. The full
    # coverage hash remains pinned above and still invalidates approval, but a
    # coverage change elsewhere in the catalogue must not reshuffle unrelated
    # source samples.
    sample_inputs = {
        key: input_hashes[key]
        for key in ("snapshotManifestSha256", "mappingSha256", "observationsSha256")
    }
    seed = canonical(sample_inputs)
    ranked = sorted(entries, key=lambda item: sha256_bytes(f"{seed}:{item['entryId']}".encode("utf-8")))
    sample_ids = sorted(item["entryId"] for item in ranked[: min(10, len(ranked))])
    found = sum(item["outcome"] == "records-found" for item in entries)
    absences = len(entries) - found
    return {
        "format": "open-values-register-evidence-bundle",
        "version": "1.0.0",
        "registerId": register_id,
        "criterion": register["provenanceKey"],
        "snapshot": {
            "snapshotId": manifest["snapshotId"],
            "capturedAt": manifest["capturedAt"],
            "queryUrl": source,
            "scope": scope,
            "payloadSha256": manifest["response"]["sha256"],
        },
        "generatedFrom": {
            "snapshotManifest": relative_label(snapshot_path, root),
            "snapshotManifestSha256": input_hashes["snapshotManifestSha256"],
            "mapping": relative_label(mapping_path, root),
            "mappingSha256": input_hashes["mappingSha256"],
            "observations": relative_label(observations_path, root),
            "observationsSha256": input_hashes["observationsSha256"],
            "coverageMatrixSha256": input_hashes["coverageMatrixSha256"],
            "generatorVersion": GENERATOR_VERSION,
        },
        "counts": {
            "matchedMappings": len(eligible),
            "recordsFound": found,
            "scopedAbsences": absences,
            "entries": len(entries),
        },
        "reviewRequirement": {
            "method": "lowest-sha256-of-bundle-inputs-and-entry-id",
            "sampleSize": len(sample_ids),
            "entryIds": sample_ids,
        },
        "entries": entries,
    }
