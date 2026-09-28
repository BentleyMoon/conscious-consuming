#!/usr/bin/env node
/* A brand node must name a maker, not describe a kind of thing.

   The hand-built datasets often put the kind of thing in the brand field: "private messenger",
   "mainstream earbuds", "repair-first route". pipeline/build_nodes.js turned each repeated value
   into a brand node, and pipeline/build_cards.js then told every card it was made by that node.
   On 2026-09-23 there were 195 such nodes carrying 484 made-by edges, and the list meant to stop
   them held hyphenated entries that could never match, because the builder turns hyphens into
   spaces before it looks a value up.

   Two checks, because either alone misses what the other catches:
     1. listed:  a value content/non-brand-values.json names still reached the brand index.
                 This is the check the hyphen bug would have failed.
     2. reads:   a brand node from a hand-built dataset reads as a descriptor by its own words
                 (a kind of software, a tier, a route, a habit), and nobody has written it down as
                 a real brand below. This catches the descriptor the list has not met yet.
   Open Food Facts and Open Beauty Facts brand fields come from producers, so check 2 scopes
   itself to nodes with at least one item from another source.

   A new failure has two honest fixes: add the value to content/non-brand-values.json, or, if it
   really is a maker's name, add it to REAL_BRANDS with the reason.

   Run: node research/descriptor_brand_audit.js */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BRANDS = path.join(ROOT, 'app', 'data', 'nodes', 'brands.json');
const INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const NON_BRAND = path.join(ROOT, 'content', 'non-brand-values.json');

// The same normalization pipeline/build_nodes.js applies to brand text before the lookup.
function normalizeLoose(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[''`]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Words that name a kind of thing, a tier, or a route rather than a maker. Words that also
// begin real organisations' names in this corpus (news, media, open, national, federal, public,
// digital, general, privacy, security, consumer) are deliberately absent.
const DESCRIPTOR_WORDS = new Set([
  'agent', 'alerts', 'app', 'apps', 'assistant', 'authenticator', 'backup', 'baseline', 'bank',
  'browser', 'budget', 'builder', 'calendar', 'capture', 'cartridge', 'chat', 'circular',
  'classifieds', 'cleaners', 'cleanser', 'client', 'commercial', 'crowdfunding',
  'denim', 'disposable', 'earbuds', 'encrypted', 'enterprise', 'fashion', 'filtering', 'fleet',
  'footwear', 'forum', 'generator', 'habit', 'hosted', 'hosting', 'inbox', 'isp', 'laptop',
  'laptops', 'lender', 'luxury', 'mainstream', 'marketplace', 'masking', 'mattresses',
  'messenger', 'newsroom', 'newspaper', 'notes', 'official', 'organic', 'platform', 'polls',
  'premium', 'razor', 'refill', 'refurbished', 'remittance', 'rental', 'resale', 'resolver',
  'retailers', 'reusable', 'route', 'scheduling', 'sheets', 'sneakers', 'sportswear', 'supplier',
  'swimwear', 'underwear', 'vault', 'vpn', 'wallet', 'whiteboard', 'workspace', 'workstation'
]);
const DESCRIPTOR_PHRASES = [
  'open source', 'self hosted', 'peer to peer', 'private label', 'store brand', 'national brand',
  'no purchase', 'not a ', 'built in', 'plant based', 'b corp', 'first route', 'pre owned'
];

// Words that mark an organisation's own name. A label carrying one is a maker, whatever else it says.
const ORG_MARKERS = new Set([
  'llc', 'inc', 'ltd', 'company', 'corporation', 'foundation', 'institute', 'university',
  'association', 'society', 'project', 'commission', 'center', 'centre', 'administration',
  'council', 'fund', 'bureau', 'agency', 'initiative', 'alliance', 'union'
]);

// Real makers whose names happen to use a descriptor word, each with the reason it stays.
const REAL_BRANDS = new Map([
  // none needed on 2026-09-23; add as 'normalized label' => 'why it is a maker'
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function nonBrandSet(doc, errors) {
  const seen = new Map();
  for (const [group, values] of Object.entries(doc.groups || {})) {
    for (const raw of values) {
      const norm = normalizeLoose(raw);
      if (!norm) { errors.push(`non-brand list: "${raw}" in ${group} normalizes to nothing`); continue; }
      if (seen.has(norm)) errors.push(`non-brand list: "${raw}" in ${group} repeats "${seen.get(norm)}"`);
      else seen.set(norm, raw);
    }
  }
  return new Set(seen.keys());
}

function readsAsDescriptor(label) {
  const norm = normalizeLoose(label);
  const words = norm.split(' ');
  if (words.some((w) => ORG_MARKERS.has(w))) return null;
  if (REAL_BRANDS.has(norm)) return null;
  const word = words.find((w) => DESCRIPTOR_WORDS.has(w));
  if (word) return `"${word}"`;
  const padded = ` ${norm} `;
  const phrase = DESCRIPTOR_PHRASES.find((p) => padded.includes(` ${p}`));
  return phrase ? `"${phrase.trim()}"` : null;
}

function inspect(brands, nonBrand, producerSourced) {
  const errors = [];
  let scoped = 0;
  for (const node of brands.nodes || []) {
    const norm = normalizeLoose(node.label);
    if (nonBrand.has(norm)) {
      errors.push(`listed: ${node.id} ("${node.label}") is in content/non-brand-values.json yet has a brand node`);
      continue;
    }
    const cats = node.categories || [];
    if (!cats.some((c) => !producerSourced.has(c))) continue;
    scoped += 1;
    const why = readsAsDescriptor(node.label);
    if (why) errors.push(`reads: ${node.id} ("${node.label}", ${node.items} items) reads as a descriptor by ${why}`);
  }
  return { errors, scoped };
}

// The verdict cards print the brand text under the name, where a kind reads as a kind, but their
// JSON-LD "brand" tells a search engine it is a maker. A listed value must not reach it.
function cardBrands() {
  const out = [];
  const dir = path.join(ROOT, 'app', 'c');
  if (!fs.existsSync(dir)) return out;
  for (const cat of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(dir, cat.name))) {
      if (!f.endsWith('.html')) continue;
      const m = fs.readFileSync(path.join(dir, cat.name, f), 'utf8').match(/"brand":"((?:[^"\\]|\\.)*)"/);
      if (m) out.push([`${cat.name}/${f}`, JSON.parse(`"${m[1]}"`)]);
    }
  }
  return out;
}

function inspectCards(cards, nonBrand) {
  return cards.filter(([, brand]) => nonBrand.has(normalizeLoose(brand)))
    .map(([file, brand]) => `card: app/c/${file} tells search engines its brand is "${brand}", a listed descriptor`);
}

function clone(x) { return JSON.parse(JSON.stringify(x)); }

const BITES = [
  { what: 'a listed value written with a hyphen reaches the index (the 2026-09 bug)',
    pattern: /^listed: ovs:brand\/open-source-coding-agent /,
    break: (b) => { b.nodes.push({ id: 'ovs:brand/open-source-coding-agent', label: 'open-source coding agent',
      items: 5, categories: ['ai-assistants'] }); } },
  { what: 'a descriptor nobody has listed yet reaches the index',
    pattern: /^reads: ovs:brand\/privacy-first-notes-app .* by "notes"/,
    break: (b) => { b.nodes.push({ id: 'ovs:brand/privacy-first-notes-app', label: 'privacy-first notes app',
      items: 2, categories: ['digital-services'] }); } },
  { what: 'a tier word dressed as a brand reaches the index',
    pattern: /^reads: ovs:brand\/mainstream-smartwatch .* by "mainstream"/,
    break: (b) => { b.nodes.push({ id: 'ovs:brand/mainstream-smartwatch', label: 'mainstream smartwatch',
      items: 3, categories: ['phones'] }); } }
];

function main() {
  console.log('Descriptor brand audit');
  const brands = readJson(BRANDS);
  const index = readJson(INDEX);
  const listErrors = [];
  const nonBrand = nonBrandSet(readJson(NON_BRAND), listErrors);

  const producerSourced = new Set();
  for (const cat of index.categories || []) {
    const file = path.join(ROOT, 'app', 'data', cat.file || `${cat.id}.json`);
    if (!fs.existsSync(file)) continue;
    const source = String((readJson(file).meta || {}).source || '');
    if (/Open (Food|Beauty) Facts/i.test(source)) producerSourced.add(cat.id);
  }

  const { errors, scoped } = inspect(brands, nonBrand, producerSourced);
  const cards = cardBrands();
  const all = listErrors.concat(errors, inspectCards(cards, nonBrand));
  if (all.length) {
    console.log(`  failures: ${all.length}`);
    for (const e of all.slice(0, 25)) console.log(`  FAIL ${e}`);
    if (all.length > 25) console.log(`  ... and ${all.length - 25} more`);
    console.log('DESCRIPTOR BRAND AUDIT FAILED');
    process.exit(1);
  }

  for (const bite of BITES) {
    const broken = clone(brands);
    bite.break(broken);
    const caught = inspect(broken, nonBrand, producerSourced).errors.filter((e) => bite.pattern.test(e));
    if (!caught.length) {
      console.log(`DESCRIPTOR BRAND AUDIT FAILED (bite "${bite.what}" produced no matching error)`);
      process.exit(1);
    }
    console.log(`  bite proof: ${bite.what} -> caught`);
  }
  const plantedCard = inspectCards(cards.concat([['messaging/planted.html', 'Private Messenger']]), nonBrand)
    .filter((e) => /^card: app\/c\/messaging\/planted\.html /.test(e));
  if (!plantedCard.length) {
    console.log('DESCRIPTOR BRAND AUDIT FAILED (bite "a card names a descriptor as its brand" produced no matching error)');
    process.exit(1);
  }
  console.log('  bite proof: a card names a descriptor as its brand -> caught');

  console.log(`  ${(brands.nodes || []).length} brand nodes, ${scoped} from hand-built datasets read by their words`);
  console.log(`  ${nonBrand.size} listed non-brand values; ${brands.descriptorItems} items keep their text with no brand node`);
  console.log(`  ${cards.length} verdict cards name a brand in their JSON-LD; none is a listed descriptor`);
  console.log(`  ${BITES.length + 1} of ${BITES.length + 1} checks proved able to fail`);
  console.log('DESCRIPTOR BRAND AUDIT PASS');
}

main();
