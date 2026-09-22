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

const standard = await get('https://openvaluesstandard.org/anything');
expect(standard.status === 301 && standard.headers.get('location') === 'https://valuescommons.org/standard/', 'standard domain has one canonical destination');

const values = await get('https://valuescommons.org/');
expect(values.status === 200 && seen.at(-1) === '/', 'Values Commons root passes through unchanged');
expect(/\bno-transform\b/.test(values.headers.get('cache-control') || ''), 'Values HTML opts out of edge transformation');

console.log(failures ? `WORKER SELF-TEST: ${failures} FAILURES` : 'WORKER SELF-TEST PASS');
process.exit(failures ? 1 : 0);
