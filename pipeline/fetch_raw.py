#!/usr/bin/env python3
"""
M-data: acquire OFF data for our lead categories into a LOCAL raw cache.

This is the "own your data" step: paginate the API once into pipeline/raw/<id>.jsonl,
so the build step (build_datasets.py) never touches the network. Re-run to refresh.
Robust to the flaky API (retry/backoff; tries multiple category tags; saves partial
progress; never shrinks a cache). For the full catalogue, use ingest_dump.py instead
(OFF bulk dump).

Politeness. Open Food Facts documents a limit of 10 search requests per minute per client
(https://openfoodfacts.github.io/openfoodfacts-server/api/#rate-limits) and asks API users to
send a descriptive User-Agent. Every search request here waits SEARCH_INTERVAL seconds after
the previous one, retries back off on top of that, and the User-Agent names the project.

Run: `python fetch_raw.py`                      fetch NEW categories only (cached ones skipped)
     `python fetch_raw.py --deepen`             grow every cache to the cap, append-only: existing
                                                records are kept byte-for-byte and new codes are
                                                added behind them in OFF's own order
     `python fetch_raw.py --only bottled-water` restrict to named category ids
     `python fetch_raw.py --cap 800`            override the per-category cap
     `python fetch_raw.py --refresh`            refetch and replace (still never shrinks)
"""
import argparse, urllib.error, urllib.request, json, time, os, sys
from tracked_io import open_text

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
os.makedirs(RAW, exist_ok=True)
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

UA = ('ConsciousConsuming/0.2 (+https://valuescommons.org; build-time local cache, '
      'throttled under 10 search requests per minute; Open Food Facts ODbL)')
BASE = 'https://world.openfoodfacts.org/api/v2/search'
FIELDS_LITE = ('code,product_name,brands,nutriscore_grade,nova_group,ecoscore_grade,'
               'environmental_score_grade,labels_tags,categories_tags,ingredients_text,allergens_tags,traces_tags')
FIELDS_FULL = FIELDS_LITE + ',nutriments'
SEARCH_INTERVAL = 6.5   # seconds between search requests: under OFF's documented 10 per minute
PAGE_SIZE = 100
# 2026-10-14. Raised from 400 (8 pages of 50) after measuring what each extra product costs the
# lazy Ask index, the per-category JSON and the committed file:// bundle. The measurements and
# the reasoning are in content/MASS-DATA-ACCESS-PLAN.md under "Deepening the food caches".
DEFAULT_CAP = 500

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
    {'id': 'bottled-water', 'label': 'Bottled water',
     'tags': ['waters', 'mineral-waters', 'bottled-waters']},
]
_last_request = [0.0]


def fetch(url, retries=5):
    last = None
    for i in range(retries):
        wait = SEARCH_INTERVAL - (time.monotonic() - _last_request[0])
        if wait > 0:
            time.sleep(wait)
        _last_request[0] = time.monotonic()
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            # A refusal is an answer, not a fault: retrying a 4xx only spends OFF's capacity.
            # (Observed 2026-10-14: anonymous search returns 401 past page 10 of 100, so the
            # API path tops out near 1,000 products per tag; deeper needs ingest_dump.py.)
            if 400 <= e.code < 500 and e.code != 429:
                raise
            last = e
            time.sleep(5 * (i + 1))
        except Exception as e:
            last = e
            time.sleep(5 * (i + 1))
    raise last


def harvest(cat, cap, seen=()):
    """Try each tag; for the first that yields, paginate until `cap` products. Dedup by code.

    `seen` codes (already cached) count toward the cap and are never returned again, so a
    deepen run appends only codes the cache does not hold."""
    seen = set(seen)
    need = max(0, cap - len(seen))
    if need == 0:
        return [], None, None, True
    max_pages = (cap + PAGE_SIZE - 1) // PAGE_SIZE + 2
    # Skip pages the cache almost certainly already holds (OFF's order drifts a little between
    # runs, so start one page early), which keeps a deepen run to the requests it needs.
    first_page = max(1, len(seen) // PAGE_SIZE)
    for tag in cat['tags']:
        for fields, ftag in ((FIELDS_FULL, 'full'), (FIELDS_LITE, 'lite')):
            by_code = {}
            ok = True
            for pg in range(first_page if tag == cat["tags"][0] else 1, max_pages + 1):
                url = f'{BASE}?categories_tags_en={tag}&fields={fields}&page_size={PAGE_SIZE}&page={pg}'
                try:
                    d = fetch(url)
                except Exception as e:
                    print(f'    page {pg} failed ({e!r}) — keeping {len(by_code)} so far')
                    ok = False
                    break
                chunk = d.get('products', [])
                for p in chunk:
                    code = p.get('code')
                    if code and code not in seen and code not in by_code:
                        by_code[code] = p
                if len(by_code) >= need or len(chunk) < PAGE_SIZE:
                    break
            got = list(by_code.values())[:need]
            if len(got) + len(seen) >= 40 or (got and not ok):
                return got, tag, ftag, ok
    return [], None, None, False


def read_cache(path):
    if not os.path.isfile(path):
        return []
    return [line.rstrip('\n') for line in open(path, encoding='utf-8') if line.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pages', nargs='?', type=int, help='legacy: max pages of 100 (sets cap = pages*100)')
    ap.add_argument('--cap', type=int, default=None, help=f'products per category (default {DEFAULT_CAP})')
    ap.add_argument('--deepen', action='store_true', help='append new codes to existing caches up to the cap')
    ap.add_argument('--refresh', action='store_true', help='refetch and replace caches (never shrinks)')
    ap.add_argument('--only', default='', help='comma-separated category ids')
    args = ap.parse_args()
    cap = args.cap or (args.pages * PAGE_SIZE if args.pages else DEFAULT_CAP)
    only = {x.strip() for x in args.only.split(',') if x.strip()}

    print(f'M-data: caching up to {cap} products per category into {RAW}\n')
    summary = {}
    for cat in CATEGORIES:
        if only and cat['id'] not in only:
            continue
        print(f'== {cat["label"]} ({cat["id"]}) ==')
        path = os.path.join(RAW, cat['id'] + '.jsonl')
        lines = read_cache(path)
        existing = len(lines)
        if existing >= 40 and not (args.refresh or args.deepen):
            print('   cached — skipping (use --deepen to grow or --refresh to refetch)\n')
            summary[cat['id']] = 'cached'
            continue
        if args.deepen and existing:
            if existing >= cap:
                print(f'   already {existing}, at or over the cap of {cap} — unchanged\n')
                summary[cat['id']] = existing
                continue
            seen = [json.loads(line).get('code') for line in lines]
            products, tag, ftag, ok = harvest(cat, cap, seen)
            if not products:
                print(f'   nothing new retrieved — kept existing {existing}\n')
                summary[cat['id']] = existing
                continue
            with open_text(path) as f:
                for line in lines:
                    f.write(line + '\n')
                for p in products:
                    f.write(json.dumps(p, ensure_ascii=False) + '\n')
            print(f'   kept {existing}, appended {len(products)} (tag={tag}, fields={ftag}'
                  f'{", partial" if not ok else ""}) → {existing + len(products)} in raw/{cat["id"]}.jsonl\n')
            summary[cat['id']] = existing + len(products)
            continue
        products, tag, ftag, ok = harvest(cat, cap)
        if not products:
            print('   nothing retrieved (API down?) — skipping; re-run later\n')
            summary[cat['id']] = existing
            continue
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


if __name__ == '__main__':
    main()
