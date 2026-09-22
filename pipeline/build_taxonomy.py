#!/usr/bin/env python3
"""Compile the authored taxonomy outline into content/taxonomy.json.

WHY THIS EXISTS. The catalogue used to describe the whole of what a person buys, rents, joins,
or gives to with 206 rows in content/ontology.json. That file is the NAVIGATION: what the site
can show today. It was being read as if it were the MAP: what there is to show at all. Those are
different objects and conflating them made the catalogue look like a starter kit, because a
starter kit is exactly what a navigation tree with no map behind it looks like.

This compiler builds the map. The map is complete by intention and mostly unbuilt by admission,
and it publishes its own coverage so the difference is a number rather than an impression.

THE SHAPE, AND WHY FOUR LEVELS AND NOT ARBITRARY DEPTH. realm > field > family > decision, which
is the depth COICOP 2018 uses (division > group > class > subclass) for the same subject matter.
Arbitrary nesting sounds more capable and navigates worse: a reader cannot learn a structure whose
depth changes per branch. Capability lives in the facets instead, which cross the tree.

THE WORK UNIT IS THE DECISION. One comparable choice a person actually faces. Its id is unique
across the whole map, which is what lets a swarm of agents claim units without collision, and what
makes "how much of the map is built" a countable question.

INHERITANCE. need, type, mode, cadence, and actor flow realm -> field -> family -> decision, so a
line only says what makes it different from its parent. Terse lines are the point: the map is
large, and a format that costs ten lines per decision does not get finished.

Run: python pipeline/build_taxonomy.py
"""

import json
import os
import re
import sys
import unicodedata
from collections import Counter, OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
SRC = os.path.join(ROOT, 'content', 'taxonomy')
OUT = os.path.join(ROOT, 'content', 'taxonomy.json')
ONTOLOGY = os.path.join(ROOT, 'content', 'ontology.json')
INDEX = os.path.join(ROOT, 'app', 'data', 'index.json')

NEEDS = ['nourish', 'care', 'keep-a-home', 'connect', 'move', 'learn', 'give-and-act', 'protect']
TYPES = {'P': 'Products', 'S': 'Services', 'O': 'Organizations', 'I': 'Initiatives', 'M': 'Media'}

# How a person comes to have the thing. This is the facet the old tree could not express at all,
# which is why borrowing, repairing, and sharing had nowhere to live in a catalogue whose whole
# argument is that buying new is not the only move.
MODES = ['buy', 'subscribe', 'rent', 'hire', 'borrow', 'share', 'make', 'reuse', 'free', 'give']

# How often the decision comes round. It sets how much a reader should invest in getting it right:
# a once-a-decade decision deserves an afternoon, a weekly one deserves a rule.
CADENCES = ['daily', 'weekly', 'monthly', 'seasonal', 'yearly', 'rare', 'once']

# Who is deciding. A catalogue that only addresses one shopper cannot hold the decisions a
# household makes together, or the ones a small organisation makes on behalf of people.
ACTORS = ['person', 'household', 'community', 'organization']

SCOPES = ['covered', 'open', 'hold', 'out']

# The external referee. Completeness against an invented list is an opinion; completeness against
# a published international standard is a check somebody else can run. Titles verified against the
# UN Statistics Division's COICOP 2018 structure.
COICOP = {
    'standard': 'COICOP 2018',
    'name': 'Classification of Individual Consumption According to Purpose',
    'publisher': 'United Nations Statistics Division',
    'source': 'https://unstats.un.org/unsd/classifications/Econ/Structure',
    'asof': '2026-08',
    'divisions': OrderedDict([
        ('01', 'Food and non-alcoholic beverages'),
        ('02', 'Alcoholic beverages, tobacco and narcotics'),
        ('03', 'Clothing and footwear'),
        ('04', 'Housing, water, electricity, gas and other fuels'),
        ('05', 'Furnishings, household equipment and routine household maintenance'),
        ('06', 'Health'),
        ('07', 'Transport'),
        ('08', 'Information and communication'),
        ('09', 'Recreation, sport and culture'),
        ('10', 'Education services'),
        ('11', 'Restaurants and accommodation services'),
        ('12', 'Insurance and financial services'),
        ('13', 'Personal care, social protection and miscellaneous goods and services'),
        ('14', 'Individual consumption expenditure of non-profit institutions serving households'),
        ('15', 'Individual consumption expenditure of general government'),
    ]),
}

INHERITED = ('need', 'type', 'mode', 'cadence', 'actor')
REASON_MIN = 24  # a scope refusal shorter than this is a shrug, not a reason


REPORT = os.path.join(ROOT, 'docs', 'TAXONOMY-MAP.md')

MARK = {'covered': 'built', 'open': 'open', 'hold': 'held', 'out': 'refused'}


class Fail(Exception):
    pass


HOME = os.path.join(ROOT, 'app', 'app.js')

ONES = ('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen '
        'fifteen sixteen seventeen eighteen nineteen').split()
TENS = ('', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety')


def spell(n):
    if n < 20:
        return ONES[n]
    tens, ones = divmod(n, 10)
    return TENS[tens] + (f'-{ONES[ones]}' if ones else '')


def check_front_page_counts(counts):
    """The front page says how big the map is. Make the map able to prove it.

    The nexus card claims a number of realms and fields in words. Nothing else reads it, so it
    would rot silently the first time a realm outline gained a field, and the one page whose whole
    argument is that facts carry sources would be carrying a wrong one. This does not fix the copy;
    it refuses to build until a person does, because the sentence has a rhythm a generator would
    ruin.
    """
    if not os.path.isfile(HOME):
        return
    if not 1000 <= counts['decisions'] < 2000:
        raise Fail(f"the front page says \"more than a thousand decisions\" and the map now holds "
                   f"{counts['decisions']}. Rewrite that phrase in app/app.js.")
    want = (f"{spell(counts['realms']).capitalize()} realms, {spell(counts['fields'])} fields, "
            f"more than a thousand decisions")
    page = open(HOME, encoding='utf-8').read()
    if want in page:
        return
    marker = ' realms, '
    saw = ''
    at = page.find(marker)
    if at != -1:
        start = page.rfind('\n', 0, at) + 1
        saw = page[start:page.find(',', page.find('decisions', at))].strip()
    raise Fail(f'the front page must say "{want}". It says "{saw or "nothing of the kind"}". '
               f'Fix the nexus card in app/app.js.')


def write_report(doc):
    """The whole map, readable without a JSON parser.

    A content agent has to be able to see what is unclaimed, and a person has to be able to read
    the refusals and argue with them. Both of those need a document, not a data file.
    """
    counts = doc['counts']
    out = []
    w = out.append
    w('# The map')
    w('')
    w('*Generated by `pipeline/build_taxonomy.py` from `content/taxonomy/`. Do not edit this file; '
      'edit the realm outlines and rebuild.*')
    w('')
    w(f"**{counts['decisions']} decisions** across {counts['realms']} realms, "
      f"{counts['fields']} fields and {counts['families']} families. "
      f"{counts['covered']} are built ({counts['coveredPercent']} per cent of those in scope), "
      f"{counts['open']} are open for work, {counts['hold']} are held with a reason, and "
      f"{counts['out']} are refused with a reason.")
    w('')
    w('This is the map, not the navigation. `content/ontology.json` is what the site can show '
      'today. The gap between the two is the work, and publishing it as a number is the point: a '
      'catalogue that shows only what it has built looks finished when it is nine per cent done.')
    w('')
    w('## Coverage against COICOP 2018')
    w('')
    w('COICOP 2018 is the United Nations classification of what individuals consume. It is used '
      'here as an outside referee, so that "the map covers everything" is a check somebody else '
      'can run rather than a claim this project makes about itself.')
    w('')
    w('| Division | Title | Realms | In scope | Built |')
    w('|---|---|---|---:|---:|')
    for code, row in doc['byDivision'].items():
        realms = ', '.join(row['realms']) or 'none'
        w(f"| {code} | {row['title']} | {realms} | {row['inScope']} | {row['covered']} |")
    w('')
    w('## Coverage by need')
    w('')
    w('| Need | In scope | Built |')
    w('|---|---:|---:|')
    for need, row in doc['byNeed'].items():
        w(f"| {need} | {row['inScope']} | {row['covered']} |")
    w('')
    w('## The realms')
    for realm in doc['realms']:
        decisions = [d for f in realm['fields'] for fam in f['families'] for d in fam['decisions']]
        built = sum(1 for d in decisions if d['scope'] == 'covered')
        w('')
        w(f"### {realm['label']}")
        w('')
        w(f"*{realm['edge']}*")
        w('')
        w(f"{len(decisions)} decisions, {built} built. COICOP {', '.join(realm['coicop'])}.")
        for field in realm['fields']:
            w('')
            w(f"**{field['label']}**")
            w('')
            for family in field['families']:
                items = []
                for d in family['decisions']:
                    tag = '' if d['scope'] == 'open' else f" [{MARK[d['scope']]}]"
                    items.append(f"{d['label']}{tag}")
                w(f"- *{family['label']}*: " + '; '.join(items))
    w('')
    w('## Everything held or refused, with its reason')
    w('')
    w('A catalogue that silently omits things looks incomplete. A catalogue that names what it '
      'will not do, and why, can be argued with. These are the arguable ones.')
    for realm in doc['realms']:
        for field in realm['fields']:
            for family in field['families']:
                for d in family['decisions']:
                    if d['scope'] in ('hold', 'out'):
                        w('')
                        w(f"**{d['label']}** ({realm['label']}, {MARK[d['scope']]})")
                        w('')
                        w(d['reason'])
    w('')
    with open(REPORT, 'w', encoding='utf-8', newline='') as handle:
        handle.write('\n'.join(out))


def slug(value):
    v = unicodedata.normalize('NFKD', str(value or '')).encode('ascii', 'ignore').decode('ascii')
    v = v.lower().replace('&', ' and ')
    v = re.sub(r'[^a-z0-9]+', '-', v)
    return v.strip('-')


def parse_attrs(parts, where):
    """Trailing `key: value` pairs, plus a bare single-letter type code."""
    attrs = {}
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if part in TYPES:
            attrs['type'] = part
            continue
        if ':' not in part:
            raise Fail(f'{where}: "{part}" is neither a type code nor a key: value pair')
        key, _, value = part.partition(':')
        key, value = key.strip().lower(), value.strip()
        if key in attrs:
            raise Fail(f'{where}: duplicate key "{key}"')
        attrs[key] = value
    return attrs


def parse_realm(path):
    with open(path, encoding='utf-8') as handle:
        lines = handle.read().split('\n')

    realm = {'front': OrderedDict(), 'fields': []}
    field = family = None
    front = True

    for lineno, raw in enumerate(lines, 1):
        where = f'{os.path.basename(path)}:{lineno}'
        line = raw.rstrip()
        if not line.strip() or line.lstrip().startswith('//'):
            continue

        if line.startswith('### '):
            front = False
            if field is None:
                raise Fail(f'{where}: a family appears before any field')
            head, *rest = line[4:].split('|')
            family = {'label': head.strip(), 'attrs': parse_attrs(rest, where),
                      'decisions': [], 'where': where}
            field['families'].append(family)
        elif line.startswith('## '):
            front = False
            head, *rest = line[3:].split('|')
            field = {'label': head.strip(), 'attrs': parse_attrs(rest, where),
                     'families': [], 'where': where}
            family = None
            realm['fields'].append(field)
        elif line.startswith('- '):
            front = False
            if family is None:
                raise Fail(f'{where}: a decision appears before any family')
            head, *rest = line[2:].split('|')
            family['decisions'].append({'label': head.strip(),
                                        'attrs': parse_attrs(rest, where), 'where': where})
        elif front:
            if ':' not in line:
                raise Fail(f'{where}: front matter needs key: value, got "{line}"')
            key, _, value = line.partition(':')
            realm['front'][key.strip().lower()] = value.strip()
        else:
            raise Fail(f'{where}: cannot read "{line[:60]}"')

    return realm


def inherit(child, parent):
    out = dict(parent)
    out.update({k: v for k, v in child.items() if v not in (None, '')})
    return out


def build(write=True):
    """Compile, validate, and optionally write.

    WHY --check EXISTS. content/taxonomy.json and docs/TAXONOMY-MAP.md are shared outputs. When
    several lane agents work in one tree, each running a full build means concurrent writers to the
    same two files, and an agent committing a map that contains another agent's half-finished
    outline edit. A lane agent needs to know its own outline still parses, which is validation, not
    output. The orchestrator writes the files once, afterwards, when the tree is quiet.
    """
    if not os.path.isdir(SRC):
        raise Fail(f'no taxonomy source at {SRC}')
    files = sorted(f for f in os.listdir(SRC) if f.endswith('.md'))
    if not files:
        raise Fail(f'no realm files in {SRC}')

    realms = []
    decisions = []          # flat, in document order
    seen_ids = {}
    problems = []

    for name in files:
        parsed = parse_realm(os.path.join(SRC, name))
        front = parsed['front']
        for required in ('realm', 'label', 'need', 'edge', 'coicop'):
            if required not in front:
                raise Fail(f'{name}: front matter is missing "{required}"')

        codes = [c.strip() for c in front['coicop'].split(',') if c.strip()]
        for code in codes:
            if code not in COICOP['divisions'] and code != 'none':
                raise Fail(f'{name}: coicop "{code}" is not a COICOP 2018 division')

        base = {'need': front['need'], 'type': front.get('type', 'P'),
                'mode': front.get('mode', 'buy'), 'cadence': front.get('cadence', 'rare'),
                'actor': front.get('actor', 'person')}
        if base['need'] not in NEEDS:
            raise Fail(f'{name}: need "{base["need"]}" is not one of the eight')

        realm = OrderedDict([
            ('id', front['realm']), ('label', front['label']), ('edge', front['edge']),
            ('coicop', codes), ('need', base['need']), ('fields', []),
        ])

        for f in parsed['fields']:
            f_attrs = inherit({k: f['attrs'].get(k) for k in INHERITED}, base)
            field = OrderedDict([('id', slug(f['label'])), ('label', f['label']),
                                 ('families', [])])
            if f['attrs'].get('coicop'):
                field['coicop'] = [c.strip() for c in f['attrs']['coicop'].split(',')]
            if f['attrs'].get('aka'):
                field['aka'] = [x.strip() for x in f['attrs']['aka'].split(',') if x.strip()]
            for fam in f['families']:
                fam_attrs = inherit({k: fam['attrs'].get(k) for k in INHERITED}, f_attrs)
                family = OrderedDict([('id', slug(fam['label'])), ('label', fam['label']),
                                      ('decisions', [])])
                if fam['attrs'].get('aka'):
                    family['aka'] = [x.strip() for x in fam['attrs']['aka'].split(',') if x.strip()]
                for d in fam['decisions']:
                    a = inherit({k: d['attrs'].get(k) for k in INHERITED}, fam_attrs)
                    did = d['attrs'].get('id') or slug(d['label'])
                    where = d['where']

                    if a['need'] not in NEEDS:
                        problems.append(f'{where}: need "{a["need"]}" is not one of the eight')
                    if a['type'] not in TYPES:
                        problems.append(f'{where}: type "{a["type"]}" is not one of {"".join(TYPES)}')
                    if a['mode'] not in MODES:
                        problems.append(f'{where}: mode "{a["mode"]}" is unknown')
                    if a['cadence'] not in CADENCES:
                        problems.append(f'{where}: cadence "{a["cadence"]}" is unknown')
                    if a['actor'] not in ACTORS:
                        problems.append(f'{where}: actor "{a["actor"]}" is unknown')

                    if 'out' in d['attrs']:
                        scope, reason = 'out', d['attrs']['out']
                    elif 'hold' in d['attrs']:
                        scope, reason = 'hold', d['attrs']['hold']
                    elif d['attrs'].get('cid'):
                        scope, reason = 'covered', ''
                    else:
                        scope, reason = 'open', ''
                    if scope in ('out', 'hold') and len(reason) < REASON_MIN:
                        problems.append(
                            f'{where}: scope "{scope}" needs a written reason of at least '
                            f'{REASON_MIN} characters, got {len(reason)}')

                    key = (did, d['attrs'].get('facet', ''))
                    if key in seen_ids:
                        problems.append(f'{where}: decision id "{did}" already used at {seen_ids[key]}')
                    seen_ids[key] = where

                    decision = OrderedDict([
                        ('id', did), ('label', d['label']), ('path',
                            f'{realm["id"]}/{field["id"]}/{family["id"]}/{did}'),
                        ('realm', realm['id']), ('field', field['id']), ('family', family['id']),
                        ('need', a['need']), ('type', TYPES[a['type']]),
                        ('mode', a['mode']), ('cadence', a['cadence']), ('actor', a['actor']),
                        ('scope', scope),
                    ])
                    if d['attrs'].get('cid'):
                        decision['cid'] = d['attrs']['cid']
                    if d['attrs'].get('facet'):
                        decision['facet'] = d['attrs']['facet']
                    if d['attrs'].get('aka'):
                        decision['aka'] = [x.strip() for x in d['attrs']['aka'].split(',') if x.strip()]
                    if reason:
                        decision['reason'] = reason
                    family['decisions'].append(decision)
                    decisions.append(decision)
                if not family['decisions']:
                    problems.append(f'{fam["where"]}: family "{fam["label"]}" holds no decisions')
                field['families'].append(family)
            if not field['families']:
                problems.append(f'{f["where"]}: field "{f["label"]}" holds no families')
            realm['fields'].append(field)
        realms.append(realm)

    # A cid may appear more than once only when each appearance names a different facet, which is
    # how one dataset (digital services) legitimately serves nine decisions.
    by_cid = {}
    for d in decisions:
        if 'cid' not in d:
            continue
        by_cid.setdefault(d['cid'], []).append(d)
    for cid, group in by_cid.items():
        facets = [d.get('facet', '') for d in group]
        if len(group) > 1 and (len(set(facets)) != len(facets) or '' in facets):
            problems.append(f'cid "{cid}" is claimed by {len(group)} decisions without distinct facets')

    # A CID HAS TO NAME SOMETHING THAT EXISTS. Accepted if the app already ships the dataset, or if
    # a lens file declares that id: a lane agent writes the lens before app/data/index.json is
    # rebuilt, so requiring the built index would fail correct work in progress. research/
    # taxonomy_audit.js holds the stricter version, which runs once the tree is quiet.
    shipped = set()
    if os.path.isfile(INDEX):
        try:
            shipped = {c['id'] for c in json.load(open(INDEX, encoding='utf-8')).get('categories', [])}
        except (ValueError, KeyError):
            shipped = set()
    authored = set()
    lens_dir = os.path.join(ROOT, 'content', 'lenses')
    if os.path.isdir(lens_dir):
        for name in os.listdir(lens_dir):
            if not name.endswith('.json'):
                continue
            try:
                meta = json.load(open(os.path.join(lens_dir, name), encoding='utf-8')).get('meta', {})
            except ValueError:
                continue
            if meta.get('id'):
                authored.add(meta['id'])
    if shipped or authored:
        for cid in sorted(by_cid):
            if cid not in shipped and cid not in authored:
                problems.append(f'cid "{cid}" names no dataset: nothing in app/data/index.json and '
                                f'no lens in content/lenses declares it')

    # THE COMPLETENESS LINK. Every row the live navigation shows has to exist on the map, or the
    # map is not a map of this catalogue. Checked by cid for built datasets and by label for gaps.
    # Branch labels count as homes. Some legacy rows were catch-alls rather than decisions
    # ("Pantry staples", "Skincare"), and the honest resolution of a catch-all is the branch that
    # replaced it, not a leaf pretending to be the same thing.
    ontology = json.load(open(ONTOLOGY, encoding='utf-8'))
    rows = [dict(c, domain=dom['label']) for dom in ontology['domains'] for c in dom['categories']]
    labels = {slug(d['label']) for d in decisions} | {a for d in decisions for a in
                                                     (slug(x) for x in d.get('aka', []))}
    for r in realms:
        labels.add(slug(r['label']))
        for f in r['fields']:
            labels.add(f['id'])
            labels.update(slug(x) for x in f.get('aka', []))
            for fam in f['families']:
                labels.add(fam['id'])
                labels.update(slug(x) for x in fam.get('aka', []))
    ids = {d['id'] for d in decisions}
    for row in rows:
        if row.get('cid'):
            if row['cid'] not in by_cid:
                problems.append(f'live navigation row "{row["label"]}" (cid {row["cid"]}) '
                                f'is not placed anywhere on the map')
        elif slug(row['label']) not in labels and slug(row['label']) not in ids:
            problems.append(f'navigation row "{row["label"]}" ({row["domain"]}) '
                            f'has no home on the map')

    if problems:
        for p in problems[:60]:
            print('  FAIL ' + p, file=sys.stderr)
        if len(problems) > 60:
            print(f'  ... and {len(problems) - 60} more', file=sys.stderr)
        raise Fail(f'{len(problems)} problems')

    in_scope = [d for d in decisions if d['scope'] != 'out']
    counts = OrderedDict([
        ('realms', len(realms)),
        ('fields', sum(len(r['fields']) for r in realms)),
        ('families', sum(len(f['families']) for r in realms for f in r['fields'])),
        ('decisions', len(decisions)),
        ('inScope', len(in_scope)),
        ('covered', sum(1 for d in decisions if d['scope'] == 'covered')),
        ('open', sum(1 for d in decisions if d['scope'] == 'open')),
        ('hold', sum(1 for d in decisions if d['scope'] == 'hold')),
        ('out', sum(1 for d in decisions if d['scope'] == 'out')),
        ('datasets', len(by_cid)),
    ])
    counts['coveredPercent'] = round(100.0 * counts['covered'] / max(1, counts['inScope']), 1)

    by_need = OrderedDict()
    for need in NEEDS:
        group = [d for d in decisions if d['need'] == need and d['scope'] != 'out']
        by_need[need] = {'inScope': len(group),
                         'covered': sum(1 for d in group if d['scope'] == 'covered')}

    by_division = OrderedDict()
    for code, title in COICOP['divisions'].items():
        rs = [r for r in realms if code in r['coicop']]
        group = [d for d in decisions if d['realm'] in {r['id'] for r in rs} and d['scope'] != 'out']
        by_division[code] = {'title': title, 'realms': [r['id'] for r in rs],
                             'inScope': len(group),
                             'covered': sum(1 for d in group if d['scope'] == 'covered')}

    doc = OrderedDict([
        ('format', 'open-values-taxonomy'),
        # Semver from the start. Registered in app/data/standard/registry.json, where the audit
        # requires an explicit format to declare a version it can check compatibility against.
        ('version', '1.0.0'),
        ('note', 'The map of what there is to decide about. content/ontology.json is the '
                 'navigation: what the catalogue can show today. This is the map: what there is '
                 'to show at all. Coverage is the difference between them, published as a number '
                 'rather than left as an impression. Authored in content/taxonomy/, compiled by '
                 'pipeline/build_taxonomy.py, gated by research/taxonomy_audit.js.'),
        ('levels', [
            {'id': 'realm', 'label': 'Realm', 'job': 'A part of life the decisions belong to'},
            {'id': 'field', 'label': 'Field', 'job': 'A recognizable area inside that part'},
            {'id': 'family', 'label': 'Family', 'job': 'A set of decisions that trade off together'},
            {'id': 'decision', 'label': 'Decision', 'job': 'One comparable choice, and one unit of work'},
        ]),
        ('facets', OrderedDict([
            ('need', {'values': NEEDS, 'job': 'Why a person is here. Carries the colour.'}),
            ('type', {'values': list(TYPES.values()), 'job': 'What kind of thing is being compared.'}),
            ('mode', {'values': MODES, 'job': 'How a person comes to have it. Buying is one of ten.'}),
            ('cadence', {'values': CADENCES, 'job': 'How often the decision returns.'}),
            ('actor', {'values': ACTORS, 'job': 'Who decides.'}),
            ('scope', {'values': SCOPES, 'job': 'Built, open for work, deliberately held, or refused with a reason.'}),
        ])),
        ('coicop', OrderedDict([(k, v) for k, v in COICOP.items() if k != 'divisions'] +
                               [('divisions', COICOP['divisions'])])),
        ('counts', counts),
        ('byNeed', by_need),
        ('byDivision', by_division),
        ('realms', realms),
    ])

    check_front_page_counts(counts)

    if write:
        with open(OUT, 'w', encoding='utf-8', newline='') as handle:
            json.dump(doc, handle, ensure_ascii=False, indent=1)
            handle.write('\n')
        write_report(doc)
        print(f'Wrote {os.path.relpath(OUT, ROOT)} and {os.path.relpath(REPORT, ROOT)}')
    else:
        print('Checked content/taxonomy/ without writing.')
    print(f"  {counts['realms']} realms, {counts['fields']} fields, "
          f"{counts['families']} families, {counts['decisions']} decisions")
    print(f"  in scope {counts['inScope']}, built {counts['covered']} "
          f"({counts['coveredPercent']}%), open {counts['open']}, "
          f"held {counts['hold']}, refused {counts['out']}")
    return doc


if __name__ == '__main__':
    try:
        build(write='--check' not in sys.argv)
    except Fail as exc:
        print(f'build_taxonomy: {exc}', file=sys.stderr)
        sys.exit(1)
