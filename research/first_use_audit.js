#!/usr/bin/env node
/* First-use audit for Values Commons.

   This is a structural guardrail for the product path a first visitor or
   reviewer should be able to walk: root -> app -> category -> verdict/evidence
   -> guide -> values passport -> contribution / preview route.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];

const FLAGSHIP_CATEGORIES = [
  'banking',
  'ai-assistants',
  'digital-services',
  'phones',
  'clothing',
  'learning-resources',
  'news-sources',
  'investing',
  'payments',
  'causes-to-support'
];

const APP_VIEWS = [
  'home',
  'map',
  'explore',
  'guides',
  'guide',
  'values',
  'you',
  'card',
  'contribute',
  'scan',
  'decide',
  'garden',
  'indexes'
];

const NOTE_OK = {
  fees: true,
  accessibility: true,
  price: true,
  economical: true,
  catalog: true,
  selection: true
};

const EXTERNAL_ACTOR_CLASSES = new Set([
  'external-person',
  'external-group',
  'external-agent',
  'external-builder',
  'external-researcher'
]);
const REVIEWER_ROLES = new Set(['founder', 'release-owner']);
const REVIEW_STATUSES = new Set(['pending', 'confirmed', 'rejected']);
const EVIDENCE_KINDS = new Set([
  'public-url',
  'private-receipt-id',
  'operator-observation',
  'external-message-id'
]);
const EVIDENCE_REFERENCE = /^(https:\/\/|receipt:|observation:|message:)[^\s@]+$/;
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SUBJECT_KEY = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const EMAIL_LIKE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

function abs(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function read(rel) {
  if (!exists(rel)) {
    failures.push(`${rel}: missing file`);
    return '';
  }
  return fs.readFileSync(abs(rel), 'utf8');
}

function json(rel) {
  try {
    return JSON.parse(read(rel));
  } catch (err) {
    failures.push(`${rel}: JSON parse failed (${err.message})`);
    return null;
  }
}

function jsonLines(rel) {
  const text = read(rel);
  if (!text) return [];
  return text.split(/\r?\n/).filter(line => line.trim()).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (err) {
      failures.push(`${rel}:${index + 1}: invalid JSON (${err.message})`);
      return null;
    }
  }).filter(Boolean);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function boundedText(value, maximum = 240) {
  return nonEmpty(value) && value.length <= maximum && !EMAIL_LIKE.test(value);
}

function validTimestamp(value) {
  return nonEmpty(value) && !Number.isNaN(new Date(value).getTime());
}

function validateAdoptionRegistry(registry) {
  const errors = [];
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) return ['registry must be an object'];
  if (registry.kind !== 'cc-adoption-gate-registry') errors.push('kind must be cc-adoption-gate-registry');
  if (registry.version !== '1.0.0') errors.push('version must be 1.0.0');
  if (registry.eventLedger !== 'content/operations/adoption-events.jsonl') errors.push('eventLedger path drift');
  if (!nonEmpty(registry.definition)) errors.push('definition must be non-empty');
  if (!Array.isArray(registry.strategySources) || registry.strategySources.length === 0) errors.push('strategySources must be non-empty');
  if (!Array.isArray(registry.excludedSignals) || registry.excludedSignals.length === 0) errors.push('excludedSignals must be non-empty');
  if (registry.privacy?.storeContactDetails !== false) errors.push('privacy.storeContactDetails must be false');
  if (registry.privacy?.storePrivateValues !== false) errors.push('privacy.storePrivateValues must be false');
  if (!nonEmpty(registry.privacy?.subjectIdentity)) errors.push('privacy.subjectIdentity must be non-empty');
  if (!nonEmpty(registry.privacy?.evidenceBoundary)) errors.push('privacy.evidenceBoundary must be non-empty');
  if (!Array.isArray(registry.gates) || registry.gates.length === 0) return [...errors, 'gates must be non-empty'];

  const ids = new Set();
  for (const [index, gate] of registry.gates.entries()) {
    const label = `gates[${index}]`;
    if (!KEBAB.test(gate?.id || '')) errors.push(`${label}.id must be kebab-case`);
    if (ids.has(gate?.id)) errors.push(`${label}.id duplicates ${gate.id}`);
    ids.add(gate?.id);
    if (!nonEmpty(gate?.front)) errors.push(`${label}.front must be non-empty`);
    if (!Number.isInteger(gate?.threshold) || gate.threshold < 1) errors.push(`${label}.threshold must be a positive integer`);
    if (gate?.distinctBy !== 'subjectKey') errors.push(`${label}.distinctBy must be subjectKey`);
    if (!Array.isArray(gate?.eventTypes) || gate.eventTypes.length === 0) {
      errors.push(`${label}.eventTypes must be non-empty`);
    } else if (new Set(gate.eventTypes).size !== gate.eventTypes.length || gate.eventTypes.some(type => !KEBAB.test(type))) {
      errors.push(`${label}.eventTypes must be unique kebab-case values`);
    }
    if (!nonEmpty(gate?.unlocks)) errors.push(`${label}.unlocks must be non-empty`);
    if (!nonEmpty(gate?.source)) errors.push(`${label}.source must be non-empty`);
  }
  return errors;
}

function validateAdoptionEvent(event, gateById) {
  const errors = [];
  if (!event || typeof event !== 'object' || Array.isArray(event)) return ['event must be an object'];
  if (event.kind !== 'cc-adoption-event') errors.push('kind must be cc-adoption-event');
  if (event.version !== '1.0.0') errors.push('version must be 1.0.0');
  if (!KEBAB.test(event.id || '')) errors.push('id must be kebab-case');
  const gate = gateById.get(event.gateId);
  if (!gate) errors.push(`unknown gateId ${event.gateId || '(missing)'}`);
  if (gate && !gate.eventTypes.includes(event.eventType)) errors.push(`eventType ${event.eventType || '(missing)'} is not allowed for ${event.gateId}`);
  if (!SUBJECT_KEY.test(event.subjectKey || '')) errors.push('subjectKey must be a non-identifying stable key');
  if (!EXTERNAL_ACTOR_CLASSES.has(event.externalActorClass)) errors.push('externalActorClass must identify an external actor');
  if (!validTimestamp(event.occurredAt)) errors.push('occurredAt must be a timestamp');
  if (!validTimestamp(event.recordedAt)) errors.push('recordedAt must be a timestamp');
  if (validTimestamp(event.occurredAt) && validTimestamp(event.recordedAt)
      && new Date(event.recordedAt) < new Date(event.occurredAt)) {
    errors.push('recordedAt cannot precede occurredAt');
  }
  if (!boundedText(event.summary)) errors.push('summary must be 1-240 characters and contain no email address');

  if (!Array.isArray(event.evidence) || event.evidence.length === 0) {
    errors.push('evidence must contain at least one retained reference');
  } else {
    for (const [index, evidence] of event.evidence.entries()) {
      if (!EVIDENCE_KINDS.has(evidence?.kind)) errors.push(`evidence[${index}].kind is invalid`);
      if (!EVIDENCE_REFERENCE.test(evidence?.reference || '')) errors.push(`evidence[${index}].reference is not privacy-safe`);
      if (!validTimestamp(evidence?.observedAt)) errors.push(`evidence[${index}].observedAt must be a timestamp`);
      if (!boundedText(evidence?.note)) errors.push(`evidence[${index}].note must be bounded and contain no email address`);
    }
  }

  if (!REVIEW_STATUSES.has(event.review?.status)) errors.push('review.status is invalid');
  if (!boundedText(event.review?.rationale)) errors.push('review.rationale must be bounded and contain no email address');
  if (event.review?.status === 'confirmed') {
    if (!REVIEWER_ROLES.has(event.review?.reviewerRole)) errors.push('confirmed event requires founder or release-owner review');
    if (!validTimestamp(event.review?.reviewedAt)) errors.push('confirmed event requires reviewedAt');
    if (validTimestamp(event.occurredAt) && validTimestamp(event.review?.reviewedAt)
        && new Date(event.review.reviewedAt) < new Date(event.occurredAt)) {
      errors.push('reviewedAt cannot precede occurredAt');
    }
  }

  if (event.privacy?.containsContactDetails !== false) errors.push('privacy.containsContactDetails must be false');
  if (event.privacy?.containsPrivateValues !== false) errors.push('privacy.containsPrivateValues must be false');
  if (typeof event.privacy?.redactionsApplied !== 'boolean') errors.push('privacy.redactionsApplied must be boolean');
  if (!boundedText(event.privacy?.note)) errors.push('privacy.note must be bounded and contain no email address');
  if (!boundedText(event.claimBoundary?.supports)) errors.push('claimBoundary.supports must be bounded');
  if (!boundedText(event.claimBoundary?.doesNotSupport)) errors.push('claimBoundary.doesNotSupport must be bounded');
  return errors;
}

function adoptionEventCounts(event, gateById) {
  return event?.kind === 'cc-adoption-event'
    && event?.review?.status === 'confirmed'
    && validateAdoptionEvent(event, gateById).length === 0;
}

function adoptionGateStates(registry, confirmedEvents) {
  return (registry?.gates || []).map(gate => {
    const matching = confirmedEvents.filter(event => event.gateId === gate.id && gate.eventTypes.includes(event.eventType));
    const distinctSubjects = [...new Set(matching.map(event => event.subjectKey))];
    return {
      id: gate.id,
      threshold: gate.threshold,
      confirmedDistinctSubjects: distinctSubjects.length,
      open: distinctSubjects.length >= gate.threshold,
      unlocks: gate.unlocks
    };
  });
}

function checkAdoptionFixtures(registry) {
  const gate = registry?.gates?.[0];
  if (!gate) return;
  const gateById = new Map(registry.gates.map(item => [item.id, item]));
  const base = {
    kind: 'cc-adoption-event',
    version: '1.0.0',
    id: 'fixture-external-event',
    gateId: gate.id,
    eventType: gate.eventTypes[0],
    subjectKey: 'fixture-subject',
    externalActorClass: 'external-person',
    occurredAt: '2026-07-15T12:00:00Z',
    recordedAt: '2026-07-15T12:10:00Z',
    summary: 'An external person completed one bounded use attempt.',
    evidence: [{
      kind: 'private-receipt-id',
      reference: 'receipt:fixture-001',
      observedAt: '2026-07-15T12:05:00Z',
      note: 'Fixture evidence reference.'
    }],
    review: {status: 'pending', rationale: 'Awaiting confirmation.'},
    privacy: {
      containsContactDetails: false,
      containsPrivateValues: false,
      redactionsApplied: true,
      note: 'Fixture contains no identity or values.'
    },
    claimBoundary: {
      supports: 'One external use attempt occurred.',
      doesNotSupport: 'Broader adoption or product quality.'
    }
  };
  if (adoptionEventCounts(base, gateById)) failures.push('adoption fixture: pending event counted');
  const confirmed = {
    ...base,
    review: {
      status: 'confirmed',
      reviewerRole: 'founder',
      reviewedAt: '2026-07-15T12:11:00Z',
      rationale: 'External event and evidence confirmed.'
    }
  };
  if (!adoptionEventCounts(confirmed, gateById)) failures.push('adoption fixture: valid confirmed external event did not count');
  if (adoptionEventCounts({...confirmed, externalActorClass: 'internal-agent'}, gateById)) {
    failures.push('adoption fixture: internal event counted');
  }
  if (adoptionEventCounts({...confirmed, evidence: []}, gateById)) {
    failures.push('adoption fixture: evidence-free event counted');
  }
  if (adoptionEventCounts({...confirmed, kind: 'cc-adoption-event-template'}, gateById)) {
    failures.push('adoption fixture: template counted');
  }
  const thresholdEvents = Array.from({length: gate.threshold}, (_, index) => ({
    ...confirmed,
    id: `fixture-external-event-${index + 1}`,
    subjectKey: `fixture-subject-${index + 1}`
  }));
  const thresholdState = adoptionGateStates(registry, thresholdEvents).find(item => item.id === gate.id);
  if (!thresholdState?.open) failures.push('adoption fixture: threshold did not open after enough distinct confirmed subjects');
  if (gate.threshold > 1) {
    const duplicateSubjects = thresholdEvents.map(event => ({...event, subjectKey: 'fixture-duplicate-subject'}));
    const duplicateState = adoptionGateStates(registry, duplicateSubjects).find(item => item.id === gate.id);
    if (duplicateState?.open) failures.push('adoption fixture: duplicate subject opened a multi-subject gate');
  }
}

function checkAdoptionGates() {
  for (const rel of [
    'content/operations/schemas/adoption.schema.json',
    'content/operations/schemas/adoption-event.schema.json',
    'content/operations/templates/adoption-event.json',
    'content/operations/ADOPTION-RUNBOOK.md'
  ]) expectFile(rel, 'adoption-gate runtime artifact');
  json('content/operations/schemas/adoption.schema.json');
  json('content/operations/schemas/adoption-event.schema.json');
  const template = json('content/operations/templates/adoption-event.json');
  if (template?.kind !== 'cc-adoption-event-template') {
    failures.push('content/operations/templates/adoption-event.json: template kind must remain non-countable');
  }
  const registry = json('content/operations/adoption.json');
  if (!registry) return {recordedEventCount: 0, confirmedEventCount: 0, openGateCount: 0, lockedGateCount: 0, gates: []};
  for (const error of validateAdoptionRegistry(registry)) failures.push(`content/operations/adoption.json: ${error}`);
  for (const source of registry.strategySources || []) {
    const rel = String(source).split('#')[0];
    if (!exists(rel)) failures.push(`content/operations/adoption.json: missing strategy source ${rel}`);
  }
  const gateById = new Map((registry.gates || []).map(gate => [gate.id, gate]));
  const records = jsonLines(registry.eventLedger || 'content/operations/adoption-events.jsonl');
  const initRecords = records.filter(record => record.kind === 'cc-adoption-ledger-init');
  if (initRecords.length !== 1) failures.push(`adoption ledger must contain exactly one initialization record, found ${initRecords.length}`);
  if (initRecords.length === 1) {
    const init = initRecords[0];
    if (init.version !== '1.0.0') failures.push('adoption ledger initialization version must be 1.0.0');
    if (!validTimestamp(init.createdAt)) failures.push('adoption ledger initialization requires createdAt');
    if (!nonEmpty(init.note)) failures.push('adoption ledger initialization requires a note');
  }
  const unexpected = records.filter(record => !['cc-adoption-ledger-init', 'cc-adoption-event'].includes(record.kind));
  for (const record of unexpected) failures.push(`adoption ledger contains non-event kind ${record.kind || '(missing)'}`);
  const events = records.filter(record => record.kind === 'cc-adoption-event');
  const ids = new Set();
  const valid = [];
  for (const [index, event] of events.entries()) {
    if (ids.has(event.id)) failures.push(`adoption event ${event.id} is duplicated`);
    ids.add(event.id);
    const errors = validateAdoptionEvent(event, gateById);
    for (const error of errors) failures.push(`adoption event ${event.id || index + 1}: ${error}`);
    if (errors.length === 0) valid.push(event);
  }
  const confirmed = valid.filter(event => event.review.status === 'confirmed');
  const pending = valid.filter(event => event.review.status === 'pending');
  const rejected = valid.filter(event => event.review.status === 'rejected');
  if (pending.length) warnings.push(`${pending.length} adoption event(s) pending review; none count`);
  const gates = adoptionGateStates(registry, confirmed);
  checkAdoptionFixtures(registry);
  return {
    recordedEventCount: events.length,
    confirmedEventCount: confirmed.length,
    pendingEventCount: pending.length,
    rejectedEventCount: rejected.length,
    openGateCount: gates.filter(gate => gate.open).length,
    lockedGateCount: gates.filter(gate => !gate.open).length,
    gates
  };
}

function expectFile(rel, reason) {
  if (!exists(rel)) failures.push(`${rel}: missing ${reason || 'required file'}`);
}

function expectIncludes(rel, needle, reason) {
  const text = read(rel);
  if (!text.includes(needle)) failures.push(`${rel}: missing ${reason || needle}`);
}

function expectMatch(rel, regex, reason) {
  const text = read(rel);
  if (!regex.test(text)) failures.push(`${rel}: missing ${reason || regex}`);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function coverage(ds) {
  const products = ds.products || [];
  const criteria = ds.criteria || [];
  const tier = {};
  for (const c of criteria) tier[c.key] = c.tier || 'assessed';
  const openData = !!(ds.meta && ds.meta.productBase);
  let good = 0;
  let total = 0;
  for (const p of products) {
    for (const c of criteria) {
      const v = p.scores && p.scores[c.key];
      if (v == null) continue;
      total += 1;
      const pv = p.provenance && p.provenance[c.key];
      if (
        openData ||
        (pv && typeof pv === 'object' && pv.source) ||
        tier[c.key] === 'measured' ||
        tier[c.key] === 'certified' ||
        (NOTE_OK[c.key] && typeof pv === 'string' && pv.trim())
      ) good += 1;
    }
  }
  return { good, total, pct: total ? good / total : 0 };
}

function scoreRange(ds) {
  const criteria = ds.criteria || [];
  const avgs = (ds.products || []).map(p => {
    const vals = criteria.map(c => p.scores && p.scores[c.key]).filter(Number.isFinite);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }).filter(Number.isFinite);
  if (!avgs.length) return { min: null, max: null };
  return { min: Math.min(...avgs), max: Math.max(...avgs) };
}

function parseCatGuide(app) {
  const m = app.match(/const CAT_GUIDE=\{([\s\S]*?)\n\};/);
  const out = new Map();
  if (!m) return out;
  for (const hit of m[1].matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) out.set(hit[1], hit[2]);
  return out;
}

function functionBlock(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) {
    failures.push(`app/app.js: missing ${name}() for decision-surface audit`);
    return '';
  }
  const next = source.indexOf('\nfunction ', start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

function markedBlock(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = start < 0 ? -1 : source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    failures.push(`app/app.js: missing ${label} markers for decision-surface audit`);
    return '';
  }
  return source.slice(start, end);
}

function checkPublicHome() {
  expectFile('index.html', 'Values Commons public home');
  for (const target of [
    'app/index.html',
    'tour/index.html',
    'standard/index.html',
    'passport/index.html',
    'instances/index.html',
    'contribute/index.html',
    'weave/index.html'
  ]) {
    expectIncludes('index.html', target, `first-use link to ${target}`);
  }
  // The public home MUST make its core promises — but assert the guarantee, not a fixed phrasing,
  // so the copy can stay human. (Locking exact fragments was itself the AI-cadence we're removing.)
  for (const [re, label] of [
    [/no account|without (an? )?account|nothing to sign|no sign[- ]?up/i, 'no accounts'],
    [/no tracking|don'?t track|ads,? tracking|no.{0,6}tracking/i, 'no tracking'],
    [/no ads|ad[- ]free|runs on ads|ads,? tracking/i, 'no ads'],
    [/pay[- ]to[- ]rank|pay to rank/i, 'no pay-to-rank'],
    [/inspect the evidence|evidence is inspectable|sourced fact|carries its date|provenance/i, 'evidence is inspectable']
  ]) {
    expectMatch('index.html', re, `public-home promise: ${label}`);
  }
  expectMatch('index.html', /See other apps|Try live apps|Three tools, one engine/i, 'public-home reference: app catalogue');
  for (const phrase of ['Conscious Consuming']) {
    expectIncludes('index.html', phrase, `public-home reference: ${phrase}`);
  }
}

function checkAppShell(app) {
  expectFile('app/index.html', 'Conscious Consuming app shell');
  for (const view of APP_VIEWS) {
    expectIncludes('app/index.html', `id="view-${view}"`, `view container #view-${view}`);
  }
  for (const route of ['#home', '#map', '#guides', '#scan', '#you']) {
    expectIncludes('app/index.html', route, `primary navigation route ${route}`);
  }
  for (const phrase of [
    'weighted to your values, not ours',
    'no brand pays us',
    'Open Food Facts',
    'Read the full method'
  ]) {
    expectIncludes('app/index.html', phrase, `app-shell trust cue: ${phrase}`);
  }

  for (const sourceNeedle of [
    'function renderHome()',
    'homedemo',
    'valuescta',
    'function renderGuidesList()',
    'function renderGuide(slug)',
    'function renderContribute(arg)',
    'function renderValues()',
    'function renderDecide(cid,facet)',
    'function renderCard(cid, code)',
    'function renderDomain(arg)',
    'function renderMap()',
    'function renderGarden()',
    'function route()',
    'case \'guide\'',
    'view===\'explore\'',
    'view===\'item\'',
    'view===\'card\'',
    'view===\'decide\''
  ]) {
    if (!app.includes(sourceNeedle)) failures.push(`app/app.js: missing first-use implementation cue ${sourceNeedle}`);
  }
}

function checkDecisionSurface(app) {
  const styles = read('app/styles.css');
  const sharedDecision = read('app/decision.js');
  const index = json('app/data/index.json');
  for (const cue of [
    'function primaryNavSection(name)',
    'function categoryMatterLine(category)',
    'function domainDifferencesSentence(categories)',
    "`${rankingLabel} · ${arr.length} eligible match",
    "${allergenFoldedLast.length} need a label check"
  ]) {
    if (!app.includes(cue)) failures.push(`app/app.js: missing decision-page calm cue ${cue}`);
  }

  const nav = functionBlock(app, 'setNavActive');
  if (!nav.includes("document.querySelectorAll('.nav,.tabbar')") || !nav.includes('let claimed=false')) {
    failures.push('app/app.js: primary navigation must claim at most one active item per visible navigation surface');
  }
  if (styles.includes('.navlinks a:hover::after')) {
    failures.push('app/styles.css: hover must not draw a second persistent-looking navigation underline');
  }
  if (!styles.includes('.navlinks a.active::after')) {
    failures.push('app/styles.css: the single active desktop navigation item needs its orientation marker');
  }

  const inventorySignal = /\.toLocaleString\(\)|\b(?:base|c|lc|p)\.n\b|\bnOpts\b|\bliveN\b|\btotalN\b/;
  // renderBrowse retired 2026-07-19 (the atlas + lattice are the browse; #browse redirects to #map),
  // so it leaves this no-inventory-signal membership list with the surface it described.
  for (const name of ['commonsMapHTML', 'renderDomain', 'renderMap', 'renderGarden', 'plantSVG']) {
    if (inventorySignal.test(functionBlock(app, name))) {
      failures.push(`app/app.js: ${name}() must describe decisions, not expose or encode inventory size`);
    }
  }

  const sidebar = markedBlock(
    app,
    '// The category sidebar follows the same human-needs spine as Explore.',
    "const extra=el('div',{class:'catextra'});",
    'category sidebar'
  );
  if (inventorySignal.test(sidebar)) {
    failures.push('app/app.js: category sidebar must not show or sort by warehouse counts');
  }

  for (const legacy of [
    'options across the shelf',
    "+' grown'",
    'category, all ${CATALOG.length}',
    '${(c.n||0).toLocaleString()}</span>'
  ]) {
    if (app.includes(legacy)) failures.push(`app/app.js: decorative inventory copy returned (${legacy})`);
  }

  if (index) {
    const withoutDecisionCue = (index.categories || []).filter(category =>
      !(category.criteria || []).some(criterion => String(criterion.label || '').trim())
    );
    if (withoutDecisionCue.length) {
      failures.push(`app/data/index.json: categories without criteria-derived what-matters copy (${withoutDecisionCue.map(c => c.id).join(', ')})`);
    }

    const pilots = new Set(['coffee', 'banking']);
    const categories = new Map((index.categories || []).map(category => [category.id, category]));
    for (const cid of categories.keys()) {
      const category = categories.get(cid);
      const decision = category && category.decision;
      if (!decision) {
        failures.push(`app/data/index.json: ${cid} missing generated Round 4 decision contract`);
        continue;
      }
      if (decision.category !== cid) failures.push(`app/data/index.json: ${cid} decision category drift`);
      if (!decision.reads || !String(decision.reads.text || '').trim()) failures.push(`app/data/index.json: ${cid} missing signed differences sentence`);
      if (!Array.isArray(decision.axes) || decision.axes.length < 1 || decision.axes.length > 3) failures.push(`app/data/index.json: ${cid} must expose 1-3 practical axes`);
      const slots = new Set(decision.archetypes || []);
      if (!slots.has('best-for-most') || !slots.has('strictest-match')) failures.push(`app/data/index.json: ${cid} missing core computed answer recipes`);
      if (slots.has('budget-honest') !== !!(decision.budget && decision.budget.available)) failures.push(`app/data/index.json: ${cid} budget answer eligibility drift`);
      if (slots.has('budget-honest') && (decision.budget.knownEntries || 0) < (decision.budget.minimumKnown || 0)) failures.push(`app/data/index.json: ${cid} budget answer lacks enough known facts`);
      if (!decision.page || decision.page.primaryRoute !== true) failures.push(`app/data/index.json: ${cid} Round 9 primary-route posture drift`);
      const expectedStage = pilots.has(cid) ? 'approved-pilot' : 'approved-batch';
      if (!decision.page || decision.page.stage !== expectedStage) failures.push(`app/data/index.json: ${cid} expected ${expectedStage} page posture`);
    }
  }

  const contractSurface = markedBlock(
    app,
    '// J4 / Round 4. The signed decision contract is the only category configuration here.',
    'function renderLegacyDecide(cid,facet)',
    'Round 4 decision component'
  );
  for (const cue of [
    'DATA.meta.decision',
    'contract.axes',
    'function decisionFloorRuleMatches',
    'function decisionWeights',
    'function decisionRecipes',
    'function decisionMathHTML',
    'function decisionNextHTML',
    'Rank all ${result.ranked.length} with these choices',
    'A balanced view. Set a rule or change a choice to make it yours.'
  ]) {
    if (!contractSurface.includes(cue)) failures.push(`app/app.js: Round 4 decision component missing ${cue}`);
  }
  for (const cue of ['contract.archetypes', 'seen.has(code)', 'Show the math']) {
    if (!sharedDecision.includes(cue)) failures.push(`app/decision.js: shared decision component missing ${cue}`);
  }
  for (const cue of ['function rankingHref', 'function decisionPrimaryCategory', "view==='rank'", 'decision-review-links']) {
    if (!app.includes(cue) && !styles.includes(cue)) failures.push(`Round 5 pilot route/follow-through missing ${cue}`);
  }
  if (/how much do you care|your values/i.test(contractSurface)) {
    failures.push('app/app.js: practical decision component must not ask for identity-performance value weights');
  }
  const dialRanking = functionBlock(app, 'decisionScored');
  if (!app.includes('CC.decisionPage.dialWeights') || !sharedDecision.includes('out[criterion.key]=0')) {
    failures.push('app/decision.js: decision ranking must start from visible dial criteria, not hidden value weights');
  }
  if (!dialRanking.includes('themeDefaults(DATA.criteria)') || !dialRanking.includes('CC.decisionPage.ranked') || !sharedDecision.includes('b.tie&&b.tie.score')) {
    failures.push('app/decision.js: theme leanings must remain an explicit tie-break after practical dial ranking');
  }
  for (const cue of [
    '.decision-context',
    '.decision-dial-control',
    '.decision-answer-grid',
    '.decision-math',
    '.decision-all>summary'
  ]) {
    if (!styles.includes(cue)) failures.push(`app/styles.css: missing Round 4 decision style ${cue}`);
  }
}

function checkFlagshipData(app) {
  const index = json('app/data/index.json');
  if (!index) return;
  const guidesJs = read('app/guides.js');
  const cats = new Map((index.categories || []).map(c => [c.id, c]));
  const catGuide = parseCatGuide(app);

  for (const cid of FLAGSHIP_CATEGORIES) {
    const cat = cats.get(cid);
    if (!cat) {
      failures.push(`app/data/index.json: missing flagship category ${cid}`);
      continue;
    }
    if ((cat.n || 0) < 20) failures.push(`${cid}: too few entries for a first-use flagship (${cat.n || 0})`);
    const ds = json(path.join('app/data', cat.file || `${cid}.json`));
    if (!ds) continue;
    const c = coverage(ds);
    if (c.total && c.pct < 0.99) failures.push(`${cid}: sourced evidence below 99% (${c.good}/${c.total})`);
    const range = scoreRange(ds);
    if (range.min == null || range.max == null) failures.push(`${cid}: no score range available`);
    else if (range.max - range.min < 20) warnings.push(`${cid}: narrow score range (${range.min}-${range.max}); ranking may feel less alive`);
    if (!catGuide.has(cid)) failures.push(`CAT_GUIDE missing ${cid}`);
    const guide = catGuide.get(cid);
    const guideRe = guide && new RegExp(`["']slug["']\\s*:\\s*["']${escapeRegExp(guide)}["']`);
    if (guide && !guideRe.test(guidesJs)) {
      failures.push(`${cid}: CAT_GUIDE target ${guide} not found in app/guides.js`);
    }
  }

  for (const rel of [
    'app/c/index.html',
    'app/c/banking/chase.html',
    'app/c/phones/fairphone.html',
    'app/c/ai-assistants/chatgpt.html'
  ]) {
    expectFile(rel, 'shareable first-use verdict page');
  }
}

function checkPreviewDocs() {
  expectFile('docs/GRANT-PREVIEW-PATH.md', 'grant preview path');
  for (const phrase of [
    '/tour/',
    '/app/#decide/banking',
    '/app/#you',
    '/assembly/',
    '/slate/',
    '/workshop/',
    'npm run prepare:preview'
  ]) {
    expectIncludes('docs/GRANT-PREVIEW-PATH.md', phrase, `preview walkthrough step ${phrase}`);
  }
  expectIncludes('docs/MATURITY-PROGRAM.md', 'Product and first-use polish', 'Part 3 maturity track');
}

function checkCoreBasics(app) {
  // This audit has printed "region refreshes every route" since the S2 batch, with nothing behind
  // it. It was not true: cycleRegion re-rendered only when no item, saved list or notes view was
  // open, so changing region on a decision page, an item, the map, search or discover left the
  // previous region's answer sitting on screen — a US chooser was shown Triodos, a bank they cannot
  // open. Fixed 2026-07-16; pinned here so the claim and the code cannot drift apart again.
  if (!app.includes('function regionRerender()')) {
    failures.push('app/app.js: region change has no shared re-render path (function regionRerender)');
  }
  if (!/function cycleRegion\(\)\{[\s\S]{0,600}?regionRerender\(\);/.test(app)) {
    failures.push('app/app.js: cycleRegion must re-render through regionRerender');
  }
  if (app.includes('if(DATA&&!selected&&!viewingSaved&&!viewingFeedback)render();')) {
    failures.push('app/app.js: the old region guard is back — it re-renders only the plain list view');
  }
  if (!/function regionRerender\(\)\{[\s\S]{0,500}?route\(\);/.test(app)) {
    failures.push('app/app.js: regionRerender must rebuild non-explore views from their own route');
  }
  if (!/function regionRerender\(\)\{[\s\S]{0,200}?if\(scanState\)return;/.test(app)) {
    failures.push('app/app.js: regionRerender must not tear down a live scanner');
  }

  // "directory stays off leaf pages" was printed here for a week while an item page opened under
  // the full category tree and tune panel (the founder's ambush report). The claim is only allowed
  // to print because these assertions hold: render() flips leaf mode, and the stylesheet actually
  // hides the list chrome in that mode.
  const styles = read('app/styles.css');
  if (!app.includes("classList.toggle('leaf'")) {
    failures.push('app/app.js: render() must set leaf mode on #view-explore for item pages');
  }
  for (const chrome of ['#view-explore.leaf>#cats', '#view-explore.leaf>.panel', '#view-explore.leaf>#exptoggle']) {
    if (!styles.includes(chrome)) failures.push(`app/styles.css: leaf mode must hide the list chrome (${chrome})`);
  }
  // The key registry: "Export my data" and "Delete everything" both walk CC_KEYS, so every key the
  // app writes must be registered. These six were found unregistered on 2026-07-16 — delete-all
  // quietly kept the Trust Lens, theme, force counter, errand state, dev channel and ceremony keys.
  const registry = app.match(/const CC_KEYS=\[[\s\S]*?\];/);
  if (!registry) {
    failures.push('app/app.js: CC_KEYS registry missing');
  } else {
    for (const key of ['TRUST_LENS_KEY', 'THEME_KEY', 'CH_KEY', 'FORCE_KEY', 'CEREM_KEY', 'ERRAND_KEY']) {
      if (!registry[0].includes(key)) failures.push(`app/app.js: CC_KEYS must register ${key} — export and delete-all walk this list`);
    }
  }
}

function checkPlainWordsBatch(app) {
  const rel = 'docs/DECISION-REFRAME-FOUNDER-REVIEW.md';
  const review = read(rel);
  const decision = read('app/decision.js');
  const shell = read('app/shell.js');
  const appHTML = read('app/index.html');
  const kosplora = read('kosplora/index.html');
  const filePage = read('passport/index.html');
  const glossary = 'My rules · The baseline · Tasks · Price or quality · Your file · Close-call priorities';
  const samples = [
    '### Sample 1 · Home: My rules',
    '### Sample 2 · Decision page: The baseline',
    '### Sample 3 · Explore: Tasks',
    '### Sample 4 · Decision page: Price or quality',
    '### Sample 5 · You: Your file and Advanced'
  ];

  if (!review.includes(glossary)) {
    failures.push(`${rel}: missing the complete twelve-word S2 glossary pilot`);
  }
  const sampleCount = (review.match(/^### Sample \d+ ·/gm) || []).length;
  if (sampleCount !== samples.length) {
    failures.push(`${rel}: S2 must present exactly five contextual samples, found ${sampleCount}`);
  }
  for (const sample of samples) {
    if (!review.includes(sample)) failures.push(`${rel}: missing S2 pilot ${sample}`);
  }
  for (const phrase of [
    'Founder signature: **signed in the project thread on 2026-07-15**',
    'Batch status: **authorized; Round 3 built for the founder walk**',
    'Numbered round requests are sufficient continuation instructions.',
    'The sigil and downloadable leanings card do not appear in the primary flow.'
  ]) {
    if (!review.includes(phrase)) failures.push(`${rel}: missing S2 gate language (${phrase})`);
  }

  for (const required of ['The baseline', 'My rules', 'Tasks', 'Download your file', 'Advanced: Close-call priorities', 'What matters here']) {
    if (!app.includes(required)) failures.push(`app/app.js: signed S2 wording missing (${required})`);
  }
  for (const retired of ['The shared floor', 'Practical dials', 'Your lines', 'Set a line', 'Export my passport', 'Import a passport', 'Your leanings', 'Download the leanings card']) {
    if (app.includes(retired)) failures.push(`app/app.js: retired chooser wording remains (${retired})`);
  }
  if (!app.includes("if(!chDev()){location.replace('#you');return;}")) {
    failures.push('app/app.js: public workbench route is not redirected to You');
  }
  const youStart = app.indexOf('function renderYou()');
  const youEnd = app.indexOf('function renderWorkbench()', youStart);
  const youSurface = app.slice(youStart, youEnd);
  for (const retiredFlow of ['id="you-sigil"', 'id="you-card"']) {
    if (youSurface.includes(retiredFlow)) failures.push(`app/app.js: ${retiredFlow} remains in the primary You flow`);
  }
  for (const [name, source, required] of [
    ['app/decision.js', decision, ['The baseline and your rules', 'with these choices']],
    ['app/shell.js', shell, ['The baseline is on', 'My rules', 'Advanced: Close-call priorities', 'What matters here']],
    ['app/index.html', appHTML, ['href="#you" id="navvalues"', 'Advanced: close-call priorities']],
    ['kosplora/index.html', kosplora, ['Close-call priorities stay optional', 'The baseline and my rules']],
    ['passport/index.html', filePage, ['Your file is small, nameless, and yours to keep', 'technical format is called an Open Values Passport']]
  ]) {
    for (const phrase of required) if (!source.includes(phrase)) failures.push(`${name}: signed S2 wording missing (${phrase})`);
  }
  for (const [name, source] of [['app/decision.js', decision], ['app/shell.js', shell], ['kosplora/index.html', kosplora]]) {
    for (const phrase of ['Shared floor and personal lines', 'Practical dials', 'Your lines', 'Portable leanings']) {
      if (source.includes(phrase)) failures.push(`${name}: retired chooser wording remains (${phrase})`);
    }
  }
}

function main() {
  const app = read('app/app.js');
  checkPublicHome();
  checkAppShell(app);
  checkDecisionSurface(app);
  checkFlagshipData(app);
  checkPreviewDocs();
  const adoption = checkAdoptionGates();
  checkCoreBasics(app);
  checkPlainWordsBatch(app);

  console.log('First-use audit');
  console.log(`  flagship categories: ${FLAGSHIP_CATEGORIES.length}`);
  console.log(`  app views checked: ${APP_VIEWS.length}`);
  console.log('  core basics: region refreshes every route; directory stays off leaf pages; route selection never expands it');
  console.log('  plain-words batch: signed glossary · five samples · chooser surfaces enforced');
  console.log('  decision surfaces: calm nav + no warehouse counts + contract-driven answer foundation');
  console.log(`  adoption events: ${adoption.confirmedEventCount} confirmed / ${adoption.recordedEventCount} recorded`);
  console.log(`  adoption gates: ${adoption.openGateCount} open / ${adoption.lockedGateCount} locked`);
  console.log(`  warnings: ${warnings.length}`);
  for (const warning of warnings) console.log(`  WARN ${warning}`);

  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    process.exit(1);
  }

  console.log('FIRST-USE CHECKS PASS');
}

if (require.main === module) main();

module.exports = {
  adoptionGateStates,
  adoptionEventCounts,
  checkAdoptionFixtures,
  checkAdoptionGates,
  validateAdoptionEvent,
  validateAdoptionRegistry
};
