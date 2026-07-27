#!/usr/bin/env python3
"""
M-data (full catalogue): build the local raw cache from an OFF BULK DUMP.

The API path (fetch_raw.py) is great for a few hundred products per category.
For the *entire* catalogue — and zero API dependence — use the Open Food Facts
bulk dump and this streaming filter instead.

1. Download the JSONL dump (~several GB gz) once:
     https://world.openfoodfacts.org/data
     (file: openfoodfacts-products.jsonl.gz)
2. Run:  python ingest_dump.py path/to/openfoodfacts-products.jsonl.gz
3. Then: python build_datasets.py

Streams line-by-line (never loads the whole dump into memory) and keeps only
our categories + the handful of fields we score on. ODbL: attribute OFF.
"""
import gzip, json, os, sys
from tracked_io import open_text

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
os.makedirs(RAW, exist_ok=True)

CATEGORIES = [
    {'id': 'plant-based-milk', 'tags': ['plant-based-milk-alternatives', 'plant-milks', 'dairy-substitutes']},
    {'id': 'breakfast-cereal', 'tags': ['breakfast-cereals']},
]
KEEP = ['code', 'product_name', 'brands', 'nutriscore_grade', 'nova_group',
        'ecoscore_grade', 'environmental_score_grade', 'labels_tags',
        'ingredients_text', 'allergens_tags', 'traces_tags', 'categories_tags']
CAP = int(os.environ.get('CC_CAP', '0'))  # 0 = no per-category cap

tag_to_id = {}
for c in CATEGORIES:
    for t in c['tags']:
        tag_to_id['en:' + t] = c['id']


def slim(p):
    rec = {k: p.get(k) for k in KEEP}
    n = p.get('nutriments') or {}
    rec['nutriments'] = {k: n.get(k) for k in ('proteins_100g', 'sugars_100g') if k in n}
    return rec


def main(path):
    opener = gzip.open if path.endswith('.gz') else open
    writers = {c['id']: open_text(os.path.join(RAW, c['id'] + '.jsonl'))
               for c in CATEGORIES}
    counts = {c['id']: 0 for c in CATEGORIES}
    scanned = 0
    with opener(path, 'rt', encoding='utf-8', errors='ignore') as f:
        for line in f:
            scanned += 1
            if scanned % 500000 == 0:
                print(f'  scanned {scanned:,}…  matched {sum(counts.values()):,}')
            line = line.strip().rstrip(',')
            if not line or line[0] != '{':
                continue
            try:
                p = json.loads(line)
            except Exception:
                continue
            cid = None
            for t in (p.get('categories_tags') or []):
                if t in tag_to_id:
                    cid = tag_to_id[t]
                    break
            if not cid:
                continue
            if CAP and counts[cid] >= CAP:
                continue
            writers[cid].write(json.dumps(slim(p), ensure_ascii=False) + '\n')
            counts[cid] += 1
    for w in writers.values():
        w.close()
    print(f'Scanned {scanned:,} products. Cached: {counts}')
    print('Next: python build_datasets.py')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit('Usage: python ingest_dump.py <openfoodfacts-products.jsonl[.gz]>\n'
                 'Get the dump at https://world.openfoodfacts.org/data')
    if not os.path.exists(sys.argv[1]):
        sys.exit(f'Dump not found: {sys.argv[1]}')
    main(sys.argv[1])
