#!/usr/bin/env node
/* P5 presentation implementation acceptance.

   --contract validates the handback and remains green in verify:full.
   The default command evaluates app consumption and generated renderer
   snapshots. It is intentionally red until the release owner implements P5.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const { OUTPUT, buildPackage, formatJson } = require('../pipeline/build_presentation.js');

const ROOT = path.resolve(__dirname, '..');
const RENDERS = path.join(ROOT, 'app', 'data', 'presentation-renders.json');
const WIDTHS = ['320', '768', '1440'];
const COMMON_PARTS = ['search', 'path', 'lead', 'main-action', 'coverage', 'sources', 'connections', 'links-here', 'correction-history', 'machine-twin'];
const REQUIRED_PARTS = {
  entry: [...COMMON_PARTS, 'facts'],
  category: [...COMMON_PARTS, 'facts', 'applied-values'],
  value: [...COMMON_PARTS, 'facts'],
  source: [...COMMON_PARTS, 'facts'],
  'company-brand': [...COMMON_PARTS, 'facts'],
  guide: COMMON_PARTS,
  task: [...COMMON_PARTS, 'facts', 'applied-values'],
  file: ['search', 'path', 'lead', 'main-action', 'facts', 'coverage', 'connections', 'links-here', 'correction-history', 'machine-twin'],
  changes: COMMON_PARTS,
  'commons-governance': [...COMMON_PARTS, 'facts'],
};
const BANNED = [
  /\u2014/,
  /\bmore than just\b/i,
  /\bin a world where\b/i,
  /\bat its core\b/i,
  /\blet(?:'|\u2019)s (?:explore|unpack|delve|dive)\b/i,
  /\bseamless(?:ly)?\b/i,
  /\bunlock(?:s|ed|ing)?\b/i,
  /\bjourney\b/i,
  /\blandscape\b/i,
  /\brobust\b/i,
  /\bempower(?:s|ed|ing)?\b/i,
  /\bholistic\b/i,
  /\bsynerg(?:y|ies|istic)\b/i,
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function contractFailures(value) {
  const failures = [];
  const sets = value.fixtures || [];
  const fixtures = sets.flatMap((set) => set.cases || []);
  if (sets.length !== 10) failures.push(`handback has ${sets.length} fixture sets, expected 10`);
  if (fixtures.length !== 30) failures.push(`handback has ${fixtures.length} fixtures, expected 30`);
  for (const set of sets) {
    if (!REQUIRED_PARTS[set.pageKind]) failures.push(`${set.pageKind}: no furniture contract`);
    const states = (set.cases || []).map((fixture) => fixture.state).join(',');
    if (states !== 'rich,thin,not-yet-covered') failures.push(`${set.pageKind}: state sequence changed (${states})`);
  }
  if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== formatJson(value)) failures.push('generated presentation package is stale');
  return failures;
}

function categorySliceFailures(value) {
  const failures = [];
  let renderer;
  try {
    renderer = require('../app/presentation.js');
  } catch (error) {
    return [`category renderer could not load: ${error.message}`];
  }
  const fixtures = value.fixtures.find((set) => set.pageKind === 'category').cases;
  const models = {
    'category-rich-banking': {category:'banking',route:'#decide/banking',read:'Banks differ most in fossil financing, fees, transparency, and account access.',controlsHtml:'<div>Live decision controls</div>',connectionsHtml:'<h2>Connections</h2><a href="#guide/ethical-banking">Read the banking guide</a>',sourceText:'The banking comparison carries dated source notes.',guideHref:'#guide/ethical-banking'},
    'category-thin-ai-price': {category:'ai-assistants',route:'#decide/ai-assistants',read:'Compare AI assistants by privacy, everyday access, disclosure, and openness.',controlsHtml:'<div>Live decision controls</div>',connectionsHtml:'<h2>Connections</h2><p>Open the guide or an entry.</p>'},
    'category-gap-furniture': {category:'furniture',route:'#not-yet-covered/furniture',parentLabel:'Keep a home',needHref:'#need/keep-a-home'},
  };
  for (const fixture of fixtures) {
    let html = '';
    try { html = renderer.categoryFrame(value, {...models[fixture.id], fixture}); }
    catch (error) { failures.push(`${fixture.id}: render failed: ${error.message}`); continue; }
    const text = stripHtml(html);
    for (const [name, expected] of Object.entries({'data-presentation-kind':'category','data-presentation-state':fixture.state,'data-presentation-route':fixture.route,'data-presentation-instance':'conscious-consuming'})) if (attr(html, name) !== expected) failures.push(`${fixture.id}: ${name} differs`);
    for (const part of REQUIRED_PARTS.category) if (partOffset(html, part) < 0) failures.push(`${fixture.id}: ${part} furniture missing`);
    const coreOrder = ['search', 'path', 'lead', 'coverage', 'main-action'].map((part) => partOffset(html, part));
    if (coreOrder.some((offset, index) => offset < 0 || (index && offset <= coreOrder[index - 1]))) failures.push(`${fixture.id}: first-view furniture order changed`);
    if ((html.match(/data-presentation-main-action\b/gi) || []).length !== 1) failures.push(`${fixture.id}: expected exactly one main action`);
    for (const phrase of [fixture.expected.coverage, fixture.expected.action, ...fixture.expected.path, ...fixture.expected.mustShow]) if (!text.includes(phrase)) failures.push(`${fixture.id}: expected text missing: ${phrase}`);
    for (const phrase of fixture.expected.mustNotClaim) if (text.includes(phrase)) failures.push(`${fixture.id}: forbidden claim rendered: ${phrase}`);
    for (const pattern of BANNED) if (pattern.test(text)) failures.push(`${fixture.id}: rendered copy contains a banned voice pattern`);
  }
  const app = fs.readFileSync(path.join(ROOT, 'app', 'app.js'), 'utf8');
  if (!app.includes('CC.presentation.categoryFrame')) failures.push('category slice: live app does not call the shared category renderer');
  if (!app.includes("view==='not-yet-covered'")) failures.push('category slice: valid gap routes are not handled');
  if (!app.includes('decisionSaveList(contract,query)')) failures.push('category slice: Save this list is not connected to the device file');
  if (!app.includes('score:Math.round(row.score.score)')) failures.push('category slice: saved list must preserve the numeric engine score');
  return failures;
}

function entrySliceFailures(value) {
  const failures = [], renderer = require('../app/presentation.js');
  const fixtures = value.fixtures.find((set) => set.pageKind === 'entry').cases;
  const models = {
    'entry-rich-local-open-ai': {category:'ai-assistants',route:'#item/ai-assistants/local-open',type:'Service',displayName:'Local / open models (Ollama, llama.cpp)',answer:'Strong fit for your current choices',facts:[{label:'Privacy',band:'Strong',note:'Prompts can stay on this device.',source:'https://github.com/ggml-org/llama.cpp',asof:'2026'}],sources:[{label:'Privacy',url:'https://github.com/ggml-org/llama.cpp',asof:'2026'}],allHref:'#decide/ai-assistants',datasetHref:'./data/ai-assistants.json'},
    'entry-thin-triodos': {category:'banking',route:'#item/banking/triodos',type:'Service',displayName:'Triodos Bank',answer:'Strong fit for your current choices',facts:[{label:'Green financing',band:'Strong',source:'https://www.triodos.com/',asof:'2024'},{label:'Fees',band:'Mixed',note:'Monthly account fee',missing:'Fees: source not supplied'},{label:'Easy to use',band:'Good',note:'UK and several EU countries',missing:'Easy to use: source not supplied'}],sources:[{label:'Green financing',url:'https://www.triodos.com/',asof:'2024'}],allHref:'#decide/banking',datasetHref:'./data/banking.json'},
    'entry-gap-furniture': {category:'furniture',route:'#not-yet-covered/furniture'},
  };
  for (const fixture of fixtures) {
    let html = '';
    try { html = renderer.entryFrame(value, {...models[fixture.id], fixture}); }
    catch (error) { failures.push(`${fixture.id}: render failed: ${error.message}`); continue; }
    const text = stripHtml(html), parts = [...REQUIRED_PARTS.entry];
    if (fixture.state === 'not-yet-covered') parts.splice(parts.indexOf('facts'), 1);
    for (const [name, expected] of Object.entries({'data-presentation-kind':'entry','data-presentation-state':fixture.state,'data-presentation-route':fixture.route,'data-presentation-instance':'conscious-consuming'})) if (attr(html, name) !== expected) failures.push(`${fixture.id}: ${name} differs`);
    for (const part of parts) if (partOffset(html, part) < 0) failures.push(`${fixture.id}: ${part} furniture missing`);
    const coreOrder = ['search', 'path', 'lead', 'coverage', 'main-action'].map((part) => partOffset(html, part));
    if (coreOrder.some((offset, index) => offset < 0 || (index && offset <= coreOrder[index - 1]))) failures.push(`${fixture.id}: first-view furniture order changed`);
    if ((html.match(/data-presentation-main-action\b/gi) || []).length !== 1) failures.push(`${fixture.id}: expected exactly one main action`);
    for (const phrase of [fixture.expected.coverage, fixture.expected.action, ...fixture.expected.path, ...fixture.expected.mustShow]) if (!text.includes(phrase)) failures.push(`${fixture.id}: expected text missing: ${phrase}`);
    for (const phrase of fixture.expected.mustNotClaim) if (text.includes(phrase)) failures.push(`${fixture.id}: forbidden claim rendered: ${phrase}`);
    for (const pattern of BANNED) if (pattern.test(text)) failures.push(`${fixture.id}: rendered copy contains a banned voice pattern`);
  }
  const app = fs.readFileSync(path.join(ROOT, 'app', 'app.js'), 'utf8');
  if (!app.includes('CC.presentation.entryFrame')) failures.push('entry slice: live app does not call the shared entry renderer');
  if (!app.includes('missing:sourced')) failures.push('entry slice: live facts do not preserve missing-source state');
  if (!app.includes("res.querySelector('#entry-save-choice')")) failures.push('entry slice: Save this choice is not connected to device-local saved choices');
  return failures;
}

function appSources() {
  return fs.readdirSync(path.join(ROOT, 'app'))
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(ROOT, 'app', name), 'utf8'))
    .join('\n');
}

function attr(html, name) {
  const match = String(html).match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'));
  return match ? match[1] : '';
}

function partOffset(html, part) {
  return String(html).search(new RegExp(`data-presentation-part=["']${part}["']`, 'i'));
}

function renderFailures(value, manifest) {
  const failures = [];
  const fixtureSets = value.fixtures || [];
  const fixtures = fixtureSets.flatMap((set) => set.cases.map((fixture) => ({ ...fixture, pageKind: set.pageKind })));
  if (manifest.kind !== 'presentation-render-receipts') failures.push('render receipt kind must be presentation-render-receipts');
  if (manifest.version !== '1.0.0') failures.push('render receipt version must be 1.0.0');
  if (manifest.packageChecksum !== value.checksum) failures.push('render receipts do not match the current presentation package checksum');
  if (!Array.isArray(manifest.renders)) return [...failures, 'render receipts must contain a renders array'];
  const byId = new Map(manifest.renders.map((render) => [render.id, render]));
  if (manifest.renders.length !== 30) failures.push(`render receipts contain ${manifest.renders.length} rows, expected 30`);
  if (byId.size !== 30) failures.push(`render receipts contain ${byId.size} unique fixtures, expected 30`);

  for (const fixture of fixtures) {
    const render = byId.get(fixture.id);
    if (!render) {
      failures.push(`${fixture.id}: built render missing`);
      continue;
    }
    if (render.route !== fixture.route) failures.push(`${fixture.id}: route differs from fixture`);
    if (render.pageKind !== fixture.pageKind) failures.push(`${fixture.id}: page kind differs from fixture`);
    if (render.state !== fixture.state) failures.push(`${fixture.id}: state differs from fixture`);
    const expectedInstance = fixture.instance || 'conscious-consuming';
    if (render.instance !== expectedInstance) failures.push(`${fixture.id}: instance differs from fixture`);
    const html = String(render.html || '');
    const text = stripHtml(html);
    if (attr(html, 'data-presentation-kind') !== fixture.pageKind) failures.push(`${fixture.id}: root page-kind marker missing`);
    if (attr(html, 'data-presentation-state') !== fixture.state) failures.push(`${fixture.id}: root state marker missing`);
    if (attr(html, 'data-presentation-route') !== fixture.route) failures.push(`${fixture.id}: root route marker missing`);
    if (attr(html, 'data-presentation-instance') !== expectedInstance) failures.push(`${fixture.id}: root instance marker missing`);
    const parts = [...REQUIRED_PARTS[fixture.pageKind]];
    if (fixture.pageKind === 'entry' && fixture.state === 'not-yet-covered') parts.splice(parts.indexOf('facts'), 1);
    for (const part of parts) if (partOffset(html, part) < 0) failures.push(`${fixture.id}: ${part} furniture missing`);
    const coreOrder = ['search', 'path', 'lead', 'coverage', 'main-action'].map((part) => partOffset(html, part));
    if (coreOrder.some((offset) => offset < 0) || coreOrder.some((offset, index) => index && offset <= coreOrder[index - 1])) failures.push(`${fixture.id}: first-view furniture order changed`);
    if ((html.match(/data-presentation-main-action\b/gi) || []).length !== 1) failures.push(`${fixture.id}: expected exactly one main action`);
    for (const phrase of [fixture.expected.coverage, fixture.expected.action, ...fixture.expected.path, ...fixture.expected.mustShow]) {
      if (!text.includes(phrase)) failures.push(`${fixture.id}: expected text missing: ${phrase}`);
    }
    for (const phrase of fixture.expected.mustNotClaim) if (text.includes(phrase)) failures.push(`${fixture.id}: forbidden claim rendered: ${phrase}`);
    for (const pattern of BANNED) if (pattern.test(text)) failures.push(`${fixture.id}: rendered copy contains a banned voice pattern`);
    for (const width of WIDTHS) {
      const receipt = render.widths && render.widths[width];
      if (!receipt) failures.push(`${fixture.id}: ${width}px receipt missing`);
      else {
        if (receipt.horizontalOverflow !== false) failures.push(`${fixture.id}: ${width}px has horizontal overflow`);
        for (const key of ['search', 'path', 'lead', 'coverage', 'mainAction']) {
          if (!receipt.firstView || receipt.firstView[key] !== true) failures.push(`${fixture.id}: ${width}px first view is missing ${key}`);
        }
      }
    }
  }
  return failures;
}

function finish(label, failures, waits = []) {
  console.log(label);
  for (const wait of waits) console.log(`  WAIT ${wait}`);
  for (const failure of failures) console.log(`  FAIL ${failure}`);
  if (failures.length || waits.length) {
    console.log(`PRESENTATION ACCEPTANCE RED (${failures.length} failure(s), ${waits.length} implementation item(s))`);
    process.exit(1);
  }
  console.log('PRESENTATION ACCEPTANCE PASS');
}

function main() {
  let value;
  try {
    value = buildPackage();
  } catch (error) {
    finish('Presentation implementation acceptance', [`handback builder failed: ${error.message}`]);
  }
  const contract = contractFailures(value);
  if (process.argv.includes('--contract')) {
    const slice = [...categorySliceFailures(value), ...entrySliceFailures(value)];
    console.log('Presentation acceptance contract');
    console.log(`  page kinds: ${value.fixtures.length}`);
    console.log(`  fixtures: ${value.fixtures.flatMap((set) => set.cases).length}`);
    console.log(`  widths per fixture: ${WIDTHS.join(', ')}`);
    console.log(`  implemented page-kind slices: category + entry across three states (${slice.length ? 'red' : 'green'})`);
    if (contract.length || slice.length) finish('Presentation acceptance contract', [...contract, ...slice]);
    console.log('PRESENTATION ACCEPTANCE CONTRACT PASS (category and entry page kinds implemented across three states; full receipt set not evaluated)');
    return;
  }

  const waits = [];
  if (!appSources().includes('presentation.json')) waits.push('Load app/data/presentation.json from the app renderer.');
  if (!fs.existsSync(RENDERS)) {
    waits.push('Generate app/data/presentation-renders.json from the implemented renderer.');
    for (const set of value.fixtures) waits.push(`${set.pageKind}: render rich, thin, and not-yet-covered fixtures at 320px, 768px, and 1440px.`);
    finish('Presentation implementation acceptance', contract, waits);
  }
  let manifest;
  try {
    manifest = readJson(RENDERS);
  } catch (error) {
    finish('Presentation implementation acceptance', [...contract, `render receipts could not be read: ${error.message}`], waits);
  }
  finish('Presentation implementation acceptance', [...contract, ...renderFailures(value, manifest)], waits);
}

main();
