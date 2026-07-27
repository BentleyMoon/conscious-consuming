#!/usr/bin/env python3
"""build_site.py — assemble a clean, deploy-ready dist/ for Values Commons.

Why: the project is six static surfaces + a home. This packages ONLY the public surfaces (no pipeline/
research/source-data leak), renders the linked standard docs from Markdown to on-brand HTML (so reviewers
never hit a raw .md), rewrites those doc links, and writes deploy config for either a private preview
or the public site. Output: drag or deploy `dist/` to a static host.

    python pipeline/build_site.py --preview
    python pipeline/build_site.py --public
"""
import os, re, shutil, sys, json, argparse, datetime as _dt, html as _html, hashlib
from urllib.parse import urlsplit
sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DIST = os.path.join(ROOT, 'dist')
PUBLIC_DIRS = ['app', 'kosplora', 'instances', 'assembly', 'workshop', 'slate', 'tour', 'funders', 'standard', 'passport', 'contribute', 'weave', 'awards']
ROOT_FILES  = ['index.html', 'og-standard.png', 'llms.txt']
FLASH_DRIVE_README = os.path.join(ROOT, 'content', 'flash-drive-README.md')
FUNDING_LEDGER = os.path.join(ROOT, 'content', 'ledger.json')
CITATION_BUNDLES = os.path.join(ROOT, 'content', 'citation-bundles')
ODBL_LICENSE = 'https://opendatacommons.org/licenses/odbl/1-0/'
CC_BY_SA_LICENSE = 'https://creativecommons.org/licenses/by-sa/4.0/'
AGPL_LICENSE = 'https://www.gnu.org/licenses/agpl-3.0.en.html'
# The canon a reviewer might actually open — rendered to HTML. Internal masterplans/brainstorms stay out of dist.
PUBLIC_DOCS = ['GRANT-ONE-PAGER', 'GRANT-PREVIEW-PATH', 'DEPLOY-AND-SHARE', 'PREVIEW-FEEDBACK-LOOP', 'R1-REVIEW', 'DECISION-REFRAME-FOUNDER-REVIEW', 'ADOPTION-KIT', 'FEDERATION', 'VALUES-PASSPORT', 'CREATE-AN-INSTANCE', 'INSTANCE-2-KOSPLORA', 'STANDARD-v0', 'THE-VALUES-LAYER', 'THE-WEAVE']

def parse_args():
    parser = argparse.ArgumentParser(description='Build Values Commons dist/ as either public production or private preview.')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--public', action='store_true', help='Build a public production package.')
    mode.add_argument('--preview', action='store_true', help='Build a private noindexed preview package.')
    parser.add_argument('--site-base', default=os.environ.get('CC_SITE_BASE'), help='Canonical app base URL used for generated links.')
    parser.add_argument('--out-dir', default=os.environ.get('VC_DIST_DIR'), help='Output directory. Defaults to ./dist.')
    return parser.parse_args()

ARGS = parse_args()
if ARGS.out_dir:
    DIST = ARGS.out_dir if os.path.isabs(ARGS.out_dir) else os.path.join(ROOT, ARGS.out_dir)
    DIST = os.path.abspath(DIST)
else:
    DIST = DEFAULT_DIST
if DIST in (ROOT, os.path.dirname(ROOT), os.path.abspath(os.path.sep)):
    print('Refusing to use a project/root directory as --out-dir: ' + DIST, file=sys.stderr)
    sys.exit(2)
ENV_PUBLIC = os.environ.get('CC_PUBLIC', '').lower() in ('1', 'true', 'yes', 'public')
if ARGS.public:
    PUBLIC_BUILD = True
elif ARGS.preview:
    PUBLIC_BUILD = False
elif ENV_PUBLIC:
    PUBLIC_BUILD = True
else:
    print('Choose a build mode: python pipeline/build_site.py --public or --preview', file=sys.stderr)
    sys.exit(2)

SITE_BASE = (ARGS.site_base or ('https://valuescommons.org/app' if PUBLIC_BUILD else 'https://conscious-consuming.example')).rstrip('/')
BUILD_MODE = 'public-production' if PUBLIC_BUILD else 'private-preview'

def _origin(url):
    parts = urlsplit(url)
    return (parts.scheme + '://' + parts.netloc).rstrip('/') if parts.scheme and parts.netloc else url.rstrip('/')

SITE_ORIGIN = _origin(SITE_BASE)

ROUTE_META = {
    'index.html': {'path': '/', 'title': 'Values Commons', 'image': '/og-standard.png'},
    'app/index.html': {'url': SITE_BASE + '/', 'title': 'Conscious Consuming', 'image': SITE_BASE + '/og-home.png'},
    'standard/index.html': {'path': '/standard/', 'title': 'Open Values Standard'},
    'passport/index.html': {'path': '/passport/', 'title': 'Your values file'},
    'instances/index.html': {'path': '/instances/', 'title': 'Apps built on Values Commons'},
    'instances/new/index.html': {'path': '/instances/new/', 'title': 'Build a Values Commons app'},
    'instances/messages/index.html': {'path': '/instances/messages/', 'title': 'Where to Message'},
    'contribute/index.html': {'path': '/contribute/', 'title': 'Contribute to Values Commons'},
    'weave/index.html': {'path': '/weave/', 'title': 'Ownership and alternatives map'},
    'kosplora/index.html': {'path': '/kosplora/', 'title': 'Kosplora'},
    'assembly/index.html': {'path': '/assembly/', 'title': 'Find group agreement'},
    'workshop/index.html': {'path': '/workshop/', 'title': 'Repair sourced facts'},
    'slate/index.html': {'path': '/slate/', 'title': 'Make a shared plan'},
    'tour/index.html': {'path': '/tour/', 'title': 'Values Commons tour'},
    'funders/index.html': {'path': '/funders/', 'title': 'Values Commons grant brief', 'image': '/funders/og-funders.png'},
    'awards/index.html': {'path': '/awards/', 'title': 'Awards ledger'},
}

def _absolute_url(url, page_url):
    if re.match(r'https?://', url):
        return url
    if url.startswith('/'):
        return SITE_ORIGIN + url
    return page_url.rstrip('/') + '/' + url

def _route_url(info):
    return info.get('url') or (SITE_ORIGIN + info['path'])

def _first_match(text, pattern):
    m = re.search(pattern, text, re.I)
    return m.group(1).strip() if m else ''

def _load_json(path, default=None):
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh)
    except Exception:
        return default

def _sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def _provenance_years(ds):
    years = []
    for product in ds.get('products', []):
        provenance = product.get('provenance') or {}
        if not isinstance(provenance, dict):
            continue
        for value in provenance.values():
            if isinstance(value, dict) and value.get('asof'):
                m = re.match(r'^(\d{4})', str(value.get('asof')))
                if m:
                    years.append(int(m.group(1)))
    return years

def _published_lens_rows():
    index_path = os.path.join(DIST, 'app', 'data', 'index.json')
    index = _load_json(index_path, {'categories': []})
    rows = []
    for cat in index.get('categories', []):
        cid = cat.get('id')
        filename = cat.get('file') or (str(cid) + '.json')
        if not cid:
            continue
        data_path = os.path.join(DIST, 'app', 'data', filename)
        if not os.path.exists(data_path):
            continue
        ds = _load_json(data_path, {})
        meta = ds.get('meta') or {}
        years = _provenance_years(ds)
        digest = _sha256_file(data_path)
        lens = {
            'id': cid,
            'title': cat.get('label') or meta.get('label') or cid,
            'type': cat.get('type') or meta.get('type') or 'Thing',
            'domain': cat.get('domain'),
            'group': cat.get('group'),
            'entries': cat.get('n') or meta.get('n') or len(ds.get('products', [])),
            'criteria': [c.get('key') for c in (cat.get('criteria') or ds.get('criteria') or []) if c.get('key')],
            'url': SITE_BASE + '/#explore/' + cid,
            'data': SITE_BASE + '/data/' + filename,
            'sha256': digest,
            'integrity': 'sha256-' + digest,
            'stack': SITE_ORIGIN + '/stacks/lens/' + cid + '/' + digest + '.json',
            'license': ODBL_LICENSE,
            'source': meta.get('source'),
            'attribution': meta.get('attribution'),
        }
        if years:
            lens['asof'] = str(max(years))
            lens['sourceAsOf'] = {'oldest': str(min(years)), 'newest': str(max(years))}
        rows.append({
            'lens': {k: v for k, v in lens.items() if v not in (None, '', [])},
            'data_path': data_path,
            'filename': filename,
            'id': cid,
            'sha256': digest,
        })
    return rows

def _build_well_known_manifest(generated_at, rendered_docs, lens_rows):
    lenses = [row['lens'] for row in lens_rows]
    return {
        'format': 'open-values-door',
        'version': '0.1',
        'generatedAt': generated_at,
        'self': SITE_ORIGIN + '/.well-known/open-values.json',
        'publisher': {
            'name': 'Values Commons',
            'url': SITE_ORIGIN + '/',
        },
        'standard': {
            'name': 'Open Values Standard',
            'version': '0.1',
            'url': SITE_ORIGIN + '/standard/',
            'spec': SITE_ORIGIN + '/docs/STANDARD-v0.html' if 'STANDARD-v0' in rendered_docs else SITE_ORIGIN + '/standard/',
        },
        'instance': {
            'name': 'Conscious Consuming',
            'role': 'reference-instance',
            'url': SITE_BASE + '/',
            'index': SITE_BASE + '/data/index.json',
            'cards': SITE_BASE + '/c/',
        },
        'licenses': {
            'code': AGPL_LICENSE,
            'data': ODBL_LICENSE,
            'guidesAndDocs': CC_BY_SA_LICENSE,
        },
        'privacy': {
            'accounts': False,
            'tracking': False,
            'ads': False,
            'payToRank': False,
            'passportLocation': 'local-device',
        },
        'trustArtifacts': {
            'fundingLedger': SITE_ORIGIN + '/funding-ledger.json',
            'citationBundles': SITE_ORIGIN + '/citation-bundles/',
        },
        'stacks': {
            'index': SITE_ORIGIN + '/stacks/index.json',
            'pattern': SITE_ORIGIN + '/stacks/lens/{id}/{sha256}.json',
            'hash': 'sha256',
        },
        'lenses': lenses,
    }

def _write_stack_files(generated_at, lens_rows):
    stack_root = os.path.join(DIST, 'stacks')
    stack_lens_root = os.path.join(stack_root, 'lens')
    os.makedirs(stack_lens_root, exist_ok=True)
    stack_lenses = []
    for row in lens_rows:
        cid = row['id']
        digest = row['sha256']
        rel_path = 'stacks/lens/' + cid + '/' + digest + '.json'
        target_dir = os.path.join(stack_lens_root, cid)
        os.makedirs(target_dir, exist_ok=True)
        shutil.copy2(row['data_path'], os.path.join(target_dir, digest + '.json'))
        stack_lenses.append({
            'id': cid,
            'sha256': digest,
            'integrity': 'sha256-' + digest,
            'path': '/' + rel_path,
            'url': SITE_ORIGIN + '/' + rel_path,
            'canonicalData': SITE_BASE + '/data/' + row['filename'],
            'license': ODBL_LICENSE,
        })
    index = {
        'format': 'open-values-stack-index',
        'version': '0.1',
        'generatedAt': generated_at,
        'sourceDoor': SITE_ORIGIN + '/.well-known/open-values.json',
        'hash': 'sha256',
        'description': 'Content-addressed Open Values lens copies. Verify sha256 before trusting a fetched lens.',
        'lenses': stack_lenses,
    }
    open(os.path.join(stack_root, 'index.json'), 'w', encoding='utf-8').write(json.dumps(index, indent=2) + '\n')

def _strip_existing_share_meta(text):
    text = re.sub(r'\n?<link\b(?=[^>]*\brel=["\']canonical["\'])[^>]*>', '', text, flags=re.I)
    text = re.sub(r'\n?<meta\b(?=[^>]*\bproperty=["\']og:[^"\']+["\'])[^>]*>', '', text, flags=re.I)
    text = re.sub(r'\n?<meta\b(?=[^>]*\bname=["\']twitter:[^"\']+["\'])[^>]*>', '', text, flags=re.I)
    return text

def _share_meta(title, description, page_url, image_url):
    title = _html.escape(title, quote=True)
    description = _html.escape(description, quote=True)
    page_url = _html.escape(page_url, quote=True)
    image_url = _html.escape(image_url, quote=True)
    return '\n'.join([
        '<link rel="canonical" href="%s">' % page_url,
        '<meta property="og:type" content="website">',
        '<meta property="og:title" content="%s">' % title,
        '<meta property="og:description" content="%s">' % description,
        '<meta property="og:url" content="%s">' % page_url,
        '<meta property="og:image" content="%s">' % image_url,
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="%s">' % title,
        '<meta name="twitter:description" content="%s">' % description,
        '<meta name="twitter:image" content="%s">' % image_url,
    ])

def apply_route_metadata():
    fallback_description = 'Bring your values. Inspect the evidence. Fork the decision. A public-interest ecosystem powered by the Open Values Standard.'
    for rel, info in ROUTE_META.items():
        hp = os.path.join(DIST, rel)
        if not os.path.exists(hp):
            continue
        text = open(hp, encoding='utf-8').read()
        extracted_title = _first_match(text, r'<title>(.*?)</title>')
        description = _first_match(text, r'<meta\b(?=[^>]*\bname=["\']description["\'])[^>]*\bcontent=["\']([^"\']*)["\'][^>]*>') or fallback_description
        page_url = _route_url(info)
        image_url = _absolute_url(info.get('image', '/og-standard.png'), page_url)
        cleaned = _strip_existing_share_meta(text)
        meta = _share_meta(info.get('title') or extracted_title or 'Values Commons', description, page_url, image_url)
        updated = cleaned.replace('</head>', meta + '\n</head>', 1)
        open(hp, 'w', encoding='utf-8').write(updated)

def _site_base_from_generated_url(url, suffix):
    if not url or not url.endswith(suffix):
        return ''
    return url[:-len(suffix)].rstrip('/')

def _generated_app_site_bases():
    probes = [
        ('app/c/index.html', r'<link\b(?=[^>]*\brel=["\']canonical["\'])[^>]*\bhref=["\']([^"\']+/c/)["\']', '/c/'),
        ('app/g/index.html', r'<link\b(?=[^>]*\brel=["\']canonical["\'])[^>]*\bhref=["\']([^"\']+/g/index\.html)["\']', '/g/index.html'),
        ('app/g/digital-literacy.html', r'<meta\b(?=[^>]*\bproperty=["\']og:image["\'])[^>]*\bcontent=["\']([^"\']+/g/digital-literacy\.png)["\']', '/g/digital-literacy.png'),
        ('app/guides.js', r'"url"\s*:\s*"([^"]+/g/digital-literacy\.html)"', '/g/digital-literacy.html'),
    ]
    bases = set()
    for rel, pattern, suffix in probes:
        hp = os.path.join(DIST, rel)
        if not os.path.exists(hp):
            continue
        text = open(hp, encoding='utf-8').read()
        for match in re.findall(pattern, text, flags=re.I):
            base = _site_base_from_generated_url(match, suffix)
            if base:
                bases.add(base)
    bases.update([
        'https://conscious-consuming.example',
        'https://valuescommons.org/app',
    ])
    return {b for b in bases if b and b.rstrip('/') != SITE_BASE and not b.endswith(('/c', '/g'))}

def normalize_packaged_app_site_base():
    old_bases = sorted(_generated_app_site_bases(), key=len, reverse=True)
    if not old_bases:
        return
    targets = []
    for rel_root in ['app/c', 'app/g']:
        root = os.path.join(DIST, rel_root)
        if os.path.isdir(root):
            targets.extend(os.path.join(dp, fn) for dp, _, fs in os.walk(root) for fn in fs if fn.endswith(('.html', '.xml', '.txt')))
    for rel in ['app/guides.js', 'app/sitemap.xml', 'app/robots.txt']:
        hp = os.path.join(DIST, rel)
        if os.path.exists(hp):
            targets.append(hp)
    for hp in targets:
        text = open(hp, encoding='utf-8', newline='').read()
        updated = text.replace('\r\n', '\n').replace('\r', '\n')
        for base in old_bases:
            updated = updated.replace(base, SITE_BASE)
        if updated != text:
            open(hp, 'w', encoding='utf-8', newline='\n').write(updated)

# --- a small, self-contained Markdown -> HTML converter (headings, bold/em, code, links, lists, tables, quotes, hr) ---
def _inline(s):
    s = _html.escape(s, quote=False)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![\w*])\*([^*]+)\*(?![\w*])', r'<em>\1</em>', s)
    return s

def _row(line):
    return [c.strip() for c in line.strip().strip('|').split('|')]

def md_to_html(md):
    lines = md.split('\n'); out = []; i = 0; n = len(lines)
    while i < n:
        ln = lines[i]
        if ln.startswith('```'):
            i += 1; buf = []
            while i < n and not lines[i].startswith('```'): buf.append(_html.escape(lines[i])); i += 1
            i += 1; out.append('<pre><code>' + '\n'.join(buf) + '</code></pre>'); continue
        if not ln.strip(): i += 1; continue
        m = re.match(r'(#{1,6})\s+(.*)', ln)
        if m: lvl = len(m.group(1)); out.append('<h%d>%s</h%d>' % (lvl, _inline(m.group(2)), lvl)); i += 1; continue
        if re.match(r'^(---+|\*\*\*+)\s*$', ln): out.append('<hr>'); i += 1; continue
        if ln.lstrip().startswith('>'):
            buf = []
            while i < n and lines[i].lstrip().startswith('>'): buf.append(_inline(lines[i].lstrip()[1:].lstrip())); i += 1
            out.append('<blockquote>' + '<br>'.join(buf) + '</blockquote>'); continue
        if ln.strip().startswith('|') and i + 1 < n and re.match(r'^\s*\|?[\s:|-]+\|?\s*$', lines[i + 1]):
            head = _row(ln); i += 2; rows = []
            while i < n and lines[i].strip().startswith('|'): rows.append(_row(lines[i])); i += 1
            th = ''.join('<th>%s</th>' % _inline(c) for c in head)
            trs = ''.join('<tr>' + ''.join('<td>%s</td>' % _inline(c) for c in r) + '</tr>' for r in rows)
            out.append('<table><thead><tr>%s</tr></thead><tbody>%s</tbody></table>' % (th, trs)); continue
        if re.match(r'^\s*[-*]\s+', ln):
            buf = []
            while i < n and re.match(r'^\s*[-*]\s+', lines[i]): buf.append('<li>%s</li>' % _inline(re.sub(r'^\s*[-*]\s+', '', lines[i]))); i += 1
            out.append('<ul>' + ''.join(buf) + '</ul>'); continue
        if re.match(r'^\s*\d+\.\s+', ln):
            buf = []
            while i < n and re.match(r'^\s*\d+\.\s+', lines[i]): buf.append('<li>%s</li>' % _inline(re.sub(r'^\s*\d+\.\s+', '', lines[i]))); i += 1
            out.append('<ol>' + ''.join(buf) + '</ol>'); continue
        buf = []
        while i < n and lines[i].strip() and not lines[i].startswith('#') and not lines[i].lstrip().startswith('>') and not lines[i].startswith('```') and not re.match(r'^\s*([-*]|\d+\.)\s+', lines[i]) and not lines[i].strip().startswith('|'):
            buf.append(_inline(lines[i])); i += 1
        out.append('<p>' + '<br>'.join(buf) + '</p>')
    return '\n'.join(out)

DOC_CSS = """
:root{--bg:#faf8f3;--surface:#fff;--ink:#2c2c28;--muted:#6b6a62;--hint:#9a988e;--line:rgba(0,0,0,.10);--accent:#1d7a5a;--track:#ece9e0;
--fd:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,ui-serif,serif;--fm:ui-monospace,Menlo,Consolas,monospace}
@media(prefers-color-scheme:dark){:root{--bg:#16170f;--surface:#1e1f17;--ink:#e7e5d8;--muted:#a3a193;--hint:#76756a;--line:rgba(255,255,255,.12);--accent:#5dcaa5;--track:#2a2b20}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,system-ui,sans-serif;line-height:1.65}
.wrap{max-width:46rem;margin:0 auto;padding:1.5rem 1.25rem 4rem}a{color:var(--accent)}
.back{font-size:.9rem;margin:.5rem 0 .7rem}.docnav{display:flex;flex-wrap:wrap;gap:.35rem .7rem;margin:0 0 1.5rem;font-size:.84rem}
.docnav a{color:var(--muted);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:.16rem .55rem;background:var(--surface)}
.docnav a:hover{color:var(--accent);border-color:var(--accent)}
h1,h2,h3{font-family:var(--fd);font-weight:600;line-height:1.2;margin:1.8rem 0 .6rem}
h1{font-size:2.1rem;margin-top:.5rem}h2{font-size:1.5rem;border-top:.5px solid var(--line);padding-top:1.3rem}h3{font-size:1.18rem}
p,li{font-size:1.02rem}blockquote{border-left:3px solid var(--accent);margin:1rem 0;padding:.4rem 0 .4rem 1rem;color:var(--muted)}
code{font-family:var(--fm);background:var(--track);padding:.08rem .35rem;border-radius:5px;font-size:.88em}
pre{background:var(--track);padding:1rem;border-radius:10px;overflow:auto}pre code{background:none;padding:0}
table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:.92rem}th,td{border:.5px solid var(--line);padding:.45rem .6rem;text-align:left;vertical-align:top}
th{background:var(--track)}hr{border:none;border-top:.5px solid var(--line);margin:2rem 0}
footer{margin-top:2.5rem;border-top:.5px solid var(--line);padding-top:1rem;color:var(--hint);font-size:.85rem}
"""

# The shared leaf mark (passed as a format ARG so its %-encoded data-URI isn't touched by %-formatting).
FAVICON = ("<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'"
           "%3E%3Crect width='64' height='64' rx='14' fill='%231d7a5a'/%3E%3Cpath d='M18 36c0-13 13-20 28-20-2 16-14 23-28 20z' "
           "fill='%23fff'/%3E%3Cpath d='M20 46c6-12 14-18 22-21' stroke='%231d7a5a' stroke-width='2.5' fill='none' "
           "stroke-linecap='round'/%3E%3C/svg%3E\">")

def doc_page(title, body):
    return ('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            '<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#1d7a5a">%s'
            '<title>%s — Values Commons</title><style>%s</style></head><body><div class="wrap">'
            '<p class="back"><a href="../index.html">&larr; Values Commons</a></p>'
            '<nav class="docnav" aria-label="Values Commons docs">'
            '<a href="../tour/index.html">Tour</a><a href="../standard/index.html">Standard</a>'
            '<a href="../passport/index.html">Passport</a><a href="../instances/index.html">Instances</a>'
            '<a href="ADOPTION-KIT.html">Adoption kit</a><a href="../contribute/index.html">Contribute</a>'
            '<a href="../weave/index.html">Weave</a></nav>'
            '<article>%s</article>'
            '<footer>Part of <a href="../index.html">Values Commons</a> · powered by the Open Values Standard · static &amp; local · no tracking</footer>'
            '</div></body></html>') % (FAVICON, _html.escape(title), DOC_CSS, body)

NOTFOUND = ('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            '<meta name="robots" content="noindex,nofollow"><title>Not found — Values Commons</title>'
            '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;text-align:center;padding:2rem;'
            'background:#faf8f3;color:#2c2c28;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}'
            '@media(prefers-color-scheme:dark){body{background:#16170f;color:#e7e5d8}}'
            'h1{font-family:"Iowan Old Style",Palatino,Georgia,serif;font-weight:600;margin:0 0 .4rem}'
            'a{color:#1d7a5a;font-weight:600}p{color:#6b6a62}</style></head><body><div>'
            '<h1>Nothing here</h1><p>That page doesn&rsquo;t exist.</p>'
            '<p><a href="/index.html">&larr; Values Commons</a></p></div></body></html>')

NETLIFY = ('# Private grant preview — not a public launch. Keep it out of search indexes.\n'
           '[[headers]]\n  for = "/*"\n  [headers.values]\n'
           '    X-Robots-Tag = "noindex, nofollow"\n'
           '    X-Frame-Options = "SAMEORIGIN"\n'
           '    X-Content-Type-Options = "nosniff"\n'
           '    Referrer-Policy = "no-referrer"\n')
NETLIFY_PUBLIC = ('# Public static deployment.\n'
                  '[[headers]]\n  for = "/*"\n  [headers.values]\n'
                  '    X-Frame-Options = "SAMEORIGIN"\n'
                  '    X-Content-Type-Options = "nosniff"\n'
                  '    Referrer-Policy = "no-referrer"\n')

HEADERS_PREVIEW = ("/*\n"
                   "  X-Robots-Tag: noindex, nofollow\n"
                   "  X-Frame-Options: SAMEORIGIN\n"
                   "  X-Content-Type-Options: nosniff\n"
                   "  Referrer-Policy: no-referrer\n")
HEADERS_PUBLIC = ("/*\n"
                  "  X-Frame-Options: SAMEORIGIN\n"
                  "  X-Content-Type-Options: nosniff\n"
                  "  Referrer-Policy: no-referrer\n\n"
                  "https://:version.:subdomain.workers.dev/*\n"
                  "  X-Robots-Tag: noindex, nofollow\n")

def _inline_script_hashes(dist):
    # CSP hashes for our OWN inline <script> blocks in the BUILT html (the no-flash theme boot +
    # any templated inline script). Computed at build time so a template edit can never silently
    # break the policy; a runtime-injected script is not in these files and stays blocked.
    import hashlib, base64, glob as _glob
    hashes = set()
    for f in _glob.glob(os.path.join(dist, '**', '*.html'), recursive=True):
        try:
            t = open(f, encoding='utf-8').read()
        except OSError:
            continue
        for m in re.finditer(r'<script>(.*?)</script>', t, re.S):
            digest = hashlib.sha256(m.group(1).encode('utf-8')).digest()
            hashes.add("'sha256-%s'" % base64.b64encode(digest).decode('ascii'))
    return sorted(hashes)

def _security_headers(dist):
    # The docs/SECURITY-AND-PRACTICES.md §2 target policy: strict CSP + HSTS + Permissions-Policy.
    # connect-src lists only Open Food Facts, which turns "nothing leaves your device" from a
    # promise into an enforced guarantee: an injected script has nowhere to send anything.
    hashes = _inline_script_hashes(dist)
    script_src = "'self'" + ((' ' + ' '.join(hashes)) if hashes else '')
    csp = ("default-src 'self'; script-src %s; style-src 'self' 'unsafe-inline'; "
           "img-src 'self' data: https://images.openfoodfacts.org https://world.openfoodfacts.org; "
           "connect-src 'self' https://world.openfoodfacts.org; object-src 'none'; "
           "base-uri 'self'; frame-ancestors 'none'; form-action 'self'") % script_src
    return ("  Content-Security-Policy: " + csp + "\n"
            "  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload\n"
            "  Permissions-Policy: geolocation=(), microphone=(), camera=(self)\n")

def _write_root_sitemap():
    """Write a sitemap index covering the ecosystem surfaces plus the app's own sitemap.

    ROUTE_META is already the registry of every public route, so the ecosystem half is derived
    from it rather than from a second hand-kept list that would drift out of sync.
    """
    today = _dt.date.today().isoformat()
    urls = ['/']
    for meta in ROUTE_META.values():
        path = meta.get('path')
        if path and path not in urls:
            urls.append(path)
    rows = ''.join(
        '  <url><loc>%s%s</loc><lastmod>%s</lastmod></url>\n' % (SITE_ORIGIN, u, today)
        for u in urls
    )
    pages = ('<?xml version="1.0" encoding="UTF-8"?>\n'
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + rows + '</urlset>\n')
    open(os.path.join(DIST, 'sitemap-pages.xml'), 'w', encoding='utf-8').write(pages)

    index = ('<?xml version="1.0" encoding="UTF-8"?>\n'
             '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
             '  <sitemap><loc>%s/sitemap-pages.xml</loc><lastmod>%s</lastmod></sitemap>\n'
             '  <sitemap><loc>%s/app/sitemap.xml</loc><lastmod>%s</lastmod></sitemap>\n'
             '</sitemapindex>\n') % (SITE_ORIGIN, today, SITE_ORIGIN, today)
    open(os.path.join(DIST, 'sitemap.xml'), 'w', encoding='utf-8').write(index)
    print('sitemap: %d ecosystem pages, indexed with the app sitemap at /sitemap.xml' % len(urls))


def main():
    if os.path.isdir(DIST): shutil.rmtree(DIST)
    os.makedirs(DIST)
    for d in PUBLIC_DIRS:
        src = os.path.join(ROOT, d)
        # Raw Markdown stays out of dist; selected docs are rendered to HTML.
        # Served mode lazy-loads per-category JSON. app/data.js is only the
        # file:// fallback and is too large for Cloudflare Workers assets.
        ignored = ['*.md']
        if d == 'app' and PUBLIC_BUILD:
            ignored.append('data.js')
        ignore = shutil.ignore_patterns(*ignored)
        if os.path.isdir(src): shutil.copytree(src, os.path.join(DIST, d), ignore=ignore)
    for f in ROOT_FILES:
        if os.path.exists(os.path.join(ROOT, f)): shutil.copy2(os.path.join(ROOT, f), os.path.join(DIST, f))
    if os.path.exists(FLASH_DRIVE_README):
        shutil.copy2(FLASH_DRIVE_README, os.path.join(DIST, 'README-FLASH-DRIVE.txt'))
    if os.path.exists(FUNDING_LEDGER):
        shutil.copy2(FUNDING_LEDGER, os.path.join(DIST, 'funding-ledger.json'))
    if os.path.isdir(CITATION_BUNDLES):
        shutil.copytree(CITATION_BUNDLES, os.path.join(DIST, 'citation-bundles'), ignore=shutil.ignore_patterns('*.md'))

    os.makedirs(os.path.join(DIST, 'docs'), exist_ok=True)
    rendered = []
    for name in PUBLIC_DOCS:
        p = os.path.join(ROOT, 'docs', name + '.md')
        if not os.path.exists(p): continue
        md = open(p, encoding='utf-8').read()
        title = name.replace('-', ' ').title()
        m = re.search(r'^#\s+(.+)$', md, re.M)
        if m: title = m.group(1).strip()
        open(os.path.join(DIST, 'docs', name + '.html'), 'w', encoding='utf-8').write(doc_page(title, md_to_html(md)))
        rendered.append(name)

    htmls = [os.path.join(dp, fn) for dp, _, fs in os.walk(DIST) for fn in fs if fn.endswith('.html')]
    for hp in htmls:
        t = open(hp, encoding='utf-8').read(); o = t
        for name in rendered: t = t.replace(name + '.md', name + '.html')   # only rewrite docs we actually rendered
        if t != o: open(hp, 'w', encoding='utf-8').write(t)

    # Neutralize any link from a rendered doc into the UNrendered internal corpus -> send it home, never 404.
    for name in rendered:
        dp = os.path.join(DIST, 'docs', name + '.html')
        t = open(dp, encoding='utf-8').read()
        t2 = re.sub(r'href="[^"]*?\.md"', 'href="../index.html"', t)
        if t2 != t: open(dp, 'w', encoding='utf-8').write(t2)

    apply_route_metadata()
    normalize_packaged_app_site_base()

    if PUBLIC_BUILD:
        # Two sitemaps exist: the app writes its own for ~3,000 guide and card pages, and the
        # ecosystem surfaces had none at all, so the landing page was in no sitemap anywhere.
        _write_root_sitemap()
        robots = "User-agent: *\nAllow: /\nSitemap: " + SITE_ORIGIN + "/sitemap.xml\n"
        headers = HEADERS_PUBLIC
        netlify = NETLIFY_PUBLIC
    else:
        robots = "User-agent: *\nDisallow: /\n"
        headers = HEADERS_PREVIEW
        netlify = NETLIFY
    headers = headers.replace('  Referrer-Policy: no-referrer\n',
                              '  Referrer-Policy: no-referrer\n' + _security_headers(DIST), 1)
    open(os.path.join(DIST, 'robots.txt'), 'w', encoding='utf-8').write(robots)
    open(os.path.join(DIST, '_headers'), 'w', encoding='utf-8').write(headers)
    open(os.path.join(DIST, 'netlify.toml'), 'w', encoding='utf-8').write(netlify)
    open(os.path.join(DIST, '.assetsignore'), 'w', encoding='utf-8').write("netlify.toml\n")
    open(os.path.join(DIST, '404.html'), 'w', encoding='utf-8').write(NOTFOUND)
    generated_at = _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    build_meta = {
        'mode': BUILD_MODE,
        'siteBase': SITE_BASE,
        'siteOrigin': SITE_ORIGIN,
        'generatedAt': generated_at,
        'surfaces': PUBLIC_DIRS,
        'docsRendered': rendered,
        'appDataFallback': not PUBLIC_BUILD
    }
    open(os.path.join(DIST, 'build-meta.json'), 'w', encoding='utf-8').write(json.dumps(build_meta, indent=2) + '\n')
    lens_rows = _published_lens_rows()
    _write_stack_files(generated_at, lens_rows)
    well_known_dir = os.path.join(DIST, '.well-known')
    os.makedirs(well_known_dir, exist_ok=True)
    open(os.path.join(well_known_dir, 'open-values.json'), 'w', encoding='utf-8').write(
        json.dumps(_build_well_known_manifest(generated_at, rendered, lens_rows), indent=2) + '\n'
    )

    leftover = set()
    for hp in htmls:
        for mm in re.findall(r'href="[^"]*?([\w-]+\.md)"', open(hp, encoding='utf-8').read()):
            if not os.path.exists(os.path.join(DIST, 'docs', mm.replace('.md', '.html'))): leftover.add(mm)
    print('dist:', DIST)
    print('surfaces:', ', '.join(PUBLIC_DIRS))
    print('docs rendered:', ', '.join(rendered) or '(none)')
    print('config:', 'PUBLIC at ' + SITE_BASE if PUBLIC_BUILD else 'NOINDEXED preview')
    print('mode:', BUILD_MODE)
    print('flash-drive README:', 'yes' if os.path.exists(os.path.join(DIST, 'README-FLASH-DRIVE.txt')) else 'no')
    print('funding ledger:', 'yes' if os.path.exists(os.path.join(DIST, 'funding-ledger.json')) else 'no')
    print('citation bundles:', 'yes' if os.path.isdir(os.path.join(DIST, 'citation-bundles')) else 'no')
    print('well-known door:', 'yes' if os.path.exists(os.path.join(DIST, '.well-known', 'open-values.json')) else 'no')
    print('stacks:', 'yes' if os.path.exists(os.path.join(DIST, 'stacks', 'index.json')) else 'no')
    print('dangling .md links:', ', '.join(sorted(leftover)) if leftover else 'none')

if __name__ == '__main__':
    main()
