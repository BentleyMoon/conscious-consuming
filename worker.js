// The host-aware front door. One build, one Worker, several domains — each domain IS the thing
// its name promises, not a hallway to it.
//
//   valuescommons.org        → the ecosystem home (landing, standard, funders, instances…)
//   consciousconsuming.org   → the app itself, served AT the root (no /app/ in the address).
//                              Old /app/* links 301 to the clean root path; the ecosystem-only
//                              sections 301 across to valuescommons.org, where they live.
//   openvaluesstandard.org   → the standard's own page, served AT the root (once bound here)
//
// The app's assets are all relative and its routes are hash-based, so serving /app/* at the root
// of consciousconsuming.org is a pure rewrite: one build, one Worker, two honest front doors.
//
// /mcp is the one non-asset route: the read-only MCP server (mcp.js) that lets AI agents search and
// fetch the commons' sourced facts. It reads the SAME static JSON the app ships, holds no state,
// and logs nothing about anyone. Facts, never profiles.
import { handleMcp } from './mcp.js';

// Ecosystem sections that live on valuescommons.org, not inside the app.
const VC_SECTIONS = /^\/(assembly|citation-bundles|docs|funders|instances|kosplora|passport|slate|stacks|standard|tour|weave|workshop)(\/|$)/;

// Files that live at the root of every host, never under /app/.
const ROOT_FILES = new Set(['/robots.txt', '/llms.txt', '/favicon.ico']);
// The sections of the builders' kit, served at the root of openvaluesstandard.org (see the host block below).
const KIT_SECTIONS = new Set(['spec', 'registry', 'engine', 'data', 'conformance', 'build', 'changes', 'ns']);
// A dead link gets a page, not a zero-byte 404. Until 2026-09-28 the assets binding answered unknown
// paths with an empty body and no content type, and dist/404.html was built and never served. Only
// for a request that wants a page: a missing image or script still gets a plain 404.
async function notFound(env, request) {
  const wantsPage = request.method === 'GET' && (request.headers.get('Accept') || '').includes('text/html');
  if (!wantsPage) return null;
  const page = await env.ASSETS.fetch(new Request(new URL('/404.html', request.url)));
  if (!page.ok) return null;
  return new Response(page.body, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

async function fetchAsset(env, request) {
  let response = await env.ASSETS.fetch(request);
  if (response.status === 404) response = (await notFound(env, request)) || response;
  if (!(response.headers.get('content-type') || '').includes('text/html')) return response;
  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  // Cloudflare Web Analytics honors no-transform and will not inject its beacon into this HTML.
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate, no-transform');
  // no-transform also stops Cloudflare compressing the page, so every HTML page went out whole:
  // measured 2026-09-28, 51 KB for the home page where gzip sends 15, 193 KB for 32 on a sibling
  // site. The Worker compresses it itself instead, which keeps the beacon out and the page small.
  // encodeBody 'manual' tells the runtime the body is already encoded. Cloudflare rewrites the
  // Accept-Encoding a Worker sees and keeps what the client actually sent in cf.clientAcceptEncoding
  // (developers.cloudflare.com/workers/runtime-apis/request), so that is what decides: a client that
  // sent none gets the page uncompressed. Locally there is no cf object and the header is used.
  const cf = request.cf || {};
  const accepts = ('clientAcceptEncoding' in cf ? cf.clientAcceptEncoding : request.headers.get('Accept-Encoding')) || '';
  if (response.body && !headers.has('Content-Encoding') && /\bgzip\b/.test(accepts) && typeof CompressionStream === 'function') {
    headers.set('Content-Encoding', 'gzip');
    headers.append('Vary', 'Accept-Encoding');
    return new Response(response.body.pipeThrough(new CompressionStream('gzip')), {
      status: response.status, statusText: response.statusText, headers, encodeBody: 'manual',
    });
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // PLAIN HTTP GOES TO HTTPS, FIRST. valuescommons.org answered http with 200 and the whole page,
    // and HSTS only binds a visitor who has already arrived over https once, so first contact was
    // unprotected and modifiable in transit.
    // Ahead of the www rule because that rule preserves the scheme: an http://www request would
    // otherwise be redirected to an http apex and stay in the clear.
    // cf-visitor is checked as well as the URL because Cloudflare terminates TLS at the edge and the
    // scheme a worker sees is not always the scheme the visitor used.
    const visitorScheme = request.headers.get('cf-visitor') || '';
    if (url.protocol === 'http:' || visitorScheme.includes('"scheme":"http"')) {
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }

    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }
    const host = url.hostname.replace(/^www\./, '');
    if (url.pathname === '/mcp' || url.pathname === '/mcp/') {
      const loadJson = async (path) => {
        try {
          const r = await env.ASSETS.fetch(new Request(url.origin + path));
          return r.ok ? await r.json() : null;
        } catch (e) { return null; }
      };
      return handleMcp(request, loadJson, 'https://valuescommons.org/app');
    }
    // KOSPLORA HAS ITS OWN SITE (2026-09-29). kosplora.org graduated from the redirector and is served
    // by the Institute's Worker; Bentley did not want this page to be its front door any more. The old
    // front page goes there, on either host. The routes, the route format and the reading shelf stay
    // here until they move, so only the front page itself is redirected.
    if (url.pathname === '/kosplora' || url.pathname === '/kosplora/' || url.pathname === '/kosplora/index.html') {
      return Response.redirect('https://kosplora.org/' + url.search, 301);
    }
    // The routes and the route format followed later the same day (websites 5571377): each old address
    // goes to the same page on kosplora.org, and a route's route.json to its route.json there.
    if (url.pathname.startsWith('/kosplora/route/') || url.pathname === '/kosplora/format' || url.pathname.startsWith('/kosplora/format/')) {
      const path = url.pathname.slice('/kosplora'.length).replace(/index\.html$/, '');
      return Response.redirect('https://kosplora.org' + path + url.search, 301);
    }
    if (host === 'consciousconsuming.org') {
      // Old nested links keep working, at the clean address.
      if (url.pathname === '/app' || url.pathname.startsWith('/app/')) {
        const clean = url.pathname.replace(/^\/app\/?/, '/');
        return Response.redirect(url.origin + clean + url.search, 301);
      }
      // Ecosystem pages live on the ecosystem domain.
      if (VC_SECTIONS.test(url.pathname)) {
        return Response.redirect('https://valuescommons.org' + url.pathname + url.search, 301);
      }
      // Everything else IS the app: serve /app/* at the root, invisibly. The few root files every
      // host is asked for by name stay at the root: robots.txt, llms.txt for AI readers, the ICO a
      // browser requests without being told, and the well-known door. Rewritten into /app/ they
      // were 404s on the app's own domain.
      if (!ROOT_FILES.has(url.pathname) && !url.pathname.startsWith('/.well-known/')) {
        const rewritten = new URL(url);
        rewritten.pathname = '/app' + url.pathname;
        return fetchAsset(env, new Request(rewritten, request));
      }
    }
    // THE SCHEMA IDS. Every Open Values schema names itself https://openvaluesstandard.org/schema/…,
    // and several $ref one another by that address, so a validator follows these URLs. The build
    // publishes each schema at its $id path (pipeline/build_site.py); here they are served on any
    // host, readable cross-origin, and typed as JSON Schema.
    // Until openvaluesstandard.org is bound to this Worker, its zone's Redirect Rule sends every path to
    // valuescommons.org/standard/<path>, so a schema id arrives as /standard/schema/… and was a 404
    // (outside review, 2026-10-12). Send it on to where the schema is published.
    if (url.pathname.startsWith('/standard/schema/')) {
      return Response.redirect('https://valuescommons.org' + url.pathname.slice('/standard'.length) + url.search, 301);
    }
    if (url.pathname.startsWith('/schema/')) {
      const response = await env.ASSETS.fetch(new Request(url.origin + url.pathname));
      if (!response.ok) return response;
      const headers = new Headers(response.headers);
      // /schema/index.json lists the schemas; it is plain JSON, not a schema itself
      headers.set('Content-Type', url.pathname.endsWith('.schema.json') ? 'application/schema+json; charset=utf-8' : 'application/json; charset=utf-8');
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cache-Control', 'public, max-age=3600');
      return new Response(response.body, { status: response.status, headers });
    }
    // THE STANDARD AT ITS OWN ADDRESS (2026-09-28). openvaluesstandard.org shows the standard's page
    // at its root, where it used to send readers on to valuescommons.org/standard/. The page links
    // its scripts, data and images relatively, so those are served here at the paths the links
    // resolve to; any other page on this host belongs to Values Commons and goes there. This only
    // takes effect once the domain is bound to this Worker: until then the Redirect Rule in the
    // domain's own Cloudflare zone answers first and still sends everything to /standard/.
    if (host === 'openvaluesstandard.org') {
      const p = url.pathname;
      if (p === '/') {
        const page = new URL(url);
        page.pathname = '/standard/';
        return fetchAsset(env, new Request(page, request));
      }
      if (p === '/index.html' || p === '/standard' || p === '/standard/' || p === '/standard/index.html') {
        return Response.redirect('https://openvaluesstandard.org/' + url.search, 301);
      }
      // The builders' kit (pipeline/build_kit.js) is built under /standard/; on this host its sections answer at
      // the root, so openvaluesstandard.org/spec/<format>/ is valuescommons.org/standard/spec/<format>/.
      const section = p.split('/')[1];
      if (KIT_SECTIONS.has(section)) {
        const page = new URL(url);
        page.pathname = '/standard' + p;
        return fetchAsset(env, new Request(page, request));
      }
      const isFile = /\.[a-z0-9]+$/i.test(p) && !/\.html?$/i.test(p);
      if (isFile) return fetchAsset(env, request);
      return Response.redirect('https://valuescommons.org' + p + url.search, 301);
    }
    return fetchAsset(env, request);
  },
};
