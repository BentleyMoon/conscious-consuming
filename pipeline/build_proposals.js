#!/usr/bin/env node
/* Build app/data/proposals.json from content/governance/proposals.json.

   C15 governance is format-only and contact-gated. This builder makes a
   compact, app-readable index of proposal patches and attestations without
   creating live voting, accounts, or a ratification database.
*/
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'content', 'governance', 'proposals.json');
const OUT = path.join(ROOT, 'app', 'data', 'proposals.json');

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

function readSource() {
  const sourceText = fs.readFileSync(SOURCE, 'utf8');
  return {
    sourceText,
    source: JSON.parse(sourceText)
  };
}

function targetSnapshot(target) {
  const abs = path.join(ROOT, target.path || '');
  const exists = fs.existsSync(abs);
  const currentSha256 = exists ? sha256(fs.readFileSync(abs, 'utf8')) : null;
  return cleanObject({
    path: target.path,
    format: target.format,
    baseSha256: target.baseSha256,
    baseHash: target.baseHash,
    currentSha256,
    currentHash: currentSha256 ? currentSha256.slice(0, 8) : null,
    matchesCurrent: Boolean(currentSha256 && currentSha256 === target.baseSha256)
  });
}

function summarizeOperations(operations = []) {
  return operations.map(operation => cleanObject({
    op: operation.op,
    path: operation.path,
    summary: operation.summary,
    impact: operation.impact,
    risk: operation.risk
  }));
}

function buildAttestationMap(attestations) {
  const byProposal = new Map();
  for (const attestation of attestations) {
    if (!byProposal.has(attestation.proposal)) byProposal.set(attestation.proposal, []);
    byProposal.get(attestation.proposal).push(attestation);
  }
  return byProposal;
}

function attestationCounts(attestations) {
  const counts = {};
  for (const attestation of attestations) {
    counts[attestation.stance] = (counts[attestation.stance] || 0) + 1;
  }
  return counts;
}

function summarizeProposal(proposal, attestations) {
  const proposalAttestations = attestations.get(proposal.id) || [];
  return {
    id: proposal.id,
    status: proposal.status,
    target: targetSnapshot(proposal.target || {}),
    author: clone(proposal.author || {}),
    created: proposal.created,
    updated: proposal.updated,
    rationale: proposal.rationale,
    operations: summarizeOperations(proposal.operations || []),
    operationCount: (proposal.operations || []).length,
    signature: {
      method: proposal.signature && proposal.signature.method,
      verified: Boolean(proposal.signature && proposal.signature.verified)
    },
    attestations: {
      total: proposalAttestations.length,
      counted: proposalAttestations.filter(attestation => attestation.counted === true).length,
      stances: attestationCounts(proposalAttestations)
    },
    limits: clone(proposal.limits || [])
  };
}

function summarizeAttestation(attestation) {
  return {
    id: attestation.id,
    status: attestation.status,
    proposal: attestation.proposal,
    stance: attestation.stance,
    attester: clone(attestation.attester || {}),
    created: attestation.created,
    publicComment: attestation.publicComment,
    signature: {
      method: attestation.signature && attestation.signature.method,
      verified: Boolean(attestation.signature && attestation.signature.verified)
    },
    counted: attestation.counted === true,
    privacy: attestation.privacy
  };
}

function buildGovernanceIndex() {
  const { sourceText, source } = readSource();
  const proposals = source.proposals || [];
  const attestations = source.attestations || [];
  const byProposal = buildAttestationMap(attestations);

  const proposalStatuses = {};
  const attestationStatuses = {};
  const stances = {};
  const targetSet = new Set();
  const targetFormatSet = new Set();
  for (const proposal of proposals) {
    proposalStatuses[proposal.status] = (proposalStatuses[proposal.status] || 0) + 1;
    if (proposal.target && proposal.target.path) targetSet.add(proposal.target.path);
    if (proposal.target && proposal.target.format) targetFormatSet.add(proposal.target.format);
  }
  for (const attestation of attestations) {
    attestationStatuses[attestation.status] = (attestationStatuses[attestation.status] || 0) + 1;
    stances[attestation.stance] = (stances[attestation.stance] || 0) + 1;
  }

  return {
    format: 'open-values-governance-index',
    version: '0.1.0',
    standard: 'open-values-standard',
    built: source.updated,
    purpose: 'Generated app-readable index for file-based governance proposals and attestations.',
    generatedFrom: {
      path: rel(SOURCE),
      updated: source.updated,
      sha256: sha256(sourceText)
    },
    publication: clone(source.publication || {}),
    kAnonymity: clone(source.kAnonymity || {}),
    counts: {
      proposals: proposals.length,
      attestations: attestations.length,
      countedAttestations: attestations.filter(attestation => attestation.counted === true).length,
      targets: targetSet.size,
      targetFormats: targetFormatSet.size,
      proposalStatuses,
      attestationStatuses,
      stances
    },
    filters: {
      proposalStatuses: Object.keys(proposalStatuses).sort(),
      attestationStatuses: Object.keys(attestationStatuses).sort(),
      stances: Object.keys(stances).sort(),
      targets: [...targetSet].sort(),
      targetFormats: [...targetFormatSet].sort()
    },
    principles: clone(source.principles || []),
    proposals: proposals.map(proposal => summarizeProposal(proposal, byProposal)),
    attestations: attestations.map(summarizeAttestation)
  };
}

function writeOutput(index) {
  fs.writeFileSync(OUT, formatJson(index));
}

function checkOutput(index) {
  if (!fs.existsSync(OUT)) return ['app/data/proposals.json is missing'];
  return fs.readFileSync(OUT, 'utf8') === formatJson(index) ? [] : ['app/data/proposals.json'];
}

function main() {
  try {
    const index = buildGovernanceIndex();
    if (process.argv.includes('--check')) {
      const drift = checkOutput(index);
      if (drift.length) {
        console.log('build_proposals: generated output is stale');
        for (const item of drift) console.log('  ' + item);
        process.exit(1);
      }
      console.log(`build_proposals: output current (${index.counts.proposals} proposals, ${index.counts.attestations} attestations)`);
      return;
    }
    writeOutput(index);
    console.log(`build_proposals: wrote app/data/proposals.json (${index.counts.proposals} proposals, ${index.counts.attestations} attestations)`);
  } catch (err) {
    console.error('build_proposals FAILED:', err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  OUT,
  buildGovernanceIndex,
  formatJson
};
