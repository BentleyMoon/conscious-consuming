#!/usr/bin/env python3
"""Print the canonical Conscious Consuming numbers, derived from the live data.

Exists because CANONICAL_NUMBERS.md, a file whose stated job is to stop numbers
drifting, itself drifted four weeks (80/19,218/16,560 on 2026-06-29 against
88/23,689/19,752 on 2026-07-25). A hand-maintained source of truth is still
hand-maintained. This makes it derivable instead.

Usage:  python scripts/canonical_numbers.py [--markdown]
"""
from __future__ import annotations

import argparse
import collections
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
INDEX = ROOT / "app" / "data" / "index.json"
BARCODES = ROOT / "app" / "data" / "barcodes.json"
GUIDES = ROOT / "app" / "guides.js"


def load_json(path: pathlib.Path):
    if not path.exists():
        return None
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def count_guides(path: pathlib.Path) -> int | None:
    """guides.js is a JS module, not JSON. Count top-level guide slugs."""
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8", errors="replace")
    for pattern in (r'^\s*\{\s*"?slug"?\s*:', r'"?slug"?\s*:\s*["\']'):
        hits = len(re.findall(pattern, text, re.MULTILINE))
        if hits:
            return hits
    return None


def derive() -> dict:
    index = load_json(INDEX)
    if index is None:
        sys.exit(f"missing {INDEX}")
    cats = index.get("categories", [])
    barcodes = load_json(BARCODES)
    verdicts = sum(c.get("n", 0) for c in cats)
    n_barcodes = len(barcodes) if barcodes is not None else None
    mix = collections.Counter(c.get("type", "Unknown") for c in cats)
    return {
        "categories": len(cats),
        "verdicts": verdicts,
        "guides": count_guides(GUIDES),
        "barcodes": n_barcodes,
        "total_scored": verdicts + n_barcodes if n_barcodes is not None else None,
        "mix": dict(mix.most_common()),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--markdown", action="store_true", help="emit a CANONICAL_NUMBERS table row block")
    args = ap.parse_args()
    d = derive()

    def fmt(v):
        return "unresolved" if v is None else f"{v:,}" if isinstance(v, int) else str(v)

    if args.markdown:
        print("| Metric | Value | How to re-derive |")
        print("|---|---|---|")
        print(f"| Categories | **{fmt(d['categories'])}** | `python scripts/canonical_numbers.py` |")
        print(f"| Curated verdicts | **{fmt(d['verdicts'])}** | same |")
        print(f"| Guides | **{fmt(d['guides'])}** | same |")
        print(f"| Barcode index | **{fmt(d['barcodes'])}** products | same |")
        print(f"| Total scored items | **{fmt(d['total_scored'])}** | verdicts + barcode index |")
        mix = " · ".join(f"{v} {k}" for k, v in d["mix"].items())
        print(f"| Category mix | {mix} | same |")
    else:
        for key in ("categories", "verdicts", "guides", "barcodes", "total_scored"):
            print(f"{key:>14}: {fmt(d[key])}")
        print(f"{'mix':>14}: " + ", ".join(f"{v} {k}" for k, v in d["mix"].items()))


if __name__ == "__main__":
    main()
