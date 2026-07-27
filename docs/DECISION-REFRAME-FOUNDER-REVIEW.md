# Decision reframe — founder release review

**Program:** Development Rounds 1–12
**Machine preflight:** required before review
**Founder decision:** pending human review

This is the release gate for the complete floor → lines → dials → leanings reframe. It is intentionally short: review the journey as a chooser, then record one decision. A passing audit proves structure and computation; it does not decide whether the product feels calm, credible, or ready to put in front of people.

## §M Round 2: S2 plain-words pilot

- **Machine gate:** required before review
- Founder signature: **signed in the project thread on 2026-07-15**
- Batch status: **authorized; Round 3 built for the founder walk**

The five samples below were signed as one batch. Round 3 applies them to the chooser surfaces while preserving internal identifiers and file compatibility.

**Continuation protocol correction:** Numbered round requests are sufficient continuation instructions. Never demand a ceremonial phrase or repeat a signature prompt. Pause only when a genuinely unresolved product decision prevents safe work.

### The twelve-word glossary

> My rules · The baseline · Tasks · Price or quality · Your file · Close-call priorities

“Price or quality” is an example, not a universal label: each decision names the practical choice it actually offers. Verdict, commons, and guide remain because they are ordinary words. Workbench becomes developer-only. Lens becomes list in public copy.

### Sample 1 · Home: My rules

**Pilot copy**

> **My rules**
>
> Set a rule only when it is something you will not bend. Starting with none is fine.

This replaces “your lines,” “set a line,” and “draw one durable line” on the home surface.

### Sample 2 · Decision page: The baseline

**Pilot copy**

> **The baseline is on**
>
> Verified worst practices are folded first. Read every rule or show every option.

This replaces “the shared floor” while preserving inspectability, local loosening, and show-anyway behavior.

### Sample 3 · Explore: Tasks

**Pilot copy**

> **Tasks**
>
> Start with what you need to do: buy groceries, switch banks, or choose a phone.

This replaces “errands” in chooser-facing navigation. Internal data identifiers do not need renaming.

### Sample 4 · Decision page: Price or quality

**Pilot copy**

> **For this decision**
>
> **Price or quality?**
>
> Lower price ↔ Better made

There is no generic “dials” or “sliders” heading. Every range is named for the practical trade-off in front of the chooser.

### Sample 5 · You: Your file and Advanced

**Pilot copy**

> **Your file**
>
> Download your file · Upload a file
>
> **Advanced: Close-call priorities**

“Values Passport” remains only as the technical format name in the specification. The sigil and downloadable leanings card do not appear in the primary flow. Workbench controls are developer-only.

### Sign the five samples

Read the glossary and five samples once, then record only the words that fail. The walk should take less than two minutes.

```text
Round: §M 2 / Core S2 pilot
Walk time:
Sample 1 — My rules: approve / change
Sample 2 — The baseline: approve / change
Sample 3 — Tasks: approve / change
Sample 4 — named practical choice: approve / change
Sample 5 — Your file + Advanced: approve / change
Exact replacement wording, if any:
Founder signature: signed 2026-07-15
Decision: sign for batch
```

Stop if any sample still asks the chooser to learn product theory, if a practical range lacks a concrete name, or if the file sounds like an identity profile rather than anonymous belongings.

Five-number release receipt: current coined-term baseline **8; pilot copy 0; batch target ≤3** · document-file delta **0** · audit-file delta **0** · target walk **under 2 minutes** · adoption events **0, unchanged**.

## §M Round 3: S2 signed batch walk

This walk checks the approved vocabulary in the product. It does not authorize deployment.

1. Open `/app/#home`: the secondary action says **Set a rule** or **Edit my rules**.
2. Open `/app/#map`: the second door says **Tasks**; no chooser-facing “errand” label leads the journey.
3. Open `/app/#decide/banking`: confirm **The baseline**, **My rules**, and **What matters here** appear in that order.
4. Open Advanced once: **Close-call priorities** are last, closed by default, and cannot restore a filtered option.
5. Open `/app/#you`: confirm **Download your file** and **Upload a file**; no sigil, card download, or public workbench control appears.

Round 3 receipt: coined product terms on the primary journey **≤3** · document-file delta **0** · audit-file delta **0** · founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## §M Round 6: S3 safety-grade allergy walk

This walk checks the safety contract; it does not certify a package or authorize deployment.

1. Keep **Gluten allergy** active and open `/app/#list/oats`.
2. Confirm the result note says **38 eligible matches · 358 need a label check**.
3. Confirm an eligible option says **Declared gluten-free.** Absence from an allergen list must not
   produce that sentence.
4. Open **Show 358 options that need a label check**. Confirm declared and missing-evidence options
   remain visible; the receipt reports **158 have missing evidence** and says to check the package.
5. Open `/app/#decide/oats`. Confirm **Flocons d'avoine SANS GLUTEN - 500g** can appear in the
   computed answer, while the fold remains one action away.

Machine receipt: `pipeline/test_scoring.py` **38/38** · `research/verify_run.js` **all checks pass** ·
`audit:lines` **40 personal lines, 19,772 food entries safety-checked, 0 warnings**. The audit first
failed against the old generated corpus, proving missing evidence cannot silently ship, then passed
only after every food bundle was rebuilt.

Round 6 five-number receipt: coined product terms **≤3** · document-file delta **0** (this existing
review page was extended) · audit-file delta **0** (the consolidated lines audit was extended) ·
founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## §M Round 7: S4 cost-or-values walk

This walk checks one practical cost choice and the honest absence state. It does not authorize deployment.

1. Open `/app/#decide/coffee`. Confirm the first choice is **Cost or values**, begins balanced, and
   says **Observed prices exist for 107 entries**. Missing prices must never be described as cheap.
2. Move the first range fully toward **Lower observed price**. Confirm **Café soluble lyophilisé**
   becomes Best for most and the position reads **Strongly toward lower observed price**.
3. Press **Reset choices**. Confirm the range returns to **Balanced** and **café corsé** returns.
4. Open `/app/#decide/phones`. Confirm there is no cost range and the page says exactly
   **No price data yet — ranked by values alone.**
5. Repeat Coffee at a 390px-class width. Confirm the two pole labels remain readable and the page
   does not scroll sideways.

Machine receipt: decision contract audit **88/88**, including **61 cost-or-values defaults** and
**27 plain no-price categories** · Standard audit **pass** with decision contracts v0.2 · category
rollout and pilot audits **pass** · browser checks confirmed one-move answer change, reset, honest
no-price state, and **390px inner width / 375px document width**.

Round 7 five-number receipt: coined product terms **≤3** · document-file delta **0** (this existing
review page was extended) · audit-file delta **0** (existing decision and Standard audits were
consolidated) · founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## §M Round 12: canonical S4 integration walk

This walk confirms that the signed cost behavior survived the move onto the repository's one
canonical root. It does not authorize a merge or deployment.

1. Open `/app/#decide/coffee`. Confirm **Cost or values** is first and begins at **Balanced**.
2. Move it fully toward lower observed price. Confirm the answer changes from **café corsé** to
   **Café soluble lyophilisé**, then use **Reset choices** and confirm the original answer returns.
3. Open `/app/#decide/phones`. Confirm there is no cost slider and the page says **No price data yet
   — ranked by values alone.**
4. Open one source receipt in each category. Confirm the source and date remain visible and neither
   page claims that missing price data means cheap.
5. Confirm this release records **0 adoption events** and does not open F1 or any locked territory.

Machine receipt: the required dataset, guide, and count rebuilds pass sequentially · decision
contract audit **88/88** with **61** cost defaults and **27** no-price states · registrable-domain
provenance audit **24,621/24,621** entries with **0** unsourced · pilot and rollout audits pass.

Round 12 five-number receipt: coined product terms **≤3** · document-file delta **0** (this existing
review page was extended) · audit-file delta **0** (existing decision and provenance audits were
used) · founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## §M Round 13: adoption-ledger enforcement walk

This walk confirms that the approved adoption gates are executable and remain closed. It does not
record an adoption event, send an invitation, or authorize deployment.

1. Open `content/operations/adoption.json`. Confirm it defines seven gates, each with an external
   event type, a distinct-subject threshold, and a named unlock.
2. Open `content/operations/adoption-events.jsonl`. Confirm it contains exactly one
   `cc-adoption-ledger-init` record and no `cc-adoption-event` record.
3. Open `content/operations/templates/adoption-event.json`. Confirm its kind is
   `cc-adoption-event-template`, which the audit rejects as a countable event.
4. Run `node research/first_use_audit.js`. Confirm it reports **0 confirmed / 0 recorded** events,
   **0 open / 7 locked** gates, and `FIRST-USE CHECKS PASS`.
5. Confirm no release note claims an invitation, external use, or adoption. The only permitted
   growth number remains **0** until retained evidence and human confirmation exist.

Machine receipt: the consolidated first-use audit validates registry shape, event types, evidence,
privacy boundaries, review authority, timestamps, and distinct subjects. Embedded adversarial
fixtures prove pending, internal, evidence-free, template, and duplicate-subject records cannot
open a gate. Release preparation now refreshes its package-mode fingerprint snapshot before the
full verifier reads it, removing the stale-status loop found during this round.

Round 13 five-number receipt: coined product terms **≤3** · `docs/` directory delta **0** (this
existing review page was extended); approved operational evidence bundle **+13 Markdown files** ·
audit-file delta **0** (the existing first-use audit was extended) · founder walk target **under 2
minutes** · adoption events **0, unchanged**.

## §M Round 14: hold and hygiene walk

This walk proves that the machine stopped where the plan says to stop. It does not authorize a new
product front, invitation, push, or deployment.

1. Run `git log -1 --oneline main`. Confirm local canonical main contains Round 13 commit
   `75a1891b`.
2. Open `content/operations/adoption-events.jsonl`. Confirm its only row is the non-counting
   `cc-adoption-ledger-init` record.
3. Confirm neither `dist/r1-preflight.json` nor `dist/r1-receipt.json` exists in the canonical
   worktree, and no retained record claims five real invitations.
4. Run `node research/first_use_audit.js`. Confirm **0 confirmed / 0 recorded** events and **0 open
   / 7 locked** gates.
5. Run `git worktree list`. Confirm the four evidenced-complete worktrees are gone, dirty and
   unproven lanes remain, and their branches were not deleted.

Machine receipt: registered worktrees **34 → 30**. Removed only the merged Round 13 and canonical
S4 worktrees and the explicitly ported S3/S4 source worktrees. No dirty file was removed. The
Round 13 full verifier remains the product baseline; Round 14 changes only these existing receipts.

Round 14 five-number receipt: coined product terms **0** · document-file delta **0** (two existing
receipts extended) · audit-file delta **0** · founder walk target **under 2 minutes** · adoption
events **0, unchanged**.

## §M Round 16: R1 machine-preflight walk

This walk checks that a private package is ready to hand to the founder. It does not substitute for
the founder using the deployed product for one real decision.

1. Run `npm run release:status`. Confirm the current package is **private-preview**, the release
   receipt passed, and current `dist/` matches its build metadata.
2. Confirm `dist/r1-preflight-check.json` reports `status: passed`, target fingerprint
   `592bed837034…`, and active blockers **H10, H4**.
3. Run `node research/first_use_audit.js`. Confirm **0 confirmed / 0 recorded** events and **0 open
   / 7 locked** gates.
4. Confirm the tracked `app/` tree is clean and canonical after the package build; the private
   review target remains in `dist/` and was not deployed.
5. Open `docs/R1-REVIEW.md`. The next action is still human: deploy privately, make one real
   decision on desktop and phone, then write Pass to first 5 / Patch first / Stop.

Machine receipt: `npm run r1:preflight` **pass** · `npm run verify:full` **pass** inside release
preparation · private/public package-mode audit **pass** · health report **pass** · status check
**pass** · private target SHA-256 `592bed83703424defc299712cc1d4d5bc5edc41f02a410a9bd1ac59c776b02e2`.

Round 16 five-number receipt: coined product terms **0** · document-file delta **0** (three existing
receipts extended or regenerated) · audit-file delta **0** · machine walk target **under 2 minutes**
· adoption events **0, unchanged**. Human R1 receipt: **pending**.

## §M S8 five-sample semantic preflight

This walk checks that each unsigned pilot range now changes only the evidence named by its words. It does not sign the copy, open the 56-category batch, or authorize deployment.

1. Breakfast cereal: **Less sugar** raises only `low_sugar`.
2. Coffee: **Certified sourcing** raises only `fair_trade`, `organic`, and `rainforest_alliance`.
3. Razors: **Longer life** raises only `durability`.
4. Learning resources: **Teaching quality** raises only `educational`.
5. Mobile carriers: **Less exposure** raises only `privacy`.

Machine receipt: the decision-contract audit checks these exact mappings, confirms every named criterion has populated evidence and real spread, and keeps the other 56 cost-aware categories on their prior generic contract until signature. The rollout audit remains green across all 88 primary routes.

Part 6 five-number receipt: coined product terms **0 added** · document-file delta **0** (this existing review page was extended) · audit-file delta **0** (the existing contract audit was strengthened) · founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## S8 evidence-limits preflight

Coffee, dark chocolate, and tea now publish the same bounded statement beside their decision evidence: organic, fair-trade, and Rainforest Alliance certification are scored when product label data exists; packaging and farmer pay are not scored; missing certification labels remain unknown.

The contract is generated from each category's Open Food Facts label receipt. It includes source, year, entry count, missingness rule, and exact known and positive coverage for all three certification criteria. A build-failing audit rejects changed counts, false scored claims, or the contract appearing outside these three pilots. H20 remains open for app/design to consume the contract and choose its final presentation.

Part 7 five-number receipt: coined product terms **0 added** · document-file delta **0** (two existing receipts extended) · audit-file delta **0** (two existing decision audits and the standard validator strengthened) · founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## S8 browser-scoring handoff preflight

The generated app index now carries six compact certification-scoring fixtures: missing labels, an unmatched present label, one variant for each certification, and all three together. They are produced by the same helper that scores the coffee, dark-chocolate, and tea datasets, including the rule that three certification facts count as one source field for roster admission.

The full gate exercises the fixtures through the OFF parity test and rejects tag, state, category-boundary, or legacy-mode drift. This does not claim browser parity is complete: H20 remains open until app/design makes the live barcode scorer category-aware and maps the three criteria in the browser engine.

Part 8 five-number receipt: coined product terms **0 added** · document-file delta **0** (two existing receipts extended) · audit-file delta **0** (the existing rollout, standard, OFF parity, and Python scoring tests strengthened) · founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## S8 category-integrity five-sample pilot

This walk covers five additional sibling-category identities that reached real decision tops. It is
bounded to the observed leaks and does not claim the remaining Open Food Facts categories are clean.

1. Pasta sauce no longer admits **Steel Cut Oats Quick**.
2. Fruit juice no longer admits the two **Soja** drinks.
3. Butter no longer admits the four peanut-butter products, including the measured Portuguese and
   Italian names.
4. Cereal bars no longer admit the six exact loose-cereal results; real oat bars without the word
   "bar" remain in the roster.
5. Dried fruit no longer admits three peanut-only products; **DATE BITES PEANUT & COCOA** remains.

Machine receipt: **16/1,917** scored rows removed across the five pilots; **1,901** retained. The
decision rollout audit checks their balanced, cost-end, and values-end top ten, bringing category
assignment coverage to **24 ranking paths** across eight guarded categories. The scoring suite passes
**63 tests**. H20 and H21 remain app/design-owned; this round does not sign copy, change the browser
scorer, drain either handoff, or authorize deployment.

Part 9 five-number receipt: coined product terms **0 added** · document-file delta **0** (two existing
receipts extended) · audit-file delta **0** (the existing rollout audit and scoring tests strengthened)
· founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## S6 banking freshness correction

The only stale sourced claim in the maintainer queue said a generic Local credit union deserved a
green-financing score because credit unions rarely finance fossil fuels. The linked page did not
support that conclusion. This round removes the score instead of changing its date.

1. Local credit union now shows green-financing evidence as unknown, not 78/100.
2. Its US governance facts cite the NCUA's current consumer explanation: member-owned,
   not-for-profit, member-elected board, and member savings funding member loans.
3. The lens and guide both say that ownership structure does not prove a fossil-free loan book; the
   chooser must inspect the individual institution's current lending and investment policy.
4. The generic entry is now US-bounded rather than using one US source to claim UK/EU coverage.
5. Under **Fossil-free & green**, it moves from rank **9**, score **79**, coverage **100%** to rank
   **12**, score **68**, coverage **61.5%**. No replacement score was invented.

Machine receipt: source-refresh queue **1 → 0** · stale-source lenses **1 → 0** · missing dated
provenance **0** · null score placeholders **5,345 → 5,346** · content readiness, freshness, OVS
conformance, canonical rebuild, and generated ranking checks pass. The pulse audit now accepts a
truthful zero-stale queue instead of requiring permanent source debt. S6 remains a standing duty.

Part 10 five-number receipt: coined product terms **0 added** · document-file delta **0** (two
existing receipts extended) · audit-file delta **0** (the existing content-readiness and pulse
audits strengthened) · founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## S7 Windows build-hygiene correction

The content-hash design was already right, but the Windows writer violated its LF boundary. A
one-word body edit to the biscuits guide created only four semantic changes while `git status`
reported 106 paths. The false rows were every regenerated guide page being rewritten as CRLF.

1. `pipeline/build_guides.py` now writes every tracked text output with explicit LF endings.
2. `pipeline/build_datasets.py` does the same for category JSON, the category index, and `data.js`;
   `pipeline/stamp.py` preserves LF when it changes cache-bust URLs.
3. The same one-word probe now reports only its four real paths: source guide, one static guide,
   `guides.js`, and `app/index.html`.
4. The probe also caught a clean-checkout defect: the committed LF `guides.js` had a URL hash made
   from its pre-commit CRLF bytes. Rebuilding now stamps its actual LF hash.
5. The existing cache-bust audit checks 95 top-level data JSON files, all 101 guide HTML pages, and
   shared generated text for LF, plus all three writer contracts. No extra audit command was created.

Part 11 five-number receipt: coined product terms **0 added** · document-file delta **0** (two
existing receipts extended) · audit-file delta **0** (the existing cache-bust audit strengthened)
· founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## S7 tracked-writer and barcode closure

Part 11 repaired the release generators. Part 12 checked the less frequent maintenance paths and
found the same platform-default writer in raw/cache fetchers, lens enrichers, barcode generation,
and ontology migration. It also found that barcode generation was not part of the canonical build.

1. One shared `pipeline/tracked_io.py` now owns LF-safe text and JSON writes.
2. Twelve tracked-output scripts use that helper; the audit rejects a return to direct text-mode
   writers and checks 429 current tracked outputs for CRLF.
3. The committed barcode index had 16,560 mappings; current category files yield 19,752.
4. The rebuilt index adds 3,571 current mappings, removes 379 absent mappings, and corrects 126
   category assignments. Its 966 duplicate source rows keep the existing deterministic first match.
5. `build_datasets.py` now regenerates the barcode index, and the existing cache-bust audit derives
   the expected index independently from every category file. No network fetcher was run.

Part 12 five-number receipt: coined product terms **0 added** · document-file delta **0** (two
existing receipts extended) · audit-file delta **0** (the existing cache-bust audit strengthened)
· founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## S7 non-mutating generated-output audit

Part 12's final verification exposed one remaining hygiene defect: `npm run audit:generated`
reported 3,196 generated outputs current but rewrote ignored `app/data/pulse.json`, so a green audit
made a clean checkout dirty. It could also rewrite guide social images even though raster bytes are
deliberately outside the cross-platform drift gate.

1. Generated-drift mode no longer calls the pulse writer; the pulse keeps its existing read-only
   semantic audit and release-time regeneration.
2. The guide builder accepts the same explicit image-skip boundary already used for verdict cards.
3. Drift mode skips all platform-dependent raster generation while continuing to rebuild and hash
   every reproducible text/data output.
4. The baseline audit changed one ignored tracked path; the identical fixed audit changes zero
   generated paths and preserves all pre-run source edits exactly.
5. The existing cache-bust audit rejects a return to a mutating pulse call, a missing guide-image
   skip, or loss of the read-only pulse semantic check.

Part 13 five-number receipt: coined product terms **0 added** · document-file delta **0** (two
existing receipts extended) · audit-file delta **0** (the existing cache-bust audit strengthened)
· founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## S7 generated-page closure

Part 13 made a green drift audit non-mutating, but the comparison still treated every pre-existing
file as legitimate. A guide or verdict removed from its source could leave old crawlable HTML and
social images behind forever because both snapshots contained the same orphan.

1. A baseline probe added retired guide HTML/PNG and retired verdict HTML/PNG. The audit exited
   green, counted only the HTML files (3,196 → 3,198), and left all four outputs in place.
2. The guide generator now derives its exact HTML/PNG set from the 100 source guides and removes
   only generated extensions outside that set.
3. The verdict generator derives its exact set from `_cards.json`, removes only retired generated
   HTML/PNG files, and removes an obsolete category directory only when it is empty.
4. Drift verification now tracks ignored filename additions/deletions without hashing
   platform-dependent image bytes, so an orphan image cannot disappear inside the ignore rule.
5. The same four probes now fail as four changed paths. The clean audit proves exact closure over
   202 guide files and 5,839 verdict files while retaining all 3,196 reproducible-byte checks.

Part 14 five-number receipt: coined product terms **0 added** · document-file delta **0** (two
existing receipts extended) · audit-file delta **0** (the existing cache-bust audit strengthened)
· founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## S7 category-dataset closure

Part 14 closed crawlable guide and verdict outputs. Top-level category JSON still lacked the same
authority boundary: a retired dataset could remain outside `app/data/index.json`, be read by broad
directory scans, and become accepted once its downstream generated files caught up.

1. A category-shaped probe initially changed design tokens. After one catch-up rebuild, the audit
   exited green at 3,197 files while the retired dataset remained outside the 88-category catalogue.
2. `build_datasets.py` now removes only category-shaped JSON not named by the newly written
   catalogue. The seven top-level non-category contracts are explicitly preserved by shape.
3. `build_barcodes.py` now validates and reads the catalogue's sorted file list, rejects duplicate
   or unsafe filenames and id mismatches, and no longer scans unrelated or retired JSON.
4. The independent barcode audit reconstructs the same 19,752 mappings from catalogue files while
   retaining the 966-first-match duplicate rule.
5. A fixed-path probe carrying a valid 14-digit barcode is removed before downstream generation,
   fails drift on exactly its JSON path, and never enters the scanner index. Clean exact closure is
   88 datasets, 202 guide files, 5,839 verdict files, and 3,196 reproducible outputs.

Part 15 five-number receipt: coined product terms **0 added** · document-file delta **0** (two
existing receipts extended) · audit-file delta **0** (the existing cache-bust audit strengthened)
· founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## S7 node-index closure

Part 15 made the category catalogue authoritative, but the generated node directory still accepted
extra JSON outside its integrity manifest. Such a file survived every node rebuild and a green
generated-output audit once it existed before both snapshots.

1. A fixed probe remained outside the 21-entry node manifest while the old audit passed at 3,197
   reproducible files.
2. `build_nodes.js --check` now reports any JSON not named by the generated manifest as orphaned.
3. The writer removes those orphan files before writing its outputs, while validating every manifest
   filename as a unique, basename-only JSON path.
4. The independent drift audit exact-compares all node JSON with the 21 manifest entries plus the
   manifest itself.
5. The same probe now fails on exactly `app/data/nodes/retired-probe.json`; clean closure is 22 node
   files and 3,196 reproducible outputs.

Part 16 five-number receipt: coined product terms **0 added** · document-file delta **0** (two
existing receipts extended) · audit-file delta **0** (the existing cache-bust audit strengthened)
· founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## S7 data-root closure

Part 16 closed the node directory, but the top level of `app/data/` still allowed arbitrary JSON
that was neither a category nor one of the shared generated contracts. Once present before both
snapshots, such a file survived every rebuild and passed the generated-output audit.

1. A non-category fixed probe survived the old generator and produced a green 3,197-file audit.
2. `build_datasets.py` now declares the complete top-level contract: 88 catalogue datasets plus
   `index`, barcodes, pulse, challenge, proposals, asks/offers, and design tokens.
3. The writer removes any other top-level JSON without touching subdirectories or non-JSON files.
4. The independent drift audit exact-compares all top-level JSON against that 95-file union; node
   JSON remains independently closed by its manifest.
5. The same probe now fails on exactly `app/data/retired-contract-probe.json`, while clean output
   returns to 3,196 reproducible files with all seven shared contract payloads unchanged.

Part 17 five-number receipt: coined product terms **0 added** · document-file delta **0** (two
existing receipts extended) · audit-file delta **0** (the existing cache-bust audit strengthened)
· founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## S7 generated-page directory closure

Part 17 closed `app/data`, but the generated guide and verdict directories still defined orphans by
extension. Unexpected text, JSON, or other files survived because both writers and the independent
closure audit considered only HTML and PNG outputs.

1. Fixed text probes under `app/g/` and a nested `app/c/` directory survived every old rebuild; the
   generated audit passed at 3,198 reproducible files.
2. The guide writer now recursively removes every file outside its 202 source-derived paths and
   retires empty directories.
3. The verdict writer does the same against 5,839 manifest-derived page/image paths plus the card
   manifest itself.
4. The independent drift audit now exact-compares every file extension in both directories, while
   continuing to track platform-dependent image filenames separately from image bytes.
5. The same probes now fail on exactly their two paths; clean output returns to 3,196 files without
   changing a guide, verdict, image, route, or manifest entry.

Part 18 five-number receipt: coined product terms **0 added** · document-file delta **0** (two
existing receipts extended) · audit-file delta **0** (the existing cache-bust audit strengthened)
· founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## S7 raster-integrity closure

Part 18 closed generated filenames across every extension. Raster bytes still cannot be compared
across operating systems because fonts and imaging libraries legitimately differ, but name-only
closure could not distinguish a real social image from a truncated or unrelated file.

1. A fixed guide-image path was reversibly replaced by ten bytes of text. The old audit still passed
   all 3,196 reproducible outputs because the filename remained present and PNG bytes were ignored.
2. The generated-output audit now reads every expected raster structurally without comparing pixels.
3. It requires the PNG signature, bounded chunks, matching CRCs, a first and unique IHDR, IDAT, a
   terminal IEND with no trailing bytes, and the shared 1200×630 social-image dimensions.
4. Coverage is derived from the 101 guide images, 2,919 manifest-backed verdict images, and the home
   poster: 3,021 raster contracts in total.
5. The same text replacement now fails on exactly `app/g/ai-assistants.png`; the restored image and
   the complete clean corpus pass without introducing platform-dependent byte comparisons.

Part 19 five-number receipt: coined product terms **0 added** · document-file delta **0** (two
existing receipts extended) · audit-file delta **0** (the existing cache-bust audit strengthened)
· founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## S7 canonical build-graph closure

Part 19 proved that every currently expected output is present and structurally credible. The
remaining audit boundary was the list of producers itself: the release build and drift audit
repeated that list by hand, so the release graph could grow without the audit graph noticing.

1. A fixed extra producer was added to the canonical release build. The old generated-output audit
   ignored it, rebuilt all 3,196 reproducible files, and exited green.
2. The drift audit now reads the canonical build and compares the exact ordered producer sequence
   before it runs any writer.
3. The comparison requires unique steps and makes both intentional differences explicit:
   `build_site.py` remains the single final release-only step, while `build_pulse.js` becomes the
   existing read-only pulse audit.
4. The same fixed producer now fails in under one second, names the missing operation, and performs
   no partial rebuild.
5. Clean parity covers 13 canonical steps and 12 audited steps without changing generated output,
   source data, product behavior, or release state.

Part 20 five-number receipt: coined product terms **0 added** · document-file delta **0** (three
existing receipts extended) · audit-file delta **0** (the existing cache-bust audit strengthened)
· founder walk target **under 2 minutes** · adoption events **0, unchanged**.

## The seven-minute walk

Use a private window or erase device-local settings first. Do not set theme weights.

1. Open `/app/#map`. Confirm the first door is Ask, the second is a real decision, and the eight-need map is third. No inventory total should compete for attention.
2. Open `/app/#need/learn`. Read the need in human terms, then enter Learning resources. Confirm the category opens as a decision, not a warehouse.
3. On `/app/#decide/learning-resources`, confirm useful answers exist before setup. Move one practical dial. Open Show the math, then the full ranking.
4. On `/app/#decide/banking`, open the floor receipt and its show-anyway fold. Confirm six options are folded by the sourced rule and every one remains visible.
5. Add one personal line. Confirm eligibility changes before the practical dials rank the remainder; open Fine-tune close calls and confirm leanings are last.
6. Open `/kosplora/`. Confirm it is clearly marked illustrative, uses a distinct learning skin, starts with rules and practical learning dials, and never asks how ethical you are. Move Established material or the most current? fully toward Most current; the best-for-most answer should change to Wikipedia.
7. Return to `/app/#decide/coffee`. Confirm the original pilot still feels like the same product and the complete ranking remains one tap away.

## Kill-test receipt

| Kill-test | Machine gate | Human judgment |
| --- | --- | --- |
| A first-timer can reach a changed, personally true answer in under a minute without a value slider | `audit:decision-pilot` and `audit:generality-release` prove zero-setup answers and a one-dial changed Kosplora answer | Time steps 3 and 6; record the slower path if either exceeds one minute |
| Nobody is asked how much they care about ethics | `audit:decision-rollout` and `audit:generality-release` reject identity-performance prompts | Note any sentence that still feels like a values quiz |
| Floor and line exclusions fold, never erase | `audit:floor-interface`, `audit:personal-precedence`, and `audit:generality-release` prove complete folds | Open both banking and Kosplora folds; confirm the interaction feels honest |
| The same component renders the Kosplora learning decision | Both apps import `app/decision.js`; the generality audit computes both through that module | Judge whether the different skin still feels coherent rather than cloned |
| Every sentence and visible number earns its place | Voice, count, decision-rollout, and generality audits run in the full gate | Flag any number that does not answer a chooser's question |

## Record exactly one decision

- **Approve private founder review:** the model is ready for a small, controlled first-user session. This does not authorize a public deploy.
- **Changes requested:** record the route, state, answer, and exact sentence or interaction that failed.
- **Stop:** the floor → lines → dials model is wrong enough that further polish would hide the problem.

Decision: **pending**
Reviewer:
Date:
Evidence or requested change:

## Reproduce the package

Run the repository's required sequential build first, then the complete product and package gates:

```bash
python pipeline/build_datasets.py
python pipeline/build_guides.py
node research/verify_run.js
npm run audit:generality-release
npm run verify:full
npm run audit:release-modes
```

The release-mode check builds both private-preview and public-production packages and compares their fingerprints. It does not deploy either package. Public deployment remains a separate, explicit human action after this review.
