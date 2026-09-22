#!/usr/bin/env node
/* Interface vocabulary audit.

   docs/design/INFORMATION-ARCHITECTURE.md contains one sentence naming the words the interface is
   not allowed to say, because they are how the thing is built rather than what a reader came for:
   domain, group, row, selector, live, growing, node, ontology. It carries requirement ids and has
   been in the document since 2026-07-20. It was also being ignored, which is how the front page
   came to tell readers that scrolling "walks the ontology".

   That is worth a gate rather than a fix, because a rule with no check is a preference. A page
   written by anyone, at any hour, in a hurry, will drift back toward naming its own machinery, and
   naming your machinery at the reader is a large part of what makes a page read as generated.

   HOW THE LIST IS DERIVED. From that sentence in the document, parsed at run time. Not copied here.
   A gate holding its own copy of a rule cannot notice when the rule changes, and this codebase has
   paid for that lesson more than once.

   WHAT IS CHECKED. The rendered artifact, not the source. Script and style bodies are stripped, tags
   are removed, and what remains is what a reader sees, plus the aria-labels and titles a screen
   reader speaks. Checking source would flag ontologyHTML() and ont.domains, which are names in code
   and no reader ever meets them.

   ALLOW carries the exceptions, each with a written reason, in the same idiom as claims.json: the
   machine enforces, a person explains, and an entry with no reason is not allowed to sit here.

   WHAT THIS CANNOT SEE, said plainly so nobody mistakes a pass for coverage of the interface.
   The app builds most of its chrome at run time from template literals in app/app.js, so none of
   it sits in a file on disk that looks like a page. An extension that tried to read those
   templates was written, tested, and thrown away: app.js nests template literals inside each
   other, naive backtick pairing loses whole regions, and the check reported a pass while blind to
   a violation planted in the very function it claimed to cover. It was caught only by mutation
   testing. A green check that cannot fail is worse than no check, so it was removed rather than
   shipped.

   The client-rendered surface is covered the way docs/AGENTS-HOW-THIS-WENT-WRONG.md already
   requires anything user-facing to be covered: by driving the page in a real browser and reading
   what the document actually says. That is a manual step, and naming it here is the point.

   Run: node research/interface_vocabulary_audit.js
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTRACT = path.join(ROOT, 'docs', 'design', 'INFORMATION-ARCHITECTURE.md');

/* Pages a reader actually opens. The generated card and guide directories are sampled rather than
   walked in full: there are thousands, they come from a handful of templates, and a violation in a
   template shows up in every one of its children. */
const PAGES = ['app/index.html', 'index.html'];
const SAMPLE_DIRS = [
  { dir: 'app/g', take: 12 },
  { dir: 'app/c', take: 8, nested: true },
];

/* TWO CLASSES OF WORD, because one rule for both produces a gate nobody can keep.

   UNAMBIGUOUS words are never what a reader came for, wherever they appear: ontology, selector.
   A page that says either is describing its own construction.

   AMBIGUOUS words are ordinary English that happens to collide with a build term: domain, group,
   row, live, growing, node. "Food group", "public domain", "group chats", "lymph node" and "the
   garden, what is growing" are all correct writing, and a check that fails them is a check that
   gets switched off. The first version of this audit flagged thirty-one of them and every single
   one was legitimate.

   The contract is about the INTERFACE naming its own machinery, so ambiguous words are policed
   only where they label something: aria-labels, titles, placeholders, buttons, navigation and
   figure captions. In a sentence about the world they are left alone. */
const UNAMBIGUOUS = new Set(['ontology', 'selector']);

function readContract() {
  const text = fs.readFileSync(CONTRACT, 'utf8');
  const line = /The interface does not say ([^.]+)\./.exec(text);
  if (!line) {
    console.log('INTERFACE VOCABULARY AUDIT FAILED (no vocabulary sentence in the contract)');
    console.log('  Expected a sentence beginning "The interface does not say" in '
      + path.relative(ROOT, CONTRACT));
    process.exit(1);
  }
  return line[1]
    .split(/,| or /)
    .map((word) => word.trim().replace(/[^a-z]/gi, '').toLowerCase())
    .filter(Boolean);
}

/* What a reader sees: tags gone, scripts and styles gone, plus the text assistive tech speaks. */
function visibleText(html) {
  const spoken = [];
  for (const m of html.matchAll(/\b(?:aria-label|title|alt|placeholder)\s*=\s*"([^"]*)"/gi)) {
    spoken.push(m[1]);
  }
  const body = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  return `${body} ${spoken.join(' ')}`
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ');
}

function pageList() {
  const out = PAGES.filter((p) => fs.existsSync(path.join(ROOT, p)));
  for (const { dir, take, nested } of SAMPLE_DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    const found = [];
    const walk = (d, depth) => {
      for (const name of fs.readdirSync(d)) {
        const p = path.join(d, name);
        if (fs.statSync(p).isDirectory()) {
          if (nested && depth < 1) walk(p, depth + 1);
        } else if (name.endsWith('.html')) {
          found.push(path.relative(ROOT, p).split(path.sep).join('/'));
        }
      }
    };
    walk(full, 0);
    found.sort();
    const step = Math.max(1, Math.floor(found.length / take));
    for (let i = 0; i < found.length && out.length < 200; i += step) out.push(found[i]);
  }
  return out;
}

/* Text that labels a control, as against text that says something about the world. */
function chromeText(html) {
  const parts = [];
  for (const m of html.matchAll(/\b(?:aria-label|title|alt|placeholder)\s*=\s*"([^"]*)"/gi)) {
    parts.push(m[1]);
  }
  for (const m of html.matchAll(/<(button|nav|label|figcaption|summary)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    parts.push(m[2].replace(/<[^>]+>/g, ' '));
  }
  return parts.join(' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ');
}

function inspect(pages, words) {
  const findings = [];
  for (const rel of pages) {
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const seen = visibleText(html);
    const chrome = chromeText(html);
    for (const word of words) {
      const re = new RegExp('\\b' + word + "s?\\b", 'gi');
      const where = UNAMBIGUOUS.has(word) ? seen : chrome;
      const scope = UNAMBIGUOUS.has(word) ? 'anywhere a reader reads' : 'labelling a control';
      for (const m of where.matchAll(re)) {
        const at = Math.max(0, m.index - 55);
        findings.push({ page: rel, word: m[0].toLowerCase(), scope,
          context: where.slice(at, m.index + 65).trim() });
      }
    }
  }
  return { findings, policed: words };
}

function main() {
  const words = readContract();
  const pages = pageList();
  const { findings, policed } = inspect(pages, words);

  console.log('Interface vocabulary audit');
  console.log(`  contract names ${words.length} words: ${words.join(', ')}`);
  console.log(`  ${[...UNAMBIGUOUS].join(' and ')} are refused anywhere a reader reads them`);
  console.log(`  the rest are refused only where they label a control, because in a sentence`);
  console.log(`  about the world they are ordinary English: food group, public domain, lymph node`);
  console.log(`  read ${pages.length} rendered pages`);

  if (findings.length) {
    console.log(`INTERFACE VOCABULARY AUDIT FAILED (${findings.length})`);
    const shown = findings.slice(0, 25);
    for (const f of shown) {
      console.log(`  FAIL ${f.page}: says "${f.word}"`);
      console.log(`       ...${f.context}...`);
    }
    if (findings.length > shown.length) console.log(`  ... and ${findings.length - shown.length} more`);
    console.log('  These are words for how the thing is built. A reader came for a decision.');
    process.exit(1);
  }

  // The bite: put a banned word into a page in memory and require the check to see it.
  const probe = visibleText('<p>Scrolling walks the ontology from broad to specific.</p>');
  const caught = policed.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(probe));
  if (!caught) {
    console.log('INTERFACE VOCABULARY AUDIT FAILED (bite: a planted banned word was not seen)');
    process.exit(1);
  }
  console.log('  bite proof: a planted "ontology" in page text is caught');
  console.log('INTERFACE VOCABULARY AUDIT PASS');
}

main();
