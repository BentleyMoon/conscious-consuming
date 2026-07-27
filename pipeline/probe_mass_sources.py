#!/usr/bin/env python3
"""Probe open data sources before adding bulk categories.

This is read-only. It fetches small samples from candidate public datasets and
reports how many rows survive the existing scoring filters. Use it before adding
new generated categories so bulk work starts from evidence, not vibes.

Usage:
  python pipeline/probe_mass_sources.py
  python pipeline/probe_mass_sources.py --pages 5 --page-size 100
"""

import argparse
import csv
import io
import json
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter

import scoring
import scoring_beauty

UA = {"User-Agent": "ConsciousConsuming/0.1 mass-data-probe"}

OFF_BASE = "https://world.openfoodfacts.org/api/v2/search"
OBF_BASE = "https://world.openbeautyfacts.org/api/v2/search"
OPF_BASE = "https://world.openpetfoodfacts.org/api/v2/search"
EPA_SAFER_CHOICE_CSV = (
    "https://data.epa.gov/dmapservice/"
    "saferchoice.t_safer_choice_and_design_for_the_environment/1%3A2000/csv"
)

FOOD_FIELDS = (
    "code,product_name,brands,nutriscore_grade,nova_group,ecoscore_grade,"
    "environmental_score_grade,labels_tags,ingredients_text,allergens_tags,"
    "traces_tags,nutriments"
)
BEAUTY_FIELDS = "code,product_name,brands,labels_tags,ingredients_text,ingredients_analysis_tags"

FOOD_CANDIDATES = {
    "ready-meals": ["prepared-meals", "ready-meals", "meals"],
    "meat-poultry": ["meats", "poultries", "chicken-meat"],
    "fish-seafood": ["fishes", "seafood", "fish-and-seafood"],
    "flour-baking": ["flours", "baking-mixes", "cake-mixes"],
    "spices-seasoning": ["spices", "seasonings", "herbs-and-spices"],
    "bottled-water": ["waters", "mineral-waters", "bottled-waters"],
    "beer": ["beers"],
    "wine": ["wines"],
    "baby-food": ["baby-foods", "infant-formulas"],
}

BEAUTY_CANDIDATES = {
    "makeup": ["make-up", "cosmetics", "mascaras"],
    "fragrance": ["perfumes", "fragrances"],
    "nail-care": ["nail-polishes", "nail-care"],
    "hair-styling": ["hair-styling-products", "hair-gels"],
    "body-lotion": ["body-lotions", "body-milks"],
}

PET_CANDIDATES = {
    "dog-food": ["dog-food", "dry-dog-food", "wet-dog-food"],
    "cat-food": ["cat-food", "dry-cat-food", "wet-cat-food"],
}


def fetch_json(base, tag, fields, pages, page_size):
    by_code = {}
    status = "ok"
    for page in range(1, pages + 1):
        qs = urllib.parse.urlencode(
            {
                "categories_tags_en": tag,
                "fields": fields,
                "page_size": page_size,
                "page": page,
            }
        )
        try:
            req = urllib.request.Request(base + "?" + qs, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.load(resp)
        except Exception as exc:
            status = f"error:{exc!r}"
            break
        chunk = data.get("products", [])
        for product in chunk:
            if product.get("code"):
                by_code[product["code"]] = product
        if len(chunk) < page_size:
            break
        time.sleep(0.2)
    return list(by_code.values()), status


def best_candidate(label, base, fields, tags, scorer, pages, page_size):
    best = None
    for tag in tags:
        raw, status = fetch_json(base, tag, fields, pages, page_size)
        scored = scorer(raw)
        row = (tag, len(raw), len(scored), status)
        if best is None or row[2] > best[2]:
            best = row
        if len(scored) >= 50:
            break
    tag, raw_count, scored_count, status = best
    print(f"{label:18} tag={tag:24} raw={raw_count:4} scored={scored_count:4} {status}")


def probe_product_sources(args):
    print(f"FOOD / Open Food Facts probes (max {args.pages * args.page_size} raw per tag)")
    for label, tags in FOOD_CANDIDATES.items():
        best_candidate(label, OFF_BASE, FOOD_FIELDS, tags, scoring.score_category, args.pages, args.page_size)

    print(f"\nBEAUTY / Open Beauty Facts probes (max {args.pages * args.page_size} raw per tag)")
    for label, tags in BEAUTY_CANDIDATES.items():
        best_candidate(label, OBF_BASE, BEAUTY_FIELDS, tags, scoring_beauty.score_beauty, args.pages, args.page_size)

    print("\nPET / Open Pet Food Facts probes (existing food scorer is only a rough filter)")
    for label, tags in PET_CANDIDATES.items():
        best_candidate(label, OPF_BASE, FOOD_FIELDS, tags, scoring.score_category, args.pages, args.page_size)


def probe_epa_safer_choice():
    print("\nEPA Safer Choice / Envirofacts probe (first 2,000 rows)")
    req = urllib.request.Request(EPA_SAFER_CHOICE_CSV, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as resp:
        text = resp.read().decode("utf-8-sig", errors="replace")
    rows = list(csv.DictReader(io.StringIO(text)))
    print(f"rows={len(rows)} columns={', '.join(rows[0].keys()) if rows else '(none)'}")
    for sector, count in Counter((row.get("sector") or "").strip() for row in rows).most_common(15):
        print(f"{count:4} {sector}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pages", type=int, default=3, help="pages per source tag")
    parser.add_argument("--page-size", type=int, default=100, help="rows per source page")
    args = parser.parse_args()

    probe_product_sources(args)
    probe_epa_safer_choice()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
