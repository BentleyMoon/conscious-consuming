#!/usr/bin/env node
/* Funding independence audit.

   The funding posture is part of the trust contract. This audit keeps the
   public ledger inspectable, cap-bearing, and honest: if there are no recorded
   funders, the who-funds-us lens stays deferred rather than padded.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'content', 'ledger.json');
const DIST = path.join(ROOT, 'dist', 'funding-ledger.json');
const DIST_META = path.join(ROOT, 'dist', 'build-meta.json');
const BUILD_SITE = path.join(ROOT, 'pipeline', 'build_site.py');
const WHO_FUNDS_US = path.join(ROOT, 'content', 'lenses', 'who-funds-us.json');
const failures = [];
const warnings = [];

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function read(file, required = true) {
  if (!fs.existsSync(file)) {
    if (required) failures.push(`${rel(file)}: missing file`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function readJson(file, required = true) {
  const text = read(file, required);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    failures.push(`${rel(file)}: invalid JSON (${err.message})`);
    return null;
  }
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function isUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function normalize(value) {
  if (Array.isArray(value)) return `[${value.map(normalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${normalize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function capByKind(ledger, kind) {
  const caps = ledger && ledger.policy && Array.isArray(ledger.policy.publishedCaps)
    ? ledger.policy.publishedCaps
    : [];
  return caps.find(cap => cap && cap.kind === kind) || null;
}

function checkPolicy(ledger) {
  expect(ledger.schema === 'values-commons-funding-ledger-v1', 'content/ledger.json: unsupported or missing schema');
  expect(isDate(ledger.lastReviewed), 'content/ledger.json: lastReviewed must be YYYY-MM-DD');
  expect(isObject(ledger.project), 'content/ledger.json: missing project object');
  expect(String(ledger.project?.name || '').includes('Values Commons'), 'content/ledger.json: project.name should name Values Commons');
  expect(String(ledger.project?.referenceInstance || '').includes('Conscious Consuming'), 'content/ledger.json: project.referenceInstance should name Conscious Consuming');
  expect(String(ledger.project?.standard || '').includes('Open Values Standard'), 'content/ledger.json: project.standard should name Open Values Standard');

  const policy = ledger.policy || {};
  expect(isObject(policy), 'content/ledger.json: missing policy object');
  expect(isString(policy.independenceLine), 'content/ledger.json: policy.independenceLine is required');
  expect(isString(policy.noStringsAttestation), 'content/ledger.json: policy.noStringsAttestation is required');
  const contract = `${policy.independenceLine || ''} ${policy.noStringsAttestation || ''}`.toLowerCase();
  for (const needle of ['ranking', 'source', 'guide', 'user data', 'roadmap']) {
    expect(contract.includes(needle), `content/ledger.json: funding contract should mention ${needle}`);
  }

  const rated = capByKind(ledger, 'rated_entity_or_affiliate');
  const conditional = capByKind(ledger, 'conditional_or_rank_influencing_money');
  const single = capByKind(ledger, 'single_unrestricted_grant_or_donation');
  expect(rated && rated.capUsd === 0, 'content/ledger.json: rated-entity cap must be 0 USD');
  expect(conditional && conditional.capUsd === 0, 'content/ledger.json: conditional/rank-influencing cap must be 0 USD');
  expect(single && Number.isFinite(single.capUsd) && single.capUsd > 0, 'content/ledger.json: single unrestricted grant/donation cap must be a positive USD number');
  expect(single && isString(single.period), 'content/ledger.json: single unrestricted cap must state a period');
  expect(single && /declined|pledge/i.test(single.rule || ''), 'content/ledger.json: over-cap rule should require decline or public pledge');

  expect(Array.isArray(policy.requiredEntryFields), 'content/ledger.json: policy.requiredEntryFields must be an array');
  for (const field of ['id', 'funder.name', 'amount.value', 'receivedAt', 'noStringsAttestation', 'sourceUrl']) {
    expect(policy.requiredEntryFields && policy.requiredEntryFields.includes(field), `content/ledger.json: requiredEntryFields missing ${field}`);
  }
}

function checkEntry(entry, index, ledger) {
  const label = `content/ledger.json entries[${index}]`;
  expect(isObject(entry), `${label}: entry must be an object`);
  if (!isObject(entry)) return;
  expect(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(entry.id || '')), `${label}: id must be stable kebab-case`);
  expect(isObject(entry.funder), `${label}: missing funder object`);
  expect(isString(entry.funder?.name), `${label}: missing funder.name`);
  expect(isString(entry.funder?.type), `${label}: missing funder.type`);
  expect(isObject(entry.amount), `${label}: missing amount object`);
  expect(Number.isFinite(entry.amount?.value) && entry.amount.value >= 0, `${label}: amount.value must be a non-negative number`);
  expect(entry.amount?.currency === 'USD', `${label}: amount.currency must be USD until another currency policy exists`);
  expect(isDate(entry.receivedAt), `${label}: receivedAt must be YYYY-MM-DD`);
  expect(isString(entry.purpose), `${label}: purpose is required`);
  expect(entry.noStringsAttestation === true, `${label}: noStringsAttestation must be true`);
  expect(isString(entry.relationshipToRatedEntities), `${label}: relationshipToRatedEntities is required`);
  expect(isUrl(entry.sourceUrl), `${label}: sourceUrl must be http(s)`);

  const relationship = String(entry.relationshipToRatedEntities || '').toLowerCase();
  const amount = Number(entry.amount?.value || 0);
  if (/(rated|affiliate|brand|vendor|platform|maker|service provider)/.test(relationship) && amount > 0) {
    failures.push(`${label}: rated-entity or affiliate money must be declined under the 0 USD cap`);
  }
  const single = capByKind(ledger, 'single_unrestricted_grant_or_donation');
  if (single && amount > single.capUsd && !isUrl(entry.publicPledgeUrl)) {
    failures.push(`${label}: amount is above the published cap and needs a publicPledgeUrl`);
  }
  if (Array.isArray(entry.conditionsAccepted) && entry.conditionsAccepted.length) {
    failures.push(`${label}: conditionsAccepted must be empty; conditional funding is capped at 0 USD`);
  }
}

function checkLedger(ledger) {
  if (!ledger) return;
  checkPolicy(ledger);
  expect(Array.isArray(ledger.entries), 'content/ledger.json: entries must be an array');
  if (Array.isArray(ledger.entries)) {
    ledger.entries.forEach((entry, index) => checkEntry(entry, index, ledger));
    const ids = new Set();
    for (const entry of ledger.entries) {
      if (!entry || !entry.id) continue;
      if (ids.has(entry.id)) failures.push(`content/ledger.json: duplicate entry id ${entry.id}`);
      ids.add(entry.id);
    }
  }

  const lens = ledger.whoFundsUsLens || {};
  if (!ledger.entries || ledger.entries.length === 0) {
    expect(lens.status === 'deferred', 'content/ledger.json: empty funding ledger should defer whoFundsUsLens');
    expect(/No external funder entries/i.test(lens.reason || ''), 'content/ledger.json: deferred lens reason should name the absence of external funder entries');
  }
}

function checkWhoFundsUsLens(ledger) {
  const hasLens = fs.existsSync(WHO_FUNDS_US);
  const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
  if (!entries.length && hasLens) {
    failures.push('content/lenses/who-funds-us.json: should stay absent while the ledger has no recorded funders');
  }
  if (entries.length && !hasLens) {
    failures.push('content/lenses/who-funds-us.json: required once the ledger records accepted funders');
  }
}

function checkPackaging(sourceLedger) {
  const buildSite = read(BUILD_SITE);
  expect(buildSite.includes('content') && buildSite.includes('ledger.json'), 'pipeline/build_site.py: should copy content/ledger.json into dist');
  expect(buildSite.includes('funding-ledger.json'), 'pipeline/build_site.py: should package the funding ledger as funding-ledger.json');

  if (!fs.existsSync(DIST_META)) {
    warnings.push('dist/build-meta.json missing; source ledger checked only');
    return;
  }
  const distLedger = readJson(DIST);
  if (!distLedger || !sourceLedger) return;
  if (normalize(distLedger) !== normalize(sourceLedger)) {
    failures.push('dist/funding-ledger.json: does not match content/ledger.json');
  }
}

function main() {
  console.log('Funding independence audit');
  const ledger = readJson(SOURCE);
  checkLedger(ledger);
  checkWhoFundsUsLens(ledger);
  checkPackaging(ledger);

  const entries = Array.isArray(ledger?.entries) ? ledger.entries.length : 0;
  const single = capByKind(ledger, 'single_unrestricted_grant_or_donation');
  console.log(`  ledger: ${ledger ? 'present' : 'missing'}`);
  console.log(`  recorded entries: ${entries}`);
  console.log(`  rated-entity cap: $0`);
  console.log(`  conditional-money cap: $0`);
  console.log(`  single unrestricted cap: ${single ? `$${single.capUsd} / ${single.period}` : 'missing'}`);
  console.log(`  who-funds-us lens: ${fs.existsSync(WHO_FUNDS_US) ? 'present' : 'deferred'}`);
  console.log(`  packaged: ${fs.existsSync(DIST) ? 'present' : 'not built'}`);
  console.log(`  warnings: ${warnings.length}`);
  for (const warning of warnings) console.log(`  WARN ${warning}`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('FUNDING INDEPENDENCE CHECKS PASS');
}

main();
