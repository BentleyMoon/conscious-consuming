# Navigation and naming review, October 2026

The owner's note: "the cc design is clunky right now. 'decisions' should say something else because
it's unexplained and slop-like. we should also simplify the navigation in general and have at least
the option of a wiki-like navigation / similarly familiar system." A later note added: "any futurism
institute button should take me directly to that site, not a page about it."

This change is about structure and words. The design tokens, type scale and colours are unchanged.
Screenshots are in `before/` and `after/`, taken at 1280 px and 390 px in the public channel (the
workbench badge that localhost shows by default is switched off for both sets).

## Before: every entry point a first-time visitor met

| Where | What it showed |
| --- | --- |
| Top bar | back, recently viewed, wordmark, **Home · Explore · Guides · Scan**, an **Advanced** button, region (**Everywhere**), theme, **You** |
| Phone tab bar | Home · Explore · Scan · Guides · You |
| Front page | the title **"Your Navigation Nexus"**, a Futurism Institute badge, five hover panels (**Private, Democratic, Transparent, Evolving, Organize anything**) holding 15 more links, a search box, a **Spatial / Fisheye** switch, a "You are here" trail, a depth bar **Needs · Areas · Kinds · Decisions · Evidence**, the map, seven measure chips, "126 **decisions** with sourced answers", a rotating question, and a row of five more links ending "Suggest a **decision**" |
| Explore (`#map`) | a second search box ("Ask"), eight hexagon **portals** with **doors** under them ("Each portal is one need… step through a door"), and **Tasks** ("A task joins related decisions…") |
| A comparison (`#decide/…`) | kicker **DECISION**, "For this decision" |
| Footer | Explore · Contribute · You · Community |

About forty ways in on the first screen, three search boxes across the app, and no plain list of
what the site covers. `#browse` redirected to the map.

## After: the navigation

- **Top bar:** wordmark (home) · **one search box** · **Browse · Guides · My rules** · **More ▾** · region · theme.
  The search box finds categories, products, services, brands and guides by name, with
  as-you-type suggestions; it hides on the front page, which has its own large box.
- **More ▾:** Explore by everyday need (`#map`) · Map view of every category (`#mapview`) · Scan a
  barcode · Compare side by side · Recently viewed · Advanced: close-call priorities · Plain list of
  every category (`./browse/`) · Suggest a correction · Community · About the Values Commons ·
  Futurism Institute.
- **Phone tab bar:** Home · Browse · Search · Guides · You. More stays in the top bar.
- **Front page:** one heading ("Compare everyday choices by your own values"), the search box,
  three quick links (browse A to Z, scan, read a guide), the catalogue by everyday need as plain
  links, the rotating question, and four short lines on how the site works.
- **Browse (`#browse`, `#browse/needs`):** every category A to Z with a letter bar and a filter, or by
  everyday need and area; each line says how many entries it holds and where it sits.
- **Search (`#search`):** a Categories section now comes first ("Oats · Compare 396 oats"), then
  guides, then products and brands. `#search` with no query is a search page, used by the tab bar.
- **Map view (`#mapview`):** the map that used to be the front page, unchanged in behaviour.
- **Wiki-like pages without JavaScript (`app/browse/`):** `pipeline/build_browse.js` writes an A to Z
  index and one page per category (126). Each category page has breadcrumbs (Home › everyday need ›
  area › category), every entry as a plain link (to its verdict page under `app/c/` when one exists,
  otherwise to the entry in the app), the category's guide, and "See also" categories from the same
  area. The pages are in `app/sitemap.xml` and carry canonical, extensionless URLs.
- **Verdict pages (`app/c/`) and guide pages (`app/g/`):** breadcrumbs on verdict pages (Home ›
  need › area › category, linking to the category page), and the same short link set on every
  generated page (All categories · Guides · Search). Those links now stay visible on a phone.
- **Site home (`/index.html`):** a "Browse categories" link added to the top of its navigation.

Every existing hash route still works: `#explore/…` still redirects to `#decide/…`, `#map`, `#need/…`,
`#scan`, `#you`, `#discover/…` and the rest are untouched. `#browse` used to redirect to `#map`; it is
now the Browse page.

## Renamed labels

| Old | New | Where |
| --- | --- | --- |
| Your Navigation Nexus (and its five hover panels) | Compare everyday choices by your own values; "How this works" | front page |
| Explore (nav, tab, footer, crumb) | Browse | top bar, tab bar, footer, breadcrumbs |
| Explore (page title) | Explore by everyday need | `#map` |
| Decision (kicker) | Comparison | every comparison page (`app/presentation.js`) |
| For this decision | For this comparison | comparison controls |
| Decide (crumb) | Compare | breadcrumbs |
| decisions ("126 decisions with answers", "136 decisions · 50 answered", "Decisions ready now") | comparisons ("… comparisons · 50 ready", "Ready to compare") | map view, explore tiles, need pages, value pages |
| Open the decision / Suggest a decision / Name the decision | Open the comparison / Suggest a correction / Name the category | value pages, contribute hints |
| portal, door ("Each portal is one need… step through a door") | tile, category | `#map` |
| Closest doors we do have / Or walk the full map | Closest categories we do have / Or browse every category | search with no results |
| A task joins related decisions and produces a list you can save | A task, such as switching banks, puts the comparisons it needs in one place and gives you a list you can save | `#map` |
| A human need; NOURISH, CARE … (headings) | Everyday need; Food & drink, Personal care, Home, Phones & internet, Getting around, Media & learning, Giving, Money & privacy | need pages, browse, explore tiles, breadcrumbs (the plain names the comparison pages already used) |
| Map view: Spatial / Fisheye | Style: Grid / Zoom lens | map view |
| View: Needs · Areas · Kinds · Decisions · Evidence | Zoom: Needs · Areas · Types · Comparisons · Evidence | map view |
| Fisheye depths: domains … decisions … | sections … comparisons … | map view (canvas labels, spoken announcements) |
| Entries (search heading) | Products, services and brands | search |
| Verdict card (crumb) | Summary card | breadcrumbs |
| … across 63 lenses | … across 63 categories | wall of verdicts (`app/c/index.html`) |
| 120+ decision categories; Make a decision clearer | 120+ categories; Make a comparison clearer | site home |
| Advanced (top-bar button) | Advanced: close-call priorities (a line in More) | header |
| You (top-bar link) | My rules (top bar; the tab bar keeps You) | header |

Internal identifiers, data keys, file formats, hash routes and the Open Values Standard's terms are
unchanged: `decision` objects, `#decide/`, `CC.decisionPage`, the `lens` JSON-LD names on verdict
pages, and every document under `docs/` stay as they were.

## Futurism Institute links

Every link that names the Futurism Institute now goes straight to `https://futurisminstitute.org/`.

| Where | Before | After |
| --- | --- | --- |
| `index.html`, "The whole design … is at the Futurism Institute" | `https://futurisminstitute.org/design` | `https://futurisminstitute.org/` |
| `index.html`, "other nodes of the Futurism Institute" | `https://futurisminstitute.org` | `https://futurisminstitute.org/` (trailing slash only) |
| `app/` front page badge and "What the Futurism Institute is for" | already the homepage | removed with the hover panels; replaced by a "Futurism Institute" link in "How this works" |
| `app/index.html` More menu and footer | none | new "Futurism Institute" links to the homepage |

The JSON-LD identifier `https://futurisminstitute.org#org` in `index.html` is an id, not a link,
and is unchanged. The `futurisminstitute@gmail.com` mail links are addresses, not pages about the
Institute, and are unchanged. No other page in the repository links to the Institute.

## Audits changed, and why

| Audit | Change | Why |
| --- | --- | --- |
| `research/map_audit.js` | the pinned fisheye depth list, and its mutation bite, now read `['sections', 'needs', 'fields', 'families', 'comparisons', 'evidence']` | the depth names are shown to readers and were renamed; the check (six rungs, in this order) and its bite are otherwise the same |
| `research/public_route_audit.js` | `app/browse/` added to the generated pages it checks (title, canonical, sitemap agreement, no `.html` hrefs) | a stronger check: the new pages are held to the same SEO contract as guides and verdicts |
| `research/interface_vocabulary_audit.js` | `app/browse/` added to the sampled pages | a stronger check; note this audit is skipped in the public copy, because its contract document is not carried here |
| `scripts/check-generated-drift.mjs` | `pipeline/build_browse.js` added after `build_cards.js`, and `app/browse` added to the generated targets | build-graph parity with `scripts/build.mjs` |

No check was deleted or loosened. Two audits held the old header in place and were satisfied rather
than edited: `personal_precedence_audit.js` and `first_use_audit.js` pin the owner-signed wording
"Advanced: close-call priorities" (an `#you` link with `id="navvalues"`) and "You: my rules and
data". Both now live on: the first as a line in the More menu, the second as the title of the My
rules link. The accessibility audit's pinned `#navtoggle` button is kept as it was.

## Left alone, on purpose

- **"My rules", "The baseline", "close-call priorities", "Tasks".** These are signed vocabulary in
  `content/presentation/strings.json` and pinned by the first-use and precedence audits. "Tasks" is
  now explained where it appears. Whether "close-call priorities" should become "tie-breakers" is
  the owner's call.
- **"Your values" as the nav label.** The brief suggested it; the precedence audit records a signed
  decision that this link names rules, not a value identity, so it reads **My rules**. Owner's call.
- **The map, the fisheye, the hexagon tiles, the needs rose.** Kept whole, behind More and on
  `#map` / `#mapview`. Nothing was deleted.
- **The comparison page body** (`#decide/…`): its search box placeholder ("… guides, or tasks"),
  the path line, "folded by the baseline" and the rest are owner-signed presentation strings.
- **Workbench-only pages** (`#workbench`, H4/H10 evidence walks) still say "decision"; only the
  development channel shows them.
- **`content/lenses/*.json`** were not touched (other work is editing them in parallel).
- The interface-vocabulary contract (`docs/design/INFORMATION-ARCHITECTURE.md`) is not in the
  public copy, so "decision", "portal" and "fisheye" were not added to its refused list here. That
  is worth doing in the working repository.
