# Federation without a center

> The north star has two halves: **how we vote** (with our values, our money — Conscious Consuming and every
> consumer instance) and **how we organize**. This is the second half. The hard part is doing it *without*
> betraying the first: the project is uncapturable precisely *because* there is no server. So federation here
> can never mean "a server that holds everyone's values." It means the opposite.

## The one principle: everything is a file; the tally is reproducible; there is no center

A movement, in this design, is **a folder of files**. Each file is an [Open Values Passport](VALUES-PASSPORT.md) —
a nameless, accountless list of what one person values, on the [shared universal vocabulary](VALUES-PASSPORT.md).
People **hand each other** these files, by any channel they already trust. Anyone can merge a set of them locally
and get the same result. There is nothing to register, nothing to log in to, nothing a server can leak, sell,
subpoena, or shut down. Cut off any "head" and the folder still computes.

This is the same move, scaled up, that [K0](VALUES-PASSPORT.md) made for the individual. K0 made *your* self
portable. Federation makes the *collective* self portable — by the same primitive.

## The layers of federation

| Layer | What federates | Primitive | Status |
|------|----------------|-----------|--------|
| **K4a — values** | What a group *believes* | `engine.mergePassports(passports)` → a collective stance, and a drop-in collective passport | **built** — the [Assembly](../assembly/index.html) |
| **K4b — facts/lenses** | What a community *knows* | `engine.mergeLens` / `forkLens` / `diffLens` — fork, patch, and merge lens facts by file (Git-for-data) | **built** — the [Lens Workshop](../workshop/index.html) |
| **K4c — action** | What a collective *does* | `engine.buildSlate(passport, lens)` → a derived slate: endorse + divest, each with its reason | **built** — the [Slate](../slate/index.html) |

## K4a — the Assembly (built)

`engine.mergePassports([p1, p2, …], name)` takes many individual passports and returns:

- **`values`** — the group's mean weight on each universal value (omitting any value no one expressed — it does
  not invent a position the group never took).
- **`agreement`** — per value: the mean, the spread, the number of voices, and a **consensus** score
  (1 = unanimous, 0 = maximally split).
- **`dissent`** — values ranked by *lowest* consensus, so the tool can say plainly **where the group is split**.
- **`passport`** — the collective re-expressed as an ordinary Open Values Passport. **The collective is itself a
  citizen of the federation**: it can carry its shared values into Conscious Consuming, Kosplora, or any instance,
  exactly like a person can.

The [Assembly surface](../assembly/index.html) runs this in your browser. You drop in everyone's passports, name
the assembly, and see the shared stance — *and* the disagreements. Then you export the collective passport and
carry it into any instance to ask: **"given what we share, what should *we* choose?"**

### Honesty is not optional here

A collective-values tool that hid disagreement would be a manipulation engine — it would manufacture a false
"we." So the Assembly **always surfaces dissent**: alongside *what we share* it shows *where we're split*, and it
never fills in a value the group never voiced. Consensus is reported, never engineered. (This is the project's
honesty principle, applied to organizing.)

### The inversion

Surveillance platforms already aggregate your values — **without your consent**, behind a wall, to sell and steer
you. The Assembly aggregates values **with consent, in the open, on your own device**, to give a group *its own*
voice. Same arithmetic; opposite politics. The difference is entirely *where it runs and who holds the files* —
which is the whole reason the no-server constraint is sacred, not incidental.

## How to run an assembly

1. Each person opens any instance, sets their values, and **exports their Values Passport** (Conscious Consuming →
   the *You* page; Kosplora → *Bring your values*; etc.). The file holds only weights — no name, no account.
2. They send you the file **however they like** — email, USB, a chat. The Assembly page sends nothing, ever.
3. You drop the files into the [Assembly](../assembly/index.html), name it, and read the shared stance. Export the
   collective passport and bring it back into an instance to turn shared values into a shared choice.

## K4b — the Lens Workshop (built)

If K4a federates what a group *believes*, K4b federates what a community *knows* — the **facts**. A lens (a
domain's options × sourced criteria) is already a file, so the facts can travel like the values do.

`engine.mergeLens(baseLens, patches)` applies an ordered list of **lens patches** to a base lens →
`{ lens, log }`, purely and reproducibly. A patch is itself a small file:

```json
{ "format":"open-values-lens-patch", "by":"sam", "note":"corrected Telegram's default encryption",
  "ops":[ {"op":"set-score","code":"telegram","key":"security","value":42,"source":"docs, 2026","asof":"2026"} ] }
```

Two op kinds cover the common contributions: **`set-score`** (correct a fact, *with a source*) and
**`add-entity`** (contribute a new option). Companion primitives: **`forkLens`** stamps a derived lens with its
parentage (`forkedFrom: {id, hash}`); **`diffLens`** is the inverse of merge (so "fork it, edit it, export just my
changes" works); **`lensHash`** is a deterministic content fingerprint, so any lens version can be cited and
verified — `lens X at #h`.

The [Lens Workshop](../workshop/index.html) is the surface. You load a lens, **propose** corrections and new
options (each nudged to carry a source — *a correction without a source is just an opinion*), **export a patch**
to hand to a maintainer, **merge** patches others send you (previewing every attributed change before applying),
and **export** the improved lens — or **fork** it. All in your browser; nothing uploaded; the merge is
reproducible by anyone holding the same files.

This makes the *facts* as ownerless as the *values*. No central editor decides what is true: communities improve
lenses and pass them around, and the lineage — who changed what, with which source — travels with the file. If you
distrust a lens's scores, **fork it**, and let people choose which fork to trust, exactly as they choose which
instance to use. (What this layer does *not* yet have: signatures and a full history graph — trust today rests on
seeing the source on each change and re-running the reproducible merge yourself. That hardening is K4b's next pass.)

## K4c — the Slate (built)

The payoff. K4a gave a group its shared **values**; K4b gave it shared **facts**; K4c turns them into a shared
**decision**. `engine.buildSlate(collectivePassport, lens)` applies a collective passport to a lens through the
engine and returns a **slate**:

- **endorse** — *where we put our money*: the options that best fit the group's values, each with the decisive
  sourced reason.
- **divest** — *where we move our money from*: **only** options that **fail a value the group weights heavily**
  (≤ a low threshold on a ≥4-weighted criterion), each with the failed value and its receipt. No bare call-outs;
  if there is no values-based reason, the divest list is empty — and that is a fine result.
- **dissent** — carried forward from the Assembly, so a slate cannot fake unanimity behind a boycott.
- a verifiable **`lensHash`**, so the slate is reproducible: anyone with the same passport + lens re-derives it.

The [Slate surface](../slate/index.html) loads a collective passport (export the *full collective* from the
Assembly so its dissent travels) and a lens, shows the derived endorse / divest with every reason, and exports the
slate as a file the group commits to.

Three honesty rails are deliberate: a slate is **derived, not decreed** (every line shows its reason); it is a
**recommendation a group chooses to commit to, never a command**; and it is **contestable** — distrust a fact
behind a divestment and you fork the lens in the [Workshop](../workshop/index.html) rather than take ours on
faith. That is what keeps "vote with your money, together" from curdling into a mob.

With this, the loop is whole: **value → know → decide → act**, every step a file, every step reproducible, no center.

## The rule (what keeps it *this* standard)

It only counts as federation **of the Open Values Standard** if it stays **serverless and consentful**: files
people chose to share, merged locally, by a reproducible tally, with no account and no central store. **The moment
a central server holds everyone's values, it is no longer an instance of this standard — it is just another
platform.** That line is the entire point. Hold it, and the revolution can't be bought, because there is nothing
to buy.
