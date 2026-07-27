#!/usr/bin/env python3
"""C3: fetch real food prices from Open Prices (ODbL) by barcode; cache to pipeline/prices/<cid>.json.
Build-time ONLY -> baked into data.js, so the app makes no runtime price calls (privacy intact).
Median price per product across community submissions. Usage: python fetch_prices.py [cap_per_category]"""
import json, os, sys, time, urllib.request, urllib.parse
from tracked_io import write_json
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, '..', 'app', 'data'))
OUT = os.path.join(HERE, 'prices'); os.makedirs(OUT, exist_ok=True)
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
FOOD = ['plant-based-milk', 'milk', 'plant-based-yogurt', 'eggs', 'breakfast-cereal', 'granola', 'oats', 'coffee', 'dark-chocolate', 'yogurt', 'olive-oil', 'bread', 'flour-baking', 'plant-based-meat', 'tea', 'pasta-sauce', 'nut-butter', 'nuts', 'fruit-juice', 'ice-cream', 'cheese', 'butter', 'crisps', 'biscuits', 'soda', 'honey', 'fruit-jam', 'rice', 'pasta', 'legumes', 'tofu', 'hummus', 'soups', 'canned-fish', 'fish-seafood', 'canned-tomatoes', 'canned-vegetables', 'frozen-vegetables', 'frozen-pizza', 'ready-meals', 'dried-fruit', 'cereal-bars', 'energy-drinks', 'crackers', 'ketchup', 'mayonnaise', 'salad-dressing', 'pickles', 'chocolate-spread', 'spices-seasoning']
CAP = int(sys.argv[1]) if len(sys.argv) > 1 else 200
UA = {'User-Agent': 'ConsciousConsuming/0.1 (build-time price fetch; Open Food Facts community)'}

def median_price(code):
    url = 'https://prices.openfoodfacts.org/api/v1/prices?' + urllib.parse.urlencode({'product_code': code, 'page_size': 50})
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20)
        d = json.loads(r.read().decode('utf-8'))
        items = [it for it in d.get('items', []) if isinstance(it.get('price'), (int, float)) and it.get('currency')]
        if not items:
            return None
        # one currency only, so affordability stays comparable across products: prefer EUR, else most common
        curs = {}
        for it in items:
            curs[it['currency']] = curs.get(it['currency'], 0) + 1
        cur = 'EUR' if 'EUR' in curs else max(curs, key=curs.get)
        vals = sorted(it['price'] for it in items if it['currency'] == cur)
        if not vals:
            return None
        return {'price': round(vals[len(vals)//2], 2), 'n': len(vals), 'currency': cur}
    except Exception:
        return None

for cid in FOOD:
    outp = os.path.join(OUT, cid + '.json')
    if os.path.isfile(outp) and '--refresh' not in sys.argv:
        print(f'  {cid}: prices cached — skipping (use --refresh to refetch)'); continue
    path = os.path.join(DATA, cid + '.json')
    if not os.path.isfile(path):
        print('  skip (no dataset yet):', cid); continue
    ds = json.load(open(path, encoding='utf-8'))
    codes = [p['code'] for p in ds['products'] if p.get('code')][:CAP]
    cache = {}
    for code in codes:
        m = median_price(code)
        if m:
            cache[code] = m
        time.sleep(0.12)
    write_json(os.path.join(OUT, cid + '.json'), cache, ensure_ascii=False, indent=1)
    print(f'  {cid}: queried {len(codes)}, priced {len(cache)} -> pipeline/prices/{cid}.json (cap={CAP})')
print('Done. Re-run build_datasets.py to bake economical into food.')
