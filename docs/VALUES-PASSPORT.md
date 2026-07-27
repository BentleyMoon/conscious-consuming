# Values Passport (Open Values Standard v0.1)
*A Values Commons primitive defined by the Open Values Standard. The portable, user-owned record of what a person values — readable by any instance, owned by no platform. This is what lets "your values travel" across the federation (Conscious Consuming → Kosplora → …). 2026-06-22; naming canon updated 2026-07-02.*

Values Commons is the public ecosystem. The Open Values Standard is the protocol. A Values Passport is the small file a person owns inside that ecosystem.

## The format
A small JSON file the user holds locally and carries between instances:
```json
{
  "format": "open-values-passport",
  "version": "0.1",
  "source": "conscious-consuming",
  "exported": "2026-06-22T00:00:00Z",
  "values": { "openness": 5, "access": 4, "planet": 5, "people": 4 }
}
```
- `values` maps a **shared universal value** → a 0–5 weight (0 ignore … 5 most). Nothing else is required — **no identity, no email, no account, no tracking.** It is just what you care about, in a form anything can read.

### Optional personal-lines extension (Round 7)

An instance may also carry the few durable rules a person explicitly chose. Older v0.1 readers ignore
the extra field and continue to read `values`; a receiving instance applies only line ids it knows and
reports unknown ids instead of guessing their meaning.

```json
{
  "format": "open-values-passport",
  "version": "0.1",
  "source": "conscious-consuming",
  "values": { "openness": 5, "planet": 3 },
  "lines": {
    "format": "open-values-line-selection",
    "version": "0.1",
    "registryVersion": "0.2",
    "ids": ["diet:vegan", "avoid:nestle"],
    "custom": []
  }
}
```

The merge is additive: importing can add a known rule but never silently remove a rule already held.
Custom avoid rules may travel as plain labels and brand tokens because no shared registry id exists.
The file remains user-owned and local until its holder explicitly exports or shares it. The canonical
selection contract lives in `content/lines.json` and is generated into the app alongside the registry.

## The shared universal vocabulary
The bridge that makes values portable across domains. Each instance maps its own criteria/themes onto these:
- **planet** — environment, sustainability, durability
- **people** — fairness, ethics, others' wellbeing
- **openness** — transparency, open & free, independence, anti-lock-in
- **access** — affordable, accessible, low-barrier, easy
- **wellbeing** — health, safety, calm
- **autonomy** — privacy, control, ownership
- **animals** — non-human welfare
- **community** — local, independent, co-operative
- **quality** — rigour, craft, depth, accuracy
- **joy** — engagement, delight, beauty

(v0.1 — the set grows only as new instances genuinely need it; that growth *is* the standard's open governance, the way the Kosplora test once forced v0→v0.1.)

## How instances map in
- **Conscious Consuming (instance #1):** planet→planet · people→people · health→wellbeing · honesty→openness · privacy→autonomy · animals→animals · cost→access · local→community.
- **Kosplora (instance #2, learning)** receives via its `universalToLocal` bridge: openness→*open* · **people & community→*open*** (caring for fairness and the commons → favouring equitable, open, free learning) · access & wellbeing→*ease* · quality→*rigour* · joy→*ease*. Planet, animals and autonomy have no honest expression in "where to learn", so they stay home — and the engine reports that plainly (below).

## What carries — and what honestly doesn't (engine v0.9)
A value that doesn't fit a domain must never be **silently dropped** (that would quietly misrepresent your stance) nor **faked** into some unrelated criterion. So `passportApply` returns, alongside the derived `weights`:
- **`carried`** — values you prioritised (≥4) that found a home in this space, each `{ universal, local, weight }`.
- **`dropped`** — values you prioritised that this space has **no honest way to express** (e.g. *planet* when choosing where to learn).

The receiving instance shows both, plainly — *"Honesty, Fairness now weigh on your rankings; Planet doesn't map to this space."* Neutral values (weight 3) are never reported — only the priorities you actually set. This is enforced in the engine and **proven by [`research/values_spine_test.js`](../research/values_spine_test.js)**: a Conscious Consuming honesty/fairness passport re-ranks Kosplora toward open resources, while *planet* is reported as not-transferred rather than dropped or faked.

## The point
The values that **span** domains (openness, access) carry over honestly; the domain-specific ones (planet, rigour) simply stay home — and the receiving instance says so plainly. As more instances join, more values bridge. **No central server ever holds the passport** — it lives with the person, exported and imported as a file they own. That portability of the self, across an ownerless federation, is the whole point of Values Commons and the standard underneath it.
