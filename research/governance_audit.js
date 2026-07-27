#!/usr/bin/env node
/* C15 governance audit.

   The governance layer is intentionally file-format first: proposal patches and
   attestations can be published, forked, and recomputed without accounts or a
   vote database. This audit blocks accidental live ratification in the seed.
*/
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  OUT: GOVERNANCE_INDEX,
  buildGovernanceIndex,
  formatJson
} = require('../pipeline/build_proposals.js');

const ROOT = path.resolve(__dirname, '..');
const LEDGER = path.join(ROOT, 'content', 'governance', 'proposals.json');
const failures = [];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SEMVER = /^0\.1\.0(?:[-+].*)?$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SHORT_HASH = /^[0-9a-f]{8}$/;
const NO_PRIVATE_DATA = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/i;
const PROPOSAL_STATUSES = new Set(['template', 'draft', 'submitted', 'withdrawn', 'superseded', 'archived']);
const SEED_PROPOSAL_STATUSES = new Set(['template', 'draft']);
const ATTESTATION_STATUSES = new Set(['template', 'submitted', 'withdrawn', 'archived']);
const STANCES = new Set(['support', 'concern', 'needs-work', 'oppose', 'abstain']);
const OPS = new Set(['add-item', 'remove-item', 'edit-field', 'set-field', 'note']);

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
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

function checkNoPrivateData(value, label) {
  expect(!NO_PRIVATE_DATA.test(JSON.stringify(value)), `${label}: appears to contain private contact data`);
}

function checkPublication(data) {
  const publication = data.publication || {};
  expect(isObject(publication), 'publication: missing object');
  if (!isObject(publication)) return;
  expect(publication.status === 'format-seed', 'publication.status: must remain format-seed');
  expect(publication.liveVoting === false, 'publication.liveVoting: must be false');
  expect(publication.contactGated === true, 'publication.contactGated: must be true');
  expect(nonEmpty(publication.storage), 'publication.storage: missing storage');
  expect(nonEmpty(publication.relay), 'publication.relay: missing relay');
  expect(nonEmpty(publication.identity), 'publication.identity: missing identity');
  expect(nonEmpty(publication.ratification), 'publication.ratification: missing ratification note');
  expect(nonEmpty(publication.privacy), 'publication.privacy: missing privacy note');
}

function checkKAnonymity(data) {
  const policy = data.kAnonymity || {};
  expect(isObject(policy), 'kAnonymity: missing object');
  if (!isObject(policy)) return;
  expect(Number.isInteger(policy.minimumGroupSize) && policy.minimumGroupSize >= 5, 'kAnonymity.minimumGroupSize: must be at least 5');
  expect(Array.isArray(policy.countedStatuses), 'kAnonymity.countedStatuses: missing array');
  expect(!(policy.countedStatuses || []).includes('template'), 'kAnonymity.countedStatuses: templates must not count');
  expect(!(policy.countedStatuses || []).includes('draft'), 'kAnonymity.countedStatuses: drafts must not count');
  expect(Array.isArray(policy.countedOnlyWhen) && policy.countedOnlyWhen.length >= 2, 'kAnonymity.countedOnlyWhen: missing conditions');
  expect(nonEmpty(policy.note), 'kAnonymity.note: missing note');
}

function targetSha(target) {
  const abs = path.join(ROOT, target.path || '');
  if (!fs.existsSync(abs)) return null;
  return sha256(fs.readFileSync(abs, 'utf8'));
}

function checkSignature(signature, label) {
  expect(isObject(signature), `${label}: missing signature`);
  if (!isObject(signature)) return;
  expect(nonEmpty(signature.method), `${label}.method: missing method`);
  expect(signature.verified === false, `${label}.verified: seed signatures must not verify`);
}

function checkAuthor(author, label) {
  expect(isObject(author), `${label}: missing author`);
  if (!isObject(author)) return;
  expect(nonEmpty(author.type), `${label}.type: missing type`);
  expect(SLUG.test(String(author.id || '')), `${label}.id: invalid id`);
  expect(nonEmpty(author.display), `${label}.display: missing display`);
  checkNoPrivateData(author, label);
}

function checkProposal(proposal, ids) {
  expect(isObject(proposal), 'proposal: must be object');
  if (!isObject(proposal)) return;
  const label = proposal.id || 'proposal';
  expect(proposal.format === 'open-values-proposal', `${label}: wrong format`);
  expect(SEMVER.test(String(proposal.version || '')), `${label}.version: must be 0.1.0 semver`);
  expect(SLUG.test(String(proposal.id || '')), `${label}.id: invalid id`);
  expect(!ids.has(proposal.id), `${label}: duplicate id`);
  ids.add(proposal.id);
  expect(PROPOSAL_STATUSES.has(proposal.status), `${label}.status: invalid status`);
  expect(SEED_PROPOSAL_STATUSES.has(proposal.status), `${label}.status: seed ledger may only contain template/draft proposals`);
  expect(nonEmpty(proposal.rationale), `${label}.rationale: missing rationale`);
  expect(DATE.test(String(proposal.created || '')), `${label}.created: must be YYYY-MM-DD`);
  expect(DATE.test(String(proposal.updated || '')), `${label}.updated: must be YYYY-MM-DD`);
  checkAuthor(proposal.author, `${label}.author`);
  checkSignature(proposal.signature, `${label}.signature`);
  checkNoPrivateData(proposal, label);

  const target = proposal.target || {};
  expect(isObject(target), `${label}.target: missing object`);
  if (isObject(target)) {
    expect(nonEmpty(target.path), `${label}.target.path: missing path`);
    expect(nonEmpty(target.format), `${label}.target.format: missing format`);
    expect(SHA256.test(String(target.baseSha256 || '')), `${label}.target.baseSha256: invalid sha256`);
    expect(SHORT_HASH.test(String(target.baseHash || '')), `${label}.target.baseHash: invalid short hash`);
    if (target.baseSha256 && target.baseHash) expect(target.baseSha256.slice(0, 8) === target.baseHash, `${label}.target.baseHash: not sha prefix`);
    const current = targetSha(target);
    expect(Boolean(current), `${label}.target.path: target file missing ${target.path || '(missing)'}`);
    if (current) expect(current === target.baseSha256, `${label}.target.baseSha256: base hash no longer matches current target`);
  }

  expect(Array.isArray(proposal.operations) && proposal.operations.length > 0, `${label}.operations: missing operations`);
  (proposal.operations || []).forEach((operation, i) => {
    const at = `${label}.operations[${i}]`;
    expect(isObject(operation), `${at}: must be object`);
    if (!isObject(operation)) return;
    expect(OPS.has(operation.op), `${at}.op: invalid op ${operation.op || '(missing)'}`);
    expect(typeof operation.path === 'string' && operation.path.startsWith('/'), `${at}.path: must be JSON pointer-like`);
    expect(nonEmpty(operation.summary), `${at}.summary: missing summary`);
    expect(nonEmpty(operation.impact), `${at}.impact: missing impact`);
    expect(nonEmpty(operation.risk), `${at}.risk: missing risk`);
  });
  expect(Array.isArray(proposal.limits) && proposal.limits.length > 0, `${label}.limits: missing limits`);
}

function checkAttestation(attestation, proposalIds, ids) {
  expect(isObject(attestation), 'attestation: must be object');
  if (!isObject(attestation)) return;
  const label = attestation.id || 'attestation';
  expect(attestation.format === 'open-values-attestation', `${label}: wrong format`);
  expect(SEMVER.test(String(attestation.version || '')), `${label}.version: must be 0.1.0 semver`);
  expect(SLUG.test(String(attestation.id || '')), `${label}.id: invalid id`);
  expect(!ids.has(attestation.id), `${label}: duplicate id`);
  ids.add(attestation.id);
  expect(ATTESTATION_STATUSES.has(attestation.status), `${label}.status: invalid status`);
  expect(attestation.status === 'template', `${label}.status: seed attestations must remain templates`);
  expect(SLUG.test(String(attestation.proposal || '')), `${label}.proposal: invalid proposal id`);
  expect(proposalIds.has(attestation.proposal), `${label}.proposal: unknown proposal ${attestation.proposal || '(missing)'}`);
  expect(STANCES.has(attestation.stance), `${label}.stance: invalid stance`);
  checkAuthor(attestation.attester, `${label}.attester`);
  expect(DATE.test(String(attestation.created || '')), `${label}.created: must be YYYY-MM-DD`);
  expect(nonEmpty(attestation.publicComment), `${label}.publicComment: missing comment`);
  checkSignature(attestation.signature, `${label}.signature`);
  expect(attestation.counted === false, `${label}.counted: seed attestations must not count`);
  expect(nonEmpty(attestation.privacy), `${label}.privacy: missing privacy note`);
  checkNoPrivateData(attestation, label);
}

function checkLedger(data) {
  expect(data.format === 'open-values-governance-ledger', 'ledger: wrong format');
  expect(SEMVER.test(String(data.version || '')), 'ledger.version: must be 0.1.0 semver');
  expect(data.standard === 'open-values-standard', 'ledger.standard: wrong standard');
  expect(DATE.test(String(data.updated || '')), 'ledger.updated: must be YYYY-MM-DD');
  expect(nonEmpty(data.purpose), 'ledger.purpose: missing purpose');
  expect(Array.isArray(data.principles) && data.principles.length >= 5, 'ledger.principles: expected at least five principles');
  checkPublication(data);
  checkKAnonymity(data);
  checkNoPrivateData(data, 'ledger');

  expect(Array.isArray(data.proposals) && data.proposals.length >= 3, 'ledger.proposals: expected at least three seed proposals');
  const proposalIds = new Set();
  for (const proposal of data.proposals || []) checkProposal(proposal, proposalIds);

  expect(Array.isArray(data.attestations) && data.attestations.length >= 3, 'ledger.attestations: expected at least three seed attestations');
  const attestationIds = new Set();
  for (const attestation of data.attestations || []) checkAttestation(attestation, proposalIds, attestationIds);

  return {
    proposals: (data.proposals || []).length,
    attestations: (data.attestations || []).length,
    counted: (data.attestations || []).filter(attestation => attestation.counted === true).length
  };
}

function checkGeneratedIndex() {
  expect(fs.existsSync(GOVERNANCE_INDEX), 'governance index: missing generated output app/data/proposals.json');
  if (!fs.existsSync(GOVERNANCE_INDEX)) return;
  const expected = formatJson(buildGovernanceIndex());
  const actual = fs.readFileSync(GOVERNANCE_INDEX, 'utf8');
  expect(actual === expected, 'governance index: generated output is stale; run node pipeline/build_proposals.js');
}

function main() {
  console.log('Governance audit');
  const ledger = readJson(LEDGER);
  const stats = checkLedger(ledger);
  checkGeneratedIndex();
  console.log(`  proposals: ${stats.proposals}`);
  console.log(`  attestations: ${stats.attestations} (${stats.counted} counted)`);
  console.log(`  source: ${rel(LEDGER)}`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('GOVERNANCE CHECKS PASS');
}

main();
