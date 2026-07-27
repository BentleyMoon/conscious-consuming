#!/usr/bin/env node
/*
  route_context_audit.js
  Guards the first route-context fix: a faceted category view such as
  #explore/digital-services/email must keep that scope when the user asks
  "Help me decide." This is deliberately lightweight: source contract checks
  plus a real data regression case for digital-services/email.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function expectIncludes(text, needle, label) {
  if (!text.includes(needle)) failures.push(label || `missing ${needle}`);
}

function productMatchesQuery(p, q) {
  q = String(q || '').toLowerCase().trim();
  if (!q) return true;
  return [
    p.name,
    p.brand,
    (p.focuses || []).join(' '),
    (p.labels || []).join(' '),
  ].join(' ').toLowerCase().includes(q);
}

function scoreForDefaultValues(ds, product) {
  const engine = require(path.join(ROOT, 'app', 'engine.js'));
  const passport = Object.fromEntries(engine.THEMES.map((theme) => [theme.id, 3]));
  const weights = engine.themeDefaults(ds.criteria, passport, engine.KEY2THEME);
  return engine.score(product, { criteria: ds.criteria, weights, excludes: new Set() });
}

function ranked(ds, q) {
  return (ds.products || [])
    .filter((p) => productMatchesQuery(p, q))
    .map((p) => [p, scoreForDefaultValues(ds, p)])
    .filter((row) => row[1])
    .sort((a, b) => b[1].score - a[1].score);
}

function checkSourceContract() {
  const app = read('app/app.js');
  expectIncludes(app, 'function productMatchesQuery(p,q)', 'app/app.js: missing shared query matcher');
  expectIncludes(app, 'function decideHref(cid,facet)', 'app/app.js: missing scoped decide URL helper');
  expectIncludes(app, 'href:decideHref(DATA.meta.id,listScope)', 'app/app.js: Help me decide link must preserve list scope');
  expectIncludes(app, 'function renderDecide(cid,facet)', 'app/app.js: renderDecide must accept a facet/search scope');
  expectIncludes(app, 'DATA.products.filter(x=>productMatchesQuery(x,q))', 'app/app.js: renderDecide must scope candidates through productMatchesQuery');
  expectIncludes(app, 'renderDecide(cid,facet)', 'app/app.js: decide route must pass the parsed facet into renderDecide');
}

function checkDigitalServicesEmailCase() {
  const ds = JSON.parse(read('app/data/digital-services.json'));
  const all = ranked(ds, '');
  const email = ranked(ds, 'email');
  if (all.length < 100) failures.push(`digital-services: expected a broad all-services decision set, found ${all.length}`);
  if (email.length < 10) failures.push(`digital-services/email: expected enough email matches to decide, found ${email.length}`);
  if (email.length >= all.length) failures.push('digital-services/email: scoped set should be smaller than all digital services');
  const allPick = all[0] && all[0][0];
  const emailPick = email[0] && email[0][0];
  if (!emailPick) failures.push('digital-services/email: no top pick');
  if (emailPick && !productMatchesQuery(emailPick, 'email')) {
    failures.push(`digital-services/email: top pick does not match email scope (${emailPick.name})`);
  }
  if (emailPick && /antennapod/i.test(emailPick.name || '')) {
    failures.push('digital-services/email: regressed to all-services podcast pick AntennaPod');
  }
  if (allPick && emailPick && allPick.code === emailPick.code) {
    failures.push(`digital-services/email: scoped pick still equals unscoped pick (${emailPick.name})`);
  }
}

checkSourceContract();
checkDigitalServicesEmailCase();

if (failures.length) {
  console.log('ROUTE CONTEXT AUDIT FAILED');
  for (const failure of failures) console.log(`  FAIL ${failure}`);
  process.exit(1);
}

console.log('ROUTE CONTEXT AUDIT PASS');
