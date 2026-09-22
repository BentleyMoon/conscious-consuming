#!/usr/bin/env node
/* Verify every committed register snapshot and its raw payload offline. */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RAW = path.join(ROOT, 'pipeline', 'registers', 'raw');
const failures = [];
const HTTP_URL = /^https?:\/\//i;
const SHA256 = /^[0-9a-f]{64}$/;
const SNAPSHOT_ID = /^\d{4}-\d{2}-\d{2}-[0-9a-f]{12}$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SECRET_KEY = /(?:authorization|cookie|api.?key|access.?token|secret|password)/i;
const SAFE_SECRET_NAMES = new Set(['authorization', 'cookie', 'proxy-authorization', 'x-api-key', 'api-key']);

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function expectKeys(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const key of Object.keys(value)) expect(allowed.has(key), `${label}: unexpected field ${key}`);
}

function readJson(abs) {
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (error) {
    failures.push(`${path.relative(ROOT, abs)}: invalid JSON (${error.message})`);
    return null;
  }
}

function walk(abs, out = []) {
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const target = path.join(abs, entry.name);
    if (entry.isDirectory()) walk(target, out);
    else if (entry.name.endsWith('.snapshot.json')) out.push(target);
  }
  return out;
}

function sha256File(abs) {
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function expectedSnapshotId(value) {
  const identity = {};
  for (const [key, item] of Object.entries(value)) {
    if (!['format', 'version', 'snapshotId'].includes(key)) identity[key] = item;
  }
  identity.response = Object.fromEntries(
    Object.entries(value.response || {}).filter(([key]) => key !== 'payload')
  );
  const digest = crypto.createHash('sha256').update(canonical(identity)).digest('hex');
  return `${String(value.capturedAt || '').slice(0, 10)}-${digest.slice(0, 12)}`;
}

function hostAllowed(register, url) {
  let candidate;
  try {
    candidate = new URL(url);
  } catch {
    return false;
  }
  return [register.endpoint, ...(register.alsoAt || [])].some(allowed => {
    try {
      const hostname = new URL(allowed).hostname;
      return candidate.hostname === hostname || candidate.hostname.endsWith(`.${hostname}`);
    } catch {
      return false;
    }
  });
}

function sorted(values) {
  // snapshot.py canonicalizes with Python's ordinal string ordering. Use the
  // equivalent code-unit ordering here rather than locale-dependent collation.
  return [...values].sort();
}

function validateSnapshot(abs, registers, snapshotIds) {
  const label = path.relative(ROOT, abs).replace(/\\/g, '/');
  const value = readJson(abs);
  if (!value) return;
  expectKeys(value, new Set(['format', 'version', 'snapshotId', 'registerId', 'access', 'capturedAt', 'request', 'response', 'license', 'parser']), label);
  expect(value.format === 'open-values-register-snapshot', `${label}: wrong format`);
  expect(value.version === '1.0.0', `${label}: unsupported version`);
  expect(SNAPSHOT_ID.test(String(value.snapshotId || '')), `${label}.snapshotId: invalid id`);
  expect(ID.test(String(value.registerId || '')), `${label}.registerId: invalid id`);
  const scopedSnapshotId = `${value.registerId}/${value.snapshotId}`;
  expect(!snapshotIds.has(scopedSnapshotId), `${label}.snapshotId: duplicate ${scopedSnapshotId}`);
  snapshotIds.add(scopedSnapshotId);
  const register = registers.get(value.registerId);
  expect(Boolean(register), `${label}.registerId: unknown shelf register ${value.registerId || '(missing)'}`);
  if (register) expect(value.access === register.access, `${label}.access: does not match shelf access ${register.access}`);
  expect(['api', 'bulk', 'page'].includes(value.access), `${label}.access: unsupported access mode`);
  expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(String(value.capturedAt || '')), `${label}.capturedAt: expected UTC seconds timestamp`);
  expect(!Number.isNaN(Date.parse(String(value.capturedAt || ''))), `${label}.capturedAt: invalid date`);
  expect(value.snapshotId && value.capturedAt && value.snapshotId.startsWith(value.capturedAt.slice(0, 10)), `${label}.snapshotId: date must match capturedAt`);

  const request = value.request || {};
  expectKeys(request, new Set(['method', 'url', 'query', 'scope', 'headers', 'secretHeaderNames']), `${label}.request`);
  expect(request.method === 'GET', `${label}.request.method: only GET is supported`);
  expect(HTTP_URL.test(String(request.url || '')), `${label}.request.url: expected http(s) URL`);
  if (HTTP_URL.test(String(request.url || ''))) {
    const parsedRequestUrl = new URL(request.url);
    expect(!parsedRequestUrl.search, `${label}.request.url: query must be stored in request.query`);
    expect(!parsedRequestUrl.hash, `${label}.request.url: fragment is not allowed`);
  }
  if (register && HTTP_URL.test(String(request.url || ''))) expect(hostAllowed(register, request.url), `${label}.request.url: outside shelf-declared hosts`);
  expect(typeof request.scope === 'string' && request.scope.trim(), `${label}.request.scope: missing scope`);
  expect(request.query && typeof request.query === 'object' && !Array.isArray(request.query), `${label}.request.query: expected object`);
  if (request.query && typeof request.query === 'object') {
    const keys = Object.keys(request.query);
    expect(JSON.stringify(keys) === JSON.stringify(sorted(keys)), `${label}.request.query: keys must be sorted`);
    for (const key of keys) {
      expect(!SECRET_KEY.test(key), `${label}.request.query.${key}: secret-like query key must not be recorded`);
      const values = request.query[key];
      expect(Array.isArray(values) && values.length > 0 && values.every(item => typeof item === 'string'), `${label}.request.query.${key}: expected non-empty string array`);
      if (Array.isArray(values)) expect(JSON.stringify(values) === JSON.stringify(sorted(values)), `${label}.request.query.${key}: values must be sorted`);
    }
  }
  expect(request.headers && typeof request.headers === 'object' && !Array.isArray(request.headers), `${label}.request.headers: expected object`);
  expect(typeof request.headers?.Accept === 'string' && request.headers.Accept.length > 0, `${label}.request.headers.Accept: missing`);
  expect(typeof request.headers?.['User-Agent'] === 'string' && request.headers['User-Agent'].length > 0, `${label}.request.headers.User-Agent: missing`);
  for (const [name, headerValue] of Object.entries(request.headers || {})) {
    expect(!SECRET_KEY.test(name), `${label}.request.headers.${name}: secret header value must not be recorded`);
    expect(typeof headerValue === 'string' && headerValue.length > 0, `${label}.request.headers.${name}: missing value`);
  }
  expect(Array.isArray(request.secretHeaderNames), `${label}.request.secretHeaderNames: expected array`);
  if (Array.isArray(request.secretHeaderNames)) {
    expect(new Set(request.secretHeaderNames.map(String)).size === request.secretHeaderNames.length, `${label}.request.secretHeaderNames: duplicate name`);
  }
  for (const name of request.secretHeaderNames || []) expect(SAFE_SECRET_NAMES.has(String(name).toLowerCase()), `${label}.request.secretHeaderNames: unsupported name ${name}`);

  const response = value.response || {};
  expectKeys(response, new Set(['status', 'finalUrl', 'mediaType', 'bytes', 'sha256', 'payload', 'fetchMode']), `${label}.response`);
  expect(Number.isInteger(response.status) && response.status >= 200 && response.status < 300, `${label}.response.status: expected 2xx`);
  expect(HTTP_URL.test(String(response.finalUrl || '')), `${label}.response.finalUrl: expected http(s) URL`);
  expect(typeof response.mediaType === 'string' && response.mediaType.trim(), `${label}.response.mediaType: missing`);
  expect(Number.isInteger(response.bytes) && response.bytes >= 0, `${label}.response.bytes: invalid count`);
  expect(SHA256.test(String(response.sha256 || '')), `${label}.response.sha256: invalid sha256`);
  expect(response.fetchMode === 'network' || response.fetchMode === 'file-import', `${label}.response.fetchMode: invalid mode`);
  expect(typeof response.payload === 'string' && path.basename(response.payload) === response.payload, `${label}.response.payload: must be a sibling filename`);
  expect(response.payload === `${value.snapshotId}.payload.${String(response.payload || '').split('.').pop()}`, `${label}.response.payload: must begin with snapshotId`);
  if (SNAPSHOT_ID.test(String(value.snapshotId || ''))) expect(value.snapshotId === expectedSnapshotId(value), `${label}.snapshotId: receipt hash mismatch`);

  const relativeParts = label.split('/');
  expect(relativeParts.length >= 5 && relativeParts[0] === 'pipeline' && relativeParts[1] === 'registers' && relativeParts[2] === 'raw', `${label}: outside raw snapshot tree`);
  expect(relativeParts[3] === value.registerId, `${label}: directory must match registerId`);
  expect(path.basename(abs) === `${value.snapshotId}.snapshot.json`, `${label}: filename must match snapshotId`);

  const payloadPath = path.join(path.dirname(abs), response.payload || '');
  expect(fs.existsSync(payloadPath) && fs.statSync(payloadPath).isFile(), `${label}: payload file missing`);
  if (fs.existsSync(payloadPath) && fs.statSync(payloadPath).isFile()) {
    const stats = fs.statSync(payloadPath);
    expect(stats.size === response.bytes, `${label}: payload byte count mismatch`);
    expect(sha256File(payloadPath) === response.sha256, `${label}: payload sha256 mismatch`);
  }

  const license = value.license || {};
  expectKeys(license, new Set(['url', 'note']), `${label}.license`);
  expect(HTTP_URL.test(String(license.url || '')), `${label}.license.url: expected http(s) URL`);
  expect(typeof license.note === 'string' && license.note.trim(), `${label}.license.note: missing note`);
  const parser = value.parser || {};
  expectKeys(parser, new Set(['id', 'version']), `${label}.parser`);
  expect(ID.test(String(parser.id || '')), `${label}.parser.id: invalid id`);
  expect(SEMVER.test(String(parser.version || '')), `${label}.parser.version: expected semver`);
}

function main() {
  console.log('Register snapshot audit');
  const shelf = readJson(path.join(ROOT, 'content', 'registers.json')) || {};
  const registers = new Map((shelf.registers || []).map(register => [register.id, register]));
  const manifests = walk(RAW).sort();
  const snapshotIds = new Set();
  for (const manifest of manifests) validateSnapshot(manifest, registers, snapshotIds);

  console.log(`  shelf registers: ${registers.size}`);
  console.log(`  committed snapshots: ${manifests.length}`);
  console.log(`  verified payloads: ${manifests.length}`);
  if (failures.length) {
    console.log(`  failures: ${failures.length}`);
    failures.forEach(failure => console.log(`  FAIL ${failure}`));
    process.exit(1);
  }
  console.log('REGISTER SNAPSHOT CHECKS PASS');
}

main();
