#!/usr/bin/env node
// Checks Open Values files against their schemas from the command line. It uses the same validator as the
// browser page at /standard/conformance/ (standard/conformance/ovs-validate.mjs), so the two always agree.
//
//   node scripts/ovs-validate.mjs my-values.json            a file; its "format" field picks the schema
//   node scripts/ovs-validate.mjs --format open-values-lens content/lenses/banking.json
//   node scripts/ovs-validate.mjs --vectors                 the conformance examples: does each pass or fail as it says?
//   node scripts/ovs-validate.mjs --all                     every file in this repository the registry points at
//
// Exit code 0 when everything checked is valid (or, for --vectors, when every example came out as expected).
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, entryFor } from '../standard/conformance/ovs-validate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_DIR = join(ROOT, 'app/data/standard/schemas');
const registry = JSON.parse(readFileSync(join(ROOT, 'app/data/standard/registry.json'), 'utf8'));
const byId = new Map();
for (const f of readdirSync(SCHEMA_DIR)) if (f.endsWith('.schema.json')) {
  const s = JSON.parse(readFileSync(join(SCHEMA_DIR, f), 'utf8'));
  if (s.$id) byId.set(s.$id, s);
}
const load = async (id) => byId.get(id);
const schemaOf = (entry) => entry && entry.schema && existsSync(join(ROOT, entry.schema)) ? JSON.parse(readFileSync(join(ROOT, entry.schema), 'utf8')) : null;

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const fmtAt = args.indexOf('--format');
const forced = fmtAt >= 0 ? args[fmtAt + 1] : null;
const files = args.filter((a, i) => !a.startsWith('--') && !(fmtAt >= 0 && i === fmtAt + 1));
const show = (errs, max = 8) => errs.slice(0, max).map((e) => `      ${e.path || '(the file)'}: ${e.message}`).join('\n') + (errs.length > max ? `\n      and ${errs.length - max} more` : '');

async function checkValue(value, entry) {
  const schema = schemaOf(entry);
  if (!schema) return [{ path: '', message: `no schema for ${entry ? entry.id : 'this file'}` }];
  return validate(value, schema, { load });
}

// ---- the conformance examples
if (flag('--vectors')) {
  const vectors = JSON.parse(readFileSync(join(ROOT, 'app/data/standard/conformance-vectors.json'), 'utf8')).vectors;
  let agree = 0; const disagree = [];
  for (const v of vectors) {
    const entry = registry.entries.find((e) => e.id === v.formatUnderTest);
    const errs = await checkValue(v.value, entry);
    const got = errs.length ? 'fail' : 'pass';
    if (got === v.expect) agree++; else disagree.push({ v, errs });
  }
  console.log(`conformance examples: ${agree} of ${vectors.length} come out as expected by schema alone`);
  for (const { v, errs } of disagree) {
    console.log(`  ${v.id} (${v.formatUnderTest}) expected ${v.expect}: ${v.reason}`);
    if (errs.length) console.log(show(errs, 3));
    else console.log('      the schema accepts it; the rule it breaks is checked by research/standard_audit.js, not by the schema');
  }
  process.exit(disagree.length ? 1 : 0);
}

// ---- every file the registry points at
function expand(pattern) {
  const [filePart, pointer] = pattern.split('#');
  let paths = [];
  if (filePart.includes('<cid>')) {
    const idx = JSON.parse(readFileSync(join(ROOT, 'app/data/index.json'), 'utf8'));
    const cats = Array.isArray(idx.categories) ? idx.categories : Object.values(idx.categories || {});
    paths = cats.map((c) => filePart.replace('<cid>', (c.file || `${c.id}.json`).replace(/\.json$/, '')));
  } else if (filePart.includes('*')) {
    const dir = dirname(filePart), re = new RegExp('^' + filePart.slice(dir.length + 1).replace(/[.]/g, '\\.').replace('*', '.*') + '$');
    paths = existsSync(join(ROOT, dir)) ? readdirSync(join(ROOT, dir)).filter((f) => re.test(f)).map((f) => `${dir}/${f}`) : [];
  } else paths = [filePart];
  const out = [];
  for (const p of paths) {
    if (!existsSync(join(ROOT, p)) || statSync(join(ROOT, p)).isDirectory()) continue;
    let doc;
    try { doc = JSON.parse(readFileSync(join(ROOT, p), 'utf8')); } catch { continue; }
    if (!pointer) { out.push([p, doc]); continue; }
    const parts = pointer.replace(/^\//, '').split('/');
    let nodes = [[p + '#', doc]];
    for (const part of parts) {
      const next = [];
      for (const [label, n] of nodes) {
        if (n == null) continue;
        if (part === '*') (Array.isArray(n) ? n : Object.values(n)).forEach((x, i) => next.push([`${label}/${i}`, x]));
        else if (part in n) next.push([`${label}/${part}`, n[part]]);
      }
      nodes = next;
    }
    out.push(...nodes);
  }
  return out;
}
if (flag('--all')) {
  let checked = 0; const failing = [];
  for (const entry of registry.entries) {
    const pats = entry.marker.pathPatterns || (entry.marker.pathPattern ? [entry.marker.pathPattern] : []);
    for (const pat of pats) for (const [label, value] of expand(pat)) {
      if (label.endsWith('.schema.json')) continue; // the internal formats name their own schema as their path
      checked++;
      const errs = await checkValue(value, entry);
      if (errs.length) failing.push({ entry, label, errs });
    }
  }
  console.log(`files and records checked: ${checked}; failing their schema: ${failing.length}`);
  for (const f of failing) console.log(`  ${f.label} (${f.entry.id})\n${show(f.errs, 5)}`);
  process.exit(failing.length ? 1 : 0);
}

// ---- named files
if (!files.length) { console.error('usage: node scripts/ovs-validate.mjs [--format <id>] <file.json>... | --vectors | --all'); process.exit(2); }
let bad = 0;
for (const f of files) {
  let value;
  try { value = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { console.log(`${f}: not readable JSON (${e.message})`); bad++; continue; }
  const entry = entryFor(value, registry, forced);
  if (!entry) { console.log(`${f}: no "format" field, so the format is unknown; pass --format <id>`); bad++; continue; }
  const errs = await checkValue(value, entry);
  if (errs.length) { bad++; console.log(`${f}: not a valid ${entry.id} file\n${show(errs, 20)}`); }
  else console.log(`${f}: a valid ${entry.id} file`);
}
process.exit(bad ? 1 : 0);
