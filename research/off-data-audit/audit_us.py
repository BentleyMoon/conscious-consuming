#!/usr/bin/env python3
"""
R&D-1.1 follow-up: US-specific coverage + retry plant-based beverages.

The main audit sampled the (Europe-heavy) global pool. The decisive question
for a US-facing launch is whether US *products* carry the same fields. This
samples each category filtered to the US, and retries plant-based beverages
(which 503'd in the first run). Writes audit_us.json.
"""
import urllib.request, json, time, os
OUT = os.path.dirname(os.path.abspath(__file__))
UA = 'ConsciousConsuming-research/0.1 (Ring-0 US coverage spike)'
BASE = 'https://world.openfoodfacts.org/api/v2/search'
FIELDS = ('code,product_name,nutriscore_grade,nova_group,ecoscore_grade,'
          'environmental_score_grade,allergens_tags,labels_tags,ingredients_text,brands')
CATS = {'plant-based beverages': 'plant-based-beverages',
        'breakfast cereals': 'breakfast-cereals',
        'cereal/snack bars': 'cereal-bars'}
CORE = ['nutriscore_grade', 'nova_group', 'eco_or_env', 'allergens_tags',
        'labels_tags', 'ingredients_text']


def fetch(url, retries=5):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.load(r)
        except Exception as e:
            last = e
            time.sleep(2 * (i + 1))
    raise last


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


def sample(tag, country=None, pages=3, ps=100):
    out = []
    for pg in range(1, pages + 1):
        url = f'{BASE}?categories_tags_en={tag}&fields={FIELDS}&page_size={ps}&page={pg}'
        if country:
            url += f'&countries_tags_en={country}'
        d = fetch(url)
        ch = d.get('products', [])
        out += ch
        if len(ch) < ps:
            break
    return out


def count_for(tag, country=None):
    url = f'{BASE}?categories_tags_en={tag}&fields=code&page_size=1'
    if country:
        url += f'&countries_tags_en={country}'
    return fetch(url).get('count')


res = {}
for name, tag in CATS.items():
    try:
        us = sample(tag, 'united-states', pages=3)
        n = len(us)
        cov = {k: (round(100 * sum(has(p, k) for p in us) / n, 1) if n else 0) for k in CORE}
        res[name] = {'us_sample_n': n, 'us_coverage_pct': cov}
        print(f'== {name} — US only == sampled {n}')
        for k, v in cov.items():
            print(f'   {k:18s}: {v}%')
        print()
    except Exception as e:
        print(name, 'ERROR', repr(e))
        res[name] = {'error': repr(e)}

# plant milk global retry + counts
try:
    pm = sample('plant-based-beverages', pages=3)
    n = len(pm)
    cov = {k: (round(100 * sum(has(p, k) for p in pm) / n, 1) if n else 0) for k in CORE}
    res['plant-based beverages GLOBAL'] = {'sample_n': n, 'coverage_pct': cov}
    print('== plant-based beverages — GLOBAL retry == sampled', n)
    for k, v in cov.items():
        print(f'   {k:18s}: {v}%')
    print()
except Exception as e:
    print('plant milk global retry ERROR', repr(e))

try:
    print('plant-based beverages  total:', count_for('plant-based-beverages'),
          ' US:', count_for('plant-based-beverages', 'united-states'))
except Exception as e:
    print('count err', repr(e))

json.dump(res, open(os.path.join(OUT, 'audit_us.json'), 'w'), indent=2)
print('wrote audit_us.json')
