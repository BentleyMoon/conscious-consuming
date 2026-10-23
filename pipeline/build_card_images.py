#!/usr/bin/env python3
"""build_card_images.py — render a 1200x630 social-card IMAGE (PNG) per verdict, from app/c/_cards.json
   (written by build_cards.js). These become the og:image / twitter:image — what Twitter, Facebook, Slack,
   LinkedIn and iMessage actually DISPLAY when a verdict link is shared. A beautiful visual card spreads; a
   text snippet scrolls past. Honest by construction: no logos we don't own, no ads — just the sourced verdict.
   Run after build_cards.js (build_datasets.py chains both). Needs Pillow; skips gracefully if absent."""
import json, os, sys, re
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print('  (card images skipped: Pillow not installed — pip install Pillow)'); sys.exit(0)

HERE = os.path.dirname(os.path.abspath(__file__))
CDIR = os.path.normpath(os.path.join(HERE, '..', 'app', 'c'))
MANIFEST = os.path.join(CDIR, '_cards.json')
if not os.path.isfile(MANIFEST):
    print('  (card images skipped: no _cards.json — run build_cards.js first)'); sys.exit(0)

W, H = 1200, 630
PAPER, INK, MUTE, GREEN, LINE = (250, 248, 243), (28, 32, 30), (110, 116, 112), (29, 122, 90), (225, 222, 214)
BANDCOL = {'Strong': (29, 122, 90), 'Good': (21, 128, 109), 'Fair': (176, 137, 30), 'Limited': (190, 110, 40), 'Poor': (178, 58, 58)}
def score_color(v):
    if v is None: return MUTE
    return (29,122,90) if v>=80 else (21,128,109) if v>=60 else (176,137,30) if v>=40 else (190,110,40) if v>=20 else (178,58,58)
def band_color(s): return BANDCOL.get((s or '').split(' ')[0], MUTE)

WF = 'C:/Windows/Fonts/'
def _font(paths, size):
    for p in paths:
        try: return ImageFont.truetype(p, size)
        except Exception: pass
    return ImageFont.load_default()
def bold(s): return _font([WF+'segoeuib.ttf', WF+'arialbd.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'DejaVuSans-Bold.ttf'], s)
def semi(s): return _font([WF+'seguisb.ttf', WF+'segoeuib.ttf', WF+'arialbd.ttf', 'DejaVuSans-Bold.ttf'], s)
def reg(s):  return _font([WF+'segoeui.ttf', WF+'arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'DejaVuSans.ttf'], s)

def wrap(d, text, fnt, maxw, maxlines=3):
    out, cur = [], ''
    for w in (text or '').split():
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=fnt) <= maxw: cur = t
        else:
            out.append(cur); cur = w
            if len(out) == maxlines - 1: break
    if cur and len(out) < maxlines: out.append(cur)
    # if we truncated, add an ellipsis to the last line
    used = sum(len(x.split()) for x in out)
    if used < len((text or '').split()) and out: out[-1] = out[-1].rstrip('.,;') + '…'
    return out

def render(card):
    img = Image.new('RGB', (W, H), PAPER)
    d = ImageDraw.Draw(img)
    d.rectangle([1, 1, W-2, H-2], outline=LINE, width=2)
    d.rectangle([0, 0, 14, H], fill=GREEN)              # left accent
    PAD = 72
    # brand row
    d.text((PAD, 46), 'CONSCIOUS CONSUMING', font=semi(30), fill=GREEN)
    d.text((PAD, 88), 'sourced · private · never sponsored', font=reg(23), fill=MUTE)
    # score block (top-right)
    v = card.get('score'); sc = score_color(v)
    bx0, by0, bx1, by1 = W-292, 56, W-PAD, 262
    d.rounded_rectangle([bx0, by0, bx1, by1], radius=20, fill=(255,255,255), outline=sc, width=3)
    cx = (bx0+bx1)//2
    if v is not None:
        d.text((cx, by0+78), str(v), font=bold(112), fill=sc, anchor='mm')
        d.text((cx, by0+140), '/ 100', font=reg(26), fill=MUTE, anchor='mm')
    d.text((cx, by1-30), (card.get('tierLabel') or '—'), font=semi(25), fill=INK, anchor='mm')
    # name (shrink to fit the left column) + brand
    name = card.get('name') or ''
    nf = bold(66); maxname = bx0 - PAD - 28
    while d.textlength(name, font=nf) > maxname and nf.size > 38:
        nf = bold(nf.size - 3)
    ny = 168
    d.text((PAD, ny), name, font=nf, fill=INK)
    yy = ny + nf.size + 14
    if card.get('brand'):
        d.text((PAD, yy), card['brand'], font=reg(27), fill=MUTE); yy += 46
    # reason
    yy = max(yy, 326)
    r = card.get('reason')
    if r:
        af = semi(31); axis = (r.get('label') or '') + ': '
        d.text((PAD, yy), axis, font=af, fill=INK)
        d.text((PAD + d.textlength(axis, font=af), yy), r.get('band') or '', font=af, fill=band_color(r.get('band')))
        yy += 50
        for ln in wrap(d, r.get('note') or '', reg(30), W - 2*PAD, 3):
            d.text((PAD, yy), ln, font=reg(30), fill=(58, 62, 60)); yy += 41
        if r.get('asof'):
            d.text((PAD, yy + 2), 'sourced evidence · ' + r['asof'], font=reg(22), fill=MUTE)
    else:
        d.text((PAD, yy), (card.get('lens') or '') + ' · sourced by your values', font=reg(30), fill=(58, 62, 60))
    # footer
    d.line([PAD, H-94, W-PAD, H-94], fill=LINE, width=2)
    d.text((PAD, H-74), 'No ads · No tracking · No brand pays us', font=semi(25), fill=GREEN)
    d.text((W-PAD, H-72), 'choose by your values →', font=reg(24), fill=MUTE, anchor='ra')
    return img

# ---- the home poster, in the family's warm set (2026-09-29) ----
# Bentley asked for the slop thumbnails to be fixed. This poster was the one card in the family still in
# the old register: heavy sans, a green edge bar, "No ads · No tracking · No brand pays us" chips and an
# em dash. It now matches the cards C:\websites\scripts\build-og.mjs draws for every other site: warm
# paper with a wash in the site's own green, the claim in serif at the left, the site's sprout drawn
# large at the right, and a sunk foot band carrying the same tile the tab shows. It keeps its lead, the
# banking question, and the figure under it is read from the banking data with its source named in the
# family's provenance ink, so the card cannot say a number the data does not hold.
def serif(s, italic=False):
    names = (['georgiai.ttf'] if italic else ['georgia.ttf'])
    dv = 'DejaVuSerif-Italic.ttf' if italic else 'DejaVuSerif.ttf'
    return _font([WF + n for n in names] + ['/usr/share/fonts/truetype/dejavu/' + dv, dv], s)
def mono(s):
    return _font([WF + 'CascadiaMono.ttf', WF + 'consola.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 'DejaVuSansMono.ttf'], s)

# The Conscious Consuming mark is the app's own: a ring holding one large disc and one small one, a
# plate of choices with one of them opened (pipeline/build_icon.py, which says why it replaced a leaf).
# Its geometry is read from app/icon.svg, which build_icon.py writes, so this poster cannot drift from
# the tab icon. A first draft of this poster drew the constellation's sprout instead, which would have
# brought back the leaf that decision retired.
def app_mark():
    svg = open(os.path.join(os.path.dirname(CDIR), 'icon.svg'), encoding='utf-8').read()
    size = float(re.search(r'viewBox="0 0 (\d+)', svg).group(1))
    circles = [dict((k, float(v)) for k, v in re.findall(r'(cx|cy|r|stroke-width)="([\d.]+)"', c))
               for c in re.findall(r'<circle [^>]*>', svg)]
    return size, circles

def draw_app_mark(size_px, x0, y0, color, k=3):
    """The app mark, `size_px` wide at (x0, y0), on a transparent layer drawn k times larger."""
    size, circles = app_mark()
    S = int(size_px * k); f = S / size
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    for c in circles:
        cx, cy, r = c['cx'] * f, c['cy'] * f, c['r'] * f
        if 'stroke-width' in c:
            w = c['stroke-width'] * f
            d.ellipse([cx - r - w / 2, cy - r - w / 2, cx + r + w / 2, cy + r + w / 2], outline=color + (255,), width=int(round(w)))
        else:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (255,))
    return layer.resize((int(size_px), int(size_px)), Image.LANCZOS), (int(x0), int(y0))

def path_points(path, scale, ox, oy, steps=24):
    """Sample an SVG path (M/m, C/c, L/l, Z/z) into polylines, one per subpath."""
    toks = re.findall(r'[MmCcLlZz]|-?\d*\.?\d+', path)
    i, cmd, x, y, sx, sy = 0, None, 0.0, 0.0, 0.0, 0.0
    lines, cur = [], []
    def num():
        nonlocal i
        v = float(toks[i]); i += 1; return v
    def pt(px, py): return (ox + px * scale, oy + py * scale)
    while i < len(toks):
        t = toks[i]
        if re.match(r'[MmCcLlZz]', t):
            cmd = t; i += 1
            if cmd in 'Zz':
                cur.append(pt(sx, sy)); lines.append(cur); cur = []; x, y = sx, sy
                continue
        if cmd in 'Mm':
            nx, ny = num(), num()
            if cmd == 'm': nx, ny = x + nx, y + ny
            if cur: lines.append(cur)
            x, y, sx, sy = nx, ny, nx, ny; cur = [pt(x, y)]
            cmd = 'L' if cmd == 'M' else 'l'
        elif cmd in 'Ll':
            nx, ny = num(), num()
            if cmd == 'l': nx, ny = x + nx, y + ny
            x, y = nx, ny; cur.append(pt(x, y))
        elif cmd in 'Cc':
            c = [num() for _ in range(6)]
            if cmd == 'c': c = [c[0] + x, c[1] + y, c[2] + x, c[3] + y, c[4] + x, c[5] + y]
            for k in range(1, steps + 1):
                u = k / steps; m = 1 - u
                bx = m*m*m*x + 3*m*m*u*c[0] + 3*m*u*u*c[2] + u*u*u*c[4]
                by = m*m*m*y + 3*m*m*u*c[1] + 3*m*u*u*c[3] + u*u*u*c[5]
                cur.append(pt(bx, by))
            x, y = c[4], c[5]
    if cur: lines.append(cur)
    return lines

def stroke_mark(d, path, scale, ox, oy, color, width):
    for line in path_points(path, scale, ox, oy):
        d.line(line, fill=color, width=width, joint='curve')
        r = width / 2
        for (px, py) in (line[0], line[-1]):
            d.ellipse([px - r, py - r, px + r, py + r], fill=color)

def mark_layer(size, path, scale, ox, oy, color, width, k=3):
    """The mark drawn k times larger on a transparent layer and scaled down, so its curves are smooth."""
    big = Image.new('RGBA', (size[0] * k, size[1] * k), (0, 0, 0, 0))
    stroke_mark(ImageDraw.Draw(big), path, scale * k, ox * k, oy * k, color + (255,), width * k)
    return big.resize(size, Image.LANCZOS)

def banking_figure():
    """The JPMorgan Chase figure and its report, read from the banking data, or None."""
    try:
        data = json.load(open(os.path.join(os.path.dirname(CDIR), 'data', 'banking.json'), encoding='utf-8'))
        p = next(x for x in data['products'] if 'jpmorgan' in x['name'].lower())
        note = p['provenance']['environment']['note']
        m = re.search(r'\$([\d.]+) billion in fossil-fuel financing in (\d{4})', note)
        r = re.search(r'The (Banking on Climate Chaos \d{4})', note)
        if not (m and r): return None
        return ('JPMorgan Chase: $' + m.group(1) + ' billion in fossil-fuel financing in ' + m.group(2), r.group(1))
    except Exception:
        return None

def render_home():
    from PIL import ImageFilter
    P_PAPER, P_SUNK, P_INK, P_MUTED = (248, 245, 238), (241, 236, 224), (28, 36, 31), (92, 106, 99)
    HUE, CREAM, EMBER = (29, 111, 82), (248, 245, 238), (168, 79, 28)
    img = Image.new('RGBA', (W, H), P_PAPER + (255,))
    wash = Image.new('RGBA', (W, H), (0, 0, 0, 0)); wd = ImageDraw.Draw(wash)
    wd.ellipse([620, -160, 1320, 560], fill=HUE + (26,))
    img = Image.alpha_composite(img, wash.filter(ImageFilter.GaussianBlur(150)))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 504, W, H], fill=P_SUNK + (255,))
    disc = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(disc).ellipse([772, 60, 1128, 416], fill=HUE + (18,))
    img = Image.alpha_composite(img, disc)
    mark, at = draw_app_mark(236, 832, 120, HUE)
    img.alpha_composite(mark, at); d = ImageDraw.Draw(img)

    claim = 'Does your bank fund fossil fuels?'
    f = serif(64); y = 150
    for ln in wrap(d, claim, f, 640, 3):
        d.text((80, y), ln, font=f, fill=P_INK); y += 80
    fig = banking_figure()
    if fig:
        y += 8
        for ln in wrap(d, fig[0], mono(25), 640, 3):
            d.text((80, y), ln, font=mono(25), fill=HUE); y += 34
        d.text((80, y + 6), 'Source: ' + fig[1], font=mono(21), fill=EMBER)

    tile = Image.new('RGBA', (72, 72), (0, 0, 0, 0)); td = ImageDraw.Draw(tile)
    td.rounded_rectangle([0, 0, 71, 71], radius=16, fill=HUE + (255,))
    small, _ = draw_app_mark(56, 0, 0, CREAM)
    tile.alpha_composite(small, (8, 8))
    img.alpha_composite(tile, (80, 533)); d = ImageDraw.Draw(img)
    d.text((172, 548), 'Conscious Consuming', font=serif(32, italic=True), fill=P_INK)
    d.text((W - 80, 570), 'consciousconsuming.org', font=mono(23), fill=P_MUTED, anchor='rm')
    return img.convert('RGB')

if '--home-only' in sys.argv:
    render_home().save(os.path.join(os.path.dirname(CDIR), 'og-home.png'), 'PNG', optimize=True)
    print('Rendered the home poster only → app/og-home.png'); sys.exit(0)

cards = json.load(open(MANIFEST, encoding='utf-8'))
n = 0
for c in cards:
    out = os.path.join(CDIR, c['cid'], c['code'] + '.png')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    render(c).save(out, 'PNG', optimize=True)
    n += 1
render_home().save(os.path.join(os.path.dirname(CDIR), 'og-home.png'), 'PNG', optimize=True)  # app/og-home.png
print('Rendered ' + str(n) + ' social-card images + 1 home poster (1200x630 PNG) → app/c/**.png, app/og-home.png')
