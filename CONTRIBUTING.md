# Contributing

The most useful thing you can send is a correction: a fact that is wrong, with a source that shows
it. One sharp correction beats a long list, and it does not need an account.

## Three ways to send one

- **Email** futurisminstitute@gmail.com. Say which decision, category or page is affected, attach
  the source, and name what should change.
- **A patch file.** The fact-repair page at [valuescommons.org/workshop/](https://valuescommons.org/workshop/)
  builds a small JSON patch in your browser. Nothing is uploaded from that page by itself; send the
  file to the same address or attach it to an issue.
- **An issue or a pull request here.** The "A fact is wrong" issue form asks for exactly what a
  correction needs: where, what, a source anyone can open, and an as-of date.

If you work for the maker or seller of the thing you are correcting, say so. Makers are welcome to
correct their own entries; the connection is recorded, not held against the correction.

## What a good fact looks like

The rules are in [the standard](docs/STANDARD-v0.md), sections 1 to 3. In short:

- **Every rating carries a source and a date.** A `provenance` entry has a `note`, a `source` that is
  a real, resolvable URL, and an `asof`. Give the month when you know it (`2026-09`): only entries
  checked to the month and resting on more than one source domain are offered to search engines.
- **Unknown is not zero.** Leave a score out when there is no evidence. Missing data is
  renormalised, never guessed; a 0 is a finding, not a gap.
- **Say what kind of fact it is.** A criterion's `tier` is `measured` (an open-data fact),
  `certified` (a third-party certification) or `assessed` (a researched judgement, which must cite).
  A `certified` axis records whether a label was found, so it lowers a score but can never act as a
  dealbreaker.
- **A second, independent source is worth more than a better sentence.** About three quarters of
  the entries rest on one source domain, often the seller's own site. Adding an independent source to
  an existing entry is among the most valuable changes you can make.

## Where things live

| To change | Edit | Then run |
| --- | --- | --- |
| A curated category (banking, AI assistants, …) | `content/lenses/<id>.json` | `python pipeline/build_datasets.py` |
| A guide | `content/guides/<slug>.md` | `python pipeline/build_guides.py` |
| The engine | `app/engine.js` | `node research/engine_score_test.js` |
| The standard | `docs/STANDARD-v0.md` | `npm run audit:standard` |

Some files are built rather than written, so edit their source instead: `app/data/*.json`,
`app/guides.js`, `app/g/*.html`, `awards/index.html`, the `?v=` hashes in `app/index.html`, and the
verdict pages under `app/c/`, which this copy does not store at all (`node pipeline/build_cards.js`).

Open-data food and beauty scores come from Open Food Facts and Open Beauty Facts. If one of those is
wrong, the lasting fix is a correction there, which improves the commons and reaches this project
at its next refresh.

## Before a pull request

```bash
npm ci
npm run verify:full
```

The same checks run on every pull request. They pin sentences, gate claims on receipts, check
contrast and accessibility, and fail when a number stated in public drifts from the data
(`research/public_numbers_audit.js`). If an audit fails for a reason you think is wrong, say so in
the pull request rather than editing the audit to pass.

This repository is the public copy of a working repository. An accepted change is applied there and
comes back here with the next refresh, so your pull request may be closed with a pointer to the
commit that carries it rather than merged directly.

## Licences

By contributing you agree that code is licensed under AGPL-3.0-or-later, data under ODbL-1.0, and
guides and documents under CC BY-SA 4.0, as set out in [LICENSING.md](LICENSING.md).

Security problems go to [SECURITY.md](SECURITY.md), not to a public issue.
