#!/usr/bin/env python3
"""Render og-standard.png — the 1200x630 social card for the Open Values Standard home (root index.html),
so a shared link previews as a real poster, not a bare URL. Self-contained. Output: ./og-standard.png (shipped by build_site.py)."""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 630
PAPER=(250,248,243); INK=(44,44,40); MUTE=(107,106,98); GREEN=(29,122,90); LINE=(225,222,214); SUB=(58,62,60)
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
d.ellipse([PAD, 60, PAD+26, 86], fill=GREEN)                 # leaf mark
d.text((PAD+40, 60), 'THE OPEN VALUES STANDARD', font=semi(30), fill=GREEN)
d.text((PAD, 104), 'no server  ·  no account  ·  no owner', font=reg(24), fill=MUTE)
d.text((PAD, 200), 'Choose by your values.', font=serifb(64), fill=INK)
d.text((PAD, 278), 'Organize without a center.', font=serifb(64), fill=GREEN)
sub = 'Vote with your money, and act together — on tools that run on your device and answer to no one.'
yy = 386; cur=''; lines=[]
for w in sub.split():
    t=(cur+' '+w).strip()
    if d.textlength(t, font=reg(29)) <= W-2*PAD: cur=t
    else: lines.append(cur); cur=w
if cur: lines.append(cur)
for ln in lines[:3]:
    d.text((PAD, yy), ln, font=reg(29), fill=SUB); yy += 42
d.line([PAD, H-92, W-PAD, H-92], fill=LINE, width=2)
d.text((PAD, H-72), 'value  →  know  →  decide  →  act', font=semi(26), fill=GREEN)
d.text((W-PAD, H-70), 'static · local · open', font=reg(24), fill=MUTE, anchor='ra')

out = os.path.join(ROOT, 'og-standard.png')
img.save(out, 'PNG', optimize=True)
print('Rendered og-standard.png (1200x630, %.0f KB) -> %s' % (os.path.getsize(out)/1024, os.path.relpath(out, ROOT)))
