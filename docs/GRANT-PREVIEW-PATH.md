# Grant Preview Path

*Private preview checklist · July 2, 2026*

This is the path for showing Values Commons and the Open Values Standard to grant reviewers without turning the preview into a public launch. The package is intentionally **noindexed**, static, and self-contained.

## Preview Package

Send reviewers:

- The deployed root URL: `/`
- The two-minute guided tour: `/tour/`
- The grant brief: `/docs/GRANT-ONE-PAGER.html`
- Optional technical context: `/docs/STANDARD-v0.html`, `/docs/FEDERATION.html`, `/docs/CREATE-AN-INSTANCE.html`

Do not send raw repository docs, masterplans, pipeline files, or source-data folders. The `dist/` build excludes those.

## Demo Route

Use this order for a 7-10 minute walkthrough.

1. **Open the home page.**
   Show the thesis in one sentence: choose by your values; organize without a center. Values Commons is the public work being funded, the Open Values Standard is the protocol underneath it, and Conscious Consuming shows the protocol working with real data.

2. **Take the two-minute tour.**
   Open `/tour/`. Let the reviewer see one choice travel through the loop: values become a passport, sourced facts become a ranking, a group becomes an assembly, and the shared stance becomes a slate.

3. **Show the real-data flagship.**
   Open `/app/#decide/banking`. Use banking because it is concrete, high-stakes, and sourced. Start from the immediate shortlist, move only the practical money-use and access dials, then open one verdict or the full ranking to inspect the evidence.

4. **Show portability.**
   Open `/app/#you`. Show the Values Passport: no name, no account, a file the person owns. Then open `/kosplora/` or `/instances/messages/` to show the same engine and passport idea working in another domain.

5. **Show collective use.**
   Open `/assembly/` and use the example assembly. Point out that it reports both shared values and dissent. Then open `/slate/` to show how shared values plus facts become a derived action list.

6. **Show contestability.**
   Open `/workshop/`. Explain that facts are not locked behind a platform. A community can patch a lens, cite a source, export the change, and merge it reproducibly.

7. **Close with the grant ask.**
   Open `/funders/` or `/docs/GRANT-ONE-PAGER.html`. Name the next phase plainly: first users, one or two real groups, one new subject, a clearer adoption guide, and evidence work driven by actual use. Point to the six-month work plan and the questions it will answer.

## What To Say

- "The core is serverless and uncapturable: values, lenses, assemblies, workshops, and slates are files and browser code."
- "The optional Community layer is separate: a privacy-first, self-hostable service. The core never depends on it."
- "The non-CC instances are illustrative. Conscious Consuming is the real-data flagship."
- "There are no real users yet. The grant funds first contact and validation, not feature sprawl."
- "After six months, we will publish what people tried, what helped, what failed, what changed, and what remains uncertain."
- "The project refuses ads, affiliate ranking, brand payments, and tracking; that is why patient grant support fits."

## Do Not Claim

- Do not claim public traction yet.
- Do not claim the optional Community layer is serverless.
- Do not claim the non-CC instances are fully sourced public ratings.
- Do not claim the app saves people money in categories where price data is absent or partial.
- Do not imply that barcode live lookup is fully offline; the curated barcode set is local, while the optional miss lookup contacts Open Food Facts with the barcode only.

## Build And Deploy

Before sending:

```bash
npm run prepare:preview
```

Then drag `dist/` to Netlify Drop or Cloudflare Pages. Keep the noindex files in place for grant preview:

- `robots.txt`
- `_headers`
- `netlify.toml`

The `dist/` package intentionally includes both per-category JSON for served lazy-loading and `app/data.js` for the app's documented `file://` fallback. That keeps the grant preview deployable on a static host without losing the local-first safety path.

After deploy, paste the live URL into the email that carries the grant brief.

## Preview Email Skeleton

Subject: Private preview: Values Commons / Open Values Standard

Hello,

I am sharing a private preview of Values Commons, powered by the Open Values Standard: a serverless, privacy-first way for people to choose by their values and for groups to organize around shared values without a central platform owning the process.

The working preview is here: PASTE_DEPLOYED_URL

Suggested path:

1. Start at the home page.
2. Open the two-minute tour.
3. Try Conscious Consuming at `/app/#decide/banking`.
4. Skim the grant brief at `/docs/GRANT-ONE-PAGER.html`.

The preview is intentionally noindexed and pre-public. The current system works; the next phase is real users, one or two real groups, and a sustainability path that does not compromise the no-ads, no-tracking, no-pay-to-rank promise.

Thank you for taking a look.
