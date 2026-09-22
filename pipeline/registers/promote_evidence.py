#!/usr/bin/env python3
"""Promote approved register provenance into source lenses without changing scores."""

from __future__ import annotations

import argparse
from copy import deepcopy
import json
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent))
from tracked_io import write_text  # noqa: E402
from review import ReviewError, validate_review  # noqa: E402

REVIEWS = ROOT / "content" / "register-reviews"
LENSES = ROOT / "content" / "lenses"


class PromotionError(ValueError):
    """Approved evidence cannot be safely applied to a current source lens."""


def approved_entries() -> dict[str, dict[str, dict[str, dict]]]:
    by_cid: dict[str, dict[str, dict[str, dict]]] = {}
    seen = set()
    for review_path in sorted(REVIEWS.glob("*.json")):
        review = validate_review(ROOT, review_path)
        if review["status"] != "approved":
            continue
        evidence = json.loads((ROOT / review["evidence"]).read_text(encoding="utf-8"))
        criterion = evidence["criterion"]
        for entry in evidence["entries"]:
            key = (entry["cid"], entry["entityCode"], criterion)
            if key in seen:
                raise PromotionError(f"duplicate approved evidence for {'/'.join(key)}")
            seen.add(key)
            by_cid.setdefault(entry["cid"], {}).setdefault(entry["entityCode"], {})[criterion] = entry["provenance"]
    return by_cid


def promote(check: bool) -> tuple[int, int]:
    changes = approved_entries()
    promoted = 0
    for cid, entries in sorted(changes.items()):
        path = LENSES / f"{cid}.json"
        if not path.is_file():
            raise PromotionError(f"approved evidence names missing source lens {cid}")
        source = json.loads(path.read_text(encoding="utf-8"))
        updated = deepcopy(source)
        criteria = {row["key"] for row in updated.get("criteria", [])}
        products = {row["code"]: row for row in updated.get("products", [])}
        for code, evidence_by_criterion in sorted(entries.items()):
            product = products.get(code)
            if not product:
                raise PromotionError(f"{cid}: approved evidence names missing option {code}")
            for criterion, provenance in sorted(evidence_by_criterion.items()):
                if criterion not in criteria:
                    raise PromotionError(f"{cid}: approved criterion {criterion} is not in the lens")
                if criterion not in product.get("scores", {}):
                    raise PromotionError(f"{cid}/{code}: approved criterion has no existing score")
                product.setdefault("provenance", {})[criterion] = provenance
                promoted += 1
        rendered = json.dumps(updated, ensure_ascii=False, indent=1) + "\n"
        if check:
            if path.read_text(encoding="utf-8") != rendered:
                raise PromotionError(f"{cid}: approved register evidence is not promoted")
        else:
            write_text(path, rendered)
    return len(changes), promoted


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        decisions, entries = promote(args.check)
    except (PromotionError, ReviewError, OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"register promotion error: {exc}") from exc
    print(f"register evidence {'current' if args.check else 'promoted'}: {entries} provenance cells across {decisions} decisions")


if __name__ == "__main__":
    main()
