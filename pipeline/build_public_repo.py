#!/usr/bin/env python3
"""build_public_repo.py — assemble the public, forkable subset of this project.

WHY THIS EXISTS
This repository is the working repository. It contains the engine, the data, and the audits, and
it also contains roughly ninety documents that are a maker's journal: meditations, critiques, a
north star, grant strategy, and half-finished plans. The first group has to be public, because the
site promises anyone can inspect and fork it. The second group was written to think with, not to
publish, and no openness claim requires it.

This script exports only the first group into a clean directory with no history, ready to become a
public repository. Working hours, commit cadence, co-authorship trailers, and the journal all stay
in the private repository where they belong.

ALLOWLIST, NEVER A DENYLIST
Everything shipped is named below. A file added to this repo tomorrow is private unless somebody
deliberately adds it here. That direction matters: a denylist leaks by forgetting, an allowlist
only fails closed.

    python pipeline/build_public_repo.py            # export to ../conscious-consuming-public
    python pipeline/build_public_repo.py --out DIR  # somewhere else
"""
import argparse
import os
import shutil
import sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Whole directories that are already public on valuescommons.org, so exporting them reveals
# nothing new: they are the shipped surfaces, and the point is that they become forkable.
PUBLIC_DIRS = [
    'app',          # the engine, the decision core, the data, the app itself
    'kosplora',     # instance #2, the proof the engine generalizes
    'instances',    # the instance press and instance #3
    'standard',     # the Open Values Standard surface
    'passport', 'weave', 'assembly', 'workshop', 'slate', 'tour', 'contribute', 'awards', 'funders',
    'research',     # 75 audit scripts: the trust-as-architecture claim, in executable form
    'pipeline',     # how the site is built, so a fork can rebuild it
    'scripts',      # verification and release checks
]

# Files at the root.
PUBLIC_FILES = ['index.html', 'llms.txt', 'LICENSE', 'LICENSING.md', 'og-standard.png',
                'package.json', 'package-lock.json', '.gitignore', 'wrangler.toml', 'worker.js', 'mcp.js']

# Only the docs already rendered publicly by build_site.py. This list is deliberately the same
# one, so the repo and the website agree about what counts as published.
PUBLIC_DOCS = ['GRANT-ONE-PAGER', 'GRANT-PREVIEW-PATH', 'DEPLOY-AND-SHARE', 'PREVIEW-FEEDBACK-LOOP',
               'R1-REVIEW', 'DECISION-REFRAME-FOUNDER-REVIEW', 'ADOPTION-KIT', 'FEDERATION',
               'VALUES-PASSPORT', 'CREATE-AN-INSTANCE', 'INSTANCE-2-KOSPLORA', 'STANDARD-v0',
               'THE-VALUES-LAYER', 'THE-WEAVE']

# Content the data licence covers.
PUBLIC_CONTENT = ['citation-bundles', 'ledger.json', 'flash-drive-README.md', 'asks-offers.json']

# Never exported, even if a path above would otherwise sweep them in.
NEVER = {'node_modules', 'dist', '.git', '__pycache__', '.wrangler', '.env'}

# Derived or oversized artifacts. A repository should carry sources, not build output, and a
# fork regenerates all of these from what is here. Excluding them takes the export from about
# 353MB to something a person can clone on a normal connection.
#   app/c            2,919 generated share-card pages   -> node pipeline/build_cards.js
#   app/data.js      the 40MB single-file fallback      -> already omitted from public production
#   pipeline/raw     raw intermediate scrape data       -> not needed to build or verify anything
DERIVED = {
    os.path.join('app', 'c'),
    os.path.join('app', 'data.js'),
    os.path.join('pipeline', 'raw'),
}


def _ignore(directory, names):
    rel = os.path.relpath(directory, ROOT)
    skip = [n for n in names if n in NEVER or n.endswith('.pyc')]
    for n in names:
        candidate = os.path.normpath(os.path.join(rel, n))
        if candidate in DERIVED:
            skip.append(n)
    return skip


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out', default=os.path.join(os.path.dirname(ROOT), 'conscious-consuming-public'))
    args = ap.parse_args()
    out = os.path.abspath(args.out)
    if os.path.abspath(ROOT) == out:
        sys.exit('Refusing to export over the working repository.')

    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)

    copied_dirs = []
    for d in PUBLIC_DIRS:
        src = os.path.join(ROOT, d)
        if not os.path.isdir(src):
            continue
        shutil.copytree(src, os.path.join(out, d), ignore=_ignore)
        copied_dirs.append(d)

    copied_files = []
    for f in PUBLIC_FILES:
        src = os.path.join(ROOT, f)
        if os.path.isfile(src):
            shutil.copy2(src, os.path.join(out, f))
            copied_files.append(f)

    os.makedirs(os.path.join(out, 'docs'), exist_ok=True)
    docs = []
    for name in PUBLIC_DOCS:
        src = os.path.join(ROOT, 'docs', name + '.md')
        if os.path.isfile(src):
            shutil.copy2(src, os.path.join(out, 'docs', name + '.md'))
            docs.append(name)

    os.makedirs(os.path.join(out, 'content'), exist_ok=True)
    content = []
    for name in PUBLIC_CONTENT:
        src = os.path.join(ROOT, 'content', name)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(out, 'content', name), ignore=_ignore)
            content.append(name)
        elif os.path.isfile(src):
            shutil.copy2(src, os.path.join(out, 'content', name))
            content.append(name)

    # A last, blunt check. If any of these ever appear in the export, something has gone wrong
    # in the lists above and the export should not be published.
    leaked = []
    for dirpath, dirnames, filenames in os.walk(out):
        dirnames[:] = [d for d in dirnames if d not in NEVER]
        for fn in filenames:
            low = fn.lower()
            if low.startswith('meditation') or low.startswith('north-star') or '.env' in low:
                leaked.append(os.path.relpath(os.path.join(dirpath, fn), out))
    if leaked:
        sys.exit('LEAK CHECK FAILED, refusing to finish:\n  ' + '\n  '.join(leaked))

    total = sum(len(fs) for _, _, fs in os.walk(out))
    print('Public export written to:', out)
    print('  directories :', ', '.join(copied_dirs))
    print('  root files  :', len(copied_files))
    print('  docs        :', len(docs), 'of', len(os.listdir(os.path.join(ROOT, 'docs'))), 'kept')
    print('  content     :', ', '.join(content))
    print('  total files :', total)
    print('  leak check  : passed')
    print('')
    print('This directory has no git history. Nothing about when you work, how often, or who you')
    print('worked with travels with it. Initialise it fresh when you are ready to publish.')


if __name__ == '__main__':
    main()
