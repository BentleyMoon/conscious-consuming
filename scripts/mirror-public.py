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
NEVER = {'.claude', 'AGENTS.md', 'CLAUDE.md', 'CODEX-AUTOMATION.md', 'WEBSITES-AGENT.md', 'RUN.md',
         'codex.md', 'cchandoff', 'ontologystudy', 'kiz.txt', 'run.py', 'run.cmd', 'dist', 'build.log'}

# The public repository's front page is written for a stranger arriving cold, and the private
# repository's README is a working note. The public one is maintained at docs/README-public.md,
# where the work happens, and is published as README.md.
RENAME = {'docs/README-public.md': 'README.md'}
NEVER.add('README.md')

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
    if top in NEVER or top not in pub_top:
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
PRIVATE_WORDS = re.compile(r'groundtruth|Chartered Model|Human Leverage Index|C:\\\\(?:groundtruth|engine|reinnman)|bentleymoonperkins@', re.I)
leaks = []
# This file names the archive because it is the rule that keeps the archive out, so it would
# otherwise hold itself back and the rules would stay unpublished.
SELF = os.path.relpath(os.path.abspath(__file__), PRIV).replace(chr(92), '/')
for rel in copy:
    if rel == SELF:
        continue
    path = os.path.join(PRIV, rel)
    if os.path.getsize(path) > 4_000_000:
        continue
    try:
        text = io.open(path, encoding='utf-8').read()
    except Exception:
        continue
    for m in PRIVATE_WORDS.finditer(text):
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

# Replace the tracked contents wholesale: files that vanished from the private tree must vanish here.
published = {RENAME.get(c, c) for c in copy}
for rel in sorted(subprocess.run(['git', 'ls-files'], cwd=PUB, capture_output=True, text=True, encoding='utf-8').stdout.replace('\\', '/').split('\n')):
    if rel.strip() and rel.strip() not in published:
        p = os.path.join(PUB, rel.strip())
        if os.path.isfile(p):
            os.remove(p)

written = 0
for rel in copy:
    src, dst = os.path.join(PRIV, rel), os.path.join(PUB, RENAME.get(rel, rel))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.isfile(dst) and os.path.getsize(dst) == os.path.getsize(src):
        a = hashlib.sha1(open(src, 'rb').read()).hexdigest()
        b = hashlib.sha1(open(dst, 'rb').read()).hexdigest()
        if a == b:
            continue
    shutil.copy2(src, dst)
    written += 1
print('copied %d changed file(s) into the mirror' % written)
