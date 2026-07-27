#!/usr/bin/env node
/* C16 design-token audit.

   Beauty is allowed to be ambitious, but the contract has to stay calm,
   accessible, and machine-checkable. This audit validates the authored token
   source and the generated app-readable index without touching app UI code.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const {
  OUT: DESIGN_TOKEN_INDEX,
  STYLE_OUT,
  buildDesignTokenIndex,
  contrastRatio,
  formatJson,
  injectAppCssTokens
} = require('../pipeline/build_design_tokens.js');
const engine = require('../app/engine.js');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'content', 'design', 'tokens.json');
const failures = [];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SEMVER = /^0\.1\.0(?:[-+].*)?$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const LENGTH = /^(\d+(\.\d+)?)(rem|px)$/;
const REQUIRED_COLORS = ['background', 'surface', 'text', 'mutedText', 'border', 'accent', 'accentText', 'focus', 'link', 'success', 'warning', 'danger'];
const REQUIRED_TYPE = {
  display: { size: '1.65rem', lineHeight: 1.2 },
  heading: { size: '1.06rem', lineHeight: 1.35 },
  body: { size: '0.95rem', lineHeight: 1.5 },
  meta: { size: '0.74rem', lineHeight: 1.35 }
};
const REQUIRED_SPACE = {
  xs: '0.35rem',
  md: '0.75rem',
  xl: '1.5rem'
};
const REQUIRED_RADIUS = {
  control: '0.25rem',
  card: '0.75rem',
  panel: '1rem',
  pill: '999px'
};
const REQUIRED_DAY_CYCLE_CSS_VARS = [
  '--day-dawn-bg', '--day-dawn-surface', '--day-dawn-pill', '--day-dawn-line', '--day-dawn-ink', '--day-dawn-muted', '--day-dawn-hint', '--day-dawn-accent', '--day-dawn-warn',
  '--day-noon-bg', '--day-noon-surface', '--day-noon-pill', '--day-noon-line', '--day-noon-ink', '--day-noon-muted', '--day-noon-hint', '--day-noon-accent', '--day-noon-warn',
  '--day-dusk-bg', '--day-dusk-surface', '--day-dusk-pill', '--day-dusk-line', '--day-dusk-ink', '--day-dusk-muted', '--day-dusk-hint', '--day-dusk-accent', '--day-dusk-warn',
  '--day-night-bg', '--day-night-surface', '--day-night-pill', '--day-night-line', '--day-night-ink', '--day-night-muted', '--day-night-hint', '--day-night-accent', '--day-night-warn'
];
const REQUIRED_BLOOM_CSS_VARS = [
  '--bloom-planet-petal', '--bloom-planet-center',
  '--bloom-people-petal', '--bloom-people-center',
  '--bloom-health-petal', '--bloom-health-center',
  '--bloom-honesty-petal', '--bloom-honesty-center',
  '--bloom-privacy-petal', '--bloom-privacy-center',
  '--bloom-animals-petal', '--bloom-animals-center',
  '--bloom-cost-petal', '--bloom-cost-center',
  '--bloom-local-petal', '--bloom-local-center'
];
const REQUIRED_MATERIALITY_CSS_VARS = ['--paper-grain-opacity', '--paper-grain-scale', '--paper-grain-contrast-limit', '--shadow-soft', '--shadow-lift'];
const REQUIRED_CSS_VARS = [
  '--bg', '--surface', '--track', '--pill', '--ink', '--muted', '--hint', '--line', '--accent', '--accent-text', '--warn',
  ...REQUIRED_BLOOM_CSS_VARS,
  ...REQUIRED_DAY_CYCLE_CSS_VARS,
  '--font-sans', '--font-display', '--font-mono', '--fs-xs', '--fs-base', '--fs-md', '--fs-xl',
  '--lh-tight', '--lh-snug', '--lh-base', '--sp-2', '--sp-3', '--sp-5',
  '--r-1', '--r-2', '--r-3', '--r-pill', '--radius',
  '--dur-1', '--dur-2', '--ease',
  '--dur-micro', '--dur-hover', '--dur-reveal', '--dur-rerank', '--dur-bloom',
  '--ease-breathe', '--ease-settle', '--ease-rerank', '--ease-bloom',
  '--e1', '--e2',
  ...REQUIRED_MATERIALITY_CSS_VARS
];
const REQUIRED_CONTRAST_REMEDIATION_STEPS = [
  'wire-accent-text-token',
  'light-hint-on-pill',
  'light-hint-on-track',
  'light-muted-on-track',
  'light-accent-on-track'
];
const REQUIRED_BLOOM_THEMES = ['planet', 'people', 'health', 'honesty', 'privacy', 'animals', 'cost', 'local'];
const REQUIRED_BLOOM_UNIVERSALS = {
  planet: 'planet',
  people: 'people',
  health: 'wellbeing',
  honesty: 'openness',
  privacy: 'autonomy',
  animals: 'animals',
  cost: 'access',
  local: 'community'
};
const REQUIRED_RAMP_FAMILIES = ['soil', 'leaf', 'water', 'light'];
const REQUIRED_MODE_ALIASES = ['bg', 'surface', 'pill', 'line', 'ink', 'muted', 'hint', 'accent', 'warn'];
const REQUIRED_DAY_CYCLE_VARIANTS = ['dawn', 'noon', 'dusk', 'night'];
const REQUIRED_MATERIALITY_SURFACES = ['page-paper', 'card-paper', 'quiet-band'];
const REQUIRED_MOTION_CURVES = ['breathe', 'settle', 'rerank', 'bloom'];
const REQUIRED_MOTION_DURATIONS = ['micro', 'hover', 'reveal', 'rerank', 'bloom'];
const REQUIRED_MOTION_INTENTS = ['hover-feedback', 'panel-reveal', 'rank-rerank', 'value-bloom-draw'];
const REQUIRED_MOTION_CSS_VARS = ['--dur-micro', '--dur-hover', '--dur-reveal', '--dur-rerank', '--dur-bloom', '--ease-breathe', '--ease-settle', '--ease-rerank', '--ease-bloom'];
const REQUIRED_SKIN_READINESS = ['h1-palette', 'h2-day-cycle', 'h3-motion', 'h4-value-bloom', 'h5-materiality'];
const SAFE_MOTION_PROPERTIES = new Set(['opacity', 'border-color', 'background-color', 'color', 'transform', 'stroke-dashoffset']);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringArray(value, label, min = 1) {
  expect(Array.isArray(value) && value.length >= min, `${label}: missing array`);
  if (!Array.isArray(value)) return;
  value.forEach((item, i) => expect(nonEmpty(item), `${label}[${i}]: must be non-empty string`));
}

function sameArray(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => item === b[i]);
}

function uniqueArray(value) {
  return Array.isArray(value) && new Set(value).size === value.length;
}

function roundScore(value) {
  if (!Number.isFinite(value)) return null;
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? rounded : rounded;
}

function normalizeSignature(value, order = REQUIRED_BLOOM_THEMES) {
  const out = {};
  const source = isObject(value) ? value : {};
  for (const theme of order) {
    const rounded = roundScore(Number(source[theme]));
    if (rounded != null) out[theme] = rounded;
  }
  return out;
}

function signaturesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function hexToRgb(hex) {
  const normalized = String(hex || '').replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255
  };
}

function hueBucket(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const delta = max - min;
  if (delta < 0.08) return null;
  let hue = 0;
  if (max === rgb.r) hue = 60 * (((rgb.g - rgb.b) / delta) % 6);
  else if (max === rgb.g) hue = 60 * ((rgb.b - rgb.r) / delta + 2);
  else hue = 60 * ((rgb.r - rgb.g) / delta + 4);
  if (hue < 0) hue += 360;
  return Math.floor(hue / 45);
}

function colorValue(profile, key) {
  return profile.tokens && profile.tokens.color && profile.tokens.color[key] && profile.tokens.color[key].value;
}

function checkColors(profile, label) {
  const colors = profile.tokens && profile.tokens.color;
  expect(isObject(colors), `${label}.tokens.color: missing object`);
  if (!isObject(colors)) return;
  for (const key of REQUIRED_COLORS) {
    expect(isObject(colors[key]), `${label}.tokens.color.${key}: missing token`);
    if (isObject(colors[key])) {
      expect(HEX.test(String(colors[key].value || '')), `${label}.tokens.color.${key}.value: invalid hex`);
      expect(nonEmpty(colors[key].role), `${label}.tokens.color.${key}.role: missing role`);
    }
  }
  const hueBuckets = new Set();
  for (const token of Object.values(colors)) {
    const bucket = token && hueBucket(token.value);
    if (bucket != null) hueBuckets.add(bucket);
  }
  expect(hueBuckets.size >= 4, `${label}.tokens.color: palette is too one-note (${hueBuckets.size} hue buckets)`);
}

function checkColorRamps(profile, label) {
  if (profile.id !== 'quiet-commons') return;
  const ramps = profile.tokens && profile.tokens.colorRamps;
  expect(isObject(ramps), `${label}.tokens.colorRamps: missing H1 ramp object`);
  if (!isObject(ramps)) return;
  for (const family of REQUIRED_RAMP_FAMILIES) {
    const ramp = ramps[family];
    expect(isObject(ramp), `${label}.tokens.colorRamps.${family}: missing ramp`);
    if (!isObject(ramp)) continue;
    const stops = Object.entries(ramp);
    expect(stops.length >= 4, `${label}.tokens.colorRamps.${family}: expected at least four stops`);
    for (const [stop, value] of stops) {
      expect(/^\d+$/.test(stop), `${label}.tokens.colorRamps.${family}.${stop}: stop must be numeric`);
      expect(HEX.test(String(value || '')), `${label}.tokens.colorRamps.${family}.${stop}: invalid hex`);
    }
  }
}

function modeAliasColor(modes, mode, alias) {
  return modes && modes[mode] && modes[mode].aliases && modes[mode].aliases[alias];
}

function dayCycleAliasColor(dayCycle, variant, alias) {
  return dayCycle && dayCycle.variants && dayCycle.variants[variant] && dayCycle.variants[variant].aliases && dayCycle.variants[variant].aliases[alias];
}

function checkColorModes(profile, label) {
  if (profile.id !== 'quiet-commons') return;
  const modes = profile.tokens && profile.tokens.colorModes;
  expect(isObject(modes), `${label}.tokens.colorModes: missing H1 light/dark aliases`);
  if (!isObject(modes)) return;
  expect(modes.status === 'h1-pilot', `${label}.tokens.colorModes.status: expected h1-pilot`);
  expect(sameArray(modes.pilotColors, ['background', 'surface', 'surfaceAlt', 'text', 'accent']), `${label}.tokens.colorModes.pilotColors: expected five pilot tokens`);
  for (const mode of ['light', 'dark']) {
    const entry = modes[mode];
    expect(isObject(entry), `${label}.tokens.colorModes.${mode}: missing mode`);
    if (!isObject(entry)) continue;
    expect(isObject(entry.aliases), `${label}.tokens.colorModes.${mode}.aliases: missing aliases`);
    for (const alias of REQUIRED_MODE_ALIASES) {
      expect(HEX.test(String(modeAliasColor(modes, mode, alias) || '')), `${label}.tokens.colorModes.${mode}.aliases.${alias}: invalid hex`);
    }
    expect(Array.isArray(entry.contrastPairs) && entry.contrastPairs.length >= 4, `${label}.tokens.colorModes.${mode}.contrastPairs: expected at least four pairs`);
    for (const [i, pair] of (entry.contrastPairs || []).entries()) {
      const at = `${label}.tokens.colorModes.${mode}.contrastPairs[${i}]`;
      expect(isObject(pair), `${at}: must be object`);
      if (!isObject(pair)) continue;
      expect(SLUG.test(String(pair.id || '')), `${at}.id: invalid id`);
      expect(REQUIRED_MODE_ALIASES.includes(pair.fg), `${at}.fg: unknown alias ${pair.fg || '(missing)'}`);
      expect(REQUIRED_MODE_ALIASES.includes(pair.bg), `${at}.bg: unknown alias ${pair.bg || '(missing)'}`);
      expect(Number.isFinite(pair.minimum) && pair.minimum >= 3, `${at}.minimum: must be at least 3`);
      const fg = modeAliasColor(modes, mode, pair.fg);
      const bg = modeAliasColor(modes, mode, pair.bg);
      if (fg && bg) {
        const ratio = contrastRatio(fg, bg);
        expect(ratio >= pair.minimum, `${at}: contrast ${ratio.toFixed(2)} below ${pair.minimum}`);
      }
    }
  }
  const colors = profile.tokens && profile.tokens.color;
  if (isObject(colors)) {
    expect(colors.background.value === modeAliasColor(modes, 'light', 'bg'), `${label}.tokens.colorModes.light.bg: must match color.background pilot`);
    expect(colors.surface.value === modeAliasColor(modes, 'light', 'surface'), `${label}.tokens.colorModes.light.surface: must match color.surface pilot`);
    expect(colors.surfaceAlt.value === modeAliasColor(modes, 'light', 'pill'), `${label}.tokens.colorModes.light.pill: must match color.surfaceAlt pilot`);
    expect(colors.text.value === modeAliasColor(modes, 'light', 'ink'), `${label}.tokens.colorModes.light.ink: must match color.text pilot`);
    expect(colors.mutedText.value === modeAliasColor(modes, 'light', 'muted'), `${label}.tokens.colorModes.light.muted: must match color.mutedText pilot`);
    expect(colors.accent.value === '#1D7A5A', `${label}.tokens.color.accent: expected H1 leaf anchor #1D7A5A`);
    expect(colors.accent.value === modeAliasColor(modes, 'light', 'accent'), `${label}.tokens.colorModes.light.accent: must match color.accent pilot`);
  }
}

function checkDayCycle(profile, label) {
  if (profile.id !== 'quiet-commons') return;
  const dayCycle = profile.tokens && profile.tokens.dayCycle;
  expect(isObject(dayCycle), `${label}.tokens.dayCycle: missing H2 day-cycle variants`);
  if (!isObject(dayCycle)) return;
  expect(dayCycle.status === 'h2-token-substrate', `${label}.tokens.dayCycle.status: expected h2-token-substrate`);
  expect(/Claude H2/i.test(String(dayCycle.consumer || '')), `${label}.tokens.dayCycle.consumer: should name Claude H2 consumer`);
  expect(dayCycle.defaultMode === 'noon', `${label}.tokens.dayCycle.defaultMode: expected noon`);
  expect(isObject(dayCycle.variants), `${label}.tokens.dayCycle.variants: missing variants`);
  if (isObject(dayCycle.variants)) {
    for (const variant of REQUIRED_DAY_CYCLE_VARIANTS) {
      const entry = dayCycle.variants[variant];
      expect(isObject(entry), `${label}.tokens.dayCycle.variants.${variant}: missing variant`);
      if (!isObject(entry)) continue;
      expect(nonEmpty(entry.label), `${label}.tokens.dayCycle.variants.${variant}.label: missing label`);
      expect(nonEmpty(entry.role), `${label}.tokens.dayCycle.variants.${variant}.role: missing role`);
      expect(isObject(entry.aliases), `${label}.tokens.dayCycle.variants.${variant}.aliases: missing aliases`);
      for (const alias of REQUIRED_MODE_ALIASES) {
        expect(HEX.test(String(dayCycleAliasColor(dayCycle, variant, alias) || '')), `${label}.tokens.dayCycle.variants.${variant}.aliases.${alias}: invalid hex`);
      }
      expect(Array.isArray(entry.contrastPairs) && entry.contrastPairs.length >= 4, `${label}.tokens.dayCycle.variants.${variant}.contrastPairs: expected at least four pairs`);
      for (const [i, pair] of (entry.contrastPairs || []).entries()) {
        const at = `${label}.tokens.dayCycle.variants.${variant}.contrastPairs[${i}]`;
        expect(isObject(pair), `${at}: must be object`);
        if (!isObject(pair)) continue;
        expect(SLUG.test(String(pair.id || '')), `${at}.id: invalid id`);
        expect(REQUIRED_MODE_ALIASES.includes(pair.fg), `${at}.fg: unknown alias ${pair.fg || '(missing)'}`);
        expect(REQUIRED_MODE_ALIASES.includes(pair.bg), `${at}.bg: unknown alias ${pair.bg || '(missing)'}`);
        expect(Number.isFinite(pair.minimum) && pair.minimum >= 3, `${at}.minimum: must be at least 3`);
        const fg = dayCycleAliasColor(dayCycle, variant, pair.fg);
        const bg = dayCycleAliasColor(dayCycle, variant, pair.bg);
        if (fg && bg) {
          const ratio = contrastRatio(fg, bg);
          expect(ratio >= pair.minimum, `${at}: contrast ${ratio.toFixed(2)} below ${pair.minimum}`);
        }
      }
    }
    expect(dayCycle.variants.noon?.aliases?.bg === modeAliasColor(profile.tokens.colorModes, 'light', 'bg'), `${label}.tokens.dayCycle.variants.noon.aliases.bg: must match light bg`);
    expect(dayCycle.variants.noon?.aliases?.accent === modeAliasColor(profile.tokens.colorModes, 'light', 'accent'), `${label}.tokens.dayCycle.variants.noon.aliases.accent: must match light accent`);
    expect(dayCycle.variants.night?.aliases?.bg === modeAliasColor(profile.tokens.colorModes, 'dark', 'bg'), `${label}.tokens.dayCycle.variants.night.aliases.bg: must match dark bg`);
    expect(dayCycle.variants.night?.aliases?.accent === modeAliasColor(profile.tokens.colorModes, 'dark', 'accent'), `${label}.tokens.dayCycle.variants.night.aliases.accent: must match dark accent`);
  }
  stringArray(dayCycle.mustNot, `${label}.tokens.dayCycle.mustNot`, 3);
  expect(JSON.stringify(dayCycle.mustNot || []).includes('Do not'), `${label}.tokens.dayCycle.mustNot: should state explicit prohibitions`);
}

function checkTypography(profile, label) {
  const typography = profile.tokens && profile.tokens.typography;
  expect(isObject(typography), `${label}.tokens.typography: missing object`);
  if (!isObject(typography)) return;
  for (const key of Object.keys(REQUIRED_TYPE)) {
    const token = typography[key];
    expect(isObject(token), `${label}.tokens.typography.${key}: missing token`);
    if (!isObject(token)) continue;
    expect(nonEmpty(token.family), `${label}.tokens.typography.${key}.family: missing family`);
    expect(LENGTH.test(String(token.size || '')), `${label}.tokens.typography.${key}.size: must use rem or px`);
    expect(token.size === REQUIRED_TYPE[key].size, `${label}.tokens.typography.${key}.size: expected ${REQUIRED_TYPE[key].size}`);
    expect(!/v[wh]/i.test(String(token.size || '')), `${label}.tokens.typography.${key}.size: must not scale with viewport`);
    expect(Number.isFinite(token.lineHeight) && token.lineHeight >= 1.1 && token.lineHeight <= 1.8, `${label}.tokens.typography.${key}.lineHeight: out of range`);
    expect(token.lineHeight === REQUIRED_TYPE[key].lineHeight, `${label}.tokens.typography.${key}.lineHeight: expected ${REQUIRED_TYPE[key].lineHeight}`);
  }
}

function checkLengthMap(value, label) {
  expect(isObject(value), `${label}: missing object`);
  if (!isObject(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    expect(LENGTH.test(String(entry || '')), `${label}.${key}: must use rem or px`);
  }
}

function checkRhythmMap(value, required, label) {
  checkLengthMap(value, label);
  if (!isObject(value)) return;
  for (const [key, expected] of Object.entries(required)) {
    expect(value[key] === expected, `${label}.${key}: expected ${expected}`);
  }
}

function checkElevation(profile, label) {
  const elevation = profile.tokens && profile.tokens.elevation;
  expect(isObject(elevation), `${label}.tokens.elevation: missing object`);
  if (!isObject(elevation)) return;
  const entries = Object.entries(elevation);
  expect(entries.length > 0 && entries.length <= 2, `${label}.tokens.elevation: expected one or two soft shadow levels`);
  for (const [key, value] of entries) {
    expect(/^level[12]$/.test(key), `${label}.tokens.elevation.${key}: only level1/level2 allowed`);
    expect(nonEmpty(value), `${label}.tokens.elevation.${key}: missing shadow value`);
    expect(/rgba\(/.test(value), `${label}.tokens.elevation.${key}: should use soft rgba shadow`);
  }
}

function checkMateriality(profile, label) {
  if (profile.id !== 'quiet-commons') return;
  const materiality = profile.tokens && profile.tokens.materiality;
  expect(isObject(materiality), `${label}.tokens.materiality: missing H5 materiality contract`);
  if (!isObject(materiality)) return;
  expect(materiality.status === 'h5-token-substrate', `${label}.tokens.materiality.status: expected h5-token-substrate`);
  expect(/Claude H5/i.test(String(materiality.consumer || '')), `${label}.tokens.materiality.consumer: should name Claude H5 consumer`);
  const grain = materiality.paperGrain;
  expect(isObject(grain), `${label}.tokens.materiality.paperGrain: missing object`);
  if (isObject(grain)) {
    expect(Number.isFinite(grain.opacity) && grain.opacity > 0 && grain.opacity <= 0.08, `${label}.tokens.materiality.paperGrain.opacity: must stay subtle`);
    expect(Number.isInteger(grain.scalePx) && grain.scalePx >= 96 && grain.scalePx <= 320, `${label}.tokens.materiality.paperGrain.scalePx: out of calm range`);
    expect(Number.isFinite(grain.contrastLimit) && grain.contrastLimit > 0 && grain.contrastLimit <= 0.1, `${label}.tokens.materiality.paperGrain.contrastLimit: must stay low`);
    stringArray(grain.tokens, `${label}.tokens.materiality.paperGrain.tokens`, 3);
    for (const token of grain.tokens || []) expect(isObject(profile.tokens.color[token]), `${label}.tokens.materiality.paperGrain.tokens: unknown color token ${token}`);
    stringArray(grain.mustNot, `${label}.tokens.materiality.paperGrain.mustNot`, 3);
  }
  const shadow = materiality.shadow;
  expect(isObject(shadow), `${label}.tokens.materiality.shadow: missing object`);
  if (isObject(shadow)) {
    expect(shadow.style === 'warm-soft', `${label}.tokens.materiality.shadow.style: expected warm-soft`);
    expect(shadow.source === 'tokens.elevation', `${label}.tokens.materiality.shadow.source: expected tokens.elevation`);
    expect(shadow.maxLevels === 2, `${label}.tokens.materiality.shadow.maxLevels: expected 2`);
    stringArray(shadow.mustNot, `${label}.tokens.materiality.shadow.mustNot`, 3);
  }
  expect(Array.isArray(materiality.surfaces) && materiality.surfaces.length >= REQUIRED_MATERIALITY_SURFACES.length, `${label}.tokens.materiality.surfaces: missing surfaces`);
  const surfaceIds = new Set();
  for (const [i, surface] of (materiality.surfaces || []).entries()) {
    const at = `${label}.tokens.materiality.surfaces[${i}]`;
    expect(isObject(surface), `${at}: must be object`);
    if (!isObject(surface)) continue;
    expect(SLUG.test(String(surface.id || '')), `${at}.id: invalid id`);
    expect(!surfaceIds.has(surface.id), `${at}.id: duplicate ${surface.id}`);
    surfaceIds.add(surface.id);
    expect(isObject(profile.tokens.color[surface.token]), `${at}.token: unknown color token ${surface.token || '(missing)'}`);
    expect(surface.grain === 'paperGrain', `${at}.grain: expected paperGrain`);
    expect(nonEmpty(surface.role), `${at}.role: missing role`);
  }
  for (const id of REQUIRED_MATERIALITY_SURFACES) expect(surfaceIds.has(id), `${label}.tokens.materiality.surfaces: missing ${id}`);
}

function checkMotion(profile, label) {
  const motion = profile.tokens && profile.tokens.motion;
  expect(isObject(motion), `${label}.tokens.motion: missing object`);
  if (!isObject(motion)) return;
  for (const key of ['durationFast', 'durationBase', 'durationSlow']) {
    expect(Number.isInteger(motion[key]) && motion[key] >= 0 && motion[key] <= 150, `${label}.tokens.motion.${key}: must be 0..150ms`);
  }
  expect(motion.durationFast <= motion.durationBase && motion.durationBase <= motion.durationSlow, `${label}.tokens.motion: durations must ascend`);
  expect(Number.isInteger(motion.durationRerank) && motion.durationRerank >= 200 && motion.durationRerank <= 500, `${label}.tokens.motion.durationRerank: expected the one larger FLIP rerank duration`);
  expect(nonEmpty(motion.easing), `${label}.tokens.motion.easing: missing easing`);
  expect(nonEmpty(motion.reducedMotion), `${label}.tokens.motion.reducedMotion: missing reduced motion policy`);
  expect(Number.isInteger(motion.maxMovingElements) && motion.maxMovingElements <= 16, `${label}.tokens.motion.maxMovingElements: must stay small`);
  stringArray(motion.mustNot, `${label}.tokens.motion.mustNot`, 2);
  expect(JSON.stringify(motion.mustNot || []).toLowerCase().includes('not'), `${label}.tokens.motion.mustNot: should state explicit prohibitions`);
  if (profile.id !== 'quiet-commons') return;
  expect(motion.status === 'h3-token-substrate', `${label}.tokens.motion.status: expected h3-token-substrate`);
  expect(/Claude H3/i.test(String(motion.consumer || '')), `${label}.tokens.motion.consumer: should name Claude H3 consumer`);
  expect(isObject(motion.curves), `${label}.tokens.motion.curves: missing H3 curves`);
  if (isObject(motion.curves)) {
    for (const id of REQUIRED_MOTION_CURVES) {
      expect(/^cubic-bezier\(/.test(String(motion.curves[id] || '')), `${label}.tokens.motion.curves.${id}: expected cubic-bezier curve`);
    }
  }
  expect(isObject(motion.settleDurations), `${label}.tokens.motion.settleDurations: missing H3 duration map`);
  if (isObject(motion.settleDurations)) {
    for (const id of REQUIRED_MOTION_DURATIONS) {
      expect(Number.isInteger(motion.settleDurations[id]) && motion.settleDurations[id] >= 0 && motion.settleDurations[id] <= 600, `${label}.tokens.motion.settleDurations.${id}: out of range`);
    }
    expect(motion.settleDurations.micro === motion.durationFast, `${label}.tokens.motion.settleDurations.micro: must match durationFast`);
    expect(motion.settleDurations.hover === motion.durationBase, `${label}.tokens.motion.settleDurations.hover: must match durationBase`);
    expect(motion.settleDurations.rerank === motion.durationRerank, `${label}.tokens.motion.settleDurations.rerank: must match durationRerank`);
    expect(
      motion.settleDurations.micro <= motion.settleDurations.hover &&
      motion.settleDurations.hover <= motion.settleDurations.reveal &&
      motion.settleDurations.reveal <= motion.settleDurations.rerank &&
      motion.settleDurations.rerank <= motion.settleDurations.bloom,
      `${label}.tokens.motion.settleDurations: durations must ascend`
    );
  }
  expect(Array.isArray(motion.intents) && motion.intents.length >= REQUIRED_MOTION_INTENTS.length, `${label}.tokens.motion.intents: missing H3 intent list`);
  const intentIds = new Set();
  for (const [i, intent] of (motion.intents || []).entries()) {
    const at = `${label}.tokens.motion.intents[${i}]`;
    expect(isObject(intent), `${at}: must be object`);
    if (!isObject(intent)) continue;
    expect(REQUIRED_MOTION_INTENTS.includes(intent.id), `${at}.id: unexpected intent ${intent.id || '(missing)'}`);
    expect(!intentIds.has(intent.id), `${at}.id: duplicate ${intent.id}`);
    intentIds.add(intent.id);
    expect(motion.settleDurations && Number.isInteger(motion.settleDurations[intent.duration]), `${at}.duration: unknown duration key ${intent.duration || '(missing)'}`);
    expect(motion.curves && nonEmpty(motion.curves[intent.curve]), `${at}.curve: unknown curve key ${intent.curve || '(missing)'}`);
    expect(Number.isInteger(intent.maxDistancePx) && intent.maxDistancePx >= 0 && intent.maxDistancePx <= 24, `${at}.maxDistancePx: must be 0..24`);
    if (intent.maxMovingElements != null) expect(Number.isInteger(intent.maxMovingElements) && intent.maxMovingElements <= motion.maxMovingElements, `${at}.maxMovingElements: exceeds profile cap`);
    stringArray(intent.allowedProperties, `${at}.allowedProperties`, 1);
    for (const prop of intent.allowedProperties || []) expect(SAFE_MOTION_PROPERTIES.has(prop), `${at}.allowedProperties: unsafe property ${prop}`);
    stringArray(intent.mustNot, `${at}.mustNot`, 2);
  }
  for (const id of REQUIRED_MOTION_INTENTS) expect(intentIds.has(id), `${label}.tokens.motion.intents: missing ${id}`);
  const reduced = motion.reducedMotionPolicy;
  expect(isObject(reduced), `${label}.tokens.motion.reducedMotionPolicy: missing object`);
  if (isObject(reduced)) {
    expect(reduced.mode === motion.reducedMotion, `${label}.tokens.motion.reducedMotionPolicy.mode: must match reducedMotion`);
    stringArray(reduced.allowedProperties, `${label}.tokens.motion.reducedMotionPolicy.allowedProperties`, 2);
    for (const prop of reduced.allowedProperties || []) {
      expect(SAFE_MOTION_PROPERTIES.has(prop), `${label}.tokens.motion.reducedMotionPolicy.allowedProperties: unsafe property ${prop}`);
      expect(prop !== 'transform' && prop !== 'stroke-dashoffset', `${label}.tokens.motion.reducedMotionPolicy.allowedProperties: reduced motion must not include ${prop}`);
    }
    stringArray(reduced.mustNot, `${label}.tokens.motion.reducedMotionPolicy.mustNot`, 2);
  }
}

function checkContrastPairs(profile, label) {
  expect(Array.isArray(profile.contrastPairs) && profile.contrastPairs.length >= 6, `${label}.contrastPairs: expected at least six pairs`);
  if (!Array.isArray(profile.contrastPairs)) return;
  const ids = new Set();
  for (const [i, pair] of profile.contrastPairs.entries()) {
    const at = `${label}.contrastPairs[${i}]`;
    expect(isObject(pair), `${at}: must be object`);
    if (!isObject(pair)) continue;
    expect(SLUG.test(String(pair.id || '')), `${at}.id: invalid id`);
    expect(!ids.has(pair.id), `${at}.id: duplicate ${pair.id}`);
    ids.add(pair.id);
    expect(nonEmpty(pair.purpose), `${at}.purpose: missing purpose`);
    expect(Number.isFinite(pair.minimum) && pair.minimum >= 3, `${at}.minimum: must be at least 3`);
    const foreground = colorValue(profile, pair.fg);
    const background = colorValue(profile, pair.bg);
    expect(HEX.test(String(foreground || '')), `${at}.fg: unknown color ${pair.fg || '(missing)'}`);
    expect(HEX.test(String(background || '')), `${at}.bg: unknown color ${pair.bg || '(missing)'}`);
    if (foreground && background) {
      const ratio = contrastRatio(foreground, background);
      expect(ratio >= pair.minimum, `${at}: contrast ${ratio.toFixed(2)} below ${pair.minimum}`);
    }
  }
}

function checkComponentContracts(profile, label) {
  expect(Array.isArray(profile.componentContracts) && profile.componentContracts.length >= 2, `${label}.componentContracts: expected at least two contracts`);
  if (!Array.isArray(profile.componentContracts)) return;
  for (const [i, contract] of profile.componentContracts.entries()) {
    const at = `${label}.componentContracts[${i}]`;
    expect(isObject(contract), `${at}: must be object`);
    if (!isObject(contract)) continue;
    expect(SLUG.test(String(contract.id || '')), `${at}.id: invalid id`);
    stringArray(contract.tokens, `${at}.tokens`, 2);
    stringArray(contract.mustExpress, `${at}.mustExpress`, 2);
    stringArray(contract.mustNot, `${at}.mustNot`, 2);
  }
}

function checkArtTokens(profile, label) {
  expect(Array.isArray(profile.artTokens) && profile.artTokens.length >= 2, `${label}.artTokens: expected at least two art tokens`);
  if (!Array.isArray(profile.artTokens)) return;
  for (const [i, art] of profile.artTokens.entries()) {
    const at = `${label}.artTokens[${i}]`;
    expect(isObject(art), `${at}: must be object`);
    if (!isObject(art)) continue;
    expect(SLUG.test(String(art.id || '')), `${at}.id: invalid id`);
    expect(art.kind === 'svg-line' || art.kind === 'svg-fill', `${at}.kind: unsupported kind`);
    expect(/^\d+ \d+ \d+ \d+$/.test(String(art.viewBox || '')), `${at}.viewBox: invalid viewBox`);
    expect(nonEmpty(art.stroke), `${at}.stroke: missing stroke`);
    expect(nonEmpty(art.fill), `${at}.fill: missing fill`);
    expect(/^M/i.test(String(art.path || '')), `${at}.path: must start with M`);
    expect(nonEmpty(art.usage), `${at}.usage: missing usage`);
  }
}

function checkCssVariableMapping(mapping, label) {
  expect(isObject(mapping), `${label}: missing object`);
  if (!isObject(mapping)) return;
  expect(mapping.status === 'i3-review-table', `${label}.status: must be i3-review-table`);
  expect(nonEmpty(mapping.consumer), `${label}.consumer: missing named consumer`);
  expect(nonEmpty(mapping.sourceProfile), `${label}.sourceProfile: missing source profile`);
  expect(nonEmpty(mapping.note), `${label}.note: missing note`);
  expect(Array.isArray(mapping.rows) && mapping.rows.length >= REQUIRED_CSS_VARS.length, `${label}.rows: expected a complete one-page mapping table`);
  if (!Array.isArray(mapping.rows)) return;
  const cssVars = new Set();
  for (const [i, row] of mapping.rows.entries()) {
    const at = `${label}.rows[${i}]`;
    expect(isObject(row), `${at}: must be object`);
    if (!isObject(row)) continue;
    expect(/^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$/.test(String(row.token || '')), `${at}.token: invalid token path`);
    expect(/^--[a-z0-9-]+$/.test(String(row.cssVariable || '')), `${at}.cssVariable: invalid CSS variable`);
    expect(nonEmpty(row.role), `${at}.role: missing role`);
    if (row.cssVariable) cssVars.add(row.cssVariable);
  }
  for (const cssVar of REQUIRED_CSS_VARS) {
    expect(cssVars.has(cssVar), `${label}.rows: missing mapping for ${cssVar}`);
  }
}

function checkContrastRemediationContract(contract, label) {
  expect(isObject(contract), `${label}: missing object`);
  if (!isObject(contract)) return;
  expect(contract.status === 'h9-app-owned-remediation', `${label}.status: must be h9-app-owned-remediation`);
  expect(/Claude H9/i.test(String(contract.consumer || '')), `${label}.consumer: should name Claude H9 consumer`);
  expect(contract.sourceAudit === 'research/contrast_audit.js', `${label}.sourceAudit: should point to contrast audit`);
  expect(contract.appOwnedFile === 'app/styles.css', `${label}.appOwnedFile: should point to app/styles.css`);
  expect(/Codex supplies tokens/i.test(String(contract.rule || '')), `${label}.rule: should preserve Codex/app boundary`);
  const steps = contract.steps || [];
  expect(Array.isArray(steps) && steps.length === REQUIRED_CONTRAST_REMEDIATION_STEPS.length, `${label}.steps: expected five H9 remediation steps`);
  const byId = new Map();
  if (Array.isArray(steps)) {
    for (const [i, step] of steps.entries()) {
      const at = `${label}.steps[${i}]`;
      expect(isObject(step), `${at}: must be object`);
      if (!isObject(step)) continue;
      expect(REQUIRED_CONTRAST_REMEDIATION_STEPS.includes(step.id), `${at}.id: unexpected remediation id`);
      expect(!byId.has(step.id), `${at}.id: duplicate ${step.id}`);
      byId.set(step.id, step);
      expect(nonEmpty(step.label), `${at}.label: missing label`);
      expect(nonEmpty(step.warning), `${at}.warning: missing warning`);
      expect(['light', 'dark'].includes(step.theme), `${at}.theme: must be light or dark`);
      expect(Number.isFinite(step.ratio) && step.ratio > 0, `${at}.ratio: missing ratio`);
      expect(step.minimum === 4.5, `${at}.minimum: expected 4.5`);
      stringArray(step.targetCssVariables, `${at}.targetCssVariables`, 2);
      for (const cssVar of step.targetCssVariables || []) expect(/^--[a-z0-9-]+$/.test(cssVar), `${at}.targetCssVariables: invalid ${cssVar}`);
      expect(nonEmpty(step.tokenSource), `${at}.tokenSource: missing token source`);
      stringArray(step.appOwnedEvidence, `${at}.appOwnedEvidence`, 2);
      stringArray(step.mustNot, `${at}.mustNot`, 2);
    }
  }
  for (const id of REQUIRED_CONTRAST_REMEDIATION_STEPS) expect(byId.has(id), `${label}.steps: missing ${id}`);
  expect((byId.get('wire-accent-text-token')?.targetCssVariables || []).includes('--accent-text'), `${label}: accent-text step must target --accent-text`);
  stringArray(contract.sharedEvidenceRequired, `${label}.sharedEvidenceRequired`, 2);
  expect(isObject(contract.coverage), `${label}.coverage: missing object`);
  if (isObject(contract.coverage)) {
    expect(contract.coverage.warnings === REQUIRED_CONTRAST_REMEDIATION_STEPS.length, `${label}.coverage.warnings: mismatch`);
    expect(contract.coverage.steps === steps.length, `${label}.coverage.steps: mismatch`);
    expect(contract.coverage.requiredCssVariable === '--accent-text', `${label}.coverage.requiredCssVariable: expected --accent-text`);
    expect(contract.coverage.appOwned === true, `${label}.coverage.appOwned: must be true`);
    expect(contract.coverage.dataOnlyFix === false, `${label}.coverage.dataOnlyFix: must be false`);
  }
}

function checkValueBloom(value, label) {
  expect(isObject(value), `${label}: missing H4 value-bloom contract`);
  if (!isObject(value)) return;
  expect(value.status === 'h4-token-substrate', `${label}.status: expected h4-token-substrate`);
  expect(/Claude H4/i.test(String(value.consumer || '')), `${label}.consumer: should name Claude H4 consumer`);
  expect(String(value.sourceFunction || '').includes('CC.engine.signature'), `${label}.sourceFunction: should use CC.engine.signature`);
  expect(value.minimumThemesForBloom === 2, `${label}.minimumThemesForBloom: expected 2`);
  expect(sameArray(value.order, REQUIRED_BLOOM_THEMES), `${label}.order: must match CC theme order`);
  expect(Array.isArray(value.themes) && value.themes.length === REQUIRED_BLOOM_THEMES.length, `${label}.themes: expected ${REQUIRED_BLOOM_THEMES.length} themes`);
  const ids = [];
  for (const [i, theme] of (value.themes || []).entries()) {
    const at = `${label}.themes[${i}]`;
    expect(isObject(theme), `${at}: must be object`);
    if (!isObject(theme)) continue;
    ids.push(theme.id);
    expect(theme.id === REQUIRED_BLOOM_THEMES[i], `${at}.id: expected ${REQUIRED_BLOOM_THEMES[i]}`);
    expect(nonEmpty(theme.label), `${at}.label: missing label`);
    expect(theme.universal === REQUIRED_BLOOM_UNIVERSALS[theme.id], `${at}.universal: expected ${REQUIRED_BLOOM_UNIVERSALS[theme.id]}`);
    expect(HEX.test(String(theme.petalColor || '')), `${at}.petalColor: invalid hex`);
    expect(HEX.test(String(theme.centerColor || '')), `${at}.centerColor: invalid hex`);
    expect(nonEmpty(theme.role), `${at}.role: missing role`);
  }
  expect(uniqueArray(ids), `${label}.themes: duplicate ids`);
  const vector = value.signatureVector;
  expect(isObject(vector), `${label}.signatureVector: missing object`);
  if (isObject(vector)) {
    expect(vector.status === 'optional-materialization-contract', `${label}.signatureVector.status: expected optional-materialization-contract`);
    expect(vector.field === 'valueSignature', `${label}.signatureVector.field: expected valueSignature`);
    expect(sameArray(vector.order, REQUIRED_BLOOM_THEMES), `${label}.signatureVector.order: must match bloom order`);
    expect(vector.omitMissing === true, `${label}.signatureVector.omitMissing: must be true`);
    expect(nonEmpty(vector.shape), `${label}.signatureVector.shape: missing shape`);
    stringArray(vector.mustNot, `${label}.signatureVector.mustNot`, 3);
    expect(JSON.stringify(vector.mustNot || []).includes('Do not'), `${label}.signatureVector.mustNot: should state explicit prohibitions`);
  }
}

function checkSkinReadiness(value, label, index) {
  expect(isObject(value), `${label}: missing object`);
  if (!isObject(value)) return;
  expect(value.status === 'substrate-ready', `${label}.status: expected substrate-ready`);
  expect(/Claude biophilic skin pass/i.test(String(value.consumer || '')), `${label}.consumer: should name Claude skin pass`);
  expect(value.sourceProfile === 'quiet-commons', `${label}.sourceProfile: expected quiet-commons`);
  expect(value.dataOnlyDrain === false, `${label}.dataOnlyDrain: must be false`);
  expect(nonEmpty(value.appOwnedNext), `${label}.appOwnedNext: missing app-owned next step`);
  stringArray(value.generatedFrom, `${label}.generatedFrom`, 2);
  stringArray(value.mustNot, `${label}.mustNot`, 3);
  expect(JSON.stringify(value.mustNot || []).toLowerCase().includes('substrate'), `${label}.mustNot: must preserve substrate-only boundary`);

  expect(Array.isArray(value.items) && value.items.length === REQUIRED_SKIN_READINESS.length, `${label}.items: expected ${REQUIRED_SKIN_READINESS.length} items`);
  const byId = new Map();
  for (const [i, item] of (value.items || []).entries()) {
    const at = `${label}.items[${i}]`;
    expect(isObject(item), `${at}: must be object`);
    if (!isObject(item)) continue;
    expect(REQUIRED_SKIN_READINESS.includes(item.id), `${at}.id: unexpected id ${item.id || '(missing)'}`);
    expect(!byId.has(item.id), `${at}.id: duplicate ${item.id}`);
    byId.set(item.id, item);
    expect(nonEmpty(item.label), `${at}.label: missing label`);
    expect(item.status === 'ready', `${at}.status: expected ready`);
    expect(nonEmpty(item.consumer), `${at}.consumer: missing consumer`);
    stringArray(item.paths, `${at}.paths`, 1);
    expect(isObject(item.evidence), `${at}.evidence: missing object`);
    expect(nonEmpty(item.appOwnedNext), `${at}.appOwnedNext: missing app-owned next step`);
  }
  for (const id of REQUIRED_SKIN_READINESS) expect(byId.has(id), `${label}.items: missing ${id}`);

  const h1 = byId.get('h1-palette');
  if (h1 && isObject(h1.evidence)) {
    expect(sameArray([...(h1.evidence.colorRampFamilies || [])].sort(), [...REQUIRED_RAMP_FAMILIES].sort()) || REQUIRED_RAMP_FAMILIES.every(id => (h1.evidence.colorRampFamilies || []).includes(id)), `${label}.items.h1-palette: missing required color ramps`);
    expect(['light', 'dark'].every(id => (h1.evidence.colorModes || []).includes(id)), `${label}.items.h1-palette: missing light/dark modes`);
    expect(h1.evidence.cssVariableMappings === REQUIRED_CSS_VARS.length, `${label}.items.h1-palette.cssVariableMappings: mismatch`);
  }
  const h2 = byId.get('h2-day-cycle');
  if (h2 && isObject(h2.evidence)) {
    expect(sameArray([...(h2.evidence.variants || [])].sort(), [...REQUIRED_DAY_CYCLE_VARIANTS].sort()), `${label}.items.h2-day-cycle.variants: mismatch`);
    expect(h2.evidence.defaultMode === 'noon', `${label}.items.h2-day-cycle.defaultMode: expected noon`);
    expect(sameArray([...(h2.evidence.cssVariables || [])].sort(), [...REQUIRED_DAY_CYCLE_CSS_VARS].sort()), `${label}.items.h2-day-cycle.cssVariables: mismatch`);
  }
  const h3 = byId.get('h3-motion');
  if (h3 && isObject(h3.evidence)) {
    expect(sameArray([...(h3.evidence.curves || [])].sort(), [...REQUIRED_MOTION_CURVES].sort()), `${label}.items.h3-motion.curves: mismatch`);
    expect(sameArray([...(h3.evidence.intents || [])].sort(), [...REQUIRED_MOTION_INTENTS].sort()), `${label}.items.h3-motion.intents: mismatch`);
    expect(sameArray([...(h3.evidence.cssVariables || [])].sort(), [...REQUIRED_MOTION_CSS_VARS].sort()), `${label}.items.h3-motion.cssVariables: mismatch`);
    expect(h3.evidence.reducedMotion === 'opacity-or-instant', `${label}.items.h3-motion.reducedMotion: mismatch`);
  }
  const h4 = byId.get('h4-value-bloom');
  if (h4 && isObject(h4.evidence)) {
    expect(sameArray([...(h4.evidence.themes || [])].sort(), [...REQUIRED_BLOOM_THEMES].sort()), `${label}.items.h4-value-bloom.themes: mismatch`);
    expect(sameArray([...(h4.evidence.cssVariables || [])].sort(), [...REQUIRED_BLOOM_CSS_VARS].sort()), `${label}.items.h4-value-bloom.cssVariables: mismatch`);
    expect(h4.evidence.signedEntries === index.valueSignatureCoverage.signedEntries, `${label}.items.h4-value-bloom.signedEntries: mismatch`);
    expect(h4.evidence.drawableEntries === index.valueSignatureCoverage.drawableEntries, `${label}.items.h4-value-bloom.drawableEntries: mismatch`);
    expect(h4.evidence.missingSignatureEntries === 0, `${label}.items.h4-value-bloom.missingSignatureEntries: must be zero`);
    expect(h4.evidence.staleSignatureEntries === 0, `${label}.items.h4-value-bloom.staleSignatureEntries: must be zero`);
    expect(h4.evidence.previewFixtures === 3, `${label}.items.h4-value-bloom.previewFixtures: expected 3`);
  }
  const h5 = byId.get('h5-materiality');
  if (h5 && isObject(h5.evidence)) {
    expect(sameArray([...(h5.evidence.surfaces || [])].sort(), [...REQUIRED_MATERIALITY_SURFACES].sort()), `${label}.items.h5-materiality.surfaces: mismatch`);
    expect(sameArray([...(h5.evidence.cssVariables || [])].sort(), [...REQUIRED_MATERIALITY_CSS_VARS].sort()), `${label}.items.h5-materiality.cssVariables: mismatch`);
    expect(Number.isFinite(h5.evidence.paperGrainOpacity) && h5.evidence.paperGrainOpacity <= 0.08, `${label}.items.h5-materiality.paperGrainOpacity: too high`);
    expect(h5.evidence.shadowStyle === 'warm-soft', `${label}.items.h5-materiality.shadowStyle: expected warm-soft`);
  }

  expect(isObject(value.coverage), `${label}.coverage: missing object`);
  if (isObject(value.coverage)) {
    expect(value.coverage.required === REQUIRED_SKIN_READINESS.length, `${label}.coverage.required: mismatch`);
    expect(value.coverage.ready === REQUIRED_SKIN_READINESS.length, `${label}.coverage.ready: mismatch`);
    expect(value.coverage.blocked === 0, `${label}.coverage.blocked: expected zero`);
    expect(value.coverage.substrateOnly === true, `${label}.coverage.substrateOnly: must be true`);
  }
}

function bloomProjectionStats(value) {
  const dataDir = path.join(ROOT, 'app', 'data');
  const canonical = new Set((value && value.order) || []);
  const minThemes = value && value.minimumThemesForBloom || 2;
  const stats = {
    files: 0,
    entries: 0,
    scoredEntries: 0,
    resolvedEntries: 0,
    signedEntries: 0,
    drawableEntries: 0,
    missingSignatureEntries: [],
    staleSignatureEntries: [],
    themeCounts: {},
    unresolved: [],
    outsideThemes: [],
    unmappedCriteria: new Map()
  };
  if (!fs.existsSync(dataDir)) return stats;
  const files = fs.readdirSync(dataDir)
    .filter(file => file.endsWith('.json'))
    .filter(file => !['index.json', 'pulse.json', 'design-tokens.json'].includes(file));
  for (const file of files) {
    const lens = readJson(path.join(dataDir, file));
    if (!lens || !Array.isArray(lens.criteria)) continue;
    const items = Array.isArray(lens.products) ? lens.products : (Array.isArray(lens.resources) ? lens.resources : []);
    if (!items.length) continue;
    stats.files += 1;
    const k2t = Object.assign({}, engine.KEY2THEME || {}, lens.key2theme || {});
    for (const entity of items) {
      stats.entries += 1;
      const scores = entity && entity.scores || {};
      const keys = Object.keys(scores).filter(key => scores[key] != null);
      if (!keys.length) continue;
      stats.scoredEntries += 1;
      for (const key of keys) {
        if (!k2t[key]) stats.unmappedCriteria.set(key, (stats.unmappedCriteria.get(key) || 0) + 1);
      }
      const sig = engine.signature(entity, k2t);
      const normalizedSig = normalizeSignature(sig, value.order || REQUIRED_BLOOM_THEMES);
      const sigKeys = Object.keys(normalizedSig);
      if (!sigKeys.length) stats.unresolved.push(`${file}:${entity.code || entity.name || '(entity)'}`);
      else stats.resolvedEntries += 1;
      const outside = sigKeys.filter(key => !canonical.has(key));
      for (const key of outside) stats.outsideThemes.push(`${file}:${entity.code || entity.name || '(entity)'}:${key}`);
      for (const key of sigKeys) stats.themeCounts[key] = (stats.themeCounts[key] || 0) + 1;
      const actual = normalizeSignature(entity.valueSignature, value.order || REQUIRED_BLOOM_THEMES);
      const actualKeys = Object.keys(actual);
      if (actualKeys.length) stats.signedEntries += 1;
      else stats.missingSignatureEntries.push(`${file}:${entity.code || entity.name || '(entity)'}`);
      if (!signaturesEqual(actual, normalizedSig)) {
        stats.staleSignatureEntries.push(`${file}:${entity.code || entity.name || '(entity)'}`);
      }
      if (sigKeys.length >= minThemes) stats.drawableEntries += 1;
    }
  }
  return stats;
}

function checkBloomProjection(value, label) {
  const stats = bloomProjectionStats(value);
  expect(stats.files > 0, `${label}: no app/data lenses found for projection audit`);
  expect(stats.scoredEntries > 0, `${label}: no scored entries found for projection audit`);
  expect(stats.unmappedCriteria.size === 0, `${label}: unmapped criteria in score projection: ${[...stats.unmappedCriteria.keys()].slice(0, 10).join(', ')}`);
  expect(stats.unresolved.length === 0, `${label}: scored entries without a signature: ${stats.unresolved.slice(0, 5).join(', ')}`);
  expect(stats.outsideThemes.length === 0, `${label}: signatures outside canonical themes: ${stats.outsideThemes.slice(0, 5).join(', ')}`);
  expect(stats.missingSignatureEntries.length === 0, `${label}: generated entries missing valueSignature: ${stats.missingSignatureEntries.slice(0, 5).join(', ')}`);
  expect(stats.staleSignatureEntries.length === 0, `${label}: generated entries with stale valueSignature: ${stats.staleSignatureEntries.slice(0, 5).join(', ')}`);
  expect(stats.signedEntries === stats.scoredEntries, `${label}: signed entry count should match scored entries`);
  expect(stats.drawableEntries > 0, `${label}: no entries resolve enough themes for drawing`);
  return stats;
}

function checkProfile(profile, profileIds) {
  expect(isObject(profile), 'profile: must be object');
  if (!isObject(profile)) return;
  const label = `profile.${profile.id || '(missing)'}`;
  expect(SLUG.test(String(profile.id || '')), `${label}.id: invalid id`);
  expect(!profileIds.has(profile.id), `${label}.id: duplicate ${profile.id}`);
  profileIds.add(profile.id);
  expect(nonEmpty(profile.label), `${label}.label: missing label`);
  expect(nonEmpty(profile.role), `${label}.role: missing role`);
  expect(['format-seed', 'active', 'archived'].includes(profile.status), `${label}.status: invalid status`);
  expect(nonEmpty(profile.summary), `${label}.summary: missing summary`);
  expect(isObject(profile.tokens), `${label}.tokens: missing object`);
  checkColors(profile, label);
  checkColorRamps(profile, label);
  checkColorModes(profile, label);
  checkDayCycle(profile, label);
  checkTypography(profile, label);
  checkRhythmMap(profile.tokens && profile.tokens.space, REQUIRED_SPACE, `${label}.tokens.space`);
  checkRhythmMap(profile.tokens && profile.tokens.radius, REQUIRED_RADIUS, `${label}.tokens.radius`);
  checkMotion(profile, label);
  checkElevation(profile, label);
  checkMateriality(profile, label);
  checkContrastPairs(profile, label);
  checkComponentContracts(profile, label);
  checkArtTokens(profile, label);
}

function checkSource(data) {
  expect(data.format === 'open-values-design-tokens', 'source: wrong format');
  expect(SEMVER.test(String(data.version || '')), 'source.version: must be 0.1.0 semver');
  expect(data.standard === 'open-values-standard', 'source.standard: wrong standard');
  expect(DATE.test(String(data.updated || '')), 'source.updated: must be YYYY-MM-DD');
  expect(nonEmpty(data.purpose), 'source.purpose: missing purpose');
  stringArray(data.principles, 'source.principles', 4);
  expect(Array.isArray(data.references) && data.references.length >= 1, 'source.references: expected at least one reference');
  checkValueBloom(data.valueBloom, 'source.valueBloom');
  const bloomStats = checkBloomProjection(data.valueBloom, 'source.valueBloom projection');
  checkCssVariableMapping(data.cssVariableMapping, 'source.cssVariableMapping');
  checkContrastRemediationContract(data.contrastRemediationContract, 'source.contrastRemediationContract');
  const profileIds = new Set();
  expect(Array.isArray(data.profiles) && data.profiles.length >= 3, 'source.profiles: expected at least three profiles');
  for (const profile of data.profiles || []) checkProfile(profile, profileIds);
  return { profiles: (data.profiles || []).length, bloomStats };
}

function checkGeneratedIndex() {
  expect(fs.existsSync(DESIGN_TOKEN_INDEX), 'design token index: missing generated output app/data/design-tokens.json');
  if (!fs.existsSync(DESIGN_TOKEN_INDEX)) return;
  const expected = formatJson(buildDesignTokenIndex());
  const actual = fs.readFileSync(DESIGN_TOKEN_INDEX, 'utf8');
  expect(actual === expected, 'design token index: generated output is stale; run node pipeline/build_design_tokens.js');
  const index = readJson(DESIGN_TOKEN_INDEX);
  expect(index.counts && index.counts.failingContrastPairs === 0, 'design token index: contains failing contrast pairs');
  checkValueBloom(index.valueBloom, 'design token index.valueBloom');
  const generatedBloomStats = bloomProjectionStats(index.valueBloom);
  checkCssVariableMapping(index.cssVariableMapping, 'design token index.cssVariableMapping');
  checkContrastRemediationContract(index.contrastRemediationContract, 'design token index.contrastRemediationContract');
  checkSkinReadiness(index.skinReadiness, 'design token index.skinReadiness', index);
  expect(index.counts && index.counts.cssVariableMappings === REQUIRED_CSS_VARS.length, 'design token index: CSS variable mapping count mismatch');
  expect(index.counts && index.counts.appCssVariables === REQUIRED_CSS_VARS.length, 'design token index: app CSS variable count mismatch');
  expect(index.counts && index.counts.contrastRemediationSteps === REQUIRED_CONTRAST_REMEDIATION_STEPS.length, 'design token index: contrast remediation step count mismatch');
  expect(index.counts && index.counts.bloomThemes === REQUIRED_BLOOM_THEMES.length, 'design token index: bloom theme count mismatch');
  expect(index.counts && index.counts.valueSignatures === generatedBloomStats.signedEntries, 'design token index: valueSignature count mismatch');
  expect(index.counts && index.counts.drawableBloomEntries === generatedBloomStats.drawableEntries, 'design token index: drawable bloom count mismatch');
  expect(index.counts && index.counts.bloomPreviewFixtures === 3, 'design token index: expected three bloom preview fixtures');
  expect(isObject(index.valueSignatureCoverage), 'design token index: missing valueSignatureCoverage');
  if (isObject(index.valueSignatureCoverage)) {
    expect(index.valueSignatureCoverage.scoredEntries === generatedBloomStats.scoredEntries, 'design token index.valueSignatureCoverage.scoredEntries: mismatch');
    expect(index.valueSignatureCoverage.signedEntries === generatedBloomStats.signedEntries, 'design token index.valueSignatureCoverage.signedEntries: mismatch');
    expect(index.valueSignatureCoverage.drawableEntries === generatedBloomStats.drawableEntries, 'design token index.valueSignatureCoverage.drawableEntries: mismatch');
    expect(index.valueSignatureCoverage.missingSignatureEntries === 0, 'design token index.valueSignatureCoverage.missingSignatureEntries: must be zero');
    expect(index.valueSignatureCoverage.staleSignatureEntries === 0, 'design token index.valueSignatureCoverage.staleSignatureEntries: must be zero');
  }
  expect(Array.isArray(index.valueBloom && index.valueBloom.previewFixtures) && index.valueBloom.previewFixtures.length === 3, 'design token index.valueBloom.previewFixtures: expected three fixtures');
  for (const [i, fixture] of ((index.valueBloom && index.valueBloom.previewFixtures) || []).entries()) {
    const at = `design token index.valueBloom.previewFixtures[${i}]`;
    expect(isObject(fixture), `${at}: must be object`);
    if (!isObject(fixture)) continue;
    expect(nonEmpty(fixture.category), `${at}.category: missing category`);
    expect(nonEmpty(fixture.code), `${at}.code: missing code`);
    expect(nonEmpty(fixture.name), `${at}.name: missing name`);
    expect(nonEmpty(fixture.route) && fixture.route.startsWith('#card/'), `${at}.route: missing card route`);
    expect(Number.isInteger(fixture.themeCount) && fixture.themeCount >= 2, `${at}.themeCount: must be drawable`);
    expect(Object.keys(normalizeSignature(fixture.signature)).length === fixture.themeCount, `${at}.signature: theme count mismatch`);
  }
  expect(index.counts && index.counts.colorRampFamilies >= REQUIRED_RAMP_FAMILIES.length, 'design token index: expected H1 color ramp families');
  expect(index.counts && index.counts.colorModes >= 2, 'design token index: expected light and dark mode aliases');
  expect(index.counts && index.counts.dayCycleVariants >= REQUIRED_DAY_CYCLE_VARIANTS.length, 'design token index: expected H2 day-cycle variants');
  expect(index.counts && index.counts.materialitySurfaces >= REQUIRED_MATERIALITY_SURFACES.length, 'design token index: expected H5 materiality surfaces');
  expect(index.counts && index.counts.motionCurves >= REQUIRED_MOTION_CURVES.length, 'design token index: expected H3 motion curves');
  expect(index.counts && index.counts.motionIntents >= REQUIRED_MOTION_INTENTS.length, 'design token index: expected H3 motion intents');
  expect(index.counts && index.counts.skinReadinessItems === REQUIRED_SKIN_READINESS.length, 'design token index: expected H1-H5 skin readiness items');
  expect(index.filters && sameArray(index.filters.dayCycleVariants, [...REQUIRED_DAY_CYCLE_VARIANTS].sort()), 'design token index.filters.dayCycleVariants: mismatch');
  expect(index.filters && sameArray(index.filters.motionIntents, [...REQUIRED_MOTION_INTENTS].sort()), 'design token index.filters.motionIntents: mismatch');
  expect(index.filters && sameArray(index.filters.skinReadiness, [...REQUIRED_SKIN_READINESS].sort()), 'design token index.filters.skinReadiness: mismatch');
  expect(index.counts && index.counts.artTokens >= 6, 'design token index: expected at least six art tokens');
  expect(isObject(index.appCssInjection), 'design token index: missing appCssInjection contract');
  if (isObject(index.appCssInjection)) {
    expect(index.appCssInjection.status === 'build-time-injected', 'design token index.appCssInjection.status: expected build-time-injected');
    expect(index.appCssInjection.target === 'app/styles.css', 'design token index.appCssInjection.target: expected app/styles.css');
    expect(index.appCssInjection.sourceProfile === 'quiet-commons', 'design token index.appCssInjection.sourceProfile: expected quiet-commons');
    expect(index.appCssInjection.runtimeFetch === false, 'design token index.appCssInjection.runtimeFetch: must be false');
  }
  expect(fs.existsSync(STYLE_OUT), 'app styles: missing app/styles.css');
  if (fs.existsSync(STYLE_OUT)) {
    const css = fs.readFileSync(STYLE_OUT, 'utf8');
    expect(css.includes('BEGIN GENERATED DESIGN TOKENS: quiet-commons'), 'app styles: missing generated design-token block start');
    expect(css.includes('END GENERATED DESIGN TOKENS'), 'app styles: missing generated design-token block end');
    expect(injectAppCssTokens(css, index) === css, 'app styles: design-token block is stale; run node pipeline/build_design_tokens.js');
  }
}

function main() {
  console.log('Design token audit');
  const data = readJson(SOURCE);
  const stats = checkSource(data);
  checkGeneratedIndex();
  console.log(`  profiles: ${stats.profiles}`);
  if (stats.bloomStats) {
    console.log(`  bloom projection: ${stats.bloomStats.resolvedEntries}/${stats.bloomStats.scoredEntries} resolved; ${stats.bloomStats.drawableEntries} drawable`);
  }
  console.log(`  source: ${rel(SOURCE)}`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('DESIGN TOKEN CHECKS PASS');
}

main();
