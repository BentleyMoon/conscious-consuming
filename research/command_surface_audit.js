#!/usr/bin/env node
/* Command surface audit for Values Commons.

   This keeps the npm command layer, docs, and local workflow in sync as the
   project matures. It does not run the heavy commands; it checks that the
   advertised commands exist and point at real local scripts.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

const EXPECTED_SCRIPTS = {
  'build': 'node scripts/build.mjs',
  'build:preview': 'node scripts/build.mjs --preview',
  'build:presentation': 'node pipeline/build_presentation.js',
  'audit:content': 'node research/content_readiness_audit.js',
  'audit:a11y': 'node research/a11y_audit.js',
  'audit:contrast': 'node research/contrast_audit.js',
  'audit:citations': 'node research/citation_bundle_audit.js',
  'audit:conformance': 'node research/validate_lens.js',
  'audit:linked-data': 'node research/linked_data_audit.js',
  'audit:flash-drive': 'node research/flash_drive_audit.js',
  'audit:funding': 'node research/funding_audit.js',
  'audit:freshness': 'node research/freshness_report.js',
  'audit:well-known': 'node research/well_known_audit.js',
  'audit:stacks': 'node research/stacks_audit.js',
  'audit:routes': 'node research/public_route_audit.js',
  'audit:first-use': 'node research/first_use_audit.js',
  'audit:presentation-ontology': 'node research/presentation_ontology_audit.js',
  'audit:presentation-design': 'node research/presentation_design_audit.js',
  'audit:presentation-package': 'node research/presentation_package_audit.js',
  'audit:presentation-acceptance': 'node research/presentation_acceptance_audit.js',
  'audit:handoff': 'node research/contribution_handoff_audit.js',
  'audit:preview': 'node research/preview_feedback_audit.js',
  'audit:preview:private': 'node research/preview_feedback_audit.js --mode=private-preview',
  'audit:preview:public': 'node research/preview_feedback_audit.js --mode=public-production',
  'audit:r1': 'node research/r1_readiness_audit.js',
  'audit:release-observability': 'node research/release_observability_audit.mjs',
  'audit:release-modes': 'node scripts/check-release-modes.mjs',
  'audit:deploy': 'node research/deploy_config_audit.js',
  'audit:ci': 'node research/ci_config_audit.js',
  'audit:generated': 'node scripts/check-generated-drift.mjs',
  'audit:cache-bust': 'node research/cache_bust_audit.js',
  'audit:provenance': 'node research/provenance_summary_audit.js',
  'audit:commands': 'node research/command_surface_audit.js',
  'worktree:summary': 'node scripts/worktree-summary.mjs',
  'status:write': 'node scripts/write-status-report.mjs',
  'status:check': 'node scripts/write-status-report.mjs --check',
  'verify': 'node scripts/verify.mjs',
  'verify:full': 'node scripts/verify.mjs --full',
  'health': 'node scripts/health-report.mjs',
  'health:deploy': 'node scripts/health-report.mjs --deploy',
  'prepare:preview': 'node scripts/prepare-release.mjs --preview',
  'prepare:public': 'node scripts/prepare-release.mjs --public',
  'release:status': 'node scripts/release-status.mjs',
  'r1:preflight': 'node scripts/r1-preflight.mjs',
  'release:preflight': 'node scripts/release-preflight.mjs',
  'predeploy': 'npm run prepare:public && npm run audit:deploy',
  'deploy': 'wrangler deploy',
  'wrangler:dry-run': 'npm run predeploy && wrangler deploy --dry-run'
};

const DOC_COMMANDS = {
  'README.md': [
    'npm run verify',
    'npm run verify:full',
    'npm run audit:generated',
    'npm run audit:cache-bust',
    'npm run audit:provenance',
    'npm run audit:content',
    'npm run audit:citations',
    'npm run audit:conformance',
    'npm run audit:linked-data',
    'npm run audit:flash-drive',
    'npm run audit:funding',
    'npm run audit:freshness',
    'npm run audit:well-known',
    'npm run audit:stacks',
    'npm run audit:routes',
    'npm run audit:first-use',
    'npm run audit:handoff',
    'npm run audit:preview',
    'npm run audit:r1',
    'npm run audit:release-observability',
    'npm run audit:a11y',
    'npm run audit:contrast',
    'npm run worktree:summary',
    'npm run status:write',
    'npm run status:check',
    'npm run health',
    'npm run health:deploy',
    'npm run prepare:preview',
    'npm run r1:preflight',
    'npm run release:preflight',
    'npm run release:status'
  ],
  'docs/DEPLOY-AND-SHARE.md': [
    'npm run prepare:public',
    'npm run prepare:preview',
    'npm run audit:preview:public',
    'npm run audit:preview:private',
    'npm run audit:r1',
    'npm run audit:release-observability',
    'npm run audit:release-modes',
    'npm run audit:deploy',
    'npm run audit:ci',
    'npm run audit:generated',
    'npm run audit:cache-bust',
    'npm run audit:provenance',
    'npm run audit:citations',
    'npm run audit:linked-data',
    'npm run audit:flash-drive',
    'npm run audit:funding',
    'npm run audit:well-known',
    'npm run audit:stacks',
    'npm run audit:routes',
    'npm run audit:commands',
    'npm run audit:a11y',
    'npm run audit:contrast',
    'npm run health',
    'npm run health:deploy',
    'npm run r1:preflight',
    'npm run release:preflight',
    'npm run wrangler:dry-run',
    'npm run release:status'
  ],
  'docs/MATURITY-PROGRAM.md': [
    'npm run verify',
    'npm run verify:full',
    'npm run audit:content',
    'npm run audit:citations',
    'npm run audit:conformance',
    'npm run audit:linked-data',
    'npm run audit:flash-drive',
    'npm run audit:funding',
    'npm run audit:freshness',
    'npm run audit:well-known',
    'npm run audit:stacks',
    'npm run audit:routes',
    'npm run audit:first-use',
    'npm run audit:handoff',
    'npm run audit:preview',
    'npm run audit:r1',
    'npm run audit:release-observability',
    'npm run audit:a11y',
    'npm run audit:contrast',
    'npm run prepare:preview',
    'npm run prepare:public',
    'npm run release:status',
    'npm run r1:preflight',
    'npm run release:preflight',
    'npm run audit:deploy',
    'npm run audit:generated',
    'npm run audit:cache-bust',
    'npm run audit:provenance',
    'npm run audit:ci',
    'npm run health',
    'npm run worktree:summary',
    'npm run status:write',
    'npm run status:check',
    'npm run health:deploy',
    'npm run audit:commands'
  ]
};

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

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function scriptTarget(script) {
  const m = normalize(script).match(/^node\s+([^\s]+)/);
  return m ? m[1] : '';
}

function checkPackageScripts() {
  const pkg = readJson('package.json');
  const scripts = pkg.scripts || {};

  for (const [name, expected] of Object.entries(EXPECTED_SCRIPTS)) {
    const actual = normalize(scripts[name]);
    expect(actual === expected, `package.json: script ${name} should be "${expected}", found "${actual || '(missing)'}"`);
    const target = scriptTarget(expected);
    if (target) expect(exists(target), `package.json: script ${name} points at missing ${target}`);
  }
}

function checkDocs() {
  for (const [rel, commands] of Object.entries(DOC_COMMANDS)) {
    const text = read(rel);
    for (const command of commands) {
      expect(text.includes(command), `${rel}: missing documented command ${command}`);
    }
  }
}

function main() {
  console.log('Command surface audit');
  checkPackageScripts();
  checkDocs();

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log(`  npm scripts checked: ${Object.keys(EXPECTED_SCRIPTS).length}`);
  console.log(`  docs checked: ${Object.keys(DOC_COMMANDS).length}`);
  console.log('COMMAND SURFACE CHECKS PASS');
}

main();
