#!/usr/bin/env python3
"""
M-data: build the app's scored datasets from the LOCAL cache (no network).

Reads pipeline/raw/<id>.jsonl → scores via scoring.py → writes
app/data/<id>.json (one per category) + app/data/index.json (the catalogue).

Run: `python build_datasets.py`   (after fetch_raw.py or ingest_dump.py)
"""
from decimal import Decimal, ROUND_HALF_UP
import json, os, sys, re, subprocess
from copy import deepcopy
from urllib.parse import urlparse, quote
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import scoring
from tracked_io import write_json, write_text
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

RAW = os.path.join(HERE, 'raw')
DATA = os.path.normpath(os.path.join(HERE, '..', 'app', 'data'))
os.makedirs(DATA, exist_ok=True)
TOP_LEVEL_DATA_CONTRACT_FILES = {
    'asks-offers-index.json',
    'barcodes.json',
    'challenge-index.json',
    'design-tokens.json',
    'index.json',
    # Written by pipeline/build_presentation.js, not by this script. Whichever of the two ran
    # second decided whether the build lived: when the presentation package landed first, the
    # sweep below deleted it as an orphan and build_cards died on the missing file. An
    # intermittent break of that shape teaches a person to rerun until green rather than to look.
    'presentation.json',
    # Same shape, not yet written: pipeline/build_render_receipts.js stages it here once every
    # page kind renders. Listed now so the identical bug cannot arrive with it.
    'presentation-renders.json',
    'proposals.json',
    'pulse.json',
}
DECISIONS_PATH = os.path.normpath(os.path.join(HERE, '..', 'content', 'decisions.json'))
VALUE_EDITORIAL_PATH = os.path.normpath(os.path.join(HERE, '..', 'content', 'value-editorial.json'))
LABELS = {'plant-based-milk': 'Plant-based milk', 'milk': 'Milk', 'plant-based-yogurt': 'Plant-based yogurt',
          'eggs': 'Eggs', 'breakfast-cereal': 'Breakfast cereal', 'granola': 'Granola & muesli',
          'flour-baking': 'Flour & baking',
          'canned-fish': 'Canned tuna & fish', 'fish-seafood': 'Fish & seafood',
          'frozen-pizza': 'Frozen pizza', 'ready-meals': 'Ready meals', 'dried-fruit': 'Dried fruit',
          'spices-seasoning': 'Spices & seasonings'}
ATTR = 'Data © Open Food Facts contributors (ODbL)'
FOOD_PRESETS = {
    "Balanced": {"w": {"environment": 3, "processing": 3, "nutrition_grade": 3, "protein": 3, "low_sugar": 3, "ethics": 2}, "x": []},
    "Climate-first": {"w": {"environment": 5, "processing": 3, "nutrition_grade": 2, "protein": 1, "low_sugar": 1, "ethics": 2}, "x": []},
    "Most protein": {"w": {"protein": 5, "low_sugar": 2, "nutrition_grade": 2, "processing": 1, "environment": 1, "ethics": 1}, "x": []},
    "Nut-free family": {"w": {"nutrition_grade": 4, "processing": 3, "low_sugar": 3, "environment": 2, "protein": 2, "ethics": 1}, "x": ["nuts", "peanut"]},
    "Fewest additives": {"w": {"processing": 5, "low_sugar": 3, "nutrition_grade": 3, "ethics": 2, "environment": 2, "protein": 1}, "x": []},
}
CERTIFICATION_SPLIT_CATEGORIES = {'coffee', 'dark-chocolate', 'tea'}
S8_CERTIFICATION_THEMES = {
    'fair_trade': 'people',
    'rainforest_alliance': 'planet',
}

VALUE_PAGE_KEYS = (
    'organic', 'fair_trade', 'rainforest_alliance', 'vegan', 'palm_oil',
    'cruelty_free', 'privacy', 'openness', 'transparency', 'repairability',
    'longevity', 'durability', 'packaging', 'environment', 'accessibility',
)

VALUE_EDITORIAL_CLASSIFICATION_COPY = {
    'certification-scheme': {
        'label': 'Checked standard',
        'description': 'A named scheme with published rules and a checking process; its limits still matter.',
    },
    'label-family': {
        'label': 'Label family',
        'description': 'Several claims or programmes share this name, so the exact source must stay visible.',
    },
    'ingredient-analysis': {
        'label': 'Ingredient analysis',
        'description': 'A result inferred from listed ingredients or package data, with unknown kept as unknown.',
    },
    'assessed-value': {
        'label': 'Sourced assessment',
        'description': 'A category-relative reading of cited facts, not a certification or universal scale.',
    },
    'mixed-methods': {
        'label': 'Mixed evidence',
        'description': 'The evidence method changes by category, so numbers are meaningful only within a decision.',
    },
}

VALUE_EDITORIAL_SMOKE_KEYS = ('organic', 'vegan', 'palm_oil', 'privacy', 'environment')

def build_value_editorial_contract():
    if not os.path.isfile(VALUE_EDITORIAL_PATH):
        raise ValueError('content/value-editorial.json is required for the Q10 value-page contract')
    source = json.load(open(VALUE_EDITORIAL_PATH, encoding='utf-8'))
    required = source.get('requiredValues', [])
    entries = source.get('entries', {})
    pilots = source.get('pilotValues', [])
    if required != list(VALUE_PAGE_KEYS):
        raise ValueError('value editorial requiredValues must match the fifteen app value-page keys in order')
    if not set(pilots).issubset(entries):
        raise ValueError('value editorial pilotValues must remain present in the expanded entries')
    if len(pilots) != 5:
        raise ValueError('Q10 founder-review pilot must remain the five representative samples')
    if len(entries) != len(VALUE_PAGE_KEYS):
        raise ValueError('Q10 Part 4 must contain editorial for all fifteen value-page keys')
    allowed_classifications = {
        'certification-scheme',
        'assessed-value',
        'label-family',
        'ingredient-analysis',
        'mixed-methods',
    }
    for key, entry in entries.items():
        if entry.get('key') != key:
            raise ValueError(f'value editorial entry {key} must repeat its key')
        if entry.get('status') != 'ready-for-founder-review':
            raise ValueError(f'value editorial entry {key} is not ready for founder review')
        if entry.get('classification') not in allowed_classifications:
            raise ValueError(f'value editorial entry {key} has no supported evidence classification')
        if len(entry.get('sections', [])) != 4:
            raise ValueError(f'value editorial entry {key} must have exactly four concise sections')
    remaining = [key for key in VALUE_PAGE_KEYS if key not in entries]
    smoke_routes = []
    for key in VALUE_EDITORIAL_SMOKE_KEYS:
        entry = entries[key]
        smoke_routes.append({
            'key': key,
            'route': f'#value/{key}',
            'classification': entry['classification'],
            'sectionIds': [section['id'] for section in entry['sections']],
            'expectedClaimCount': sum(len(section['claims']) for section in entry['sections']),
            'requiredReceiptFields': ['sourceLabel', 'source', 'asOf'],
            'mustHideMissingEditorialCopy': True,
        })
    render_contract = {
        'format': 'q10-value-page-render-v1',
        'state': 'live-verified',
        'entryPath': 'CC_BUNDLE.index.valueEditorial.entries[key]',
        'eligibleStatus': 'ready-for-founder-review',
        'placement': {
            'after': '.value-head',
            'before': '.value-where',
            'headingLevel': 2,
        },
        'classificationCopy': VALUE_EDITORIAL_CLASSIFICATION_COPY,
        'rules': [
            'Preserve the computed value header, aliases, category count, and decision links.',
            'Show the classification label and description as evidence context, never as a virtue badge.',
            'Render sections in source order and every claim as prose followed by its visible source and as-of date.',
            'Use semantic sections and heading order; source links must remain keyboard reachable and understandable out of context.',
            'For an absent or ineligible entry, keep the existing value-honesty block and do not imply editorial exists.',
        ],
        'forbidden': [
            'Do not call label-family, ingredient-analysis, assessed-value, or mixed-methods entries certified.',
            'Do not compare category-relative scores across decisions.',
            'Do not hide source labels or dates behind hover, disclosure, or a second route.',
            'Do not remove the computed Where it lives section.',
        ],
        'smokeRoutes': smoke_routes,
        'walkMinutes': 2,
        'rendersLive': True,
        'verification': {
            'status': 'passed',
            'verifiedOn': '2026-07-18',
            'surface': 'local running app',
            'routesPassed': list(VALUE_EDITORIAL_SMOKE_KEYS),
            'assertions': [
                'Evidence classification and four editorial sections render before Where it lives.',
                'Every expected source label and checked date is visible and keyboard reachable.',
                'The honesty fallback is absent only when an eligible editorial entry renders.',
                'The 375px layout has one-column editorial cards and no horizontal overflow.',
                'The browser console has zero errors or warnings across the final walk.',
            ],
            'consoleErrors': 0,
        },
        'drainRule': 'Q10 drained after app/design implementation and the five-route running-app walk passed on 2026-07-18.',
    }
    return {
        'format': source.get('format'),
        'version': source.get('version'),
        'updated': source.get('updated'),
        'state': source.get('state'),
        'purpose': source.get('purpose'),
        'renderRule': source.get('renderRule'),
        'requiredValues': required,
        'pilotValues': pilots,
        'coverage': {
            'required': len(VALUE_PAGE_KEYS),
            'founderReviewPilot': len(pilots),
            'readyForFounderReview': len(entries),
            'remaining': len(remaining),
            'remainingValues': remaining,
            'appIntegration': 'live-verified',
            'rendersLive': True,
        },
        'renderContract': render_contract,
        'entries': entries,
    }

def food_presets(split_certifications=False):
    presets = deepcopy(FOOD_PRESETS)
    if not split_certifications:
        return presets
    for preset in presets.values():
        weights = preset.get('w', {})
        certification_weight = weights.pop('ethics', None)
        if certification_weight is not None:
            for key in scoring.CERTIFICATION_LABELS:
                weights[key] = certification_weight
    return presets

def certification_coverage(products):
    total = len(products)
    criteria = {}
    for key in scoring.CERTIFICATION_LABELS:
        known = sum(1 for product in products if product.get('scores', {}).get(key) is not None)
        positive = sum(1 for product in products if product.get('scores', {}).get(key) == 100)
        criteria[key] = {
            'known': known,
            'positive': positive,
            'knownCoverage': round(known / total, 4) if total else 0,
            'positiveCoverage': round(positive / total, 4) if total else 0,
        }
    return {
        'source': 'Open Food Facts labels',
        'asOf': scoring.ASOF,
        'entryCount': total,
        'missingRule': 'No labels means unknown (null); labels present without a matching certification tag means absent (0).',
        'criteria': criteria,
    }

def build_certification_scoring_contract():
    fixture_labels = [
        ('labels-missing', []),
        ('label-present-unmatched', ['en:vegan']),
        ('organic-variant', ['en:soil-association-organic']),
        ('fair-trade-variant', ['en:fair-for-life']),
        ('rainforest-alliance-variant', ['en:rainforest-alliance-tea']),
        ('combined-certifications', ['en:eu-organic', 'en:fairtrade-cocoa', 'en:rainforest-alliance-cocoa']),
    ]
    fixtures = []
    for fixture_id, labels in fixture_labels:
        expected = scoring.certification_scores(labels)
        fixtures.append({
            'id': fixture_id,
            'labels': labels,
            'expectedScores': expected,
            'knownFieldContribution': int(any(value is not None for value in expected.values())),
        })
    return {
        'status': 'h20-app-owned-certification-scoring-parity',
        'consumer': 'Claude H20 browser-side Open Food Facts scoring in app/app.js offScore and app/engine.js',
        'categories': sorted(CERTIFICATION_SPLIT_CATEGORIES),
        'criteria': [
            {
                'key': key,
                'acceptedTags': sorted(tags),
                'scoreWhenMatched': 100,
                'scoreWhenLabelsPresentWithoutMatch': 0,
            }
            for key, tags in scoring.CERTIFICATION_LABELS.items()
        ],
        'unknownScore': None,
        'missingRule': 'No labels means unknown (null); labels present without a matching certification tag means absent (0).',
        'admissionRule': 'The three certification facts come from one labels field and count once toward the two-field roster minimum.',
        'legacyRule': 'Open Food Facts categories outside coffee, dark-chocolate, and tea retain the collapsed ethics score.',
        'fixtures': fixtures,
        'appOwnedNext': 'Use this category-aware split in the live barcode scorer, map the three criteria in the browser engine, and keep H20 open until app-side parity is tested.',
        'h20DrainableFromDataAlone': False,
    }

FOOD_PRIMARY_AXIS = {
    "plant-based-milk": "environment",
    "milk": "protein",
    "plant-based-yogurt": "protein",
    # Open Food Facts does not provide usable protein coverage for this category.
    # Sourcing has both coverage and spread, so it can support an honest dial.
    "eggs": "ethics",
    "breakfast-cereal": "low_sugar",
    "granola": "low_sugar",
    "coffee": "fair_trade",
    "dark-chocolate": "fair_trade",
    "yogurt": "protein",
    "olive-oil": "environment",
    "plant-based-meat": "protein",
    "tea": "fair_trade",
    "nuts": "environment",
    "fruit-juice": "low_sugar",
    "ice-cream": "low_sugar",
    "biscuits": "low_sugar",
    "soda": "low_sugar",
    "fruit-jam": "low_sugar",
    "legumes": "protein",
    "tofu": "protein",
    "hummus": "protein",
    "canned-fish": "protein",
    "fish-seafood": "protein",
    "dried-fruit": "low_sugar",
    "cereal-bars": "low_sugar",
    "energy-drinks": "low_sugar",
    "ketchup": "low_sugar",
    "chocolate-spread": "low_sugar",
}
FOOD_TRADEOFF_LABEL = {
    "environment": "lowest-impact",
    "ethics": "best sourced",
    "fair_trade": "fair-trade certified",
    "low_sugar": "lowest sugar",
    "nutrition_grade": "healthiest",
    "protein": "most protein",
    "processing": "least processed",
}

def load_decision_registry():
    if not os.path.isfile(DECISIONS_PATH):
        return {'consumer': {}, 'contracts': []}
    with open(DECISIONS_PATH, encoding='utf-8') as source:
        registry = json.load(source)
    contracts = registry.get('contracts', [])
    ids = [contract.get('category') for contract in contracts]
    if any(not category for category in ids) or len(ids) != len(set(ids)):
        raise ValueError('content/decisions.json must use unique non-empty category ids')
    return registry

DECISION_REGISTRY = load_decision_registry()
DECISIONS_BY_CATEGORY = {
    contract['category']: contract for contract in DECISION_REGISTRY.get('contracts', [])
}

def attach_decision_contract(dataset):
    category = dataset.get('meta', {}).get('id')
    source = DECISIONS_BY_CATEGORY.get(category)
    if not source:
        return

    decision = deepcopy(source)
    decision['consumer'] = deepcopy(DECISION_REGISTRY.get('consumer', {}))
    products = dataset.get('products') or dataset.get('resources') or []
    spreads = []
    for basis in decision.get('reads', {}).get('basis', []):
        criterion = basis['criterion']
        values = [
            product.get('scores', {}).get(criterion)
            for product in products
            if isinstance(product.get('scores', {}).get(criterion), (int, float))
        ]
        # A decision read describes a difference. One surviving value, or many
        # identical values, provides coverage but no comparative spread and must
        # not be serialized as if it did.
        if len(set(values)) >= 2:
            minimum = min(values)
            maximum = max(values)
            spreads.append({
                'criterion': criterion,
                'readsAs': basis['readsAs'],
                'known': len(values),
                'minimum': minimum,
                'maximum': maximum,
                'spread': maximum - minimum
            })
    decision['reads']['receipt'] = {
        'dataset': category,
        'entryCount': len(products),
        'criteria': spreads
    }

    budget = decision.get('budget', {})
    if budget.get('available') and budget.get('criterion'):
        criterion = budget['criterion']
        known = sum(
            1 for product in products
            if isinstance(product.get('scores', {}).get(criterion), (int, float))
        )
        budget['knownEntries'] = known
        budget['coverage'] = round(known / len(products), 4) if products else 0
    else:
        budget['knownEntries'] = 0
        budget['coverage'] = 0

    dataset['meta']['decision'] = decision

INITIATIVE_SOURCE_ORDER = ("impact", "transparency", "ways_to_help", "openness", "longevity")
INITIATIVE_ACTION_LABELS = ("donate", "get involved", "take action", "ways to support", "sustainer", "website")
REGION_ENTRY_VALUES = ("US", "EU", "UK", "global")
REGION_FILTER_VALUES = ("everywhere", "US", "EU", "UK")
BLOOM_THEME_ORDER = ("planet", "people", "health", "honesty", "privacy", "animals", "cost", "local")
BLOOM_MIN_THEMES = 2
KEY2THEME = {
    "environment": "planet", "forest": "planet", "packaging": "planet", "palm_oil": "planet",
    "organic": "planet", "durability": "planet", "repairability": "planet", "longevity": "planet",
    "processing": "health", "nutrition_grade": "health", "protein": "health", "low_sugar": "health",
    "health": "health", "safety": "health",
    "ethics": "people", "labor": "people", "artist_pay": "people", "impact": "people",
    "ways_to_help": "people",
    "transparency": "honesty", "independence": "honesty", "nonprofit": "honesty",
    "certification": "honesty", "depth": "honesty",
    "privacy": "privacy", "openness": "privacy", "jurisdiction": "privacy", "security": "privacy",
    "vegan": "animals", "cruelty_free": "animals",
    "economical": "cost", "fees": "cost", "price": "cost", "accessibility": "cost",
    "catalog": "cost", "selection": "cost",
    "local": "local", "ownership": "local",
    "portability": "privacy", "respect": "privacy", "educational": "people", "calm": "health",
    # 2026-08-13. Six keys arrived with the swarm's first waves and carried no theme, so entries
    # scored only on them produced no value signature at all and could not be ranked by a reader's
    # values. No existing entry uses any of these, so mapping them can only add coverage; it cannot
    # move a ranking that already exists.
    #
    # "rewards" is money coming back to you, which is the cost theme read from the other end.
    # "complaints", "buyer_protection" and "damage_protection" are all one question: when something
    # goes wrong, who carries it, the company or the person. That is the people theme.
    #
    # "reliability" and "cancellations" are the debatable pair and are flagged for review. There is
    # no theme in this vocabulary for whether a service does what it said it would. Honesty is the
    # closest, on the reading that a published schedule an airline does not keep is a gap between
    # claim and delivery, but a reader looking at the honesty lens is probably thinking about
    # disclosure rather than punctuality. If that reading is wrong the fix is a new theme, which is
    # a decision about the reader-facing value vocabulary and belongs to a person.
    "rewards": "cost",
    "complaints": "people", "buyer_protection": "people", "damage_protection": "people",
    # 2026-08-13. Permanence is whether what you pay for stays there. A media lane reused
    # "ownership" for it to avoid the cost of a new key, which was thoughtful and wrong: that
    # key themes to local, so a measure of vanishing catalogues would have lit the local lens.
    # Honesty is the right home, on the same reading as reliability: a service that sells a
    # catalogue and then removes it has a gap between claim and delivery.
    "permanence": "honesty",
    "reliability": "honesty", "cancellations": "honesty",
}
COUNTRY_LEVEL_REGION_LIMITATIONS = {
    "payments": {
        "summary": "Several payment rails are country- or market-specific, but the current entry-region enum has no values outside US/EU/UK/global.",
        "entries": [
            ("upi", "India", "IN"),
            ("pix", "Brazil", "BR"),
            ("mpesa", "Kenya / supported M-PESA markets", "country-level"),
            ("interac-etransfer", "Canada", "CA"),
            ("payid-osko", "Australia", "AU"),
            ("paynow", "Singapore", "SG"),
            ("promptpay", "Thailand", "TH"),
            ("duitnow", "Malaysia", "MY"),
            ("twint", "Switzerland", "CH"),
            ("paytm", "India", "IN"),
            ("phonepe", "India", "IN"),
            ("mercado-pago", "Latin America", "regional-market"),
            ("mtn-momo", "MTN Mobile Money markets", "country-level"),
            ("airtel-money", "Airtel Money markets", "country-level"),
            ("wave-mobile-money", "Wave Mobile Money markets", "country-level"),
        ]
    }
}

SOURCE_DOMAIN_LABELS = {
    "world.openfoodfacts.org": "Open Food Facts",
    "openfoodfacts.org": "Open Food Facts",
    "prices.openfoodfacts.org": "Open Prices",
    "world.openbeautyfacts.org": "Open Beauty Facts",
    "openbeautyfacts.org": "Open Beauty Facts",
    "bcorporation.net": "B Lab",
    "github.com": "GitHub",
    "en.wikipedia.org": "Wikipedia",
    "wikipedia.org": "Wikipedia"
}
NAMING_APP_TARGETS = (
    {
        "id": "app-wordmark",
        "surface": "App wordmark and launcher text",
        "preferred": "Conscious Consuming",
        "avoid": "Values Commons as the single-app name"
    },
    {
        "id": "ecosystem-footer",
        "surface": "App footer and ecosystem link",
        "preferred": "Part of Values Commons",
        "avoid": "Conscious Consuming as the ecosystem umbrella"
    },
    {
        "id": "standard-link",
        "surface": "Methodology, source, and data-contract links",
        "preferred": "Built on the Open Values Standard",
        "avoid": "Values Commons Standard"
    },
    {
        "id": "public-home-route",
        "surface": "Public home and top-level routes",
        "preferred": "Values Commons",
        "avoid": "Making Conscious Consuming sound like the whole project"
    },
    {
        "id": "instance-explanation",
        "surface": "About, tour, and adoption copy",
        "preferred": "Conscious Consuming is the first working instance of Values Commons.",
        "avoid": "Calling the flagship app the protocol"
    }
)

NAMING_COPY_RULES = (
    {
        "id": "ecosystem",
        "name": "Values Commons",
        "useFor": "the public umbrella: home, funding, adoption, contribution, and the family of instances",
        "doNotUseFor": "the Conscious Consuming app by itself"
    },
    {
        "id": "standard",
        "name": "Open Values Standard",
        "useFor": "the formal protocol, schemas, lens format, passport, provenance, and conformance language",
        "doNotUseFor": "the public ecosystem or a single app surface"
    },
    {
        "id": "instance",
        "name": "Conscious Consuming",
        "useFor": "the flagship consumer-decision app and its category/verdict surfaces",
        "doNotUseFor": "the whole ecosystem, the standard, or future sister instances"
    },
    {
        "id": "commons-lowercase",
        "name": "the commons",
        "useFor": "plain-language references to the shared body of open data and corrections",
        "doNotUseFor": "the proper-name ecosystem unless capitalized as Values Commons"
    }
)

def initiative_source(entity):
    provenance = entity.get('provenance') or {}
    for key in INITIATIVE_SOURCE_ORDER:
        source = provenance.get(key)
        if isinstance(source, dict) and source.get('note') and source.get('source') and source.get('asof'):
            return dict(source)
    for source in provenance.values():
        if isinstance(source, dict) and source.get('note') and source.get('source') and source.get('asof'):
            return dict(source)
    return None

def source_domain(url):
    if not isinstance(url, str) or not url.strip():
        return None
    raw = url.strip()
    try:
        parsed = urlparse(raw if '://' in raw else 'https://' + raw)
    except Exception:
        return None
    host = (parsed.netloc or '').lower().split('@')[-1].split(':')[0]
    if host.startswith('www.'):
        host = host[4:]
    return host or None

def source_label(domain):
    if not domain:
        return None
    if domain in SOURCE_DOMAIN_LABELS:
        return SOURCE_DOMAIN_LABELS[domain]
    if domain.endswith('.openfoodfacts.org'):
        return 'Open Food Facts'
    if domain.endswith('.openbeautyfacts.org'):
        return 'Open Beauty Facts'
    if domain.endswith('.wikipedia.org'):
        return 'Wikipedia'
    return domain

def entity_provenance_summary(entity, criteria, category_source=None):
    scores = entity.get('scores') or {}
    provenance = entity.get('provenance') or {}
    domains = {}
    fact_count = 0
    note_only = 0

    for criterion in criteria or []:
        key = criterion.get('key')
        if key is None or scores.get(key) is None:
            continue
        fact_count += 1
        source = provenance.get(key)
        if isinstance(source, dict):
            domain = source_domain(source.get('source'))
            if domain:
                domains.setdefault(domain, {'label': source_label(domain), 'facts': 0})
                domains[domain]['facts'] += 1
            else:
                note_only += 1
        elif isinstance(source, str) and source.strip():
            note_only += 1
        else:
            note_only += 1

    source_rows = sorted(
        [{'domain': domain, 'label': info['label'] or domain, 'facts': info['facts']} for domain, info in domains.items()],
        key=lambda row: (-row['facts'], row['label'])
    )
    sourced = sum(row['facts'] for row in source_rows)
    summary = {
        'factCount': fact_count,
        'sourcedFactCount': sourced,
        'sourceDomainCount': len(source_rows),
        'singleSource': len(source_rows) == 1,
        'primarySource': source_rows[0]['label'] if source_rows else (category_source or 'unsourced note')
    }
    if note_only:
        summary['noteOnlyFactCount'] = note_only
    if len(source_rows) > 1:
        summary['sourceLabels'] = [row['label'] for row in source_rows[:6]]
    return summary

def value_signature(entity, key2theme):
    scores = entity.get('scores') or {}
    sums = {}
    counts = {}
    for key, raw in scores.items():
        if raw is None:
            continue
        theme = key2theme.get(key)
        if not theme:
            continue
        try:
            value = float(raw)
        except (TypeError, ValueError):
            continue
        if not (0 <= value <= 100):
            continue
        sums[theme] = sums.get(theme, 0.0) + value
        counts[theme] = counts.get(theme, 0) + 1
    signature = {}
    for theme in BLOOM_THEME_ORDER:
        if theme not in sums:
            continue
        mean = sums[theme] / counts[theme]
        rounded = round(mean, 2)
        signature[theme] = int(rounded) if rounded == int(rounded) else rounded
    return signature

def attach_value_signatures(ds):
    key2theme = dict(KEY2THEME)
    if isinstance(ds.get('key2theme'), dict):
        key2theme.update(ds.get('key2theme'))
    products = ds.get('products') or []
    signed = 0
    drawable = 0
    theme_counts = {}
    for entity in products:
        signature = value_signature(entity, key2theme)
        if signature:
            entity['valueSignature'] = signature
            signed += 1
            if len(signature) >= BLOOM_MIN_THEMES:
                drawable += 1
            for theme in signature:
                theme_counts[theme] = theme_counts.get(theme, 0) + 1
        else:
            entity.pop('valueSignature', None)
    ds.setdefault('meta', {})['valueSignatureProfile'] = {
        'entryCount': len(products),
        'signedEntries': signed,
        'drawableEntries': drawable,
        'minimumThemesForBloom': BLOOM_MIN_THEMES,
        'themeCounts': {theme: theme_counts[theme] for theme in BLOOM_THEME_ORDER if theme_counts.get(theme)}
    }
    return ds['meta']['valueSignatureProfile']

def attach_provenance_summaries(ds):
    criteria = ds.get('criteria') or []
    category_source = ds.get('meta', {}).get('source')
    primary_counts = {}
    source_domain_total = 0
    single_source = 0
    multi_source = 0
    no_source = 0
    note_only_entries = 0

    products = ds.get('products') or []
    for entity in products:
        summary = entity_provenance_summary(entity, criteria, category_source)
        entity['provenanceSummary'] = summary
        source_domain_total += summary['sourceDomainCount']
        primary_counts[summary['primarySource']] = primary_counts.get(summary['primarySource'], 0) + 1
        if summary.get('noteOnlyFactCount'):
            note_only_entries += 1
        if summary['sourceDomainCount'] == 0:
            no_source += 1
        elif summary['sourceDomainCount'] == 1:
            single_source += 1
        else:
            multi_source += 1

    profile = {
        'entryCount': len(products),
        'singleSourceEntries': single_source,
        'multiSourceEntries': multi_source,
        'noSourceEntries': no_source,
        'noteOnlyEntries': note_only_entries,
        # Round half AWAY FROM ZERO, not Python's default half-to-even. The audit that checks this
        # figure is written in JavaScript and rounds the other way, so a value landing exactly on a
        # half disagreed across the two languages: used-cars averages 2.125 domains, Python stored
        # 2.12, the audit expected 2.13, and a release was blocked by a hundredth. Matching JS here
        # is the smaller change and keeps the independent re-implementation independent.
        'averageSourceDomains': float(Decimal(str(source_domain_total / len(products)))
                                      .quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)) if products else 0,
        'topPrimarySources': [
            {'label': label, 'entries': count}
            for label, count in sorted(primary_counts.items(), key=lambda item: (-item[1], item[0]))[:6]
        ]
    }
    ds.setdefault('meta', {})['provenanceProfile'] = profile
    return profile

def initiative_action_link(entity):
    links = entity.get('links') or []
    if not links:
        return None
    for label in INITIATIVE_ACTION_LABELS:
        for link in links:
            if str(link.get('label', '')).strip().lower() == label and link.get('url'):
                return {'kind': 'url', 'label': link.get('label'), 'url': link.get('url')}
    for link in links:
        label = str(link.get('label', '')).strip().lower()
        if any(word in label for word in ('donate', 'support', 'action', 'involved')) and link.get('url'):
            return {'kind': 'url', 'label': link.get('label'), 'url': link.get('url')}
    first = links[0]
    if first.get('url'):
        return {'kind': 'url', 'label': first.get('label', 'Website'), 'url': first.get('url')}
    return None

def apply_initiatives_surface_contract(ds):
    if ds.get('meta', {}).get('id') != 'causes-to-support':
        return
    for entity in ds.get('products', []):
        source = initiative_source(entity)
        description = str(entity.get('description') or '').strip()
        if source and description:
            line = f"{entity.get('name')}: {description}"
            if line[-1] not in '.!?':
                line += '.'
            entity.setdefault('legitimacy', {'line': line, 'source': source})
        action = initiative_action_link(entity)
        if action:
            entity.setdefault('actPath', action)

def region_counts(products):
    counts = {}
    missing = 0
    unknown = {}
    for entity in products or []:
        regions = entity.get('region') or []
        if not regions:
            missing += 1
            continue
        for region in regions:
            counts[region] = counts.get(region, 0) + 1
            if region not in REGION_ENTRY_VALUES:
                unknown[region] = unknown.get(region, 0) + 1
    return counts, missing, unknown

def region_profile(cid, ds):
    products = ds.get('products', []) if ds else []
    counts, missing, unknown = region_counts(products)
    limitations = COUNTRY_LEVEL_REGION_LIMITATIONS.get(cid, {}).get('entries', [])
    ordered_counts = {region: counts[region] for region in REGION_ENTRY_VALUES if counts.get(region)}
    for region in sorted(k for k in counts if k not in REGION_ENTRY_VALUES):
        ordered_counts[region] = counts[region]
    return {
        "entryCount": len(products),
        "regionTagged": len(products) - missing,
        "missingRegion": missing,
        "values": ordered_counts,
        "filterValues": [region for region in REGION_FILTER_VALUES if region != "everywhere" and counts.get(region)],
        "globalEntries": counts.get("global", 0),
        "unknownRegionValues": unknown,
        "countryLevelNeeded": bool(limitations),
        "countryLevelLimitationCount": len(limitations),
        "strictCurrentEnumSafe": missing == 0 and not limitations and not unknown
    }

def build_region_decision_contract(index, bundle):
    categories_with_controls = [e['id'] for e in index if e.get('regionProfile', {}).get('filterValues')]
    limitation_rows = []
    missing_limitations = []
    for cid, spec in COUNTRY_LEVEL_REGION_LIMITATIONS.items():
        by_code = {p.get('code'): p for p in (bundle.get(cid, {}).get('products', []) or [])}
        for code, market, proposed_value in spec.get('entries', []):
            entity = by_code.get(code)
            if not entity:
                missing_limitations.append(f"{cid}:{code}")
                continue
            limitation_rows.append({
                "category": cid,
                "code": code,
                "name": entity.get('name', code),
                "market": market,
                "currentRegion": entity.get('region', []),
                "proposedRegionValue": proposed_value,
                "reason": "Current region enum cannot express this market without using global."
            })
    return {
        "status": "h1-app-owned-region-decision",
        "consumer": "Claude H1 region filter decision in app/app.js",
        "currentFilterValues": list(REGION_FILTER_VALUES),
        "currentEntryRegionValues": list(REGION_ENTRY_VALUES),
        "currentFilterRule": "When a selected region is active, app/app.js keeps entries tagged global visible alongside entries tagged for that region.",
        "recommendation": "Keep the current broad region filter for first presentation, but do not describe payments as strict country filtering until app-owned code adopts a country-level model or category-specific scope wording.",
        "appOwnedDecision": "Choose between broad US/EU/UK/global labels, hiding strict wording for payments, or adding country-level region values in app-owned code.",
        "categoriesWithRegionControls": categories_with_controls,
        "countryLevelLimitations": limitation_rows,
        "missingLimitationEntries": missing_limitations,
        "coverage": {
            "categoryCount": len(index),
            "categoriesWithRegionControls": len(categories_with_controls),
            "limitationCategories": len(COUNTRY_LEVEL_REGION_LIMITATIONS),
            "countryLevelLimitationEntries": len(limitation_rows),
            "missingLimitationEntries": len(missing_limitations)
        }
    }

def build_naming_contract(index):
    return {
        "status": "h3-app-owned-naming-ia-contract",
        "consumer": "Claude H3 naming/IA copy polish in app/app.js and public route copy",
        "canonicalNames": {
            "ecosystem": {
                "name": "Values Commons",
                "role": "public ecosystem umbrella",
                "use": "Use for the whole family: public home, adoption, contribution, funding, and sister instances."
            },
            "standard": {
                "name": "Open Values Standard",
                "role": "formal protocol and data contract",
                "use": "Use for schemas, provenance, values passports, conformance, and forkable lens formats."
            },
            "instance": {
                "name": "Conscious Consuming",
                "role": "flagship consumer-decision app",
                "use": "Use for the shopping, services, giving, learning, category, and verdict experience."
            }
        },
        "domainPosture": {
            "ecosystemHome": "https://valuescommons.org/",
            "appCanonicalBase": "https://valuescommons.org/app/",
            "standardHome": "https://valuescommons.org/standard/",
            "standardDomainAlias": "openvaluesstandard.org",
            "legacyDomainAlias": "consciousconsuming.org"
        },
        "copyRules": list(NAMING_COPY_RULES),
        "appOwnedTargets": list(NAMING_APP_TARGETS),
        "recommendation": "Keep Conscious Consuming as the app name, Values Commons as the umbrella, and Open Values Standard as the protocol name. Use footer and route copy to show the relationship instead of renaming the app.",
        "appOwnedDecision": "Decide final app/footer/header wording against these names; do not change generated data to compensate for app-side IA copy.",
        "drainRule": "H3 can drain when app-owned wordmark, footer, route metadata, and methodology links use the three-name stack consistently or document an explicit exception.",
        "coverage": {
            "categoryCount": len(index),
            "canonicalNameCount": 3,
            "copyRuleCount": len(NAMING_COPY_RULES),
            "appOwnedTargetCount": len(NAMING_APP_TARGETS)
        }
    }

def provenance_chip(summary):
    domains = summary.get('sourceDomainCount', 0)
    if domains > 1:
        return f"{domains} independent sources"
    if domains == 1:
        return "One source: " + summary.get('primarySource', 'source')
    return "Source links missing"

def static_card_safe_code(code):
    return re.sub(r'[^a-zA-Z0-9._-]', '-', str(code))

def provenance_example(kind, index, bundle, predicate, curated_only=False):
    for cat in index:
        ds = bundle.get(cat['id'], {})
        if curated_only and ds.get('meta', {}).get('productBase'):
            continue
        for entity in ds.get('products', []) or []:
            summary = entity.get('provenanceSummary') or {}
            if not predicate(summary):
                continue
            code = str(entity.get('code') or entity.get('id') or '')
            return {
                "kind": kind,
                "category": cat['id'],
                "categoryLabel": cat.get('label', cat['id']),
                "code": code,
                "name": entity.get('name') or entity.get('label') or '',
                "summary": dict(summary),
                "expectedChip": provenance_chip(summary)
            }
    return None

def provenance_target_routes(example, static_card=False):
    if not example:
        return None
    category = quote(str(example.get('category') or ''), safe='')
    code = quote(str(example.get('code') or ''), safe='')
    routes = {
        "explore": f"#explore/{category}",
        "item": f"#item/{category}/{code}",
        "appCard": f"#card/{category}/{code}"
    }
    if static_card:
        safe = static_card_safe_code(example.get('code') or '')
        routes["staticHtml"] = f"./c/{example.get('category')}/{safe}.html"
        routes["staticImage"] = f"./c/{example.get('category')}/{safe}.png"
    return routes

def provenance_matrix_target(example, static_card=False):
    if not example:
        return None
    target = dict(example)
    target["routes"] = provenance_target_routes(example, static_card)
    return target

def provenance_review_scenario(sid, surface, example, route_key, checks, must_not, static_card=False):
    if not example:
        return None
    summary = example.get("summary") or {}
    if summary.get('sourceDomainCount', 0) > 1:
        rule = "multi-source"
        confidence = "standard"
    elif summary.get('sourceDomainCount', 0) == 1:
        rule = "single-source"
        confidence = "held"
    else:
        rule = "no-source"
        confidence = "held"
    target = provenance_matrix_target(example, static_card)
    routes = target.get("routes") or {}
    return {
        "id": sid,
        "surface": surface,
        "route": routes.get(route_key),
        "target": target,
        "expected": {
            "rule": rule,
            "chip": provenance_chip(summary),
            "confidenceMode": confidence,
            "defaultVisibility": "visible"
        },
        "mustShow": checks,
        "mustNot": must_not
    }

def provenance_mixed_category(index):
    for cat in index:
        profile = cat.get('provenanceProfile') or {}
        if profile.get('singleSourceEntries', 0) > 0 and profile.get('multiSourceEntries', 0) > 0:
            return {
                "category": cat['id'],
                "categoryLabel": cat.get('label', cat['id']),
                "route": f"#explore/{quote(str(cat['id']), safe='')}",
                "entryCount": profile.get('entryCount', 0),
                "singleSourceEntries": profile.get('singleSourceEntries', 0),
                "multiSourceEntries": profile.get('multiSourceEntries', 0)
            }
    return None

def build_provenance_review_matrix(examples, card_example, mixed_category, coverage):
    surfaces = [
        {
            "id": "ranked-list",
            "routePattern": "#explore/<cid>",
            "mustShow": ["provenance chip from expectedChip", "confidence mode for held single/no-source entries"],
            "mustNot": ["Do not hide single-source entries by default.", "Do not imply each criterion is independent corroboration."]
        },
        {
            "id": "item-page",
            "routePattern": "#item/<cid>/<code>",
            "mustShow": ["source-domain independence summary", "grouped source rows", "note-only caveat when present"],
            "mustNot": ["Do not count note-only facts as sources.", "Do not show false precision for held-confidence entries."]
        },
        {
            "id": "static-verdict-card",
            "routePattern": "./c/<cid>/<safe-code>.html and #card/<cid>/<code>",
            "mustShow": ["shareable card remains sourced", "card copy does not overstate independent corroboration"],
            "mustNot": ["Do not add a social-preview claim that is stronger than the generated summary."]
        },
        {
            "id": "node-page",
            "routePattern": "#n/<type>/<slug>",
            "mustShow": ["embedded verdicts reuse the same provenance chip and confidence mode"],
            "mustNot": ["Do not let brand/company/tag context upgrade an entry's source count."]
        },
        {
            "id": "trust-lens-control",
            "routePattern": "#explore/<cid>",
            "mustShow": ["control is off by default", "enabled state keeps sourceDomainCount > 1 and folds the rest"],
            "mustNot": ["Do not make the Trust Lens a default ranking filter.", "Do not silently discard folded entries."]
        }
    ]
    scenarios = []
    candidates = [
        provenance_review_scenario(
            "ranked-list-multi-source",
            "ranked-list",
            examples.get("multiSource"),
            "explore",
            ["Chip reads as independent-source count.", "Confidence mode stays standard."],
            ["Do not collapse the sourceLabels into one generic source."]
        ),
        provenance_review_scenario(
            "ranked-list-single-source",
            "ranked-list",
            examples.get("singleSource"),
            "explore",
            ["Chip names the one primary source.", "Confidence mode is held but the entry remains visible."],
            ["Do not hide this entry unless the user turns on the Trust Lens."]
        ),
        provenance_review_scenario(
            "item-page-multi-source",
            "item-page",
            examples.get("multiSource"),
            "item",
            ["Source labels render as distinct source domains.", "The summary matches the entry provenanceSummary exactly."],
            ["Do not present sourceLabels as endorsements or sponsors."]
        ),
        provenance_review_scenario(
            "item-page-single-source",
            "item-page",
            examples.get("singleSource"),
            "item",
            ["All scored facts from the same domain are grouped as one source.", "The held-confidence cue is visible."],
            ["Do not render each criterion as separate corroboration."]
        ),
        provenance_review_scenario(
            "note-only-entry",
            "item-page",
            examples.get("noteOnly"),
            "item",
            ["Note-only facts are disclosed as notes.", "sourceDomainCount is not increased by notes without URLs."],
            ["Do not turn a note-only fact into a source badge."]
        ),
        provenance_review_scenario(
            "static-verdict-card",
            "static-verdict-card",
            card_example,
            "staticHtml",
            ["The static HTML card and in-app card route stay within the same provenance summary.", "Social preview copy does not claim stronger corroboration."],
            ["Do not claim independent sources unless sourceDomainCount is greater than one."],
            static_card=True
        ),
        provenance_review_scenario(
            "node-embedded-verdict",
            "node-page",
            examples.get("singleSource"),
            "item",
            ["If this entry appears on a brand/company/tag node, the embedded chip remains the same.", "Node context does not alter confidence mode."],
            ["Do not upgrade source independence because the node page has additional descriptive text."]
        )
    ]
    for scenario in candidates:
        if scenario:
            scenarios.append(scenario)
    if mixed_category:
        scenarios.append({
            "id": "trust-lens-control",
            "surface": "trust-lens-control",
            "route": mixed_category.get("route"),
            "targetCategory": mixed_category,
            "expected": {
                "default": "off",
                "keepRule": "sourceDomainCount > 1",
                "foldRule": "Fold single-source and no-source entries into a disclosure row with show-anyway."
            },
            "mustShow": ["Multi-source entries remain in the ranked list.", "Single-source entries are folded with an explicit show-anyway action."],
            "mustNot": ["Do not make the filter opt-out.", "Do not erase folded entries from the page state."]
        })
    not_included = []
    if coverage.get("noSourceEntries", 0) == 0:
        not_included.append({
            "id": "no-source-entry",
            "reason": "The current generated corpus has no no-source entries; the no-source render rule remains audited but has no live fixture."
        })
    if coverage.get("noteOnlyEntries", 0) == 0:
        # Banking used to supply this fixture, from cells that carried a note and no source URL.
        # Rebuilding it on registers removed the last of them, which is the outcome the whole
        # sourcing discipline is aiming at, so the fixture disappearing is good news that still
        # has to be said out loud rather than left as a hole in the matrix.
        not_included.append({
            "id": "note-only-entry",
            "reason": "The current generated corpus has no note-only entries; the note-only render rule remains audited but has no live fixture."
        })
    return {
        "status": "h10-provenance-preview-review-matrix",
        "purpose": "App-owned preview checklist for Trust Lens and provenance rendering, generated from real entries so H10 can be reviewed without inventing fixtures.",
        "appOwned": True,
        "h10DrainableFromReviewMatrixAlone": False,
        "surfaces": surfaces,
        "scenarios": scenarios,
        "notIncluded": not_included,
        "totals": {
            "surfaceCount": len(surfaces),
            "scenarioCount": len(scenarios),
            "targetCount": len([s for s in scenarios if s.get("target")]),
            "notIncludedCount": len(not_included)
        }
    }

def build_provenance_receipt_template(review_matrix, steps):
    scenario_results = []
    for scenario in review_matrix.get("scenarios") or []:
        target = scenario.get("target") or {}
        target_category = scenario.get("targetCategory") or {}
        expected = scenario.get("expected") or {}
        scenario_results.append({
            "scenarioId": scenario.get("id"),
            "surface": scenario.get("surface"),
            "route": scenario.get("route"),
            "category": target.get("category") or target_category.get("category"),
            "code": target.get("code"),
            "expectedChip": expected.get("chip"),
            "expectedConfidenceMode": expected.get("confidenceMode"),
            "expectedDefaultVisibility": expected.get("defaultVisibility"),
            "observedChip": None,
            "observedConfidenceMode": None,
            "passed": None,
            "notes": "",
            "recordedAt": None,
            "mustShow": scenario.get("mustShow") or [],
            "mustNot": scenario.get("mustNot") or []
        })
    return {
        "schema": "h10-local-evidence-v1",
        "createdAt": None,
        "channel": "local-review",
        "buildHash": None,
        "contractStatus": "pending-app-integration",
        "scenarioResults": scenario_results,
        "stepResults": [
            {
                "step": step.get("step"),
                "stepId": step.get("id"),
                "label": step.get("label"),
                "scenarioIds": step.get("scenarioIds") or [],
                "passed": None,
                "notes": "",
                "recordedAt": None
            }
            for step in steps
        ],
        "finalDecision": {
            "status": "pending",
            "readyToDrain": False,
            "decidedBy": None,
            "decidedAt": None,
            "notes": "",
            "remainingBlockers": ["App-owned H10 implementation evidence has not been recorded."]
        }
    }

def build_provenance_copy_contract(review_matrix, render_rules, trust_lens):
    return {
        "status": "h10-provenance-microcopy-contract",
        "purpose": "Short app-owned copy contract for provenance chips, details, Trust Lens controls, and local H10 review receipts.",
        "h10DrainableFromCopyAlone": False,
        "copyTone": [
            "plain",
            "calm",
            "source-strength, not moral judgment",
            "visible without implying certification"
        ],
        "maxLengths": {
            "chip": 40,
            "shortDetail": 140,
            "longDetail": 220,
            "button": 24,
            "receiptLine": 180
        },
        "chipCopy": [
            {
                "rule": "multi-source",
                "template": render_rules[0]["chipTemplate"],
                "detail": "Scored facts cite more than one source domain.",
                "confidenceLabel": "Normal confidence"
            },
            {
                "rule": "single-source",
                "template": render_rules[1]["chipTemplate"],
                "detail": "Sourced scored facts point to one domain; useful, but not corroborated.",
                "confidenceLabel": "Confidence held"
            },
            {
                "rule": "no-source",
                "template": render_rules[2]["chipTemplate"],
                "detail": "Scored facts lack usable source links; treat this as a note to revisit.",
                "confidenceLabel": "Confidence held"
            },
            {
                "rule": "note-only",
                "template": "Notes, not source links",
                "detail": "Notes can explain a score, but they do not count as independent sources.",
                "confidenceLabel": "Confidence held"
            }
        ],
        "surfaceCopy": [
            {
                "surface": "ranked-list",
                "placement": "compact chip near score",
                "primary": "Show the chip without changing default ranking.",
                "detail": "Single-source entries stay visible unless the Trust Lens is enabled."
            },
            {
                "surface": "item-page",
                "placement": "source section near scored facts",
                "primary": "Show distinct source domains and group same-domain facts together.",
                "detail": "Note-only facts are disclosed as notes, not counted as source domains."
            },
            {
                "surface": "static-verdict-card",
                "placement": "short card line",
                "primary": "Keep card copy no stronger than the generated chip.",
                "detail": "Share previews can be brief, but they must preserve the source-access path."
            },
            {
                "surface": "node-page",
                "placement": "embedded verdict chip",
                "primary": "Reuse the entry chip and confidence label.",
                "detail": "Node context must not upgrade the entry source count."
            },
            {
                "surface": "trust-lens-control",
                "placement": "filter control and folded disclosure",
                "primary": trust_lens["label"],
                "detail": "Off by default; when on, it folds thin-provenance entries with a show-anyway path."
            }
        ],
        "trustLensCopy": {
            "label": trust_lens["label"],
            "offState": "All entries shown. Source-strength cues are visible.",
            "onState": "Two-source verdicts stay first; thinner entries fold below.",
            "foldDisclosure": "Some entries rely on one source or missing links. They are folded, not removed.",
            "showAnywayLabel": "Show anyway",
            "default": trust_lens["default"]
        },
        "receiptCopy": {
            "title": "H10 local review receipt",
            "pending": "Pending app review",
            "ready": "Ready only after every scenario and step is recorded.",
            "localBoundary": "Stored on this device or exported manually; no account, analytics, screenshots, or automatic sending.",
            "finalDecision": "Final drain decision belongs to app/design after review evidence is recorded."
        },
        "mustNot": [
            "Do not use verified, certified, proof, approved, guaranteed, safe, sponsored, or trust score language.",
            "Do not describe one source domain as several independent sources.",
            "Do not turn note-only facts into source badges.",
            "Do not make the Trust Lens default-on."
        ],
        "coverage": {
            "surfaceCount": len(review_matrix.get("surfaces") or []),
            "chipRules": 4,
            "scenarioCount": len(review_matrix.get("scenarios") or []),
            "copyAloneDrainable": False
        }
    }

def build_provenance_walkthrough(review_matrix, drain_contract, copy_contract):
    step_ids_by_scenario = {}
    for step in drain_contract.get("steps") or []:
        for scenario_id in step.get("scenarioIds") or []:
            step_ids_by_scenario.setdefault(scenario_id, []).append(step.get("id"))
    final_step = drain_contract.get("coverage", {}).get("finalStepId")
    surface_copy = {row.get("surface"): row for row in copy_contract.get("surfaceCopy") or []}
    chip_copy = {row.get("rule"): row for row in copy_contract.get("chipCopy") or []}
    items = []
    for order, scenario in enumerate(review_matrix.get("scenarios") or [], start=1):
        target = scenario.get("target") or {}
        target_category = scenario.get("targetCategory") or {}
        expected = scenario.get("expected") or {}
        rule = expected.get("rule")
        scenario_step_ids = list(step_ids_by_scenario.get(scenario.get("id"), []))
        if final_step and final_step not in scenario_step_ids:
            scenario_step_ids.append(final_step)
        item = {
            "order": order,
            "id": "h10-walk-" + scenario.get("id", str(order)),
            "scenarioId": scenario.get("id"),
            "surface": scenario.get("surface"),
            "route": scenario.get("route"),
            "target": {
                "category": target.get("category") or target_category.get("category"),
                "categoryLabel": target.get("categoryLabel") or target_category.get("categoryLabel"),
                "code": target.get("code"),
                "name": target.get("name")
            },
            "expected": {
                "rule": rule,
                "chip": expected.get("chip"),
                "confidenceMode": expected.get("confidenceMode"),
                "defaultVisibility": expected.get("defaultVisibility"),
                "trustLensDefault": expected.get("default"),
                "trustLensKeepRule": expected.get("keepRule"),
                "trustLensFoldRule": expected.get("foldRule")
            },
            "copy": {
                "surfacePrimary": (surface_copy.get(scenario.get("surface")) or {}).get("primary"),
                "surfaceDetail": (surface_copy.get(scenario.get("surface")) or {}).get("detail"),
                "chipTemplate": (chip_copy.get(rule) or {}).get("template"),
                "confidenceLabel": (chip_copy.get(rule) or {}).get("confidenceLabel")
            },
            "actions": [
                "Open the route in the running app or static card package.",
                "Find the target entry or control named by this scenario.",
                "Compare visible provenance copy to the expected fields below.",
                "Record only observations in the matching local receipt row."
            ],
            "passWhen": list(scenario.get("mustShow") or []) + [
                "Rendered copy stays within copyContract for this surface.",
                "Receipt row records pass/fail without screenshots or user values."
            ],
            "mustNot": list(scenario.get("mustNot") or []) + [
                "Do not mark the final H10 drain decision from this walkthrough item alone."
            ],
            "receipt": {
                "schema": (drain_contract.get("receiptContract") or {}).get("schema"),
                "scenarioId": scenario.get("id"),
                "fieldsToFill": ["observedChip", "observedConfidenceMode", "passed", "notes", "recordedAt"],
                "startBlank": True
            },
            "drainStepIds": scenario_step_ids
        }
        if scenario.get("surface") == "trust-lens-control":
            item["actions"] = [
                "Open the target category with the Trust Lens off.",
                "Confirm all entries remain visible with source-strength cues.",
                "Turn on the Trust Lens and confirm multi-source entries remain while thinner entries fold.",
                "Use the show-anyway path before recording the receipt row."
            ]
            item["passWhen"].append("Control remains off by default and folds rather than removes entries.")
        items.append(item)
    scenario_ids = [scenario.get("id") for scenario in review_matrix.get("scenarios") or [] if scenario.get("id")]
    covered = {item.get("scenarioId") for item in items if item.get("scenarioId")}
    return {
        "status": "h10-provenance-review-walkthrough",
        "purpose": "Ordered app-owned H10 review path joining real fixtures, copy contract, drain steps, and local receipt rows.",
        "appOwned": True,
        "h10DrainableFromWalkthroughAlone": False,
        "beforeReview": [
            "Use the running app or packaged static card routes, not generated JSON alone.",
            "Start from drainContract.receiptTemplate so each row begins blank.",
            "Record only local observations; do not include screenshots, user values, or browsing history."
        ],
        "items": items,
        "finalGate": {
            "stepId": final_step,
            "statusBeforeAppWork": drain_contract.get("status"),
            "drainOnlyAfter": [
                "Every walkthrough item has a matching local receipt observation.",
                "Every drainContract step is passed or has a documented equivalent.",
                "App/design moves H10 in docs/CONTENT-HANDOFF.md."
            ],
            "mustNot": [
                "Do not drain H10 from walkthrough generation alone.",
                "Do not drain H10 while any surface can overstate independent sources."
            ]
        },
        "coverage": {
            "items": len(items),
            "scenarioCount": len(scenario_ids),
            "coveredScenarioCount": len(covered),
            "allScenariosCovered": set(scenario_ids).issubset(covered),
            "drainStepCount": len(drain_contract.get("steps") or []),
            "copySurfaceCount": len(copy_contract.get("surfaceCopy") or []),
            "walkthroughAloneDrainable": False
        }
    }

def build_provenance_receipt_validator_cases(scenario_ids, step_ids, final_step, non_final_step_ids, tracker):
    forbidden_fields = (tracker.get("storage") or {}).get("forbiddenFields") or []
    first_scenario = scenario_ids[0] if scenario_ids else None
    first_review_step = non_final_step_ids[1] if len(non_final_step_ids) > 1 else (non_final_step_ids[0] if non_final_step_ids else None)
    missing_prerequisite = non_final_step_ids[-1] if non_final_step_ids else None
    return [
        {
            "id": "blank-template-pending",
            "description": "The generated blank receipt template is valid only as a pending local receipt, never as H10 drain evidence.",
            "expectValid": True,
            "attemptedFinalStatus": "pending",
            "readyToDrain": False,
            "scenarioState": "blank-template",
            "stepState": "blank-template",
            "finalDecision": {"status": "pending", "readyToDrain": False},
            "mustHold": [
                "All observed scenario fields may remain blank while finalDecision.status is pending.",
                "The pending receipt must keep readyToDrain false."
            ]
        },
        {
            "id": "blocked-with-named-surface",
            "description": "A failed reviewed surface is valid as a blocked receipt only when the failed row has notes and a timestamp.",
            "expectValid": True,
            "attemptedFinalStatus": "blocked",
            "readyToDrain": False,
            "scenarioIds": [first_scenario] if first_scenario else [],
            "stepIds": [first_review_step] if first_review_step else [],
            "scenarioState": "one-failed-with-notes",
            "stepState": "matching-step-blocked-with-notes",
            "requiredFieldsWhenFailed": ["passed", "notes", "recordedAt"],
            "finalDecision": {"status": "blocked", "readyToDrain": False},
            "mustHold": [
                "The final note names the remaining app-owned blocker.",
                "Blocked receipts do not hide failed rows behind a generic status."
            ]
        },
        {
            "id": "all-evidence-ready",
            "description": "A receipt can be ready only after every generated scenario and every step row is recorded, then app/design reviews it.",
            "expectValid": True,
            "attemptedFinalStatus": "passed-ready-to-drain",
            "readyToDrain": True,
            "scenarioIds": scenario_ids,
            "stepIds": step_ids,
            "scenarioState": "all-passed-with-expected-observations",
            "stepState": "all-steps-passed-after-prerequisites",
            "requiresAppDesignReview": True,
            "handoffFile": (tracker.get("finalDecisionLock") or {}).get("handoffFile"),
            "finalDecision": {"status": "passed-ready-to-drain", "readyToDrain": True},
            "mustHold": [
                "Every scenario row includes observedChip, observedConfidenceMode, passed, notes, and recordedAt.",
                "The final step row is recorded only after all non-final steps are complete.",
                "H10 moves only when app/design updates the handoff."
            ]
        },
        {
            "id": "final-step-locked-too-early",
            "description": "A receipt that marks the final drain decision ready while a prerequisite step is missing is invalid.",
            "expectValid": False,
            "reasonCode": "final-step-locked",
            "attemptedFinalStatus": "passed-ready-to-drain",
            "readyToDrain": True,
            "finalStepId": final_step,
            "missingPrerequisiteStepIds": [missing_prerequisite] if missing_prerequisite else [],
            "mustFailBecause": "Fails because the final step cannot pass while any locked prerequisite is missing."
        },
        {
            "id": "privacy-field-leak",
            "description": "A receipt containing any forbidden privacy field is invalid, even when the field is nested.",
            "expectValid": False,
            "reasonCode": "forbidden-privacy-field",
            "attemptedFinalStatus": "pending",
            "readyToDrain": False,
            "containsForbiddenField": forbidden_fields[0] if forbidden_fields else None,
            "forbiddenFields": forbidden_fields,
            "recursiveForbidden": True,
            "mustFailBecause": "Fails because receipt JSON contains a forbidden privacy field."
        },
        {
            "id": "unknown-receipt-row-id",
            "description": "A receipt with unknown scenario or step IDs is invalid because it no longer matches the generated template.",
            "expectValid": False,
            "reasonCode": "template-id-mismatch",
            "attemptedFinalStatus": "pending",
            "readyToDrain": False,
            "unknownScenarioIds": ["h10-unknown-scenario"],
            "knownScenarioIds": scenario_ids,
            "unknownStepIds": ["h10-unknown-step"],
            "knownStepIds": step_ids,
            "mustFailBecause": "Fails because scenarioResults and stepResults IDs must match the generated receipt template."
        },
        {
            "id": "passed-scenario-missing-observation",
            "description": "A passed scenario row without observed chip and confidence fields is invalid.",
            "expectValid": False,
            "reasonCode": "missing-required-observation",
            "attemptedFinalStatus": "pending",
            "readyToDrain": False,
            "scenarioIds": [first_scenario] if first_scenario else [],
            "missingFields": ["observedChip", "observedConfidenceMode", "recordedAt"],
            "mustFailBecause": "Fails because passed scenario rows must include observed provenance copy and recording time."
        }
    ]

def build_provenance_receipt_validator_recipe(receipt_contract, scenario_ids, step_ids, final_step, non_final_step_ids, tracker, fixture_cases):
    invalid_fixture_ids_by_reason = {}
    for case in fixture_cases:
        if case.get("expectValid") is False and case.get("reasonCode"):
            invalid_fixture_ids_by_reason.setdefault(case.get("reasonCode"), []).append(case.get("id"))
    error_codes = [
        {"code": "malformed-json", "severity": "error", "fromStep": "parse-local-json", "fixtureIds": []},
        {"code": "schema-mismatch", "severity": "error", "fromStep": "check-schema-and-top-level", "fixtureIds": []},
        {"code": "missing-top-level-field", "severity": "error", "fromStep": "check-schema-and-top-level", "fixtureIds": []},
        {"code": "template-id-mismatch", "severity": "error", "fromStep": "check-template-ids", "fixtureIds": invalid_fixture_ids_by_reason.get("template-id-mismatch", [])},
        {"code": "missing-required-observation", "severity": "error", "fromStep": "check-scenario-rows", "fixtureIds": invalid_fixture_ids_by_reason.get("missing-required-observation", [])},
        {"code": "missing-step-field", "severity": "error", "fromStep": "check-step-rows", "fixtureIds": []},
        {"code": "forbidden-privacy-field", "severity": "error", "fromStep": "scan-privacy-fields", "fixtureIds": invalid_fixture_ids_by_reason.get("forbidden-privacy-field", [])},
        {"code": "final-step-locked", "severity": "error", "fromStep": "evaluate-final-lock", "fixtureIds": invalid_fixture_ids_by_reason.get("final-step-locked", [])},
        {"code": "invalid-final-status", "severity": "error", "fromStep": "evaluate-final-status", "fixtureIds": []},
        {"code": "ready-status-mismatch", "severity": "error", "fromStep": "evaluate-final-status", "fixtureIds": []}
    ]
    return {
        "status": "h10-local-validator-implementation-recipe",
        "purpose": "App/design implementation recipe for validating a local H10 evidence receipt without network authority.",
        "localOnly": True,
        "noServerAuthority": True,
        "input": {
            "receiptSchema": receipt_contract.get("schema"),
            "source": "user-selected local/exported JSON only",
            "templatePointer": "provenanceDisplayContract.drainContract.receiptTemplate",
            "validatorPointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator"
        },
        "outputContract": {
            "schema": "h10-validator-result-v1",
            "fields": [
                "valid",
                "readyToDrain",
                "finalStatus",
                "errors",
                "warnings",
                "missingScenarioIds",
                "missingStepIds",
                "forbiddenFieldsSeen",
                "lockedFinalStep",
                "checkedAt"
            ],
            "validWhen": [
                "No error codes were emitted.",
                "All generated scenario and step IDs match the receipt template.",
                "readyToDrain is true only when finalStatus is passed-ready-to-drain and app/design review remains explicit."
            ],
            "mustNot": [
                "Do not upload or send the receipt automatically.",
                "Do not include screenshots, user values, browsing history, analytics identifiers, or personal notes in the result.",
                "Do not move H10 from the active handoff based on validator output alone."
            ]
        },
        "statusOutcomes": [
            {"finalStatus": "pending", "validCanBeTrue": True, "readyToDrain": False, "resultKind": "incomplete-local-review"},
            {"finalStatus": "blocked", "validCanBeTrue": True, "readyToDrain": False, "resultKind": "named-app-owned-blocker"},
            {"finalStatus": "passed-ready-to-drain", "validCanBeTrue": True, "readyToDrain": True, "resultKind": "ready-for-app-design-review"}
        ],
        "algorithmSteps": [
            {
                "order": 1,
                "id": "parse-local-json",
                "check": "Parse a user-selected local/exported JSON object; never fetch, upload, or infer receipt fields.",
                "emits": ["malformed-json"]
            },
            {
                "order": 2,
                "id": "check-schema-and-top-level",
                "check": "Require the receipt schema and every top-level field from receiptContract.requiredTopLevelFields.",
                "emits": ["schema-mismatch", "missing-top-level-field"]
            },
            {
                "order": 3,
                "id": "check-template-ids",
                "check": "Require scenarioResults and stepResults IDs to exactly match the generated receipt template.",
                "scenarioIds": scenario_ids,
                "stepIds": step_ids,
                "emits": ["template-id-mismatch"]
            },
            {
                "order": 4,
                "id": "check-scenario-rows",
                "check": "For passed scenario rows, require observedChip, observedConfidenceMode, passed, notes, and recordedAt.",
                "requiredWhenPassed": ["observedChip", "observedConfidenceMode", "passed", "notes", "recordedAt"],
                "emits": ["missing-required-observation"]
            },
            {
                "order": 5,
                "id": "check-step-rows",
                "check": "Require every step row to carry stepId, passed, notes, and recordedAt before it can count as observed evidence.",
                "requiredWhenPassed": ["stepId", "passed", "notes", "recordedAt"],
                "emits": ["missing-step-field"]
            },
            {
                "order": 6,
                "id": "scan-privacy-fields",
                "check": "Recursively scan the receipt and validator result for forbidden privacy fields.",
                "forbiddenFields": (tracker.get("storage") or {}).get("forbiddenFields") or [],
                "emits": ["forbidden-privacy-field"]
            },
            {
                "order": 7,
                "id": "evaluate-final-lock",
                "check": "Reject a passing final H10 step while any non-final prerequisite step is missing.",
                "finalStepId": final_step,
                "lockedUntil": non_final_step_ids,
                "emits": ["final-step-locked"]
            },
            {
                "order": 8,
                "id": "evaluate-final-status",
                "check": "Map finalDecision.status to readyToDrain, and reject mismatches or unknown statuses.",
                "allowedStatuses": receipt_contract.get("allowedFinalStatuses") or [],
                "emits": ["invalid-final-status", "ready-status-mismatch"]
            },
            {
                "order": 9,
                "id": "emit-local-result",
                "check": "Return the h10-validator-result-v1 object locally; this is evidence for app/design review, not an automatic H10 drain.",
                "emits": []
            }
        ],
        "errorCodes": error_codes,
        "fixtureExpectations": [
            {
                "fixtureId": case.get("id"),
                "expectValid": case.get("expectValid"),
                "readyToDrain": case.get("readyToDrain"),
                "expectedErrorCodes": [case.get("reasonCode")] if case.get("expectValid") is False and case.get("reasonCode") else []
            }
            for case in fixture_cases
        ],
        "coverage": {
            "algorithmStepCount": 9,
            "errorCodeCount": len(error_codes),
            "fixtureExpectationCount": len(fixture_cases),
            "invalidFixtureMappedCount": sum(1 for case in fixture_cases if case.get("expectValid") is False and case.get("reasonCode")),
            "resultFieldCount": 10,
            "localOnly": True
        }
    }

def build_provenance_receipt_validator_result_copy(recipe, fixture_cases):
    error_copy = {
        "malformed-json": {
            "label": "File is not readable",
            "message": "This local file is not readable JSON.",
            "repairHint": "Export the H10 evidence receipt again and choose that local JSON file."
        },
        "schema-mismatch": {
            "label": "Receipt schema changed",
            "message": "This receipt does not use the expected H10 local-evidence schema.",
            "repairHint": "Use a receipt whose schema matches h10-local-evidence-v1."
        },
        "missing-top-level-field": {
            "label": "Receipt is incomplete",
            "message": "A required top-level receipt field is missing.",
            "repairHint": "Start from the generated blank receipt template and keep every top-level field."
        },
        "template-id-mismatch": {
            "label": "Rows do not match template",
            "message": "Scenario or step row IDs do not match the generated H10 receipt template.",
            "repairHint": "Recreate the receipt from the current generated template before reviewing it."
        },
        "missing-required-observation": {
            "label": "Observation is missing",
            "message": "A passed scenario row is missing observed copy, confidence mode, or recorded time.",
            "repairHint": "Record the visible chip, confidence mode, notes, and timestamp for that row."
        },
        "missing-step-field": {
            "label": "Step evidence is incomplete",
            "message": "A passed step row is missing required step evidence fields.",
            "repairHint": "Record passed, notes, and recordedAt for each completed evidence step."
        },
        "forbidden-privacy-field": {
            "label": "Private field found",
            "message": "The receipt includes a field that must stay out of local H10 evidence.",
            "repairHint": "Remove screenshots, user values, browsing history, analytics identifiers, and personal notes."
        },
        "final-step-locked": {
            "label": "Final step is still locked",
            "message": "The final H10 decision cannot pass while prerequisite evidence is missing.",
            "repairHint": "Finish or document every non-final evidence step before recording the final decision."
        },
        "invalid-final-status": {
            "label": "Final status is unknown",
            "message": "The final decision uses a status outside the allowed H10 receipt statuses.",
            "repairHint": "Use pending, blocked, or passed-ready-to-drain."
        },
        "ready-status-mismatch": {
            "label": "Ready state does not match",
            "message": "readyToDrain does not match the final H10 status.",
            "repairHint": "Set readyToDrain true only for passed-ready-to-drain; keep it false for pending or blocked."
        }
    }
    result_states = [
        {
            "state": "pending",
            "label": "Receipt pending",
            "headline": "Local H10 receipt is still in progress.",
            "body": "Some review rows may still be blank. Keep H10 active until app/design reviews running-app evidence.",
            "readyToDrain": False,
            "action": "Continue local review."
        },
        {
            "state": "blocked",
            "label": "H10 still blocked",
            "headline": "Local H10 receipt names remaining work.",
            "body": "One or more rows failed or need equivalent evidence. Name the app-owned blocker before sharing the receipt.",
            "readyToDrain": False,
            "action": "Fix or document the blocker."
        },
        {
            "state": "passed-ready-to-drain",
            "label": "Ready for app/design review",
            "headline": "Local H10 receipt is structurally ready.",
            "body": "The validator found the expected receipt shape. App/design still decides whether H10 moves in the handoff.",
            "readyToDrain": True,
            "action": "Review before moving H10."
        },
        {
            "state": "invalid",
            "label": "Receipt needs repair",
            "headline": "Local H10 receipt does not match the contract.",
            "body": "Fix the listed local receipt issues before treating it as app/design evidence.",
            "readyToDrain": False,
            "action": "Repair the receipt."
        }
    ]
    error_rows = []
    for error in recipe.get("errorCodes") or []:
        code = error.get("code")
        copy = error_copy.get(code, {})
        error_rows.append({
            "code": code,
            "severity": error.get("severity"),
            "label": copy.get("label"),
            "message": copy.get("message"),
            "repairHint": copy.get("repairHint"),
            "fixtureIds": error.get("fixtureIds") or []
        })
    return {
        "status": "h10-validator-result-copy-contract",
        "purpose": "Bounded app-facing copy for local H10 receipt validation results.",
        "localOnly": True,
        "noServerAuthority": True,
        "schema": "h10-validator-result-copy-v1",
        "displayRules": [
            "Show all error codes before any ready state.",
            "Always say the receipt stays local and is not uploaded.",
            "Use ready copy only as ready for app/design review, never as automatic H10 drain.",
            "Keep H10 active until app/design updates docs/CONTENT-HANDOFF.md.",
            "Do not include screenshots, user values, browsing history, analytics identifiers, or personal notes."
        ],
        "resultStates": result_states,
        "errorCopy": error_rows,
        "fixtureCopyExpectations": [
            {
                "fixtureId": case.get("id"),
                "expectedState": "invalid" if case.get("expectValid") is False else case.get("attemptedFinalStatus"),
                "expectedErrorCodes": [case.get("reasonCode")] if case.get("expectValid") is False and case.get("reasonCode") else []
            }
            for case in fixture_cases
        ],
        "mustNot": [
            "Do not use validator copy to claim H10 is drained.",
            "Do not upload receipts or validation results automatically.",
            "Do not soften privacy-field errors into warnings."
        ],
        "coverage": {
            "resultStateCount": len(result_states),
            "errorCopyCount": len(error_rows),
            "fixtureCopyExpectationCount": len(fixture_cases),
            "localOnly": True
        }
    }

def build_provenance_receipt_validator_review_transcript(receipt_contract, tracker, result_copy, recipe, fixture_cases):
    forbidden_fields = (tracker.get("storage") or {}).get("forbiddenFields") or []
    scenario_fields = receipt_contract.get("perScenarioFields") or []
    step_fields = ["step", "stepId", "label", "scenarioIds", "passed", "notes", "recordedAt"]
    sections = [
        {
            "id": "context",
            "label": "Review context",
            "includeFields": ["schema", "createdAt", "channel", "buildHash", "contractStatus", "finalDecision"],
            "instruction": "Name the local receipt context before any result wording."
        },
        {
            "id": "validator-result",
            "label": "Validator result",
            "includeFields": ["state", "readyToDrain", "label", "headline", "body", "action"],
            "instruction": "Use resultCopy state text exactly and keep ready copy app/design-scoped."
        },
        {
            "id": "issues",
            "label": "Issues to repair",
            "includeFields": ["code", "severity", "label", "message", "repairHint", "fixtureIds"],
            "instruction": "List every validator error code before any ready-state text."
        },
        {
            "id": "scenario-evidence",
            "label": "Scenario evidence",
            "includeFields": scenario_fields,
            "instruction": "Summarize each scenario receipt row without screenshots or user values."
        },
        {
            "id": "step-evidence",
            "label": "Step evidence",
            "includeFields": step_fields,
            "instruction": "Summarize each H10 drain step row and name missing prerequisites."
        },
        {
            "id": "handoff-boundary",
            "label": "Handoff boundary",
            "includeFields": ["activeHandoff", "handoffFile", "localOnly", "noServerAuthority", "readyToDrain"],
            "instruction": "End by saying app/design decides whether H10 moves in docs/CONTENT-HANDOFF.md."
        }
    ]
    state_summaries = [
        {
            "state": state.get("state"),
            "readyToDrain": state.get("readyToDrain"),
            "label": state.get("label"),
            "headline": state.get("headline"),
            "body": state.get("body"),
            "action": state.get("action"),
            "transcriptLine": f"{state.get('label')}: {state.get('headline')}",
            "handoffRule": "App/design decides whether H10 moves in docs/CONTENT-HANDOFF.md."
        }
        for state in result_copy.get("resultStates") or []
    ]
    issue_rows = [
        {
            "code": row.get("code"),
            "severity": row.get("severity"),
            "label": row.get("label"),
            "message": row.get("message"),
            "repairHint": row.get("repairHint"),
            "fixtureIds": row.get("fixtureIds") or [],
            "transcriptLine": f"{row.get('code')}: {row.get('message')}"
        }
        for row in result_copy.get("errorCopy") or []
    ]
    state_by_id = {row.get("state"): row for row in state_summaries}
    issue_by_code = {row.get("code"): row for row in issue_rows}
    section_ids = [section.get("id") for section in sections]
    fixture_packets = []
    for case in fixture_cases:
        expected_state = "invalid" if case.get("expectValid") is False else case.get("attemptedFinalStatus")
        state_summary = state_by_id.get(expected_state, {})
        expected_issue_codes = [case.get("reasonCode")] if case.get("expectValid") is False and case.get("reasonCode") else []
        expected_issues = [issue_by_code.get(code, {}) for code in expected_issue_codes]
        fixture_packets.append({
            "fixtureId": case.get("id"),
            "expectedState": expected_state,
            "sourceAttemptedFinalStatus": case.get("attemptedFinalStatus"),
            "sourceReadyToDrain": case.get("readyToDrain"),
            "expectedReadyToDrain": state_summary.get("readyToDrain"),
            "expectedTitle": f"H10 local receipt review - {state_summary.get('label')}",
            "expectedSections": section_ids,
            "expectedIssueCodes": expected_issue_codes,
            "expectedIssueLabels": [issue.get("label") for issue in expected_issues if issue.get("label")],
            "expectedRepairHints": [issue.get("repairHint") for issue in expected_issues if issue.get("repairHint")],
            "expectedHandoffRule": state_summary.get("handoffRule"),
            "mustInclude": [
                "All transcript sections render in generated order.",
                "State copy mirrors receiptValidator.resultCopy.",
                "Issue rows render before any ready-state copy."
            ],
            "mustNot": [
                "Do not upload the transcript automatically.",
                "Do not use this fixture packet to drain H10.",
                "Do not include screenshots, user values, browsing history, analytics identifiers, or personal notes."
            ]
        })
    runtime_assertions = [
        {
            "fixtureId": packet.get("fixtureId"),
            "mode": "local-transcript-render-smoke",
            "expectedTitle": packet.get("expectedTitle"),
            "expectedState": packet.get("expectedState"),
            "expectedReadyToDrain": packet.get("expectedReadyToDrain"),
            "expectedSectionIds": packet.get("expectedSections") or [],
            "expectedIssueCount": len(packet.get("expectedIssueCodes") or []),
            "expectedIssueCodes": packet.get("expectedIssueCodes") or [],
            "assertions": [
                "Rendered transcript title matches expectedTitle.",
                "Rendered sections appear in expectedSectionIds order.",
                "Issue rows appear before any ready-state copy.",
                "Boundary line says local receipt only and app/design decides H10.",
                "Rendered transcript contains no forbidden privacy fields.",
                "Rendering this fixture does not upload, send, or drain H10."
            ],
            "mustNot": [
                "Do not treat a passing smoke assertion as an H10 drain decision.",
                "Do not upload fixture packets or transcript output.",
                "Do not include screenshots, user values, browsing history, analytics identifiers, or personal notes."
            ]
        }
        for packet in fixture_packets
    ]
    runtime_assertion_receipt_template = {
        "schema": "h10-transcript-smoke-receipt-v1",
        "createdAt": None,
        "channel": "local-review",
        "buildHash": None,
        "activeHandoff": "H10",
        "contractPointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript",
        "runtimeAssertionsPointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertions",
        "localOnly": True,
        "noServerAuthority": True,
        "h10DrainableFromReceiptAlone": False,
        "fixtureResults": [
            {
                "fixtureId": assertion.get("fixtureId"),
                "mode": assertion.get("mode"),
                "expectedTitle": assertion.get("expectedTitle"),
                "expectedState": assertion.get("expectedState"),
                "expectedReadyToDrain": assertion.get("expectedReadyToDrain"),
                "expectedSectionIds": assertion.get("expectedSectionIds") or [],
                "expectedIssueCount": assertion.get("expectedIssueCount"),
                "expectedIssueCodes": assertion.get("expectedIssueCodes") or [],
                "observedTitle": None,
                "observedSectionIds": [],
                "observedIssueCodes": [],
                "observedReadyToDrain": None,
                "passed": None,
                "notes": "",
                "recordedAt": None,
                "mustNot": assertion.get("mustNot") or []
            }
            for assertion in runtime_assertions
        ],
        "summary": {
            "totalFixtures": len(runtime_assertions),
            "passedFixtures": 0,
            "failedFixtures": 0,
            "blockedFixtures": 0,
            "readyForH10Review": False
        },
        "finalDecision": {
            "status": "pending",
            "decidedBy": "app/design",
            "decidedAt": None,
            "readyToDrainH10": False,
            "remainingBlockers": [
                "App/design must run the local transcript smoke and decide H10 in docs/CONTENT-HANDOFF.md."
            ]
        },
        "redactionRules": {
            "forbiddenFields": forbidden_fields,
            "recursiveForbidden": True,
            "noAutomaticSend": True,
            "noScreenshots": True,
            "noUserValues": True,
            "noAnalyticsIdentifiers": True
        },
        "mustInclude": [
            "One fixture result for every generated runtime assertion.",
            "Observed title, section IDs, issue codes, and readyToDrain before marking passed.",
            "Local-only final decision note in docs/CONTENT-HANDOFF.md."
        ],
        "mustNot": [
            "Do not upload or send the smoke receipt automatically.",
            "Do not claim a completed smoke receipt drains H10.",
            "Do not include screenshots, user values, browsing history, analytics identifiers, or personal notes."
        ]
    }
    smoke_receipt_top_level_fields = [
        "schema", "createdAt", "channel", "buildHash", "activeHandoff", "contractPointer",
        "runtimeAssertionsPointer", "localOnly", "noServerAuthority", "h10DrainableFromReceiptAlone",
        "fixtureResults", "summary", "finalDecision", "redactionRules", "mustInclude", "mustNot"
    ]
    smoke_receipt_row_fields = [
        "fixtureId", "mode", "expectedTitle", "expectedState", "expectedReadyToDrain",
        "expectedSectionIds", "expectedIssueCount", "expectedIssueCodes", "observedTitle",
        "observedSectionIds", "observedIssueCodes", "observedReadyToDrain", "passed",
        "notes", "recordedAt", "mustNot"
    ]
    smoke_validator_algorithm = [
        {
            "step": 1,
            "id": "parse-local-smoke-receipt",
            "check": "Input is readable local JSON for h10-transcript-smoke-receipt-v1.",
            "failureCode": "malformed-smoke-receipt"
        },
        {
            "step": 2,
            "id": "check-schema-and-boundary",
            "check": "Schema, channel, activeHandoff, localOnly, noServerAuthority, and receipt-alone boundary match the template.",
            "failureCode": "smoke-schema-mismatch"
        },
        {
            "step": 3,
            "id": "check-fixture-row-set",
            "check": "Every generated runtime assertion has exactly one fixture result row, with no extra fixture IDs.",
            "failureCode": "fixture-row-count-mismatch"
        },
        {
            "step": 4,
            "id": "compare-generated-expectations",
            "check": "Expected title, state, readyToDrain, section IDs, issue count, and issue codes still match runtimeAssertions.",
            "failureCode": "generated-expectation-mismatch"
        },
        {
            "step": 5,
            "id": "require-observed-transcript-fields",
            "check": "A passed row has observed title, section IDs, issue codes, readyToDrain, and recordedAt filled.",
            "failureCode": "missing-observed-transcript-fields"
        },
        {
            "step": 6,
            "id": "compare-observed-transcript-fields",
            "check": "Observed title, section IDs, issue codes, and readyToDrain match the generated expectations before passed is true.",
            "failureCode": "observed-transcript-mismatch"
        },
        {
            "step": 7,
            "id": "scan-forbidden-fields",
            "check": "Scan the receipt recursively for screenshots, user values, browsing history, analytics identifiers, or personal notes.",
            "failureCode": "forbidden-privacy-field",
            "forbiddenFields": forbidden_fields
        },
        {
            "step": 8,
            "id": "compute-review-readiness",
            "check": "readyForH10Review is true only when all fixture rows pass and failed or blocked counts are zero.",
            "failureCode": "summary-count-mismatch"
        },
        {
            "step": 9,
            "id": "preserve-app-design-final-decision",
            "check": "The validator result is app/design evidence only; it never moves H10 automatically.",
            "failureCode": "final-decision-overreach"
        }
    ]
    smoke_validator_error_codes = [
        {
            "code": "malformed-smoke-receipt",
            "severity": "error",
            "message": "The smoke receipt is not readable local JSON.",
            "repairHint": "Export or paste the local smoke receipt JSON again."
        },
        {
            "code": "smoke-schema-mismatch",
            "severity": "error",
            "message": "The smoke receipt schema or local boundary fields do not match the generated template.",
            "repairHint": "Start from the current runtimeAssertionReceiptTemplate and keep localOnly/noServerAuthority unchanged."
        },
        {
            "code": "fixture-row-count-mismatch",
            "severity": "error",
            "message": "The receipt does not have exactly one fixture result for each generated runtime assertion.",
            "repairHint": "Regenerate the blank template or add the missing fixture result rows before review."
        },
        {
            "code": "generated-expectation-mismatch",
            "severity": "error",
            "message": "A fixture row's expected fields no longer match the generated runtime assertion.",
            "repairHint": "Copy expected fields from runtimeAssertions instead of editing them by hand."
        },
        {
            "code": "missing-observed-transcript-fields",
            "severity": "error",
            "message": "A passed fixture row is missing observed transcript fields.",
            "repairHint": "Record observed title, section IDs, issue codes, readyToDrain, and recordedAt before marking passed."
        },
        {
            "code": "observed-transcript-mismatch",
            "severity": "error",
            "message": "Observed transcript fields do not match the generated expectation for the fixture.",
            "repairHint": "Repair the rendered transcript or mark the fixture failed with a note."
        },
        {
            "code": "forbidden-privacy-field",
            "severity": "error",
            "message": "The smoke receipt contains a forbidden private field.",
            "repairHint": "Remove screenshots, user values, browsing history, analytics identifiers, and personal notes."
        },
        {
            "code": "summary-count-mismatch",
            "severity": "error",
            "message": "Summary counts or readyForH10Review do not match the fixture row results.",
            "repairHint": "Recompute passed, failed, blocked, and readyForH10Review from the fixture rows."
        },
        {
            "code": "final-decision-overreach",
            "severity": "error",
            "message": "The smoke receipt tries to move H10 without app/design review.",
            "repairHint": "Keep readyToDrainH10 false until app/design records the decision in docs/CONTENT-HANDOFF.md."
        }
    ]
    first_smoke_assertion = runtime_assertions[0] if runtime_assertions else {}
    first_smoke_fixture_id = first_smoke_assertion.get("fixtureId")
    smoke_fixture_ids = [assertion.get("fixtureId") for assertion in runtime_assertions]
    smoke_validator_fixture_cases = [
        {
            "id": "blank-smoke-template-pending",
            "description": "The generated blank smoke receipt has the right local shape but is not ready for H10 review.",
            "expectValid": True,
            "expectReadyForH10Review": False,
            "expectedErrorCodes": [],
            "inputKind": "template-json",
            "rowState": "all-blank",
            "summary": {"passedFixtures": 0, "failedFixtures": 0, "blockedFixtures": 0, "readyForH10Review": False},
            "mustHold": [
                "Blank observed fields stay allowed while no fixture row is marked passed.",
                "The receipt keeps readyForH10Review false."
            ]
        },
        {
            "id": "all-smoke-fixtures-pass",
            "description": "Every transcript fixture is rendered with matching observed fields, making the smoke receipt ready for app/design review.",
            "expectValid": True,
            "expectReadyForH10Review": True,
            "expectedErrorCodes": [],
            "inputKind": "completed-local-json",
            "fixtureIds": smoke_fixture_ids,
            "rowState": "all-passed-with-matching-observations",
            "summary": {"passedFixtures": len(runtime_assertions), "failedFixtures": 0, "blockedFixtures": 0, "readyForH10Review": True},
            "finalDecision": {"status": "pending", "readyToDrainH10": False},
            "mustHold": [
                "Observed title, section IDs, issue codes, and readyToDrain match every generated assertion.",
                "The completed smoke receipt is app/design evidence, not an H10 movement."
            ]
        },
        {
            "id": "one-smoke-fixture-failed-with-note",
            "description": "A rendered transcript mismatch can be recorded as a failed smoke row without making the receipt invalid.",
            "expectValid": True,
            "expectReadyForH10Review": False,
            "expectedErrorCodes": [],
            "inputKind": "completed-local-json",
            "fixtureIds": [first_smoke_fixture_id] if first_smoke_fixture_id else [],
            "rowState": "one-failed-with-note",
            "summary": {"passedFixtures": max(len(runtime_assertions) - 1, 0), "failedFixtures": 1, "blockedFixtures": 0, "readyForH10Review": False},
            "mustHold": [
                "Failed rows name the local transcript mismatch in notes.",
                "readyForH10Review stays false until all fixture rows pass."
            ]
        },
        {
            "id": "not-json-smoke-input",
            "description": "A selected input that is not readable local JSON cannot be treated as a smoke receipt.",
            "expectValid": False,
            "expectReadyForH10Review": False,
            "expectedErrorCodes": ["malformed-smoke-receipt"],
            "inputKind": "not-json",
            "mustFailBecause": "Fails before schema checks because no receipt object can be parsed."
        },
        {
            "id": "schema-boundary-mismatch",
            "description": "A smoke receipt with changed schema or local boundary fields is invalid.",
            "expectValid": False,
            "expectReadyForH10Review": False,
            "expectedErrorCodes": ["smoke-schema-mismatch"],
            "inputKind": "template-json",
            "mutation": {"schema": "h10-transcript-smoke-receipt-v0", "localOnly": False, "noServerAuthority": False},
            "mustFailBecause": "Fails because schema and no-server boundary fields must match the generated template."
        },
        {
            "id": "missing-smoke-fixture-row",
            "description": "A smoke receipt missing one generated fixture row is invalid.",
            "expectValid": False,
            "expectReadyForH10Review": False,
            "expectedErrorCodes": ["fixture-row-count-mismatch"],
            "inputKind": "template-json",
            "mutation": {
                "missingFixtureId": first_smoke_fixture_id,
                "expectedFixtureCount": len(runtime_assertions),
                "observedFixtureCount": max(len(runtime_assertions) - 1, 0)
            },
            "mustFailBecause": "Fails because every generated runtime assertion needs exactly one fixture result row."
        },
        {
            "id": "expected-title-edited",
            "description": "A smoke receipt whose expected fields were edited away from runtimeAssertions is invalid.",
            "expectValid": False,
            "expectReadyForH10Review": False,
            "expectedErrorCodes": ["generated-expectation-mismatch"],
            "inputKind": "template-json",
            "fixtureIds": [first_smoke_fixture_id] if first_smoke_fixture_id else [],
            "mutation": {"expectedTitle": "Edited local title"},
            "mustFailBecause": "Fails because generated expected fields must stay copied from runtimeAssertions."
        },
        {
            "id": "passed-row-missing-observed-fields",
            "description": "A passed smoke row without observed transcript fields is invalid.",
            "expectValid": False,
            "expectReadyForH10Review": False,
            "expectedErrorCodes": ["missing-observed-transcript-fields"],
            "inputKind": "completed-local-json",
            "fixtureIds": [first_smoke_fixture_id] if first_smoke_fixture_id else [],
            "mutation": {"passed": True, "missingFields": ["observedTitle", "observedSectionIds", "observedIssueCodes", "observedReadyToDrain", "recordedAt"]},
            "mustFailBecause": "Fails because a passed row needs observed title, section IDs, issue codes, readyToDrain, and recordedAt."
        },
        {
            "id": "passed-row-observed-mismatch",
            "description": "A passed smoke row whose observed transcript fields differ from the generated expectation is invalid.",
            "expectValid": False,
            "expectReadyForH10Review": False,
            "expectedErrorCodes": ["observed-transcript-mismatch"],
            "inputKind": "completed-local-json",
            "fixtureIds": [first_smoke_fixture_id] if first_smoke_fixture_id else [],
            "mutation": {"passed": True, "observedTitle": "Different local transcript title"},
            "mustFailBecause": "Fails because observed transcript fields must match the generated expectation before passed is true."
        },
        {
            "id": "smoke-receipt-privacy-field-leak",
            "description": "A smoke receipt containing a forbidden privacy field is invalid even if the field is nested.",
            "expectValid": False,
            "expectReadyForH10Review": False,
            "expectedErrorCodes": ["forbidden-privacy-field"],
            "inputKind": "completed-local-json",
            "containsForbiddenField": forbidden_fields[0] if forbidden_fields else None,
            "forbiddenFields": forbidden_fields,
            "recursiveForbidden": True,
            "mustFailBecause": "Fails because smoke receipts cannot contain screenshots, user values, browsing history, analytics identifiers, or personal notes."
        },
        {
            "id": "smoke-summary-count-drift",
            "description": "A smoke receipt with summary counts that do not match fixture row states is invalid.",
            "expectValid": False,
            "expectReadyForH10Review": False,
            "expectedErrorCodes": ["summary-count-mismatch"],
            "inputKind": "completed-local-json",
            "mutation": {"passedFixtures": 0, "failedFixtures": 0, "blockedFixtures": 0, "readyForH10Review": True},
            "mustFailBecause": "Fails because summary counts and readyForH10Review must be recomputed from fixture rows."
        },
        {
            "id": "smoke-final-decision-overreach",
            "description": "A smoke receipt that tries to move H10 directly is invalid.",
            "expectValid": False,
            "expectReadyForH10Review": False,
            "expectedErrorCodes": ["final-decision-overreach"],
            "inputKind": "completed-local-json",
            "mutation": {"finalDecision.status": "passed-ready-to-drain", "readyToDrainH10": True},
            "mustFailBecause": "Fails because app/design must make the H10 decision in docs/CONTENT-HANDOFF.md."
        }
    ]
    smoke_error_copy = {
        "malformed-smoke-receipt": {
            "label": "Smoke receipt unreadable",
            "message": "The selected smoke receipt is not readable local JSON.",
            "repairHint": "Export or paste the local smoke receipt JSON again."
        },
        "smoke-schema-mismatch": {
            "label": "Smoke receipt shape changed",
            "message": "The smoke receipt schema or local boundary fields changed.",
            "repairHint": "Start from the current generated smoke receipt template."
        },
        "fixture-row-count-mismatch": {
            "label": "Fixture rows do not match",
            "message": "The smoke receipt does not include exactly one row for each transcript assertion.",
            "repairHint": "Regenerate the smoke template or restore the missing fixture rows."
        },
        "generated-expectation-mismatch": {
            "label": "Expected fields were edited",
            "message": "A fixture row no longer matches the generated transcript assertion.",
            "repairHint": "Copy expected fields from runtimeAssertions before reviewing observed output."
        },
        "missing-observed-transcript-fields": {
            "label": "Observed transcript fields missing",
            "message": "A passed fixture row is missing observed transcript evidence.",
            "repairHint": "Record observed title, section IDs, issue codes, readyToDrain, and recordedAt."
        },
        "observed-transcript-mismatch": {
            "label": "Observed transcript differs",
            "message": "Observed transcript fields differ from the generated expectation.",
            "repairHint": "Repair the rendered transcript or mark the fixture failed with a note."
        },
        "forbidden-privacy-field": {
            "label": "Private field found",
            "message": "The smoke receipt includes a field that must stay out of local evidence.",
            "repairHint": "Remove screenshots, user values, browsing history, analytics identifiers, and personal notes."
        },
        "summary-count-mismatch": {
            "label": "Summary counts do not match",
            "message": "Smoke summary counts do not match the fixture row states.",
            "repairHint": "Recompute passed, failed, blocked, and readyForH10Review from the fixture rows."
        },
        "final-decision-overreach": {
            "label": "Final decision overreaches",
            "message": "The smoke receipt tries to move H10 directly.",
            "repairHint": "Keep readyToDrainH10 false until app/design updates docs/CONTENT-HANDOFF.md."
        }
    }
    smoke_result_states = [
        {
            "state": "pending-smoke-template",
            "label": "Smoke receipt pending",
            "headline": "Local transcript smoke receipt is still blank.",
            "body": "Use this state for the generated template before observed transcript fields are recorded.",
            "readyForH10Review": False,
            "action": "Run the local transcript smoke."
        },
        {
            "state": "not-ready-for-h10-review",
            "label": "Smoke receipt not ready",
            "headline": "Local transcript smoke has a failing or blocked row.",
            "body": "Keep H10 active and record the visible transcript mismatch in notes.",
            "readyForH10Review": False,
            "action": "Fix the transcript or keep the blocker."
        },
        {
            "state": "ready-for-h10-review",
            "label": "Ready for app/design smoke review",
            "headline": "All transcript smoke fixtures passed locally.",
            "body": "This is app/design review evidence only; H10 moves only through docs/CONTENT-HANDOFF.md.",
            "readyForH10Review": True,
            "action": "Review before moving H10."
        },
        {
            "state": "invalid",
            "label": "Smoke receipt needs repair",
            "headline": "Local transcript smoke receipt does not match the contract.",
            "body": "Fix the listed smoke receipt issues before treating it as review evidence.",
            "readyForH10Review": False,
            "action": "Repair the smoke receipt."
        }
    ]

    def smoke_copy_state_for_case(case):
        if case.get("expectValid") is False:
            return "invalid"
        if case.get("expectReadyForH10Review") is True:
            return "ready-for-h10-review"
        if case.get("rowState") == "all-blank":
            return "pending-smoke-template"
        return "not-ready-for-h10-review"

    smoke_result_copy = {
        "status": "h10-transcript-smoke-validation-copy-contract",
        "purpose": "Bounded app-facing copy for local transcript smoke receipt validation results.",
        "schema": "h10-transcript-smoke-validation-copy-v1",
        "localOnly": True,
        "noServerAuthority": True,
        "displayRules": [
            "Show smoke error codes before any ready-for-review state.",
            "Always say the smoke receipt stays local and is not uploaded.",
            "Use ready copy only as ready for app/design smoke review, never as automatic H10 drain.",
            "Keep H10 active until app/design updates docs/CONTENT-HANDOFF.md.",
            "Do not include screenshots, user values, browsing history, analytics identifiers, or personal notes."
        ],
        "resultStates": smoke_result_states,
        "errorCopy": [
            {
                "code": error.get("code"),
                "severity": error.get("severity"),
                "label": smoke_error_copy.get(error.get("code"), {}).get("label"),
                "message": smoke_error_copy.get(error.get("code"), {}).get("message") or error.get("message"),
                "repairHint": smoke_error_copy.get(error.get("code"), {}).get("repairHint") or error.get("repairHint"),
                "fixtureIds": [
                    case.get("id")
                    for case in smoke_validator_fixture_cases
                    if error.get("code") in (case.get("expectedErrorCodes") or [])
                ]
            }
            for error in smoke_validator_error_codes
        ],
        "fixtureCopyExpectations": [
            {
                "fixtureId": case.get("id"),
                "expectedState": smoke_copy_state_for_case(case),
                "expectedReadyForH10Review": case.get("expectReadyForH10Review"),
                "expectedErrorCodes": case.get("expectedErrorCodes") or []
            }
            for case in smoke_validator_fixture_cases
        ],
        "mustNot": [
            "Do not use smoke validator copy to claim H10 is drained.",
            "Do not upload smoke receipts or validation results automatically.",
            "Do not soften privacy-field errors into warnings."
        ],
        "coverage": {
            "resultStateCount": len(smoke_result_states),
            "errorCopyCount": len(smoke_validator_error_codes),
            "fixtureCopyExpectationCount": len(smoke_validator_fixture_cases),
            "localOnly": True
        }
    }
    smoke_review_sections = [
        {
            "id": "context",
            "label": "Smoke review context",
            "includeFields": ["schema", "createdAt", "channel", "buildHash", "activeHandoff", "summary", "finalDecision"],
            "instruction": "Name the local smoke receipt context before any result wording."
        },
        {
            "id": "validator-result",
            "label": "Smoke validator result",
            "includeFields": ["state", "readyForH10Review", "label", "headline", "body", "action"],
            "instruction": "Use smoke resultCopy state text exactly and keep ready copy app/design-scoped."
        },
        {
            "id": "errors",
            "label": "Smoke issues to repair",
            "includeFields": ["code", "severity", "label", "message", "repairHint", "fixtureIds"],
            "instruction": "List every smoke error code before ready-for-review text."
        },
        {
            "id": "fixture-evidence",
            "label": "Smoke fixture evidence",
            "includeFields": smoke_receipt_row_fields,
            "instruction": "Summarize each transcript smoke fixture row without screenshots or user values."
        },
        {
            "id": "handoff-boundary",
            "label": "H10 handoff boundary",
            "includeFields": ["activeHandoff", "handoffFile", "localOnly", "noServerAuthority", "readyForH10Review"],
            "instruction": "End by saying app/design decides whether H10 moves in docs/CONTENT-HANDOFF.md."
        }
    ]
    smoke_state_summaries = [
        {
            "state": state.get("state"),
            "readyForH10Review": state.get("readyForH10Review"),
            "label": state.get("label"),
            "headline": state.get("headline"),
            "body": state.get("body"),
            "action": state.get("action"),
            "transcriptLine": f"{state.get('label')}: {state.get('headline')}",
            "handoffRule": "App/design decides whether H10 moves in docs/CONTENT-HANDOFF.md."
        }
        for state in smoke_result_copy.get("resultStates") or []
    ]
    smoke_issue_rows = [
        {
            "code": row.get("code"),
            "severity": row.get("severity"),
            "label": row.get("label"),
            "message": row.get("message"),
            "repairHint": row.get("repairHint"),
            "fixtureIds": row.get("fixtureIds") or [],
            "transcriptLine": f"{row.get('code')}: {row.get('message')}"
        }
        for row in smoke_result_copy.get("errorCopy") or []
    ]
    smoke_state_summary_by_id = {row.get("state"): row for row in smoke_state_summaries}
    smoke_issue_by_code = {row.get("code"): row for row in smoke_issue_rows}
    smoke_copy_expectation_by_fixture = {
        row.get("fixtureId"): row
        for row in smoke_result_copy.get("fixtureCopyExpectations") or []
    }
    smoke_review_section_ids = [section.get("id") for section in smoke_review_sections]
    smoke_review_fixture_packets = []
    for case in smoke_validator_fixture_cases:
        expectation = smoke_copy_expectation_by_fixture.get(case.get("id"), {})
        expected_state = expectation.get("expectedState")
        state_summary = smoke_state_summary_by_id.get(expected_state, {})
        expected_issue_codes = expectation.get("expectedErrorCodes") or []
        expected_issues = [smoke_issue_by_code.get(code, {}) for code in expected_issue_codes]
        smoke_review_fixture_packets.append({
            "fixtureId": case.get("id"),
            "expectedState": expected_state,
            "sourceInputKind": case.get("inputKind"),
            "sourceRowState": case.get("rowState"),
            "expectedReadyForH10Review": expectation.get("expectedReadyForH10Review"),
            "expectedTitle": f"H10 transcript smoke validation - {state_summary.get('label')}",
            "expectedSections": smoke_review_section_ids,
            "expectedIssueCodes": expected_issue_codes,
            "expectedIssueLabels": [issue.get("label") for issue in expected_issues if issue.get("label")],
            "expectedRepairHints": [issue.get("repairHint") for issue in expected_issues if issue.get("repairHint")],
            "expectedHandoffRule": state_summary.get("handoffRule"),
            "mustInclude": [
                "All smoke transcript sections render in generated order.",
                "State copy mirrors runtimeAssertionReceiptValidator.resultCopy.",
                "Smoke issue rows render before ready-for-review copy."
            ],
            "mustNot": [
                "Do not upload the smoke validation transcript automatically.",
                "Do not use this smoke transcript to drain H10.",
                "Do not include screenshots, user values, browsing history, analytics identifiers, or personal notes."
            ]
        })
    smoke_validator_review_transcript = {
        "status": "h10-transcript-smoke-validation-review-transcript-contract",
        "purpose": "Bounded local transcript for reviewing transcript smoke validation results.",
        "schema": "h10-transcript-smoke-validation-review-transcript-v1",
        "appOwned": True,
        "activeHandoff": "H10",
        "localOnly": True,
        "noServerAuthority": True,
        "h10DrainableFromTranscriptAlone": False,
        "validatorPointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator",
        "resultCopyPointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy",
        "resultSchemaPointer": "h10-transcript-smoke-validation-result-v1",
        "sections": smoke_review_sections,
        "stateSummaries": smoke_state_summaries,
        "issueRows": smoke_issue_rows,
        "fixturePackets": smoke_review_fixture_packets,
        "lineTemplates": {
            "title": "H10 transcript smoke validation - {stateLabel}",
            "stateLine": "{headline} {body}",
            "issueLine": "{code}: {message} Repair: {repairHint}",
            "fixtureLine": "{fixtureId}: expected {expectedState}; passed {passed}",
            "boundaryLine": "Local smoke receipt only; no automatic upload; app/design decides H10."
        },
        "maxLengths": {
            "title": 88,
            "sectionLabel": 48,
            "instruction": 160,
            "line": 220,
            "handoffRule": 100
        },
        "redactionRules": {
            "forbiddenFields": forbidden_fields,
            "recursiveForbidden": True,
            "noAutomaticSend": True,
            "noScreenshots": True,
            "noUserValues": True,
            "noAnalyticsIdentifiers": True,
            "notesRule": "Notes may name the visible smoke issue, not personal browsing history or private values."
        },
        "mustInclude": [
            "Smoke validator state and readyForH10Review from h10-transcript-smoke-validation-result-v1.",
            "All smoke error codes before ready-for-review copy.",
            "Fixture pass/fail counts from the local smoke receipt.",
            "Local-only boundary and docs/CONTENT-HANDOFF.md final-review note."
        ],
        "mustNot": [
            "Do not include screenshots, user values, personal browsing history, analytics identifiers, or personal notes.",
            "Do not upload or send the smoke validation transcript automatically.",
            "Do not claim the smoke validation transcript drains H10.",
            "Do not rewrite hard privacy errors as warnings."
        ],
        "coverage": {
            "sectionCount": len(smoke_review_sections),
            "stateSummaryCount": len(smoke_state_summaries),
            "issueRowCount": len(smoke_issue_rows),
            "fixturePacketCount": len(smoke_review_fixture_packets),
            "forbiddenFieldCount": len(forbidden_fields),
            "localOnly": True,
            "transcriptAloneDrainable": False
        }
    }
    runtime_assertion_receipt_validator = {
        "status": "h10-transcript-smoke-receipt-validator-contract",
        "purpose": "Local validation recipe for completed H10 transcript smoke receipts.",
        "schema": "h10-transcript-smoke-receipt-validator-v1",
        "appOwned": True,
        "activeHandoff": "H10",
        "validatesPointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate",
        "runtimeAssertionsPointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertions",
        "resultSchema": "h10-transcript-smoke-validation-result-v1",
        "localOnly": True,
        "noServerAuthority": True,
        "h10DrainableFromValidatorAlone": False,
        "requiredShape": {
            "topLevelFields": smoke_receipt_top_level_fields,
            "fixtureResultFields": smoke_receipt_row_fields,
            "fixtureResultCount": len(runtime_assertions),
            "fixtureIds": [assertion.get("fixtureId") for assertion in runtime_assertions]
        },
        "algorithm": smoke_validator_algorithm,
        "errorCodes": smoke_validator_error_codes,
        "fixtureCases": smoke_validator_fixture_cases,
        "resultCopy": smoke_result_copy,
        "reviewTranscript": smoke_validator_review_transcript,
        "outputContract": {
            "schema": "h10-transcript-smoke-validation-result-v1",
            "fields": [
                "valid", "readyForH10Review", "errors", "warnings", "passedFixtures",
                "failedFixtures", "blockedFixtures", "missingFixtureIds", "mismatchedFixtureIds",
                "forbiddenFieldsSeen", "checkedAt"
            ]
        },
        "mustInclude": [
            "Validate generated expected fields against runtimeAssertions before reading observed fields.",
            "Treat privacy-field errors as hard errors, not warnings.",
            "Leave H10 final movement to app/design in docs/CONTENT-HANDOFF.md."
        ],
        "mustNot": [
            "Do not upload or send the smoke receipt automatically.",
            "Do not claim the validator drains H10.",
            "Do not rewrite missing observed fields or privacy errors as warnings."
        ],
        "coverage": {
            "topLevelFieldCount": len(smoke_receipt_top_level_fields),
            "fixtureResultFieldCount": len(smoke_receipt_row_fields),
            "fixtureResultCount": len(runtime_assertions),
            "algorithmStepCount": len(smoke_validator_algorithm),
            "errorCodeCount": len(smoke_validator_error_codes),
            "fixtureCaseCount": len(smoke_validator_fixture_cases),
            "validFixtureCount": sum(1 for case in smoke_validator_fixture_cases if case.get("expectValid") is True),
            "invalidFixtureCount": sum(1 for case in smoke_validator_fixture_cases if case.get("expectValid") is False),
            "resultCopyStateCount": len(smoke_result_copy.get("resultStates") or []),
            "resultCopyErrorCount": len(smoke_result_copy.get("errorCopy") or []),
            "resultCopyFixtureExpectationCount": len(smoke_result_copy.get("fixtureCopyExpectations") or []),
            "reviewTranscriptSectionCount": len(smoke_validator_review_transcript.get("sections") or []),
            "reviewTranscriptFixtureCount": len(smoke_validator_review_transcript.get("fixturePackets") or []),
            "failureModes": sorted({
                code
                for case in smoke_validator_fixture_cases
                for code in (case.get("expectedErrorCodes") or [])
            }),
            "resultFieldCount": 11,
            "localOnly": True,
            "validatorAloneDrainable": False
        }
    }
    return {
        "status": "h10-validator-review-transcript-contract",
        "purpose": "Bounded local H10 validation review transcript for app/design handoff.",
        "appOwned": True,
        "activeHandoff": "H10",
        "localOnly": True,
        "noServerAuthority": True,
        "h10DrainableFromTranscriptAlone": False,
        "schema": "h10-validator-review-transcript-v1",
        "validatorPointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator",
        "resultCopyPointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.resultCopy",
        "receiptTemplatePointer": "provenanceDisplayContract.drainContract.receiptTemplate",
        "resultSchemaPointer": recipe.get("outputContract", {}).get("schema"),
        "sections": sections,
        "stateSummaries": state_summaries,
        "issueRows": issue_rows,
        "fixturePackets": fixture_packets,
        "runtimeAssertions": runtime_assertions,
        "runtimeAssertionReceiptTemplate": runtime_assertion_receipt_template,
        "runtimeAssertionReceiptValidator": runtime_assertion_receipt_validator,
        "lineTemplates": {
            "title": "H10 local receipt review - {stateLabel}",
            "stateLine": "{headline} {body}",
            "issueLine": "{code}: {message} Repair: {repairHint}",
            "scenarioLine": "{scenarioId}: expected {expectedChip}; observed {observedChip}; passed {passed}",
            "stepLine": "{stepId}: {label}; passed {passed}",
            "boundaryLine": "Local receipt only; no automatic upload; app/design decides H10."
        },
        "maxLengths": {
            "title": 80,
            "sectionLabel": 48,
            "instruction": 160,
            "line": 220,
            "handoffRule": 100
        },
        "redactionRules": {
            "forbiddenFields": forbidden_fields,
            "recursiveForbidden": True,
            "noAutomaticSend": True,
            "noScreenshots": True,
            "noUserValues": True,
            "noAnalyticsIdentifiers": True,
            "notesRule": "Notes may name the visible surface issue, not personal browsing history or private values."
        },
        "mustInclude": [
            "Validator state and readyToDrain from h10-validator-result-v1.",
            "All error codes before any ready-state copy.",
            "Scenario and step pass/fail counts from the local receipt.",
            "Local-only boundary and docs/CONTENT-HANDOFF.md final-review note."
        ],
        "mustNot": [
            "Do not include screenshots, user values, personal browsing history, analytics identifiers, or personal notes.",
            "Do not upload or send the transcript automatically.",
            "Do not claim the transcript drains H10.",
            "Do not rewrite hard privacy errors as warnings."
        ],
        "coverage": {
            "sectionCount": len(sections),
            "stateSummaryCount": len(state_summaries),
            "issueRowCount": len(issue_rows),
            "fixturePacketCount": len(fixture_packets),
            "runtimeAssertionCount": len(runtime_assertions),
            "runtimeAssertionReceiptRowCount": len(runtime_assertion_receipt_template.get("fixtureResults") or []),
            "runtimeAssertionReceiptValidatorStepCount": len(runtime_assertion_receipt_validator.get("algorithm") or []),
            "runtimeAssertionReceiptValidatorFixtureCount": len(runtime_assertion_receipt_validator.get("fixtureCases") or []),
            "runtimeAssertionReceiptValidatorCopyStateCount": len((runtime_assertion_receipt_validator.get("resultCopy") or {}).get("resultStates") or []),
            "runtimeAssertionReceiptValidatorReviewTranscriptSectionCount": len((runtime_assertion_receipt_validator.get("reviewTranscript") or {}).get("sections") or []),
            "forbiddenFieldCount": len(forbidden_fields),
            "scenarioFieldCount": len(scenario_fields),
            "stepFieldCount": len(step_fields),
            "localOnly": True,
            "transcriptAloneDrainable": False
        }
    }

def build_provenance_receipt_validator(drain_contract, tracker):
    receipt_contract = drain_contract.get("receiptContract") or {}
    template = drain_contract.get("receiptTemplate") or {}
    final_lock = tracker.get("finalDecisionLock") or {}
    scenario_ids = [
        row.get("scenarioId") for row in template.get("scenarioResults") or []
        if row.get("scenarioId")
    ]
    step_ids = [
        row.get("stepId") for row in template.get("stepResults") or []
        if row.get("stepId")
    ]
    final_step = drain_contract.get("coverage", {}).get("finalStepId")
    non_final_step_ids = [step_id for step_id in step_ids if step_id != final_step]
    fixture_cases = build_provenance_receipt_validator_cases(scenario_ids, step_ids, final_step, non_final_step_ids, tracker)
    valid_fixture_count = sum(1 for case in fixture_cases if case.get("expectValid") is True)
    invalid_fixture_count = sum(1 for case in fixture_cases if case.get("expectValid") is False)
    failure_modes = sorted({
        case.get("reasonCode") for case in fixture_cases
        if case.get("expectValid") is False and case.get("reasonCode")
    })
    implementation_recipe = build_provenance_receipt_validator_recipe(receipt_contract, scenario_ids, step_ids, final_step, non_final_step_ids, tracker, fixture_cases)
    result_copy = build_provenance_receipt_validator_result_copy(implementation_recipe, fixture_cases)
    review_transcript = build_provenance_receipt_validator_review_transcript(receipt_contract, tracker, result_copy, implementation_recipe, fixture_cases)
    return {
        "status": "h10-local-receipt-validator-contract",
        "purpose": "Validation contract for local H10 evidence receipts before app/design considers the final drain decision.",
        "appOwned": True,
        "activeHandoff": "H10",
        "h10DrainableFromValidatorAlone": False,
        "schema": receipt_contract.get("schema"),
        "validatesPointer": "provenanceDisplayContract.reviewKit.evidenceTracker",
        "templatePointer": "provenanceDisplayContract.drainContract.receiptTemplate",
        "requiredShape": {
            "topLevelFields": receipt_contract.get("requiredTopLevelFields") or [],
            "scenarioResultCount": len(scenario_ids),
            "stepResultCount": len(step_ids),
            "scenarioIds": scenario_ids,
            "stepIds": step_ids,
            "finalStepId": final_step
        },
        "rowRules": {
            "scenarioFields": receipt_contract.get("perScenarioFields") or [],
            "stepFields": ["step", "stepId", "label", "scenarioIds", "passed", "notes", "recordedAt"],
            "observedFieldsRequiredWhenPassed": ["observedChip", "observedConfidenceMode", "recordedAt"],
            "finalStepLockedUntil": non_final_step_ids,
            "finalStepStatusRequires": "All non-final step rows and all scenario rows are passed or have documented equivalent coverage before the final row can pass."
        },
        "statusRules": [
            {
                "status": "pending",
                "readyToDrain": False,
                "allowedWhen": [
                    "Any scenario row or non-final step row has not been recorded.",
                    "The final decision has not been made by app/design."
                ],
                "mustNot": ["Do not treat pending as a blocker-free H10 drain."]
            },
            {
                "status": "blocked",
                "readyToDrain": False,
                "allowedWhen": [
                    "At least one required scenario or step failed, or notes explain why equivalent coverage is missing.",
                    "The final note names the remaining app-owned blocker."
                ],
                "mustNot": ["Do not hide failed rows behind a generic blocked label."]
            },
            {
                "status": "passed-ready-to-drain",
                "readyToDrain": True,
                "allowedWhen": [
                    "Every scenario row is passed or explicitly documented as equivalent coverage.",
                    "Every non-final step row is passed or explicitly documented as equivalent coverage.",
                    "The final step row is recorded after all prerequisites.",
                    "App/design has reviewed the receipt and decided H10 can move in docs/CONTENT-HANDOFF.md."
                ],
                "mustNot": ["Do not move H10 automatically from an exported receipt."]
            }
        ],
        "privacyRules": {
            "forbiddenFields": (tracker.get("storage") or {}).get("forbiddenFields") or [],
            "recursiveForbidden": True,
            "noNetworkSend": True,
            "noScreenshots": True,
            "noUserValues": True,
            "noAnalyticsIdentifiers": True
        },
        "exportChecks": [
            "schema matches h10-local-evidence-v1.",
            "scenarioResults count and IDs match the generated receipt template.",
            "stepResults count and IDs match the generated receipt template.",
            "finalDecision.status is one of the allowed statuses.",
            "readyToDrain is true only for passed-ready-to-drain.",
            "The final step cannot pass while any locked prerequisite is missing.",
            "Receipt JSON contains none of the forbidden privacy fields."
        ],
        "fixtureCases": fixture_cases,
        "implementationRecipe": implementation_recipe,
        "resultCopy": result_copy,
        "reviewTranscript": review_transcript,
        "finalDecisionLock": {
            "stepId": final_step,
            "lockedUntil": final_lock.get("lockedUntil") or [],
            "readyStatus": final_lock.get("readyStatus"),
            "blockedStatus": final_lock.get("blockedStatus"),
            "handoffFile": final_lock.get("handoffFile")
        },
        "coverage": {
            "scenarioResultCount": len(scenario_ids),
            "stepResultCount": len(step_ids),
            "statusRuleCount": 3,
            "forbiddenFieldCount": len((tracker.get("storage") or {}).get("forbiddenFields") or []),
            "fixtureCaseCount": len(fixture_cases),
            "validFixtureCount": valid_fixture_count,
            "invalidFixtureCount": invalid_fixture_count,
            "implementationStepCount": 9,
            "resultCopyStateCount": len(result_copy.get("resultStates") or []),
            "resultCopyErrorCount": len(result_copy.get("errorCopy") or []),
            "reviewTranscriptSectionCount": len(review_transcript.get("sections") or []),
            "reviewTranscriptIssueCount": len(review_transcript.get("issueRows") or []),
            "reviewTranscriptFixtureCount": len(review_transcript.get("fixturePackets") or []),
            "reviewTranscriptRuntimeAssertionCount": len(review_transcript.get("runtimeAssertions") or []),
            "reviewTranscriptRuntimeReceiptRowCount": len((review_transcript.get("runtimeAssertionReceiptTemplate") or {}).get("fixtureResults") or []),
            "reviewTranscriptRuntimeReceiptValidatorStepCount": len((review_transcript.get("runtimeAssertionReceiptValidator") or {}).get("algorithm") or []),
            "reviewTranscriptRuntimeReceiptValidatorFixtureCount": len((review_transcript.get("runtimeAssertionReceiptValidator") or {}).get("fixtureCases") or []),
            "reviewTranscriptRuntimeReceiptValidatorCopyStateCount": len(((review_transcript.get("runtimeAssertionReceiptValidator") or {}).get("resultCopy") or {}).get("resultStates") or []),
            "reviewTranscriptRuntimeReceiptValidatorReviewTranscriptSectionCount": len(((review_transcript.get("runtimeAssertionReceiptValidator") or {}).get("reviewTranscript") or {}).get("sections") or []),
            "failureModeCount": len(failure_modes),
            "failureModes": failure_modes,
            "validatorAloneDrainable": False
        }
    }

def build_provenance_evidence_tracker(groups, drain_contract, final_gate):
    final_step = drain_contract.get("coverage", {}).get("finalStepId")
    group_by_step = {}
    group_by_scenario = {}
    for group in groups:
        for step_id in group.get("appEvidenceStepIds") or []:
            group_by_step.setdefault(step_id, []).append(group)
        for scenario_id in group.get("receiptRows") or []:
            group_by_scenario[scenario_id] = group

    items = []
    non_final_ids = []
    load_id = "h10-evidence-load-generated-contract"
    for step in drain_contract.get("steps") or []:
        step_id = step.get("id")
        item_id = "h10-evidence-" + step_id
        is_final = step_id == final_step
        scenario_ids = list(step.get("scenarioIds") or [])
        surface_group_ids = []
        for scenario_id in scenario_ids:
            group = group_by_scenario.get(scenario_id)
            if group and group.get("id") not in surface_group_ids:
                surface_group_ids.append(group.get("id"))
        if not surface_group_ids:
            for group in group_by_step.get(step_id) or []:
                if group.get("id") not in surface_group_ids:
                    surface_group_ids.append(group.get("id"))
        if is_final:
            surface_group_ids = [group.get("id") for group in groups if group.get("id")]

        receipt_rows = [
            scenario_id for scenario_id in scenario_ids
            if scenario_id in group_by_scenario
        ]
        prerequisites = []
        if step_id != "load-generated-contract":
            prerequisites = list(non_final_ids) if is_final else [load_id]
        item = {
            "id": item_id,
            "stepId": step_id,
            "order": step.get("step"),
            "label": step.get("label"),
            "recordMode": "locked-final-decision" if is_final else "manual-observation",
            "prerequisiteIds": prerequisites,
            "sourceFiles": step.get("sourceFiles") or [],
            "contractPointer": step.get("contractPointer"),
            "surfaceGroupIds": surface_group_ids,
            "scenarioIds": scenario_ids,
            "receiptRows": receipt_rows,
            "requiredReceiptUpdates": {
                "stepResultId": step_id,
                "scenarioResultIds": receipt_rows,
                "stepFields": ["passed", "notes", "recordedAt"],
                "scenarioFields": ["observedChip", "observedConfidenceMode", "passed", "notes", "recordedAt"] if receipt_rows else []
            },
            "readyWhen": step.get("passWhen") or [],
            "mustNot": list(step.get("mustNot") or []) + [
                "Do not auto-record this evidence from generated JSON alone."
            ]
        }
        if is_final:
            item["readyWhen"] = list(step.get("passWhen") or []) + [
                "Every prerequisite evidence item is recorded as passed or has documented equivalent coverage."
            ]
            item["mustNot"].append("Do not unlock the final H10 drain decision while prerequisite evidence is missing.")
        else:
            non_final_ids.append(item_id)
        items.append(item)

    tracker = {
        "status": "h10-local-evidence-tracker-contract",
        "purpose": "App-owned local evidence tracker contract for recording H10 provenance rendering review without accounts or analytics.",
        "appOwned": True,
        "activeHandoff": "H10",
        "h10DrainableFromEvidenceTrackerAlone": False,
        "storage": {
            "key": "cc:h10-local-evidence-v1",
            "schema": (drain_contract.get("receiptContract") or {}).get("schema"),
            "channel": "local-review",
            "localOnly": True,
            "exportFormat": "JSON",
            "forbiddenFields": ["screenshots", "userValues", "personalBrowsingHistory", "analyticsClientId"]
        },
        "items": items,
        "copySummary": {
            "includeFields": ["checkedCount", "totalCount", "missingPrerequisiteIds", "readyToDrain", "buildHash", "channel"],
            "mustSay": "Local H10 evidence only; final drain belongs to app/design.",
            "mustNot": "Do not include screenshots, user values, browsing history, analytics identifiers, or automatic upload wording."
        },
        "finalDecisionLock": {
            "itemId": "h10-evidence-" + final_step if final_step else None,
            "stepId": final_step,
            "lockedUntil": non_final_ids,
            "readyStatus": "passed-ready-to-drain",
            "blockedStatus": "blocked",
            "handoffFile": "docs/CONTENT-HANDOFF.md",
            "finalGate": final_gate,
            "mustNot": [
                "Do not drain H10 from tracker presence alone.",
                "Do not let a copied or exported receipt move docs/CONTENT-HANDOFF.md without app/design review."
            ]
        },
        "coverage": {
            "itemCount": len(items),
            "nonFinalItemCount": len(non_final_ids),
            "surfaceGroupCount": len(groups),
            "drainStepCount": len(drain_contract.get("steps") or []),
            "scenarioReceiptRows": sum(len(item.get("receiptRows") or []) for item in items if item.get("stepId") != final_step),
            "finalLocked": True,
            "dataAloneDrainable": False
        }
    }
    tracker["receiptValidator"] = build_provenance_receipt_validator(drain_contract, tracker)
    return tracker

def build_provenance_review_kit(review_matrix, drain_contract, copy_contract, walkthrough):
    final_step = drain_contract.get("coverage", {}).get("finalStepId")
    step_order = {step.get("id"): step.get("step") for step in drain_contract.get("steps") or []}
    walkthrough_by_scenario = {
        item.get("scenarioId"): item
        for item in walkthrough.get("items") or []
        if item.get("scenarioId")
    }
    surface_copy = {row.get("surface"): row for row in copy_contract.get("surfaceCopy") or []}
    groups = []
    covered = set()
    for surface in review_matrix.get("surfaces") or []:
        surface_id = surface.get("id")
        scenarios = [
            scenario for scenario in review_matrix.get("scenarios") or []
            if scenario.get("surface") == surface_id
        ]
        scenario_ids = [scenario.get("id") for scenario in scenarios if scenario.get("id")]
        covered.update(scenario_ids)
        step_ids = []
        for scenario_id in scenario_ids:
            for step_id in walkthrough_by_scenario.get(scenario_id, {}).get("drainStepIds") or []:
                if step_id != final_step and step_id not in step_ids:
                    step_ids.append(step_id)
        step_ids.sort(key=lambda step_id: step_order.get(step_id, 999))
        copy = surface_copy.get(surface_id) or {}
        routes = []
        expected_chips = []
        expected_confidence_modes = []
        expected_rules = []
        for scenario in scenarios:
            expected = scenario.get("expected") or {}
            route = scenario.get("route")
            if route and route not in routes:
                routes.append(route)
            if expected.get("chip") and expected.get("chip") not in expected_chips:
                expected_chips.append(expected.get("chip"))
            if expected.get("confidenceMode") and expected.get("confidenceMode") not in expected_confidence_modes:
                expected_confidence_modes.append(expected.get("confidenceMode"))
            if expected.get("rule") and expected.get("rule") not in expected_rules:
                expected_rules.append(expected.get("rule"))
        groups.append({
            "id": "h10-kit-" + surface_id,
            "surface": surface_id,
            "routePattern": surface.get("routePattern"),
            "placement": copy.get("placement"),
            "primaryCopy": copy.get("primary"),
            "detailCopy": copy.get("detail"),
            "scenarioIds": scenario_ids,
            "routes": routes,
            "expectedRules": expected_rules,
            "expectedChips": expected_chips,
            "expectedConfidenceModes": expected_confidence_modes,
            "appEvidenceStepIds": step_ids,
            "receiptRows": scenario_ids,
            "passWhen": list(surface.get("mustShow") or []) + [
                "Every listed receipt row has a local pass/fail observation before final review."
            ],
            "mustNot": list(surface.get("mustNot") or []) + [
                "Do not drain H10 from this review-kit group alone."
            ]
        })
    scenario_ids = [
        scenario.get("id") for scenario in review_matrix.get("scenarios") or []
        if scenario.get("id")
    ]
    evidence_tracker = build_provenance_evidence_tracker(groups, drain_contract, walkthrough.get("finalGate"))
    receipt_validator = evidence_tracker.get("receiptValidator") or {}
    validator_transcript = receipt_validator.get("reviewTranscript") or {}
    smoke_validator = validator_transcript.get("runtimeAssertionReceiptValidator") or {}
    smoke_review_transcript = smoke_validator.get("reviewTranscript") or {}
    closure_layers = [
        {
            "id": "display-contract",
            "pointer": "provenanceDisplayContract",
            "status": "h10-app-owned-provenance-display-contract",
            "reviewRole": "Generated source-independence facts and render rules.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "review-matrix",
            "pointer": "provenanceDisplayContract.reviewMatrix",
            "status": review_matrix.get("status"),
            "reviewRole": "Surface fixtures, routes, expected chips, and confidence modes.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "copy-contract",
            "pointer": "provenanceDisplayContract.copyContract",
            "status": copy_contract.get("status"),
            "reviewRole": "Bounded provenance microcopy for app surfaces.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "walkthrough",
            "pointer": "provenanceDisplayContract.walkthrough",
            "status": walkthrough.get("status"),
            "reviewRole": "Ordered app-owned review path over the matrix.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "drain-contract",
            "pointer": "provenanceDisplayContract.drainContract",
            "status": drain_contract.get("status"),
            "reviewRole": "App-owned evidence steps and final H10 drain gate.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "review-kit",
            "pointer": "provenanceDisplayContract.reviewKit",
            "status": "h10-provenance-review-kit",
            "reviewRole": "Compact app-facing review bundle.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "evidence-tracker",
            "pointer": "provenanceDisplayContract.reviewKit.evidenceTracker",
            "status": evidence_tracker.get("status"),
            "reviewRole": "Local-only checklist and receipt export boundary.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "receipt-validator",
            "pointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator",
            "status": receipt_validator.get("status"),
            "reviewRole": "Local receipt validation recipe and result states.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "validator-result-copy",
            "pointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.resultCopy",
            "status": (receipt_validator.get("resultCopy") or {}).get("status"),
            "reviewRole": "Bounded copy for local receipt validation results.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "validator-review-transcript",
            "pointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript",
            "status": validator_transcript.get("status"),
            "reviewRole": "Local app/design transcript for receipt validation review.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "transcript-runtime-assertions",
            "pointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertions",
            "status": "h10-transcript-runtime-assertions",
            "reviewRole": "Smoke expectations for rendering validator review transcripts.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "transcript-smoke-receipt-template",
            "pointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptTemplate",
            "status": (validator_transcript.get("runtimeAssertionReceiptTemplate") or {}).get("schema"),
            "reviewRole": "Blank local smoke-run receipt for transcript assertions.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "transcript-smoke-receipt-validator",
            "pointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator",
            "status": smoke_validator.get("status"),
            "reviewRole": "Local validator recipe for transcript smoke receipts.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "transcript-smoke-fixtures",
            "pointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.fixtureCases",
            "status": "h10-transcript-smoke-fixture-cases",
            "reviewRole": "Valid and invalid smoke-receipt examples.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "transcript-smoke-result-copy",
            "pointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.resultCopy",
            "status": (smoke_validator.get("resultCopy") or {}).get("status"),
            "reviewRole": "Bounded copy for transcript smoke validation results.",
            "drainableFromLayerAlone": False
        },
        {
            "id": "transcript-smoke-review-transcript",
            "pointer": "provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertionReceiptValidator.reviewTranscript",
            "status": smoke_review_transcript.get("status"),
            "reviewRole": "Local transcript for smoke-validation result review.",
            "drainableFromLayerAlone": False
        }
    ]
    closure_manifest = {
        "status": "h10-generated-review-stack-closure",
        "purpose": "Close the generated H10 review stack by naming every generated layer, the remaining app-owned gates, and the no-data-only drain boundary.",
        "schema": "h10-generated-review-stack-closure-v1",
        "appOwned": True,
        "activeHandoff": "H10",
        "localOnly": True,
        "noServerAuthority": True,
        "h10DrainableFromClosureAlone": False,
        "generatedRecursionClosed": True,
        "stackLayers": closure_layers,
        "appOwnedGates": [
            {
                "stepId": step.get("id"),
                "label": step.get("label"),
                "trackedBy": "provenanceDisplayContract.reviewKit.evidenceTracker.items",
                "requiresRunningAppEvidence": step.get("id") != final_step,
                "finalDecision": step.get("id") == final_step,
                "scenarioCount": len(step.get("scenarioIds") or [])
            }
            for step in drain_contract.get("steps") or []
        ],
        "completionRules": [
            "Render provenanceDisplayContract on every reviewKit surface group in the running app.",
            "Record local observations in the H10 receipt template and validate the exported JSON locally.",
            "Use validator review transcripts and smoke validation transcripts only as app/design review aids.",
            "Move H10 in docs/CONTENT-HANDOFF.md only after app/design records the final decision.",
            "Keep screenshots, user values, browsing history, analytics identifiers, and personal notes out of receipts and transcripts."
        ],
        "stopRules": [
            "Do not add another generated validator layer to drain H10.",
            "Do not treat generated closure, audits, or green builds as running-app evidence.",
            "Do not claim source independence beyond provenanceSummary.sourceDomainCount.",
            "Do not upload local receipts, transcripts, or smoke results automatically."
        ],
        "nextAppActions": [
            "Implement or verify provenance rendering on ranked lists, item pages, static verdict cards, node-embedded verdicts, and the Trust Lens control.",
            "Run the local H10 receipt and transcript smoke path in the app.",
            "Record pass/fail evidence and either drain H10 or name the remaining blocker in docs/CONTENT-HANDOFF.md."
        ],
        "coverage": {
            "stackLayerCount": len(closure_layers),
            "appOwnedGateCount": len(drain_contract.get("steps") or []),
            "finalGateId": final_step,
            "surfaceGroupCount": len(groups),
            "scenarioCount": len(scenario_ids),
            "generatedRecursionClosed": True,
            "closureAloneDrainable": False
        }
    }
    return {
        "status": "h10-provenance-review-kit",
        "purpose": "Compact app-facing H10 review package joining surfaces, scenarios, copy, receipt rows, and evidence steps.",
        "appOwned": True,
        "activeHandoff": "H10",
        "h10DrainableFromReviewKitAlone": False,
        "contractPointers": {
            "display": "provenanceDisplayContract",
            "reviewMatrix": "provenanceDisplayContract.reviewMatrix",
            "drainContract": "provenanceDisplayContract.drainContract",
            "copyContract": "provenanceDisplayContract.copyContract",
            "walkthrough": "provenanceDisplayContract.walkthrough",
            "receiptTemplate": "provenanceDisplayContract.drainContract.receiptTemplate"
        },
        "quickStart": [
            "Load provenanceDisplayContract from the generated app data bundle in the running app.",
            "Render each reviewKit surface group with its listed copy, routes, and expected provenance states.",
            "Record local observations against the listed receiptRows and appEvidenceStepIds.",
            "Keep the Trust Lens off by default and confirm enabled state folds, not removes, thinner entries.",
            "Leave H10 active until app/design records the final handoff decision."
        ],
        "surfaceGroups": groups,
        "receiptExport": {
            "schema": (drain_contract.get("receiptContract") or {}).get("schema"),
            "templatePointer": "provenanceDisplayContract.drainContract.receiptTemplate",
            "scenarioRows": len((drain_contract.get("receiptTemplate") or {}).get("scenarioResults") or []),
            "stepRows": len((drain_contract.get("receiptTemplate") or {}).get("stepResults") or []),
            "localOnly": True,
            "forbiddenFields": ["screenshots", "userValues", "personalBrowsingHistory", "analyticsClientId"]
        },
        "handoff": {
            "id": "H10",
            "file": "docs/CONTENT-HANDOFF.md",
            "owner": "design-app",
            "drainOnlyFromAppDesign": True,
            "currentStatus": drain_contract.get("status")
        },
        "finalGate": walkthrough.get("finalGate"),
        "evidenceTracker": evidence_tracker,
        "closureManifest": closure_manifest,
        "coverage": {
            "surfaceGroupCount": len(groups),
            "scenarioCount": len(scenario_ids),
            "coveredScenarioCount": len(covered),
            "allScenariosCovered": set(scenario_ids).issubset(covered),
            "drainStepCount": len(drain_contract.get("steps") or []),
            "receiptScenarioRows": len((drain_contract.get("receiptTemplate") or {}).get("scenarioResults") or []),
            "closureStackLayerCount": len(closure_manifest.get("stackLayers") or []),
            "dataAloneDrainable": False
        }
    }

def build_provenance_drain_contract(review_matrix):
    scenarios = review_matrix.get("scenarios") or []
    scenario_ids = [scenario.get("id") for scenario in scenarios if scenario.get("id")]
    surface_ids = [surface.get("id") for surface in (review_matrix.get("surfaces") or []) if surface.get("id")]
    step_specs = [
        {
            "id": "load-generated-contract",
            "label": "Load the generated provenance contract",
            "scenarioIds": [],
            "sourceFiles": ["app/data/index.json#provenanceDisplayContract", "app/data.js"],
            "appOwnedEvidence": [
                "Running app reads provenanceDisplayContract from the same generated data bundle used by rankings.",
                "Rendered H10 copy names this as evidence guidance, not a data-only drain."
            ],
            "passWhen": [
                "The app can reach renderRules, trustLensControl, reviewMatrix, and drainContract at runtime.",
                "Missing contract data leaves a visible fallback instead of silent overconfident provenance copy."
            ],
            "mustNot": [
                "Do not hard-code H10 fixture copy in app code when generated contract data is present.",
                "Do not treat the presence of provenanceDisplayContract as evidence that surfaces render it."
            ]
        },
        {
            "id": "ranked-list-provenance",
            "label": "Render ranked-list provenance chips",
            "scenarioIds": ["ranked-list-multi-source", "ranked-list-single-source"],
            "sourceFiles": ["app/data/index.json#provenanceDisplayContract.reviewMatrix"],
            "appOwnedEvidence": [
                "Ranked lists render the expected chip for both multi-source and single-source fixtures.",
                "Single-source rows remain visible by default and carry the held-confidence treatment."
            ],
            "passWhen": [
                "The observed chip equals each scenario expected.chip.",
                "The observed confidence mode equals each scenario expected.confidenceMode."
            ],
            "mustNot": [
                "Do not hide single-source entries before the user enables the Trust Lens.",
                "Do not imply multiple independent sources when sourceDomainCount is one."
            ]
        },
        {
            "id": "item-page-provenance",
            "label": "Render item-page source independence",
            "scenarioIds": ["item-page-multi-source", "item-page-single-source", "note-only-entry"],
            "sourceFiles": ["app/data/index.json#provenanceDisplayContract.reviewMatrix"],
            "appOwnedEvidence": [
                "Item pages show distinct source domains for multi-source fixtures.",
                "Item pages group same-domain facts and disclose note-only facts without counting them as sources."
            ],
            "passWhen": [
                "Multi-source sourceLabels render as distinct domains.",
                "Single-source and note-only fixtures use the held-confidence treatment where required."
            ],
            "mustNot": [
                "Do not render same-domain facts as separate corroborating sources.",
                "Do not turn note-only facts into source badges."
            ]
        },
        {
            "id": "static-card-provenance",
            "label": "Keep shareable verdict-card copy honest",
            "scenarioIds": ["static-verdict-card"],
            "sourceFiles": ["app/data/index.json#provenanceDisplayContract.reviewMatrix", "app/c/_cards.json"],
            "appOwnedEvidence": [
                "The static card route and in-app card route stay within the same expected source-independence claim.",
                "Social preview copy avoids stronger corroboration language than expected.chip supports."
            ],
            "passWhen": [
                "The static HTML fixture is reachable and its visible copy does not overclaim independent sourcing.",
                "The in-app card route preserves the same provenance summary posture."
            ],
            "mustNot": [
                "Do not add social-preview trust copy that is stronger than sourceDomainCount allows.",
                "Do not let share-card brevity remove the source-access path."
            ]
        },
        {
            "id": "node-embedded-provenance",
            "label": "Reuse provenance posture on node pages",
            "scenarioIds": ["node-embedded-verdict"],
            "sourceFiles": ["app/data/index.json#provenanceDisplayContract.reviewMatrix", "app/data/nodes/*.json"],
            "appOwnedEvidence": [
                "Embedded verdicts on brand, company, tag, or node pages reuse the entry's generated chip and confidence mode.",
                "Node context does not upgrade or replace an entry provenanceSummary."
            ],
            "passWhen": [
                "The embedded verdict displays the same expected chip as the item-page fixture.",
                "Node descriptive copy remains separate from scored-fact provenance."
            ],
            "mustNot": [
                "Do not increase sourceDomainCount because a node page has extra descriptive text.",
                "Do not hide provenance on embedded verdicts just because the node page has its own receipts."
            ]
        },
        {
            "id": "trust-lens-control",
            "label": "Wire the Trust Lens control without making it the default",
            "scenarioIds": ["trust-lens-control"],
            "sourceFiles": ["app/data/index.json#provenanceDisplayContract.trustLensControl", "app/data/index.json#provenanceDisplayContract.reviewMatrix"],
            "appOwnedEvidence": [
                "The Trust Lens starts off and clearly says it keeps entries backed by two or more independent sources.",
                "When enabled, multi-source entries remain while single-source and no-source entries fold with a show-anyway path."
            ],
            "passWhen": [
                "The control default matches trustLensControl.default.",
                "The enabled state applies trustLensControl.keepRule and foldRule without silent removal."
            ],
            "mustNot": [
                "Do not make the Trust Lens opt-out or default-on.",
                "Do not silently erase folded entries from the page state."
            ]
        },
        {
            "id": "final-h10-drain-decision",
            "label": "Decide whether H10 can drain",
            "scenarioIds": list(scenario_ids),
            "sourceFiles": ["app/data/index.json#provenanceDisplayContract", "docs/CONTENT-HANDOFF.md"],
            "appOwnedEvidence": [
                "Every H10 drainContract step has recorded running-app evidence or a documented equivalent.",
                "The final note records either H10 drained by app/design or the exact remaining app-owned blocker."
            ],
            "passWhen": [
                "All reviewMatrix scenarios have pass/fail observations.",
                "docs/CONTENT-HANDOFF.md moves H10 to drained only after app/design makes that decision."
            ],
            "mustNot": [
                "Do not drain H10 from generated data or audit success alone.",
                "Do not bury remaining app-owned blockers in a generic provenance-rendering done note."
            ]
        }
    ]
    steps = []
    covered = set()
    for index, spec in enumerate(step_specs, start=1):
        spec["scenarioIds"] = [
            scenario_id for scenario_id in (spec.get("scenarioIds") or [])
            if scenario_id in scenario_ids
        ]
        for scenario_id in spec.get("scenarioIds") or []:
            covered.add(scenario_id)
        steps.append({
            "step": index,
            "id": spec["id"],
            "label": spec["label"],
            "scenarioIds": spec["scenarioIds"],
            "sourceFiles": spec["sourceFiles"],
            "contractPointer": "provenanceDisplayContract.reviewMatrix" if spec["id"] != "load-generated-contract" else "provenanceDisplayContract",
            "appOwnedEvidence": spec["appOwnedEvidence"],
            "passWhen": spec["passWhen"],
            "mustNot": spec["mustNot"]
        })
    receipt_template = build_provenance_receipt_template(review_matrix, steps)
    return {
        "purpose": "App-owned H10 drain contract for Trust Lens and provenance display integration.",
        "status": "pending-app-integration",
        "activeHandoff": "H10",
        "namedConsumer": "Claude H10 Trust Lens/provenance drain pass",
        "h10DrainableFromDataAlone": False,
        "drainRule": "H10 drains only after app-owned implementation evidence covers every step here or documents equivalent coverage; generated data alone is insufficient.",
        "receiptContract": {
            "schema": "h10-local-evidence-v1",
            "storage": "device-local or exported JSON; no account, analytics, or server authority",
            "requiredTopLevelFields": ["schema", "createdAt", "channel", "buildHash", "contractStatus", "scenarioResults", "stepResults", "finalDecision"],
            "perScenarioFields": ["scenarioId", "surface", "route", "observedChip", "observedConfidenceMode", "passed", "notes", "recordedAt"],
            "allowedFinalStatuses": ["pending", "passed-ready-to-drain", "blocked"],
            "mustNot": [
                "Do not store user values, personal browsing history, or screenshots in the receipt.",
                "Do not send the receipt anywhere automatically."
            ]
        },
        "receiptTemplate": receipt_template,
        "steps": steps,
        "finalDecision": {
            "expectedStatusBeforeAppWork": "pending-app-integration",
            "dataAloneIsInsufficient": True,
            "drainOnlyWhen": [
                "Every reviewMatrix scenario has running-app evidence or documented equivalent coverage.",
                "The Trust Lens control is visibly off by default and folds rather than silently hides entries when enabled.",
                "Verdict cards, ranked lists, item pages, and node-embedded verdicts render the same generated provenance posture.",
                "docs/CONTENT-HANDOFF.md moves H10 to drained only after app/design makes that decision."
            ],
            "mustNot": [
                "Do not drain H10 from data generation alone.",
                "Do not drain H10 while any surface can imply more independent sources than provenanceSummary supports."
            ]
        },
        "coverage": {
            "steps": len(steps),
            "surfaceCount": len(surface_ids),
            "scenarioCount": len(scenario_ids),
            "coveredScenarioCount": len(covered),
            "allScenariosCovered": set(scenario_ids).issubset(covered),
            "dataAloneDrainable": False,
            "receiptTemplateScenarioCount": len(receipt_template.get("scenarioResults") or []),
            "receiptTemplateStepCount": len(receipt_template.get("stepResults") or []),
            "finalStepId": "final-h10-drain-decision"
        }
    }

def build_provenance_display_contract(index, bundle):
    coverage = {
        "categoryCount": len(index),
        "entryCount": 0,
        "singleSourceEntries": 0,
        "multiSourceEntries": 0,
        "noSourceEntries": 0,
        "noteOnlyEntries": 0
    }
    for cat in index:
        profile = cat.get('provenanceProfile') or {}
        coverage["entryCount"] += profile.get('entryCount', 0)
        coverage["singleSourceEntries"] += profile.get('singleSourceEntries', 0)
        coverage["multiSourceEntries"] += profile.get('multiSourceEntries', 0)
        coverage["noSourceEntries"] += profile.get('noSourceEntries', 0)
        coverage["noteOnlyEntries"] += profile.get('noteOnlyEntries', 0)

    examples = {
        "singleSource": provenance_example("singleSource", index, bundle, lambda s: s.get('singleSource') is True),
        "multiSource": provenance_example("multiSource", index, bundle, lambda s: s.get('sourceDomainCount', 0) > 1),
        "noteOnly": provenance_example("noteOnly", index, bundle, lambda s: s.get('noteOnlyFactCount', 0) > 0),
        "noSource": provenance_example("noSource", index, bundle, lambda s: s.get('sourceDomainCount', 0) == 0)
    }
    card_example = provenance_example("staticCard", index, bundle, lambda s: s.get('sourceDomainCount', 0) > 0, curated_only=True)

    review_matrix = build_provenance_review_matrix(examples, card_example, provenance_mixed_category(index), coverage)

    render_rules = [
        {
            "id": "multi-source",
            "when": "sourceDomainCount > 1",
            "chipTemplate": "{sourceDomainCount} independent sources",
            "confidenceMode": "standard",
            "detail": "Show sourceLabels as the distinct source domains backing the scored facts."
        },
        {
            "id": "single-source",
            "when": "singleSource === true",
            "chipTemplate": "One source: {primarySource}",
            "confidenceMode": "held",
            "detail": "Group all scored facts under one source line; do not render each criterion as if it were independent corroboration."
        },
        {
            "id": "no-source",
            "when": "sourceDomainCount === 0",
            "chipTemplate": "Source links missing",
            "confidenceMode": "held",
            "detail": "Treat note-only facts as notes, not sources, and avoid presenting a corroborated verdict."
        }
    ]
    trust_lens = {
        "default": "off",
        "label": "Show only verdicts backed by two or more independent sources",
        "keepRule": "sourceDomainCount > 1",
        "foldRule": "When enabled, fold single-source and no-source entries into a calm disclosure row with an explicit show-anyway action; do not hide them by default."
    }

    drain_contract = build_provenance_drain_contract(review_matrix)
    copy_contract = build_provenance_copy_contract(review_matrix, render_rules, trust_lens)
    walkthrough = build_provenance_walkthrough(review_matrix, drain_contract, copy_contract)
    return {
        "status": "h10-app-owned-provenance-display-contract",
        "consumer": "Claude H10 Trust Lens and provenance rendering in app/app.js, verdict cards, ranked lists, item pages, and node pages",
        "sourceFields": ["factCount", "sourcedFactCount", "sourceDomainCount", "singleSource", "primarySource", "sourceLabels", "noteOnlyFactCount"],
        "coverage": coverage,
        "renderRules": render_rules,
        "noteOnlyRule": "noteOnlyFactCount counts scored facts with notes but no usable source URL; it must never increase sourceDomainCount.",
        "trustLensControl": trust_lens,
        "drainRule": "H10 can drain only after app-owned surfaces render these rules and the confidence-held state; this data contract alone does not drain H10.",
        "h10DrainableFromDataAlone": False,
        "examples": examples,
        "reviewMatrix": review_matrix,
        "drainContract": drain_contract,
        "copyContract": copy_contract,
        "walkthrough": walkthrough,
        "reviewKit": build_provenance_review_kit(review_matrix, drain_contract, copy_contract, walkthrough)
    }

if not os.path.isdir(RAW) or not any(f.endswith('.jsonl') for f in os.listdir(RAW)):
    sys.exit('No raw cache found — run fetch_raw.py (or ingest_dump.py) first.')

index, bundle = [], {}
for fn in sorted(os.listdir(RAW)):
    if not fn.endswith('.jsonl'):
        continue
    cid = fn[:-6]
    raw = [json.loads(l) for l in open(os.path.join(RAW, fn), encoding='utf-8') if l.strip()]
    split_certifications = cid in CERTIFICATION_SPLIT_CATEGORIES
    admitted_raw = [product for product in raw if scoring.product_belongs_to_category(product, cid)]
    products = scoring.score_category(admitted_raw, split_certifications=split_certifications)
    label = LABELS.get(cid, cid.replace('-', ' ').capitalize())
    primary_axis = FOOD_PRIMARY_AXIS.get(cid, "nutrition_grade")
    ds = {'meta': {'id': cid, 'label': label, 'type': 'Products', 'primaryAxis': primary_axis,
                   'source': 'Open Food Facts',
                   'license': 'ODbL 1.0', 'attribution': ATTR, 'allergens': True,
                   'productBase': 'https://world.openfoodfacts.org/product/',
                   'presets': food_presets(split_certifications), 'n': len(products)},
          'criteria': list(scoring.CERTIFICATION_CRITERIA if split_certifications else scoring.CRITERIA),
          'products': products}
    if split_certifications:
        ds['key2theme'] = dict(S8_CERTIFICATION_THEMES)
        ds['meta']['certificationEvidence'] = certification_coverage(products)
    # C3: bake real Open Prices affordability into food where available (cheaper -> higher 'economical').
    pcache = os.path.join(HERE, 'prices', cid + '.json')
    if os.path.isfile(pcache):
        pc = json.load(open(pcache, encoding='utf-8'))
        priced = [(p, pc[p['code']]) for p in products if p.get('code') in pc]
        if len(priced) >= 5:
            vals = sorted(x[1]['price'] for x in priced)
            lo, hi = vals[0], vals[-1]
            for p, info in priced:
                e = 95 - round((info['price'] - lo) / (hi - lo) * 65) if hi > lo else 70
                p.setdefault('scores', {})['economical'] = int(e)
                p.setdefault('provenance', {})['economical'] = {
                    'note': f"Open Prices observations average about {info['price']} {info.get('currency', 'EUR')} (n={info['n']}).",
                    'source': 'https://prices.openfoodfacts.org/',
                    'asof': '2026'
                }
            ds['criteria'].append({'key': 'economical', 'label': 'Economical', 'source': 'Open Prices', 'tier': 'measured'})
            ds['meta']['presets']['Most affordable'] = {'w': {'economical': 5, 'nutrition_grade': 2, 'environment': 2, 'processing': 1, 'protein': 1, 'low_sugar': 1}, 'x': []}
            ds['meta']['tradeoff'] = ['economical', primary_axis]
            ds['meta']['tradeoffLabels'] = ['cheapest', FOOD_TRADEOFF_LABEL.get(primary_axis, 'best overall')]
            ds['meta']['priced'] = len(priced)
            print(f'    {cid}: economical from Open Prices for {len(priced)} products')
    attach_value_signatures(ds)
    attach_provenance_summaries(ds)
    attach_decision_contract(ds)
    write_json(os.path.join(DATA, cid + '.json'), ds, ensure_ascii=False, indent=1)
    bundle[cid] = ds
    index.append({'id': cid, 'label': label, 'file': cid + '.json', 'n': len(products), 'type': 'Products',
                  'criteria': [{'key': c['key'], 'label': c.get('label', c['key'])} for c in ds['criteria']]})
    if cid in scoring.CATEGORY_MEMBERSHIP:
        print(f'    {cid}: category evidence kept {len(admitted_raw)}/{len(raw)} raw records')
    print(f'  {cid}: {len(raw)} raw → {len(products)} scored → app/data/{cid}.json')

# curated lenses (non-food entry types) — used as-is
LENSES = os.path.normpath(os.path.join(HERE, '..', 'content', 'lenses'))
if os.path.isdir(LENSES):
    for fn in sorted(os.listdir(LENSES)):
        if not fn.endswith('.json'):
            continue
        ds = json.load(open(os.path.join(LENSES, fn), encoding='utf-8'))
        cid = ds['meta']['id']
        # Curated lenses are our researched judgment → 'assessed' tier unless the lens overrides per-criterion.
        for cr in ds.get('criteria', []):
            cr.setdefault('tier', 'assessed')
        ds['meta']['n'] = len(ds['products'])
        apply_initiatives_surface_contract(ds)
        attach_value_signatures(ds)
        attach_provenance_summaries(ds)
        attach_decision_contract(ds)
        write_json(os.path.join(DATA, cid + '.json'), ds, ensure_ascii=False, indent=1)
        bundle[cid] = ds
        index.append({'id': cid, 'label': ds['meta']['label'], 'file': cid + '.json',
                      'n': len(ds['products']), 'type': ds['meta'].get('type', 'Products'),
                      'criteria': [{'key': c['key'], 'label': c.get('label', c['key'])} for c in ds.get('criteria', [])]})
        print(f'  lens {cid}: {len(ds["products"])} entries ({ds["meta"].get("type")})')

ORDER = ['plant-based-milk', 'milk', 'plant-based-yogurt', 'eggs', 'breakfast-cereal', 'granola', 'oats', 'coffee', 'dark-chocolate', 'yogurt', 'olive-oil', 'bread', 'flour-baking', 'plant-based-meat', 'tea', 'pasta-sauce', 'nut-butter', 'nuts', 'fruit-juice', 'ice-cream', 'cheese', 'butter', 'crisps', 'biscuits', 'soda', 'honey', 'fruit-jam', 'rice', 'pasta', 'legumes', 'tofu', 'hummus', 'soups', 'canned-fish', 'fish-seafood', 'canned-tomatoes', 'canned-vegetables', 'frozen-vegetables', 'frozen-pizza', 'ready-meals', 'dried-fruit', 'cereal-bars', 'energy-drinks', 'crackers', 'ketchup', 'mayonnaise', 'salad-dressing', 'pickles', 'chocolate-spread', 'spices-seasoning', 'toothpaste', 'mouthwash', 'soap', 'body-wash', 'shampoo', 'deodorant', 'sunscreen', 'face-wash', 'face-cream', 'hand-cream', 'lip-balm', 'hair-conditioner', 'razors', 'period-products', 'cleaning-products', 'dish-soap', 'laundry', 'paper-goods', 'clothing', 'shoes', 'learning-resources', 'news-sources', 'music-streaming', 'books', 'digital-services', 'ai-assistants', 'password-managers', 'vpn', 'broadband-internet', 'mobile-carriers', 'smart-thermostats', 'phones', 'laptops', 'banking', 'payments', 'investing', 'causes-to-support', 'mission-businesses']
# Needs-first ontology (v4) — expose the human need on every live category while preserving
# the v3 domain/group compatibility fields and routes.
ONT = os.path.normpath(os.path.join(HERE, '..', 'content', 'ontology.json'))
ontology = json.load(open(ONT, encoding='utf-8')) if os.path.isfile(ONT) else None
cid_domain, cid_group, cid_need = {}, {}, {}
if ontology:
    need_ids = {need['id'] for need in ontology.get('needs', [])}
    if len(need_ids) != 8:
        raise ValueError(f'ontology must declare exactly 8 needs, found {len(need_ids)}')
    for dom in ontology.get('domains', []):
        for cat in dom.get('categories', []):
            if cat.get('need') not in need_ids:
                raise ValueError(f"ontology category {dom['label']} / {cat.get('label')} has no valid need")
            if cat.get('cid'):
                cid_domain.setdefault(cat['cid'], dom['label'])
                if cat.get('group'):
                    cid_group.setdefault(cat['cid'], cat['group'])
                previous_need = cid_need.setdefault(cat['cid'], cat['need'])
                if previous_need != cat['need']:
                    raise ValueError(f"ontology cid {cat['cid']} maps to more than one need")
for e in index:
    e['domain'] = cid_domain.get(e['id'], 'Other')
    if e['id'] not in cid_need:
        raise ValueError(f"live category {e['id']} has no ontology need")
    e['need'] = cid_need[e['id']]
    if cid_group.get(e['id']):
        e['group'] = cid_group[e['id']]
for e in index:
    e['regionProfile'] = region_profile(e['id'], bundle.get(e['id'], {}))
    e['provenanceProfile'] = bundle.get(e['id'], {}).get('meta', {}).get('provenanceProfile', {})
    e['valueSignatureProfile'] = bundle.get(e['id'], {}).get('meta', {}).get('valueSignatureProfile', {})
    decision = bundle.get(e['id'], {}).get('meta', {}).get('decision')
    if decision:
        e['decision'] = decision
index.sort(key=lambda e: ORDER.index(e['id']) if e['id'] in ORDER else 99)
index_obj = {'categories': index, 'attribution': ATTR, 'ontology': ontology}  # criteria+ontology in the index → lazy-load needs no products up front
index_obj['regionDecisionContract'] = build_region_decision_contract(index, bundle)
index_obj['namingContract'] = build_naming_contract(index)
index_obj['provenanceDisplayContract'] = build_provenance_display_contract(index, bundle)
index_obj['certificationScoringContract'] = build_certification_scoring_contract()
index_obj['valueEditorial'] = build_value_editorial_contract()
write_json(os.path.join(DATA, 'index.json'), index_obj, ensure_ascii=False, indent=1)

# The catalogue plus these named shared contracts are the complete top-level JSON surface.
# Variable node indexes live under app/data/nodes and have their own manifest closure.
expected_dataset_files = {entry['file'] for entry in index}
expected_data_files = expected_dataset_files | TOP_LEVEL_DATA_CONTRACT_FILES
removed_data_files = []
for name in sorted(os.listdir(DATA)):
    if not name.endswith('.json') or name in expected_data_files:
        continue
    target = os.path.join(DATA, name)
    if os.path.isfile(target):
        os.remove(target)
        removed_data_files.append(name)
if removed_data_files:
    print('Removed ' + str(len(removed_data_files)) + ' orphaned top-level data output(s): '
          + ', '.join(removed_data_files[:8]) + (' ...' if len(removed_data_files) > 8 else ''))

# Bundle everything into one JS global so the app also works opened directly (file://),
# where browsers block fetch() of sibling files.
write_text(os.path.join(os.path.dirname(DATA), 'data.js'), 'window.CC_BUNDLE=' + json.dumps({'index': index_obj, 'data': bundle, 'ontology': ontology}, ensure_ascii=False) + ';\n')
print(f'Wrote app/data/index.json + app/data.js (bundled), {len(index)} categories, ontology={"yes" if ontology else "no"}.')
subprocess.run([sys.executable, os.path.join(HERE, 'build_barcodes.py')], check=True)
# pre-render shareable verdict-card pages (uses the JS engine via node — best-effort, skipped if node absent)
try:
    subprocess.run(['node', os.path.join(HERE, 'build_cards.js')], check=False)
    if os.environ.get('CC_SKIP_CARD_IMAGES', '').lower() in ('1', 'true', 'yes'):
        print('  (card images skipped: CC_SKIP_CARD_IMAGES=1)')
    else:
        subprocess.run([sys.executable, os.path.join(HERE, 'build_card_images.py')], check=False)  # 1200x630 social images
except Exception as _e:
    print('  (verdict cards skipped:', _e, ')')
import stamp  # cache-bust: stamp content hashes into index.html so browsers fetch changed assets
print('Cache-bust: stamped app assets with per-file hashes (bundle v=' + stamp.stamp() + ')')
