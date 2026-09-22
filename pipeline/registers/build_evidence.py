#!/usr/bin/env python3
"""Build or check every deterministic register evidence bundle."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from evidence import EvidenceError, build_evidence_bundle

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tracked_io import write_text  # noqa: E402

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OBSERVATIONS = HERE / "observations"
EVIDENCE = HERE / "evidence"
SHELF = ROOT / "content" / "registers.json"
MAPPINGS = ROOT / "content" / "register-mappings"
COVERAGE = HERE / "coverage-matrix.json"


def render(value: dict) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def output_name(value: dict) -> str:
    return f"{value['registerId']}-{value['snapshot']['snapshotId']}.evidence.json"


def build_all(check: bool) -> tuple[int, int]:
    shelf = json.loads(SHELF.read_text(encoding="utf-8"))
    inputs = sorted(OBSERVATIONS.glob("*.observations.json"))
    expected = set()
    entry_count = 0
    for observations_path in inputs:
        observations = json.loads(observations_path.read_text(encoding="utf-8"))
        register_id = observations.get("registerId", "")
        mapping_path = MAPPINGS / f"{register_id}.json"
        snapshot_path = ROOT / observations.get("snapshot", {}).get("manifest", "")
        if not mapping_path.is_file():
            raise EvidenceError(f"{observations_path.name}: missing reviewed mapping {mapping_path.name}")
        bundle = build_evidence_bundle(
            root=ROOT,
            shelf=shelf,
            snapshot_path=snapshot_path,
            mapping_path=mapping_path,
            observations_path=observations_path,
            coverage_path=COVERAGE,
        )
        output_path = EVIDENCE / output_name(bundle)
        expected.add(output_path.name)
        content = render(bundle)
        if check:
            if not output_path.is_file() or output_path.read_text(encoding="utf-8") != content:
                raise EvidenceError(f"{output_path.name}: generated evidence is missing or stale")
        else:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            write_text(output_path, content)
        entry_count += len(bundle["entries"])
    actual = {path.name for path in EVIDENCE.glob("*.evidence.json")}
    if actual != expected:
        raise EvidenceError(f"evidence output set is stale missing={sorted(expected - actual)} extra={sorted(actual - expected)}")
    return len(inputs), entry_count


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        bundles, entries = build_all(args.check)
    except (EvidenceError, OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"register evidence error: {exc}") from exc
    mode = "current" if args.check else "built"
    print(f"register evidence {mode}: {bundles} bundles, {entries} entries")


if __name__ == "__main__":
    main()
