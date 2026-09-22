# Built, and waiting for a navigation home

These datasets are finished and pass their checks. They are held here rather than in
`content/lenses/` for one reason: **the navigation has nowhere to put them**, and the build refuses
a built dataset whose category has no need in `content/ontology.json`.

## What is here

- **trade-unions.json**, built from Form LM-2 filings on the Department of Labor's disclosure
  system, read for the dues and political-spending line items.
- **job-boards.json**, built on privacy behaviour, including Ireland's Data Protection Commission
  decision against LinkedIn and each platform's own disclosure of what it sells or shares.

Both sit in the `work-and-livelihood` realm on the map. That realm has no equivalent in the legacy
sixteen-domain navigation, because the navigation was built when the catalogue was a shopping
catalogue and a person was only ever a shopper.


### Added 2026-08-13, later the same day

- **clothing-rental.json**, ten options after two Australia-only services were removed. The region
  vocabulary is US, UK, EU and global, and marking an Australia-only rental service global tells a
  reader elsewhere they can use it. Ten is below the roster floor of twelve, so it waits for two
  more sourceable options.
- **supermarkets.json**, fourteen UK retailers scored on the Groceries Code Adjudicator's own 2026
  supplier survey and the Competition and Markets Authority's basket comparison. It is held for a
  different reason from the others, and the most interesting one.

  Supermarkets carries the NOURISH need, so the selector rule can only place it in a food category,
  and the legacy food tree is about foodstuffs: breakfast and bread, dairy, the store cupboard.
  There is no shelf in it for where you shop. Putting a supermarket under "Pantry and cooking"
  would read as a mistake to anybody who saw it.

  This is the same shape of problem as the work and privacy decisions below, and it is now the
  fourth realm to hit it. The map has a place for this decision, food-and-drink / where food comes
  from / shops and suppliers. The navigation does not, because the navigation was drawn around
  fifty grocery datasets and never had to answer where a person buys them.

## Why they were not forced into an existing domain

The nearest candidate is `Companies & makers`, whose only group is "How a business is owned". A
union is not a company and a job board is not a maker. Filing them there to clear a build error
would put a wrong answer in front of a reader in order to make a script pass, which is the trade
this project exists to refuse.

## What unblocks them

A decision about the navigation tree, which is a design change and belongs to a person:

1. Add a seventeenth domain for work, which means moving `EXPECTED_DOMAINS` in
   `research/needs_ontology_audit.js` with a written reason, and giving it a presentation category
   and subcategory so every row still matches exactly one.
2. Or rebuild the presentation tree from the map's realms, which is phase B of
   `docs/SWARM-BRIEF.md` and the thing `docs/design/INFORMATION-ARCHITECTURE.md` says is owed.

Option two is the better answer and the larger job. Until one of them happens, moving these two
files into `content/lenses/` will break `pipeline/build_datasets.py`, on purpose.

The `cid` lines were removed from `content/taxonomy/14-work-and-livelihood.md`, so the map shows
both decisions as open. That is currently true: they are built but not published, and the map
reports what a reader can reach.
