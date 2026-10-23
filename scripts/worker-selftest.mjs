#!/usr/bin/env node
// Host-router contract with a synthetic ASSETS binding: canonical www handling, honest ecosystem
// ownership, app-root rewriting, and the no-transform privacy boundary without a live deployment.
import worker from '../worker.js';

const seen = [];
const env = {
  ASSETS: {
    async fetch(request) {
      const url = new URL(request.url);
      seen.push(url.pathname + url.search);
      // Paths under /missing/ do not exist, as an unknown address does not on the real binding:
      // a zero-byte 404 with no content type. /404.html is the page built for them.
      if (url.pathname.includes('/missing/')) return new Response(null, { status: 404 });
      if (url.pathname === '/404.html') return new Response('<!doctype html><h1>Nothing at this address</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      return new Response('<!doctype html><h1>fixture</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    },
  },
};
let failures = 0;
const expect = (condition, label) => {
  console.log(`${condition ? '  ok   ' : '  FAIL '}${label}`);
  if (!condition) failures += 1;
};
const get = (url) => worker.fetch(new Request(url), env);

console.log('Worker self-test');

const valuesWww = await get('https://www.valuescommons.org/funders/?ref=test');
expect(valuesWww.status === 301 && valuesWww.headers.get('location') === 'https://valuescommons.org/funders/?ref=test', 'Values www redirects to its apex');

const appWww = await get('https://www.consciousconsuming.org/g/guide');
expect(appWww.status === 301 && appWww.headers.get('location') === 'https://consciousconsuming.org/g/guide', 'app www redirects to its apex');

const appRoot = await get('https://consciousconsuming.org/');
expect(appRoot.status === 200 && seen.at(-1) === '/app/', 'app root rewrites to the shared /app/ bundle');
expect(/\bno-transform\b/.test(appRoot.headers.get('cache-control') || ''), 'app HTML opts out of edge transformation');

const cleanCard = await get('https://consciousconsuming.org/c/food/example?share=1');
expect(cleanCard.status === 200 && seen.at(-1) === '/app/c/food/example?share=1', 'extensionless app routes rewrite without changing the public URL');

const oldAppPath = await get('https://consciousconsuming.org/app/g/example?old=1');
expect(oldAppPath.status === 301 && oldAppPath.headers.get('location') === 'https://consciousconsuming.org/g/example?old=1', 'old nested app route redirects to the clean address');

const ecosystem = await get('https://consciousconsuming.org/funders/?from=app');
expect(ecosystem.status === 301 && ecosystem.headers.get('location') === 'https://valuescommons.org/funders/?from=app', 'ecosystem-only section redirects to Values Commons');

const kosploraFront = await get('https://valuescommons.org/kosplora/?from=vc');
expect(kosploraFront.status === 301 && kosploraFront.headers.get('location') === 'https://kosplora.org/?from=vc', 'the old Kosplora front page goes to kosplora.org');
const kosploraRoute = await get('https://valuescommons.org/kosplora/route/local-ai/');
expect(kosploraRoute.status === 301 && kosploraRoute.headers.get('location') === 'https://kosplora.org/route/local-ai/', 'a Kosplora route goes to its page on kosplora.org');
const kosploraFile = await get('https://valuescommons.org/kosplora/route/local-ai/route.json');
expect(kosploraFile.status === 301 && kosploraFile.headers.get('location') === 'https://kosplora.org/route/local-ai/route.json', 'a route file goes to its file on kosplora.org');
const kosploraFormat = await get('https://valuescommons.org/kosplora/format/index.html');
expect(kosploraFormat.status === 301 && kosploraFormat.headers.get('location') === 'https://kosplora.org/format/', 'the route format goes to kosplora.org');
const kosploraShelf = await get('https://valuescommons.org/kosplora/shelf/');
expect(kosploraShelf.status === 200, 'the reading shelf stays on Values Commons, on its engine');

const llms = await get('https://consciousconsuming.org/llms.txt');
expect(llms.status === 200 && seen.at(-1) === '/llms.txt', 'llms.txt on the app domain is the root file, not an /app/ 404');

const favicon = await get('https://consciousconsuming.org/favicon.ico');
expect(favicon.status === 200 && seen.at(-1) === '/favicon.ico', 'favicon.ico on the app domain is the root file');

const robots = await get('https://consciousconsuming.org/robots.txt');
expect(robots.status === 200 && seen.at(-1) === '/robots.txt', 'robots.txt on the app domain is the root file');

const schema = await get('https://openvaluesstandard.org/schema/lens-v0.1.schema.json');
expect(schema.status === 200 && seen.at(-1) === '/schema/lens-v0.1.schema.json', 'a schema $id URL is served, not redirected');
expect((schema.headers.get('content-type') || '').startsWith('application/schema+json'), 'schemas are typed as JSON Schema');
expect(schema.headers.get('access-control-allow-origin') === '*', 'schemas are readable cross-origin, for validators in a browser');

const kitSpec = await get('https://openvaluesstandard.org/spec/open-values-passport/');
expect(kitSpec.status === 200 && seen.at(-1) === '/standard/spec/open-values-passport/', "a kit page answers at the root of the standard's domain");
const schemaIndex = await get('https://openvaluesstandard.org/schema/index.json');
expect((schemaIndex.headers.get('content-type') || '').startsWith('application/json'), 'the schema index is plain JSON, not a schema');

const schemaViaRule = await get('https://valuescommons.org/standard/schema/passport-v0.1.schema.json');
expect(schemaViaRule.status === 301 && schemaViaRule.headers.get('location') === 'https://valuescommons.org/schema/passport-v0.1.schema.json', 'a schema id sent through the domain redirect reaches the published schema');

// The standard's domain serves the standard's page at its root, the files that page links to at
// their own paths, and sends every other page to Values Commons.
const standardRoot = await get('https://openvaluesstandard.org/');
expect(standardRoot.status === 200 && seen.at(-1) === '/standard/', 'standard domain serves the standard page at its root');
const standardScript = await get('https://openvaluesstandard.org/app/engine.js');
expect(standardScript.status === 200 && seen.at(-1) === '/app/engine.js', 'standard domain serves the engine the page links to');
const standardOld = await get('https://openvaluesstandard.org/standard/');
expect(standardOld.status === 301 && standardOld.headers.get('location') === 'https://openvaluesstandard.org/', 'the nested path on the standard domain redirects to its root');
const standardOther = await get('https://openvaluesstandard.org/docs/STANDARD-v0.html?x=1');
expect(standardOther.status === 301 && standardOther.headers.get('location') === 'https://valuescommons.org/docs/STANDARD-v0.html?x=1', 'other pages on the standard domain go to Values Commons');

const values = await get('https://valuescommons.org/');
expect(values.status === 200 && seen.at(-1) === '/', 'Values Commons root passes through unchanged');
expect(/\bno-transform\b/.test(values.headers.get('cache-control') || ''), 'Values HTML opts out of edge transformation');

// A dead link gets the built page with a real 404; a missing image or script stays a plain 404.
const deadPage = await worker.fetch(new Request('https://valuescommons.org/missing/page', { headers: { Accept: 'text/html' } }), env);
expect(deadPage.status === 404 && /Nothing at this address/.test(await deadPage.text()), 'a dead link to a page gets the not-found page with status 404');
const deadImage = await worker.fetch(new Request('https://valuescommons.org/missing/pic.png', { headers: { Accept: 'image/*' } }), env);
expect(deadImage.status === 404 && (await deadImage.text()) === '', 'a missing image stays a plain 404');
const deadApp = await worker.fetch(new Request('https://consciousconsuming.org/missing/route', { headers: { Accept: 'text/html' } }), env);
expect(deadApp.status === 404 && /Nothing at this address/.test(await deadApp.text()), 'the app domain serves the same not-found page');

// HTML is compressed by the Worker when the client says it can read gzip, and only then. The
// no-transform boundary above stays, so Cloudflare still cannot inject its beacon.
const zipped = await worker.fetch(new Request('https://valuescommons.org/', { headers: { 'Accept-Encoding': 'gzip, br' } }), env);
expect(zipped.headers.get('content-encoding') === 'gzip' && /\bno-transform\b/.test(zipped.headers.get('cache-control') || ''), 'HTML is gzipped for a client that accepts it, and stays no-transform');
const unzipped = await new Response(zipped.body.pipeThrough(new DecompressionStream('gzip'))).text();
expect(unzipped.includes('<h1>fixture</h1>'), 'the gzipped page decodes to the page');
const plain = await worker.fetch(new Request('https://valuescommons.org/', { headers: {} }), env);
expect(!plain.headers.get('content-encoding') && (await plain.text()).includes('<h1>fixture</h1>'), 'a client that sent no Accept-Encoding gets the page uncompressed');

console.log(failures ? `WORKER SELF-TEST: ${failures} FAILURES` : 'WORKER SELF-TEST PASS');
process.exit(failures ? 1 : 0);
