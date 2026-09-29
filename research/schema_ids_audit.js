#!/usr/bin/env node
/* Schema identity audit: every Open Values schema can be found at the address it names.

   Each schema in app/data/standard/schemas declares an $id under https://openvaluesstandard.org/schema/,
   and several $ref one another by that address, so a validator outside this repository follows those
   URLs. Until September 2026 none of them resolved (the domain redirected every path to the standard
   page), and two different files claimed the ids lens-v0.1 and passport-v0.1 with different contents,
   so which schema a validator got depended on where it looked.

   This audit holds the contract the build and the worker serve: one file per $id, every $id unique,
   every cross-schema $ref pointing at an $id that exists, and every JSON-pointer fragment in such a
   $ref pointing at something inside it. Run: node research/schema_ids_audit.js */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'app', 'data', 'standard', 'schemas');
const BASE = 'https://openvaluesstandard.org/schema/';
const failures = [];

function walk(node, visit) {
  if (Array.isArray(node)) node.forEach(n => walk(n, visit));
  else if (node && typeof node === 'object') {
    visit(node);
    Object.values(node).forEach(n => walk(n, visit));
  }
}

function pointer(doc, frag) {
  if (!frag || frag === '/') return doc;
  let node = doc;
  for (const raw of frag.replace(/^\//, '').split('/')) {
    const key = decodeURIComponent(raw).replace(/~1/g, '/').replace(/~0/g, '~');
    if (node == null || typeof node !== 'object' || !(key in node)) return undefined;
    node = node[key];
  }
  return node;
}

const byId = new Map();
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.schema.json')).sort();
for (const f of files) {
  const rel = path.posix.join('app/data/standard/schemas', f);
  let doc;
  try { doc = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { failures.push(`${rel}: invalid JSON (${e.message})`); continue; }
  const id = doc.$id;
  if (typeof id !== 'string' || !id.startsWith(BASE)) { failures.push(`${rel}: $id should start with ${BASE}`); continue; }
  const name = id.slice(BASE.length);
  if (!/^[a-z0-9-]+-v\d+(?:\.\d+)*\.schema\.json$/.test(name)) failures.push(`${rel}: $id name ${name} should be <name>-v<version>.schema.json`);
  if (byId.has(id)) failures.push(`${rel}: $id ${id} is also claimed by ${byId.get(id).rel}`);
  else byId.set(id, { rel, doc });
}

// No other file in the repository may claim one of these ids with different content.
for (const dir of ['research', 'content', 'kosplora', 'instances', 'standard']) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  const stack = [abs];
  while (stack.length) {
    const cur = stack.pop();
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) { if (ent.name !== 'node_modules') stack.push(p); continue; }
      if (!ent.name.endsWith('.schema.json')) continue;
      try {
        const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
        const owner = byId.get(doc.$id);
        if (owner && JSON.stringify(doc) !== JSON.stringify(owner.doc)) {
          failures.push(`${path.relative(ROOT, p)}: claims ${doc.$id}, which ${owner.rel} defines differently`);
        }
      } catch (e) { /* not ours to judge */ }
    }
  }
}

let refs = 0;
for (const { rel, doc } of byId.values()) {
  walk(doc, node => {
    if (typeof node.$ref !== 'string' || !node.$ref.startsWith(BASE)) return;
    refs++;
    const [url, frag] = node.$ref.split('#');
    const target = byId.get(url);
    if (!target) { failures.push(`${rel}: $ref ${node.$ref} names no schema here`); return; }
    if (frag && pointer(target.doc, frag) === undefined) failures.push(`${rel}: $ref ${node.$ref} points at nothing inside ${target.rel}`);
  });
}

console.log('Schema identity audit');
console.log(`  schemas: ${byId.size} unique ids under ${BASE}`);
console.log(`  cross-schema $refs resolved: ${refs}`);
if (failures.length) {
  console.log(`  failures: ${failures.length}`);
  for (const f of failures) console.log(`  FAIL ${f}`);
  process.exit(1);
}
console.log('SCHEMA IDENTITY CHECKS PASS');
