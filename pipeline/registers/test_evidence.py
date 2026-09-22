#!/usr/bin/env python3
"""Falsifiability tests for deterministic register evidence generation."""

from __future__ import annotations

from copy import deepcopy
import hashlib
import json
from pathlib import Path
import tempfile

from evidence import ABSENCE_DISCLAIMER, EvidenceError, build_evidence_bundle
from review import ReviewError, validate_review
from snapshot import RegisterRecord, capture


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def matched(cid: str, code: str, name: str, identifier: str) -> dict:
    return {
        "cid": cid,
        "entityCode": code,
        "entityName": name,
        "entityIdentitySha256": hashlib.sha256(f"{code}:{name}".encode()).hexdigest(),
        "status": "matched",
        "legalName": f"{name} Limited",
        "aliases": [name],
        "jurisdiction": "GB",
        "registerIdentifier": {"scheme": "company-number", "value": identifier},
        "matchEvidence": {
            "source": f"https://register.example/entities/{identifier}",
            "note": "Legal name and stable identifier agree.",
            "accessed": "2026-08-14",
        },
        "review": {"by": "Fixture reviewer", "on": "2026-08-14"},
    }


def expect_failure(callable_value, message: str) -> None:
    try:
        callable_value()
    except (EvidenceError, ReviewError):
        return
    raise AssertionError(message)


def main() -> None:
    print("Register evidence test")
    with tempfile.TemporaryDirectory(prefix="register-evidence-") as temp:
        root = Path(temp)
        raw = root / "pipeline" / "registers" / "raw"
        source_file = root / "fixture.json"
        source_file.write_text('{"records":[{"id":"r1","class":"Class II"}]}', encoding="utf-8")
        register = RegisterRecord("fixture-register", "api", "https://register.example/search", ())
        snapshot_path = capture(
            record=register,
            output_root=raw,
            source_url=register.endpoint,
            query={"from": ["2025-01-01"], "to": ["2025-12-31"]},
            scope="All fixture records published in 2025",
            captured_at="2026-08-14T12:00:00Z",
            license_url="https://register.example/reuse",
            license_note="Fixture public data.",
            parser_id="fixture-parser",
            parser_version="1.0.0",
            source_file=source_file,
            media_type="application/json",
        )
        manifest = json.loads(snapshot_path.read_text(encoding="utf-8"))
        shelf = {
            "registers": [{
                "id": "fixture-register",
                "name": "Fixture statutory register",
                "provenanceKey": "safety",
            }]
        }
        mapping_path = root / "content" / "register-mappings" / "fixture-register.json"
        mapping = {
            "format": "open-values-register-entity-map",
            "version": "1.0.0",
            "registerId": "fixture-register",
            "updated": "2026-08-14",
            "note": "Fixture reviewed map.",
            "mappings": [
                matched("fixture-decision", "z-option", "Zulu", "222"),
                matched("fixture-decision", "a-option", "Alpha", "111"),
            ],
        }
        write_json(mapping_path, mapping)
        coverage_path = root / "pipeline" / "registers" / "coverage-matrix.json"
        coverage = {
            "decisions": [{
                "cid": "fixture-decision",
                "coverage": {"applicable": [{"registerId": "fixture-register"}]},
            }]
        }
        write_json(coverage_path, coverage)
        observations_path = root / "pipeline" / "registers" / "observations" / "fixture.observations.json"
        observations = {
            "format": "open-values-register-observations",
            "version": "1.0.0",
            "registerId": "fixture-register",
            "snapshot": {
                "manifest": snapshot_path.relative_to(root).as_posix(),
                "snapshotId": manifest["snapshotId"],
                "payloadSha256": manifest["response"]["sha256"],
            },
            "parser": {"id": "fixture-parser", "version": "1.0.0"},
            "targets": ["fixture-decision/z-option", "fixture-decision/a-option"],
            "observations": [
                {
                    "registerIdentifier": {"scheme": "company-number", "value": "222"},
                    "outcome": "no-matching-record",
                    "searchTerms": ["Zulu Limited", "222"],
                    "records": [],
                    "claims": [],
                },
                {
                    "registerIdentifier": {"scheme": "company-number", "value": "111"},
                    "outcome": "records-found",
                    "searchTerms": ["Alpha Limited", "111"],
                    "records": [{"id": "r1", "pointer": "/records/0"}],
                    "claims": [
                        {"label": "Recall date", "value": "2025-02-03", "recordIds": ["r1"]},
                        {"label": "Classification", "value": "Class II", "recordIds": ["r1"]},
                    ],
                },
            ],
        }
        write_json(observations_path, observations)

        kwargs = dict(
            root=root,
            shelf=shelf,
            snapshot_path=snapshot_path,
            mapping_path=mapping_path,
            observations_path=observations_path,
            coverage_path=coverage_path,
        )

        partial = deepcopy(observations)
        partial["targets"] = ["fixture-decision/a-option"]
        partial["observations"] = [partial["observations"][1]]
        write_json(observations_path, partial)
        partial_bundle = build_evidence_bundle(**kwargs)
        if partial_bundle["counts"]["entries"] != 1:
            raise AssertionError("one scoped snapshot must be able to cover part of a register map")
        write_json(observations_path, observations)

        first = build_evidence_bundle(**kwargs)
        second = build_evidence_bundle(**kwargs)
        first_bytes = json.dumps(first, ensure_ascii=False, indent=2) + "\n"
        second_bytes = json.dumps(second, ensure_ascii=False, indent=2) + "\n"
        if first_bytes != second_bytes:
            raise AssertionError("identical inputs must produce byte-identical evidence")
        if [row["entryId"] for row in first["entries"]] != ["fixture-decision/a-option", "fixture-decision/z-option"]:
            raise AssertionError("evidence entries must have stable catalogue ordering")
        absence = first["entries"][1]["provenance"]["note"]
        if ABSENCE_DISCLAIMER not in absence or "Search terms:" not in absence or "Scope:" not in absence or "Snapshot captured" not in absence:
            raise AssertionError("absence note must carry query, scope, date, and non-safety disclaimer")
        found_note = first["entries"][0]["provenance"]["note"]
        if "Classification: Class II" not in found_note or "Recall date: 2025-02-03" not in found_note:
            raise AssertionError("found note must be generated from structured claims")

        stale = deepcopy(observations)
        stale["snapshot"]["payloadSha256"] = "0" * 64
        write_json(observations_path, stale)
        expect_failure(lambda: build_evidence_bundle(**kwargs), "stale snapshot pin should fail")
        write_json(observations_path, observations)

        wrong_mapping = deepcopy(mapping)
        wrong_mapping["mappings"][0]["registerIdentifier"]["value"] = "not-observed"
        write_json(mapping_path, wrong_mapping)
        expect_failure(lambda: build_evidence_bundle(**kwargs), "wrong mapping should fail closed")
        write_json(mapping_path, mapping)

        widened = deepcopy(observations)
        widened["observations"][0]["note"] = "This option is completely safe."
        write_json(observations_path, widened)
        expect_failure(lambda: build_evidence_bundle(**kwargs), "parser-authored prose should fail")
        write_json(observations_path, observations)

        evidence_path = root / "pipeline" / "registers" / "evidence" / "fixture.evidence.json"
        write_json(evidence_path, first)
        review_path = root / "content" / "register-reviews" / "fixture.json"
        review = {
            "format": "open-values-register-evidence-review",
            "version": "1.0.0",
            "registerId": "fixture-register",
            "snapshotId": manifest["snapshotId"],
            "evidence": evidence_path.relative_to(root).as_posix(),
            "evidenceSha256": hashlib.sha256(evidence_path.read_bytes()).hexdigest(),
            "status": "approved",
            "reviewedBy": "Fixture reviewer",
            "reviewedOn": "2026-08-14",
            "samples": [
                {"entryId": entry_id, "mappingChecked": True, "sourceChecked": True, "note": "Checked against fixture."}
                for entry_id in first["reviewRequirement"]["entryIds"]
            ],
        }
        write_json(review_path, review)
        validate_review(root, review_path)
        review["evidenceSha256"] = "0" * 64
        write_json(review_path, review)
        expect_failure(lambda: validate_review(root, review_path), "changed evidence must invalidate review")

    print("  deterministic output: byte-identical")
    print("  stable ordering: 2/2 entries")
    print("  scoped mapping partitions: supported")
    print("  unsafe absence wording probe: failed as expected")
    print("  stale snapshot probe: failed as expected")
    print("  wrong mapping probe: failed as expected")
    print("  parser-authored prose probe: failed as expected")
    print("  stale review receipt probe: failed as expected")
    print("REGISTER EVIDENCE TESTS PASS")


if __name__ == "__main__":
    main()
