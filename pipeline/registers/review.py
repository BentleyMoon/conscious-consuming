#!/usr/bin/env python3
"""Validate human review receipts against byte-exact evidence bundles."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


class ReviewError(ValueError):
    """A review receipt is incomplete, stale, or attached to the wrong evidence."""


def validate_review(root: Path, review_path: Path) -> dict:
    review = json.loads(review_path.read_text(encoding="utf-8"))
    required = {
        "format", "version", "registerId", "snapshotId", "evidence",
        "evidenceSha256", "status", "reviewedBy", "reviewedOn", "samples",
    }
    if set(review) != required:
        raise ReviewError(f"{review_path.name}: unexpected or missing root fields")
    if review["format"] != "open-values-register-evidence-review" or review["version"] != "1.0.0":
        raise ReviewError(f"{review_path.name}: unsupported review format")
    evidence_path = root / review["evidence"]
    if not evidence_path.is_file():
        raise ReviewError(f"{review_path.name}: evidence bundle is missing")
    digest = hashlib.sha256(evidence_path.read_bytes()).hexdigest()
    if review["evidenceSha256"] != digest:
        raise ReviewError(f"{review_path.name}: evidence hash is stale")
    evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
    if review["registerId"] != evidence.get("registerId") or review["snapshotId"] != evidence.get("snapshot", {}).get("snapshotId"):
        raise ReviewError(f"{review_path.name}: register or snapshot does not match evidence")
    if review["status"] not in {"approved", "rejected"}:
        raise ReviewError(f"{review_path.name}: status must be approved or rejected")
    if not str(review["reviewedBy"]).strip() or not str(review["reviewedOn"]).strip():
        raise ReviewError(f"{review_path.name}: reviewer and date are required")
    samples = review.get("samples")
    if not isinstance(samples, list):
        raise ReviewError(f"{review_path.name}: samples must be an array")
    expected = evidence.get("reviewRequirement", {}).get("entryIds", [])
    actual = [sample.get("entryId") for sample in samples]
    if sorted(actual) != sorted(expected) or len(actual) != len(set(actual)):
        raise ReviewError(f"{review_path.name}: samples must exactly cover the deterministic review set")
    for index, sample in enumerate(samples):
        if set(sample) != {"entryId", "mappingChecked", "sourceChecked", "note"}:
            raise ReviewError(f"{review_path.name}.samples[{index}]: unexpected or missing fields")
        if sample["mappingChecked"] is not True or sample["sourceChecked"] is not True or not str(sample["note"]).strip():
            raise ReviewError(f"{review_path.name}.samples[{index}]: both checks and a note are required")
    return review
