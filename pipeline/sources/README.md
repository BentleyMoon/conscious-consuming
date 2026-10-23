# Building decisions from public registers

This folder turns public registers into draft decisions. A register here is a published dataset
that a government body or independent organisation maintains, such as the EPA's file of every
vehicle rated for sale in the US. When a register lists every option in a category, one script
can build that decision, and the next refresh is a rerun rather than another round of research.

Hand research produced about five decisions a month. On 2026-10-12, 903 of the map's 1,069
decisions were open. An adapter is written once per register and can build several decisions,
each still held to the same `lens_check` contract as a hand-built one.

## The commands

```bash
npm run swarm plan                                   # which registers build which open decisions
node pipeline/sources/capture.mjs <adapter-or-measure> # snapshot what a module reads
node pipeline/sources/harness.mjs <adapter> [--only <decision-id>]
npm run swarm sources content/lenses-drafts/<id>.json  # every cited URL resolves
```

The harness writes drafts to `content/lenses-drafts/` (gitignored) and runs `lens_check --file`
on each. A draft that passes still goes through the serial promotion in `docs/SWARM-BRIEF.md`
section 5 before it reaches the site.

## Three rules the plan and the harness keep

**1. A roster comes from a census.** A register that lists everything in a category (every vehicle
the EPA rated, every bank the FDIC insures, every charity on the Charity Commission's register)
can decide who is on a decision's list. A list that companies apply to join, such as a
certification or an awards list, cannot: it would leave out everyone who did not apply. Those
lists can still add a fact to an option already on the roster.

**2. Every option rests on more than one publisher.** The plan counts a decision as buildable only
when its roster register plus other publishers' registers give at least three measures from at
least two publishers that cover the roster's region. Decisions that clear that bar only through
SBTi or GLEIF are counted separately, because whether those company-level registers reach enough
options is unknown until the join runs.

**3. Emptier realms first.** Each decision is weighted by how open its realm is, plus one for realms
with fewer than five built decisions, so a realm at zero gets its first decisions before food
gets its fifty-first (`docs/SWARM-BRIEF.md` section 6).

## How facts reach an option

A fact from another register reaches an option only through an identifier both sides carry: an
LEI, an EIN, an FDIC certificate number, a Companies House number, or a vehicle's year, make and
powertrain-tagged model name. A name that only looks the same writes nothing. It is saved to
`content/lenses-drafts/<id>.mapping-candidates.json` in the entity-map format for a person to
confirm. The first run showed why: "Rolls-Royce Spectre" matched "Rolls-Royce plc" by name, and
Rolls-Royce plc is the aero-engine company, not the car maker BMW owns.

When a company-level register has to reach a product, the link is a reviewed row in
`maps/`. `maps/vehicle-makers.json` maps 20 vehicle makes to 11 LEIs, each through the EPA
manufacturer code that certifies the make and a GLEIF record checked active on 2026-10-12. The
sentence explaining the link leads the note on every score it carries.

## Scores for facts that are only ever positive

The ranking reads a missing score as 50 (`app/engine.js`, the coverage blend). A register that
companies opt into can say something good about a company and never something bad, so its lowest
score is 60. A commitment that was published must never rank below saying nothing. SBTi's
"Commitment Removed" is a real record but not a positive one, so it is left unscored, as absence
is.

## Snapshots

`capture.mjs` calls `pipeline/registers/snapshot.py`, so every build reads committed bytes with
their licence note, not the live network. Two cases needed more than one call:

- **An API that answers one record per request** (NHTSA's SafetyRatings) is crawled, and the
  responses are written to one bundle file imported as a single snapshot. The 2026-10-12 crawl
  made 1,731 requests; 8 failed (4 model names containing a slash, which the API rejects, and 4
  Kia variants that returned 403) and are recorded in the bundle.
- **A register whose terms allow storing but not republishing the file** (SBTi's companies file)
  is captured to `pipeline/registers/local/`, which is gitignored. The lens cites each fact to
  the publisher's page; the bytes stay on the machine that built it, and another machine has to
  capture its own copy to rebuild that column.

A register still among the shelf's candidates is captured through a temporary shelf entry. The
snapshot audit accepts a committed snapshot only once the register is on the shelf proper, so
moving it there is a deliberate step taken at promotion.

## Writing an adapter

An adapter in `adapters/<id>.mjs` exports:

- `source` `{ name, register }`
- `captures`, the list `capture.mjs` reads
- `build(ctx, only)`, returning `[{ decision, lens, measures }]`. `measures` names the measure
  modules that apply to that decision. Each option may carry `ids` (identifiers for measures to
  join on) and `idNotes` (how it came by each identifier). The harness strips both before writing.

A measure in `measures/<id>.mjs` exports `id`, `criterion`, `idScheme`, `captures`,
`reaches(decision)`, and `index(ctx)`, which returns `{ byId, byName }` or `null` when its snapshot
is absent. Optional: `key(option, decision, index)` when the identifier has to be resolved against
the register itself, and `combine(facts, option)` when one option matches several records.

Use an existing criterion key wherever one honestly fits. A new key costs four registries
(`docs/SWARM-BRIEF.md`), and a new tradeoff pair needs its reader-facing question in
`pipeline/build_decisions.js` TRADEOFFS.

## The first one: electric vehicles

`adapters/fueleconomy-vehicles.mjs` reads the EPA and DOE vehicle file and builds
`electric-vehicles`: 80 nameplates for model year 2026 (2027 where a nameplate is new), covering
358 rated configurations. Running cost and range are the EPA's figures for each nameplate's median
configuration, scored as a share of the best on the list. Two measures join it:

- NHTSA crash ratings reached 21 of 80. The NHTSA API names each 2026 model with its powertrain
  ("EQUINOX EV BEV", "EQUINOX ICE"), and the join accepts only the matching tag. The bulk Safercar
  file has no powertrain column, and matching on make and model there would have put the petrol
  Equinox's crash test on the electric Equinox EV. NHTSA's API tags the 2026 Nissan Ariya "ICE"
  although it is electric only, so the Ariya gets no crash score even though NHTSA rates it 5
  stars. The join does not overrule the publisher.
- SBTi climate targets reached 46 of 80 by LEI. Kia's SBTi record has no LEI, so Kia's four models
  are proposals awaiting review, not scores.

The lens passed `lens_check` and all 156 cited URLs resolved before promotion.

On 2026-10-13 the same adapter built the rest of the EPA file. `new-cars` (395 options across
gasoline, diesel, mild hybrid, hybrid, plug-in and electric) and `hybrid-and-plug-in-hybrid-cars`
(74) are live. For plug-in hybrids the file's annual cost is the gasoline-only figure, so the
adapter rebuilds fueleconomy.gov's electricity-plus-gasoline figure from the file's utility
factors; it matched the site for all 30 plug-in pages checked. Two drafts pass and are held:
`small-and-city-cars` uses the EPA's interior-room size classes, which put Ferraris on the list
and leave the Civic off, and `vans-and-pickups` has no crash scores for the best-selling pickups
because the EPA and NHTSA name cab styles differently. A reviewed map of EPA names to NHTSA models
would fix the second.

The first promotion also shipped a defect: the EV lens carried `productBase`, which the app reads
as an open product database, so each option linked to the fueleconomy.gov page with its code
appended, under an "Open Food Facts" label. Adapters for non-database registers must leave
`productBase` out.

## Held: appliances from the DOE certification database

`adapters/doe-ccd-appliances.mjs` and `measures/energy-star-models.mjs` build four drafts
(dishwashers, air purifiers, dehumidifiers, fridges and freezers) that pass `lens_check` and
`swarm sources`, and they are not promoted. The shelf had recorded DOE's Compliance Certification
Database as a census. Its own landing page says it holds only certifications submitted in the past
year, and the 2026-10-13 capture listed 3 Samsung dishwashers where ENERGY STAR certifies 22, and
no Frigidaire room air conditioners. A brand's median from that subset is not the brand's range.
The drafts also scored capacity under `accessibility`, which the site reads as everyday access.
The shelf entry is corrected (`census: false`), which took the plan from 91 buildable decisions to
78. The capture method (a browser user agent for DOE's bot protection, set per capture spec) and
the ENERGY STAR model join are kept for whoever finds a full roster.

## What it does not do

- It has no purchase prices. None of these registers publish them.
- It does not add a route that is not a purchase (keeping the car, a car club, a used EV). The
  contract asks for one where the decision has one; a register adapter cannot supply it, so a
  lane agent adds it by hand.
- It does not decide what a register means. The criterion, the scale and the floor for positive-only
  facts are choices made in the adapter and stated in each lens's attribution.
