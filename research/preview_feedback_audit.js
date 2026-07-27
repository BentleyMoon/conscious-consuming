#!/usr/bin/env node
/* Preview + feedback readiness audit for Values Commons.

   This checks the last-mile package: the built dist mode, reviewer/tester
   instructions, feedback loop, and public-readiness posture. It deliberately
   accepts either private-preview or public-production dist output, but verifies
   that whichever mode exists is internally coherent.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];
const EXPECTED_SURFACES = [
  'app',
  'kosplora',
  'instances',
  'assembly',
  'workshop',
  'slate',
  'tour',
  'funders',
  'standard',
  'passport',
  'contribute',
  'weave'
];
const EXPECTED_DOCS = [
  'GRANT-ONE-PAGER',
  'GRANT-PREVIEW-PATH',
  'DEPLOY-AND-SHARE',
  'PREVIEW-FEEDBACK-LOOP',
  'R1-REVIEW',
  'ADOPTION-KIT',
  'FEDERATION',
  'VALUES-PASSPORT',
  'CREATE-AN-INSTANCE',
  'INSTANCE-2-KOSPLORA',
  'STANDARD-v0',
  'THE-VALUES-LAYER',
  'THE-WEAVE'
];
const ROUTE_PAGES = [
  'index.html',
  'app/index.html',
  'standard/index.html',
  'passport/index.html',
  'instances/index.html',
  'instances/new/index.html',
  'instances/messages/index.html',
  'contribute/index.html',
  'weave/index.html',
  'kosplora/index.html',
  'assembly/index.html',
  'workshop/index.html',
  'slate/index.html',
  'tour/index.html',
  'funders/index.html',
  'awards/index.html'
];
const FORBIDDEN_DIST_PATHS = [
  'content',
  'pipeline',
  'research',
  'scripts',
  '.git',
  'node_modules',
  'package.json',
  'package-lock.json'
];
const MODE_ARG = process.argv.find(arg => arg.startsWith('--mode='));
const REQUIRED_MODE = MODE_ARG ? MODE_ARG.slice('--mode='.length) : '';
const DIST_ARG = process.argv.find(arg => arg.startsWith('--dist-dir='));
const DIST_ROOT = DIST_ARG ? path.resolve(ROOT, DIST_ARG.slice('--dist-dir='.length)) : path.join(ROOT, 'dist');
const DIST_LABEL = path.relative(ROOT, DIST_ROOT).replace(/\\/g, '/') || 'dist';
if (REQUIRED_MODE && !['private-preview', 'public-production'].includes(REQUIRED_MODE)) {
  console.error(`Unsupported --mode=${REQUIRED_MODE}. Use private-preview or public-production.`);
  process.exit(2);
}

function abs(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function distAbs(rel = '') {
  return path.join(DIST_ROOT, rel);
}

function distLabel(rel = '') {
  const clean = rel.replace(/\\/g, '/');
  return clean ? `${DIST_LABEL}/${clean}` : DIST_LABEL;
}

function existsDist(rel = '') {
  return fs.existsSync(distAbs(rel));
}

function isDistDir(rel = '') {
  return existsDist(rel) && fs.statSync(distAbs(rel)).isDirectory();
}

function isDir(rel) {
  return exists(rel) && fs.statSync(abs(rel)).isDirectory();
}

function read(rel) {
  if (!exists(rel)) {
    failures.push(`${rel}: missing file`);
    return '';
  }
  return fs.readFileSync(abs(rel), 'utf8');
}

function readJson(rel) {
  const text = read(rel);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    failures.push(`${rel}: invalid JSON (${err.message})`);
    return {};
  }
}

function readDist(rel) {
  if (!existsDist(rel)) {
    failures.push(`${distLabel(rel)}: missing file`);
    return '';
  }
  return fs.readFileSync(distAbs(rel), 'utf8');
}

function readDistJson(rel) {
  const text = readDist(rel);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    failures.push(`${distLabel(rel)}: invalid JSON (${err.message})`);
    return {};
  }
}

function distMetaTag(text, attrName, attrValue, contentAttr = 'content') {
  const re = new RegExp(`<meta\\b(?=[^>]*\\b${attrName}=["']${attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'])[^>]*\\b${contentAttr}=["']([^"']+)["'][^>]*>`, 'i');
  const match = text.match(re);
  return match ? match[1] : '';
}

function distCanonical(text) {
  const match = text.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
  return match ? match[1] : '';
}

function siteOrigin(siteBase) {
  try {
    return new URL(siteBase).origin;
  } catch {
    return '';
  }
}

function routeUrl(rel, meta) {
  const base = String(meta.siteBase || '').replace(/\/+$/, '');
  const origin = siteOrigin(base);
  if (rel === 'app/index.html') return base ? `${base}/` : '';
  if (!origin) return '';
  if (rel === 'index.html') return `${origin}/`;
  return `${origin}/${rel.replace(/index\.html$/, '')}`;
}

function jsonLdBlocks(rel) {
  const text = readDist(rel);
  const blocks = [];
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of text.matchAll(re)) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch (err) {
      failures.push(`${distLabel(rel)}: invalid JSON-LD (${err.message})`);
    }
  }
  return blocks;
}

function findJsonLd(rel, pred, reason) {
  const found = jsonLdBlocks(rel).find(pred);
  if (!found) failures.push(`${distLabel(rel)}: missing ${reason}`);
  return found || {};
}

function distPngSize(rel) {
  if (!existsDist(rel)) {
    failures.push(`${distLabel(rel)}: missing PNG image`);
    return {};
  }
  const buf = fs.readFileSync(distAbs(rel));
  const sig = buf.slice(0, 8).toString('hex');
  if (sig !== '89504e470d0a1a0a' || buf.toString('ascii', 12, 16) !== 'IHDR') {
    failures.push(`${distLabel(rel)}: invalid PNG header`);
    return {};
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function expectDistPngSize(rel, width, height) {
  const size = distPngSize(rel);
  if (size.width && (size.width !== width || size.height !== height)) {
    failures.push(`${distLabel(rel)}: expected ${width}x${height} PNG, found ${size.width}x${size.height}`);
  }
}

function hasPriceField(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) return obj.some(hasPriceField);
  for (const [key, value] of Object.entries(obj)) {
    if (/^price$/i.test(key) || /^lowPrice$/i.test(key) || /^highPrice$/i.test(key) || /^priceSpecification$/i.test(key)) {
      return true;
    }
    if (key === 'propertyID' && /(^|:)price$/i.test(String(value))) return true;
    if (hasPriceField(value)) return true;
  }
  return false;
}

function expectFile(rel, reason) {
  if (!exists(rel)) failures.push(`${rel}: missing ${reason || 'required file'}`);
}

function expectDir(rel, reason) {
  if (!isDir(rel)) failures.push(`${rel}: missing ${reason || 'required directory'}`);
}

function expectDistFile(rel, reason) {
  if (!existsDist(rel)) failures.push(`${distLabel(rel)}: missing ${reason || 'required file'}`);
}

function expectDistDir(rel, reason) {
  if (!isDistDir(rel)) failures.push(`${distLabel(rel)}: missing ${reason || 'required directory'}`);
}

function expectIncludes(rel, needle, reason) {
  const text = read(rel);
  if (!text.includes(needle)) failures.push(`${rel}: missing ${reason || needle}`);
}

function expectNotIncludes(rel, needle, reason) {
  const text = read(rel);
  if (text.includes(needle)) failures.push(`${rel}: stale ${reason || needle}`);
}

function walk(dirRel, pred, out = []) {
  if (!isDir(dirRel)) return out;
  for (const ent of fs.readdirSync(abs(dirRel), { withFileTypes: true })) {
    const rel = path.join(dirRel, ent.name);
    if (ent.isDirectory()) walk(rel, pred, out);
    else if (!pred || pred(rel)) out.push(rel);
  }
  return out;
}

function walkDist(dirRel = '', pred, out = []) {
  if (!isDistDir(dirRel)) return out;
  for (const ent of fs.readdirSync(distAbs(dirRel), { withFileTypes: true })) {
    const rel = path.join(dirRel, ent.name);
    if (ent.isDirectory()) walkDist(rel, pred, out);
    else if (!pred || pred(rel)) out.push(rel);
  }
  return out;
}

function checkDocs() {
  for (const [rel, needles] of [
    ['docs/DEPLOY-AND-SHARE.md', ['npm run build:preview', 'npm run audit:preview', 'build-meta.json', 'invite, don\'t launch', 'one decision', 'adoption guide', 'R1-REVIEW.html', 'dist/release-preflight-check.json']],
    ['docs/GRANT-PREVIEW-PATH.md', ['npm run prepare:preview', 'noindexed', 'Do not claim public traction yet']],
    ['docs/PREVIEW-FEEDBACK-LOOP.md', ['20-50', 'one real decision', 'Invitation Materials', 'Invite Text', 'twenty names', 'Contact List', 'Send in Small Groups', 'first 5 invitations', 'R1 review', 'Three Ways to Test', 'Tester Notes', 'New subject', 'Did it help?', 'What was missing?', 'Did you trust it?', 'Feedback Worth Acting On']],
    ['docs/R1-REVIEW.md', ['R1 Review Gate', 'npm run r1:preflight', 'npm run prepare:preview', 'npm run audit:preview:private', 'npm run release:status', 'dist/r1-preflight-check.json', 'one real decision', 'first 5 testers', 'Pass to first 5', 'Patch first', 'Stop', 'R1 Receipt', 'Build stamp', 'Decision: Pass to first 5 / Patch first / Stop']],
    ['docs/ADOPTION-KIT.md', ['What to Record', 'short set of notes', 'Starting point', 'Next change']],
    ['docs/BETA-SELF-TEST.md', ['dist/', 'one real decision', 'Your notes never leave your device unless you choose to export']],
    ['docs/MATURITY-PROGRAM.md', ['Preview Feedback Gate', 'R1 review gate', 'npm run r1:preflight', 'npm run release:preflight', 'npm run audit:preview', 'npm run audit:r1', 'build-meta.json', 'dist/release-preflight-check.json']],
    ['docs/README.md', ['PREVIEW-FEEDBACK-LOOP.md', 'R1-REVIEW.md', 'npm run audit:preview']],
    ['README.md', ['npm run audit:preview']]
  ]) {
    for (const needle of needles) expectIncludes(rel, needle, `${rel} preview/feedback cue: ${needle}`);
  }

  for (const [rel, needles] of [
    ['docs/BETA-SELF-TEST.md', ['Drag-and-drop the `app/` folder', '57-category']],
    ['docs/PATH-TO-FIRST-USERS.md', ['57-category platform', 'Drag `app/`']],
    ['docs/DEPLOY-AND-SHARE.md', ['Drag `app/`']]
  ]) {
    for (const needle of needles) expectNotIncludes(rel, needle, `${rel} old preview instruction: ${needle}`);
  }

  expectIncludes('pipeline/build_site.py', "'PREVIEW-FEEDBACK-LOOP'", 'rendered feedback-loop doc');
}

function checkLinkedData(meta) {
  const base = String(meta.siteBase || '').replace(/\/+$/, '');
  const verdict = findJsonLd(
    'app/c/banking/chase.html',
    obj => obj && obj['@id'] === 'ovs:banking/chase',
    'entity JSON-LD for banking/chase',
  );
  if (verdict['@type'] !== 'Service') failures.push(`${distLabel('app/c/banking/chase.html')}: entity JSON-LD should use schema Service`);
  const expectedVerdictUrl = `${base}/c/banking/chase.html`;
  if (meta.mode === 'public-production' && verdict.url !== expectedVerdictUrl) {
    failures.push(`${distLabel('app/c/banking/chase.html')}: entity JSON-LD url should match package siteBase`);
  } else if (meta.mode !== 'public-production' && !/^https?:\/\//.test(String(verdict.url || ''))) {
    failures.push(`${distLabel('app/c/banking/chase.html')}: entity JSON-LD url should be absolute`);
  }
  const props = Array.isArray(verdict.additionalProperty) ? verdict.additionalProperty : [];
  if (!props.length) failures.push(`${distLabel('app/c/banking/chase.html')}: entity JSON-LD missing cited band properties`);
  if (!props.some(p => ['Strong', 'Good', 'Fair', 'Limited', 'Poor'].includes(p.value))) {
    failures.push(`${distLabel('app/c/banking/chase.html')}: entity JSON-LD should export coarse bands, not only numbers`);
  }
  if (!props.some(p => p.citation && p.dateModified)) {
    failures.push(`${distLabel('app/c/banking/chase.html')}: entity JSON-LD should carry citation URL and date`);
  }
  if (hasPriceField(verdict)) failures.push(`${distLabel('app/c/banking/chase.html')}: entity JSON-LD should not export structural price fields`);

  const guide = findJsonLd(
    'app/g/digital-literacy.html',
    obj => obj && obj['@type'] === 'Article',
    'Article JSON-LD for digital-literacy guide',
  );
  if (!guide.headline || !guide.description || !guide.url) {
    failures.push(`${distLabel('app/g/digital-literacy.html')}: Article JSON-LD missing headline, description, or url`);
  }
  if (!guide.dateModified) failures.push(`${distLabel('app/g/digital-literacy.html')}: Article JSON-LD missing dateModified`);
  if (guide.license !== 'https://creativecommons.org/licenses/by-sa/4.0/') {
    failures.push(`${distLabel('app/g/digital-literacy.html')}: Article JSON-LD should carry guide license`);
  }
  const guideText = readDist('app/g/digital-literacy.html');
  const guideOgImage = distMetaTag(guideText, 'property', 'og:image');
  const guideTwitterCard = distMetaTag(guideText, 'name', 'twitter:card');
  const guideTwitterImage = distMetaTag(guideText, 'name', 'twitter:image');
  const expectedGuideImage = `${base}/g/digital-literacy.png`;
  if (meta.mode === 'public-production' && guideOgImage !== expectedGuideImage) {
    failures.push(`${distLabel('app/g/digital-literacy.html')}: guide og:image should match package siteBase`);
  } else if (meta.mode !== 'public-production' && !/^https?:\/\//.test(String(guideOgImage || ''))) {
    failures.push(`${distLabel('app/g/digital-literacy.html')}: guide og:image should be absolute`);
  }
  if (guideTwitterCard !== 'summary_large_image') {
    failures.push(`${distLabel('app/g/digital-literacy.html')}: guide twitter:card should be summary_large_image`);
  }
  if (guideTwitterImage !== guideOgImage) {
    failures.push(`${distLabel('app/g/digital-literacy.html')}: guide twitter:image should match og:image`);
  }
  if (meta.mode === 'public-production' && guide.image !== expectedGuideImage) {
    failures.push(`${distLabel('app/g/digital-literacy.html')}: Article JSON-LD image should match guide OG image`);
  } else if (meta.mode !== 'public-production' && !/^https?:\/\//.test(String(guide.image || ''))) {
    failures.push(`${distLabel('app/g/digital-literacy.html')}: Article JSON-LD image should be absolute`);
  }
  expectDistPngSize('app/g/digital-literacy.png', 1200, 630);
  expectDistPngSize('app/g/index.png', 1200, 630);

  const guideIndex = findJsonLd(
    'app/g/index.html',
    obj => obj && obj['@type'] === 'CollectionPage',
    'CollectionPage JSON-LD for guides index',
  );
  if (!guideIndex.url || !guideIndex.isPartOf) {
    failures.push(`${distLabel('app/g/index.html')}: guides index JSON-LD missing url or isPartOf`);
  }
}

function checkDist() {
  if (!existsDist()) {
    warnings.push(`${DIST_LABEL}/ missing; run npm run build:preview or npm run build before sharing.`);
    return;
  }

  for (const rel of [
    'index.html',
    'app/index.html',
    'tour/index.html',
    'funders/index.html',
    'contribute/index.html',
    'docs/GRANT-ONE-PAGER.html',
    'docs/GRANT-PREVIEW-PATH.html',
    'docs/PREVIEW-FEEDBACK-LOOP.html',
    'docs/R1-REVIEW.html',
    'docs/ADOPTION-KIT.html',
    'README-FLASH-DRIVE.txt',
    'build-meta.json',
    '.well-known/open-values.json',
    'stacks/index.json',
    'robots.txt',
    '_headers',
    'netlify.toml',
    '404.html'
  ]) {
    expectDistFile(rel, 'preview/public package artifact');
  }

  const robots = readDist('robots.txt');
  const headers = readDist('_headers');
  const netlify = readDist('netlify.toml');
  const meta = readDistJson('build-meta.json');
  const preview = meta.mode === 'private-preview';
  const pub = meta.mode === 'public-production';

  if (meta.mode && !preview && !pub) failures.push(`dist/build-meta.json: unsupported mode ${meta.mode}`);
  if (!meta.mode) failures.push('dist/build-meta.json: missing mode');
  if (REQUIRED_MODE && meta.mode !== REQUIRED_MODE) {
    failures.push(`dist/build-meta.json: expected ${REQUIRED_MODE}, found ${meta.mode || '(missing)'}`);
  }
  if (!meta.siteBase || typeof meta.siteBase !== 'string') failures.push('dist/build-meta.json: missing siteBase');
  if (!meta.generatedAt || Number.isNaN(Date.parse(meta.generatedAt))) failures.push('dist/build-meta.json: missing or invalid generatedAt');
  if (!Array.isArray(meta.surfaces)) failures.push('dist/build-meta.json: surfaces must be an array');
  if (!Array.isArray(meta.docsRendered)) failures.push('dist/build-meta.json: docsRendered must be an array');

  for (const surface of EXPECTED_SURFACES) {
    if (Array.isArray(meta.surfaces) && !meta.surfaces.includes(surface)) {
      failures.push(`dist/build-meta.json: missing surface ${surface}`);
    }
    expectDistDir(surface, `packaged surface ${surface}`);
    expectDistFile(`${surface}/index.html`, `surface entry ${surface}/index.html`);
  }
  for (const doc of EXPECTED_DOCS) {
    if (Array.isArray(meta.docsRendered) && !meta.docsRendered.includes(doc)) {
      failures.push(`dist/build-meta.json: missing rendered doc ${doc}`);
    }
    expectDistFile(`docs/${doc}.html`, `rendered doc ${doc}.html`);
  }
  for (const rel of FORBIDDEN_DIST_PATHS) {
    if (existsDist(rel)) failures.push(`${distLabel(rel)}: source/internal path must not be packaged`);
  }

  for (const rel of ROUTE_PAGES) {
    if (!existsDist(rel)) continue;
    const text = readDist(rel);
    const expectedUrl = routeUrl(rel, meta);
    const canonical = distCanonical(text);
    const ogUrl = distMetaTag(text, 'property', 'og:url');
    const ogType = distMetaTag(text, 'property', 'og:type');
    const ogTitle = distMetaTag(text, 'property', 'og:title');
    const ogDescription = distMetaTag(text, 'property', 'og:description');
    const ogImage = distMetaTag(text, 'property', 'og:image');
    const twitterCard = distMetaTag(text, 'name', 'twitter:card');
    const twitterImage = distMetaTag(text, 'name', 'twitter:image');

    if (canonical !== expectedUrl) failures.push(`${distLabel(rel)}: canonical should be ${expectedUrl || '(known route URL)'}`);
    if (ogUrl !== expectedUrl) failures.push(`${distLabel(rel)}: og:url should be ${expectedUrl || '(known route URL)'}`);
    if (ogType !== 'website') failures.push(`${distLabel(rel)}: og:type should be website`);
    if (!ogTitle) failures.push(`${distLabel(rel)}: missing og:title`);
    if (!ogDescription) failures.push(`${distLabel(rel)}: missing og:description`);
    if (!/^https?:\/\//.test(ogImage)) failures.push(`${distLabel(rel)}: og:image should be absolute`);
    if (twitterCard !== 'summary_large_image') failures.push(`${distLabel(rel)}: twitter:card should be summary_large_image`);
    if (!/^https?:\/\//.test(twitterImage)) failures.push(`${distLabel(rel)}: twitter:image should be absolute`);
  }
  for (const rel of walkDist('', f => f.toLowerCase().endsWith('.md'))) {
    failures.push(`${distLabel(rel)}: raw Markdown should not be packaged; render or exclude it`);
  }

  checkLinkedData(meta);

  if (preview) {
    if (!/Disallow:\s*\//.test(robots)) failures.push(`${distLabel('robots.txt')}: preview build should disallow indexing`);
    if (!/X-Robots-Tag:\s*noindex/i.test(headers)) failures.push(`${distLabel('_headers')}: preview build should emit noindex header`);
    if (!/X-Robots-Tag\s*=\s*"noindex/i.test(netlify)) failures.push(`${distLabel('netlify.toml')}: preview build should emit noindex header`);
    if (meta.appDataFallback !== true) failures.push(`${distLabel('build-meta.json')}: preview build should declare appDataFallback=true`);
    if (!existsDist('app/data.js')) failures.push(`${distLabel('app/data.js')}: preview build should keep file:// fallback bundle`);
  } else if (pub) {
    if (!/Sitemap:/i.test(robots)) failures.push(`${distLabel('robots.txt')}: public build should advertise sitemap`);
    if (!/workers\.dev/i.test(headers) || !/X-Robots-Tag:\s*noindex/i.test(headers)) {
      failures.push(`${distLabel('_headers')}: public build should noindex workers.dev fallback while allowing custom domain`);
    }
    if (meta.appDataFallback !== false) failures.push(`${distLabel('build-meta.json')}: public build should declare appDataFallback=false`);
    if (existsDist('app/data.js')) failures.push(`${distLabel('app/data.js')}: public Cloudflare build should omit oversized fallback bundle`);
  }

  if (existsDist('release-check.json')) {
    const receipt = readDistJson('release-check.json');
    if (receipt.schema !== 'values-commons-release-check-v1') {
      failures.push(`${distLabel('release-check.json')}: unsupported or missing schema`);
    }
    if (receipt.status !== 'passed') failures.push(`${distLabel('release-check.json')}: status should be passed`);
    if (receipt.mode !== meta.mode) failures.push(`${distLabel('release-check.json')}: mode ${receipt.mode || '(missing)'} does not match build-meta ${meta.mode || '(missing)'}`);
    if (receipt.siteBase !== meta.siteBase) failures.push(`${distLabel('release-check.json')}: siteBase does not match build-meta`);
    if (receipt.buildMetaGeneratedAt !== meta.generatedAt) failures.push(`${distLabel('release-check.json')}: buildMetaGeneratedAt does not match build-meta generatedAt`);
    if (receipt.appDataFallback !== meta.appDataFallback) failures.push(`${distLabel('release-check.json')}: appDataFallback does not match build-meta`);
    if (!Array.isArray(receipt.checks) || receipt.checks.length < 2) failures.push(`${distLabel('release-check.json')}: missing release checks`);
    if (!receipt.preparedAt || Number.isNaN(Date.parse(receipt.preparedAt))) failures.push(`${distLabel('release-check.json')}: missing or invalid preparedAt`);
  }

  if (existsDist('package-mode-check.json')) {
    const receipt = readDistJson('package-mode-check.json');
    if (receipt.schema === 'values-commons-package-mode-check-v1') {
      if (receipt.status !== 'passed') failures.push(`${distLabel('package-mode-check.json')}: status should be passed`);
      if (receipt.finalDistMode !== meta.mode) failures.push(`${distLabel('package-mode-check.json')}: finalDistMode should match build-meta mode`);
      if (receipt.finalSiteBase !== meta.siteBase) failures.push(`${distLabel('package-mode-check.json')}: finalSiteBase should match build-meta siteBase`);
      if (receipt.buildMetaGeneratedAt !== meta.generatedAt) failures.push(`${distLabel('package-mode-check.json')}: buildMetaGeneratedAt should match build-meta generatedAt`);
      if (!receipt.checkedAt || Number.isNaN(Date.parse(receipt.checkedAt))) failures.push(`${distLabel('package-mode-check.json')}: missing or invalid checkedAt`);
    } else if (receipt.schema === 'values-commons-package-mode-check-v2') {
      if (receipt.status !== 'passed') failures.push(`${distLabel('package-mode-check.json')}: status should be passed`);
      if (!receipt.checkedAt || Number.isNaN(Date.parse(receipt.checkedAt))) failures.push(`${distLabel('package-mode-check.json')}: missing or invalid checkedAt`);
      if (receipt.privatePreview?.mode !== 'private-preview') failures.push(`${distLabel('package-mode-check.json')}: missing private-preview lane`);
      if (receipt.publicProduction?.mode !== 'public-production') failures.push(`${distLabel('package-mode-check.json')}: missing public-production lane`);
      if (receipt.privatePreview?.appDataFallback !== true) failures.push(`${distLabel('package-mode-check.json')}: private-preview lane should include appDataFallback=true`);
      if (receipt.publicProduction?.appDataFallback !== false) failures.push(`${distLabel('package-mode-check.json')}: public-production lane should include appDataFallback=false`);
      if (receipt.currentDist) {
        if (receipt.currentDist.mode !== meta.mode) failures.push(`${distLabel('package-mode-check.json')}: currentDist mode should match build-meta`);
        if (receipt.currentDist.siteBase !== meta.siteBase) failures.push(`${distLabel('package-mode-check.json')}: currentDist siteBase should match build-meta`);
        if (receipt.currentDist.buildMetaGeneratedAt !== meta.generatedAt) failures.push(`${distLabel('package-mode-check.json')}: currentDist buildMetaGeneratedAt should match build-meta`);
        if (receipt.currentDist.appDataFallback !== meta.appDataFallback) failures.push(`${distLabel('package-mode-check.json')}: currentDist appDataFallback should match build-meta`);
      }
    } else {
      failures.push(`${distLabel('package-mode-check.json')}: unsupported or missing schema`);
    }
  }

  console.log(`  dist mode: ${meta.mode || 'unknown'}`);
}

function main() {
  console.log('Preview + feedback audit');
  checkDocs();
  checkDist();
  console.log(`  warnings: ${warnings.length}`);
  for (const warning of warnings) console.log(`  WARN ${warning}`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('PREVIEW + FEEDBACK CHECKS PASS');
}

main();
