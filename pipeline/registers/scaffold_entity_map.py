#!/usr/bin/env python3
"""Scaffold explicit, non-claiming entity rows for selected built decisions."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent))
from tracked_io import write_text  # noqa: E402


def canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def entity_hash(code: str, name: str) -> str:
    return hashlib.sha256(canonical({"code": code, "name": name}).encode("utf-8")).hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--register", required=True)
    parser.add_argument("--cid", action="append", required=True)
    parser.add_argument("--updated", required=True, help="Review batch date in YYYY-MM-DD form")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    shelf = read_json(ROOT / "content" / "registers.json")
    register_ids = {row["id"] for row in shelf.get("registers", [])}
    if args.register not in register_ids:
        raise SystemExit(f"unknown register id: {args.register}")
    inventory = read_json(HERE / "entity-inventory.json")
    decisions = {row["cid"]: row for row in inventory.get("decisions", [])}
    rows = []
    for cid in sorted(set(args.cid)):
        receipt = decisions.get(cid)
        if not receipt:
            raise SystemExit(f"unknown built decision: {cid}")
        dataset = read_json(ROOT / receipt["dataset"])
        entities = dataset[receipt["entityField"]]
        for entity in sorted(entities, key=lambda row: row["code"]):
            rows.append({
                "cid": cid,
                "entityCode": entity["code"],
                "entityName": entity["name"],
                "entityIdentitySha256": entity_hash(entity["code"], entity["name"]),
                "status": "unreviewed",
            })

    output = args.output or ROOT / "content" / "register-mappings" / f"{args.register}.json"
    if output.exists() and not args.force:
        raise SystemExit(f"refusing to overwrite existing map without --force: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    value = {
        "format": "open-values-register-entity-map",
        "version": "1.0.0",
        "registerId": args.register,
        "updated": args.updated,
        "note": "Scaffold only. Unreviewed rows cannot emit evidence until a human resolves identity against the register.",
        "mappings": rows,
    }
    write_text(output, json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    try:
        display_path = output.relative_to(ROOT).as_posix()
    except ValueError:
        display_path = str(output)
    print(f"scaffolded {len(rows)} rows for {args.register} into {display_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
