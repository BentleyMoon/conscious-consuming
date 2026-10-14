#!/usr/bin/env python3
"""Fetch EPA Safer Choice products and generate certified product lenses.

Build-time only. Caches Envirofacts rows in pipeline/raw_safer_choice and writes
content/lenses/<id>.json so build_datasets.py can include the lens normally.

Usage:
  python pipeline/fetch_safer_choice.py --only floor-cleaners,carpet-cleaners
  python pipeline/fetch_safer_choice.py --refresh --limit 10000

Run with --only for new categories. dish-soap's lens has since been enriched by the register
promotion step (pipeline/registers/promote_evidence.py), so regenerating it from this script
would overwrite promoted provenance with the plainer notes below.

Sectors probed 2026-10-14 (consumer products after merging one row per UPC into one product)
and held below the 50-entry floor: Odor Removers 42, Automatic Dishwasher Products 17.
All-Purpose Cleaners (121) is held as a duplicate of the hand-checked cleaning-products decision.
"""

import argparse
import csv
import hashlib
import io
import json
import os
import re
import sys
import time
import urllib.request
from tracked_io import open_text, write_json

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw_safer_choice")
LENSES = os.path.normpath(os.path.join(HERE, "..", "content", "lenses"))
os.makedirs(RAW, exist_ok=True)
os.makedirs(LENSES, exist_ok=True)

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

UA = "ConsciousConsuming/0.1 (build-time EPA Safer Choice cache)"
ASOF = "2026"
EPA_DATA = (
    "https://data.epa.gov/dmapservice/"
    "saferchoice.t_safer_choice_and_design_for_the_environment/1%3A{limit}/csv"
)
EPA_PRODUCTS = "https://www.epa.gov/saferchoice/products"
EPA_LABEL = "https://www.epa.gov/saferchoice/learn-about-safer-choice-label"
EPA_STANDARD = "https://www.epa.gov/saferchoice/standard"
EPA_DATA_DOC = "https://www.epa.gov/enviro/download-additional-envirofacts-datasets"

CATEGORIES = [
    {
        "id": "dish-soap",
        "label": "Dish soap",
        "sectors": ["Dish Soaps"],
        "focus": "Dish soap",
        "attribution": "Data from EPA Safer Choice / Envirofacts. Certification status and product metadata are public EPA data.",
    },
    {
        "id": "floor-cleaners",
        "label": "Floor cleaners",
        "sectors": ["Floor Care Products : Floor Cleaners"],
        "focus": "Floor cleaner",
        "asof": "2026-10",
        "attribution": "Data from EPA Safer Choice / Envirofacts. Certification status and product metadata are public EPA data.",
    },
    {
        "id": "carpet-cleaners",
        "label": "Carpet cleaners",
        "sectors": ["Carpet Care Products : Carpet Cleaners"],
        "focus": "Carpet cleaner",
        "asof": "2026-10",
        "attribution": "Data from EPA Safer Choice / Envirofacts. Certification status and product metadata are public EPA data.",
    },
]
# Every listing here is certified, so the decision is between certified products, not between
# certified and uncertified ones. The tradeoff names the two signals that actually vary.
PRIMARY_AXIS = "health"
TRADEOFF = ["accessibility", "health"]
TRADEOFF_LABELS = ["easiest to identify", "strongest safer-chemistry signal"]

CRITERIA = [
    {"key": "certification", "label": "Safer Choice certification", "source": "EPA Safer Choice", "tier": "certified"},
    {"key": "health", "label": "Safer chemistry", "source": "EPA Safer Choice", "tier": "certified"},
    {"key": "environment", "label": "Environmental criteria", "source": "EPA Safer Choice", "tier": "certified"},
    {"key": "transparency", "label": "Public listing", "source": "EPA Envirofacts", "tier": "measured"},
    {"key": "accessibility", "label": "Identifiable product", "source": "EPA Envirofacts", "tier": "measured"},
]

PRESETS = {
    "Balanced": {"w": {"certification": 3, "health": 3, "environment": 3, "transparency": 2, "accessibility": 2}, "x": []},
    "Safer chemistry": {"w": {"health": 5, "certification": 4, "environment": 3, "transparency": 2, "accessibility": 1}, "x": []},
    "Fragrance-sensitive": {"w": {"health": 5, "transparency": 3, "certification": 3, "environment": 2, "accessibility": 1}, "x": []},
    "Most identifiable": {"w": {"accessibility": 5, "transparency": 4, "certification": 2, "health": 1, "environment": 1}, "x": []},
}


_CSV = {}


def fetch_csv(limit, retries=4):
    """One download per run, however many categories read it."""
    if limit not in _CSV:
        _CSV[limit] = _fetch_csv(limit, retries)
    return _CSV[limit]


def _fetch_csv(limit, retries):
    url = EPA_DATA.format(limit=limit)
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return list(csv.DictReader(io.StringIO(resp.read().decode("utf-8-sig", errors="replace"))))
        except Exception as exc:
            last = exc
            time.sleep(2 * (attempt + 1))
    raise last


def truthy(value):
    return str(value).strip().lower() in {"true", "t", "1", "yes", "y"}


def text(value):
    return str(value or "").strip()


def slug(value):
    s = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return s[:64] or "epa-safer-choice"


def product_code(row):
    base = row.get("product_url") or (row.get("company_name", "") + "-" + row.get("product_name", ""))
    digest = hashlib.sha1(base.encode("utf-8")).hexdigest()[:8]
    return f"{slug(row.get('product_name') or row.get('company_name') or 'product')}-{digest}"


def product_link(row):
    return row.get("product_url") or EPA_PRODUCTS


def normalize_row(row):
    return {str(k).strip().lower(): text(v) for k, v in row.items()}


def merge_rows(rows):
    by_key = {}
    for raw in rows:
        row = normalize_row(raw)
        key = row.get("product_url") or (row.get("company_name"), row.get("product_name"), row.get("sector"))
        if key not in by_key:
            by_key[key] = row
            continue
        current = by_key[key]
        for field in ("upcs", "gtins", "mpns"):
            vals = {v for v in (current.get(field, ""), row.get(field, "")) if v}
            current[field] = ", ".join(sorted(vals))
        for field, value in row.items():
            if value and not current.get(field):
                current[field] = value
    return list(by_key.values())


def load_or_fetch(cat, args):
    raw_path = os.path.join(RAW, cat["id"] + ".jsonl")
    if os.path.isfile(raw_path) and not args.refresh:
        return [json.loads(line) for line in open(raw_path, encoding="utf-8") if line.strip()], "cache"

    rows = fetch_csv(args.limit)
    sectors = set(cat["sectors"])
    picked = [r for r in rows if text(r.get("sector")) in sectors and text(r.get("category")) == "Consumer Product"]
    merged = merge_rows(picked)

    existing = []
    if os.path.isfile(raw_path):
        existing = [json.loads(line) for line in open(raw_path, encoding="utf-8") if line.strip()]
    if existing and len(merged) < len(existing):
        print(f"   kept existing {len(existing)} rows (new fetch only {len(merged)}) - not shrinking")
        return existing, "cache-no-shrink"

    with open_text(raw_path) as fh:
        for row in merged:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    return merged, "fetch"


def prov(note, source, asof=ASOF):
    return {"note": note, "source": source, "asof": asof}


def score_row(row, cat):
    good = truthy(row.get("company_in_good_standing"))
    has_identifier = bool(row.get("upcs") or row.get("gtins") or row.get("mpns"))
    has_url = bool(row.get("product_url"))
    fragrance_free = truthy(row.get("fragrance_free"))
    outdoor_use = truthy(row.get("outdoor_use"))

    certification = 100 if good else 72
    health = 96 if fragrance_free else 88
    environment = 96 if outdoor_use else 88
    if not good:
        health -= 8
        environment -= 8
    transparency = min(95, 70 + (10 if has_url else 0) + (10 if has_identifier else 0) + (5 if row.get("partner_since") else 0))
    accessibility = 92 if has_identifier else 76

    source = product_link(row)
    program = row.get("program") or "Safer Choice"
    product = row.get("product_name") or "EPA-listed product"
    company = row.get("company_name") or "listed company"
    sector = row.get("sector") or cat["sectors"][0]
    asof = cat.get("asof", ASOF)

    scores = {
        "certification": certification,
        "health": max(0, min(100, health)),
        "environment": max(0, min(100, environment)),
        "transparency": transparency,
        "accessibility": accessibility,
    }
    provenance = {
        "certification": prov(
            f"EPA Envirofacts lists {product} by {company} in the {program} program; company good-standing status is {str(good).lower()}.",
            source, asof,
        ),
        "health": prov(
            "EPA says Safer Choice-labeled products must meet safer-chemical criteria for human health; fragrance-free status is listed separately when available.",
            EPA_LABEL, asof,
        ),
        "environment": prov(
            "EPA says Safer Choice reviews environmental criteria such as aquatic toxicity, persistence and related safer-ingredient requirements.",
            EPA_STANDARD, asof,
        ),
        "transparency": prov(
            f"EPA Envirofacts publishes product, company, sector and identifier fields for this {sector} listing.",
            source, asof,
        ),
        "accessibility": prov(
            "EPA lists this as a consumer product" + (" with UPC/GTIN/MPN identifiers." if has_identifier else ", but without a UPC/GTIN/MPN identifier in this row."),
            source, asof,
        ),
    }

    focuses = ["EPA Safer Choice", "Certified", cat.get("focus", cat["label"])]
    if fragrance_free:
        focuses.append("Fragrance-free")
    if outdoor_use:
        focuses.append("Outdoor use")
    if good:
        focuses.append("Good standing")

    links = [
        {"label": "EPA product listing", "url": source},
        {"label": "Safer Choice label", "url": EPA_LABEL},
    ]

    return {
        "code": product_code(row),
        "name": product[:60],
        "brand": company[:40],
        "allergens": [],
        "allergensDeclared": True,
        "description": f"{product[:80]} from {company[:50]}, listed by EPA Safer Choice in {sector}.",
        "scores": scores,
        "provenance": provenance,
        "links": links,
        "region": ["US"],
        "focuses": focuses,
    }


def build_lens(cat, rows):
    products = [score_row(row, cat) for row in rows if row.get("product_name")]
    products.sort(key=lambda p: (-sum(p["scores"].values()), p["brand"], p["name"]))
    return {
        "meta": {
            "id": cat["id"],
            "label": cat["label"],
            "type": "Products",
            "primaryAxis": PRIMARY_AXIS,
            "tradeoff": list(TRADEOFF),
            "tradeoffLabels": list(TRADEOFF_LABELS),
            "source": "EPA Safer Choice / Envirofacts",
            "attribution": cat["attribution"],
            "allergens": False,
            "presets": PRESETS,
            "license": "US public data",
            "productBase": EPA_PRODUCTS,
            "n": len(products),
        },
        "criteria": CRITERIA,
        "products": products,
        "links": [
            {"label": "EPA Safer Choice products", "url": EPA_PRODUCTS},
            {"label": "EPA Envirofacts dataset", "url": EPA_DATA_DOC},
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10000,
                        help="Envirofacts row range to request (the register held 5,042 rows on 2026-10-14)")
    parser.add_argument("--refresh", action="store_true", help="refresh the local raw cache")
    parser.add_argument("--only", default="", help="comma-separated category ids")
    args = parser.parse_args()
    only = {x.strip() for x in args.only.split(",") if x.strip()}

    for cat in CATEGORIES:
        if only and cat["id"] not in only:
            continue
        print(f"== {cat['label']} ({cat['id']}) ==")
        rows, mode = load_or_fetch(cat, args)
        if len(rows) < 50:
            print(f"   only {len(rows)} rows after filtering - below generated-category floor")
            continue
        lens = build_lens(cat, rows)
        path = os.path.join(LENSES, cat["id"] + ".json")
        write_json(path, lens, ensure_ascii=False, indent=1)
        print(f"   {len(rows)} cached rows ({mode}) -> {len(lens['products'])} products -> content/lenses/{cat['id']}.json")


if __name__ == "__main__":
    main()
