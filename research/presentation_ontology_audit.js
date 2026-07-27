#!/usr/bin/env node
/* Presentation ontology audit.

   Proves the D2 need -> category -> subcategory map is total, exclusive, and
   compatible with the generated index. The audit also removes one selector
   from an in-memory copy and requires the placement assertion to fail.
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXPECTED = {
  needs: 8,
  categories: 18,
  subcategories: 39,
  rows: 206,
  livePaths: 96,
  liveDatasets: 88,
  gaps: 110,
};

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sourceRows(ontology) {
  const rows = [];
  for (const [domainIndex, domain] of (ontology.domains || []).entries()) {
    for (const [rowIndex, row] of (domain.categories || []).entries()) {
      rows.push({
        ...row,
        domain: domain.label,
        sourceKey: `${domainIndex}:${rowIndex}`,
      });
    }
  }
  return rows;
}

function presentationLeaves(ontology) {
  const leaves = [];
  for (const category of (ontology.presentation && ontology.presentation.categories) || []) {
    for (const subcategory of category.subcategories || []) leaves.push({ category, subcategory });
  }
  return leaves;
}

function selectorMatches(row, selector) {
  if (!selector || row.domain !== selector.domain) return false;
  if (selector.groups && !selector.groups.includes(row.group)) return false;
  if (selector.labels && !selector.labels.includes(row.label)) return false;
  return true;
}

function matchingLeaves(row, leaves) {
  return leaves.filter(({ category, subcategory }) => (
    row.need === category.need
    && (subcategory.selectors || []).some((selector) => selectorMatches(row, selector))
  ));
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function inspect(ontology, index, options = {}) {
  const errors = [];
  const expect = (condition, message) => { if (!condition) errors.push(message); };
  const needs = ontology.needs || [];
  const presentation = ontology.presentation || {};
  const categories = presentation.categories || [];
  const leaves = presentationLeaves(ontology);
  const rows = sourceRows(ontology);
  const liveRows = rows.filter((row) => row.cid);
  const gaps = rows.filter((row) => !row.cid);
  const liveIds = new Set(liveRows.map((row) => row.cid));
  const needIds = new Set(needs.map((need) => need.id));

  expect(needs.length === EXPECTED.needs, `expected ${EXPECTED.needs} needs, found ${needs.length}`);
  expect(categories.length === EXPECTED.categories, `expected ${EXPECTED.categories} presentation categories, found ${categories.length}`);
  expect(leaves.length === EXPECTED.subcategories, `expected ${EXPECTED.subcategories} subcategories, found ${leaves.length}`);
  expect(rows.length === EXPECTED.rows, `expected ${EXPECTED.rows} source rows, found ${rows.length}`);
  expect(liveRows.length === EXPECTED.livePaths, `expected ${EXPECTED.livePaths} live paths, found ${liveRows.length}`);
  expect(liveIds.size === EXPECTED.liveDatasets, `expected ${EXPECTED.liveDatasets} live datasets, found ${liveIds.size}`);
  expect(gaps.length === EXPECTED.gaps, `expected ${EXPECTED.gaps} gaps, found ${gaps.length}`);

  expect(presentation.version === 1, `presentation version must be 1, found ${presentation.version}`);
  expect(presentation.leafState && presentation.leafState.liveWhen === 'cid is present', 'presentation live state must be derived from cid presence');
  expect(presentation.leafState && presentation.leafState.gapWhen === 'cid is absent', 'presentation gap state must be derived from cid absence');
  expect(presentation.leafState && presentation.leafState.gapLabel === 'Not yet covered', 'presentation gap label must be Not yet covered');
  expect(/fail the build/i.test(String(presentation.leafState && presentation.leafState.gapIdRule)), 'presentation gap ID rule must fail the build on collision');

  for (const duplicate of duplicateValues(needs.map((need) => need.id))) errors.push(`duplicate need id ${duplicate}`);
  for (const duplicate of duplicateValues(categories.map((category) => category.id))) errors.push(`duplicate presentation category id ${duplicate}`);
  for (const duplicate of duplicateValues(leaves.map(({ subcategory }) => subcategory.id))) errors.push(`duplicate presentation subcategory id ${duplicate}`);

  for (const category of categories) {
    expect(needIds.has(category.need), `${category.id}: unknown need ${category.need || '(missing)'}`);
    expect(Array.isArray(category.subcategories) && category.subcategories.length > 0, `${category.id}: no subcategories`);
  }

  for (const { category, subcategory } of leaves) {
    const prefix = `${category.id}/${subcategory.id}`;
    expect(Array.isArray(subcategory.selectors) && subcategory.selectors.length > 0, `${prefix}: selectors must be non-empty`);
    for (const selector of subcategory.selectors || []) {
      expect(typeof selector.domain === 'string' && selector.domain.length > 0, `${prefix}: selector domain missing`);
      if (selector.groups) {
        expect(Array.isArray(selector.groups) && selector.groups.length > 0, `${prefix}: groups must be a non-empty array`);
        expect(duplicateValues(selector.groups).length === 0, `${prefix}: duplicate group in selector`);
      }
      if (selector.labels) {
        expect(Array.isArray(selector.labels) && selector.labels.length > 0, `${prefix}: labels must be a non-empty array`);
        expect(duplicateValues(selector.labels).length === 0, `${prefix}: duplicate label in selector`);
      }
    }
  }

  const assignments = new Map();
  for (const row of rows) {
    const matches = matchingLeaves(row, leaves);
    assignments.set(row.sourceKey, matches);
    expect(matches.length === 1, `source row ${row.domain} / ${row.label} matches ${matches.length} presentation subcategories`);
    if (matches.length === 1) {
      expect(matches[0].category.need === row.need, `${row.domain} / ${row.label}: presentation need disagrees with source need`);
    }
    const derivedState = row.cid ? 'live' : presentation.leafState && presentation.leafState.gapLabel;
    expect(row.cid ? derivedState === 'live' : derivedState === 'Not yet covered', `${row.domain} / ${row.label}: invalid derived leaf state`);
  }

  for (const { category, subcategory } of leaves) {
    const memberCount = [...assignments.values()].filter((matches) => (
      matches.length === 1
      && matches[0].category.id === category.id
      && matches[0].subcategory.id === subcategory.id
    )).length;
    expect(memberCount > 0, `${category.id}/${subcategory.id}: orphan subcategory`);
  }

  for (const need of needs) {
    expect(categories.some((category) => category.need === need.id), `${need.id}: no presentation category`);
    expect(rows.some((row) => row.need === need.id), `${need.id}: no source rows`);
  }

  const gapIds = gaps.map((row) => slug(row.label));
  for (const gap of gaps) expect(slug(gap.label).length > 0, `${gap.domain} / ${gap.label}: empty derived gap id`);
  for (const duplicate of duplicateValues(gapIds)) errors.push(`duplicate derived gap id ${duplicate}`);

  if (options.checkIndex !== false) {
    const generatedCategories = (index && index.categories) || [];
    const generatedIds = generatedCategories.map((category) => category.id);
    expect(JSON.stringify(index && index.ontology) === JSON.stringify(ontology), 'generated index ontology differs from content/ontology.json');
    expect(generatedCategories.length === EXPECTED.liveDatasets, `generated index expected ${EXPECTED.liveDatasets} categories, found ${generatedCategories.length}`);
    for (const duplicate of duplicateValues(generatedIds)) errors.push(`generated index duplicate category ${duplicate}`);
    const generatedSet = new Set(generatedIds);
    for (const id of liveIds) expect(generatedSet.has(id), `live dataset ${id} missing from generated index`);
    for (const id of generatedSet) expect(liveIds.has(id), `generated dataset ${id} has no live source row`);
    for (const generated of generatedCategories) {
      const sources = liveRows.filter((row) => row.cid === generated.id);
      expect(sources.length > 0, `${generated.id}: generated category has no source row`);
      if (!sources.length) continue;
      expect(sources.every((row) => row.need === generated.need), `${generated.id}: generated need disagrees with source row`);
      const destinations = new Set(sources.flatMap((row) => (assignments.get(row.sourceKey) || []).map(({ subcategory }) => subcategory.id)));
      expect(destinations.size === 1, `${generated.id}: facet rows split across ${destinations.size} subcategories`);
    }
  }

  return {
    errors,
    receipt: {
      needs: needs.length,
      categories: categories.length,
      subcategories: leaves.length,
      rows: rows.length,
      livePaths: liveRows.length,
      liveDatasets: liveIds.size,
      gaps: gaps.length,
    },
  };
}

function main() {
  const ontology = readJson('content/ontology.json');
  const index = readJson('app/data/index.json');
  const result = inspect(ontology, index);

  console.log('Presentation ontology audit');
  console.log(`  ${result.receipt.needs} needs -> ${result.receipt.categories} categories -> ${result.receipt.subcategories} subcategories`);
  console.log(`  ${result.receipt.rows} source rows: ${result.receipt.livePaths} live paths / ${result.receipt.liveDatasets} datasets + ${result.receipt.gaps} not-yet-covered gaps`);

  if (result.errors.length) {
    console.log(`PRESENTATION ONTOLOGY AUDIT FAILED (${result.errors.length})`);
    for (const error of result.errors) console.log(`  FAIL ${error}`);
    process.exit(1);
  }

  const broken = clone(ontology);
  const firstSubcategory = broken.presentation.categories[0].subcategories[0];
  firstSubcategory.selectors = [];
  const bite = inspect(broken, index, { checkIndex: false });
  const placementFailure = bite.errors.some((error) => /selectors must be non-empty|matches 0 presentation subcategories/.test(error));
  if (!placementFailure) {
    console.log('PRESENTATION ONTOLOGY AUDIT FAILED (mutation did not trigger placement failure)');
    process.exit(1);
  }

  const restored = inspect(ontology, index);
  if (restored.errors.length) {
    console.log('PRESENTATION ONTOLOGY AUDIT FAILED (source did not pass after in-memory mutation proof)');
    process.exit(1);
  }

  console.log(`  bite proof: removed selectors from ${firstSubcategory.id}; placement audit failed; source reread passes`);
  console.log('PRESENTATION ONTOLOGY AUDIT PASS');
}

main();
