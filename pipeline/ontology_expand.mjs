#!/usr/bin/env node
/* Ontology expansion with DeepSeek: propose, verify, then let the pipeline decide.
 *
 * The founder's ask: work with DeepSeek to flesh out the ontology and get far more content across
 * the board for a demo. DeepSeek's fast model is deepseek-chat (their naming; there is no "flash"
 * tier — that is Gemini's word), and this script uses it with JSON-mode output.
 *
 * WHAT THIS DOES AND REFUSES TO DO. It reads the current ontology from app/data/index.json —
 * needs, groups, decisions, and the 44-key criteria vocabulary — and asks the model, one need at a
 * time, for NEW decision categories that belong there: id, label, group (existing or proposed),
 * why the choice matters, criteria drawn from the existing vocabulary first, and candidate PUBLIC
 * data sources with URLs. Proposals land in content/proposals/, never in app/data. A model's
 * output is a lead, not a fact: nothing enters the catalogue except through the existing build
 * pipeline, after its sources check out.
 *
 * THE VERIFY PASS IS NOT OPTIONAL FOR ACCEPTANCE. --verify fetches every proposed source URL and
 * records status and reachability on each proposal. This project's standing rule (recorded after
 * the citation work on the research site): a generated citation is unverified until a fetch has
 * seen it, and unverified sources are marked, never silently kept. Proposals whose sources all
 * fail stay in the file, flagged, so the gap they point at is still visible.
 *
 * Usage:
 *   DEEPSEEK_API_KEY=...  node pipeline/ontology_expand.mjs --need protect        # one need
 *   DEEPSEEK_API_KEY=...  node pipeline/ontology_expand.mjs --all                 # all eight
 *   node pipeline/ontology_expand.mjs --verify content/proposals/<file>.json      # check sources
 *
 * Exit codes: 0 wrote proposals (or verified), 1 real failure, 2 missing key — stated, not hidden. */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const OUT_DIR = path.join(ROOT, 'content', 'proposals');
const API = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

const args = process.argv.slice(2);
const flag = (name) => args.includes('--' + name);
const val = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };

function loadOntology() {
  const d = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
  const needs = d.ontology.needs;
  const byNeed = {};
  const criteriaVocab = new Set();
  for (const c of d.categories) {
    (byNeed[c.need] = byNeed[c.need] || []).push({ id: c.id, label: c.label, group: c.group || null });
    for (const cr of c.criteria || []) criteriaVocab.add(cr.key);
  }
  return { needs, byNeed, criteriaVocab: [...criteriaVocab].sort() };
}

function prompt(need, existing, vocab) {
  return [
    'You help expand the catalogue of an open, non-commercial comparison site. Its unit is the',
    'DECISION: a category of product or service a person chooses between (like "banking" or',
    '"coffee"), compared on named criteria from public data. Propose NEW decisions for the need',
    `"${need.label}" (${need.reads || ''}).`,
    '',
    `Already covered (do not repeat): ${existing.map(e => e.id).join(', ')}.`,
    `Existing groups in this need: ${[...new Set(existing.map(e => e.group).filter(Boolean))].join(', ') || 'none yet'}.`,
    `Criteria vocabulary already in use (prefer these keys): ${vocab.join(', ')}.`,
    '',
    'Rules. Each proposal must be a decision ordinary people actually face, where options genuinely',
    'differ on public, checkable grounds. Prefer decisions with open datasets or published ratings.',
    'Name real, public sources with their actual URLs; if you are not confident a URL is real, set',
    '"confident": false on that source rather than inventing one. Reuse existing groups where they',
    'fit; propose a new group only when nothing fits, and give it a short plain name.',
    '',
    'Return JSON: {"proposals":[{"id":"kebab-case","label":"Plain name","group":"Group name",',
    '"newGroup":false,"why":"one sentence on what rides on this choice","criteria":["key",...],',
    '"newCriteria":["key",...],"sources":[{"name":"...","url":"https://...","confident":true}]}]}',
    'Between 4 and 10 proposals. No commentary outside the JSON.'
  ].join('\n');
}

/* Retries, and errors that say what actually happened. The first field run died with the two
   words "fetch failed", which is undici hiding its cause: a transient network refusal looked
   identical to a wrong key. Now transient failures retry with backoff, an auth rejection says to
   check the stored key's length with -Check, and the cause chain is printed instead of dropped. */
async function callDeepSeek(key, content) {
  var lastErr = null;
  for (var attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content }],
          response_format: { type: 'json_object' },
          temperature: 1.0,
          max_tokens: 4000
        }),
        signal: AbortSignal.timeout(120000)
      });
      if (res.status === 401 || res.status === 403) {
        throw Object.assign(new Error('DeepSeek rejected the key (HTTP ' + res.status + '). Check what is stored ' +
          'with: npm run secret:deepseek -- -Check   (a bad paste stores a short key; re-run npm run secret:deepseek)'),
          { fatal: true });
      }
      if (!res.ok) throw new Error('DeepSeek HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200));
      const body = await res.json();
      const text = body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content;
      if (!text) throw new Error('empty completion');
      return JSON.parse(text);
    } catch (e) {
      if (e.fatal) throw e;
      lastErr = e;
      var causes = [];
      var c = e.cause;
      while (c) { causes.push(c.code || c.message || String(c)); c = c.cause; }
      console.log('');
      console.log('    attempt ' + attempt + '/3 failed: ' + e.message + (causes.length ? ' [' + causes.join(' <- ') + ']' : ''));
      if (attempt < 3) await new Promise(function (z) { setTimeout(z, attempt * 2000); });
    }
  }
  throw lastErr;
}

async function verifyFile(file) {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  let checked = 0, ok = 0;
  for (const p of doc.proposals) {
    for (const s of p.sources || []) {
      checked++;
      try {
        const res = await fetch(s.url, { method: 'GET', redirect: 'follow',
          headers: { 'user-agent': 'consciousconsuming-source-check' }, signal: AbortSignal.timeout(15000) });
        s.verified = res.ok;
        s.httpStatus = res.status;
        if (res.ok) ok++;
      } catch (e) {
        s.verified = false;
        s.error = String(e && e.message || e).slice(0, 120);
      }
    }
    p.allSourcesVerified = (p.sources || []).length > 0 && p.sources.every(s => s.verified);
  }
  doc.verifiedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
  console.log(`  sources checked: ${checked}, reachable: ${ok}, proposals fully verified: ` +
    `${doc.proposals.filter(p => p.allSourcesVerified).length}/${doc.proposals.length}`);
  return 0;
}

async function main() {
  console.log('Ontology expansion (DeepSeek ' + MODEL + ')');

  const verifyTarget = flag('verify') ? args[args.indexOf('--verify') + 1] : null;
  if (verifyTarget) {
    if (!fs.existsSync(verifyTarget)) { console.log('  no such file: ' + verifyTarget); return 1; }
    return await verifyFile(verifyTarget);
  }

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.log('  DEEPSEEK_API_KEY is not set. Nothing was generated and nothing pretended to be.');
    console.log('  The safe path: store the key once, encrypted to your Windows account, with');
    console.log('    npm run secret:deepseek');
    console.log('  then run through the injector, which never prints or persists it:');
    console.log('    npm run ontology:expand');
    return 2;
  }

  const { needs, byNeed, criteriaVocab } = loadOntology();
  const wanted = flag('all') ? needs.map(n => n.id) : [val('need')].filter(Boolean);
  if (!wanted.length) { console.log('  pass --need <id> or --all'); return 1; }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = { generatedAt: new Date().toISOString(), model: MODEL, proposals: [] };
  for (const id of wanted) {
    const need = needs.find(n => n.id === id);
    if (!need) { console.log('  unknown need: ' + id); return 1; }
    const existing = byNeed[id] || [];
    process.stdout.write('  ' + id + ' (' + existing.length + ' existing) … ');
    const got = await callDeepSeek(key, prompt(need, existing, criteriaVocab));
    const list = (got.proposals || []).map(p => ({ ...p, need: id }));
    out.proposals.push(...list);
    console.log(list.length + ' proposals');
  }
  const file = path.join(OUT_DIR, 'ontology-expansion-' + new Date().toISOString().slice(0, 10) + '.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  console.log('  wrote ' + path.relative(ROOT, file) + ' (' + out.proposals.length + ' proposals across ' +
    wanted.length + ' need(s))');
  console.log('  next: node pipeline/ontology_expand.mjs --verify ' + path.relative(ROOT, file));
  return 0;
}

main().then(c => process.exit(c)).catch(e => { console.error('  ' + (e && e.message || e)); process.exit(1); });
