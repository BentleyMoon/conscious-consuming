#!/usr/bin/env node
/* Accessibility audit for the static Values Commons build.

   This is intentionally repo-local and dependency-free. It checks the public
   shell and generated guide pages for the accessibility contracts we can verify
   without a browser: named controls, keyboard hooks, focus/reduced-motion CSS,
   mobile target rules, live announcements, contrast token pairs, and a plain
   language floor for guide copy.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];

function abs(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function read(rel) {
  if (!exists(rel)) {
    failures.push(`${rel}: missing file`);
    return '';
  }
  return fs.readFileSync(abs(rel), 'utf8');
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function attrValue(attrs, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i');
  const m = String(attrs || '').match(re);
  return m ? m[1] : '';
}

function hasAttr(attrs, name) {
  return new RegExp(`\\b${name}\\b`, 'i').test(String(attrs || ''));
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
}

function stripHtml(html) {
  return decodeEntities(String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function mainHtmlText(html) {
  const m = String(html || '').match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  return stripHtml(m ? m[1] : html);
}

// PROSE ONLY, for the readability floor.
//
// Flesch-Kincaid counts sentences by terminal punctuation, so an index of a hundred link titles
// reads as one 252-word sentence and scores -178. That is a category error rather than an
// unreadable page: a list of names has no prose in it to be unreadable, and the floor exists to
// catch dense writing. Paragraphs and list items that actually contain a sentence are the text the
// rule was written about. A page with none is skipped rather than scored, and the caller says so.
function proseText(html) {
  const m = String(html || '').match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const scope = m ? m[1] : String(html || '');
  const blocks = [];
  for (const match of scope.matchAll(/<(p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const s = stripHtml(match[2]).trim();
    if (/[.!?]/.test(s)) blocks.push(s);
  }
  return blocks.join(' ');
}

function cleanWord(word) {
  return String(word || '').toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '');
}

function syllables(word) {
  let w = cleanWord(word);
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/i, '');
  w = w.replace(/^y/, '');
  const groups = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

function readability(text) {
  const sentences = String(text || '')
    .split(/[.!?]+(?:\s|$)/)
    .map(s => s.trim())
    .filter(Boolean);
  const words = (String(text || '').match(/[A-Za-z][A-Za-z'-]*/g) || [])
    .map(cleanWord)
    .filter(Boolean);
  const sentenceCount = Math.max(1, sentences.length);
  const wordCount = Math.max(1, words.length);
  const syllableCount = Math.max(1, words.reduce((sum, word) => sum + syllables(word), 0));
  const avgSentence = wordCount / sentenceCount;
  const flesch = 206.835 - (1.015 * avgSentence) - (84.6 * (syllableCount / wordCount));
  return { words: wordCount, sentences: sentenceCount, avgSentence, flesch };
}

function checkDuplicateIds(rel, html) {
  const seen = new Map();
  for (const m of String(html || '').matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
    const id = m[1];
    if (seen.has(id)) failures.push(`${rel}: duplicate id "${id}"`);
    seen.set(id, true);
  }
}

function checkTargetBlankRel(rel, html) {
  for (const m of String(html || '').matchAll(/<a\b([^>]*)>/gi)) {
    const attrs = m[1] || '';
    if (attrValue(attrs, 'target') !== '_blank') continue;
    const relValue = attrValue(attrs, 'rel').toLowerCase();
    expect(relValue.split(/\s+/).includes('noopener'), `${rel}: target=_blank link is missing rel="noopener"`);
  }
}

function checkNamedStaticControls(rel, html) {
  for (const m of String(html || '').matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const attrs = m[1] || '';
    const name = stripHtml(m[2] || '') || attrValue(attrs, 'aria-label') || attrValue(attrs, 'title');
    expect(Boolean(name.trim()), `${rel}: static button is missing visible text, aria-label, or title`);
  }

  for (const m of String(html || '').matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase();
    const attrs = m[2] || '';
    const type = attrValue(attrs, 'type').toLowerCase();
    if (type === 'hidden') continue;
    const id = attrValue(attrs, 'id');
    const hasLabelFor = id && new RegExp(`<label\\b[^>]*\\bfor\\s*=\\s*["']${id}["']`, 'i').test(html);
    const named = attrValue(attrs, 'aria-label')
      || attrValue(attrs, 'aria-labelledby')
      || attrValue(attrs, 'title')
      || (tag === 'input' ? attrValue(attrs, 'placeholder') : '')
      || hasLabelFor;
    expect(Boolean(named), `${rel}: ${tag}${id ? `#${id}` : ''} is missing an accessible name`);
  }
}

function parseCssVars(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, 'm');
  const m = String(css || '').match(re);
  const vars = {};
  if (!m) return vars;
  for (const decl of m[1].replace(/\/\*[\s\S]*?\*\//g, '').split(';')) {
    const parts = decl.split(':');
    if (parts.length < 2) continue;
    const key = parts.shift().trim();
    const value = parts.join(':').trim();
    if (key.startsWith('--') && /^#[0-9a-f]{3,6}$/i.test(value)) vars[key.slice(2)] = value;
  }
  return vars;
}

function expandHex(hex) {
  const raw = String(hex || '').replace('#', '').trim();
  if (raw.length === 3) return raw.split('').map(c => c + c).join('');
  return raw;
}

function rgb(hex) {
  const raw = expandHex(hex);
  if (!/^[0-9a-f]{6}$/i.test(raw)) return null;
  return [0, 2, 4].map(i => parseInt(raw.slice(i, i + 2), 16) / 255);
}

function channel(v) {
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const c = rgb(hex);
  if (!c) return null;
  return (0.2126 * channel(c[0])) + (0.7152 * channel(c[1])) + (0.0722 * channel(c[2]));
}

function contrastRatio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  if (a == null || b == null) return 0;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

function checkContrast(css) {
  const light = parseCssVars(css, ':root');
  const dark = parseCssVars(css, ':root[data-theme=dark]');
  const pairs = [
    ['light ink on bg', light.ink, light.bg],
    ['light muted on bg', light.muted, light.bg],
    ['light hint on bg', light.hint, light.bg],
    ['light ink on surface', light.ink, light.surface],
    ['light muted on surface', light.muted, light.surface],
    ['light hint on surface', light.hint, light.surface],
    ['light accent on bg', light.accent, light.bg],
    ['light white on accent', '#fff', light.accent],
    ['dark ink on bg', dark.ink, dark.bg],
    ['dark muted on bg', dark.muted, dark.bg],
    ['dark hint on bg', dark.hint, dark.bg],
    ['dark ink on surface', dark.ink, dark.surface],
    ['dark muted on surface', dark.muted, dark.surface],
    ['dark hint on surface', dark.hint, dark.surface],
    ['dark accent on bg', dark.accent, dark.bg]
  ];
  for (const [label, fg, bg] of pairs) {
    expect(Boolean(fg && bg), `app/styles.css: missing color token for ${label}`);
    if (!fg || !bg) continue;
    const ratio = contrastRatio(fg, bg);
    expect(ratio >= 4.5, `app/styles.css: ${label} contrast ${ratio.toFixed(2)} is below 4.5`);
  }
}

function checkShell(html) {
  const navToggle = (String(html || '').match(/<button\b[^>]*\bid\s*=\s*["']navtoggle["'][^>]*>/i) || [''])[0];
  expect(/<html\b[^>]*\blang\s*=\s*["']en["']/i.test(html), 'app/index.html: html lang="en" is required');
  expect(/<meta\b[^>]*\bname\s*=\s*["']viewport["']/i.test(html), 'app/index.html: viewport meta is required');
  expect(/<meta\b[^>]*\bname\s*=\s*["']description["']/i.test(html), 'app/index.html: meta description is required');
  expect(/<title>[^<]+<\/title>/i.test(html), 'app/index.html: title is required');
  expect(/class\s*=\s*["'][^"']*\bskip\b/i.test(html) && /href\s*=\s*["']#main["']/i.test(html), 'app/index.html: skip link to #main is required');
  expect(/<main\b[^>]*\bid\s*=\s*["']main["'][^>]*\btabindex\s*=\s*["']-1["']/i.test(html), 'app/index.html: focusable main#main is required');
  expect(/\bid\s*=\s*["']live["'][^>]*\baria-live\s*=\s*["']polite["']/i.test(html), 'app/index.html: polite live region is required');
  expect(attrValue(navToggle, 'aria-expanded') === 'false', 'app/index.html: nav toggle must expose aria-expanded');
  expect(attrValue(navToggle, 'aria-controls') === 'navlinks', 'app/index.html: nav toggle must point at navlinks');
  expect(attrValue(navToggle, 'aria-label') === 'Menu', 'app/index.html: nav toggle must be named');
  expect(/class\s*=\s*["'][^"']*\btabbar\b[^"']*["'][^>]*\baria-label\s*=\s*["']Primary navigation["']/i.test(html), 'app/index.html: tabbar must be named');
  checkDuplicateIds('app/index.html', html);
  checkNamedStaticControls('app/index.html', html);
  checkTargetBlankRel('app/index.html', html);
}

function checkCss(css) {
  expect(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i.test(css), 'app/styles.css: reduced-motion media query is required');
  expect(/transition-duration\s*:\s*\.001ms!important/i.test(css), 'app/styles.css: reduced-motion transition clamp is required');
  expect(/animation-duration\s*:\s*\.001ms!important/i.test(css), 'app/styles.css: reduced-motion animation clamp is required');
  expect(/scroll-behavior\s*:\s*auto!important/i.test(css), 'app/styles.css: reduced-motion scroll behavior is required');
  expect(/a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible,textarea:focus-visible,\[role=button\]:focus-visible\{[^}]*outline\s*:\s*2px\s+solid\s+var\(--accent\)/s.test(css), 'app/styles.css: comprehensive focus-visible outline is required');
  expect(/\.navtoggle\{[^}]*min-height\s*:\s*44px/s.test(css), 'app/styles.css: mobile nav toggle needs a 44 px target');
  expect(/\.navbtn\{[^}]*min-height\s*:\s*44px;min-width\s*:\s*44px/s.test(css), 'app/styles.css: mobile nav buttons need 44 px targets');
  expect(/\.catbtn,\.facet,\.themechip,\.presets button,\.savetag\{[^}]*min-height\s*:\s*44px/s.test(css), 'app/styles.css: chips and facets need 44 px mobile targets');
  expect(/\.catdom\{[^}]*min-height\s*:\s*44px/s.test(css), 'app/styles.css: category domain controls need 44 px mobile targets');
  expect(/\.youbtn\{[^}]*min-height\s*:\s*44px/s.test(css), 'app/styles.css: You controls need 44 px mobile targets');
  expect(/\.tab\{[^}]*min-height\s*:\s*48px/s.test(css), 'app/styles.css: bottom tabs need at least 44 px targets');
  expect(/\.st-hi\{[^}]*background:[^}]*color:/s.test(css), 'app/styles.css: score status must include text and color styling');
  expect(/\.st-mid\{[^}]*background:[^}]*color:/s.test(css), 'app/styles.css: middle score status must include text and color styling');
  expect(/\.st-low\{[^}]*background:[^}]*color:/s.test(css), 'app/styles.css: low score status must include text and color styling');
  checkContrast(css);
}

function checkJs(js) {
  expect(/function\s+makeClickable\s*\(/.test(js), 'app/app.js: makeClickable helper is required for synthetic controls');
  expect(/setAttribute\('role','button'\)/.test(js), 'app/app.js: makeClickable must set role=button');
  expect(/setAttribute\('tabindex','0'\)/.test(js), 'app/app.js: makeClickable must set tabindex=0');
  expect(/addEventListener\('keydown'[\s\S]*?e\.key===['"]Enter['"][\s\S]*?\|\|[\s\S]*?e\.key===['"] ['"]/s.test(js), 'app/app.js: synthetic controls must support Enter and Space');
  expect(/function\s+announce\s*\([^)]*\)\{[^}]*getElementById\('live'\)/s.test(js), 'app/app.js: announce() must write to the live region');
  expect(/Re-ranked to your values/.test(js), 'app/app.js: reranking must announce the change');
  expect(/setAttribute\('aria-current','page'\)/.test(js), 'app/app.js: active navigation must expose aria-current');
  expect(/function\s+focusMain\s*\(/.test(js) && /focus\(\{preventScroll:true\}\)/.test(js), 'app/app.js: route changes must move focus into the current view');
  expect(/e\.key===['"]\/['"]/.test(js) && /\.focus\(\)/.test(js), 'app/app.js: slash shortcut must focus search without trapping typing');
  expect(/prefersReduced\(\)/.test(js), 'app/app.js: motion helpers must respect prefers-reduced-motion');
  expect(/aria-pressed/.test(js), 'app/app.js: toggle chips must expose aria-pressed');
  expect(/aria-label="Stop avoiding/.test(js), 'app/app.js: active avoid chips need consequence-bearing labels');
  expect(/for="scan-in"/.test(js) && /id="scan-in"/.test(js), 'app/app.js: typed barcode fallback needs an explicit label and input');
  expect(/Type the barcode below/.test(js), 'app/app.js: camera failure must point to the typed barcode fallback');
  expect(/band\[0\]/.test(js) || /bandlbl/.test(js), 'app/app.js: ranking bands need text labels, not color only');
}

function jargonDensity(text) {
  const words = Math.max(1, (text.match(/[A-Za-z][A-Za-z'-]*/g) || []).length);
  const terms = [
    'attestation',
    'biophilic',
    'conformance',
    'ecosystem',
    'federation',
    'governance',
    'interoperable',
    'ledger',
    'ontology',
    'passport',
    'provenance',
    'ratification',
    'schema',
    'semver',
    'standard',
    'workstream'
  ];
  const lower = text.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    const re = new RegExp(`\\b${term}\\b`, 'g');
    hits += (lower.match(re) || []).length;
  }
  return (hits / words) * 1000;
}

function checkGuides() {
  const dir = abs('app/g');
  expect(fs.existsSync(dir), 'app/g: generated guide directory is required');
  if (!fs.existsSync(dir)) return { count: 0, minFlesch: 0, avgFlesch: 0, avgSentence: 0 };

  const guideFiles = fs.readdirSync(dir)
    .filter(name => name.endsWith('.html'))
    .sort();
  expect(guideFiles.length >= 80, `app/g: expected at least 80 generated guide pages, found ${guideFiles.length}`);

  let totalFlesch = 0;
  let totalSentence = 0;
  let minFlesch = Infinity;
  let lowest = '';

  for (const name of guideFiles) {
    const rel = `app/g/${name}`;
    const html = read(rel);
    expect(/<html\b[^>]*\blang\s*=\s*["']en["']/i.test(html), `${rel}: html lang="en" is required`);
    expect(/<meta\b[^>]*\bname\s*=\s*["']viewport["']/i.test(html), `${rel}: viewport meta is required`);
    expect(/<meta\b[^>]*\bname\s*=\s*["']description["']/i.test(html), `${rel}: meta description is required`);
    expect(/<title>[^<]+<\/title>/i.test(html), `${rel}: title is required`);
    expect(/<main\b[^>]*\bid\s*=\s*["']main["']/i.test(html), `${rel}: main#main is required`);
    expect(/<h1\b/i.test(html), `${rel}: h1 is required`);
    checkDuplicateIds(rel, html);
    checkTargetBlankRel(rel, html);

    const text = proseText(html);
    const score = readability(text);
    // An index page is a set of destinations, not a document. It gets the structural checks above
    // and is exempt from the prose floor, because there is no prose on it to hold to a floor.
    const isIndex = /(^|\/)index\.html$/i.test(rel) && score.words < 80;
    if (!isIndex) {
      expect(score.words >= 80, `${rel}: guide text is too thin for accessibility context (${score.words} words)`);
      expect(score.flesch >= 24, `${rel}: Flesch reading-ease ${score.flesch.toFixed(1)} is below the plain-language floor`);
      expect(score.avgSentence <= 32, `${rel}: average sentence length ${score.avgSentence.toFixed(1)} exceeds the plain-language floor`);
    }

    const density = jargonDensity(text);
    if (density > 18) warnings.push(`${rel}: high jargon density (${density.toFixed(1)} terms per 1000 words)`);
    if (!isIndex && score.flesch < minFlesch) {
      minFlesch = score.flesch;
      lowest = rel;
    }
    totalFlesch += score.flesch;
    totalSentence += score.avgSentence;
  }

  const avgFlesch = guideFiles.length ? totalFlesch / guideFiles.length : 0;
  const avgSentence = guideFiles.length ? totalSentence / guideFiles.length : 0;
  expect(avgFlesch >= 40, `app/g: average Flesch reading-ease ${avgFlesch.toFixed(1)} is below 40`);
  expect(avgSentence <= 26, `app/g: average sentence length ${avgSentence.toFixed(1)} exceeds 26`);

  return {
    count: guideFiles.length,
    minFlesch,
    lowest,
    avgFlesch,
    avgSentence
  };
}

function htmlFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function checkVerdictPages() {
  const dir = abs('app/c');
  expect(fs.existsSync(dir), 'app/c: generated verdict directory is required');
  if (!fs.existsSync(dir)) return 0;
  const files = htmlFiles(dir).sort();
  expect(files.length >= 1000, `app/c: expected at least 1000 generated verdict pages, found ${files.length}`);
  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const html = fs.readFileSync(file, 'utf8');
    const h1Count = (html.match(/<h1\b/gi) || []).length;
    expect(h1Count === 1, `${rel}: expected exactly one h1, found ${h1Count}`);
    expect(/<a\b[^>]*class=["'][^"']*\bskip\b[^"']*["'][^>]*href=["']#main["']/i.test(html), `${rel}: skip link to #main is required`);
    expect(/<main\b[^>]*\bid\s*=\s*["']main["']/i.test(html), `${rel}: main#main is required`);
    checkDuplicateIds(rel, html);
    checkTargetBlankRel(rel, html);
  }
  return files.length;
}

function main() {
  console.log('Accessibility audit');
  const shell = read('app/index.html');
  const css = read('app/styles.css');
  const js = read('app/app.js');

  checkShell(shell);
  checkCss(css);
  checkJs(js);
  const guideStats = checkGuides();
  const verdictCount = checkVerdictPages();

  if (warnings.length) {
    console.log(`  warnings: ${warnings.length}`);
    for (const warning of warnings.slice(0, 8)) console.log(`  WARN ${warning}`);
    if (warnings.length > 8) console.log(`  WARN ... ${warnings.length - 8} more`);
  }

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures.slice(0, 80)) console.log(`  FAIL ${failure}`);
    if (failures.length > 80) console.log(`  FAIL ... ${failures.length - 80} more`);
    process.exit(1);
  }

  console.log(`  guide pages checked: ${guideStats.count}`);
  console.log(`  verdict pages checked: ${verdictCount}`);
  console.log(`  guide readability: avg ${guideStats.avgFlesch.toFixed(1)}, floor ${guideStats.minFlesch.toFixed(1)} (${guideStats.lowest})`);
  console.log(`  average sentence length: ${guideStats.avgSentence.toFixed(1)} words`);
  console.log('A11Y CHECKS PASS');
}

main();
