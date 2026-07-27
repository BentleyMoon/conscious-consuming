// The host-aware front door. One build, one Worker, several domains — each domain IS the thing
// its name promises, not a hallway to it.
//
//   valuescommons.org        → the ecosystem home (landing, standard, funders, instances…)
//   consciousconsuming.org   → the app itself, served AT the root (no /app/ in the address).
//                              Old /app/* links 301 to the clean root path; the ecosystem-only
//                              sections 301 across to valuescommons.org, where they live.
//   openvaluesstandard.org   → /standard/ on valuescommons.org (the spec door, if bound here)
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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
      // Everything else IS the app: serve /app/* at the root, invisibly.
      if (url.pathname !== '/robots.txt' && !url.pathname.startsWith('/.well-known/')) {
        const rewritten = new URL(url);
        rewritten.pathname = '/app' + url.pathname;
        return env.ASSETS.fetch(new Request(rewritten, request));
      }
    }
    if (host === 'openvaluesstandard.org') {
      return Response.redirect('https://valuescommons.org/standard/', 301);
    }
    return env.ASSETS.fetch(request);
  },
};
