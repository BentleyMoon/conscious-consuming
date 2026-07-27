#!/usr/bin/env python3
"""build_card_images.py — render a 1200x630 social-card IMAGE (PNG) per verdict, from app/c/_cards.json
   (written by build_cards.js). These become the og:image / twitter:image — what Twitter, Facebook, Slack,
   LinkedIn and iMessage actually DISPLAY when a verdict link is shared. A beautiful visual card spreads; a
   text snippet scrolls past. Honest by construction: no logos we don't own, no ads — just the sourced verdict.
   Run after build_cards.js (build_datasets.py chains both). Needs Pillow; skips gracefully if absent."""
import json, os, sys
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

def render_home():
    """The site's own share poster (og:image for the root URL) — lead with the wedge, not '57 categories'."""
    img = Image.new('RGB', (W, H), PAPER); d = ImageDraw.Draw(img)
    d.rectangle([1, 1, W-2, H-2], outline=LINE, width=2)
    d.rectangle([0, 0, 14, H], fill=GREEN)
    PAD = 72
    d.text((PAD, 60), 'CONSCIOUS CONSUMING', font=semi(32), fill=GREEN)
    d.text((PAD, 105), 'choose by your values, not by who pays', font=reg(26), fill=MUTE)
    d.text((PAD, 212), 'Does your bank fund', font=bold(74), fill=INK)
    d.text((PAD, 294), 'fossil fuels?', font=bold(74), fill=GREEN)
    sub = ("JPMorgan Chase financed about $58 billion in fossil fuels in 2025. "
           "See where your bank stands — and where to move your money.")
    yy = 404
    for ln in wrap(d, sub, reg(30), W - 2*PAD, 3):
        d.text((PAD, yy), ln, font=reg(30), fill=(58, 62, 60)); yy += 42
    d.line([PAD, H-94, W-PAD, H-94], fill=LINE, width=2)
    d.text((PAD, H-74), 'No ads · No tracking · No brand pays us', font=semi(25), fill=GREEN)
    d.text((W-PAD, H-72), 'sourced · private · open', font=reg(24), fill=MUTE, anchor='ra')
    return img

cards = json.load(open(MANIFEST, encoding='utf-8'))
n = 0
for c in cards:
    out = os.path.join(CDIR, c['cid'], c['code'] + '.png')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    render(c).save(out, 'PNG', optimize=True)
    n += 1
render_home().save(os.path.join(os.path.dirname(CDIR), 'og-home.png'), 'PNG', optimize=True)  # app/og-home.png
print('Rendered ' + str(n) + ' social-card images + 1 home poster (1200x630 PNG) → app/c/**.png, app/og-home.png')
