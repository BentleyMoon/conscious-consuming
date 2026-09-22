# Conscious Consuming, and the Open Values Standard

Rank everyday choices by your own values instead of by who paid for placement.

This repository holds the engine, the sourced data, the audits, and the standard behind
[valuescommons.org](https://valuescommons.org). It exists so the claims on that site can be checked
rather than believed: that the ranking cannot be bought, that every fact carries a source, and that
anyone who dislikes how it is run can take the whole thing and run their own.

## What is here

- **`app/engine.js`, `app/decision.js`** the scoring core. Facts and weights stay separate: the
  facts are sourced and dated, the weights belong to the reader, and a score is the transparent
  product of the two. Missing data is renormalised rather than guessed, an option below a coverage
  floor is withheld rather than ranked, and an axis you weight heavily that scores catastrophically
  low caps the result, so a single dealbreaker cannot be averaged away.
- **`app/data/`** 124 datasets, 24,198 entries, each rating carrying a source and an as-of date.
- **`research/`** 96 audit scripts, and the reason to trust anything else here. They pin sentences,
  gate claims on receipts, check contrast and accessibility, and fail the build when a number
  drifts from the source it came from.
- **`content/guides/`** 108 guides: how to choose in a category, and what leaving costs.
- **`kosplora/`, `instances/`** the same unmodified engine running different subjects, which is the
  evidence that this is a standard rather than one app.
- **`docs/STANDARD-v0.md`** the standard itself.

## Running it

Everything is static. There is no server, no account, and no network call that leaves your machine.

```bash
npm install
npm run verify:full        # the full audit suite
python pipeline/build_site.py --public --site-base https://example.org/app
```

Two sets of files are generated rather than stored, to keep a clone small. Rebuild them if you
want them:

```bash
node pipeline/build_cards.js     # the shareable comparison pages, 3,428 of them
node pipeline/build_awards.js    # the awards ledger
```

## What it refuses to do

**312 measures are published as withheld.** Where fewer than nine in ten entries in a category
carry a sourced score, no award is given and the gap is listed openly instead of filled with an
estimate. That refusal is the most distinctive thing in this repository and the part most worth
copying into whatever you build.

## How good is the sourcing, exactly

Counted on 22 September 2026, from the data in this repository:

| Measure | Count | How to recount it |
| --- | --- | --- |
| Entries | 24,198 | every `products` entry in `app/data/*.json` |
| Entries resting on more than one independent source domain | 6,015 | `provenanceSummary.sourceDomainCount > 1` |
| Verdict pages built | 3,428 | `node pipeline/build_cards.js` |
| Verdict pages offered to search engines | 193 | more than one source domain and a check dated to the month, `verdictIsIndexable` in `pipeline/build_cards.js` |

The gap between the second row and the first is the honest state of this corpus: three quarters of
the entries rest on a single source, and that source is often the seller's own website. Pages under
the bar are still built and readable, and they carry `noindex` until their sourcing improves. The
figures above are a hand count on a date; recompute them rather than trusting them.

Some further limits, last counted in July 2026: roughly fifty food categories are scored from
open-data proxies, where environment is a Green-Score letter and ethics is certification-label
presence, so an absent label scores zero. That is a paperwork signal rather than a moral
measurement, and a small uncertified producer can score low for exactly that reason. About
thirty-eight categories are hand-checked with named citations and are considerably stronger.
There are no recorded outside users, and no group has run a real decision through the collective
tools.

## If something here is wrong

That is the most useful thing you can send, and it does not need an account.

- **Email**: **futurisminstitute@gmail.com**. Say which decision, category or page is affected,
  attach the source, and name what should change. One sharp correction beats a long list.
- **A patch file**: the fact-repair page at
  [valuescommons.org/workshop/](https://valuescommons.org/workshop/) produces a small JSON patch in
  your browser. Send the file to the same address. Nothing is uploaded from that page by itself.
- **A pull request**: against this repository, for anything in the engine, the audits or the data.

Corrections keep their history, including the ones that turn out to be wrong.

## About this repository

This is a selected export of a larger private working repository, published deliberately rather
than wholesale. It carries the engine, the data, the audits, the standard, and the documents
already published on the website. It does not carry working notes, drafts, and planning material,
which were written to think with rather than to publish and are not needed to verify anything here.

## Licence

Multi-licensed by asset type. Code under **AGPL-3.0-or-later**, data under **ODbL-1.0**, guides and
documents under **CC BY-SA 4.0**. See `LICENSING.md`. Open Food Facts and Open Beauty Facts source
data remains under its own ODbL terms.

The AGPL is deliberate. Any fork, including one run only as a hosted service, must keep its source
open to its users. The standard can spread by being forked and cannot be captured into a closed
product.
