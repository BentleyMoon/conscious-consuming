#!/usr/bin/env python3
"""Verify the live Phase 6 safety and certification register artifacts."""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
REGISTERS = ROOT / "pipeline" / "registers"
sys.path.insert(0, str(REGISTERS))
from parse_epa_safer_choice import build as build_epa  # noqa: E402


def main() -> None:
    print("Register safety wave audit")
    observations_files = sorted((REGISTERS / "observations").glob("epa-safer-choice-*.observations.json"))
    if not observations_files:
        raise SystemExit("EPA Safer Choice pass is missing")
    mapping_path = ROOT / "content" / "register-mappings" / "epa-safer-choice.json"
    current_mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    reviews = {(row["review"]["by"], row["review"]["on"]) for row in current_mapping["mappings"]}
    if len(reviews) != 1:
        raise SystemExit("EPA exact-key mapping must carry one consistent review receipt")
    reviewed_by, reviewed_on = reviews.pop()
    targets = 0
    for observations_path in observations_files:
        current_observations = json.loads(observations_path.read_text(encoding="utf-8"))
        snapshot_path = ROOT / current_observations["snapshot"]["manifest"]
        mapping, observations = build_epa(snapshot_path, "dish-soap", reviewed_by, reviewed_on)
        if mapping != current_mapping:
            raise SystemExit("EPA Safer Choice exact-key mapping is stale")
        if observations != current_observations:
            raise SystemExit(f"{observations_path.name}: parsed observations are stale")
        targets += len(observations["targets"])
    subprocess.run([sys.executable, str(REGISTERS / "build_evidence.py"), "--check"], cwd=ROOT, check=True)
    subprocess.run([sys.executable, str(REGISTERS / "promote_evidence.py"), "--check"], cwd=ROOT, check=True)
    cpsc_manifests = sorted((REGISTERS / "raw" / "cpsc-recalls").glob("*.snapshot.json"))
    cpsc_records = 0
    for path in cpsc_manifests:
        manifest = json.loads(path.read_text(encoding="utf-8"))
        payload = path.parent / manifest["response"]["payload"]
        rows = json.loads(payload.read_text(encoding="utf-8-sig"))
        cpsc_records += len(rows)
    print(f"  EPA snapshots parsed: {len(observations_files)}")
    print(f"  exact product mappings: {len(current_mapping['mappings'])}")
    print(f"  generated observations: {targets}")
    print(f"  promoted provenance cells: {targets}")
    print(f"  CPSC scoped snapshots: {len(cpsc_manifests)}")
    print(f"  CPSC toothbrush records in scope: {cpsc_records}")
    print("REGISTER SAFETY WAVE CHECKS PASS")


if __name__ == "__main__":
    main()
