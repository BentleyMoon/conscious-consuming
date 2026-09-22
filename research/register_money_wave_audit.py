#!/usr/bin/env python3
"""Verify the live Phase 7 CFPB money-register artifacts and score policy."""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
REGISTERS = ROOT / "pipeline" / "registers"
sys.path.insert(0, str(REGISTERS))
from parse_cfpb_complaints import TARGETS, build as build_cfpb  # noqa: E402


def main() -> None:
    print("Register money wave audit")
    mapping_path = ROOT / "content" / "register-mappings" / "cfpb-complaints.json"
    current_mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    reviews = {(row["review"]["by"], row["review"]["on"]) for row in current_mapping["mappings"]}
    if len(reviews) != 1:
        raise SystemExit("CFPB exact company mapping must carry one consistent review receipt")
    reviewed_by, reviewed_on = reviews.pop()

    observation_paths = sorted((REGISTERS / "observations").glob("cfpb-complaints-*.observations.json"))
    snapshots = {}
    current_by_path = {}
    for path in observation_paths:
        value = json.loads(path.read_text(encoding="utf-8"))
        cids = {target.split("/", 1)[0] for target in value.get("targets", [])}
        if len(cids) != 1:
            raise SystemExit(f"{path.name}: expected one decision-scoped CFPB observation bundle")
        cid = cids.pop()
        if cid in snapshots:
            raise SystemExit(f"{cid}: duplicate CFPB product snapshot")
        snapshots[cid] = ROOT / value["snapshot"]["manifest"]
        current_by_path[path] = value
    if set(snapshots) != set(TARGETS):
        raise SystemExit(f"CFPB decision snapshots drifted: expected {sorted(TARGETS)}, found {sorted(snapshots)}")

    mapping, generated = build_cfpb(snapshots, reviewed_by, reviewed_on)
    if mapping != current_mapping:
        raise SystemExit("CFPB exact company mapping is stale")
    for path, value in generated:
        if current_by_path.get(path) != value:
            raise SystemExit(f"{path.name}: parsed CFPB observations are stale")

    subprocess.run([sys.executable, str(REGISTERS / "build_evidence.py"), "--check"], cwd=ROOT, check=True)
    subprocess.run([sys.executable, str(REGISTERS / "promote_evidence.py"), "--check"], cwd=ROOT, check=True)
    subprocess.run([sys.executable, str(REGISTERS / "neutralize_cfpb_scores.py"), "--check"], cwd=ROOT, check=True)

    target_count = 0
    for cid, config in TARGETS.items():
        lens_path = ROOT / "content" / "lenses" / f"{cid}.json"
        lens = json.loads(lens_path.read_text(encoding="utf-8"))
        if "wikipedia.org" in json.dumps(lens).lower():
            raise SystemExit(f"{cid}: wiki source remains in Phase 7 decision")
        products = {row["code"]: row for row in lens["products"]}
        for code in config["companies"]:
            product = products[code]
            if product["scores"].get("complaints") is not None:
                raise SystemExit(f"{cid}/{code}: raw complaint count still has a comparative score")
            provenance = product.get("provenance", {}).get("complaints", {})
            note = provenance.get("note", "")
            if "not normalized" not in note or "Category complaint total" not in note:
                raise SystemExit(f"{cid}/{code}: CFPB limitation or category denominator is missing")
            target_count += 1

    print(f"  bounded CFPB snapshots: {len(snapshots)}")
    print(f"  exact product-company mappings: {len(current_mapping['mappings'])}")
    print(f"  promoted raw-count evidence cells: {target_count}")
    print(f"  exposure-free complaint scores removed: {target_count}")
    print("REGISTER MONEY WAVE CHECKS PASS")


if __name__ == "__main__":
    main()
