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

// The label the guides actually use. Changed by hand across all 108 guides on 2026-08-15;
// the convention is the signed blockquote, not the particular adjective in front of it.
const HONEST_LABEL = 'The short answer';
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
  'kosplora/shelf/index.html',
  'kosplora/format/index.html',
  'kosplora/route/local-ai/index.html',
  'kosplora/route/gatherings/index.html',
  'kosplora/route/second-mapper/index.html',
  'kosplora/walker.js',
  'kosplora/curriculum.js',
  'awards/index.html'
];
const SITE_BANNED = BANNED.concat([['em dash entity', /&mdash;/i]]);

// SHAPES, added 2026-08-12. Everything above this line is a word check, and on that day a sweep
// found 25 instances of the same rhetorical figure in guide copy that this audit had passed
// cleanly every time it ran. The figure has a name in the literature: NEGATIVE PARALLELISM, also
// called antithesis or contrastive phrasing, defining a thing by what it is not alongside what it
// is. "A payment is not just money moving. It is metadata." "Fast fashion is not only a fabric
// problem. It is a timing problem." Every current model produces it several times per response;
// the proposed cause is that reinforcement raters score it highly because it reads as nuance, so
// the model reaches for the figure whether or not there is a contrast worth drawing.
//
// It is invisible to a wordlist. Each of those sentences is plain, concrete, correctly sourced,
// and free of all 30-odd tells above. The tell is the shape.
//
// NOT INCLUDED, on purpose. Tricolons are left alone: three parallel clauses are as often a real
// list as a drum, and this corpus is full of honest ones ("species, catch method, sodium"). Nor is
// a bare trailing "X, not Y" flagged, because the guides use it for genuine claim ceilings, as in
// "this is a leverage guide, not financial advice".
const SHAPES = [
  ['negative parallelism ("X is not just A. It is B.")',
    /\b(?:is|are|was|were)\s+not\s+(?:just|merely|only)\b[^.!?;]{0,70}[.;]\s*(?:It|They|That|This)\s+(?:is|are)\b/i],
  ['negative parallelism, semicolon form',
    /\b(?:is|are)\s+not\s+(?:just|merely|only)\b[^.!?;]{0,70};\s*(?:it|they)\s+(?:is|are)\b/i],
  // The colon is required, and that is the whole difference between the figure and a list. The
  // first run of this check failed soap.md on "not painfully scented, not drying enough that people
  // avoid it, and obvious when it needs replacing", which is four properties of a good hand soap
  // with two of them phrased negatively. The slop version withholds and then delivers:
  // "not an algorithm, not a token, not a platform: a room of people". A comma continues a list;
  // a colon performs a reveal.
  ['negation chain ("not A, not B: C")',
    /\bnot\s+[a-z][^.,;:]{2,40},\s*not\s+[a-z][^.,;:]{2,40}:/i],
  ['not-because-but-because',
    /\bnot because\b[^.!?]{0,60}\bbut because\b/i],
  ['payoff-promising transition',
    /\b(?:here'?s the (?:thing|kicker|catch)|the best part\?|but wait,? there'?s more)\b/i],
  ['promotional grandiosity',
    /\b(?:stands as a testament|plays a (?:vital|crucial|key|pivotal) role|enduring legacy|rich tapestry)\b/i]
];

// Titles, h1/h2/h3, and meta descriptions: the layer where a contrast is standing in for a claim.
const HEADLINE_TEXT = /<(title|h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>|<meta[^>]+name="(?:description|twitter:description)"[^>]+content="([^"]*)"/gi;
const HEADLINE_CONTRAST = /,\s*(?:and\s+)?not\s+(?:by|a|an|the|for|to|from|what|who|because)\b/i;

// Instance lens files are DATA, but the data is reader-facing: taglines, footers, dial
// questions, and pole labels all render straight onto the page. They sat outside every voice
// check until six em dashes were found in instances/messages/lens.js by hand, so they are in
// scope now. Discovered rather than enumerated, so a new instance is covered the day it lands.
function lensFiles() {
  const found = [];
  const roots = ['kosplora', 'instances'];
  const walk = (dir) => {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (entry.name === 'lens.js') found.push(rel.split(path.sep).join('/'));
    }
  };
  for (const root of roots) walk(root);
  return found.sort();
}

// The app is the flagship surface, and it sat outside every voice check until 2026-07-31, when a
// corpus study found the gate holding thirteen sibling sites to a line the product itself never
// had to meet. It cannot be checked line by line the way a site page is: app/app.js carries about
// a hundred block-comment dashes that no reader ever meets, and failing on those would make the
// gate unusable and get it switched off. So the app lane checks what a reader can actually see.
// HTML is checked with its comments stripped. JS is checked through the quoted strings that carry
// prose, skipping comment lines. Copy assembled by concatenation is out of this lane's reach and
// stays a reading job, which section 9 of the web standards says it was always going to be.
const APP_HTML = ['app/index.html', 'app/community.html'];
const APP_JS = ['app/app.js', 'app/presentation.js', 'app/shell.js', 'app/decision.js', 'app/icons.js', 'app/homelens.js', 'app/needsrose.js'];

// A comment is not copy, in any of the three languages an app page is written in. HTML comments
// come out with a regex, but the CSS and JS comments inside style and script blocks do not, and
// four of them in app/community.html were the gate's first false positives. Same test both lanes.
function isCommentLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

function proseStringsInLine(line) {
  if (isCommentLine(line)) return [];
  const out = [];
  const re = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g;
  let match;
  while ((match = re.exec(line))) {
    const value = match[2];
    if (value.length >= 12 && /\s/.test(value) && /[A-Za-z]{3}/.test(value)) out.push(value);
  }
  return out;
}

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
  let shapeChecks = 0;
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

      for (const [label, re] of SHAPES) {
        shapeChecks += 1;
        if (re.test(visible)) failures.push(`${rel}:${idx + 1}: LLM shape (${label})`);
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
  const LENS_FILES = lensFiles();
  for (const rel of SITE_FILES.concat(LENS_FILES)) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { failures.push(`${rel}: missing site surface`); continue; }
    const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
    for (const [idx, line] of lines.entries()) {
      for (const [label, re] of SITE_BANNED) {
        siteChecks += 1;
        // Machine-readable identifiers are not prose. The curriculum round pins the exact
        // spelling of its status token in its own audit, so scrub it before the copy check.
        if (re.test(line.replace(/curated-demonstration/g, ''))) failures.push(`${rel}:${idx + 1}: banned site tell (${label})`);
      }

      for (const [label, re] of SHAPES) {
        siteChecks += 1;
        if (re.test(line)) failures.push(`${rel}:${idx + 1}: LLM shape (${label})`);
      }

      // THE HEADLINE LAYER, and the gap that let the front page keep its slop.
      //
      // On 2026-08-12 the shape checks above were added to the guide loop only, so the site
      // surfaces were never scanned. Bentley then read the home page back: "Choose by your values,
      // not by who pays." It had been the h1 of the largest property in the family the whole time,
      // and the sweep that was supposed to catch exactly that figure had never looked at the file.
      //
      // Headlines get the stricter rule. A bare trailing "X, not Y" is deliberately allowed in body
      // prose, because the guides use it for honest claim ceilings ("a fact with a receipt, not a
      // verdict on what is best", "this is a leverage guide, not financial advice"). In a title, an
      // h1, an h2, or a meta description there is no such excuse: the reader is being handed a
      // contrast in place of a claim.
      for (const m of line.matchAll(HEADLINE_TEXT)) {
        const text = (m[2] || m[3] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!text || text.length < 8) continue;
        siteChecks += 1;
        if (HEADLINE_CONTRAST.test(text)) {
          failures.push(`${rel}:${idx + 1}: contrast in place of a claim, in a headline ("${text.slice(0, 70)}")`);
        }
      }
    }
  }

  let appChecks = 0;
  for (const rel of APP_HTML) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { failures.push(`${rel}: missing app surface`); continue; }
    const visible = fs.readFileSync(abs, 'utf8').replace(/<!--[\s\S]*?-->/g, ' ');
    for (const [idx, line] of visible.split(/\r?\n/).entries()) {
      if (isCommentLine(line)) continue;
      for (const [label, re] of SITE_BANNED) {
        appChecks += 1;
        if (re.test(line)) failures.push(`${rel}:${idx + 1}: banned app tell (${label})`);
      }
      for (const [label, re] of SHAPES) {
        appChecks += 1;
        if (re.test(line)) failures.push(`${rel}:${idx + 1}: LLM shape (${label})`);
      }
      // The app shell has its own lane, and that is how the second one got missed. The site lane
      // above never sees app/index.html, so when the front page h1 was fixed the app's <title> and
      // its noscript <h1> still read "choose by your values, not by who pays". Same figure, same
      // property, one file further in.
      for (const m of line.matchAll(HEADLINE_TEXT)) {
        const text = (m[2] || m[3] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!text || text.length < 8) continue;
        appChecks += 1;
        if (HEADLINE_CONTRAST.test(text)) {
          failures.push(`${rel}:${idx + 1}: contrast in place of a claim, in a headline ("${text.slice(0, 70)}")`);
        }
      }
    }
  }
  for (const rel of APP_JS) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { failures.push(`${rel}: missing app surface`); continue; }
    for (const [idx, line] of fs.readFileSync(abs, 'utf8').split(/\r?\n/).entries()) {
      for (const value of proseStringsInLine(line)) {
        for (const [label, re] of SITE_BANNED) {
          appChecks += 1;
          if (re.test(value)) failures.push(`${rel}:${idx + 1}: banned app tell (${label}) in "${value.slice(0, 60)}"`);
        }
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
  console.log(`  LLM shape checks: ${shapeChecks}`);
  console.log(`  site surfaces checked: ${SITE_FILES.length} (${siteChecks} checks)`);
  console.log(`  instance lens files checked: ${LENS_FILES.length} (${LENS_FILES.join(', ')})`);
  console.log(`  app surfaces checked: ${APP_HTML.length + APP_JS.length} (${appChecks} checks on reader-facing copy)`);
  console.log('GUIDE VOICE AUDIT PASS');
}

main();
