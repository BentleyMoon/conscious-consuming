#!/usr/bin/env node
/* CSS contrast and static accessibility contract for the hand-edited app shell.

   C11 is intentionally about the CSS currently shipped by the app, not the
   authored design-token source. This audit parses app/styles.css directly,
   checks AA contrast for the core text/background pairs, guards the old hint
   contrast regression, and keeps a few static control/focus checks close to
   the contrast gate.
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];

const REQUIRED_THEME_VARS = [
  'bg',
  'surface',
  'ink',
  'muted',
  'hint',
  'accent',
  'accent-text',
  'track',
  'pill',
  't-meas-bg',
  't-meas-fg',
  't-cert-bg',
  't-cert-fg',
  't-ass-bg',
  't-ass-fg'
];

const REQUIRED_PAIRS = [
  ['ink on bg', 'ink', 'bg', 4.5],
  ['ink on surface', 'ink', 'surface', 4.5],
  ['ink on pill', 'ink', 'pill', 4.5],
  ['muted on bg', 'muted', 'bg', 4.5],
  ['muted on surface', 'muted', 'surface', 4.5],
  ['muted on pill', 'muted', 'pill', 4.5],
  ['hint on bg', 'hint', 'bg', 4.5],
  ['hint on surface', 'hint', 'surface', 4.5],
  ['accent on bg', 'accent', 'bg', 4.5],
  ['accent on surface', 'accent', 'surface', 4.5],
  ['accent on pill', 'accent', 'pill', 4.5],
  ['accent text on accent', 'accent-text', 'accent', 4.5],
  ['measured tier', 't-meas-fg', 't-meas-bg', 4.5],
  ['certified tier', 't-cert-fg', 't-cert-bg', 4.5],
  ['assessed tier', 't-ass-fg', 't-ass-bg', 4.5]
];

const WATCH_PAIRS = [
  ['hint on pill', 'hint', 'pill', 4.5, 'small hint text on pill surfaces should move to muted/ink or the token should darken'],
  ['hint on track', 'hint', 'track', 4.5, 'small hint text on track badges is below AA in the light theme'],
  ['muted on track', 'muted', 'track', 4.5, 'muted text on track is right at the AA edge in the light theme'],
  ['accent on track', 'accent', 'track', 4.5, 'accent text on track is below AA in the light theme']
];

function abs(rel) {
  return path.join(ROOT, rel);
}

function read(rel) {
  const file = abs(rel);
  if (!fs.existsSync(file)) {
    failures.push(`${rel}: missing file`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function blockFor(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = String(css || '').match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, 'm'));
  return m ? m[1] : '';
}

function parseVars(block) {
  const vars = {};
  for (const m of String(block || '').matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-f]{3,6})\b/gi)) {
    vars[m[1]] = normalizeHex(m[2]);
  }
  return vars;
}

function normalizeHex(hex) {
  let raw = String(hex || '').trim().replace(/^#/, '');
  if (raw.length === 3) raw = raw.split('').map(c => c + c).join('');
  return `#${raw.toLowerCase()}`;
}

function rgb(hex) {
  const raw = normalizeHex(hex).slice(1);
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

function resolveColor(value, theme) {
  if (String(value || '').startsWith('#')) return normalizeHex(value);
  return theme[value] || '';
}

function pairRatio(pair, theme) {
  const [, fgKey, bgKey] = pair;
  const fg = resolveColor(fgKey, theme);
  const bg = resolveColor(bgKey, theme);
  return { fg, bg, ratio: fg && bg ? contrastRatio(fg, bg) : 0 };
}

function themeVars(css) {
  const light = parseVars(blockFor(css, ':root'));
  const explicitDark = parseVars(blockFor(css, ':root[data-theme=dark]'));
  const mediaDarkMatch = css.match(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{\s*:root:not\(\[data-theme=light\]\)\s*\{([\s\S]*?)\}\s*\}/m);
  const mediaDark = parseVars(mediaDarkMatch ? mediaDarkMatch[1] : '');

  for (const key of REQUIRED_THEME_VARS) {
    expect(Boolean(light[key]), `app/styles.css: light theme is missing --${key}`);
    expect(Boolean(explicitDark[key]), `app/styles.css: explicit dark theme is missing --${key}`);
    expect(Boolean(mediaDark[key]), `app/styles.css: prefers-color-scheme dark theme is missing --${key}`);
    if (explicitDark[key] && mediaDark[key]) {
      expect(explicitDark[key] === mediaDark[key], `app/styles.css: dark --${key} differs between explicit and OS dark themes`);
    }
  }

  return [
    ['light', light],
    ['dark', explicitDark]
  ];
}

function checkContrast(css) {
  let checked = 0;
  const themes = themeVars(css);
  for (const [themeName, theme] of themes) {
    for (const pair of REQUIRED_PAIRS) {
      const [label, , , minimum] = pair;
      const { fg, bg, ratio } = pairRatio(pair, theme);
      expect(Boolean(fg && bg), `app/styles.css: ${themeName} ${label} references a missing token`);
      if (!fg || !bg) continue;
      checked += 1;
      expect(ratio >= minimum, `app/styles.css: ${themeName} ${label} contrast ${ratio.toFixed(2)} is below ${minimum}`);
    }
    for (const pair of WATCH_PAIRS) {
      const [label, , , minimum, note] = pair;
      const { fg, bg, ratio } = pairRatio(pair, theme);
      if (!fg || !bg) continue;
      warn(ratio >= minimum, `app/styles.css: ${themeName} ${label} contrast ${ratio.toFixed(2)} is below ${minimum}; ${note}`);
    }
  }
  return checked;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[#a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function attr(attrs, name) {
  const m = String(attrs || '').match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m ? m[1] : '';
}

function isIconOnly(text) {
  const cleaned = String(text || '')
    .replace(/\$\{[\s\S]*?\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return true;
  if (/[A-Za-z0-9]/.test(cleaned)) return false;
  return cleaned.length <= 4;
}

function checkIconButtons(rel, text) {
  let checked = 0;
  for (const m of String(text || '').matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    checked += 1;
    const attrs = m[1] || '';
    const label = attr(attrs, 'aria-label') || attr(attrs, 'title');
    const rawInner = m[2] || '';
    if (rel.endsWith('.js') && rawInner.includes('${')) continue;
    const visible = stripHtml(rawInner);
    if (isIconOnly(visible)) {
      expect(Boolean(label), `${rel}: icon-only button is missing aria-label or title`);
    }
  }
  return checked;
}

function checkFocusSelectors(css) {
  const focusBlock = blockFor(css, 'a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible,textarea:focus-visible,[role=button]:focus-visible');
  expect(Boolean(focusBlock), 'app/styles.css: comprehensive focus-visible selector block is missing');
  expect(/outline\s*:\s*2px\s+solid\s+var\(--accent\)/.test(focusBlock), 'app/styles.css: comprehensive focus-visible block must use a visible outline');
  expect(/outline-offset\s*:\s*2px/.test(focusBlock), 'app/styles.css: comprehensive focus-visible block must offset the outline');
  expect(/\.card\.click:focus-visible,\.back:focus-visible\{[^}]*outline\s*:\s*2px\s+solid\s+var\(--accent\)/s.test(css), 'app/styles.css: card/back synthetic controls need explicit focus-visible coverage');
}

function checkAccentTextUsage(css) {
  const actionSelectors = [
    '.skip',
    '.mlchip.on',
    '.hsearch button',
    '.vd-action',
    '.catbtn.active',
    '.askbig button',
    '.facet.on',
    '.cmpfab'
  ];

  for (const selector of actionSelectors) {
    const block = blockFor(css, selector);
    expect(Boolean(block), `app/styles.css: ${selector} accent action block is missing`);
    expect(/color\s*:\s*var\(--accent-text\)/.test(block), `app/styles.css: ${selector} must use --accent-text on accent action text`);
  }
}

function checkStaticAccessibility(css) {
  checkAccentTextUsage(css);
  checkFocusSelectors(css);
  const htmlChecks = [
    ['app/index.html', read('app/index.html')],
    ['app/app.js', read('app/app.js')]
  ];
  let buttons = 0;
  for (const [rel, text] of htmlChecks) buttons += checkIconButtons(rel, text);
  return buttons;
}

function main() {
  console.log('CSS contrast audit');
  const css = read('app/styles.css');
  const checkedPairs = checkContrast(css);
  const checkedButtons = checkStaticAccessibility(css);

  if (warnings.length) {
    console.log(`  warnings: ${warnings.length}`);
    for (const warning of warnings.slice(0, 8)) console.log(`  WARN ${warning}`);
    if (warnings.length > 8) console.log(`  WARN ... ${warnings.length - 8} more`);
  }

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log(`  contrast pairs checked: ${checkedPairs}`);
  console.log(`  button literals checked: ${checkedButtons}`);
  console.log('CONTRAST CHECKS PASS');
}

main();
