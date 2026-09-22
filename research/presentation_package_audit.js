#!/usr/bin/env node
/* Audit the generated P4 presentation package. */
'use strict';

const fs = require('fs');
const path = require('path');
const { OUTPUT, buildPackage, formatJson } = require('../pipeline/build_presentation.js');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const BANNED = [
  ['em dash', /\u2014/],
  ['more than just', /\bmore than just\b/i],
  ["whether you're", /\bwhether you(?:'|’)?re\b/i],
  ["in today's", /\bin today(?:'|’)?s\b/i],
  ['in a world where', /\bin a world where\b/i],
  ['at its core', /\bat its core\b/i],
  ['testament', /\b(?:stands as|is) a testament\b/i],
  ["let's explore", /\blet(?:'|’)?s (?:explore|unpack|delve|dive)\b/i],
  ['seamless', /\bseamless(?:ly)?\b/i],
  ['unlock', /\bunlock(?:s|ed|ing)?\b/i],
  ['inflated importance', /\bplays? a (?:crucial|vital|pivotal) role\b/i],
  ["it's worth noting", /\bit(?:'|’)?s worth noting\b/i],
  ['journey', /\bjourney\b/i],
  ['landscape', /\blandscape\b/i],
  ['tapestry', /\btapestry\b/i],
  ['robust', /\brobust\b/i],
  ['empower', /\bempower(?:s|ed|ing)?\b/i],
  ['elevate', /\belevate(?:s|d|ing)?\b/i],
  ['holistic', /\bholistic\b/i],
  ['synergy', /\bsynerg(?:y|ies|istic)\b/i],
  ['paradigm', /\bparadigm\b/i],
  ['in conclusion', /\bin conclusion\b/i],
];
const RETIRED = [
  ['lines', /\blines\b/i],
  ['floor', /\bfloor\b/i],
  ['errands', /\berrands\b/i],
  ['generic dials', /\bdials?\b/i],
  ['Values Passport', /\bValues Passport\b/i],
  ['leanings', /\bleanings\b/i],
];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function publicStrings(value, at = 'presentation', out = []) {
  if (typeof value === 'string') {
    out.push({ at, value });
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => publicStrings(item, `${at}[${index}]`, out));
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  for (const [key, child] of Object.entries(value)) {
    if (['id', 'when'].includes(key)) continue;
    publicStrings(child, `${at}.${key}`, out);
  }
  return out;
}

function placeholders(value) {
  return [...String(value).matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((match) => match[1]);
}

function fixturePublicStrings(sets) {
  const out = [];
  for (const set of sets || []) {
    for (const fixture of set.cases || []) {
      publicStrings({
        title: fixture.title,
        coverage: fixture.expected && fixture.expected.coverage,
        action: fixture.expected && fixture.expected.action,
        path: fixture.expected && fixture.expected.path,
        mustShow: fixture.expected && fixture.expected.mustShow,
        mustNotClaim: fixture.expected && fixture.expected.mustNotClaim,
      }, `fixtures.${fixture.id}`, out);
    }
  }
  return out;
}

function main() {
  let expected;
  try {
    expected = buildPackage();
  } catch (error) {
    console.log(`PRESENTATION PACKAGE AUDIT FAILED (builder: ${error.message})`);
    process.exit(1);
  }

  let actual = null;
  try {
    actual = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
  } catch (error) {
    failures.push(`app/data/presentation.json: ${error.message}`);
  }
  if (!actual) return finish(expected, []);

  expect(fs.readFileSync(OUTPUT, 'utf8') === formatJson(expected), 'app/data/presentation.json differs from generated source package');
  expect(actual.format === 'open-values-presentation-package', 'generated package format changed');
  expect(/^sha256:[a-f0-9]{64}$/.test(actual.checksum || ''), 'generated package checksum missing or invalid');
  expect(actual.taxonomy && actual.taxonomy.sourceSchema === 'app/data/standard/schemas/ontology.schema.json', 'taxonomy schema source missing');
  expect(fs.existsSync(path.join(ROOT, actual.taxonomy.sourceSchema)), 'taxonomy schema source does not exist');
  expect(actual.taxonomy && actual.taxonomy.counts.needs === 8, 'taxonomy needs count changed');
  expect(actual.taxonomy && actual.taxonomy.counts.categories === 18, 'taxonomy category count changed');
  expect(actual.taxonomy && actual.taxonomy.counts.subcategories === 39, 'taxonomy subcategory count changed');
  expect(actual.taxonomy && actual.taxonomy.counts.decisions === 217, 'taxonomy decision count changed');
  // 2026-08-14 serial promotion: four built energy and open-technology rows
  // became live without reducing the 87 explicitly not-yet-covered rows.
  expect(actual.taxonomy && actual.taxonomy.counts.livePaths === 130, 'taxonomy live path count changed');
  // 124 on 2026-08-26: messaging and browsers left the shared digital-services dataset, the
  // first two of the nine-way split recorded in docs/ONTOLOGY-RESEARCH.md 4.1.
  expect(actual.taxonomy && actual.taxonomy.counts.liveDatasets === 124, 'taxonomy live dataset count changed');
  expect(actual.taxonomy && actual.taxonomy.counts.notYetCovered === 87, 'taxonomy gap count changed');

  const decisions = actual.taxonomy && actual.taxonomy.decisions || [];
  expect(new Set(decisions.map((decision) => decision.id)).size === decisions.length, 'generated decision ids are not unique');
  expect(new Set(decisions.map((decision) => decision.route)).size === decisions.length, 'generated decision routes are not unique');
  for (const decision of decisions) {
    expect(['live', 'not-yet-covered'].includes(decision.state), `${decision.id}: invalid state ${decision.state}`);
    if (decision.state === 'live') expect(decision.route.startsWith(`#decide/${decision.cid}`), `${decision.id}: invalid live route`);
    if (decision.state === 'not-yet-covered') expect(decision.route === `#not-yet-covered/${decision.id}`, `${decision.id}: invalid gap route`);
  }

  const pages = actual.pageKinds || [];
  expect(pages.length === 10, `expected 10 page-kind packs, found ${pages.length}`);
  expect(pages.every((page) => page.sections.length >= 6), 'every page-kind pack must carry at least six ordered sections');
  expect(pages.every((page) => page.stateCopy.rich && page.stateCopy.thin && page.stateCopy.notCovered), 'every page-kind pack must carry rich, thin, and not-covered copy');

  const fixtureSets = actual.fixtures || [];
  const fixtures = fixtureSets.flatMap((set) => set.cases || []);
  expect(fixtureSets.length === 10, `expected 10 fixture sets, found ${fixtureSets.length}`);
  expect(fixtures.length === 30, `expected 30 fixtures, found ${fixtures.length}`);
  expect(new Set(fixtures.map((fixture) => fixture.id)).size === fixtures.length, 'fixture ids are not unique');
  for (const set of fixtureSets) {
    expect(pages.some((page) => page.id === set.pageKind), `${set.pageKind}: fixture set has no page-kind pack`);
    expect(JSON.stringify((set.cases || []).map((fixture) => fixture.state)) === JSON.stringify(['rich', 'thin', 'not-yet-covered']), `${set.pageKind}: fixture states must be rich, thin, and not-yet-covered`);
  }

  const sourceRecords = actual.sourceIndex && actual.sourceIndex.records || [];
  expect(sourceRecords.length === 2, `expected 2 canonical source records, found ${sourceRecords.length}`);
  expect(new Set(sourceRecords.map((record) => record.id)).size === sourceRecords.length, 'canonical source ids are not unique');
  expect(sourceRecords.reduce((sum, record) => sum + (record.supportedClaims || []).length, 0) === 15, 'canonical source reverse-claim count changed');
  const thinSource = sourceRecords.find((record) => record.id === 'triodos-fossil-fuel-treaty-2024');
  expect(thinSource && thinSource.method === null, 'thin canonical source must keep its missing method explicit');

  const candidates = publicStrings(actual.strings).concat(publicStrings(actual.pageKinds), fixturePublicStrings(fixtureSets), publicStrings(actual.sourceIndex));
  for (const candidate of candidates) {
    for (const [label, pattern] of BANNED) {
      if (pattern.test(candidate.value)) failures.push(`${candidate.at}: banned voice pattern ${label}`);
    }
    for (const [label, pattern] of RETIRED) {
      if (pattern.test(candidate.value)) failures.push(`${candidate.at}: retired chooser term ${label}`);
    }
    const opens = (candidate.value.match(/\{/g) || []).length;
    const closes = (candidate.value.match(/\}/g) || []).length;
    expect(opens === closes, `${candidate.at}: unmatched template brace`);
    expect(new Set(placeholders(candidate.value)).size === placeholders(candidate.value).length, `${candidate.at}: duplicate template placeholder`);
  }

  const appScripts = fs.readdirSync(path.join(ROOT, 'app'))
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(ROOT, 'app', name), 'utf8'))
    .join('\n');
  expect(appScripts.includes("root.fetch('./data/presentation.json')"), 'P5 app consumer does not load the generated presentation package');
  expect(appScripts.includes("script.src='./presentation-data.js'"), 'P5 app consumer has no file-mode presentation fallback');

  finish(actual, candidates);
}

function finish(value, candidates) {
  const counts = value && value.taxonomy && value.taxonomy.counts || {};
  console.log('Presentation package audit');
  console.log(`  taxonomy: ${counts.needs || 0} needs -> ${counts.categories || 0} categories -> ${counts.subcategories || 0} subcategories -> ${counts.decisions || 0} decisions`);
  console.log(`  coverage: ${counts.livePaths || 0} live paths / ${counts.liveDatasets || 0} datasets + ${counts.notYetCovered || 0} not-yet-covered`);
  const fixtureCount = (value && value.fixtures || []).flatMap((set) => set.cases || []).length;
  console.log(`  content packs: ${(value && value.pageKinds || []).length} page kinds; ${fixtureCount} fixtures; ${candidates.length} audited strings`);
  console.log(`  canonical sources: ${(value && value.sourceIndex && value.sourceIndex.records || []).length}`);
  console.log('  app consumer: P5 package loader present');
  if (failures.length) {
    console.log(`PRESENTATION PACKAGE AUDIT FAILED (${failures.length})`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }
  console.log('PRESENTATION PACKAGE AUDIT PASS');
}

main();
