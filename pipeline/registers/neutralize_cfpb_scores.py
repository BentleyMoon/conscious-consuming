#!/usr/bin/env python3
"""Keep raw CFPB complaint volume as evidence, never as an exposure-free score."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent))
from review import validate_review  # noqa: E402
from tracked_io import write_text  # noqa: E402

LENSES = ROOT / "content" / "lenses"
REVIEWS = ROOT / "content" / "register-reviews"


class NeutralizationError(ValueError):
    """Approved CFPB evidence cannot be made denominator-safe."""


def approved_targets() -> dict[str, set[str]]:
    targets: dict[str, set[str]] = {}
    for review_path in sorted(REVIEWS.glob("cfpb-complaints-*.json")):
        review = validate_review(ROOT, review_path)
        if review["status"] != "approved":
            continue
        evidence = json.loads((ROOT / review["evidence"]).read_text(encoding="utf-8"))
        for entry in evidence.get("entries", []):
            targets.setdefault(entry["cid"], set()).add(entry["entityCode"])
    if not targets:
        raise NeutralizationError("no approved CFPB evidence targets found")
    return targets


def update_lens(cid: str, codes: set[str]) -> tuple[Path, dict, int]:
    path = LENSES / f"{cid}.json"
    lens = json.loads(path.read_text(encoding="utf-8"))
    products = {row["code"]: row for row in lens.get("products", [])}
    missing = sorted(codes - set(products))
    if missing:
        raise NeutralizationError(f"{cid}: approved CFPB targets missing from lens: {missing}")
    changed = 0
    for code in sorted(codes):
        product = products[code]
        if "complaints" not in product.get("scores", {}):
            raise NeutralizationError(f"{cid}/{code}: complaints criterion is missing")
        if product["scores"]["complaints"] is not None:
            product["scores"]["complaints"] = None
            changed += 1
    return path, lens, changed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    total = 0
    for cid, codes in sorted(approved_targets().items()):
        path, lens, changed = update_lens(cid, codes)
        total += len(codes)
        if args.check:
            if changed:
                raise SystemExit(f"{cid}: {changed} raw CFPB complaint scores are still non-null")
        else:
            # Match the canonical lens serialization used by promote_evidence.py so
            # promotion drift checks remain byte-for-byte, not merely semantic.
            write_text(path, json.dumps(lens, ensure_ascii=False, indent=1) + "\n")
    print(f"CFPB complaint score policy current: {total} evidence cells are unscored without exposure denominators")


if __name__ == "__main__":
    main()
