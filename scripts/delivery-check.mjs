#!/usr/bin/env node
/* Delivery check: does what we built reach a returning visitor's browser?
 *
 * This is the check that did not exist, and its absence is the most expensive thing that happened
 * to this project. Six rewrites of the front-page map were built, passed 75 audits, passed three
 * release chains each, deployed cleanly, and were confirmed by fetching the asset from the origin.
 * All of that was true and none of it was the question. index.html loaded ./homelens.js?v=1 — a
 * query that had never changed — so every browser kept the first copy it had ever seen and the
 * founder spent a whole session looking at a version that had been replaced twice.
 *
 * Everything the chain measures is an artifact: file contents, hashes, source strings, pixels in a
 * headless render of local files. This measures the only thing that decides whether work exists for
 * anyone: what a real browser, with a warm cache and the service worker running, actually loads.
 *
 * It takes about twenty seconds. It should run before the twelve-minute chain, not after, because
 * a build that cannot be delivered is not worth verifying.
 *
 *   node scripts/delivery-check.mjs                      # checks both production domains
 *   node scripts/delivery-check.mjs https://example.org  # or a specific origin
 *
 * HARD GATE: exits non-zero if any asset a returning visitor loads differs from what we built.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'app', 'index.html');

const TARGETS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['https://valuescommons.org/app/', 'https://consciousconsuming.org/'];

function localAssets() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const re = /(?:src|href)="\.\/([A-Za-z0-9_.-]+\.(?:js|css))\?v=([0-9a-f]+)"/g;
  const out = new Map();
  let m;
  while ((m = re.exec(html)) !== null) out.set(m[1], m[2]);
  return out;
}

// bare specifier: this script lives in the repo, so node resolves the devDependency normally.
// An absolute Windows path fails here — the ESM loader only accepts file:// URLs.
const { chromium } = await import('playwright').then(m => m.default || m);

const want = localAssets();
if (!want.size) {
  console.log('Delivery check\n  no versioned assets found in app/index.html');
  process.exit(1);
}

console.log('Delivery check');
console.log(`  built assets: ${want.size} (${[...want].map(([a, v]) => a + '@' + v).slice(0, 3).join(', ')}…)`);

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-delivery-'));
let failures = 0;

for (const target of TARGETS) {
  const ctx = await chromium.launchPersistentContext(profile, { viewport: { width: 1280, height: 900 } });
  const page = ctx.pages()[0] || await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));

  // Twice on the same profile: the first load populates the HTTP cache and installs the service
  // worker, the second is what a returning visitor actually experiences. Only the second counts.
  let served = null, sw = 'none';
  for (let pass = 1; pass <= 2; pass++) {
    await page.goto(target, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    const seen = await page.evaluate(() => {
      const out = {};
      for (const el of document.querySelectorAll('script[src],link[rel="stylesheet"][href]')) {
        const raw = el.getAttribute('src') || el.getAttribute('href') || '';
        const m = raw.match(/([A-Za-z0-9_.-]+\.(?:js|css))\?v=([0-9a-f]+)/);
        if (m) out[m[1]] = m[2];
      }
      return { out, sw: navigator.serviceWorker && navigator.serviceWorker.controller ? 'active' : 'none' };
    });
    served = seen.out; sw = seen.sw;
  }

  const stale = [];
  for (const [asset, version] of want) {
    if (!(asset in served)) continue;           // not referenced by this front door
    if (served[asset] !== version) stale.push(`${asset}: serving ${served[asset]}, built ${version}`);
  }
  const frozen = Object.entries(served).filter(([, v]) => !/^[0-9a-f]{8}$/.test(v))
    .map(([a, v]) => `${a}: version "${v}" is not a content hash, so its URL can never change`);

  const bad = stale.length + frozen.length + pageErrors.length;
  failures += bad;
  console.log(`  ${bad ? 'FAIL' : 'ok  '} ${target}  (service worker ${sw}, ${Object.keys(served).length} assets seen)`);
  for (const s of stale) console.log('        stale  ' + s);
  for (const f of frozen) console.log('        frozen ' + f);
  for (const e of pageErrors.slice(0, 3)) console.log('        error  ' + e.slice(0, 120));

  await ctx.close();
}

fs.rmSync(profile, { recursive: true, force: true });

if (failures) {
  console.log('');
  console.log('  A returning visitor is not getting what was built. The origin can be perfectly');
  console.log('  correct while this fails — that is the whole reason this check exists.');
  console.log('DELIVERY CHECKS FAIL');
  process.exit(1);
}
console.log('DELIVERY CHECKS PASS');
process.exit(0);
