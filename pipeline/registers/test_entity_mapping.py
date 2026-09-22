#!/usr/bin/env python3
"""Falsifiability tests for the claim-eligibility boundary."""

from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys
import tempfile

from entity_mapping import EntityMappingError, claim_eligible_rows


def main() -> None:
    print("Register entity mapping test")
    matched = {
        "cid": "fixture-decision",
        "entityCode": "fixture-option",
        "entityName": "Fixture Option",
        "entityIdentitySha256": "0" * 64,
        "status": "matched",
        "legalName": "Fixture Option Limited",
        "aliases": ["Fixture Option"],
        "jurisdiction": "GB",
        "registerIdentifier": {"scheme": "company-number", "value": "01234567"},
        "matchEvidence": {
            "source": "https://register.example/company/01234567",
            "note": "The register record uses the same legal name and company number.",
            "accessed": "2026-08-14",
        },
        "review": {"by": "Fixture reviewer", "on": "2026-08-14"},
    }
    unresolved = [
        {"status": "unreviewed"},
        {"status": "ambiguous"},
        {"status": "unmatched"},
        {"status": "not-applicable"},
    ]
    mapping = {
        "format": "open-values-register-entity-map",
        "version": "1.0.0",
        "mappings": [matched, *unresolved],
    }
    eligible = claim_eligible_rows(mapping)
    if eligible != [matched]:
        raise AssertionError("only matched rows may cross the claim boundary")

    broken = deepcopy(mapping)
    del broken["mappings"][0]["registerIdentifier"]
    try:
        claim_eligible_rows(broken)
        raise AssertionError("matched row without identifier should fail")
    except EntityMappingError:
        pass

    root = Path(__file__).resolve().parents[2]
    inventory = json.loads((root / "pipeline" / "registers" / "entity-inventory.json").read_text(encoding="utf-8"))
    first_decision = inventory["decisions"][0]
    with tempfile.TemporaryDirectory(prefix="register-map-scaffold-") as temp:
        output = Path(temp) / "openfda-recalls.json"
        subprocess.run([
            sys.executable,
            str(root / "pipeline" / "registers" / "scaffold_entity_map.py"),
            "--register", "openfda-recalls",
            "--cid", first_decision["cid"],
            "--updated", "2026-08-14",
            "--output", str(output),
        ], cwd=root, check=True, capture_output=True, text=True)
        scaffold = json.loads(output.read_text(encoding="utf-8"))
        if len(scaffold["mappings"]) != first_decision["entityCount"]:
            raise AssertionError("scaffold must derive every current option in the selected decision")
        if claim_eligible_rows(scaffold):
            raise AssertionError("fresh scaffold rows must not be claim-eligible")

    print("  matched rows emitted: 1")
    print("  unresolved rows emitted: 0")
    print("  missing identifier probe: failed as expected")
    print(f"  scaffold coverage: {first_decision['cid']} {first_decision['entityCount']}/{first_decision['entityCount']}")
    print("  fresh scaffold claims emitted: 0")
    print("REGISTER ENTITY MAPPING TESTS PASS")


if __name__ == "__main__":
    main()
