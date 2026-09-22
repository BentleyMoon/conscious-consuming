#!/usr/bin/env python3
"""One description of the app mark, and every size generated from it.

WHY THIS EXISTS. The mark was written out by hand in six places: app/icon.svg at 512, and a
URL-encoded 64-unit copy inside app/index.html, build_site.py, build_guides.py, build_cards.js and
build_awards.js. They had already drifted. The 512 file fills the leaf with the page cream
(#faf8f3) and all five inline copies fill it with plain white, so the tab icon and the installed
icon were not the same drawing. That is what a copy in six places always becomes.

Now the geometry lives here once, and the SVG, the PNGs and the ICO are all generated from it.
The builders read app/icon.svg and encode it themselves, so there is no second drawing to drift.

WHAT THE MARK IS. A ring holding one large disc and one small one: a plate of choices with one of
them opened. That is the lens, which is the thing this product actually does. It replaces a leaf,
which is what every ethical-shopping product uses and which says nothing about this one. The
choice was made by rendering candidates and looking at them at 16, 32 and 48 pixels, because a
mark that only works large is not a favicon: a ring of eight dots turned to mush, and a radial
sigil read as a sparkle.

MASKABLE SAFE ZONE. Android crops a maskable icon to shapes inscribed within the central 80 per
cent, so all art must sit inside a circle of radius 0.4 x size from the centre. Every element here
is checked against that below, and the check fails the build rather than warning.

Run: python pipeline/build_icon.py   (part of npm run build)
"""
import math
import os
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
APP = os.path.join(ROOT, 'app')
sys.path.insert(0, HERE)
from tracked_io import write_text  # noqa: E402

GREEN = '#1d7a5a'
CREAM = '#faf8f3'
S = 512
CORNER = 112

# The plate, in units of the 512 canvas.
RING_R = 172
RING_W = 26
OPEN_X, OPEN_Y, OPEN_R = 44, -50, 88     # the choice that is open, offset from centre
NEXT_A, NEXT_D, NEXT_R = 130, 102, 38    # the one beside it, in degrees from east and distance

SAFE_R = 0.4 * S


def _next_xy():
    a = math.radians(NEXT_A)
    return math.cos(a) * NEXT_D, math.sin(a) * NEXT_D


def check_safe_zone():
    """Every drawn element must sit inside the maskable safe circle, or Android crops the mark."""
    nx, ny = _next_xy()
    reach = [
        ('ring', RING_R + RING_W / 2),
        ('open disc', math.hypot(OPEN_X, OPEN_Y) + OPEN_R),
        ('next disc', math.hypot(nx, ny) + NEXT_R),
    ]
    worst = max(reach, key=lambda row: row[1])
    if worst[1] > SAFE_R:
        raise SystemExit(f'build_icon: {worst[0]} reaches {worst[1]:.0f} from centre, '
                         f'outside the maskable safe radius of {SAFE_R:.0f}')
    return worst


def svg():
    c = S / 2
    nx, ny = _next_xy()
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" role="img" '
        f'aria-label="Conscious Consuming">'
        f'<rect width="{S}" height="{S}" rx="{CORNER}" fill="{GREEN}"/>'
        f'<circle cx="{c:g}" cy="{c:g}" r="{RING_R}" fill="none" stroke="{CREAM}" stroke-width="{RING_W}"/>'
        f'<circle cx="{c + OPEN_X:g}" cy="{c + OPEN_Y:g}" r="{OPEN_R}" fill="{CREAM}"/>'
        f'<circle cx="{c + nx:.0f}" cy="{c + ny:.0f}" r="{NEXT_R}" fill="{CREAM}"/>'
        f'</svg>'
    )


# Pillow draws hard-edged shapes, so every raster is drawn four times over and reduced. Without
# it the 512 came out aliased and, tellingly, compressed to a quarter of the 192: flat jagged
# edges pack smaller than smooth ones, which is the file size telling you the art is rough.
SUPERSAMPLE = 4


def raster(size):
    from PIL import Image, ImageDraw
    k = SUPERSAMPLE
    big = Image.new('RGBA', (S * k, S * k), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    c = S * k / 2
    nx, ny = _next_xy()
    nx, ny = nx * k, ny * k
    d.rounded_rectangle([0, 0, S * k - 1, S * k - 1], radius=CORNER * k, fill=GREEN)
    d.ellipse([c - RING_R * k, c - RING_R * k, c + RING_R * k, c + RING_R * k], outline=CREAM, width=RING_W * k)
    ox, oy, orad = OPEN_X * k, OPEN_Y * k, OPEN_R * k
    d.ellipse([c + ox - orad, c + oy - orad, c + ox + orad, c + oy + orad], fill=CREAM)
    nrad = NEXT_R * k
    d.ellipse([c + nx - nrad, c + ny - nrad, c + nx + nrad, c + ny + nrad], fill=CREAM)
    return big.resize((size, size), Image.LANCZOS)


def main():
    worst = check_safe_zone()
    write_text(os.path.join(APP, 'icon.svg'), svg() + '\n')

    outputs = [('icon-192.png', 192), ('icon-512.png', 512), ('apple-touch-icon.png', 180)]
    for name, size in outputs:
        raster(size).save(os.path.join(APP, name), 'PNG', optimize=True)

    # One ICO carrying the sizes a browser tab and a pinned shortcut actually ask for. Pillow
    # builds every frame by reducing the image it is given, so it has to be given the largest:
    # handing it the 16 produced an ICO with one 16-pixel frame and nothing else.
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    base = raster(256)
    for target in (os.path.join(APP, 'icon.ico'), os.path.join(ROOT, 'favicon.ico')):
        base.save(target, format='ICO', sizes=ico_sizes)

    made = ', '.join(name for name, _ in outputs)
    print(f'build_icon: wrote app/icon.svg, {made}, app/icon.ico and favicon.ico')
    print(f'  maskable safe radius {SAFE_R:.0f}; furthest element is the {worst[0]} at {worst[1]:.0f}')


if __name__ == '__main__':
    main()
