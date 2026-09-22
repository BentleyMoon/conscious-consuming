#!/usr/bin/env python3
"""Parse one EPA Safer Choice snapshot into exact-key mappings and observations."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent))
from tracked_io import write_text  # noqa: E402
from snapshot import verify_snapshot  # noqa: E402

LENSES = ROOT / "content" / "lenses"
INVENTORY = HERE / "entity-inventory.json"
MAPPINGS = ROOT / "content" / "register-mappings"
OBSERVATIONS = HERE / "observations"


class ParserError(ValueError):
    """The EPA snapshot cannot be mapped exactly to the selected lens."""


def canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:64] or "epa-safer-choice"


def product_code(row: dict) -> str:
    base = row.get("product_url") or f"{row.get('company_name', '')}-{row.get('product_name', '')}"
    digest = hashlib.sha1(base.encode("utf-8")).hexdigest()[:8]
    return f"{slug(row.get('product_name') or row.get('company_name') or 'product')}-{digest}"


def row_id(row: dict, index: int) -> str:
    identity = f"{index}:{canonical(row)}"
    return "epa-" + hashlib.sha256(identity.encode("utf-8")).hexdigest()[:16]


def distinct(rows: list[dict], field: str) -> list[object]:
    values = {row.get(field) for row in rows if row.get(field) not in (None, "")}
    return sorted(values, key=lambda value: str(value))


def one_value(rows: list[dict], field: str, target: str) -> object:
    values = distinct(rows, field)
    if len(values) != 1:
        raise ParserError(f"{target}: expected one {field}, found {values}")
    return values[0]


def inventory_receipt(cid: str) -> dict:
    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    receipt = next((row for row in inventory.get("decisions", []) if row.get("cid") == cid), None)
    if not receipt:
        raise ParserError(f"unknown built decision {cid}")
    return receipt


def build(snapshot_path: Path, cid: str, reviewed_by: str, reviewed_on: str) -> tuple[dict, dict]:
    snapshot_path = snapshot_path.resolve()
    manifest = verify_snapshot(snapshot_path)
    if manifest["registerId"] != "epa-safer-choice":
        raise ParserError("snapshot is not from epa-safer-choice")
    payload_path = snapshot_path.parent / manifest["response"]["payload"]
    rows = json.loads(payload_path.read_text(encoding="utf-8-sig"))
    if not isinstance(rows, list):
        raise ParserError("EPA payload must be a JSON array")
    lens = json.loads((LENSES / f"{cid}.json").read_text(encoding="utf-8"))
    receipt = inventory_receipt(cid)
    dataset = json.loads((ROOT / receipt["dataset"]).read_text(encoding="utf-8"))
    hashes = {
        row["code"]: hashlib.sha256(canonical({"code": row["code"], "name": row["name"]}).encode("utf-8")).hexdigest()
        for row in dataset[receipt["entityField"]]
    }
    eligible_rows = [
        row for row in rows
        if str(row.get("category", "")).strip() == "Consumer Product"
        and str(row.get("sector", "")).strip() == "Dish Soaps"
    ]
    by_code: dict[str, list[tuple[int, dict]]] = {}
    for index, row in enumerate(rows):
        if row in eligible_rows:
            by_code.setdefault(product_code(row), []).append((index, row))
    lens_products = lens.get("products", [])
    lens_codes = {row["code"] for row in lens_products}
    if set(by_code) != lens_codes:
        raise ParserError(f"EPA/lens product set drift missing={sorted(lens_codes - set(by_code))} extra={sorted(set(by_code) - lens_codes)}")

    mappings = []
    observations = []
    targets = []
    for product in sorted(lens_products, key=lambda row: row["code"]):
        code = product["code"]
        grouped = by_code[code]
        records = [row for _, row in grouped]
        product_url = str(one_value(records, "product_url", code))
        product_name = str(one_value(records, "product_name", code))
        company_name = str(one_value(records, "company_name", code))
        program = str(one_value(records, "program", code))
        sector = str(one_value(records, "sector", code))
        good_values = distinct(records, "company_in_good_standing")
        if len(good_values) > 1:
            raise ParserError(f"{code}: conflicting company_in_good_standing values {good_values}")
        target = f"{cid}/{code}"
        targets.append(target)
        mappings.append({
            "cid": cid,
            "entityCode": code,
            "entityName": product["name"],
            "entityIdentitySha256": hashes[code],
            "status": "matched",
            "legalName": company_name,
            "aliases": sorted({product["name"], product_name}),
            "jurisdiction": "US",
            "registerIdentifier": {"scheme": "epa-product-url", "value": product_url, "url": product_url},
            "matchEvidence": {
                "source": product_url,
                "note": "The catalogue code is derived from this EPA product URL, and the current register row carries the same product and company names.",
                "accessed": reviewed_on,
            },
            "review": {"by": reviewed_by, "on": reviewed_on},
        })
        trace = [{"id": row_id(row, index), "pointer": f"/{index}"} for index, row in grouped]
        record_ids = [row["id"] for row in trace]
        claims = [
            {"label": "Product", "value": product_name, "recordIds": record_ids},
            {"label": "Company", "value": company_name, "recordIds": record_ids},
            {"label": "Program", "value": program, "recordIds": record_ids},
            {"label": "Sector", "value": sector, "recordIds": record_ids},
        ]
        if good_values:
            claims.append({"label": "Company annual review current", "value": bool(good_values[0]), "recordIds": record_ids})
        if any(row.get("fragrance_free") is True for row in records):
            claims.append({"label": "Fragrance-free criteria", "value": True, "recordIds": record_ids})
        identifiers = sorted({str(value) for field in ("upcs", "gtins", "mpns") for value in distinct(records, field)})
        if identifiers:
            claims.append({"label": "Published product identifier count", "value": len(identifiers), "recordIds": record_ids})
        observations.append({
            "registerIdentifier": {"scheme": "epa-product-url", "value": product_url},
            "outcome": "records-found",
            "searchTerms": sorted({product_name, company_name, product_url}),
            "records": trace,
            "claims": claims,
        })

    mapping = {
        "format": "open-values-register-entity-map",
        "version": "1.0.0",
        "registerId": "epa-safer-choice",
        "updated": reviewed_on,
        "note": "Exact-key migration of the EPA-generated dish-soap lens. Every mapping is pinned to the official product URL from which the catalogue code was derived; no fuzzy name match is used.",
        "mappings": mappings,
    }
    observation_bundle = {
        "format": "open-values-register-observations",
        "version": "1.0.0",
        "registerId": "epa-safer-choice",
        "snapshot": {
            "manifest": snapshot_path.relative_to(ROOT).as_posix(),
            "snapshotId": manifest["snapshotId"],
            "payloadSha256": manifest["response"]["sha256"],
        },
        "parser": manifest["parser"],
        "targets": targets,
        "observations": sorted(observations, key=lambda row: (row["registerIdentifier"]["scheme"], row["registerIdentifier"]["value"])),
    }
    return mapping, observation_bundle


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--cid", default="dish-soap")
    parser.add_argument("--reviewed-by", required=True)
    parser.add_argument("--reviewed-on", required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    mapping, observations = build(args.snapshot, args.cid, args.reviewed_by, args.reviewed_on)
    mapping_path = MAPPINGS / "epa-safer-choice.json"
    observations_path = OBSERVATIONS / f"epa-safer-choice-{observations['snapshot']['snapshotId']}.observations.json"
    outputs = [(mapping_path, mapping), (observations_path, observations)]
    for path, value in outputs:
        rendered = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        if args.check:
            if not path.is_file() or path.read_text(encoding="utf-8") != rendered:
                raise SystemExit(f"EPA Safer Choice output stale: {path.relative_to(ROOT).as_posix()}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            write_text(path, rendered)
    print(f"EPA Safer Choice {'current' if args.check else 'parsed'}: {len(mapping['mappings'])} exact mappings and {len(observations['observations'])} observations")


if __name__ == "__main__":
    main()
