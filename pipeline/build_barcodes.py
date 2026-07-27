#!/usr/bin/env python3
"""build_barcodes.py — a {barcode: categoryId} index so a SCANNED product resolves to its category
fully OFFLINE (the engine + that category's data then produce the verdict — no server, no API call).
Re-run after a datasets rebuild. Output: app/data/barcodes.json (lazy-loaded by the app on first scan)."""
import json, os, re, sys
from tracked_io import write_json
sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'app', 'data')

catalog = json.load(open(os.path.join(DATA, 'index.json'), encoding='utf-8'))
catalog_files = {}
for category in catalog.get('categories', []):
    name, cid = category.get('file'), category.get('id')
    if not name or not cid or os.path.basename(name) != name or not name.endswith('.json'):
        raise ValueError('invalid category file in app/data/index.json: ' + repr(name))
    if name in catalog_files:
        raise ValueError('duplicate category file in app/data/index.json: ' + name)
    catalog_files[name] = cid

idx, dups = {}, 0
for name in sorted(catalog_files):
    p = os.path.join(DATA, name)
    d = json.load(open(p, encoding='utf-8'))
    prods = d.get('products') if isinstance(d, dict) else None
    cid = catalog_files[name]
    if not isinstance(prods, list):
        raise ValueError(name + ' has no products array')
    if (d.get('meta') or {}).get('id') != cid:
        raise ValueError(name + ' category id does not match app/data/index.json')
    for e in prods:
        if not isinstance(e, dict):
            continue
        c = e.get('code')
        if c and re.fullmatch(r'\d{6,14}', str(c)):
            c = str(c)
            if c in idx:
                dups += 1            # first category wins; barcodes are globally unique in OFF, collisions are rare
                continue
            idx[c] = cid

out = os.path.join(DATA, 'barcodes.json')
write_json(out, idx, separators=(',', ':'))
print('barcodes indexed: %d | duplicate codes skipped: %d | %s (%.0f KB)'
      % (len(idx), dups, os.path.relpath(out, ROOT), os.path.getsize(out) / 1024))
