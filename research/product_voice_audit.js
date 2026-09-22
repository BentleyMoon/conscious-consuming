#!/usr/bin/env node
/* Protect the signed public voice in the hand-written application shell.

   Guide prose has its own broad audit. This gate covers the places where the
   product itself speaks: the home, profile, contribution, and workbench views;
   the score explainer; and translated shell labels.
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const FILES = [
  'app/app.js',
  'app/index.html',
  'app/i18n.js',
  'app/decision.js',
  'app/lines.js',
  'app/reveal.js',
  'app/shell.js',
  'index.html',
  'passport/index.html',
  'instances/index.html',
  'instances/new/index.html',
  'contribute/index.html',
  'weave/index.html',
  'assembly/index.html',
  'workshop/index.html',
  'slate/index.html',
  'tour/index.html',
  'funders/index.html',
  'app/community.html',
  'docs/ADOPTION-KIT.md',
  'docs/PREVIEW-FEEDBACK-LOOP.md',
  'docs/GRANT-ONE-PAGER.md',
  'docs/GRANT-PREVIEW-PATH.md',
  'docs/CREATE-AN-INSTANCE.md',
  'docs/DEPLOY-AND-SHARE.md',
  'docs/R1-REVIEW.md',
  'docs/DECISION-REFRAME-FOUNDER-REVIEW.md',
  'docs/FEDERATION.md',
  'docs/VALUES-PASSPORT.md',
  'docs/INSTANCE-2-KOSPLORA.md',
  'docs/STANDARD-v0.md',
  'docs/THE-VALUES-LAYER.md',
  'docs/THE-WEAVE.md',
  'content/decisions.json',
  'content/errands.json',
  'app/data/nodes/companies.json'
];

// High-confidence patterns only. A voice audit should catch tells, not punish
// an ordinary word that happens to be useful in context.
const BANNED_PATTERNS = [
  ['more than just', /\bmore than just\b/i],
  ["whether you're", /\bwhether you(?:'|’)?re\b/i],
  ["in today's", /\bin today(?:'|’)?s\b/i],
  ['in a world where', /\bin a world where\b/i],
  ['at its core', /\bat its core\b/i],
  ['testament', /\b(?:stands as|is) a testament\b/i],
  ["let's explore", /\blet(?:'|’)?s (?:explore|unpack|delve|dive)\b/i],
  ['ever-evolving', /\bever-evolving\b/i],
  ['seamless', /\bseamless(?:ly)?\b/i],
  ['unlock the', /\bunlock the\b/i],
  ['inflated importance', /\bplays? a (?:crucial|vital|pivotal) role\b/i],
  ["it's worth noting", /\bit(?:'|’)?s worth noting\b/i],
  ["it's important to note", /\bit(?:'|’)?s important to (?:note|remember|understand)\b/i],
  ['designed to empower', /\bdesigned to empower\b/i]
];

// These phrases leaked workshop language or made promises the evidence could
// not keep. Exact checks keep that cleanup from quietly reversing.
const RETIRED_COPY = [
  'The idea:',
  'The design considerations:',
  'Ships when:',
  'Generated-node QA',
  'Generated contract:',
  'Data alone can drain',
  'Loading the generated-node QA contract',
  'source-independence posture',
  'get the verdict where you are standing',
  'Point your camera at any barcode',
  'real options</span>',
  'categories</span>',
  'This page handles',
  'The formal word is',
  'The formal word here is',
  'The formal name is',
  'App spine',
  'Contribution ladder',
  'Contribution path',
  'Relationship path',
  'Group agreement contract',
  'Change contract',
  'Action contract',
  'File flow',
  'press an instance',
  'steward packet',
  'learning receipt',
  'earned backlog',
  'Three tracks turn the commons into evidence',
  'usable evidence package',
  'Steward a subject area',
  'public artifact',
  'P&middot;',
  'Grant brief · private preview'
];

const REQUIRED_COPY = {
  'app/app.js': [
    'Nobody pays to be ranked',
    // Retired 2026-08-13 with the three-part trust strip on the old front page; the promise itself
    // survives in one sentence rather than three chips repeated again at the foot of the page.
    /* Retired 2026-08-13 with the home page barcode card. Scanning is unchanged and still reached
       from the top navigation, and the scan view keeps its own copy about the open database. This
       line only ever existed in a card on the front door that duplicated a link already in the
       nav, and the front page it belonged to no longer exists. */

    'This device holds the only copy',
    'Each one says what still needs to be checked'
  ],
  'app/index.html': [
    'Missing facts are never guessed',
    'Nobody can pay to rank'
  ],
  'app/i18n.js': [
    'Sources stay attached; nothing is sponsored or tracked.',
    'Las fuentes siguen visibles; nada está patrocinado ni rastreado.'
  ]
};

function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`${rel}: missing voice surface`);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}

function main() {
  console.log('Product voice audit');
  let checks = 0;

  for (const rel of FILES) {
    const text = read(rel);
    const lines = text.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      for (const [label, pattern] of BANNED_PATTERNS) {
        checks += 1;
        if (pattern.test(line)) failures.push(`${rel}:${index + 1}: stock copy pattern (${label})`);
      }
    }
    for (const retired of RETIRED_COPY) {
      checks += 1;
      if (text.includes(retired)) failures.push(`${rel}: retired public copy returned (${retired})`);
    }
  }

  for (const [rel, phrases] of Object.entries(REQUIRED_COPY)) {
    const text = read(rel);
    for (const phrase of phrases) {
      checks += 1;
      if (!text.includes(phrase)) failures.push(`${rel}: signed copy missing (${phrase})`);
    }
  }

  const decisionRel = 'content/decisions.json';
  let decisions = null;
  try {
    decisions = JSON.parse(read(decisionRel));
  } catch (err) {
    failures.push(`${decisionRel}: invalid JSON (${err.message})`);
  }
  const contracts = decisions && Array.isArray(decisions.contracts) ? decisions.contracts : [];
  // 124 on 2026-08-26: messaging and browsers authored their own contracts in the split.
  if (contracts.length !== 124) failures.push(`${decisionRel}: expected 124 decision contracts, found ${contracts.length}`);
  for (const contract of contracts) {
    const label = contract.category || '(unknown category)';
    const summary = contract.reads && contract.reads.text || '';
    checks += 4;
    if (!summary) failures.push(`${decisionRel}: ${label} is missing its comparison sentence`);
    if (/^The practical differences\b/i.test(summary)) failures.push(`${decisionRel}: ${label} restored the old generated opening`);
    if (/\bstronger values fit\b/i.test(summary)) failures.push(`${decisionRel}: ${label} uses the retired values-fit phrase`);
    if (summary.trim().split(/\s+/).length > 24) failures.push(`${decisionRel}: ${label} comparison sentence exceeds 24 words`);
    for (const axis of contract.axes || []) {
      const question = axis.question || '';
      checks += 4;
      if (!question.endsWith('?')) failures.push(`${decisionRel}: ${label}/${axis.id} is not written as a direct question`);
      if (/^How (?:much|strongly) should .+ lead\?$/i.test(question)) failures.push(`${decisionRel}: ${label}/${axis.id} restored the old generated question`);
      if (/\bstronger values fit\b/i.test(question)) failures.push(`${decisionRel}: ${label}/${axis.id} uses the retired values-fit phrase`);
      if (question.trim().split(/\s+/).length > 12) failures.push(`${decisionRel}: ${label}/${axis.id} question exceeds 12 words`);
    }
  }

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log(`  product surfaces checked: ${FILES.length}`);
  console.log(`  decision contracts checked: ${contracts.length}`);
  console.log(`  voice checks: ${checks}`);
  console.log('PRODUCT VOICE AUDIT PASS');
}

main();
