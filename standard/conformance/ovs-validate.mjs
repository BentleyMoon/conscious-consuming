/* Open Values validator: checks a file against its JSON Schema, in a browser or in Node, with no dependencies.

   It implements the part of JSON Schema 2020-12 the Open Values schemas use: type, const, enum, the string,
   number, array and object limits, properties and required, additionalProperties, propertyNames, allOf,
   oneOf, not, if/then/else, and $ref, both inside a schema (#/$defs/...) and between schemas by their $id.
   "format" is treated as a note, as the specification allows. A keyword outside this list is reported as
   unchecked rather than silently passed, so a schema can never look stricter than this validator is.

   The validator does not decide whether a file is right for an app. It says whether the file holds what its
   format requires; what an app does with it is the builder's call.

   Usage:
     import { validate, schemaFor } from './ovs-validate.mjs';
     const errors = await validate(value, schema, { load });   // load(id) returns the schema with that $id
   Each error is { path, message }, with path as a JSON pointer into the file ('' is the whole file). */

export const SCHEMA_BASE = 'https://openvaluesstandard.org/schema/';

const KNOWN = new Set(['$schema', '$id', '$ref', '$defs', '$comment', 'title', 'description', 'examples', 'default',
  'deprecated', 'readOnly', 'writeOnly', 'format', 'type', 'const', 'enum', 'minLength', 'maxLength', 'pattern',
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'items', 'prefixItems', 'minItems',
  'maxItems', 'uniqueItems', 'contains', 'properties', 'required', 'additionalProperties', 'patternProperties',
  'propertyNames', 'minProperties', 'maxProperties', 'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else',
  'dependentRequired']);

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const ptr = (base, key) => `${base}/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`;
function equal(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => equal(a[k], b[k]));
}
function matchesType(v, t) {
  if (t === 'integer') return typeof v === 'number' && Number.isInteger(v);
  if (t === 'number') return typeof v === 'number' && Number.isFinite(v);
  return typeOf(v) === t;
}
function resolvePointer(root, fragment) {
  if (!fragment || fragment === '#') return root;
  let node = root;
  for (const raw of fragment.replace(/^#\/?/, '').split('/')) {
    const key = decodeURIComponent(raw).replace(/~1/g, '/').replace(/~0/g, '~');
    if (node == null || !(key in node)) return undefined;
    node = node[key];
  }
  return node;
}

/** Validate `value` against `schema`. `load(id)` returns (or resolves) the schema whose $id is `id`. */
export async function validate(value, schema, { load } = {}) {
  const errors = [];
  const cache = new Map();
  async function getRoot(id) {
    if (!cache.has(id)) cache.set(id, load ? await load(id) : undefined);
    return cache.get(id);
  }
  async function check(v, s, path, root) {
    if (s === true || s === undefined) return [];
    if (s === false) return [{ path, message: 'no value is allowed here' }];
    const out = [];
    const add = (message, at = path) => out.push({ path: at, message });
    for (const k of Object.keys(s)) if (!KNOWN.has(k)) add(`the schema uses "${k}", which this validator does not check`);

    if (s.$ref) {
      const [base, frag] = s.$ref.split('#');
      let target, targetRoot = root;
      if (!base) target = resolvePointer(root, '#' + (frag || ''));
      else {
        targetRoot = await getRoot(base);
        if (!targetRoot) add(`cannot load the schema ${base}`);
        else target = resolvePointer(targetRoot, '#' + (frag || ''));
      }
      if (targetRoot && target === undefined) add(`the reference ${s.$ref} points at nothing`);
      else if (target !== undefined) out.push(...await check(v, target, path, targetRoot));
    }
    const t = s.type;
    if (t !== undefined) {
      const types = Array.isArray(t) ? t : [t];
      if (!types.some((x) => matchesType(v, x))) { add(`must be ${types.join(' or ')}, but is ${typeOf(v)}`); return out; }
    }
    if ('const' in s && !equal(v, s.const)) add(`must be ${JSON.stringify(s.const)}`);
    if (s.enum && !s.enum.some((x) => equal(v, x))) add(`must be one of ${s.enum.map((x) => JSON.stringify(x)).join(', ')}`);

    if (typeof v === 'string') {
      const len = [...v].length;
      if (s.minLength !== undefined && len < s.minLength) add(`must be at least ${s.minLength} characters`);
      if (s.maxLength !== undefined && len > s.maxLength) add(`must be at most ${s.maxLength} characters`);
      if (s.pattern !== undefined && !new RegExp(s.pattern, 'u').test(v)) add(`must match the pattern ${s.pattern}`);
    }
    if (typeof v === 'number') {
      if (s.minimum !== undefined && v < s.minimum) add(`must be at least ${s.minimum}`);
      if (s.maximum !== undefined && v > s.maximum) add(`must be at most ${s.maximum}`);
      if (s.exclusiveMinimum !== undefined && v <= s.exclusiveMinimum) add(`must be more than ${s.exclusiveMinimum}`);
      if (s.exclusiveMaximum !== undefined && v >= s.exclusiveMaximum) add(`must be less than ${s.exclusiveMaximum}`);
      if (s.multipleOf !== undefined && Math.abs(v / s.multipleOf - Math.round(v / s.multipleOf)) > 1e-9) add(`must be a multiple of ${s.multipleOf}`);
    }
    if (Array.isArray(v)) {
      if (s.minItems !== undefined && v.length < s.minItems) add(`must hold at least ${s.minItems} item(s)`);
      if (s.maxItems !== undefined && v.length > s.maxItems) add(`must hold at most ${s.maxItems} item(s)`);
      if (s.uniqueItems && v.some((x, i) => v.findIndex((y) => equal(x, y)) !== i)) add('must not repeat an item');
      const pre = s.prefixItems || [];
      for (let i = 0; i < v.length; i++) {
        const sub = i < pre.length ? pre[i] : s.items;
        if (sub !== undefined) out.push(...await check(v[i], sub, ptr(path, i), root));
      }
      if (s.contains !== undefined) {
        let found = false;
        for (const x of v) if (!(await check(x, s.contains, path, root)).length) { found = true; break; }
        if (!found) add('must hold at least one item that matches');
      }
    }
    if (v && typeOf(v) === 'object') {
      const keys = Object.keys(v);
      if (s.minProperties !== undefined && keys.length < s.minProperties) add(`must have at least ${s.minProperties} field(s)`);
      if (s.maxProperties !== undefined && keys.length > s.maxProperties) add(`must have at most ${s.maxProperties} field(s)`);
      for (const r of s.required || []) if (!(r in v)) add(`is missing the required field "${r}"`);
      for (const [k, deps] of Object.entries(s.dependentRequired || {})) if (k in v) for (const d of deps) if (!(d in v)) add(`has "${k}", so it must also have "${d}"`);
      const props = s.properties || {};
      const pats = Object.entries(s.patternProperties || {}).map(([p, sub]) => [new RegExp(p, 'u'), sub]);
      for (const k of keys) {
        let matched = false;
        if (k in props) { matched = true; out.push(...await check(v[k], props[k], ptr(path, k), root)); }
        for (const [re, sub] of pats) if (re.test(k)) { matched = true; out.push(...await check(v[k], sub, ptr(path, k), root)); }
        if (!matched && s.additionalProperties !== undefined) {
          if (s.additionalProperties === false) add(`has a field "${k}" that this format does not allow`, ptr(path, k));
          else out.push(...await check(v[k], s.additionalProperties, ptr(path, k), root));
        }
        if (s.propertyNames !== undefined) {
          const e = await check(k, s.propertyNames, ptr(path, k), root);
          if (e.length) add(`has a field name "${k}" that is not allowed`, ptr(path, k));
        }
      }
    }
    for (const sub of s.allOf || []) out.push(...await check(v, sub, path, root));
    if (s.anyOf) {
      let ok = false;
      for (const sub of s.anyOf) if (!(await check(v, sub, path, root)).length) { ok = true; break; }
      if (!ok) add('must match at least one of the allowed shapes');
    }
    if (s.oneOf) {
      let n = 0;
      for (const sub of s.oneOf) if (!(await check(v, sub, path, root)).length) n++;
      if (n !== 1) add(n === 0 ? 'must match one of the allowed shapes, and matches none' : `must match exactly one of the allowed shapes, and matches ${n}`);
    }
    if (s.not !== undefined && !(await check(v, s.not, path, root)).length) add('must not match the excluded shape');
    if (s.if !== undefined) {
      const passes = !(await check(v, s.if, path, root)).length;
      if (passes && s.then !== undefined) out.push(...await check(v, s.then, path, root));
      if (!passes && s.else !== undefined) out.push(...await check(v, s.else, path, root));
    }
    return out;
  }
  if (schema && schema.$id) cache.set(schema.$id.split('#')[0], schema);
  errors.push(...await check(value, schema, '', schema));
  // the same problem can be reached by two routes (a $ref and a sibling keyword); report it once
  const seen = new Set();
  return errors.filter((e) => { const k = e.path + '\u0000' + e.message; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** The registry entry for a file, found from its "format" field, or by the id given. */
export function entryFor(value, registry, formatId) {
  const id = formatId || (value && typeof value === 'object' && !Array.isArray(value) ? value.format : undefined);
  if (!id) return null;
  return registry.entries.find((e) => e.id === id || (e.marker && e.marker.format === id)) || null;
}
