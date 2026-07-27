#!/usr/bin/env python3
"""
Conscious Consuming — R&D-1.1: Open Food Facts data & coverage audit.

Asks: for our candidate categories, is OFF data dense/clean enough — and how
does coverage look for the US specifically — to power honest comparisons?

Pulls a sample per category from the OFF v2 API (stdlib only), measures
field-population for the fields Ring 0 depends on, total + US product counts,
and country distribution. Writes audit_summary.json + sample_products.csv.

Re-run any time: `python audit_off.py`. Polite UA + retry/backoff on 503.
"""
import urllib.request, json, time, csv, os, sys
from collections import Counter

OUT = os.path.dirname(os.path.abspath(__file__))
UA = 'ConsciousConsuming-research/0.1 (Ring-0 data audit spike)'
BASE = 'https://world.openfoodfacts.org/api/v2/search'
FIELDS = ('code,product_name,brands,nutriscore_grade,nova_group,ecoscore_grade,'
          'environmental_score_grade,labels_tags,allergens_tags,categories_tags,'
          'countries_tags,ingredients_text')

# Candidate seed categories (English category tags)
CATS = {
    'plant-based beverages': 'plant-based-beverages',
    'breakfast cereals': 'breakfast-cereals',
    'cereal/snack bars': 'cereal-bars',
}
# Fields Ring 0 leans on; 'eco_or_env' = either eco-score or environmental-score
CORE = ['nutriscore_grade', 'nova_group', 'eco_or_env',
        'allergens_tags', 'labels_tags', 'ingredients_text', 'brands']


def fetch(url, retries=4):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.load(r)
        except Exception as e:
            last = e
            time.sleep(1.5 * (i + 1))  # backoff for transient 503s
    raise last


def count_for(cat_tag, country=None):
    url = f'{BASE}?categories_tags_en={cat_tag}&fields=code&page_size=1'
    if country:
        url += f'&countries_tags_en={country}'
    return fetch(url).get('count')


def sample(cat_tag, pages=3, page_size=100):
    prods = []
    for pg in range(1, pages + 1):
        url = f'{BASE}?categories_tags_en={cat_tag}&fields={FIELDS}&page_size={page_size}&page={pg}'
        d = fetch(url)
        chunk = d.get('products', [])
        prods += chunk
        if len(chunk) < page_size:
            break
    return prods


def has(p, key):
    if key == 'eco_or_env':
        for f in ('ecoscore_grade', 'environmental_score_grade'):
            v = p.get(f)
            if v and v not in ('unknown', 'not-applicable'):
                return True
        return False
    v = p.get(key)
    if key == 'nutriscore_grade':
        return bool(v) and v not in ('unknown', 'not-applicable')
    if isinstance(v, list):
        return len(v) > 0
    if isinstance(v, str):
        return len(v.strip()) > 0
    return v is not None


# --- probe first so we fail fast & clearly if the API is down ---
try:
    fetch(f'{BASE}?categories_tags_en=plant-based-beverages&fields=code&page_size=1')
    print('PROBE OK — OFF API reachable\n')
except Exception as e:
    print('PROBE FAILED — OFF API unavailable right now:', repr(e))
    print('Script is ready; just re-run when the API is up.')
    sys.exit(2)

report = {}
rows = []
for name, tag in CATS.items():
    try:
        total = count_for(tag)
        us = count_for(tag, 'united-states')
        prods = sample(tag, pages=3)
        n = len(prods)
        cov = {k: (round(100 * sum(has(p, k) for p in prods) / n, 1) if n else 0)
               for k in CORE}
        countries = Counter()
        for p in prods:
            for c in (p.get('countries_tags') or [])[:1]:
                countries[c] += 1
        report[name] = {'category_tag': tag, 'total_products': total,
                        'us_products': us, 'sample_n': n,
                        'coverage_pct': cov,
                        'top_countries': countries.most_common(6)}
        for p in prods[:60]:
            rows.append({'category': name, 'code': p.get('code'),
                         'name': (p.get('product_name') or '')[:60],
                         'nutriscore': p.get('nutriscore_grade'),
                         'nova': p.get('nova_group'),
                         'eco': p.get('ecoscore_grade') or p.get('environmental_score_grade'),
                         'allergens_n': len(p.get('allergens_tags') or []),
                         'labels_n': len(p.get('labels_tags') or [])})
        print(f'== {name}  ({tag}) ==')
        print(f'   total: {total}   US: {us}   sampled: {n}')
        for k, v in cov.items():
            print(f'   {k:18s}: {v}%')
        print(f'   top countries: {countries.most_common(5)}\n')
    except Exception as e:
        report[name] = {'error': repr(e)}
        print(f'{name}: ERROR {e!r}\n')

json.dump(report, open(os.path.join(OUT, 'audit_summary.json'), 'w'), indent=2)
if rows:
    with open(os.path.join(OUT, 'sample_products.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
print('Wrote audit_summary.json + sample_products.csv to', OUT)
