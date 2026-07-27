#!/usr/bin/env python3
"""Render og-funders.png — the 1200x630 social card for the funder screen (funders/index.html), so the
private grant-brief link previews as a tailored poster (the thesis + the ask), not the generic standard card.
Self-contained, mirrors build_og_standard.py. Output: ./funders/og-funders.png (ships via build_site.py copytree)."""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 630
PAPER=(250,248,243); INK=(44,44,40); MUTE=(107,106,98); GREEN=(29,122,90); LINE=(225,222,214); SUB=(58,62,60); SOFT=(238,243,236)
WF = 'C:/Windows/Fonts/'
def _font(paths, size):
    for p in paths:
        try: return ImageFont.truetype(p, size)
        except Exception: pass
    return ImageFont.load_default()
def serifb(s): return _font([WF+'georgiab.ttf', WF+'georgia.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 'DejaVuSerif-Bold.ttf'], s)
def reg(s):    return _font([WF+'segoeui.ttf', WF+'arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'DejaVuSans.ttf'], s)
def semi(s):   return _font([WF+'segoeuisb.ttf', WF+'segoeuib.ttf', WF+'arialbd.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'DejaVuSans-Bold.ttf'], s)

img = Image.new('RGB', (W, H), PAPER); d = ImageDraw.Draw(img)
d.rectangle([1, 1, W-2, H-2], outline=LINE, width=2)
d.rectangle([0, 0, 14, H], fill=GREEN)                       # left accent bar
PAD = 72
# header
d.ellipse([PAD, 58, PAD+26, 84], fill=GREEN)                 # leaf mark
d.text((PAD+40, 58), 'THE OPEN VALUES STANDARD', font=semi(28), fill=GREEN)
d.text((PAD, 100), 'Conscious Consuming  ·  grant brief  ·  private preview', font=reg(23), fill=MUTE)
# headline
d.text((PAD, 178), 'Vote with your money —', font=serifb(58), fill=INK)
d.text((PAD, 250), 'on a tool no one can capture.', font=serifb(58), fill=GREEN)
# sub (wrapped, max 3 lines)
sub = ('A complete, privacy-first values guide: 80 categories ranked by your values on '
       'sourced facts, never by who pays — no ads, no tracking, no brand money.')
yy = 348; cur=''; lines=[]
for w in sub.split():
    t=(cur+' '+w).strip()
    if d.textlength(t, font=reg(28)) <= W-2*PAD: cur=t
    else: lines.append(cur); cur=w
if cur: lines.append(cur)
for ln in lines[:3]:
    d.text((PAD, yy), ln, font=reg(28), fill=SUB); yy += 40
# the ask — a small pill so it reads as the headline number
ask = 'Requested  ·  $35,000  ·  a 6-month phase to first real use'
d.rounded_rectangle([PAD, 486, PAD+int(d.textlength(ask, font=semi(25)))+44, 532], radius=12, fill=SOFT, outline=GREEN, width=2)
d.text((PAD+22, 494), ask, font=semi(25), fill=GREEN)
# footer band
d.line([PAD, H-86, W-PAD, H-86], fill=LINE, width=2)
d.text((PAD, H-66), 'value  →  know  →  decide  →  act', font=semi(25), fill=GREEN)
d.text((W-PAD, H-64), 'static · local · uncapturable', font=reg(23), fill=MUTE, anchor='ra')

out = os.path.join(ROOT, 'funders', 'og-funders.png')
os.makedirs(os.path.dirname(out), exist_ok=True)
img.save(out, 'PNG', optimize=True)
print('Rendered og-funders.png (1200x630, %.0f KB) -> %s' % (os.path.getsize(out)/1024, os.path.relpath(out, ROOT)))
