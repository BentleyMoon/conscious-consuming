#!/usr/bin/env python3
"""
Shared objective scoring engine (Axis A) — the single source of truth.

Takes raw Open Food Facts product dicts for one category and returns scored
product records (objective 0-100 sub-scores + provenance + allergens). No API,
no personalization — pure, testable transform. Used by build_datasets.py.

Non-negotiables (R&D-2 + the design/dev critique):
- Allergens come from OFF's CURATED, multilingual `allergens_tags`/`traces_tags`
  FIRST. Ingredient keywords are a best-effort FALLBACK only — never a guarantee.
  Each product reports whether its allergen data is `allergensDeclared`, so the UI
  can say "data unavailable — check the label" rather than implying safety.
- Sub-scores are ABSOLUTE (fixed, nutrition-informed scales), so they're stable
  across data refreshes and comparable over time.
- Missing data = absent (never scored as 0).
"""

import re
import unicodedata

GRADE = {'a': 100, 'b': 75, 'c': 50, 'd': 25, 'e': 0}
NOVA = {1: 100, 2: 66, 3: 33, 4: 0}
ORGANIC_LABELS = {
    'en:organic', 'en:eu-organic', 'en:usda-organic', 'en:soil-association-organic'
}
FAIR_TRADE_LABELS = {
    'en:fairtrade', 'en:fair-trade', 'en:fairtrade-international',
    'en:fairtrade-cocoa', 'en:fair-for-life'
}
RAINFOREST_ALLIANCE_LABELS = {
    'en:rainforest-alliance', 'en:rainforest-alliance-coffee',
    'en:rainforest-alliance-cocoa', 'en:rainforest-alliance-tea',
    'en:rainforest-alliance-black-tea'
}
# Keep the collapsed score stable outside the three S8 pilot categories.
ETHICAL = {'en:organic', 'en:eu-organic', 'en:usda-organic', 'en:fairtrade',
           'en:fair-trade', 'en:fairtrade-international', 'en:rainforest-alliance'}
CERTIFICATION_LABELS = {
    'organic': ORGANIC_LABELS,
    'fair_trade': FAIR_TRADE_LABELS,
    'rainforest_alliance': RAINFOREST_ALLIANCE_LABELS,
}
CERTIFICATION_NOTES = {
    'organic': 'an organic certification tag',
    'fair_trade': 'a fair-trade certification tag',
    'rainforest_alliance': 'a Rainforest Alliance certification tag',
}

def certification_scores(labels):
    """Return the three S8 certification facts from one OFF labels field.

    An empty labels field means unknown for all three facts. Once OFF supplies
    labels, a matching tag scores 100 and a non-match scores 0.
    """
    labels = list(labels or [])
    if not labels:
        return {key: None for key in CERTIFICATION_LABELS}
    label_set = set(labels)
    return {
        key: 100 if label_set.intersection(accepted) else 0
        for key, accepted in CERTIFICATION_LABELS.items()
    }
# certified labels -> cross-lens facet labels (so Discover can slice "Organic"/"Fair Trade" across everything)
LABEL_FOCUS = {'en:organic': 'Organic', 'en:eu-organic': 'Organic', 'en:usda-organic': 'Organic',
               'en:fairtrade': 'Fair Trade', 'en:fair-trade': 'Fair Trade', 'en:fairtrade-international': 'Fair Trade',
               'en:rainforest-alliance': 'Rainforest Alliance',
               'en:vegan': 'Vegan', 'en:vegetarian': 'Vegetarian', 'en:gluten-free': 'Gluten-free',
               'en:no-added-sugar': 'No added sugar', 'en:palm-oil-free': 'Palm-oil-free'}

# OFF's structured allergen tags → our groups (curated & multilingual = primary).
SAFETY_ALLERGENS = (
    'gluten', 'crustaceans', 'eggs', 'fish', 'peanut', 'soy', 'milk', 'nuts',
    'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs', 'lactose'
)
TAG_MAP = {
    'en:gluten': 'gluten', 'en:crustaceans': 'crustaceans', 'en:eggs': 'eggs',
    'en:fish': 'fish', 'en:peanuts': 'peanut', 'en:soybeans': 'soy',
    'en:soya': 'soy', 'en:soy': 'soy', 'en:milk': 'milk', 'en:nuts': 'nuts',
    'en:tree-nuts': 'nuts', 'en:celery': 'celery', 'en:mustard': 'mustard',
    'en:sesame-seeds': 'sesame', 'en:sesame': 'sesame',
    'en:sulphur-dioxide-and-sulphites': 'sulphites', 'en:sulfites': 'sulphites',
    'en:sulphites': 'sulphites', 'en:lupin': 'lupin',
    'en:molluscs': 'molluscs', 'en:lactose': 'lactose'
}
FREE_LABEL_MAP = {
    'gluten': {'en:gluten-free', 'en:no-gluten', 'en:certified-gluten-free',
               'en:dzg-gluten-free', 'en:gfco-gluten-free', 'en:beyond-celiac-gluten-free',
               'en:cert-tm-gluten-free', 'en:sans-gluten', 'it:sin-gluten',
               'nl:glutenvrij', 'fr:glutenfrei', 'en:free-from-dairy-and-gluten'},
    'crustaceans': {'en:crustacean-free', 'en:crustaceans-free', 'en:no-crustaceans'},
    'eggs': {'en:egg-free', 'en:eggs-free', 'en:no-eggs'}, 'fish': {'en:fish-free', 'en:no-fish'},
    'peanut': {'en:peanut-free', 'en:peanuts-free', 'en:no-peanuts'},
    'soy': {'en:soy-free', 'en:soya-free', 'en:soybean-free', 'en:no-soybeans'},
    'milk': {'en:milk-free', 'en:dairy-free', 'en:no-milk', 'en:free-from-dairy-and-gluten'},
    'nuts': {'en:nut-free', 'en:nuts-free', 'en:no-nuts'},
    'celery': {'en:celery-free', 'en:no-celery'}, 'mustard': {'en:mustard-free', 'en:no-mustard'},
    'sesame': {'en:sesame-free', 'en:no-sesame'},
    'sulphites': {'en:sulphite-free', 'en:sulphites-free', 'en:sulfite-free', 'en:sulfites-free',
                  'en:no-sulphites', 'en:no-sulfites', 'en:without-sulfites'},
    'lupin': {'en:lupin-free', 'en:no-lupin'},
    'molluscs': {'en:mollusc-free', 'en:molluscs-free', 'en:no-molluscs'},
    'lactose': {'en:lactose-free', 'en:no-lactose', 'en:sans-lactose',
                'fr:naturally-lactose-free', 'nl:lactosevrij'},
    'coconut': {'en:coconut-free', 'en:no-coconut'}
}
for _group in SAFETY_ALLERGENS[:-1]:
    FREE_LABEL_MAP[_group].update({'en:without-allergens', 'en:sans-allergenes'})
# Best-effort ingredient keywords (FALLBACK ONLY). 'oat'/'malt' deliberately NOT in
# gluten (oats are gluten-free); broadened across languages to cut false negatives.
ALLERGEN_KEYWORDS = {
    'nuts': ['almond', 'amande', 'mandel', 'mandorla', 'almendra', 'hazelnut', 'noisette',
             'haselnuss', 'nocciola', 'avellana', 'cashew', 'cajou', 'anacardo', 'walnut',
             'noce', 'pecan', 'pistachio', 'pistache', 'macadamia'],
    'peanut': ['peanut', 'peanuts', 'arachide', 'cacahuete', 'erdnuss'],
    'soy': ['soy', 'soya', 'soja', 'soybean', 'soybeans'],
    'gluten': ['wheat', 'blé', 'weizen', 'frumento', 'trigo', 'barley', 'orge', 'gerste',
               'rye', 'seigle', 'roggen', 'spelt', 'épeautre', 'dinkel', 'gluten'],
    'crustaceans': ['crustacean', 'crustaceans', 'shrimp', 'prawn', 'crab', 'lobster', 'crayfish'],
    'eggs': ['egg', 'eggs', 'œuf', 'oeuf', 'huevo', 'eier'],
    'fish': ['fish', 'cod', 'salmon', 'tuna', 'anchovy', 'sardine', 'haddock'],
    'milk': ['milk', 'lait', 'latte', 'milch'],
    'celery': ['celery', 'céleri', 'sellerie', 'apio'],
    'mustard': ['mustard', 'moutarde', 'senf', 'mostaza'],
    'sesame': ['sesame', 'sésame', 'sesam', 'ajonjolí'],
    'sulphites': ['sulphite', 'sulphites', 'sulfite', 'sulfites', 'sulphur dioxide', 'sulfur dioxide'],
    'lupin': ['lupin', 'lupine', 'lupini'],
    'molluscs': ['mollusc', 'molluscs', 'mollusk', 'mollusks', 'oyster', 'mussel', 'clam', 'squid'],
    'lactose': ['lactose'],
    'coconut': ['coconut', 'noix de coco', 'lait de coco', 'kokos', 'cocco'],
}
# Common free-from wording can appear inside ingredient descriptions. Remove only
# that wording for the relevant group before the fallback keyword scan; concrete
# ingredients such as "wheat flour" still count as declarations and still win
# over a contradictory free-from label.
FREE_FROM_PHRASES = {
    'gluten': ['gluten-free', 'gluten free', 'sans gluten', 'sin gluten', 'senza glutine', 'glutenvrij'],
    'lactose': ['lactose-free', 'lactose free', 'sans lactose', 'sin lactosa', 'senza lattosio', 'lactosevrij'],
    'milk': ['milk-free', 'milk free', 'dairy-free', 'dairy free', 'sans lait', 'sin leche'],
}
BASE_CRITERIA = [
    {'key': 'environment', 'label': 'Environment', 'source': 'Green-Score', 'tier': 'measured'},
    {'key': 'processing', 'label': 'Processing', 'source': 'NOVA', 'tier': 'measured'},
    {'key': 'nutrition_grade', 'label': 'Nutrition', 'source': 'Nutri-Score', 'tier': 'measured'},
    {'key': 'protein', 'label': 'Protein', 'source': 'OFF nutriments', 'tier': 'measured'},
    {'key': 'low_sugar', 'label': 'Low sugar', 'source': 'OFF nutriments', 'tier': 'measured'},
]
CRITERIA = BASE_CRITERIA + [
    {'key': 'ethics', 'label': 'Ethics', 'source': 'certified labels', 'tier': 'certified'},
]
CERTIFICATION_CRITERIA = BASE_CRITERIA + [
    {'key': 'organic', 'label': 'Organic certification', 'source': 'OFF labels', 'tier': 'certified'},
    {'key': 'fair_trade', 'label': 'Fair-trade certification', 'source': 'OFF labels', 'tier': 'certified'},
    {'key': 'rainforest_alliance', 'label': 'Rainforest Alliance certification',
     'source': 'OFF labels', 'tier': 'certified'},
]
ASOF = '2026'

# OFF category searches can contain records whose more specific identity belongs
# to another aisle. These three measured leaks are strict by design: when the
# cached row has no category tags, its own name must place it in the category.
# A known cross-category name always wins over a broad parent tag.
CATEGORY_MEMBERSHIP = {
    'spices-seasoning': {
        'tags': {'en:spices', 'en:seasonings', 'en:herbs-and-spices'},
        'name': re.compile(
            r'\b(?:spices?|seasonings?|assaisonn\w*|herbs?|herbes?|salt|sel|salz|sale|sal|'
            r'pepper|poivre|pfeffer|pimienta|garlic|ail|ajo|knoblauch|paprika|curry|cumin|'
            r'coriand\w*|oregano|origan|thyme|thym|rosemary|romarin|basil\w*|parsley|persil|'
            r'cinnamon|cannelle|canela|zimt|turmeric|curcuma|ginger|gingembre|nutmeg|muscade|'
            r'cloves?|girofle|vanilla|vanille|chilli?|piment|cayenne|saffron|safran|tarragon|'
            r'estragon|anise?|anis|cardamom\w*|fenugreek|fennel|fenouil|dill|aneth|herbamare)\b'
        ),
        'reject': re.compile(
            r'\b(?:houmous|hummus|pesto|mayonnaise|ketchup|mustard|moutard\w*|vinaigre|'
            r'vinegar|passata|tomat\w*|coulis|pizza|pasta(?:saus|sauce)|bouillon|levure|'
            r'yeast|sauce|soja|soy|chickpeas?|chips?)\b|\bpois\s+chiches\b|'
            r'\bzero\s+sel\b|\bsel\s+ajout\w*\b'
        ),
    },
    'fruit-jam': {
        'tags': {'en:fruit-jams', 'en:strawberry-jams', 'en:jams'},
        'name': re.compile(r'\b(?:jams?|confiture|marmalade|marmellata|doce|fruit\s+spread|preserves?)\b'),
        'reject': re.compile(r'\b(?:tomat\w*|houmous|hummus)\b'),
    },
    'honey': {
        'tags': {'en:honeys'},
        'name': re.compile(r'\b(?:honey|miel|honig|miele|mel|miod|med|mez)\b'),
        'reject': re.compile(r'\b(?:houmous|hummus|barrette|granola|cereal|snack\s+bar)\b'),
    },
    # Part 9's five-sample continuation stays deliberately narrow: each rule
    # removes an observed sibling-category identity that reached a decision's
    # top results. Unlike the three strict guards above, these do not claim to
    # define the whole category; unrecognised names keep their prior treatment.
    'pasta-sauce': {
        'strictPlacement': False,
        'reject': re.compile(r'\b(?:oats?|avoine|avena|hafer)\b'),
    },
    'fruit-juice': {
        'strictPlacement': False,
        'reject': re.compile(r'\b(?:soy|soya|soja)\b'),
    },
    'butter': {
        'strictPlacement': False,
        'reject': re.compile(r'\b(?:peanuts?|arachid\w*|amendoim|erdnuss\w*)\b'),
    },
    'cereal-bars': {
        'strictPlacement': False,
        'reject': re.compile(
            r'^(?:flocons?\s+d[\' ]avoine|corn\s+flakes?(?:\s+bio)?|'
            r'muesli\s+fruits\s+et\s+noixraisins,\s*noisettes,\s*noix\s+de\s+coco|'
            r'muesli\s+croustillant\s+chocolat)$'
        ),
    },
    'dried-fruit': {
        'strictPlacement': False,
        'reject': re.compile(
            r'^(?!.*\b(?:dates?|fruits?|raisins?|cranberr\w*|goji|coco)\b).*'
            r'\b(?:peanuts?|arachid\w*|amendoim|erdnuss\w*)\b'
        ),
    },
}


def _category_text(value):
    """Case-fold and remove accents so category evidence is stable across languages."""
    normalized = unicodedata.normalize('NFKD', str(value or '')).casefold()
    return ''.join(char for char in normalized if not unicodedata.combining(char))


def product_belongs_to_category(product, category):
    """Return True unless a guarded category lacks affirmative name/tag evidence."""
    contract = CATEGORY_MEMBERSHIP.get(category)
    if not contract:
        return True
    name = _category_text(product.get('product_name'))
    if contract['reject'].search(name):
        return False
    if contract.get('strictPlacement') is False:
        return True
    tags = {_category_text(tag) for tag in (product.get('categories_tags') or [])}
    return bool(tags.intersection(contract['tags']) or contract['name'].search(name))


def product_url(code):
    return 'https://world.openfoodfacts.org/product/' + str(code or '')


def source_note(note, source):
    return {'note': note, 'source': source, 'asof': ASOF}


def entry_description(name, brand):
    maker = brand or 'an unlisted brand'
    return f'{name[:60]} from {maker[:30]}, scored from Open Food Facts nutrition, ingredient, label and impact data.'


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def detect_allergens(text):
    """Best-effort ingredient declaration scan with token boundaries."""
    t = (text or '').lower()
    def group_text(group):
        value = t
        for phrase in FREE_FROM_PHRASES.get(group, []):
            value = re.sub(r'(?<!\w)' + re.escape(phrase) + r'(?!\w)', ' ', value, flags=re.UNICODE)
        return value
    def hit(keyword, value):
        return re.search(r'(?<!\w)' + re.escape(keyword) + r'(?!\w)', value, flags=re.UNICODE) is not None
    return sorted(g for g, ks in ALLERGEN_KEYWORDS.items() if any(hit(k, group_text(g)) for k in ks))


def allergen_evidence(p):
    """Return compact evidence for the three safety states.

    A consumer derives one of exactly three states for any allergen: a member of
    `declares` declares X; a member of `declaredFree` is declared X-free; every
    other case is no data — check the label. Absence from an allergen list is
    never upgraded into a free claim.
    """
    tags = {str(tag).lower() for tag in (p.get('allergens_tags') or []) + (p.get('traces_tags') or [])}
    declares = {TAG_MAP[t] for t in tags if t in TAG_MAP}
    declares.update(detect_allergens(p.get('ingredients_text')))
    labels = {str(tag).lower() for tag in (p.get('labels_tags') or [])}
    declared_free = {group for group, claims in FREE_LABEL_MAP.items() if labels.intersection(claims)}
    declared_free.difference_update(declares)
    return {'declares': sorted(declares), 'declaredFree': sorted(declared_free)}


def allergen_info(p):
    """Return (allergens:list, declared:bool).

    Primary source = OFF's curated allergens_tags/traces_tags. If a product has no
    declared allergen data, fall back to the ingredient keyword scan and mark it
    NOT declared, so the UI can present it honestly as 'data unavailable'.
    """
    evidence = allergen_evidence(p)
    return evidence['declares'], bool(p.get('allergens_tags'))


def _protein_score(g):
    """Absolute: 0 g/100 g → 0, 8 g/100 g → 100 (stable across refreshes)."""
    return None if g is None else min(100, round(g * 12.5))


def _low_sugar_score(g):
    """Absolute: 0 g sugar → 100, 25 g → 0."""
    return None if g is None else max(0, min(100, round(100 - g * 4)))


def score_category(raw, split_certifications=False):
    """raw: list of OFF product dicts → list of scored product records."""
    out = []
    for p in raw:
        name = (p.get('product_name') or '').strip()
        if not name:
            continue
        nutr = p.get('nutriments') or {}
        eco = p.get('ecoscore_grade') or p.get('environmental_score_grade')
        eg = ((eco if eco not in (None, 'unknown', 'not-applicable') else '') or '').lower()
        g = (p.get('nutriscore_grade') or '').lower()
        nova = p.get('nova_group')
        protein, sugar = _num(nutr.get('proteins_100g')), _num(nutr.get('sugars_100g'))
        labels = p.get('labels_tags') or []
        n_eth = sum(1 for l in labels if l in ETHICAL)
        scores = {
            'environment': GRADE.get(eg),
            'processing': NOVA.get(nova) if isinstance(nova, int) else None,
            'nutrition_grade': GRADE.get(g),
            'protein': _protein_score(protein),
            'low_sugar': _low_sugar_score(sugar),
        }
        if split_certifications:
            scores.update(certification_scores(labels))
        else:
            scores['ethics'] = min(100, n_eth * 50) if labels else None
        # The three split certification facts all come from one OFF labels field.
        # Count that field once for roster admission so splitting it cannot pad a
        # category with label-only records that the collapsed scorer rejected.
        known_for_admission = sum(scores[key] is not None for key in (
            'environment', 'processing', 'nutrition_grade', 'protein', 'low_sugar'
        ))
        known_for_admission += int(any(scores[key] is not None for key in CERTIFICATION_LABELS)) if split_certifications else int(scores['ethics'] is not None)
        if known_for_admission < 2:
            continue
        source = product_url(p.get('code'))
        prov = {}
        if scores['environment'] is not None:
            prov['environment'] = source_note(f'Open Food Facts reports Green-Score {eg.upper()}.', source)
        if scores['processing'] is not None:
            prov['processing'] = source_note(f'Open Food Facts reports NOVA group {nova}.', source)
        if scores['nutrition_grade'] is not None:
            prov['nutrition_grade'] = source_note(f'Open Food Facts reports Nutri-Score {g.upper()}.', source)
        if scores['protein'] is not None:
            prov['protein'] = source_note(f'Open Food Facts nutriments report {protein:.1f} g protein per 100 g.', source)
        if scores['low_sugar'] is not None:
            prov['low_sugar'] = source_note(f'Open Food Facts nutriments report {sugar:.1f} g sugar per 100 g.', source)
        if not split_certifications and scores['ethics'] is not None:
            note = (f'Open Food Facts labels include {n_eth} organic, fair-trade or Rainforest Alliance tag(s).'
                    if n_eth else
                    'Open Food Facts labels are present, but none match the organic, fair-trade or Rainforest Alliance set.')
            prov['ethics'] = source_note(note, source)
        if split_certifications:
            for key, accepted in CERTIFICATION_LABELS.items():
                if scores[key] is None:
                    continue
                description = CERTIFICATION_NOTES[key]
                note = (f'Open Food Facts labels include {description}.'
                        if set(labels).intersection(accepted)
                        else f'Open Food Facts labels are present, but none match {description}.')
                prov[key] = source_note(note, source)
        evidence = allergen_evidence(p)
        allergens, declared = evidence['declares'], bool(p.get('allergens_tags'))
        focuses = {LABEL_FOCUS[l] for l in labels if l in LABEL_FOCUS}
        if split_certifications:
            label_set = set(labels)
            if label_set.intersection(ORGANIC_LABELS):
                focuses.add('Organic')
            if label_set.intersection(FAIR_TRADE_LABELS):
                focuses.add('Fair Trade')
            if label_set.intersection(RAINFOREST_ALLIANCE_LABELS):
                focuses.add('Rainforest Alliance')
        focuses = sorted(focuses)
        brand = (p.get('brands') or '').split(',')[0][:30]
        rec = {'code': p.get('code'), 'name': name[:60],
               'brand': brand,
               'description': entry_description(name, brand),
               'scores': scores, 'allergens': allergens, 'allergensDeclared': declared,
               'allergenEvidence': evidence,
               'provenance': prov,
               'links': [{'label': 'Open Food Facts', 'url': source}],
               'region': ['global']}
        if focuses:
            rec['focuses'] = focuses
        out.append(rec)
    return out
