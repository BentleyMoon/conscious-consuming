#!/usr/bin/env node
/* Audit guide {{chart:category:criterion[:N]}} directives.

   The chart renderer silently emits nothing when a target is missing or too
   sparse. This audit makes that contract explicit: source directives must
   resolve to live data, rendered guide pages must contain the matching SVGs,
   and only deliberately non-comparison guides may remain uncharted.
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GUIDES_DIR = path.join(ROOT, 'content', 'guides');
const DATA_DIR = path.join(ROOT, 'app', 'data');
const RENDERED_DIR = path.join(ROOT, 'app', 'g');
const CHART_RE = /^\{\{chart:([a-z0-9-]+):([a-z_]+)(?::(\d+))?\}\}$/;
const EXPECTED_UNCHARTED = new Set(['how-scores-work', 'the-anti-app']);
const failures = [];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function readJson(file) {
  return JSON.parse(read(file));
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function guideFiles() {
  return fs.readdirSync(GUIDES_DIR)
    .filter(name => name.endsWith('.md'))
    .sort()
    .map(name => path.join(GUIDES_DIR, name));
}

function scoreCount(dataset, key) {
  return (dataset.products || [])
    .filter(product => product.scores && Number.isFinite(product.scores[key]))
    .length;
}

function renderedChartCount(slug) {
  const file = path.join(RENDERED_DIR, `${slug}.html`);
  if (!fs.existsSync(file)) {
    failures.push(`app/g/${slug}.html: missing rendered guide page`);
    return 0;
  }
  return (read(file).match(/class="gchart"/g) || []).length;
}

function main() {
  console.log('Guide chart audit');

  const indexFile = path.join(DATA_DIR, 'index.json');
  expect(fs.existsSync(indexFile), 'app/data/index.json: missing category index');
  const categoryIds = fs.existsSync(indexFile)
    ? new Set((readJson(indexFile).categories || []).map(category => category.id))
    : new Set();

  const uncharted = [];
  const directives = [];

  for (const file of guideFiles()) {
    const slug = path.basename(file, '.md');
    const text = read(file);
    const guideDirectives = [];

    for (const [idx, line] of text.split(/\r?\n/).entries()) {
      if (!line.includes('{{chart:')) continue;
      const trimmed = line.trim();
      const match = trimmed.match(CHART_RE);
      if (!match) {
        failures.push(`${path.relative(ROOT, file)}:${idx + 1}: malformed chart directive`);
        continue;
      }
      const [, cid, key, nRaw] = match;
      const n = nRaw ? Number(nRaw) : 8;
      const dataFile = path.join(DATA_DIR, `${cid}.json`);
      const relData = `app/data/${cid}.json`;
      const directive = { slug, line: idx + 1, cid, key, n };
      directives.push(directive);
      guideDirectives.push(directive);

      expect(categoryIds.has(cid), `${path.relative(ROOT, file)}:${idx + 1}: ${cid} is not in app/data/index.json`);
      expect(Number.isInteger(n) && n >= 3, `${path.relative(ROOT, file)}:${idx + 1}: chart row count must be at least 3`);
      if (!fs.existsSync(dataFile)) {
        failures.push(`${path.relative(ROOT, file)}:${idx + 1}: missing ${relData}`);
        continue;
      }

      const dataset = readJson(dataFile);
      const criteria = new Set((dataset.criteria || []).map(criterion => criterion.key));
      expect(criteria.has(key), `${path.relative(ROOT, file)}:${idx + 1}: ${cid} has no criterion "${key}"`);
      const known = scoreCount(dataset, key);
      expect(known >= 3, `${path.relative(ROOT, file)}:${idx + 1}: ${cid}:${key} has only ${known} scored entries`);
    }

    const renderedCount = renderedChartCount(slug);
    if (guideDirectives.length) {
      expect(renderedCount === guideDirectives.length, `app/g/${slug}.html: expected ${guideDirectives.length} rendered chart(s), found ${renderedCount}`);
    } else {
      uncharted.push(slug);
      expect(EXPECTED_UNCHARTED.has(slug), `content/guides/${slug}.md: guide has no chart directive and is not intentionally uncharted`);
      expect(renderedCount === 0, `app/g/${slug}.html: intentionally uncharted guide should not render a chart`);
    }
  }

  for (const slug of EXPECTED_UNCHARTED) {
    expect(uncharted.includes(slug), `content/guides/${slug}.md: expected intentionally uncharted guide is missing`);
  }

  const unexpectedUncharted = uncharted.filter(slug => !EXPECTED_UNCHARTED.has(slug));
  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log(`  guides checked: ${guideFiles().length}`);
  console.log(`  chart directives: ${directives.length}`);
  console.log(`  intentionally uncharted: ${uncharted.join(', ')}`);
  console.log(`  unexpected uncharted: ${unexpectedUncharted.length}`);
  console.log('GUIDE CHART AUDIT PASS');
}

main();
