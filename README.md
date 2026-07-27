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
- **`app/data/`** 96 datasets. 88 categories, 23,689 entries, each rating carrying a source and an
  as-of date.
- **`research/`** 75 audit scripts, and the reason to trust anything else here. They pin sentences,
  gate claims on receipts, check contrast and accessibility, and fail the build when a number
  drifts from the source it came from.
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
node pipeline/build_cards.js     # the 2,919 shareable comparison pages
node pipeline/build_awards.js    # the awards ledger
```

## What it refuses to do

**220 measures are published as withheld.** Where fewer than nine in ten entries in a category
carry a sourced score, no award is given and the gap is listed openly instead of filled with an
estimate. That refusal is the most distinctive thing in this repository and the part most worth
copying into whatever you build.

## Honest limits

Roughly fifty food categories are scored from open-data proxies: environment is a Green-Score
letter, and ethics is certification-label presence, where an absent label scores zero. That is a
paperwork signal rather than a moral measurement, and a small uncertified producer can score low
for exactly that reason. About thirty-eight categories are hand-checked with named citations and
are considerably stronger. There are no recorded outside users yet, and no group has run a real
decision through the collective tools.

## About this repository

This is a curated export of a larger private working repository, published deliberately rather than
wholesale. It carries the engine, the data, the audits, the standard, and the documents already
published on the website. It does not carry working notes, drafts, and planning material, which
were written to think with rather than to publish and are not needed to verify anything here.

If something in this repository is wrong, that is the most useful thing you can send:
**futurisminstitute@gmail.com**

## Licence

Multi-licensed by asset type. Code under **AGPL-3.0-or-later**, data under **ODbL-1.0**, guides and
documents under **CC BY-SA 4.0**. See `LICENSING.md`. Open Food Facts and Open Beauty Facts source
data remains under its own ODbL terms.

The AGPL is deliberate. Any fork, including one run only as a hosted service, must keep its source
open to its users. The standard can spread by being forked and cannot be captured into a closed
product.
