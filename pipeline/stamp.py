#!/usr/bin/env python3
"""Cache-bust: stamp short per-asset content hashes into `?v=` query strings.

Browsers still re-fetch changed styles/scripts/data after a rebuild, but a data-only
change no longer rewrites every pre-rendered guide page that only links CSS. Called
at the end of build_datasets.py and build_guides.py; also runnable standalone:
python stamp.py
"""
import os, re, hashlib
from tracked_io import write_text

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.normpath(os.path.join(HERE, '..', 'app'))
ASSETS = ('styles.css', 'data.js', 'i18n.js', 'guides.js', 'engine.js', 'decision.js', 'sigil.js', 'lines.js', 'presentation.js', 'app.js')

def asset_versions():
    versions = {}
    for asset in ASSETS:
        path = os.path.join(APP, asset)
        if os.path.isfile(path):
            versions[asset] = hashlib.sha1(open(path, 'rb').read()).hexdigest()[:8]
    return versions


def asset_version(asset, versions=None):
    versions = versions or asset_versions()
    return versions.get(asset, bundle_version(versions))


def bundle_version(versions=None):
    h = hashlib.sha1()
    versions = versions or asset_versions()
    for asset in ASSETS:
        h.update(asset.encode('utf-8'))
        h.update((versions.get(asset) or '').encode('utf-8'))
    ver = h.hexdigest()[:8]
    return ver


def stamp():
    versions = asset_versions()
    bundle = bundle_version(versions)
    asset_pat = '|'.join(a.replace('.', r'\.') for a in ASSETS)
    idx = os.path.join(APP, 'index.html')
    if not os.path.isfile(idx):
        return bundle
    html = open(idx, encoding='utf-8').read()
    pat = r'(\./(' + asset_pat + r'))(?:\?v=[0-9a-f]+)?'
    new = re.sub(pat, lambda m: m.group(1) + '?v=' + versions.get(m.group(2), bundle), html)
    if new != html:
        write_text(idx, new)
    # Keep pre-rendered guide pages in sync without rewriting CSS links for JS/data-only changes.
    gdir = os.path.join(APP, 'g')
    if os.path.isdir(gdir):
        gpat = r'(\.\./(' + asset_pat + r'))(?:\?v=[0-9a-f]+)?'
        for fn in os.listdir(gdir):
            if fn.endswith('.html'):
                gp = os.path.join(gdir, fn)
                gh = open(gp, encoding='utf-8').read()
                gn = re.sub(gpat, lambda m: m.group(1) + '?v=' + versions.get(m.group(2), bundle), gh)
                if gn != gh:
                    write_text(gp, gn)
    return bundle


if __name__ == '__main__':
    print('Stamped per-asset cache-bust hashes (bundle v=' + stamp() + ')')
