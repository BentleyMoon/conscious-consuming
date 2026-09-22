#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const read = rel => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (error) { failures.push(`${rel}: cannot read (${error.message})`); return ''; } };

function load() {
  const sandbox = { window: {}, document: { createElement(){ return { setAttribute(){}, style:{}, appendChild(){}, remove(){}, querySelector(){return null;}, querySelectorAll(){return [];} }; }, querySelector(){return null;}, getElementById(){return null;}, head:{appendChild(){}}, body:{} }, localStorage:{getItem(){return null;},setItem(){}}, Set, Map, JSON, Date, Math };
  sandbox.window.window = sandbox.window;
  sandbox.window.document = sandbox.document;
  sandbox.window.localStorage = sandbox.localStorage;
  vm.runInNewContext(read('kosplora/lens.js'), sandbox, {filename:'kosplora/lens.js'});
  const before = sandbox.window.OVS_LENS;
  const resourceCodes = (before.resources || []).map(row => row.code).join('|');
  const criteria = (before.criteria || []).map(row => row.key).join('|');
  const decision = JSON.stringify(before.decision || {});
  vm.runInNewContext(read('kosplora/curriculum.js'), sandbox, {filename:'kosplora/curriculum.js'});
  return {lens:sandbox.window.OVS_LENS, resourceCodes, criteria, decision};
}

function main() {
  const index = read('kosplora/shelf/index.html');
  const source = read('kosplora/curriculum.js');
  const docs = read('kosplora/CURRICULUM.md');
  const loaded = load();
  const lens = loaded.lens || {};
  const demo = lens.curriculumDemo || {};
  const resources = demo.resources || [];
  const routes = demo.routes || [];
  const ids = new Set(resources.map(row => row.id));
  const expectedStages = 'orient|study|practice|make|review';

  expect(index.includes('<script src="../curriculum.js"></script>'), 'kosplora/shelf/index.html: curriculum.js is not loaded');
  expect(index.indexOf('<script src="../lens.js"></script>') < index.indexOf('<script src="../curriculum.js"></script>'), 'kosplora/shelf/index.html: curriculum must load after lens data');
  expect(index.indexOf('<script src="../curriculum.js"></script>') < index.indexOf('<script src="../../app/shell.js"></script>'), 'kosplora/shelf/index.html: curriculum must load before the shared shell and inline renderers');

  expect(demo.status === 'curated-demonstration', 'curriculum: status must remain curated-demonstration');
  expect(routes.length >= 10, `curriculum: expected at least 10 routes, found ${routes.length}`);
  expect(resources.length >= 60, `curriculum: expected at least 60 resource records, found ${resources.length}`);
  expect(ids.size === resources.length, 'curriculum: resource ids must be unique');
  expect((demo.libraryGroups || []).length >= 7, 'curriculum: discovery shelves are too thin');

  for (const resource of resources) {
    expect(typeof resource.id === 'string' && /^[a-z0-9-]+$/.test(resource.id), `resource id invalid: ${JSON.stringify(resource.id)}`);
    expect(/^https:\/\//.test(resource.url || ''), `resource ${resource.id}: canonical https URL missing`);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(resource.checked || ''), `resource ${resource.id}: exact checked date missing`);
    expect(['open','free','mixed'].includes(resource.access), `resource ${resource.id}: invalid access class`);
    expect(['none','optional','required','eligibility'].includes(resource.account), `resource ${resource.id}: invalid account class`);
    expect(Boolean(resource.license && resource.sourceClass && resource.note), `resource ${resource.id}: rights, source class, or inclusion note missing`);
  }

  const surfaced = new Set();
  for (const group of demo.libraryGroups || []) for (const id of group.ids || []) surfaced.add(id);

  for (const route of routes) {
    expect(route.stages.map(row => row.id).join('|') === expectedStages, `route ${route.id}: must use orient, study, practice, make, review in order`);
    expect(route.outcomes && route.outcomes.length >= 3, `route ${route.id}: learning outcomes missing`);
    expect(Boolean(route.prerequisites && route.artifact), `route ${route.id}: prerequisites or final artifact missing`);
    expect(Number.isFinite(route.hours) && Number.isFinite(route.weeks), `route ${route.id}: time estimate missing`);
    const used = new Set();
    for (const stage of route.stages) {
      expect(Boolean(stage.task && stage.evidence), `route ${route.id}/${stage.id}: task or evidence-of-progress missing`);
      expect(stage.resources && stage.resources.length > 0, `route ${route.id}/${stage.id}: no resource starts`);
      for (const id of stage.resources || []) { expect(ids.has(id), `route ${route.id}/${stage.id}: unknown resource ${id}`); used.add(id); surfaced.add(id); }
    }
    expect(used.size >= 5, `route ${route.id}: fewer than five distinct resources`);
  }
  for (const id of surfaced) expect(ids.has(id), `curriculum: discovery group references unknown resource ${id}`);
  for (const resource of resources) expect(surfaced.has(resource.id), `resource ${resource.id}: not surfaced in a route or discovery shelf`);

  expect((lens.resources || []).map(row => row.code).join('|') === loaded.resourceCodes, 'curriculum must not mutate the signed decision resource list');
  expect((lens.criteria || []).map(row => row.key).join('|') === loaded.criteria, 'curriculum must not mutate signed decision criteria');
  expect(JSON.stringify(lens.decision || {}) === loaded.decision, 'curriculum must not mutate the signed decision contract');

  const unsafe = ['hunting a free copy','sketchy ads','stream anything'];
  for (const phrase of unsafe) expect(!(source + docs + JSON.stringify((lens.openUniversity || {}).cautions || [])).toLowerCase().includes(phrase), `curriculum: unsafe legacy phrase remains: ${phrase}`);
  expect(((lens.openUniversity || {}).cautions || []).some(line => /public libraries/i.test(line)), 'curriculum: lawful-access guidance missing');
  expect(((lens.openUniversity || {}).cautions || []).some(line => /not automatically open/i.test(line)), 'curriculum: free-versus-open guidance missing');
  expect(!/[\u2013\u2014]/.test(source + docs), 'curriculum: repository convention forbids em/en dashes');
  expect(/local progress/i.test(source) && /localStorage/.test(source), 'curriculum: local progress implementation missing');
  expect(/not accreditation/i.test(docs), 'curriculum docs: demonstration boundary missing');
  for (const anchor of ['Learning how to learn','Organizing Instruction and Study to Improve Student Learning','Universal Design for Learning Guidelines 3.0','UNESCO','WCAG 2.2']) {
    expect(docs.includes(anchor), `curriculum docs: research anchor missing: ${anchor}`);
  }

  console.log('\nKosplora curriculum audit');
  console.log(`  ${routes.length} routes · ${routes.length * 5} stages · ${resources.length} resource records`);
  console.log('  signed illustrative decision receipt: unchanged');
  console.log('  route loop: orient -> study -> practice -> make -> review');
  console.log('  progress: local browser storage only');
  if (failures.length) {
    console.error(`KOSPLORA CURRICULUM AUDIT FAIL (${failures.length})`);
    failures.forEach(message => console.error(`  - ${message}`));
    process.exit(1);
  }
  console.log('KOSPLORA CURRICULUM AUDIT PASS');
}
main();
