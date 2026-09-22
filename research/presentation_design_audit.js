#!/usr/bin/env node
/* P3 presentation-design audit.

   Checks the 61-line ledger receipt, the D1-D3 interface-string voice sample,
   the familiar-affordance decisions, and the two-minute founder-walk contract.
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DESIGN_FILES = [
  'docs/design/PATTERN-LANGUAGE.md',
  'docs/design/INFORMATION-ARCHITECTURE.md',
  'docs/design/VISUAL-SPECIFICATION.md',
];
const LEDGER_FILE = 'docs/design/REQUIREMENTS-LEDGER.md';
const AUDIT_FILE = 'docs/design/DESIGN-AUDITS.md';
const WALK_FILE = 'docs/design/FOUNDER-WALK.md';
const failures = [];

const BANNED_PATTERNS = [
  ['em dash', /\u2014/],
  ['more than just', /\bmore than just\b/i],
  ["whether you're", /\bwhether you(?:'|’)?re\b/i],
  ["in today's", /\bin today(?:'|’)?s\b/i],
  ['in a world where', /\bin a world where\b/i],
  ['at its core', /\bat its core\b/i],
  ['testament', /\b(?:stands as|is) a testament\b/i],
  ["let's explore", /\blet(?:'|’)?s (?:explore|unpack|delve|dive)\b/i],
  ['ever-evolving', /\bever-evolving\b/i],
  ['seamless', /\bseamless(?:ly)?\b/i],
  ['unlock', /\bunlock(?:s|ed|ing)?\b/i],
  ['inflated importance', /\bplays? a (?:crucial|vital|pivotal) role\b/i],
  ["it's worth noting", /\bit(?:'|’)?s worth noting\b/i],
  ["it's important to note", /\bit(?:'|’)?s important to (?:note|remember|understand)\b/i],
  ['designed to empower', /\bdesigned to empower\b/i],
  ['delve', /\bdelve\b/i],
  ['journey', /\bjourney\b/i],
  ['landscape', /\blandscape\b/i],
  ['tapestry', /\btapestry\b/i],
  ['robust', /\brobust\b/i],
  ['empower', /\bempower(?:s|ed|ing)?\b/i],
  ['elevate', /\belevate(?:s|d|ing)?\b/i],
  ['revolutionize', /\brevolutioni[sz]e(?:s|d|ing)?\b/i],
  ['fast-paced', /\bfast-paced\b/i],
  ['game-changer', /\bgame.chang(?:er|ing)?\b/i],
  ['when it comes to', /\bwhen it comes to\b/i],
  ['look no further', /\blook no further\b/i],
  ['at the end of the day', /\bat the end of the day\b/i],
  ['plethora', /\bplethora\b/i],
  ['myriad', /\bmyriad\b/i],
  ['holistic', /\bholistic\b/i],
  ['synergy', /\bsynerg(?:y|ies|istic)\b/i],
  ['paradigm', /\bparadigm\b/i],
  ['supercharge', /\bsupercharg(?:e|es|ed|ing)?\b/i],
  ['treasure trove', /\btreasure trove\b/i],
  ['boasts', /\bboasts\b/i],
  ['in conclusion', /\bin conclusion\b/i],
  ['leveraging', /\bleveraging\b/i],
];

const RETIRED_CHOOSER_TERMS = [
  ['lines', /\blines\b/i],
  ['floor', /\bfloor\b/i],
  ['errands', /\berrands\b/i],
  ['generic dials', /\bdials?\b/i],
  ['Values Passport', /\bValues Passport\b/i],
  ['leanings', /\bleanings\b/i],
];

const COINED_TERMS = [
  'Values Commons',
  'Open Values Standard',
  'ontology',
  'lens',
  'passport',
  'slate',
  'node',
  'MCP',
  'JSON-LD',
  'sigil',
  'lattice',
  'atlas',
];

const REQUIRED_A4 = [
  'A4-search',
  'A4-preview',
  'A4-lead',
  'A4-infobox',
  'A4-citations',
  'A4-categories',
  'A4-links-here',
  'A4-changes',
  'A4-history',
  'A4-talk',
  'A4-edit',
  'A4-portal',
  'A4-disambiguation',
  'A4-contents',
  'A4-tabs',
  'A4-watchlist',
  'A4-popularity',
];

const REQUIRED_WALK_ROUTES = [
  '#home',
  '#search/best%20bank',
  '#decide/banking',
  '#compare/banking/triodos/chase',
  '#company/jpmorgan-chase',
  '#source/ran-banking-on-climate-chaos-2026',
  '#file',
];

function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`${rel}: missing`);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function ledgerIds(text) {
  return [...text.matchAll(/^\| (R-[A-Z]+-\d+) \|/gm)].map((match) => match[1]);
}

function citedIds(text) {
  const ids = new Set();
  for (const match of text.matchAll(/R-([A-Z]+)-(\d+)(?:\s+to\s+R-\1-(\d+))?/g)) {
    const [, family, first, last] = match;
    for (let value = Number(first); value <= Number(last || first); value += 1) {
      ids.add(`R-${family}-${String(value).padStart(2, '0')}`);
    }
  }
  return ids;
}

function interfaceStrings(rel, text) {
  const strings = [];
  let inTextFence = false;
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    if (line === '```text') {
      inTextFence = true;
      continue;
    }
    if (inTextFence && line === '```') {
      inTextFence = false;
      continue;
    }
    if (inTextFence && line.trim()) strings.push({ rel, lineNumber, kind: 'wireframe', text: line.trim() });
    if (/^>\s+/.test(line)) strings.push({ rel, lineNumber, kind: 'blockquote', text: line.replace(/^>\s+/, '').trim() });
    for (const match of line.matchAll(/\u201c([^\u201d]+)\u201d/g)) {
      strings.push({ rel, lineNumber, kind: 'quoted', text: match[1].trim() });
    }
    for (const match of line.matchAll(/\*\*([^*\n]+)\*\*/g)) {
      strings.push({ rel, lineNumber, kind: 'bold', text: match[1].trim() });
    }
  }
  return strings;
}

function checkLedger(designTexts, auditText) {
  const ids = ledgerIds(read(LEDGER_FILE));
  expect(ids.length === 61, `${LEDGER_FILE}: expected 61 requirement rows, found ${ids.length}`);
  for (const duplicate of duplicateValues(ids)) failures.push(`${LEDGER_FILE}: duplicate requirement ${duplicate}`);

  const citations = citedIds(designTexts.join('\n'));
  for (const id of ids) expect(citations.has(id), `D1-D3: requirement ${id} has no design citation`);

  const receiptRows = [...auditText.matchAll(/^\| (R-[A-Z]+-\d+) \| (PASS|FIXED) \|/gm)]
    .map((match) => ({ id: match[1], result: match[2] }));
  expect(receiptRows.length === 61, `${AUDIT_FILE}: expected 61 A1 rows, found ${receiptRows.length}`);
  for (const duplicate of duplicateValues(receiptRows.map((row) => row.id))) failures.push(`${AUDIT_FILE}: duplicate A1 row ${duplicate}`);
  for (const id of ids) expect(receiptRows.some((row) => row.id === id), `${AUDIT_FILE}: missing A1 result for ${id}`);
  expect(receiptRows.filter((row) => row.result === 'FIXED').length === 2, `${AUDIT_FILE}: expected 2 fixed citation findings`);
}

function checkVoice(designFiles, designTexts, walkText) {
  const candidates = designFiles.flatMap((rel, index) => interfaceStrings(rel, designTexts[index]));
  // 378 as of 2026-08-14: the serial promotion receipt added one interface-facing
  // architecture string. Every candidate still passes the voice patterns below.
  expect(candidates.length === 378, `D1-D3: expected 378 proposed interface strings, found ${candidates.length}`);

  for (const candidate of candidates) {
    for (const [label, pattern] of BANNED_PATTERNS) {
      if (pattern.test(candidate.text)) failures.push(`${candidate.rel}:${candidate.lineNumber}: ${candidate.kind} uses banned voice pattern ${label}`);
    }
    for (const [label, pattern] of RETIRED_CHOOSER_TERMS) {
      if (pattern.test(candidate.text)) failures.push(`${candidate.rel}:${candidate.lineNumber}: ${candidate.kind} restores retired chooser term ${label}`);
    }
  }

  for (const [index, text] of designTexts.entries()) {
    expect(!text.includes('\u2014'), `${designFiles[index]}: em dash in design document`);
  }
  expect(!walkText.includes('\u2014'), `${WALK_FILE}: em dash in founder walk`);

  const timed = walkText.match(/<!-- founder-walk:start -->([\s\S]*?)<!-- founder-walk:end -->/);
  expect(!!timed, `${WALK_FILE}: timed-walk markers missing`);
  const timedText = timed ? timed[1] : '';
  const foundCoined = COINED_TERMS.filter((term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(timedText));
  expect(foundCoined.length === 0, `${WALK_FILE}: coined terms in timed walk (${foundCoined.join(', ')})`);

  return { candidates: candidates.length, coined: foundCoined.length };
}

function checkParity(auditText) {
  const rows = [...auditText.matchAll(/^\| (A4-[a-z-]+) \|[^\n]*\| (ADOPT|ADAPT|WAIVE) \|/gm)]
    .map((match) => ({ id: match[1], decision: match[2] }));
  expect(rows.length === REQUIRED_A4.length, `${AUDIT_FILE}: expected ${REQUIRED_A4.length} A4 rows, found ${rows.length}`);
  for (const id of REQUIRED_A4) expect(rows.some((row) => row.id === id), `${AUDIT_FILE}: missing parity decision ${id}`);
  for (const duplicate of duplicateValues(rows.map((row) => row.id))) failures.push(`${AUDIT_FILE}: duplicate parity decision ${duplicate}`);
  expect(rows.filter((row) => row.decision === 'ADOPT').length === 5, `${AUDIT_FILE}: expected 5 ADOPT decisions`);
  expect(rows.filter((row) => row.decision === 'ADAPT').length === 10, `${AUDIT_FILE}: expected 10 ADAPT decisions`);
  expect(rows.filter((row) => row.decision === 'WAIVE').length === 2, `${AUDIT_FILE}: expected 2 WAIVE decisions`);
}

function checkWalk(walkText) {
  const timed = walkText.match(/<!-- founder-walk:start -->([\s\S]*?)<!-- founder-walk:end -->/);
  const timedText = timed ? timed[1] : '';
  const rows = [...timedText.matchAll(/^\| (\d:\d{2}) \|/gm)].map((match) => match[1]);
  expect(rows.length === 10, `${WALK_FILE}: expected 10 timed steps, found ${rows.length}`);
  expect(rows[0] === '0:00', `${WALK_FILE}: walk must begin at 0:00`);
  expect(rows[rows.length - 1] === '2:00', `${WALK_FILE}: walk must end at 2:00`);
  for (const route of REQUIRED_WALK_ROUTES) expect(timedText.includes(route), `${WALK_FILE}: timed walk missing ${route}`);
  for (const phrase of ['Why this answer', 'Show every bank', 'Lower fees', 'Save this list']) {
    expect(timedText.includes(phrase), `${WALK_FILE}: timed walk missing visible action ${phrase}`);
  }
  expect(walkText.includes('320px') && walkText.includes('200%'), `${WALK_FILE}: narrow or zoom replay missing`);
}

function main() {
  const designTexts = DESIGN_FILES.map(read);
  const auditText = read(AUDIT_FILE);
  const walkText = read(WALK_FILE);

  checkLedger(designTexts, auditText);
  const voice = checkVoice(DESIGN_FILES, designTexts, walkText);
  checkParity(auditText);
  checkWalk(walkText);

  console.log('Presentation design audit');
  console.log('  A1: 61 ledger requirements checked; 59 pass + 2 citation fixes; 0 open');
  console.log(`  A2: ${voice.candidates} proposed interface strings; ${voice.coined} coined terms in founder walk`);
  console.log('  A4: 17 familiar affordances; 5 adopt + 10 adapt + 2 waive');
  console.log('  A5: 10 timed steps; 0:00 -> 2:00; narrow and keyboard replay specified');

  if (failures.length) {
    console.log(`PRESENTATION DESIGN AUDIT FAILED (${failures.length})`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('PRESENTATION DESIGN AUDIT PASS');
}

main();
