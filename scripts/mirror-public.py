# Refresh the public mirror of this repository.
#
#   git clone https://github.com/BentleyMoon/conscious-consuming.git <somewhere>
#   python scripts/mirror-public.py <somewhere>            # read only: says what would publish
#   python scripts/mirror-public.py <somewhere> --write    # copies, still does not commit
#
# WHY IT EXISTS. The public copy went eight weeks without a refresh because refreshing it by hand
# means deciding, file by file, what is publishable, and that decision is not one to re-make under
# time pressure. The rules are here instead:
#
#   - only files this repository TRACKS, so nothing untracked or ignored can ride along;
#   - only the top-level paths the public repository already holds;
#   - never the working instructions, the handoff notes, the local reference copies or the logs;
#   - docs/ is selective and the public front page says so, so only documents already published
#     there are refreshed and a new one is published by adding it to PUBLISH_ANYWAY on purpose;
#   - the 3,428 verdict pages stay generated rather than stored, as the front page says;
#   - a last read of every file, refusing any that names the private archive;
#   - the public front page is maintained here at docs/README-public.md and published as README.md.
#
# It never commits and never pushes. Read the diff, then do that yourself.
import io, os, re, subprocess, sys, shutil, hashlib
sys.stdout.reconfigure(encoding='utf-8')

PRIV = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if len(sys.argv) < 2 or sys.argv[1].startswith('--'):
    sys.exit('usage: python scripts/mirror-public.py <path to a clone of the public repo> [--write]')
PUB = os.path.abspath(sys.argv[1])
if not os.path.isdir(os.path.join(PUB, '.git')):
    sys.exit(PUB + ' is not a git clone')

tracked = subprocess.run(['git', 'ls-files'], cwd=PRIV, capture_output=True, text=True, encoding='utf-8').stdout.split('\n')
tracked = [t.strip().replace('\\', '/') for t in tracked if t.strip()]

# The public repository's own top level, read from the public repository rather than guessed.
pub_top = set(subprocess.run(['git', 'ls-files'], cwd=PUB, capture_output=True, text=True, encoding='utf-8')
              .stdout.replace('\\', '/').split('\n'))
pub_top = {p.split('/')[0] for p in pub_top if p.strip()}
print('public top level:', ' '.join(sorted(pub_top)))

# Anything that is internal stays internal, named here rather than inferred.
NEVER = {'AUTOMATION.md', 'WEBSITES-AGENT.md', 'RUN.md', 'BUILD-PLAN.md', 'ontologystudy', 'kiz.txt',
         'run.py', 'run.cmd', 'dist', 'build.log', '.public-copy'}

# The public repository's front page is written for a stranger arriving cold, and the private
# repository's README is a working note. The public one is maintained at docs/README-public.md,
# where the work happens, and is published as README.md.
RENAME = {'docs/README-public.md': 'README.md'}
NEVER.add('README.md')

# Single files inside otherwise-public directories that are not this project's to publish.
# research/handoff-extract.txt is a text extract of an unrelated research brief: nothing reads it,
# and it reached the public copy only because research/ publishes wholesale.
NEVER_PATHS = {'research/handoff-extract.txt'}

# More of the same, kept in .mirror-private-paths beside .mirror-private-words and for the same
# reason: some of these names are themselves not for publishing (editor and tool configuration,
# maintainer tooling bound to a paid service). One entry per line, # for comments: a bare name
# holds back a top-level path, a path with a slash holds back that one file. Untracked, ignored,
# and required by --write, so the exclusions cannot silently lapse.
PATHS_FILE = os.path.join(PRIV, '.mirror-private-paths')
if os.path.isfile(PATHS_FILE):
    for line in io.open(PATHS_FILE, encoding='utf-8'):
        line = line.strip().replace(chr(92), '/')
        if line and not line.startswith('#'):
            (NEVER_PATHS if '/' in line else NEVER).add(line)
elif '--write' in sys.argv:
    sys.exit('Refusing to --write without ' + PATHS_FILE + ' (see the comment above it in this script).')

# docs/ IS SELECTIVE, and says so on its own front page: "It does not carry working notes, drafts,
# and planning material." The rest of the tree is engine, data and audits, which publish wholesale.
# So under docs/ only what is already published is refreshed, and a new document is published by
# adding it here on purpose. Without this rule the refresh would have published every brainstorm
# and post-mortem in the working repository and made the README's own sentence false.
pub_docs = {p for p in subprocess.run(['git', 'ls-tree', '-r', '--name-only', 'HEAD', '--', 'docs'],
                                      cwd=PUB, capture_output=True, text=True, encoding='utf-8')
            .stdout.replace(chr(92), '/').split(chr(10)) if p.strip()}
PUBLISH_ANYWAY = {'docs/README-public.md'}

# GENERATED, AND SAID TO BE. The public repository stores the guides but not the 3,428 verdict
# pages, and its front page says so: they are rebuilt with `node pipeline/build_cards.js`. The
# working repository tracks them because the site deploys from it. Keeping that difference means a
# clone stays small and the README stays true.
GENERATED = ('app/c/',)

copy, skipped = [], []
for rel in tracked:
    top = rel.split('/')[0]
    if top in NEVER or rel in NEVER_PATHS or top not in pub_top:
        skipped.append(rel)
        continue
    if top == 'docs' and rel not in pub_docs and rel not in PUBLISH_ANYWAY:
        skipped.append(rel)
        continue
    if rel.startswith(GENERATED):
        skipped.append(rel)
        continue
    copy.append(rel)

print('%d tracked files, %d to publish, %d held back' % (len(tracked), len(copy), len(skipped)))
held_top = sorted({s.split('/')[0] for s in skipped})
print('held back:', ' '.join(held_top))

# A last read of every text file that is about to be published, for the archive's own names.
#
# THE NAMES THEMSELVES ARE NOT WRITTEN HERE. This script is published, so a list of private names
# kept in it publishes those names: the earlier version exempted itself from its own read for exactly
# that reason, and the mirror carried the archive's names and a personal address as a result. The
# names now live in .mirror-private-words at the root of the working repository: untracked, ignored
# by .gitignore, one regular expression per line, # for comments. Only tracked files are published,
# so the list can never ride along. Without it the read cannot be done, and --write refuses.
#
# The generic patterns below name nobody and stay here: a home-directory path from any machine, and
# a personal webmail address other than the project's published contact. They are not applied to the
# sourced data, where a small maker's webmail contact is a published fact, not a leak, and where a
# match would hold back a whole category.
PUBLIC_CONTACTS = {'futurisminstitute@gmail.com'}
GENERIC_WORDS = [
    r'\b[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"\']+',
    r'(?<![\w.])/Users/[A-Za-z0-9._-]+/',
    r'(?<![\w.])/home/[a-z][a-z0-9._-]*/',
    r'\b[A-Za-z0-9._%+-]+@(?:gmail|googlemail|outlook|hotmail|live|icloud|me|yahoo|proton|protonmail)\.(?:[a-z]+\.)*[a-z]+',
]
WORDS_FILE = os.path.join(PRIV, '.mirror-private-words')
private_words = []
if os.path.isfile(WORDS_FILE):
    for line in io.open(WORDS_FILE, encoding='utf-8'):
        line = line.strip()
        if line and not line.startswith('#'):
            private_words.append(line)
else:
    print('\nWARNING: %s is missing, so the private-name read cannot run.' % WORDS_FILE)
    if '--write' in sys.argv:
        sys.exit('Refusing to --write without the private-name list. Create it (see the comment above).')
PRIVATE_WORDS = re.compile('|'.join('(?:%s)' % w for w in private_words) or r'(?!)', re.I)
GENERIC = re.compile('|'.join('(?:%s)' % w for w in GENERIC_WORDS), re.I)
DATA_PREFIXES = ('app/data/', 'content/lenses/', 'content/lenses-pending/', 'pipeline/raw', 'pipeline/prices/')
leaks = []
for rel in copy:
    path = os.path.join(PRIV, rel)
    if os.path.getsize(path) > 4_000_000:
        continue
    try:
        text = io.open(path, encoding='utf-8').read()
    except Exception:
        continue
    matches = list(PRIVATE_WORDS.finditer(text))
    if not rel.startswith(DATA_PREFIXES):
        matches += [m for m in GENERIC.finditer(text) if m.group(0).lower() not in PUBLIC_CONTACTS]
    for m in matches:
        leaks.append('%s: %s' % (rel, text[max(0, m.start() - 40):m.end() + 40].replace('\n', ' ')))
        break
# A file that names the private archive is held back rather than edited: these are internal design
# notes that happen to sit under docs/, and the archive's paths are nobody else's business.
if leaks:
    print('\nheld back for naming the private archive:')
    for l in leaks:
        print('  ' + l)
    held = {l.split(':')[0] for l in leaks}
    copy = [c for c in copy if c not in held]
    skipped += sorted(held)
print('%d file(s) to publish after the privacy read' % len(copy))

if '--write' not in sys.argv:
    sys.exit(0)

# THE MARKER. The public copy carries .public-copy and the working repository never does: it is how
# the audits know that a missing working note is expected here and not a fault (research/public_copy.js).
MARKER = '.public-copy'
MARKER_TEXT = '''This is the public copy of the Values Commons working repository, written by
scripts/mirror-public.py. It carries the engine, the data, the audits and the published documents,
not the working notes. Audits that read a working note skip that check by name here instead of
failing (research/public_copy.js). The working repository never carries this file.
'''

# Replace the tracked contents wholesale: files that vanished from the private tree must vanish here.
published = {RENAME.get(c, c) for c in copy} | {MARKER}
for rel in sorted(subprocess.run(['git', 'ls-files'], cwd=PUB, capture_output=True, text=True, encoding='utf-8').stdout.replace('\\', '/').split('\n')):
    if rel.strip() and rel.strip() not in published:
        p = os.path.join(PUB, rel.strip())
        if os.path.isfile(p):
            os.remove(p)

# A PUBLISHED COMMAND MUST NOT POINT AT AN UNPUBLISHED FILE. package.json is published, and a
# script entry that runs a held-back file would fail for every reader who tries it, so such entries
# are dropped from the published copy. Nothing else in the file changes.
held_paths = set(skipped)
def published_bytes(rel, raw):
    if rel != 'package.json':
        return raw
    import json
    pkg = json.loads(raw.decode('utf-8'))
    scripts = pkg.get('scripts') or {}
    for name in list(scripts):
        command = scripts[name].replace(chr(92), '/')
        if any(h in command for h in held_paths if '/' in h):
            del scripts[name]
    return (json.dumps(pkg, indent=2, ensure_ascii=False) + '\n').encode('utf-8')

written = 0
for rel in copy:
    src, dst = os.path.join(PRIV, rel), os.path.join(PUB, RENAME.get(rel, rel))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    data = published_bytes(rel, open(src, 'rb').read())
    if os.path.isfile(dst) and open(dst, 'rb').read() == data:
        continue
    if data == open(src, 'rb').read():
        shutil.copy2(src, dst)
    else:
        open(dst, 'wb').write(data)
    written += 1
with io.open(os.path.join(PUB, MARKER), 'w', encoding='utf-8', newline='\n') as fh:
    fh.write(MARKER_TEXT)
print('copied %d changed file(s) into the mirror' % written)
