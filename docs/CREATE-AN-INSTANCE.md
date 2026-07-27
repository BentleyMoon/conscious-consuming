# Build a Values Commons app

> Values Commons is public work built on the Open Values Standard. Conscious Consuming is the first working app.
> [Kosplora](../kosplora/index.html) and [Where to Message](../instances/messages/index.html) show how the same
> engine can serve other subjects with different facts and design. This guide explains how to build another one.

## The three layers (and what you actually write)

| Layer | File | Who owns it | You edit it? |
|------|------|-------------|--------------|
| **L1 — the engine** (the math: scoring, bands, the verdict, the passport) | [`app/engine.js`](../app/engine.js) | the Open Values Standard | **No.** Never. It is shared and unedited across every instance. |
| **L2 — the shell** (the experience: live ranking, sliders, the detail/verdict view, passport import) | [`app/shell.js`](../app/shell.js) | the Open Values Standard | **No.** Shared, unedited. |
| **L3 — the skin** (colours, type, layout) | your `index.html` `<style>` | **you** | Yes — make it look like nothing else. |
| **The lens / manifest** (your domain: entities, criteria, value vocabulary, the passport map) | your `lens.js` | **you** | Yes — this *is* your instance. |

An **instance = a manifest (`lens.js`) + a skin (an `index.html`) + three `<script>` tags.** Nothing more.

## New subject brief

Before you write code, fill this in. A good instance starts as a scoped public decision, not as a blank app.

| Field | Answer before building |
| --- | --- |
| **Decision** | What real choice should this instance help someone rank, compare, or act on? |
| **First audience** | Who needs the first version, and what words would make the domain feel native to them? |
| **Starter options** | What 8-20 options are enough to prove the domain without pretending to be complete? |
| **Starter criteria** | What 3-7 criteria actually change the decision? Which are measured facts, and which are assessed judgements? |
| **Passport bridge** | Which universal values transfer into this domain through `universalToLocal`? Which values should be reported as not transferred? |
| **Source floor** | What claims need citations before launch? What can be labeled illustrative or provisional? |
| **Contribution route** | Where should someone send a correction, missing option, fork, or dispute? |
| **Launch test** | What must be true before launch: no accounts, no tracking, no ads, no pay-to-rank, inspectable sources, and clear links to the shared project. |

If the brief is still fuzzy, do not start with a custom interface. Start with the lens: options, criteria, source notes,
and the passport bridge. The skin can come after the decision is clear.

## Step 1 — write your manifest (`lens.js`)

It assigns one global, `window.OVS_LENS`:

```js
window.OVS_LENS = {
  meta: {
    id: 'coffee', storeKey: 'ovs-coffee.values', noun: 'coffee',
    title: 'Where to Buy Coffee',
    tagline: 'Rank roasters by your own values.',
    footer: 'a Values Commons instance, powered by the Open Values Standard.'   // shell prepends "Running Values Engine vX — "
  },
  // The SOURCED axes you rate each entity on. tier:'measured' = a fact (a number, a licence); 'assessed' = a judgement.
  criteria: [
    {key:'fairness', label:'Fair to farmers', tier:'assessed'},
    {key:'planet',   label:'Low-impact',      tier:'assessed'},
    {key:'price',    label:'Affordable',      tier:'measured'}
  ],
  // The VALUE VOCABULARY a person weights once (0–5). These derive the per-criterion weights.
  themes: [
    {id:'ethics', label:'Ethics',     blurb:'fair pay, dignity'},
    {id:'planet', label:'Planet',     blurb:'low footprint'},
    {id:'cost',   label:'Affordable', blurb:'easy on the wallet'}
  ],
  // Which theme drives each criterion. Reuse a theme across criteria freely.
  key2theme: { fairness:'ethics', planet:'planet', price:'cost' },
  // The PASSPORT BRIDGE: a visitor's universal values → your themes. Values that span domains travel in;
  // the rest stay home. Universal vocabulary: planet, people, openness, access, wellbeing, autonomy,
  // animals, community, quality, joy. (See VALUES-PASSPORT.md.)
  universalToLocal: { people:'ethics', planet:'planet', access:'cost' },
  // Your ENTITIES. scores are 0–100 per criterion; provenance is a short note (or {note,source,asof}) per claim.
  resources: [
    {code:'roaster-a', name:'Local Co-op Roasters', brand:'worker-owned',
     scores:{fairness:92, planet:80, price:55},
     provenance:{fairness:'Direct-trade, published prices', planet:'Compostable bags', price:'Premium'}}
    // …more entities…
  ]
};
```

Those are the fields the shared shell reads: `meta`, `criteria`, `themes`, `key2theme`, `universalToLocal`, and `resources`.

## Step 2 — write your skin (`index.html`)

Copy any existing instance's `index.html` as a starting point ([Kosplora](../kosplora/index.html) or
[Where to Message](../instances/messages/index.html)), change the `<style>` to taste, keep these mount points,
and end with the three script tags:

```html
<div class="wrap">
  <h1>Where to Buy Coffee</h1>
  <p class="sub">Rank roasters by your own values.</p>
  <div id="chips"></div>          <!-- the value sliders render here -->
  <p class="summary" id="summary"></p>
  <label>Bring your values<input type="file" id="passfile" accept=".json" hidden></label>
  <span id="passnote"></span>
  <div id="list"></div>           <!-- the ranked list + verdict view render here -->
  <footer id="foot"></footer>
</div>

<script src="../app/engine.js"></script>   <!-- shared core — never edit -->
<script src="lens.js"></script>             <!-- your manifest -->
<script src="../app/shell.js"></script>     <!-- shared shell — never edit -->
```

(Adjust the `../app/…` paths to wherever you place your folder relative to `app/`.)

## Step 3 — open it

Serve the folder over any static host (or open it through a local server so the `../app/*.js` paths resolve).
There is no build step, no backend, no account, no key. It runs from a flash drive.

## What you get for free, by doing nothing

- **Live re-ranking** as the visitor moves the sliders (with a smooth FLIP animation).
- **A transparent verdict view** per entity — the decisive reason, every axis banded, the math shown.
- **Confidence withholding** — below 25% coverage of a visitor's weighted axes, the engine declines to fake a score.
- **The non-compensatory veto** — an axis a visitor weights heavily that scores catastrophically low caps the fit.
- **Portable values** — a visitor can import an Open Values Passport exported from *any other instance*, and the
  values that span both domains carry over. Your instance is born federated.

## Before you share it publicly

An instance should feel like its own website, but it should still teach the commons around it. Check this before
you send the URL:

1. **Name the instance plainly.** A visitor should know the domain in the first screen: learning, messaging, coffee,
   banking, local services, civic resources, or whatever the lens actually covers.
2. **Show where the app belongs.** Link back to Values Commons, the app catalogue, the Values Passport, the
   correction guide, and at least one related app. People should be able to find the shared project without learning
   its internal structure.
3. **State the passport bridge.** Tell people which universal values carry into your local vocabulary through
   `universalToLocal`, and which values do not carry because the domain cannot honestly express them.
4. **Make sources inspectable.** Every strong score needs provenance. If a score is a judgement, mark it honestly;
   if it is measured, say what measured it and when.
5. **Keep the trust boundary visible.** No account, no tracking, no ads, no pay-to-rank, no server required for the
   core ranking. If you add optional community features later, keep them clearly separate from the file-first core.
6. **Make corrections possible.** Link to [Contribute](../contribute/index.html) or document how someone can send a
   sourced correction, missing option, or fork.

## The rules of the standard (so instances stay trustworthy)

1. **Never edit `engine.js` or `shell.js`.** If your domain needs something they can't express, that is a
   proposal to the *standard* (open an issue / fork the core for everyone) — not a private patch. A private
   patch is how a standard dies.
2. **Show your sources.** Use `provenance` honestly; mark `tier:'measured'` only for facts.
3. **No pay-to-rank, no ads, no tracking, no account.** The visitor's values decide the order — nothing else.
   This is the one line that, if crossed, makes it not an instance of *this* standard.

Build the next app when the decision and starter facts are ready. You do not need permission.
