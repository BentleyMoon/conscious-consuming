#!/usr/bin/env node
/* Deploy configuration audit for the production Values Commons Worker.

   This is intentionally about the last step, not the whole product:
   package.json must prepare a public release before deploy, wrangler.toml
   must serve dist/, and dist/ must carry a fresh public release receipt.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];
let preflightReceiptState;
const EXPECTED_ROUTES = [
  'valuescommons.org',
  'www.valuescommons.org',
  'consciousconsuming.org',
  'www.consciousconsuming.org'
];

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
    return {};
  }
}

function readOptionalJson(rel) {
  if (!exists(rel)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs(rel), 'utf8'));
  } catch (err) {
    return { __error: err.message };
  }
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function note(condition, message) {
  if (!condition) warnings.push(message);
}

function normalizeScript(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseTomlSubset(text) {
  const out = { root: {}, assets: {}, routes: [] };
  let section = 'root';
  let currentRoute = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '').trim();
    if (!line) continue;
    if (line === '[assets]') {
      section = 'assets';
      currentRoute = null;
      continue;
    }
    if (line === '[[routes]]') {
      section = 'routes';
      currentRoute = {};
      out.routes.push(currentRoute);
      continue;
    }
    if (/^\[/.test(line)) {
      section = 'other';
      currentRoute = null;
      continue;
    }

    const m = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if (/^".*"$/.test(value)) value = value.slice(1, -1);
    else if (value === 'true') value = true;
    else if (value === 'false') value = false;

    if (section === 'assets') out.assets[key] = value;
    else if (section === 'routes' && currentRoute) currentRoute[key] = value;
    else if (section === 'root') out.root[key] = value;
  }

  return out;
}

function checkPackage() {
  const pkg = readJson('package.json');
  const scripts = pkg.scripts || {};

  expect(pkg.private === true, 'package.json: production package should remain private');
  expect(Boolean(pkg.devDependencies && pkg.devDependencies.wrangler), 'package.json: missing wrangler devDependency');
  expect(normalizeScript(scripts['prepare:public']) === 'node scripts/prepare-release.mjs --public', 'package.json: prepare:public should use the release-prep wrapper');
  expect(normalizeScript(scripts['audit:deploy']) === 'node research/deploy_config_audit.js', 'package.json: missing audit:deploy script');
  expect(normalizeScript(scripts['release:preflight']) === 'node scripts/release-preflight.mjs', 'package.json: release:preflight should use the public preflight wrapper');
  expect(normalizeScript(scripts.predeploy) === 'npm run prepare:public && npm run audit:deploy', 'package.json: predeploy should prepare public release and audit deploy config');
  expect(normalizeScript(scripts.deploy) === 'wrangler deploy', 'package.json: deploy should run wrangler deploy');
  expect(normalizeScript(scripts['wrangler:dry-run']) === 'npm run predeploy && wrangler deploy --dry-run', 'package.json: wrangler:dry-run should reuse the predeploy guard before dry-run');
}

function checkWrangler() {
  const text = read('wrangler.toml');
  const toml = parseTomlSubset(text);
  const date = toml.root.compatibility_date || '';
  const assetDir = String(toml.assets.directory || '').replace(/\\/g, '/').replace(/^\.\//, '');

  expect(toml.root.name === 'consciousconsuming', 'wrangler.toml: Worker name should remain consciousconsuming');
  expect(/^\d{4}-\d{2}-\d{2}$/.test(date), 'wrangler.toml: compatibility_date should be YYYY-MM-DD');
  expect(assetDir === 'dist', 'wrangler.toml: assets.directory should be ./dist');

  for (const domain of EXPECTED_ROUTES) {
    const route = toml.routes.find(r => r.pattern === domain);
    expect(Boolean(route), `wrangler.toml: missing route for ${domain}`);
    if (route) expect(route.custom_domain === true, `wrangler.toml: ${domain} route should use custom_domain = true`);
  }
}

function checkDistForDeploy() {
  if (!exists('dist')) {
    failures.push('dist/: missing; run npm run prepare:public before deploy');
    return;
  }

  const meta = readJson('dist/build-meta.json');
  const receipt = readJson('dist/release-check.json');
  const robots = read('dist/robots.txt');
  const headers = read('dist/_headers');

  expect(meta.mode === 'public-production', `dist/build-meta.json: deploy requires public-production, found ${meta.mode || '(missing)'}`);
  expect(meta.siteBase === 'https://valuescommons.org/app', 'dist/build-meta.json: deploy siteBase should be https://valuescommons.org/app');
  expect(meta.appDataFallback === false, 'dist/build-meta.json: public deploy should omit appDataFallback');
  expect(!exists('dist/app/data.js'), 'dist/app/data.js: public deploy should omit oversized fallback bundle');
  expect(/Sitemap:\s*https:\/\/valuescommons\.org\/app\/sitemap\.xml/i.test(robots), 'dist/robots.txt: public deploy should advertise the canonical sitemap');
  expect(/workers\.dev/i.test(headers) && /X-Robots-Tag:\s*noindex/i.test(headers), 'dist/_headers: workers.dev fallback should remain noindexed');

  expect(receipt.schema === 'values-commons-release-check-v1', 'dist/release-check.json: missing release receipt schema');
  expect(receipt.status === 'passed', 'dist/release-check.json: release receipt should be passed');
  expect(receipt.mode === 'public-production', `dist/release-check.json: deploy requires public-production, found ${receipt.mode || '(missing)'}`);
  expect(receipt.siteBase === meta.siteBase, 'dist/release-check.json: siteBase should match build-meta');
  expect(receipt.buildMetaGeneratedAt === meta.generatedAt, 'dist/release-check.json: buildMetaGeneratedAt should match build-meta');
  expect(receipt.appDataFallback === meta.appDataFallback, 'dist/release-check.json: appDataFallback should match build-meta');
  expect(!receipt.preparedAt || !Number.isNaN(Date.parse(receipt.preparedAt)), 'dist/release-check.json: preparedAt should be a valid timestamp');

  const scripts = Array.isArray(receipt.checks) ? receipt.checks.map(c => c && c.script) : [];
  for (const required of ['build', 'audit:preview:public', 'verify:full']) {
    expect(scripts.includes(required), `dist/release-check.json: missing passed check ${required}`);
  }
}

function checkPublicPreflightReceipt() {
  const meta = readJson('dist/build-meta.json');
  const receipt = readOptionalJson('dist/release-preflight-check.json');
  const state = preflightReceiptState(receipt, meta);
  if (!receipt) return { status: state.label };
  if (receipt.__error) {
    note(false, `dist/release-preflight-check.json: ${state.label}`);
    return { status: state.label };
  }

  note(receipt.schema === 'values-commons-public-release-preflight-check-v1', 'dist/release-preflight-check.json: missing public release preflight schema');
  note(receipt.status === 'passed', 'dist/release-preflight-check.json: public preflight receipt should be passed');
  note(receipt.mode === 'public-production', `dist/release-preflight-check.json: expected public-production, found ${receipt.mode || '(missing)'}`);
  note(state.matchesCurrent, `dist/release-preflight-check.json: ${state.label} against current dist`);
  note(receipt.siteBase === meta.siteBase, 'dist/release-preflight-check.json: siteBase should match build-meta');
  note(receipt.buildMetaGeneratedAt === meta.generatedAt, 'dist/release-preflight-check.json: buildMetaGeneratedAt should match build-meta');
  note(receipt.appDataFallback === false, 'dist/release-preflight-check.json: public preflight should omit appDataFallback');
  note(receipt.deployGuard === 'npm run prepare:public && npm run audit:deploy', 'dist/release-preflight-check.json: should record deploy guard');
  note(receipt.dryRunGuard === 'npm run predeploy && wrangler deploy --dry-run', 'dist/release-preflight-check.json: should record dry-run guard');
  const lanes = Array.isArray(receipt.packageModeLanes) ? receipt.packageModeLanes : [];
  note(lanes.includes('private-preview'), 'dist/release-preflight-check.json: should record private-preview package lane');
  note(lanes.includes('public-production'), 'dist/release-preflight-check.json: should record public-production package lane');
  const steps = Array.isArray(receipt.steps) ? receipt.steps.map(step => step && step.script).filter(Boolean) : [];
  for (const required of ['prepare:public', 'audit:release-modes', 'status:write', 'health:deploy']) {
    note(steps.includes(required), `dist/release-preflight-check.json: missing passed step ${required}`);
  }
  note(typeof receipt.nextGate === 'string' && receipt.nextGate.length > 0, 'dist/release-preflight-check.json: nextGate should be present');

  return { status: `${state.label} ${receipt.mode || '(missing)'}` };
}

async function main() {
  ({ preflightReceiptState } = await import('../scripts/preflight-receipts.mjs'));

  console.log('Deploy configuration audit');
  checkPackage();
  checkWrangler();
  checkDistForDeploy();
  const publicPreflight = checkPublicPreflightReceipt();

  console.log(`  routes expected: ${EXPECTED_ROUTES.length}`);
  console.log(`  public preflight receipt: ${publicPreflight.status}`);
  console.log(`  warnings: ${warnings.length}`);
  for (const warning of warnings) console.log(`  WARN ${warning}`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('DEPLOY CONFIG CHECKS PASS');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
