#!/usr/bin/env node
/* Build app/data/design-tokens.json from content/design/tokens.json.

   C16 keeps beauty systematic: authored semantic tokens remain the source of
   truth; this generated index gives future app skins computed contrast results,
   CSS custom-property maps, motion doctrine, component contracts, and SVG art
   tokens without hand-editing app UI code.
*/
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const engine = require('../app/engine.js');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'content', 'design', 'tokens.json');
const APP_DATA = path.join(ROOT, 'app', 'data');
const OUT = path.join(ROOT, 'app', 'data', 'design-tokens.json');
const STYLE_OUT = path.join(ROOT, 'app', 'styles.css');
const CSS_BEGIN = '/* BEGIN GENERATED DESIGN TOKENS: quiet-commons */';
const CSS_END = '/* END GENERATED DESIGN TOKENS */';
const BLOOM_FIXTURE_CATEGORY_ORDER = [
  'phones',
  'banking',
  'learning-resources',
  'news-sources',
  'ai-assistants',
  'payments',
  'investing',
  'vpn'
];
const BLOOM_FIXTURE_PREFERRED_CODES = {
  phones: ['fairphone', 'grapheneos-pixel', 'repair-current-phone'],
  banking: ['beneficial-state', 'triodos', 'credit-union'],
  'learning-resources': ['18f-guides', 'wikipedia', 'khan-academy'],
  'news-sources': ['propublica', 'ap-news', 'reuters'],
  'ai-assistants': ['claude', 'chatgpt', 'openai-codex']
};
const REQUIRED_SKIN_READINESS = {
  colorRamps: ['soil', 'leaf', 'water', 'light'],
  modes: ['light', 'dark'],
  bloomCssVariables: [
    '--bloom-planet-petal',
    '--bloom-planet-center',
    '--bloom-people-petal',
    '--bloom-people-center',
    '--bloom-health-petal',
    '--bloom-health-center',
    '--bloom-honesty-petal',
    '--bloom-honesty-center',
    '--bloom-privacy-petal',
    '--bloom-privacy-center',
    '--bloom-animals-petal',
    '--bloom-animals-center',
    '--bloom-cost-petal',
    '--bloom-cost-center',
    '--bloom-local-petal',
    '--bloom-local-center'
  ],
  dayCycleVariants: ['dawn', 'noon', 'dusk', 'night'],
  dayCycleCssVariables: [
    '--day-dawn-bg',
    '--day-dawn-surface',
    '--day-dawn-pill',
    '--day-dawn-line',
    '--day-dawn-ink',
    '--day-dawn-muted',
    '--day-dawn-hint',
    '--day-dawn-accent',
    '--day-dawn-warn',
    '--day-noon-bg',
    '--day-noon-surface',
    '--day-noon-pill',
    '--day-noon-line',
    '--day-noon-ink',
    '--day-noon-muted',
    '--day-noon-hint',
    '--day-noon-accent',
    '--day-noon-warn',
    '--day-dusk-bg',
    '--day-dusk-surface',
    '--day-dusk-pill',
    '--day-dusk-line',
    '--day-dusk-ink',
    '--day-dusk-muted',
    '--day-dusk-hint',
    '--day-dusk-accent',
    '--day-dusk-warn',
    '--day-night-bg',
    '--day-night-surface',
    '--day-night-pill',
    '--day-night-line',
    '--day-night-ink',
    '--day-night-muted',
    '--day-night-hint',
    '--day-night-accent',
    '--day-night-warn'
  ],
  motionCurves: ['breathe', 'settle', 'rerank', 'bloom'],
  motionIntents: ['hover-feedback', 'panel-reveal', 'rank-rerank', 'value-bloom-draw'],
  motionCssVariables: [
    '--dur-micro',
    '--dur-hover',
    '--dur-reveal',
    '--dur-rerank',
    '--dur-bloom',
    '--ease-breathe',
    '--ease-settle',
    '--ease-rerank',
    '--ease-bloom'
  ],
  materialitySurfaces: ['page-paper', 'card-paper', 'quiet-band'],
  materialityCssVariables: [
    '--paper-grain-opacity',
    '--paper-grain-scale',
    '--paper-grain-contrast-limit',
    '--shadow-soft',
    '--shadow-lift'
  ]
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function formatJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanObject(value) {
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined && entry !== null) out[key] = entry;
  }
  return out;
}

function roundScore(value) {
  if (!Number.isFinite(value)) return null;
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? rounded : rounded;
}

function normalizeSignature(value, order) {
  const out = {};
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  for (const theme of order || []) {
    const rounded = roundScore(Number(source[theme]));
    if (rounded != null) out[theme] = rounded;
  }
  return out;
}

function signaturesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function lensItems(lens) {
  if (Array.isArray(lens.products)) return lens.products;
  if (Array.isArray(lens.resources)) return lens.resources;
  return [];
}

function routeFor(category, code) {
  return `#card/${category}/${encodeURIComponent(String(code || ''))}`;
}

function categoryRank(category) {
  const index = BLOOM_FIXTURE_CATEGORY_ORDER.indexOf(category);
  return index === -1 ? BLOOM_FIXTURE_CATEGORY_ORDER.length : index;
}

function preferredCodeRank(candidate) {
  const list = BLOOM_FIXTURE_PREFERRED_CODES[candidate.category] || [];
  const index = list.indexOf(candidate.code);
  return index === -1 ? list.length + 1 : index;
}

function scanValueSignatureCoverage(valueBloom) {
  const order = Array.isArray(valueBloom.order) ? valueBloom.order : [];
  const minimumThemes = Number.isInteger(valueBloom.minimumThemesForBloom) ? valueBloom.minimumThemesForBloom : 2;
  const coverage = {
    categories: 0,
    entries: 0,
    scoredEntries: 0,
    signedEntries: 0,
    drawableEntries: 0,
    missingSignatureEntries: 0,
    staleSignatureEntries: 0,
    minimumThemesForBloom: minimumThemes,
    themeCounts: {}
  };
  const candidates = [];
  if (!fs.existsSync(APP_DATA)) return { coverage, previewFixtures: [] };
  const files = fs.readdirSync(APP_DATA)
    .filter(file => file.endsWith('.json'))
    .filter(file => !['index.json', 'pulse.json', 'design-tokens.json'].includes(file))
    .sort();
  for (const file of files) {
    const lens = readJson(path.join(APP_DATA, file));
    const items = lensItems(lens);
    if (!items.length) continue;
    coverage.categories += 1;
    const category = (lens.meta && lens.meta.id) || file.replace(/\.json$/, '');
    const key2theme = Object.assign({}, engine.KEY2THEME || {}, lens.key2theme || {});
    for (const entity of items) {
      coverage.entries += 1;
      const expected = normalizeSignature(engine.signature(entity, key2theme), order);
      const expectedThemes = Object.keys(expected);
      if (!expectedThemes.length) continue;
      coverage.scoredEntries += 1;
      const actual = normalizeSignature(entity.valueSignature, order);
      const actualThemes = Object.keys(actual);
      if (actualThemes.length) coverage.signedEntries += 1;
      else coverage.missingSignatureEntries += 1;
      if (!signaturesEqual(actual, expected)) coverage.staleSignatureEntries += 1;
      for (const theme of expectedThemes) coverage.themeCounts[theme] = (coverage.themeCounts[theme] || 0) + 1;
      if (expectedThemes.length >= minimumThemes) {
        coverage.drawableEntries += 1;
        const code = entity.code || entity.id || entity.name || '';
        candidates.push({
          category,
          code: String(code),
          name: entity.name || entity.brand || String(code),
          route: routeFor(category, code),
          themeCount: expectedThemes.length,
          signature: expected
        });
      }
    }
  }
  coverage.themeCounts = cleanObject(Object.fromEntries(order
    .filter(theme => coverage.themeCounts[theme])
    .map(theme => [theme, coverage.themeCounts[theme]])));
  candidates.sort((a, b) =>
    categoryRank(a.category) - categoryRank(b.category)
    || preferredCodeRank(a) - preferredCodeRank(b)
    || b.themeCount - a.themeCount
    || a.category.localeCompare(b.category)
    || a.code.localeCompare(b.code)
  );
  const previewFixtures = [];
  const usedCategories = new Set();
  for (const candidate of candidates) {
    if (previewFixtures.length >= 3) break;
    if (usedCategories.has(candidate.category)) continue;
    previewFixtures.push(candidate);
    usedCategories.add(candidate.category);
  }
  for (const candidate of candidates) {
    if (previewFixtures.length >= 3) break;
    if (!previewFixtures.some(item => item.category === candidate.category && item.code === candidate.code)) {
      previewFixtures.push(candidate);
    }
  }
  return { coverage, previewFixtures };
}

function hasAll(actual, required) {
  const set = new Set(actual || []);
  return (required || []).every(item => set.has(item));
}

function skinReadinessItem({ id, label, consumer, paths, evidence, ready, appOwnedNext }) {
  return cleanObject({
    id,
    label,
    status: ready ? 'ready' : 'blocked',
    consumer,
    paths,
    evidence,
    appOwnedNext
  });
}

function buildSkinReadiness(profiles, valueBloom, bloomProjection, cssVariableMapping, appCssInjection) {
  const sourceProfile = appCssInjection.sourceProfile || cssVariableMapping.sourceProfile || 'quiet-commons';
  const profile = profiles.find(item => item.id === sourceProfile) || {};
  const cssRows = Array.isArray(cssVariableMapping.rows) ? cssVariableMapping.rows : [];
  const colorRampFamilies = Object.keys(profile.colorRamps || {});
  const colorModes = REQUIRED_SKIN_READINESS.modes.filter(mode => profile.colorModes && profile.colorModes[mode]);
  const dayCycleVariants = Object.keys((profile.dayCycle && profile.dayCycle.variants) || {});
  const dayCycleCssVariables = cssRows
    .filter(row => /^dayCycle\.variants\./.test(String(row.token || '')))
    .map(row => row.cssVariable)
    .filter(Boolean)
    .sort();
  const motionCurves = Object.keys((profile.motion && profile.motion.curves) || {});
  const motionIntents = (profile.motion && Array.isArray(profile.motion.intents) ? profile.motion.intents : []).map(intent => intent.id).filter(Boolean);
  const materialitySurfaces = (profile.materiality && Array.isArray(profile.materiality.surfaces) ? profile.materiality.surfaces : []).map(surface => surface.id).filter(Boolean);
  const cssVariableMappings = cssRows.length;
  const materialityCssVariables = cssRows
    .filter(row => REQUIRED_SKIN_READINESS.materialityCssVariables.includes(row.cssVariable))
    .map(row => row.cssVariable)
    .filter(Boolean)
    .sort();
  const motionCssVariables = cssRows
    .filter(row => /^motion\.(settleDurations|curves)\./.test(String(row.token || '')))
    .map(row => row.cssVariable)
    .filter(Boolean)
    .sort();
  const bloomThemes = Array.isArray(valueBloom.themes) ? valueBloom.themes.map(theme => theme.id).filter(Boolean) : [];
  const bloomCssVariables = cssRows
    .filter(row => REQUIRED_SKIN_READINESS.bloomCssVariables.includes(row.cssVariable))
    .map(row => row.cssVariable)
    .filter(Boolean)
    .sort();
  const bloomCoverage = bloomProjection.coverage || {};

  const items = [
    skinReadinessItem({
      id: 'h1-palette',
      label: 'H1 enriched palette and mode aliases',
      consumer: 'Claude H1 enriched biophilic palette pass',
      paths: [
        `profiles.${sourceProfile}.colorRamps`,
        `profiles.${sourceProfile}.colorModes`,
        'cssVariableMapping.rows'
      ],
      evidence: {
        colorRampFamilies,
        colorModes,
        cssVariableMappings
      },
      ready: hasAll(colorRampFamilies, REQUIRED_SKIN_READINESS.colorRamps)
        && hasAll(colorModes, REQUIRED_SKIN_READINESS.modes)
        && cssVariableMappings > 0,
      appOwnedNext: 'Pilot the palette in the running app and keep AA contrast checks green.'
    }),
    skinReadinessItem({
      id: 'h2-day-cycle',
      label: 'H2 dawn/noon/dusk/night variants',
      consumer: 'Claude H2 day-cycle skin pass',
      paths: [`profiles.${sourceProfile}.dayCycle.variants`],
      evidence: {
        variants: dayCycleVariants,
        defaultMode: profile.dayCycle && profile.dayCycle.defaultMode,
        cssVariables: dayCycleCssVariables
      },
      ready: hasAll(dayCycleVariants, REQUIRED_SKIN_READINESS.dayCycleVariants)
        && profile.dayCycle && profile.dayCycle.defaultMode === 'noon'
        && hasAll(dayCycleCssVariables, REQUIRED_SKIN_READINESS.dayCycleCssVariables),
      appOwnedNext: 'Wear variants only when the app can keep contrast, user agency, and reduced-motion behavior intact.'
    }),
    skinReadinessItem({
      id: 'h3-motion',
      label: 'H3 nature-paced motion intents',
      consumer: 'Claude H3 nature-paced motion skin pass',
      paths: [
        `profiles.${sourceProfile}.motion.curves`,
        `profiles.${sourceProfile}.motion.settleDurations`,
        `profiles.${sourceProfile}.motion.intents`,
        `profiles.${sourceProfile}.motion.reducedMotionPolicy`
      ],
      evidence: {
        curves: motionCurves,
        intents: motionIntents,
        cssVariables: motionCssVariables,
        maxMovingElements: profile.motion && profile.motion.maxMovingElements,
        reducedMotion: profile.motion && profile.motion.reducedMotion
      },
      ready: profile.motion && profile.motion.status === 'h3-token-substrate'
        && hasAll(motionCurves, REQUIRED_SKIN_READINESS.motionCurves)
        && hasAll(motionIntents, REQUIRED_SKIN_READINESS.motionIntents)
        && hasAll(motionCssVariables, REQUIRED_SKIN_READINESS.motionCssVariables),
      appOwnedNext: 'Map app transitions to the named intents; never add engagement loops or motion-gated evidence.'
    }),
    skinReadinessItem({
      id: 'h4-value-bloom',
      label: 'H4 value-bloom colors and signed vectors',
      consumer: 'Claude H4 values-bloom verdict card prototype',
      paths: [
        'valueBloom.themes',
        'valueBloom.signatureCoverage',
        'valueBloom.previewFixtures',
        'app/data/* valueSignature'
      ],
      evidence: {
        themes: bloomThemes,
        cssVariables: bloomCssVariables,
        signedEntries: bloomCoverage.signedEntries || 0,
        drawableEntries: bloomCoverage.drawableEntries || 0,
        missingSignatureEntries: bloomCoverage.missingSignatureEntries || 0,
        staleSignatureEntries: bloomCoverage.staleSignatureEntries || 0,
        previewFixtures: Array.isArray(valueBloom.previewFixtures) ? valueBloom.previewFixtures.length : 0
      },
      ready: valueBloom.status === 'h4-token-substrate'
        && hasAll(bloomThemes, valueBloom.order || [])
        && hasAll(bloomCssVariables, REQUIRED_SKIN_READINESS.bloomCssVariables)
        && (bloomCoverage.signedEntries || 0) > 0
        && (bloomCoverage.missingSignatureEntries || 0) === 0
        && (bloomCoverage.staleSignatureEntries || 0) === 0
        && Array.isArray(valueBloom.previewFixtures)
        && valueBloom.previewFixtures.length >= 3,
      appOwnedNext: 'Render the bloom as a visual summary of already-visible scores, not as new evidence.'
    }),
    skinReadinessItem({
      id: 'h5-materiality',
      label: 'H5 paper grain and warm materiality',
      consumer: 'Claude H5 materiality skin pass',
      paths: [
        `profiles.${sourceProfile}.materiality.paperGrain`,
        `profiles.${sourceProfile}.materiality.shadow`,
        `profiles.${sourceProfile}.materiality.surfaces`
      ],
      evidence: {
        surfaces: materialitySurfaces,
        cssVariables: materialityCssVariables,
        paperGrainOpacity: profile.materiality && profile.materiality.paperGrain && profile.materiality.paperGrain.opacity,
        shadowStyle: profile.materiality && profile.materiality.shadow && profile.materiality.shadow.style
      },
      ready: profile.materiality && profile.materiality.status === 'h5-token-substrate'
        && hasAll(materialitySurfaces, REQUIRED_SKIN_READINESS.materialitySurfaces)
        && hasAll(materialityCssVariables, REQUIRED_SKIN_READINESS.materialityCssVariables),
      appOwnedNext: 'Use materiality sparingly in app surfaces; no remote textures, animated grain, or nested card stacks.'
    })
  ];
  const ready = items.filter(item => item.status === 'ready').length;

  return {
    status: ready === items.length ? 'substrate-ready' : 'blocked',
    consumer: 'Claude biophilic skin pass',
    sourceProfile,
    generatedFrom: [
      rel(SOURCE),
      'app/data/*.json valueSignature'
    ],
    dataOnlyDrain: false,
    appOwnedNext: 'Wear this substrate in app/app.js and app/styles.css, then judge the running app visually and accessibly; this generated contract is not visual sign-off.',
    items,
    coverage: {
      required: items.length,
      ready,
      blocked: items.length - ready,
      substrateOnly: true
    },
    mustNot: [
      'Do not treat substrate readiness as app/design drain evidence.',
      'Do not use the bloom as evidence beyond the underlying scores.',
      'Do not weaken contrast, reduced-motion, or no-engagement rules to wear the skin.'
    ]
  };
}

function hexToRgb(hex) {
  const normalized = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255
  };
}

function linear(channel) {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
}

function contrastRatio(foreground, background) {
  const fg = luminance(foreground);
  const bg = luminance(background);
  if (fg == null || bg == null) return null;
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function tokenValue(profile, group, key) {
  const token = profile.tokens && profile.tokens[group] && profile.tokens[group][key];
  if (!token) return undefined;
  return typeof token === 'object' && token.value != null ? token.value : token;
}

function tokenPathValue(profile, tokenPath) {
  const parts = String(tokenPath || '').split('.');
  let cursor = profile.tokens || {};
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object' || !(part in cursor)) return undefined;
    cursor = cursor[part];
  }
  return cursor && typeof cursor === 'object' && cursor.value != null ? cursor.value : cursor;
}

function sourceTokenPathValue(source, profile, tokenPath) {
  const bloomMatch = /^valueBloom\.themes\.([a-z]+)\.(petalColor|centerColor)$/.exec(String(tokenPath || ''));
  if (bloomMatch) {
    const theme = ((source.valueBloom && source.valueBloom.themes) || []).find(item => item.id === bloomMatch[1]);
    return theme ? theme[bloomMatch[2]] : undefined;
  }
  return tokenPathValue(profile, tokenPath);
}

function cssValue(tokenPath, value) {
  if (value == null) return '';
  if (/^motion\.(duration|settleDurations)/i.test(tokenPath) && Number.isFinite(value)) return `${value}ms`;
  if (/^materiality\.paperGrain\.scalePx$/i.test(tokenPath) && Number.isFinite(value)) return `${value}px`;
  return String(value);
}

function cssVariables(profile) {
  const vars = {};
  const colors = (profile.tokens && profile.tokens.color) || {};
  for (const [key, token] of Object.entries(colors)) {
    vars[`--ov-${profile.id}-color-${key}`] = token.value;
  }
  for (const group of ['space', 'radius', 'elevation']) {
    const tokens = (profile.tokens && profile.tokens[group]) || {};
    for (const [key, value] of Object.entries(tokens)) {
      vars[`--ov-${profile.id}-${group}-${key}`] = value;
    }
  }
  const typography = (profile.tokens && profile.tokens.typography) || {};
  for (const [key, token] of Object.entries(typography)) {
    vars[`--ov-${profile.id}-font-${key}`] = token.family;
    vars[`--ov-${profile.id}-font-size-${key}`] = token.size;
    vars[`--ov-${profile.id}-line-height-${key}`] = String(token.lineHeight);
  }
  const motion = (profile.tokens && profile.tokens.motion) || {};
  for (const key of ['durationFast', 'durationBase', 'durationSlow', 'durationRerank', 'easing']) {
    if (motion[key] != null) vars[`--ov-${profile.id}-motion-${key}`] = String(motion[key]);
  }
  return vars;
}

function contrastResults(profile) {
  return (profile.contrastPairs || []).map(pair => {
    const foreground = tokenValue(profile, 'color', pair.fg);
    const background = tokenValue(profile, 'color', pair.bg);
    const ratio = contrastRatio(foreground, background);
    return {
      id: pair.id,
      fg: pair.fg,
      bg: pair.bg,
      purpose: pair.purpose,
      foreground,
      background,
      minimum: pair.minimum,
      ratio: ratio == null ? null : Number(ratio.toFixed(2)),
      pass: ratio != null && ratio >= pair.minimum
    };
  });
}

function summarizeProfile(profile) {
  const contrast = contrastResults(profile);
  const summary = {
    id: profile.id,
    label: profile.label,
    role: profile.role,
    status: profile.status,
    summary: profile.summary,
    cssVariables: cssVariables(profile),
    colorTokens: Object.entries((profile.tokens && profile.tokens.color) || {}).map(([id, token]) => ({
      id,
      value: token.value,
      role: token.role
    })),
    colorRamps: clone((profile.tokens && profile.tokens.colorRamps) || {}),
    colorModes: clone((profile.tokens && profile.tokens.colorModes) || {}),
    typography: clone((profile.tokens && profile.tokens.typography) || {}),
    space: clone((profile.tokens && profile.tokens.space) || {}),
    radius: clone((profile.tokens && profile.tokens.radius) || {}),
    motion: clone((profile.tokens && profile.tokens.motion) || {}),
    elevation: clone((profile.tokens && profile.tokens.elevation) || {}),
    contrast,
    contrastSummary: {
      pairs: contrast.length,
      pass: contrast.filter(pair => pair.pass).length,
      fail: contrast.filter(pair => !pair.pass).length,
      minimumRatio: contrast.length ? Math.min(...contrast.map(pair => pair.ratio || 0)) : null
    },
    componentContracts: clone(profile.componentContracts || []),
    artTokens: clone(profile.artTokens || [])
  };
  const dayCycle = clone((profile.tokens && profile.tokens.dayCycle) || {});
  if (Object.keys(dayCycle).length) summary.dayCycle = dayCycle;
  const materiality = clone((profile.tokens && profile.tokens.materiality) || {});
  if (Object.keys(materiality).length) summary.materiality = materiality;
  return summary;
}

function buildDesignTokenIndex() {
  const sourceText = fs.readFileSync(SOURCE, 'utf8');
  const source = JSON.parse(sourceText);
  const profiles = (source.profiles || []).map(summarizeProfile);
  const allContrast = profiles.flatMap(profile => profile.contrast);
  const profileIds = profiles.map(profile => profile.id).sort();
  const valueBloom = clone(source.valueBloom || {});
  const bloomThemes = Array.isArray(valueBloom.themes) ? valueBloom.themes : [];
  const bloomProjection = scanValueSignatureCoverage(valueBloom);
  valueBloom.signatureCoverage = clone(bloomProjection.coverage);
  valueBloom.previewFixtures = clone(bloomProjection.previewFixtures);
  const cssVariableMapping = clone(source.cssVariableMapping || {});
  const cssVariableMappingRows = Array.isArray(cssVariableMapping.rows) ? cssVariableMapping.rows.length : 0;
  const sourceProfile = cssVariableMapping.sourceProfile || 'quiet-commons';
  const contrastRemediationContract = clone(source.contrastRemediationContract || {});
  const contrastRemediationSteps = Array.isArray(contrastRemediationContract.steps) ? contrastRemediationContract.steps.length : 0;
  const appCssInjection = {
    status: 'build-time-injected',
    sourceProfile,
    source: rel(SOURCE),
    target: rel(STYLE_OUT),
    markerStart: CSS_BEGIN,
    markerEnd: CSS_END,
    runtimeFetch: false,
    note: 'pipeline/build_design_tokens.js rewrites only the fenced CSS custom-property block in app/styles.css; the rest of the stylesheet remains app-owned.'
  };
  const skinReadiness = buildSkinReadiness(profiles, valueBloom, bloomProjection, cssVariableMapping, appCssInjection);
  const artKinds = new Set();
  for (const profile of profiles) {
    for (const art of profile.artTokens || []) artKinds.add(art.kind);
  }

  return {
    format: 'open-values-design-token-index',
    version: '0.1.0',
    standard: 'open-values-standard',
    built: source.updated,
    purpose: 'Generated app-readable index for biophilic design tokens, computed contrast, component contracts, and SVG art tokens.',
    generatedFrom: {
      path: rel(SOURCE),
      updated: source.updated,
      sha256: sha256(sourceText)
    },
    principles: clone(source.principles || []),
    references: clone(source.references || []),
    valueBloom,
    valueSignatureCoverage: clone(bloomProjection.coverage),
    cssVariableMapping,
    appCssInjection,
    contrastRemediationContract,
    skinReadiness,
    counts: {
      profiles: profiles.length,
      colorTokens: profiles.reduce((sum, profile) => sum + profile.colorTokens.length, 0),
      contrastPairs: allContrast.length,
      passingContrastPairs: allContrast.filter(pair => pair.pass).length,
      failingContrastPairs: allContrast.filter(pair => !pair.pass).length,
      componentContracts: profiles.reduce((sum, profile) => sum + profile.componentContracts.length, 0),
      cssVariableMappings: cssVariableMappingRows,
      appCssVariables: cssVariableMappingRows,
      contrastRemediationSteps,
      bloomThemes: bloomThemes.length,
      valueSignatures: bloomProjection.coverage.signedEntries,
      drawableBloomEntries: bloomProjection.coverage.drawableEntries,
      bloomPreviewFixtures: bloomProjection.previewFixtures.length,
      colorRampFamilies: profiles.reduce((sum, profile) => sum + Object.keys(profile.colorRamps || {}).length, 0),
      colorModes: profiles.reduce((sum, profile) => {
        const modes = profile.colorModes || {};
        return sum + ['light', 'dark'].filter(mode => modes[mode]).length;
      }, 0),
      dayCycleVariants: profiles.reduce((sum, profile) => sum + Object.keys(profile.dayCycle?.variants || {}).length, 0),
      materialitySurfaces: profiles.reduce((sum, profile) => sum + (Array.isArray(profile.materiality?.surfaces) ? profile.materiality.surfaces.length : 0), 0),
      motionCurves: profiles.reduce((sum, profile) => sum + Object.keys(profile.motion?.curves || {}).length, 0),
      motionIntents: profiles.reduce((sum, profile) => sum + (Array.isArray(profile.motion?.intents) ? profile.motion.intents.length : 0), 0),
      skinReadinessItems: skinReadiness.items.length,
      artTokens: profiles.reduce((sum, profile) => sum + profile.artTokens.length, 0),
      artKinds: artKinds.size
    },
    filters: {
      profiles: profileIds,
      roles: [...new Set(profiles.map(profile => profile.role))].sort(),
      bloomThemes: bloomThemes.map(theme => theme.id).sort(),
      drawableBloomCategories: [...new Set(bloomProjection.previewFixtures.map(item => item.category))].sort(),
      dayCycleVariants: [...new Set(profiles.flatMap(profile => Object.keys(profile.dayCycle?.variants || {})))].sort(),
      motionIntents: [...new Set(profiles.flatMap(profile => (profile.motion?.intents || []).map(intent => intent.id).filter(Boolean)))].sort(),
      skinReadiness: skinReadiness.items.map(item => item.id).sort(),
      artKinds: [...artKinds].sort()
    },
    profiles
  };
}

function appCssTokenLines(index) {
  const sourceProfile = index.appCssInjection?.sourceProfile || index.cssVariableMapping?.sourceProfile || 'quiet-commons';
  const profile = (index.profiles || []).find(item => item.id === sourceProfile);
  const source = readJson(SOURCE);
  const sourceProfileTokens = (source.profiles || []).find(item => item.id === sourceProfile);
  const rows = (index.cssVariableMapping && index.cssVariableMapping.rows) || [];
  if (!profile || !sourceProfileTokens || !rows.length) {
    throw new Error(`cannot build app CSS token block for profile ${sourceProfile}`);
  }
  return rows.map(row => {
    const value = cssValue(row.token, sourceTokenPathValue(source, sourceProfileTokens, row.token));
    if (!value) throw new Error(`missing token value for ${row.cssVariable} <- ${row.token}`);
    return `  ${row.cssVariable}:${value};`;
  });
}

function appCssTokenBlock(index) {
  const lines = appCssTokenLines(index);
  return [
    `  ${CSS_BEGIN}`,
    '  /* Source: content/design/tokens.json -> app/data/design-tokens.json. Edit the token source, then run npm run build. */',
    ...lines,
    `  ${CSS_END}`
  ].join('\n');
}

function injectAppCssTokens(css, index) {
  const block = appCssTokenBlock(index);
  const start = css.indexOf(CSS_BEGIN);
  const end = css.indexOf(CSS_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`missing generated design-token markers in ${rel(STYLE_OUT)}`);
  }
  const lineStart = css.lastIndexOf('\n', start) + 1;
  const lineEnd = css.indexOf('\n', end);
  const afterEnd = lineEnd === -1 ? css.length : lineEnd + 1;
  return css.slice(0, lineStart) + block + '\n' + css.slice(afterEnd);
}

function writeOutput(index) {
  fs.writeFileSync(OUT, formatJson(index));
  const css = fs.readFileSync(STYLE_OUT, 'utf8');
  fs.writeFileSync(STYLE_OUT, injectAppCssTokens(css, index));
}

function checkOutput(index) {
  const drift = [];
  if (!fs.existsSync(OUT)) drift.push('app/data/design-tokens.json is missing');
  else if (fs.readFileSync(OUT, 'utf8') !== formatJson(index)) drift.push('app/data/design-tokens.json');
  if (!fs.existsSync(STYLE_OUT)) drift.push('app/styles.css is missing');
  else {
    try {
      const css = fs.readFileSync(STYLE_OUT, 'utf8');
      if (injectAppCssTokens(css, index) !== css) drift.push('app/styles.css design-token block');
    } catch (err) {
      drift.push(`app/styles.css design-token block (${err.message})`);
    }
  }
  return drift;
}

function main() {
  try {
    const index = buildDesignTokenIndex();
    if (process.argv.includes('--check')) {
      const drift = checkOutput(index);
      if (drift.length) {
        console.log('build_design_tokens: generated output is stale');
        for (const item of drift) console.log('  ' + item);
        process.exit(1);
      }
      console.log(`build_design_tokens: output current (${index.counts.profiles} profiles, ${index.counts.contrastPairs} contrast pairs)`);
      return;
    }
    writeOutput(index);
    console.log(`build_design_tokens: wrote app/data/design-tokens.json + app/styles.css token block (${index.counts.profiles} profiles, ${index.counts.contrastPairs} contrast pairs)`);
  } catch (err) {
    console.error('build_design_tokens FAILED:', err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  OUT,
  STYLE_OUT,
  appCssTokenBlock,
  injectAppCssTokens,
  buildDesignTokenIndex,
  contrastRatio,
  formatJson
};
