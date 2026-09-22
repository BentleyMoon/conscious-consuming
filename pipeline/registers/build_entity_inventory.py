#!/usr/bin/env python3
"""Build the compact identity receipt for every option in every built decision."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent))
from tracked_io import write_text  # noqa: E402

INDEX = ROOT / "app" / "data" / "index.json"
OUTPUT = HERE / "entity-inventory.json"


def canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest_json(value: object) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def entity_identity(entity: dict) -> dict[str, str]:
    return {"code": entity["code"], "name": entity["name"]}


def build_inventory() -> dict:
    index = read_json(INDEX)
    decisions = []
    total_entities = 0
    for category in sorted(index.get("categories", []), key=lambda row: row["id"]):
        cid = category["id"]
        dataset_path = ROOT / "app" / "data" / category["file"]
        dataset = read_json(dataset_path)
        has_products = isinstance(dataset.get("products"), list)
        has_resources = isinstance(dataset.get("resources"), list)
        if has_products == has_resources:
            raise ValueError(f"{cid}: expected exactly one products/resources array")
        entity_field = "products" if has_products else "resources"
        entities = dataset[entity_field]
        if category.get("n") != len(entities):
            raise ValueError(f"{cid}: index count {category.get('n')} does not match {len(entities)} entities")
        seen = set()
        identities = []
        for position, entity in enumerate(entities):
            code = entity.get("code")
            name = entity.get("name")
            if not isinstance(code, str) or not code:
                raise ValueError(f"{cid}[{position}]: missing entity code")
            if not isinstance(name, str) or not name:
                raise ValueError(f"{cid}/{code}: missing entity name")
            if code in seen:
                raise ValueError(f"{cid}: duplicate entity code {code}")
            seen.add(code)
            identities.append(entity_identity(entity))
        identities.sort(key=lambda row: row["code"])
        decision = {
            "cid": cid,
            "label": category["label"],
            "dataset": f"app/data/{category['file']}",
            "entityField": entity_field,
            "entityCount": len(identities),
            "identitySha256": digest_json(identities),
        }
        decisions.append(decision)
        total_entities += len(identities)

    receipt_rows = [
        {"cid": row["cid"], "entityCount": row["entityCount"], "identitySha256": row["identitySha256"]}
        for row in decisions
    ]
    return {
        "format": "open-values-register-entity-inventory",
        "version": "1.0.0",
        "generatedFrom": {
            "index": "app/data/index.json",
            "indexSha256": hashlib.sha256(INDEX.read_bytes()).hexdigest(),
        },
        "counts": {
            "decisions": len(decisions),
            "entities": total_entities,
            "missingCodes": 0,
            "missingNames": 0,
            "duplicateCodesWithinDecision": 0,
        },
        "catalogueIdentitySha256": digest_json(receipt_rows),
        "decisions": decisions,
    }


def main() -> None:
    inventory = build_inventory()
    rendered = json.dumps(inventory, ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != rendered:
            raise SystemExit("register entity inventory is stale; run python pipeline/registers/build_entity_inventory.py")
        print(f"register entity inventory current: {inventory['counts']['decisions']} decisions, {inventory['counts']['entities']} entities")
        return
    write_text(OUTPUT, rendered)
    print(f"register entity inventory: {inventory['counts']['decisions']} decisions, {inventory['counts']['entities']} entities")


if __name__ == "__main__":
    main()
