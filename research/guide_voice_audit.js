#!/usr/bin/env node
/* Audit the C8 guide voice guardrails.

   This is intentionally narrow. It protects the concrete D2 cleanup work that
   already landed: no em dashes in guide copy, no obvious LLM tell-words, and
   no loose "honest" seasoning outside the signed guide blockquote convention
   or the anti-app's product-contract language.
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GUIDES_DIR = path.join(ROOT, 'content', 'guides');
const failures = [];

const HONEST_LABEL = 'The honest one-paragraph answer';
const HONEST_LABEL_EXCEPTIONS = new Set(['the-anti-app', 'vote-with-your-money']);
const HONEST_WORD_EXCEPTIONS = new Set(['how-scores-work']);
const ANTI_APP_HONEST_ALLOW = [
  /\bhonest missing data\b/gi,
  /\bthe honest answer\b/gi
];

const BANNED = [
  ['em dash', /\u2014/],
  ['delve', /\bdelve\b/i],
  ['journey', /\bjourney\b/i],
  ['landscape', /\blandscape\b/i],
  ['tapestry', /\btapestry\b/i],
  ['robust', /\brobust\b/i],
  ['seamless', /\bseamless\b/i],
  ['empower', /\bempower(?:s|ed|ing)?\b/i],
  ['unlock', /\bunlock(?:s|ed|ing)?\b/i],
  ['elevate', /\belevate(?:s|d|ing)?\b/i],
  ['revolutionize', /\brevolutioni[sz]e(?:s|d|ing)?\b/i],
  ['curated as adjective', /\bcurated\b/i],
  ['dive into', /\bdive into\b/i],
  ["it's worth noting", /\bit'?s worth noting\b/i],
  // The second wave of LLM tells, banned while their count is zero.
  ["it's important to note", /\bit'?s important to (?:note|remember|understand)\b/i],
  ["in today's", /\bin today'?s\b/i],
  ['fast-paced', /\bfast-paced\b/i],
  ["whether you're", /\bwhether you'?re\b/i],
  ['game-changer', /\bgame.chang(?:er|ing)\b/i],
  ['when it comes to', /\bwhen it comes to\b/i],
  ['look no further', /\blook no further\b/i],
  ['at the end of the day', /\bat the end of the day\b/i],
  ['plethora', /\bplethora\b/i],
  ['myriad', /\bmyriad\b/i],
  ['holistic', /\bholistic\b/i],
  ['synergy', /\bsynerg(?:y|ies|istic)\b/i],
  ['paradigm', /\bparadigm\b/i],
  ['supercharge', /\bsupercharg(?:e|es|ed|ing)\b/i],
  ['treasure trove', /\btreasure trove\b/i],
  ["let's explore", /\blet'?s (?:explore|unpack)\b/i],
  ['master the art', /\bmaster the art\b/i],
  ['boasts', /\bboasts\b/i],
  ['in conclusion', /\bin conclusion\b/i],
  ['leveraging as verb', /\bleveraging\b/i],
  // Third wave: the vocabulary-shift markers documented in the post-2022 corpus studies
  // (delve, underscore, meticulous, pivotal, boast). Banned while their count is zero.
  // Deliberately NOT banned: "leverage" as a noun (high-leverage is a real term of art),
  // "beacon"/"bedrock"/"game changer" (they appear inside real brand names in the data).
  ['underscores as verb', /\bunderscor(?:e|es|ed|ing)\b/i],
  ['meticulous', /\bmeticulous(?:ly)?\b/i],
  ['pivotal', /\bpivotal\b/i],
  ['a testament to', /\ba testament to\b/i],
  ['realm', /\brealm\b/i],
  ['utilize', /\butiliz(?:e|es|ed|ing|ation)\b/i],
  ['streamline', /\bstreamlin(?:e|es|ed|ing)\b/i],
  ['cutting-edge', /\bcutting.edge\b/i],
  ['ever-evolving', /\bever.evolving\b/i],
  ['in essence', /\bin essence\b/i],
  ['in summary', /\bin summary\b/i],
  ['navigating the', /\bnavigating the\b/i],
  ['transformative', /\btransformative\b/i],
  ['multifaceted', /\bmultifaceted\b/i],
  ['unwavering', /\bunwavering\b/i],
  ['comprehensive suite', /\bcomprehensive suite\b/i]
];

// The public site surfaces hold the same voice line as the guides: no LLM
// tell-words, and no em dashes in copy (a data placeholder is an en dash).
const SITE_FILES = [
  'index.html',
  'tour/index.html',
  'funders/index.html',
  'contribute/index.html',
  'passport/index.html',
  'weave/index.html',
  'instances/index.html',
  'instances/new/index.html',
  'instances/messages/index.html',
  'standard/index.html',
  'assembly/index.html',
  'workshop/index.html',
  'slate/index.html',
  'kosplora/index.html',
  'awards/index.html'
];
const SITE_BANNED = BANNED.concat([['em dash entity', /&mdash;/i]]);

function guideFiles() {
  return fs.readdirSync(GUIDES_DIR)
    .filter(name => name.endsWith('.md'))
    .sort()
    .map(name => path.join(GUIDES_DIR, name));
}

function lineIsFrontmatter(lines, idx) {
  if (idx === 0) return lines[0] === '---';
  if (lines[0] !== '---') return false;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === '---') return idx <= i;
  }
  return false;
}

function stripAllowedHonest(slug, line) {
  let cleaned = line.replace(new RegExp(HONEST_LABEL, 'gi'), '');
  if (HONEST_WORD_EXCEPTIONS.has(slug)) return '';
  if (slug === 'the-anti-app') {
    for (const re of ANTI_APP_HONEST_ALLOW) cleaned = cleaned.replace(re, '');
  }
  return cleaned;
}

function visibleMarkdown(line) {
  return line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function main() {
  console.log('Guide voice audit');
  const files = guideFiles();
  let honestLabels = 0;
  let bannedChecks = 0;
  const introOpenings = new Map();

  for (const file of files) {
    const slug = path.basename(file, '.md');
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    let hasHonestLabel = false;
    const bodyLines = lines.filter((line, idx) => !lineIsFrontmatter(lines, idx));
    const firstParagraph = bodyLines.join('\n')
      .replace(/^# .+\n+/, '')
      .split(/\n\s*\n/)
      .find(block => block.trim() && !/^\s*[>#-]/.test(block));
    if (firstParagraph) {
      const opening = firstParagraph.trim().toLowerCase().split(/\s+/).slice(0, 4).join(' ');
      if (!introOpenings.has(opening)) introOpenings.set(opening, []);
      introOpenings.get(opening).push(slug);
    }

    for (const [idx, line] of lines.entries()) {
      if (lineIsFrontmatter(lines, idx)) continue;

      if (line.includes(HONEST_LABEL)) {
        hasHonestLabel = true;
        honestLabels += 1;
      }

      const visible = visibleMarkdown(line);
      for (const [label, re] of BANNED) {
        bannedChecks += 1;
        if (re.test(visible)) failures.push(`${rel}:${idx + 1}: banned D2 tell (${label})`);
      }

      const unapprovedHonest = stripAllowedHonest(slug, visible).match(/\bhonest(?:ly|y)?\b/i);
      if (unapprovedHonest) {
        failures.push(`${rel}:${idx + 1}: loose "honest" wording outside approved guide convention`);
      }
    }

    if (!HONEST_LABEL_EXCEPTIONS.has(slug) && !hasHonestLabel) {
      failures.push(`${rel}: missing "${HONEST_LABEL}" blockquote label`);
    }
  }

  for (const [opening, slugs] of introOpenings) {
    if (slugs.length > 2) failures.push(`guide intros repeat the same four-word opening ${slugs.length} times (${opening}): ${slugs.join(', ')}`);
  }

  let siteChecks = 0;
  for (const rel of SITE_FILES) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { failures.push(`${rel}: missing site surface`); continue; }
    const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
    for (const [idx, line] of lines.entries()) {
      for (const [label, re] of SITE_BANNED) {
        siteChecks += 1;
        if (re.test(line)) failures.push(`${rel}:${idx + 1}: banned site tell (${label})`);
      }
    }
  }

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log(`  guides checked: ${files.length}`);
  console.log(`  distinct guide openings: ${introOpenings.size}`);
  console.log(`  honest-answer labels: ${honestLabels}`);
  console.log(`  banned-copy checks: ${bannedChecks}`);
  console.log(`  site surfaces checked: ${SITE_FILES.length} (${siteChecks} checks)`);
  console.log('GUIDE VOICE AUDIT PASS');
}

main();
