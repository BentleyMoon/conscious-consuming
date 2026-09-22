#!/usr/bin/env python3
"""Verify the live Phase 8 durability-register artifacts and model boundary."""

from __future__ import annotations

import csv
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
REGISTERS = ROOT / "pipeline" / "registers"
sys.path.insert(0, str(REGISTERS))
from parse_france_durability import TARGETS, build as build_france  # noqa: E402


def main() -> None:
    print("Register durability wave audit")
    shelf = json.loads((ROOT / "content" / "registers.json").read_text(encoding="utf-8"))
    register = next(row for row in shelf["registers"] if row["id"] == "france-durability")
    if register["provenanceKey"] != "durability":
        raise SystemExit("French overall durability index must populate durability, not repairability")

    mapping_path = ROOT / "content" / "register-mappings" / "france-durability.json"
    current_mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    if {row["entityCode"] for row in current_mapping["mappings"]} != set(TARGETS):
        raise SystemExit("French durability mappings must stop at the exact reviewed model set")
    reviews = {(row["review"]["by"], row["review"]["on"]) for row in current_mapping["mappings"]}
    if len(reviews) != 1:
        raise SystemExit("French exact-model mapping must carry one consistent review receipt")
    reviewed_by, reviewed_on = reviews.pop()

    observations_paths = sorted((REGISTERS / "observations").glob("france-durability-*.observations.json"))
    if len(observations_paths) != 1:
        raise SystemExit("Phase 8 requires exactly one governed French durability consolidation")
    current_observations = json.loads(observations_paths[0].read_text(encoding="utf-8"))
    snapshot_path = ROOT / current_observations["snapshot"]["manifest"]
    mapping, observations = build_france(snapshot_path, reviewed_by, reviewed_on)
    if mapping != current_mapping or observations != current_observations:
        raise SystemExit("French durability parser outputs are stale")

    manifest = json.loads(snapshot_path.read_text(encoding="utf-8"))
    payload_path = snapshot_path.parent / manifest["response"]["payload"]
    with payload_path.open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.DictReader(source))
    by_id = {row["id_unique"]: row for row in rows}
    lens = json.loads((ROOT / "content" / "lenses" / "washing-machines.json").read_text(encoding="utf-8"))
    products = {row["code"]: row for row in lens["products"]}
    for code, unique_id in TARGETS.items():
        official = float(by_id[unique_id]["note_id"])
        if products[code]["scores"].get("durability") != round(round(official, 2) * 10):
            raise SystemExit(f"washing-machines/{code}: score is not the rounded official durability index")
        provenance = products[code].get("provenance", {}).get("durability", {})
        if "Reliability component" not in provenance.get("note", "") or "Repairability component" not in provenance.get("note", ""):
            raise SystemExit(f"washing-machines/{code}: generated component evidence is missing")

    subprocess.run([sys.executable, str(REGISTERS / "build_evidence.py"), "--check"], cwd=ROOT, check=True)
    subprocess.run([sys.executable, str(REGISTERS / "promote_evidence.py"), "--check"], cwd=ROOT, check=True)
    print(f"  consolidated filing rows: {len(rows)}")
    print(f"  exact reviewed model mappings: {len(TARGETS)}")
    print(f"  promoted durability evidence cells: {len(TARGETS)}")
    print("  broader or regional model names left unmapped: yes")
    print("REGISTER DURABILITY WAVE CHECKS PASS")


if __name__ == "__main__":
    main()
