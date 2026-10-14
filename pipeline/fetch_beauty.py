#!/usr/bin/env python3
"""Fetch Open Beauty Facts personal-care products, score them (scoring_beauty.py), and write a
generated lens content/lenses/<id>.json that build_datasets.py picks up automatically. ODbL.

Run: python fetch_beauty.py --only fragrance       (one or more new category ids)
     python fetch_beauty.py [max_pages] [--refresh]

Use --only for new categories. The twelve earlier beauty lenses have been edited since they were
generated (the decision fields, primaryAxis, and later roster work), so re-running this script over
all of them would overwrite that work with a plain regeneration.

Politeness: Open Beauty Facts shares Open Food Facts' API rules (10 search requests per minute,
a descriptive User-Agent), so every search request waits SEARCH_INTERVAL seconds."""
import argparse, urllib.request, json, time, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import scoring_beauty
from tracked_io import open_text, write_json
RAW = os.path.join(HERE, 'raw_beauty'); os.makedirs(RAW, exist_ok=True)
LENSES = os.path.normpath(os.path.join(HERE, '..', 'content', 'lenses'))
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
UA = ('ConsciousConsuming/0.2 (+https://valuescommons.org; build-time local cache, '
      'throttled under 10 search requests per minute; Open Beauty Facts ODbL)')
BASE = 'https://world.openbeautyfacts.org/api/v2/search'
FIELDS = 'code,product_name,brands,labels_tags,ingredients_text,ingredients_analysis_tags'
OBF_ATTR = 'Data © Open Beauty Facts contributors (ODbL)'
SEARCH_INTERVAL = 6.5
# Fragrance discloses less than any other beauty category: one listed "parfum" or "fragrance"
# can stand for dozens of undisclosed compounds. The scorer's transparency signal only measures
# whether a list and labels exist, so for fragrance the criterion is named for what it measures
# and every transparency note says what it cannot see.
FRAGRANCE_DISCLOSURE = (' A listed "parfum" or "fragrance" can stand for many undisclosed compounds,'
                        ' so this measures what the label lists, not full disclosure.')
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
    {'id': 'fragrance', 'label': 'Fragrance & perfume', 'tags': ['perfumes', 'fragrances'], 'attribution': OBF_ATTR,
     'asof': '2026-10', 'primaryAxis': 'cruelty_free', 'transparencyLabel': 'Lists ingredients',
     'transparencyNote': FRAGRANCE_DISCLOSURE},
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
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r:
                return json.load(r)
        except Exception as e:
            last = e; time.sleep(5 * (i + 1))
    raise last


def harvest(cat, maxp):
    for tag in cat['tags']:
        by = {}
        for pg in range(1, maxp + 1):
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


def framed(cat, scored):
    """Apply a category's disclosure framing and fetch month to the scorer's output."""
    criteria = [dict(c) for c in scoring_beauty.CRITERIA]
    if cat.get('transparencyLabel'):
        for c in criteria:
            if c['key'] == 'transparency':
                c['label'] = cat['transparencyLabel']
    for rec in scored:
        for key, pv in rec.get('provenance', {}).items():
            if cat.get('asof'):
                pv['asof'] = cat['asof']
            if key == 'transparency' and cat.get('transparencyNote'):
                pv['note'] = pv['note'] + cat['transparencyNote']
    return criteria, scored


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pages', nargs='?', type=int, default=6, help='max pages of 100 per category')
    ap.add_argument('--refresh', action='store_true')
    ap.add_argument('--only', default='', help='comma-separated category ids')
    args = ap.parse_args()
    only = {x.strip() for x in args.only.split(',') if x.strip()}
    for cat in CATEGORIES:
        if only and cat['id'] not in only:
            continue
        print('==', cat['label'], '==')
        rawp = os.path.join(RAW, cat['id'] + '.jsonl')
        if os.path.isfile(rawp) and not args.refresh:
            products = [json.loads(l) for l in open(rawp, encoding='utf-8') if l.strip()]
            print(f'   cached {len(products)} (re-scoring, no fetch)'); tag = 'cache'
        else:
            products, tag = harvest(cat, args.pages)
            if not products:
                print('   nothing retrieved — skipping'); continue
            with open_text(rawp) as f:
                for p in products:
                    f.write(json.dumps(p, ensure_ascii=False) + '\n')
        criteria, scored = framed(cat, scoring_beauty.score_beauty(products))
        if len(scored) < 50:
            print(f'   {len(scored)} scored — below the 50-entry generated-category floor; no lens written')
            continue
        meta = {'id': cat['id'], 'label': cat['label'], 'type': 'Products'}
        if cat.get('primaryAxis'):
            meta['primaryAxis'] = cat['primaryAxis']
        meta.update({'source': 'Open Beauty Facts',
                     'license': 'ODbL 1.0', 'attribution': cat['attribution'], 'allergens': False,
                     'productBase': 'https://world.openbeautyfacts.org/product/',
                     'presets': scoring_beauty.PRESETS, 'n': len(scored)})
        ds = {'meta': meta, 'criteria': criteria, 'products': scored}
        write_json(os.path.join(LENSES, cat['id'] + '.json'), ds, ensure_ascii=False, indent=1)
        print(f'   {len(products)} fetched (tag={tag}) → {len(scored)} scored → content/lenses/{cat["id"]}.json')
    print('Done. Next: python build_datasets.py')


if __name__ == '__main__':
    main()
