# Built, and waiting for a navigation home

These datasets are finished and pass their checks. They are held here rather than in
`content/lenses/` because the navigation has nowhere honest to put them, and the build refuses a
built dataset whose category has no need in `content/ontology.json`.

## What is still here

- **encrypted-email-services.json**. Held as a duplicate, not for want of a home. The navigation
  already has an Email decision (`content/lenses/email.json`), and encrypted email is a reading of
  that same choice through its privacy axis rather than a separate decision. Publishing both would
  put the same providers in front of a reader twice under two names, ranked by two different files
  that could disagree. The right move is to fold anything this file adds into the email lens, not
  to publish it alongside.

- **clothing-rental.json**, held again on 2026-10-23 for a new reason. It reached twelve options,
  which clears the roster floor, but the twelfth, The Clothing Library, rests on a single source,
  `https://clothinglibrary.org/`, and that domain now serves a domain-parking page. Its only claim
  (free two-week loans) can no longer be checked, and it was also the one entry with no
  exportable measure besides price. Without it the roster is eleven, under the floor of twelve that
  `research/lens_check.js` enforces. It needs two things: the Clothing Library entry replaced or
  re-sourced to a live page, and nothing else. Its home is ready: the row "Clothing rental" is in
  Clothing / Secondhand and repair (need CARE) as a gap, its criterion key `damage_protection` and
  the `price|damage_protection` tradeoff are registered in `pipeline/build_decisions.js`, and its
  brand descriptors are in `content/non-brand-values.json`. Publishing it then means `git mv` back
  to `content/lenses/`, a `cid: clothing-rental` on its line in `content/taxonomy/03-clothing.md`,
  a `cid` on the ontology row, and the count pins moved by one.

## Published on 2026-10-23

The owner approved two new navigation domains, the first since the legacy sixteen, and four of the
five datasets held here moved to `content/lenses/` with `git mv`. Clothing rental was meant to be
the fifth and is held again (above).

| Dataset | Where it now lives | Why there |
| --- | --- | --- |
| ad-and-tracker-blockers | Tech & digital / Privacy and security, row "Ad & tracker blockers" after "VPNs"; need PROTECT; presentation subcategory "Passwords and private connections" | A privacy tool used beside a password manager and a VPN. |
| job-boards | New domain **Work**, group "Finding work"; need PROTECT; presentation category "Work" | The map's work-and-livelihood realm. |
| trade-unions | New domain **Work**, group "Voice at work"; need PROTECT; presentation category "Work" | The same realm. A union is not a company and a job board is not a maker, which is why neither went into Companies & makers. |
| supermarkets | New domain **Shops**, group "Shops and suppliers"; need NOURISH; presentation category "Where you shop" | The map's food-and-drink / where food comes from / shops and suppliers. The legacy food tree is about foodstuffs and had no shelf for where a person buys them. |

**Why PROTECT for Work.** The map's own outline, `content/taxonomy/14-work-and-livelihood.md`,
already gives the realm `need: protect`, and PROTECT reads "Money, privacy, security, and the
systems that guard what matters". Job boards are scored first on what they collect about a job
seeker, and a union is the system that guards pay and conditions. GIVE & ACT is about supporting
people and causes with money, time or voice on their behalf; joining a union is closer to
protecting one's own livelihood than to giving.

The `cid` lines in `content/taxonomy/14-work-and-livelihood.md` (job boards, trade unions),
`content/taxonomy/01-food-and-drink.md` (supermarkets) and `content/taxonomy/07-technology.md` (ad
and tracker blockers) are restored, because
each decision is now built and reachable. `EXPECTED_DOMAINS` in
`research/needs_ontology_audit.js` moved with a written reason, and every source row still matches
exactly one presentation subcategory.

## What is still owed

Rebuilding the presentation tree from the map's realms, phase B of `docs/SWARM-BRIEF.md`, is still
the better answer and the larger job. The two domains added here are a smaller step that lets
finished work reach readers without filing it under a wrong heading.
