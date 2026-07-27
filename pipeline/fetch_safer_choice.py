#!/usr/bin/env python3
"""Fetch EPA Safer Choice products and generate certified product lenses.

Build-time only. Caches Envirofacts rows in pipeline/raw_safer_choice and writes
content/lenses/<id>.json so build_datasets.py can include the lens normally.

Usage:
  python pipeline/fetch_safer_choice.py
  python pipeline/fetch_safer_choice.py --refresh --limit 5000
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
        "attribution": "Data from EPA Safer Choice / Envirofacts. Certification status and product metadata are public EPA data.",
    },
]

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


def fetch_csv(limit, retries=4):
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


def prov(note, source):
    return {"note": note, "source": source, "asof": ASOF}


def score_row(row):
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
    sector = row.get("sector") or "Dish Soaps"

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
            source,
        ),
        "health": prov(
            "EPA says Safer Choice-labeled products must meet safer-chemical criteria for human health; fragrance-free status is listed separately when available.",
            EPA_LABEL,
        ),
        "environment": prov(
            "EPA says Safer Choice reviews environmental criteria such as aquatic toxicity, persistence and related safer-ingredient requirements.",
            EPA_STANDARD,
        ),
        "transparency": prov(
            f"EPA Envirofacts publishes product, company, sector and identifier fields for this {sector} listing.",
            source,
        ),
        "accessibility": prov(
            "EPA lists this as a consumer product" + (" with UPC/GTIN/MPN identifiers." if has_identifier else ", but without a UPC/GTIN/MPN identifier in this row."),
            source,
        ),
    }

    focuses = ["EPA Safer Choice", "Certified", "Dish soap"]
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
    products = [score_row(row) for row in rows if row.get("product_name")]
    products.sort(key=lambda p: (-sum(p["scores"].values()), p["brand"], p["name"]))
    return {
        "meta": {
            "id": cat["id"],
            "label": cat["label"],
            "type": "Products",
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
    parser.add_argument("--limit", type=int, default=5000, help="Envirofacts row range to request")
    parser.add_argument("--refresh", action="store_true", help="refresh the local raw cache")
    args = parser.parse_args()

    for cat in CATEGORIES:
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
