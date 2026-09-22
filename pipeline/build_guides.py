#!/usr/bin/env python3
"""
H2: turn the curated markdown guides into an in-app bundle.

Reads content/guides/*.md (frontmatter + GFM-subset body), renders to HTML, and
writes app/guides.js (`window.CC_GUIDES`). The app lists & renders them as pages.
No markdown dependency — a small, self-contained converter covering what our
guides use: headings, paragraphs, bullet/number lists, pipe tables, blockquotes,
rules, links, bold/italic/code. Guide content is ours (not crowd data), so the
HTML is trusted. Run: `python build_guides.py`
"""
import re, os, json, sys
from urllib.parse import quote
from tracked_io import write_text
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    Image = ImageDraw = ImageFont = None

HERE = os.path.dirname(os.path.abspath(__file__))
GUIDES = os.path.normpath(os.path.join(HERE, '..', 'content', 'guides'))
APP = os.path.normpath(os.path.join(HERE, '..', 'app'))

def inline(t):
    t = t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2" target="_blank" rel="noopener">\1</a>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<!\*)\*([^*\n]+)\*(?!\*)', r'<em>\1</em>', t)
    return t


# ── {{chart:<category>:<criterion>[:N]}} — an inline SVG bar chart drawn from the LIVE lens data at
#    build time. Real numbers only: if the category or criterion doesn't exist, or fewer than 3 entries
#    carry the fact, the directive renders nothing rather than a hollow picture. Colors ride the app's
#    CSS variables so both themes work; role="img" + <title> carry the accessible description. ──
CHART_RE = re.compile(r'^\{\{chart:([a-z0-9-]+):([a-z_]+)(?::(\d+))?\}\}$')
_chart_data_cache = {}


def _chart_cat(cid):
    if cid not in _chart_data_cache:
        p = os.path.join(APP, 'data', cid + '.json')
        try:
            with open(p, encoding='utf-8') as f:
                _chart_data_cache[cid] = json.load(f)
        except Exception:
            _chart_data_cache[cid] = None
    return _chart_data_cache[cid]


def _xesc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def chart_svg(cid, key, n=8):
    d = _chart_cat(cid)
    if not d:
        return ''
    crit = next((c for c in d.get('criteria', []) if c.get('key') == key), None)
    if not crit:
        return ''
    rows = [(p.get('name', ''), p['scores'][key]) for p in d.get('products', [])
            if isinstance(p.get('scores'), dict) and p['scores'].get(key) is not None]
    if len(rows) < 3:
        return ''
    carrying = len(rows)
    rows.sort(key=lambda r: -r[1])
    rows = rows[:n]
    label = crit.get('label', key)
    catlabel = (d.get('meta') or {}).get('label', cid)
    W, BAR, GAP, LW, TOP = 560, 22, 10, 190, 34
    # 38, not 24: the source line below is two lines now. It used to be one long <text> at x=0,
    # and SVG text does not wrap, so on any category with a longish label it ran past the 560-unit
    # viewBox and the reader saw "...may rank them d". Clipped on every chart in every guide.
    H = TOP + len(rows) * (BAR + GAP) + 38
    out = [f'<svg class="gchart" viewBox="0 0 {W} {H}" role="img" '
           # "live" is build vocabulary here, meaning a category with a dataset behind it. A screen
           # reader hears it as a claim about freshness instead. Say what a reader wants to know.
           f'aria-label="{_xesc(label)} scores for the top {len(rows)} of {_xesc(catlabel)}, from the published data" '
           f'xmlns="http://www.w3.org/2000/svg">',
           f'<title>{_xesc(label)}: the top {len(rows)} of {_xesc(catlabel)}, scored 0 to 100</title>',
           f'<text x="0" y="16" class="gc-t">{_xesc(label)} · top {len(rows)} of {_xesc(catlabel.lower())}</text>']
    for idx, (name, v) in enumerate(rows):
        y = TOP + idx * (BAR + GAP)
        w = max(2, int((W - LW - 52) * v / 100))
        nm = (name[:26] + '…') if len(name) > 27 else name
        out.append(f'<text x="{LW - 8}" y="{y + BAR - 7}" text-anchor="end" class="gc-n">{_xesc(nm)}</text>')
        out.append(f'<rect x="{LW}" y="{y}" width="{w}" height="{BAR}" rx="4" class="gc-bar"/>')
        out.append(f'<text x="{LW + w + 6}" y="{y + BAR - 7}" class="gc-v">{int(v)}</text>')
    out.append(f'<text x="0" y="{H - 20}" class="gc-src">drawn live from the {_xesc(catlabel.lower())} data · '
               f'{carrying} entries carry this fact</text>')
    out.append(f'<text x="0" y="{H - 6}" class="gc-src">your own weighting may rank them differently</text>')
    out.append('</svg>')
    return ''.join(out)


def _is_table_head(i, lines):
    return (i + 1 < len(lines) and '|' in lines[i]
            and bool(re.match(r'^\s*\|?[\s:|-]+\|?\s*$', lines[i + 1])) and '-' in lines[i + 1])


def _starts_block(i, lines):
    s = lines[i].strip()
    return (not s or re.match(r'^#{1,4}\s', s) or s.startswith('>') or re.match(r'^[-*]\s', s)
            or re.match(r'^\d+\.\s', s) or re.match(r'^---+$', s) or _is_table_head(i, lines))


def convert(md):
    lines = md.split('\n')
    out, i = [], 0
    while i < len(lines):
        s = lines[i].strip()
        if not s:
            i += 1; continue
        cm = CHART_RE.match(s)
        if cm:
            svg = chart_svg(cm.group(1), cm.group(2), int(cm.group(3) or 8))
            if svg:
                out.append(svg)
            i += 1; continue
        m = re.match(r'^(#{1,4})\s+(.*)', s)
        if m:
            lvl = len(m.group(1)); out.append(f'<h{lvl}>{inline(m.group(2))}</h{lvl}>'); i += 1; continue
        if re.match(r'^---+$', s):
            out.append('<hr>'); i += 1; continue
        if _is_table_head(i, lines):
            cells = lambda r: [c.strip() for c in r.strip().strip('|').split('|')]
            head = cells(s); i += 2; rows = []
            while i < len(lines) and '|' in lines[i] and lines[i].strip():
                rows.append(cells(lines[i])); i += 1
            t = '<table><thead><tr>' + ''.join(f'<th>{inline(h)}</th>' for h in head) + '</tr></thead><tbody>'
            for r in rows:
                t += '<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>'
            out.append('<div class="gtable-scroll" tabindex="0" role="region" aria-label="Scrollable table">' + t + '</tbody></table></div>'); continue
        if s.startswith('>'):
            q = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                q.append(lines[i].strip()[1:].strip()); i += 1
            out.append('<blockquote>' + inline(' '.join(q)) + '</blockquote>'); continue
        if re.match(r'^[-*]\s+', s):
            items = []
            while i < len(lines) and re.match(r'^[-*]\s+', lines[i].strip()):
                items.append(re.sub(r'^[-*]\s+', '', lines[i].strip())); i += 1
            out.append('<ul>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + '</ul>'); continue
        if re.match(r'^\d+\.\s+', s):
            items = []
            while i < len(lines) and re.match(r'^\d+\.\s+', lines[i].strip()):
                items.append(re.sub(r'^\d+\.\s+', '', lines[i].strip())); i += 1
            out.append('<ol>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + '</ol>'); continue
        para = []
        while i < len(lines) and not _starts_block(i, lines):
            para.append(lines[i].strip()); i += 1
        if para:
            out.append('<p>' + inline(' '.join(para)) + '</p>')
        else:
            i += 1
    return '\n'.join(out)


def parse_front(md):
    meta = {}
    if md.startswith('---'):
        end = md.find('\n---', 3)
        if end != -1:
            for ln in md[3:end].strip().split('\n'):
                if ':' in ln:
                    k, v = ln.split(':', 1); meta[k.strip()] = v.strip()
            md = md[end + 4:].lstrip('\n')
    return meta, md


# --- Discoverability: pre-render guides as real, crawlable, shareable static HTML pages.
# A no-backend SEO/social surface — the guides ARE the marketing. Each page stands alone
# (works from file:// or any static host), carries its own <title> + Open Graph tags, links
# into the SPA tool, and cross-links other guides. Set the deploy domain via CC_SITE_BASE. ---
SITE_BASE = os.environ.get('CC_SITE_BASE', 'https://valuescommons.org/app').rstrip('/')
FAVICON = ('data:image/svg+xml,' +
    quote(open(os.path.join(APP, 'icon.svg'), encoding='utf-8').read().strip(),
          safe="!~*'()"))
NAV = ('<nav class="nav"><a href="../" class="wordmark">Conscious Consuming</a>'
       '<span class="navlinks"><a href="../#home">Home</a><a href="./">Guides</a>'
       '<a href="../#explore">Explore</a><a href="../#browse">Browse</a></span></nav>')
FOOTER = ('<footer>A guide to consuming by your values. Sourced, private, never sponsored.<br>'
          '<a href="../">Open the interactive app →</a></footer>')
W, H = 1200, 630
PAPER, INK, MUTE, GREEN, LINE = (250, 248, 243), (28, 32, 30), (106, 113, 109), (29, 122, 90), (225, 222, 214)
ACCENTS = [(29, 122, 90), (21, 128, 109), (176, 137, 30), (66, 94, 122), (126, 92, 67)]
WF = 'C:/Windows/Fonts/'


def _font(paths, size):
    if ImageFont is None:
        return None
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()


def bold(s):
    return _font([WF + 'segoeuib.ttf', WF + 'arialbd.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'DejaVuSans-Bold.ttf'], s)


def semi(s):
    return _font([WF + 'seguisb.ttf', WF + 'segoeuib.ttf', WF + 'arialbd.ttf', 'DejaVuSans-Bold.ttf'], s)


def reg(s):
    return _font([WF + 'segoeui.ttf', WF + 'arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'DejaVuSans.ttf'], s)


def text_wrap(d, text, fnt, maxw, maxlines=3):
    out, cur = [], ''
    for word in (text or '').split():
        trial = (cur + ' ' + word).strip()
        if d.textlength(trial, font=fnt) <= maxw:
            cur = trial
        else:
            if cur:
                out.append(cur)
            cur = word
            if len(out) == maxlines - 1:
                break
    if cur and len(out) < maxlines:
        out.append(cur)
    used = sum(len(x.split()) for x in out)
    if used < len((text or '').split()) and out:
        out[-1] = out[-1].rstrip('.,;:') + '...'
    return out


def guide_accent(slug):
    n = sum(ord(ch) for ch in slug or '')
    return ACCENTS[n % len(ACCENTS)]


def render_guide_card(g):
    img = Image.new('RGB', (W, H), PAPER)
    d = ImageDraw.Draw(img)
    accent = guide_accent(g.get('slug', ''))
    d.rectangle([1, 1, W - 2, H - 2], outline=LINE, width=2)
    d.rectangle([0, 0, 14, H], fill=accent)
    pad = 72
    d.text((pad, 48), 'CONSCIOUS CONSUMING', font=semi(30), fill=GREEN)
    label = (g.get('category') or 'Guide').upper()
    d.text((pad, 90), label + ' GUIDE', font=reg(23), fill=MUTE)

    title = g.get('title') or g.get('slug') or 'Guide'
    title_font = bold(58)
    title_lines = text_wrap(d, title, title_font, W - 2 * pad, 3)
    while (len(title_lines) > 2 or any(d.textlength(line, font=title_font) > W - 2 * pad for line in title_lines)) and title_font.size > 42:
        title_font = bold(title_font.size - 2)
        title_lines = text_wrap(d, title, title_font, W - 2 * pad, 3)

    y = 174
    for line in title_lines[:3]:
        d.text((pad, y), line, font=title_font, fill=INK)
        y += title_font.size + 10

    y = max(y + 18, 336)
    for line in text_wrap(d, g.get('summary') or '', reg(30), W - 2 * pad, 3):
        d.text((pad, y), line, font=reg(30), fill=(58, 62, 60))
        y += 42

    if g.get('updated'):
        d.text((pad, min(y + 12, H - 148)), 'updated ' + g['updated'], font=reg(22), fill=MUTE)

    d.line([pad, H - 94, W - pad, H - 94], fill=LINE, width=2)
    d.text((pad, H - 74), 'Sourced - private - never sponsored', font=semi(25), fill=GREEN)
    d.text((W - pad, H - 72), 'read the guide ->', font=reg(24), fill=MUTE, anchor='ra')
    return img


def render_guides_index_card(guides):
    img = Image.new('RGB', (W, H), PAPER)
    d = ImageDraw.Draw(img)
    pad = 72
    d.rectangle([1, 1, W - 2, H - 2], outline=LINE, width=2)
    d.rectangle([0, 0, 14, H], fill=GREEN)
    d.text((pad, 56), 'CONSCIOUS CONSUMING', font=semi(32), fill=GREEN)
    d.text((pad, 104), 'sourced guides for spending by your values', font=reg(26), fill=MUTE)
    d.text((pad, 214), 'Guides that make', font=bold(72), fill=INK)
    d.text((pad, 296), 'the choice clearer', font=bold(72), fill=GREEN)
    sub = str(len(guides)) + ' practical guides across money, tech, food, care, media, repair, and everyday goods.'
    y = 414
    for line in text_wrap(d, sub, reg(31), W - 2 * pad, 2):
        d.text((pad, y), line, font=reg(31), fill=(58, 62, 60))
        y += 44
    d.line([pad, H - 94, W - pad, H - 94], fill=LINE, width=2)
    d.text((pad, H - 74), 'No ads - no tracking - no brand pays us', font=semi(25), fill=GREEN)
    d.text((W - pad, H - 72), 'vote with your money ->', font=reg(24), fill=MUTE, anchor='ra')
    return img


def render_guide_images(guides):
    if Image is None:
        print('  (guide images skipped: Pillow not installed - pip install Pillow)')
        return
    gdir = os.path.join(APP, 'g')
    os.makedirs(gdir, exist_ok=True)
    count = 0
    for g in guides:
        render_guide_card(g).save(os.path.join(gdir, g['slug'] + '.png'), 'PNG', optimize=True)
        count += 1
    render_guides_index_card(guides).save(os.path.join(gdir, 'index.png'), 'PNG', optimize=True)
    print('Rendered ' + str(count) + ' guide social images + 1 guide index poster (1200x630 PNG) -> app/g/**.png')


def attr(s):
    return (s or '').replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')


def compact(obj):
    if isinstance(obj, dict):
        return {k: compact(v) for k, v in obj.items() if v not in (None, '', [], {})}
    if isinstance(obj, list):
        return [compact(v) for v in obj if v not in (None, '', [], {})]
    return obj


def json_ld_script(obj):
    data = json.dumps(compact(obj), ensure_ascii=False).replace('<', '\\u003c')
    return '<script type="application/ld+json">' + data + '</script>'


def page_shell(title, desc, canon, body, ver, json_ld=None, image=None):
    url = SITE_BASE + '/' + canon
    image_url = image or (SITE_BASE + '/g/index.png' if canon == 'g/' else SITE_BASE + '/og-home.png')
    if json_ld is None and canon == 'g/':
        json_ld = {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            'name': 'Guides - vote with your money',
            'description': desc,
            'url': url,
            'isPartOf': {'@type': 'WebSite', 'name': 'Conscious Consuming', 'url': SITE_BASE + '/'},
            'image': image_url,
            'license': 'https://creativecommons.org/licenses/by-sa/4.0/'
        }
    ld = json_ld_script(json_ld) + '\n' if json_ld else ''
    return (
        '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f'<title>{attr(title)} · Conscious Consuming</title>\n'
        f'<meta name="description" content="{attr(desc)}">\n'
        f'<link rel="canonical" href="{attr(url)}">\n'
        '<meta property="og:type" content="article">\n'
        '<meta property="og:site_name" content="Conscious Consuming">\n'
        f'<meta property="og:title" content="{attr(title)}">\n'
        f'<meta property="og:description" content="{attr(desc)}">\n'
        f'<meta property="og:url" content="{attr(url)}">\n'
        f'<meta property="og:image" content="{attr(image_url)}">\n'
        '<meta property="og:image:width" content="1200">\n'
        '<meta property="og:image:height" content="630">\n'
        '<meta name="twitter:card" content="summary_large_image">\n'
        f'<meta name="twitter:title" content="{attr(title)}">\n'
        f'<meta name="twitter:description" content="{attr(desc)}">\n'
        f'<meta name="twitter:image" content="{attr(image_url)}">\n'
        + ld +
        '<meta name="theme-color" content="#1d7a5a">\n'
        f'<link rel="icon" href="{FAVICON}">\n'
        f'<link rel="stylesheet" href="../styles.css?v={ver}">\n'
        '</head>\n<body>\n<a class="skip" href="#main">Skip to content</a><div class="wrap">\n'
        + NAV + '\n<main id="main">\n' + body + '\n</main>\n' + FOOTER + '\n</div>\n</body>\n</html>\n')


def guide_page(g, ver, related):
    cat = f'<div class="gcat">{attr(g["category"])}</div>' if g.get('category') else ''
    disc = f'<p class="gdisc">{attr(g["disclosure"])}</p>' if g.get('disclosure') else ''
    html = g['html'].replace('href="#', 'href="../#')  # in-guide SPA links open the app
    cta = ('<a class="featured" href="../#guide/' + g['slug'] + '">'
           '<span class="flabel">Interactive</span><div class="ft">Open this guide in the app</div>'
           '<p class="fs">Compare real options by your own values. The list re-ranks live as you weigh what matters.</p>'
           '<span class="link">Open the tool →</span></a>')
    rel = ''
    if related:
        cards = ''.join(
            '<a class="guidecard" href="./' + r['slug'] + '"><div class="gt">' + attr(r['title']) +
            '</div><p class="gs">' + attr(r['summary']) + '</p></a>' for r in related)
        rel = '<div class="gsec">Read next</div>' + cards
    body = ('<a class="back" href="./">← all guides</a>'
            '<div class="guidehead">' + cat + disc + '</div>'
            '<article class="guide-body">' + html + '</article>'
            '<div class="gd-cta">' + cta + '</div>' + rel)
    url = SITE_BASE + '/g/' + g['slug']
    image = SITE_BASE + '/g/' + g['slug'] + '.png'
    ld = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': g['title'],
        'description': g['summary'],
        'url': url,
        'mainEntityOfPage': url,
        'dateModified': g.get('updated'),
        'author': {'@type': 'Organization', 'name': 'Conscious Consuming'},
        'publisher': {'@type': 'Organization', 'name': 'Values Commons', 'url': 'https://valuescommons.org/'},
        'isPartOf': {'@type': 'WebSite', 'name': 'Conscious Consuming', 'url': SITE_BASE + '/'},
        'about': g.get('category'),
        'image': image,
        'license': 'https://creativecommons.org/licenses/by-sa/4.0/'
    }
    return page_shell(g['title'], g['summary'], 'g/' + g['slug'], body, ver, ld, image)


def guides_index_page(guides, ver):
    """The index of every guide, grouped by category, as rows.

    WAS: one hundred identical cards, each carrying a title, a category label and a forty-word
    summary. It measured 24% boxed, the densest surface anywhere in the ecosystem and more than
    twice the ceiling in the house standards, and it failed for the reason a wall of twelve cards
    failed on Kosplora: nothing varies between them, so there is nothing for the eye to catch.

    A hundred summaries is also more prose than anyone reads on an index. The summary belongs on
    the guide, after the reader has chosen it. Here the row carries what distinguishes one guide
    from another, which is its name and which category it sits in, and the categories become
    headings so the list can be scanned by section instead of read top to bottom.
    """
    by_cat = {}
    order = []
    for g in guides:
        cat = (g.get('category') or 'Other').strip()
        if cat not in by_cat:
            by_cat[cat] = []
            order.append(cat)
        by_cat[cat].append(g)

    groups = []
    for cat in sorted(order, key=lambda c: (-len(by_cat[c]), c.lower())):
        rows = ''.join(
            '<li><a href="./' + g['slug'] + '">' + attr(g['title']) + '</a></li>'
            for g in sorted(by_cat[cat], key=lambda x: x['title'].lower())
        )
        groups.append(
            '<section class="gcat"><h2 class="gcat-h">' + attr(cat) +
            '<span class="gcat-n">' + str(len(by_cat[cat])) + '</span></h2>'
            '<ul class="gcat-l">' + rows + '</ul></section>'
        )

    body = ('<h1 class="sectionh">Guides: vote with your money</h1>'
            '<p class="sectionsub">' + str(len(guides)) + ' short, sourced guides to spending by your '
            'values, in ' + str(len(order)) + ' categories. No ads, never sponsored. Open any guide below, '
            'or <a href="../">use the interactive tool →</a></p>' + ''.join(groups))
    return page_shell('Guides: vote with your money',
                      'An honest, sourced curriculum for spending by your values. No ads, never sponsored.',
                      'g/', body, ver, image=SITE_BASE + '/g/index.png')


def remove_orphaned_guide_outputs(gdir, guides):
    """Keep the generated guide directory closed over the source-derived file set."""
    expected = {'index.html', 'index.png'}
    for guide in guides:
        expected.add(guide['slug'] + '.html')
        expected.add(guide['slug'] + '.png')
    removed = []
    for root, dirs, files in os.walk(gdir, topdown=False):
        for name in sorted(files):
            target = os.path.join(root, name)
            relative = os.path.relpath(target, gdir).replace('\\', '/')
            if relative not in expected:
                os.remove(target)
                removed.append(relative)
        for name in sorted(dirs):
            target = os.path.join(root, name)
            if not os.listdir(target):
                os.rmdir(target)
    if removed:
        print('Removed ' + str(len(removed)) + ' orphaned guide output(s): ' + ', '.join(removed[:8])
              + (' ...' if len(removed) > 8 else ''))


def build_static_pages(guides, ver):
    gdir = os.path.join(APP, 'g')
    os.makedirs(gdir, exist_ok=True)
    remove_orphaned_guide_outputs(gdir, guides)
    for g in guides:
        same = [x for x in guides if x['slug'] != g['slug'] and x.get('category') and x['category'] == g.get('category')]
        others = [x for x in guides if x['slug'] != g['slug']]
        related = same[:3] or others[:3]
        write_text(os.path.join(gdir, g['slug'] + '.html'), guide_page(g, ver, related))
    write_text(os.path.join(gdir, 'index.html'), guides_index_page(guides, ver))
    if os.environ.get('CC_SKIP_GUIDE_IMAGES', '').lower() in ('1', 'true', 'yes'):
        print('  (guide images skipped: CC_SKIP_GUIDE_IMAGES=1)')
    else:
        render_guide_images(guides)
    urls = [SITE_BASE + '/', SITE_BASE + '/g/'] + [SITE_BASE + '/g/' + g['slug'] for g in guides]
    # include the wall-of-verdicts gallery + every sourced card page (built by build_cards.js → app/c/_cards.json)
    cards_manifest = os.path.join(APP, 'c', '_cards.json')
    if os.path.isfile(cards_manifest):
        try:
            cm = json.load(open(cards_manifest, encoding='utf-8'))
            urls.append(SITE_BASE + '/c/')
            # ONLY THE VERDICTS THAT CARRY WHAT A VERDICT NEEDS. The rule and the reason are in
            # pipeline/build_cards.js (verdictIsIndexable); a page under the bar is built, linked
            # and readable, and is marked noindex, so listing it here would contradict the page.
            offered = [c for c in cm if c.get('index')]
            urls += [SITE_BASE + '/c/' + c['cid'] + '/' + c['code'] for c in offered]
            print('  sitemap: ' + str(len(offered)) + ' of ' + str(len(cm))
                  + ' verdict pages carry more than one independent source and a dated check')
        except Exception:
            pass
    sm = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
          + ''.join('  <url><loc>' + u + '</loc></url>\n' for u in urls) + '</urlset>\n')
    write_text(os.path.join(APP, 'sitemap.xml'), sm)
    write_text(os.path.join(APP, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: ' + SITE_BASE + '/sitemap.xml\n')
    print('Pre-rendered ' + str(len(guides)) + ' guide pages + index + sitemap.xml + robots.txt into app/ (base ' + SITE_BASE + ')')


guides = []
for fn in sorted(os.listdir(GUIDES)):
    if not fn.endswith('.md'):
        continue
    raw = open(os.path.join(GUIDES, fn), encoding='utf-8').read()
    meta, body = parse_front(raw)
    html = convert(body)
    # summary = first paragraph's text, stripped of tags
    msum = re.search(r'<p>(.*?)</p>', html, re.S)
    summary = re.sub(r'<[^>]+>', '', msum.group(1)) if msum else ''
    summary = (summary[:180] + '…') if len(summary) > 180 else summary
    guides.append({
        'slug': fn[:-3], 'title': meta.get('title', fn[:-3]),
        'category': meta.get('category', ''), 'disclosure': meta.get('disclosure', ''),
        'updated': meta.get('last_updated', ''), 'summary': summary, 'html': html,
    })

write_text(os.path.join(APP, 'guides.js'), 'window.CC_GUIDES=' + json.dumps(guides, ensure_ascii=False) + ';\n')
print(f'Wrote app/guides.js — {len(guides)} guide(s): {[g["slug"] for g in guides]}')
import stamp  # cache-bust index.html so browsers fetch changed guide/app assets
bundle_ver = stamp.stamp()
style_ver = stamp.asset_version('styles.css')
print('Cache-bust: stamped guide assets with per-file hashes (bundle v=' + bundle_ver + ')')
build_static_pages(guides, style_ver)
for g in guides:
    print(f'  {g["slug"]}: {len(g["html"])} chars html · summary: {g["summary"][:60]}…')
