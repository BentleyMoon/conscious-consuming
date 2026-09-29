/* The public copy, and the working documents it does not carry.

   This repository is published as a selected copy (scripts/mirror-public.py). The engine, the data
   and the audits publish wholesale; docs/ publishes selectively, and the working notes stay behind.
   Some audits check those notes, for instance that a runbook still names the commands it documents,
   so in the public copy they failed for a reason no outside reader could act on, and a stranger
   running `npm run verify` on a fresh clone was told the project was broken.

   The mirror writes `.public-copy` at the root of the copy it publishes, and nowhere else. Where
   that marker exists, a check whose only failing input is one of the documents named below is
   reported as skipped rather than failed, with the documents named. Everything else still fails.

   The list is explicit rather than "whatever is missing from docs/": if a document the public copy
   is meant to carry disappears, the checks that read it must still go red. A new working document
   that an audit reads is added here on purpose, and until it is, the public CI says so. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IS_PUBLIC_COPY = fs.existsSync(path.join(ROOT, '.public-copy'));

const PRIVATE_DOCS = new Set([
  'BUILD-PLAN.md',
  'docs/AGENTS-HOW-THIS-WENT-WRONG.md', 'docs/BETA-SELF-TEST.md', 'docs/PARALLEL-LANES.md',
  'docs/CONTENT-BRIEF.md', 'docs/CONTENT-HANDOFF.md', 'docs/CRITERIA-STANDARD.md',
  'docs/DECISION-PILOT-REVIEW.md', 'docs/MASTERPLAN.md', 'docs/MATURITY-PROGRAM.md',
  'docs/ONTOLOGY-RESEARCH.md', 'docs/ONTOLOGY.md', 'docs/PATH-TO-FIRST-USERS.md',
  'docs/PROJECT-STATUS.md', 'docs/README-public.md', 'docs/README.md', 'docs/REGISTER-FRESHNESS-QUEUE.md',
  'docs/REGISTER-PASS-RUNBOOK.md', 'docs/SECURITY-AND-PRACTICES.md', 'docs/STATE-OF-THE-BUILD.md',
  'docs/SWARM-BRIEF.md', 'docs/TAXONOMY-MAP.md',
  'docs/design/DESIGN-AUDITS.md', 'docs/design/FOUNDER-WALK.md', 'docs/design/INFORMATION-ARCHITECTURE.md',
  'docs/design/PATTERN-LANGUAGE.md', 'docs/design/REQUIREMENTS-LEDGER.md', 'docs/design/VISUAL-SPECIFICATION.md',
]);

// README.md is published, but it is not the README these checks were written against: the working
// repository's README.md is a working note, and the public copy's README.md is docs/README-public.md
// under a new name. So in the public copy a check on README.md is a check on a document that is absent.
const PRIVATE_NAMESAKES = new Set(['README.md']);

function norm(rel) {
  rel = String(rel || '').replace(/\\/g, '/');
  const root = ROOT.replace(/\\/g, '/') + '/';
  if (rel.startsWith(root)) rel = rel.slice(root.length);
  return rel.replace(/^\.\//, '');
}

// True only in the public copy, only for a named working document, and only while it is absent.
function isAbsentPrivateDoc(rel) {
  rel = norm(rel);
  if (!IS_PUBLIC_COPY) return false;
  if (PRIVATE_NAMESAKES.has(rel)) return true;
  return PRIVATE_DOCS.has(rel) && !fs.existsSync(path.join(ROOT, rel));
}

function leadPath(message) {
  const m = String(message).match(/^\s*([^\s:]+):/);
  return m ? norm(m[1]) : null;
}

// Documents a failure says are missing or unreadable, wherever they appear in the message.
function missingDocsIn(message) {
  const text = String(message);
  if (!/missing|cannot read|ENOENT/i.test(text)) return [];
  const refs = [];
  for (const m of text.matchAll(/(?:^|[\s'"`(])((?:\/|[A-Za-z]:)?[A-Za-z0-9_./\\-]+\.md)\b/g)) refs.push(norm(m[1]));
  return refs;
}

// A failure is a working-document failure when the file it checks is an absent working document, or
// when it checks a published file and fails only because the working documents it points at are absent.
function isPrivateFailure(message) {
  const lead = leadPath(message);
  if (lead && isAbsentPrivateDoc(lead)) return true;
  const refs = missingDocsIn(message).filter(r => r !== lead);
  return refs.length > 0 && refs.every(isAbsentPrivateDoc);
}

function docsNamedIn(message) {
  const lead = leadPath(message);
  return [lead, ...missingDocsIn(message)].filter(Boolean);
}

// Filter an audit's failure list. Prints one SKIP line naming the documents, so a skip is never silent.
function dropPrivateFailures(failures, log) {
  if (!IS_PUBLIC_COPY) return failures;
  const kept = [], docs = new Set();
  let skipped = 0;
  for (const f of failures) {
    if (isPrivateFailure(f)) {
      skipped++;
      for (const n of docsNamedIn(f)) if (isAbsentPrivateDoc(n)) docs.add(n);
    } else kept.push(f);
  }
  if (skipped) {
    (log || console.log)(`  SKIP ${skipped} check(s) on working documents the public copy does not carry: ${[...docs].sort().join(', ')}`);
  }
  return kept;
}

// Read a document, or return null when it is an absent working document in the public copy.
function readUnlessPrivate(rel) {
  if (isAbsentPrivateDoc(rel)) return null;
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

module.exports = { IS_PUBLIC_COPY, PRIVATE_DOCS, isAbsentPrivateDoc, isPrivateFailure, dropPrivateFailures, readUnlessPrivate };
