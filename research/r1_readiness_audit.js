#!/usr/bin/env node
/* R1 readiness audit for Values Commons.

   This does not certify that the founder R1 review has passed. It checks that
   the pre-invite gate is represented coherently: the runbook exists, the
   private/public package-lane receipts are present, the durable status report
   names active blockers, and H4 is not accidentally hidden behind "ready" copy.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
let metaForPackageLane;
let preflightReceiptState;

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

function readJson(rel) {
  const text = read(rel);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    failures.push(`${rel}: invalid JSON (${err.message})`);
    return { __error: err.message };
  }
}

function readJsonIfExists(rel) {
  if (!exists(rel)) return null;
  return readJson(rel);
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function expectIncludes(rel, needle, reason) {
  const text = read(rel);
  expect(text.includes(needle), `${rel}: missing ${reason || needle}`);
}

function tableValue(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`^\\|\\s*${escaped}\\s*\\|\\s*([^|]+?)\\s*\\|\\s*$`, 'm'));
  return match ? match[1].trim() : '';
}

function activeHandoffIds() {
  const text = read('docs/CONTENT-HANDOFF.md');
  return [...text.matchAll(/^- \[(H\d+) active\//gm)].map(match => match[1]);
}

function checkRunbookDocs() {
  for (const [rel, needles] of [
    ['docs/R1-REVIEW.md', [
      'R1 Review Gate',
      'npm run r1:preflight',
      'npm run prepare:preview',
      'npm run audit:preview:private',
      'dist/r1-preflight-check.json',
      'one real decision',
      'Pass to first 5',
      'Patch first',
      'Stop',
      'R1 Receipt',
      'Decision: Pass to first 5 / Patch first / Stop',
    ]],
    ['docs/PREVIEW-FEEDBACK-LOOP.md', [
      'R1 review gate',
      'first 5 invites',
      'one real decision',
      'Learning Receipt',
      'earned backlog',
    ]],
    ['docs/GRANT-PREVIEW-PATH.md', [
      'npm run prepare:preview',
      'noindexed',
      'Do not claim public traction yet',
    ]],
  ]) {
    for (const needle of needles) expectIncludes(rel, needle, `${rel} R1 cue: ${needle}`);
  }
}

function checkPackageLanes() {
  const buildMeta = readJson('dist/build-meta.json');
  const modeCheck = readJson('dist/package-mode-check.json');
  const releaseCheck = readJson('dist/release-check.json');

  expect(modeCheck.schema === 'values-commons-package-mode-check-v2', 'dist/package-mode-check.json: expected schema values-commons-package-mode-check-v2');
  expect(modeCheck.status === 'passed', `dist/package-mode-check.json: expected passed status, found ${modeCheck.status || '(missing)'}`);
  expect(modeCheck.privatePreview?.mode === 'private-preview', 'dist/package-mode-check.json: privatePreview lane should be private-preview');
  expect(modeCheck.privatePreview?.appDataFallback === true, 'dist/package-mode-check.json: privatePreview lane should include app data fallback');
  expect(/^[a-f0-9]{64}$/.test(modeCheck.privatePreview?.packageSha256 || ''), 'dist/package-mode-check.json: privatePreview lane should record packageSha256');
  expect(modeCheck.publicProduction?.mode === 'public-production', 'dist/package-mode-check.json: publicProduction lane should be public-production');
  expect(modeCheck.publicProduction?.appDataFallback === false, 'dist/package-mode-check.json: publicProduction lane should omit app data fallback');
  expect(/^[a-f0-9]{64}$/.test(modeCheck.publicProduction?.packageSha256 || ''), 'dist/package-mode-check.json: publicProduction lane should record packageSha256');

  const current = modeCheck.currentDist || {};
  expect(current.mode === buildMeta.mode, 'dist/package-mode-check.json: currentDist mode should match dist/build-meta.json');
  expect(current.siteBase === buildMeta.siteBase, 'dist/package-mode-check.json: currentDist siteBase should match dist/build-meta.json');
  expect(current.buildMetaGeneratedAt === buildMeta.generatedAt, 'dist/package-mode-check.json: currentDist timestamp should match dist/build-meta.json');

  expect(releaseCheck.status === 'passed', `dist/release-check.json: expected passed status, found ${releaseCheck.status || '(missing)'}`);
  expect(releaseCheck.mode === buildMeta.mode, 'dist/release-check.json: mode should match dist/build-meta.json');
  expect(releaseCheck.siteBase === buildMeta.siteBase, 'dist/release-check.json: siteBase should match dist/build-meta.json');
  expect(releaseCheck.buildMetaGeneratedAt === buildMeta.generatedAt, 'dist/release-check.json: build timestamp should match dist/build-meta.json');

  return {
    currentMode: buildMeta.mode || '(missing)',
    privateLane: modeCheck.privatePreview?.mode || '(missing)',
    publicLane: modeCheck.publicProduction?.mode || '(missing)',
  };
}

function checkR1PreflightReceipt(activeIds) {
  const receipt = readJsonIfExists('dist/r1-preflight-check.json');
  if (!receipt) return { status: 'not recorded' };

  expect(receipt.schema === 'values-commons-r1-preflight-check-v1', 'dist/r1-preflight-check.json: expected schema values-commons-r1-preflight-check-v1');
  expect(receipt.status === 'passed', `dist/r1-preflight-check.json: expected passed status, found ${receipt.status || '(missing)'}`);
  expect(receipt.mode === 'private-preview', `dist/r1-preflight-check.json: expected private-preview mode, found ${receipt.mode || '(missing)'}`);
  expect(receipt.appDataFallback === true, 'dist/r1-preflight-check.json: private preview receipt should include appDataFallback');
  const lanes = Array.isArray(receipt.packageModeLanes) ? receipt.packageModeLanes : [];
  expect(lanes.includes('private-preview'), 'dist/r1-preflight-check.json: should record private-preview package lane');
  expect(lanes.includes('public-production'), 'dist/r1-preflight-check.json: should record public-production package lane');
  const steps = Array.isArray(receipt.steps) ? receipt.steps.map(step => step && step.script).filter(Boolean) : [];
  for (const script of ['prepare:preview', 'audit:release-modes', 'status:write', 'health']) {
    expect(steps.includes(script), `dist/r1-preflight-check.json: missing step ${script}`);
  }
  expect(Array.isArray(receipt.activeBlockers), 'dist/r1-preflight-check.json: activeBlockers should be an array');
  expect((receipt.activeBlockers || []).join(', ') === activeIds.join(', '), `dist/r1-preflight-check.json: activeBlockers should be "${activeIds.join(', ')}"`);
  expect(typeof receipt.nextGate === 'string' && receipt.nextGate.length > 0, 'dist/r1-preflight-check.json: nextGate should be present');
  if (activeIds.includes('H10')) {
    expect(receipt.nextGate.includes('H10 remains active'), 'dist/r1-preflight-check.json: nextGate should keep H10 visible while active');
    expect(/provenance|source-independence/i.test(receipt.nextGate), 'dist/r1-preflight-check.json: H10 nextGate should name provenance/source-independence work');
  }
  if (activeIds.includes('H4')) {
    expect(receipt.nextGate.includes('H4 remains active'), 'dist/r1-preflight-check.json: nextGate should keep H4 visible while active');
    expect(receipt.nextGate.includes('final app/design drain decision'), 'dist/r1-preflight-check.json: H4 nextGate should name final app/design drain decision');
  }
  const modeCheck = readJson('dist/package-mode-check.json');
  if (receipt.targetPackageSha256) {
    expect(/^[a-f0-9]{64}$/.test(receipt.targetPackageSha256), 'dist/r1-preflight-check.json: targetPackageSha256 should be a sha256 hex digest');
  }
  const state = preflightReceiptState(receipt, metaForPackageLane(modeCheck.privatePreview) || readJson('dist/build-meta.json'));
  return {
    status: `${state.label} ${receipt.mode || '(missing)'}`,
  };
}

function checkStatusReport(activeIds, currentMode) {
  const status = read('docs/PROJECT-STATUS.md');
  expect(status.includes('## R1 / Preview Readiness'), 'docs/PROJECT-STATUS.md: missing R1 / Preview Readiness section');
  expect(status.includes('- R1 preview readiness: private/public package lanes recorded; active blocker(s):'), 'docs/PROJECT-STATUS.md: missing headline R1 readiness line');

  const blockers = tableValue(status, 'active blocker(s)');
  const expectedBlockers = activeIds.length ? activeIds.join(', ') : 'none';
  expect(blockers === expectedBlockers, `docs/PROJECT-STATUS.md: active blocker row should be "${expectedBlockers}", found "${blockers || '(missing)'}"`);

  expect(tableValue(status, 'R1 runbook') === 'present', 'docs/PROJECT-STATUS.md: R1 runbook row should be present');
  expect(tableValue(status, 'preview feedback loop') === 'present', 'docs/PROJECT-STATUS.md: preview feedback loop row should be present');
  expect(tableValue(status, 'grant preview path') === 'present', 'docs/PROJECT-STATUS.md: grant preview path row should be present');
  expect(tableValue(status, 'private-preview package lane').startsWith('passed (fallback included;'), 'docs/PROJECT-STATUS.md: private-preview lane should pass with fallback included');
  expect(tableValue(status, 'public-production package lane').startsWith('passed (fallback omitted;'), 'docs/PROJECT-STATUS.md: public-production lane should pass with fallback omitted');
  const preflightRow = tableValue(status, 'R1 preflight receipt');
  expect(Boolean(preflightRow), 'docs/PROJECT-STATUS.md: R1 preflight receipt row should be present');
  if (exists('dist/r1-preflight-check.json')) {
    const receipt = readJson('dist/r1-preflight-check.json');
    const modeCheck = readJson('dist/package-mode-check.json');
    const state = preflightReceiptState(receipt, metaForPackageLane(modeCheck.privatePreview) || readJson('dist/build-meta.json'));
    if (state.state === 'invalid') {
      expect(preflightRow === state.label, `docs/PROJECT-STATUS.md: R1 preflight receipt row should be "${state.label}" when receipt JSON is invalid`);
    } else {
      const expectedPrefix = `${state.label} at `;
      expect(preflightRow.startsWith(expectedPrefix), `docs/PROJECT-STATUS.md: R1 preflight receipt row should start with "${expectedPrefix}" when receipt is present`);
    }
  } else {
    expect(preflightRow === 'not recorded', 'docs/PROJECT-STATUS.md: R1 preflight receipt row should say not recorded before r1:preflight runs');
  }
  expect(tableValue(status, 'current dist') === `matches ${currentMode} build metadata`, `docs/PROJECT-STATUS.md: current dist row should match ${currentMode || 'current'} build metadata`);

  const nextGate = tableValue(status, 'next review gate');
  if (activeIds.includes('H10')) {
    expect(nextGate.includes('H10 remains active'), 'docs/PROJECT-STATUS.md: next review gate should keep H10 visible while active');
    expect(/provenance|source-independence/i.test(nextGate), 'docs/PROJECT-STATUS.md: H10 next review gate should name provenance/source-independence work');
  }
  if (activeIds.includes('H4')) {
    expect(nextGate.includes('H4 remains active'), 'docs/PROJECT-STATUS.md: next review gate should keep H4 visible while active');
    expect(nextGate.includes('final app/design drain decision'), 'docs/PROJECT-STATUS.md: next review gate should name the final app/design drain decision');
  }
  if (!activeIds.length) {
    expect(nextGate.includes('run founder R1 review receipt before first invites'), 'docs/PROJECT-STATUS.md: next review gate should move to founder R1 receipt when no blocker is active');
  }
}

async function main() {
  ({ metaForPackageLane, preflightReceiptState } = await import('../scripts/preflight-receipts.mjs'));

  console.log('R1 readiness audit');
  checkRunbookDocs();
  const lanes = checkPackageLanes();
  const activeIds = activeHandoffIds();
  const receipt = checkR1PreflightReceipt(activeIds);
  checkStatusReport(activeIds, lanes.currentMode);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log(`  current dist: ${lanes.currentMode}`);
  console.log(`  package lanes: ${lanes.privateLane}, ${lanes.publicLane}`);
  console.log(`  r1 preflight receipt: ${receipt.status}`);
  console.log(`  active blocker(s): ${activeIds.length ? activeIds.join(', ') : 'none'}`);
  console.log('R1 READINESS CHECKS PASS');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
