#!/usr/bin/env python3
"""Fetch Open Beauty Facts personal-care products, score them (scoring_beauty.py), and write a
generated lens content/lenses/<id>.json that build_datasets.py picks up automatically. ODbL.
Run: python fetch_beauty.py [max_pages]"""
import urllib.request, json, time, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import scoring_beauty
from tracked_io import open_text, write_json
RAW = os.path.join(HERE, 'raw_beauty'); os.makedirs(RAW, exist_ok=True)
LENSES = os.path.normpath(os.path.join(HERE, '..', 'content', 'lenses'))
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
UA = 'ConsciousConsuming/0.1 (Open Beauty Facts ODbL)'
BASE = 'https://world.openbeautyfacts.org/api/v2/search'
FIELDS = 'code,product_name,brands,labels_tags,ingredients_text,ingredients_analysis_tags'
OBF_ATTR = 'Data © Open Beauty Facts contributors (ODbL)'
CATEGORIES = [
    {'id': 'toothpaste', 'label': 'Toothpaste', 'tags': ['toothpastes'], 'attribution': OBF_ATTR},
    {'id': 'mouthwash', 'label': 'Mouthwash', 'tags': ['mouthwashes'], 'attribution': OBF_ATTR},
    {'id': 'soap', 'label': 'Soap', 'tags': ['soaps', 'hand-soaps', 'bar-soaps'], 'attribution': OBF_ATTR},
    {'id': 'body-wash', 'label': 'Body wash', 'tags': ['shower-gels'], 'attribution': OBF_ATTR},
    {'id': 'shampoo', 'label': 'Shampoo', 'tags': ['shampoos'], 'attribution': OBF_ATTR},
    {'id': 'deodorant', 'label': 'Deodorant', 'tags': ['deodorants'], 'attribution': OBF_ATTR},
    {'id': 'sunscreen', 'label': 'Sunscreen', 'tags': ['sunscreens', 'sun-care'], 'attribution': OBF_ATTR},
    {'id': 'face-wash', 'label': 'Face wash & cleansers', 'tags': ['cleansers', 'makeup-removers'], 'attribution': OBF_ATTR},
    {'id': 'face-cream', 'label': 'Face cream', 'tags': ['face-creams'], 'attribution': OBF_ATTR},
    {'id': 'hand-cream', 'label': 'Hand cream', 'tags': ['hand-creams'], 'attribution': OBF_ATTR},
    {'id': 'lip-balm', 'label': 'Lip balm', 'tags': ['lip-balms', 'lip-care'], 'attribution': OBF_ATTR},
    {'id': 'hair-conditioner', 'label': 'Hair conditioner', 'tags': ['hair-conditioners', 'conditioners'], 'attribution': OBF_ATTR},
]
MAXP = int(sys.argv[1]) if len(sys.argv) > 1 else 6


def fetch(url, retries=5):
    last = None
    for i in range(retries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=45) as r:
                return json.load(r)
        except Exception as e:
            last = e; time.sleep(2 * (i + 1))
    raise last


def harvest(cat):
    for tag in cat['tags']:
        by = {}
        for pg in range(1, MAXP + 1):
            url = f'{BASE}?categories_tags_en={tag}&fields={FIELDS}&page_size=100&page={pg}'
            try:
                d = fetch(url)
            except Exception as e:
                print('   page', pg, 'failed', repr(e)); break
            chunk = d.get('products', [])
            for p in chunk:
                if p.get('code'):
                    by[p['code']] = p
            if len(chunk) < 100:
                break
        if by:
            return list(by.values()), tag
    return [], None


for cat in CATEGORIES:
    print('==', cat['label'], '==')
    rawp = os.path.join(RAW, cat['id'] + '.jsonl')
    if os.path.isfile(rawp) and '--refresh' not in sys.argv:
        products = [json.loads(l) for l in open(rawp, encoding='utf-8') if l.strip()]
        print(f'   cached {len(products)} (re-scoring, no fetch)'); tag = 'cache'
    else:
        products, tag = harvest(cat)
        if not products:
            print('   nothing retrieved — skipping'); continue
        with open_text(rawp) as f:
            for p in products:
                f.write(json.dumps(p, ensure_ascii=False) + '\n')
    scored = scoring_beauty.score_beauty(products)
    ds = {'meta': {'id': cat['id'], 'label': cat['label'], 'type': 'Products', 'source': 'Open Beauty Facts',
                   'license': 'ODbL 1.0', 'attribution': cat['attribution'], 'allergens': False,
                   'productBase': 'https://world.openbeautyfacts.org/product/',
                   'presets': scoring_beauty.PRESETS, 'n': len(scored)},
          'criteria': scoring_beauty.CRITERIA, 'products': scored}
    write_json(os.path.join(LENSES, cat['id'] + '.json'), ds, ensure_ascii=False, indent=1)
    print(f'   {len(products)} fetched (tag={tag}) → {len(scored)} scored → content/lenses/{cat["id"]}.json')
print('Done. Next: python build_datasets.py')
