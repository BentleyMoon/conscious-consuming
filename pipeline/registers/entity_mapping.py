#!/usr/bin/env python3
"""Load reviewed register entity maps and expose only claim-eligible rows."""

from __future__ import annotations

import json
from pathlib import Path


class EntityMappingError(ValueError):
    """A mapping row is too weak or malformed to use."""


def read_mapping(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _nonempty(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def validate_matched_row(row: dict) -> None:
    target = f"{row.get('cid', '(missing)')}/{row.get('entityCode', '(missing)')}"
    if row.get("status") != "matched":
        raise EntityMappingError(f"{target}: claim row must have matched status")
    for field in ("legalName", "jurisdiction"):
        if not _nonempty(row.get(field)):
            raise EntityMappingError(f"{target}: matched row missing {field}")
    identifier = row.get("registerIdentifier")
    if not isinstance(identifier, dict) or not _nonempty(identifier.get("scheme")) or not _nonempty(identifier.get("value")):
        raise EntityMappingError(f"{target}: matched row missing stable register identifier")
    evidence = row.get("matchEvidence")
    if not isinstance(evidence, dict) or not _nonempty(evidence.get("source")) or not _nonempty(evidence.get("note")):
        raise EntityMappingError(f"{target}: matched row missing match evidence")
    review = row.get("review")
    if not isinstance(review, dict) or not _nonempty(review.get("by")) or not _nonempty(review.get("on")):
        raise EntityMappingError(f"{target}: matched row missing review receipt")


def claim_eligible_rows(mapping: dict) -> list[dict]:
    if mapping.get("format") != "open-values-register-entity-map" or mapping.get("version") != "1.0.0":
        raise EntityMappingError("unsupported register entity map")
    rows = mapping.get("mappings")
    if not isinstance(rows, list):
        raise EntityMappingError("mapping file missing mappings array")
    eligible = []
    for row in rows:
        if not isinstance(row, dict):
            raise EntityMappingError("mapping row must be an object")
        if row.get("status") == "matched":
            validate_matched_row(row)
            eligible.append(row)
    return eligible


def load_claim_eligible_rows(path: Path) -> list[dict]:
    return claim_eligible_rows(read_mapping(path))
