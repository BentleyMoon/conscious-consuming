#!/usr/bin/env python3
"""Parse bounded CFPB product snapshots into reviewed exact-key evidence inputs."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import urllib.parse
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

WINDOW_START = "2024-01-01"
WINDOW_END = "2025-12-31"

# The brand-to-company crosswalk is the reviewed part of this pass. Company keys
# must match an official CFPB aggregate bucket byte-for-byte; fuzzy matching is
# deliberately absent.
TARGETS = {
    "banking": {
        "product": "Checking or savings account",
        "companies": {
            "chime": "Chime Financial Inc",
            "us-bank": "U.S. BANCORP",
            "capital-one": "CAPITAL ONE FINANCIAL CORPORATION",
            "ally": "ALLY FINANCIAL INC.",
            "wells-fargo": "WELLS FARGO & COMPANY",
            "citi": "CITIBANK, N.A.",
            "bofa": "BANK OF AMERICA, NATIONAL ASSOCIATION",
            "chase": "JPMORGAN CHASE & CO.",
        },
    },
    "credit-cards": {
        "product": "Credit card",
        "companies": {
            "chase-freedom-unlimited": "JPMORGAN CHASE & CO.",
            "citi-double-cash": "CITIBANK, N.A.",
            "capital-one-quicksilver": "CAPITAL ONE FINANCIAL CORPORATION",
            "capital-one-venture": "CAPITAL ONE FINANCIAL CORPORATION",
            "discover-it-cash-back": "DISCOVER BANK",
            "american-express-gold": "AMERICAN EXPRESS COMPANY",
            "wells-fargo-active-cash": "WELLS FARGO & COMPANY",
            "discover-it-secured": "DISCOVER BANK",
            "bank-of-america-cash-rewards-secured": "BANK OF AMERICA, NATIONAL ASSOCIATION",
            "navy-federal-cashrewards": "NAVY FEDERAL CREDIT UNION",
            "navy-federal-cashrewards-secured": "NAVY FEDERAL CREDIT UNION",
            "retail-store-card": "SYNCHRONY FINANCIAL",
        },
    },
    "mortgages": {
        "product": "Mortgage",
        "companies": {
            "rocket-mortgage": "Rocket Mortgage, LLC",
            "united-wholesale-mortgage": "United Shore Financial Services, LLC",
            "chase-home-lending": "JPMORGAN CHASE & CO.",
            "wells-fargo-home-mortgage": "WELLS FARGO & COMPANY",
            "bank-of-america": "BANK OF AMERICA, NATIONAL ASSOCIATION",
            "pennymac": "PENNYMAC LOAN SERVICES, LLC.",
            "loandepot": "LD Holdings Group, LLC",
            "freedom-mortgage": "Freedom Mortgage Company",
            "crosscountry-mortgage": "CrossCountry Mortgage LLC",
            "navy-federal-credit-union": "NAVY FEDERAL CREDIT UNION",
        },
    },
}


class ParserError(ValueError):
    """A CFPB snapshot or exact company mapping is inconsistent."""


def canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def identity_hash(code: str, name: str) -> str:
    return hashlib.sha256(canonical({"code": code, "name": name}).encode("utf-8")).hexdigest()


def inventory_receipt(cid: str) -> dict:
    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    receipt = next((row for row in inventory.get("decisions", []) if row.get("cid") == cid), None)
    if not receipt:
        raise ParserError(f"unknown built decision {cid}")
    return receipt


def query_url(company: str, product: str) -> str:
    query = urllib.parse.urlencode({
        "company": company,
        "date_received_max": WINDOW_END,
        "date_received_min": WINDOW_START,
        "product": product,
        "size": 0,
    })
    return f"https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/?{query}"


def read_snapshot(path: Path, expected_product: str) -> tuple[dict, dict]:
    manifest = verify_snapshot(path.resolve())
    if manifest["registerId"] != "cfpb-complaints":
        raise ParserError(f"{path}: snapshot is not from cfpb-complaints")
    query = manifest["request"]["query"]
    expected = {
        "date_received_max": [WINDOW_END],
        "date_received_min": [WINDOW_START],
        "product": [expected_product],
        "size": ["0"],
    }
    if query != expected:
        raise ParserError(f"{path}: expected bounded query {expected}, found {query}")
    payload_path = path.resolve().parent / manifest["response"]["payload"]
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    if payload.get("timed_out") is not False:
        raise ParserError(f"{path}: CFPB response timed out")
    return manifest, payload


def build(
    snapshots: dict[str, Path], reviewed_by: str, reviewed_on: str
) -> tuple[dict, list[tuple[Path, dict]]]:
    mappings = []
    observation_outputs = []
    for cid, config in TARGETS.items():
        manifest, payload = read_snapshot(snapshots[cid], config["product"])
        receipt = inventory_receipt(cid)
        dataset = json.loads((ROOT / receipt["dataset"]).read_text(encoding="utf-8"))
        entities = {row["code"]: row for row in dataset[receipt["entityField"]]}
        aggregation = payload.get("aggregations", {}).get("company", {})
        total = aggregation.get("doc_count")
        buckets = aggregation.get("company", {}).get("buckets", [])
        if not isinstance(total, int) or total <= 0 or not isinstance(buckets, list):
            raise ParserError(f"{cid}: missing CFPB company aggregation")
        by_company = {row.get("key"): (index, row) for index, row in enumerate(buckets)}
        if len(by_company) != len(buckets):
            raise ParserError(f"{cid}: duplicate CFPB company bucket")
        observations_by_identifier = {}
        target_ids = []
        for code, company in config["companies"].items():
            entity = entities.get(code)
            if not entity:
                raise ParserError(f"{cid}/{code}: option is not in the current dataset")
            if company not in by_company:
                raise ParserError(f"{cid}/{code}: exact CFPB company bucket not found: {company}")
            bucket_index, bucket = by_company[company]
            compound_key = f"{config['product']}|{company}"
            source = query_url(company, config["product"])
            target = f"{cid}/{code}"
            target_ids.append(target)
            mappings.append({
                "cid": cid,
                "entityCode": code,
                "entityName": entity["name"],
                "entityIdentitySha256": identity_hash(code, entity["name"]),
                "status": "matched",
                "legalName": company,
                "aliases": sorted({entity["name"], company}),
                "jurisdiction": "US",
                "registerIdentifier": {
                    "scheme": "cfpb-company-product",
                    "value": compound_key,
                    "url": source,
                },
                "matchEvidence": {
                    "source": source,
                    "note": "Reviewed brand-to-company crosswalk. The selected company key appears exactly in the bounded CFPB product aggregation; no fuzzy name matching is used.",
                    "accessed": reviewed_on,
                },
                "review": {"by": reviewed_by, "on": reviewed_on},
            })
            if compound_key not in observations_by_identifier:
                record_id = "cfpb-" + hashlib.sha256(
                    f"{manifest['snapshotId']}:{compound_key}".encode("utf-8")
                ).hexdigest()[:16]
                observations_by_identifier[compound_key] = {
                    "registerIdentifier": {
                        "scheme": "cfpb-company-product",
                        "value": compound_key,
                    },
                    "outcome": "records-found",
                    "searchTerms": [company, config["product"]],
                    "records": [{
                        "id": record_id,
                        "pointer": "/aggregations/company",
                    }],
                    "claims": [
                        {"label": "Category complaint total", "value": total, "recordIds": [record_id]},
                        {"label": "Company complaint total", "value": bucket["doc_count"], "recordIds": [record_id]},
                        {"label": "Date received from", "value": WINDOW_START, "recordIds": [record_id]},
                        {"label": "Date received through", "value": WINDOW_END, "recordIds": [record_id]},
                        {"label": "Product category", "value": config["product"], "recordIds": [record_id]},
                    ],
                }
        bundle = {
            "format": "open-values-register-observations",
            "version": "1.0.0",
            "registerId": "cfpb-complaints",
            "snapshot": {
                "manifest": snapshots[cid].resolve().relative_to(ROOT).as_posix(),
                "snapshotId": manifest["snapshotId"],
                "payloadSha256": manifest["response"]["sha256"],
            },
            "parser": manifest["parser"],
            "targets": sorted(target_ids),
            "observations": sorted(
                observations_by_identifier.values(),
                key=lambda row: row["registerIdentifier"]["value"],
            ),
        }
        output = OBSERVATIONS / f"cfpb-complaints-{manifest['snapshotId']}.observations.json"
        observation_outputs.append((output, bundle))
    mapping = {
        "format": "open-values-register-entity-map",
        "version": "1.0.0",
        "registerId": "cfpb-complaints",
        "updated": reviewed_on,
        "note": "Reviewed exact company crosswalk for three bounded CFPB product aggregates. It stages raw counts as evidence only; it does not make complaint volume rate-comparable across differently sized firms.",
        "mappings": sorted(mappings, key=lambda row: (row["cid"], row["entityCode"])),
    }
    return mapping, observation_outputs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--banking", required=True, type=Path)
    parser.add_argument("--credit-cards", required=True, type=Path)
    parser.add_argument("--mortgages", required=True, type=Path)
    parser.add_argument("--reviewed-by", required=True)
    parser.add_argument("--reviewed-on", required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    mapping, observations = build(
        {
            "banking": args.banking,
            "credit-cards": args.credit_cards,
            "mortgages": args.mortgages,
        },
        args.reviewed_by,
        args.reviewed_on,
    )
    outputs = [(MAPPINGS / "cfpb-complaints.json", mapping), *observations]
    for path, value in outputs:
        rendered = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        if args.check:
            if not path.is_file() or path.read_text(encoding="utf-8") != rendered:
                raise SystemExit(f"CFPB output stale: {path.relative_to(ROOT).as_posix()}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            write_text(path, rendered)
    print(
        f"CFPB {'current' if args.check else 'parsed'}: "
        f"{len(mapping['mappings'])} exact target mappings across {len(observations)} product snapshots"
    )


if __name__ == "__main__":
    main()
