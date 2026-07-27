"""Ontology maturation: preserve the v3 domain tree and add the v4 needs layer.

WHAT IT DOES (and does NOT do):
  - Preserves every live `cid`, facet, domain, group, type, and legacy route field.
  - Adds one `need` id to every live and growing category row, plus the eight-item needs registry.
  - Keeps the domain tree as a compatibility index while making needs the human entry layer.
  - Retains the v3 maturation rules for groups and the honest growing frontier.
  - Fabricates NO scored data. Every addition is honestly "growing" (no cid) — the navigable map of where
    the commons is going. Turning a growing branch into a live one (a sourced lens) is Codex's content lane.

Idempotent: re-running yields the same file (dup-guarded adds, version/note/order are set, not appended).
Not part of the build; run manually when the ontology's *shape* changes. After running: rebuild with
`python pipeline/build_datasets.py`.
"""
import json, os
from tracked_io import write_json

HERE = os.path.dirname(os.path.abspath(__file__))
ONT = os.path.normpath(os.path.join(HERE, '..', 'content', 'ontology.json'))
ont = json.load(open(ONT, encoding='utf-8'))

# snapshot original live (cid, facet) pairs for the preservation guard
orig = {(c['cid'], c.get('facet')) for d in ont['domains'] for c in d['categories'] if c.get('cid')}
dom = {d['label']: d for d in ont['domains']}

NEEDS = [
    {
        'id': 'nourish',
        'label': 'NOURISH',
        'reads': 'Food and drink for ordinary meals, shared tables, and the days in between.',
    },
    {
        'id': 'care',
        'label': 'CARE',
        'reads': 'What touches bodies, clothing, children, pets, and everyday wellbeing.',
    },
    {
        'id': 'keep-a-home',
        'label': 'KEEP A HOME',
        'reads': 'Cleaning, energy, water, tools, and the things that make a place work.',
    },
    {
        'id': 'connect',
        'label': 'CONNECT',
        'reads': 'Devices and services that help people reach each other and the wider world.',
    },
    {
        'id': 'move',
        'label': 'MOVE',
        'reads': 'The choices that carry people, belongings, and journeys.',
    },
    {
        'id': 'learn',
        'label': 'LEARN',
        'reads': 'Resources, media, and tools for understanding, making, and staying informed.',
        'illustrative': [
            {
                'id': 'kosplora',
                'label': 'Kosplora',
                'kind': 'instance',
                'href': '/kosplora/',
                'status': 'illustrative',
            },
        ],
    },
    {
        'id': 'give-and-act',
        'label': 'GIVE & ACT',
        'reads': 'Ways to support people, causes, and organizations with money, time, or voice.',
        'surfaces': [
            {
                'id': 'mutual-aid-board',
                'label': 'Mutual aid board',
                'kind': 'board',
                'category': 'causes-to-support',
                'status': 'starter-patterns',
            },
        ],
    },
    {
        'id': 'protect',
        'label': 'PROTECT',
        'reads': 'Money, privacy, security, and the systems that guard what matters.',
    },
]

DOMAIN_NEEDS = {
    'Food & drink': 'nourish',
    'Home': 'keep-a-home',
    'Personal care': 'care',
    'Health & wellness': 'care',
    'Clothing': 'care',
    'Tech & digital': 'connect',
    'Money': 'protect',
    'Transport & mobility': 'move',
    'Energy & connectivity': 'keep-a-home',
    'Travel & leisure': 'move',
    'Learning & media': 'learn',
    'Kids & family': 'care',
    'Pets': 'care',
    'Garden & outdoors': 'keep-a-home',
    'Giving & causes': 'give-and-act',
    'Companies & makers': 'give-and-act',
}

CATEGORY_NEED_OVERRIDES = {
    ('Clothing', 'Shoes'): 'move',
    ('Clothing', 'Activewear'): 'move',
    ('Clothing', 'Bags & backpacks'): 'move',
    ('Tech & digital', 'AI assistants'): 'learn',
    ('Tech & digital', 'E-readers'): 'learn',
    ('Tech & digital', 'Password managers'): 'protect',
    ('Tech & digital', 'VPNs'): 'protect',
    ('Tech & digital', 'Smart home'): 'keep-a-home',
    ('Tech & digital', 'Authenticator / 2FA apps'): 'protect',
    ('Energy & connectivity', 'Broadband & internet'): 'connect',
    ('Energy & connectivity', 'Mobile carriers'): 'connect',
    ('Kids & family', 'School supplies'): 'learn',
    ('Garden & outdoors', 'Camping gear'): 'move',
    ('Garden & outdoors', 'Hiking equipment'): 'move',
}


def need_for(domain, category):
    key = (domain, category['label'])
    need = CATEGORY_NEED_OVERRIDES.get(key, DOMAIN_NEEDS.get(domain))
    assert need, f"No need mapping for {domain} / {category['label']}"
    return need

# 1) Give flat live categories a `group`, so every domain reads as a consistent domain -> group -> category
#    tree (Food & Personal care are already grouped; we leave their categories untouched).
GROUPS = {
    'phones': 'Devices', 'laptops': 'Devices',
    'ai-assistants': 'AI & assistants',
    'vpn': 'Privacy & security', 'password-managers': 'Privacy & security',
    'books': 'Read', 'music-streaming': 'Listen', 'learning-resources': 'Learn', 'news-sources': 'Stay informed',
    'banking': 'Bank & spend', 'payments': 'Bank & spend', 'investing': 'Grow & protect',
    'cleaning-products': 'Clean & care', 'laundry': 'Clean & care', 'paper-goods': 'Clean & care',
    'clothing': 'Wear', 'shoes': 'Footwear',
    'mission-businesses': "By how they're run",
    'causes-to-support': 'Give money',
}
for d in ont['domains']:
    for c in d['categories']:
        cid = c.get('cid')
        if cid and 'group' not in c:
            if cid == 'digital-services':
                c['group'] = 'Digital services'          # the faceted service hub
            elif cid in GROUPS:
                c['group'] = GROUPS[cid]

# 2) Growing categories added to EXISTING domains (label, type, group). Disciplined: only categories where
#    values-based choice genuinely matters; not every SKU. Grouped to slot into the right shelf when built.
GROWING = {
    'Food & drink': [
        ('Meat & poultry', 'Products', 'Protein & mains'),
        ('Fish & seafood', 'Products', 'Protein & mains'),
        ('Flour & baking', 'Products', 'Pantry & cooking'),
        ('Spices & seasonings', 'Products', 'Pantry & cooking'),
        ('Bottled water', 'Products', 'Drinks'),
        ('Wine', 'Products', 'Beer, wine & spirits'),
        ('Beer', 'Products', 'Beer, wine & spirits'),
        ('Spirits', 'Products', 'Beer, wine & spirits'),
    ],
    'Personal care': [
        ('Make-up & cosmetics', 'Products', 'Make-up'),
        ('Nail care', 'Products', 'Make-up'),
        ('Fragrance & perfume', 'Products', 'Fragrance'),
        ('Hair styling', 'Products', 'Hair'),
    ],
    'Tech & digital': [
        ('Tablets', 'Products', 'Devices'),
        ('Smartwatches & wearables', 'Products', 'Devices'),
        ('Headphones & earbuds', 'Products', 'Devices'),
        ('TVs', 'Products', 'Devices'),
        ('E-readers', 'Products', 'Devices'),
        ('Game consoles', 'Products', 'Devices'),
        ('Cameras', 'Products', 'Devices'),
        ('Smart home', 'Products', 'Devices'),
        ('Authenticator / 2FA apps', 'Services', 'Privacy & security'),
    ],
    'Learning & media': [
        ('Video streaming', 'Services', 'Watch'),
        ('Audiobooks', 'Services', 'Listen'),
        ('Online courses', 'Services', 'Learn'),
        ('Language learning', 'Services', 'Learn'),
    ],
    'Money': [
        ('Credit cards', 'Services', 'Bank & spend'),
        ('Money transfer & remittance', 'Services', 'Bank & spend'),
        ('Pensions', 'Services', 'Grow & protect'),
        ('Insurance', 'Services', 'Grow & protect'),
        ('Budgeting apps', 'Services', 'Grow & protect'),
        ('Loans & mortgages', 'Services', 'Grow & protect'),
        ('Crypto exchanges', 'Services', 'Grow & protect'),
    ],
    'Home': [
        ('Dish soap', 'Products', 'Clean & care'),
        ('Cookware & pans', 'Products', 'Kitchen'),
        ('Food storage', 'Products', 'Kitchen'),
        ('Water filters', 'Products', 'Kitchen'),
        ('Furniture', 'Products', 'Furnish'),
        ('Mattresses', 'Products', 'Furnish'),
        ('Bedding & linens', 'Products', 'Furnish'),
        ('Lighting', 'Products', 'Furnish'),
        ('Major appliances', 'Products', 'Appliances'),
        ('Vacuum cleaners', 'Products', 'Appliances'),
        ('Tools & DIY', 'Products', 'Improve & maintain'),
    ],
    'Clothing': [
        ('Activewear', 'Products', 'Wear'),
        ('Outerwear & coats', 'Products', 'Wear'),
        ('Underwear & socks', 'Products', 'Wear'),
        ('Bags & backpacks', 'Products', 'Accessories'),
        ('Jewellery & watches', 'Products', 'Accessories'),
        ('Secondhand & resale', 'Services', 'Pre-loved & repair'),
        ('Repair & tailoring', 'Services', 'Pre-loved & repair'),
    ],
    'Companies & makers': [
        ('B Corporations', 'Organizations', "By how they're run"),
        ('Co-operatives', 'Organizations', "By how they're run"),
        ('Worker-owned', 'Organizations', "By how they're run"),
        ('Local independents', 'Organizations', "By how they're run"),
    ],
    'Giving & causes': [
        ('Charities by cause', 'Initiatives', 'Give money'),
        ('Effective giving', 'Initiatives', 'Give money'),
        ('Mutual aid funds', 'Initiatives', 'Give money'),
        ('Volunteering', 'Initiatives', 'Give time & voice'),
        ('Petitions & campaigns', 'Initiatives', 'Give time & voice'),
        ('Ethical gifts', 'Products', 'Give money'),
    ],
}
for dl, items in GROWING.items():
    cats = dom[dl]['categories']
    have = {c['label'] for c in cats}
    for (label, typ, group) in items:
        if label not in have:
            cats.append({'label': label, 'type': typ, 'group': group})

# 3) New life-domains (all growing) — the major areas of consumer life that were entirely absent.
NEW_DOMAINS = [
    ('Health & wellness', [
        ('Vitamins & supplements', 'Products', 'Remedies & supplements'),
        ('Over-the-counter medicine', 'Products', 'Remedies & supplements'),
        ('First aid', 'Products', 'Remedies & supplements'),
        ('Fitness equipment', 'Products', 'Body & fitness'),
        ('Sports nutrition', 'Products', 'Body & fitness'),
        ('Mental-health apps', 'Services', 'Mind & sleep'),
        ('Meditation apps', 'Services', 'Mind & sleep'),
        ('Contraception', 'Products', 'Sexual & reproductive health'),
        ('Glasses & contact lenses', 'Products', 'Eyes & teeth'),
    ]),
    ('Transport & mobility', [
        ('Cars', 'Products', 'Cars'),
        ('Electric vehicles', 'Products', 'Cars'),
        ('Used cars', 'Products', 'Cars'),
        ('Tyres', 'Products', 'Cars'),
        ('Bicycles', 'Products', 'Bikes & micromobility'),
        ('E-bikes', 'Products', 'Bikes & micromobility'),
        ('Ride-hailing', 'Services', 'Get around'),
        ('Public transit', 'Services', 'Get around'),
    ]),
    ('Energy & connectivity', [
        ('Electricity & green tariffs', 'Services', 'Home energy'),
        ('Gas suppliers', 'Services', 'Home energy'),
        ('Solar panels', 'Products', 'Home energy'),
        ('Heat pumps', 'Products', 'Home energy'),
        ('Smart thermostats', 'Products', 'Home energy'),
        ('Broadband & internet', 'Services', 'Connect'),
        ('Mobile carriers', 'Services', 'Connect'),
        ('Water suppliers', 'Services', 'Water'),
    ]),
    ('Travel & leisure', [
        ('Airlines', 'Services', 'Get there'),
        ('Hotels', 'Services', 'Stay'),
        ('Vacation rentals', 'Services', 'Stay'),
        ('Booking platforms', 'Services', 'Stay'),
        ('Tours & activities', 'Services', 'Experience'),
        ('Cruises', 'Services', 'Experience'),
        ('Luggage', 'Products', 'Gear'),
    ]),
    ('Kids & family', [
        ('Diapers & nappies', 'Products', 'Baby'),
        ('Baby food & formula', 'Products', 'Baby'),
        ('Baby wipes', 'Products', 'Baby'),
        ('Car seats', 'Products', 'Baby'),
        ('Strollers & pushchairs', 'Products', 'Baby'),
        ('Toys', 'Products', 'Children'),
        ("Kids' clothing", 'Products', 'Children'),
        ('School supplies', 'Products', 'Children'),
        ('Childcare', 'Services', 'Care'),
    ]),
    ('Pets', [
        ('Dog food', 'Products', 'Feed'),
        ('Cat food', 'Products', 'Feed'),
        ('Pet supplies', 'Products', 'Care'),
        ('Flea & worming', 'Products', 'Care'),
        ('Pet insurance', 'Services', 'Care'),
        ('Vet services', 'Services', 'Care'),
        ('Adoption & rescue', 'Initiatives', 'Adopt'),
    ]),
    ('Garden & outdoors', [
        ('Plants & seeds', 'Products', 'Grow'),
        ('Compost & soil', 'Products', 'Grow'),
        ('Garden tools', 'Products', 'Grow'),
        ('Garden furniture', 'Products', 'Outdoor living'),
        ('Camping gear', 'Products', 'Adventure'),
        ('Hiking equipment', 'Products', 'Adventure'),
    ]),
]
for label, items in NEW_DOMAINS:
    if label not in dom:
        obj = {'label': label, 'categories': [{'label': l, 'type': t, 'group': g} for (l, t, g) in items]}
        ont['domains'].append(obj)
        dom[label] = obj

# 4) Order domains by closeness to daily life (presentation order across home/map/browse).
ORDER = ['Food & drink', 'Home', 'Personal care', 'Health & wellness', 'Clothing', 'Tech & digital',
         'Money', 'Transport & mobility', 'Energy & connectivity', 'Travel & leisure', 'Learning & media',
         'Kids & family', 'Pets', 'Garden & outdoors', 'Giving & causes', 'Companies & makers']
ont['domains'].sort(key=lambda d: ORDER.index(d['label']) if d['label'] in ORDER else 999)

# 5) Give every category row one need. Repeated facet rows for one cid must agree.
need_ids = {need['id'] for need in NEEDS}
cid_needs = {}
for domain in ont['domains']:
    for category in domain['categories']:
        category['need'] = need_for(domain['label'], category)
        assert category['need'] in need_ids
        if category.get('cid'):
            previous = cid_needs.setdefault(category['cid'], category['need'])
            assert previous == category['need'], f"Conflicting need mappings for {category['cid']}"

# 6) Stamp the schema/version + an honest compatibility note and stable root order.
note = ("Needs-first life coverage (v4). Eight human needs are the primary discovery layer; every live "
        "and growing category row maps to exactly one need. The complete v3 domain -> group -> category -> "
        "optional facet tree remains intact as a compatibility index, so existing #domain routes and domain/"
        "group/type fields keep working. A category with a 'cid' is LIVE; one without is honestly GROWING. "
        "See docs/ONTOLOGY.md.")
ont = {
    'version': 4,
    'note': note,
    'types': ont['types'],
    'needs': NEEDS,
    'domains': ont['domains'],
}

# Preservation guard: no live (cid, facet) may be lost.
final = {(c['cid'], c.get('facet')) for d in ont['domains'] for c in d['categories'] if c.get('cid')}
missing = orig - final
assert not missing, 'REFUSING TO WRITE — these live cids would be lost: ' + str(sorted(missing))

write_json(ONT, ont, ensure_ascii=False, indent=2)

ncat = sum(len(d['categories']) for d in ont['domains'])
nlive = len(final)
print(f"ontology v4 written: {len(ont['needs'])} needs | {len(ont['domains'])} domains | {ncat} categories "
      f"| {nlive} live | {ncat - nlive} growing")
print("live cids preserved:", len(orig), "->", len(orig & final), "(all)" if orig <= final else "(LOSS!)")
for d in ont['domains']:
    live = sum(1 for c in d['categories'] if c.get('cid'))
    print(f"  {d['label']:24} {len(d['categories']):3} cats  ({live} live, {len(d['categories'])-live} growing)")
