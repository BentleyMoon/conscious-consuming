# Major content addition prep

*Prepared 2026-06-25 for the next content-building rounds. Updated 2026-06-27 after the 20-part digital-literacy expansion and critique pass. This is a working queue for Codex-side content work; app UX, theme mapping, and guide banner wiring still go through `docs/CONTENT-HANDOFF.md`.*

## Current state

- Live categories: 85 built datasets across 9 domains.
- Live entries: 24,585 generated app-data entries, including open-data food/beauty and curated lenses.
- Guides: 97 source guides; all 97 are published.
- Share/verdict cards in the app build: 2,883 plus the gallery page.
- Verification gate: `node research/verify_run.js` currently ends with `ALL CHECKS PASS`.
- Evidence gate: `node research/evidence_audit.js` currently reports `20058/20058` curated claims sourced. `banking` remains the read-only reference category and is Claude/design-owned.
- Content readiness gate: `npm run audit:content` reports 63 generated/open-data categories steady, 21 of 22 curated lenses presentation-ready, no honest-floor or guide queue, and one design-owned banking focus-label polish item.

The older "thin lens" backlog is obsolete. Curated categories are no longer 7-14 item sketches; the smallest live rosters are now `banking` 25 (design-owned), `dish-soap` 52, `hair-conditioner` 59, `music-streaming` 61, `laptops` 68, `phones` 70, `razors` 75, `vpn` 77, `face-wash` 80, `investing`/`payments` 81, and `clothing`/`paper-goods`/`period-products` 82. Major additions should therefore improve first-user recognition, demo usefulness, freshness, and source quality, not simply inflate counts.

## R&D correction after the 15-part expansion

Comparable consumer-rating products point to the same lesson: trust comes from transparent methodology, visible limitations, clear source trails, and an obvious next action. Good On You foregrounds public data, third-party indices, certifications, and simple ratings; Mozilla's Privacy Not Included explains warning labels and consumer-risk reasoning; EWG exposes hazard plus data-availability; Open Food Facts makes its calculated scores and data incompleteness legible. Conscious Consuming now has the evidence depth to stand near that family, but the next content work should make the commons easier to trust and use, not larger by default.

Use this rule for future content rounds:

1. **First-demo relevance beats roster size.** Prefer entries that make the grant/preview route or first-user wedge more recognizable: banking, investing, clothing, AI/privacy, payments, VPN, phones/laptops, and the everyday recurring staples.
2. **Freshness beats novelty.** Upgrade old-but-important sources before adding a long tail of niche options. Current flagged stale clusters: `clothing` (11 older citations), `investing` (3), `password-managers` (2), plus one each in `phones`, `payments`, `causes-to-support`, and `banking` (banking stays Claude-owned).
3. **Source portfolio matters.** A green evidence meter only proves a source exists. For contested axes, prefer independent reports, public-interest scorecards, regulator actions, certification directories, methodology pages, or primary policies over marketing pages when both are available.
4. **Add only if it improves a real decision.** New entries should fill a mainstream-recognition gap, a values niche, or an honest floor. If an entry mostly proves that Codex can find another brand, skip it.
5. **Generated-data breadth stays frozen.** Food and beauty already provide bulk coverage. Add or refresh generated categories only when a real user or demo need justifies it.

## Critique findings now incorporated

The 2026-06-27 critique changed the operating system for content work:

1. **Mode before motion.** Every future round starts by naming its mode: source freshness, guide publishability, recognition-gap addition, generated-data refresh, or critique/stop.
2. **No content for content's sake.** If a likely first user would not search for it, trust it more because of it, or act differently because it exists, it waits.
3. **Guides are the next visible credibility surface.** The guide library is large and now fully published, so future guide work should improve source quality, first-user clarity, and freshness before writing more.
4. **Freshness is part of evidence.** A cited 2022 claim can be worse than no addition in fast-moving categories like AI, VPNs, payments, phones, investing, and news.
5. **The standard/preview story matters.** Content additions should strengthen the Open Values Standard walkthrough: one real choice, portable values, sourced facts, forkable corrections, and collective action.

## Rules for the next content rounds

1. Work in small batches: 1-2 curated lenses, one guide cluster, or one generated-data category family per round.
2. Start with a stop/go audit. If no concrete first-user, preview, source-quality, or publishability gap is visible, do a critique pass instead of adding content.
3. Add entries only when they make the category more recognizable to a normal user, fill a clear values niche, preserve an honest floor, or improve a real demo/task.
4. Every new or edited curated score gets object provenance: `{ "note": "...", "source": "https://...", "asof": "2026" }`.
5. Use current primary or near-primary sources when the fact may have changed: official policy pages, annual/sustainability reports, methodology pages, certifications, ToS/privacy policies, regulator actions, and reputable nonprofit scorecards.
6. Preserve the honest floor. If adding high-scoring alternatives, also make sure the mainstream option people already use is present and sourced.
7. Do not add new categories unless a category is launch-critical or user-demanded. Breadth is now demand-driven.
8. Do not edit `app/` for content needs. Log concrete app-side asks in `docs/CONTENT-HANDOFF.md`.
9. Rebuild sequentially after content edits:

```bash
python pipeline/build_datasets.py
python pipeline/build_guides.py
node research/verify_run.js
node research/evidence_audit.js
```

## Best next batches

### Batch 0: Source freshness and quality audit

Before adding another large tranche, run a spot-check on current sources. Replace outdated or weak self-claims where stronger current evidence exists.

Start with:

```bash
npm run audit:content
```

If the audit reports no Codex-actionable content queue, do not add entries by default; switch to critique, launch testing, or a user-requested gap.

- `clothing`: highest freshness debt. Refresh older WRAP, resale-market, brand transparency, and fast-fashion forced-labor sources where 2024-2026 evidence exists.
- `investing`: refresh older fund/ESG-proposition sources and check that fossil-exposure evidence is still current.
- `password-managers`: old security critiques should stay only if still useful as historical risk notes; otherwise replace with newer audits, CVEs, or project/security documentation.
- `phones`: update older privacy/security risk evidence for low-cost handset ecosystems if newer research exists.
- `payments`: keep regulator actions when historically relevant, but mark clearly as enforcement history rather than current operating state.

### Batch A: Recognition gaps in smaller curated lenses

These are visible because their rosters are compact and user-facing.

- `books`: add missing audiobook/subscription and bookstore/library patterns only if sourced. Candidate directions: Everand/Scribd, Storytel, Audiobooks.com, Kobo Plus, independent used-book marketplaces, university/open textbook repositories.
- `razors`: add mainstream floor and durable-refill detail. Candidate directions: Bic, Wilkinson Sword, Dorco/Pace, Harry's individual lines, GilletteLabs, Feather/Astra safety blades, Personna/AccuTec blades.
- `mission-businesses`: add recognizable mission-led companies with verifiable ownership/certification/impact structure. Avoid feel-good brand pages without a source trail.
- `digital-services`: add mainstream services people actually compare against private/open alternatives. Candidate directions: Discord, Reddit, Facebook/Messenger, Snapchat, Viber, LINE, WeChat, Vivaldi, Mullvad Browser, DuckDuckGo Email Protection.

Treat these candidate directions as recognition-gap prompts, not count targets.

### Batch B: Recurring-staple coverage

These categories shape repeated purchases and are good for "vote with your dollar" demonstrations.

- `period-products` (36): add newer organic/reusable brands and mainstream organic lines where evidence is available.
- `laundry` (42): add supermarket/private-label eco lines and major-market detergents people recognize.
- `paper-goods` (41): add more store-brand recycled/FSC options and mainstream tissue/towel floors.
- `cleaning-products` (46): add regional eco/refill brands only when they have certification or ingredient transparency.

### Batch C: Tech hardware recognition

These are high-interest, high-stakes, and easy for users to search.

- `phones` (39): add missing mainstream and alternative ecosystems only with current repair/privacy/support evidence.
- `laptops` (39): add Acer, ASUS, MSI, Huawei, and business-line distinctions only where repairability/support or privacy/longevity evidence is sourced.

### Batch D: High-stakes source-quality audit

The evidence meter is green, but "green" means a source exists; it does not prove the source is the strongest available. Audit source quality for:

- `investing`
- `clothing`
- `ai-assistants`
- `payments`
- `vpn`
- `password-managers`
- `news-sources`

For each, spot-check 5-10 entries and upgrade weak self-claims to stronger public evidence when possible.

### Batch E: Generated data refresh, only after curated work

Food and beauty already provide bulk coverage. Do not add more generated categories until one of these is true:

- a real user asks for it,
- it fills an obvious preview/demo gap,
- the fetched set clears the open-data floor of roughly 50 scorable products.

If attempted, preflight the raw count, keep only categories above the floor, and log dropped categories in `docs/CONTENT-HANDOFF.md`.

## Round template

Use this at the start of each major content round:

1. Name the work mode: source freshness, guide publishability, recognition-gap addition, generated-data refresh, or critique/stop.
2. Pick one batch and name the exact lens/guide/pipeline files.
3. Run `node research/evidence_audit.js` before editing, unless this is guide-only.
4. Inspect current roster names, criteria, guide status, source years, and likely first-user search terms.
5. State the one-sentence gap. If the sentence is weak, stop and report that the better move is critique or launch/testing.
6. Research candidates or replacement sources, then add/edit only sourced material.
7. Keep the file's existing criterion keys and scoring style.
8. Run the full build/verify gate.
9. End with: work mode, files changed, entry count delta, evidence/freshness/publishability delta, verification result, and any handoff lines.

## Current priority recommendation

Do not start with another pure expansion sprint. Start with one of these, depending on the user's prompt:

1. **Source freshness:** `content/lenses/clothing.json`, then `content/lenses/investing.json`.
2. **Digital first-user task:** `content/lenses/ai-assistants.json`, `content/lenses/digital-services.json`, `content/lenses/password-managers.json`, or `content/lenses/vpn.json`, focusing on current policy/security evidence rather than more entries.
3. **Guide publishability:** the first-presentation path: `digital-literacy`, `investing`, `ai-assistants`, `digital-services`, `password-managers`, `vpn`, `clothing`, `news-sources`, `learning-resources`.
4. **Recognition additions only if clearly missing:** `mission-businesses`, `causes-to-support`, `books`, `music-streaming`, `paper-goods`, `laundry`, `period-products`, `razors`.

If the user asks for "more content" without a target, default to the audit-first mode and pick the highest-trust gap visible in the current corpus, not the category with the lowest count.
