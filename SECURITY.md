# Security

Please report a vulnerability privately, not in a public issue: email
**futurisminstitute@gmail.com** with "Security" in the subject, what you found, and how to reproduce
it. There is no bounty, and you will be credited if you want to be.

## What is in scope

- `worker.js`, the Cloudflare Worker in front of every domain: redirects, host routing, headers.
- `mcp.js`, the read-only MCP server at `/mcp`: input limits, and anything that makes it reveal
  more than the static data it serves.
- The app and site under `app/` and the ecosystem pages: script injection through data or guide
  content, anything that sends a reader's values, saved choices or notes off their device, and
  anything that lets a third party change what a reader sees.
- The build and audit scripts, where they run on a contributor's machine or in CI.

## What the project promises, so you can test it

- No accounts, no tracking, and no network call about the reader. Values, saved choices and notes
  stay in the browser unless the reader exports them.
- The MCP server holds no state and logs nothing about queries.
- CI runs with read-only permissions and no secrets (`.github/workflows/verify.yml`).

A way to break any of these is a security report.
