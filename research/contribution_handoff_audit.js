#!/usr/bin/env node
/* Contribution + handoff audit for Values Commons.

   This keeps the collaboration surface legible: contributors should know what
   a useful suggestion contains, and Claude/Codex handoff items should be
   structured enough to drain instead of becoming invisible debt.
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

function expectIncludes(rel, needle, reason) {
  const text = read(rel);
  if (!text.includes(needle)) failures.push(`${rel}: missing ${reason || needle}`);
}

function sectionBetween(text, startNeedle, endNeedle) {
  const a = text.indexOf(startNeedle);
  if (a < 0) return '';
  const b = text.indexOf(endNeedle, a + startNeedle.length);
  return text.slice(a, b < 0 ? text.length : b);
}

function checkContributionSurface() {
  const publicNeedles = [
    'Correct a sourced claim',
    'Add a missing option',
    'Request a category',
    'Build a compatible app',
    'source URL',
    'as-of date',
    'No account',
    'Nothing is sponsored'
  ];
  for (const needle of publicNeedles) {
    expectIncludes('contribute/index.html', needle, `public contribution cue: ${needle}`);
  }

  const appNeedles = [
    'CONTRIB_KINDS',
    'Correct a sourced claim',
    'Add a missing option',
    'Build an instance',
    'source URL',
    'as-of date',
    'Nothing is sent automatically',
    'exportContrib',
    'applyReceivedEl',
    '#contribute/want',
    '#contribute/problem'
  ];
  for (const needle of appNeedles) {
    expectIncludes('app/app.js', needle, `in-app contribution cue: ${needle}`);
  }
}

function checkHandoff() {
  const handoff = read('docs/CONTENT-HANDOFF.md');
  for (const needle of [
    '## Active queue summary',
    '## Queue rules',
    '## Drained (done)',
    'Evidence rebuild progress',
    '[H4 active/design-app]'
  ]) {
    if (!handoff.includes(needle)) failures.push(`docs/CONTENT-HANDOFF.md: missing handoff cue ${needle}`);
  }
  if (handoff.includes('[H2 active/design-app]') || /^\| H2 \|/m.test(handoff)) {
    failures.push('docs/CONTENT-HANDOFF.md: H2 should be drained, not listed as an active handoff.');
  }
  if (!/drained H2/.test(handoff)) {
    failures.push('docs/CONTENT-HANDOFF.md: missing drained H2 record.');
  }
  if (handoff.includes('[H3 active/design-app]') || /^\| H3 \|/m.test(handoff)) {
    failures.push('docs/CONTENT-HANDOFF.md: H3 should be drained, not listed as an active handoff.');
  }
  if (!/drained H3/.test(handoff)) {
    failures.push('docs/CONTENT-HANDOFF.md: missing drained H3 record.');
  }
  if (handoff.includes('[H1 active/design-app]') || /^\| H1 \|/m.test(handoff)) {
    failures.push('docs/CONTENT-HANDOFF.md: H1 should be drained, not listed as an active handoff.');
  }
  if (!/drained H1/.test(handoff)) {
    failures.push('docs/CONTENT-HANDOFF.md: missing drained H1 record.');
  }

  const active = [...handoff.matchAll(/^\s*-\s+\[(H\d+)\s+active\/([^\]]+)\]/gm)]
    .map(m => ({ id: m[1], owner: m[2] }));
  const ids = new Set();
  for (const item of active) {
    if (ids.has(item.id)) failures.push(`docs/CONTENT-HANDOFF.md: duplicate active handoff id ${item.id}`);
    ids.add(item.id);
    if (!handoff.includes(`| ${item.id} |`)) {
      failures.push(`docs/CONTENT-HANDOFF.md: ${item.id} missing from Active queue summary`);
    }
  }
  if (active.length > 5) warnings.push(`active handoff queue is getting long (${active.length}); drain before more content work`);

  const other = sectionBetween(handoff, 'Other app/ asks', '## Evidence rebuild progress');
  for (const line of other.split(/\r?\n/)) {
    if (/^-\s+20\d\d-\d\d-\d\d/.test(line)) {
      failures.push(`docs/CONTENT-HANDOFF.md: unstructured active app ask: ${line}`);
    }
  }

  const staleGuideSection = sectionBetween(handoff, 'Guide', 'Categories dropped');
  if (/Guide banners to wire in `CAT_GUIDE`/.test(staleGuideSection)) {
    failures.push('docs/CONTENT-HANDOFF.md: stale guide-banner backlog marker still present');
  }

  console.log(`  active handoff items: ${active.length}`);
}

function checkNamingIA() {
  const idx = JSON.parse(read('app/data/index.json') || '{}');
  const contract = idx.namingContract || {};
  const ecosystem = contract.canonicalNames?.ecosystem?.name || 'Values Commons';
  const standard = contract.canonicalNames?.standard?.name || 'Open Values Standard';
  const instance = contract.canonicalNames?.instance?.name || 'Conscious Consuming';

  const appShell = read('app/index.html');
  const manifest = read('app/manifest.webmanifest');
  const community = read('app/community.html');
  const publicHome = read('index.html');

  expectIncludes('app/index.html', `<a href="#home" class="wordmark">${instance}</a>`, 'app wordmark uses instance name');
  expectIncludes('app/index.html', `Part of ${ecosystem}`, 'app footer names ecosystem umbrella');
  expectIncludes('app/index.html', `Built on the ${standard}`, 'app footer names standard as protocol');
  expectIncludes('app/index.html', `${instance} is the first working ${ecosystem} app`, 'app metadata explains instance relationship');
  expectIncludes('app/manifest.webmanifest', instance, 'manifest names app instance');
  expectIncludes('app/manifest.webmanifest', ecosystem, 'manifest description names ecosystem umbrella');
  expectIncludes('app/community.html', `Part of ${ecosystem}`, 'community footer names ecosystem umbrella');
  expectIncludes('app/community.html', `Built on the ${standard}`, 'community footer names standard as protocol');
  expectIncludes('index.html', `<title>${ecosystem}`, 'public home route uses ecosystem name');

  if (/Values Commons Standard/i.test(appShell + community + manifest + publicHome)) {
    failures.push('app naming: do not use "Values Commons Standard"; use Open Values Standard');
  }
  if (/Values Commons[^<\n]{0,80}choose by your values/.test(appShell)) {
    failures.push('app/index.html: app metadata should lead with Conscious Consuming, not Values Commons as the app name');
  }
}

function checkRegionIA() {
  const idx = JSON.parse(read('app/data/index.json') || '{}');
  const contract = idx.regionDecisionContract || {};
  const app = read('app/app.js');
  const payments = (idx.categories || []).find(c => c.id === 'payments') || {};

  if (contract.status !== 'h1-app-owned-region-decision') {
    failures.push('app/data/index.json: missing H1 regionDecisionContract');
  }
  if (!Array.isArray(contract.countryLevelLimitations) || contract.countryLevelLimitations.length < 1) {
    failures.push('app/data/index.json: H1 contract should keep country-level limitations visible');
  }
  if (!payments.regionProfile || payments.regionProfile.strictCurrentEnumSafe !== false) {
    failures.push('app/data/index.json: payments should remain marked not strict-current-enum safe');
  }

  for (const needle of [
    "const REGION_SCOPE='Region uses broad availability tags. Global entries stay visible.'",
    "coverage, plus global entries",
    'Broad coverage here is not country-only',
    'regionDecisionContract:idx.regionDecisionContract',
    "aria-label':'Region coverage'"
  ]) {
    if (!app.includes(needle)) failures.push(`app/app.js: missing H1 broad-region wording or wiring: ${needle}`);
  }
  if (/only options available there/.test(app)) {
    failures.push('app/app.js: H1 broad-region decision should not promise "only options available there"');
  }
}

function checkProtocolDocs() {
  for (const [rel, needles] of [
    ['docs/CODEX-CLAUDE-PARALLEL.md', ['npm run audit:handoff', '[H# active/<owner>]', 'Do not use the handoff as a backlog dump']],
    ['docs/CODEX-CONTENT-BRIEF.md', ['npm run audit:handoff', '[H# active/<owner>]']],
    ['docs/MATURITY-PROGRAM.md', ['Contribution And Handoff Gate', 'npm run audit:handoff']],
    ['docs/README.md', ['npm run audit:handoff']]
  ]) {
    for (const needle of needles) expectIncludes(rel, needle, `${rel} protocol cue: ${needle}`);
  }
}

function main() {
  console.log('Contribution + handoff audit');
  checkContributionSurface();
  checkHandoff();
  checkNamingIA();
  checkRegionIA();
  checkProtocolDocs();
  console.log(`  warnings: ${warnings.length}`);
  for (const warning of warnings) console.log(`  WARN ${warning}`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('CONTRIBUTION + HANDOFF CHECKS PASS');
}

main();
