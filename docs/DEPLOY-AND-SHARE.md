# Deploy & share — the whole standard, one deploy

> **Status 2026-07-02.** The project is now a root Values Commons home plus the static app, instances, tour,
> organizing tools, funder path, and rendered docs. `npm run build` packages them into a clean, Cloudflare-ready
> public `dist/` using the current default base `https://valuescommons.org/app`; `npm run build:preview`
> creates the private noindexed grant preview. Nothing is collected, no backend.

## 1 · Build the deployable

```
npm run prepare:public   # full public build + public package audit + full health gate
npm run release:preflight # full public preflight + receipt/status refresh, no deploy
npm run prepare:preview  # full private preview build + first-use/package/full gates
npm run build           # public production -> dist/  (https://valuescommons.org/app)
npm run build:preview   # private noindexed preview -> dist/
npm run audit:preview   # package + feedback-loop readiness
npm run audit:preview:public   # require public-production mode
npm run audit:preview:private  # require private-preview mode
npm run audit:r1               # R1 package lanes + blocker visibility
npm run audit:release-observability # status/CLI package fingerprints stay visible
npm run audit:release-modes    # smoke-test both package modes without replacing dist/
npm run audit:deploy   # production deploy config + public release receipt
npm run audit:ci       # GitHub workflow is verification-only, never deploys
npm run audit:generated # rebuild committed app outputs and fail on drift
npm run audit:cache-bust # per-asset hashes for app shell and guide pages
npm run audit:provenance # source-independence summaries + H10 contracts
npm run audit:citations # re-runnable citation bundles
npm run audit:linked-data # verdict-card JSON-LD export contract
npm run audit:flash-drive # physical/offline copy instructions
npm run audit:funding # public funding ledger + independence caps
npm run audit:register-pass # complete shelf-to-editorial register gate
npm run check:delivery # returning-visitor production check after an authorized deploy
npm run audit:well-known # /.well-known Open Values discovery manifest
npm run audit:stacks # content-addressed lens stack copies
npm run audit:routes  # public route shell + share metadata contract
npm run audit:commands # npm scripts and operating docs agree
npm run audit:a11y    # accessibility contract over shell, guides, CSS, and JS hooks
npm run audit:contrast # app CSS contrast and static control/focus checks
npm run health        # lightweight operating report over current outputs
npm run health:deploy # operating report plus production deploy guard
npm run r1:preflight  # full private-preview first-invite preflight, no upload
npm run wrangler:dry-run # guarded Cloudflare dry run; rebuilds and audits first
npm run release:status # read-only summary of the current dist/ package
npm run verify          # core local gate; pulse drift warns here
npm run verify:full     # health gate before sharing a preview or deploy
```

`dist/` contains **one site, sorted by path** (no subdomains — one story, one drag):

| Path | What |
|------|------|
| `/` | **Values Commons** — the home / front door |
| `/app/` | **Conscious Consuming** — instance #1, the flagship |
| `/kosplora/` · `/instances/messages/` | instances #2 and #3 |
| `/standard/` | **Open Values Standard** — protocol/specification front door |
| `/passport/` | **Values Passport** — the portable-values explainer |
| `/instances/` | **Instances** — live proofs and instance #4 creation path |
| `/contribute/` | **Contribute** — fact, lens, spec, instance, and funding paths |
| `/weave/` | **The Weave** — relationships, alternatives, ownership, and analogies |
| `/tour/` | the two-minute proof path |
| `/assembly/` · `/workshop/` · `/slate/` | the organizing tools (values · facts · action) |
| `/funders/` | private-review and funder credibility path |
| `/funding-ledger.json` | public funding ledger, copied from `content/ledger.json` |
| `/citation-bundles/*.json` | frozen re-runnable citation bundles, copied from `content/citation-bundles/` |
| `/.well-known/open-values.json` | Open Values discovery manifest: published lenses, hashes, licenses, and source dates |
| `/stacks/index.json` + `/stacks/lens/<id>/<sha>.json` | content-addressed lens copies for hash-verified mirrors and citations |
| `/docs/*.html` | the grant brief, preview path, deploy/share guide, and standard docs, rendered to styled HTML (no raw Markdown) |
| `/README-FLASH-DRIVE.txt` | plain physical-copy instructions, generated from `content/flash-drive-README.md` |

For grant reviewers, the useful doc URLs are `/docs/GRANT-ONE-PAGER.html` and
`/docs/GRANT-PREVIEW-PATH.html`. Before trusted testers, run `/docs/R1-REVIEW.html`.
For trusted testers, send `/docs/PREVIEW-FEEDBACK-LOOP.html` or paste the three questions from it
into your email.

For builders and operators, the useful doc URLs are `/docs/ADOPTION-KIT.html`,
`/docs/CREATE-AN-INSTANCE.html`, `/docs/VALUES-PASSPORT.html`, `/docs/FEDERATION.html`,
`/docs/THE-WEAVE.html`, and `/docs/DEPLOY-AND-SHARE.html`. Send those only when the person is actually
trying to adopt, verify, or host the commons; first-time visitors should start at `/`, `/tour/`, or `/instances/`.

## 1a · What URL should I send?

| Person | Send |
|--------|------|
| Someone curious about the idea | `/` then `/tour/` |
| Someone choosing by values today | `/instances/` then the relevant instance |
| Someone building a new guide | `/instances/`, `/docs/ADOPTION-KIT.html`, and `/docs/CREATE-AN-INSTANCE.html` |
| Someone checking the protocol | `/standard/` and `/docs/STANDARD-v0.html` |
| Someone hosting or reviewing the package | `/docs/DEPLOY-AND-SHARE.html` and `/docs/GRANT-PREVIEW-PATH.html` |

What's **excluded** from `dist/`: `pipeline/`, `research/`, most `content/` source, and the internal
masterplans/brainstorms. The exceptions are deliberately public trust artifacts: the flash-drive README, the funding
ledger, and frozen citation bundles. The private preview includes `app/data.js` so the app keeps its documented `file://`
fallback. The public Cloudflare build omits `app/data.js`; the hosted app lazy-loads per-category JSON, and the
single fallback bundle is larger than Workers' per-asset limit.

Production writes an allowing `robots.txt`, security headers, and a workers.dev noindex header. Preview writes
`robots.txt` (`Disallow: /`), `_headers`, and `netlify.toml` with `X-Robots-Tag: noindex`.

Every build also writes `dist/build-meta.json`. Treat that as the package label: it declares `mode`
(`public-production` or `private-preview`), `siteBase`, the public surfaces included, the rendered docs, and whether
`appDataFallback` is expected. `npm run audit:preview` reads that label and cross-checks it against the actual files,
headers, robots posture, and the absence of raw source folders.

The public route shells (`/`, `/standard/`, `/passport/`, `/instances/`, `/contribute/`, `/weave/`, plus the instance
and organizing doors) get canonical, Open Graph, and Twitter metadata during packaging. `npm run audit:routes` checks
the source route list and build metadata contract; `npm run audit:preview` verifies the rendered metadata in `dist/`.

Every build also copies `content/flash-drive-README.md` to `dist/README-FLASH-DRIVE.txt`. That file is intentionally
plain: `file://` can open static files, the local helper can serve the full project, and installable/offline PWA
behavior belongs to HTTPS deployment rather than a double-clicked file. `npm run audit:flash-drive` checks that the
wording and packaged copy stay honest.

Every build also copies `content/ledger.json` to `dist/funding-ledger.json`. That ledger is intentionally boring:
it records accepted grants and donations, states the $0 cap for rated-entity or conditional money, and defers the
scored who-funds-us lens while there are no recorded external funders. `npm run audit:funding` checks the source,
the packaged copy, and the independence caps.

Every build also copies `content/citation-bundles/*.json` to `dist/citation-bundles/`. A citation bundle freezes a
lens snapshot, the values query, the assumptions, and the expected result so a reviewer can rerun the result with
`npm run audit:citations` instead of trusting a screenshot.

Every build also writes `dist/.well-known/open-values.json`. That is the Well-Known Door: a static discovery manifest
for the Open Values Standard, listing the published lenses with their data URLs, SHA-256 hashes, ODbL license, and
provenance date range. `npm run audit:well-known` recomputes the manifest from packaged `app/data/*.json`; the
release-mode audit checks it for both private-preview and public-production packages.

Every build also writes `dist/stacks/index.json` and content-addressed lens copies under
`dist/stacks/lens/<id>/<sha>.json`. These are the Stacks: plain static files a future mirror or citation can fetch and
verify by SHA-256 before trusting. `npm run audit:stacks` checks the stack index, each content-addressed copy, and the
link between the Stacks and the Well-Known Door.

The prepare commands also write `dist/release-check.json` after the required gates pass and refresh
the durable `docs/PROJECT-STATUS.md` snapshot from the resulting package. Treat the release check as the release receipt: it records the
package mode, site base, build timestamp, included surfaces/docs, and the checks that ran. `npm run audit:preview`
validates the receipt whenever it is present. `npm run release:status` prints the current package label and receipt
without rebuilding.

GitHub CI is intentionally verification-only: `.github/workflows/verify.yml` runs the full local health gate and a
release-mode smoke test, but it does not deploy or read Cloudflare secrets. `npm run audit:ci` guards that boundary.

To check the packaging switch itself without rebuilding all datasets, cards, and guides, run
`npm run audit:release-modes`. It builds private-preview and public-production packages in scratch directories, audits
each exact package, leaves the current `dist/` package files alone, and writes `dist/package-mode-check.json` as a
receipt. Use the full `npm run build` / `npm run build:preview` commands when source data or generated app assets
changed; use `npm run prepare:public` when you need a deployable release receipt.

Use `npm run r1:preflight` before first tester invites. It prepares the private preview, smoke-tests both package
lanes, refreshes the durable status snapshot, runs the health gate with `audit:r1`, and writes
`dist/r1-preflight-check.json`, leaving `dist/` as the private preview package to deploy. `npm run release:status`
and `docs/PROJECT-STATUS.md` summarize the R1 receipt when it exists. Use `npm run prepare:preview` only when you need the private package without the full R1
preflight. Use `npm run prepare:public` before production deploys; `npm run deploy` runs that public preparation
automatically through npm's `predeploy` hook and leaves a fresh release receipt in `dist/`. The predeploy hook also
runs `npm run audit:deploy`, which checks `wrangler.toml`, the npm deploy scripts, the public `dist/` mode, and the
release receipt before Wrangler uploads anything. The `npm run release:preflight` command runs the full no-upload
production rehearsal through `scripts/release-preflight.mjs`: public release prep, scratch package-mode smoke test,
deploy health gate, `dist/release-preflight-check.json`, and a final durable status refresh after that receipt exists.
The `npm run wrangler:dry-run` command uses the same guard before
asking Wrangler for a dry run.

## 2 · Host — pick one

1. **Cloudflare Git deploy - production.** The GitHub-connected Worker should use:
   - Build command: `npm run prepare:public`
   - Deploy command: `npx wrangler deploy` or `npm run deploy`
   - Root directory: `/`
   - Config source: `wrangler.toml` (`dist/` assets, custom domains for `valuescommons.org`, `www.valuescommons.org`, and Conscious Consuming aliases)
   - Add a Cloudflare Redirect Rule for `openvaluesstandard.org` to `https://valuescommons.org/standard/` until a host-aware Worker script exists.
   - Before any manual production upload, run `npm run audit:deploy`.
2. **Netlify Drop — quick private preview.** Go to
   [app.netlify.com/drop](https://app.netlify.com/drop) and drag the **`dist/` folder** onto the page. You get a
   live HTTPS URL immediately; use `npm run build:preview` first so the noindex config applies. Send *that URL* to the grant reviewers.
   The random `*.netlify.app` name is effectively unlisted, and noindex keeps it off search engines.
3. **Cloudflare Pages + Access — if you want to restrict to named people.** Free tier: upload `dist/`, then add a
   Cloudflare **Access** policy allowing only the reviewers' email addresses. True gating; a little more setup.
4. **GitHub Pages — skip for now.** Needs a public repo (or a paid plan for private) and adds more friction than
   the Cloudflare Worker path.

Any of them gives **HTTPS**, which makes Conscious Consuming **installable + fully offline** via its service
worker — a nice thing to demo on a phone.

## 3 · Domain — optional for the grant; here's how to think about it

**Serve everything under ONE domain** (root = the Values Commons home, CC at `/app`). Don't split instances into
separate domains yet — it fragments the story and multiplies DNS setup. The whole point of the home is that the
*commons* is the thing; the standard is the protocol underneath it, and the instances hang off both.

- **You don't strictly need a custom domain for the grant preview** — a `*.netlify.app` URL is fine and free.
- **Use `valuescommons.org` as the main home.** It names the public ecosystem and best fits the home-first story.
- **Use `openvaluesstandard.org` as the spec citation domain.** For now, redirect it to `https://valuescommons.org/standard/`; later it can serve a dedicated technical spec shell if outside implementers need it.
- **Keep `consciousconsuming.org` as the flagship alias if desired.** Values Commons lives at the root, and Conscious Consuming lives at `/app`.

### 3a · Cloudflare host → domain allocation (the concrete map)

**One model:** *one* `dist/` build, *one* Cloudflare Worker, *many* hostnames — some **serve** the bundle, the rest **301-redirect** into it. No second project, no per-instance subdomains.

| Domain | Role | Cloudflare mechanism |
|---|---|---|
| `valuescommons.org` (+ `www`) | **Canonical home** — `/` = Values Commons, `/app` = Conscious Consuming | **Custom Domain** on the Worker (already in `wrangler.toml`) |
| `consciousconsuming.org` (+ `www`) | Serving **alias** — same bundle | **Custom Domain** (already in `wrangler.toml`) |
| `valuescommons.com` | Alias | **Redirect Rule** → `https://valuescommons.org/$1` (301, preserve path) |
| `openvaluesstandard.org` | Spec citation | **Redirect Rule** → `https://valuescommons.org/standard/` (301) |
| `consciousconsuming.net` (if held) | Legacy alias | **Redirect Rule** → `https://consciousconsuming.org/$1` |

**Canonical is a build-time decision, not just a DNS one.** The site base baked into every share-card, `og:*`, sitemap, and `<link rel=canonical>` must be exactly one home. `npm run build` defaults to `https://valuescommons.org/app`; keep it that way so the baked links match the canonical host. (To lead with the Conscious Consuming brand instead, build with `CC_SITE_BASE=https://consciousconsuming.org/app` and point the redirects the other way.)

**Setup, per domain:**
1. **Nameservers → Cloudflare** (registrar → the two NS Cloudflare assigns). Wait for the zone to read *Active*.
2. **Serving domains** (`valuescommons.org`, `consciousconsuming.org`): already `custom_domain` in `wrangler.toml` → `npm run deploy` binds them and Cloudflare auto-issues certs. Confirm under **Workers → the Worker → Settings → Domains & Routes**.
3. **Redirect domains** (`valuescommons.com`, `openvaluesstandard.org`, `.net`): do **not** add to `wrangler.toml`. In each zone, add one **proxied** placeholder DNS record (e.g. `AAAA @ 100::`, orange-cloud) so traffic hits the edge, then **Rules → Redirect Rules → Create** matching the hostname → 301 to the target above. For `.com`, use a dynamic redirect `concat("https://valuescommons.org", http.request.uri.path)` to preserve the path.
4. **SSL/TLS = Full (strict)**, **Always Use HTTPS = On**. Optional: a `www → apex` redirect so the apex stays canonical.

Keep the Worker (don't switch to Pages) — it's already wired; Pages would just mean re-doing the custom-domain bindings.

## 4 · After the grant — going public

`npm run build` is the public path: it sets `CC_SITE_BASE=https://valuescommons.org/app` unless overridden,
rebuilds cards and guides, emits public robots, and packages the Cloudflare-safe `dist/`. The privacy promise is unchanged either way
— a static host serves files; it cannot see what anyone does with them.

## 5 · Then: invite, don't launch (Phase B)

Once it is live and credible, send the link to a small, hand-picked circle whose real decisions the current work
can serve. **Do not launch; invite.** Ask each person to use it for one decision or describe one new subject, then
answer three questions: *Did it help? What was missing? Did you trust it?* Use their answers, your own
[self-test](BETA-SELF-TEST.md), the [adoption guide](ADOPTION-KIT.md), and the
[preview feedback plan](PREVIEW-FEEDBACK-LOOP.md) to decide what deserves work next. A backend earns its place
only when people ask to contribute beyond their own device.
