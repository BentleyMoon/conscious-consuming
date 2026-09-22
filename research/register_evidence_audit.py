#!/usr/bin/env python3
"""Derive and verify every generated register evidence bundle and review receipt."""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
HERE = ROOT / "pipeline" / "registers"
sys.path.insert(0, str(HERE))
from review import ReviewError, validate_review  # noqa: E402


def main() -> None:
    print("Register evidence audit")
    subprocess.run([sys.executable, str(HERE / "build_evidence.py"), "--check"], cwd=ROOT, check=True)
    evidence_files = sorted((HERE / "evidence").glob("*.evidence.json"))
    review_files = sorted((ROOT / "content" / "register-reviews").glob("*.json"))
    entries = 0
    absences = 0
    approved = 0
    reviewed_bundles = set()
    for path in evidence_files:
        value = json.loads(path.read_text(encoding="utf-8"))
        entries += len(value.get("entries", []))
        absences += value.get("counts", {}).get("scopedAbsences", 0)
        if value.get("counts", {}).get("entries") != len(value.get("entries", [])):
            raise SystemExit(f"{path.name}: entry denominator is stale")
        for entry in value.get("entries", []):
            note = entry.get("provenance", {}).get("note", "")
            if entry.get("outcome") == "no-matching-record" and "does not establish safety, quality, or compliance" not in note:
                raise SystemExit(f"{path.name}/{entry.get('entryId')}: unsafe absence wording")
    for path in review_files:
        try:
            review = validate_review(ROOT, path)
        except (ReviewError, OSError, json.JSONDecodeError) as exc:
            raise SystemExit(f"register evidence review error: {exc}") from exc
        target = review["evidence"]
        if target in reviewed_bundles:
            raise SystemExit(f"{path.name}: duplicate review for {target}")
        reviewed_bundles.add(target)
        approved += review["status"] == "approved"
    print(f"  observation inputs: {len(list((HERE / 'observations').glob('*.observations.json')))}")
    print(f"  evidence bundles: {len(evidence_files)}")
    print(f"  evidence entries: {entries}")
    print(f"  scoped absences: {absences}")
    print(f"  review receipts: {len(review_files)}")
    print(f"  approved bundles: {approved}/{len(evidence_files)}")
    print("REGISTER EVIDENCE CHECKS PASS")


if __name__ == "__main__":
    main()
