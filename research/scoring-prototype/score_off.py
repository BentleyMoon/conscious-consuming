#!/usr/bin/env python3
"""
R&D-2.1 + 2.2 — two-axis scoring engine + "better alternatives", on real data. (v2)

v1 eval surfaced three problems; v2 fixes them:
  1. Category pollution  -> try tighter milk categories before the broad one.
  2. Sparse data gaming   -> confidence-adjust: shrink score toward neutral by
                             how much of what you care about we actually know.
  3. English-only allergens -> multilingual keyword set (data is French-heavy).

Axis A (facts): normalize OFF signals -> 0-100 objective sub-scores.
Axis B (values): per-user weights + allergen hard filters.
Personal score = confidence-adjusted weighted avg, after hard filters.
Writes scoring_results.json. Re-run: `python score_off.py`.
"""
import urllib.request, json, time, os, sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
OUT = os.path.dirname(os.path.abspath(__file__))
UA = 'ConsciousConsuming-research/0.1 (Ring-0 scoring spike)'
BASE = 'https://world.openfoodfacts.org/api/v2/search'
CATEGORIES = ['plant-based-milk-alternatives', 'plant-milks', 'dairy-substitutes',
              'plant-based-beverages']  # tightest first, broad fallback last
FIELDS_LITE = ('code,product_name,brands,nutriscore_grade,nova_group,ecoscore_grade,'
               'environmental_score_grade,labels_tags,ingredients_text')
FIELDS_FULL = FIELDS_LITE + ',nutriments'

GRADE = {'a': 100, 'b': 75, 'c': 50, 'd': 25, 'e': 0}
NOVA = {1: 100, 2: 66, 3: 33, 4: 0}
ETHICAL_LABELS = {'en:organic', 'en:eu-organic', 'en:usda-organic', 'en:fairtrade',
                  'en:fair-trade', 'en:fairtrade-international', 'en:rainforest-alliance'}
# Multilingual (EN/FR) heuristic — the physical label is always authoritative.
ALLERGEN_KEYWORDS = {
    'tree_nuts': ['almond', 'amande', 'hazelnut', 'noisette', 'cashew', 'cajou',
                  'walnut', 'pecan', 'pécan', 'pistachio', 'pistache', 'macadamia'],
    'peanut': ['peanut', 'arachide', 'cacahu', 'cacahuète'],
    'soy': ['soy', 'soya', 'soja'],
    'gluten': ['wheat', 'blé', 'barley', 'orge', 'rye', 'seigle', 'malt', 'gluten', 'avoine', 'oat'],
    'coconut': ['coconut', 'noix de coco', 'lait de coco'],
}
MIN_COVERAGE = 0.25  # below this we know too little to rank a product at all


def fetch(url, retries=4):
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


def pull():
    for cat in CATEGORIES:
        for fields, ps, tag in ((FIELDS_FULL, 50, 'full'), (FIELDS_LITE, 100, 'lite')):
            try:
                out = []
                for pg in range(1, 4):
                    url = f'{BASE}?categories_tags_en={cat}&fields={fields}&page_size={ps}&page={pg}'
                    d = fetch(url)
                    ch = d.get('products', [])
                    out += ch
                    if len(ch) < ps:
                        break
                if len(out) >= 40:
                    print(f'Pulled {len(out)} products  (category: {cat}, fields: {tag})\n')
                    return out, (tag == 'full'), cat
            except Exception as e:
                print(f'  {cat}/{tag} failed ({e!r}); trying next...')
    raise RuntimeError('OFF API unavailable / no category returned enough — re-run later.')


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def detect_allergens(text):
    t = (text or '').lower()
    return {grp for grp, kws in ALLERGEN_KEYWORDS.items() if any(k in t for k in kws)}


def minmax(values):
    vals = [v for v in values if v is not None]
    if not vals:
        return lambda x: None
    lo, hi = min(vals), max(vals)
    if hi == lo:
        return lambda x: 50.0 if x is not None else None
    return lambda x: round(100 * (x - lo) / (hi - lo), 1) if x is not None else None


raw, has_nutr, used_cat = pull()
recs = []
for p in raw:
    name = (p.get('product_name') or '').strip()
    if not name:
        continue
    nutr = p.get('nutriments') or {}
    eco = p.get('ecoscore_grade') or p.get('environmental_score_grade')
    recs.append({
        'code': p.get('code'), 'name': name[:46],
        'brand': (p.get('brands') or '').split(',')[0][:22],
        'nutri_grade': p.get('nutriscore_grade'), 'nova': p.get('nova_group'),
        'eco_grade': eco if eco not in (None, 'unknown', 'not-applicable') else None,
        'labels': p.get('labels_tags') or [],
        'protein_100g': num(nutr.get('proteins_100g')),
        'sugar_100g': num(nutr.get('sugars_100g')),
        'allergens': detect_allergens(p.get('ingredients_text')),
    })

protein_n = minmax([r['protein_100g'] for r in recs])
sugar_n = minmax([r['sugar_100g'] for r in recs])
for r in recs:
    g, eg = (r['nutri_grade'] or '').lower(), (r['eco_grade'] or '').lower()
    sn = sugar_n(r['sugar_100g'])
    n_eth = sum(1 for l in r['labels'] if l in ETHICAL_LABELS)
    r['scores'] = {
        'nutrition_grade': GRADE.get(g),
        'processing': NOVA.get(r['nova']) if isinstance(r['nova'], int) else None,
        'environment': GRADE.get(eg),
        'protein': protein_n(r['protein_100g']),
        'low_sugar': round(100 - sn, 1) if sn is not None else None,
        'ethics': (min(100, n_eth * 50) if r['labels'] else None),
    }

PROFILES = {
    'Climate-first': {'weights': {'environment': 0.45, 'processing': 0.25, 'nutrition_grade': 0.20, 'ethics': 0.10}, 'exclude': set()},
    'Nut-allergy family': {'weights': {'nutrition_grade': 0.35, 'processing': 0.35, 'low_sugar': 0.30}, 'exclude': {'tree_nuts', 'peanut'}},
    'Whole-food minimalist': {'weights': {'processing': 0.50, 'nutrition_grade': 0.30, 'ethics': 0.20}, 'exclude': set()},
}
if has_nutr and sum(1 for r in recs if r['scores']['protein'] is not None) > 20:
    PROFILES['Protein-seeker'] = {'weights': {'protein': 0.50, 'low_sugar': 0.20, 'nutrition_grade': 0.20, 'processing': 0.10}, 'exclude': set()}


def personal_score(rec, profile):
    if rec['allergens'] & profile['exclude']:
        return None  # hard filter
    num_, wsum, contrib = 0.0, 0.0, []
    for crit, w in profile['weights'].items():
        sc = rec['scores'].get(crit)
        if sc is None:
            continue
        num_ += w * sc
        wsum += w
        contrib.append((crit, w * sc))
    if wsum == 0:
        return None
    coverage = wsum / sum(profile['weights'].values())
    if coverage < MIN_COVERAGE:
        return None  # too little known to rank honestly
    raw_score = num_ / wsum
    # confidence adjustment: shrink toward neutral 50 by how much we DON'T know
    adj = raw_score * coverage + 50 * (1 - coverage)
    contrib.sort(key=lambda x: -x[1])
    return {'score': round(adj, 1), 'raw': round(raw_score, 1),
            'coverage': round(coverage, 2), 'top_factors': [c for c, _ in contrib[:2]]}


def rank(profile):
    s = [(r, ps) for r in recs if (ps := personal_score(r, profile))]
    s.sort(key=lambda x: -x[1]['score'])
    return s


results = {'category_used': used_cat, 'n_products': len(recs), 'has_nutriments': has_nutr, 'profiles': {}}
print(f'Scored {len(recs)} real products from "{used_cat}".  '
      f'(score = confidence-adjusted; raw shown in []; coverage = % of your priorities we have data for)\n')
for pname, prof in PROFILES.items():
    ranked = rank(prof)
    excluded = sum(1 for r in recs if r['allergens'] & prof['exclude'])
    print(f'================  {pname}  ================')
    if prof['exclude']:
        print(f'  (allergen hard-filter removed {excluded} products containing {", ".join(prof["exclude"])})')
    top = []
    for r, ps in ranked[:5]:
        label = (f"{r['name']}" + (f" · {r['brand']}" if r['brand'] else ''))[:46]
        print(f"  {ps['score']:5.1f}  [raw {ps['raw']:>5.1f} · data {int(ps['coverage']*100):>3d}%]  "
              f"{label:48s} ← {', '.join(ps['top_factors'])}")
        top.append({'name': label, 'score': ps['score'], 'raw': ps['raw'],
                    'coverage': ps['coverage'], 'why': ps['top_factors']})
    results['profiles'][pname] = {'excluded': excluded, 'top5': top}
    print()

prof = PROFILES['Climate-first']
ranked = rank(prof)
if len(ranked) >= 8:
    anchor, a_ps = ranked[int(len(ranked) * 0.6)]
    better = [(r, ps) for r, ps in ranked if ps['score'] > a_ps['score'] + 3][:3]
    al = (f"{anchor['name']}" + (f" · {anchor['brand']}" if anchor['brand'] else ''))[:46]
    print('================  "Better alternatives" demo (Climate-first)  ================')
    print(f"  You're looking at:  {al}  →  {a_ps['score']}")
    if better:
        print('  Better for your values:')
        for r, ps in better:
            bl = (f"{r['name']}" + (f" · {r['brand']}" if r['brand'] else ''))[:46]
            print(f"    {ps['score']:5.1f}  {bl:48s} ← stronger on {', '.join(ps['top_factors'])}")
    results['alternatives_demo'] = {'anchor': {'name': al, 'score': a_ps['score']},
        'better': [{'name': (f"{r['name']}" + (f" · {r['brand']}" if r['brand'] else ''))[:46],
                    'score': ps['score'], 'why': ps['top_factors']} for r, ps in better]}

json.dump(results, open(os.path.join(OUT, 'scoring_results.json'), 'w'), indent=2)
print('\nWrote scoring_results.json')
