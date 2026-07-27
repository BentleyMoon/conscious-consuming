#!/usr/bin/env python3
"""
M-data: acquire OFF data for our lead categories into a LOCAL raw cache.

This is the "own your data" step: paginate the API once into pipeline/raw/<id>.jsonl,
so the build step (build_datasets.py) never touches the network. Re-run to refresh.
Robust to the flaky API (retry/backoff; tries multiple category tags; saves partial
progress). For the full catalogue, use ingest_dump.py instead (OFF bulk dump).

Run: `python fetch_raw.py`            (default categories, ~6 pages each)
     `python fetch_raw.py 12`         (override max pages per category)
"""
import urllib.request, json, time, os, sys
from tracked_io import open_text

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
os.makedirs(RAW, exist_ok=True)
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

UA = 'ConsciousConsuming/0.1 (Ring-0 local cache; Open Food Facts ODbL)'
BASE = 'https://world.openfoodfacts.org/api/v2/search'
FIELDS_LITE = ('code,product_name,brands,nutriscore_grade,nova_group,ecoscore_grade,'
               'environmental_score_grade,labels_tags,categories_tags,ingredients_text,allergens_tags,traces_tags')
FIELDS_FULL = FIELDS_LITE + ',nutriments'

CATEGORIES = [
    {'id': 'plant-based-milk', 'label': 'Plant-based milk',
     'tags': ['plant-based-milk-alternatives', 'plant-milks', 'dairy-substitutes']},
    {'id': 'milk', 'label': 'Milk',
     'tags': ['milks', 'cow-milks', 'uht-milks']},
    {'id': 'plant-based-yogurt', 'label': 'Plant-based yogurt',
     'tags': ['soy-yogurts', 'plant-based-yogurts', 'plant-based-yogurts-and-desserts']},
    {'id': 'eggs', 'label': 'Eggs',
     'tags': ['eggs', 'chicken-eggs', 'free-range-eggs']},
    {'id': 'breakfast-cereal', 'label': 'Breakfast cereal',
     'tags': ['breakfast-cereals']},
    {'id': 'granola', 'label': 'Granola & muesli',
     'tags': ['granola', 'mueslis', 'granolas']},
    {'id': 'oats', 'label': 'Oats',
     'tags': ['rolled-oats', 'oatmeals', 'porridges']},
    {'id': 'coffee', 'label': 'Coffee',
     'tags': ['coffees', 'ground-coffees']},
    {'id': 'dark-chocolate', 'label': 'Dark chocolate',
     'tags': ['dark-chocolates', 'chocolates']},
    {'id': 'yogurt', 'label': 'Yogurt',
     'tags': ['yogurts', 'plain-yogurts']},
    {'id': 'olive-oil', 'label': 'Olive oil',
     'tags': ['olive-oils', 'extra-virgin-olive-oils']},
    {'id': 'bread', 'label': 'Bread',
     'tags': ['breads']},
    {'id': 'flour-baking', 'label': 'Flour & baking',
     'tags': ['flours', 'baking-mixes', 'cake-mixes']},
    {'id': 'plant-based-meat', 'label': 'Plant-based meat',
     'tags': ['meat-analogues', 'vegetarian-meat-substitutes', 'plant-based-meat-substitutes']},
    {'id': 'tea', 'label': 'Tea',
     'tags': ['teas']},
    {'id': 'pasta-sauce', 'label': 'Pasta sauce',
     'tags': ['pasta-sauces', 'tomato-sauces']},
    {'id': 'nut-butter', 'label': 'Nut butter',
     'tags': ['nut-butters', 'peanut-butters']},
    {'id': 'nuts', 'label': 'Nuts',
     'tags': ['mixed-nuts', 'nuts']},
    {'id': 'fruit-juice', 'label': 'Fruit juice',
     'tags': ['fruit-juices', 'juices']},
    {'id': 'ice-cream', 'label': 'Ice cream',
     'tags': ['ice-creams']},
    {'id': 'cheese', 'label': 'Cheese',
     'tags': ['cheeses']},
    {'id': 'butter', 'label': 'Butter',
     'tags': ['butters']},
    {'id': 'crisps', 'label': 'Crisps & chips',
     'tags': ['crisps', 'potato-crisps', 'chips']},
    {'id': 'biscuits', 'label': 'Biscuits & cookies',
     'tags': ['biscuits', 'cookies']},
    {'id': 'soda', 'label': 'Soda',
     'tags': ['sodas', 'carbonated-drinks']},
    {'id': 'honey', 'label': 'Honey',
     'tags': ['honeys']},
    {'id': 'fruit-jam', 'label': 'Fruit jam',
     'tags': ['fruit-jams', 'strawberry-jams', 'jams']},
    {'id': 'rice', 'label': 'Rice',
     'tags': ['rices']},
    {'id': 'pasta', 'label': 'Pasta',
     'tags': ['pastas', 'dried-pasta']},
    {'id': 'legumes', 'label': 'Beans & legumes',
     'tags': ['legumes', 'canned-legumes', 'pulses']},
    {'id': 'tofu', 'label': 'Tofu',
     'tags': ['tofus']},
    {'id': 'hummus', 'label': 'Hummus',
     'tags': ['houmous', 'hummus']},
    {'id': 'soups', 'label': 'Soups',
     'tags': ['instant-soups', 'canned-soups', 'soups']},
    {'id': 'canned-fish', 'label': 'Canned tuna & fish',
     'tags': ['canned-tunas', 'canned-fish', 'tunas']},
    {'id': 'fish-seafood', 'label': 'Fish & seafood',
     'tags': ['fishes', 'seafood', 'fish-and-seafood']},
    {'id': 'canned-tomatoes', 'label': 'Canned tomatoes',
     'tags': ['canned-tomatoes', 'tinned-tomatoes', 'tomato-purees']},
    {'id': 'canned-vegetables', 'label': 'Canned vegetables',
     'tags': ['canned-vegetables']},
    {'id': 'frozen-vegetables', 'label': 'Frozen vegetables',
     'tags': ['frozen-vegetables', 'frozen-foods']},
    {'id': 'frozen-pizza', 'label': 'Frozen pizza',
     'tags': ['frozen-pizzas', 'pizzas']},
    {'id': 'ready-meals', 'label': 'Ready meals',
     'tags': ['prepared-meals', 'ready-meals', 'meals']},
    {'id': 'dried-fruit', 'label': 'Dried fruit',
     'tags': ['dried-fruits', 'raisins', 'dates']},
    {'id': 'cereal-bars', 'label': 'Cereal & granola bars',
     'tags': ['cereal-bars', 'granola-bars', 'energy-bars']},
    {'id': 'energy-drinks', 'label': 'Energy drinks',
     'tags': ['energy-drinks']},
    {'id': 'crackers', 'label': 'Crackers',
     'tags': ['crackers']},
    {'id': 'ketchup', 'label': 'Ketchup',
     'tags': ['ketchup', 'tomato-ketchup']},
    {'id': 'mayonnaise', 'label': 'Mayonnaise',
     'tags': ['mayonnaises', 'mayonnaise']},
    {'id': 'salad-dressing', 'label': 'Salad dressing',
     'tags': ['salad-dressings', 'dressings']},
    {'id': 'pickles', 'label': 'Pickles',
     'tags': ['pickled-cucumbers', 'pickles', 'gherkins']},
    {'id': 'chocolate-spread', 'label': 'Chocolate spread',
     'tags': ['chocolate-spreads', 'hazelnut-spreads']},
    {'id': 'spices-seasoning', 'label': 'Spices & seasonings',
     'tags': ['spices', 'seasonings', 'herbs-and-spices']},
]
MAX_PAGES = int(sys.argv[1]) if len(sys.argv) > 1 else 8


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


def harvest(cat):
    """Try each tag; for the first that yields, paginate up to MAX_PAGES. Dedup by code."""
    for tag in cat['tags']:
        for fields, ps, ftag in ((FIELDS_FULL, 50, 'full'), (FIELDS_LITE, 100, 'lite')):
            by_code = {}
            ok = True
            for pg in range(1, MAX_PAGES + 1):
                url = f'{BASE}?categories_tags_en={tag}&fields={fields}&page_size={ps}&page={pg}'
                try:
                    d = fetch(url)
                except Exception as e:
                    print(f'    page {pg} failed ({e!r}) — keeping {len(by_code)} so far')
                    ok = False
                    break
                chunk = d.get('products', [])
                for p in chunk:
                    if p.get('code'):
                        by_code[p['code']] = p
                if len(chunk) < ps:
                    break
            if len(by_code) >= 40 or (by_code and not ok):
                return list(by_code.values()), tag, ftag
    return [], None, None


print(f'M-data: caching up to {MAX_PAGES} pages per category into {RAW}\n')
summary = {}
for cat in CATEGORIES:
    print(f'== {cat["label"]} ({cat["id"]}) ==')
    _p = os.path.join(RAW, cat['id'] + '.jsonl')
    if os.path.isfile(_p) and sum(1 for _ in open(_p, encoding='utf-8')) >= 40 and '--refresh' not in sys.argv:
        print('   cached — skipping (use --refresh to refetch)\n'); summary[cat['id']] = 'cached'; continue
    products, tag, ftag = harvest(cat)
    if not products:
        print('   nothing retrieved (API down?) — skipping; re-run later\n')
        summary[cat['id']] = 0
        continue
    path = os.path.join(RAW, cat['id'] + '.jsonl')
    existing = sum(1 for _ in open(path, encoding='utf-8')) if os.path.isfile(path) else 0
    if len(products) < existing:
        print(f'   kept existing {existing} (new fetch only {len(products)}) — not shrinking on a flaky fetch\n')
        summary[cat['id']] = existing
        continue
    with open_text(path) as f:
        for p in products:
            f.write(json.dumps(p, ensure_ascii=False) + '\n')
    print(f'   cached {len(products)} products (tag={tag}, fields={ftag}) → raw/{cat["id"]}.jsonl\n')
    summary[cat['id']] = len(products)

print('Done. Cache summary:', summary)
print('Next: python build_datasets.py')
