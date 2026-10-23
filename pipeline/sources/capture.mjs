#!/usr/bin/env node
/* Captures the registers an adapter or measure reads, through the shelf's own snapshot tool.
 *
 *   node pipeline/sources/capture.mjs <adapter-or-measure-id>
 *
 * A module lists what it reads in `captures`. Each entry is one of two shapes:
 *
 *   a single file   { register, access, url, scope, licenseUrl, licenseNote, parserId, parserVersion }
 *   a crawl         { ...the same, base, crawl(get) } for an API that answers one record per request
 *
 * A crawl's responses are written to one bundle file and imported as a single snapshot, so a register
 * read through a thousand small requests still lands as one manifest and one payload, with the
 * manifest saying it was a file import rather than a single fetch.
 *
 * `userAgent` replaces the default user agent for one register whose bot protection refuses it
 * (the DOE certification database answers 403 to anything that does not look like a browser). The
 * manifest records whichever agent was sent.
 *
 * `local: true` puts the snapshot in pipeline/registers/local/ (gitignored) instead of raw/. That
 * is for registers whose terms allow storing and citing but not republishing the file, such as
 * SBTi's. A lens built from one still cites each fact to the publisher's page; the bytes stay here.
 *
 * A register still among the shelf's candidates is captured through a temporary shelf entry built
 * from its verified access URL. The snapshot audit only accepts a committed snapshot once the
 * register is on the shelf proper, so promoting the register stays a deliberate step.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHELF = path.join(ROOT, 'content', 'registers.json');
const LOCAL = path.join(ROOT, 'pipeline', 'registers', 'local');
const USER_AGENT = 'ConsciousConsuming/1.0 register-snapshot';

function shelfFor(register, access) {
  const shelf = JSON.parse(fs.readFileSync(SHELF, 'utf8'));
  if ((shelf.registers || []).some((r) => r.id === register)) return { file: SHELF, temp: false };
  const candidate = (shelf.candidates || []).find((c) => c.id === register);
  if (!candidate) throw new Error(`${register} is neither on the shelf nor among its candidates`);
  const hosts = [candidate.landing, candidate.access].filter((u) => /^https?:\/\//.test(u || ''));
  shelf.registers = [...shelf.registers, {
    id: register, name: candidate.name, publisher: candidate.publisher, access,
    endpoint: candidate.access, alsoAt: hosts.filter((u) => u !== candidate.access),
  }];
  const file = path.join(os.tmpdir(), `cc-shelf-${register}-${process.pid}.json`);
  fs.writeFileSync(file, JSON.stringify(shelf), 'utf8');
  return { file, temp: true };
}

function limiter(n) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= n || !queue.length) return;
    active += 1;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => { active -= 1; next(); });
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
}

async function crawl(spec) {
  const responses = {};
  const limit = limiter(spec.concurrency || 4);
  let count = 0;
  const get = (url) => limit(async () => {
    if (responses[url]) return responses[url].body;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': spec.userAgent || USER_AGENT, Accept: 'application/json' } });
        const text = await res.text();
        let body = null;
        try { body = JSON.parse(text); } catch { body = null; }
        responses[url] = { status: res.status, body };
        count += 1;
        if (count % 100 === 0) process.stdout.write(`  ${count} requests\n`);
        return body;
      } catch (err) {
        if (attempt === 3) { responses[url] = { status: 0, body: null, error: String(err.message || err) }; return null; }
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    return null;
  });
  const startedAt = new Date().toISOString();
  await spec.crawl(get);
  const bundle = {
    format: 'open-values-register-bundle', version: '1.0.0', register: spec.register, base: spec.base,
    scope: spec.scope, startedAt, finishedAt: new Date().toISOString(), requests: Object.keys(responses).length,
    failed: Object.values(responses).filter((r) => r.status !== 200).length, responses,
  };
  const file = path.join(os.tmpdir(), `cc-bundle-${spec.register}-${process.pid}.json`);
  fs.writeFileSync(file, JSON.stringify(bundle), 'utf8');
  console.log(`  ${bundle.requests} requests, ${bundle.failed} not 200`);
  return file;
}

async function captureOne(spec) {
  console.log(`capture ${spec.register}${spec.local ? ' (local only)' : ''}`);
  const shelf = shelfFor(spec.register, spec.access);
  const args = [
    '-I', path.join(ROOT, 'pipeline', 'registers', 'snapshot.py'), '--shelf', shelf.file, 'capture',
    '--register', spec.register, '--scope', spec.scope,
    '--license-url', spec.licenseUrl, '--license-note', spec.licenseNote,
    '--parser-id', spec.parserId, '--parser-version', spec.parserVersion,
    '--user-agent', spec.userAgent || USER_AGENT,
  ];
  let bundle = null;
  if (spec.crawl) {
    bundle = await crawl(spec);
    args.push('--url', spec.base, '--source-file', bundle, '--media-type', 'application/json', '--extension', 'json');
  } else {
    args.push('--url', spec.url);
    if (spec.extension) args.push('--extension', spec.extension);
  }
  if (spec.local) args.push('--output-root', LOCAL);
  const r = spawnSync('python', args, { encoding: 'utf8', cwd: ROOT });
  if (shelf.temp) fs.rmSync(shelf.file, { force: true });
  if (bundle) fs.rmSync(bundle, { force: true });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  if (r.status !== 0) throw new Error(`snapshot.py exited ${r.status} for ${spec.register}`);
}

async function main() {
  const id = process.argv[2];
  if (!id) { console.log('usage: node pipeline/sources/capture.mjs <adapter-or-measure-id>'); process.exit(2); }
  const found = ['adapters', 'measures'].map((d) => path.join(ROOT, 'pipeline', 'sources', d, `${id}.mjs`)).find((f) => fs.existsSync(f));
  if (!found) { console.log(`no adapter or measure called ${id}`); process.exit(2); }
  const mod = await import(pathToFileURL(found).href);
  for (const spec of mod.captures || []) await captureOne(spec);
}

main().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
