#!/usr/bin/env node
/* Build app/data/asks-offers-index.json from content/asks-offers.json.

   This is a compact, board-ready view of the C14 help-over-selling seed file.
   The source file remains authoritative; this output resolves related
   categories, guides, and initiatives for future app surfaces.
*/
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'content', 'asks-offers.json');
const DATA_INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const INITIATIVES = path.join(ROOT, 'app', 'data', 'causes-to-support.json');
const GUIDES_DIR = path.join(ROOT, 'content', 'guides');
const OUT = path.join(ROOT, 'app', 'data', 'asks-offers-index.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

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

function categoryMap() {
  const index = readJson(DATA_INDEX);
  return new Map((index.categories || []).map(category => [category.id, category]));
}

function initiativeMap() {
  const lens = readJson(INITIATIVES);
  return new Map((lens.products || lens.resources || []).map(entity => [entity.code, entity]));
}

function guideTitle(slug) {
  const file = path.join(GUIDES_DIR, `${slug}.md`);
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const title = text.match(/^title:\s*(.+)$/m);
  if (title) return title[1].trim().replace(/^["']|["']$/g, '');
  const h1 = text.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : slug.replace(/-/g, ' ');
}

function summarizeCategory(category) {
  return cleanObject({
    id: category.id,
    label: category.label,
    type: category.type,
    domain: category.domain,
    group: category.group,
    file: category.file,
    n: category.n
  });
}

function summarizeGuide(slug) {
  return {
    id: slug,
    title: guideTitle(slug),
    path: `content/guides/${slug}.md`,
    hash: `#guide/${slug}`
  };
}

function summarizeInitiative(entity) {
  return cleanObject({
    code: entity.code,
    name: entity.name,
    brand: entity.brand,
    focuses: clone(entity.focuses || []),
    description: entity.description,
    legitimacy: entity.legitimacy ? clone(entity.legitimacy) : undefined,
    actPath: entity.actPath ? clone(entity.actPath) : undefined,
    scoreSignals: {
      impact: entity.scores && entity.scores.impact,
      transparency: entity.scores && entity.scores.transparency,
      ways_to_help: entity.scores && entity.scores.ways_to_help
    },
    links: clone(entity.links || [])
  });
}

function summarizeRelated(item, categories, initiatives) {
  const related = item.related || {};
  return {
    categories: (related.categories || []).map(id => summarizeCategory(categories.get(id) || { id, label: id })),
    guides: (related.guides || []).map(summarizeGuide),
    initiatives: (related.initiatives || []).map(id => summarizeInitiative(initiatives.get(id) || { code: id, name: id }))
  };
}

function itemAction(item) {
  if (item.kind === 'ask') return {
    label: 'Ask',
    listLabel: 'Needs',
    items: clone(item.needs || [])
  };
  return {
    label: 'Offer',
    listLabel: 'Offers',
    items: clone(item.offers || [])
  };
}

function buildAsksOffersIndex() {
  const sourceText = fs.readFileSync(SOURCE, 'utf8');
  const source = JSON.parse(sourceText);
  const categories = categoryMap();
  const initiatives = initiativeMap();
  const items = (source.items || []).map(item => ({
    id: item.id,
    kind: item.kind,
    status: item.status,
    title: item.title,
    summary: item.summary,
    prompt: item.prompt,
    audience: clone(item.audience || []),
    values: clone(item.values || []),
    regions: clone(item.regions || []),
    action: itemAction(item),
    related: summarizeRelated(item, categories, initiatives),
    receipts: clone(item.receipts || []),
    limits: clone(item.limits || [])
  }));

  const kindCounts = items.reduce((acc, item) => {
    acc[item.kind] = (acc[item.kind] || 0) + 1;
    return acc;
  }, {});
  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const valueSet = new Set();
  const regionSet = new Set();
  const categorySet = new Set();
  const guideSet = new Set();
  const initiativeSet = new Set();
  for (const item of source.items || []) {
    (item.values || []).forEach(value => valueSet.add(value));
    (item.regions || []).forEach(region => regionSet.add(region));
    ((item.related && item.related.categories) || []).forEach(id => categorySet.add(id));
    ((item.related && item.related.guides) || []).forEach(id => guideSet.add(id));
    ((item.related && item.related.initiatives) || []).forEach(id => initiativeSet.add(id));
  }

  return {
    format: 'open-values-asks-offers-index',
    version: '0.1.0',
    standard: 'open-values-standard',
    built: source.updated,
    purpose: 'Generated board-ready index for file-based asks/offers templates.',
    generatedFrom: {
      path: rel(SOURCE),
      updated: source.updated,
      sha256: sha256(sourceText)
    },
    publication: clone(source.publication),
    counts: {
      items: items.length,
      asks: kindCounts.ask || 0,
      offers: kindCounts.offer || 0,
      templates: statusCounts.template || 0,
      live: statusCounts.live || 0,
      categories: categorySet.size,
      guides: guideSet.size,
      initiatives: initiativeSet.size,
      values: valueSet.size,
      regions: regionSet.size
    },
    sections: [
      { id: 'asks', label: 'Asks', kind: 'ask', count: kindCounts.ask || 0 },
      { id: 'offers', label: 'Offers', kind: 'offer', count: kindCounts.offer || 0 }
    ],
    filters: {
      values: [...valueSet].sort(),
      regions: [...regionSet].sort(),
      categories: [...categorySet].sort(),
      guides: [...guideSet].sort(),
      initiatives: [...initiativeSet].sort()
    },
    principles: clone(source.principles || []),
    items
  };
}

function writeOutput(index) {
  fs.writeFileSync(OUT, formatJson(index));
}

function checkOutput(index) {
  if (!fs.existsSync(OUT)) return ['app/data/asks-offers-index.json is missing'];
  return fs.readFileSync(OUT, 'utf8') === formatJson(index) ? [] : ['app/data/asks-offers-index.json'];
}

function main() {
  try {
    const index = buildAsksOffersIndex();
    if (process.argv.includes('--check')) {
      const drift = checkOutput(index);
      if (drift.length) {
        console.log('build_initiatives: generated output is stale');
        for (const item of drift) console.log('  ' + item);
        process.exit(1);
      }
      console.log(`build_initiatives: output current (${index.counts.items} items, ${index.counts.initiatives} initiatives)`);
      return;
    }
    writeOutput(index);
    console.log(`build_initiatives: wrote app/data/asks-offers-index.json (${index.counts.items} items, ${index.counts.initiatives} initiatives)`);
  } catch (err) {
    console.error('build_initiatives FAILED:', err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  OUT,
  buildAsksOffersIndex,
  formatJson
};
