#!/usr/bin/env python3
"""Beauty scoring engine — for Open Beauty Facts personal-care products.

Personal care has no Nutri-Score; the conscious-consumption signals here are
ethical/clean attributes (vegan, palm-oil, cruelty-free, organic certs) plus how
much you can actually verify (transparency). Same non-negotiables as food scoring:
absolute signals, missing = absent (never scored 0), provenance on every score."""

CRITERIA = [
    {'key': 'transparency', 'label': 'Transparent', 'source': 'Open Beauty Facts', 'tier': 'measured'},
    {'key': 'vegan', 'label': 'Vegan', 'source': 'OBF ingredient analysis', 'tier': 'certified'},
    {'key': 'palm_oil', 'label': 'Palm-oil-free', 'source': 'OBF ingredient analysis', 'tier': 'measured'},
    {'key': 'organic', 'label': 'Organic / natural', 'source': 'certified labels', 'tier': 'certified'},
    {'key': 'cruelty_free', 'label': 'Cruelty-free', 'source': 'certified labels', 'tier': 'certified'},
]

ORGANIC_LABELS = {'en:organic', 'en:eu-organic', 'en:cosmos-organic', 'en:cosmos-natural',
                  'en:ecocert', 'en:natural', 'en:nature-et-progres', 'en:bdih', 'en:natrue'}
CRUELTY_LABELS = {'en:cruelty-free', 'en:not-tested-on-animals', 'en:leaping-bunny',
                  'en:peta-cruelty-free', 'en:peta-vegan-and-cruelty-free'}
ASOF = '2026'


def product_url(code):
    return 'https://world.openbeautyfacts.org/product/' + str(code or '')


def source_note(note, source):
    return {'note': note, 'source': source, 'asof': ASOF}


def entry_description(name, brand):
    maker = brand or 'an unlisted brand'
    return f'{name[:60]} from {maker[:30]}, scored from Open Beauty Facts ingredient analysis and label data.'


def score_beauty(raw):
    out = []
    for p in raw:
        name = (p.get('product_name') or '').strip()
        if not name:
            continue
        labels = set(p.get('labels_tags') or [])
        ia = set(p.get('ingredients_analysis_tags') or [])
        ing = (p.get('ingredients_text') or '').strip()

        vegan = 100 if ('en:vegan' in ia or 'en:vegan' in labels) else (0 if 'en:non-vegan' in ia else None)
        if 'en:palm-oil-free' in ia: palm = 100
        elif 'en:palm-oil' in ia: palm = 0
        elif 'en:may-contain-palm-oil' in ia: palm = 40
        else: palm = None
        n_org = len(labels & ORGANIC_LABELS)
        organic = min(100, n_org * 60) if n_org else None
        cruelty = 100 if (labels & CRUELTY_LABELS) else None
        transparency = ((60 if ing else 0) + (40 if labels else 0)) if (ing or labels) else None

        scores = {'transparency': transparency, 'vegan': vegan, 'palm_oil': palm,
                  'organic': organic, 'cruelty_free': cruelty}
        if sum(v is not None for v in scores.values()) < 2:
            continue
        source = product_url(p.get('code'))
        prov = {}
        if transparency is not None:
            note = ('Open Beauty Facts lists full ingredients' if ing else 'Open Beauty Facts lists labels only')
            if labels:
                note += ' and product labels'
            prov['transparency'] = source_note(note + '.', source)
        if vegan is not None:
            prov['vegan'] = source_note(
                'Open Beauty Facts ingredient analysis or labels indicate vegan.'
                if vegan == 100 else
                'Open Beauty Facts ingredient analysis flags this product as non-vegan.',
                source)
        if palm is not None:
            prov['palm_oil'] = source_note({
                100: 'Open Beauty Facts ingredient analysis indicates palm-oil-free.',
                0: 'Open Beauty Facts ingredient analysis flags palm oil.',
                40: 'Open Beauty Facts ingredient analysis flags possible palm oil.'
            }[palm], source)
        if organic is not None:
            prov['organic'] = source_note(f'Open Beauty Facts labels include {n_org} organic or natural certification tag(s).', source)
        if cruelty is not None:
            prov['cruelty_free'] = source_note('Open Beauty Facts labels include a cruelty-free or not-tested-on-animals tag.', source)
        focuses = []
        if transparency is not None and transparency >= 60: focuses.append('Transparent')
        if vegan == 100: focuses.append('Vegan')
        if cruelty == 100: focuses.append('Cruelty-free')
        if palm == 100: focuses.append('Palm-oil-free')
        if organic is not None and organic >= 60: focuses.append('Organic')
        if not focuses: focuses.append('Open data')
        brand = (p.get('brands') or '').split(',')[0][:30]
        rec = {'code': p.get('code'), 'name': name[:60],
               'brand': brand,
               'description': entry_description(name, brand),
               'scores': scores, 'allergens': [], 'allergensDeclared': True, 'provenance': prov,
               'links': [{'label': 'Open Beauty Facts', 'url': source}],
               'region': ['global'],
               'focuses': focuses}
        out.append(rec)
    return out


PRESETS = {
    'Balanced': {'w': {'transparency': 3, 'vegan': 3, 'palm_oil': 3, 'organic': 3, 'cruelty_free': 3}, 'x': []},
    'Cruelty-free & vegan': {'w': {'cruelty_free': 5, 'vegan': 4, 'organic': 2, 'transparency': 2, 'palm_oil': 1}, 'x': []},
    'Clean & natural': {'w': {'organic': 5, 'palm_oil': 3, 'vegan': 2, 'transparency': 2, 'cruelty_free': 1}, 'x': []},
    'Transparent': {'w': {'transparency': 5, 'vegan': 2, 'organic': 2, 'palm_oil': 1, 'cruelty_free': 1}, 'x': []},
}
