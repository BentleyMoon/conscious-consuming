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
# Every versioned asset index.html loads must be listed here, or its cache-bust query never moves
# and browsers keep the first copy they ever saw forever. homelens.js, icons.js and needsrose.js
# were hand-written as ?v=1 and left out of this tuple, so six successive rewrites of the front-page
# map shipped behind a URL that had not changed since the file was created. research/asset_stamp_audit.js
# now fails the build if index.html carries a version that is not a real content hash.
ASSETS = ('styles.css', 'data.js', 'i18n.js', 'guides.js', 'engine.js', 'decision.js', 'sigil.js',
          'lines.js', 'presentation.js', 'icons.js', 'homelens.js', 'needsrose.js', 'app.js')

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



def stamp_service_worker(bundle):
    """Name the service worker cache after the release it belongs to.

    The cache name was the constant 'cc-v3'. activate() deletes every cache except the current
    name, so a name that never changes means the old shell is never evicted: the worker is
    network-first and hides it while you are online, and the moment a request fails a reader is
    handed the last release instead of this one. Naming it after the bundle hash makes every
    release a new cache and the previous one garbage on activate.
    """
    sw = os.path.join(APP, 'sw.js')
    if not os.path.isfile(sw):
        return
    text = open(sw, encoding='utf-8').read()
    updated = re.sub(r"const CACHE = '[^']*';", "const CACHE = 'cc-" + bundle + "';", text, count=1)
    if updated != text:
        write_text(sw, updated)


def stamp():
    versions = asset_versions()
    bundle = bundle_version(versions)
    stamp_service_worker(bundle)
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
